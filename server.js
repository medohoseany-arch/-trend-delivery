const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '');
const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();

const sessions = new Map();
const requests = { count: 0 };

const settings = {
  appName: 'Trend Delivery Service',
  defaultDuration: 60
};

const roles = {
  admin: {
    users: true, orders: true, shipments: true, jobs: true, drivers: true,
    merchants: true, accounting: true, expenses: true, audit: true
  },
  manager: {
    users: false, orders: true, shipments: true, jobs: true, drivers: true,
    merchants: true, accounting: true, expenses: true, audit: true
  },
  dispatcher: {
    users: false, orders: true, shipments: true, jobs: true, drivers: true,
    merchants: true, accounting: false, expenses: true, audit: false
  },
  employee: {
    users: false, orders: true, shipments: true, jobs: false, drivers: false,
    merchants: true, accounting: false, expenses: false, audit: false
  },
  driver: {
    users: false, orders: false, shipments: true, jobs: true, drivers: true,
    merchants: false, accounting: false, expenses: true, audit: false
  }
};

const ROLE_PERMISSION_MAP = {
  admin: ['dashboard','orders','shipments','jobs','drivers','merchants','accounting','expenses','audit','users'],
  manager: ['dashboard','orders','shipments','jobs','drivers','merchants','accounting','expenses','audit'],
  dispatcher: ['dashboard','orders','shipments','jobs','drivers','merchants','expenses'],
  employee: ['dashboard','orders','shipments','merchants'],
  driver: ['dashboard','shipments','jobs','drivers','expenses']
};

const PERMISSION_LABELS = {
  dashboard: 'لوحة التحكم', orders: 'الأوردرات وإدخالها', shipments: 'الشحنات والبحث',
  jobs: 'مهام التوصيل', drivers: 'السائقون', merchants: 'التجار', accounting: 'الحسابات',
  expenses: 'مصروفات السائق', audit: 'سجل العمليات', users: 'الموظفون والصلاحيات'
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS'
  });
  res.end(payload);
}

function html(res, status, body, contentType = 'text/html; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function token() {
  return crypto.randomBytes(32).toString('hex');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  if (stored == null) return false;
  const value = String(stored);
  const pass = String(password);

  try {
    if (value.startsWith('scrypt:')) {
      const parts = value.split(':');
      if (parts.length !== 3) return false;
      const derived = crypto.scryptSync(pass, parts[1], 64).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(parts[2], 'hex'));
    }

    if (value.startsWith('sha256:')) {
      return sha256(pass) === value.slice(7);
    }

    // Supports a plain SHA-256 hash from an older database.
    if (/^[a-f0-9]{64}$/i.test(value)) {
      return sha256(pass) === value.toLowerCase();
    }

    // Temporary compatibility for an existing database that stores plaintext.
    // New users created by this server always use scrypt.
    return value === pass;
  } catch (_) {
    return false;
  }
}

function auth(req) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return null;
  const tokenValue = header.slice(7).trim();
  if (!tokenValue) return null;
  const session = sessions.get(tokenValue);
  if (!session) return null;
  if (session.expiresAt && Date.now() > session.expiresAt) {
    sessions.delete(tokenValue);
    return null;
  }
  return { ...session.user, token: tokenValue };
}

function requireAuth(req, res) {
  const user = auth(req);
  if (!user) {
    json(res, 401, { success: false, error: 'غير مصرح — سجل الدخول أولاً' });
    return null;
  }
  return user;
}

function hasPermission(user, permission) {
  if (!permission) return true;
  if (user?.id === 'env-admin' || user?.role === 'admin') return true;
  if (Array.isArray(user?.permissions)) return user.permissions.includes(permission);
  const role = roles[user?.role] || roles.employee;
  return Boolean(role[permission]);
}

function requireRole(req, res, permission) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (!hasPermission(user, permission)) {
    json(res, 403, { success: false, error: 'ليس لديك صلاحية لتنفيذ هذه العملية' });
    return null;
  }
  return user;
}

function bodyJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (_) {
        reject(new Error('JSON غير صالح'));
      }
    });
    req.on('error', reject);
  });
}

function safeIdentifier(value) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) throw new Error('Invalid table name');
  return value;
}

async function supabaseRequest(table, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase غير مضبوط في متغيرات البيئة');
  }

  const tableName = safeIdentifier(table);
  const params = new URLSearchParams();
  const query = options.query || {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const url = `${SUPABASE_URL}/rest/v1/${tableName}${params.toString() ? `?${params.toString()}` : ''}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  if (options.returning !== false) headers.Prefer = 'return=representation';
  if (options.prefer) headers.Prefer = options.prefer;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 15000);

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = text;
    }

    if (!response.ok) {
      const message =
        data && typeof data === 'object'
          ? (data.message || data.details || data.hint || data.error || `Supabase HTTP ${response.status}`)
          : `Supabase HTTP ${response.status}: ${text}`;
      const err = new Error(String(message));
      err.status = response.status;
      err.supabase = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function dbSelect(table, query = {}) {
  return await supabaseRequest(table, { query });
}

async function dbInsert(table, row, options = {}) {
  return await supabaseRequest(table, {
    method: 'POST',
    body: row,
    prefer: options.prefer || 'return=representation'
  });
}

async function dbUpdate(table, filters, patch) {
  const query = { ...filters };
  return await supabaseRequest(table, {
    method: 'PATCH',
    query,
    body: patch,
    prefer: 'return=representation'
  });
}

function firstRow(data) {
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

async function getFirstCompanyId() {
  try {
    const rows = await dbSelect('companies', {
      select: 'id',
      limit: 1,
      order: 'created_at.asc'
    });
    return firstRow(rows)?.id || null;
  } catch (_) {
    return null;
  }
}

async function getUserByUsername(username) {
  const value = String(username || '').trim().toLowerCase();
  if (!value) return null;
  try {
    const rows = await dbSelect('users', { select: '*', username: `eq.${encodeURIComponent(value)}`, limit: 1 });
    return firstRow(rows);
  } catch (_) {
    try {
      const rows = await dbSelect('users', { select: '*', username: `eq.${value}`, limit: 1 });
      return firstRow(rows);
    } catch (_) { return null; }
  }
}

async function getUserByEmail(email) {
  try {
    const rows = await dbSelect('users', { select: '*', email: `eq.${encodeURIComponent(String(email).trim().toLowerCase())}`, limit: 1 });
    return firstRow(rows);
  } catch (error) {
    try {
      const rows = await dbSelect('users', { select: '*', email: `eq.${String(email).trim().toLowerCase()}`, limit: 1 });
      return firstRow(rows);
    } catch (_) { throw error; }
  }
}

async function getUserRole(userId) {
  try {
    const rows = await dbSelect('user_roles', {
      select: '*',
      user_id: `eq.${userId}`,
      limit: 1
    });
    const link = firstRow(rows);
    if (!link) return 'employee';

    if (link.role && typeof link.role === 'string') return link.role;
    if (link.role_name && typeof link.role_name === 'string') return link.role_name;

    if (link.role_id) {
      const roleRows = await dbSelect('roles', {
        select: '*',
        id: `eq.${link.role_id}`,
        limit: 1
      });
      const role = firstRow(roleRows);
      return role?.name || role?.code || role?.slug || 'employee';
    }
  } catch (_) {}
  return 'employee';
}

async function ensureRoleRecord(companyId, roleName) {
  const name = cleanString(roleName || 'employee').toLowerCase();
  let existing = null;
  try {
    existing = firstRow(await dbSelect('roles', { company_id: `eq.${companyId}`, name: `eq.${name}`, limit: 1 }));
  } catch (_) {}
  if (existing?.id) return existing;
  const created = firstRow(await dbInsert('roles', { company_id: companyId, name }));
  const codes = ROLE_PERMISSION_MAP[name] || [];
  for (const code of codes) {
    try {
      const perm = firstRow(await dbSelect('permissions', { code: `eq.${code}`, limit: 1 }));
      if (perm?.id) await dbInsert('role_permissions', { role_id: created.id, permission_id: perm.id }, { prefer: 'return=minimal' });
    } catch (_) {}
  }
  return created;
}

async function getUserPermissions(userId, roleName, companyId) {
  if (roleName === 'admin') return Object.keys(PERMISSION_LABELS);
  try {
    const links = await dbSelect('user_roles', { user_id: `eq.${userId}`, limit: 1 });
    const link = firstRow(links);
    let roleId = link?.role_id || null;
    if (!roleId && companyId && roleName) {
      const role = firstRow(await dbSelect('roles', { company_id: `eq.${companyId}`, name: `eq.${String(roleName).toLowerCase()}`, limit: 1 }));
      roleId = role?.id || null;
    }
    if (roleId) {
      const rows = await dbSelect('role_permissions', { role_id: `eq.${roleId}`, select: 'permission_id', limit: 200 });
      const ids = rows.map(x => x.permission_id).filter(Boolean);
      if (ids.length) {
        const perms = await dbSelect('permissions', { id: `in.(${ids.join(',')})`, select: 'code', limit: 200 });
        if (perms.length) return perms.map(x => x.code).filter(Boolean);
      }
    }
  } catch (_) {}
  return ROLE_PERMISSION_MAP[roleName] || ROLE_PERMISSION_MAP.employee;
}

async function attachRoleToUser(userId, companyId, roleName) {
  const role = await ensureRoleRecord(companyId, roleName);
  try {
    await dbInsert('user_roles', { user_id: userId, role_id: role.id }, { prefer: 'return=minimal' });
  } catch (error) {
    try { await dbUpdate('user_roles', { user_id: `eq.${userId}` }, { role_id: role.id }); } catch (_) {}
  }
  return role;
}

async function loginUser(username, password) {
  const identifier = String(username || '').trim().toLowerCase();
  if (ADMIN_PASSWORD && String(password) === ADMIN_PASSWORD &&
      ((ADMIN_USERNAME && identifier === ADMIN_USERNAME) || identifier === ADMIN_EMAIL)) {
    return { id: 'env-admin', name: 'Administrator', username: ADMIN_USERNAME || ADMIN_EMAIL, email: ADMIN_EMAIL, role: 'admin', permissions: Object.keys(PERMISSION_LABELS), company_id: null, language: 'ar', active: true };
  }
  let user = await getUserByUsername(identifier);
  if (!user && identifier.includes('@')) user = await getUserByEmail(identifier);
  if (!user || user.active === false) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  const role = await getUserRole(user.id);
  const companyId = user.company_id || null;
  const permissions = await getUserPermissions(user.id, role, companyId);
  return { id: user.id, name: user.name || user.username || user.email || identifier, username: user.username || identifier, email: user.email || null, role, permissions, company_id: companyId, language: user.language || 'ar', active: user.active !== false };
}

async function audit(user, action, entityType, entityId, details = null) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    const row = {
      company_id: user?.company_id || null,
      user_id: user?.id && user.id !== 'env-admin' ? user.id : null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || null
    };
    await dbInsert('audit_logs', row, { prefer: 'return=minimal' });
  } catch (error) {
    console.warn('AUDIT WARNING:', error.message);
  }
}

function cleanNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function uniqueArray(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

async function safeSelect(table, query = []) {
  try {
    return await dbSelect(table, Object.fromEntries(query));
  } catch (error) {
    console.warn(`SELECT ${table} failed:`, error.message);
    return [];
  }
}

async function dashboardData() {
  const tables = ['orders', 'shipments', 'delivery_jobs', 'returns', 'drivers', 'merchants'];
  const result = {};
  for (const table of tables) {
    try {
      const rows = await dbSelect(table, { select: '*', limit: 1000 });
      result[table] = Array.isArray(rows) ? rows : [];
    } catch (_) {
      result[table] = [];
    }
  }

  const counts = {};
  for (const table of tables) counts[table] = result[table].length;
  counts.jobs = counts.delivery_jobs;

  const shipmentRows = result.shipments;
  counts.pending = shipmentRows.filter(x => !['delivered', 'cancelled', 'cancelled_customer_paid'].includes(x.status)).length;
  counts.delivered = shipmentRows.filter(x => x.status === 'delivered').length;
  counts.cancelled = shipmentRows.filter(x => String(x.status || '').startsWith('cancelled')).length;

  return { counts, recentOrders: result.orders.slice(-10).reverse() };
}

async function nextSerial(user) {
  let rows = [];
  try {
    rows = await dbSelect('orders', {
      select: 'serial_no,created_at',
      order: 'serial_no.desc',
      limit: 1000
    });
  } catch (_) {}

  const today = new Date().toISOString().slice(0, 10);
  const nums = rows
    .filter(r => !r.created_at || String(r.created_at).slice(0, 10) === today)
    .map(r => Number(r.serial_no))
    .filter(Number.isFinite);

  return (nums.length ? Math.max(...nums) : 0) + 1;
}

async function createOrder(user, body) {
  const companyId = user.company_id || await getFirstCompanyId();
  const serialNo = cleanNumber(body.serial_no, await nextSerial(user));
  const orderCode = cleanString(body.order_code) || `ORD-${serialNo}`;

  let customer = null;
  try {
    const customerRows = await dbSelect('customers', {
      select: '*',
      phone: `eq.${cleanString(body.customer_phone)}`,
      limit: 1
    });
    customer = firstRow(customerRows);
  } catch (_) {}

  if (!customer) {
    try {
      const customerPayload = {
        company_id: companyId,
        name: cleanString(body.customer_name),
        phone: cleanString(body.customer_phone),
        address: cleanString(body.address),
        governorate_id: body.governorate_id || null,
        area_id: body.area_id || null
      };
      customer = firstRow(await dbInsert('customers', customerPayload));
    } catch (error) {
      console.warn('CUSTOMER INSERT WARNING:', error.message);
    }
  }

  const orderValue = cleanNumber(body.value);
  let merchantTaxEnabled = false;
  let merchantTaxRate = 0;
  if (body.merchant_id) {
    try {
      const merchantRows = await dbSelect('merchants', { select: 'id,name,tax_enabled,tax_rate', id: `eq.${body.merchant_id}`, limit: 1 });
      const merchant = firstRow(merchantRows);
      merchantTaxEnabled = merchant?.tax_enabled === true;
      merchantTaxRate = Math.min(100, Math.max(0, cleanNumber(merchant?.tax_rate)));
    } catch (error) { console.warn('MERCHANT TAX WARNING:', error.message); }
  }
  const taxAmount = merchantTaxEnabled ? Number((orderValue * merchantTaxRate / 100).toFixed(2)) : 0;
  const merchantNetValue = Number((orderValue - taxAmount).toFixed(2));

  const orderPayload = {
    company_id: companyId, serial_no: serialNo, order_code: orderCode, merchant_id: body.merchant_id || null,
    merchant_order_no: cleanString(body.merchant_order_no) || null, customer_id: customer?.id || null,
    customer_name: cleanString(body.customer_name) || null, customer_phone: cleanString(body.customer_phone) || null,
    governorate_id: body.governorate_id || null, area_id: body.area_id || null, address: cleanString(body.address) || null,
    value: orderValue, delivery_fee: cleanNumber(body.delivery_fee), tax_enabled: merchantTaxEnabled,
    tax_rate: merchantTaxRate, tax_amount: taxAmount, merchant_net_value: merchantNetValue, notes: cleanString(body.notes) || null
  };

  let order;
  try {
    order = firstRow(await dbInsert('orders', orderPayload));
  } catch (error) {
    // Some existing schemas may not have the customer_name/customer_phone columns.
    const fallback = { ...orderPayload };
    delete fallback.customer_name;
    delete fallback.customer_phone;
    try {
      order = firstRow(await dbInsert('orders', fallback));
    } catch (taxSchemaError) {
      const legacyFallback = { ...fallback };
      delete legacyFallback.tax_enabled; delete legacyFallback.tax_rate; delete legacyFallback.tax_amount; delete legacyFallback.merchant_net_value;
      order = firstRow(await dbInsert('orders', legacyFallback));
      console.warn('ORDER TAX COLUMNS WARNING:', taxSchemaError.message);
    }
  }

  if (!order?.id) throw new Error('لم يتم إنشاء الأوردر في Supabase');

  let shipment = null;
  const shipmentNo = `SH-${serialNo}`;
  const shipmentPayload = {
    company_id: companyId,
    order_id: order.id,
    shipment_no: shipmentNo,
    serial_no: serialNo,
    status: 'received'
  };

  try {
    shipment = firstRow(await dbInsert('shipments', shipmentPayload));
  } catch (error) {
    // Compatibility with schemas where status has a different default/constraint.
    const fallback = { ...shipmentPayload };
    delete fallback.status;
    shipment = firstRow(await dbInsert('shipments', fallback));
  }

  if (!shipment?.id) throw new Error('تم إنشاء الأوردر لكن فشل إنشاء الشحنة');

  await audit(user, 'create_order', 'order', order.id, { shipment_id: shipment.id });

  return {
    order,
    shipment,
    serialDuplicate: false
  };
}

async function searchAll(q) {
  const needle = cleanString(q).toLowerCase();
  if (!needle || needle === '__none__') return { type: 'none', data: null };

  const configs = [
    ['shipments', ['shipment_no', 'serial_no', 'status', 'order_id']],
    ['orders', ['order_code', 'merchant_order_no', 'serial_no', 'customer_name', 'customer_phone', 'address']],
    ['customers', ['name', 'phone', 'address']],
    ['merchants', ['merchant_no', 'code', 'name', 'phone']],
    ['delivery_jobs', ['job_code', 'status']]
  ];

  for (const [table, fields] of configs) {
    let rows = [];
    try {
      rows = await dbSelect(table, { select: '*', limit: 1000, order: 'created_at.desc' });
    } catch (_) {
      continue;
    }
    const found = rows.find(row => fields.some(field => String(row[field] ?? '').toLowerCase().includes(needle)));
    if (found) return { type: table === 'shipments' ? 'shipment' : table.slice(0, -1), data: found };
  }

  return { type: 'none', data: null };
}

async function getRows(table, order = 'created_at.desc', limit = 500) {
  return await dbSelect(table, { select: '*', order, limit });
}

async function getRolePermissionsByRoleId(roleId, roleName) {
  if (!roleId || String(roleId).startsWith('default:')) return ROLE_PERMISSION_MAP[roleName] || ROLE_PERMISSION_MAP.employee;
  try {
    const links = await dbSelect('role_permissions', { role_id: `eq.${roleId}`, select: 'permission_id', limit: 200 });
    const ids = links.map(x => x.permission_id).filter(Boolean);
    if (!ids.length) return ROLE_PERMISSION_MAP[roleName] || [];
    const perms = await dbSelect('permissions', { id: `in.(${ids.join(',')})`, select: 'code', limit: 200 });
    return perms.map(x => x.code).filter(Boolean);
  } catch (_) { return ROLE_PERMISSION_MAP[roleName] || []; }
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;
  requests.count++;

  if (pathname === '/api/health' && req.method === 'GET') {
    return json(res, 200, {
      success: true,
      status: 'ok',
      app: settings.appName,
      port: PORT,
      supabase: Boolean(SUPABASE_URL && SUPABASE_KEY),
      requests: requests.count,
      time: new Date().toISOString()
    });
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    try {
      const body = await bodyJson(req);
      const username = cleanString(body.username || body.email).toLowerCase();
      const password = String(body.password || '');
      if (!username || !password) return json(res, 400, { success: false, error: 'أدخل اسم المستخدم وكلمة المرور' });

      const user = await loginUser(username, password);
      if (!user) return json(res, 401, { success: false, error: 'بيانات الدخول غير صحيحة' });

      const sessionToken = token();
      sessions.set(sessionToken, {
        user,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
      });

      return json(res, 200, {
        success: true,
        token: sessionToken,
        user
      });
    } catch (error) {
      console.error('LOGIN ERROR:', error);
      return json(res, 500, { success: false, error: error.message || 'فشل تسجيل الدخول' });
    }
  }

  if (pathname === '/api/me' && req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;
    return json(res, 200, { success: true, user });
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    const header = String(req.headers.authorization || '');
    if (header.startsWith('Bearer ')) sessions.delete(header.slice(7).trim());
    return json(res, 200, { success: true });
  }

  if (pathname === '/api/dashboard' && req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;
    try {
      const data = await dashboardData();
      return json(res, 200, { success: true, data });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/order/next-serial' && req.method === 'GET') {
    const user = requireRole(req, res, 'orders');
    if (!user) return;
    try {
      const serial = await nextSerial(user);
      return json(res, 200, { success: true, serial, next: serial });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/orders' && req.method === 'GET') {
    const user = requireRole(req, res, 'orders');
    if (!user) return;
    try {
      const data = await getRows('orders');
      return json(res, 200, { success: true, data });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/orders' && req.method === 'POST') {
    const user = requireRole(req, res, 'orders');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const result = await createOrder(user, body);
      return json(res, 200, { success: true, ...result });
    } catch (error) {
      console.error('CREATE ORDER ERROR:', error);
      return json(res, 500, { success: false, error: error.message || 'فشل إنشاء الأوردر' });
    }
  }

  if (pathname === '/api/search' && req.method === 'GET') {
    const user = requireRole(req, res, 'shipments');
    if (!user) return;
    try {
      const q = url.searchParams.get('q') || '';
      const result = await searchAll(q);
      return json(res, 200, { success: true, ...result });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/shipments/status' && req.method === 'POST') {
    const user = requireRole(req, res, 'shipments');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      if (!body.shipment_id || !body.status) return json(res, 400, { success: false, error: 'بيانات الحالة ناقصة' });
      const updated = await dbUpdate('shipments', { id: `eq.${body.shipment_id}` }, { status: body.status });
      try {
        await dbInsert('shipment_status_history', {
          shipment_id: body.shipment_id,
          status: body.status,
          user_id: user.id === 'env-admin' ? null : user.id
        }, { prefer: 'return=minimal' });
      } catch (historyError) {
        console.warn('STATUS HISTORY WARNING:', historyError.message);
      }
      await audit(user, 'update_shipment_status', 'shipment', body.shipment_id, { status: body.status });
      return json(res, 200, { success: true, data: updated });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/merchants' && req.method === 'GET') {
    const user = requireRole(req, res, 'merchants');
    if (!user) return;
    try { return json(res, 200, { success: true, data: await getRows('merchants') }); }
    catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/merchants' && req.method === 'POST') {
    const user = requireRole(req, res, 'merchants');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = user.company_id || await getFirstCompanyId();
      const merchantNo = cleanString(body.merchant_no);
      const code = cleanString(body.code);
      const name = cleanString(body.name);
      if (!companyId || !merchantNo || !code || !name) return json(res, 400, { success: false, error: 'رقم التاجر والكود والاسم مطلوبة' });
      const enabled = Boolean(body.tax_enabled);
      const rate = Math.min(100, Math.max(0, cleanNumber(body.tax_rate)));
      const row = { company_id: companyId, merchant_no: merchantNo, code, name, phone: cleanString(body.phone) || null, address: cleanString(body.address) || null, active: body.active !== false, tax_enabled: enabled, tax_rate: enabled ? rate : 0 };
      const data = firstRow(await dbInsert('merchants', row));
      await audit(user, 'create_merchant', 'merchant', data?.id, row);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/merchants' && req.method === 'PATCH') {
    const user = requireRole(req, res, 'merchants');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      if (!body.id) return json(res, 400, { success: false, error: 'معرّف التاجر مطلوب' });
      const patch = {};
      for (const key of ['merchant_no','code','name','phone','address','active']) if (body[key] !== undefined) patch[key] = key === 'active' ? Boolean(body[key]) : cleanString(body[key]);
      if (body.tax_enabled !== undefined) patch.tax_enabled = Boolean(body.tax_enabled);
      if (body.tax_rate !== undefined) patch.tax_rate = Math.min(100, Math.max(0, cleanNumber(body.tax_rate)));
      if (patch.tax_enabled === false) patch.tax_rate = 0;
      const data = await dbUpdate('merchants', { id: `eq.${body.id}` }, patch);
      await audit(user, 'update_merchant', 'merchant', body.id, patch);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/governorates' && req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;
    try { return json(res, 200, { success: true, data: await getRows('governorates', 'name_ar.asc') }); }
    catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/governorates' && req.method === 'POST') {
    const user = requireAuth(req, res);
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = user.company_id || await getFirstCompanyId();
      if (!companyId || !cleanString(body.name_ar)) return json(res, 400, { success: false, error: 'اسم الإمارة بالعربية مطلوب' });
      const row = { company_id: companyId, name_ar: cleanString(body.name_ar), name_en: cleanString(body.name_en) || null };
      const data = firstRow(await dbInsert('governorates', row));
      await audit(user, 'create_governorate', 'governorate', data?.id, row);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/governorates' && req.method === 'PATCH') {
    const user = requireAuth(req, res);
    if (!user) return;
    try {
      const body = await bodyJson(req);
      if (!body.id) return json(res, 400, { success: false, error: 'معرّف الإمارة مطلوب' });
      const patch = {};
      if (body.name_ar !== undefined) patch.name_ar = cleanString(body.name_ar);
      if (body.name_en !== undefined) patch.name_en = cleanString(body.name_en);
      const data = await dbUpdate('governorates', { id: `eq.${body.id}` }, patch);
      await audit(user, 'update_governorate', 'governorate', body.id, patch);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/areas' && req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;
    try { return json(res, 200, { success: true, data: await getRows('areas', 'name_ar.asc') }); }
    catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/areas' && req.method === 'POST') {
    const user = requireAuth(req, res);
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = user.company_id || await getFirstCompanyId();
      if (!companyId || !body.governorate_id || !cleanString(body.name_ar)) return json(res, 400, { success: false, error: 'الإمارة واسم المنطقة مطلوبان' });
      const row = { company_id: companyId, governorate_id: body.governorate_id, name_ar: cleanString(body.name_ar), name_en: cleanString(body.name_en) || null };
      const data = firstRow(await dbInsert('areas', row));
      await audit(user, 'create_area', 'area', data?.id, row);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/areas' && req.method === 'PATCH') {
    const user = requireAuth(req, res);
    if (!user) return;
    try {
      const body = await bodyJson(req);
      if (!body.id) return json(res, 400, { success: false, error: 'معرّف المنطقة مطلوب' });
      const patch = {};
      if (body.governorate_id !== undefined) patch.governorate_id = body.governorate_id;
      if (body.name_ar !== undefined) patch.name_ar = cleanString(body.name_ar);
      if (body.name_en !== undefined) patch.name_en = cleanString(body.name_en);
      const data = await dbUpdate('areas', { id: `eq.${body.id}` }, patch);
      await audit(user, 'update_area', 'area', body.id, patch);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/drivers' && req.method === 'GET') {
    const user = requireRole(req, res, 'drivers');
    if (!user) return;
    try { return json(res, 200, { success: true, data: await getRows('drivers') }); }
    catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/drivers' && req.method === 'POST') {
    const user = requireRole(req, res, 'drivers');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = user.company_id || await getFirstCompanyId();
      const driverNo = cleanString(body.driver_no);
      const name = cleanString(body.name);
      if (!companyId || !driverNo || !name) return json(res, 400, { success: false, error: 'رقم السائق والاسم مطلوبان' });
      const row = { company_id: companyId, driver_no: driverNo, name, phone: cleanString(body.phone) || null, vehicle_no: cleanString(body.vehicle_no) || null, active: body.active !== false };
      const data = firstRow(await dbInsert('drivers', row));
      await audit(user, 'create_driver', 'driver', data?.id, row);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/drivers' && req.method === 'PATCH') {
    const user = requireRole(req, res, 'drivers');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      if (!body.id) return json(res, 400, { success: false, error: 'معرّف السائق مطلوب' });
      const patch = {};
      for (const key of ['driver_no','name','phone','vehicle_no']) if (body[key] !== undefined) patch[key] = cleanString(body[key]);
      if (body.active !== undefined) patch.active = Boolean(body.active);
      const data = await dbUpdate('drivers', { id: `eq.${body.id}` }, patch);
      await audit(user, 'update_driver', 'driver', body.id, patch);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/delivery-jobs' && req.method === 'GET') {
    const user = requireRole(req, res, 'jobs');
    if (!user) return;
    try {
      return json(res, 200, { success: true, data: await getRows('delivery_jobs') });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/delivery-jobs' && req.method === 'POST') {
    const user = requireRole(req, res, 'jobs');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = user.company_id || await getFirstCompanyId();
      const shipmentIds = uniqueArray(Array.isArray(body.shipment_ids) ? body.shipment_ids : []);
      if (!body.driver_id || !body.job_code) return json(res, 400, { success: false, error: 'السائق وكود المهمة مطلوبان' });

      const job = firstRow(await dbInsert('delivery_jobs', {
        company_id: companyId,
        driver_id: body.driver_id,
        job_code: cleanString(body.job_code),
        status: 'created',
        expected_count: shipmentIds.length,
        received_count: 0
      }));

      if (!job?.id) throw new Error('فشل إنشاء مهمة التوصيل');

      for (const shipmentId of shipmentIds) {
        try {
          await dbInsert('delivery_job_shipments', {
            delivery_job_id: job.id,
            shipment_id: shipmentId,
            delivery_job_code: job.job_code
          }, { prefer: 'return=minimal' });
        } catch (linkError) {
          console.warn('JOB SHIPMENT LINK WARNING:', linkError.message);
        }
        try {
          await dbUpdate('shipments', { id: `eq.${shipmentId}` }, { status: 'out_for_delivery' });
        } catch (_) {}
      }

      await audit(user, 'create_delivery_job', 'delivery_job', job.id, { shipment_ids: shipmentIds });
      return json(res, 200, { success: true, data: job });
    } catch (error) {
      console.error('CREATE JOB ERROR:', error);
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/delivery-job-code' && req.method === 'POST') {
    const user = requireRole(req, res, 'jobs');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const jobs = await dbSelect('delivery_jobs', {
        select: '*',
        job_code: `eq.${cleanString(body.delivery_job_code)}`,
        limit: 1
      });
      const job = firstRow(jobs);
      if (!job) return json(res, 404, { success: false, error: 'كود المهمة غير موجود' });

      const shipments = await dbSelect('shipments', {
        select: '*',
        shipment_no: `eq.${cleanString(body.shipment_no)}`,
        limit: 1
      });
      const shipment = firstRow(shipments);
      if (!shipment) return json(res, 404, { success: false, error: 'رقم الشحنة غير موجود' });

      const existing = await dbSelect('delivery_job_shipments', {
        select: '*',
        shipment_id: `eq.${shipment.id}`,
        limit: 1
      });

      if (existing.length) return json(res, 200, { success: true, duplicate: true });

      await dbInsert('delivery_job_shipments', {
        delivery_job_id: job.id,
        shipment_id: shipment.id,
        serial_no: cleanNumber(body.serial_no, shipment.serial_no || 0),
        delivery_job_code: job.job_code
      }, { prefer: 'return=minimal' });

      await audit(user, 'update_delivery_job_code', 'shipment', shipment.id, { delivery_job_code: job.job_code });
      return json(res, 200, { success: true, duplicate: false });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/returns' && req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;
    try {
      return json(res, 200, { success: true, data: await getRows('returns') });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/transactions' && req.method === 'GET') {
    const user = requireRole(req, res, 'accounting');
    if (!user) return;
    try {
      return json(res, 200, { success: true, data: await getRows('transactions') });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/expenses' && req.method === 'GET') {
    const user = requireRole(req, res, 'expenses');
    if (!user) return;
    try {
      return json(res, 200, { success: true, data: await getRows('expenses') });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/expenses' && req.method === 'POST') {
    const user = requireRole(req, res, 'expenses');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = user.company_id || await getFirstCompanyId();
      const row = {
        company_id: companyId,
        driver_id: body.driver_id || null,
        expense_type: cleanString(body.expense_type) || 'other',
        amount: cleanNumber(body.amount),
        expense_date: body.expense_date || new Date().toISOString().slice(0, 10),
        notes: cleanString(body.notes) || null
      };
      const data = firstRow(await dbInsert('expenses', row));
      await audit(user, 'create_expense', 'expense', data?.id || null, row);
      return json(res, 200, { success: true, data });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/audit' && req.method === 'GET') {
    const user = requireRole(req, res, 'audit');
    if (!user) return;
    try {
      return json(res, 200, { success: true, data: await getRows('audit_logs') });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/roles' && req.method === 'GET') {
    const user = requireRole(req, res, 'users');
    if (!user) return;
    try {
      const companyId = user.company_id || await getFirstCompanyId();
      const dbRoles = companyId ? await dbSelect('roles', { company_id: `eq.${companyId}`, order: 'name.asc', limit: 200 }) : [];
      const names = new Set(dbRoles.map(x => String(x.name || '').toLowerCase()));
      for (const name of Object.keys(ROLE_PERMISSION_MAP)) {
        if (!names.has(name)) dbRoles.push({ id: `default:${name}`, company_id: companyId, name, permissions: ROLE_PERMISSION_MAP[name] });
      }
      for (const role of dbRoles) {
        if (!role.permissions) role.permissions = await getRolePermissionsByRoleId(role.id, role.name);
      }
      return json(res, 200, { success: true, data: dbRoles, labels: PERMISSION_LABELS });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/roles' && req.method === 'POST') {
    const user = requireRole(req, res, 'users');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = user.company_id || await getFirstCompanyId();
      const name = cleanString(body.name).toLowerCase();
      const permissionCodes = uniqueArray(Array.isArray(body.permissions) ? body.permissions : []);
      if (!companyId || !name) return json(res, 400, { success: false, error: 'اسم الصلاحية مطلوب' });
      const existing = firstRow(await dbSelect('roles', { company_id: `eq.${companyId}`, name: `eq.${name}`, limit: 1 }));
      if (existing) return json(res, 409, { success: false, error: 'اسم الصلاحية موجود بالفعل' });
      const role = firstRow(await dbInsert('roles', { company_id: companyId, name }));
      for (const code of permissionCodes) {
        const perm = firstRow(await dbSelect('permissions', { code: `eq.${code}`, limit: 1 }));
        if (perm?.id) await dbInsert('role_permissions', { role_id: role.id, permission_id: perm.id }, { prefer: 'return=minimal' });
      }
      await audit(user, 'create_role', 'role', role?.id, { name, permissions: permissionCodes });
      return json(res, 200, { success: true, data: { ...role, permissions: permissionCodes } });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/users' && req.method === 'GET') {
    const user = requireRole(req, res, 'users');
    if (!user) return;
    try {
      const rows = await dbSelect('users', { select: 'id,company_id,name,username,email,language,active,created_at', order: 'created_at.desc', limit: 500 });
      const data = [];
      for (const row of rows) data.push({ ...row, role: await getUserRole(row.id), permissions: await getUserPermissions(row.id, await getUserRole(row.id), row.company_id) });
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/users' && req.method === 'POST') {
    const user = requireRole(req, res, 'users');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = body.company_id || user.company_id || await getFirstCompanyId();
      const row = {
        company_id: companyId,
        name: cleanString(body.name),
        username: cleanString(body.username).toLowerCase(),
        email: cleanString(body.email).toLowerCase(),
        password_hash: hashPassword(String(body.password || '')),
        language: body.language || 'ar',
        active: body.active !== false
      };
      if (!row.name || !row.username || !row.email || !body.password) return json(res, 400, { success: false, error: 'الاسم واسم المستخدم والبريد وكلمة المرور مطلوبة' });
      const data = firstRow(await dbInsert('users', row));
      const role = await attachRoleToUser(data.id, companyId, body.role || 'employee');
      await audit(user, 'create_user', 'user', data?.id, { name: row.name, username: row.username, role: role?.name || body.role || 'employee' });
      return json(res, 200, { success: true, data: { ...data, role: role?.name || body.role || 'employee' } });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname.startsWith('/api/users/') && req.method === 'PATCH') {
    const user = requireRole(req, res, 'users');
    if (!user) return;
    try {
      const userId = pathname.split('/').pop();
      const body = await bodyJson(req);
      if (!userId) return json(res, 400, { success: false, error: 'معرّف الموظف مطلوب' });
      const patch = {};
      for (const key of ['name','email','language']) if (body[key] !== undefined) patch[key] = cleanString(body[key]).toLowerCase();
      if (body.username !== undefined) patch.username = cleanString(body.username).toLowerCase();
      if (body.password) patch.password_hash = hashPassword(String(body.password));
      if (body.active !== undefined) patch.active = Boolean(body.active);
      const data = firstRow(await dbUpdate('users', { id: `eq.${userId}` }, patch));
      if (body.role) await attachRoleToUser(userId, data?.company_id || user.company_id || await getFirstCompanyId(), body.role);
      await audit(user, 'update_user', 'user', userId, { ...patch, password_hash: undefined, role: body.role || undefined });
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/chat' && req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;
    try {
      const rows = await dbSelect('notifications', { select: '*', order: 'created_at.desc', limit: 100 });
      return json(res, 200, { success: true, data: rows });
    } catch (_) {
      return json(res, 200, { success: true, data: [] });
    }
  }

  if (pathname === '/api/chat' && req.method === 'POST') {
    const user = requireAuth(req, res);
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const message = cleanString(body.message || body.text);
      if (!message) return json(res, 400, { success: false, error: 'الرسالة فارغة' });
      let data = null;
      try {
        data = firstRow(await dbInsert('notifications', {
          company_id: user.company_id || null,
          user_id: user.id === 'env-admin' ? null : user.id,
          title: 'Internal Chat',
          message,
          type: 'chat'
        }));
      } catch (_) {}
      return json(res, 200, { success: true, data: data || { message } });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/driver/location' && req.method === 'POST') {
    const user = requireRole(req, res, 'drivers');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const row = {
        driver_id: body.driver_id || user.id,
        latitude: cleanNumber(body.latitude),
        longitude: cleanNumber(body.longitude),
        accuracy: body.accuracy == null ? null : cleanNumber(body.accuracy),
        recorded_at: body.recorded_at || new Date().toISOString()
      };
      const data = firstRow(await dbInsert('driver_locations', row));
      return json(res, 200, { success: true, data });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/drivers/locations' && req.method === 'GET') {
    const user = requireRole(req, res, 'drivers');
    if (!user) return;
    try {
      const data = await dbSelect('driver_locations', { select: '*', order: 'recorded_at.desc', limit: 500 });
      return json(res, 200, { success: true, data });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/whatsapp/location-request' && req.method === 'POST') {
    const user = requireRole(req, res, 'drivers');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      // WhatsApp integration is intentionally optional. We store the request so a
      // configured integration can process it later without blocking the app.
      let data = null;
      try {
        data = firstRow(await dbInsert('notifications', {
          company_id: user.company_id || null,
          user_id: body.driver_id || null,
          title: 'Location Request',
          message: cleanString(body.message) || 'Please send your current location.',
          type: 'location_request'
        }));
      } catch (_) {}
      return json(res, 200, { success: true, data });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  return json(res, 404, { success: false, error: 'API route not found' });
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  })[ext] || 'application/octet-stream';
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  const publicDir = path.join(__dirname, 'public');
  const filePath = path.normalize(path.join(publicDir, pathname));

  if (!filePath.startsWith(publicDir + path.sep) && filePath !== publicDir) {
    return html(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  }

  fs.stat(filePath, (error, stat) => {
    if (!error && stat.isFile()) {
      fs.readFile(filePath, (readError, data) => {
        if (readError) return html(res, 500, 'Server error', 'text/plain; charset=utf-8');
        res.writeHead(200, {
          'Content-Type': contentType(filePath),
          'Cache-Control': 'no-cache'
        });
        res.end(data);
      });
      return;
    }

    // If the requested page is missing, serve the main SPA page.
    const indexPath = path.join(publicDir, 'index.html');
    fs.readFile(indexPath, (indexError, data) => {
      if (indexError) return html(res, 404, 'Not Found', 'text/plain; charset=utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS'
      });
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname.startsWith('/api/')) {
      return await handleApi(req, res, url);
    }

    return serveStatic(req, res, url);
  } catch (error) {
    console.error('UNHANDLED REQUEST ERROR:', error);
    if (!res.headersSent) {
      return json(res, 500, { success: false, error: error.message || 'Internal server error' });
    }
    res.end();
  }
});

process.on('uncaughtException', error => {
  console.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', error => {
  console.error('UNHANDLED REJECTION:', error);
});

server.on('error', error => {
  console.error('SERVER ERROR:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚚 Trend Delivery running on port ${PORT}`);
  console.log('👥 Users/Roles: enabled');
  console.log('📦 Orders: enabled');
  console.log('💬 Internal Chat: enabled');
  console.log('📍 Driver Location: enabled');
  console.log(`🟢 Supabase: ${SUPABASE_URL && SUPABASE_KEY ? 'configured' : 'NOT configured'}`);
  console.log('☁️ R2: optional/not configured');
});
