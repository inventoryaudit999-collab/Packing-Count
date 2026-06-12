// ============================================================
// app.js — Bootstrap, Sidebar, Navigation, Routing
// ============================================================

let ITEMS_BY_CAT = { FRESH: [], TRANSFER: [], NONFRESH: [] };
let ITEM_MAP = { FRESH: {}, TRANSFER: {}, NONFRESH: {} };
let CURRENT_VIEW = null;

const STORE_NAV = [
  { id:'entry',   label:'บันทึกการตรวจนับ',     icon:'📝' },
  { id:'history', label:'ประวัติ / Export Excel', icon:'🗂️' },
];
const ADMIN_NAV = [
  { id:'overview', label:'ภาพรวมระบบ',         icon:'📊' },
  { id:'data',     label:'ข้อมูลการตรวจนับ',     icon:'🧾' },
  { id:'items',    label:'รายการสินค้า',         icon:'📦' },
  { id:'logs',     label:'Log การใช้งาน',         icon:'📜' },
  { id:'export',   label:'Export ข้อมูล (ทุกสาขา)', icon:'📤' },
];

document.addEventListener('DOMContentLoaded', ()=>{
  initLoginForm();

  // Mobile sidebar toggle
  document.getElementById('menuToggle').addEventListener('click', ()=>{
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarBackdrop').classList.add('show');
  });
  document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebar);

  const restored = restoreSession();
  if(restored){
    SESSION = restored;
    startApp();
  }
});

function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('show');
}

/* ============================================================
   START APP
============================================================ */
async function startApp(){
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // Sidebar header info
  if(SESSION.role === 'store'){
    document.getElementById('sbStoreName').textContent = `${SESSION.locNo} - ${SESSION.storeName}`;
    document.getElementById('sbRole').textContent = 'บัญชีสาขา (Store)';
  } else {
    document.getElementById('sbStoreName').textContent = SESSION.name || 'ผู้ดูแลระบบ';
    document.getElementById('sbRole').textContent = 'ผู้ดูแลระบบ (Admin)';
  }

  renderSidebar();

  toast('กำลังโหลดข้อมูลสินค้า...');
  await ensureItemsSeeded();
  await loadItemsFromDB();

  if(SESSION.role === 'store'){
    navigateTo('entry');
  } else {
    navigateTo('overview');
  }
}

/* ============================================================
   ITEM MASTER: seed + load
============================================================ */
async function ensureItemsSeeded(){
  const existing = await dbGetOnce('items');
  if(existing && Object.keys(existing).length > 0) return;

  // First run — seed item master data from embedded ITEMS_DATA
  const updates = {};
  let counters = { FRESH:0, TRANSFER:0, NONFRESH:0 };
  ITEMS_DATA.forEach(item=>{
    counters[item.category] += 1;
    updates[`items/${item.category}/${item.code}`] = {
      code: item.code,
      desc: item.desc,
      supplier: item.supplier,
      price: item.price,
      uomRec: item.uomRec,
      packRec: item.packRec,
      uomCount: item.uomCount,
      packCount: item.packCount,
      subFields: item.subFields,
      no: counters[item.category]
    };
  });
  await dbUpdate(updates);
}

async function loadItemsFromDB(){
  const data = await dbGetOnce('items') || {};
  ['FRESH','TRANSFER','NONFRESH'].forEach(cat=>{
    const obj = data[cat] || {};
    const arr = Object.values(obj);
    arr.sort((a,b)=> (a.no||0) - (b.no||0));
    ITEMS_BY_CAT[cat] = arr;
    ITEM_MAP[cat] = {};
    arr.forEach(it=> ITEM_MAP[cat][it.code] = it);
  });
}

/* ============================================================
   SIDEBAR / NAV
============================================================ */
function renderSidebar(){
  const nav = SESSION.role === 'store' ? STORE_NAV : ADMIN_NAV;
  const container = document.getElementById('sidebarNav');
  container.innerHTML = nav.map(item=>`
    <div class="nav-item" data-view="${item.id}">
      <span class="ico">${item.icon}</span>
      <span>${item.label}</span>
    </div>
  `).join('');
  container.querySelectorAll('.nav-item').forEach(el=>{
    el.addEventListener('click', ()=>{
      navigateTo(el.dataset.view);
      closeSidebar();
    });
  });
}

function setActiveNav(viewId){
  document.querySelectorAll('#sidebarNav .nav-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.view === viewId);
  });
}

function setTopbar(title, sub){
  document.getElementById('topbarTitle').textContent = title;
  document.getElementById('topbarSub').textContent = sub || '';
}

/* ============================================================
   ROUTER
============================================================ */
function navigateTo(viewId){
  CURRENT_VIEW = viewId;
  setActiveNav(viewId);

  switch(viewId){
    // Store views
    case 'entry':   return renderEntryView();
    case 'history': return renderHistoryView();

    // Admin views
    case 'overview': return renderAdminOverview();
    case 'data':     return renderAdminData();
    case 'items':    return renderAdminItems();
    case 'logs':     return renderAdminLogs();
    case 'export':   return renderAdminExport();

    default:
      document.getElementById('content').innerHTML = '<div class="card">ไม่พบหน้านี้</div>';
  }
}
