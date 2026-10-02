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
    "Update Delivery Job Code":"New Job Code","New Job Code":"New Job Code","Merchant Code":"كود التاجر","Merchant No.":"رقم التاجر","Proof Images":"صور إثبات التاجر","Merchant Username":"اسم مستخدم التاجر","Merchant Password":"كلمة مرور التاجر","Generate Code":"توليد الكود","Code generated automatically":"الكود يتم إنشاؤه تلقائيًا","Merchant saved":"تم حفظ التاجر","Edit Merchant":"تعديل التاجر","No merchants yet":"لا يوجد تجار حتى الآن","Merchant Returns":"المرتجعات للتاجر","Merchants":"التجار","Drivers":"السائقون",
    "Governorates & Areas":"الإمارات والمناطق","Accounting":"الحسابات","Driver Expenses":"مصروفات السائق","Audit Log":"سجل العمليات",
    "Employees & Permissions":"الموظفون والصلاحيات","Employee Chat":"شات الموظفين","Orders":"الأوردرات","Edit Order":"تعديل الأوردر",
    "Add Merchant":"إضافة تاجر","Add Employee":"إضافة موظف","Add Governorate":"إضافة إمارة","Add Area":"إضافة منطقة",
    "Export Excel":"تصدير Excel","Export PDF":"تصدير PDF","Import Excel":"رفع Excel","Save":"حفظ","Update":"تحديث",
    "No data":"لا توجد بيانات","Loading...":"جاري التحميل...","From":"من","To":"إلى","Open":"فتح","Edit":"تعديل",
    "Status":"الحالة","To Be Picked Up":"في انتظار الاستلام","Reeplac":"تبديل","Hald deliverd":"تسليم جزء","Delivered":"تم التسليم","Lost & Damaged":"مفقود أو تالف","Returned by driver":"تم الإرجاع","Future delivery":"توصيل مؤجل","Cancelled":"كنسل","Cancelled by shipper":"كنسل على التاجر","In ops":"داخل المخزن","Cancelled by reciver":"كنسل على الزبون","Merchant":"التاجر","Customer":"العميل","Delivery Fee":"رسوم التوصيل","Order Value":"قيمة الأوردر",
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
    "Update Delivery Job Code":"New Job Code","New Job Code":"New Job Code","Merchant Code":"Merchant Code","Merchant No.":"Merchant No.","Proof Images":"Merchant Proof Images","Merchant Username":"Merchant Username","Merchant Password":"Merchant Password","Generate Code":"Generate Code","Code generated automatically":"Code is generated automatically","Merchant saved":"Merchant saved","Edit Merchant":"Edit Merchant","No merchants yet":"No merchants yet","Merchant Returns":"Merchant Returns","Merchants":"Merchants","Drivers":"Drivers",
    "Governorates & Areas":"Governorates & Areas","Accounting":"Accounting","Driver Expenses":"Driver Expenses","Audit Log":"Audit Log",
    "Employees & Permissions":"Employees & Permissions","Employee Chat":"Employee Chat","Orders":"Orders","Edit Order":"Edit Order",
    "Add Merchant":"Add Merchant","Add Employee":"Add Employee","Add Governorate":"Add Governorate","Add Area":"Add Area",
    "Export Excel":"Export Excel","Export PDF":"Export PDF","Import Excel":"Import Excel","Save":"Save","Update":"Update",
    "No data":"No data","Loading...":"Loading...","From":"From","To":"To","Open":"Open","Edit":"Edit",
    "Status":"Status","To Be Picked Up":"To Be Picked Up","Reeplac":"Replace","Hald deliverd":"Partially Delivered","Delivered":"Delivered","Lost & Damaged":"Lost & Damaged","Returned by driver":"Returned by driver","Future delivery":"Future delivery","Cancelled":"Cancelled","Cancelled by shipper":"Cancelled by shipper","In ops":"In ops","Cancelled by reciver":"Cancelled by receiver","Merchant":"Merchant","Customer":"Customer","Delivery Fee":"Delivery Fee","Order Value":"Order Value",
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
  ["jobcode","New Job Code","New Job Code","code"],
  ["returns","Merchant Returns","المرتجعات للتاجر","return"],
  ["merchants","Merchants","التجار","store"],
  ["drivers","Drivers","السائقون","driver"],
  ["areas","Governorates & Areas","الإمارات والمناطق","pin"],
  ["accounting","Accounting","الحسابات","money"],
  ["expenses","Driver Expenses","مصروفات السائق","fuel"],
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
function today(){ return new Date().toISOString().slice(0,10); }
async function loadNextJobCode(){
  try{
    const d=await api("/api/new-job-code/next");
    if($("jcJob")) $("jcJob").value = d.next_job_code || "";
    return d.next_job_code || "";
  }catch(e){
    console.warn("NEXT JOB CODE:", e.message);
    return "";
  }
}
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }

function pagePermission(page){
  const map={
    dashboard:"dashboard", order:"orders", search:"orders", shipments:"shipments",
    jobs:"jobs", jobcode:"jobs", returns:"shipments", merchants:"merchants",
    drivers:"drivers", areas:"areas", accounting:"accounting", expenses:"expenses",
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
    return `<button data-page="${page}" class="${visible?"":"permission-hidden"}" ${visible?`onclick="show('${page}')`:"disabled"}><span class="nav-icon">${ICONS[icon]||""}</span><span>${LANG==="ar"?ar:en}</span></button>`;
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
function toggleLang(){LANG=LANG==="ar"?"en":"ar";localStorage.setItem("trend_lang",LANG);applyLanguage();if(TOKEN)show(CURRENT_PAGE);}

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
    else if(page==="drivers")await driversPage(c); else if(page==="areas")await areasPage(c); else if(page==="accounting")await accountingPage(c); else if(page==="expenses")await expensesPage(c);
    else if(page==="audit")await auditPage(c); else if(page==="employees")await employeesPage(c); else if(page==="chat")await chatPage(c); else c.innerHTML=`<div class="panel error">${esc(L("Page not found","الصفحة غير موجودة"))}</div>`;
    applyLanguage();
  }catch(e){console.error(e);c.innerHTML=`<div class="panel"><span class="error">${esc(e.message)}</span></div>`;}
}

function stat(label,n){return `<div class="stat"><span>${esc(label)}</span><b>${esc(n)}</b></div>`;}
async function dashboardPage(c){
  const d=await api("/api/dashboard"),x=d.data?.counts||{};
  c.innerHTML=`<h2>${L("Dashboard","لوحة التحكم")}</h2><div class="grid">${stat(L("Orders","الأوردرات"),x.orders||0)}${stat(L("Shipments","الشحنات"),x.shipments||0)}${stat(L("Delivery Jobs","مهام التوصيل"),x.jobs||0)}${stat(L("Drivers","السائقون"),x.drivers||0)}${stat(L("Merchants","التجار"),x.merchants||0)}${stat(L("Delivered","تم التسليم"),x.delivered||0)}${stat(L("Cancelled","ملغى"),x.cancelled||0)}${stat(L("Pending","قيد التنفيذ"),x.pending||0)}</div>
  <div class="panel"><h3>${t("Quick Search")}</h3><div class="row"><input id="quickSearch" placeholder="${esc(L("Customer / order / shipment number","رقم العميل / رقم الأوردر / رقم الشحنة"))}"><button onclick="quickSearch()">${t("Search")}</button></div><div id="quickResult"></div></div>`;
}
async function quickSearch(){const q=$("quickSearch")?.value.trim();if(!q)return msg("quickResult",L("Enter a search value","اكتب قيمة البحث"),"error");try{$("quickResult").innerHTML=renderSearch(await api("/api/search?q="+encodeURIComponent(q)));}catch(e){msg("quickResult",e.message,"error");}}

async function orderPage(c){
  const [m,g,a,s]=await Promise.all([api("/api/merchants"),api("/api/governorates"),api("/api/areas"),api("/api/order/next-serial")]);
  const govs=g.data||[], areas=a.data||[];
  c.innerHTML=orderFormHtml(s.next??s.serial??1,m.data||[],govs,areas,null)+`<div class="panel"><h3>${L("Import Orders from Excel","رفع الأوردرات من Excel")}</h3><p class="muted">${L("Required column: Merchant Order No. plus merchant_id or merchant name, customer data and value.","الأعمدة الأساسية: رقم أوردر التاجر، معرّف التاجر أو بيانات التاجر، بيانات العميل وقيمة الأوردر.")}</p><input id="orderFile" type="file" accept=".xlsx,.xls,.csv"><button class="ghost" onclick="importOrdersExcel()">${t("Import Excel")}</button><div id="orderImportMsg"></div></div>`;
  $("merchant")?.addEventListener("change",loadMerchantFee);
  $("gov")?.addEventListener("change",()=>refreshOrderAreas(areas));
  refreshOrderAreas(areas);
  loadMerchantFee();
}
function refreshOrderAreas(areas, selectedId=""){
  const govId=$("gov")?.value||"", select=$("area");
  if(!select) return;
  const list=(areas||[]).filter(x=>!govId || String(x.governorate_id)===String(govId));
  const current=selectedId || select.value || "";
  select.innerHTML=`<option value="">${esc(L("Select area","اختر المنطقة"))}</option>`+list.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(current)?"selected":""}>${esc(L(x.name_en,x.name_ar))}</option>`).join("");
}
function orderFormHtml(next,merchants,govs,areas,order){
  const o=order||{};
  return `<h2>${esc(order?t("Edit Order"):L("New Order","إدخال أوردر"))}</h2><div class="panel"><div class="form-grid">
  ${order?`<input id="edit_order_id" type="hidden" value="${esc(o.id)}">`:``}
  ${order?`<label>${t("Tracking Number")}<input id="tracking_number" value="${esc(o.shipment?.tracking_number||o.tracking_number||"")}" readonly></label>`:`<label>${t("Tracking Number")}<input value="${esc(L("Generated by system after saving","يتم إنشاؤه تلقائيًا بعد الحفظ"))}" readonly></label>`}
  <label>${t("Merchant")}<select id="merchant" required><option value="">${t("Select Merchant")}</option>${merchants.map(x=>`<option value="${esc(x.id)}" ${x.id===o.merchant_id?"selected":""}>${esc(x.name)} — ${esc(x.merchant_no||"")}</option>`).join("")}</select></label>
  <label>${t("Merchant Order No.")}<input id="merchant_order_no" value="${esc(o.merchant_order_no||"")}" placeholder="${esc(L("Required","إجباري"))}" required></label>
  <label>${t("Order Code")}<input id="order_code" value="${esc(o.order_code||"")}" readonly></label>
  ${order?`<label>${L("Job Code","Job Code")}<input id="order_job_code" value="${esc(o.shipment?.new_job_code||o.new_job_code||"")}" readonly></label>`:`<label>${L("Job Code","Job Code")}<input id="order_job_code" value="" readonly placeholder="${esc(L("Assigned from New Job Code","يتم ربطه من كود المهمة"))}"></label>`}
  <label>${L("Customer Name","اسم العميل")}<input id="customer_name" value="${esc(o.customer_name||o.customer?.name||"")}"></label>
  <label>${L("Customer Phone","رقم العميل / الهاتف")}<input id="customer_phone" value="${esc(o.customer_phone||o.customer?.phone||"")}"></label>
  <label>${L("Governorate","الإمارة")}<select id="gov"><option value="">${esc(L("Select governorate","اختر الإمارة"))}</option>${govs.map(x=>`<option value="${esc(x.id)}" ${x.id===o.governorate_id?"selected":""}>${esc(L(x.name_en,x.name_ar))}</option>`).join("")}</select></label>
  <label>${L("Area","المنطقة")}<select id="area"><option value="">${esc(L("Select area","اختر المنطقة"))}</option>${areas.filter(x=>!o.governorate_id || String(x.governorate_id)===String(o.governorate_id)).map(x=>`<option value="${esc(x.id)}" ${x.id===o.area_id?"selected":""}>${esc(L(x.name_en,x.name_ar))}</option>`).join("")}</select></label>
  <label class="full">${t("Address")}<input id="address" value="${esc(o.address||"")}"></label>
  <label>${t("Order Value")}<input id="value" type="number" step="0.01" value="${esc(o.value??"")}"></label>
  <label>${t("Delivery Fee")}<input id="delivery_fee" type="number" step="0.01" value="${esc(o.delivery_fee??"")}"><small id="merchantFeeHint" class="muted"></small></label>
  <label>${t("Status")}<select id="order_status"><option value="new" ${o.status==="new"?"selected":""}>new</option><option value="pending">pending</option><option value="delivered">delivered</option><option value="cancelled">cancelled</option></select></label>
  <label class="full">${L("Notes","ملاحظات")}<textarea id="notes">${esc(o.notes||"")}</textarea></label>
  </div><div class="actions"><button onclick="${order?"updateOrderFromForm()":"saveOrder()"}">${t(order?"Update":"Save")}</button><button class="ghost" onclick="show('jobcode')">🔢 ${L("Job Code","كود المهمة")}</button>${order?`<button class="ghost" onclick="show('shipments')">${L("Back to Shipments","العودة للشحنات")}</button>`:""}</div><div id="orderMsg" class="msg"></div></div>`;
}
async function loadMerchantFee(){const id=$("merchant")?.value;if(!id)return;try{const d=await api("/api/merchants");const m=(d.data||[]).find(x=>x.id===id);if(m){const fee=Number(m.base_delivery_fee||0);const input=$("delivery_fee");if(input&&!input.value)input.value=fee;const h=$("merchantFeeHint");if(h)h.textContent=L(`Saved merchant fee: ${fee}` ,`رسوم التوصيل المحفوظة للتاجر: ${fee}`);}}catch(_){} }
async function ensureXLSX(){
  if(typeof XLSX!=="undefined") return true;
  if(window.__xlsxLoaderPromise) return window.__xlsxLoaderPromise;
  const urls=[
    "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
  ];
  window.__xlsxLoaderPromise=(async()=>{
    for(const url of urls){
      try{
        await new Promise((resolve,reject)=>{
          const x=document.createElement("script");
          x.src=url; x.async=true; x.onload=resolve; x.onerror=reject;
          document.head.appendChild(x);
        });
        if(typeof XLSX!=="undefined") return true;
      }catch(_){}
    }
    return false;
  })();
  return window.__xlsxLoaderPromise;
}

async function importOrdersExcel(){const file=$("orderFile")?.files?.[0];if(!file)return msg("orderImportMsg",L("Choose an Excel file","اختر ملف Excel"),"error");if(!(await ensureXLSX()))return msg("orderImportMsg",L("Excel library could not be loaded","تعذر تحميل مكتبة Excel"),"error");try{const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false});if(!wb.SheetNames?.length)throw new Error(L("The Excel file has no worksheets.","ملف Excel لا يحتوي على أوراق بيانات."));const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:"",raw:false});if(!rows.length)throw new Error(L("The Excel sheet is empty.","ورقة Excel فارغة."));const d=await api("/api/orders/import",{method:"POST",body:JSON.stringify({rows})});msg("orderImportMsg",`${L("Imported","تم الرفع")}: ${d.imported} — ${L("Skipped","تم التخطي")}: ${d.skipped}`,"ok");if(d.errors?.length)console.warn(d.errors);}catch(e){msg("orderImportMsg",e.message,"error");}}
async function saveOrder(){const b=readOrderForm();if(!b.merchant_id)return msg("orderMsg",L("Select a merchant","اختر التاجر"),"error");if(!b.merchant_order_no)return msg("orderMsg",L("Merchant Order No. is required","رقم أوردر التاجر إجباري"),"error");try{const d=await api("/api/orders",{method:"POST",body:JSON.stringify(b)});msg("orderMsg",`${L("Saved. Tracking Number","تم الحفظ. رقم التتبع")}: ${d.trackingNumber||d.shipment?.tracking_number||d.shipment?.shipment_no||""}`,"ok");setTimeout(()=>show("order"),900);}catch(e){msg("orderMsg",e.message,"error");}}
function readOrderForm(){return {serial_no:Number($("serial")?.value),order_code:$("order_code")?.value.trim(),merchant_id:$("merchant")?.value,merchant_order_no:$("merchant_order_no")?.value.trim(),customer_name:$("customer_name")?.value.trim(),customer_phone:$("customer_phone")?.value.trim(),governorate_id:$("gov")?.value||null,area_id:$("area")?.value||null,address:$("address")?.value.trim(),value:Number($("value")?.value||0),delivery_fee:Number($("delivery_fee")?.value||0),status:$("order_status")?.value,notes:$("notes")?.value.trim()};}
async function openOrder(id){try{const d=await api("/api/orders/"+encodeURIComponent(id));const detail=d.data;const [m,g,a]=await Promise.all([api("/api/merchants"),api("/api/governorates"),api("/api/areas")]);const order={...(detail.order||{}),shipment:detail.shipment||null};const govs=g.data||[],areas=a.data||[];$("content").innerHTML=orderFormHtml(order.serial_no||1,m.data||[],govs,areas,order);$("merchant")?.addEventListener("change",loadMerchantFee);$("gov")?.addEventListener("change",()=>refreshOrderAreas(areas));refreshOrderAreas(areas,order.area_id||"");loadMerchantFee();}catch(e){alert(e.message);}}
async function updateOrderFromForm(){const b=readOrderForm();b.id=$("edit_order_id").value;try{await api("/api/orders",{method:"PATCH",body:JSON.stringify(b)});msg("orderMsg",L("Updated successfully","تم تعديل الأوردر بنجاح"),"ok");setTimeout(()=>show("shipments"),600);}catch(e){msg("orderMsg",e.message,"error");}}

function searchPage(c){c.innerHTML=`<h2>${t("Search")}</h2><div class="panel"><div class="row"><input id="searchQ" placeholder="${esc(L("Customer / order / shipment number","رقم العميل / رقم الأوردر / رقم الشحنة"))}"><button onclick="doSearch()">${t("Search")}</button></div><div id="searchResult"></div></div>`;}
async function doSearch(){const q=$("searchQ")?.value.trim();if(!q)return msg("searchResult",L("Enter a search value","اكتب قيمة البحث"),"error");try{$("searchResult").innerHTML=renderSearch(await api("/api/search?q="+encodeURIComponent(q)));}catch(e){msg("searchResult",e.message,"error");}}
function renderSearch(d){if(!d?.data)return `<p class="muted">${t("No data")}</p>`;const x=d.data;const o=x.order||x;const id=o.id||x.order_id;const tracking=x.tracking_number||x.shipment?.tracking_number||x.shipment_no||x.shipment?.shipment_no||"";return `<div class="panel"><h3>${esc(d.type||"")}</h3><div class="detail-grid"><div><b>${t("Tracking Number")}</b><br>${esc(tracking)}</div><div><b>${t("Merchant Order No.")}</b><br>${esc(o.merchant_order_no||"")}</div><div><b>${t("Order Code")}</b><br>${esc(o.order_code||"")}</div><div><b>${t("Merchant")}</b><br>${esc(x.merchant?.name||"")}</div><div><b>${t("Customer")}</b><br>${esc(o.customer_name||"")}</div><div><b>${t("Status")}</b><br><span class="badge">${esc(x.status||o.status||"")}</span></div><div><b>${t("Delivery Fee")}</b><br>${esc(o.delivery_fee||0)}</div></div><div class="actions"><button onclick="openOrder('${esc(id)}')">${t("Edit")}</button><button class="ghost" onclick='exportRowsExcel([${JSON.stringify({...o,tracking_number:tracking})}],"search-result")'>${t("Export Excel")}</button><button class="ghost" onclick='printRowsPDF([${JSON.stringify({...o,tracking_number:tracking})}],"${esc(o.merchant_order_no||o.order_code||"order")}")'>${t("Print / PDF")}</button></div></div>`;}

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
async function jobCodePage(c){
  c.innerHTML=`<h2>${t("New Job Code")}</h2>
  <div class="panel compact-panel">
    <div class="form-grid compact-grid">
      <label>${L("Release Date","تاريخ خروج In ops")}<input id="jcReleaseDate" type="date" value="${today()}"></label>
      <label>${L("Shipment No.","رقم الشحنة / Tracking Number")}<input id="jcShipment" inputmode="numeric" autocomplete="off" autofocus></label>
      <label>${L("Job Code","Job Code")}<input id="jcJob" inputmode="numeric" autocomplete="off" readonly></label>
    </div>
    <div id="jcMsg" class="msg"></div>
  </div>`;
  const shipment=$("jcShipment"), job=$("jcJob");
  await loadNextJobCode();
  shipment?.focus();
  shipment?.addEventListener("keydown",e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      if(shipment.value.trim()) job?.focus();
    }
  });
  job?.addEventListener("keydown",e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      saveJobCode();
    }
  });
}
async function saveJobCode(){
  const shipment=$("jcShipment")?.value.trim(), job=$("jcJob")?.value.trim(), releaseDate=$("jcReleaseDate")?.value || today();
  if(!shipment)return msg("jcMsg",L("Enter shipment number","اكتب رقم الشحنة"),"error");
  if(!job)return msg("jcMsg",L("Enter Job Code","اكتب Job Code"),"error");
  try{
    const d=await api("/api/new-job-code",{method:"POST",body:JSON.stringify({
      shipment_no:shipment,
      delivery_job_code:job,
      release_date:releaseDate
    })});
    msg("jcMsg",d.message||L("Saved","تم الحفظ"),"ok");
    if(d.duplicate){
      alert(L("Duplicate Job Code","Job Code مكرر بالفعل"));
      return;
    }
    if($("jcShipment")){$("jcShipment").value="";$("jcShipment").focus();}
    await loadNextJobCode();
  }catch(e){
    msg("jcMsg",e.message,"error");
    if(/مكرر|duplicate/i.test(e.message)) alert(e.message);
    $("jcShipment")?.focus();
  }
}
async function returnsPage(c){const d=await api("/api/returns");c.innerHTML=`<h2>${t("Merchant Returns")}</h2><div class="panel">${table(d.data||[],["shipment_id","reason_status","status","created_at"])}</div>`;}

async function merchantsPage(c){
  try{
    const d=await api("/api/merchants");
    const rows=Array.isArray(d.data)?d.data:[];
    const next=await api("/api/merchants/next-code").catch(()=>({code:"AB000001"}));
    const nextCode=next.code||"AB000001";
    c.innerHTML=`<h2>${t("Merchants")}</h2>
    <div class="panel merchant-add-panel">
      <h3>${t("Add Merchant")}</h3>
      <div class="merchant-form-grid">
        <label>${t("Name")}<input id="mname" placeholder="اسم التاجر" required></label>
        <label>${t("Merchant Code")}<input id="mc" value="${esc(nextCode)}" readonly><small class="muted">${t("Code generated automatically")}</small></label>
        <label>${t("Merchant No.")}<input id="mn" placeholder="يتم إنشاؤه تلقائيًا إذا تركته فارغًا"></label>
        <label>${t("Phone")}<input id="mphone" inputmode="tel" placeholder="رقم الهاتف"></label>
        <label class="full">${t("Address")}<input id="maddress" placeholder="العنوان الكامل"></label>
        <label>${t("Merchant Username")}<input id="musername" autocomplete="off" placeholder="اسم المستخدم لتطبيق التاجر"></label>
        <label>${t("Merchant Password")}<input id="mpassword" type="password" autocomplete="new-password" placeholder="كلمة المرور لتطبيق التاجر"></label>
        <label>${t("Default Delivery Fee")}<input id="mfee" type="number" min="0" step="0.01" value="0"></label>
        <label class="merchant-check"><span>${t("Tax")} <input id="mtax" type="checkbox"></span></label>
        <label>${t("Tax Rate")}<input id="mrate" type="number" min="0" max="100" step="0.01" value="0"></label>
        <label>${t("Store Type")}<select id="mstoretype"><option value="">--</option><option>ecommerce</option><option>website</option><option>app</option><option>other</option></select></label>
        <label>${t("Store Name")}<input id="mstorename"></label>
        <label class="full">${t("Store URL")}<input id="mstoreurl" type="url" placeholder="https://"></label>
        <label class="merchant-check"><span>${t("Active")} <input id="mactive" type="checkbox" checked></span></label>
        <label class="merchant-check"><span>${t("Store") } ${t("Active")} <input id="mstoreactive" type="checkbox" checked></span></label>
        <label class="full">${t("Proof Images")}<input id="mproof" type="file" accept="image/*" multiple><small class="muted">يمكن رفع أكثر من صورة لإثبات التاجر</small><div id="proofPreview" class="proof-preview"></div></label>
      </div>
      <div class="actions"><button onclick="addMerchant()">${t("Save")}</button><button class="ghost" onclick="show('merchants')">${t("Update")}</button></div>
      <div id="merchantMsg"></div>
    </div>
    <div class="panel"><h3>${t("Merchants")}</h3>
      ${rows.length?`<div class="table-wrap"><table><thead><tr><th>${t("Name")}</th><th>${t("Merchant Code")}</th><th>${t("Merchant No.")}</th><th>${t("Phone")}</th><th>${t("Address")}</th><th>${t("Merchant Username")}</th><th>${t("Tax")}</th><th>${t("Store")}</th><th>${t("Status")}</th><th>${t("Edit")}</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td><span class="badge merchant-code-badge">${esc(r.code||"")}</span></td><td>${esc(r.merchant_no||"")}</td><td>${esc(r.phone||"")}</td><td>${esc(r.address||"")}</td><td>${esc(r.portal_username||"")}</td><td>${r.tax_enabled?esc(r.tax_rate)+"%":"—"}</td><td>${esc(r.store_name||"")}</td><td>${r.active?"🟢 "+t("Active"):"🔴 "+t("Inactive")}</td><td><button onclick="editMerchant('${esc(r.id)}')">${t("Edit")}</button></td></tr>`).join("")}
      </tbody></table></div>`:`<div class="empty-state">${t("No merchants yet")}</div>`}
    </div>
    <div class="panel"><h3>${L("WooCommerce Store Integration","ربط متجر WooCommerce")}</h3><div class="form-grid">
      <label>${t("Merchant")}<select id="imMerchant">${rows.map(r=>`<option value="${esc(r.id)}">${esc(r.name)} — ${esc(r.code||r.merchant_no||"")}</option>`).join("")}</select></label>
      <label>${t("Store Name")}<input id="imName" placeholder="WooCommerce Store"></label>
      <label class="full">${t("Store URL")}<input id="imUrl" placeholder="https://example.com"></label>
      <label>${t("Consumer Key")}<input id="imKey" type="password" autocomplete="off"></label>
      <label>${t("Consumer Secret")}<input id="imSecret" type="password" autocomplete="off"></label>
      <label><span>${t("Auto Import")} <input id="imAuto" type="checkbox" checked></span></label>
    </div><div class="actions"><button onclick="addWooIntegration()">${t("Save")}</button><button class="ghost" onclick="loadWooIntegrations()">${L("Refresh","تحديث")}</button></div><div id="imMsg"></div><div id="wooIntegrations"></div></div>`;
    $("mproof")?.addEventListener("change",previewMerchantProofs);
    await loadWooIntegrations();
  }catch(e){
    c.innerHTML=`<h2>${t("Merchants")}</h2><div class="panel"><div class="error">${esc(e.message)}</div><button onclick="show('merchants')">${L("Retry","إعادة التحميل")}</button></div>`;
  }
}

async function previewMerchantProofs(){
  const box=$("proofPreview"); if(!box)return; box.innerHTML="";
  for(const file of Array.from($("mproof")?.files||[])){
    if(!file.type.startsWith("image/"))continue;
    const img=document.createElement("img"); img.src=URL.createObjectURL(file); img.alt=file.name; box.appendChild(img);
  }
}

function readProofFiles(){
  const files=Array.from($("mproof")?.files||[]);
  if(files.length>8) throw new Error(L("Maximum 8 proof images","الحد الأقصى 8 صور لإثبات التاجر"));
  return Promise.all(files.map(file=>new Promise((resolve,reject)=>{
    if(file.size>600*1024)return reject(new Error(`${file.name}: ${L("image is too large","الصورة كبيرة جدًا؛ الحد 600KB")}`));
    const r=new FileReader(); r.onload=()=>resolve({name:file.name,type:file.type,data:r.result}); r.onerror=()=>reject(new Error(L("Could not read image","تعذر قراءة الصورة"))); r.readAsDataURL(file);
  })));
}

async function addMerchant(){
  try{
    const name=$("mname").value.trim();
    if(!name)return msg("merchantMsg",L("Merchant name is required","اسم التاجر مطلوب"),"error");
    const proof_images=await readProofFiles();
    await api("/api/merchants",{method:"POST",body:JSON.stringify({
      merchant_no:$("mn").value.trim(), code:$("mc").value.trim(), name, phone:$("mphone").value.trim(), address:$("maddress").value.trim(),
      portal_username:$("musername").value.trim(), portal_password:$("mpassword").value, proof_images,
      active:$("mactive").checked, base_delivery_fee:Number($("mfee").value||0), tax_enabled:$("mtax").checked, tax_rate:Number($("mrate").value||0),
      store_type:$("mstoretype").value, store_name:$("mstorename").value.trim(), store_url:$("mstoreurl").value.trim(), store_active:$("mstoreactive").checked
    })});
    msg("merchantMsg",L("Merchant saved","تم حفظ التاجر بنجاح"),"ok");
    setTimeout(()=>show("merchants"),700);
  }catch(e){msg("merchantMsg",e.message,"error");}
}

async function editMerchant(id){
  try{
    const d=await api("/api/merchants"),m=(d.data||[]).find(x=>x.id===id); if(!m)return;
    const proofHtml=(m.proof_images||[]).map(x=>`<img src="${esc(x.data||x.url||"")}" alt="${esc(x.name||"")}">`).join("");
    const wrap=$("content");
    wrap.innerHTML=`<h2>${t("Edit Merchant")}</h2><div class="panel"><div class="merchant-form-grid">
      <label>${t("Name")}<input id="emname" value="${esc(m.name)}"></label><label>${t("Merchant Code")}<input id="emcode" value="${esc(m.code||"")}" readonly></label>
      <label>${t("Merchant No.")}<input id="emno" value="${esc(m.merchant_no||"")}"></label><label>${t("Phone")}<input id="emphone" value="${esc(m.phone||"")}"></label>
      <label class="full">${t("Address")}<input id="emaddress" value="${esc(m.address||"")}"></label>
      <label>${t("Merchant Username")}<input id="emusername" value="${esc(m.portal_username||"")}" autocomplete="off"></label><label>${t("Merchant Password")}<input id="empassword" type="password" placeholder="اتركها فارغة لعدم التغيير" autocomplete="new-password"></label>
      <label>${t("Default Delivery Fee")}<input id="emfee" type="number" min="0" step="0.01" value="${esc(m.base_delivery_fee||0)}"></label><label class="merchant-check"><span>${t("Tax")} <input id="emtax" type="checkbox" ${m.tax_enabled?"checked":""}></span></label>
      <label>${t("Tax Rate")}<input id="emrate" type="number" min="0" max="100" step="0.01" value="${esc(m.tax_rate||0)}"></label><label>${t("Store Type")}<select id="emstoretype"><option value="">--</option><option ${m.store_type==="ecommerce"?"selected":""}>ecommerce</option><option ${m.store_type==="website"?"selected":""}>website</option><option ${m.store_type==="app"?"selected":""}>app</option><option ${m.store_type==="other"?"selected":""}>other</option></select></label>
      <label>${t("Store Name")}<input id="emstorename" value="${esc(m.store_name||"")}"></label><label>${t("Store URL")}<input id="emstoreurl" value="${esc(m.store_url||"")}"></label>
      <label class="merchant-check"><span>${t("Active")} <input id="emactive" type="checkbox" ${m.active!==false?"checked":""}></span></label><label class="merchant-check"><span>${t("Store")} ${t("Active")} <input id="emstoreactive" type="checkbox" ${m.store_active!==false?"checked":""}></span></label>
      <label class="full">${t("Proof Images")}<input id="emproof" type="file" accept="image/*" multiple><div class="proof-preview">${proofHtml}</div></label>
    </div><div class="actions"><button onclick="updateMerchant('${esc(id)}')">${t("Update")}</button><button class="ghost" onclick="show('merchants')">${t("Merchants")}</button></div><div id="editMerchantMsg"></div></div>`;
  }catch(e){alert(e.message);}
}

async function updateMerchant(id){
  try{
    const proof_images=await readProofFilesFor("emproof");
    const body={id,merchant_no:$("emno").value.trim(),code:$("emcode").value.trim(),name:$("emname").value.trim(),phone:$("emphone").value.trim(),address:$("emaddress").value.trim(),portal_username:$("emusername").value.trim(),portal_password:$("empassword").value,active:$("emactive").checked,store_active:$("emstoreactive").checked,base_delivery_fee:Number($("emfee").value||0),tax_enabled:$("emtax").checked,tax_rate:Number($("emrate").value||0),store_type:$("emstoretype").value,store_name:$("emstorename").value.trim(),store_url:$("emstoreurl").value.trim()};
    if(proof_images.length)body.proof_images=proof_images;
    await api("/api/merchants",{method:"PATCH",body:JSON.stringify(body)});
    msg("editMerchantMsg",L("Merchant saved","تم حفظ التاجر"),"ok"); setTimeout(()=>show("merchants"),700);
  }catch(e){msg("editMerchantMsg",e.message,"error");}
}

function readProofFilesFor(id){
  const files=Array.from($(id)?.files||[]); if(files.length>8)throw new Error(L("Maximum 8 proof images","الحد الأقصى 8 صور"));
  return Promise.all(files.map(file=>new Promise((resolve,reject)=>{if(file.size>600*1024)return reject(new Error(`${file.name}: ${L("image is too large","الصورة كبيرة جدًا؛ الحد 600KB")}`));const r=new FileReader();r.onload=()=>resolve({name:file.name,type:file.type,data:r.result});r.onerror=()=>reject(new Error(L("Could not read image","تعذر قراءة الصورة")));r.readAsDataURL(file);}))); 
}

async function driversPage(c){const d=await api("/api/drivers");c.innerHTML=`<h2>${t("Drivers")}</h2><div class="panel">${table(d.data||[],["driver_no","name","phone","vehicle_no","active","created_at"])}</div>`;}

async function areasPage(c){
  try{
    const [g,a]=await Promise.all([api("/api/governorates"),api("/api/areas")]);
    const govs=g.data||[], areas=a.data||[];
    const govMap=Object.fromEntries(govs.map(x=>[x.id,x]));
    const areaExport=areas.map(x=>({governorate:govMap[x.governorate_id]?.name_ar||"",area:x.name_ar||"",area_en:x.name_en||""}));
    c.innerHTML=`<h2>${t("Governorates & Areas")}</h2>
    <div class="panel areas-toolbar"><h3>${t("Import / Export Areas")}</h3><p class="muted">${t("Excel file contains columns: الإمارة, المنطقة, اسم المنطقة EN (optional)")}</p>
    <div class="row"><input id="areaFile" type="file" accept=".xlsx,.xls,.csv"><button onclick="importAreasExcel()">${t("Import Excel")}</button><button class="ghost" onclick='exportRowsExcel(${JSON.stringify(areaExport)},"areas")'>${t("Export Excel")}</button><button class="ghost" onclick='printRowsPDF(${JSON.stringify(areaExport)},"governorates-areas")'>${t("Export PDF")}</button></div><div id="areaMsg"></div></div>
    <div class="panel"><h3>${t("Add Governorate")}</h3><div class="form-grid"><label>${t("Governorate Arabic")}<input id="govAr" placeholder="مثال: أبوظبي"></label><label>English<input id="govEn" placeholder="Abu Dhabi"></label></div><button onclick="addGovernorate()">${t("Save")}</button></div>
    <div class="panel"><h3>${t("Add Area")}</h3><div class="form-grid"><label>${t("Governorate")}<select id="areaGov"><option value="">${t("Select")}</option>${govs.map(x=>`<option value="${esc(x.id)}">${esc(x.name_ar)}${x.name_en?` — ${esc(x.name_en)}`:""}</option>`).join("")}</select></label><label>${t("Area Arabic")}<input id="areaAr" placeholder="اسم المنطقة"></label><label>English<input id="areaEn" placeholder="Area name"></label></div><button onclick="addArea()">${t("Save")}</button></div>
    <div class="panel"><h3>${t("Governorates")}</h3>${govs.length?`<div class="table-wrap"><table><thead><tr><th>${t("Governorate Arabic")}</th><th>English</th><th>${t("Areas")}</th></tr></thead><tbody>${govs.map(g=>`<tr><td>${esc(g.name_ar||"")}</td><td>${esc(g.name_en||"")}</td><td>${areas.filter(a=>a.governorate_id===g.id).length}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty-state">${t("No data")}</div>`}</div>
    <div class="panel"><h3>${t("Areas")}</h3>${areas.length?`<div class="table-wrap"><table><thead><tr><th>${t("Governorate")}</th><th>${t("Area Arabic")}</th><th>English</th></tr></thead><tbody>${areas.map(a=>`<tr><td>${esc(govMap[a.governorate_id]?.name_ar||a.governorate_id||"")}</td><td>${esc(a.name_ar||"")}</td><td>${esc(a.name_en||"")}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty-state">${t("No data")}</div>`}</div>`;
  }catch(e){c.innerHTML=`<h2>${t("Governorates & Areas")}</h2><div class="panel error">${esc(e.message)}</div>`;}
}
async function addGovernorate(){try{await api("/api/governorates",{method:"POST",body:JSON.stringify({name_ar:$('govAr').value,name_en:$('govEn').value})});show("areas");}catch(e){alert(e.message);}}
async function addArea(){try{await api("/api/areas",{method:"POST",body:JSON.stringify({governorate_id:$('areaGov').value,name_ar:$('areaAr').value,name_en:$('areaEn').value})});show("areas");}catch(e){alert(e.message);}}
async function importAreasExcel(){const file=$("areaFile")?.files?.[0];if(!file)return msg("areaMsg",L("Choose an Excel file","اختر ملف Excel"),"error");if(!(await ensureXLSX()))return msg("areaMsg",L("Excel library could not be loaded. Please refresh and try again, or use CSV.","تعذر تحميل مكتبة Excel. حدّث الصفحة وحاول مرة أخرى، أو استخدم CSV."),"error");try{const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false});if(!wb.SheetNames?.length)throw new Error(L("The Excel file has no worksheets.","ملف Excel لا يحتوي على أوراق بيانات."));const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:"",raw:false});if(!rows.length)throw new Error(L("The Excel sheet is empty.","ورقة Excel فارغة."));const d=await api("/api/areas/import",{method:"POST",body:JSON.stringify({rows})});msg("areaMsg",`${t("Imported")}: ${d.imported} — ${t("Skipped")}: ${d.skipped}${d.errors?.length?` — ${L("Errors","أخطاء")}: ${d.errors.length}`:""}`,"ok");setTimeout(()=>show("areas"),900);}catch(e){msg("areaMsg",e.message,"error");}}

async function accountingPage(c){const [s,d]=await Promise.all([api("/api/accounting/summary"),api("/api/transactions")]);const x=s.data||{};const rows=d.data||[];c.innerHTML=`<h2>${t("Accounting")}</h2><div class="accounting-cards"><div class="account-card"><span>${L("Orders","الأوردرات")}</span><b>${Number(x.totalOrders||0).toLocaleString()}</b></div><div class="account-card"><span>${L("Order Value","قيمة الأوردرات")}</span><b>${Number(x.orderValue||0).toFixed(2)}</b></div><div class="account-card"><span>${L("Delivery Fees","رسوم التوصيل")}</span><b>${Number(x.deliveryFees||0).toFixed(2)}</b></div><div class="account-card"><span>${L("Taxes","الضرائب")}</span><b>${Number(x.taxes||0).toFixed(2)}</b></div><div class="account-card"><span>${L("Merchant Net","صافي التجار")}</span><b>${Number(x.merchantNet||0).toFixed(2)}</b></div></div><div class="panel accounting-transactions"><h3>${t("Transactions")}</h3>${rows.length?table(rows,["account_type","transaction_type","amount","direction","status","created_at"]):`<div class="empty-state">${t("No data")}</div>`}</div>`;}
async function expensesPage(c){const d=await api("/api/drivers");c.innerHTML=`<h2>${t("Driver Expenses")}</h2><div class="panel"><div class="form-grid"><label>${t("Drivers")}<select id="exDriver"><option value=""></option>${(d.data||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select></label><label>${L("Type","النوع")}<select id="exType"><option>petrol</option><option>maintenance</option><option>road</option><option>operating</option><option>other</option></select></label><label>${L("Amount","المبلغ")}<input id="exAmount" type="number" step="0.01"></label><label>${L("Date","التاريخ")}<input id="exDate" type="date" value="${today()}"></label><label class="full">${L("Notes","ملاحظات")}<textarea id="exNotes"></textarea></label></div><button onclick="saveExpense()">${t("Save")}</button><div id="exMsg"></div></div>`;}
async function saveExpense(){try{await api("/api/expenses",{method:"POST",body:JSON.stringify({driver_id:$("exDriver").value||null,expense_type:$("exType").value,amount:Number($("exAmount").value),expense_date:$("exDate").value,notes:$("exNotes").value})});msg("exMsg",L("Saved","تم الحفظ"),"ok");}catch(e){msg("exMsg",e.message,"error");}}
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

async function chatPage(c){
  const users=await api("/api/chat/users").catch(()=>({data:[]}));
  c.innerHTML=`<h2>${t("Employee Chat")}</h2><div class="panel chat-panel"><div class="row"><label>${L("To","إلى")}<select id="chatRecipient"><option value="">${L("All Employees","كل الموظفين")}</option>${(users.data||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.username||x.email||"")}</option>`).join("")}</select></label></div><div id="chatMessages" class="chat-messages"></div><div class="row chat-compose"><input id="chatInput" placeholder="${esc(L("Write a message...","اكتب رسالة..."))}"><button onclick="sendChat()">${t("Send")}</button></div></div>`;
  await loadChat(); CHAT_TIMER=setInterval(loadChat,5000);
  $("chatInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")sendChat();});
}
async function loadChat(){if(CURRENT_PAGE!=="chat")return;try{const d=await api("/api/chat");const box=$("chatMessages");if(!box)return;box.innerHTML=(d.data||[]).map(x=>`<div class="chat-message"><b>${esc(x.sender_name||"Employee")}</b><small>${esc((x.created_at||"").slice(0,16).replace("T"," "))}</small><p>${esc(x.message||"")}</p></div>`).join("")||`<p class="muted">${t("No data")}</p>`;box.scrollTop=box.scrollHeight;}catch(e){console.warn(e.message);}}
async function sendChat(){const input=$("chatInput"),message=input?.value.trim();if(!message)return;try{await api("/api/chat",{method:"POST",body:JSON.stringify({message,recipient_id:$("chatRecipient")?.value||null})});input.value="";await loadChat();}catch(e){alert(e.message);}}

function table(rows,cols){if(!rows||!rows.length)return `<p class="muted">${t("No data")}</p>`;return `<div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c]??"")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;}

async function exportRowsExcel(rows,name="export"){
  if(!(await ensureXLSX()))return alert(L("Excel library could not be loaded","تعذر تحميل مكتبة Excel"));
  const ws=XLSX.utils.json_to_sheet(rows||[]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Data");XLSX.writeFile(wb,`${name}-${today()}.xlsx`);
}
function printRowsPDF(rows,title){
  const keys=[...new Set((rows||[]).flatMap(x=>Object.keys(x||{})))];
  const html=`<!doctype html><html dir="${LANG==="ar"?"rtl":"ltr"}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:7px;text-align:${LANG==="ar"?"right":"left"} }</style></head><body><h2>${esc(title)}</h2><table><thead><tr>${keys.map(k=>`<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${(rows||[]).map(r=>`<tr>${keys.map(k=>`<td>${esc(r[k]??"")}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`;
  const w=window.open("","_blank");if(!w)return alert(L("Allow popups to print/save PDF","اسمح بالنوافذ المنبثقة للطباعة وحفظ PDF"));w.document.write(html);w.document.close();
}

Object.assign(window,{login,logout,toggleLang,show,quickSearch,doSearch,openOrder,saveOrder,updateOrderFromForm,loadShipments,setStatus,createJob,saveJobCode,addMerchant,editMerchant,addGovernorate,addArea,importAreasExcel,saveExpense,addEmployee,toggleEmployee,deleteEmployee,addRole,importOrdersExcel,sendChat,exportRowsExcel,printRowsPDF,exportShipmentsExcel,exportShipmentsPDF,testWoo,importWoo,addWooIntegration});

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
