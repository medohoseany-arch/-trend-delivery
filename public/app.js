/* Trend Delivery Service - compatible frontend */
"use strict";

let TOKEN = localStorage.getItem("trend_token") || "";
let LANG = localStorage.getItem("trend_lang") || "ar";
let CURRENT_USER = null;
let ROLE_DATA = [];
let PERMISSION_LABELS = {};

const $ = id => document.getElementById(id);

async function api(path, opt = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(opt.headers || {})
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const r = await fetch(path, { ...opt, headers });
  const d = await r.json().catch(() => ({}));

  if (!r.ok) {
    if (r.status === 401) {
      TOKEN = "";
      localStorage.removeItem("trend_token");
    }
    throw new Error(d.error || `HTTP ${r.status}`);
  }
  return d;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function msg(id, text, cls="") {
  const el = $(id);
  if (!el) return;
  el.innerHTML = cls
    ? `<span class="${cls}">${escapeHtml(text)}</span>`
    : escapeHtml(text);
}

function toggleLang() {
  LANG = LANG === "ar" ? "en" : "ar";
  localStorage.setItem("trend_lang", LANG);
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === "ar" ? "rtl" : "ltr";
  alert(LANG === "ar" ? "تم اختيار العربية" : "English selected");
}

async function login() {
  const username = $("username");
  const password = $("password");
  if (!username || !password) return msg("loginMsg", "حقول تسجيل الدخول غير موجودة", "error");
  if (!username.value.trim() || !password.value) return msg("loginMsg", "أدخل اسم المستخدم وكلمة المرور", "error");
  const button = document.querySelector("#login button");
  if (button) button.disabled = true;
  try {
    const d = await api("/api/login", { method: "POST", body: JSON.stringify({ username: username.value.trim(), password: password.value }) });
    if (!d.token) throw new Error("السيرفر لم يرجع رمز الدخول");
    TOKEN = d.token; localStorage.setItem("trend_token", TOKEN);
    CURRENT_USER = d.user || null;
    $("login")?.classList.add("hidden"); $("app")?.classList.remove("hidden");
    await show("dashboard");
  } catch (e) { console.error("LOGIN ERROR:", e); msg("loginMsg", e.message, "error"); }
  finally { if (button) button.disabled = false; }
}

function logout() {
  TOKEN = "";
  localStorage.removeItem("trend_token");
  location.reload();
}

async function show(page) {
  const c = $("content");
  if (!c) return;

  c.innerHTML = `<div class="panel"><p class="muted">جاري التحميل...</p></div>`;

  try {
    if (page === "dashboard") await dashboardPage(c);
    else if (page === "order") await orderPage(c);
    else if (page === "search") searchPage(c);
    else if (page === "shipments") shipmentsPage(c);
    else if (page === "jobs") await jobsPage(c);
    else if (page === "jobcode") await jobCodePage(c);
    else if (page === "returns") await returnsPage(c);
    else if (page === "merchants") await merchantsPage(c);
    else if (page === "drivers") await driversPage(c);
    else if (page === "areas") await areasPage(c);
    else if (page === "accounting") await accountingPage(c);
    else if (page === "expenses") await expensesPage(c);
    else if (page === "audit") await auditPage(c);
    else if (page === "users") await usersPage(c);
    else c.innerHTML = `<div class="panel"><span class="error">الصفحة غير موجودة</span></div>`;
  } catch (e) {
    console.error("PAGE ERROR:", e);
    c.innerHTML = `<div class="panel"><span class="error">${escapeHtml(e.message)}</span></div>`;
  }
}

function stat(t,n) {
  return `<div class="stat">${escapeHtml(t)}<b>${escapeHtml(n)}</b></div>`;
}

async function dashboardPage(c) {
  const d = await api("/api/dashboard");
  const x = d.data?.counts || {};

  c.innerHTML = `
    <h2>لوحة التحكم</h2>
    <div class="grid">
      ${stat("الأوردرات",x.orders||0)}
      ${stat("الشحنات",x.shipments||0)}
      ${stat("مهام التوصيل",x.jobs ?? x.delivery_jobs ?? 0)}
      ${stat("السائقون",x.drivers||0)}
      ${stat("التجار",x.merchants||0)}
      ${stat("تم التسليم",x.delivered||0)}
      ${stat("ملغى",x.cancelled||0)}
      ${stat("قيد التنفيذ",x.pending||0)}
    </div>
    <div class="panel">
      <h3>بحث سريع</h3>
      <div class="row">
        <input id="quickSearch" placeholder="رقم العميل / رقم الأوردر / رقم الشحنة">
        <button onclick="quickSearch()">بحث</button>
      </div>
      <div id="quickResult"></div>
    </div>`;
}

async function quickSearch() {
  const q = $("quickSearch")?.value.trim();
  if (!q) return msg("quickResult","اكتب قيمة البحث","error");
  try {
    $("quickResult").innerHTML = renderSearch(await api("/api/search?q="+encodeURIComponent(q)));
  } catch(e) {
    msg("quickResult",e.message,"error");
  }
}

async function orderPage(c) {
  const [m,g,a,s] = await Promise.all([
    api("/api/merchants"),
    api("/api/governorates"),
    api("/api/areas"),
    api("/api/order/next-serial")
  ]);

  const next = s.next ?? s.serial ?? 1;

  c.innerHTML = `
    <h2>إدخال أوردر</h2>
    <div class="panel">
      <div class="form-grid">
        <label>التسلسل<input id="serial" type="number" value="${escapeHtml(next)}" min="1"></label>
        <label>كود الأوردر<input id="order_code" placeholder="مثال ORD-1005"></label>
        <label>التاجر<select id="merchant">
          ${(m.data||[]).map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)} — ${escapeHtml(x.merchant_no)} — ${escapeHtml(x.code)}</option>`).join("")}
        </select></label>
        <label>رقم أوردر التاجر<input id="merchant_order_no"></label>
        <label>اسم العميل<input id="customer_name"></label>
        <label>رقم العميل / الهاتف<input id="customer_phone"></label>
        <label>الإمارة<select id="gov">
          ${(g.data||[]).map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name_ar)}</option>`).join("")}
        </select></label>
        <label>المنطقة<select id="area">
          ${(a.data||[]).map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name_ar)}</option>`).join("")}
        </select></label>
        <label>العنوان الكامل<input id="address"></label>
        <label>قيمة الأوردر<input id="value" type="number" step="0.01"></label>
        <label>رسوم التوصيل<input id="delivery_fee" type="number" step="0.01"></label>
        <label class="full">ملاحظات<textarea id="notes"></textarea></label>
      </div>
      <div class="actions"><button onclick="saveOrder()">حفظ وإنشاء أوردر جديد</button></div>
      <div id="orderMsg" class="msg"></div>
    </div>`;
}

async function saveOrder() {
  const b = {
    serial_no:Number($("serial").value),
    order_code:$("order_code").value.trim(),
    merchant_id:$("merchant").value,
    merchant_order_no:$("merchant_order_no").value.trim(),
    customer_name:$("customer_name").value.trim(),
    customer_phone:$("customer_phone").value.trim(),
    governorate_id:$("gov").value,
    area_id:$("area").value,
    address:$("address").value.trim(),
    value:Number($("value").value),
    delivery_fee:Number($("delivery_fee").value),
    notes:$("notes").value.trim()
  };

  try {
    const d = await api("/api/orders",{method:"POST",body:JSON.stringify(b)});
    $("orderMsg").innerHTML =
      `<span class="ok">تم الحفظ — الشحنة ${escapeHtml(d.shipment?.shipment_no||"")}</span>` +
      (d.serialDuplicate ? ` <span class="duplicate">⚠ التسلسل مكرر اليوم</span>` : "");
    setTimeout(()=>orderPage($("content")),700);
  } catch(e) {
    msg("orderMsg",e.message,"error");
  }
}

function searchPage(c) {
  c.innerHTML = `
    <h2>البحث</h2>
    <div class="panel">
      <div class="row">
        <input id="searchQ" placeholder="رقم العميل / رقم الأوردر / رقم الشحنة">
        <button onclick="doSearch()">بحث</button>
      </div>
      <div id="searchResult"></div>
    </div>`;
}

async function doSearch() {
  const q = $("searchQ")?.value.trim();
  if (!q) return msg("searchResult","اكتب قيمة البحث","error");
  try {
    $("searchResult").innerHTML = renderSearch(await api("/api/search?q="+encodeURIComponent(q)));
  } catch(e) {
    msg("searchResult",e.message,"error");
  }
}

function renderSearch(d) {
  if (!d?.data) return `<p class="muted">لا توجد نتائج</p>`;
  return `<div class="panel"><h3>${escapeHtml(d.type)}</h3><pre>${escapeHtml(JSON.stringify(d.data,null,2))}</pre></div>`;
}

function shipmentsPage(c) {
  c.innerHTML = `
    <h2>الشحنات</h2>
    <div class="panel">
      <p>استخدم البحث لفتح الشحنة وتحديث حالتها.</p>
      <div class="row">
        <input id="shipSearch" placeholder="رقم الشحنة">
        <button onclick="shipSearch()">فتح</button>
      </div>
      <div id="shipResult"></div>
    </div>`;
}

async function shipSearch() {
  const q = $("shipSearch")?.value.trim();
  if (!q) return msg("shipResult","اكتب رقم الشحنة","error");

  try {
    const d = await api("/api/search?q="+encodeURIComponent(q));
    const s = d.data;

    if (!s) {
      $("shipResult").innerHTML = `<p class="muted">الشحنة غير موجودة</p>`;
      return;
    }

    $("shipResult").innerHTML = `
      <div class="panel">
        <b>${escapeHtml(s.shipment_no||s.order_code||"")}</b>
        <p>الحالة: <span class="badge">${escapeHtml(s.status||"غير معروف")}</span></p>
        ${s.id ? `<div class="actions">
          <button onclick="setStatus('${escapeHtml(s.id)}','delivered')">تم التسليم</button>
          <button onclick="setStatus('${escapeHtml(s.id)}','retry_tomorrow')">إعادة غداً</button>
          <button onclick="setStatus('${escapeHtml(s.id)}','cancelled')">إلغاء</button>
          <button onclick="setStatus('${escapeHtml(s.id)}','cancelled_customer_paid')">إلغاء + دفع الرسوم</button>
          <button onclick="setStatus('${escapeHtml(s.id)}','cancelled_by_shipper')">Cancelled by Shipper</button>
          <button onclick="setStatus('${escapeHtml(s.id)}','swapped')">تم التبديل</button>
        </div>` : ""}
      </div>`;
  } catch(e) {
    msg("shipResult",e.message,"error");
  }
}

async function setStatus(id,status) {
  try {
    await api("/api/shipments/status",{method:"POST",body:JSON.stringify({shipment_id:id,status})});
    alert("تم تحديث الحالة");
    await shipSearch();
  } catch(e) {
    alert(e.message);
  }
}

async function jobsPage(c) {
  const [j,d] = await Promise.all([api("/api/delivery-jobs"),api("/api/drivers")]);

  c.innerHTML = `
    <h2>مهام التوصيل</h2>
    <div class="panel">
      <h3>إنشاء مهمة</h3>
      <div class="form-grid">
        <label>السائق<select id="jobDriver">
          ${(d.data||[]).map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join("")}
        </select></label>
        <label>كود المهمة<input id="jobCode" placeholder="DJ-001"></label>
        <label class="full">أرقام الشحنات، كل رقم في سطر<textarea id="jobShipments" placeholder="SH-..."></textarea></label>
      </div>
      <button onclick="createJob()">إنشاء</button>
    </div>
    <div class="panel">
      <h3>المهام الحالية</h3>
      ${table(j.data||[],["job_code","status","expected_count","received_count","created_at"])}
    </div>`;
}

async function createJob() {
  const nums = ($("jobShipments")?.value||"").split(/\s+/).filter(Boolean);
  const ids = [];

  for (const n of nums) {
    try {
      const d = await api("/api/search?q="+encodeURIComponent(n));
      if (d.type==="shipment" && d.data?.id) ids.push(d.data.id);
    } catch(_) {}
  }

  try {
    await api("/api/delivery-jobs",{method:"POST",body:JSON.stringify({
      driver_id:$("jobDriver").value,
      job_code:$("jobCode").value.trim(),
      shipment_ids:ids
    })});
    alert("تم إنشاء المهمة");
    await show("jobs");
  } catch(e) {
    alert(e.message);
  }
}

async function jobCodePage(c) {
  const d = await api("/api/delivery-jobs");

  c.innerHTML = `
    <h2>تحديث كود مهمة التوصيل</h2>
    <div class="panel">
      <div class="form-grid">
        <label>رقم الشحنة<input id="jcShipment"></label>
        <label>رقم التسلسل<input id="jcSerial" type="number"></label>
        <label>Delivery Job Code<select id="jcJob">
          ${(d.data||[]).map(x=>`<option value="${escapeHtml(x.job_code)}">${escapeHtml(x.job_code)}</option>`).join("")}
        </select></label>
      </div>
      <button onclick="saveJobCode()">حفظ</button>
      <div id="jcMsg"></div>
    </div>`;
}

async function saveJobCode() {
  try {
    const d = await api("/api/delivery-job-code",{method:"POST",body:JSON.stringify({
      shipment_no:$("jcShipment").value.trim(),
      serial_no:Number($("jcSerial").value),
      delivery_job_code:$("jcJob").value
    })});
    $("jcMsg").innerHTML = d.duplicate
      ? `<span class="duplicate">⚠ مكرر في نفس اليوم</span>`
      : `<span class="ok">تم الحفظ</span>`;
  } catch(e) {
    msg("jcMsg",e.message,"error");
  }
}

async function returnsPage(c) {
  const d = await api("/api/returns");
  c.innerHTML = `<h2>المرتجعات للتاجر</h2><div class="panel">${table(d.data||[],["shipment_id","reason_status","status","created_at"])}</div>`;
}

async function merchantsPage(c) {
  const d = await api("/api/merchants");
  const rows = d.data || [];
  c.innerHTML = `
    <h2>التجار</h2>
    <div class="panel">
      <h3>إضافة تاجر جديد</h3>
      <div class="form-grid">
        <label>رقم التاجر<input id="mNo" placeholder="M-001"></label>
        <label>كود التاجر<input id="mCode" placeholder="MER-001"></label>
        <label>اسم التاجر<input id="mName"></label>
        <label>الهاتف<input id="mPhone"></label>
        <label>العنوان<input id="mAddress"></label>
        <label>الضريبة
          <select id="mTax"><option value="false">بدون ضريبة</option><option value="true">خصم ضريبة</option></select>
        </label>
        <label>نسبة الضريبة %<input id="mTaxRate" type="number" min="0" max="100" step="0.01" value="0"></label>
      </div>
      <button onclick="addMerchant()">إضافة التاجر</button>
      <div id="merchantAddMsg" class="msg"></div>
    </div>
    <div class="panel">
      <h3>التجار الحاليون والضريبة</h3>
      <div class="table-wrap"><table><thead><tr><th>رقم</th><th>الكود</th><th>الاسم</th><th>الهاتف</th><th>الضريبة</th><th>النسبة %</th><th>الحالة</th><th>حفظ</th></tr></thead><tbody>
      ${rows.map(x=>`<tr>
        <td>${escapeHtml(x.merchant_no)}</td><td>${escapeHtml(x.code)}</td><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.phone)}</td>
        <td><select id="tax_enabled_${escapeHtml(x.id)}"><option value="false" ${x.tax_enabled?"":"selected"}>بدون</option><option value="true" ${x.tax_enabled?"selected":""}>خصم</option></select></td>
        <td><input id="tax_rate_${escapeHtml(x.id)}" type="number" min="0" max="100" step="0.01" value="${escapeHtml(x.tax_rate ?? 0)}"></td>
        <td><select id="merchant_active_${escapeHtml(x.id)}"><option value="true" ${x.active===false?"":"selected"}>نشط</option><option value="false" ${x.active===false?"selected":""}>غير نشط</option></select></td>
        <td><button onclick="saveMerchant('${escapeHtml(x.id)}')">حفظ</button></td>
      </tr>`).join("")}
      </tbody></table></div>
    </div>`;
}

async function addMerchant() {
  try {
    const enabled = $("mTax").value === "true";
    const rate = Number($("mTaxRate").value || 0);
    if (!$('mNo').value.trim() || !$('mCode').value.trim() || !$('mName').value.trim()) throw new Error("رقم التاجر والكود والاسم مطلوبة");
    if (rate < 0 || rate > 100) throw new Error("نسبة الضريبة يجب أن تكون بين 0 و100");
    await api("/api/merchants", {method:"POST", body:JSON.stringify({
      merchant_no:$('mNo').value.trim(), code:$('mCode').value.trim(), name:$('mName').value.trim(),
      phone:$('mPhone').value.trim(), address:$('mAddress').value.trim(), tax_enabled:enabled, tax_rate:enabled?rate:0
    })});
    await show("merchants");
  } catch(e) { msg("merchantAddMsg", e.message, "error"); }
}

async function saveMerchant(id) {
  try {
    const enabled = $("tax_enabled_"+id).value === "true";
    const rate = Number($("tax_rate_"+id).value || 0);
    const active = $("merchant_active_"+id).value === "true";
    if (rate < 0 || rate > 100) throw new Error("نسبة الضريبة يجب أن تكون بين 0 و100");
    await api("/api/merchants", {method:"PATCH", body:JSON.stringify({id,tax_enabled:enabled,tax_rate:enabled?rate:0,active})});
    alert("تم حفظ بيانات التاجر");
  } catch(e) { alert(e.message); }
}

async function saveMerchantTax(id) { return saveMerchant(id); }

async function driversPage(c) {
  const d = await api("/api/drivers");
  const rows = d.data || [];
  c.innerHTML = `
    <h2>السائقون</h2>
    <div class="panel">
      <h3>إضافة سائق جديد</h3>
      <div class="form-grid">
        <label>رقم السائق<input id="dNo" placeholder="D-001"></label>
        <label>اسم السائق<input id="dName"></label>
        <label>الهاتف<input id="dPhone"></label>
        <label>رقم/نوع المركبة<input id="dVehicle"></label>
      </div>
      <button onclick="addDriver()">إضافة السائق</button>
      <div id="driverAddMsg" class="msg"></div>
    </div>
    <div class="panel"><h3>السائقون الحاليون</h3>
      <div class="table-wrap"><table><thead><tr><th>رقم</th><th>الاسم</th><th>الهاتف</th><th>المركبة</th><th>الحالة</th><th>حفظ</th></tr></thead><tbody>
      ${rows.map(x=>`<tr><td>${escapeHtml(x.driver_no)}</td><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.phone)}</td><td>${escapeHtml(x.vehicle_no)}</td><td><select id="driver_active_${escapeHtml(x.id)}"><option value="true" ${x.active===false?"":"selected"}>نشط</option><option value="false" ${x.active===false?"selected":""}>غير نشط</option></select></td><td><button onclick="saveDriver('${escapeHtml(x.id)}')">حفظ</button></td></tr>`).join("")}
      </tbody></table></div>
    </div>`;
}

async function addDriver() {
  try {
    if (!$('dNo').value.trim() || !$('dName').value.trim()) throw new Error("رقم السائق والاسم مطلوبان");
    await api("/api/drivers", {method:"POST", body:JSON.stringify({driver_no:$('dNo').value.trim(),name:$('dName').value.trim(),phone:$('dPhone').value.trim(),vehicle_no:$('dVehicle').value.trim()})});
    await show("drivers");
  } catch(e) { msg("driverAddMsg", e.message, "error"); }
}

async function saveDriver(id) {
  try {
    await api("/api/drivers", {method:"PATCH", body:JSON.stringify({id,active:$("driver_active_"+id).value === "true"})});
    alert("تم حفظ حالة السائق");
  } catch(e) { alert(e.message); }
}

async function areasPage(c) {
  const [g,a] = await Promise.all([api("/api/governorates"),api("/api/areas")]);
  const govs = g.data || [], areas = a.data || [];
  c.innerHTML = `
    <h2>الإمارات والمناطق</h2>
    <div class="panel">
      <h3>إضافة إمارة</h3>
      <div class="form-grid"><label>اسم الإمارة بالعربي<input id="gAr"></label><label>الاسم بالإنجليزية<input id="gEn"></label></div>
      <button onclick="addGovernorate()">إضافة الإمارة</button><div id="govMsg" class="msg"></div>
    </div>
    <div class="panel"><h3>الإمارات الحالية</h3>${table(govs,["name_ar","name_en"])}</div>
    <div class="panel">
      <h3>إضافة منطقة</h3>
      <div class="form-grid"><label>الإمارة<select id="aGov">${govs.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name_ar)}</option>`).join("")}</select></label><label>اسم المنطقة بالعربي<input id="aAr"></label><label>الاسم بالإنجليزية<input id="aEn"></label></div>
      <button onclick="addArea()">إضافة المنطقة</button><div id="areaMsg" class="msg"></div>
    </div>
    <div class="panel"><h3>المناطق الحالية</h3>${table(areas,["name_ar","name_en","governorate_id"])}</div>`;
}

async function addGovernorate() {
  try {
    if (!$('gAr').value.trim()) throw new Error("اسم الإمارة بالعربي مطلوب");
    await api("/api/governorates", {method:"POST", body:JSON.stringify({name_ar:$('gAr').value.trim(),name_en:$('gEn').value.trim()})});
    await show("areas");
  } catch(e) { msg("govMsg",e.message,"error"); }
}

async function addArea() {
  try {
    if (!$('aGov').value || !$('aAr').value.trim()) throw new Error("الإمارة واسم المنطقة مطلوبان");
    await api("/api/areas", {method:"POST", body:JSON.stringify({governorate_id:$('aGov').value,name_ar:$('aAr').value.trim(),name_en:$('aEn').value.trim()})});
    await show("areas");
  } catch(e) { msg("areaMsg",e.message,"error"); }
}

async function usersPage(c) {
  const [u,r] = await Promise.all([api("/api/users"),api("/api/roles")]);
  ROLE_DATA = r.data || [];
  PERMISSION_LABELS = r.labels || {};
  const roleOptions = ROLE_DATA.map(x=>`<option value="${escapeHtml(x.name)}">${escapeHtml(x.name)}</option>`).join("");
  const permissionBoxes = Object.entries(PERMISSION_LABELS).map(([code,label])=>`<label><input type="checkbox" class="newRolePerm" value="${escapeHtml(code)}"> ${escapeHtml(label)}</label>`).join("");
  const rows = u.data || [];
  c.innerHTML = `
    <h2>الموظفون والصلاحيات</h2>
    <div class="panel">
      <h3>إضافة موظف</h3>
      <div class="form-grid">
        <label>اسم الموظف<input id="uName"></label>
        <label>اسم المستخدم<input id="uUsername" autocomplete="off"></label>
        <label>البريد الإلكتروني<input id="uEmail" type="email"></label>
        <label>كلمة المرور<input id="uPassword" type="password" autocomplete="new-password"></label>
        <label>الدور والصلاحيات<select id="uRole">${roleOptions}</select></label>
        <label>اللغة<select id="uLang"><option value="ar">العربية</option><option value="en">English</option></select></label>
      </div>
      <button onclick="addUser()">إضافة الموظف</button><div id="userAddMsg" class="msg"></div>
    </div>
    <div class="panel">
      <h3>إنشاء مجموعة صلاحيات جديدة</h3>
      <div class="form-grid"><label>اسم المجموعة<input id="roleName" placeholder="مثال: مشرف المخزن"></label></div>
      <div class="form-grid">${permissionBoxes}</div>
      <button onclick="addRole()">إنشاء مجموعة الصلاحيات</button><div id="roleMsg" class="msg"></div>
    </div>
    <div class="panel"><h3>الموظفون الحاليون</h3>${table(rows,["name","username","email","role","language","active","created_at"])}</div>
    <div class="panel"><h3>مجموعات الصلاحيات</h3>${ROLE_DATA.map(x=>`<div class="stat"><b>${escapeHtml(x.name)}</b><span>${escapeHtml((x.permissions||[]).map(k=>PERMISSION_LABELS[k]||k).join("، "))}</span></div>`).join("")}</div>`;
}

async function addUser() {
  try {
    const body={name:$('uName').value.trim(),username:$('uUsername').value.trim(),email:$('uEmail').value.trim(),password:$('uPassword').value,role:$('uRole').value,language:$('uLang').value};
    if(!body.name||!body.username||!body.email||!body.password) throw new Error("الاسم واسم المستخدم والبريد وكلمة المرور مطلوبة");
    await api("/api/users",{method:"POST",body:JSON.stringify(body)});
    await show("users");
  } catch(e){ msg("userAddMsg",e.message,"error"); }
}

async function addRole() {
  try {
    const name=$('roleName').value.trim();
    const permissions=[...document.querySelectorAll('.newRolePerm:checked')].map(x=>x.value);
    if(!name) throw new Error("اسم مجموعة الصلاحيات مطلوب");
    if(!permissions.length) throw new Error("اختر صلاحية واحدة على الأقل");
    await api("/api/roles",{method:"POST",body:JSON.stringify({name,permissions})});
    await show("users");
  } catch(e){ msg("roleMsg",e.message,"error"); }
}

async function accountingPage(c) {
  const [t,o] = await Promise.all([api("/api/transactions"),api("/api/orders")]);
  const orders = (o.data||[]).filter(x=>Number(x.tax_amount||0)>0);
  c.innerHTML = `<h2>الحسابات</h2><div class="panel"><p>هذا السجل يربط حركة التاجر والسائق وإيراد الشركة بالشحنة نفسها.</p>${table(t.data||[],["account_type","transaction_type","amount","direction","status","created_at"])}</div><div class="panel"><h3>الضرائب المخصومة من التجار</h3>${table(orders,["serial_no","order_code","merchant_id","value","tax_rate","tax_amount","merchant_net_value","created_at"])}</div>`;
}

async function expensesPage(c) {
  const d = await api("/api/drivers");
  c.innerHTML = `
    <h2>مصروفات السائق</h2>
    <div class="panel">
      <div class="form-grid">
        <label>السائق<select id="exDriver"><option value="">بدون</option>
          ${(d.data||[]).map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join("")}
        </select></label>
        <label>النوع<select id="exType">
          <option value="petrol">petrol</option>
          <option value="maintenance">maintenance</option>
          <option value="road">road</option>
          <option value="operating">operating</option>
          <option value="other">other</option>
        </select></label>
        <label>المبلغ<input id="exAmount" type="number" step="0.01"></label>
        <label>التاريخ<input id="exDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
        <label class="full">ملاحظات<textarea id="exNotes"></textarea></label>
      </div>
      <button onclick="saveExpense()">حفظ</button>
      <div id="exMsg"></div>
    </div>`;
}

async function saveExpense() {
  try {
    await api("/api/expenses",{method:"POST",body:JSON.stringify({
      driver_id:$("exDriver").value||null,
      expense_type:$("exType").value,
      amount:Number($("exAmount").value),
      expense_date:$("exDate").value,
      notes:$("exNotes").value
    })});
    msg("exMsg","تم الحفظ","ok");
  } catch(e) {
    msg("exMsg",e.message,"error");
  }
}

async function auditPage(c) {
  const d = await api("/api/audit");
  c.innerHTML = `<h2>سجل العمليات</h2><div class="panel">${table(d.data||[],["action","entity_type","entity_id","created_at"])}</div>`;
}

function table(rows,cols) {
  if (!rows || !rows.length) return "<p class='muted'>لا توجد بيانات</p>";
  return `<div class="table-wrap"><table><thead><tr>
    ${cols.map(c=>`<th>${escapeHtml(c)}</th>`).join("")}
  </tr></thead><tbody>
    ${rows.map(r=>`<tr>${cols.map(c=>`<td>${escapeHtml(r[c]??"")}</td>`).join("")}</tr>`).join("")}
  </tbody></table></div>`;
}

/* Required for inline onclick handlers. */
Object.assign(window,{
  login,logout,toggleLang,show,quickSearch,doSearch,shipSearch,
  setStatus,createJob,saveJobCode,saveExpense,saveMerchantTax,
  addMerchant,saveMerchant,addDriver,saveDriver,addGovernorate,addArea,
  usersPage,addUser,addRole
});

window.addEventListener("error",e=>console.error("FRONTEND ERROR:",e.error||e.message));
window.addEventListener("unhandledrejection",e=>console.error("FRONTEND PROMISE ERROR:",e.reason));

document.addEventListener("DOMContentLoaded",()=>{
  document.documentElement.lang=LANG;
  document.documentElement.dir=LANG==="ar"?"rtl":"ltr";

  const enterLogin=e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      login();
    }
  };

  $("username")?.addEventListener("keydown",enterLogin);
  $("password")?.addEventListener("keydown",enterLogin);

  if(TOKEN){
    $("login")?.classList.add("hidden");
    $("app")?.classList.remove("hidden");

    show("dashboard").catch(e=>{
      console.error("AUTO LOGIN ERROR:",e);
      TOKEN="";
      localStorage.removeItem("trend_token");
      $("login")?.classList.remove("hidden");
      $("app")?.classList.add("hidden");
    });
  }
});
