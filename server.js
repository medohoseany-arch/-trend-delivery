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
  if (permission && !permissions[permission]) {
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
      if (body.length > 10 * 1024 * 1024) {
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
  // Resolve a company even when the companies table is empty, missing,
  // or does not contain created_at. This is important for the ENV admin
  // account, which may not carry company_id in its session.
  const sources = [
    {
      table: 'companies',
      query: { select: 'id', limit: 1 }
    },
    {
      table: 'users',
      query: { select: 'company_id', limit: 1 }
    },
    {
      table: 'merchants',
      query: { select: 'company_id', limit: 1 }
    },
    {
      table: 'orders',
      query: { select: 'company_id', limit: 1 }
    },
    {
      table: 'drivers',
      query: { select: 'company_id', limit: 1 }
    },
    {
      table: 'governorates',
      query: { select: 'company_id', limit: 1 }
    },
    {
      table: 'areas',
      query: { select: 'company_id', limit: 1 }
    }
  ];

  for (const source of sources) {
    try {
      const rows = await dbSelect(source.table, source.query);
      const row = firstRow(rows);
      const id = row?.id || row?.company_id || null;
      if (id) return id;
    } catch (_) {
      // Try the next compatible company-scoped table.
    }
  }

  return null;
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
    merchants:false, accounting:false, expenses:false, audit:false
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


const ORDER_STATUSES = {
  to_be_picked_up: 'To Be Picked Up', in_ops: 'In ops', reeplac: 'Reeplac', half_delivered: 'Hald deliverd',
  delivered: 'Delivered', lost_damaged: 'Lost & Damaged', returned_by_driver: 'Returned by driver', future_delivery: 'Future delivery',
  cancelled: 'Cancelled', cancelled_by_shipper: 'Cancelled by shipper', cancelled_by_receiver: 'Cancelled by reciver'
};
function normalizeStatus(value) {
  const raw=String(value||'').trim().toLowerCase();
  const aliases={'received':'to_be_picked_up','new':'to_be_picked_up','pending':'to_be_picked_up','to be picked up':'to_be_picked_up','to_be_picked_up':'to_be_picked_up','in ops':'in_ops','in_ops':'in_ops','reeplac':'reeplac','replace':'reeplac','hald deliverd':'half_delivered','half delivered':'half_delivered','half_delivered':'half_delivered','delivered':'delivered','lost & damaged':'lost_damaged','lost_damaged':'lost_damaged','returned by driver':'returned_by_driver','returned_by_driver':'returned_by_driver','future delivery':'future_delivery','future_delivery':'future_delivery','cancelled':'cancelled','canceled':'cancelled','cancelled by shipper':'cancelled_by_shipper','cancelled_by_shipper':'cancelled_by_shipper','cancelled by reciver':'cancelled_by_receiver','cancelled by receiver':'cancelled_by_receiver','cancelled_by_receiver':'cancelled_by_receiver'};
  return aliases[raw]||raw||'to_be_picked_up';
}
async function nextMerchantCode(companyId){
  const rows=await dbSelect('merchants',{select:'merchant_no,code',company_id:`eq.${companyId}`,limit:5000});let max=0;
  for(const r of rows||[]){const m=String(r.merchant_no||r.code||'').toUpperCase().match(/^AB(\d{6})$/);if(m)max=Math.max(max,Number(m[1]));}
  return `AB${String(max+1).padStart(6,'0')}`;
}
async function nextTrackingNumber(companyId,serialNo){
  const rows=await dbSelect('shipments',{select:'tracking_number',company_id:`eq.${companyId}`,limit:5000});let max=0;
  for(const r of rows||[]){const m=String(r.tracking_number||'').match(/^TR(\d+)$/i);if(m)max=Math.max(max,Number(m[1]));}
  return `TR${String(Math.max(max+1,Number(serialNo)||1)).padStart(8,'0')}`;
}
async function shipmentDetails(shipment){
  if(!shipment)return null;let order=null,merchant=null,history=[];
  try{order=firstRow(await dbSelect('orders',{select:'*',id:`eq.${shipment.order_id}`,limit:1}));}catch(_){}
  if(order?.merchant_id)try{merchant=firstRow(await dbSelect('merchants',{select:'*',id:`eq.${order.merchant_id}`,limit:1}));}catch(_){}
  try{history=await dbSelect('shipment_status_history',{select:'*',shipment_id:`eq.${shipment.id}`,order:'created_at.asc',limit:500});}catch(_){}
  return {shipment,order,merchant,history:history||[]};
}
async function updateShipmentStatus(user,shipmentId,nextStatus,extra={}){
  const shipment=firstRow(await dbSelect('shipments',{select:'*',id:`eq.${shipmentId}`,limit:1}));if(!shipment)throw new Error('الشحنة غير موجودة');
  const previous=normalizeStatus(shipment.status),status=normalizeStatus(nextStatus);const patch={status,...extra};if(status==='returned_by_driver'&&!patch.return_available_date)patch.return_available_date=new Date(Date.now()+24*60*60*1000).toISOString().slice(0,10);await dbUpdate('shipments',{id:`eq.${shipmentId}`},patch);
  try{await dbInsert('shipment_status_history',{shipment_id:shipmentId,status,previous_status:previous,user_id:user.id==='env-admin'?null:user.id,notes:extra.status_note||null},{prefer:'return=minimal'});}catch(_){try{await dbInsert('shipment_status_history',{shipment_id:shipmentId,status,user_id:user.id==='env-admin'?null:user.id},{prefer:'return=minimal'});}catch(_) {}}
  await audit(user,'update_shipment_status','shipment',shipmentId,{previous_status:previous,status,...extra});return {previous_status:previous,status};
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
  const shipmentNo = `SH-${String(serialNo).padStart(8, '0')}`;
  const trackingNumber = await nextTrackingNumber(companyId, serialNo);
  const shipmentPayload = {
    company_id: companyId,
    order_id: order.id,
    shipment_no: shipmentNo,
    tracking_number: trackingNumber,
    serial_no: serialNo,
    status: normalizeStatus(body.status || 'to_be_picked_up'),
    future_delivery_date: body.future_delivery_date || null,
    return_available_date: normalizeStatus(body.status || 'to_be_picked_up') === 'returned_by_driver' ? new Date(Date.now()+24*60*60*1000).toISOString().slice(0,10) : null
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
    trackingNumber: shipment.tracking_number || trackingNumber,
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
    if (found) {
      if (table === 'shipments') {
        const detail = await shipmentDetails(found);
        return { type: 'shipment', data: { ...found, order: detail?.order || null, merchant: detail?.merchant || null, history: detail?.history || [] } };
      }
      return { type: table.slice(0, -1), data: found };
    }
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
      const result = await updateShipmentStatus(user, body.shipment_id, body.status, normalizeStatus(body.status)==='future_delivery' ? {future_delivery_date: body.future_delivery_date || null} : {});
      return json(res, 200, { success: true, data: result });
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

  if (pathname === '/api/merchants' && req.method === 'PATCH') {
    const user = requireRole(req, res, 'merchants');
    if (!user) return;
    try {
      const body = await bodyJson(req);
      if (!body.id) return json(res, 400, { success: false, error: 'معرّف التاجر مطلوب' });
      const enabled = Boolean(body.tax_enabled);
      const rate = Math.min(100, Math.max(0, cleanNumber(body.tax_rate)));
      const patch = { tax_enabled: enabled, tax_rate: enabled ? rate : 0 };
      for (const k of ['name','phone','address','base_delivery_fee','username','store_type','store_name','store_url','store_active']) if(body[k]!==undefined) patch[k]=k==='base_delivery_fee'?cleanNumber(body[k]):body[k];
      if(body.password) patch.password_hash=hashPassword(String(body.password));
      const data = await dbUpdate('merchants', { id: `eq.${body.id}` }, patch);
      await audit(user, 'update_merchant', 'merchant', body.id, patch);
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
      let shipmentIds = uniqueArray(Array.isArray(body.shipment_ids) ? body.shipment_ids : []);
      if (Array.isArray(body.shipment_numbers) && body.shipment_numbers.length) shipmentIds = uniqueArray(body.shipment_numbers);
      const resolved=[];
      for(const ref of shipmentIds){
        let sh=firstRow(await dbSelect('shipments',{select:'id',id:`eq.${encodeURIComponent(ref)}`,limit:1}).catch(()=>[]));
        if(!sh) sh=firstRow(await dbSelect('shipments',{select:'id',shipment_no:`eq.${encodeURIComponent(ref)}`,limit:1}).catch(()=>[]));
        if(!sh) sh=firstRow(await dbSelect('shipments',{select:'id',tracking_number:`eq.${encodeURIComponent(ref)}`,limit:1}).catch(()=>[]));
        if(sh?.id)resolved.push(sh.id);
      }
      shipmentIds=uniqueArray(resolved);
      if (!body.driver_id || !body.job_code) return json(res, 400, { success: false, error: 'السائق وكود المهمة مطلوبان' });
      if (!shipmentIds.length) return json(res, 400, { success:false, error:'لم يتم العثور على أي شحنة' });

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
          await dbUpdate('shipments', { id: `eq.${shipmentId}` }, { status: 'to_be_picked_up' });
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

  // --- Trend Delivery Service upgrade routes ---
  if (pathname === '/api/orders' && req.method === 'PATCH') {
    const user=requireRole(req,res,'orders'); if(!user)return;
    try { const body=await bodyJson(req); if(!body.id)return json(res,400,{success:false,error:'معرّف الأوردر مطلوب'});
      const patch={}; for(const k of ['merchant_id','merchant_order_no','customer_name','customer_phone','governorate_id','area_id','address','value','delivery_fee','notes']) if(body[k]!==undefined) patch[k]=body[k]===''?null:body[k];
      if(body.value!==undefined)patch.value=cleanNumber(body.value); if(body.delivery_fee!==undefined)patch.delivery_fee=cleanNumber(body.delivery_fee); if(Object.keys(patch).length)await dbUpdate('orders',{id:`eq.${body.id}`},patch);
      const shipment=firstRow(await dbSelect('shipments',{select:'*',order_id:`eq.${body.id}`,limit:1}));
      if(!shipment)throw new Error('الشحنة المرتبطة بالأوردر غير موجودة');
      if(body.tracking_number!==undefined){const tracking=cleanString(body.tracking_number);if(!tracking)throw new Error('رقم التتبع لا يمكن أن يكون فارغًا');const dup=await dbSelect('shipments',{select:'id',tracking_number:`eq.${encodeURIComponent(tracking)}`,limit:2});if((dup||[]).some(x=>String(x.id)!==String(shipment.id)))return json(res,409,{success:false,error:'رقم التتبع مستخدم لشحنة أخرى'});await dbUpdate('shipments',{id:`eq.${shipment.id}`},{tracking_number:tracking});await audit(user,'edit_tracking_number','shipment',shipment.id,{tracking_number:tracking});}
      if(body.status)await updateShipmentStatus(user,shipment.id,body.status,body.status==='future_delivery'?{future_delivery_date:body.future_delivery_date||null}:{});
      return json(res,200,{success:true});
    }catch(error){return json(res,500,{success:false,error:error.message});}
  }

  const orderIdMatch=pathname.match(/^\/api\/orders\/([^/]+)$/);
  if(orderIdMatch&&req.method==='GET'){const user=requireRole(req,res,'orders');if(!user)return;try{const id=decodeURIComponent(orderIdMatch[1]);const order=firstRow(await dbSelect('orders',{select:'*',id:`eq.${id}`,limit:1}));if(!order)return json(res,404,{success:false,error:'الأوردر غير موجود'});const shipment=firstRow(await dbSelect('shipments',{select:'*',order_id:`eq.${id}`,limit:1}));const d=await shipmentDetails(shipment);return json(res,200,{success:true,data:{order,shipment:d?.shipment||null,merchant:d?.merchant||null,history:d?.history||[]}});}catch(error){return json(res,500,{success:false,error:error.message});}}

  if(pathname==='/api/shipments'&&req.method==='GET'){const user=requireRole(req,res,'shipments');if(!user)return;try{const rows=await dbSelect('shipments',{select:'*',order:'created_at.desc',limit:1000});const merchants=await dbSelect('merchants',{select:'id,name',limit:2000}).catch(()=>[]);const orders=await dbSelect('orders',{select:'*',limit:3000}).catch(()=>[]);const mm=new Map((merchants||[]).map(x=>[String(x.id),x])),om=new Map((orders||[]).map(x=>[String(x.id),x]));return json(res,200,{success:true,data:(rows||[]).map(r=>({...r,order:om.get(String(r.order_id))||null,merchant:mm.get(String(om.get(String(r.order_id))?.merchant_id||''))||null}))});}catch(error){return json(res,500,{success:false,error:error.message});}}

  if(pathname==='/api/shipments/status/bulk'&&req.method==='POST'){const user=requireRole(req,res,'shipments');if(!user)return;try{const body=await bodyJson(req),ids=uniqueArray(Array.isArray(body.shipment_ids)?body.shipment_ids:[]);if(!ids.length||!body.status)return json(res,400,{success:false,error:'اختر أوردرات وحدد الحالة'});for(const id of ids)await updateShipmentStatus(user,id,body.status,normalizeStatus(body.status)==='future_delivery'?{future_delivery_date:body.future_delivery_date||null}:{});return json(res,200,{success:true,updated:ids.length,status:normalizeStatus(body.status)});}catch(error){return json(res,500,{success:false,error:error.message});}}

  if(pathname==='/api/warehouse/intake'&&req.method==='POST'){const user=requireAuth(req,res);if(!user)return;try{const body=await bodyJson(req),tracking=cleanString(body.tracking_number);if(!tracking)return json(res,400,{success:false,error:'رقم التتبع مطلوب'});const shipment=firstRow(await dbSelect('shipments',{select:'*',tracking_number:`eq.${encodeURIComponent(tracking)}`,limit:1}));if(!shipment)return json(res,404,{success:false,error:'رقم التتبع غير موجود'});const current=normalizeStatus(shipment.status),allowed=new Set(['returned_by_driver','to_be_picked_up','future_delivery','cancelled','cancelled_by_shipper','cancelled_by_receiver']);if(!allowed.has(current))return json(res,409,{success:false,error:`لا يمكن إدخال الشحنة للمخزن من الحالة الحالية: ${ORDER_STATUSES[current]||current}`});const result=await updateShipmentStatus(user,shipment.id,'in_ops',{warehouse_received_at:new Date().toISOString()});return json(res,200,{success:true,tracking_number:tracking,...result});}catch(error){return json(res,500,{success:false,error:error.message});}}

  if(pathname==='/api/warehouse/pending'&&req.method==='GET'){const user=requireAuth(req,res);if(!user)return;try{const allowed=['returned_by_driver','to_be_picked_up','future_delivery','cancelled','cancelled_by_shipper','cancelled_by_receiver'],rows=await dbSelect('shipments',{select:'*',order:'created_at.asc',limit:2000}),orders=await dbSelect('orders',{select:'*',limit:3000}).catch(()=>[]),om=new Map((orders||[]).map(o=>[String(o.id),o]));return json(res,200,{success:true,data:(rows||[]).filter(r=>{const st=normalizeStatus(r.status);if(!allowed.includes(st))return false;if(st==='returned_by_driver'&&r.return_available_date&&String(r.return_available_date)>new Date().toISOString().slice(0,10))return false;return true}).map(r=>({...r,order:om.get(String(r.order_id))||null}))});}catch(error){return json(res,500,{success:false,error:error.message});}}

  if(pathname==='/api/merchants/next-code'&&req.method==='GET'){const user=requireRole(req,res,'merchants');if(!user)return;try{return json(res,200,{success:true,code:await nextMerchantCode(user.company_id||await getFirstCompanyId())});}catch(error){return json(res,500,{success:false,error:error.message});}}

  if(pathname==='/api/merchants'&&req.method==='POST'){const user=requireRole(req,res,'merchants');if(!user)return;try{const body=await bodyJson(req),companyId=user.company_id||await getFirstCompanyId(),name=cleanString(body.name);if(!name)return json(res,400,{success:false,error:'اسم التاجر مطلوب'});const code=await nextMerchantCode(companyId),username=cleanString(body.username).toLowerCase()||null;if(username){const dup=await dbSelect('merchants',{select:'id',company_id:`eq.${companyId}`,username:`eq.${encodeURIComponent(username)}`,limit:1}).catch(()=>[]);if(dup.length)return json(res,409,{success:false,error:'اسم مستخدم التاجر مستخدم بالفعل'});}const row={company_id:companyId,merchant_no:code,code,name,phone:cleanString(body.phone)||null,address:cleanString(body.address)||null,base_delivery_fee:cleanNumber(body.base_delivery_fee),tax_enabled:Boolean(body.tax_enabled),tax_rate:Math.min(100,Math.max(0,cleanNumber(body.tax_rate))),store_type:cleanString(body.store_type)||null,store_name:cleanString(body.store_name)||null,store_url:cleanString(body.store_url)||null,store_active:body.store_active!==false,username,password_hash:body.password?hashPassword(String(body.password)):null,documents:body.documents||[]};const data=firstRow(await dbInsert('merchants',row));if(!data?.id)throw new Error('فشل إنشاء التاجر');await audit(user,'create_merchant','merchant',data.id,{merchant_no:code});return json(res,200,{success:true,data});}catch(error){return json(res,500,{success:false,error:error.message});}}

  if(pathname==='/api/merchants/documents'&&req.method==='POST'){const user=requireRole(req,res,'merchants');if(!user)return;try{const body=await bodyJson(req);if(!body.merchant_id||!body.data_url)return json(res,400,{success:false,error:'بيانات المستند ناقصة'});const data=firstRow(await dbInsert('merchant_documents',{merchant_id:body.merchant_id,file_name:cleanString(body.file_name)||'document',mime_type:cleanString(body.mime_type)||'application/octet-stream',data_url:String(body.data_url)}));return json(res,200,{success:true,data});}catch(error){return json(res,500,{success:false,error:error.message});}}

  if(pathname==='/api/merchant-integrations'&&req.method==='GET'){const user=requireRole(req,res,'merchants');if(!user)return;try{const merchantId=url.searchParams.get('merchant_id');const q=merchantId?{select:'*',merchant_id:`eq.${merchantId}`,order:'created_at.desc'}:{select:'*',order:'created_at.desc'};return json(res,200,{success:true,data:await dbSelect('merchant_integrations',q)});}catch(error){return json(res,500,{success:false,error:error.message});}}
  if(pathname==='/api/merchant-integrations'&&req.method==='POST'){const user=requireRole(req,res,'merchants');if(!user)return;try{const body=await bodyJson(req);if(!body.merchant_id||!body.type)return json(res,400,{success:false,error:'بيانات الربط ناقصة'});const data=firstRow(await dbInsert('merchant_integrations',{company_id:user.company_id||await getFirstCompanyId(),merchant_id:body.merchant_id,type:body.type,name:cleanString(body.name)||body.type,config:body.config||{},active:true}));return json(res,200,{success:true,data});}catch(error){return json(res,500,{success:false,error:error.message});}}

  const integrationTest=pathname.match(/^\/api\/merchant-integrations\/([^/]+)\/test$/);if(integrationTest&&req.method==='POST'){const user=requireRole(req,res,'merchants');if(!user)return;try{const row=firstRow(await dbSelect('merchant_integrations',{select:'*',id:`eq.${decodeURIComponent(integrationTest[1])}`,limit:1}));if(!row)throw new Error('الربط غير موجود');const cfg=row.config||{};const base=String(cfg.url||'').replace(/\/$/,'');const authToken=Buffer.from(`${cfg.consumer_key||''}:${cfg.consumer_secret||''}`).toString('base64');const r=await fetch(`${base}/wp-json/wc/v3/orders?per_page=1`,{headers:{Authorization:`Basic ${authToken}`}});if(!r.ok)throw new Error(`WooCommerce HTTP ${r.status}`);const sample=await r.json();return json(res,200,{success:true,sample_count:Array.isArray(sample)?sample.length:0});}catch(error){return json(res,500,{success:false,error:error.message});}}
  const integrationImport=pathname.match(/^\/api\/merchant-integrations\/([^/]+)\/import$/);if(integrationImport&&req.method==='POST'){const user=requireRole(req,res,'merchants');if(!user)return;try{const row=firstRow(await dbSelect('merchant_integrations',{select:'*',id:`eq.${decodeURIComponent(integrationImport[1])}`,limit:1}));if(!row)throw new Error('الربط غير موجود');const body=await bodyJson(req),cfg=row.config||{},base=String(cfg.url||'').replace(/\/$/,''),authToken=Buffer.from(`${cfg.consumer_key||''}:${cfg.consumer_secret||''}`).toString('base64'),r=await fetch(`${base}/wp-json/wc/v3/orders?per_page=${Math.min(100,Number(body.per_page||50))}`,{headers:{Authorization:`Basic ${authToken}`}});if(!r.ok)throw new Error(`WooCommerce HTTP ${r.status}`);const woOrders=await r.json();let imported=0,skipped=0;for(const wo of Array.isArray(woOrders)?woOrders:[]){const external=`woo:${row.id}:${wo.id}`,exists=await dbSelect('orders',{select:'id',external_id:`eq.${encodeURIComponent(external)}`,limit:1}).catch(()=>[]);if(exists.length){skipped++;continue;}const b=wo.billing||{};const result=await createOrder(user,{merchant_id:row.merchant_id,merchant_order_no:String(wo.number||wo.id),customer_name:`${b.first_name||''} ${b.last_name||''}`.trim(),customer_phone:b.phone||'',address:[b.address_1,b.city].filter(Boolean).join(', '),value:Number(wo.total||0),delivery_fee:0,status:'to_be_picked_up'});try{await dbUpdate('orders',{id:`eq.${result.order.id}`},{external_id:external});}catch(_){}imported++;}return json(res,200,{success:true,imported,skipped});}catch(error){return json(res,500,{success:false,error:error.message});}}

  if(pathname==='/api/governorates'&&req.method==='POST'){const user=requireAuth(req,res);if(!user)return;try{const b=await bodyJson(req),data=firstRow(await dbInsert('governorates',{company_id:user.company_id||await getFirstCompanyId(),name_ar:cleanString(b.name_ar),name_en:cleanString(b.name_en)}));return json(res,200,{success:true,data});}catch(error){return json(res,500,{success:false,error:error.message});}}
  if(pathname==='/api/areas'&&req.method==='POST'){const user=requireAuth(req,res);if(!user)return;try{const b=await bodyJson(req),data=firstRow(await dbInsert('areas',{company_id:user.company_id||await getFirstCompanyId(),governorate_id:b.governorate_id,name_ar:cleanString(b.name_ar),name_en:cleanString(b.name_en),zone_name:cleanString(b.zone_name)||null}));return json(res,200,{success:true,data});}catch(error){return json(res,500,{success:false,error:error.message});}}
  if(pathname==='/api/areas/import'&&req.method==='POST'){const user=requireAuth(req,res);if(!user)return;try{const b=await bodyJson(req),rows=Array.isArray(b.rows)?b.rows:[],companyId=user.company_id||await getFirstCompanyId();let imported=0,skipped=0;const cache=new Map();for(const r of rows){const city=cleanString(r.CityName||r['City Name']||r.Governorate||r['الإمارة']||r.city_name),ar=cleanString(r.AreaNameArabic||r['اسم المنطقة']||r.area_ar),en=cleanString(r.AreaName||r['Area Name']||r.area_en);if(!city||(!ar&&!en)){skipped++;continue;}let gov=cache.get(city.toLowerCase());if(!gov){gov=firstRow(await dbSelect('governorates',{select:'*',company_id:`eq.${companyId}`,name_en:`eq.${encodeURIComponent(city)}`,limit:1}).catch(()=>[]));if(!gov)gov=firstRow(await dbSelect('governorates',{select:'*',company_id:`eq.${companyId}`,name_ar:`eq.${encodeURIComponent(city)}`,limit:1}).catch(()=>[]));if(!gov)gov=firstRow(await dbInsert('governorates',{company_id:companyId,name_ar:city,name_en:city}));cache.set(city.toLowerCase(),gov);}const dup=await dbSelect('areas',{select:'id',governorate_id:`eq.${gov.id}`,name_ar:`eq.${encodeURIComponent(ar)}`,limit:1}).catch(()=>[]);if(dup.length){skipped++;continue;}await dbInsert('areas',{company_id:companyId,governorate_id:gov.id,name_ar:ar||en,name_en:en||ar,zone_name:cleanString(r.ZoneName||r['Zone Name']||r.zone_name)||null});imported++;}return json(res,200,{success:true,imported,skipped});}catch(error){return json(res,500,{success:false,error:error.message});}}

  if(pathname==='/api/accounting/summary'&&req.method==='GET'){const user=requireRole(req,res,'accounting');if(!user)return;try{const rows=await dbSelect('orders',{select:'value,delivery_fee,tax_amount,merchant_net_value',limit:5000}).catch(()=>[]);const x=(rows||[]).reduce((a,o)=>{a.totalOrders++;a.orderValue+=cleanNumber(o.value);a.deliveryFees+=cleanNumber(o.delivery_fee);a.taxes+=cleanNumber(o.tax_amount);a.merchantNet+=o.merchant_net_value!=null?cleanNumber(o.merchant_net_value):cleanNumber(o.value)-cleanNumber(o.tax_amount);return a;},{totalOrders:0,orderValue:0,deliveryFees:0,taxes:0,merchantNet:0});for(const k of ['orderValue','deliveryFees','taxes','merchantNet'])x[k]=Number(x[k].toFixed(2));return json(res,200,{success:true,data:x});}catch(error){return json(res,500,{success:false,error:error.message});}}
  if(pathname==='/api/chat/users'&&req.method==='GET'){const user=requireAuth(req,res);if(!user)return;try{return json(res,200,{success:true,data:await dbSelect('users',{select:'id,name,username,email',company_id:`eq.${user.company_id}`,limit:500})});}catch(_){return json(res,200,{success:true,data:[]});}}

  const jobDetails=pathname.match(/^\/api\/delivery-jobs\/([^/]+)\/details$/);if(jobDetails&&req.method==='GET'){const user=requireRole(req,res,'jobs');if(!user)return;try{const id=decodeURIComponent(jobDetails[1]),job=firstRow(await dbSelect('delivery_jobs',{select:'*',id:`eq.${id}`,limit:1}));if(!job)return json(res,404,{success:false,error:'مهمة التوصيل غير موجودة'});const links=await dbSelect('delivery_job_shipments',{select:'*',delivery_job_id:`eq.${id}`,limit:1000}),items=[];for(const l of links||[]){const sh=firstRow(await dbSelect('shipments',{select:'*',id:`eq.${l.shipment_id}`,limit:1})),d=await shipmentDetails(sh);items.push({...l,shipment:sh,order:d?.order||null,merchant:d?.merchant||null});}return json(res,200,{success:true,data:{job,items}});}catch(error){return json(res,500,{success:false,error:error.message});}}

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


async function runAutoWooImports(){
  if(!SUPABASE_URL||!SUPABASE_KEY)return;
  try{
    const integrations=await dbSelect('merchant_integrations',{select:'*',type:'eq.woocommerce',active:'eq.true',limit:200}).catch(()=>[]);
    for(const row of integrations||[]){
      const cfg=row.config||{};if(cfg.auto_import!==true)continue;
      try{
        const base=String(cfg.url||'').replace(/\/$/,'');if(!base||!cfg.consumer_key||!cfg.consumer_secret)continue;
        const authToken=Buffer.from(`${cfg.consumer_key}:${cfg.consumer_secret}`).toString('base64');
        const r=await fetch(`${base}/wp-json/wc/v3/orders?per_page=50`,{headers:{Authorization:`Basic ${authToken}`}});if(!r.ok)continue;
        const orders=await r.json();const sys={id:'env-admin',company_id:row.company_id||null,role:'admin',permissions:roles.admin};
        for(const wo of Array.isArray(orders)?orders:[]){
          const external=`woo:${row.id}:${wo.id}`;const exists=await dbSelect('orders',{select:'id',external_id:`eq.${encodeURIComponent(external)}`,limit:1}).catch(()=>[]);if(exists.length)continue;
          const b=wo.billing||{};const result=await createOrder(sys,{merchant_id:row.merchant_id,merchant_order_no:String(wo.number||wo.id),customer_name:`${b.first_name||''} ${b.last_name||''}`.trim(),customer_phone:b.phone||'',address:[b.address_1,b.city].filter(Boolean).join(', '),value:Number(wo.total||0),delivery_fee:0,status:'to_be_picked_up'});try{await dbUpdate('orders',{id:`eq.${result.order.id}`},{external_id:external});}catch(_){}
        }
      }catch(error){console.warn('AUTO WOO IMPORT:',error.message);}
    }
  }catch(error){console.warn('AUTO WOO SCAN:',error.message);}
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

setTimeout(runAutoWooImports, 15000);
setInterval(runAutoWooImports, 5 * 60 * 1000);

