let TOKEN=localStorage.getItem("trend_token")||"";
let LANG=localStorage.getItem("trend_lang")||"ar";
const $=id=>document.getElementById(id);
const api=async(path,opt={})=>{
  const r=await fetch(path,{...opt,headers:{"Content-Type":"application/json","Authorization":`Bearer ${TOKEN}`,...(opt.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"حدث خطأ");
  return d;
};
function toggleLang(){LANG=LANG==="ar"?"en":"ar";localStorage.setItem("trend_lang",LANG);document.documentElement.lang=LANG;document.documentElement.dir=LANG==="ar"?"rtl":"ltr";alert(LANG==="ar"?"تم اختيار العربية":"English selected");}
async function login(){
  try{
    const d=await api("/api/login",{method:"POST",headers:{},body:JSON.stringify({email:$("email").value,password:$("password").value})});
    TOKEN=d.token;localStorage.setItem("trend_token",TOKEN);$("login").classList.add("hidden");$("app").classList.remove("hidden");show("dashboard");
  }catch(e){$("loginMsg").innerHTML=`<span class="error">${e.message}</span>`}
}
function logout(){TOKEN="";localStorage.removeItem("trend_token");location.reload()}
async function show(page){
  const c=$("content");
  try{
    if(page==="dashboard"){
      const d=await api("/api/dashboard");
      c.innerHTML=`<h2>لوحة التحكم</h2><div class="grid">
      ${stat("الأوردرات",d.data.counts.orders)}${stat("الشحنات",d.data.counts.shipments)}
      ${stat("مهام التوصيل",d.data.counts.jobs)}${stat("السائقون",d.data.counts.drivers)}${stat("التجار",d.data.counts.merchants)}
      </div><div class="panel"><h3>بحث سريع</h3><div class="row"><input id="quickSearch" placeholder="رقم العميل / رقم الأوردر / رقم الشحنة"><button onclick="quickSearch()">بحث</button></div><div id="quickResult"></div></div>`;
    }
    if(page==="order") await orderPage(c);
    if(page==="search") c.innerHTML=`<h2>البحث</h2><div class="panel"><div class="row"><input id="searchQ" placeholder="رقم العميل / رقم الأوردر / رقم الشحنة"><button onclick="doSearch()">بحث</button></div><div id="searchResult"></div></div>`;
    if(page==="shipments") await shipmentsPage(c);
    if(page==="jobs") await jobsPage(c);
    if(page==="jobcode") await jobCodePage(c);
    if(page==="returns") await returnsPage(c);
    if(page==="merchants") await merchantsPage(c);
    if(page==="drivers") await driversPage(c);
    if(page==="areas") await areasPage(c);
    if(page==="accounting") await accountingPage(c);
    if(page==="expenses") await expensesPage(c);
    if(page==="audit") await auditPage(c);
  }catch(e){c.innerHTML=`<div class="panel"><span class="error">${e.message}</span></div>`}
}
function stat(t,n){return `<div class="stat">${t}<b>${n}</b></div>`}
async function orderPage(c){
  const [m,g,a,s]=await Promise.all([api("/api/merchants"),api("/api/governorates"),api("/api/areas"),api("/api/order/next-serial")]);
  c.innerHTML=`<h2>إدخال أوردر</h2><div class="panel"><div class="form-grid">
  <label>التسلسل<input id="serial" type="number" value="${s.next}" min="1"></label>
  <label>كود الأوردر<input id="order_code" placeholder="مثال ORD-1005"></label>
  <label>التاجر<select id="merchant">${m.data.map(x=>`<option value="${x.id}">${x.name} — ${x.merchant_no} — ${x.code}</option>`).join("")}</select></label>
  <label>رقم أوردر التاجر<input id="merchant_order_no"></label>
  <label>اسم العميل<input id="customer_name"></label>
  <label>رقم العميل / الهاتف<input id="customer_phone"></label>
  <label>الإمارة<select id="gov">${g.data.map(x=>`<option value="${x.id}">${x.name_ar}</option>`).join("")}</select></label>
  <label>المنطقة<select id="area">${a.data.map(x=>`<option value="${x.id}">${x.name_ar}</option>`).join("")}</select></label>
  <label>العنوان الكامل<input id="address"></label>
  <label>قيمة الأوردر<input id="value" type="number" step="0.01"></label>
  <label>رسوم التوصيل<input id="delivery_fee" type="number" step="0.01"></label>
  <label class="full">ملاحظات<textarea id="notes"></textarea></label>
  </div><div class="actions"><button onclick="saveOrder()">حفظ وإنشاء أوردر جديد</button></div><div id="orderMsg" class="msg"></div></div>`;
}
async function saveOrder(){
  const b={serial_no:Number($("serial").value),order_code:$("order_code").value,merchant_id:$("merchant").value,merchant_order_no:$("merchant_order_no").value,customer_name:$("customer_name").value,customer_phone:$("customer_phone").value,governorate_id:$("gov").value,area_id:$("area").value,address:$("address").value,value:Number($("value").value),delivery_fee:Number($("delivery_fee").value),notes:$("notes").value};
  try{const d=await api("/api/orders",{method:"POST",body:JSON.stringify(b)});$("orderMsg").innerHTML=`<span class="ok">تم الحفظ — الشحنة ${d.shipment.shipment_no}</span>${d.serialDuplicate?` <span class="duplicate">⚠ التسلسل مكرر اليوم</span>`:""};setTimeout(()=>orderPage($("content")),500)}catch(e){$("orderMsg").innerHTML=`<span class="error">${e.message}</span>`}
}
async function quickSearch(){const q=$("quickSearch").value;try{const d=await api("/api/search?q="+encodeURIComponent(q));$("quickResult").innerHTML=`<pre>${escapeHtml(JSON.stringify(d.data,null,2))}</pre>`}catch(e){$("quickResult").innerHTML=`<span class="error">${e.message}</span>`}}
async function doSearch(){const q=$("searchQ").value;try{const d=await api("/api/search?q="+encodeURIComponent(q));$("searchResult").innerHTML=`<pre>${escapeHtml(JSON.stringify(d.data,null,2))}</pre>`}catch(e){$("searchResult").innerHTML=`<span class="error">${e.message}</span>`}}
async function shipmentsPage(c){
  const d=await api("/api/search?q=__none__");
  c.innerHTML=`<h2>الشحنات</h2><div class="panel"><p>استخدم البحث لفتح الشحنة وتحديث حالتها.</p><div class="row"><input id="shipSearch" placeholder="رقم الشحنة"><button onclick="shipSearch()">فتح</button></div><div id="shipResult"></div></div>`;
}
async function shipSearch(){try{const d=await api("/api/search?q="+encodeURIComponent($("shipSearch").value));const s=d.data;$("shipResult").innerHTML=`<div class="panel"><b>${s.shipment_no||s.order_code}</b><p>الحالة: <span class="badge">${s.status||"غير معروف"}</span></p>${s.id?`<div class="actions"><button onclick="setStatus('${s.id}','delivered')">تم التسليم</button><button onclick="setStatus('${s.id}','retry_tomorrow')">إعادة غداً</button><button onclick="setStatus('${s.id}','cancelled')">إلغاء</button><button onclick="setStatus('${s.id}','cancelled_customer_paid')">إلغاء + دفع الرسوم</button><button onclick="setStatus('${s.id}','cancelled_by_shipper')">Cancelled by Shipper</button><button onclick="setStatus('${s.id}','swapped')">تم التبديل</button></div>`:""}</div>`}catch(e){$("shipResult").innerHTML=`<span class="error">${e.message}</span>`}}
async function setStatus(id,status){try{await api("/api/shipments/status",{method:"POST",body:JSON.stringify({shipment_id:id,status})});alert("تم تحديث الحالة");shipSearch()}catch(e){alert(e.message)}}
async function jobsPage(c){
  const [j,d]=await Promise.all([api("/api/delivery-jobs"),api("/api/drivers")]);
  c.innerHTML=`<h2>مهام التوصيل</h2><div class="panel"><h3>إنشاء مهمة</h3><div class="form-grid"><label>السائق<select id="jobDriver">${d.data.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}</select></label><label>كود المهمة<input id="jobCode" placeholder="DJ-001"></label><label class="full">أرقام الشحنات، كل رقم في سطر<textarea id="jobShipments" placeholder="SH-..."></textarea></label></div><button onclick="createJob()">إنشاء</button></div><div class="panel"><h3>المهام الحالية</h3>${table(j.data,["job_code","status","expected_count","received_count","created_at"])}</div>`;
}
async function createJob(){
  const nums=$("jobShipments").value.split(/\s+/).filter(Boolean);const ids=[];
  for(const n of nums){try{const d=await api("/api/search?q="+encodeURIComponent(n));if(d.type==="shipment")ids.push(d.data.id)}catch{}}
  try{await api("/api/delivery-jobs",{method:"POST",body:JSON.stringify({driver_id:$("jobDriver").value,job_code:$("jobCode").value,shipment_ids:ids})});alert("تم إنشاء المهمة");show("jobs")}catch(e){alert(e.message)}
}
async function jobCodePage(c){
  const d=await api("/api/delivery-jobs");
  c.innerHTML=`<h2>تحديث كود مهمة التوصيل</h2><div class="panel"><div class="form-grid"><label>رقم الشحنة<input id="jcShipment"></label><label>رقم التسلسل<input id="jcSerial" type="number"></label><label>Delivery Job Code<select id="jcJob">${d.data.map(x=>`<option value="${x.job_code}">${x.job_code}</option>`).join("")}</select></label></div><button onclick="saveJobCode()">حفظ</button><div id="jcMsg"></div></div>`;
}
async function saveJobCode(){try{const d=await api("/api/delivery-job-code",{method:"POST",body:JSON.stringify({shipment_no:$("jcShipment").value,serial_no:Number($("jcSerial").value),delivery_job_code:$("jcJob").value})});$("jcMsg").innerHTML=d.duplicate?`<span class="duplicate">⚠ مكرر في نفس اليوم</span>`:`<span class="ok">تم الحفظ</span>`}catch(e){$("jcMsg").innerHTML=`<span class="error">${e.message}</span>`}}
async function returnsPage(c){const d=await api("/api/returns");c.innerHTML=`<h2>المرتجعات للتاجر</h2><div class="panel">${table(d.data,["shipment_id","reason_status","status","created_at"])}</div>`}
async function merchantsPage(c){const d=await api("/api/merchants");c.innerHTML=`<h2>التجار</h2><div class="panel">${table(d.data,["merchant_no","code","name","phone","active"])}</div>`}
async function driversPage(c){const d=await api("/api/drivers");c.innerHTML=`<h2>السائقون</h2><div class="panel">${table(d.data,["driver_no","name","phone","vehicle_no","active"])}</div>`}
async function areasPage(c){const [g,a]=await Promise.all([api("/api/governorates"),api("/api/areas")]);c.innerHTML=`<h2>الإمارات والمناطق</h2><div class="panel"><h3>الإمارات</h3>${table(g.data,["name_ar","name_en"])}</div><div class="panel"><h3>المناطق</h3>${table(a.data,["name_ar","name_en","governorate_id"])}</div>`}
async function accountingPage(c){const d=await api("/api/transactions");c.innerHTML=`<h2>الحسابات</h2><div class="panel"><p>هذا السجل يربط حركة التاجر والسائق وإيراد الشركة بالشحنة نفسها.</p>${table(d.data,["account_type","transaction_type","amount","direction","status","created_at"])}</div>`}
async function expensesPage(c){const d=await api("/api/drivers");c.innerHTML=`<h2>مصروفات السائق</h2><div class="panel"><div class="form-grid"><label>السائق<select id="exDriver"><option value="">بدون</option>${d.data.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}</select></label><label>النوع<select id="exType"><option>petrol</option><option>maintenance</option><option>road</option><option>operating</option><option>other</option></select></label><label>المبلغ<input id="exAmount" type="number" step=".01"></label><label>التاريخ<input id="exDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label class="full">ملاحظات<textarea id="exNotes"></textarea></label></div><button onclick="saveExpense()">حفظ</button><div id="exMsg"></div></div>`}
async function saveExpense(){try{await api("/api/expenses",{method:"POST",body:JSON.stringify({driver_id:$("exDriver").value||null,expense_type:$("exType").value,amount:Number($("exAmount").value),expense_date:$("exDate").value,notes:$("exNotes").value})});$("exMsg").innerHTML='<span class="ok">تم الحفظ</span>'}catch(e){$("exMsg").innerHTML=`<span class="error">${e.message}</span>`}}
async function auditPage(c){const d=await api("/api/audit");c.innerHTML=`<h2>سجل العمليات</h2><div class="panel">${table(d.data,["action","entity_type","entity_id","created_at"])}</div>`}
function table(rows,cols){if(!rows||!rows.length)return "<p class='muted'>لا توجد بيانات</p>";return `<div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${escapeHtml(String(r[c]??""))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
if(TOKEN){$("login").classList.add("hidden");$("app").classList.remove("hidden");show("dashboard")}
