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
    "Governorates & Areas":"الإمارات والمناطق","Accounting":"الحسابات","Orders Verification":"مراجعة واعتماد الأوردرات","Verify":"اعتماد","Verify All":"اعتماد الكل","Verified":"تم الاعتماد","Unverified":"غير معتمد","Remove from Statement":"إخراج من كشف المندوب","Remove Order from Statement?":"إخراج الأوردر من كشف المندوب؟","This order will be moved to In Ops and removed from the courier statement.":"سيتم تحويل الأوردر إلى In Ops وإخراجه من كشف المندوب.","Confirm":"تأكيد","Cancel":"إلغاء","All Statuses":"كل الحالات","All Verification":"كل حالات الاعتماد","All Drivers":"كل المندوبين","Orders verified successfully.":"تم اعتماد الأوردرات بنجاح.","Driver Commission":"عمولة المناديب","Driver Expenses":"مصروفات السائق","Audit Log":"سجل العمليات",
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
    "Governorates & Areas":"Governorates & Areas","Accounting":"Accounting","Orders Verification":"Orders Verification","Verify":"Verify","Verify All":"Verify All","Verified":"Verified","Unverified":"Unverified","Remove from Statement":"Remove from Statement","Remove Order from Statement?":"Remove Order from Statement?","This order will be moved to In Ops and removed from the courier statement.":"This order will be moved to In Ops and removed from the courier statement.","Confirm":"Confirm","Cancel":"Cancel","All Statuses":"All Statuses","All Verification":"All Verification","All Drivers":"All Drivers","Orders verified successfully.":"Orders verified successfully.","Driver Commission":"Driver Commission","Driver Expenses":"Driver Expenses","Audit Log":"Audit Log",
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
  ["dashboard","Dashboard","لوحة التحكم","home"],
  ["order","New Order","إدخال أوردر","plus"],
  ["search","Search","بحث","search"],
  ["shipments","Shipments","الشحنات","box"],
  ["jobs","Delivery Jobs","مهام التوصيل","truck"],
  ["jobcode","Update Delivery Job Code","تحديث كود مهمة التوصيل","code"],
  ["returns","Merchant Returns","المرتجعات للتاجر","return"],
  ["merchants","Merchants","التجار","store"],
  ["drivers","Drivers","السائقون","driver"],
  ["areas","Governorates & Areas","الإمارات والمناطق","pin"],
  ["accounting","Accounting","الحسابات","money"],
  ["audit","Audit Log","سجل العمليات","audit"],
  ["employees","Employees & Permissions","الموظفون والصلاحيات","users"],
  ["chat","Employee Chat","شات الموظفين","chat"]
];

const ICONS = {
  home:'<svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>',
  box:'<svg viewBox="0 0 24 24"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>',
  truck:'<svg viewBox="0 0 24 24"><path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  code:'<svg viewBox="0 0 24 24"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/></svg>',
  return:'<svg viewBox="0 0 24 24"><path d="M9 10H4l4-4"/><path d="M4 10a8 8 0 1 1 1 8"/></svg>',
  store:'<svg viewBox="0 0 24 24"><path d="M4 10v10h16V10"/><path d="M3 10 5 4h14l2 6"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M9 20v-6h6v6"/></svg>',
  driver:'<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="3"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/><path d="M4 14h4M16 14h4"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  money:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M7 9h.01M17 15h.01"/></svg>',
  fuel:'<svg viewBox="0 0 24 24"><path d="M5 20V5a2 2 0 0 1 2-2h7v17"/><path d="M5 9h9"/><path d="M16 7h2l2 3v7a2 2 0 0 1-2 2h-1"/><path d="M9 20h10"/></svg>',
  audit:'<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>',
  users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15 20a5 5 0 0 1 6 0"/></svg>',
  chat:'<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/></svg>'
};

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

function pagePermission(page){
  const map={
    dashboard:"dashboard", order:"orders", search:"orders", shipments:"shipments",
    jobs:"jobs", jobcode:"jobs", returns:"shipments", merchants:"merchants",
    drivers:"drivers", areas:"orders", accounting:"accounting", ordersVerification:"accounting", driverCommission:"accounting",
    audit:"audit", employees:"users", chat:"users"
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
  sidebar.innerHTML=SIDEBAR.map(([page,en,ar,icon])=>{
    const visible=canAccessPage(page);
    if(page==="accounting" && visible){
      const commissionVisible=canAccessPage("driverCommission");
      const verificationVisible=canAccessPage("ordersVerification");
       const subs=(commissionVisible||verificationVisible)?`<div class="nav-sub">${verificationVisible?`<button data-page="ordersVerification" onclick="show('ordersVerification')"><span class="nav-dot">✓</span><span>${t("Orders Verification")}</span></button>`:""}${commissionVisible?`<button data-page="driverCommission" onclick="show('driverCommission')"><span class="nav-dot">•</span><span>${t("Driver Commission")}</span></button>`:""}</div>`:"";
      return `<div class="nav-group open"><button class="nav-main" data-page="accounting" onclick="show('accounting')"><span>${LANG==="ar"?ar:en}</span><span class="nav-arrow">⌄</span></button>${subs}</div>`;
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
    else if(page==="drivers")await driversPage(c); else if(page==="areas")await areasPage(c); else if(page==="accounting")await accountingPage(c); else if(page==="ordersVerification")await ordersVerificationPage(c); else if(page==="driverCommission")await driverCommissionPage(c);
    else if(page==="audit")await auditPage(c); else if(page==="employees")await employeesPage(c); else if(page==="chat")await chatPage(c); else c.innerHTML=`<div class="panel error">${esc(L("Page not found","الصفحة غير موجودة"))}</div>`;
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
  <label>${t("Order Value")}<input id="value" type="number" step="0.01" value="${esc(o.value??"")}"></label>
  <label>${t("Delivery Fee")}<input id="delivery_fee" type="number" step="0.01" value="${esc(o.delivery_fee??"")}"><small id="merchantFeeHint" class="muted"></small></label>
  <label>${t("Status")}<select id="order_status">${['new','pending','Delivered','Half Delivered','Cancelled by Shipper','Cancelled by Receiver','Replaced','In Ops','cancelled'].map(st=>`<option value="${esc(st)}" ${String(o.status||'').toLowerCase()===String(st).toLowerCase()?"selected":""}>${esc(st)}</option>`).join('')}</select></label>
  <label class="full">${L("Notes","ملاحظات")}<textarea id="notes">${esc(o.notes||"")}</textarea></label>
  </div><div class="actions"><button onclick="${order?"updateOrderFromForm()":"saveOrder()"}">${t(order?"Update":"Save")}</button>${order?`<button class="ghost" onclick="show('${esc(returnPage)}')">${returnPage==="accounting"?L("Back to Accounting","العودة للحسابات"):L("Back to Shipments","العودة للشحنات")}</button>`:""}</div><div id="orderMsg" class="msg"></div></div>`;
}
async function loadMerchantFee(){const id=$("merchant")?.value;if(!id)return;try{const d=await api("/api/merchants");const m=(d.data||[]).find(x=>x.id===id);if(m){const fee=Number(m.base_delivery_fee||0);const input=$("delivery_fee");if(input&&!input.value)input.value=fee;const h=$("merchantFeeHint");if(h)h.textContent=L(`Saved merchant fee: ${fee}` ,`رسوم التوصيل المحفوظة للتاجر: ${fee}`);}}catch(_){} }
async function importOrdersExcel(){const file=$("orderFile")?.files?.[0];if(!file)return msg("orderImportMsg",L("Choose an Excel file","اختر ملف Excel"),"error");if(typeof XLSX==="undefined")return msg("orderImportMsg",L("Excel library did not load","مكتبة Excel لم تعمل"),"error");try{const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});const d=await api("/api/orders/import",{method:"POST",body:JSON.stringify({rows})});msg("orderImportMsg",`${L("Imported","تم الرفع")}: ${d.imported} — ${L("Skipped","تم التخطي")}: ${d.skipped}`,"ok");if(d.errors?.length)console.warn(d.errors);}catch(e){msg("orderImportMsg",e.message,"error");}}
async function saveOrder(){const b=readOrderForm();if(!b.merchant_id)return msg("orderMsg",L("Select a merchant","اختر التاجر"),"error");if(!b.merchant_order_no)return msg("orderMsg",L("Merchant Order No. is required","رقم أوردر التاجر إجباري"),"error");try{const d=await api("/api/orders",{method:"POST",body:JSON.stringify(b)});msg("orderMsg",`${L("Saved. Tracking Number","تم الحفظ. رقم التتبع")}: ${d.trackingNumber||d.shipment?.tracking_number||d.shipment?.shipment_no||""}`,"ok");setTimeout(()=>show("order"),900);}catch(e){msg("orderMsg",e.message,"error");}}
function readOrderForm(){return {serial_no:Number($("serial")?.value),order_code:$("order_code")?.value.trim(),merchant_id:$("merchant")?.value,merchant_order_no:$("merchant_order_no")?.value.trim(),customer_name:$("customer_name")?.value.trim(),customer_phone:$("customer_phone")?.value.trim(),governorate_id:$("gov")?.value||null,area_id:$("area")?.value||null,address:$("address")?.value.trim(),value:Number($("value")?.value||0),delivery_fee:Number($("delivery_fee")?.value||0),status:$("order_status")?.value,notes:$("notes")?.value.trim()};}
async function openOrder(id,returnPage="shipments"){try{const d=await api("/api/orders/"+encodeURIComponent(id));const detail=d.data;const [m,g,a]=await Promise.all([api("/api/merchants"),api("/api/governorates"),api("/api/areas")]);const order={...(detail.order||{}),shipment:detail.shipment||null};$("content").innerHTML=orderFormHtml(order.serial_no||1,m.data||[],g.data||[],a.data||[],order,returnPage);$("merchant")?.addEventListener("change",loadMerchantFee);loadMerchantFee();}catch(e){alert(e.message);}}
async function updateOrderFromForm(){const b=readOrderForm();b.id=$("edit_order_id").value;const returnPage=$("edit_return_page")?.value||"shipments";try{await api("/api/orders",{method:"PATCH",body:JSON.stringify(b)});msg("orderMsg",L("Updated successfully","تم تعديل الأوردر بنجاح"),"ok");setTimeout(()=>show(returnPage),600);}catch(e){msg("orderMsg",e.message,"error");}}

function searchPage(c){c.innerHTML=`<h2>${t("Search")}</h2><div class="panel"><div class="row"><input id="searchQ" placeholder="${esc(L("Customer / order / shipment number","رقم العميل / رقم الأوردر / رقم الشحنة"))}"><button onclick="doSearch()">${t("Search")}</button></div><div id="searchResult"></div></div>`;}
async function doSearch(){const q=$("searchQ")?.value.trim();if(!q)return msg("searchResult",L("Enter a search value","اكتب قيمة البحث"),"error");try{$("searchResult").innerHTML=renderSearch(await api("/api/search?q="+encodeURIComponent(q)));}catch(e){msg("searchResult",e.message,"error");}}
function renderSearch(d){if(!d?.data)return `<p class="muted">${t("No data")}</p>`;const x=d.data;const o=x.order||x;const id=o.id||x.order_id;const tracking=x.tracking_number||x.shipment?.tracking_number||x.shipment_no||x.shipment?.shipment_no||"";const logs=(x.audit||[]).slice().sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));const historyRows=logs.map(r=>{const details=typeof r.details==="object"?JSON.stringify(r.details):String(r.details||"");return `<tr><td>${esc((r.created_at||"").replace("T"," ").slice(0,19))}</td><td>${esc(r.action||"")}</td><td>${esc(r.user_name||"System")}</td><td>${esc(r.employee_code||"")}</td><td>${esc(details)}</td></tr>`}).join("");return `<div class="panel order-search-card"><h3>${esc(d.type||"")}</h3><div class="detail-grid"><div><b>${t("Tracking Number")}</b><br>${esc(tracking)}</div><div><b>${t("Merchant Order No.")}</b><br>${esc(o.merchant_order_no||"")}</div><div><b>${t("Order Code")}</b><br>${esc(o.order_code||"")}</div><div><b>${t("Merchant")}</b><br>${esc(x.merchant?.name||"")}</div><div><b>${t("Customer")}</b><br>${esc(o.customer_name||"")}</div><div><b>${t("Status")}</b><br><span class="badge">${esc(x.status||o.status||"")}</span></div><div><b>${t("Delivery Fee")}</b><br>${esc(o.delivery_fee||0)}</div><div><b>قيمة الأوردر</b><br>${esc(o.value||0)}</div></div><div class="actions"><button onclick="openOrder('${esc(id)}')">${t("Edit")}</button><button class="ghost" onclick='exportRowsExcel([${JSON.stringify({...o,tracking_number:tracking})}],"search-result")'>${t("Export Excel")}</button><button class="ghost" onclick='printRowsPDF([${JSON.stringify({...o,tracking_number:tracking})}],"${esc(o.merchant_order_no||o.order_code||"order")}")'>${t("Print / PDF")}</button></div><details class="order-history" ${logs.length?"":""}><summary>🕘 سجل الحركات / History <span class="history-count">${logs.length}</span></summary><div class="history-box">${logs.length?`<div class="table-wrap"><table><thead><tr><th>التاريخ والوقت</th><th>الحركة</th><th>الموظف</th><th>كود الموظف</th><th>التفاصيل</th></tr></thead><tbody>${historyRows}</tbody></table></div>`:`<p class="muted">لا توجد حركات مسجلة لهذا الأوردر.</p>`}</div></details></div>`;}

async function shipmentsPage(c){
  c.innerHTML=`<h2>${t("Shipments")}</h2><div class="panel"><div class="row"><label>${t("From")}<input id="shipFrom" type="date" value="${daysAgo(7)}"></label><label>${t("To")}<input id="shipTo" type="date" value="${today()}"></label><button onclick="loadShipments()">${t("Search")}</button><button class="ghost" onclick="exportShipmentsExcel()">${t("Export Excel")}</button><button class="ghost" onclick="exportShipmentsPDF()">${t("Print / PDF")}</button></div><div id="shipmentsList"></div></div>`;
  await loadShipments();
}
let SHIP_ROWS=[];
async function loadShipments(){try{const d=await api(`/api/shipments?from=${$("shipFrom").value}&to=${$("shipTo").value}`);SHIP_ROWS=d.data||[];$("shipmentsList").innerHTML=shipmentsTable(SHIP_ROWS);}catch(e){msg("shipmentsList",e.message,"error");}}
function shipmentsTable(rows){if(!rows.length)return `<p class="muted">${t("No data")}</p>`;return `<div class="table-wrap"><table id="shipmentsTable"><thead><tr><th>${t("Tracking Number")}</th><th>${t("Merchant Order No.")}</th><th>${t("Merchant")}</th><th>${t("Customer")}</th><th>${t("Order Value")}</th><th>${t("Delivery Fee")}</th><th>${t("Status")}</th><th>${t("Created")}</th><th>${t("Edit")}</th></tr></thead><tbody>${rows.map(r=>`<tr class="clickable" onclick="openOrder('${esc(r.order_id)}')"><td>${esc(r.tracking_number||r.shipment_no||"")}</td><td>${esc(r.order?.merchant_order_no||"")}</td><td>${esc(r.merchant?.name||"")}</td><td>${esc(r.order?.customer_name||"")}</td><td>${esc(r.order?.value||0)}</td><td>${esc(r.order?.delivery_fee||0)}</td><td><span class="badge">${esc(r.status)}</span></td><td>${esc((r.order?.created_at||r.created_at||"").slice(0,16).replace("T"," "))}</td><td><button onclick="event.stopPropagation();openOrder('${esc(r.order_id)}')">${t("Edit")}</button></td></tr>`).join("")}</tbody></table></div>`;}
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
  <label>${L("Merchant No.","رقم التاجر")}<input id="mn"></label><label>${L("Code","الكود")}<input id="mc"></label><label>${t("Name")}<input id="mname"></label><label>${t("Phone")}<input id="mphone"></label><label class="full">${t("Address")}<input id="maddress"></label><label>${t("Default Delivery Fee")}<input id="mfee" type="number" step="0.01"></label><label><span>${t("Tax")} <input id="mtax" type="checkbox"></span></label><label>${t("Tax Rate")}<input id="mrate" type="number" step="0.01"></label><label>${t("Store Type")}<select id="mstoretype"><option value="">--</option><option>ecommerce</option><option>website</option><option>app</option><option>other</option></select></label><label>${t("Store Name")}<input id="mstorename"></label><label>${t("Store URL")}<input id="mstoreurl"></label><label><span>${t("Active")} <input id="mstoreactive" type="checkbox" checked></span></label></div><button onclick="addMerchant()">${t("Save")}</button><div id="merchantMsg"></div></div>
  <div class="panel"><h3>${t("Merchants")}</h3>${rows.length?`<div class="table-wrap"><table><thead><tr><th>${L("No.","رقم")}</th><th>${t("Name")}</th><th>${t("Phone")}</th><th>${t("Default Delivery Fee")}</th><th>${t("Tax")}</th><th>${t("Store")}</th><th>${t("Edit")}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.merchant_no)}</td><td>${esc(r.name)}</td><td>${esc(r.phone)}</td><td>${esc(r.base_delivery_fee||0)}</td><td>${r.tax_enabled?esc(r.tax_rate)+"%":"—"}</td><td>${esc(r.store_name||"")}</td><td><button onclick="editMerchant('${esc(r.id)}')">${t("Edit")}</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">${t("No data")}</p>`}</div>
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
async function addMerchant(){try{await api("/api/merchants",{method:"POST",body:JSON.stringify({merchant_no:$("mn").value,code:$("mc").value,name:$("mname").value,phone:$("mphone").value,address:$("maddress").value,base_delivery_fee:Number($("mfee").value||0),tax_enabled:$("mtax").checked,tax_rate:Number($("mrate").value||0),store_type:$("mstoretype").value,store_name:$("mstorename").value,store_url:$("mstoreurl").value,store_active:$("mstoreactive").checked})});msg("merchantMsg",L("Saved successfully","تم حفظ التاجر بنجاح"),"ok");setTimeout(()=>show("merchants"),500);}catch(e){msg("merchantMsg",e.message,"error");}}
async function editMerchant(id){const d=await api("/api/merchants"),m=(d.data||[]).find(x=>x.id===id);if(!m)return;const fee=prompt(L("Default delivery fee","رسوم التوصيل الافتراضية"),m.base_delivery_fee||0);if(fee===null)return;const tax=confirm(L("Enable tax for this merchant?","تفعيل الضريبة لهذا التاجر؟"));const rate=tax?prompt(L("Tax rate %","نسبة الضريبة %"),m.tax_rate||0):0;try{await api("/api/merchants",{method:"PATCH",body:JSON.stringify({id,tax_enabled:tax,tax_rate:Number(rate||0),base_delivery_fee:Number(fee||0)})});await show("merchants");}catch(e){alert(e.message);}}
async function addWooIntegration(){try{const merchantId=$("imMerchant").value;const name=$("imName").value.trim()||"WooCommerce Store";const url=$("imUrl").value.trim();const key=$("imKey").value.trim();const secret=$("imSecret").value.trim();if(!url||!key||!secret)return msg("imMsg",L("Enter store URL, Consumer Key and Consumer Secret","أدخل رابط المتجر ومفتاح WooCommerce والسر"),"error");const d=await api("/api/merchant-integrations",{method:"POST",body:JSON.stringify({merchant_id:merchantId,type:"woocommerce",name,config:{url,consumer_key:key,consumer_secret:secret,auto_import:$("imAuto").checked}})});msg("imMsg",L("Saved successfully","تم حفظ الربط"),"ok");await loadWooIntegrations();}catch(e){msg("imMsg",e.message,"error");}}
async function loadWooIntegrations(){const box=$("wooIntegrations");if(!box||!$("imMerchant"))return;try{const d=await api("/api/merchant-integrations?merchant_id="+encodeURIComponent($("imMerchant").value));const rows=(d.data||[]).filter(x=>String(x.type).toLowerCase()==="woocommerce");box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>${t("Store")}</th><th>${t("Store URL")}</th><th>${t("Status")}</th><th>${t("Test Connection")}</th><th>${t("Import Orders")}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.config?.url||"")}</td><td>${r.active?"🟢":"🔴"}${r.config?.last_error?`<br><span class="error">${esc(r.config.last_error)}</span>`:""}</td><td><button onclick="testWoo('${esc(r.id)}')">${t("Test Connection")}</button></td><td><button onclick="importWoo('${esc(r.id)}')">${t("Import Orders")}</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">${t("No data")}</p>`;}catch(e){box.innerHTML=`<span class="error">${esc(e.message)}</span>`;}}
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
    return `<tr class="${rowClass}"><td><b>${esc(o.tracking_number||'')}</b></td><td><b>${esc(o.shipment_no||'')}</b>${o.merchant_order_no?` <small>(${esc(o.merchant_order_no)})</small>`:''}</td><td>${esc(o.shipper_name||o.merchant_name||'')}</td><td>${Number(o.delivery_fee||0).toFixed(2)}</td><td>${Number(o.value??o.cod??0).toFixed(2)}</td><td>${esc(o.status||'')}</td><td>${verifyCell}</td><td><button class="mini-btn ghost" onclick="editDriverOrder('${esc(o.id)}',${Number(o.value??o.cod??0)},${Number(o.delivery_fee||0)})">${t("Edit")}</button></td></tr>`;
  }).join('');
  box.innerHTML=`<div id="printDriverStatement" class="print-sheet">
    <div class="statement-head"><div><h3>${L("Driver Accounting Statement","كشف حساب المندوب")}</h3><div>${L("Driver","المندوب")}: <b>${esc(driver.name||'')}</b> — ${L("Code","الكود")}: <b>${esc(driver.driver_no||'')}</b></div></div><div class="actions no-print"></div></div>
    <div class="driver-summary"><div class="stat"><span>${L("Order Count","عدد الأوردرات")}</span><b>${orders.length}</b></div><div class="stat"><span>${L("Total Commission","إجمالي العمولة")}</span><b>${Number(orders.reduce((s,o)=>s+Number(o.delivery_fee||0),0)).toFixed(2)}</b></div><div class="stat"><span>${L("Total Expenses","إجمالي المصروفات")}</span><b>${Number(tt.expenseTotal||0).toFixed(2)}</b></div><div class="stat"><span>${L("Amount Due","المطلوب دفعه")}</span><b>${Number(tt.required||0).toFixed(2)}</b></div></div>
    <div class="table-wrap driver-table-wrap"><table class="driver-statement-table"><thead><tr><th>Tracking</th><th>Shipment / Order</th><th>Shipper</th><th>Delivery Fee</th><th>Amount / COD</th><th>Status</th><th>Verify</th><th>Edit</th></tr></thead><tbody>${orderRows||`<tr><td colspan="8" class="muted">${L("No orders","لا توجد أوردرات")}</td></tr>`}</tbody></table></div>
    <div class="driver-order-count">${L("Order Count","عدد الأوردرات")}: <b>${orders.length}</b></div>
    <h3>${L("Driver Expenses","مصروفات المندوب")}</h3>
    <div class="form-grid no-print"><label>${L("Type","النوع")}<select id="newExType"><option value="petrol">بنزين</option><option value="loading">تحميل</option><option value="parking">موقف</option><option value="other">مصروف آخر</option></select></label><label>${L("Category","التصنيف")}<select id="newExCategory"><option value="expense">Expense — مصروف</option><option value="shortage">Shortage — عجز</option></select></label><label>${L("Amount","المبلغ")}<input id="newExAmount" type="number" step="0.01"></label><label>${L("Date","التاريخ")}<input id="newExDate" type="date" value="${today()}"></label><label class="full">${L("Details","التفاصيل")}<input id="newExDetails"></label></div>
    <button class="no-print" onclick="addStatementExpense('${esc(driver.id)}')">${t("Save")}</button>
    ${expenses.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Details</th><th>Amount</th><th class="no-print">Edit/Delete</th></tr></thead><tbody>${expenses.map(e=>`<tr><td>${esc(e.expense_date||'')}</td><td>${esc(e.expense_type||'')}</td><td>${e.category==='shortage'?'Shortage':'Expense'}</td><td>${esc(e.details||e.notes||'')}</td><td>${Number(e.amount||0).toFixed(2)}</td><td class="no-print"><button class="mini-btn ghost" onclick='editStatementExpense(${JSON.stringify(e)})'>${t("Edit")}</button> <button class="mini-btn danger" onclick="deleteStatementExpense('${esc(e.id)}')">${L("Delete","حذف")}</button></td></tr>`).join('')}</tbody></table></div>`:`<p class="muted">${L("No expenses","لا توجد مصروفات")}</p>`}
    <div class="driver-totals"><div>${L("Expenses","المصروفات")}: <b>${Number(tt.expenseTotal||0).toFixed(2)}</b></div><div>${L("Shortage","العجز")}: <b>${Number(tt.shortageTotal||0).toFixed(2)}</b></div><div>${L("Amount Due","المطلوب دفعه")}: <b>${Number(tt.required||0).toFixed(2)}</b></div></div>
    <h3>${L("Required Payment","المطلوب دفعه")}</h3>
    <div class="form-grid no-print"><label>${L("Payment","طريقة الدفع")}<select id="payMethod"><option value="cash">Cash — كاش</option><option value="bank">Bank — بنك</option></select></label><label>${L("Amount","المبلغ")}<input id="payAmount" type="number" step="0.01" value="${Number(tt.required||0).toFixed(2)}"></label><label>${L("Payment Date","تاريخ الدفع")}<input id="payDate" type="date" value="${today()}"></label><label>${L("Bank Name","اسم البنك")}<input id="bankName"></label><label>${L("Transfer Reference","رقم التحويل")}<input id="transferRef"></label></div><button class="no-print" onclick="saveDriverSettlement('${esc(driver.id)}')">${L("Save Payment","حفظ الدفع")}</button>
    ${settlements.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Bank</th><th>Reference</th><th>Employee</th></tr></thead><tbody>${settlements.map(e=>`<tr><td>${esc((e.paid_at||'').replace('T',' ').slice(0,16))}</td><td>${esc(e.payment_method||'')}</td><td>${Number(e.amount||0).toFixed(2)}</td><td>${esc(e.bank_name||'')}</td><td>${esc(e.transfer_reference||'')}</td><td>${esc(e.employee_name||e.employee_code||'')}</td></tr>`).join('')}</tbody></table></div>`:''}
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
  const newCod=prompt(L('Amount / COD','المبلغ / COD'),cod);if(newCod===null)return;
  const newFee=prompt(L('Delivery Fee','رسوم التوصيل'),fee);if(newFee===null)return;
  try{await api('/api/driver-statement/order',{method:'PATCH',body:JSON.stringify({id,cod:Number(newCod),delivery_fee:Number(newFee)})});await loadDriverStatement();}
  catch(e){alert(e.message);}
}
async function verifySelectedDriverOrders(driverId){const ids=[...document.querySelectorAll('.commission-check:checked')].map(x=>x.value);if(!ids.length)return alert(L('Select orders first','اختر الأوردرات أولاً'));try{await api('/api/driver-commission/verify',{method:'POST',body:JSON.stringify({driver_id:driverId,order_ids:ids})});await loadDriverStatement();}catch(e){alert(e.message);}}
async function payVerifiedDriverOrders(driverId,method){const ids=[...document.querySelectorAll('.commission-check:checked')].map(x=>x.value);if(!ids.length)return alert(L('Select verified orders first','اختر الأوردرات التي تم Verify لها أولاً'));try{const d=await api('/api/driver-commission/pay',{method:'POST',body:JSON.stringify({driver_id:driverId,order_ids:ids,payment_method:method,payment_date:today()})});alert(`${L('Paid','تمت التسوية')}: ${Number(d.data?.amount||0).toFixed(2)} جنيه`);await loadDriverStatement();}catch(e){alert(e.message);}}
function toggleAllCommission(el){document.querySelectorAll('.commission-check:not(:disabled)').forEach(x=>x.checked=el.checked);}
async function addStatementExpense(driverId){try{await api('/api/expenses',{method:'POST',body:JSON.stringify({driver_id:driverId,expense_type:$("newExType").value,category:$("newExCategory").value,amount:Number($("newExAmount").value||0),expense_date:$("newExDate").value,details:$("newExDetails").value})});await loadDriverStatement();}catch(e){alert(e.message);}}
async function editStatementExpense(e){const amount=prompt(L('Amount','المبلغ'),e.amount??'');if(amount===null)return;const details=prompt(L('Details','التفاصيل'),e.details||e.notes||'');if(details===null)return;try{await api('/api/expenses',{method:'PATCH',body:JSON.stringify({id:e.id,expense_type:e.expense_type,category:e.category,amount:Number(amount),expense_date:e.expense_date,details})});await loadDriverStatement();}catch(err){alert(err.message);}}
async function deleteStatementExpense(id){if(!confirm(L('Delete expense?','حذف المصروف؟')))return;try{await api('/api/expenses',{method:'DELETE',body:JSON.stringify({id})});await loadDriverStatement();}catch(e){alert(e.message);}}
async function openOrderEdit(id){show('search');setTimeout(()=>{const el=$('searchQ');if(el){el.value=id;doSearch();}},100);}
async function saveDriverSettlement(driverId){try{const body={driver_id:driverId,payment_method:$("payMethod")?.value,amount:Number($("payAmount")?.value||0),paid_at:$("payDate")?.value,bank_name:$("bankName")?.value||"",transfer_reference:$("transferRef")?.value||""};await api('/api/driver-settlements',{method:'POST',body:JSON.stringify(body)});alert("تم تسجيل التسوية");await loadDriverStatement();}catch(e){alert(e.message);}}

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
      <div class="section-title-row"><div><h3>${L("Driver Expenses","مصروفات المندوب")}</h3><p class="muted">${L("Linked automatically to verified orders. Fuel and other expenses are deducted from the driver's service-charge statement.","مرتبطة تلقائياً بالأوردرات المعتمدة. يتم خصم البنزين وأي مصروفات أخرى من كشف المندوب.")}</p></div><button class="ghost" onclick="loadOrdersVerificationDriverExpenses()">↻ ${L("Refresh","تحديث")}</button></div>
      <div class="accounting-section-divider"></div>
      <div id="ovDriverExpenses"></div>
    </div>
  </div>`;
  await loadOrdersVerification();
  await loadOrdersVerificationDriverExpenses();
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
        <td><b>${esc(r.order_code||r.tracking_number||r.id||'')}</b></td><td>${esc(r.customer_name||'')}<small class="muted">${r.customer_phone?`<br>${esc(r.customer_phone)}`:''}</small></td><td>${Number(r.cod??r.order_amount??0).toFixed(2)} EGP</td><td><span class="badge">${esc(r.status||'')}</span></td><td>${badge}</td><td>${esc(r.driver_name||'')}</td>
        <td><div class="actions verification-actions"><button class="mini-btn ghost" title="${t("Edit")}" onclick="openOrder('${esc(r.id)}','accounting')">✏️</button><button class="mini-btn danger" title="${t("Remove from Statement")}" onclick="removeVerificationOrder('${esc(r.id)}')">❌</button></div></td>
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

async function loadOrdersVerificationDriverExpenses(){
  try{
    const d=await api(`/api/accounting/driver-expenses-summary?from=${encodeURIComponent(today())}&to=${encodeURIComponent(today())}&driver_id=`);
    const rows=d.data||[];
    const totalFuel=rows.reduce((sum,r)=>sum+Number(r.fuel_expense||0),0), totalOther=rows.reduce((sum,r)=>sum+Number(r.other_expenses||0),0), totalNet=rows.reduce((sum,r)=>sum+Number(r.net_commission||0),0);
    const box=$("ovDriverExpenses"); if(!box)return;
    box.innerHTML=`<div class="grid verify-stats"><div class="stat"><span>${L("Drivers with activity","مندوبون لديهم حركة")}</span><b>${rows.length}</b></div><div class="stat"><span>${L("Fuel Expenses","مصروف البنزين")}</span><b>${totalFuel.toFixed(2)} EGP</b></div><div class="stat"><span>${L("Other Expenses","مصروفات أخرى")}</span><b>${totalOther.toFixed(2)} EGP</b></div><div class="stat verify-stat-green"><span>${L("Net Commission","صافي كشف المندوب")}</span><b>${totalNet.toFixed(2)} EGP</b></div></div>
    ${rows.length?`<div class="table-wrap"><table class="driver-expenses-linked-table"><thead><tr><th>${L("Driver","المندوب")}</th><th>${L("Verified Orders","الأوردرات المعتمدة")}</th><th>${L("Service Charges","رسوم الخدمة")}</th><th>${L("Fuel Expense","بنزين")}</th><th>${L("Other Expenses","مصروفات أخرى")}</th><th>${L("Net Commission","صافي الكشف")}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.driver_name||"—")}</b>${r.driver_no?`<small class="muted"><br>${esc(r.driver_no)}</small>`:""}</td><td>${Number(r.verified_orders||0)}</td><td>${Number(r.service_charges||0).toFixed(2)}</td><td>− ${Number(r.fuel_expense||0).toFixed(2)}</td><td>− ${Number(r.other_expenses||0).toFixed(2)}</td><td><b>${Number(r.net_commission||0).toFixed(2)}</b></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">${L("No verified orders or expenses found for today.","لا توجد أوردرات معتمدة أو مصروفات للمندوبين اليوم.")}</p>`}`;
  }catch(e){msg("ovDriverExpenses",e.message,"error");}
}

async function accountingPage(c){
  try{
    const [summary,dr]=await Promise.all([api("/api/accounting/summary"),api("/api/drivers")]);
    const x=summary.data||{}, drivers=dr.data||[];
    c.innerHTML=`<h2>${t("Accounting")}</h2>
      <div class="grid">${stat(L("Orders","الأوردرات"),x.totalOrders||0)}${stat(L("Order Value","قيمة الأوردرات"),Number(x.orderValue||0).toFixed(2))}${stat(L("Delivery Fees","رسوم التوصيل"),Number(x.deliveryFees||0).toFixed(2))}${stat(L("Taxes","الضرائب"),Number(x.taxes||0).toFixed(2))}${stat(L("Merchant Net","صافي التجار"),Number(x.merchantNet||0).toFixed(2))}</div>
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
        return `<tr class="${rowClass}"><td><input class="accounting-verify-check" type="checkbox" value="${esc(r.id)}" ${eligibleState&&!verifiedState?'':'disabled'}></td><td><b>${esc(r.job_code||r.shipment_no||r.tracking_number||'—')}</b></td><td>${esc(r.shipper_name||'—')}</td><td>${Number(r.shipper_cod??r.cod??0).toFixed(2)}</td><td>${Number(r.service_charges||0).toFixed(2)}</td><td>${esc(r.driver_name||'—')} ${r.driver_no?`<small class="muted">— ${esc(r.driver_no)}</small>`:''}</td><td>${esc(r.status||'')}</td><td>${badge}</td><td><div class="actions verification-actions"><button class="mini-btn ghost" title="${L("Edit","تعديل")}" onclick="openOrder('${esc(r.id)}','accounting')">✏️</button><button class="mini-btn danger" title="${L("Remove from Statement","إخراج من الكشف")}" onclick="removeAccountingVerificationOrder('${esc(r.id)}')">❌</button></div></td></tr>`;
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
    $("accDriverExpenses").innerHTML=`<div class="grid verify-stats"><div class="stat"><span>${L("Drivers with activity","مندوبون لديهم حركة")}</span><b>${rows.length}</b></div><div class="stat"><span>${L("Fuel Expenses","مصروف البنزين")}</span><b>${totalFuel.toFixed(2)} EGP</b></div><div class="stat"><span>${L("Other Expenses","مصروفات أخرى")}</span><b>${totalOther.toFixed(2)} EGP</b></div><div class="stat verify-stat-green"><span>${L("Net Commission","صافي كشف المندوب")}</span><b>${totalNet.toFixed(2)} EGP</b></div></div>
      ${rows.length?`<div class="table-wrap"><table class="driver-expenses-linked-table"><thead><tr><th>${L("Driver","المندوب")}</th><th>${L("Verified Orders","الأوردرات المعتمدة")}</th><th>${L("Service Charges","رسوم الخدمة")}</th><th>${L("Fuel Expense","بنزين")}</th><th>${L("Other Expenses","مصروفات أخرى")}</th><th>${L("Net Commission","صافي الكشف")}</th><th>${L("Edit","تعديل")}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.driver_name||'—')}</b>${r.driver_no?`<small class="muted"><br>${esc(r.driver_no)}</small>`:''}</td><td>${Number(r.verified_orders||0)}</td><td>${Number(r.service_charges||0).toFixed(2)}</td><td class="fuel-deduction">− ${Number(r.fuel_expense||0).toFixed(2)}</td><td>− ${Number(r.other_expenses||0).toFixed(2)}</td><td><b>${Number(r.net_commission||0).toFixed(2)}</b></td><td><button class="mini-btn ghost" title="${L("Open Driver Expenses","فتح مصروفات المندوب")}" onclick="openDriverExpensesFromAccounting('${esc(r.driver_id)}')">✏️</button></td></tr>`).join('')}</tbody></table></div>`:`<p class="muted">${L("No verified orders or expenses found for this period.","لا توجد أوردرات معتمدة أو مصروفات للمندوبين خلال الفترة المحددة.")}</p>`}`;
  }catch(e){const el=$("accDriverExpenses");if(el)el.innerHTML=`<div class="msg error">${esc(e.message)}</div>`;}
}
async function openDriverExpensesFromAccounting(driverId){try{if(CURRENT_PAGE!=="accounting")await show("accounting");const el=$("accVerifyDriver");if(el){el.value=driverId;await loadAccountingVerifyOrders();await loadAccountingDriverExpenses();}document.getElementById("driverExpensesSection")?.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){alert(e.message);}}

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
  const ws=XLSX.utils.json_to_sheet(rows||[]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Data");XLSX.writeFile(wb,`${name}-${today()}.xlsx`);
}
function printRowsPDF(rows,title){
  const keys=[...new Set((rows||[]).flatMap(x=>Object.keys(x||{})))];
  const html=`<!doctype html><html dir="${LANG==="ar"?"rtl":"ltr"}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:7px;text-align:${LANG==="ar"?"right":"left"} }</style></head><body><h2>${esc(title)}</h2><table><thead><tr>${keys.map(k=>`<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${(rows||[]).map(r=>`<tr>${keys.map(k=>`<td>${esc(r[k]??"")}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`;
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
