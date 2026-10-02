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
    "Imported":"تم الرفع","Success":"تم بنجاح","Error":"خطأ","WooCommerce":"WooCommerce","Consumer Key":"مفتاح WooCommerce","Consumer Secret":"سر WooCommerce","Test Connection":"اختبار الاتصال","Import Orders":"سحب الأوردرات","Auto Import":"سحب تلقائي","Connection successful":"تم الاتصال بنجاح","Orders imported":"تم سحب الأوردرات"
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
    "Imported":"Imported","Success":"Success","Error":"Error","WooCommerce":"WooCommerce","Consumer Key":"Consumer Key","Consumer Secret":"Consumer Secret","Test Connection":"Test Connection","Import Orders":"Import Orders","Auto Import":"Auto Import","Connection successful":"Connection successful","Orders imported":"Orders imported"
  }
};

const SIDEBAR = [
  ["dashboard","🏠 ","Dashboard"],["order","➕ ","New Order"],["search","🔎 ","Search"],["shipments","📦 ","Shipments"],
  ["jobs","🚚 ","Delivery Jobs"],["jobcode","🔢 ","Update Delivery Job Code"],["returns","↩️ ","Merchant Returns"],
  ["merchants","🏪 ","Merchants"],["drivers","🧑‍✈️ ","Drivers"],["areas","📍 ","Governorates & Areas"],
  ["accounting","💰 ","Accounting"],["expenses","⛽ ","Driver Expenses"],["audit","🧾 ","Audit Log"],
  ["employees","👥 ","Employees & Permissions"],["chat","💬 ","Employee Chat"]
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
  if(!username.value.trim()||!password.value) return msg("loginMsg",L("Enter username and password","أدخل اسم المستخدم وكلمة المرور"),"error");
  const b=$("loginBtn"); if(b)b.disabled=true;
  try{const d=await api("/api/login",{method:"POST",body:JSON.stringify({username:username.value.trim(),password:password.value})});TOKEN=d.token;localStorage.setItem("trend_token",TOKEN);$("login")?.classList.add("hidden");$("app")?.classList.remove("hidden");await show("dashboard");}
  catch(e){msg("loginMsg",e.message,"error");} finally{if(b)b.disabled=false;}
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
  c.innerHTML=orderFormHtml(s.next??s.serial??1,m.data||[],g.data||[],a.data||[],null)+`<div class="panel"><h3>${L("Import Orders from Excel","رفع الأوردرات من Excel")}</h3><p class="muted">${L("Required column: Merchant Order No. plus merchant_id or merchant name, customer data and value.","الأعمدة الأساسية: رقم أوردر التاجر، معرّف التاجر أو بيانات التاجر، بيانات العميل وقيمة الأوردر.")}</p><input id="orderFile" type="file" accept=".xlsx,.xls,.csv"><button class="ghost" onclick="importOrdersExcel()">${t("Import Excel")}</button><div id="orderImportMsg"></div></div>`;
  $("merchant")?.addEventListener("change",loadMerchantFee);
  loadMerchantFee();
}
function orderFormHtml(next,merchants,govs,areas,order){
  const o=order||{};
  return `<h2>${esc(order?t("Edit Order"):L("New Order","إدخال أوردر"))}</h2><div class="panel"><div class="form-grid">
  ${order?`<input id="edit_order_id" type="hidden" value="${esc(o.id)}">`:``}
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
  <label>${t("Status")}<select id="order_status"><option value="new" ${o.status==="new"?"selected":""}>new</option><option value="pending">pending</option><option value="delivered">delivered</option><option value="cancelled">cancelled</option></select></label>
  <label class="full">${L("Notes","ملاحظات")}<textarea id="notes">${esc(o.notes||"")}</textarea></label>
  </div><div class="actions"><button onclick="${order?"updateOrderFromForm()":"saveOrder()"}">${t(order?"Update":"Save")}</button>${order?`<button class="ghost" onclick="show('shipments')">${L("Back to Shipments","العودة للشحنات")}</button>`:""}</div><div id="orderMsg" class="msg"></div></div>`;
}
async function loadMerchantFee(){const id=$("merchant")?.value;if(!id)return;try{const d=await api("/api/merchants");const m=(d.data||[]).find(x=>x.id===id);if(m){const fee=Number(m.base_delivery_fee||0);const input=$("delivery_fee");if(input&&!input.value)input.value=fee;const h=$("merchantFeeHint");if(h)h.textContent=L(`Saved merchant fee: ${fee}` ,`رسوم التوصيل المحفوظة للتاجر: ${fee}`);}}catch(_){} }
async function importOrdersExcel(){const file=$("orderFile")?.files?.[0];if(!file)return msg("orderImportMsg",L("Choose an Excel file","اختر ملف Excel"),"error");if(typeof XLSX==="undefined")return msg("orderImportMsg",L("Excel library did not load","مكتبة Excel لم تعمل"),"error");try{const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});const d=await api("/api/orders/import",{method:"POST",body:JSON.stringify({rows})});msg("orderImportMsg",`${L("Imported","تم الرفع")}: ${d.imported} — ${L("Skipped","تم التخطي")}: ${d.skipped}`,"ok");if(d.errors?.length)console.warn(d.errors);}catch(e){msg("orderImportMsg",e.message,"error");}}
async function saveOrder(){const b=readOrderForm();if(!b.merchant_id)return msg("orderMsg",L("Select a merchant","اختر التاجر"),"error");if(!b.merchant_order_no)return msg("orderMsg",L("Merchant Order No. is required","رقم أوردر التاجر إجباري"),"error");try{const d=await api("/api/orders",{method:"POST",body:JSON.stringify(b)});msg("orderMsg",`${L("Saved. Tracking Number","تم الحفظ. رقم التتبع")}: ${d.trackingNumber||d.shipment?.tracking_number||d.shipment?.shipment_no||""}`,"ok");setTimeout(()=>show("order"),900);}catch(e){msg("orderMsg",e.message,"error");}}
function readOrderForm(){return {serial_no:Number($("serial")?.value),order_code:$("order_code")?.value.trim(),merchant_id:$("merchant")?.value,merchant_order_no:$("merchant_order_no")?.value.trim(),customer_name:$("customer_name")?.value.trim(),customer_phone:$("customer_phone")?.value.trim(),governorate_id:$("gov")?.value||null,area_id:$("area")?.value||null,address:$("address")?.value.trim(),value:Number($("value")?.value||0),delivery_fee:Number($("delivery_fee")?.value||0),status:$("order_status")?.value,notes:$("notes")?.value.trim()};}
async function openOrder(id){try{const d=await api("/api/orders/"+encodeURIComponent(id));const detail=d.data;const [m,g,a]=await Promise.all([api("/api/merchants"),api("/api/governorates"),api("/api/areas")]);const order={...(detail.order||{}),shipment:detail.shipment||null};$("content").innerHTML=orderFormHtml(order.serial_no||1,m.data||[],g.data||[],a.data||[],order);$("merchant")?.addEventListener("change",loadMerchantFee);loadMerchantFee();}catch(e){alert(e.message);}}
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

async function driversPage(c){const d=await api("/api/drivers");c.innerHTML=`<h2>${t("Drivers")}</h2><div class="panel">${table(d.data||[],["driver_no","name","phone","vehicle_no","active","created_at"])}</div>`;}

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

async function accountingPage(c){const [s,d]=await Promise.all([api("/api/accounting/summary"),api("/api/transactions")]);const x=s.data||{};const rows=d.data||[];c.innerHTML=`<h2>${t("Accounting")}</h2><div class="grid">${stat(L("Orders","الأوردرات"),x.totalOrders||0)}${stat(L("Order Value","قيمة الأوردرات"),Number(x.orderValue||0).toFixed(2))}${stat(L("Delivery Fees","رسوم التوصيل"),Number(x.deliveryFees||0).toFixed(2))}${stat(L("Taxes","الضرائب"),Number(x.taxes||0).toFixed(2))}${stat(L("Merchant Net","صافي التجار"),Number(x.merchantNet||0).toFixed(2))}</div><div class="panel"><h3>${t("Transactions")}</h3>${table(rows,["account_type","transaction_type","amount","direction","status","created_at"])}</div>`;}
async function expensesPage(c){const d=await api("/api/drivers");c.innerHTML=`<h2>${t("Driver Expenses")}</h2><div class="panel"><div class="form-grid"><label>${t("Drivers")}<select id="exDriver"><option value=""></option>${(d.data||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select></label><label>${L("Type","النوع")}<select id="exType"><option>petrol</option><option>maintenance</option><option>road</option><option>operating</option><option>other</option></select></label><label>${L("Amount","المبلغ")}<input id="exAmount" type="number" step="0.01"></label><label>${L("Date","التاريخ")}<input id="exDate" type="date" value="${today()}"></label><label class="full">${L("Notes","ملاحظات")}<textarea id="exNotes"></textarea></label></div><button onclick="saveExpense()">${t("Save")}</button><div id="exMsg"></div></div>`;}
async function saveExpense(){try{await api("/api/expenses",{method:"POST",body:JSON.stringify({driver_id:$("exDriver").value||null,expense_type:$("exType").value,amount:Number($("exAmount").value),expense_date:$("exDate").value,notes:$("exNotes").value})});msg("exMsg",L("Saved","تم الحفظ"),"ok");}catch(e){msg("exMsg",e.message,"error");}}
async function auditPage(c){const d=await api("/api/audit");c.innerHTML=`<h2>${t("Audit Log")}</h2><div class="panel">${table(d.data||[],["action","entity_type","entity_id","created_at"])}</div>`;}

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

Object.assign(window,{login,logout,toggleLang,show,quickSearch,doSearch,openOrder,saveOrder,updateOrderFromForm,loadShipments,setStatus,createJob,saveJobCode,addMerchant,editMerchant,addIntegration,addGovernorate,addArea,importAreasExcel,saveExpense,addEmployee,addRole,importOrdersExcel,sendChat,exportRowsExcel,printRowsPDF,exportShipmentsExcel,exportShipmentsPDF});

document.addEventListener("DOMContentLoaded",()=>{
  applyLanguage();
  const sidebar=$("sidebar");sidebar?.querySelectorAll("button").forEach(btn=>{const page=(btn.getAttribute("onclick")||"").match(/show\(['"]([^'"]+)['"]\)/)?.[1];if(page){btn.dataset.page=page;btn.removeAttribute("onclick");btn.addEventListener("click",()=>show(page));}});
  [$("username"),$("password")].forEach(el=>el?.addEventListener("keydown",e=>{if(e.key==="Enter")login();}));
  if(TOKEN){
    $("login")?.classList.add("hidden");
    $("app")?.classList.add("hidden");
    show("dashboard").then(()=>{
      $("login")?.classList.add("hidden");
      $("app")?.classList.remove("hidden");
    }).catch(()=>{
      TOKEN="";
      localStorage.removeItem("trend_token");
      $("login")?.classList.remove("hidden");
      $("app")?.classList.add("hidden");
    });
  }
});
