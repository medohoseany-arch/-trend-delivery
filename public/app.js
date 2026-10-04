/* Trend Delivery Service - full management frontend */
"use strict";

let TOKEN = localStorage.getItem("trend_token") || "";
let LANG = localStorage.getItem("trend_lang") || "ar";
let CURRENT_PAGE = "dashboard";
let CHAT_TIMER = null;
let CURRENT_USER = null;
const $ = id => document.getElementById(id);

const I18N = {
  ar: {
    "Trend Delivery Service":"Trend Delivery Service","System Login":"تسجيل الدخول للنظام","Login":"دخول","Logout":"خروج",
    "Dashboard":"لوحة التحكم","New Order":"إدخال أوردر","Search":"بحث","Shipments":"الشحنات","Delivery Jobs":"مهام التوصيل",
    "Update Delivery Job Code":"تحديث كود مهمة التوصيل","Merchant Returns":"المرتجعات للتاجر","Merchants":"التجار","Drivers":"السائقون",
    "Governorates & Areas":"الإمارات والمناطق","Accounting":"الحسابات","Orders Verification":"مراجعة واعتماد الأوردرات","Verify":"اعتماد","Verify All":"اعتماد الكل","Verified":"تم الاعتماد","Unverified":"غير معتمد","Remove from Statement":"إخراج من كشف المندوب","Remove Order from Statement?":"إخراج الأوردر من كشف المندوب؟","This order will be moved to In Ops and removed from the courier statement.":"سيتم تحويل الأوردر إلى In Ops وإخراجه من كشف المندوب.","Confirm":"تأكيد","Cancel":"إلغاء","All Statuses":"كل الحالات","All Verification":"كل حالات الاعتماد","All Drivers":"كل المندوبين","Orders verified successfully.":"تم اعتماد الأوردرات بنجاح.","Driver Commission":"عمولة المناديب","Driver Expenses":"مصروفات السائق","Audit Log":"سجل العمليات", "Settings":"الإعدادات", "Currency":"العملة", "Currency changed successfully":"تم تغيير العملة بنجاح", "Exchange rates are based on AED":"أسعار التحويل محسوبة على أساس الدرهم الإماراتي", "Display currency":"عملة العرض",
    "Employees & Permissions":"الموظفون والصلاحيات","Employee Chat":"شات الموظفين","Orders":"الأوردرات","Edit Order":"تعديل الأوردر",
    "Add Merchant":"إضافة تاجر","Add Employee":"إضافة موظف","Add Governorate":"إضافة إمارة","Add Area":"إضافة منطقة",
    "Export Excel":"تصدير Excel","Export PDF":"تصدير PDF","Import Excel":"رفع Excel","Save":"حفظ","Update":"تحديث",
    "No data":"لا توجد بيانات","Loading...":"جاري التحميل...","From":"من","To":"إلى","Open":"فتح","Edit":"تعديل",
    "Status":"الحالة","Merchant":"التاجر","Customer":"العميل","Delivery Fee":"رسوم التوصيل","Order Value":"قيمة الأوردر",
    "Order Code":"كود النظام","Tracking Number":"رقم التتبع","Shipment No.":"رقم الشحنة","Merchant Order No.":"رقم أوردر التاجر","Created":"تاريخ الإنشاء","Phone":"الهاتف","Address":"العنوان",
    "Tax":"الضريبة","Tax Rate":"نسبة الضريبة","Default Delivery Fee":"رسوم التوصيل الافتراضية","Store":"المتجر",
    "Store Type":"نوع المتجر","Store Name":"اسم المتجر","Store URL":"رابط المتجر","Active":"نشط","Inactive":"غير نشط",
    "Username":"اسم المستخدم","Name":"الاسم","Email":"البريد الإلكتروني","Password":"كلمة المرور","Role":"الدور",
    "Message":"الرسالة","Send":"إرسال","Employee Chat":"شات الموظفين","All Employees":"كل الموظفين",
    "Shipment History":"سجل حالة الشحنة","Quick Search":"بحث سريع","Print / PDF":"طباعة / PDF","Select Merchant":"اختر التاجر",
    "Excel file contains columns: الإمارة, المنطقة, اسم المنطقة EN (optional)":"ملف Excel يحتوي أعمدة: الإمارة، المنطقة، اسم المنطقة EN (اختياري)",
    "Imported":"تم الرفع","Success":"تم بنجاح","Error":"خطأ","WooCommerce":"WooCommerce","Consumer Key":"مفتاح WooCommerce","Consumer Secret":"سر WooCommerce","Test Connection":"اختبار الاتصال","Import Orders":"سحب الأوردرات","Auto Import":"سحب تلقائي","Connection successful":"تم الاتصال بنجاح","Orders imported":"تم سحب الأوردرات"
  },
  en: {
    "Trend Delivery Service":"Trend Delivery Service","System Login":"System Login","Login":"Login","Logout":"Logout",
    "Dashboard":"Dashboard","New Order":"New Order","Search":"Search","Shipments":"Shipments","Delivery Jobs":"Delivery Jobs",
    "Update Delivery Job Code":"Update Delivery Job Code","Merchant Returns":"Merchant Returns","Merchants":"Merchants","Drivers":"Drivers",
    "Governorates & Areas":"Governorates & Areas","Accounting":"Accounting","Orders Verification":"Orders Verification","Verify":"Verify","Verify All":"Verify All","Verified":"Verified","Unverified":"Unverified","Remove from Statement":"Remove from Statement","Remove Order from Statement?":"Remove Order from Statement?","This order will be moved to In Ops and removed from the courier statement.":"This order will be moved to In Ops and removed from the courier statement.","Confirm":"Confirm","Cancel":"Cancel","All Statuses":"All Statuses","All Verification":"All Verification","All Drivers":"All Drivers","Orders verified successfully.":"Orders verified successfully.","Driver Commission":"Driver Commission","Driver Expenses":"Driver Expenses","Audit Log":"Audit Log", "Settings":"Settings", "Currency":"Currency", "Currency changed successfully":"Currency changed successfully", "Exchange rates are based on AED":"Exchange rates are based on AED", "Display currency":"Display currency",
    "Employees & Permissions":"Employees & Permissions","Employee Chat":"Employee Chat","Orders":"Orders","Edit Order":"Edit Order",
    "Add Merchant":"Add Merchant","Add Employee":"Add Employee","Add Governorate":"Add Governorate","Add Area":"Add Area",
    "Export Excel":"Export Excel","Export PDF":"Export PDF","Import Excel":"Import Excel","Save":"Save","Update":"Update",
    "No data":"No data","Loading...":"Loading...","From":"From","To":"To","Open":"Open","Edit":"Edit",
    "Status":"Status","Merchant":"Merchant","Customer":"Customer","Delivery Fee":"Delivery Fee","Order Value":"Order Value",
    "Order Code":"System Order Code","Tracking Number":"Tracking Number","Shipment No.":"Shipment No.","Merchant Order No.":"Merchant Order No.","Created":"Created","Phone":"Phone","Address":"Address",
    "Tax":"Tax","Tax Rate":"Tax Rate","Default Delivery Fee":"Default Delivery Fee","Store":"Store",
    "Store Type":"Store Type","Store Name":"Store Name","Store URL":"Store URL","Active":"Active","Inactive":"Inactive",
    "Username":"Username","Name":"Name","Email":"Email","Password":"Password","Role":"Role",
    "Message":"Message","Send":"Send","Employee Chat":"Employee Chat","All Employees":"All Employees",
    "Shipment History":"Shipment History","Quick Search":"Quick Search","Print / PDF":"Print / PDF","Select Merchant":"Select Merchant",
    "Excel file contains columns: الإمارة, المنطقة, اسم المنطقة EN (optional)":"Excel columns: Governorate, Area, Area EN (optional)",
    "Imported":"Imported","Success":"Success","Error":"Error","WooCommerce":"WooCommerce","Consumer Key":"Consumer Key","Consumer Secret":"Consumer Secret","Test Connection":"Test Connection","Import Orders":"Import Orders","Auto Import":"Auto Import","Connection successful":"Connection successful","Orders imported":"Orders imported"
  }
};

const SIDEBAR = [
  ["dashboard","Dashboard","لوحة التحكم"],
  ["order","New Order","إدخال أوردر"],
  ["search","Search","بحث"],
  ["shipments","Shipments","الشحنات"],
  ["jobs","Delivery Jobs","مهام التوصيل"],
  ["jobcode","Update Delivery Job Code","تحديث كود مهمة التوصيل"],
  ["returns","Merchant Returns","المرتجعات للتاجر"],
  ["merchants","Merchants","التجار"],
  ["drivers","Drivers","السائقون"],
  ["areas","Governorates & Areas","الإمارات والمناطق"],
  ["accounting","Accounting","الحسابات"],
  ["audit","Audit Log","سجل العمليات"],
  ["employees","Employees & Permissions","الموظفون والصلاحيات"],
  ["chat","Employee Chat","شات الموظفين"],
  ["settings","Settings","الإعدادات"]
];



function L(en, ar) { return LANG === "ar" ? (ar || en) : en; }
function t(x){ return I18N[LANG]?.[x] || x; }
function esc(s){ return String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
function msg(id,text,cls=""){ const el=$(id); if(el) el.innerHTML=`<span class="${cls||""}">${esc(text)}</span>`; }
function updateCurrentUserUI(){
  const el=$("currentUserName");
  if(!el) return;
  const u=CURRENT_USER||{};
  el.textContent = u.name || u.username || u.email || (LANG === "ar" ? "المستخدم الحالي" : "Current User");
}
function today(){ return new Date().toISOString().slice(0,10); }
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }

// All stored monetary values are kept in AED. The selected currency is a display/input currency.
const CURRENCIES = {
  AED:{code:"AED", symbol:"د.إ", nameAr:"الدرهم الإماراتي", nameEn:"UAE Dirham", rate:1},
  EGP:{code:"EGP", symbol:"ج.م", nameAr:"الجنيه المصري", nameEn:"Egyptian Pound", rate:13.60},
  SAR:{code:"SAR", symbol:"ر.س", nameAr:"الريال السعودي", nameEn:"Saudi Riyal", rate:1.02},
  USD:{code:"USD", symbol:"$", nameAr:"الدولار الأمريكي", nameEn:"US Dollar", rate:0.2723},
  EUR:{code:"EUR", symbol:"€", nameAr:"اليورو", nameEn:"Euro", rate:0.234},
  GBP:{code:"GBP", symbol:"£", nameAr:"الجنيه الإسترليني", nameEn:"British Pound", rate:0.201}
};
let CURRENCY = localStorage.getItem("trend_currency") || "AED";
if(!CURRENCIES[CURRENCY]) CURRENCY="AED";
function currencyInfo(){ return CURRENCIES[CURRENCY] || CURRENCIES.AED; }
function money(value, opts={}){
  const n=Number(value||0)*currencyInfo().rate;
  const digits=opts.digits ?? 2;
  const formatted=new Intl.NumberFormat(LANG==="ar"?"ar-EG":"en-US",{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(n);
  return opts.withCode===false ? formatted : `${formatted} ${currencyInfo().code} / ${currencyInfo().symbol}`;
}
function moneyInput(value){
  const n=Number(value||0)*currencyInfo().rate;
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}
function baseAmount(displayValue){
  const n=Number(displayValue||0);
  return Number.isFinite(n) ? n/currencyInfo().rate : 0;
}
function setCurrency(code){
  if(!CURRENCIES[code]) return;
  CURRENCY=code;
  localStorage.setItem("trend_currency",CURRENCY);
  if(TOKEN) show(CURRENT_PAGE);
}
function currencyLabel(code=CURRENCY){
  const c=CURRENCIES[code]||CURRENCIES.AED;
  return LANG==="ar" ? c.nameAr : c.nameEn;
}


function pagePermission(page){
  const map={
    dashboard:"dashboard", order:"orders", search:"orders", shipments:"shipments",
    jobs:"jobs", jobcode:"jobs", returns:"shipments", merchants:"merchants",
        drivers:"drivers", areas:"orders", accounting:"accounting", driverExpenses:"expenses", ordersVerification:"accounting", driverCommission:"accounting",
    audit:"audit", employees:"users", chat:"users", settings:null
  };
  return map[page] || null;
}
function canAccessPage(page){
  if(!CURRENT_USER) return false;
  if(CURRENT_USER.role==="admin") return true;
  const key=pagePermission(page);
  if(!key) return true;
  return Boolean(CURRENT_USER.permissions?.[key]);
}
function renderSidebar(){
  const sidebar=$("sidebar");
  if(!sidebar) return;
  sidebar.innerHTML=SIDEBAR.map(([page,en,ar])=>{
    const visible=canAccessPage(page);
    if(page==="accounting" && visible){
      const commissionVisible=canAccessPage("driverCommission");
      const verificationVisible=canAccessPage("ordersVerification");
       const expenseVisible=canAccessPage("driverExpenses"); const subs=(commissionVisible||verificationVisible||expenseVisible)?`<div class="nav-sub">${expenseVisible?`<button data-page="driverExpenses" onclick="show('driverExpenses')"><span>${L("Driver Expenses","مصروفات السائقين")}</span></button>`:""}${verificationVisible?`<button data-page="ordersVerification" onclick="show('ordersVerification')"><span>${t("Orders Verification")}</span></button>`:""}${commissionVisible?`<button data-page="driverCommission" onclick="show('driverCommission')"><span>${t("Driver Commission")}</span></button>`:""}</div>`:"";
      return `<div class="nav-group open"><button class="nav-main" data-page="accounting" onclick="show('accounting')"><span>${LANG==="ar"?ar:en}</span></button>${subs}</div>`;
    }
    return `<button data-page="${page}" class="${visible?"":"permission-hidden"}" ${visible?`onclick="show('${page}')`:"disabled"}><span>${LANG==="ar"?ar:en}</span></button>`;
  }).join("");
  sidebar.querySelectorAll("button:not([disabled])").forEach(btn=>{
    btn.addEventListener("click",()=>show(btn.dataset.page));
  });
}
function applyLanguage(){
  document.documentElement.lang=LANG;
  document.documentElement.dir=LANG==="ar"?"rtl":"ltr";
  const lb=document.querySelector("header .ghost"); if(lb)lb.textContent=LANG==="ar"?"AR / EN":"EN / AR";
  const out=document.querySelector("header .danger"); if(out)out.textContent=L("Logout","خروج");
  renderSidebar();
  const login=$("login");
  if(login){
    const h=login.querySelector("h1"),p=login.querySelector("p"),b=$("loginBtn"),u=$("username"),pw=$("password");
    if(h)h.textContent=t("Trend Delivery Service");
    if(p)p.textContent=t("System Login");
    if(u)u.placeholder=L("Username","اسم المستخدم");
    if(pw)pw.placeholder=L("Password","كلمة المرور");
    if(b)b.textContent=t("Login");
  }
}

async function api(path,opt={}){
  const headers={"Content-Type":"application/json",...(opt.headers||{})};
  if(TOKEN) headers.Authorization=`Bearer ${TOKEN}`;
  const r=await fetch(path,{...opt,headers});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){ if(r.status===401){TOKEN="";localStorage.removeItem("trend_token");} throw new Error(d.error||`HTTP ${r.status}`); }
  return d;
}

async function login(){
  const username=$("username"),password=$("password");
  if(!username||!password) return msg("loginMsg",L("Login fields are missing","حقول تسجيل الدخول غير موجودة"),"error");

  const identity=username.value.trim();
  if(!identity||!password.value) return msg("loginMsg",L("Enter username/email and password","أدخل اسم المستخدم أو البريد الإلكتروني وكلمة المرور"),"error");

  const b=$("loginBtn");
  if(b)b.disabled=true;

  try{
    // The server accepts username. We also send email with the same value so
    // the backend can support either identifier without breaking username login.
    const d=await api("/api/login",{
      method:"POST",
      body:JSON.stringify({
        username:identity,
        email:identity,
        password:password.value
      })
    });

    if(!d?.token) throw new Error(L("Login failed: no session token was returned","فشل تسجيل الدخول: لم يتم استلام رمز الجلسة"));

    TOKEN=d.token;
    CURRENT_USER=d.user||null;
    localStorage.setItem("trend_token",TOKEN);
    updateCurrentUserUI();

    $("login")?.classList.add("hidden");
    $("login")?.setAttribute("style","display:none!important");
    $("app")?.classList.remove("hidden");
    $("app")?.setAttribute("style","display:block!important");

    await show("dashboard");
  }catch(e){
    TOKEN="";
    localStorage.removeItem("trend_token");
    $("app")?.classList.add("hidden");
    $("app")?.setAttribute("style","display:none!important");
    $("login")?.classList.remove("hidden");
    $("login")?.setAttribute("style","display:flex!important");
    msg("loginMsg",e.message||L("Login failed","فشل تسجيل الدخول"),"error");
  }finally{
    if(b)b.disabled=false;
  }
}
function logout(){TOKEN="";CURRENT_USER=null;localStorage.removeItem("trend_token");if(CHAT_TIMER)clearInterval(CHAT_TIMER);location.reload();}
function toggleLang(){LANG=LANG==="ar"?"en":"ar";localStorage.setItem("trend_lang",LANG);applyLanguage();updateCurrentUserUI();if(TOKEN)show(CURRENT_PAGE);}

async function show(page){
  if(!canAccessPage(page)){
    const c=$("content");
    if(c)c.innerHTML=`<div class="panel"><span class="error">${esc(L("You do not have permission to open this page","ليس لديك صلاحية لفتح هذه الصفحة"))}</span></div>`;
    return;
  }
  CURRENT_PAGE=page; const c=$("content"); if(!c)return;
  c.innerHTML=`<div class="panel"><p class="muted">${esc(t("Loading..."))}</p></div>`;
  if(CHAT_TIMER){clearInterval(CHAT_TIMER);CHAT_TIMER=null;}
  try{
    if(page==="dashboard")await dashboardPage(c); else if(page==="order")await orderPage(c); else if(page==="search")searchPage(c); else if(page==="shipments")await shipmentsPage(c);
    else if(page==="jobs")await jobsPage(c); else if(page==="jobcode")await jobCodePage(c); else if(page==="returns")await returnsPage(c); else if(page==="merchants")await merchantsPage(c);
    else if(page==="drivers")await driversPage(c); else if(page==="areas")await areasPage(c); else if(page==="accounting")await accountingPage(c); else if(page==="driverExpenses")await driverExpensesPage(c); else if(page==="ordersVerification")await ordersVerificationPage(c); else if(page==="driverCommission")await driverCommissionPage(c);
    else if(page==="audit")await auditPage(c); else if(page==="settings")await settingsPage(c); else if(page==="employees")await employeesPage(c); else if(page==="chat")await chatPage(c); else c.innerHTML=`<div class="panel error">${esc(L("Page not found","الصفحة غير موجودة"))}</div>`;
    applyLanguage();
  }catch(e){console.error(e);c.innerHTML=`<div class="panel"><span class="error">${esc(e.message)}</span></div>`;}
}

function stat(label,n){return `<div class="stat"><span>${esc(label)}</span><b>${esc(n)}</b></div>`;}
async function dashboardPage(c){
  const d=await api("/api/dashboard"),x=d.data?.counts||{};
  c.innerHTML=`<h2>${L("Dashboard","لوحة التحكم")}</h2><div class="dashboard-stats grid">${stat(L("Orders","الأوردرات"),x.orders||0)}${stat(L("Shipments","الشحنات"),x.shipments||0)}${stat(L("Delivery Jobs","مهام التوصيل"),x.jobs||0)}${stat(L("Drivers","السائقون"),x.drivers||0)}${stat(L("Merchants","التجار"),x.merchants||0)}${stat(L("Delivered","تم التسليم"),x.delivered||0)}${stat(L("Cancelled","ملغى"),x.cancelled||0)}${stat(L("Pending","قيد التنفيذ"),x.pending||0)}</div><div class="panel"><h3>${t("Quick Search")}</h3><div class="row"><input id="quickSearch" placeholder="${esc(L("Customer / order / shipment number","رقم العميل / رقم الأوردر / رقم الشحنة"))}"><button onclick="quickSearch()">${t("Search")}</button></div><div id="quickResult"></div></div>`;
}
async function quickSearch(){const q=$("quickSearch")?.value.trim();if(!q)return msg("quickResult",L("Enter a search value","اكتب قيمة البحث"),"error");try{$("quickResult").innerHTML=renderSearch(await api("/api/search?q="+encodeURIComponent(q)));}catch(e){msg("quickResult",e.message,"error");}}

async function orderPage(c){
  const [m,g,a,s]=await Promise.all([api("/api/merchants"),api("/api/governorates"),api("/api/areas"),api("/api/order/next-serial")]);
  c.innerHTML=orderFormHtml(s.next??s.serial??1,m.data||[],g.data||[],a.data||[],null)+`<div class="panel"><h3>${L("Import Orders from Excel","رفع الأوردرات من Excel")}</h3><p class="muted">${L("Required column: Merchant Order No. plus merchant_id or merchant name, customer data and value.","الأعمدة الأساسية: رقم أوردر التاجر، معرّف التاجر أو بيانات التاجر، بيانات العميل وقيمة الأوردر.")}</p><input id="orderFile" type="file" accept=".xlsx,.xls,.csv"><button class="ghost" onclick="importOrdersExcel()">${t("Import Excel")}</button><div id="orderImportMsg"></div></div>`;
  $("merchant")?.addEventListener("change",loadMerchantFee);
  loadMerchantFee();
}
function orderFormHtml(next,merchants,govs,areas,order,returnPage="shipments"){
  const o=order||{};
  return `<h2>${esc(order?t("Edit Order"):L("New Order","إدخال أوردر"))}</h2><div class="panel"><div class="form-grid">
  ${order?`<input id="edit_order_id" type="hidden" value="${esc(o.id)}"><input id="edit_return_page" type="hidden" value="${esc(returnPage)}">`:``}
  ${order?`<label>${t("Tracking Number")}<input id="tracking_number" value="${esc(o.shipment?.tracking_number||o.tracking_number||"")}" readonly></label>`:`<label>${t("Tracking Number")}<input value="${esc(L("Generated by system after saving","يتم إنشاؤه تلقائيًا بعد الحفظ"))}" readonly></label>`}
  <label>${t("Merchant")}<select id="merchant" required><option value="">${t("Select Merchant")}</option>${merchants.map(x=>`<option value="${esc(x.id)}" ${x.id===o.merchant_id?"selected":""}>${esc(x.name)} — ${esc(x.merchant_no||"")}</option>`).join("")}</select></label>
  <label>${t("Merchant Order No.")}<input id="merchant_order_no" value="${esc(o.merchant_order_no||"")}" placeholder="${esc(L("Required","إجباري"))}" required></label>
  <label>${t("Order Code")}<input id="order_code" value="${esc(o.order_code||"")}" readonly></label>
  <label>${L("Customer Name","اسم العميل")}<input id="customer_name" value="${esc(o.customer_name||o.customer?.name||"")}"></label>
  <label>${L("Customer Phone","رقم العميل / الهاتف")}<input id="customer_phone" value="${esc(o.customer_phone||o.customer?.phone||"")}"></label>
  <label>${L("Governorate","الإمارة")}<select id="gov"><option value=""></option>${govs.map(x=>`<option value="${esc(x.id)}" ${x.id===o.governorate_id?"selected":""}>${esc(L(x.name_en,x.name_ar))}</option>`).join("")}</select></label>
  <label>${L("Area","المنطقة")}<select id="area"><option value=""></option>${areas.map(x=>`<option value="${esc(x.id)}" ${x.id===o.area_id?"selected":""}>${esc(L(x.name_en,x.name_ar))}</option>`).join("")}</select></label>
  <label class="full">${t("Address")}<input id="address" value="${esc(o.address||"")}"></label>
  <label>${t("Order Value")} <small class="muted">${currencyInfo().symbol}</small><input id="value" type="number" step="0.01" value="${esc(o.value==null?"":moneyInput(o.value))}"></label>
  <label>${t("Delivery Fee")} <small class="muted">${currencyInfo().symbol}</small><input id="delivery_fee" type="number" step="0.01" value="${esc(o.delivery_fee==null?moneyInput(25):moneyInput(o.delivery_fee))}"><small id="merchantFeeHint" class="muted">${L("Default: 25 AED — editable","الافتراضي: 25 د.إ — قابل للتعديل")}</small></label>
  <label>${t("Status")}<select id="order_status">${['new','pending','Delivered','Half Delivered','Cancelled by Shipper','Cancelled by Receiver','Replaced','In Ops','cancelled'].map(st=>`<option value="${esc(st)}" ${String(o.status||'').toLowerCase()===String(st).toLowerCase()?"selected":""}>${esc(st)}</option>`).join('')}</select></label>
  <label class="full">${L("Notes","ملاحظات")}<textarea id="notes">${esc(o.notes||"")}</textarea></label>
  </div><div class="actions"><button onclick="${order?"updateOrderFromForm()":"saveOrder()"}">${t(order?"Update":"Save")}</button>${order?`<button class="ghost" onclick="show('${esc(returnPage)}')">${returnPage==="accounting"?L("Back to Accounting","العودة للحسابات"):L("Back to Shipments","العودة للشحنات")}</button>`:""}</div><div id="orderMsg" class="msg"></div></div>`;
}
async function loadMerchantFee(){const id=$("merchant")?.value;if(!id)return;try{const d=await api("/api/merchants");const m=(d.data||[]).find(x=>x.id===id);if(m){const fee=Number(m.base_delivery_fee||0);const input=$("delivery_fee");if(input&&!input.value)input.value=moneyInput(fee);const h=$("merchantFeeHint");if(h)h.textContent=L(`Saved merchant fee: ${money(fee)}` ,`رسوم التوصيل المحفوظة للتاجر: ${money(fee)}`);}}catch(_){} }
async function importOrdersExcel(){const file=$("orderFile")?.files?.[0];if(!file)return msg("orderImportMsg",L("Choose an Excel file","اختر ملف Excel"),"error");if(typeof XLSX==="undefined")return msg("orderImportMsg",L("Excel library did not load","مكتبة Excel لم تعمل"),"error");try{const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});const d=await api("/api/orders/import",{method:"POST",body:JSON.stringify({rows})});msg("orderImportMsg",`${L("Imported","تم الرفع")}: ${d.imported} — ${L("Skipped","تم التخطي")}: ${d.skipped}`,"ok");if(d.errors?.length)console.warn(d.errors);}catch(e){msg("orderImportMsg",e.message,"error");}}
async function saveOrder(){const b=readOrderForm();if(!b.merchant_id)return msg("orderMsg",L("Select a merchant","اختر التاجر"),"error");if(!b.merchant_order_no)return msg("orderMsg",L("Merchant Order No. is required","رقم أوردر التاجر إجباري"),"error");try{const d=await api("/api/orders",{method:"POST",body:JSON.stringify(b)});msg("orderMsg",`${L("Saved. Tracking Number","تم الحفظ. رقم التتبع")}: ${d.trackingNumber||d.shipment?.tracking_number||d.shipment?.shipment_no||""}`,"ok");setTimeout(()=>show("order"),900);}catch(e){msg("orderMsg",e.message,"error");}}
function readOrderForm(){return {serial_no:Number($("serial")?.value),order_code:$("order_code")?.value.trim(),merchant_id:$("merchant")?.value,merchant_order_no:$("merchant_order_no")?.value.trim(),customer_name:$("customer_name")?.value.trim(),customer_phone:$("customer_phone")?.value.trim(),governorate_id:$("gov")?.value||null,area_id:$("area")?.value||null,address:$("address")?.value.trim(),value:baseAmount($("value")?.value||0),delivery_fee:baseAmount($("delivery_fee")?.value||0),status:$("order_status")?.value,notes:$("notes")?.value.trim()};}
async function openOrder(id,returnPage="shipments"){try{const d=await api("/api/orders/"+encodeURIComponent(id));const detail=d.data;const [m,g,a]=await Promise.all([api("/api/merchants"),api("/api/governorates"),api("/api/areas")]);const order={...(detail.order||{}),shipment:detail.shipment||null};$("content").innerHTML=orderFormHtml(order.serial_no||1,m.data||[],g.data||[],a.data||[],order,returnPage);$("merchant")?.addEventListener("change",loadMerchantFee);loadMerchantFee();}catch(e){alert(e.message);}}
async function updateOrderFromForm(){const b=readOrderForm();b.id=$("edit_order_id").value;const returnPage=$("edit_return_page")?.value||"shipments";try{await api("/api/orders",{method:"PATCH",body:JSON.stringify(b)});msg("orderMsg",L("Updated successfully","تم تعديل الأوردر بنجاح"),"ok");setTimeout(()=>show(returnPage),600);}catch(e){msg("orderMsg",e.message,"error");}}

function searchPage(c){c.innerHTML=`<h2>${t("Search")}</h2><div class="panel"><div class="row"><input id="searchQ" placeholder="${esc(L("Customer / order / shipment number","رقم العميل / رقم الأوردر / رقم الشحنة"))}"><button onclick="doSearch()">${t("Search")}</button></div><div id="searchResult"></div></div>`;}
async function doSearch(){const q=$("searchQ")?.value.trim();if(!q)return msg("searchResult",L("Enter a search value","اكتب قيمة البحث"),"error");try{$("searchResult").innerHTML=renderSearch(await api("/api/search?q="+encodeURIComponent(q)));}catch(e){msg("searchResult",e.message,"error");}}
function renderSearch(d){if(!d?.data)return `<p class="muted">${t("No data")}</p>`;const x=d.data;const o=x.order||x;const id=o.id||x.order_id;const tracking=x.tracking_number||x.shipment?.tracking_number||x.shipment_no||x.shipment?.shipment_no||"";const logs=(x.audit||[]).slice().sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));const historyRows=logs.map(r=>{const details=typeof r.details==="object"?JSON.stringify(r.details):String(r.details||"");return `<tr><td>${esc((r.created_at||"").replace("T"," ").slice(0,19))}</td><td>${esc(r.action||"")}</td><td>${esc(r.user_name||"System")}</td><td>${esc(r.employee_code||"")}</td><td>${esc(details)}</td></tr>`}).join("");return `<div class="panel order-search-card"><h3>${esc(d.type||"")}</h3><div class="detail-grid"><div><b>${t("Tracking Number")}</b><br>${esc(tracking)}</div><div><b>${t("Merchant Order No.")}</b><br>${esc(o.merchant_order_no||"")}</div><div><b>${t("Order Code")}</b><br>${esc(o.order_code||"")}</div><div><b>${t("Merchant")}</b><br>${esc(x.merchant?.name||"")}</div><div><b>${t("Customer")}</b><br>${esc(o.customer_name||"")}</div><div><b>${t("Status")}</b><br><span class="badge">${esc(x.status||o.status||"")}</span></div><div><b>${t("Delivery Fee")}</b><br>${esc(money(o.delivery_fee||0))}</div><div><b>${t("Order Value")}</b><br>${esc(money(o.value||0))}</div></div><div class="actions"><button onclick="openOrder('${esc(id)}')">${t("Edit")}</button><button class="ghost" onclick='exportRowsExcel([${JSON.stringify({...o,tracking_number:tracking})}],"search-result")'>${t("Export Excel")}</button><button class="ghost" onclick='printRowsPDF([${JSON.stringify({...o,tracking_number:tracking})}],"${esc(o.merchant_order_no||o.order_code||"order")}")'>${t("Print / PDF")}</button></div><details class="order-history" ${logs.length?"":""}><summary> سجل الحركات / History <span class="history-count">${logs.length}</span></summary><div class="history-box">${logs.length?`<div class="table-wrap"><table><thead><tr><th>التاريخ والوقت</th><th>الحركة</th><th>الموظف</th><th>كود الموظف</th><th>التفاصيل</th></tr></thead><tbody>${historyRows}</tbody></table></div>`:`<p class="muted">لا توجد حركات مسجلة لهذا الأوردر.</p>`}</div></details></div>`;}

async function shipmentsPage(c){
  c.innerHTML=`<h2>${t("Shipments")}</h2><div class="panel"><div class="row"><label>${t("From")}<input id="shipFrom" type="date" value="${daysAgo(7)}"></label><label>${t("To")}<input id="shipTo" type="date" value="${today()}"></label><button onclick="loadShipments()">${t("Search")}</button><button class="ghost" onclick="exportShipmentsExcel()">${t("Export Excel")}</button><button class="ghost" onclick="exportShipmentsPDF()">${t("Print / PDF")}</button></div><div id="shipmentsList"></div></div>`;
  await loadShipments();
}
let SHIP_ROWS=[];
async function loadShipments(){try{const d=await api(`/api/shipments?from=${$("shipFrom").value}&to=${$("shipTo").value}`);SHIP_ROWS=d.data||[];$("shipmentsList").innerHTML=shipmentsTable(SHIP_ROWS);}catch(e){msg("shipmentsList",e.message,"error");}}
function shipmentsTable(rows){if(!rows.length)return `<p class="muted">${t("No data")}</p>`;return `<div class="table-wrap"><table id="shipmentsTable"><thead><tr><th>${t("Tracking Number")}</th><th>${t("Merchant Order No.")}</th><th>${t("Merchant")}</th><th>${t("Customer")}</th><th>${t("Order Value")}</th><th>${t("Delivery Fee")}</th><th>${t("Status")}</th><th>${t("Created")}</th><th>${t("Edit")}</th></tr></thead><tbody>${rows.map(r=>`<tr class="clickable" onclick="openOrder('${esc(r.order_id)}')"><td>${esc(r.tracking_number||r.shipment_no||"")}</td><td>${esc(r.order?.merchant_order_no||"")}</td><td>${esc(r.merchant?.name||"")}</td><td>${esc(r.order?.customer_name||"")}</td><td>${esc(money(r.order?.value||0))}</td><td>${esc(money(r.order?.delivery_fee||0))}</td><td><span class="badge">${esc(r.status)}</span></td><td>${esc((r.order?.created_at||r.created_at||"").slice(0,16).replace("T"," "))}</td><td><button onclick="event.stopPropagation();openOrder('${esc(r.order_id)}')">${t("Edit")}</button></td></tr>`).join("")}</tbody></table></div>`;}
function exportShipmentsExcel(){exportRowsExcel(SHIP_ROWS.map(r=>({tracking_number:r.tracking_number||r.shipment_no||"",merchant_order_no:r.order?.merchant_order_no||"",order_code:r.order?.order_code||"",merchant:r.merchant?.name||"",customer:r.order?.customer_name||"",phone:r.order?.customer_phone||"",value:r.order?.value||0,delivery_fee:r.order?.delivery_fee||0,status:r.status,created_at:r.order?.created_at||r.created_at})),"shipments");}
function exportShipmentsPDF(){printRowsPDF(SHIP_ROWS.map(r=>({tracking_number:r.tracking_number||r.shipment_no||"",merchant_order_no:r.order?.merchant_order_no||"",order_code:r.order?.order_code||"",merchant:r.merchant?.name||"",customer:r.order?.customer_name||"",value:r.order?.value||0,delivery_fee:r.order?.delivery_fee||0,status:r.status,created_at:r.order?.created_at||r.created_at})),"shipments");}

async function setStatus(id,status){try{await api("/api/shipments/status",{method:"POST",body:JSON.stringify({shipment_id:id,status})});await loadShipments();}catch(e){alert(e.message);}}

async function jobsPage(c){const [j,d]=await Promise.all([api("/api/delivery-jobs"),api("/api/drivers")]);c.innerHTML=`<h2>${t("Delivery Jobs")}</h2><div class="panel"><div class="form-grid"><label>${L("Driver","السائق")}<select id="jobDriver">${(d.data||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select></label><label>${L("Job Code","كود المهمة")}<input id="jobCode"></label><label class="full">${L("Shipment numbers, one per line","أرقام الشحنات، كل رقم في سطر")}<textarea id="jobShipments"></textarea></label></div><button onclick="createJob()">${t("Save")}</button><div id="jobMsg"></div></div><div class="panel"><h3>${L("Current Jobs","المهام الحالية")}</h3>${table(j.data||[],["job_code","driver_id","status","expected_count","received_count","created_at"])}</div>`;}
async function createJob(){try{const ids=$("jobShipments").value.split(/\s+/).filter(Boolean);const d=await api("/api/delivery-jobs",{method:"POST",body:JSON.stringify({driver_id:$("jobDriver").value,job_code:$("jobCode").value.trim(),shipment_ids:ids})});msg("jobMsg",L("Saved","تم الحفظ"),"ok");}catch(e){msg("jobMsg",e.message,"error");}}
async function jobCodePage(c){c.innerHTML=`<h2>${t("Update Delivery Job Code")}</h2><div class="panel"><div class="form-grid"><label>${L("Shipment No.","رقم الشحنة")}<input id="jcShipment"></label><label>${L("Serial No.","رقم التسلسل")}<input id="jcSerial" type="number"></label><label>${L("Job Code","كود المهمة")}<input id="jcJob"></label></div><button onclick="saveJobCode()">${t("Save")}</button><div id="jcMsg"></div></div>`;}
async function saveJobCode(){try{const d=await api("/api/delivery-job-code",{method:"POST",body:JSON.stringify({shipment_no:$("jcShipment").value.trim(),serial_no:Number($("jcSerial").value),delivery_job_code:$("jcJob").value.trim()})});msg("jcMsg",d.duplicate?L("Duplicate","⚠ مكرر"):L("Saved","تم الحفظ"),d.duplicate?"duplicate":"ok");}catch(e){msg("jcMsg",e.message,"error");}}
async function returnsPage(c){const d=await api("/api/returns");c.innerHTML=`<h2>${t("Merchant Returns")}</h2><div class="panel">${table(d.data||[],["shipment_id","reason_status","status","created_at"])}</div>`;}

async function merchantsPage(c){
  const d=await api("/api/merchants"); const rows=d.data||[];
  c.innerHTML=`<h2>${t("Merchants")}</h2>
  <div class="panel"><h3>${t("Add Merchant")}</h3><div class="form-grid">
  <label>${L("Merchant No.","رقم التاجر")}<input id="mn"></label><label>${L("Code","الكود")}<input id="mc"></label><label>${t("Name")}<input id="mname"></label><label>${t("Phone")}<input id="mphone"></label><label class="full">${t("Address")}<input id="maddress"></label><label>${t("Default Delivery Fee")} <small class="muted">${currencyInfo().symbol}</small><input id="mfee" type="number" step="0.01"></label><label><span>${t("Tax")} <input id="mtax" type="checkbox"></span></label><label>${t("Tax Rate")}<input id="mrate" type="number" step="0.01"></label><label>${t("Store Type")}<select id="mstoretype"><option value="">--</option><option>ecommerce</option><option>website</option><option>app</option><option>other</option></select></label><label>${t("Store Name")}<input id="mstorename"></label><label>${t("Store URL")}<input id="mstoreurl"></label><label><span>${t("Active")} <input id="mstoreactive" type="checkbox" checked></span></label></div><button onclick="addMerchant()">${t("Save")}</button><div id="merchantMsg"></div></div>
  <div class="panel"><h3>${t("Merchants")}</h3>${rows.length?`<div class="table-wrap"><table><thead><tr><th>${L("No.","رقم")}</th><th>${t("Name")}</th><th>${t("Phone")}</th><th>${t("Default Delivery Fee")}</th><th>${t("Tax")}</th><th>${t("Store")}</th><th>${t("Edit")}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.merchant_no)}</td><td>${esc(r.name)}</td><td>${esc(r.phone)}</td><td>${esc(money(r.base_delivery_fee||0))}</td><td>${r.tax_enabled?esc(r.tax_rate)+"%":"—"}</td><td>${esc(r.store_name||"")}</td><td><button onclick="editMerchant('${esc(r.id)}')">${t("Edit")}</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">${t("No data")}</p>`}</div>
  <div class="panel"><h3>${L("WooCommerce Store Integration","ربط متجر WooCommerce")}</h3><div class="form-grid">
  <label>${t("Merchant")}<select id="imMerchant">${rows.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join("")}</select></label>
  <label>${t("Store Name")}<input id="imName" placeholder="WooCommerce Store"></label>
  <label class="full">${t("Store URL")}<input id="imUrl" placeholder="https://example.com"></label>
  <label>${t("Consumer Key")}<input id="imKey" type="password" autocomplete="off"></label>
  <label>${t("Consumer Secret")}<input id="imSecret" type="password" autocomplete="off"></label>
  <label><span>${t("Auto Import")} <input id="imAuto" type="checkbox" checked></span></label>
  </div><div class="actions"><button onclick="addWooIntegration()">${t("Save")}</button><button class="ghost" onclick="loadWooIntegrations()">${t("Refresh")||"تحديث"}</button></div><div id="imMsg"></div><div id="wooIntegrations"></div></div>`;
  await loadWooIntegrations();
}
async function addMerchant(){try{await api("/api/merchants",{method:"POST",body:JSON.stringify({merchant_no:$("mn").value,code:$("mc").value,name:$("mname").value,phone:$("mphone").value,address:$("maddress").value,base_delivery_fee:baseAmount($("mfee").value||0),tax_enabled:$("mtax").checked,tax_rate:Number($("mrate").value||0),store_type:$("mstoretype").value,store_name:$("mstorename").value,store_url:$("mstoreurl").value,store_active:$("mstoreactive").checked})});msg("merchantMsg",L("Saved successfully","تم حفظ التاجر بنجاح"),"ok");setTimeout(()=>show("merchants"),500);}catch(e){msg("merchantMsg",e.message,"error");}}
async function editMerchant(id){const d=await api("/api/merchants"),m=(d.data||[]).find(x=>x.id===id);if(!m)return;const fee=prompt(L("Default delivery fee","رسوم التوصيل الافتراضية"),moneyInput(m.base_delivery_fee));if(fee===null)return;const tax=confirm(L("Enable tax for this merchant?","تفعيل الضريبة لهذا التاجر؟"));const rate=tax?prompt(L("Tax rate %","نسبة الضريبة %"),m.tax_rate||0):0;try{await api("/api/merchants",{method:"PATCH",body:JSON.stringify({id,tax_enabled:tax,tax_rate:Number(rate||0),base_delivery_fee:baseAmount(fee)})});await show("merchants");}catch(e){alert(e.message);}}
async function addWooIntegration(){try{const merchantId=$("imMerchant").value;const name=$("imName").value.trim()||"WooCommerce Store";const url=$("imUrl").value.trim();const key=$("imKey").value.trim();const secret=$("imSecret").value.trim();if(!url||!key||!secret)return msg("imMsg",L("Enter store URL, Consumer Key and Consumer Secret","أدخل رابط المتجر ومفتاح WooCommerce والسر"),"error");const d=await api("/api/merchant-integrations",{method:"POST",body:JSON.stringify({merchant_id:merchantId,type:"woocommerce",name,config:{url,consumer_key:key,consumer_secret:secret,auto_import:$("imAuto").checked}})});msg("imMsg",L("Saved successfully","تم حفظ الربط"),"ok");await loadWooIntegrations();}catch(e){msg("imMsg",e.message,"error");}}
async function loadWooIntegrations(){const box=$("wooIntegrations");if(!box||!$("imMerchant"))return;try{const d=await api("/api/merchant-integrations?merchant_id="+encodeURIComponent($("imMerchant").value));const rows=(d.data||[]).filter(x=>String(x.type).toLowerCase()==="woocommerce");box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>${t("Store")}</th><th>${t("Store URL")}</th><th>${t("Status")}</th><th>${t("Test Connection")}</th><th>${t("Import Orders")}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.config?.url||"")}</td><td>${r.active?"":""}${r.config?.last_error?`<br><span class="error">${esc(r.config.last_error)}</span>`:""}</td><td><button onclick="testWoo('${esc(r.id)}')">${t("Test Connection")}</button></td><td><button onclick="importWoo('${esc(r.id)}')">${t("Import Orders")}</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">${t("No data")}</p>`;}catch(e){box.innerHTML=`<span class="error">${esc(e.message)}</span>`;}}
async function testWoo(id){try{const d=await api(`/api/merchant-integrations/${encodeURIComponent(id)}/test`,{method:"POST"});alert(`${L("Connection successful","تم الاتصال بنجاح")} — ${d.sample_count||0}`);await loadWooIntegrations();}catch(e){alert(e.message);await loadWooIntegrations();}}
async function importWoo(id){try{const d=await api(`/api/merchant-integrations/${encodeURIComponent(id)}/import`,{method:"POST",body:JSON.stringify({per_page:50})});alert(`${L("Orders imported","تم سحب الأوردرات")}: ${d.imported} — ${L("Skipped","تم التخطي")}: ${d.skipped}`);await show("shipments");}catch(e){alert(e.message);}}

async function driversPage(c){
  const d=await api('/api/drivers'); const rows=d.data||[];
  c.innerHTML=`<h2>${t("Drivers")}</h2>
  <div class="panel driver-account-panel">
    <h3>${L("Driver Accounting Statement","كشف حساب المندوب")}</h3>
    <div class="form-grid driver-filters">
      <label>${L("Driver","المندوب")}<select id="stmtDriver"><option value="">${L("Select driver","اختر السائق")}</option>${rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} — ${esc(x.driver_no||"")}</option>`).join("")}</select></label>
      <label>${t("From")}<input id="stmtFrom" type="date" value="${today()}"></label>
      <label>${t("To")}<input id="stmtTo" type="date" value="${today()}"></label>
      <label>${L("Verify","حالة Verify")}<select id="stmtVerify"><option value="all">All</option><option value="verified">Verified</option><option value="unverified">Unverified</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select></label>
      <label>${L("Search","بحث")}<input id="stmtSearch" placeholder="Tracking / Shipment / Order / Shipper"></label>
    </div>
    <div class="actions no-print"><button onclick="loadDriverStatement()">${L("Show Statement","عرض كشف الحساب")}</button><button class="ghost" onclick="printArea('printDriverStatement',${JSON.stringify(L('Driver Accounting Statement','كشف حساب المندوب'))})">${t("Print / PDF")}</button></div>
    <div id="driverStatement"></div>
  </div>
  <div class="panel">${table(rows,["driver_no","name","phone","vehicle_no","active","created_at"])}</div>`;
  $("stmtSearch")?.addEventListener('input',()=>renderDriverStatementRows());
  $("stmtVerify")?.addEventListener('change',()=>renderDriverStatementRows());
}

let DRIVER_STATEMENT_CACHE=null;
function renderDriverStatementRows(){
  const box=$("driverStatement"); if(!box||!DRIVER_STATEMENT_CACHE)return;
  const x=DRIVER_STATEMENT_CACHE, all=x.orders||[];
  const filter=$("stmtVerify")?.value||'all', q=($("stmtSearch")?.value||'').trim().toLowerCase();
  const orders=all.filter(o=>{
    const text=[o.tracking_number,o.shipment_no,o.merchant_order_no,o.shipper_name,o.merchant_name,o.customer_name].join(' ').toLowerCase();
    if(q&&!text.includes(q))return false;
    if(filter==='verified'&&o.verify_status!=='verified')return false;
    if(filter==='unverified'&&(o.verify_status==='verified'||o.paid_status==='paid'))return false;
    if(filter==='paid'&&o.paid_status!=='paid')return false;
    if(filter==='unpaid'&&o.paid_status==='paid')return false;
    return true;
  });
  const tt=x.totals||{}, driver=x.driver||{}, expenses=x.expenses||[], settlements=x.settlements||[];
  const orderRows=orders.map(o=>{
    const state=o.paid_status==='paid'?'paid':(o.verify_status==='verified'?'verified':'unverified');
    const rowClass=state==='verified'||state==='paid'?'driver-row-green':'driver-row-red';
    const verifyCell=o.paid_status==='paid'?'<span class="verify-pill paid-pill">Paid</span>':o.verify_status==='verified'?'<span class="verify-pill verified-pill">Verified</span>':`<button class="mini-btn verify-btn" onclick="verifyOneDriverOrder('${esc(o.id)}','${esc(o.delivery_date||'')}')">Verify</button>`;
    return `<tr class="${rowClass}"><td><b>${esc(o.tracking_number||'')}</b></td><td><b>${esc(o.shipment_no||'')}</b>${o.merchant_order_no?` <small>(${esc(o.merchant_order_no)})</small>`:''}</td><td>${esc(o.shipper_name||o.merchant_name||'')}</td><td>${money(o.delivery_fee||0)}</td><td>${money(o.value??o.cod??0)}</td><td>${esc(o.status||'')}</td><td>${verifyCell}</td><td><button class="mini-btn ghost" onclick="editDriverOrder('${esc(o.id)}',${Number(o.value??o.cod??0)},${Number(o.delivery_fee||0)})">${t("Edit")}</button></td></tr>`;
  }).join('');
  box.innerHTML=`<div id="printDriverStatement" class="print-sheet">
    <div class="statement-head"><div><h3>${L("Driver Accounting Statement","كشف حساب المندوب")}</h3><div>${L("Driver","المندوب")}: <b>${esc(driver.name||'')}</b> — ${L("Code","الكود")}: <b>${esc(driver.driver_no||'')}</b></div></div><div class="actions no-print"></div></div>
    <div class="driver-summary"><div class="stat"><span>${L("Order Count","عدد الأوردرات")}</span><b>${orders.length}</b></div><div class="stat"><span>${L("Total Commission","إجمالي العمولة")}</span><b>${money(orders.reduce((s,o)=>s+Number(o.delivery_fee||0),0))}</b></div><div class="stat"><span>${L("Total Expenses","إجمالي المصروفات")}</span><b>${money(tt.expenseTotal||0)}</b></div><div class="stat"><span>${L("Amount Due","المطلوب دفعه")}</span><b>${money(tt.required||0)}</b></div></div>
    <div class="table-wrap driver-table-wrap"><table class="driver-statement-table"><thead><tr><th>Tracking</th><th>Shipment / Order</th><th>Shipper</th><th>Delivery Fee</th><th>Amount / COD</th><th>Status</th><th>Verify</th><th>Edit</th></tr></thead><tbody>${orderRows||`<tr><td colspan="8" class="muted">${L("No orders","لا توجد أوردرات")}</td></tr>`}</tbody></table></div>
    <div class="driver-order-count">${L("Order Count","عدد الأوردرات")}: <b>${orders.length}</b></div>
    <h3>${L("Driver Expenses","مصروفات المندوب")}</h3>
    <div class="form-grid no-print"><label>${L("Type","النوع")}<select id="newExType"><option value="petrol">بنزين</option><option value="loading">تحميل</option><option value="parking">موقف</option><option value="other">مصروف آخر</option></select></label><label>${L("Category","التصنيف")}<select id="newExCategory"><option value="expense">Expense — مصروف</option><option value="shortage">Shortage — عجز</option></select></label><label>${L("Amount","المبلغ")} <small class="muted">${currencyInfo().symbol}</small><input id="newExAmount" type="number" step="0.01"></label><label>${L("Date","التاريخ")}<input id="newExDate" type="date" value="${today()}"></label><label class="full">${L("Details","التفاصيل")}<input id="newExDetails"></label></div>
    <button class="no-print" onclick="addStatementExpense('${esc(driver.id)}')">${t("Save")}</button>
    ${expenses.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Details</th><th>Amount</th><th class="no-print">Edit/Delete</th></tr></thead><tbody>${expenses.map(e=>`<tr><td>${esc(e.expense_date||'')}</td><td>${esc(e.expense_type||'')}</td><td>${e.category==='shortage'?'Shortage':'Expense'}</td><td>${esc(e.details||e.notes||'')}</td><td>${money(e.amount||0)}</td><td class="no-print"><button class="mini-btn ghost" onclick='editStatementExpense(${JSON.stringify(e)})'>${t("Edit")}</button> <button class="mini-btn danger" onclick="deleteStatementExpense('${esc(e.id)}')">${L("Delete","حذف")}</button></td></tr>`).join('')}</tbody></table></div>`:`<p class="muted">${L("No expenses","لا توجد مصروفات")}</p>`}
    <div class="driver-totals"><div>${L("Expenses","المصروفات")}: <b>${money(tt.expenseTotal||0)}</b></div><div>${L("Shortage","العجز")}: <b>${money(tt.shortageTotal||0)}</b></div><div>${L("Amount Due","المطلوب دفعه")}: <b>${money(tt.required||0)}</b></div></div>
    <h3>${L("Required Payment","المطلوب دفعه")}</h3>
    <div class="form-grid no-print"><label>${L("Payment","طريقة الدفع")}<select id="payMethod"><option value="cash">Cash — كاش</option><option value="bank">Bank — بنك</option></select></label><label>${L("Amount","المبلغ")}<input id="payAmount" type="number" step="0.01" value="${moneyInput(tt.required||0)}"></label><label>${L("Payment Date","تاريخ الدفع")}<input id="payDate" type="date" value="${today()}"></label><label>${L("Bank Name","اسم البنك")}<input id="bankName"></label><label>${L("Transfer Reference","رقم التحويل")}<input id="transferRef"></label></div><button class="no-print" onclick="saveDriverSettlement('${esc(driver.id)}')">${L("Save Payment","حفظ الدفع")}</button>
    ${settlements.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Bank</th><th>Reference</th><th>Employee</th></tr></thead><tbody>${settlements.map(e=>`<tr><td>${esc((e.paid_at||'').replace('T',' ').slice(0,16))}</td><td>${esc(e.payment_method||'')}</td><td>${money(e.amount||0)}</td><td>${esc(e.bank_name||'')}</td><td>${esc(e.transfer_reference||'')}</td><td>${esc(e.employee_name||e.employee_code||'')}</td></tr>`).join('')}</tbody></table></div>`:''}
    <div class="print-signatures"><span>${L("Driver Signature","توقيع المندوب")}: __________________</span><span>${L("Employee Signature","توقيع الموظف")}: __________________</span></div>
    <div class="site-credit">Designed &amp; Developed by Mohamed Hoseany</div>
  </div>`;
}

async function loadDriverStatement(){
  const id=$("stmtDriver")?.value;if(!id)return msg("driverStatement",L("Select driver first","اختر السائق أولاً"),"error");
  try{const d=await api(`/api/drivers/statement?driver_id=${encodeURIComponent(id)}&from=${encodeURIComponent($("stmtFrom").value)}&to=${encodeURIComponent($("stmtTo").value)}`);DRIVER_STATEMENT_CACHE=d.data;renderDriverStatementRows();}
  catch(e){msg("driverStatement",e.message,"error");}
}
async function verifyOneDriverOrder(id,deliveryDate){
  try{const verifyDate=deliveryDate||$("stmtFrom")?.value||today();await api('/api/driver-commission/verify',{method:'POST',body:JSON.stringify({order_ids:[id],verify_date:verifyDate})});await loadDriverStatement();}
  catch(e){alert(e.message);}
}
async function editDriverOrder(id,cod,fee){
  const newCod=prompt(L('Amount / COD','المبلغ / COD'),moneyInput(cod));if(newCod===null)return;
  const newFee=prompt(L('Delivery Fee','رسوم التوصيل'),moneyInput(fee));if(newFee===null)return;
  try{await api('/api/driver-statement/order',{method:'PATCH',body:JSON.stringify({id,cod:baseAmount(newCod),delivery_fee:baseAmount(newFee)})});await loadDriverStatement();}
  catch(e){alert(e.message);}
}
async function verifySelectedDriverOrders(driverId){const ids=[...document.querySelectorAll('.commission-check:checked')].map(x=>x.value);if(!ids.length)return alert(L('Select orders first','اختر الأوردرات أولاً'));try{await api('/api/driver-commission/verify',{method:'POST',body:JSON.stringify({driver_id:driverId,order_ids:ids})});await loadDriverStatement();}catch(e){alert(e.message);}}
async function payVerifiedDriverOrders(driverId,method){const ids=[...document.querySelectorAll('.commission-check:checked')].map(x=>x.value);if(!ids.length)return alert(L('Select verified orders first','اختر الأوردرات التي تم Verify لها أولاً'));try{const d=await api('/api/driver-commission/pay',{method:'POST',body:JSON.stringify({driver_id:driverId,order_ids:ids,payment_method:method,payment_date:today()})});alert(`${L("Paid","تمت التسوية")}: ${money(d.data?.amount||0)}`);await loadDriverStatement();}catch(e){alert(e.message);}}
function toggleAllCommission(el){document.querySelectorAll('.commission-check:not(:disabled)').forEach(x=>x.checked=el.checked);}
async function addStatementExpense(driverId){try{await api('/api/expenses',{method:'POST',body:JSON.stringify({driver_id:driverId,expense_type:$("newExType").value,category:$("newExCategory").value,amount:baseAmount($("newExAmount").value||0),expense_date:$("newExDate").value,details:$("newExDetails").value})});await loadDriverStatement();}catch(e){alert(e.message);}}
async function editStatementExpense(e){const amount=prompt(L('Amount','المبلغ'),moneyInput(e.amount));if(amount===null)return;const details=prompt(L('Details','التفاصيل'),e.details||e.notes||'');if(details===null)return;try{await api('/api/expenses',{method:'PATCH',body:JSON.stringify({id:e.id,expense_type:e.expense_type,category:e.category,amount:baseAmount(amount),expense_date:e.expense_date,details})});await loadDriverStatement();}catch(err){alert(err.message);}}
async function deleteStatementExpense(id){if(!confirm(L('Delete expense?','حذف المصروف؟')))return;try{await api('/api/expenses',{method:'DELETE',body:JSON.stringify({id})});await loadDriverStatement();}catch(e){alert(e.message);}}
async function openOrderEdit(id){show('search');setTimeout(()=>{const el=$('searchQ');if(el){el.value=id;doSearch();}},100);}
async function saveDriverSettlement(driverId){try{const body={driver_id:driverId,payment_method:$("payMethod")?.value,amount:baseAmount($("payAmount")?.value||0),paid_at:$("payDate")?.value,bank_name:$("bankName")?.value||"",transfer_reference:$("transferRef")?.value||""};await api('/api/driver-settlements',{method:'POST',body:JSON.stringify(body)});alert("تم تسجيل التسوية");await loadDriverStatement();}catch(e){alert(e.message);}}

async function areasPage(c){
  const [g,a]=await Promise.all([api("/api/governorates"),api("/api/areas")]);
  c.innerHTML=`<h2>${t("Governorates & Areas")}</h2><div class="panel"><h3>${t("Import Excel")}</h3><p class="muted">${t("Excel file contains columns: الإمارة, المنطقة, اسم المنطقة EN (optional)")}</p><input id="areaFile" type="file" accept=".xlsx,.xls,.csv"><button onclick="importAreasExcel()">${t("Import Excel")}</button><button class="ghost" onclick='exportRowsExcel(${JSON.stringify((a.data||[]).map(x=>({governorate_id:x.governorate_id,area_ar:x.name_ar,area_en:x.name_en||""})))} ,"areas")'>${t("Export Excel")}</button><div id="areaMsg"></div></div>
  <div class="panel"><h3>${t("Add Governorate")}</h3><div class="row"><input id="govAr" placeholder="${L("Arabic name","اسم الإمارة بالعربي")}"><input id="govEn" placeholder="English"><button onclick="addGovernorate()">${t("Save")}</button></div></div>
  <div class="panel"><h3>${t("Add Area")}</h3><div class="row"><select id="areaGov">${(g.data||[]).map(x=>`<option value="${esc(x.id)}">${esc(L(x.name_en,x.name_ar))}</option>`).join("")}</select><input id="areaAr" placeholder="${L("Area name","اسم المنطقة")}"><input id="areaEn" placeholder="English"><button onclick="addArea()">${t("Save")}</button></div></div>
  <div class="panel"><h3>${t("Governorates & Areas")}</h3>${table(g.data||[],["name_ar","name_en"])}${table(a.data||[],["name_ar","name_en","governorate_id"])}</div>`;
}
async function addGovernorate(){try{await api("/api/governorates",{method:"POST",body:JSON.stringify({name_ar:$("govAr").value,name_en:$("govEn").value})});show("areas");}catch(e){alert(e.message);}}
async function addArea(){try{await api("/api/areas",{method:"POST",body:JSON.stringify({governorate_id:$("areaGov").value,name_ar:$("areaAr").value,name_en:$("areaEn").value})});show("areas");}catch(e){alert(e.message);}}
async function importAreasExcel(){const file=$("areaFile")?.files?.[0];if(!file)return msg("areaMsg",L("Choose an Excel file","اختر ملف Excel"),"error");if(typeof XLSX==="undefined")return msg("areaMsg",L("Excel library did not load. Use CSV or refresh.","مكتبة Excel لم تعمل. جرّب تحديث الصفحة أو CSV."),"error");try{const data=await file.arrayBuffer();const wb=XLSX.read(data,{type:"array"});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});const d=await api("/api/areas/import",{method:"POST",body:JSON.stringify({rows})});msg("areaMsg",`${t("Imported")}: ${d.imported} — skipped: ${d.skipped}`,"ok");setTimeout(()=>show("areas"),900);}catch(e){msg("areaMsg",e.message,"error");}}


async function driverCommissionPage(c){
  const from=daysAgo(0), to=today();
  const [dr]=await Promise.all([api('/api/drivers')]);
  const drivers=dr.data||[];
  c.innerHTML=`<h2>${t("Driver Commission")}</h2>
  <div class="panel"><div class="form-grid">
    <label>${t("From")}<input id="dcFrom" type="date" value="${from}"></label>
    <label>${t("To")}<input id="dcTo" type="date" value="${to}"></label>
    <label>${L("Driver","المندوب")}<select id="dcDriver"><option value="">${L("Select driver","اختر المندوب")}</option>${drivers.map(r=>`<option value="${esc(r.id)}">${esc(r.name||"")} — ${esc(r.driver_no||"")}</option>`).join("")}</select></label>
  </div><div class="actions"><button onclick="loadDriverCommission()">${t("Search")}</button><button class="ghost" onclick="printArea('driverCommissionResult',${JSON.stringify(L('Driver Commission','عمولة المندوب'))})">${t("Print / PDF")}</button></div></div>
  <div id="driverCommissionResult"></div>`;
}
function driverCommissionTable(rows){
  if(!rows.length)return `<div class="panel"><p class="muted">${L("No commission records found","لا توجد بيانات في الفترة المحددة")}</p></div>`;
  const byDate=new Map(); rows.forEach(r=>{if(!byDate.has(r.work_date))byDate.set(r.work_date,[]);byDate.get(r.work_date).push(r);});
  let html='';
  for(const [date,items] of byDate){html+=`<div class="panel commission-sheet"><h3>${L("Date","التاريخ")}: ${esc(date)}</h3><div class="table-wrap"><table><thead><tr><th>${L("Delivery","التسليم")}</th><th>${L("Collections","الإحضارات")}</th><th>${L("Total","الإجمالي")}</th></tr></thead><tbody>${items.map(r=>`<tr><td><b>${Number(r.delivery_orders||0)}</b></td><td><b>${Number(r.scan_orders||0)}</b></td><td><b>${Number(r.total_orders||0)}</b></td></tr>`).join('')}</tbody></table></div></div>`;}
  return html;
}
async function loadDriverCommission(){try{const driver=$('dcDriver').value;if(!driver)return msg('driverCommissionResult',L('Select a driver first','اختر المندوب أولاً'),'error');const from=$('dcFrom').value,to=$('dcTo').value;const q=`/api/driver-commissions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&driver_id=${encodeURIComponent(driver)}`;const d=await api(q);$('driverCommissionResult').innerHTML=driverCommissionTable(d.data||[]);}catch(e){msg('driverCommissionResult',e.message,'error');}}

async function ordersVerificationPage(c){
  const drivers=(await api("/api/drivers").catch(()=>({data:[]}))).data||[];
  c.innerHTML=`<div class="verification-page">
    <div class="verification-header"><div><h2>${t("Orders Verification")}</h2><p class="muted">${L("Review current courier statement orders and verify eligible statuses only.","راجع أوردرات كشف المندوب الحالي واعتمد الحالات المسموح بها فقط.")}</p></div><button id="verifyAllBtn" onclick="verifyAllOrdersVerification()">✓ ${t("Verify All")}</button></div>
    <div class="panel verification-toolbar"><div class="verification-filters">
      <label>${L("Search orders...","بحث في الأوردرات...")}<input id="ovSearch" placeholder="Order ID / Tracking / Customer" oninput="loadOrdersVerification()"></label>
      <label>${L("Driver","المندوب")}<select id="ovDriver" onchange="loadOrdersVerification()"><option value="">${t("All Drivers")}</option>${drivers.map(d=>`<option value="${esc(d.id)}">${esc(d.name||"")} ${d.driver_no?`— ${esc(d.driver_no)}`:""}</option>`).join("")}</select></label>
      <label>${L("Status","الحالة")}<select id="ovStatus" onchange="loadOrdersVerification()"><option value="all">${t("All Statuses")}</option><option value="Delivered">Delivered</option><option value="Half Delivered">Half Delivered</option><option value="Cancelled by Shipper">Cancelled by Shipper</option><option value="Cancelled by Receiver">Cancelled by Receiver</option><option value="Replaced">Replaced</option><option value="In Ops">In Ops</option></select></label>
      <label>${L("Verification","الاعتماد")}<select id="ovVerification" onchange="loadOrdersVerification()"><option value="all">${t("All Verification")}</option><option value="verified">${t("Verified")}</option><option value="unverified">${t("Unverified")}</option></select></label>
    </div></div>
    <div id="ordersVerificationMsg" class="msg"></div><div id="ordersVerificationTable"></div>
    <div class="panel accounting-linked-panel" id="driverExpensesSection">
      <div class="section-title-row"><div><h3>${L("Driver Expenses","مصروفات المندوب")}</h3><p class="muted">${L("Add, edit and manage driver expenses directly below Order Verification.","إضافة وتعديل وإدارة مصروفات السائقين مباشرة أسفل مراجعة واعتماد الأوردرات.")}</p></div><button class="ghost" onclick="renderOrdersVerificationDriverExpenses()">↻ ${L("Refresh","تحديث")}</button></div>
      <div class="accounting-section-divider"></div>
      <div id="ovDriverExpenses"></div>
    </div>
  </div>`;
  await loadOrdersVerification();
  await renderOrdersVerificationDriverExpenses();
}

let ORDERS_VERIFICATION_CACHE=[];
async function loadOrdersVerification(){
  try{
    const q=$("ovSearch")?.value||"",driver=$("ovDriver")?.value||"",status=$("ovStatus")?.value||"all",verification=$("ovVerification")?.value||"all";
    const d=await api(`/api/orders-verification?q=${encodeURIComponent(q)}&driver_id=${encodeURIComponent(driver)}&status=${encodeURIComponent(status)}&verification=${encodeURIComponent(verification)}`);
    ORDERS_VERIFICATION_CACHE=d.data||[];
    const eligible=ORDERS_VERIFICATION_CACHE.filter(r=>isVerificationEligibleStatus(r.status));
    const verified=ORDERS_VERIFICATION_CACHE.filter(r=>r.verification_status==='verified');
    const unverified=ORDERS_VERIFICATION_CACHE.filter(r=>r.verification_status!=='verified');
    const rows=ORDERS_VERIFICATION_CACHE.map(r=>{
      const eligibleState=isVerificationEligibleStatus(r.status), verifiedState=r.verification_status==='verified';
      const badge=verifiedState?`<span class="verify-badge verified-badge">✓ ${t("Verified")}</span>`:`<span class="verify-badge unverified-badge">${t("Unverified")}</span>`;
      return `<tr class="${verifiedState?'verify-row-verified':eligibleState?'verify-row-unverified':'verify-row-ineligible'}">
        <td><b>${esc(r.order_code||r.tracking_number||r.id||'')}</b></td><td>${esc(r.customer_name||'')}<small class="muted">${r.customer_phone?`<br>${esc(r.customer_phone)}`:''}</small></td><td>${money(r.cod??r.order_amount??0)}</td><td><span class="badge">${esc(r.status||'')}</span></td><td>${badge}</td><td>${esc(r.driver_name||'')}</td>
        <td><div class="actions verification-actions"><button class="mini-btn ghost" title="${t("Edit")}" onclick="openOrder('${esc(r.id)}','accounting')"></button><button class="mini-btn danger" title="${t("Remove from Statement")}" onclick="removeVerificationOrder('${esc(r.id)}')"></button></div></td>
      </tr>`;
    }).join('');
    $("ordersVerificationTable").innerHTML=`<div class="grid verify-stats"><div class="stat"><span>${L("Current Statement","الكشف الحالي")}</span><b>${ORDERS_VERIFICATION_CACHE.length}</b></div><div class="stat"><span>${L("Eligible","مسموح بالاعتماد")}</span><b>${eligible.length}</b></div><div class="stat verify-stat-green"><span>${t("Verified")}</span><b>${verified.length}</b></div><div class="stat verify-stat-red"><span>${t("Unverified")}</span><b>${unverified.length}</b></div></div>
    <div class="panel"><div class="table-wrap"><table class="orders-verification-table"><thead><tr><th>Order ID</th><th>${t("Customer")}</th><th>COD Amount</th><th>${t("Status")}</th><th>${t("Verification")}</th><th>${L("Driver","المندوب")}</th><th>${L("Actions","الإجراءات")}</th></tr></thead><tbody>${rows||`<tr><td colspan="7" class="muted">${t("No data")}</td></tr>`}</tbody></table></div></div>`;
  }catch(e){msg("ordersVerificationMsg",e.message,"error");}
}
function isVerificationEligibleStatus(status){return ['delivered','half delivered','cancelled by shipper','cancelled by receiver','replaced'].includes(String(status||'').trim().toLowerCase().replace(/_/g,' '));}
async function verifyAllOrdersVerification(){
  const ids=ORDERS_VERIFICATION_CACHE.filter(r=>isVerificationEligibleStatus(r.status)&&r.verification_status!=='verified').map(r=>r.id);
  if(!ids.length)return msg('ordersVerificationMsg',L('No eligible unverified orders found.','لا توجد أوردرات مسموح بها وغير معتمدة.'),'warn');
  const btn=$("verifyAllBtn"); if(btn)btn.disabled=true;
  try{const d=await api('/api/orders-verification/verify',{method:'POST',body:JSON.stringify({order_ids:ids})});msg('ordersVerificationMsg',`${t('Orders verified successfully.')} (${d.count||0})`,'ok');await loadOrdersVerification();}
  catch(e){msg('ordersVerificationMsg',e.message,'error');}
  finally{if(btn)btn.disabled=false;}
}
async function removeVerificationOrder(id){
  if(!confirm(`${t('Remove Order from Statement?')}\n\n${t('This order will be moved to In Ops and removed from the courier statement.')}\n\n${t('Financial records already settled will remain unchanged.')}`))return;
  try{await api('/api/orders-verification/remove',{method:'POST',body:JSON.stringify({id})});msg('ordersVerificationMsg',L('Order removed from statement successfully.','تم إخراج الأوردر من كشف المندوب بنجاح.'),'ok');await loadOrdersVerification();}
  catch(e){msg('ordersVerificationMsg',e.message,'error');}
}


async function renderOrdersVerificationDriverExpenses(){
  const box=$("ovDriverExpenses"); if(!box)return;
  try{
    const [ed,dd]=await Promise.all([api('/api/expenses'),api('/api/drivers')]);
    const expenses=ed.data||[], drivers=dd.data||[];
    const total=expenses.reduce((s,e)=>s+Number(e.amount||0),0);
    const fuel=expenses.filter(e=>['petrol','fuel'].includes(String(e.expense_type||'').toLowerCase())).reduce((s,e)=>s+Number(e.amount||0),0);
    const maintenance=expenses.filter(e=>String(e.expense_type||'').toLowerCase().includes('maint')).reduce((s,e)=>s+Number(e.amount||0),0);
    const other=Math.max(0,total-fuel-maintenance);
    const recent=[...expenses].sort((a,b)=>String(b.expense_date||b.created_at||'').localeCompare(String(a.expense_date||a.created_at||''))).slice(0,50);
    const maxDay=Math.max(1,...Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const key=d.toISOString().slice(0,10);return expenses.filter(e=>String(e.expense_date||'')===key).reduce((s,e)=>s+Number(e.amount||0),0);}));
    const bars=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const key=d.toISOString().slice(0,10);const val=expenses.filter(e=>String(e.expense_date||'')===key).reduce((s,e)=>s+Number(e.amount||0),0);return `<div class="expense-bar-col"><div class="expense-bar-value">${money(val,{digits:0})}</div><div class="expense-bar" style="height:${Math.max(6,(val/maxDay)*150)}px"></div><small>${key.slice(5)}</small></div>`;}).join('');
    box.innerHTML=`
      <div class="de-stats">
        <div class="de-card"><span>${L('Total Expenses','إجمالي المصروفات')}</span><b>${money(total)}</b></div>
        <div class="de-card"><span>${L('Fuel Expenses','مصروف البنزين')}</span><b>${money(fuel)}</b></div>
        <div class="de-card"><span>${L('Maintenance','الصيانة')}</span><b>${money(maintenance)}</b></div>
        <div class="de-card"><span>${L('Fines & Other','مخالفات وأخرى')}</span><b>${money(other)}</b></div>
      </div>
      <div class="de-panel"><div class="de-panel-title"><h3>${L('Expenses Overview','نظرة عامة على المصروفات')}</h3><span class="de-legend"><i></i> ${L('Daily total','إجمالي اليوم')}</span></div><div class="de-chart">${bars}</div></div>
      <div class="de-panel"><div class="de-panel-title"><h3>${L('Recent Driver Expenses','آخر مصروفات السائقين')}</h3><button class="de-primary de-small" onclick="showDriverExpenseForm()">＋ ${L('Add Expense','إضافة مصروف')}</button></div>
        <div class="table-wrap"><table class="driver-expenses-admin-table"><thead><tr><th>#</th><th>${L('Driver','السائق')}</th><th>${L('Type','النوع')}</th><th>${L('Amount','المبلغ')}</th><th>${L('Date','التاريخ')}</th><th>${L('Notes','ملاحظات')}</th><th>${L('Actions','الإجراءات')}</th></tr></thead><tbody>${recent.length?recent.map((e,i)=>{const d=drivers.find(x=>String(x.id)===String(e.driver_id));const type=String(e.expense_type||'other');return `<tr><td>${i+1}</td><td>${esc(d?.name||'—')}</td><td><span class="expense-badge ${esc(type)}">${esc(type)}</span></td><td>${money(e.amount||0)}</td><td>${esc(e.expense_date||'')}</td><td>${esc(e.details||e.notes||'')}</td><td><button class="mini-btn ghost" onclick='editDriverExpense(${JSON.stringify(e).replace(/'/g,"&#39;")})'>${L('Edit','تعديل')}</button> <button class="mini-btn danger" onclick="deleteDriverExpense('${esc(e.id)}')">${L('Delete','حذف')}</button></td></tr>`;}).join(''):`<tr><td colspan="7" class="muted">${L('No expenses found','لا توجد مصروفات')}</td></tr>`}</tbody></table></div>
      </div>
      <div class="de-panel de-form-panel" id="driverExpenseForm" style="display:none"><div class="de-panel-title"><h3 id="driverExpenseFormTitle">${L('Add / Edit Expense','إضافة / تعديل مصروف')}</h3></div><input type="hidden" id="deId"><div class="form-grid"><label>${L('Driver','السائق')} *<select id="deDriver"><option value="">${L('Select driver','اختر السائق')}</option>${drivers.map(d=>`<option value="${esc(d.id)}">${esc(d.name||'')} ${d.driver_no?`— ${esc(d.driver_no)}`:''}</option>`).join('')}</select></label><label>${L('Type','النوع')} *<select id="deType"><option value="petrol">${L('Fuel','بنزين')}</option><option value="maintenance">${L('Maintenance','صيانة')}</option><option value="fine">${L('Fine','مخالفة')}</option><option value="other">${L('Other','أخرى')}</option></select></label><label>${L('Amount','المبلغ')} * <small class="muted">${currencyInfo().symbol}</small><input id="deAmount" type="number" min="0" step="0.01"></label><label>${L('Date','التاريخ')} *<input id="deDate" type="date" value="${today()}"></label><label class="full">${L('Notes','ملاحظات')}<input id="deNotes"></label></div><div class="actions"><button class="ghost" onclick="hideDriverExpenseForm()">${L('Cancel','إلغاء')}</button><button onclick="saveDriverExpense()">${L('Save','حفظ')}</button></div><div id="deMsg" class="msg"></div></div>`;
  }catch(e){box.innerHTML=`<div class="panel"><span class="error">${esc(e.message)}</span></div>`;}
}

async function loadOrdersVerificationDriverExpenses(){
  try{
    const d=await api(`/api/accounting/driver-expenses-summary?from=${encodeURIComponent(today())}&to=${encodeURIComponent(today())}&driver_id=`);
    const rows=d.data||[];
    const totalFuel=rows.reduce((sum,r)=>sum+Number(r.fuel_expense||0),0), totalOther=rows.reduce((sum,r)=>sum+Number(r.other_expenses||0),0), totalNet=rows.reduce((sum,r)=>sum+Number(r.net_commission||0),0);
    const box=$("ovDriverExpenses"); if(!box)return;
    box.innerHTML=`<div class="grid verify-stats"><div class="stat"><span>${L("Drivers with activity","مندوبون لديهم حركة")}</span><b>${rows.length}</b></div><div class="stat"><span>${L("Fuel Expenses","مصروف البنزين")}</span><b>${money(totalFuel)}</b></div><div class="stat"><span>${L("Other Expenses","مصروفات أخرى")}</span><b>${money(totalOther)}</b></div><div class="stat verify-stat-green"><span>${L("Net Commission","صافي كشف المندوب")}</span><b>${money(totalNet)}</b></div></div>
    ${rows.length?`<div class="table-wrap"><table class="driver-expenses-linked-table"><thead><tr><th>${L("Driver","المندوب")}</th><th>${L("Verified Orders","الأوردرات المعتمدة")}</th><th>${L("Service Charges","رسوم الخدمة")}</th><th>${L("Fuel Expense","بنزين")}</th><th>${L("Other Expenses","مصروفات أخرى")}</th><th>${L("Net Commission","صافي الكشف")}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.driver_name||"—")}</b>${r.driver_no?`<small class="muted"><br>${esc(r.driver_no)}</small>`:""}</td><td>${Number(r.verified_orders||0)}</td><td>${money(r.service_charges||0)}</td><td>− ${money(r.fuel_expense||0)}</td><td>− ${money(r.other_expenses||0)}</td><td><b>${money(r.net_commission||0)}</b></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">${L("No verified orders or expenses found for today.","لا توجد أوردرات معتمدة أو مصروفات للمندوبين اليوم.")}</p>`}`;
  }catch(e){msg("ovDriverExpenses",e.message,"error");}
}

async function accountingPage(c){
  try{
    const [summary,dr]=await Promise.all([api("/api/accounting/summary"),api("/api/drivers")]);
    const x=summary.data||{}, drivers=dr.data||[];
    c.innerHTML=`<h2>${t("Accounting")}</h2>
      <div class="grid">${stat(L("Orders","الأوردرات"),x.totalOrders||0)}${stat(L("Order Value","قيمة الأوردرات"),money(x.orderValue||0))}${stat(L("Delivery Fees","رسوم التوصيل"),money(x.deliveryFees||0))}${stat(L("Taxes","الضرائب"),money(x.taxes||0))}${stat(L("Merchant Net","صافي التجار"),money(x.merchantNet||0))}</div>
      <div class="panel accounting-linked-panel" id="accountingVerificationPanel">
        <div class="section-title-row"><div><h3>${L("Order Verification","مراجعة واعتماد الأوردرات")}</h3><p class="muted">${L("Verify orders first, then the same verified orders feed the driver expenses calculation below.","اعتمد الأوردرات أولاً، ثم تُستخدم نفس الأوردرات المعتمدة في حساب كشف ومصروفات المندوب بالأسفل.")}</p></div></div>
        <div class="form-grid">
          <label>${t("From")}<input id="accVerifyFrom" type="date" value="${daysAgo(7)}"></label>
          <label>${t("To")}<input id="accVerifyTo" type="date" value="${today()}"></label>
          <label>${L("Driver","المندوب")}<select id="accVerifyDriver"><option value="">${L("All Drivers","كل المندوبين")}</option>${drivers.map(d=>`<option value="${esc(d.id)}">${esc(d.name||"")} — ${esc(d.driver_no||"")}</option>`).join("")}</select></label>
          <label>${L("Search","بحث")}<input id="accVerifySearch" placeholder="Job Code / Shipper / Order / Tracking"></label>
        </div>
        <div class="actions" style="margin-top:10px"><button onclick="loadAccountingVerifyOrders()">${L("Show Orders","عرض الأوردرات")}</button><button class="ghost" onclick="verifySelectedAccountingOrders()">✓ ${L("Verify Selected","اعتماد المحدد")}</button></div>
        <div id="accVerifyMsg" class="msg"></div>
        <div id="accVerifyOrders"></div>
        <div class="accounting-section-divider"></div>
        <div class="section-title-row" id="driverExpensesSection"><div><h3>${L("Driver Expenses","مصروفات المندوب")}</h3><p class="muted">${L("Linked automatically to verified orders. Fuel and other expenses are deducted from the driver's service-charge statement.","مرتبطة تلقائياً بالأوردرات المعتمدة. يتم خصم البنزين وأي مصروفات أخرى من كشف المندوب.")}</p></div><button class="ghost" onclick="loadAccountingDriverExpenses()">↻ ${L("Refresh","تحديث")}</button></div>
        <div id="accDriverExpenses"></div>
      </div>`;
    await loadAccountingVerifyOrders();
    await loadAccountingDriverExpenses();
  }catch(e){c.innerHTML=`<div class="panel"><span class="error">${esc(e.message)}</span></div>`;}
}
async function loadAccountingVerifyOrders(){
  try{
    const from=$("accVerifyFrom")?.value||"", to=$("accVerifyTo")?.value||"", driver=$("accVerifyDriver")?.value||"", q=$("accVerifySearch")?.value||"";
    const d=await api(`/api/accounting/verify-orders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&driver_id=${encodeURIComponent(driver)}&q=${encodeURIComponent(q)}`);
    const rows=d.data||[];
    const eligible=rows.filter(r=>r.eligible), verified=rows.filter(r=>r.verify_status==='verified'||r.paid_status==='paid'), unverified=rows.filter(r=>r.eligible&&r.verify_status!=='verified'&&r.paid_status!=='paid');
    $("accVerifyOrders").innerHTML=`<div class="verify-legend"><span class="verify-dot verified-dot"></span> Verified <span class="verify-dot unverified-dot"></span> Unverified <span class="verify-note">${L("Only eligible orders can be Verified.","فقط الأوردرات المسموح بها يمكن اعتمادها.")}</span></div>
      <div class="grid verify-stats"><div class="stat"><span>${L("Orders","الأوردرات")}</span><b>${rows.length}</b></div><div class="stat"><span>${L("Eligible","مستحقة")}</span><b>${eligible.length}</b></div><div class="stat verify-stat-green"><span>Verified</span><b>${verified.length}</b></div><div class="stat verify-stat-red"><span>Unverified</span><b>${unverified.length}</b></div></div>
      ${rows.length?`<div class="table-wrap"><table class="accounting-verify-table unified-accounting-orders"><thead><tr><th><input type="checkbox" onclick="toggleAccountingVerify(this)"></th><th>${L("Job Code","كود المهمة")}</th><th>${L("Shipper","التاجر")}</th><th>${L("Shipper COD","COD التاجر")}</th><th>${L("Service charge","رسوم الخدمة")}</th><th>${L("Driver","المندوب")}</th><th>${t("Status")}</th><th>Verify</th><th>${L("Actions","الإجراءات")}</th></tr></thead><tbody>${rows.map(r=>{
        const verifiedState=r.verify_status==='verified'||r.paid_status==='paid';
        const eligibleState=!!r.eligible;
        const rowClass=verifiedState?'verify-row-verified':(eligibleState?'verify-row-unverified':'verify-row-ineligible');
        const badge=verifiedState?'<span class="verify-badge verified-badge">✓ Verified</span>':'<span class="verify-badge unverified-badge">✕ Unverified</span>';
        return `<tr class="${rowClass}"><td><input class="accounting-verify-check" type="checkbox" value="${esc(r.id)}" ${eligibleState&&!verifiedState?'':'disabled'}></td><td><b>${esc(r.job_code||r.shipment_no||r.tracking_number||'—')}</b></td><td>${esc(r.shipper_name||'—')}</td><td>${money(r.shipper_cod??r.cod??0)}</td><td>${money(r.service_charges||0)}</td><td>${esc(r.driver_name||'—')} ${r.driver_no?`<small class="muted">— ${esc(r.driver_no)}</small>`:''}</td><td>${esc(r.status||'')}</td><td>${badge}</td><td><div class="actions verification-actions"><button class="mini-btn ghost" title="${L("Edit","تعديل")}" onclick="openOrder('${esc(r.id)}','accounting')"></button><button class="mini-btn danger" title="${L("Remove from Statement","إخراج من الكشف")}" onclick="removeAccountingVerificationOrder('${esc(r.id)}')"></button></div></td></tr>`;
      }).join('')}</tbody></table></div>`:`<p class="muted">${L("No orders found","لا توجد أوردرات")}</p>`}`;
  }catch(e){msg("accVerifyMsg",e.message,"error");}
}

async function removeAccountingVerificationOrder(id){
  if(!confirm(`${L('Remove Order from Statement?','إخراج الأوردر من كشف المندوب؟')}`))return;
  try{await api('/api/orders-verification/remove',{method:'POST',body:JSON.stringify({id})});await loadAccountingVerifyOrders();await loadAccountingDriverExpenses();}
  catch(e){alert(e.message);}
}
async function verifySelectedAccountingOrders(){
  const ids=[...document.querySelectorAll('.accounting-verify-check:checked')].map(x=>x.value);
  if(!ids.length)return msg('accVerifyMsg',L('Select eligible orders first','اختر الأوردرات المسموح لها أولاً'),'error');
  try{await api('/api/orders-verification/verify',{method:'POST',body:JSON.stringify({order_ids:ids})});msg('accVerifyMsg',L('Verified successfully','تم الاعتماد بنجاح'),'ok');await loadAccountingVerifyOrders();await loadAccountingDriverExpenses();}
  catch(e){msg('accVerifyMsg',e.message,'error');}
}
function toggleAccountingVerify(el){document.querySelectorAll('.accounting-verify-check:not(:disabled)').forEach(x=>x.checked=el.checked);}

async function loadAccountingDriverExpenses(){
  try{
    const from=$("accVerifyFrom")?.value||"", to=$("accVerifyTo")?.value||"", driver=$("accVerifyDriver")?.value||"";
    const d=await api(`/api/accounting/driver-expenses-summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&driver_id=${encodeURIComponent(driver)}`);
    const rows=d.data||[];
    const totalFuel=rows.reduce((s,r)=>s+Number(r.fuel_expense||0),0), totalOther=rows.reduce((s,r)=>s+Number(r.other_expenses||0),0), totalNet=rows.reduce((s,r)=>s+Number(r.net_commission||0),0);
    $("accDriverExpenses").innerHTML=`<div class="grid verify-stats"><div class="stat"><span>${L("Drivers with activity","مندوبون لديهم حركة")}</span><b>${rows.length}</b></div><div class="stat"><span>${L("Fuel Expenses","مصروف البنزين")}</span><b>${money(totalFuel)}</b></div><div class="stat"><span>${L("Other Expenses","مصروفات أخرى")}</span><b>${money(totalOther)}</b></div><div class="stat verify-stat-green"><span>${L("Net Commission","صافي كشف المندوب")}</span><b>${money(totalNet)}</b></div></div>
      ${rows.length?`<div class="table-wrap"><table class="driver-expenses-linked-table"><thead><tr><th>${L("Driver","المندوب")}</th><th>${L("Verified Orders","الأوردرات المعتمدة")}</th><th>${L("Service Charges","رسوم الخدمة")}</th><th>${L("Fuel Expense","بنزين")}</th><th>${L("Other Expenses","مصروفات أخرى")}</th><th>${L("Net Commission","صافي الكشف")}</th><th>${L("Edit","تعديل")}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.driver_name||'—')}</b>${r.driver_no?`<small class="muted"><br>${esc(r.driver_no)}</small>`:''}</td><td>${Number(r.verified_orders||0)}</td><td>${money(r.service_charges||0)}</td><td class="fuel-deduction">− ${money(r.fuel_expense||0)}</td><td>− ${money(r.other_expenses||0)}</td><td><b>${money(r.net_commission||0)}</b></td><td><button class="mini-btn ghost" title="${L("Open Driver Expenses","فتح مصروفات المندوب")}" onclick="openDriverExpensesFromAccounting('${esc(r.driver_id)}')"></button></td></tr>`).join('')}</tbody></table></div>`:`<p class="muted">${L("No verified orders or expenses found for this period.","لا توجد أوردرات معتمدة أو مصروفات للمندوبين خلال الفترة المحددة.")}</p>`}`;
  }catch(e){const el=$("accDriverExpenses");if(el)el.innerHTML=`<div class="msg error">${esc(e.message)}</div>`;}
}
async function openDriverExpensesFromAccounting(driverId){try{if(CURRENT_PAGE!=="accounting")await show("accounting");const el=$("accVerifyDriver");if(el){el.value=driverId;await loadAccountingVerifyOrders();await loadAccountingDriverExpenses();}document.getElementById("driverExpensesSection")?.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){alert(e.message);}}


async function driverExpensesPage(c){
  try{
    const [ed,dd]=await Promise.all([api('/api/expenses'),api('/api/drivers')]);
    const expenses=ed.data||[], drivers=dd.data||[];
    const escv=v=>esc(v??'');
    const total=expenses.reduce((s,e)=>s+Number(e.amount||0),0);
    const fuel=expenses.filter(e=>String(e.expense_type||'').toLowerCase()==='petrol'||String(e.expense_type||'').toLowerCase()==='fuel').reduce((s,e)=>s+Number(e.amount||0),0);
    const maintenance=expenses.filter(e=>String(e.expense_type||'').toLowerCase().includes('maint')).reduce((s,e)=>s+Number(e.amount||0),0);
    const other=Math.max(0,total-fuel-maintenance);
    const recent=[...expenses].sort((a,b)=>String(b.expense_date||b.created_at||'').localeCompare(String(a.expense_date||a.created_at||''))).slice(0,50);
    const maxDay=Math.max(1,...Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const key=d.toISOString().slice(0,10);return expenses.filter(e=>String(e.expense_date||'')===key).reduce((s,e)=>s+Number(e.amount||0),0);}));
    const bars=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const key=d.toISOString().slice(0,10);const val=expenses.filter(e=>String(e.expense_date||'')===key).reduce((s,e)=>s+Number(e.amount||0),0);return `<div class="expense-bar-col"><div class="expense-bar-value">${money(val,{digits:0})}</div><div class="expense-bar" style="height:${Math.max(6,(val/maxDay)*150)}px"></div><small>${key.slice(5)}</small></div>`;}).join('');
    c.innerHTML=`<div class="de-page">
      <div class="de-breadcrumb">⌂ &nbsp; ${L('Accounting','الحسابات')} &nbsp;›&nbsp; ${L('Driver Expenses','مصروفات السائقين')}</div>
      <div class="de-title-row"><div><h2>${L('Driver Expenses','مصروفات السائقين')}</h2><p class="muted">${L('Track and manage driver expenses (fuel, maintenance, fines, etc.).','متابعة وإدارة مصروفات السائقين مثل البنزين والصيانة والمخالفات وغيرها.')}</p></div><button class="de-primary" onclick="showDriverExpenseForm()">＋ ${L('Add Expense','إضافة مصروف')}</button></div>
      <div class="de-stats">
        <div class="de-card"><span>${L('Total Expenses','إجمالي المصروفات')}</span><b>${money(total)}</b></div>
        <div class="de-card"><span>${L('Fuel Expenses','مصروف البنزين')}</span><b>${money(fuel)}</b></div>
        <div class="de-card"><span>${L('Maintenance','الصيانة')}</span><b>${money(maintenance)}</b></div>
        <div class="de-card"><span>${L('Fines & Other','مخالفات وأخرى')}</span><b>${money(other)}</b></div>
      </div>
      <div class="de-panel"><div class="de-panel-title"><h3>${L('Expenses Overview','نظرة عامة على المصروفات')}</h3><span class="de-legend"><i></i> ${L('Daily total','إجمالي اليوم')}</span></div><div class="de-chart">${bars}</div></div>
      <div class="de-panel"><div class="de-panel-title"><h3>${L('Recent Driver Expenses','آخر مصروفات السائقين')}</h3><button class="de-primary de-small" onclick="showDriverExpenseForm()">＋ ${L('Add Expense','إضافة مصروف')}</button></div>
        <div class="table-wrap"><table class="driver-expenses-admin-table"><thead><tr><th>#</th><th>${L('Driver','السائق')}</th><th>${L('Type','النوع')}</th><th>${L('Amount','المبلغ')}</th><th>${L('Date','التاريخ')}</th><th>${L('Notes','ملاحظات')}</th><th>${L('Actions','الإجراءات')}</th></tr></thead><tbody>${recent.length?recent.map((e,i)=>{const d=drivers.find(x=>String(x.id)===String(e.driver_id));const type=String(e.expense_type||'other');return `<tr><td>${i+1}</td><td>${escv(d?.name||'—')}</td><td><span class="expense-badge ${type}">${escv(type)}</span></td><td>${money(e.amount||0)}</td><td>${escv(e.expense_date||'')}</td><td>${escv(e.details||e.notes||'')}</td><td><button class="mini-btn ghost" onclick='editDriverExpense(${JSON.stringify(e).replace(/'/g,"&#39;")})'>${L('Edit','تعديل')}</button> <button class="mini-btn danger" onclick="deleteDriverExpense('${escv(e.id)}')">${L('Delete','حذف')}</button></td></tr>`;}).join(''):`<tr><td colspan="7" class="muted">${L('No expenses found','لا توجد مصروفات')}</td></tr>`}</tbody></table></div>
      </div>
      <div class="de-panel de-form-panel" id="driverExpenseForm" style="display:none"><div class="de-panel-title"><h3 id="driverExpenseFormTitle">${L('Add / Edit Expense','إضافة / تعديل مصروف')}</h3></div><input type="hidden" id="deId"><div class="form-grid"><label>${L('Driver','السائق')} *<select id="deDriver"><option value="">${L('Select driver','اختر السائق')}</option>${drivers.map(d=>`<option value="${escv(d.id)}">${escv(d.name||'')} ${d.driver_no?`— ${escv(d.driver_no)}`:''}</option>`).join('')}</select></label><label>${L('Type','النوع')} *<select id="deType"><option value="petrol">${L('Fuel','بنزين')}</option><option value="maintenance">${L('Maintenance','صيانة')}</option><option value="fine">${L('Fine','مخالفة')}</option><option value="other">${L('Other','أخرى')}</option></select></label><label>${L('Amount','المبلغ')} * <small class="muted">${currencyInfo().symbol}</small><input id="deAmount" type="number" min="0" step="0.01"></label><label>${L('Date','التاريخ')} *<input id="deDate" type="date" value="${today()}"></label><label class="full">${L('Notes','ملاحظات')}<input id="deNotes"></label></div><div class="actions"><button class="ghost" onclick="hideDriverExpenseForm()">${L('Cancel','إلغاء')}</button><button onclick="saveDriverExpense()">${L('Save','حفظ')}</button></div><div id="deMsg" class="msg"></div></div>
    </div>`;
  }catch(e){c.innerHTML=`<div class="panel"><span class="error">${esc(e.message)}</span></div>`;}
}
function showDriverExpenseForm(){const f=$("driverExpenseForm");if(f)f.style.display='block';window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});}
function hideDriverExpenseForm(){const f=$("driverExpenseForm");if(f)f.style.display='none';$("deId")&&($("deId").value='');}
function editDriverExpense(e){showDriverExpenseForm();$("deId").value=e.id||'';$("deDriver").value=e.driver_id||'';$("deType").value=e.expense_type||'other';$("deAmount").value=moneyInput(e.amount);$("deDate").value=e.expense_date||today();$("deNotes").value=e.details||e.notes||'';$("driverExpenseFormTitle").textContent=L('Edit Expense','تعديل المصروف');}
async function saveDriverExpense(){const id=$("deId")?.value||'';const body={driver_id:$("deDriver")?.value||null,expense_type:$("deType")?.value||'other',category:'expense',amount:baseAmount($("deAmount")?.value||0),expense_date:$("deDate")?.value||today(),details:$("deNotes")?.value||''};if(!body.driver_id||body.amount<=0){msg('deMsg',L('Select a driver and enter a valid amount','اختر السائق وأدخل مبلغاً صحيحاً'),'error');return;}try{await api('/api/expenses',{method:id?'PATCH':'POST',body:JSON.stringify(id?{...body,id}:{...body})});if($("ovDriverExpenses")) await renderOrdersVerificationDriverExpenses(); else await show('driverExpenses');}catch(e){msg('deMsg',e.message,'error');}}
async function deleteDriverExpense(id){if(!confirm(L('Delete expense?','هل تريد حذف المصروف؟')))return;try{await api('/api/expenses',{method:'DELETE',body:JSON.stringify({id})});if($("ovDriverExpenses")) await renderOrdersVerificationDriverExpenses(); else await show('driverExpenses');}catch(e){alert(e.message);}}

async function settingsPage(c){
  const options=Object.values(CURRENCIES).map(cur=>`<option value="${cur.code}" ${cur.code===CURRENCY?"selected":""}>${cur.code} — ${LANG==="ar"?cur.nameAr:cur.nameEn} (${cur.symbol})</option>`).join("");
  c.innerHTML=`<h2>${t("Settings")}</h2><div class="panel settings-panel">
    <h3>${t("Currency")}</h3>
    <p class="muted">${L("Choose the currency used across the whole program. Amounts are stored in AED and converted for display/input.","اختر العملة المستخدمة في البرنامج بالكامل. يتم حفظ القيم الأساسية بالدرهم الإماراتي وتحويلها عند العرض والإدخال.")}</p>
    <label>${t("Display currency")}<select id="settingsCurrency">${options}</select></label>
    <p class="muted settings-note">${t("Exchange rates are based on AED")}. 1 AED = ${Object.values(CURRENCIES).map(cur=>`${cur.code} ${cur.rate}`).join(" · ")}</p>
    <div id="settingsMsg" class="msg"></div>
  </div>`;
  $("settingsCurrency")?.addEventListener("change",e=>{setCurrency(e.target.value);});
}

async function auditPage(c){const d=await api("/api/audit");c.innerHTML=`<h2>${t("Audit Log")}</h2><div class="panel">${table(d.data||[],["action","entity_type","entity_id","created_at"])}</div>`;}

async function employeesPage(c){
  const [u,r,p]=await Promise.all([api("/api/users"),api("/api/roles"),api("/api/permissions")]);
  const perms=p.data||[];
  const rolesList=r.data||[];
  const employees=u.data||[];

  // Always show the built-in roles, even if the database currently
  // contains only the "employee" role. Custom roles are added too.
  const builtInRoles=[
    ["admin","مدير النظام"],
    ["manager","مدير"],
    ["dispatcher","منسق التوصيل"],
    ["employee","موظف"],
    ["driver","سائق"]
  ];
  const seenRoles=new Set();
  const roleOptionParts=[];
  for(const [value,label] of builtInRoles){
    if(!seenRoles.has(value)){
      seenRoles.add(value);
      roleOptionParts.push(`<option value="${esc(value)}">${esc(label)}</option>`);
    }
  }
  for(const role of rolesList){
    const value=String(role.name||"").trim();
    if(value && !seenRoles.has(value)){
      seenRoles.add(value);
      roleOptionParts.push(`<option value="${esc(value)}">${esc(value)}</option>`);
    }
  }
  const roleOptions=roleOptionParts.join("");

  c.innerHTML=`<h2>${t("Employees & Permissions")}</h2>

  <div class="panel">
    <div class="section-title">
      <div>
        <h3>${t("Add Employee")}</h3>
      </div>
    </div>
    <div class="form-grid">
      <label>${t("Name")}<input id="un" autocomplete="name" placeholder="${esc(L("Employee name","اسم الموظف"))}"></label>
      <label>${t("Username")}<input id="uu" autocomplete="username" placeholder="${esc(L("Unique username","اسم مستخدم مميز"))}"></label>
      <label>${t("Password")}<input id="up" type="password" autocomplete="new-password" placeholder="${esc(L("Login password","كلمة مرور الدخول"))}"></label>
      <label>${t("Email")} <span class="muted">${L("(optional)","(اختياري)")}</span><input id="ue" type="email" autocomplete="email"></label>
      <label class="full">${t("Role")}<select id="ur">${roleOptions}</select></label>
    </div>
    <div class="employee-actions" style="margin-top:14px">
      <button onclick="addEmployee()">${t("Save")}</button>
      <button class="ghost" onclick="show('employees')">${L("Refresh","تحديث")}</button>
    </div>
    <div id="empMsg" class="msg"></div>
  </div>

  <div class="panel">
    <div class="section-title">
      <div>
        <h3>${L("Permission Groups","مجموعات الصلاحيات")}</h3>
        <div class="muted">${L("Create a group once, select the permissions, then assign it to employees.","أنشئ مجموعة مرة واحدة، اختر الصلاحيات، ثم عيّن المجموعة للموظفين.")}</div>
      </div>
    </div>
    <label>${L("Group name","اسم المجموعة")}<input id="roleName" placeholder="${esc(L("Example: Warehouse Manager","مثال: مشرف المخزن"))}"></label>
    <div class="permission-grid">
      ${perms.map(x=>`<label class="permission-item"><input type="checkbox" class="rolePerm" value="${esc(x.code)}"> <span>${esc(L(x.name_en||x.code,x.name_ar||x.code))}</span></label>`).join("")}
    </div>
    <button onclick="addRole()">${L("Create Permission Group","إنشاء مجموعة الصلاحيات")}</button>
    <div id="roleMsg" class="msg"></div>
    <div class="role-card-grid">
      ${rolesList.map(x=>`<div class="role-card"><strong>${esc(x.name)}</strong><small>${L("Can be assigned to employees from the field above.","يمكن اختيارها للموظفين من خانة الدور بالأعلى.")}</small></div>`).join("")}
    </div>
  </div>

  <div class="panel">
    <div class="section-title"><h3>${t("Employees & Permissions")}</h3><span class="badge">${employees.length}</span></div>
    ${employees.length?`<div class="table-wrap"><table><thead><tr><th>${L("Code","الكود")}</th><th>${t("Name")}</th><th>${t("Username")}</th><th>${t("Role")}</th><th>${t("Status")}</th><th>${L("Actions","الإجراءات")}</th></tr></thead><tbody>${employees.map(r=>`<tr><td><b>${esc(r.employee_code||"—")}</b></td><td>${esc(r.name||"")}</td><td>${esc(r.username||"")}</td><td>${esc(r.role||"")}</td><td>${r.active?`<span class="badge">${L("Active","نشط")}</span>`:`<span class="badge">${L("Inactive","متوقف")}</span>`}</td><td><div class="employee-actions"><button class="ghost" onclick="toggleEmployee('${esc(r.id)}',${r.active?'false':'true'})">${r.active?L("Disable","إيقاف"):L("Enable","تفعيل")}</button><button class="danger" onclick="deleteEmployee('${esc(r.id)}')">${L("Delete","حذف")}</button></div></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">${t("No data")}</p>`}
  </div>`;
}
async function addEmployee(){
  const name=$("un")?.value.trim();
  const username=$("uu")?.value.trim();
  const password=$("up")?.value||"";
  const email=$("ue")?.value.trim();
  const role=$("ur")?.value||"employee";
  if(!name||!username||!password)return msg("empMsg",L("Name, username and password are required","الاسم واسم المستخدم وكلمة المرور مطلوبة"),"error");
  if(password.length<6)return msg("empMsg",L("Password must be at least 6 characters","كلمة المرور يجب أن تكون 6 أحرف على الأقل"),"error");
  try{
    await api("/api/users",{method:"POST",body:JSON.stringify({name,username,email,password,role})});
    msg("empMsg",L("Employee created successfully. They can now log in with the username and password.","تم إنشاء الموظف بنجاح. يمكنه الآن الدخول باسم المستخدم وكلمة المرور."),"ok");
    ["un","uu","ue","up"].forEach(id=>{if($(id))$(id).value="";});
    setTimeout(()=>show("employees"),800);
  }catch(e){msg("empMsg",e.message,"error");}
}
async function toggleEmployee(id, active){
  const action=active?L("enable this employee?","تفعيل هذا الموظف؟"):L("disable this employee?","إيقاف هذا الموظف؟");
  if(!confirm(action))return;
  try{
    await api(`/api/users/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({active})});
    await show("employees");
  }catch(e){alert(e.message);}
}
async function deleteEmployee(id){
  if(!confirm(L("Delete this employee permanently?","حذف هذا الموظف نهائيًا؟")))return;
  try{
    await api(`/api/users/${encodeURIComponent(id)}`,{method:"DELETE"});
    await show("employees");
  }catch(e){alert(e.message);}
}

async function addRole(){
  const name=$("roleName")?.value.trim();
  const permissions=[...document.querySelectorAll(".rolePerm:checked")].map(x=>x.value);
  if(!name)return msg("roleMsg",L("Enter a group name","اكتب اسم المجموعة"),"error");
  if(!permissions.length)return msg("roleMsg",L("Choose at least one permission","اختر صلاحية واحدة على الأقل"),"error");
  try{
    await api("/api/roles",{method:"POST",body:JSON.stringify({name,permissions})});
    msg("roleMsg",L("Permission group created successfully","تم إنشاء مجموعة الصلاحيات بنجاح"),"ok");
    setTimeout(()=>show("employees"),700);
  }catch(e){msg("roleMsg",e.message,"error");}
}

let CHAT_ATTACHMENT=null;
let CHAT_MEDIA_RECORDER=null;
let CHAT_AUDIO_CHUNKS=[];

async function chatPage(c){
  const users=await api("/api/chat/users").catch(()=>({data:[]}));
  c.innerHTML=`<h2>${t("Employee Chat")}</h2><div class="panel chat-panel"><div class="row"><label>${L("To","إلى")}<select id="chatRecipient"><option value="">${L("All Employees","كل الموظفين")}</option>${(users.data||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.username||x.email||"")}</option>`).join("")}</select></label></div><div id="chatMessages" class="chat-messages"></div><div id="chatAttachmentPreview" class="chat-attachment-preview"></div><div class="row chat-compose"><input id="chatInput" placeholder="${esc(L("Write a message...","اكتب رسالة..."))}"><input id="chatImageInput" type="file" accept="image/*" hidden><button class="ghost" type="button" onclick="document.getElementById('chatImageInput')?.click()">📷 ${L("Photo","صورة")}</button><button class="ghost" type="button" id="chatRecordBtn" onclick="toggleChatRecording()">🎙️ ${L("Voice","صوت")}</button><button onclick="sendChat()">${t("Send")}</button></div></div>`;
  CHAT_ATTACHMENT=null;
  await loadChat(); if(CHAT_TIMER)clearInterval(CHAT_TIMER); CHAT_TIMER=setInterval(loadChat,5000);
  $("chatInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")sendChat();});
  $("chatImageInput")?.addEventListener("change",handleChatImage);
}

function setChatAttachment(data,type,name=""){
  CHAT_ATTACHMENT={data,type,name};
  const box=$("chatAttachmentPreview"); if(!box)return;
  box.innerHTML=type.startsWith("image/")?`<div class="chat-attachment-chip"><img src="${esc(data)}" alt="attachment"><span>${esc(name||L("Image","صورة"))}</span><button type="button" class="ghost" onclick="clearChatAttachment()">×</button></div>`:`<div class="chat-attachment-chip"><span>🎙️ ${esc(name||L("Voice message","رسالة صوتية"))}</span><button type="button" class="ghost" onclick="clearChatAttachment()">×</button></div>`;
}
function clearChatAttachment(){CHAT_ATTACHMENT=null;const box=$("chatAttachmentPreview");if(box)box.innerHTML="";const input=$("chatImageInput");if(input)input.value="";}
async function handleChatImage(e){
  const file=e.target.files?.[0]; if(!file)return;
  if(!file.type.startsWith("image/"))return alert(L("Please choose an image file","اختر صورة فقط"));
  try{
    const source=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=source;});
    const scale=Math.min(1,1200/Math.max(img.width,img.height));
    const canvas=document.createElement("canvas"); canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
    canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
    let data=canvas.toDataURL("image/jpeg",0.78);
    if(data.length>1.1*1024*1024)data=canvas.toDataURL("image/jpeg",0.62);
    if(data.length>1.8*1024*1024)return alert(L("Image is too large after compression","الصورة ما زالت كبيرة بعد الضغط"));
    setChatAttachment(data,"image/jpeg",file.name);
  }catch(_){alert(L("Could not read the image","تعذر قراءة الصورة"));}
}
async function toggleChatRecording(){
  const btn=$("chatRecordBtn");
  if(CHAT_MEDIA_RECORDER && CHAT_MEDIA_RECORDER.state!=="inactive"){ CHAT_MEDIA_RECORDER.stop(); if(btn)btn.textContent=`🎙️ ${L("Voice","صوت")}`; return; }
  if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)return alert(L("Voice recording is not supported on this device/browser","تسجيل الصوت غير مدعوم على هذا الجهاز أو المتصفح"));
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    CHAT_AUDIO_CHUNKS=[]; CHAT_MEDIA_RECORDER=new MediaRecorder(stream);
    CHAT_MEDIA_RECORDER.ondataavailable=e=>{if(e.data.size)CHAT_AUDIO_CHUNKS.push(e.data);};
    CHAT_MEDIA_RECORDER.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      const blob=new Blob(CHAT_AUDIO_CHUNKS,{type:CHAT_MEDIA_RECORDER.mimeType||"audio/webm"});
      if(blob.size>850*1024){alert(L("Voice message is too large","الرسالة الصوتية كبيرة جدًا"));return;}
      const r=new FileReader(); r.onload=()=>setChatAttachment(r.result,blob.type,"Voice message"); r.readAsDataURL(blob);
    };
    CHAT_MEDIA_RECORDER.start();
    if(btn)btn.textContent=`⏹️ ${L("Stop","إيقاف")}`;
  }catch(e){alert(L("Microphone permission was denied","تم رفض صلاحية الميكروفون"));}
}
function parseChatMessage(x){
  const raw=String(x.message||"");
  if(raw.startsWith("__ATTACHMENT__")){try{const a=JSON.parse(raw.slice(15));return {...x,attachment:a,text:a.text||""};}catch(_){}}
  return {...x,text:raw};
}
async function loadChat(){if(CURRENT_PAGE!=="chat")return;try{const d=await api("/api/chat");const box=$("chatMessages");if(!box)return;box.innerHTML=(d.data||[]).map(raw=>{const x=parseChatMessage(raw);const media=x.attachment?.type?.startsWith("image/")?`<img class="chat-image" src="${esc(x.attachment.data)}" alt="chat image">`:x.attachment?.type?.startsWith("audio/")?`<audio class="chat-audio" controls src="${esc(x.attachment.data)}"></audio>`:"";return `<div class="chat-message"><b>${esc(x.sender_name||"Employee")}</b><small>${esc((x.created_at||"").slice(0,16).replace("T"," "))}</small>${x.text?`<p>${esc(x.text)}</p>`:""}${media}</div>`;}).join("")||`<p class="muted">${t("No data")}</p>`;box.scrollTop=box.scrollHeight;}catch(e){console.warn(e.message);}}
async function sendChat(){
  const input=$("chatInput"),message=input?.value.trim()||"";
  if(!message && !CHAT_ATTACHMENT)return;
  try{
    const attachment=CHAT_ATTACHMENT?{type:CHAT_ATTACHMENT.type,data:CHAT_ATTACHMENT.data,name:CHAT_ATTACHMENT.name,text:message}:null;
    const payload=attachment?`__ATTACHMENT__${JSON.stringify(attachment)}`:message;
    await api("/api/chat",{method:"POST",body:JSON.stringify({message:payload,recipient_id:$("chatRecipient")?.value||null})});
    input.value=""; clearChatAttachment(); await loadChat();
  }catch(e){alert(e.message);}
}

function printArea(id,title){const el=$(id);if(!el)return;const w=window.open('','_blank','width=1000,height=800');if(!w)return;w.document.write(`<!doctype html><html dir="${LANG==='ar'?'rtl':'ltr'}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#172033}h2,h3{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ccc;padding:8px;text-align:right}button,input,select,.no-print{display:none!important}.panel{margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.stat{border:1px solid #ddd;padding:10px}.badge{border:1px solid #ccc;padding:3px 7px;border-radius:12px}@media print{body{padding:0}}</style></head><body><h2>${esc(title)}</h2>${el.innerHTML}</body></html>`);w.document.close();w.focus();setTimeout(()=>{w.print();w.close();},250);}
function table(rows,cols){if(!rows||!rows.length)return `<p class="muted">${t("No data")}</p>`;return `<div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c]??"")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;}

function exportRowsExcel(rows,name="export"){
  if(typeof XLSX==="undefined")return alert(L("Excel library did not load","مكتبة Excel لم تعمل"));
  const moneyKeys=new Set(["value","delivery_fee","service_charges","amount","tax_amount","merchant_net_value","orderValue","deliveryFees","taxes","merchantNet","fuel_expense","other_expenses","net_commission","expenseTotal","shortageTotal","required","base_delivery_fee"]);
  const prepared=(rows||[]).map(row=>Object.fromEntries(Object.entries(row||{}).map(([k,v])=>[k,moneyKeys.has(k)&&typeof v==="number"?money(v):v])));
  const ws=XLSX.utils.json_to_sheet(prepared),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Data");XLSX.writeFile(wb,`${name}-${today()}.xlsx`);
}
function printRowsPDF(rows,title){
  const keys=[...new Set((rows||[]).flatMap(x=>Object.keys(x||{})))];
  const moneyKeys=new Set(["value","delivery_fee","service_charges","amount","tax_amount","merchant_net_value","orderValue","deliveryFees","taxes","merchantNet","fuel_expense","other_expenses","net_commission","expenseTotal","shortageTotal","required","base_delivery_fee"]);
  const html=`<!doctype html><html dir="${LANG==="ar"?"rtl":"ltr"}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:7px;text-align:${LANG==="ar"?"right":"left"} }</style></head><body><h2>${esc(title)}</h2><table><thead><tr>${keys.map(k=>`<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${(rows||[]).map(r=>`<tr>${keys.map(k=>`<td>${esc(moneyKeys.has(k)&&typeof r[k]==="number"?money(r[k]):(r[k]??""))}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`;
  const w=window.open("","_blank");if(!w)return alert(L("Allow popups to print/save PDF","اسمح بالنوافذ المنبثقة للطباعة وحفظ PDF"));w.document.write(html);w.document.close();
}

Object.assign(window,{login,logout,toggleLang,show,quickSearch,doSearch,openOrder,saveOrder,updateOrderFromForm,loadShipments,setStatus,createJob,saveJobCode,addMerchant,editMerchant,addGovernorate,addArea,importAreasExcel,saveExpense,addEmployee,toggleEmployee,deleteEmployee,addRole,importOrdersExcel,sendChat,clearChatAttachment,toggleChatRecording,exportRowsExcel,printRowsPDF,exportShipmentsExcel,exportShipmentsPDF,testWoo,importWoo,addWooIntegration});

document.addEventListener("DOMContentLoaded",async()=>{
  applyLanguage();
  [$("username"),$("password")].forEach(el=>el?.addEventListener("keydown",e=>{if(e.key==="Enter")login();}));
  if(TOKEN){
    $("login")?.classList.add("hidden");
    $("login")?.setAttribute("style","display:none!important");
    $("app")?.classList.add("hidden");
    $("app")?.setAttribute("style","display:none!important");
    try{
      const me=await api("/api/me");
      CURRENT_USER=me.user||null;
      applyLanguage();
      updateCurrentUserUI();
      await show("dashboard");
      $("app")?.classList.remove("hidden");
      $("app")?.setAttribute("style","display:block!important");
    }catch(_){
      TOKEN="";
      CURRENT_USER=null;
      localStorage.removeItem("trend_token");
      $("login")?.classList.remove("hidden");
      $("login")?.setAttribute("style","display:flex!important");
      $("app")?.classList.add("hidden");
      $("app")?.setAttribute("style","display:none!important");
    }
  }else{
    CURRENT_USER=null;
    $("login")?.classList.remove("hidden");
    $("login")?.setAttribute("style","display:flex!important");
    $("app")?.classList.add("hidden");
    $("app")?.setAttribute("style","display:none!important");
  }
});
