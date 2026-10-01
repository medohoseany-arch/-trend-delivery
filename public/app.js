/* Trend Delivery Service - compatible frontend */
"use strict";

let TOKEN = localStorage.getItem("trend_token") || "";
let LANG = localStorage.getItem("trend_lang") || "ar";

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
  const email = $("email");
  const password = $("password");

  if (!email || !password) {
    msg("loginMsg", "حقول تسجيل الدخول غير موجودة", "error");
    return;
  }

  if (!email.value.trim() || !password.value) {
    msg("loginMsg", "أدخل البريد الإلكتروني وكلمة المرور", "error");
    return;
  }

  const button = document.querySelector("#login button");
  if (button) button.disabled = true;

  try {
    const d = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value
      })
    });

    if (!d.token) throw new Error("السيرفر لم يرجع رمز الدخول");

    TOKEN = d.token;
    localStorage.setItem("trend_token", TOKEN);

    $("login")?.classList.add("hidden");
    $("app")?.classList.remove("hidden");

    await show("dashboard");
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    msg("loginMsg", e.message, "error");
  } finally {
    if (button) button.disabled = false;
  }
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
  c.innerHTML = `<h2>التجار</h2><div class="panel">${table(d.data||[],["merchant_no","code","name","phone","active"])}</div>`;
}

async function driversPage(c) {
  const d = await api("/api/drivers");
  c.innerHTML = `<h2>السائقون</h2><div class="panel">${table(d.data||[],["driver_no","name","phone","vehicle_no","active"])}</div>`;
}

async function areasPage(c) {
  const [g,a] = await Promise.all([api("/api/governorates"),api("/api/areas")]);
  c.innerHTML = `
    <h2>الإمارات والمناطق</h2>
    <div class="panel"><h3>الإمارات</h3>${table(g.data||[],["name_ar","name_en"])}</div>
    <div class="panel"><h3>المناطق</h3>${table(a.data||[],["name_ar","name_en","governorate_id"])}</div>`;
}

async function accountingPage(c) {
  const d = await api("/api/transactions");
  c.innerHTML = `
    <h2>الحسابات</h2>
    <div class="panel">
      <p>هذا السجل يربط حركة التاجر والسائق وإيراد الشركة بالشحنة نفسها.</p>
      ${table(d.data||[],["account_type","transaction_type","amount","direction","status","created_at"])}
    </div>`;
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
  setStatus,createJob,saveJobCode,saveExpense
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

  $("email")?.addEventListener("keydown",enterLogin);
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
