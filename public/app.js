/* Trend Delivery Service - full management frontend */
"use strict";

let TOKEN = localStorage.getItem("trend_token") || "";
let LANG = localStorage.getItem("trend_lang") || "ar";
let CURRENT_PAGE = "dashboard";
let CHAT_TIMER = null;
const $ = id => document.getElementById(id);

const I18N = {
  ar: {
    "Trend Delivery Service":"Trend Delivery Service","System Login":"تسجيل الدخول للنظام","Login":"دخول","Logout":"خروج",
    "Dashboard":"لوحة التحكم","New Order":"إدخال أوردر","Search":"بحث","Shipments":"الشحنات","Delivery Jobs":"مهام التوصيل",
    "Update Delivery Job Code":"تحديث كود مهمة التوصيل","Merchant Returns":"المرتجعات للتاجر","Merchants":"التجار","Drivers":"السائقون",
    "Governorates & Areas":"الإمارات والمناطق","Accounting":"الحسابات","Driver Expenses":"مصروفات السائق","Audit Log":"سجل العمليات",
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
    "Imported":"تم الرفع","Success":"تم بنجاح","Error":"خطأ","WooCommerce":"WooCommerce","Consumer Key":"مفتاح WooCommerce","Consumer Secret":"سر WooCommerce","Test Connection":"اختبار الاتصال","Import Orders":"سحب الأوردرات","Auto Import":"سحب تلقائي","Connection successful":"تم الاتصال بنجاح","Orders imported":"تم سحب الأوردرات","To Be Picked Up":"في انتظار الاستلام","Reeplac":"تبديل","Hald deliverd":"تسليم جزء","Delivered":"تم التسليم","Lost & Damaged":"مفقود أو تالف","Returned by driver":"تم الإرجاع بواسطة المندوب","Future delivery":"تسليم مستقبلي","Cancelled":"كنسل","Cancelled by shipper":"كنسل على التاجر","Cancelled by reciver":"كنسل على الزبون","In ops":"داخل المخزن","Warehouse Intake":"استلام المخزن","Shortage":"العجز","Expensive":"مصاريف إضافية","Expenses":"المصاريف","Select All":"تحديد الكل","Bulk Status":"تغيير الحالة","Future Delivery Date":"تاريخ التسليم الجديد","Delivery Job PDF":"PDF مهمة التوصيل","Tracking Edit":"تعديل رقم التتبع"
  },
  en: {
    "Trend Delivery Service":"Trend Delivery Service","System Login":"System Login","Login":"Login","Logout":"Logout",
    "Dashboard":"Dashboard","New Order":"New Order","Search":"Search","Shipments":"Shipments","Delivery Jobs":"Delivery Jobs",
    "Update Delivery Job Code":"Update Delivery Job Code","Merchant Returns":"Merchant Returns","Merchants":"Merchants","Drivers":"Drivers",
    "Governorates & Areas":"Governorates & Areas","Accounting":"Accounting","Driver Expenses":"Driver Expenses","Audit Log":"Audit Log",
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
    "Imported":"Imported","Success":"Success","Error":"Error","WooCommerce":"WooCommerce","Consumer Key":"Consumer Key","Consumer Secret":"Consumer Secret","Test Connection":"Test Connection","Import Orders":"Import Orders","Auto Import":"Auto Import","Connection successful":"Connection successful","Orders imported":"Orders imported","To Be Picked Up":"To Be Picked Up","Reeplac":"Reeplac","Hald deliverd":"Hald deliverd","Delivered":"Delivered","Lost & Damaged":"Lost & Damaged","Returned by driver":"Returned by driver","Future delivery":"Future delivery","Cancelled":"Cancelled","Cancelled by shipper":"Cancelled by shipper","Cancelled by reciver":"Cancelled by reciver","In ops":"In ops","Warehouse Intake":"Warehouse Intake","Shortage":"Shortage","Expensive":"Expensive","Expenses":"Expenses","Select All":"Select All","Bulk Status":"Bulk Status","Future Delivery Date":"Future Delivery Date","Delivery Job PDF":"Delivery Job PDF","Tracking Edit":"Edit Tracking Number"
  }
};

const SIDEBAR = [
  ["dashboard","⌂ ","Dashboard"],["order","＋ ","New Order"],["search","⌕ ","Search"],["shipments","▣ ","Shipments"],
  ["jobs","▣ ","Delivery Jobs"],["jobcode","# ","Update Delivery Job Code"],["returns","↩ ","Merchant Returns"],
  ["merchants","▦ ","Merchants"],["drivers","♙ ","Drivers"],["driveraccount","▣ ","Driver Account"],["warehouse","▤ ","Warehouse Intake"],["areas","⌖ ","Governorates & Areas"],
  ["accounting","¤ ","Accounting"],["expenses","− ","Driver Expenses"],["audit","▤ ","Audit Log"],
  ["employees","♙ ","Employees & Permissions"],["chat","▰ ","Employee Chat"]
];

function L(en, ar) { return LANG === "ar" ? (ar || en) : en; }
function t(x){ return I18N[LANG]?.[x] || x; }
function esc(s){ return String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
function msg(id,text,cls=""){ const el=$(id); if(el) el.innerHTML=`<span class="${cls||""}">${esc(text)}</span>`; }
function today(){ return new Date().toISOString().slice(0,10); }
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }

function applyLanguage(){
  document.documentElement.lang=LANG;
  document.documentElement.dir=LANG === "ar" ? "rtl":"ltr";
  const lb=document.querySelector("header .ghost"); if(lb) lb.textContent=LANG==="ar"?"AR / EN":"EN / AR";
  const out=document.querySelector("header .danger"); if(out) out.textContent=L("Logout","خروج");
  const sidebar=$("sidebar");
  if(sidebar) sidebar.querySelectorAll("button").forEach(btn=>{
    const page=btn.dataset.page || (btn.getAttribute("onclick")||"").match(/show\(['"]([^'"]+)['"]\)/)?.[1];
    const item=SIDEBAR.find(x=>x[0]===page); if(item){btn.dataset.page=item[0];btn.textContent=item[1]+t(item[2]);}
  });
  const login=$("login");
  if(login){ const h=login.querySelector("h1"),p=login.querySelector("p"),b=$("loginBtn"),u=$("username"); if(h)h.textContent=t("Trend Delivery Service");if(p)p.textContent=t("System Login");if(u)u.placeholder=L("Username","اسم المستخدم");if(b)b.textContent=t("Login"); }
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
function logout(){TOKEN="";localStorage.removeItem("trend_token");if(CHAT_TIMER)clearInterval(CHAT_TIMER);location.reload();}
function toggleLang(){LANG=LANG==="ar"?"en":"ar";localStorage.setItem("trend_lang",LANG);applyLanguage();if(TOKEN)show(CURRENT_PAGE);}

async function show(page){
  CURRENT_PAGE=page; const c=$("content"); if(!c)return;
  c.innerHTML=`<div class="panel"><p class="muted">${esc(t("Loading..."))}</p></div>`;
  if(CHAT_TIMER){clearInterval(CHAT_TIMER);CHAT_TIMER=null;}
  try{
    if(page==="dashboard")await dashboardPage(c); else if(page==="order")await orderPage(c); else if(page==="search")searchPage(c); else if(page==="shipments")await shipmentsPage(c);
    else if(page==="jobs")await jobsPage(c); else if(page==="jobcode")await jobCodePage(c); else if(page==="returns")await returnsPage(c); else if(page==="merchants")await merchantsPage(c);
    else if(page==="drivers")await driversPage(c); else if(page==="driveraccount")await driverAccountPage(c); else if(page==="warehouse")await warehousePage(c); else if(page==="areas")await areasPage(c); else if(page==="accounting")await accountingPage(c); else if(page==="expenses")await expensesPage(c);
    else if(page==="audit")await auditPage(c); else if(page==="employees")await employeesPage(c); else if(page==="chat")await chatPage(c); else c.innerHTML=`<div class="panel error">${esc(L("Page not found","الصفحة غير موجودة"))}</div>`;
    applyLanguage();
  }catch(e){console.error(e);c.innerHTML=`<div class="panel"><span class="error">${esc(e.message)}</span></div>`;}
}

function stat(label,n){return `<div class="stat"><span>${esc(label)}</span><b>${esc(n)}</b></div>`;}
async function dashboardPage(c){
  const d=await api("/api/dashboard"),x=d.data?.counts||{};
  c.innerHTML=`<h2>${L("Dashboard","لوحة التحكم")}</h2><div class="grid">${stat(L("Orders","الأوردرات"),x.orders||0)}${stat(L("Shipments","الشحنات"),x.shipments||0)}${stat(L("Delivery Jobs","مهام التوصيل"),x.jobs||0)}${stat(L("Drivers","السائقون"),x.drivers||0)}${stat(L("Merchants","التجار"),x.merchants||0)}${stat(t("Delivered"),x.delivered||0)}${stat(t("Cancelled"),x.cancelled||0)}${stat(L("Pending","قيد التنفيذ"),x.pending||0)}</div>
  <div class="panel"><h3>${t("Quick Search")}</h3><div class="row"><input id="quickSearch" placeholder="${esc(L("Customer / order / shipment number","رقم العميل / رقم الأوردر / رقم الشحنة"))}"><button onclick="quickSearch()">${t("Search")}</button></div><div id="quickResult"></div></div>
  <div class="panel"><h3>${L("Orders / Bulk Actions","الأوردرات / الإجراءات الجماعية")}</h3><div class="actions"><button onclick="loadDashboardOrders()">${L("Refresh Orders","تحديث الأوردرات")}</button><button class="ghost" onclick="bulkExportSelected('excel')">${t("Export Excel")}</button><button class="ghost" onclick="bulkExportSelected('pdf')">${t("Export PDF")}</button><select id="bulkStatus" onchange="bulkStatusChanged()"><option value="">${L("Change status","تغيير الحالة")}</option>${statusOptions()}</select><input id="bulkFutureDate" type="date" class="hidden" title="${t("Future Delivery Date")}"><button onclick="applyBulkStatus()">${L("Apply","تطبيق")}</button></div><div id="dashboardOrders"></div></div>`;
  await loadDashboardOrders();
}
async function quickSearch(){const q=$("quickSearch")?.value.trim();if(!q)return msg("quickResult",L("Enter a search value","اكتب قيمة البحث"),"error");try{$("quickResult").innerHTML=renderSearch(await api("/api/search?q="+encodeURIComponent(q)));}catch(e){msg("quickResult",e.message,"error");}}

async function orderPage(c){
  const [m,g,a,s]=await Promise.all([api("/api/merchants"),api("/api/governorates"),api("/api/areas"),api("/api/order/next-serial")]);
  c.innerHTML=orderFormHtml(s.next??s.serial??1,m.data||[],g.data||[],a.data||[],null)+`<div class="panel"><h3>${L("Import Orders from Excel","رفع الأوردرات من Excel")}</h3><p class="muted">${L("Required column: Merchant Order No. plus merchant_id or merchant name, customer data and value.","الأعمدة الأساسية: رقم أوردر التاجر، معرّف التاجر أو بيانات التاجر، بيانات العميل وقيمة الأوردر.")}</p><input id="orderFile" type="file" accept=".xlsx,.xls,.csv"><button class="ghost" onclick="importOrdersExcel()">${t("Import Excel")}</button><div id="orderImportMsg"></div></div>`;
  $("merchant")?.addEventListener("change",loadMerchantFee);
  loadMerchantFee();
}
function statusOptions(selected=""){return Object.entries({to_be_picked_up:"To Be Picked Up",in_ops:"In ops",reeplac:"Reeplac",half_delivered:"Hald deliverd",delivered:"Delivered",lost_damaged:"Lost & Damaged",returned_by_driver:"Returned by driver",future_delivery:"Future delivery",cancelled:"Cancelled",cancelled_by_shipper:"Cancelled by shipper",cancelled_by_receiver:"Cancelled by reciver"}).map(([v,l])=>`<option value="${v}" ${v===selected?"selected":""}>${t(l)}</option>`).join("");}
function orderFormHtml(next,merchants,govs,areas,order){
  const o=order||{}; const tr=o.shipment?.tracking_number||o.tracking_number||"";
  return `<h2>${esc(order?t("Edit Order"):L("New Order","إدخال أوردر"))}</h2><div class="panel"><div class="form-grid">
  ${order?`<input id="edit_order_id" type="hidden" value="${esc(o.id)}">`:``}
  <label>${t("Tracking Number")}<input id="tracking_number" value="${esc(tr)}" ${order?"":"readonly"}></label>
  <label>${t("Merchant")}<select id="merchant" required><option value="">${t("Select Merchant")}</option>${merchants.map(x=>`<option value="${esc(x.id)}" ${x.id===o.merchant_id?"selected":""}>${esc(x.name)} — ${esc(x.merchant_no||x.code||"")}</option>`).join("")}</select></label>
  <label>${t("Merchant Order No.")}<input id="merchant_order_no" value="${esc(o.merchant_order_no||"")}" required></label>
  <label>${t("Order Code")}<input id="order_code" value="${esc(o.order_code||"")}" readonly></label>
  <label>${L("Customer Name","اسم العميل")}<input id="customer_name" value="${esc(o.customer_name||o.customer?.name||"")}"></label>
  <label>${L("Customer Phone","رقم العميل / الهاتف")}<input id="customer_phone" value="${esc(o.customer_phone||o.customer?.phone||"")}"></label>
  <label>${L("Governorate","الإمارة")}<select id="gov"><option value=""></option>${govs.map(x=>`<option value="${esc(x.id)}" ${x.id===o.governorate_id?"selected":""}>${esc(L(x.name_en,x.name_ar))}</option>`).join("")}</select></label>
  <label>${L("Area","المنطقة")}<select id="area"><option value=""></option>${areas.map(x=>`<option value="${esc(x.id)}" ${x.id===o.area_id?"selected":""}>${esc(L(x.name_en,x.name_ar))}</option>`).join("")}</select></label>
  <label class="full">${t("Address")}<input id="address" value="${esc(o.address||"")}"></label>
  <label>${t("Order Value")}<input id="value" type="number" step="0.01" value="${esc(o.value??"")}"></label>
  <label>${t("Delivery Fee")}<input id="delivery_fee" type="number" step="0.01" value="${esc(o.delivery_fee??"")}"><small id="merchantFeeHint" class="muted"></small></label>
  <label>${t("Status")}<select id="order_status">${statusOptions(o.shipment?.status||o.status||"to_be_picked_up")}</select></label>
  <label id="futureDateWrap" class="hidden">${t("Future Delivery Date")}<input id="future_delivery_date" type="date" value="${esc(o.shipment?.future_delivery_date||o.future_delivery_date||"")}"></label>
  <label class="full">${L("Notes","ملاحظات")}<textarea id="notes">${esc(o.notes||"")}</textarea></label>
  </div><div class="actions"><button onclick="${order?"updateOrderFromForm()":"saveOrder()"}">${t(order?"Update":"Save")}</button>${order?`<button class="ghost" onclick="show('shipments')">${L("Back to Shipments","العودة للشحنات")}</button><button class="ghost" onclick="printOrderPDF('${esc(o.id)}')">${t("Print / PDF")}</button>`:""}</div><div id="orderMsg" class="msg"></div></div>`;
  setTimeout(()=>{const st=$("order_status"),w=$("futureDateWrap");const f=()=>w?.classList.toggle("hidden",st?.value!=="future_delivery");st?.addEventListener("change",f);f();},0);
}
async function loadMerchantFee(){const id=$("merchant")?.value;if(!id)return;try{const d=await api("/api/merchants");const m=(d.data||[]).find(x=>x.id===id);if(m){const fee=Number(m.base_delivery_fee||0);const input=$("delivery_fee");if(input&&!input.value)input.value=fee;const h=$("merchantFeeHint");if(h)h.textContent=L(`Saved merchant fee: ${fee}` ,`رسوم التوصيل المحفوظة للتاجر: ${fee}`);}}catch(_){} }
async function importOrdersExcel(){const file=$("orderFile")?.files?.[0];if(!file)return msg("orderImportMsg",L("Choose an Excel file","اختر ملف Excel"),"error");if(typeof XLSX==="undefined")return msg("orderImportMsg",L("Excel library did not load","مكتبة Excel لم تعمل"),"error");try{const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});const d=await api("/api/orders/import",{method:"POST",body:JSON.stringify({rows})});msg("orderImportMsg",`${L("Imported","تم الرفع")}: ${d.imported} — ${L("Skipped","تم التخطي")}: ${d.skipped}`,"ok");if(d.errors?.length)console.warn(d.errors);}catch(e){msg("orderImportMsg",e.message,"error");}}
async function saveOrder(){const b=readOrderForm();if(!b.merchant_id)return msg("orderMsg",L("Select a merchant","اختر التاجر"),"error");if(!b.merchant_order_no)return msg("orderMsg",L("Merchant Order No. is required","رقم أوردر التاجر إجباري"),"error");try{const d=await api("/api/orders",{method:"POST",body:JSON.stringify(b)});msg("orderMsg",`${L("Saved. Tracking Number","تم الحفظ. رقم التتبع")}: ${d.trackingNumber||d.shipment?.tracking_number||d.shipment?.shipment_no||""}`,"ok");setTimeout(()=>show("order"),900);}catch(e){msg("orderMsg",e.message,"error");}}
function readOrderForm(){return {serial_no:Number($("serial")?.value||0),order_code:$("order_code")?.value.trim(),tracking_number:$("tracking_number")?.value.trim(),merchant_id:$("merchant")?.value,merchant_order_no:$("merchant_order_no")?.value.trim(),customer_name:$("customer_name")?.value.trim(),customer_phone:$("customer_phone")?.value.trim(),governorate_id:$("gov")?.value||null,area_id:$("area")?.value||null,address:$("address")?.value.trim(),value:Number($("value")?.value||0),delivery_fee:Number($("delivery_fee")?.value||0),status:$("order_status")?.value,future_delivery_date:$("future_delivery_date")?.value||null,notes:$("notes")?.value.trim()};}
let SHIP_ROWS=[];
async function loadShipments(){try{const d=await api(`/api/shipments?from=${$("shipFrom").value}&to=${$("shipTo").value}`);SHIP_ROWS=d.data||[];$("shipmentsList").innerHTML=shipmentsTable(SHIP_ROWS);}catch(e){msg("shipmentsList",e.message,"error");}}
function shipmentsTable(rows){if(!rows.length)return `<p class="muted">${t("No data")}</p>`;return `<div class="table-wrap"><table id="shipmentsTable"><thead><tr><th>${t("Tracking Number")}</th><th>${t("Merchant Order No.")}</th><th>${t("Merchant")}</th><th>${t("Customer")}</th><th>${t("Order Value")}</th><th>${t("Delivery Fee")}</th><th>${t("Status")}</th><th>${t("Created")}</th><th>${t("Edit")}</th></tr></thead><tbody>${rows.map(r=>`<tr class="clickable" onclick="openOrder('${esc(r.order_id)}')"><td>${esc(r.tracking_number||r.shipment_no||"")}</td><td>${esc(r.order?.merchant_order_no||"")}</td><td>${esc(r.merchant?.name||"")}</td><td>${esc(r.order?.customer_name||"")}</td><td>${esc(r.order?.value||0)}</td><td>${esc(r.order?.delivery_fee||0)}</td><td><span class="badge">${esc(r.status)}</span></td><td>${esc((r.order?.created_at||r.created_at||"").slice(0,16).replace("T"," "))}</td><td><button onclick="event.stopPropagation();openOrder('${esc(r.order_id)}')">${t("Edit")}</button></td></tr>`).join("")}</tbody></table></div>`;}
function exportShipmentsExcel(){exportRowsExcel(SHIP_ROWS.map(r=>({tracking_number:r.tracking_number||r.shipment_no||"",merchant_order_no:r.order?.merchant_order_no||"",order_code:r.order?.order_code||"",merchant:r.merchant?.name||"",customer:r.order?.customer_name||"",phone:r.order?.customer_phone||"",value:r.order?.value||0,delivery_fee:r.order?.delivery_fee||0,status:r.status,created_at:r.order?.created_at||r.created_at})),"shipments");}
function exportShipmentsPDF(){printRowsPDF(SHIP_ROWS.map(r=>({tracking_number:r.tracking_number||r.shipment_no||"",merchant_order_no:r.order?.merchant_order_no||"",order_code:r.order?.order_code||"",merchant:r.merchant?.name||"",customer:r.order?.customer_name||"",value:r.order?.value||0,delivery_fee:r.order?.delivery_fee||0,status:r.status,created_at:r.order?.created_at||r.created_at})),"shipments");}

async function setStatus(id,status){try{await api("/api/shipments/status",{method:"POST",body:JSON.stringify({shipment_id:id,status})});await loadShipments();}catch(e){alert(e.message);}}

async function jobsPage(c){const [j,d]=await Promise.all([api("/api/delivery-jobs"),api("/api/drivers")]);c.innerHTML=`<h2>${t("Delivery Jobs")}</h2><div class="panel"><div class="form-grid"><label>${L("Driver","السائق")}<select id="jobDriver">${(d.data||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select></label><label>${L("Job Code","كود المهمة")}<input id="jobCode"></label><label class="full">${L("Shipment numbers, one per line","أرقام الشحنات، كل رقم في سطر")}<textarea id="jobShipments"></textarea></label></div><button onclick="createJob()">${t("Save")}</button><div id="jobMsg"></div></div><div class="panel"><h3>${L("Current Jobs","المهام الحالية")}</h3>${(j.data||[]).map(x=>`<div class="job-card"><b>${esc(x.job_code)}</b><span>${esc(x.status||"")}</span><button onclick="printDeliveryJobPDF('${esc(x.id)}')">${t("Print / PDF")}</button></div>`).join("")}${table(j.data||[],["job_code","driver_id","status","expected_count","received_count","created_at"])}</div>`;}
async function addMerchant(){try{const files=[...($("mdocs")?.files||[])];const docs=[];for(const f of files.slice(0,5)){if(f.size>1500000)continue;docs.push(await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({file_name:f.name,mime_type:f.type,data_url:r.result});r.onerror=reject;r.readAsDataURL(f);}));}const body={name:$('mname').value,phone:$('mphone').value,address:$('maddress').value,username:$('musername').value,password:$('mpassword').value,base_delivery_fee:Number($('mfee').value||0),tax_enabled:$('mtax').checked,tax_rate:Number($('mrate').value||0),store_type:$('mstoretype').value,store_name:$('mstorename').value,store_url:$('mstoreurl').value,store_active:$('mstoreactive').checked,documents:[]};const d=await api('/api/merchants',{method:'POST',body:JSON.stringify(body)});for(const doc of docs){try{await api('/api/merchants/documents',{method:'POST',body:JSON.stringify({merchant_id:d.data.id,...doc})});}catch(e){console.warn(e.message);}}msg('merchantMsg',`${L('Saved successfully','تم حفظ التاجر بنجاح')} — ${d.data.merchant_no||d.data.code||''}`,'ok');setTimeout(()=>show('merchants'),700);}catch(e){msg('merchantMsg',e.message,'error');}}
async function addGovernorate(){try{await api("/api/governorates",{method:"POST",body:JSON.stringify({name_ar:$("govAr").value,name_en:$("govEn").value})});show("areas");}catch(e){alert(e.message);}}
async function addArea(){try{await api("/api/areas",{method:"POST",body:JSON.stringify({governorate_id:$("areaGov").value,name_ar:$("areaAr").value,name_en:$("areaEn").value})});show("areas");}catch(e){alert(e.message);}}
async function importAreasExcel(){const file=$("areaFile")?.files?.[0];if(!file)return msg("areaMsg",L("Choose an Excel file","اختر ملف Excel"),"error");if(typeof XLSX==="undefined")return msg("areaMsg",L("Excel library did not load. Use CSV or refresh.","مكتبة Excel لم تعمل. جرّب تحديث الصفحة أو CSV."),"error");try{const data=await file.arrayBuffer();const wb=XLSX.read(data,{type:"array"});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});const d=await api("/api/areas/import",{method:"POST",body:JSON.stringify({rows})});msg("areaMsg",`${t("Imported")}: ${d.imported} — skipped: ${d.skipped}`,"ok");setTimeout(()=>show("areas"),900);}catch(e){msg("areaMsg",e.message,"error");}}

async function accountingPage(c){const [s,d]=await Promise.all([api("/api/accounting/summary"),api("/api/transactions")]);const x=s.data||{};const rows=d.data||[];c.innerHTML=`<h2>${t("Accounting")}</h2><div class="grid">${stat(L("Orders","الأوردرات"),x.totalOrders||0)}${stat(L("Order Value","قيمة الأوردرات"),Number(x.orderValue||0).toFixed(2))}${stat(L("Delivery Fees","رسوم التوصيل"),Number(x.deliveryFees||0).toFixed(2))}${stat(L("Taxes","الضرائب"),Number(x.taxes||0).toFixed(2))}${stat(L("Merchant Net","صافي التجار"),Number(x.merchantNet||0).toFixed(2))}</div><div class="panel"><h3>${t("Transactions")}</h3>${table(rows,["account_type","transaction_type","amount","direction","status","created_at"])}</div>`;}
async function expensesPage(c){const d=await api("/api/drivers");c.innerHTML=`<h2>${t("Driver Expenses")}</h2><div class="panel"><div class="form-grid"><label>${t("Drivers")}<select id="exDriver"><option value=""></option>${(d.data||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select></label><label>${L("Type","النوع")}<select id="exType"><option>petrol</option><option>maintenance</option><option>road</option><option>operating</option><option>other</option></select></label><label>${L("Amount","المبلغ")}<input id="exAmount" type="number" step="0.01"></label><label>${L("Date","التاريخ")}<input id="exDate" type="date" value="${today()}"></label><label class="full">${L("Notes","ملاحظات")}<textarea id="exNotes"></textarea></label></div><button onclick="saveExpense()">${t("Save")}</button><div id="exMsg"></div></div>`;}
async function saveExpense(){try{await api("/api/expenses",{method:"POST",body:JSON.stringify({driver_id:$("exDriver").value||null,expense_type:$("exType").value,amount:Number($("exAmount").value),expense_date:$("exDate").value,notes:$("exNotes").value})});msg("exMsg",L("Saved","تم الحفظ"),"ok");}catch(e){msg("exMsg",e.message,"error");}}
async function auditPage(c){const d=await api("/api/audit");c.innerHTML=`<h2>${t("Audit Log")}</h2><div class="panel">${table(d.data||[],["action","entity_type","entity_id","created_at"])}</div>`;}

async function loadDashboardOrders(){try{const d=await api('/api/shipments');const rows=d.data||[];window.DASH_ROWS=rows;c=window.DASH_ROWS;const box=$('dashboardOrders');if(!box)return;box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th><input type="checkbox" onchange="toggleAllDashboard(this)"></th><th>${t("Tracking Number")}</th><th>${t("Shipment No.")}</th><th>${t("Merchant Order No.")}</th><th>${t("Merchant")}</th><th>${t("Customer")}</th><th>${t("Order Value")}</th><th>${t("Status")}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><input class="dash-check" type="checkbox" value="${esc(r.id)}"></td><td>${esc(r.tracking_number||"")}</td><td>${esc(r.shipment_no||"")}</td><td>${esc(r.order?.merchant_order_no||"")}</td><td>${esc(r.merchant?.name||"")}</td><td>${esc(r.order?.customer_name||"")}</td><td>${esc(r.order?.value||0)}</td><td><span class="badge">${esc(r.status||"")}</span></td></tr>`).join('')}</tbody></table></div>`:`<p class="muted">${t('No data')}</p>`;}catch(e){const b=$('dashboardOrders');if(b)b.innerHTML=`<span class="error">${esc(e.message)}</span>`;}}
function toggleAllDashboard(cb){document.querySelectorAll('.dash-check').forEach(x=>x.checked=cb.checked);}
function selectedDashboardRows(){const ids=new Set([...document.querySelectorAll('.dash-check:checked')].map(x=>x.value));return (window.DASH_ROWS||[]).filter(x=>ids.has(String(x.id)));}
function bulkExportSelected(kind){const rows=selectedDashboardRows().map(r=>({tracking_number:r.tracking_number,shipment_no:r.shipment_no,merchant_order_no:r.order?.merchant_order_no||'',order_code:r.order?.order_code||'',merchant:r.merchant?.name||'',customer:r.order?.customer_name||'',phone:r.order?.customer_phone||'',address:r.order?.address||'',value:r.order?.value||0,delivery_fee:r.order?.delivery_fee||0,status:r.status,created_at:r.order?.created_at||r.created_at}));if(!rows.length)return alert(L('Select orders first','حدد الأوردرات أولاً'));kind==='excel'?exportRowsExcel(rows,'selected-orders'):printRowsPDF(rows,L('Selected Orders','الأوردرات المحددة'));}
function bulkStatusChanged(){const v=$('bulkStatus')?.value;const d=$('bulkFutureDate');if(d)d.classList.toggle('hidden',v!=='future_delivery');}
async function applyBulkStatus(){const rows=selectedDashboardRows(),status=$('bulkStatus')?.value;if(!rows.length)return alert(L('Select orders first','حدد الأوردرات أولاً'));if(!status)return alert(L('Select a status','اختر الحالة'));let date=null;if(status==='future_delivery'){date=$('bulkFutureDate')?.value;if(!date)return alert(L('Select future delivery date','حدد تاريخ التسليم الجديد'));}try{await api('/api/shipments/status/bulk',{method:'POST',body:JSON.stringify({shipment_ids:rows.map(x=>x.id),status,future_delivery_date:date})});await loadDashboardOrders();}catch(e){alert(e.message);}}
async function warehousePage(c){c.innerHTML=`<h2>${t('Warehouse Intake')}</h2><div class="panel"><h3>${L('Scan / Enter Tracking Number','امسح / اكتب رقم التتبع')}</h3><input id="warehouseTracking" autofocus placeholder="${esc(t('Tracking Number'))}"><div id="warehouseMsg"></div></div><div class="panel"><h3>${L('Pending / Scheduled Orders','الأوردرات المؤجلة / المنتظرة')}</h3><div id="warehouseList"></div></div>`;$('warehouseTracking')?.addEventListener('keydown',e=>{if(e.key==='Enter')warehouseIntake();});await loadWarehousePending();}
async function loadWarehousePending(){try{const d=await api('/api/warehouse/pending'),rows=d.data||[];const box=$('warehouseList');if(box)box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>${L('Coupon / Order / Shipment','الكوبون / الأوردر / الشحنة')}</th><th>${t('Tracking Number')}</th><th>${t('Future Delivery Date')}</th><th>${t('Status')}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.order?.merchant_order_no||r.order?.order_code||r.shipment_no||'')}</td><td>${esc(r.tracking_number||'')}</td><td>${esc(r.future_delivery_date||'')}</td><td>${esc(r.status)}</td></tr>`).join('')}</tbody></table></div>`:`<p class="muted">${t('No data')}</p>`;}catch(e){const b=$('warehouseList');if(b)b.innerHTML=`<span class="error">${esc(e.message)}</span>`;}}
async function warehouseIntake(){const input=$('warehouseTracking'),v=input?.value.trim();if(!v)return;try{const d=await api('/api/warehouse/intake',{method:'POST',body:JSON.stringify({tracking_number:v})});msg('warehouseMsg',`${L('Received successfully','تم الاستلام بنجاح')} — ${d.tracking_number} → ${t('In ops')}`,'ok');input.value='';await loadWarehousePending();}catch(e){msg('warehouseMsg',e.message,'error');input.select();}}
async function driverAccountPage(c){const d=await api('/api/drivers');c.innerHTML=`<h2>${t('Driver Account')}</h2><div class="panel">${table(d.data||[],['driver_no','name','phone','vehicle_no','active'])}</div><div class="panel"><h3>${L('Verify AWB / Tracking','التحقق من الشحنة')}</h3><input id="driverVerifyTracking" placeholder="${esc(t('Tracking Number'))}"><div id="driverVerifyMsg"></div></div>`;$('driverVerifyTracking')?.addEventListener('keydown',async e=>{if(e.key==='Enter'){try{const q=await api('/api/search?q='+encodeURIComponent(e.target.value));$('driverVerifyMsg').innerHTML=renderSearch(q);}catch(x){msg('driverVerifyMsg',x.message,'error');}}});}
async function printOrderPDF(id){try{const d=await api('/api/orders/'+encodeURIComponent(id));const x=d.data||{},o=x.order||{},sh=x.shipment||{},h=x.history||[];const rows=[['System Order Code',o.order_code],['Merchant Order No.',o.merchant_order_no],['Tracking Number',sh.tracking_number],['Shipment No.',sh.shipment_no],['Merchant',x.merchant?.name],['Customer',o.customer_name],['Phone',o.customer_phone],['Address',o.address],['Order Value',o.value],['Delivery Fee',o.delivery_fee],['Tax',o.tax_amount],['Merchant Net',o.merchant_net_value],['Status',sh.status],['Future Delivery Date',sh.future_delivery_date],['Notes',o.notes]];const hist=h.map(z=>[z.status,(z.created_at||'').slice(0,19).replace('T',' ')]);const html=`<!doctype html><html dir="${LANG==='ar'?'rtl':'ltr'}"><head><meta charset="utf-8"><title>Order PDF</title><style>body{font-family:Arial;padding:18px}table{width:100%;border-collapse:collapse;margin-bottom:18px}td,th{border:1px solid #bbb;padding:7px;text-align:${LANG==='ar'?'right':'left'}}h2{margin-bottom:10px}.barcode{font-size:28px;letter-spacing:4px}</style></head><body><h2>Trend Delivery Service</h2><table>${rows.map(r=>`<tr><th>${esc(r[0])}</th><td>${esc(r[1]??'')}</td></tr>`).join('')}</table><h3>${t('Shipment History')}</h3><table><tr><th>${t('Status')}</th><th>${t('Created')}</th></tr>${hist.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table><script>window.onload=()=>window.print()<\/script></body></html>`;const w=window.open('','_blank');if(!w)return alert(L('Allow popups','اسمح بالنوافذ المنبثقة'));w.document.write(html);w.document.close();}catch(e){alert(e.message);}}
async function printDeliveryJobPDF(id){try{const d=await api('/api/delivery-jobs/'+encodeURIComponent(id)+'/details'),data=d.data||{},items=data.items||[];const rows=items.map(x=>({shipment:x.shipment||{},order:x.order||{},merchant:x.merchant||{}}));const html=`<!doctype html><html dir="${LANG==='ar'?'rtl':'ltr'}"><head><meta charset="utf-8"><title>${esc(t('Delivery Job PDF'))}</title><script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script><style>body{font-family:Arial;margin:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:5px;text-align:center;font-size:11px}.bc{width:130px;height:45px}</style></head><body><h2>${esc(t('Delivery Job PDF'))} — ${esc(data.job?.job_code||'')}</h2><table><thead><tr><th>Barcode / Shipment</th><th>Order No.</th><th>Merchant</th><th>Customer</th><th>Phone</th><th>COD</th><th>Address</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td><svg class="bc" id="bc${i}"></svg><div>${esc(x.shipment.shipment_no||'')}</div></td><td>${esc(x.order.merchant_order_no||x.order.order_code||'')}</td><td>${esc(x.merchant.name||'')}</td><td>${esc(x.order.customer_name||'')}</td><td>${esc(x.order.customer_phone||'')}</td><td>${esc(x.order.value||0)}</td><td>${esc(x.order.address||'')}</td></tr>`).join('')}</tbody></table><script>window.onload=()=>{${rows.map((x,i)=>`try{JsBarcode('#bc${i}','${String(x.shipment.shipment_no||'').replace(/'/g,"\\'")}',{displayValue:false,height:38,margin:2})}catch(e){}`).join('')}window.print()}<\/script></body></html>`;const w=window.open('','_blank');if(!w)return alert(L('Allow popups','اسمح بالنوافذ المنبثقة'));w.document.write(html);w.document.close();}catch(e){alert(e.message);}}
async function employeesPage(c){
  const [u,r,p]=await Promise.all([api("/api/users"),api("/api/roles"),api("/api/permissions")]);
  const perms=p.data||[];
  c.innerHTML=`<h2>${t("Employees & Permissions")}</h2>
  <div class="panel"><h3>${t("Add Employee")}</h3><div class="form-grid"><label>${t("Name")}<input id="un"></label><label>${t("Username")}<input id="uu"></label><label>${t("Email")}<input id="ue" type="email"></label><label>${t("Password")}<input id="up" type="password"></label><label>${t("Role")}<select id="ur">${(r.data||[]).map(x=>`<option value="${esc(x.name)}">${esc(x.name)}</option>`).join("")}</select></label></div><button onclick="addEmployee()">${t("Save")}</button><div id="empMsg"></div></div>
  <div class="panel"><h3>${L("Create Permission Group","إنشاء مجموعة صلاحيات جديدة")}</h3><label>${L("Group name","اسم المجموعة")}<input id="roleName" placeholder="${esc(L("Example: Warehouse Manager","مثال: مشرف المخزن"))}"></label><div class="permission-grid">${perms.map(x=>`<label class="permission-item"><input type="checkbox" class="rolePerm" value="${esc(x.code)}"> ${esc(L(x.name_en||x.code,x.name_ar||x.code))}</label>`).join("")}</div><button onclick="addRole()">${L("Create Group","إنشاء المجموعة")}</button><div id="roleMsg"></div></div>
  <div class="panel"><h3>${t("Employees & Permissions")}</h3>${table(u.data||[],["name","username","email","language","active","created_at"])}</div>`;
}
async function addEmployee(){try{await api("/api/users",{method:"POST",body:JSON.stringify({name:$('un').value,username:$('uu').value,email:$('ue').value,password:$('up').value,role:$('ur').value})});msg("empMsg",L("Saved","تم الحفظ"),"ok");setTimeout(()=>show("employees"),500);}catch(e){msg("empMsg",e.message,"error");}}
async function addRole(){const name=$("roleName")?.value.trim();const permissions=[...document.querySelectorAll(".rolePerm:checked")].map(x=>x.value);if(!name)return msg("roleMsg",L("Enter a group name","اكتب اسم المجموعة"),"error");try{await api("/api/roles",{method:"POST",body:JSON.stringify({name,permissions})});msg("roleMsg",L("Group created successfully","تم إنشاء مجموعة الصلاحيات بنجاح"),"ok");setTimeout(()=>show("employees"),700);}catch(e){msg("roleMsg",e.message,"error");}}

async function chatPage(c){
  const users=await api("/api/chat/users").catch(()=>({data:[]}));
  c.innerHTML=`<h2>${t("Employee Chat")}</h2><div class="panel chat-panel"><div class="row"><label>${L("To","إلى")}<select id="chatRecipient"><option value="">${L("All Employees","كل الموظفين")}</option>${(users.data||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.username||x.email||"")}</option>`).join("")}</select></label></div><div id="chatMessages" class="chat-messages"></div><div class="row chat-compose"><input id="chatInput" placeholder="${esc(L("Write a message...","اكتب رسالة..."))}"><button onclick="sendChat()">${t("Send")}</button></div></div>`;
  await loadChat(); CHAT_TIMER=setInterval(loadChat,5000);
  $("chatInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")sendChat();});
}
async function loadChat(){if(CURRENT_PAGE!=="chat")return;try{const d=await api("/api/chat");const box=$("chatMessages");if(!box)return;box.innerHTML=(d.data||[]).map(x=>`<div class="chat-message"><b>${esc(x.sender_name||"Employee")}</b><small>${esc((x.created_at||"").slice(0,16).replace("T"," "))}</small><p>${esc(x.message||"")}</p></div>`).join("")||`<p class="muted">${t("No data")}</p>`;box.scrollTop=box.scrollHeight;}catch(e){console.warn(e.message);}}
async function sendChat(){const input=$("chatInput"),message=input?.value.trim();if(!message)return;try{await api("/api/chat",{method:"POST",body:JSON.stringify({message,recipient_id:$("chatRecipient")?.value||null})});input.value="";await loadChat();}catch(e){alert(e.message);}}

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

Object.assign(window,{login,logout,toggleLang,show,quickSearch,doSearch,openOrder,saveOrder,updateOrderFromForm,loadShipments,setStatus,createJob,saveJobCode,addMerchant,editMerchant,addGovernorate,addArea,importAreasExcel,saveExpense,addEmployee,addRole,importOrdersExcel,sendChat,exportRowsExcel,printRowsPDF,exportShipmentsExcel,exportShipmentsPDF,testWoo,loadDashboardOrders,bulkExportSelected,applyBulkStatus,warehouseIntake,printOrderPDF,printDeliveryJobPDF,importWoo,addWooIntegration});

document.addEventListener("DOMContentLoaded",()=>{
  applyLanguage();
  const sidebar=$("sidebar");sidebar?.querySelectorAll("button").forEach(btn=>{const page=(btn.getAttribute("onclick")||"").match(/show\(['"]([^'"]+)['"]\)/)?.[1];if(page){btn.dataset.page=page;btn.removeAttribute("onclick");btn.addEventListener("click",()=>show(page));}});
  [$("username"),$("password")].forEach(el=>el?.addEventListener("keydown",e=>{if(e.key==="Enter")login();}));
  if(TOKEN){
    $("login")?.classList.add("hidden");
    $("login")?.setAttribute("style","display:none!important");
    $("app")?.classList.add("hidden");
    $("app")?.setAttribute("style","display:none!important");

    show("dashboard").then(()=>{
      $("login")?.classList.add("hidden");
      $("login")?.setAttribute("style","display:none!important");
      $("app")?.classList.remove("hidden");
      $("app")?.setAttribute("style","display:block!important");
    }).catch(()=>{
      TOKEN="";
      localStorage.removeItem("trend_token");
      $("login")?.classList.remove("hidden");
      $("login")?.setAttribute("style","display:flex!important");
      $("app")?.classList.add("hidden");
      $("app")?.setAttribute("style","display:none!important");
    });
  } else {
    $("login")?.classList.remove("hidden");
    $("login")?.setAttribute("style","display:flex!important");
    $("app")?.classList.add("hidden");
    $("app")?.setAttribute("style","display:none!important");
  }
});
