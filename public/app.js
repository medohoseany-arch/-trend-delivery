"use strict";

/* =========================================================
   Trend Delivery Service
   Main Frontend Application
   ========================================================= */

let TOKEN = localStorage.getItem("trend_token") || "";
let LANG = localStorage.getItem("trend_lang") || "ar";

const $ = (id) => document.getElementById(id);

/* =========================================================
   GLOBAL ERROR HANDLING
   ========================================================= */

window.addEventListener("error", function (event) {
  console.error("TREND JS ERROR:", event.error || event.message);

  const msg = $("loginMsg");

  if (msg) {
    msg.innerHTML =
      '<span class="error">حدث خطأ في تشغيل النظام. أعد تحميل الصفحة وحاول مرة أخرى.</span>';
  }
});

window.addEventListener("unhandledrejection", function (event) {
  console.error("TREND PROMISE ERROR:", event.reason);

  const msg = $("loginMsg");

  if (msg) {
    msg.innerHTML =
      '<span class="error">حدث خطأ غير متوقع. حاول مرة أخرى.</span>';
  }
});

/* =========================================================
   API
   ========================================================= */

const api = async (path, opt = {}) => {
  const options = {
    ...opt,
    headers: {
      "Content-Type": "application/json",
      "Authorization": TOKEN ? `Bearer ${TOKEN}` : "",
      ...(opt.headers || {})
    }
  };

  console.log("API REQUEST:", options.method || "GET", path);

  let response;

  try {
    response = await fetch(path, options);
  } catch (networkError) {
    console.error("NETWORK ERROR:", networkError);
    throw new Error("تعذر الاتصال بالسيرفر. تأكد أن الموقع يعمل.");
  }

  let data = {};

  try {
    data = await response.json();
  } catch (jsonError) {
    console.error("JSON ERROR:", jsonError);

    if (!response.ok) {
      throw new Error(`خطأ من السيرفر: ${response.status}`);
    }

    data = {};
  }

  console.log("API RESPONSE:", response.status, path, data);

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `خطأ من السيرفر: ${response.status}`
    );
  }

  return data;
};

/* =========================================================
   LANGUAGE
   ========================================================= */

function toggleLang() {
  LANG = LANG === "ar" ? "en" : "ar";

  localStorage.setItem("trend_lang", LANG);

  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === "ar" ? "rtl" : "ltr";

  alert(
    LANG === "ar"
      ? "تم اختيار العربية"
      : "English selected"
  );
}

/* =========================================================
   LOGIN
   ========================================================= */

async function login() {
  console.log("LOGIN BUTTON CLICKED");

  const emailInput = $("email");
  const passwordInput = $("password");
  const loginMsg = $("loginMsg");

  if (!emailInput || !passwordInput) {
    console.error("LOGIN INPUTS NOT FOUND");

    if (loginMsg) {
      loginMsg.innerHTML =
        '<span class="error">حقول تسجيل الدخول غير موجودة في الصفحة.</span>';
    }

    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email) {
    if (loginMsg) {
      loginMsg.innerHTML =
        '<span class="error">اكتب البريد الإلكتروني.</span>';
    }

    emailInput.focus();
    return;
  }

  if (!password) {
    if (loginMsg) {
      loginMsg.innerHTML =
        '<span class="error">اكتب كلمة المرور.</span>';
    }

    passwordInput.focus();
    return;
  }

  if (loginMsg) {
    loginMsg.innerHTML =
      '<span class="muted">جاري تسجيل الدخول...</span>';
  }

  const loginButton =
    document.querySelector('#login button[type="submit"]') ||
    document.querySelector("#login button");

  if (loginButton) {
    loginButton.disabled = true;
  }

  try {
    console.log("SENDING LOGIN REQUEST");

    const data = await api("/api/login", {
      method: "POST",
      headers: {},
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    console.log("LOGIN RESPONSE:", data);

    if (!data || !data.token) {
      throw new Error("السيرفر لم يرجع رمز تسجيل الدخول.");
    }

    TOKEN = data.token;

    localStorage.setItem("trend_token", TOKEN);

    if ($("login")) {
      $("login").classList.add("hidden");
    }

    if ($("app")) {
      $("app").classList.remove("hidden");
    }

    if (loginMsg) {
      loginMsg.innerHTML = "";
    }

    console.log("LOGIN SUCCESS");

    await show("dashboard");

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    if (loginMsg) {
      loginMsg.innerHTML =
        `<span class="error">${escapeHtml(
          error.message || "فشل تسجيل الدخول"
        )}</span>`;
    }

  } finally {
    if (loginButton) {
      loginButton.disabled = false;
    }
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {
  TOKEN = "";

  localStorage.removeItem("trend_token");

  location.reload();
}

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

async function show(page) {
  const content = $("content");

  if (!content) {
    console.error("CONTENT ELEMENT NOT FOUND");
    return;
  }

  try {
    if (page === "dashboard") {
      const d = await api("/api/dashboard");

      const counts = d.data?.counts || {};

      content.innerHTML = `
        <h2>لوحة التحكم</h2>

        <div class="grid">
          ${stat("الأوردرات", counts.orders || 0)}
          ${stat("الشحنات", counts.shipments || 0)}
          ${stat("مهام التوصيل", counts.jobs || 0)}
          ${stat("السائقون", counts.drivers || 0)}
          ${stat("التجار", counts.merchants || 0)}
        </div>

        <div class="panel">
          <h3>بحث سريع</h3>

          <div class="row">
            <input
              id="quickSearch"
              placeholder="رقم العميل / رقم الأوردر / رقم الشحنة"
            >

            <button type="button" onclick="quickSearch()">
              بحث
            </button>
          </div>

          <div id="quickResult"></div>
        </div>
      `;

      return;
    }

    if (page === "order") {
      await orderPage(content);
      return;
    }

    if (page === "search") {
      content.innerHTML = `
        <h2>البحث</h2>

        <div class="panel">
          <div class="row">

            <input
              id="searchQ"
              placeholder="رقم العميل / رقم الأوردر / رقم الشحنة"
            >

            <button type="button" onclick="doSearch()">
              بحث
            </button>

          </div>

          <div id="searchResult"></div>
        </div>
      `;

      return;
    }

    if (page === "shipments") {
      await shipmentsPage(content);
      return;
    }

    if (page === "jobs") {
      await jobsPage(content);
      return;
    }

    if (page === "jobcode") {
      await jobCodePage(content);
      return;
    }

    if (page === "returns") {
      await returnsPage(content);
      return;
    }

    if (page === "merchants") {
      await merchantsPage(content);
      return;
    }

    if (page === "drivers") {
      await driversPage(content);
      return;
    }

    if (page === "areas") {
      await areasPage(content);
      return;
    }

    if (page === "accounting") {
      await accountingPage(content);
      return;
    }

    if (page === "expenses") {
      await expensesPage(content);
      return;
    }

    if (page === "audit") {
      await auditPage(content);
      return;
    }

  } catch (error) {
    console.error("PAGE ERROR:", page, error);

    content.innerHTML = `
      <div class="panel">
        <span class="error">
          ${escapeHtml(error.message || "حدث خطأ")}
        </span>
      </div>
    `;
  }
}

/* =========================================================
   STAT CARD
   ========================================================= */

function stat(title, number) {
  return `
    <div class="stat">
      ${escapeHtml(String(title))}
      <b>${escapeHtml(String(number ?? 0))}</b>
    </div>
  `;
}

/* =========================================================
   ORDER PAGE
   ========================================================= */

async function orderPage(content) {
  const [merchants, governorates, areas, serial] =
    await Promise.all([
      api("/api/merchants"),
      api("/api/governorates"),
      api("/api/areas"),
      api("/api/order/next-serial")
    ]);

  content.innerHTML = `
    <h2>إدخال أوردر</h2>

    <div class="panel">

      <div class="form-grid">

        <label>
          التسلسل
          <input
            id="serial"
            type="number"
            value="${serial?.next || 1}"
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
            ${(merchants.data || [])
              .map(
                (x) => `
                  <option value="${escapeHtml(String(x.id))}">
                    ${escapeHtml(String(x.name || ""))}
                    —
                    ${escapeHtml(String(x.merchant_no || ""))}
                    —
                    ${escapeHtml(String(x.code || ""))}
                  </option>
                `
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
            ${(governorates.data || [])
              .map(
                (x) => `
                  <option value="${escapeHtml(String(x.id))}">
                    ${escapeHtml(String(x.name_ar || ""))}
                  </option>
                `
              )
              .join("")}
          </select>
        </label>

        <label>
          المنطقة
          <select id="area">
            ${(areas.data || [])
              .map(
                (x) => `
                  <option value="${escapeHtml(String(x.id))}">
                    ${escapeHtml(String(x.name_ar || ""))}
                  </option>
                `
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
        <button type="button" onclick="saveOrder()">
          حفظ وإنشاء أوردر جديد
        </button>
      </div>

      <div id="orderMsg" class="msg"></div>

    </div>
  `;
}

/* =========================================================
   SAVE ORDER
   ========================================================= */

async function saveOrder() {
  const body = {
    serial_no: Number($("serial")?.value || 0),
    order_code: $("order_code")?.value.trim() || "",
    merchant_id: $("merchant")?.value || "",
    merchant_order_no: $("merchant_order_no")?.value.trim() || "",
    customer_name: $("customer_name")?.value.trim() || "",
    customer_phone: $("customer_phone")?.value.trim() || "",
    governorate_id: $("gov")?.value || "",
    area_id: $("area")?.value || "",
    address: $("address")?.value.trim() || "",
    value: Number($("value")?.value || 0),
    delivery_fee: Number($("delivery_fee")?.value || 0),
    notes: $("notes")?.value.trim() || ""
  };

  const msg = $("orderMsg");

  try {
    const data = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify(body)
    });

    if (msg) {
      msg.innerHTML = `
        <span class="ok">
          تم الحفظ — الشحنة
          ${escapeHtml(String(data?.shipment?.shipment_no || ""))}
        </span>

        ${
          data?.serialDuplicate
            ? '<span class="duplicate">⚠ التسلسل مكرر اليوم</span>'
            : ""
        }
      `;
    }

    setTimeout(() => {
      if ($("content")) {
        orderPage($("content"));
      }
    }, 500);

  } catch (error) {
    if (msg) {
      msg.innerHTML =
        `<span class="error">${escapeHtml(error.message)}</span>`;
    }
  }
}

/* =========================================================
   QUICK SEARCH
   ========================================================= */

async function quickSearch() {
  const input = $("quickSearch");

  if (!input) return;

  const query = input.value.trim();
  const result = $("quickResult");

  if (!query) {
    if (result) {
      result.innerHTML =
        '<span class="error">اكتب رقم البحث أولًا.</span>';
    }

    return;
  }

  try {
    const data = await api(
      "/api/search?q=" + encodeURIComponent(query)
    );

    if (result) {
      result.innerHTML = `
        <pre>${escapeHtml(
          JSON.stringify(data.data, null, 2)
        )}</pre>
      `;
    }

  } catch (error) {
    if (result) {
      result.innerHTML =
        `<span class="error">${escapeHtml(error.message)}</span>`;
    }
  }
}

/* =========================================================
   SEARCH
   ========================================================= */

async function doSearch() {
  const input = $("searchQ");

  if (!input) return;

  const query = input.value.trim();
  const result = $("searchResult");

  if (!query) {
    if (result) {
      result.innerHTML =
        '<span class="error">اكتب رقم البحث أولًا.</span>';
    }

    return;
  }

  try {
    const data = await api(
      "/api/search?q=" + encodeURIComponent(query)
    );

    if (result) {
      result.innerHTML = `
        <pre>${escapeHtml(
          JSON.stringify(data.data, null, 2)
        )}</pre>
      `;
    }

  } catch (error) {
    if (result) {
      result.innerHTML =
        `<span class="error">${escapeHtml(error.message)}</span>`;
    }
  }
}

/* =========================================================
   SHIPMENTS
   ========================================================= */

async function shipmentsPage(content) {
  content.innerHTML = `
    <h2>الشحنات</h2>

    <div class="panel">

      <p>
        استخدم البحث لفتح الشحنة وتحديث حالتها.
      </p>

      <div class="row">

        <input
          id="shipSearch"
          placeholder="رقم الشحنة"
        >

        <button type="button" onclick="shipSearch()">
          فتح
        </button>

      </div>

      <div id="shipResult"></div>

    </div>
  `;
}

/* =========================================================
   SHIPMENT SEARCH
   ========================================================= */

async function shipSearch() {
  const input = $("shipSearch");

  if (!input) return;

  const query = input.value.trim();
  const result = $("shipResult");

  if (!query) {
    if (result) {
      result.innerHTML =
        '<span class="error">اكتب رقم الشحنة.</span>';
    }

    return;
  }

  try {
    const data = await api(
      "/api/search?q=" + encodeURIComponent(query)
    );

    const shipment = data.data || {};

    if (result) {
      result.innerHTML = `
        <div class="panel">

          <b>
            ${escapeHtml(
              String(
                shipment.shipment_no ||
                shipment.order_code ||
                ""
              )
            )}
          </b>

          <p>
            الحالة:
            <span class="badge">
              ${escapeHtml(
                String(shipment.status || "غير معروف")
              )}
            </span>
          </p>

          ${
            shipment.id
              ? `
                <div class="actions">

                  <button
                    type="button"
                    onclick="setStatus('${escapeJs(String(shipment.id))}','delivered')"
                  >
                    تم التسليم
                  </button>

                  <button
                    type="button"
                    onclick="setStatus('${escapeJs(String(shipment.id))}','retry_tomorrow')"
                  >
                    إعادة غداً
                  </button>

                  <button
                    type="button"
                    onclick="setStatus('${escapeJs(String(shipment.id))}','cancelled')"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onclick="setStatus('${escapeJs(String(shipment.id))}','cancelled_customer_paid')"
                  >
                    إلغاء + دفع الرسوم
                  </button>

                  <button
                    type="button"
                    onclick="setStatus('${escapeJs(String(shipment.id))}','cancelled_by_shipper')"
                  >
                    Cancelled by Shipper
                  </button>

                  <button
                    type="button"
                    onclick="setStatus('${escapeJs(String(shipment.id))}','swapped')"
                  >
                    تم التبديل
                  </button>

                </div>
              `
              : ""
          }

        </div>
      `;
    }

  } catch (error) {
    if (result) {
      result.innerHTML =
        `<span class="error">${escapeHtml(error.message)}</span>`;
    }
  }
}

/* =========================================================
   SET SHIPMENT STATUS
   ========================================================= */

async function setStatus(id, status) {
  try {
    await api("/api/shipments/status", {
      method: "POST",
      body: JSON.stringify({
        shipment_id: id,
        status: status
      })
    });

    alert("تم تحديث الحالة");

    await shipSearch();

  } catch (error) {
    alert(error.message);
  }
}

/* =========================================================
   DELIVERY JOBS
   ========================================================= */

async function jobsPage(content) {
  const [jobs, drivers] = await Promise.all([
    api("/api/delivery-jobs"),
    api("/api/drivers")
  ]);

  content.innerHTML = `
    <h2>مهام التوصيل</h2>

    <div class="panel">

      <h3>إنشاء مهمة</h3>

      <div class="form-grid">

        <label>
          السائق

          <select id="jobDriver">

            ${(drivers.data || [])
              .map(
                (x) => `
                  <option value="${escapeHtml(String(x.id))}">
                    ${escapeHtml(String(x.name || ""))}
                  </option>
                `
              )
              .join("")}

          </select>
        </label>

        <label>
          كود المهمة

          <input
            id="jobCode"
            placeholder="DJ-001"
          >
        </label>

        <label class="full">

          أرقام الشحنات، كل رقم في سطر

          <textarea
            id="jobShipments"
            placeholder="SH-..."
          ></textarea>

        </label>

      </div>

      <button
        type="button"
        onclick="createJob()"
      >
        إنشاء
      </button>

    </div>

    <div class="panel">

      <h3>المهام الحالية</h3>

      ${table(
        jobs.data,
        [
          "job_code",
          "status",
          "expected_count",
          "received_count",
          "created_at"
        ]
      )}

    </div>
  `;
}

/* =========================================================
   CREATE DELIVERY JOB
   ========================================================= */

async function createJob() {
  const shipmentInput = $("jobShipments");

  if (!shipmentInput) return;

  const numbers = shipmentInput.value
    .split(/\s+/)
    .filter(Boolean);

  const ids = [];

  for (const number of numbers) {
    try {
      const data = await api(
        "/api/search?q=" + encodeURIComponent(number)
      );

      if (data.type === "shipment" && data.data?.id) {
        ids.push(data.data.id);
      }

    } catch (error) {
      console.warn("Shipment search failed:", number, error);
    }
  }

  try {
    await api("/api/delivery-jobs", {
      method: "POST",
      body: JSON.stringify({
        driver_id: $("jobDriver")?.value || "",
        job_code: $("jobCode")?.value.trim() || "",
        shipment_ids: ids
      })
    });

    alert("تم إنشاء المهمة");

    await show("jobs");

  } catch (error) {
    alert(error.message);
  }
}

/* =========================================================
   DELIVERY JOB CODE
   ========================================================= */

async function jobCodePage(content) {
  const data = await api("/api/delivery-jobs");

  content.innerHTML = `
    <h2>تحديث كود مهمة التوصيل</h2>

    <div class="panel">

      <div class="form-grid">

        <label>
          رقم الشحنة
          <input id="jcShipment">
        </label>

        <label>
          رقم التسلسل
          <input
            id="jcSerial"
            type="number"
          >
        </label>

        <label>
          Delivery Job Code

          <select id="jcJob">

            ${(data.data || [])
              .map(
                (x) => `
                  <option
                    value="${escapeHtml(String(x.job_code || ""))}"
                  >
                    ${escapeHtml(String(x.job_code || ""))}
                  </option>
                `
              )
              .join("")}

          </select>

        </label>

      </div>

      <button
        type="button"
        onclick="saveJobCode()"
      >
        حفظ
      </button>

      <div id="jcMsg"></div>

    </div>
  `;
}

/* =========================================================
   SAVE DELIVERY JOB CODE
   ========================================================= */

async function saveJobCode() {
  const message = $("jcMsg");

  try {
    const data = await api("/api/delivery-job-code", {
      method: "POST",
      body: JSON.stringify({
        shipment_no: $("jcShipment")?.value.trim() || "",
        serial_no: Number($("jcSerial")?.value || 0),
        delivery_job_code: $("jcJob")?.value || ""
      })
    });

    if (message) {
      message.innerHTML = data.duplicate
        ? '<span class="duplicate">⚠ مكرر في نفس اليوم</span>'
        : '<span class="ok">تم الحفظ</span>';
    }

  } catch (error) {
    if (message) {
      message.innerHTML =
        `<span class="error">${escapeHtml(error.message)}</span>`;
    }
  }
}

/* =========================================================
   RETURNS
   ========================================================= */

async function returnsPage(content) {
  const data = await api("/api/returns");

  content.innerHTML = `
    <h2>المرتجعات للتاجر</h2>

    <div class="panel">
      ${table(
        data.data,
        [
          "shipment_id",
          "reason_status",
          "status",
          "created_at"
        ]
      )}
    </div>
  `;
}

/* =========================================================
   MERCHANTS
   ========================================================= */

async function merchantsPage(content) {
  const data = await api("/api/merchants");

  content.innerHTML = `
    <h2>التجار</h2>

    <div class="panel">
      ${table(
        data.data,
        [
          "merchant_no",
          "code",
          "name",
          "phone",
          "active"
        ]
      )}
    </div>
  `;
}

/* =========================================================
   DRIVERS
   ========================================================= */

async function driversPage(content) {
  const data = await api("/api/drivers");

  content.innerHTML = `
    <h2>السائقون</h2>

    <div class="panel">
      ${table(
        data.data,
        [
          "driver_no",
          "name",
          "phone",
          "vehicle_no",
          "active"
        ]
      )}
    </div>
  `;
}

/* =========================================================
   AREAS
   ========================================================= */

async function areasPage(content) {
  const [governorates, areas] = await Promise.all([
    api("/api/governorates"),
    api("/api/areas")
  ]);

  content.innerHTML = `
    <h2>الإمارات والمناطق</h2>

    <div class="panel">

      <h3>الإمارات</h3>

      ${table(
        governorates.data,
        [
          "name_ar",
          "name_en"
        ]
      )}

    </div>

    <div class="panel">

      <h3>المناطق</h3>

      ${table(
        areas.data,
        [
          "name_ar",
          "name_en",
          "governorate_id"
        ]
      )}

    </div>
  `;
}

/* =========================================================
   ACCOUNTING
   ========================================================= */

async function accountingPage(content) {
  const data = await api("/api/transactions");

  content.innerHTML = `
    <h2>الحسابات</h2>

    <div class="panel">

      <p>
        هذا السجل يربط حركة التاجر والسائق
        وإيراد الشركة بالشحنة نفسها.
      </p>

      ${table(
        data.data,
        [
          "account_type",
          "transaction_type",
          "amount",
          "direction",
          "status",
          "created_at"
        ]
      )}

    </div>
  `;
}

/* =========================================================
   DRIVER EXPENSES
   ========================================================= */

async function expensesPage(content) {
  const data = await api("/api/drivers");

  content.innerHTML = `
    <h2>مصروفات السائق</h2>

    <div class="panel">

      <div class="form-grid">

        <label>
          السائق

          <select id="exDriver">

            <option value="">
              بدون
            </option>

            ${(data.data || [])
              .map(
                (x) => `
                  <option
                    value="${escapeHtml(String(x.id))}"
                  >
                    ${escapeHtml(String(x.name || ""))}
                  </option>
                `
              )
              .join("")}

          </select>

        </label>

        <label>
          النوع

          <select id="exType">
            <option value="petrol">petrol</option>
            <option value="maintenance">maintenance</option>
            <option value="road">road</option>
            <option value="operating">operating</option>
            <option value="other">other</option>
          </select>

        </label>

        <label>
          المبلغ

          <input
            id="exAmount"
            type="number"
            step=".01"
          >

        </label>

        <label>
          التاريخ

          <input
            id="exDate"
            type="date"
            value="${new Date()
              .toISOString()
              .slice(0, 10)}"
          >

        </label>

        <label class="full">
          ملاحظات

          <textarea id="exNotes"></textarea>

        </label>

      </div>

      <button
        type="button"
        onclick="saveExpense()"
      >
        حفظ
      </button>

      <div id="exMsg"></div>

    </div>
  `;
}

/* =========================================================
   SAVE EXPENSE
   ========================================================= */

async function saveExpense() {
  const message = $("exMsg");

  try {
    await api("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        driver_id: $("exDriver")?.value || null,
        expense_type: $("exType")?.value || "",
        amount: Number($("exAmount")?.value || 0),
        expense_date: $("exDate")?.value || "",
        notes: $("exNotes")?.value.trim() || ""
      })
    });

    if (message) {
      message.innerHTML =
        '<span class="ok">تم الحفظ</span>';
    }

  } catch (error) {
    if (message) {
      message.innerHTML =
        `<span class="error">${escapeHtml(error.message)}</span>`;
    }
  }
}

/* =========================================================
   AUDIT
   ========================================================= */

async function auditPage(content) {
  const data = await api("/api/audit");

  content.innerHTML = `
    <h2>سجل العمليات</h2>

    <div class="panel">
      ${table(
        data.data,
        [
          "action",
          "entity_type",
          "entity_id",
          "created_at"
        ]
      )}
    </div>
  `;
}

/* =========================================================
   TABLE
   ========================================================= */

function table(rows, columns) {
  if (!rows || !rows.length) {
    return "<p class='muted'>لا توجد بيانات</p>";
  }

  return `
    <div class="table-wrap">

      <table>

        <thead>

          <tr>

            ${columns
              .map(
                (column) =>
                  `<th>${escapeHtml(String(column))}</th>`
              )
              .join("")}

          </tr>

        </thead>

        <tbody>

          ${rows
            .map(
              (row) => `
                <tr>

                  ${columns
                    .map(
                      (column) => `
                        <td>
                          ${escapeHtml(
                            String(row?.[column] ?? "")
                          )}
                        </td>
                      `
                    )
                    .join("")}

                </tr>
              `
            )
            .join("")}

        </tbody>

      </table>

    </div>
  `;
}

/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character];
    }
  );
}

/* =========================================================
   JAVASCRIPT STRING ESCAPING
   ========================================================= */

function escapeJs(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

/* =========================================================
   MAKE FUNCTIONS AVAILABLE TO HTML onclick
   ========================================================= */

window.login = login;
window.logout = logout;
window.toggleLang = toggleLang;
window.show = show;

window.quickSearch = quickSearch;
window.doSearch = doSearch;

window.shipSearch = shipSearch;
window.setStatus = setStatus;

window.saveOrder = saveOrder;

window.createJob = createJob;

window.saveJobCode = saveJobCode;

window.saveExpense = saveExpense;

/* =========================================================
   LOGIN BUTTON BINDING
   ========================================================= */

function setupLoginButton() {
  const loginContainer = $("login");

  if (!loginContainer) {
    console.error("LOGIN CONTAINER NOT FOUND");
    return;
  }

  const button = loginContainer.querySelector("button");

  if (!button) {
    console.error("LOGIN BUTTON NOT FOUND");
    return;
  }

  /*
    The HTML already contains onclick="login()".
    Remove it and attach the event here so login has
    one controlled event handler.
  */

  button.removeAttribute("onclick");

  button.type = "button";

  button.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();

    login();
  });

  console.log("LOGIN BUTTON READY");
}

/* =========================================================
   START APPLICATION
   ========================================================= */

function startApplication() {
  console.log("=================================");
  console.log("TREND DELIVERY APP.JS LOADED");
  console.log("TOKEN:", TOKEN ? "FOUND" : "EMPTY");
  console.log("LANG:", LANG);
  console.log("=================================");

  setupLoginButton();

  document.documentElement.lang = LANG;
  document.documentElement.dir =
    LANG === "ar" ? "rtl" : "ltr";

  if (TOKEN) {
    const loginScreen = $("login");
    const appScreen = $("app");

    if (loginScreen) {
      loginScreen.classList.add("hidden");
    }

    if (appScreen) {
      appScreen.classList.remove("hidden");
    }

    show("dashboard");
  }
}

/* =========================================================
   DOM READY
   ========================================================= */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startApplication
  );
} else {
  startApplication();
}
