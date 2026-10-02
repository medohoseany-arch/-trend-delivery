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
    merchants: true, areas: true, accounting: true, expenses: true, audit: true
  },
  manager: {
    users: false, orders: true, shipments: true, jobs: true, drivers: true,
    merchants: true, areas: true, accounting: true, expenses: true, audit: true
  },
  dispatcher: {
    users: false, orders: true, shipments: true, jobs: true, drivers: true,
    merchants: true, areas: true, accounting: false, expenses: true, audit: false
  },
  employee: {
    users: false, orders: true, shipments: true, jobs: false, drivers: false,
    merchants: true, areas: true, accounting: false, expenses: false, audit: false
  },
  driver: {
    users: false, orders: false, shipments: true, jobs: true, drivers: true,
    merchants: false, areas: false, accounting: false, expenses: true, audit: false
  }
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
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

function requireRole(req, res, permission) {
  const user = requireAuth(req, res);
  if (!user) return null;
  const role = roles[user.role] || roles.employee;
  const permissions = user.permissions || role;
  // Backward compatibility: older sessions/roles used `orders` for the
  // Governorates & Areas page before the dedicated `areas` permission was
  // introduced. Keep those users working while new roles use `areas`.
  const allowed = permission === 'areas'
    ? Boolean(permissions.areas || permissions.orders)
    : Boolean(permissions[permission]);
  if (permission && !allowed) {
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

async function dbDelete(table, filters, options = {}) {
  const query = { ...filters };
  return await supabaseRequest(table, {
    method: 'DELETE',
    query,
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

async function resolveCompanyId(user) {
  return user?.company_id || await getFirstCompanyId();
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


const DEFAULT_ROLE_CODES = {
  admin: ['dashboard','users','orders.create','orders.search','shipments','delivery_jobs','delivery_job_code','drivers','merchants','areas','accounting','expenses','audit'],
  manager: ['dashboard','orders.create','orders.search','shipments','delivery_jobs','delivery_job_code','drivers','merchants','areas','accounting','expenses','audit'],
  dispatcher: ['dashboard','orders.create','orders.search','shipments','delivery_jobs','delivery_job_code','drivers','merchants','areas','expenses'],
  employee: ['dashboard','orders.create','orders.search','shipments','merchants','areas'],
  driver: ['dashboard','shipments','delivery_jobs','drivers','expenses']
};

async function ensureRoleRecord(companyId, roleName) {
  const name = cleanString(roleName);
  if (!companyId || !name) return null;
  try {
    const existing = await dbSelect('roles', {
      select: '*',
      company_id: `eq.${companyId}`,
      name: `eq.${encodeURIComponent(name)}`,
      limit: 1
    });
    const found = firstRow(existing);
    if (found) return found;

    const role = firstRow(await dbInsert('roles', { company_id: companyId, name }));
    if (!role?.id) return null;

    const codes = DEFAULT_ROLE_CODES[name] || [];
    if (codes.length) {
      const permissions = await dbSelect('permissions', { select: 'id,code', limit: 500 });
      const byCode = new Map((permissions || []).map(x => [x.code, x.id]));
      for (const code of codes) {
        const permissionId = byCode.get(code);
        if (permissionId) {
          try {
            await dbInsert('role_permissions', { role_id: role.id, permission_id: permissionId }, { prefer: 'return=minimal' });
          } catch (_) {}
        }
      }
    }
    return role;
  } catch (error) {
    console.warn('ENSURE ROLE WARNING:', error.message);
    return null;
  }
}

async function getUserPermissions(userId, roleName) {
  const base = roles[roleName];
  if (base) return base;

  const permissions = {
    users:false, orders:false, shipments:false, jobs:false, drivers:false,
    merchants:false, areas:false, accounting:false, expenses:false, audit:false
  };

  try {
    const roleNameSafe = cleanString(roleName);
    const roleRows = await dbSelect('roles', {
      select: 'id',
      name: `eq.${encodeURIComponent(roleNameSafe)}`,
      limit: 1
    });
    const role = firstRow(roleRows);
    if (!role?.id) return permissions;

    const links = await dbSelect('role_permissions', {
      select: 'permission_id',
      role_id: `eq.${role.id}`,
      limit: 500
    });
    const ids = new Set((links || []).map(x => x.permission_id).filter(Boolean));
    if (!ids.size) return permissions;

    const all = await dbSelect('permissions', { select: 'id,code', limit: 500 });
    const allowed = new Set((all || []).filter(x => ids.has(x.id)).map(x => x.code));

    for (const key of Object.keys(permissions)) {
      if (allowed.has(key) || [...allowed].some(code => code.startsWith(`${key}.`))) {
        permissions[key] = true;
      }
    }
    return permissions;
  } catch (_) {
    return permissions;
  }
}

async function loginUser(username, password) {
  const identifier = String(username || '').trim().toLowerCase();

  if (ADMIN_PASSWORD && String(password) === ADMIN_PASSWORD &&
      ((ADMIN_USERNAME && identifier === ADMIN_USERNAME) || identifier === ADMIN_EMAIL)) {
    const companyId = await getFirstCompanyId();
    return {
      id: 'env-admin',
      name: 'Administrator',
      username: ADMIN_USERNAME || ADMIN_EMAIL,
      email: ADMIN_EMAIL,
      role: 'admin',
      company_id: companyId,
      language: 'ar',
      active: true,
      permissions: roles.admin
    };
  }

  let user = await getUserByUsername(identifier);
  if (!user && identifier.includes('@')) user = await getUserByEmail(identifier);
  if (!user || user.active === false) return null;
  if (!verifyPassword(password, user.password_hash)) return null;

  const role = await getUserRole(user.id);
  const permissions = await getUserPermissions(user.id, role);

  return {
    id: user.id,
    name: user.name || user.username || user.email || identifier,
    username: user.username || identifier,
    email: user.email || null,
    role,
    company_id: user.company_id || null,
    language: user.language || 'ar',
    active: user.active !== false,
    permissions
  };
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

  if (pathname === '/api/merchants/next-code' && req.method === 'GET') {
    const user = requireRole(req, res, 'merchants');
    if (!user) return;
    try {
      const companyId = await resolveCompanyId(user);
      const rows = await dbSelect('merchants', { select: 'code,merchant_no', company_id: `eq.${companyId}`, limit: 2000 });
      let maxCode = 0, maxNo = 0;
      for (const r of rows || []) {
        const cm = String(r.code || '').match(/^AB(\d{6,})$/i); if (cm) maxCode = Math.max(maxCode, Number(cm[1]));
        const nm = String(r.merchant_no || '').match(/^M(\d{6,})$/i); if (nm) maxNo = Math.max(maxNo, Number(nm[1]));
      }
      return json(res, 200, { success: true, code: `AB${String(maxCode + 1).padStart(6,'0')}`, merchant_no: `M${String(maxNo + 1).padStart(6,'0')}` });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/merchants' && req.method === 'GET') {
    const user = requireRole(req, res, 'merchants');
    if (!user) return;
    try {
      const rows = await getRows('merchants');
      const data = (rows || []).map(r => { const x = { ...r }; delete x.portal_password_hash; return x; });
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/merchants' && req.method === 'POST') {
    const user = requireRole(req, res, 'merchants');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = await resolveCompanyId(user);
      if (!body.name) return json(res, 400, { success: false, error: 'اسم التاجر مطلوب' });
      const existing = await dbSelect('merchants', { select: 'code,merchant_no,portal_username', company_id: `eq.${companyId}`, limit: 2000 });
      let maxCode = 0, maxNo = 0;
      for (const r of existing || []) {
        const cm = String(r.code || '').match(/^AB(\d{6,})$/i); if (cm) maxCode = Math.max(maxCode, Number(cm[1]));
        const nm = String(r.merchant_no || '').match(/^M(\d{6,})$/i); if (nm) maxNo = Math.max(maxNo, Number(nm[1]));
      }
      const code = cleanString(body.code) || `AB${String(maxCode + 1).padStart(6,'0')}`;
      const merchantNo = cleanString(body.merchant_no) || `M${String(maxNo + 1).padStart(6,'0')}`;
      const portalUsername = cleanString(body.portal_username).toLowerCase() || null;
      if (portalUsername && (existing || []).some(r => String(r.portal_username || '').toLowerCase() === portalUsername)) return json(res, 409, { success: false, error: 'اسم مستخدم التاجر مستخدم بالفعل' });
      const portalPassword = String(body.portal_password || '');
      if (portalUsername && !portalPassword) return json(res, 400, { success: false, error: 'أدخل كلمة مرور حساب التاجر' });
      const row = {
        company_id: companyId, merchant_no: merchantNo, code, name: cleanString(body.name), phone: cleanString(body.phone) || null, address: cleanString(body.address) || null,
        active: body.active !== false, tax_enabled: Boolean(body.tax_enabled), tax_rate: Math.max(0, Math.min(100, cleanNumber(body.tax_rate))), base_delivery_fee: Math.max(0, cleanNumber(body.base_delivery_fee)),
        store_type: cleanString(body.store_type) || null, store_name: cleanString(body.store_name) || null, store_url: cleanString(body.store_url) || null, store_active: body.store_active !== false,
        portal_username: portalUsername, portal_password_hash: portalPassword ? hashPassword(portalPassword) : null, proof_images: Array.isArray(body.proof_images) ? body.proof_images.slice(0,8) : []
      };
      const data = firstRow(await dbInsert('merchants', row));
      if (data) delete data.portal_password_hash;
      await audit(user, 'create_merchant', 'merchant', data?.id || null, { ...row, portal_password_hash: undefined });
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
      for (const key of ['merchant_no','code','name','phone','address','store_type','store_name','store_url','portal_username']) {
        if (body[key] !== undefined) patch[key] = cleanString(body[key]) || null;
      }
      for (const key of ['active','store_active']) if (body[key] !== undefined) patch[key] = Boolean(body[key]);
      if (body.tax_enabled !== undefined) patch.tax_enabled = Boolean(body.tax_enabled);
      if (body.tax_rate !== undefined) patch.tax_rate = Math.max(0, Math.min(100, cleanNumber(body.tax_rate)));
      if (body.base_delivery_fee !== undefined) patch.base_delivery_fee = Math.max(0, cleanNumber(body.base_delivery_fee));
      if (body.portal_password) patch.portal_password_hash = hashPassword(String(body.portal_password));
      if (Array.isArray(body.proof_images)) patch.proof_images = body.proof_images.slice(0,8);
      if (patch.portal_username) {
        const companyId = await resolveCompanyId(user);
        const dup = await dbSelect('merchants', { select:'id', company_id:`eq.${companyId}`, portal_username:`eq.${encodeURIComponent(patch.portal_username)}`, limit:2 });
        if ((dup||[]).some(x=>x.id!==body.id)) return json(res,409,{success:false,error:'اسم مستخدم التاجر مستخدم بالفعل'});
      }
      const data = await dbUpdate('merchants', { id: `eq.${body.id}` }, patch);
      if (Array.isArray(data)) data.forEach(x=>delete x.portal_password_hash);
      await audit(user, 'update_merchant', 'merchant', body.id, { ...patch, portal_password_hash: undefined });
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/governorates' && req.method === 'GET') {
    const user = requireAuth(req, res); if (!user) return;
    try {
      const companyId = await resolveCompanyId(user);
      let rows = companyId ? await dbSelect('governorates',{select:'*',company_id:`eq.${companyId}`,order:'name_ar.asc',limit:5000}) : [];
      // Compatibility: older imported records may have no company_id.
      if (!rows.length) rows = await dbSelect('governorates',{select:'*',order:'name_ar.asc',limit:5000});
      return json(res,200,{success:true,data:rows||[]});
    } catch(error){ return json(res,500,{success:false,error:error.message}); }
  }

  if (pathname === '/api/governorates' && req.method === 'POST') {
    const user=requireRole(req,res,'areas'); if(!user)return;
    try { const body=await bodyJson(req), companyId=await resolveCompanyId(user), nameAr=cleanString(body.name_ar), nameEn=cleanString(body.name_en); if(!nameAr)return json(res,400,{success:false,error:'اسم الإمارة مطلوب'}); const data=firstRow(await dbInsert('governorates',{company_id:companyId,name_ar:nameAr,name_en:nameEn||null})); await audit(user,'create_governorate','governorate',data?.id||null,{name_ar:nameAr,name_en:nameEn}); return json(res,200,{success:true,data}); }
    catch(error){return json(res,500,{success:false,error:error.message});}
  }

  if (pathname === '/api/areas' && req.method === 'GET') {
    const user = requireAuth(req, res); if (!user) return;
    try {
      const companyId = await resolveCompanyId(user);
      let rows = companyId ? await dbSelect('areas',{select:'*',company_id:`eq.${companyId}`,order:'name_ar.asc',limit:5000}) : [];
      // Compatibility: older imported records may have no company_id.
      if (!rows.length) rows = await dbSelect('areas',{select:'*',order:'name_ar.asc',limit:5000});
      return json(res,200,{success:true,data:rows||[]});
    } catch(error){ return json(res,500,{success:false,error:error.message}); }
  }

  if (pathname === '/api/areas' && req.method === 'POST') {
    const user=requireRole(req,res,'areas'); if(!user)return;
    try { const body=await bodyJson(req), companyId=await resolveCompanyId(user), governorateId=cleanString(body.governorate_id), nameAr=cleanString(body.name_ar), nameEn=cleanString(body.name_en); if(!governorateId||!nameAr)return json(res,400,{success:false,error:'اختر الإمارة وأدخل اسم المنطقة'}); const gov=firstRow(await dbSelect('governorates',{select:'id',id:`eq.${governorateId}`,company_id:`eq.${companyId}`,limit:1})); if(!gov)return json(res,400,{success:false,error:'الإمارة غير صحيحة'}); const data=firstRow(await dbInsert('areas',{company_id:companyId,governorate_id:governorateId,name_ar:nameAr,name_en:nameEn||null})); await audit(user,'create_area','area',data?.id||null,{governorate_id:governorateId,name_ar:nameAr,name_en:nameEn}); return json(res,200,{success:true,data}); }
    catch(error){return json(res,500,{success:false,error:error.message});}
  }

  if (pathname === '/api/areas/import' && req.method === 'POST') {
    const user=requireRole(req,res,'areas'); if(!user)return;
    try {
      const body=await bodyJson(req), companyId=await resolveCompanyId(user), rows=Array.isArray(body.rows)?body.rows:[];
      if(!rows.length)return json(res,400,{success:false,error:'ملف Excel لا يحتوي على بيانات'});
      const govs=await dbSelect('governorates',{select:'id,name_ar,name_en',company_id:`eq.${companyId}`,limit:5000}); const govMap=new Map();
      for(const g of govs||[]){govMap.set(String(g.name_ar||'').trim().toLowerCase(),g.id); if(g.name_en)govMap.set(String(g.name_en).trim().toLowerCase(),g.id);}
      let imported=0,skipped=0; const errors=[];
      for(let i=0;i<rows.length;i++){
        const r=rows[i]||{}, govName=cleanString(r['الإمارة']||r['Governorate']||r['governorate']||r['اسم الإمارة']), areaName=cleanString(r['المنطقة']||r['Area']||r['area']||r['اسم المنطقة']), areaEn=cleanString(r['اسم المنطقة EN']||r['Area EN']||r['area_en']||r['English']);
        if(!govName||!areaName){skipped++;errors.push(`صف ${i+2}: الإمارة والمنطقة مطلوبان`);continue;}
        let govId=govMap.get(govName.toLowerCase());
        if(!govId){const g=firstRow(await dbInsert('governorates',{company_id:companyId,name_ar:govName,name_en:null})); if(!g?.id){skipped++;continue;} govId=g.id;govMap.set(govName.toLowerCase(),govId);}
        const existing=await dbSelect('areas',{select:'id',company_id:`eq.${companyId}`,governorate_id:`eq.${govId}`,name_ar:`eq.${encodeURIComponent(areaName)}`,limit:1}); if((existing||[]).length){skipped++;continue;}
        await dbInsert('areas',{company_id:companyId,governorate_id:govId,name_ar:areaName,name_en:areaEn||null}); imported++;
      }
      await audit(user,'import_areas','area',null,{imported,skipped}); return json(res,200,{success:true,imported,skipped,errors});
    }catch(error){return json(res,500,{success:false,error:error.message});}
  }

  if (pathname === '/api/drivers' && req.method === 'GET') {
    const user = requireRole(req, res, 'drivers');
    if (!user) return;
    try {
      return json(res, 200, { success: true, data: await getRows('drivers') });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
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

  if (pathname === '/api/new-job-code/next' && req.method === 'GET') {
    const user = requireRole(req, res, 'jobs');
    if (!user) return;
    try {
      const companyId = await resolveCompanyId(user);
      const rows = await dbSelect('shipments', {
        select: 'new_job_code',
        company_id: `eq.${companyId}`,
        new_job_code: 'not.is.null',
        limit: 5000
      });
      let max = 0;
      let width = 0;
      for (const row of rows || []) {
        const value = cleanString(row.new_job_code);
        if (/^\d+$/.test(value)) {
          max = Math.max(max, Number(value));
          width = Math.max(width, value.length);
        }
      }
      const next = String(max + 1).padStart(Math.max(1, width), '0');
      return json(res, 200, { success: true, next_job_code: next });
    } catch (error) {
      console.error('NEXT JOB CODE ERROR:', error);
      return json(res, 500, { success:false, error:error.message });
    }
  }

  if (pathname === '/api/new-job-code' && req.method === 'POST') {
    const user = requireRole(req, res, 'jobs');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const shipmentNo = cleanString(body.shipment_no);
      const jobCode = cleanString(body.delivery_job_code);
      const releaseDate = cleanString(body.release_date);
      if (!shipmentNo) return json(res, 400, { success:false, error:'رقم الشحنة مطلوب' });
      if (!jobCode) return json(res, 400, { success:false, error:'Job Code مطلوب' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) return json(res, 400, { success:false, error:'تاريخ الخروج غير صحيح' });

      const companyId = await resolveCompanyId(user);
      const rows = await dbSelect('shipments', { select:'*', shipment_no:`eq.${encodeURIComponent(shipmentNo)}`, company_id:`eq.${companyId}`, limit:2 });
      const shipment = firstRow(rows);
      if (!shipment) return json(res, 404, { success:false, error:'رقم الشحنة غير موجود' });

      const current = String(shipment.status || '').trim().toLowerCase().replace(/\s+/g,'_');
      const allowed = new Set([
        'returned_by_driver','returned_bydriver','return_by_driver',
        'to_be_picked_up','tobe_picked_up','future_delivery',
        'cancelled','canceled','cancelled_by_shipper','cancelled_by_reciver','cancelled_by_receiver'
      ]);
      if (!allowed.has(current)) {
        return json(res, 409, { success:false, error:`لا يمكن تحويل الشحنة إلى In ops من الحالة الحالية: ${shipment.status || 'غير معروفة'}` });
      }

      const duplicateRows = await dbSelect('shipments', {
        select: 'id,shipment_no,new_job_code',
        company_id: `eq.${companyId}`,
        new_job_code: `eq.${encodeURIComponent(jobCode)}`,
        limit: 2
      });
      const duplicate = (duplicateRows || []).find(row => String(row.id) !== String(shipment.id));
      if (duplicate) {
        return json(res, 409, {
          success:false,
          duplicate:true,
          error:`Job Code ${jobCode} مكرر بالفعل مع الشحنة ${duplicate.shipment_no || duplicate.id}`
        });
      }

      const patch = {
        status:'in_ops',
        in_ops_release_date:releaseDate,
        new_job_code:jobCode
      };
      const serial = cleanNumber(body.serial_no, shipment.serial_no || 0);
      if (serial) patch.serial_no = serial;
      const updated = await dbUpdate('shipments', { id:`eq.${shipment.id}`, company_id:`eq.${companyId}` }, patch);
      await audit(user, 'new_job_code_in_ops', 'shipment', shipment.id, { shipment_no:shipmentNo, job_code:jobCode, release_date:releaseDate, previous_status:shipment.status });
      return json(res, 200, { success:true, data:firstRow(updated), message:'تم تحويل الشحنة إلى In ops وتجهيزها لتاريخ الخروج المحدد' });
    } catch (error) {
      console.error('NEW JOB CODE ERROR:', error);
      return json(res, 500, { success:false, error:error.message });
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

  if (pathname === '/api/accounting/summary' && req.method === 'GET') {
    const user = requireRole(req, res, 'accounting');
    if (!user) return;
    try {
      const companyId = await resolveCompanyId(user);
      let orders = companyId ? await dbSelect('orders',{select:'*',company_id:`eq.${companyId}`,limit:5000}) : [];
      let merchants = companyId ? await dbSelect('merchants',{select:'*',company_id:`eq.${companyId}`,limit:5000}) : [];
      if (!orders.length) orders = await dbSelect('orders',{select:'*',limit:5000});
      if (!merchants.length) merchants = await dbSelect('merchants',{select:'*',limit:5000});
      const merchantMap = new Map((merchants||[]).map(m=>[String(m.id),m]));
      let orderValue=0, deliveryFees=0, taxes=0;
      for (const o of orders||[]) {
        const value = cleanNumber(o.total_amount ?? o.order_value ?? o.amount ?? o.cod_amount, 0);
        const fee = cleanNumber(o.delivery_fee ?? o.delivery_fees ?? o.shipping_fee, 0);
        const merchant = merchantMap.get(String(o.merchant_id));
        const rate = merchant?.tax_enabled ? cleanNumber(merchant.tax_rate,0) : 0;
        const tax = cleanNumber(o.tax_amount, fee * rate / 100);
        orderValue += value; deliveryFees += fee; taxes += tax;
      }
      const merchantNet = orderValue + deliveryFees - taxes;
      return json(res,200,{success:true,data:{totalOrders:(orders||[]).length,orderValue,deliveryFees,taxes,merchantNet}});
    } catch(error) {
      return json(res,500,{success:false,error:error.message});
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

async function nextEmployeeCode(companyId) {
  const prefix = 'A';
  try {
    const rows = await dbSelect('users', {
      select: 'employee_code',
      company_id: `eq.${companyId}`,
      limit: 2000
    });
    let max = 0;
    for (const row of (rows || [])) {
      const code = String(row.employee_code || '').trim().toUpperCase();
      const m = code.match(/^A(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `${prefix}${max + 1}`;
  } catch (error) {
    // If the new column is not migrated yet, surface a clear message.
    if (/employee_code|column/i.test(String(error.message || ''))) {
      throw new Error('عمود كود الموظف غير موجود. شغّل ملف employee-username-permissions-migration.sql مرة واحدة في Supabase.');
    }
    throw error;
  }
}

function isAdminUser(user) {
  return String(user?.role || '').toLowerCase() === 'admin';
}

  if (pathname === '/api/users' && req.method === 'GET') {
    const user = requireRole(req, res, 'users');
    if (!user) return;
    try {
      const rows = await dbSelect('users', {
        select: 'id,company_id,name,username,employee_code,email,language,active,created_at',
        order: 'created_at.desc',
        limit: 500
      });
      return json(res, 200, { success: true, data: rows });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/users' && req.method === 'POST') {
    const user = requireRole(req, res, 'users');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = body.company_id || user.company_id || await getFirstCompanyId();
      const username = cleanString(body.username).toLowerCase();
      const email = cleanString(body.email).toLowerCase() || `${username}@local.trend`;

      if (!companyId) return json(res, 400, { success: false, error: 'لم يتم العثور على الشركة' });
      const employeeCode = await nextEmployeeCode(companyId);
      if (!cleanString(body.name) || !username || !body.password) {
        return json(res, 400, { success: false, error: 'الاسم واسم المستخدم وكلمة المرور مطلوبة' });
      }
      if (String(body.password).length < 6) {
        return json(res, 400, { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      }

      const existingUser = await dbSelect('users', {
        select: 'id',
        company_id: `eq.${companyId}`,
        username: `eq.${encodeURIComponent(username)}`,
        limit: 1
      });
      if (existingUser.length) {
        return json(res, 409, { success: false, error: 'اسم المستخدم مستخدم بالفعل' });
      }

      const row = {
        company_id: companyId,
        employee_code: employeeCode,
        name: cleanString(body.name),
        username,
        email,
        password_hash: hashPassword(String(body.password)),
        language: body.language || 'ar',
        active: body.active !== false
      };

      const data = firstRow(await dbInsert('users', row));
      if (!data?.id) throw new Error('فشل إنشاء الموظف');

      if (body.role) {
        const role = await ensureRoleRecord(companyId, body.role);
        if (role?.id) {
          try {
            await dbInsert('user_roles', { user_id: data.id, role_id: role.id }, { prefer: 'return=minimal' });
          } catch (roleError) {
            console.warn('USER ROLE WARNING:', roleError.message);
          }
        }
      }

      return json(res, 200, { success: true, data: { ...data, password: undefined } });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  const userActionMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userActionMatch && (req.method === 'PATCH' || req.method === 'DELETE')) {
    const admin = requireAuth(req, res);
    if (!admin) return;
    if (!isAdminUser(admin)) {
      return json(res, 403, { success: false, error: 'هذه العملية متاحة لمدير النظام فقط' });
    }

    const targetId = decodeURIComponent(userActionMatch[1]);
    if (targetId === admin.id) {
      return json(res, 400, { success: false, error: 'لا يمكن إيقاف أو حذف حسابك الحالي' });
    }

    try {
      const companyId = admin.company_id || await getFirstCompanyId();
      const targetRows = await dbSelect('users', {
        select: 'id,company_id,name,username,employee_code,active',
        id: `eq.${targetId}`,
        limit: 1
      });
      const target = firstRow(targetRows);
      if (!target) return json(res, 404, { success: false, error: 'الموظف غير موجود' });
      if (companyId && target.company_id && String(target.company_id) !== String(companyId)) {
        return json(res, 403, { success: false, error: 'لا يمكنك إدارة موظف تابع لشركة أخرى' });
      }

      if (req.method === 'PATCH') {
        const body = await bodyJson(req);
        const active = Boolean(body.active);
        await dbUpdate('users', { id: `eq.${targetId}` }, { active });
        // Invalidate all existing sessions for a disabled account.
        if (!active) {
          for (const [sessionToken, session] of sessions.entries()) {
            if (String(session?.user?.id) === String(targetId)) sessions.delete(sessionToken);
          }
        }
        return json(res, 200, { success: true, data: { ...target, active } });
      }

      // Delete role links first, then the user record.
      try { await dbDelete('user_roles', { user_id: `eq.${targetId}` }, { prefer: 'return=minimal' }); } catch (_) {}
      await dbDelete('users', { id: `eq.${targetId}` }, { prefer: 'return=minimal' });
      for (const [sessionToken, session] of sessions.entries()) {
        if (String(session?.user?.id) === String(targetId)) sessions.delete(sessionToken);
      }
      return json(res, 200, { success: true });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message || 'فشل تنفيذ العملية' });
    }
  }

  if (pathname === '/api/roles' && req.method === 'GET') {
    const user = requireRole(req, res, 'users');
    if (!user) return;
    try {
      const companyId = user.company_id || await getFirstCompanyId();
      if (!companyId) return json(res, 200, { success: true, data: [] });

      for (const name of Object.keys(DEFAULT_ROLE_CODES)) {
        await ensureRoleRecord(companyId, name);
      }

      const rows = await dbSelect('roles', {
        select: 'id,name',
        company_id: `eq.${companyId}`,
        order: 'name.asc',
        limit: 100
      });
      return json(res, 200, { success: true, data: rows });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/permissions' && req.method === 'GET') {
    const user = requireRole(req, res, 'users');
    if (!user) return;
    try {
      const rows = await dbSelect('permissions', {
        select: 'id,code,name_ar,name_en',
        order: 'code.asc',
        limit: 500
      });
      return json(res, 200, { success: true, data: rows });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/roles' && req.method === 'POST') {
    const user = requireRole(req, res, 'users');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = user.company_id || await getFirstCompanyId();
      const name = cleanString(body.name);
      const codes = uniqueArray(Array.isArray(body.permissions) ? body.permissions : []);
      if (!companyId) return json(res, 400, { success: false, error: 'لم يتم العثور على الشركة' });
      if (!name) return json(res, 400, { success: false, error: 'اسم مجموعة الصلاحيات مطلوب' });
      if (!codes.length) return json(res, 400, { success: false, error: 'اختر صلاحية واحدة على الأقل' });

      const existing = await dbSelect('roles', {
        select: 'id',
        company_id: `eq.${companyId}`,
        name: `eq.${encodeURIComponent(name)}`,
        limit: 1
      });
      if (existing.length) return json(res, 409, { success: false, error: 'مجموعة الصلاحيات موجودة بالفعل' });

      const role = firstRow(await dbInsert('roles', { company_id: companyId, name }));
      if (!role?.id) throw new Error('فشل إنشاء مجموعة الصلاحيات');

      const permissions = await dbSelect('permissions', { select: 'id,code', limit: 500 });
      const byCode = new Map((permissions || []).map(x => [x.code, x.id]));
      for (const code of codes) {
        const permissionId = byCode.get(code);
        if (permissionId) {
          try {
            await dbInsert('role_permissions', { role_id: role.id, permission_id: permissionId }, { prefer: 'return=minimal' });
          } catch (_) {}
        }
      }

      return json(res, 200, { success: true, data: role });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
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
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
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
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
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
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
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
