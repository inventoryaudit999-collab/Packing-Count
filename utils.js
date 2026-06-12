// ============================================================
// utils.js — ฟังก์ชันช่วยทั่วไป: Toast, Modal, วันที่, Firebase, Excel
// ============================================================

/* ---------- Date helpers ---------- */
function pad2(n){ return String(n).padStart(2,'0'); }

function todayStr(){
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function thaiDate(dateStr){
  // 'YYYY-MM-DD' -> 'DD/MM/YYYY'
  if(!dateStr) return '-';
  const [y,m,d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function daysInMonth(yyyyMm){
  // 'YYYY-MM' -> number of days
  const [y,m] = yyyyMm.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function dateRange(from, to){
  const out = [];
  let cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  if(isNaN(cur) || isNaN(end) || cur > end) return out;
  while(cur <= end){
    out.push(`${cur.getFullYear()}-${pad2(cur.getMonth()+1)}-${pad2(cur.getDate())}`);
    cur.setDate(cur.getDate()+1);
  }
  return out;
}

function fmtDateTime(ts){
  if(!ts) return '-';
  const d = new Date(ts);
  return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/* ---------- Number / formatting helpers ---------- */
function fmtNum(n, digits=0){
  n = Number(n)||0;
  return n.toLocaleString('th-TH', {minimumFractionDigits:digits, maximumFractionDigits:digits});
}
function fmtMoney(n){ return fmtNum(n, 2); }

function escapeHtml(str){
  if(str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg, type='default'){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (type!=='default' ? ' '+type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ t.className = ''; }, 3200);
}

/* ---------- Modal ---------- */
function showModal(innerHtml, onMount){
  const root = document.getElementById('modalRoot');
  root.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal">${innerHtml}</div></div>`;
  document.getElementById('modalBackdrop').addEventListener('click', (e)=>{
    if(e.target.id === 'modalBackdrop') closeModal();
  });
  if(onMount) onMount(root);
}
function closeModal(){
  document.getElementById('modalRoot').innerHTML = '';
}

/* ---------- Loading state on buttons ---------- */
function setLoading(btn, loading, loadingText='กำลังโหลด...'){
  if(!btn) return;
  if(loading){
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = loadingText;
    btn.disabled = true;
  } else {
    if(btn.dataset.origText) btn.innerHTML = btn.dataset.origText;
    btn.disabled = false;
  }
}

/* ---------- Firebase helpers ---------- */
async function dbGetOnce(path){
  const snap = await db.ref(path).once('value');
  return snap.val();
}
async function dbUpdate(updates){
  return db.ref().update(updates);
}
async function dbSet(path, val){
  return db.ref(path).set(val);
}
async function dbPush(path, val){
  return db.ref(path).push(val);
}
async function dbRemove(path){
  return db.ref(path).remove();
}

/* ---------- Item helpers ---------- */
const CAT_LABELS = { FRESH: 'FRESH FOOD', TRANSFER: 'TRANSFER', NONFRESH: 'NON FRESH' };
const CAT_FIELD_LABELS = { FV: 'F&V', BUT: 'BUT', FISH: 'FISH', QTY: 'จำนวน' };

function itemUnitCost(item){
  const pack = Number(item.packCount) || 1;
  const price = Number(item.price) || 0;
  return price / pack;
}
function recordTotal(item, rec){
  if(!rec) return 0;
  return (item.subFields||[]).reduce((s,f)=> s + (Number(rec[f])||0), 0);
}
function recordAmount(item, rec){
  return recordTotal(item, rec) * itemUnitCost(item);
}

/* ---------- Excel export ---------- */
function exportRowsToExcel(sheets, filename){
  // sheets: { 'ชื่อชีท': [ {col:val,...}, ... ] }
  const wb = XLSX.utils.book_new();
  Object.entries(sheets).forEach(([name, rows])=>{
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'ไม่มีข้อมูล': '' }]);
    XLSX.utils.book_append_sheet(wb, ws, name.substring(0,31));
  });
  XLSX.writeFile(wb, filename);
}

/* ---------- Store helpers ---------- */
function getStoreByCode(code){
  return STORES_DATA.find(s=>s.username === code);
}
function storeLabel(code){
  const s = getStoreByCode(code);
  return s ? `${s.locNo} - ${s.name}` : code;
}

/* ---------- Export row builder (shared by store + admin export) ---------- */
function buildExportRow(dateStr, storeCode, cat, item, rec){
  const s = getStoreByCode(storeCode);
  const total = recordTotal(item, rec);
  const amount = recordAmount(item, rec);
  return {
    'วันที่': thaiDate(dateStr),
    'รหัสผู้ใช้สาขา': storeCode,
    'เลขที่สาขา (Loc)': s ? s.locNo : '',
    'ชื่อสาขา': s ? s.name : '',
    'หมวดหมู่': CAT_LABELS[cat] || cat,
    'รหัสสินค้า': item.code,
    'รายการสินค้า': item.desc,
    'ผู้ขาย/Supplier': item.supplier,
    'หน่วยนับ': item.uomCount,
    'F&V': cat === 'NONFRESH' ? '' : (Number(rec.FV)||0),
    'BUT': cat === 'NONFRESH' ? '' : (Number(rec.BUT)||0),
    'FISH': cat === 'NONFRESH' ? '' : (Number(rec.FISH)||0),
    'จำนวน (Non Fresh)': cat === 'NONFRESH' ? (Number(rec.QTY)||0) : '',
    'รวมจำนวนตรวจนับ': total,
    'ราคาต่อหน่วยนับ (บาท)': Math.round(itemUnitCost(item)*100)/100,
    'มูลค่ารวม (บาท)': Math.round(amount*100)/100
  };
}
