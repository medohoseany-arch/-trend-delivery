/* Trend Delivery Service - compatible frontend */
"use strict";

console.log("TREND APP.JS LOADED");

let TOKEN = localStorage.getItem("trend_token") || "";
let LANG = localStorage.getItem("trend_lang") || "ar";

const $ = id => document.getElementById(id);

const I18N = {
  ar: {
    'Trend Delivery Service':'Trend Delivery Service',
    'تسجيل الدخول للنظام':'تسجيل الدخول للنظام',
    'البريد الإلكتروني':'البريد الإلكتروني',
    'كلمة المرور':'كلمة المرور',
    'دخول':'دخول',
    'خروج':'خروج',
    'لوحة التحكم':'لوحة التحكم',
    'إدخال أوردر':'إدخال أوردر',
    'بحث':'بحث',
    'الشحنات':'الشحنات',
    'مهام التوصيل':'مهام التوصيل',
    'تحديث كود مهمة التوصيل':'تحديث كود مهمة التوصيل',
    'المرتجعات للتاجر':'المرتجعات للتاجر',
    'التجار':'التجار',
    'السائقون':'السائقون',
    'الإمارات والمناطق':'الإمارات والمناطق',
    'الحسابات':'الحسابات',
    'مصروفات السائق':'مصروفات السائق',
    'سجل العمليات':'سجل العمليات',
    'الأوردرات':'الأوردرات',
    'تم التسليم':'تم التسليم',
    'ملغى':'ملغى',
    'قيد التنفيذ':'قيد التنفيذ',
    'بحث سريع':'بحث سريع',
    'رقم العميل / رقم الأوردر / رقم الشحنة':'رقم العميل / رقم الأوردر / رقم الشحنة',
    'اكتب قيمة البحث':'اكتب قيمة البحث',
    'التسلسل':'التسلسل',
    'كود الأوردر':'كود الأوردر',
    'التاجر':'التاجر',
    'رقم أوردر التاجر':'رقم أوردر التاجر',
    'اسم العميل':'اسم العميل',
    'رقم العميل / الهاتف':'رقم العميل / الهاتف',
    'الإمارة':'الإمارة',
    'المنطقة':'المنطقة',
    'العنوان الكامل':'العنوان الكامل',
    'قيمة الأوردر':'قيمة الأوردر',
    'رسوم التوصيل':'رسوم التوصيل',
    'ملاحظات':'ملاحظات',
    'حفظ وإنشاء أوردر جديد':'حفظ وإنشاء أوردر جديد',
    'مثال ORD-1005':'مثال ORD-1005',
    'لا توجد نتائج':'لا توجد نتائج',
    'استخدم البحث لفتح الشحنة وتحديث حالتها.':'استخدم البحث لفتح الشحنة وتحديث حالتها.',
    'رقم الشحنة':'رقم الشحنة',
    'فتح':'فتح',
    'الشحنة غير موجودة':'الشحنة غير موجودة',
    'الحالة:':'الحالة:',
    'إعادة غداً':'إعادة غداً',
    'إلغاء':'إلغاء',
    'إلغاء + دفع الرسوم':'إلغاء + دفع الرسوم',
    'تم التبديل':'تم التبديل',
    'تم تحديث الحالة':'تم تحديث الحالة',
    'إنشاء مهمة':'إنشاء مهمة',
    'السائق':'السائق',
    'كود المهمة':'كود المهمة',
    'أرقام الشحنات، كل رقم في سطر':'أرقام الشحنات، كل رقم في سطر',
    'إنشاء':'إنشاء',
    'المهام الحالية':'المهام الحالية',
    'رقم التسلسل':'رقم التسلسل',
    'حفظ':'حفظ',
    'الإمارات':'الإمارات',
    'المناطق':'المناطق',
    'بدون':'بدون',
    'النوع':'النوع',
    'المبلغ':'المبلغ',
    'التاريخ':'التاريخ',
    'تم الحفظ':'تم الحفظ',
    'جاري التحميل...':'جاري التحميل...',
    'الصفحة غير موجودة':'الصفحة غير موجودة',
    'أدخل البريد الإلكتروني وكلمة المرور':'أدخل البريد الإلكتروني وكلمة المرور',
    'حقول تسجيل الدخول غير موجودة':'حقول تسجيل الدخول غير موجودة',
    'السيرفر لم يرجع رمز الدخول':'السيرفر لم يرجع رمز الدخول',
    'بيانات الدخول غير صحيحة':'بيانات الدخول غير صحيحة',
    'English selected':'English selected',
    'تم اختيار العربية':'تم اختيار العربية'
  },

  en: {
    'Trend Delivery Service':'Trend Delivery Service',
    'تسجيل الدخول للنظام':'System Login',
    'البريد الإلكتروني':'Email',
    'كلمة المرور':'Password',
    'دخول':'Login',
    'خروج':'Logout',
    'لوحة التحكم':'Dashboard',
    'إدخال أوردر':'New Order',
    'بحث':'Search',
    'الشحنات':'Shipments',
    'مهام التوصيل':'Delivery Jobs',
    'تحديث كود مهمة التوصيل':'Update Delivery Job Code',
    'المرتجعات للتاجر':'Merchant Returns',
    'التجار':'Merchants',
    'السائقون':'Drivers',
    'الإمارات والمناطق':'Emirates & Areas',
    'الحسابات':'Accounting',
    'مصروفات السائق':'Driver Expenses',
    'سجل العمليات':'Audit Log',
    'الأوردرات':'Orders',
    'تم التسليم':'Delivered',
    'ملغى':'Cancelled',
    'قيد التنفيذ':'Pending',
    'بحث سريع':'Quick Search',
    'رقم العميل / رقم الأوردر / رقم الشحنة':'Customer / Order / Shipment number',
    'اكتب قيمة البحث':'Enter a search value',
    'التسلسل':'Serial',
    'كود الأوردر':'Order Code',
    'التاجر':'Merchant',
    'رقم أوردر التاجر':'Merchant Order No.',
    'اسم العميل':'Customer Name',
    'رقم العميل / الهاتف':'Customer Phone',
    'الإمارة':'Emirate',
    'المنطقة':'Area',
    'العنوان الكامل':'Full Address',
    'قيمة الأوردر':'Order Value',
    'رسوم التوصيل':'Delivery Fee',
    'ملاحظات':'Notes',
    'حفظ وإنشاء أوردر جديد':'Save & Create New Order',
    'مثال ORD-1005':'Example ORD-1005',
    'لا توجد نتائج':'No results',
    'استخدم البحث لفتح الشحنة وتحديث حالتها.':'Use search to open a shipment and update its status.',
    'رقم الشحنة':'Shipment No.',
    'فتح':'Open',
    'الشحنة غير موجودة':'Shipment not found',
    'الحالة:':'Status:',
    'إعادة غداً':'Retry Tomorrow',
    'إلغاء':'Cancel',
    'إلغاء + دفع الرسوم':'Cancel + Customer Paid Fee',
    'تم التبديل':'Swapped',
    'تم تحديث الحالة':'Status updated',
    'إنشاء مهمة':'Create Job',
    'السائق':'Driver',
    'كود المهمة':'Job Code',
    'أرقام الشحنات، كل رقم في سطر':'Shipment numbers, one per line',
    'إنشاء':'Create',
    'المهام الحالية':'Current Jobs',
    'رقم التسلسل':'Serial No.',
    'حفظ':'Save',
    'الإمارات':'Emirates',
    'المناطق':'Areas',
    'بدون':'None',
    'النوع':'Type',
    'المبلغ':'Amount',
    'التاريخ':'Date',
    'تم الحفظ':'Saved',
    'جاري التحميل...':'Loading...',
    'الصفحة غير موجودة':'Page not found',
    'أدخل البريد الإلكتروني وكلمة المرور':'Enter email and password',
    'حقول تسجيل الدخول غير موجودة':'Login fields are missing',
    'السيرفر لم يرجع رمز الدخول':'Server did not return a login token',
    'بيانات الدخول غير صحيحة':'Invalid login credentials',
    'English selected':'English selected',
    'تم اختيار العربية':'Arabic selected'
  }
};

const SIDEBAR = [
  ['dashboard','🏠 ','لوحة التحكم'],
  ['order','➕ ','إدخال أوردر'],
  ['search','🔎 ','بحث'],
  ['shipments','📦 ','الشحنات'],
  ['jobs','🚚 ','مهام التوصيل'],
  ['jobcode','🔢 ','تحديث كود مهمة التوصيل'],
  ['returns','↩️ ','المرتجعات للتاجر'],
  ['merchants','🏪 ','التجار'],
  ['drivers','🧑‍✈️ ','السائقون'],
  ['areas','📍 ','الإمارات والمناطق'],
  ['accounting','💰 ','الحسابات'],
  ['expenses','⛽ ','مصروفات السائق'],
  ['audit','🧾 ','سجل العمليات']
];

let CURRENT_PAGE = 'dashboard';

function t(text) {
  return I18N[LANG]?.[text] ?? text;
}

function translateVisibleText(root) {
  if (!root) return;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT
  );

  const nodes = [];
  let n;

  while ((n = walker.nextNode())) {
    nodes.push(n);
  }

  for (const node of nodes) {
    const raw = node.nodeValue;
    const trimmed = raw.trim();

    if (!trimmed) continue;

    const translated = t(trimmed);

    if (translated !== trimmed) {
      node.nodeValue = raw.replace(trimmed, translated);
    }
  }
}

function applyLanguage() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';

  const langBtn = document.querySelector('header .ghost');

  if (langBtn) {
    langBtn.textContent = LANG === 'ar' ? 'AR / EN' : 'EN / AR';
  }

  const logoutBtn = document.querySelector('header .danger');

  if (logoutBtn) {
    logoutBtn.textContent = LANG === 'ar' ? 'خروج' : 'Logout';
  }

  const sidebar = $('sidebar');

  if (sidebar) {
    const buttons = sidebar.querySelectorAll('button');

    buttons.forEach((btn) => {
      const match = SIDEBAR.find(
        x =>
          x[0] ===
          (
            btn.dataset.page ||
            (btn.getAttribute('onclick') || '')
              .match(/show\(['"]([^'"]+)['"]\)/)?.[1]
          )
      );

      if (match) {
        btn.dataset.page = match[0];
        btn.textContent = match[1] + t(match[2]);
      }
    });
  }

  const login = $('login');

  if (login) {
    const h1 = login.querySelector('h1');

    if (h1) {
      h1.textContent = t('Trend Delivery Service');
    }

    const p = login.querySelector('p');

    if (p) {
      p.textContent = t('تسجيل الدخول للنظام');
    }

    const email = $('email');

    if (email) {
      email.placeholder = t('البريد الإلكتروني');
    }

    const password = $('password');

    if (password) {
      password.placeholder = t('كلمة المرور');
    }

    const btn = $('loginBtn');

    if (btn) {
      btn.textContent = t('دخول');
    }
  }
}

async function api(path, opt = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(opt.headers || {})
  };

  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`;
  }

  console.log("API REQUEST:", path);

  const r = await fetch(path, {
    ...opt,
    headers
  });

  const d = await r.json().catch(() => ({}));

  console.log("API RESPONSE:", path, r.status, d);

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
  return String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[m])
  );
}

function msg(id, text, cls = "") {
  const el = $(id);

  if (!el) return;

  el.innerHTML = cls
    ? `<span class="${cls}">${escapeHtml(text)}</span>`
    : escapeHtml(text);
}

function toggleLang() {
  LANG = LANG === "ar" ? "en" : "ar";

  localStorage.setItem("trend_lang", LANG);

  applyLanguage();

  if (TOKEN && CURRENT_PAGE) {
    show(CURRENT_PAGE);
  }
}


/* =========================
   LOGIN
========================= */

async function login() {
  console.log("LOGIN FUNCTION STARTED");

  const email = $("email");
  const password = $("password");

  if (!email || !password) {
    console.error("LOGIN: email or password element missing");

    msg(
      "loginMsg",
      "حقول تسجيل الدخول غير موجودة",
      "error"
    );

    return;
  }

  if (!email.value.trim() || !password.value) {
    console.warn("LOGIN: empty credentials");

    msg(
      "loginMsg",
      "أدخل البريد الإلكتروني وكلمة المرور",
      "error"
    );

    return;
  }

  const button = $("loginBtn");

  if (button) {
    button.disabled = true;
  }

  try {
    console.log("LOGIN: sending POST /api/login");

    const d = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value
      })
    });

    console.log("LOGIN: server returned:", d);

    if (!d.token) {
      throw new Error("السيرفر لم يرجع رمز الدخول");
    }

    TOKEN = d.token;

    localStorage.setItem(
      "trend_token",
      TOKEN
    );

    console.log("LOGIN: token saved");

    $("login")?.classList.add("hidden");
    $("app")?.classList.remove("hidden");

    console.log("LOGIN: loading dashboard");

    await show("dashboard");

  } catch (e) {
    console.error("LOGIN ERROR:", e);

    msg(
      "loginMsg",
      e?.message || String(e),
      "error"
    );

  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

function logout() {
  TOKEN = "";

  localStorage.removeItem("trend_token");

  location.reload();
}


/* =========================
   PAGES
========================= */

async function show(page) {
  CURRENT_PAGE = page;

  const c = $("content");

  if (!c) return;

  c.innerHTML = `
    <div class="panel">
      <p class="muted">
        ${escapeHtml(t("جاري التحميل..."))}
      </p>
    </div>
  `;

  try {
    if (page === "dashboard") {
      await dashboardPage(c);
    }

    else if (page === "order") {
      await orderPage(c);
    }

    else if (page === "search") {
      searchPage(c);
    }

    else if (page === "shipments") {
      shipmentsPage(c);
    }

    else if (page === "jobs") {
      await jobsPage(c);
    }

    else if (page === "jobcode") {
      await jobCodePage(c);
    }

    else if (page === "returns") {
      await returnsPage(c);
    }

    else if (page === "merchants") {
      await merchantsPage(c);
    }

    else if (page === "drivers") {
      await driversPage(c);
    }

    else if (page === "areas") {
      await areasPage(c);
    }

    else if (page === "accounting") {
      await accountingPage(c);
    }

    else if (page === "expenses") {
      await expensesPage(c);
    }

    else if (page === "audit") {
      await auditPage(c);
    }

    else {
      c.innerHTML = `
        <div class="panel">
          <span class="error">
            ${escapeHtml(t("الصفحة غير موجودة"))}
          </span>
        </div>
      `;
    }

    applyLanguage();
    translateVisibleText(c);

  } catch (e) {
    console.error("PAGE ERROR:", e);

    c.innerHTML = `
      <div class="panel">
        <span class="error">
          ${escapeHtml(e.message)}
        </span>
      </div>
    `;
  }
}

function stat(t, n) {
  return `
    <div class="stat">
      ${escapeHtml(t)}
      <b>${escapeHtml(n)}</b>
    </div>
  `;
}

async function dashboardPage(c) {
  const d = await api("/api/dashboard");

  const x = d.data?.counts || {};

  c.innerHTML = `
    <h2>لوحة التحكم</h2>

    <div class="grid">
      ${stat("الأوردرات", x.orders || 0)}
      ${stat("الشحنات", x.shipments || 0)}
      ${stat("مهام التوصيل", x.jobs ?? x.delivery_jobs ?? 0)}
      ${stat("السائقون", x.drivers || 0)}
      ${stat("التجار", x.merchants || 0)}
      ${stat("تم التسليم", x.delivered || 0)}
      ${stat("ملغى", x.cancelled || 0)}
      ${stat("قيد التنفيذ", x.pending || 0)}
    </div>

    <div class="panel">
      <h3>بحث سريع</h3>

      <div class="row">
        <input
          id="quickSearch"
          placeholder="رقم العميل / رقم الأوردر / رقم الشحنة"
        >

        <button onclick="quickSearch()">بحث</button>
      </div>

      <div id="quickResult"></div>
    </div>
  `;
}

async function quickSearch() {
  const q = $("quickSearch")?.value.trim();

  if (!q) {
    return msg(
      "quickResult",
      "اكتب قيمة البحث",
      "error"
    );
  }

  try {
    $("quickResult").innerHTML =
      renderSearch(
        await api(
          "/api/search?q=" +
          encodeURIComponent(q)
        )
      );
  } catch (e) {
    msg(
      "quickResult",
      e.message,
      "error"
    );
  }
}

async function orderPage(c) {
  const [m, g, a, s] = await Promise.all([
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

        <label>
          التسلسل
          <input
            id="serial"
            type="number"
            value="${escapeHtml(next)}"
            min="1"
          >
        </label>

        <label>
          كود الأوردر
          <input
            id="order_code"
            placeholder="مثال ORD-1005"
          >
        </label>

        <label>
          التاجر
          <select id="merchant">
            ${(m.data || [])
              .map(
                x =>
                  `<option value="${escapeHtml(x.id)}">
                    ${escapeHtml(x.name)}
                    —
                    ${escapeHtml(x.merchant_no)}
                    —
                    ${escapeHtml(x.code)}
                  </option>`
              )
              .join("")}
          </select>
        </label>

        <label>
          رقم أوردر التاجر
          <input id="merchant_order_no">
        </label>

        <label>
          اسم العميل
          <input id="customer_name">
        </label>

        <label>
          رقم العميل / الهاتف
          <input id="customer_phone">
        </label>

        <label>
          الإمارة
          <select id="gov">
            ${(g.data || [])
              .map(
                x =>
                  `<option value="${escapeHtml(x.id)}">
                    ${escapeHtml(x.name_ar)}
                  </option>`
              )
              .join("")}
          </select>
        </label>

        <label>
          المنطقة
          <select id="area">
            ${(a.data || [])
              .map(
                x =>
                  `<option value="${escapeHtml(x.id)}">
                    ${escapeHtml(x.name_ar)}
                  </option>`
              )
              .join("")}
          </select>
        </label>

        <label>
          العنوان الكامل
          <input id="address">
        </label>

        <label>
          قيمة الأوردر
          <input
            id="value"
            type="number"
            step="0.01"
          >
        </label>

        <label>
          رسوم التوصيل
          <input
            id="delivery_fee"
            type="number"
            step="0.01"
          >
        </label>

        <label class="full">
          ملاحظات
          <textarea id="notes"></textarea>
        </label>

      </div>

      <div class="actions">
        <button onclick="saveOrder()">
          حفظ وإنشاء أوردر جديد
        </button>
      </div>

      <div id="orderMsg" class="msg"></div>

    </div>
  `;
}

async function saveOrder() {
  const b = {
    serial_no: Number($("serial").value),
    order_code: $("order_code").value.trim(),
    merchant_id: $("merchant").value,
    merchant_order_no: $("merchant_order_no").value.trim(),
    customer_name: $("customer_name").value.trim(),
    customer_phone: $("customer_phone").value.trim(),
    governorate_id: $("gov").value,
    area_id: $("area").value,
    address: $("address").value.trim(),
    value: Number($("value").value),
    delivery_fee: Number($("delivery_fee").value),
    notes: $("notes").value.trim()
  };

  try {
    const d = await api(
      "/api/orders",
      {
        method: "POST",
        body: JSON.stringify(b)
      }
    );

    $("orderMsg").innerHTML =
      `<span class="ok">
        تم
