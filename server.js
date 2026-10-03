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

function requireRole(req, res, permission) {
  const user = requireAuth(req, res);
  if (!user) return null;
  const role = roles[user.role] || user.permissions || roles.employee;
  if (permission && !role[permission]) {
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
    const id = firstRow(rows)?.id || null;
    if (id) return id;
  } catch (_) {}

  // Compatibility fallback for databases where the companies table is
  // populated after the other company-scoped tables.
  for (const table of ['merchants', 'orders', 'drivers', 'governorates', 'areas', 'users']) {
    try {
      const rows = await dbSelect(table, { select: 'company_id', limit: 1 });
      const id = firstRow(rows)?.company_id || null;
      if (id) return id;
    } catch (_) {}
  }
  return null;
}

async function resolveCompanyId(user) {
  const id = user?.company_id || await getFirstCompanyId();
  if (!id) throw new Error('لم يتم العثور على الشركة المرتبط بها الحساب. تأكد من وجود شركة في قاعدة البيانات.');
  return id;
}

function generateTrackingNumber(serialNo) {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const serial = String(Number(serialNo) || 0).padStart(6, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TRK-${y}${m}${day}-${serial}-${random}`;
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

async function getUserPermissions(userId, roleName) {
  const base = roles[roleName];
  if (base) return base;
  const permissions = { users:false, orders:false, shipments:false, jobs:false, drivers:false, merchants:false, accounting:false, expenses:false, audit:false };
  try {
    const roleRows = await dbSelect('roles', { select:'id', name:`eq.${encodeURIComponent(roleName)}`, limit:1 });
    const role = firstRow(roleRows);
    if (!role?.id) return permissions;
    const links = await dbSelect('role_permissions', { select:'permission_id', role_id:`eq.${role.id}`, limit:500 });
    const ids = links.map(x=>x.permission_id).filter(Boolean);
    if (!ids.length) return permissions;
    const perms = await dbSelect('permissions', { select:'id,code', limit:500 });
    const allowed = new Set(perms.filter(x=>ids.includes(x.id)).map(x=>x.code));
    for (const key of Object.keys(permissions)) {
      if (allowed.has(key) || [...allowed].some(code => code.startsWith(`${key}.`))) permissions[key] = true;
    }
    return permissions;
  } catch (_) { return permissions; }
}

async function loginUser(username, password) {
  const identifier = String(username || '').trim().toLowerCase();
  if (ADMIN_PASSWORD && String(password) === ADMIN_PASSWORD &&
      ((ADMIN_USERNAME && identifier === ADMIN_USERNAME) || identifier === ADMIN_EMAIL)) {
    const companyId = await getFirstCompanyId();
    return { id: 'env-admin', name: 'Administrator', username: ADMIN_USERNAME || ADMIN_EMAIL, email: ADMIN_EMAIL, role: 'admin', company_id: companyId, language: 'ar', active: true, permissions: roles.admin };
  }
  let user = await getUserByUsername(identifier);
  if (!user && identifier.includes('@')) user = await getUserByEmail(identifier);
  if (!user || user.active === false) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  const role = await getUserRole(user.id);
  const permissions = await getUserPermissions(user.id, role);
  return { id: user.id, name: user.name || user.username || user.email || identifier, username: user.username || identifier, email: user.email || null, role, company_id: user.company_id || null, language: user.language || 'ar', active: user.active !== false, permissions };
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
  const companyId = await resolveCompanyId(user);
  const serialNo = cleanNumber(body.serial_no, await nextSerial(user));
  const merchantId = cleanString(body.merchant_id);
  const merchantOrderNo = cleanString(body.merchant_order_no);
  if (!merchantId) throw new Error('اختيار التاجر مطلوب');
  if (!merchantOrderNo) throw new Error('رقم الأوردر الخاص بالتاجر مطلوب');

  // Merchant order numbers are required and must not be duplicated for the same merchant.
  try {
    const duplicateRows = await dbSelect('orders', {
      select: 'id,tracking_number,order_code',
      company_id: `eq.${companyId}`,
      merchant_id: `eq.${merchantId}`,
      merchant_order_no: `eq.${encodeURIComponent(merchantOrderNo)}`,
      limit: 1
    });
    const duplicate = firstRow(duplicateRows);
    if (duplicate) throw new Error(`رقم أوردر التاجر مستخدم بالفعل. Tracking: ${duplicate.tracking_number || duplicate.order_code || duplicate.id}`);
  } catch (error) {
    if (String(error.message || '').includes('مستخدم بالفعل')) throw error;
  }

  const orderCode = `ORD-${serialNo}`;

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
  const merchantForFee = body.merchant_id ? await getMerchant(body.merchant_id).catch(() => null) : null;
  const requestedDeliveryFee = Number(body.delivery_fee);
  const deliveryFee = Number.isFinite(requestedDeliveryFee) && requestedDeliveryFee > 0
    ? requestedDeliveryFee
    : cleanNumber(merchantForFee?.base_delivery_fee);
  const taxAmount = merchantTaxEnabled ? Number((orderValue * merchantTaxRate / 100).toFixed(2)) : 0;
  const merchantNetValue = Number((orderValue - taxAmount).toFixed(2));

  const orderPayload = {
    company_id: companyId, serial_no: serialNo, order_code: orderCode, merchant_id: merchantId,
    merchant_order_no: merchantOrderNo, customer_id: customer?.id || null,
    customer_name: cleanString(body.customer_name) || null, customer_phone: cleanString(body.customer_phone) || null,
    governorate_id: body.governorate_id || null, area_id: body.area_id || null, address: cleanString(body.address) || null,
    value: orderValue, delivery_fee: deliveryFee, tax_enabled: merchantTaxEnabled,
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
  let trackingNumber = generateTrackingNumber(serialNo);
  try {
    for (let i = 0; i < 5; i++) {
      const existingTracking = await dbSelect('shipments', { select: 'id', tracking_number: `eq.${trackingNumber}`, limit: 1 });
      if (!existingTracking.length) break;
      trackingNumber = generateTrackingNumber(serialNo);
    }
  } catch (_) {}

  const shipmentPayload = {
    company_id: companyId,
    order_id: order.id,
    shipment_no: shipmentNo,
    tracking_number: trackingNumber,
    serial_no: serialNo,
    status: 'received'
  };

  try {
    shipment = firstRow(await dbInsert('shipments', shipmentPayload));
  } catch (error) {
    // Compatibility with schemas where status has a different default/constraint.
    const fallback = { ...shipmentPayload };
    delete fallback.status;
    try {
      shipment = firstRow(await dbInsert('shipments', fallback));
    } catch (trackingSchemaError) {
      delete fallback.tracking_number;
      shipment = firstRow(await dbInsert('shipments', fallback));
    }
  }

  if (!shipment?.id) throw new Error('تم إنشاء الأوردر لكن فشل إنشاء الشحنة');

  await audit(user, 'create_order', 'order', order.id, { shipment_id: shipment.id });

  return {
    order,
    shipment,
    trackingNumber: shipment.tracking_number || trackingNumber,
    serialDuplicate: false
  };
}


async function getOrderById(id) {
  if (!id) return null;
  const rows = await dbSelect('orders', { select: '*', id: `eq.${id}`, limit: 1 });
  return firstRow(rows);
}

async function getOrderDetails(id) {
  const order = await getOrderById(id);
  if (!order) return null;
  let shipment = null;
  let merchant = null;
  let history = [];
  try { shipment = firstRow(await dbSelect('shipments', { select: '*', order_id: `eq.${id}`, limit: 1 })); } catch (_) {}
  try { merchant = firstRow(await dbSelect('merchants', { select: '*', id: `eq.${order.merchant_id}`, limit: 1 })); } catch (_) {}
  if (shipment?.id) {
    try { history = await dbSelect('shipment_status_history', { select: '*', shipment_id: `eq.${shipment.id}`, order: 'created_at.desc', limit: 100 }); } catch (_) {}
  }
  return { order, shipment, merchant, history };
}

async function getOrderAuditTrail(orderId, shipmentId = null) {
  const ids = [orderId, shipmentId].filter(Boolean);
  if (!ids.length) return [];
  const wanted = new Set(ids.map(String));
  let auditRows = [];
  let statusRows = [];
  try {
    const allAudit = await dbSelect('audit_logs', { select: '*', order: 'created_at.desc', limit: 2000 });
    auditRows = allAudit.filter(r => wanted.has(String(r.entity_id)));
  } catch (_) {}
  if (shipmentId) {
    try {
      statusRows = await dbSelect('shipment_status_history', { select: '*', shipment_id: `eq.${shipmentId}`, order: 'created_at.desc', limit: 500 });
    } catch (_) {}
  }
  const userIds = [...new Set([...auditRows, ...statusRows].map(r => r.user_id).filter(Boolean).map(String))];
  const users = userIds.length ? await dbSelect('users', { select: 'id,name,username,employee_code,email', limit: 1000 }).catch(() => []) : [];
  const byUser = new Map(users.map(u => [String(u.id), u]));
  const audits = auditRows.map(r => {
    const u = byUser.get(String(r.user_id));
    return {
      ...r,
      history_type: 'audit',
      user_name: u?.name || u?.username || u?.email || (r.user_id ? String(r.user_id) : 'System'),
      employee_code: u?.employee_code || ''
    };
  });
  const statuses = statusRows.map(r => {
    const u = byUser.get(String(r.user_id));
    return {
      ...r,
      action: 'update_shipment_status',
      history_type: 'status',
      details: { status: r.status },
      entity_type: 'shipment',
      entity_id: shipmentId,
      user_name: u?.name || u?.username || u?.email || (r.user_id ? String(r.user_id) : 'System'),
      employee_code: u?.employee_code || ''
    };
  });
  return [...audits, ...statuses].sort((a,b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
}

async function listShipments(from, to) {
  const shipments = await dbSelect('shipments', { select: '*', order: 'created_at.desc', limit: 2000 });
  const orders = await dbSelect('orders', { select: '*', order: 'created_at.desc', limit: 2000 });
  const merchants = await dbSelect('merchants', { select: 'id,name,merchant_no,code', limit: 1000 });
  const byOrder = new Map(orders.map(x => [x.id, x]));
  const byMerchant = new Map(merchants.map(x => [x.id, x]));
  const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
  return shipments
    .map(s => {
      const o = byOrder.get(s.order_id) || {};
      const m = byMerchant.get(o.merchant_id) || {};
      return { ...s, order: o, merchant: m };
    })
    .filter(row => {
      const stamp = new Date(row.order.created_at || row.created_at).getTime();
      if (fromMs !== null && stamp < fromMs) return false;
      if (toMs !== null && stamp > toMs) return false;
      return true;
    });
}

async function updateOrder(user, id, body) {
  const existing = await getOrderById(id);
  if (!existing) throw new Error('الأوردر غير موجود');
  const patch = {
    merchant_id: body.merchant_id || existing.merchant_id,
    merchant_order_no: cleanString(body.merchant_order_no) || existing.merchant_order_no || null,
    customer_name: cleanString(body.customer_name) || null,
    customer_phone: cleanString(body.customer_phone) || null,
    governorate_id: body.governorate_id || null,
    area_id: body.area_id || null,
    address: cleanString(body.address) || null,
    value: cleanNumber(body.value),
    delivery_fee: cleanNumber(body.delivery_fee),
    notes: cleanString(body.notes) || null,
    status: cleanString(body.status, existing.status) || existing.status
  };
  if (body.order_code) patch.order_code = cleanString(body.order_code);
  const data = firstRow(await dbUpdate('orders', { id: `eq.${id}` }, patch));
  if (!data) throw new Error('فشل تحديث الأوردر');
  try {
    await dbUpdate('customers', { id: `eq.${existing.customer_id}` }, {
      name: patch.customer_name || '', phone: patch.customer_phone || '', address: patch.address || null,
      governorate_id: patch.governorate_id, area_id: patch.area_id
    });
  } catch (_) {}
  await audit(user, 'update_order', 'order', id, patch);
  return await getOrderDetails(id);
}

async function getMerchant(id) {
  return firstRow(await dbSelect('merchants', { select: '*', id: `eq.${id}`, limit: 1 }));
}

async function searchAll(q) {
  const needle = cleanString(q).toLowerCase();
  if (!needle || needle === '__none__') return { type: 'none', data: null };

  const configs = [
    ['shipments', ['shipment_no', 'tracking_number', 'serial_no', 'status', 'order_id']],
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
    if (found) {
      if (table === 'shipments' && found.order_id) {
        const details = await getOrderDetails(found.order_id);
        const audit = await getOrderAuditTrail(details?.order?.id, details?.shipment?.id);
        return { type: 'shipment', data: { ...found, order: details?.order || null, merchant: details?.merchant || null, history: details?.history || [], audit } };
      }
      if (table === 'orders' && found.id) {
        const details = await getOrderDetails(found.id);
        const audit = await getOrderAuditTrail(details?.order?.id, details?.shipment?.id);
        return { type: 'order', data: { ...(details || found), audit } };
      }
      return { type: table === 'shipments' ? 'shipment' : table.slice(0, -1), data: found };
    }
  }

  return { type: 'none', data: null };
}

async function getRows(table, order = 'created_at.desc', limit = 500) {
  return await dbSelect(table, { select: '*', order, limit });
}


const COMMISSION_ELIGIBLE_STATUSES = new Set([
  'delivered', 'half delivered', 'cancelled by shipper', 'cancelled by receiver', 'replaced',
  'half_delivered', 'cancelled_by_shipper', 'cancelled_by_receiver'
]);
function commissionStatusKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function isCommissionEligibleStatus(value) {
  return COMMISSION_ELIGIBLE_STATUSES.has(commissionStatusKey(value));
}
function commissionState(order) {
  const eligible = isCommissionEligibleStatus(order?.status);
  const paid = String(order?.commission_paid_status || '').toLowerCase() === 'paid';
  const verified = String(order?.commission_verify_status || '').toLowerCase() === 'verified';
  return { eligible, verify_status: paid ? 'paid' : (verified && eligible ? 'verified' : (eligible ? 'unverified' : 'unverified')), paid_status: paid ? 'paid' : 'unpaid' };
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


  if (pathname === '/api/orders/import' && req.method === 'POST') {
    const user = requireRole(req, res, 'orders'); if (!user) return;
    try {
      const body = await bodyJson(req);
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) return json(res, 400, { success: false, error: 'ملف الأوردرات فارغ' });
      const results = { imported: 0, skipped: 0, errors: [] };
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] || {};
        try {
          await createOrder(user, {
            merchant_id: r.merchant_id || r.merchantId || r['معرف التاجر'] || r['merchant_id'],
            merchant_order_no: r.merchant_order_no || r.order_number || r.order_no || r['رقم الأوردر'] || r['رقم أوردر التاجر'],
            customer_name: r.customer_name || r.customer || r['اسم العميل'],
            customer_phone: r.customer_phone || r.phone || r['هاتف العميل'] || r['رقم العميل'],
            governorate_id: r.governorate_id || null,
            area_id: r.area_id || null,
            address: r.address || r['العنوان'],
            value: r.value || r.order_value || r['قيمة الأوردر'],
            delivery_fee: r.delivery_fee || r['رسوم التوصيل'],
            notes: r.notes || r['ملاحظات']
          });
          results.imported++;
        } catch (e) { results.skipped++; results.errors.push({ row: i + 2, error: e.message }); }
      }
      return json(res, 200, { success: true, ...results });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/orders' && req.method === 'PATCH') {
    const user = requireRole(req, res, 'orders');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      if (!body.id) return json(res, 400, { success: false, error: 'معرّف الأوردر مطلوب' });
      const data = await updateOrder(user, body.id, body);
      return json(res, 200, { success: true, data });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname.startsWith('/api/orders/') && req.method === 'GET') {
    const user = requireRole(req, res, 'shipments');
    if (!user) return;
    try {
      const id = pathname.split('/').pop();
      const data = await getOrderDetails(id);
      if (!data) return json(res, 404, { success: false, error: 'الأوردر غير موجود' });
      data.audit = await getOrderAuditTrail(data.order?.id, data.shipment?.id);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/shipments' && req.method === 'GET') {
    const user = requireRole(req, res, 'shipments');
    if (!user) return;
    try {
      const from = url.searchParams.get('from') || '';
      const to = url.searchParams.get('to') || '';
      return json(res, 200, { success: true, data: await listShipments(from, to) });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname.startsWith('/api/shipments/') && req.method === 'GET') {
    const user = requireRole(req, res, 'shipments');
    if (!user) return;
    try {
      const id = pathname.split('/').pop();
      const rows = await dbSelect('shipments', { select: '*', id: `eq.${id}`, limit: 1 });
      const shipment = firstRow(rows);
      if (!shipment) return json(res, 404, { success: false, error: 'الشحنة غير موجودة' });
      const data = await getOrderDetails(shipment.order_id);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
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
    try {
      return json(res, 200, { success: true, data: await getRows('merchants') });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/merchants' && req.method === 'POST') {
    const user = requireRole(req, res, 'merchants');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = await resolveCompanyId(user);
      if (!body.name || !body.merchant_no || !body.code) return json(res, 400, { success: false, error: 'رقم التاجر والكود والاسم مطلوبة' });
      const row = {
        company_id: companyId, merchant_no: cleanString(body.merchant_no), code: cleanString(body.code),
        name: cleanString(body.name), phone: cleanString(body.phone) || null, address: cleanString(body.address) || null,
        active: body.active !== false, tax_enabled: Boolean(body.tax_enabled), tax_rate: Math.max(0, Math.min(100, cleanNumber(body.tax_rate))),
        base_delivery_fee: Math.max(0, cleanNumber(body.base_delivery_fee)), store_type: cleanString(body.store_type) || null,
        store_name: cleanString(body.store_name) || null, store_url: cleanString(body.store_url) || null,
        store_active: Boolean(body.store_active)
      };
      const data = firstRow(await dbInsert('merchants', row));
      await audit(user, 'create_merchant', 'merchant', data?.id || null, row);
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
      for (const key of ['merchant_no','code','name','phone','address','store_type','store_name','store_url']) {
        if (body[key] !== undefined) patch[key] = cleanString(body[key]) || null;
      }
      for (const key of ['active','store_active']) if (body[key] !== undefined) patch[key] = Boolean(body[key]);
      if (body.tax_enabled !== undefined) patch.tax_enabled = Boolean(body.tax_enabled);
      if (body.tax_rate !== undefined) patch.tax_rate = Math.max(0, Math.min(100, cleanNumber(body.tax_rate)));
      if (body.base_delivery_fee !== undefined) patch.base_delivery_fee = Math.max(0, cleanNumber(body.base_delivery_fee));
      const data = await dbUpdate('merchants', { id: `eq.${body.id}` }, patch);
      await audit(user, 'update_merchant', 'merchant', body.id, patch);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/merchant-integrations' && req.method === 'GET') {
    const user = requireRole(req, res, 'merchants');
    if (!user) return;
    try {
      const merchantId = url.searchParams.get('merchant_id') || '';
      const data = await dbSelect('integrations', { select: '*', merchant_id: `eq.${merchantId}`, order: 'created_at.desc' });
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/merchant-integrations' && req.method === 'POST') {
    const user = requireRole(req, res, 'merchants');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      if (!body.merchant_id || !body.name) return json(res, 400, { success: false, error: 'التاجر واسم المتجر مطلوبان' });
      const row = { merchant_id: body.merchant_id, type: cleanString(body.type) || 'ecommerce', name: cleanString(body.name), config: body.config || {}, active: body.active !== false };
      const data = firstRow(await dbInsert('integrations', row));
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/governorates' && req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;
    try {
      return json(res, 200, { success: true, data: await getRows('governorates', 'name_ar.asc') });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/areas' && req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;
    try {
      return json(res, 200, { success: true, data: await getRows('areas', 'name_ar.asc') });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }


  if (pathname === '/api/governorates' && req.method === 'POST') {
    const user = requireAuth(req, res); if (!user) return;
    try {
      const body = await bodyJson(req); const companyId = await resolveCompanyId(user);
      if (!body.name_ar) return json(res, 400, { success:false, error:'اسم الإمارة مطلوب' });
      const data = firstRow(await dbInsert('governorates', { company_id: companyId, name_ar: cleanString(body.name_ar), name_en: cleanString(body.name_en)||null }));
      return json(res, 200, {success:true,data});
    } catch(error){ return json(res,500,{success:false,error:error.message}); }
  }

  if (pathname === '/api/areas' && req.method === 'POST') {
    const user = requireAuth(req, res); if (!user) return;
    try {
      const body = await bodyJson(req); const companyId = await resolveCompanyId(user);
      if (!body.name_ar || !body.governorate_id) return json(res,400,{success:false,error:'الإمارة واسم المنطقة مطلوبان'});
      const data = firstRow(await dbInsert('areas',{company_id:companyId,governorate_id:body.governorate_id,name_ar:cleanString(body.name_ar),name_en:cleanString(body.name_en)||null}));
      return json(res,200,{success:true,data});
    } catch(error){ return json(res,500,{success:false,error:error.message}); }
  }

  if (pathname === '/api/areas/import' && req.method === 'POST') {
    const user = requireAuth(req, res); if (!user) return;
    try {
      const body = await bodyJson(req); const rows = Array.isArray(body.rows) ? body.rows : [];
      const govs = await dbSelect('governorates',{select:'id,name_ar,name_en',limit:1000});
      const byName = new Map(govs.map(g=>[String(g.name_ar).trim().toLowerCase(),g]));
      const companyId = await resolveCompanyId(user); let imported=0, skipped=0;
      for(const r of rows){
        const areaName=cleanString(r.area_ar||r.name_ar||r.area||r['المنطقة']);
        const govName=cleanString(r.governorate_ar||r.governorate||r['الإمارة']);
        if(!areaName||!govName){skipped++;continue;}
        const gov=byName.get(govName.toLowerCase());
        if(!gov){skipped++;continue;}
        try { await dbInsert('areas',{company_id:companyId,governorate_id:gov.id,name_ar:areaName,name_en:cleanString(r.area_en||r.name_en)||null}); imported++; }
        catch(e){ skipped++; }
      }
      return json(res,200,{success:true,imported,skipped});
    } catch(error){ return json(res,500,{success:false,error:error.message}); }
  }

  if (pathname === '/api/drivers/statement' && req.method === 'GET') {
    const user = requireRole(req, res, 'drivers');
    if (!user) return;
    try {
      const driverId = url.searchParams.get('driver_id') || '';
      if (!driverId) return json(res, 400, { success: false, error: 'السائق مطلوب' });
      const from = url.searchParams.get('from') || '';
      const to = url.searchParams.get('to') || '';
      const companyId = await resolveCompanyId(user);
      const driver = firstRow(await dbSelect('drivers', { select: '*', id: `eq.${driverId}`, company_id: `eq.${companyId}`, limit: 1 }));
      if (!driver) return json(res, 404, { success: false, error: 'السائق غير موجود' });
      const jobs = await dbSelect('delivery_jobs', { select: '*', driver_id: `eq.${driverId}`, company_id: `eq.${companyId}`, order: 'created_at.desc', limit: 5000 });
      const jobIds = jobs.map(j => j.id).filter(Boolean);
      let links = [];
      for (const jobId of jobIds) {
        try { links.push(...await dbSelect('delivery_job_shipments', { select: '*', delivery_job_id: `eq.${jobId}`, limit: 5000 })); } catch (_) {}
      }
      const shipmentIds = [...new Set(links.map(x => x.shipment_id).filter(Boolean))];
      let shipments = [];
      for (const sid of shipmentIds) { try { shipments.push(...await dbSelect('shipments', { select: '*', id: `eq.${sid}`, limit: 1 })); } catch (_) {} }
      const orderIds = [...new Set(shipments.map(x => x.order_id).filter(Boolean))];
      let orders = [];
      for (const oid of orderIds) { try { orders.push(...await dbSelect('orders', { select: '*', id: `eq.${oid}`, limit: 1 })); } catch (_) {} }
      const byOrder = new Map(orders.map(o => [String(o.id), o]));
      const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
      const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
      const merchants = await dbSelect('merchants', { select: 'id,name,merchant_no,code', company_id: `eq.${companyId}`, limit: 1000 }).catch(() => []);
      const merchantMap = new Map(merchants.map(m => [String(m.id), m]));
      const orderRows = [];
      for (const sh of shipments) {
        const o = byOrder.get(String(sh.order_id)) || {};
        let statusHistory = [];
        try { statusHistory = await dbSelect('shipment_status_history', { select: 'status,created_at,user_id', shipment_id: `eq.${sh.id}`, order: 'created_at.desc', limit: 200 }); } catch (_) {}
        const eligibleHistory = statusHistory.find(h => isCommissionEligibleStatus(h.status));
        const deliveryStamp = eligibleHistory ? new Date(eligibleHistory.created_at).getTime() : null;
        const stamp = deliveryStamp || new Date(o.created_at || sh.created_at).getTime();
        const state = commissionState(o);
        const merchant = merchantMap.get(String(o.merchant_id));
        const row = { ...o, shipment_id: sh.id, shipment_no: sh.shipment_no, tracking_number: sh.tracking_number, job_id: links.find(l => String(l.shipment_id) === String(sh.id))?.delivery_job_id || null, merchant_name: merchant?.name || '', merchant_no: merchant?.merchant_no || '', eligible: state.eligible, verify_status: state.verify_status, paid_status: state.paid_status, delivery_date: deliveryStamp ? new Date(deliveryStamp).toISOString().slice(0,10) : '', _stamp: stamp };
        if (fromMs !== null && stamp < fromMs) continue;
        if (toMs !== null && stamp > toMs) continue;
        orderRows.push(row);
      }
      orderRows.sort((a,b) => (b._stamp||0) - (a._stamp||0));
      const expensesAll = await dbSelect('expenses', { select: '*', driver_id: `eq.${driverId}`, company_id: `eq.${companyId}`, order: 'expense_date.desc', limit: 5000 }).catch(() => []);
      const expenses = expensesAll.filter(e => { const t = new Date(`${e.expense_date || e.created_at}T23:59:59`).getTime(); return (fromMs === null || t >= fromMs) && (toMs === null || t <= toMs); });
      const settlements = await dbSelect('driver_settlements', { select: '*', driver_id: `eq.${driverId}`, company_id: `eq.${companyId}`, order: 'paid_at.desc', limit: 5000 }).catch(() => []);
      const filteredSettlements = settlements.filter(x => { const t = new Date(x.paid_at || x.created_at).getTime(); return (fromMs === null || t >= fromMs) && (toMs === null || t <= toMs); });
      const employeeIds = [...new Set([...expenses.map(e => e.employee_id), ...filteredSettlements.map(e => e.employee_id)].filter(Boolean).map(String))];
      const employeeRows = employeeIds.length ? await dbSelect('users', { select: 'id,name,username,employee_code', limit: 1000 }).catch(() => []) : [];
      const employeeMap = new Map(employeeRows.map(u => [String(u.id), u]));
      const expensesWithEmployee = expenses.map(e => { const u = employeeMap.get(String(e.employee_id)); return { ...e, created_by_name: u?.name || u?.username || '', created_by_code: u?.employee_code || '' }; });
      const settlementsWithEmployee = filteredSettlements.map(e => { const u = employeeMap.get(String(e.employee_id)); return { ...e, employee_name: u?.name || u?.username || '', employee_code: u?.employee_code || '' }; });
      const orderTotal = orderRows.reduce((sum, o) => sum + cleanNumber(o.delivery_fee), 0);
      const expenseTotal = expensesWithEmployee.filter(e => String(e.category || '').toLowerCase() !== 'shortage').reduce((sum,e)=>sum+cleanNumber(e.amount),0);
      const shortageTotal = expensesWithEmployee.filter(e => String(e.category || '').toLowerCase() === 'shortage').reduce((sum,e)=>sum+cleanNumber(e.amount),0);
      const deductions = expenseTotal + shortageTotal;
      const required = orderTotal - deductions;
      return json(res, 200, { success: true, data: { driver, orders: orderRows, expenses: expensesWithEmployee, settlements: settlementsWithEmployee, totals: { orderTotal, expenseTotal, shortageTotal, deductions, required } } });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/driver-settlements' && req.method === 'POST') {
    const user = requireRole(req, res, 'drivers');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = await resolveCompanyId(user);
      if (!body.driver_id || !cleanNumber(body.amount)) return json(res, 400, { success: false, error: 'السائق والمبلغ مطلوبان' });
      const method = cleanString(body.payment_method).toLowerCase();
      if (!['cash','bank'].includes(method)) return json(res, 400, { success: false, error: 'طريقة الدفع غير صحيحة' });
      if (method === 'bank' && !cleanString(body.bank_name)) return json(res, 400, { success: false, error: 'اسم البنك مطلوب' });
      const row = { company_id: companyId, driver_id: body.driver_id, amount: cleanNumber(body.amount), payment_method: method, bank_name: cleanString(body.bank_name) || null, transfer_reference: cleanString(body.transfer_reference) || null, paid_at: body.paid_at || new Date().toISOString(), employee_id: user.id === 'env-admin' ? null : user.id, notes: cleanString(body.notes) || null };
      const data = firstRow(await dbInsert('driver_settlements', row));
      await audit(user, 'create_driver_settlement', 'driver_settlement', data?.id || null, row);
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
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
      const companyId = await resolveCompanyId(user);
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

  if (pathname === '/api/accounting/verify-orders' && req.method === 'GET') {
    const user = requireRole(req, res, 'accounting'); if (!user) return;
    try {
      const companyId = await resolveCompanyId(user);
      const from = url.searchParams.get('from') || '';
      const to = url.searchParams.get('to') || '';
      const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
      const driverId = url.searchParams.get('driver_id') || '';
      const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
      const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;

      const orders = await dbSelect('orders', {
        select: '*', company_id: `eq.${companyId}`, order: 'created_at.desc', limit: 10000
      });
      const shipments = await dbSelect('shipments', {
        select: '*', company_id: `eq.${companyId}`, order: 'created_at.desc', limit: 10000
      }).catch(() => []);
      const drivers = await dbSelect('drivers', {
        select: 'id,name,driver_no,company_id', company_id: `eq.${companyId}`, limit: 5000
      }).catch(() => []);
      const shipmentMap = new Map(shipments.map(s => [String(s.order_id), s]));
      const driverMap = new Map(drivers.map(d => [String(d.id), d]));

      const rows = [];
      for (const o of orders) {
        const stamp = new Date(o.created_at || o.updated_at || new Date().toISOString()).getTime();
        if (fromMs !== null && stamp < fromMs) continue;
        if (toMs !== null && stamp > toMs) continue;
        const sh = shipmentMap.get(String(o.id));
        const d = driverMap.get(String(sh?.driver_id || o.driver_id || ''));
        if (driverId && String(d?.id || sh?.driver_id || o.driver_id || '') !== String(driverId)) continue;
        const hay = [o.tracking_number,o.merchant_order_no,o.order_no,o.id,sh?.shipment_no,d?.name,d?.driver_no,o.status].filter(Boolean).join(' ').toLowerCase();
        if (q && !hay.includes(q)) continue;
        const state = commissionState(o);
        rows.push({
          id: o.id,
          shipment_id: sh?.id || null,
          tracking_number: sh?.tracking_number || o.tracking_number || '',
          shipment_no: sh?.shipment_no || '',
          merchant_order_no: o.merchant_order_no || '',
          status: o.status || '',
          cod: cleanNumber(o.cod ?? o.value ?? o.order_value),
          service_charges: cleanNumber(o.service_charges ?? o.delivery_fee),
          driver_id: d?.id || sh?.driver_id || o.driver_id || null,
          driver_name: d?.name || '',
          driver_no: d?.driver_no || '',
          created_at: o.created_at || null,
          eligible: state.eligible,
          verify_status: state.verify_status,
          paid_status: state.paid_status,
          commission_verify_status: o.commission_verify_status || 'unverified',
          commission_verified_at: o.commission_verified_at || null,
          commission_verified_by: o.commission_verified_by || null,
          commission_paid_at: o.commission_paid_at || null,
          commission_payment_method: o.commission_payment_method || null
        });
      }
      return json(res, 200, { success: true, data: rows });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/driver-commissions' && req.method === 'GET') {
    const user = requireRole(req, res, 'accounting'); if (!user) return;
    try {
      const companyId = await resolveCompanyId(user);
      const from = url.searchParams.get('from') || '';
      const to = url.searchParams.get('to') || '';
      const driverIdFilter = url.searchParams.get('driver_id') || '';
      const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
      const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;

      const drivers = await dbSelect('drivers', { select: 'id,name,driver_no,company_id', company_id: `eq.${companyId}`, limit: 5000 });
      const driverMap = new Map(drivers.map(d => [String(d.id), d]));
      const jobsQuery = { select: '*', company_id: `eq.${companyId}`, order: 'created_at.desc', limit: 10000 };
      if (driverIdFilter) jobsQuery.driver_id = `eq.${driverIdFilter}`;
      const jobs = await dbSelect('delivery_jobs', jobsQuery);
      const allLinks = [];
      for (const job of jobs) {
        try {
          const links = await dbSelect('delivery_job_shipments', { select: '*', delivery_job_id: `eq.${job.id}`, limit: 10000 });
          for (const link of links) allLinks.push({ ...link, _job: job });
        } catch (_) {}
      }
      const shipmentIds = [...new Set(allLinks.map(x => x.shipment_id).filter(Boolean))];
      const shipments = [];
      for (const sid of shipmentIds) {
        try { const sh = firstRow(await dbSelect('shipments', { select: '*', id: `eq.${sid}`, limit: 1 })); if (sh) shipments.push(sh); } catch (_) {}
      }
      const shipmentMap = new Map(shipments.map(s => [String(s.id), s]));
      const orderIds = [...new Set(shipments.map(s => s.order_id).filter(Boolean))];
      const orders = [];
      for (const oid of orderIds) {
        try { const o = firstRow(await dbSelect('orders', { select: 'id,status,delivery_fee,created_at,merchant_order_no,tracking_number,commission_verify_status,commission_paid_status', id: `eq.${oid}`, company_id: `eq.${companyId}`, limit: 1 })); if (o) orders.push(o); } catch (_) {}
      }
      const orderMap = new Map(orders.map(o => [String(o.id), o]));
      const groups = new Map();
      const seenByGroup = new Map();
      for (const link of allLinks) {
        const job = link._job || {};
        const driverId = job.driver_id || '';
        if (!driverId) continue;
        const driver = driverMap.get(String(driverId));
        if (!driver) continue;
        const stampValue = link.created_at || job.created_at || new Date().toISOString();
        const stamp = new Date(stampValue).getTime();
        if (fromMs !== null && stamp < fromMs) continue;
        if (toMs !== null && stamp > toMs) continue;
        const workDate = new Date(stamp).toISOString().slice(0,10);
        const key = `${driverId}|${workDate}`;
        if (!groups.has(key)) groups.set(key, { work_date: workDate, driver_id: driverId, driver_name: driver.name || '', driver_code: driver.driver_no || '', delivery_orders: 0, scan_orders: 0, total_orders: 0 });
        const g = groups.get(key);
        if (!seenByGroup.has(key)) seenByGroup.set(key, new Set());
        const seen = seenByGroup.get(key);
        const sid = String(link.shipment_id || '');
        if (sid && seen.has(sid)) continue;
        if (sid) seen.add(sid);
        g.scan_orders += 1;
        const sh = shipmentMap.get(sid);
        const order = orderMap.get(String(sh?.order_id || ''));
        if (order && isCommissionEligibleStatus(order.status)) g.delivery_orders += 1;
        g.total_orders = g.delivery_orders + g.scan_orders;
      }
      const data = [...groups.values()].sort((a,b) => String(b.work_date).localeCompare(String(a.work_date)) || String(a.driver_name).localeCompare(String(b.driver_name)));
      return json(res, 200, { success: true, data });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/drivers/commission-orders' && req.method === 'GET') {
    const user = requireRole(req, res, 'accounting'); if (!user) return;
    try {
      const companyId = await resolveCompanyId(user);
      const driverId = url.searchParams.get('driver_id') || '';
      if (!driverId) return json(res, 400, { success:false, error:'السائق مطلوب' });
      const from = url.searchParams.get('from') || '';
      const to = url.searchParams.get('to') || '';
      const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
      const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
      const jobs = await dbSelect('delivery_jobs', { select:'*', company_id:`eq.${companyId}`, driver_id:`eq.${driverId}`, order:'created_at.desc', limit:10000 });
      const links=[];
      for(const job of jobs){ try{ const ls=await dbSelect('delivery_job_shipments',{select:'*',delivery_job_id:`eq.${job.id}`,limit:10000}); for(const l of ls) links.push({...l,_job:job}); }catch(_){} }
      const shipmentIds=[...new Set(links.map(x=>x.shipment_id).filter(Boolean))];
      const shipmentMap=new Map();
      for(const sid of shipmentIds){ try{const sh=firstRow(await dbSelect('shipments',{select:'*',id:`eq.${sid}`,limit:1})); if(sh) shipmentMap.set(String(sid),sh);}catch(_){} }
      const orderIds=[...new Set([...shipmentMap.values()].map(s=>s.order_id).filter(Boolean))];
      const orderMap=new Map();
      for(const oid of orderIds){ try{const o=firstRow(await dbSelect('orders',{select:'*',id:`eq.${oid}`,company_id:`eq.${companyId}`,limit:1})); if(o) orderMap.set(String(oid),o);}catch(_){} }
      const seen=new Set(); const rows=[];
      for(const link of links){ const sid=String(link.shipment_id||''); if(!sid||seen.has(sid))continue; seen.add(sid); const sh=shipmentMap.get(sid); const o=orderMap.get(String(sh?.order_id||'')); if(!o)continue; const stamp=new Date(o.created_at||link.created_at||link._job?.created_at).getTime(); if(fromMs!==null&&stamp<fromMs)continue;if(toMs!==null&&stamp>toMs)continue; const state=commissionState(o); rows.push({...o,shipment_id:sid,shipment_no:sh?.shipment_no||'',tracking_number:sh?.tracking_number||o.tracking_number||'',work_date:new Date(stamp).toISOString().slice(0,10),eligible:state.eligible,verify_status:state.verify_status,paid_status:state.paid_status}); }
      rows.sort((a,b)=>String(b.work_date).localeCompare(String(a.work_date)));
      return json(res,200,{success:true,data:rows});
    }catch(error){return json(res,500,{success:false,error:error.message});}
  }

  if (pathname === '/api/driver-commission/verify' && req.method === 'POST') {
    const user = requireRole(req, res, 'expenses'); if (!user) return;
    try {
      const body = await bodyJson(req); const companyId=await resolveCompanyId(user); const orderIds=Array.isArray(body.order_ids)?body.order_ids.filter(Boolean):[];
      const verifyDate=cleanString(body.verify_date);
      if(!orderIds.length)return json(res,400,{success:false,error:'اختر أوردرات للتحقق'});
      const result=[];
      for(const id of orderIds){
        const o=firstRow(await dbSelect('orders',{select:'*',id:`eq.${id}`,company_id:`eq.${companyId}`,limit:1}));
        if(!o)continue;
        if(!isCommissionEligibleStatus(o.status))continue;
        const sh=firstRow(await dbSelect('shipments',{select:'id',order_id:`eq.${id}`,company_id:`eq.${companyId}`,limit:1}).catch(()=>[]));
        let histories=[];
        if(sh?.id) histories=await dbSelect('shipment_status_history',{select:'status,created_at',shipment_id:`eq.${sh.id}`,order:'created_at.desc',limit:200}).catch(()=>[]);
        const delivered=histories.find(h=>isCommissionEligibleStatus(h.status));
        const deliveryDate=delivered?.created_at ? new Date(delivered.created_at).toISOString().slice(0,10) : '';
        if(verifyDate && deliveryDate !== verifyDate) continue;
        const patch={commission_verify_status:'verified',commission_verified_at:new Date().toISOString(),commission_verified_by:user.id==='env-admin'?null:user.id};
        const updated=firstRow(await dbUpdate('orders',{id:`eq.${id}`,company_id:`eq.${companyId}`},patch));
        await audit(user,'verify_driver_commission','order',id,{before:{commission_verify_status:o.commission_verify_status},after:patch,status:o.status,delivery_date:deliveryDate});
        result.push(updated||{...o,...patch});
      }
      return json(res,200,{success:true,data:result});
    }catch(error){return json(res,500,{success:false,error:error.message});}
  }

  if (pathname === '/api/driver-expenses/order-edit' && req.method === 'PATCH') {
    const user = requireRole(req, res, 'expenses'); if (!user) return;
    try {
      const body=await bodyJson(req); const companyId=await resolveCompanyId(user);
      if(!body.id)return json(res,400,{success:false,error:'معرّف الأوردر مطلوب'});
      const before=firstRow(await dbSelect('orders',{select:'*',id:`eq.${body.id}`,company_id:`eq.${companyId}`,limit:1}));
      if(!before)return json(res,404,{success:false,error:'الأوردر غير موجود'});
      const patch={value:cleanNumber(body.value,before.value||0),delivery_fee:cleanNumber(body.delivery_fee,before.delivery_fee||0)};
      const data=firstRow(await dbUpdate('orders',{id:`eq.${body.id}`,company_id:`eq.${companyId}`},patch));
      await audit(user,'update_driver_statement_order','order',body.id,{before:{value:before.value,delivery_fee:before.delivery_fee},after:patch});
      return json(res,200,{success:true,data});
    }catch(error){return json(res,500,{success:false,error:error.message});}
  }

  if (pathname === '/api/driver-commission/pay' && req.method === 'POST') {
    const user = requireRole(req, res, 'expenses'); if (!user) return;
    try {
      const body=await bodyJson(req); const companyId=await resolveCompanyId(user); const driverId=body.driver_id; const method=cleanString(body.payment_method).toLowerCase(); const orderIds=Array.isArray(body.order_ids)?body.order_ids.filter(Boolean):[];
      if(!driverId||!orderIds.length)return json(res,400,{success:false,error:'السائق والأوردرات مطلوبان'});
      if(!['cash','bank','credit'].includes(method))return json(res,400,{success:false,error:'طريقة الدفع يجب أن تكون Cash أو Bank أو Credit'});
      const paid=[]; let amount=0;
      for(const id of orderIds){
        const o=firstRow(await dbSelect('orders',{select:'*',id:`eq.${id}`,company_id:`eq.${companyId}`,limit:1})); if(!o)continue;
        if(String(o.commission_verify_status||'').toLowerCase()!=='verified')continue;
        if(String(o.commission_paid_status||'').toLowerCase()==='paid')continue;
        if(!isCommissionEligibleStatus(o.status))continue;
        const patch={commission_paid_status:'paid',commission_paid_at:new Date().toISOString(),commission_paid_by:user.id==='env-admin'?null:user.id,commission_payment_method:method};
        const updated=firstRow(await dbUpdate('orders',{id:`eq.${id}`,company_id:`eq.${companyId}`},patch));
        amount+=cleanNumber(o.delivery_fee); paid.push(id); await audit(user,'pay_driver_commission','order',id,{before:{commission_paid_status:o.commission_paid_status},after:patch,delivery_fee:o.delivery_fee,payment_method:method});
      }
      if(!paid.length)return json(res,400,{success:false,error:'لا توجد أوردرات Verified قابلة للتسوية'});
      let payment=null; try { payment=firstRow(await dbInsert('driver_commission_payments',{company_id:companyId,driver_id:driverId,amount,payment_method:method,payment_date:body.payment_date||new Date().toISOString().slice(0,10),employee_id:user.id==='env-admin'?null:user.id,order_ids:paid,notes:cleanString(body.notes)||null})); } catch (_) {}
      return json(res,200,{success:true,data:{payment,paid_order_ids:paid,amount}});
    }catch(error){return json(res,500,{success:false,error:error.message});}
  }

  if (pathname === '/api/accounting/summary' && req.method === 'GET') {
    const user = requireRole(req, res, 'accounting'); if (!user) return;
    try {
      const companyId = await resolveCompanyId(user);
      const orders = await dbSelect('orders', { select: 'id,value,delivery_fee,tax_amount,merchant_net_value,status,created_at', company_id: `eq.${companyId}`, order: 'created_at.desc', limit: 5000 });
      const totalOrders = orders.length;
      const orderValue = orders.reduce((s, x) => s + cleanNumber(x.value), 0);
      const deliveryFees = orders.reduce((s, x) => s + cleanNumber(x.delivery_fee), 0);
      const taxes = orders.reduce((s, x) => s + cleanNumber(x.tax_amount), 0);
      const merchantNet = orders.reduce((s, x) => s + cleanNumber(x.merchant_net_value), 0);
      return json(res, 200, { success: true, data: { totalOrders, orderValue, deliveryFees, taxes, merchantNet } });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
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
      const companyId = await resolveCompanyId(user);
      const row = {
        company_id: companyId,
        driver_id: body.driver_id || null,
        expense_type: cleanString(body.expense_type) || 'other',
        category: cleanString(body.category).toLowerCase() === 'shortage' ? 'shortage' : 'expense',
        amount: cleanNumber(body.amount),
        expense_date: body.expense_date || new Date().toISOString().slice(0, 10),
        notes: cleanString(body.notes) || null,
        details: cleanString(body.details) || null,
        employee_id: user.id === 'env-admin' ? null : user.id
      };
      const data = firstRow(await dbInsert('expenses', row));
      await audit(user, 'create_expense', 'expense', data?.id || null, row);
      return json(res, 200, { success: true, data });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }

  if (pathname === '/api/expenses' && (req.method === 'PATCH' || req.method === 'DELETE')) {
    const user = requireRole(req, res, 'expenses'); if (!user) return;
    try {
      const body = await bodyJson(req); const companyId = await resolveCompanyId(user); const id = body.id;
      if (!id) return json(res,400,{success:false,error:'معرّف المصروف مطلوب'});
      const before = firstRow(await dbSelect('expenses',{select:'*',id:`eq.${id}`,company_id:`eq.${companyId}`,limit:1}));
      if(!before)return json(res,404,{success:false,error:'المصروف غير موجود'});
      if(req.method==='DELETE'){
        await supabaseRequest('expenses',{method:'DELETE',query:{id:`eq.${id}`,company_id:`eq.${companyId}`},prefer:'return=minimal'});
        await audit(user,'delete_expense','expense',id,{before});
        return json(res,200,{success:true});
      }
      const patch={expense_type:cleanString(body.expense_type)||before.expense_type,category:cleanString(body.category).toLowerCase()==='shortage'?'shortage':'expense',amount:cleanNumber(body.amount),expense_date:body.expense_date||before.expense_date,details:cleanString(body.details)||null,notes:cleanString(body.notes)||null};
      const data=firstRow(await dbUpdate('expenses',{id:`eq.${id}`,company_id:`eq.${companyId}`},patch));
      await audit(user,'update_expense','expense',id,{before,after:patch});
      return json(res,200,{success:true,data});
    }catch(error){return json(res,500,{success:false,error:error.message});}
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

  if (pathname === '/api/users' && req.method === 'GET') {
    const user = requireRole(req, res, 'users');
    if (!user) return;
    try {
      const rows = await dbSelect('users', {
        select: 'id,company_id,name,username,email,language,active,created_at',
        company_id: `eq.${await resolveCompanyId(user)}`,
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
      const companyId = await resolveCompanyId(user);
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
      if (data?.id && body.role) {
        try {
          const companyRoles = await dbSelect('roles',{select:'*',company_id:`eq.${companyId}`,name:`eq.${cleanString(body.role)}`,limit:1});
          const role = firstRow(companyRoles);
          if(role) await dbInsert('user_roles',{user_id:data.id,role_id:role.id},{prefer:'return=minimal'});
        } catch(roleError){ console.warn('ROLE ASSIGN WARNING:', roleError.message); }
      }
      return json(res, 200, { success: true, data });
    } catch (error) {
      return json(res, 500, { success: false, error: error.message });
    }
  }


  if (pathname === '/api/roles' && req.method === 'GET') {
    const user = requireRole(req,res,'users'); if(!user) return;
    try { return json(res,200,{success:true,data:await dbSelect('roles',{select:'id,name',company_id:`eq.${user.company_id || await getFirstCompanyId()}`,order:'name.asc'})}); }
    catch(error){ return json(res,500,{success:false,error:error.message}); }
  }

  if (pathname === '/api/permissions' && req.method === 'GET') {
    const user = requireRole(req, res, 'users'); if (!user) return;
    try {
      const rows = await dbSelect('permissions', { select: 'id,code,name_ar,name_en', order: 'code.asc', limit: 500 });
      return json(res, 200, { success: true, data: rows });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/roles' && req.method === 'POST') {
    const user = requireRole(req, res, 'users'); if (!user) return;
    try {
      const body = await bodyJson(req);
      const companyId = await resolveCompanyId(user);
      const name = cleanString(body.name);
      const codes = uniqueArray(Array.isArray(body.permissions) ? body.permissions : []);
      if (!name) return json(res, 400, { success: false, error: 'اسم مجموعة الصلاحيات مطلوب' });
      const existing = await dbSelect('roles', { select: 'id', company_id: `eq.${companyId}`, name: `eq.${encodeURIComponent(name)}`, limit: 1 });
      if (existing.length) return json(res, 409, { success: false, error: 'مجموعة الصلاحيات موجودة بالفعل' });
      const role = firstRow(await dbInsert('roles', { company_id: companyId, name }));
      if (!role?.id) throw new Error('فشل إنشاء مجموعة الصلاحيات');
      if (codes.length) {
        const permissions = await dbSelect('permissions', { select: 'id,code', limit: 500 });
        const byCode = new Map(permissions.map(x => [x.code, x.id]));
        for (const code of codes) {
          const permissionId = byCode.get(code);
          if (permissionId) {
            try { await dbInsert('role_permissions', { role_id: role.id, permission_id: permissionId }, { prefer: 'return=minimal' }); } catch (_) {}
          }
        }
      }
      return json(res, 200, { success: true, data: role });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/chat/users' && req.method === 'GET') {
    const user = requireAuth(req, res); if (!user) return;
    try {
      const companyId = await resolveCompanyId(user);
      const rows = await dbSelect('users', { select: 'id,name,username,email', company_id: `eq.${companyId}`, active: 'eq.true', order: 'name.asc', limit: 500 });
      return json(res, 200, { success: true, data: rows });
    } catch (error) { return json(res, 500, { success: false, error: error.message }); }
  }

  if (pathname === '/api/chat' && req.method === 'GET') {
    const user = requireAuth(req, res); if (!user) return;
    try {
      const companyId = await resolveCompanyId(user);
      const rows = await dbSelect('chat_messages',{select:'*',company_id:`eq.${companyId}`,order:'created_at.asc',limit:300});
      const users = await dbSelect('users',{select:'id,name,username',company_id:`eq.${companyId}`,limit:500});
      const names = new Map(users.map(x=>[x.id,x.name||x.username||'']));
      return json(res,200,{success:true,data:rows.map(x=>({...x,sender_name:x.sender_id ? names.get(x.sender_id) || 'موظف' : 'Admin'}))});
    } catch(error){ return json(res,500,{success:false,error:error.message}); }
  }

  if (pathname === '/api/chat' && req.method === 'POST') {
    const user = requireAuth(req, res); if (!user) return;
    try {
      const body = await bodyJson(req); const message=cleanString(body.message||body.text);
      if(!message) return json(res,400,{success:false,error:'الرسالة فارغة'});
      const companyId=user.company_id||await getFirstCompanyId();
      const data=firstRow(await dbInsert('chat_messages',{company_id:companyId,sender_id:user.id==='env-admin'?null:user.id,recipient_id:body.recipient_id||null,message}));
      return json(res,200,{success:true,data});
    } catch(error){ return json(res,500,{success:false,error:error.message}); }
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
