let token = localStorage.getItem("trend_token");
let me = null;

const $ = id => document.getElementById(id);

async function api(url, options = {}) {
  options.headers = { ...(options.headers || {}), "Content-Type": "application/json" };
  if (token) options.headers.Authorization = "Bearer " + token;
  const r = await fetch(url, options);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "حدث خطأ");
  return data;
}

function showApp() {
  $("loginCard").hidden = true;
  $("app").hidden = false;
  $("logout").hidden = false;
  $("who").textContent = "مرحباً " + me.name;
  $("roleLabel").textContent = "الصلاحية: " + me.role;
  loadOrders(); loadChat();
}

async function login() {
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ name: $("name").value, role: $("role").value })
    });
    token = data.token; me = data.user;
    localStorage.setItem("trend_token", token);
    showApp();
  } catch(e) { alert(e.message); }
}

async function restore() {
  if (!token) return;
  try { me = (await api("/api/me")).user; showApp(); }
  catch { localStorage.removeItem("trend_token"); token = null; }
}

async function loadOrders() {
  try {
    const d = await api("/api/orders");
    $("orders").innerHTML = d.orders.map(o =>
      `<div class="item"><b>#${o.id}</b> ${esc(o.customer_name)}
       <br>📍 ${esc(o.address)}<br>الحالة: <b>${esc(o.status)}</b> — السائق: ${o.driver_id || "غير معين"}</div>`
    ).join("") || "<p>لا توجد طلبات.</p>";
  } catch(e) { $("orders").textContent = e.message; }
}

async function loadUsers() {
  try {
    const d = await api("/api/users");
    $("users").innerHTML = d.users.map(u =>
      `<div class="item">#${u.id} — ${esc(u.name)} — ${esc(u.role)}</div>`
    ).join("");
  } catch(e) { $("users").textContent = e.message; }
}

async function loadChat() {
  try {
    const d = await api("/api/chat");
    $("chat").innerHTML = d.messages.map(m =>
      `<div class="message"><b>#${m.from_id}</b> → ${m.to_id || "عام"}: ${esc(m.text)}<small>${new Date(m.created_at).toLocaleString("ar-EG")}</small></div>`
    ).join("") || "<p>لا توجد رسائل.</p>";
  } catch(e) { $("chat").textContent = e.message; }
}

async function sendMessage() {
  try {
    await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({ to_id: $("chatTo").value || null, text: $("chatText").value })
    });
    $("chatText").value = "";
    loadChat();
  } catch(e) { alert(e.message); }
}

async function sendLocation() {
  if (!navigator.geolocation) return alert("المتصفح لا يدعم تحديد الموقع");
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      await api("/api/driver/location", {
        method: "POST",
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
      });
      alert("تم إرسال الموقع");
    } catch(e) { alert(e.message); }
  }, err => alert("لم يتم السماح بالموقع: " + err.message), { enableHighAccuracy: true });
}

async function loadLocations() {
  try {
    const d = await api("/api/drivers/locations");
    $("locations").innerHTML = d.drivers.map(x =>
      `<div class="item">🚚 ${esc(x.name)}: ${x.location ? `${x.location.lat}, ${x.location.lng}` : "لا يوجد موقع"}</div>`
    ).join("");
  } catch(e) { $("locations").textContent = e.message; }
}

async function requestLocation() {
  try {
    const d = await api("/api/whatsapp/location-request?phone=" + encodeURIComponent($("customerPhone").value));
    $("waLink").href = d.link; $("waLink").hidden = false; $("waLink").click();
  } catch(e) { alert(e.message); }
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

$("login").onclick = login;
$("logout").onclick = async () => {
  await api("/api/logout", { method: "POST" }).catch(()=>{});
  localStorage.removeItem("trend_token"); location.reload();
};
restore();
