const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");

const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

const sessions = new Map();
const users = new Map();
const orders = new Map();
const messages = [];
let nextUserId = 4;
let nextOrderId = 1004;
let nextMessageId = 1;

const roles = {
  admin: ["*"],
  manager: ["users.read", "users.write", "orders.read", "orders.write", "chat.read", "chat.write", "drivers.read"],
  dispatcher: ["orders.read", "orders.write", "chat.read", "chat.write", "drivers.read"],
  employee: ["orders.read", "chat.read", "chat.write"],
  driver: ["orders.read_assigned", "chat.read", "chat.write", "location.write"]
};

users.set(1, { id: 1, name: "Admin", phone: "", role: "admin", active: true });
users.set(2, { id: 2, name: "Dispatcher", phone: "", role: "dispatcher", active: true });
users.set(3, { id: 3, name: "Driver Demo", phone: "", role: "driver", active: true });

orders.set(1001, {
  id: 1001, customer_name: "عميل تجريبي", customer_phone: "",
  address: "الزقازيق", status: "new", driver_id: 3,
  notes: "طلب تجريبي", created_at: new Date().toISOString()
});

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) req.destroy();
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function token() {
  return crypto.randomBytes(32).toString("hex");
}

function currentUser(req) {
  const header = req.headers.authorization || "";
  const t = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!t || !sessions.has(t)) return null;
  const id = sessions.get(t);
  return users.get(id) || null;
}

function can(user, permission) {
  if (!user || !user.active) return false;
  const p = roles[user.role] || [];
  return p.includes("*") || p.includes(permission);
}

function requirePermission(req, res, permission) {
  const user = currentUser(req);
  if (!user) { json(res, 401, { success: false, error: "يجب تسجيل الدخول" }); return null; }
  if (!can(user, permission)) { json(res, 403, { success: false, error: "ليس لديك صلاحية" }); return null; }
  return user;
}

function safeUser(u) {
  return { id: u.id, name: u.name, phone: u.phone, role: u.role, active: u.active };
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(PUBLIC, urlPath));
  if (!file.startsWith(PUBLIC)) return json(res, 403, { error: "Forbidden" });
  fs.readFile(file, (err, data) => {
    if (err) return json(res, 404, { error: "Not found" });
    const ext = path.extname(file);
    const types = {
      ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const method = req.method || "GET";
  const p = url.pathname;

  try {
    if (method === "GET" && p === "/api/health") {
      return json(res, 200, { success: true, app: "Trend Delivery", time: new Date().toISOString() });
    }

    if (method === "POST" && p === "/api/login") {
      const body = await parseBody(req);
      const name = String(body.name || "").trim();
      const role = String(body.role || "employee");
      if (!name) return json(res, 400, { success: false, error: "اكتب الاسم" });
      let user = [...users.values()].find(u => u.name.toLowerCase() === name.toLowerCase() && u.role === role);
      if (!user) {
        user = { id: nextUserId++, name, phone: "", role: roles[role] ? role : "employee", active: true };
        users.set(user.id, user);
      }
      const t = token();
      sessions.set(t, user.id);
      return json(res, 200, { success: true, token: t, user: safeUser(user) });
    }

    const user = currentUser(req);

    if (method === "GET" && p === "/api/me") {
      if (!user) return json(res, 401, { success: false });
      return json(res, 200, { success: true, user: safeUser(user), permissions: roles[user.role] });
    }

    if (method === "POST" && p === "/api/logout") {
      const header = req.headers.authorization || "";
      const t = header.startsWith("Bearer ") ? header.slice(7) : null;
      if (t) sessions.delete(t);
      return json(res, 200, { success: true });
    }

    if (method === "GET" && p === "/api/users") {
      if (!requirePermission(req, res, "users.read")) return;
      return json(res, 200, { success: true, users: [...users.values()].map(safeUser) });
    }

    if (method === "POST" && p === "/api/users") {
      if (!requirePermission(req, res, "users.write")) return;
      const b = await parseBody(req);
      const role = roles[b.role] ? b.role : "employee";
      const u = { id: nextUserId++, name: String(b.name || "موظف جديد"), phone: String(b.phone || ""), role, active: true };
      users.set(u.id, u);
      return json(res, 201, { success: true, user: safeUser(u) });
    }

    if (method === "GET" && p === "/api/orders") {
      if (!requirePermission(req, res, "orders.read") && !requirePermission(req, res, "orders.read_assigned")) return;
      const list = [...orders.values()].filter(o => user.role !== "driver" || o.driver_id === user.id);
      return json(res, 200, { success: true, orders: list });
    }

    if (method === "POST" && p === "/api/orders") {
      if (!requirePermission(req, res, "orders.write")) return;
      const b = await parseBody(req);
      const o = {
        id: nextOrderId++, customer_name: String(b.customer_name || ""),
        customer_phone: String(b.customer_phone || ""),
        address: String(b.address || ""), status: "new",
        driver_id: b.driver_id ? Number(b.driver_id) : null,
        notes: String(b.notes || ""), created_at: new Date().toISOString()
      };
      orders.set(o.id, o);
      return json(res, 201, { success: true, order: o });
    }

    const orderMatch = p.match(/^\/api\/orders\/(\d+)$/);
    if (method === "PATCH" && orderMatch) {
      if (!requirePermission(req, res, "orders.write")) return;
      const id = Number(orderMatch[1]);
      const o = orders.get(id);
      if (!o) return json(res, 404, { success: false, error: "الطلب غير موجود" });
      const b = await parseBody(req);
      Object.assign(o, {
        status: b.status ?? o.status,
        driver_id: b.driver_id === null ? null : (b.driver_id !== undefined ? Number(b.driver_id) : o.driver_id),
        notes: b.notes ?? o.notes
      });
      return json(res, 200, { success: true, order: o });
    }

    if (method === "GET" && p === "/api/drivers") {
      if (!requirePermission(req, res, "drivers.read")) return;
      return json(res, 200, {
        success: true,
        drivers: [...users.values()].filter(u => u.role === "driver").map(safeUser)
      });
    }

    if (method === "GET" && p === "/api/chat") {
      if (!requirePermission(req, res, "chat.read")) return;
      const orderId = url.searchParams.get("order_id");
      const withUser = url.searchParams.get("with_user");
      const result = messages.filter(m =>
        (orderId ? String(m.order_id) === String(orderId) : true) &&
        (withUser ? (String(m.from_id) === String(withUser) || String(m.to_id) === String(withUser)) : true)
      );
      return json(res, 200, { success: true, messages: result });
    }

    if (method === "POST" && p === "/api/chat") {
      const u = requirePermission(req, res, "chat.write");
      if (!u) return;
      const b = await parseBody(req);
      const m = {
        id: nextMessageId++, from_id: u.id, to_id: b.to_id ? Number(b.to_id) : null,
        order_id: b.order_id ? Number(b.order_id) : null,
        text: String(b.text || "").slice(0, 2000),
        created_at: new Date().toISOString()
      };
      if (!m.text) return json(res, 400, { success: false, error: "اكتب الرسالة" });
      messages.push(m);
      return json(res, 201, { success: true, message: m });
    }

    if (method === "POST" && p === "/api/driver/location") {
      const u = requirePermission(req, res, "location.write");
      if (!u) return;
      const b = await parseBody(req);
      u.location = {
        lat: Number(b.lat), lng: Number(b.lng),
        accuracy: b.accuracy ? Number(b.accuracy) : null,
        updated_at: new Date().toISOString()
      };
      return json(res, 200, { success: true, location: u.location });
    }

    if (method === "GET" && p === "/api/drivers/locations") {
      if (!requirePermission(req, res, "drivers.read")) return;
      const result = [...users.values()]
        .filter(u => u.role === "driver")
        .map(u => ({ id: u.id, name: u.name, location: u.location || null }));
      return json(res, 200, { success: true, drivers: result });
    }

    if (method === "GET" && p === "/api/whatsapp/location-request") {
      const u = currentUser(req);
      if (!u) return json(res, 401, { success: false });
      const phone = String(url.searchParams.get("phone") || "").replace(/\D/g, "");
      const text = encodeURIComponent("مرحباً، من فضلك أرسل موقعك الحالي من خلال WhatsApp لإتمام التوصيل.");
      const link = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
      return json(res, 200, { success: true, link });
    }

    return serveStatic(req, res);
  } catch (err) {
    console.error(err);
    return json(res, 500, { success: false, error: "خطأ داخلي في الخادم" });
  }
}

const server = http.createServer(handle);
server.listen(PORT, () => {
  console.log(`🚚 Trend Delivery running on port ${PORT}`);
  console.log(`👥 Users/Roles: enabled`);
  console.log(`📦 Orders: enabled`);
  console.log(`💬 Internal Chat: enabled`);
  console.log(`📍 Driver Location: enabled`);
  console.log(`🟢 Supabase: ${process.env.SUPABASE_URL ? "configured" : "optional/not configured"}`);
  console.log(`☁️ R2: ${process.env.R2_ENDPOINT ? "configured" : "optional/not configured"}`);
});
