// ============================================================
// admin-view.js — หน้าจอผู้ดูแลระบบ (Admin)
// ============================================================

let ADMIN_DATA_ROWS = []; // cache of last search results for edit/delete

/* ============================================================
   OVERVIEW
============================================================ */
async function renderAdminOverview(){
  setTopbar('ภาพรวมระบบ', 'Packing Count — CP Axtra / Makro');
  const content = document.getElementById('content');
  const today = todayStr();

  content.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-title">ภาพรวมการบันทึกข้อมูล</div>
          <div class="muted">เลือกวันที่เพื่อดูสถานะการบันทึกของแต่ละสาขา</div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>วันที่</label><input type="date" id="ovDate" value="${today}" max="${today}"></div>
          <button class="btn btn-secondary" id="ovRefreshBtn">รีเฟรช</button>
        </div>
      </div>
      <div class="stat-grid" id="ovStats">
        <div class="stat-card"><div class="label">กำลังโหลด...</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">รายการสินค้าในระบบ</div>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="label">FRESH FOOD</div><div class="value">${ITEMS_BY_CAT.FRESH.length}</div><div class="sub">รายการ &middot; ตรวจนับ F&amp;V / BUT / FISH</div></div>
        <div class="stat-card"><div class="label">TRANSFER</div><div class="value">${ITEMS_BY_CAT.TRANSFER.length}</div><div class="sub">รายการ &middot; ตรวจนับ F&amp;V / BUT / FISH</div></div>
        <div class="stat-card"><div class="label">NON FRESH</div><div class="value">${ITEMS_BY_CAT.NONFRESH.length}</div><div class="sub">รายการ &middot; ตรวจนับจำนวนเดียว</div></div>
        <div class="stat-card"><div class="label">สาขาทั้งหมด</div><div class="value">${STORES_DATA.length}</div><div class="sub">สาขาในระบบ</div></div>
      </div>
    </div>
  `;

  document.getElementById('ovRefreshBtn').addEventListener('click', loadOverviewStats);
  document.getElementById('ovDate').addEventListener('change', loadOverviewStats);
  await loadOverviewStats();
}

async function loadOverviewStats(){
  const date = document.getElementById('ovDate').value;
  const statsEl = document.getElementById('ovStats');
  statsEl.innerHTML = `<div class="stat-card"><div class="label">กำลังโหลด...</div></div>`;

  const data = await dbGetOnce(`counts/${date}`) || {};
  const storeCodes = Object.keys(data);
  const submitted = storeCodes.length;
  const total = STORES_DATA.length;
  const pct = total ? Math.round((submitted/total)*100) : 0;

  let grandAmount = 0;
  storeCodes.forEach(code=>{
    const rec = data[code];
    ['FRESH','TRANSFER','NONFRESH'].forEach(cat=>{
      const catData = rec[cat];
      if(!catData) return;
      Object.entries(catData).forEach(([itemCode, r])=>{
        const item = ITEM_MAP[cat][itemCode];
        if(item) grandAmount += recordAmount(item, r);
      });
    });
  });

  statsEl.innerHTML = `
    <div class="stat-card">
      <div class="label">สาขาที่บันทึกแล้ว (${thaiDate(date)})</div>
      <div class="value">${fmtNum(submitted)} / ${fmtNum(total)}</div>
      <div class="bar"><div style="width:${pct}%"></div></div>
      <div class="sub">${pct}% ของสาขาทั้งหมด</div>
    </div>
    <div class="stat-card">
      <div class="label">สาขาที่ยังไม่บันทึก</div>
      <div class="value">${fmtNum(total - submitted)}</div>
      <div class="sub">สาขา</div>
    </div>
    <div class="stat-card">
      <div class="label">มูลค่ารวมที่บันทึกของวันนี้</div>
      <div class="value">${fmtMoney(grandAmount)}</div>
      <div class="sub">บาท (ทุกสาขา / ทุกหมวด)</div>
    </div>
  `;
}

/* ============================================================
   DATA BROWSER
============================================================ */
async function renderAdminData(){
  setTopbar('ข้อมูลการตรวจนับ', 'ค้นหา / แก้ไข / ลบ ข้อมูลรายการตรวจนับ');
  const content = document.getElementById('content');
  const today = todayStr();

  const storeOptions = STORES_DATA
    .slice()
    .sort((a,b)=> Number(a.locNo) - Number(b.locNo))
    .map(s=>`<option value="${s.username}">${s.locNo} - ${escapeHtml(s.name)}</option>`).join('');

  content.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-title">ค้นหาข้อมูลการตรวจนับ</div>
          <div class="muted">เลือกสาขา / ช่วงวันที่ / หมวดหมู่ แล้วกด "ค้นหา"</div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="min-width:220px;">
          <label>สาขา</label>
          <select id="dataStore">
            <option value="ALL">-- ทุกสาขา --</option>
            ${storeOptions}
          </select>
        </div>
        <div class="form-group"><label>จากวันที่</label><input type="date" id="dataFrom" value="${today}" max="${today}"></div>
        <div class="form-group"><label>ถึงวันที่</label><input type="date" id="dataTo" value="${today}" max="${today}"></div>
        <div class="form-group">
          <label>หมวดหมู่</label>
          <select id="dataCat">
            <option value="ALL">ทั้งหมด</option>
            <option value="FRESH">FRESH FOOD</option>
            <option value="TRANSFER">TRANSFER</option>
            <option value="NONFRESH">NON FRESH</option>
          </select>
        </div>
        <button class="btn btn-primary" id="dataSearchBtn">ค้นหา</button>
      </div>
      <div class="mt-12 text-faint" style="font-size:12px;">
        คำแนะนำ: หากเลือก "ทุกสาขา" ในช่วงวันที่ยาว ระบบจะอ่านข้อมูล 1 ครั้งต่อวัน (ครอบคลุมทุกสาขาในการอ่านครั้งเดียว) จึงรองรับข้อมูลจำนวนมากได้รวดเร็ว
      </div>
      <div class="mt-12" id="dataResultInfo"></div>
      <div class="table-wrap mt-12" id="dataResultWrap"></div>
    </div>
  `;

  document.getElementById('dataSearchBtn').addEventListener('click', searchAdminData);
}

async function searchAdminData(){
  const storeFilter = document.getElementById('dataStore').value;
  const from = document.getElementById('dataFrom').value;
  const to = document.getElementById('dataTo').value;
  const catFilter = document.getElementById('dataCat').value;
  const infoEl = document.getElementById('dataResultInfo');
  const wrapEl = document.getElementById('dataResultWrap');

  if(!from || !to || from > to){
    toast('กรุณาเลือกช่วงวันที่ให้ถูกต้อง', 'error');
    return;
  }
  const dates = dateRange(from, to);
  if(dates.length > 370){
    toast('ช่วงวันที่กว้างเกินไป (เกิน 1 ปี)', 'error');
    return;
  }

  infoEl.innerHTML = `<div class="text-soft">กำลังค้นหา... (${dates.length} วัน)</div>`;
  wrapEl.innerHTML = '';

  ADMIN_DATA_ROWS = [];

  for(const dateStr of dates){
    const data = await dbGetOnce(`counts/${dateStr}`);
    if(!data) continue;

    const storeCodes = storeFilter === 'ALL' ? Object.keys(data) : (data[storeFilter] ? [storeFilter] : []);
    storeCodes.forEach(storeCode=>{
      const rec = data[storeCode];
      if(!rec) return;
      ['FRESH','TRANSFER','NONFRESH'].forEach(cat=>{
        if(catFilter !== 'ALL' && catFilter !== cat) return;
        const catData = rec[cat];
        if(!catData) return;
        Object.entries(catData).forEach(([itemCode, r])=>{
          const item = ITEM_MAP[cat][itemCode] || placeholderItem(cat, itemCode);
          ADMIN_DATA_ROWS.push({ dateStr, storeCode, cat, itemCode, item, rec: r });
        });
      });
    });
  }

  if(ADMIN_DATA_ROWS.length === 0){
    infoEl.innerHTML = '<div class="text-soft">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div>';
    return;
  }

  const MAX_SHOW = 1000;
  const showRows = ADMIN_DATA_ROWS.slice(0, MAX_SHOW);
  infoEl.innerHTML = `พบ <b class="num">${fmtNum(ADMIN_DATA_ROWS.length)}</b> รายการ
    ${ADMIN_DATA_ROWS.length > MAX_SHOW ? `<span class="pill pill-warning" style="margin-left:8px;">แสดงเฉพาะ ${fmtNum(MAX_SHOW)} รายการแรก — กรุณาเลือกช่วงให้แคบลงหากต้องการดูทั้งหมด</span>` : ''}`;

  renderAdminDataTable(showRows);
}

function placeholderItem(cat, code){
  return { category: cat, code, desc:'(ไม่พบในรายการสินค้า — อาจถูกลบแล้ว)', supplier:'', price:0, uomCount:'', packCount:1,
    subFields: cat === 'NONFRESH' ? ['QTY'] : ['FV','BUT','FISH'] };
}

function renderAdminDataTable(rows){
  const wrapEl = document.getElementById('dataResultWrap');
  const trs = rows.map((row, idx)=>{
    const { dateStr, storeCode, cat, item, rec } = row;
    const total = recordTotal(item, rec);
    const amount = recordAmount(item, rec);
    const fields = item.subFields;
    const fieldVals = fields.map(f=>`<span class="text-soft">${CAT_FIELD_LABELS[f]}:</span> <b class="num">${fmtNum(rec[f]||0,2)}</b>`).join('&nbsp;&nbsp;');
    return `<tr>
      <td class="num nowrap">${thaiDate(dateStr)}</td>
      <td class="nowrap">${escapeHtml(storeLabel(storeCode))}</td>
      <td><span class="pill pill-info">${CAT_LABELS[cat]}</span></td>
      <td class="desc"><div>${escapeHtml(item.desc)}</div><div class="code">${escapeHtml(item.code)}</div></td>
      <td class="nowrap">${fieldVals}</td>
      <td class="text-right num">${fmtNum(total,2)}</td>
      <td class="text-right num">${fmtMoney(amount)}</td>
      <td class="nowrap">
        <button class="btn btn-secondary btn-sm" data-edit="${idx}">แก้ไข</button>
        <button class="btn btn-danger btn-sm" data-del="${idx}">ลบ</button>
      </td>
    </tr>`;
  }).join('');

  wrapEl.innerHTML = `
    <table class="dtable">
      <thead><tr>
        <th>วันที่</th><th>สาขา</th><th>หมวดหมู่</th><th>รายการสินค้า</th><th>จำนวนที่บันทึก</th><th class="text-right">รวม</th><th class="text-right">มูลค่า</th><th>การจัดการ</th>
      </tr></thead>
      <tbody>${trs}</tbody>
    </table>
  `;

  wrapEl.querySelectorAll('[data-edit]').forEach(b=> b.addEventListener('click', ()=> openEditRecordModal(Number(b.dataset.edit))));
  wrapEl.querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', ()=> confirmDeleteRecord(Number(b.dataset.del))));
}

function openEditRecordModal(idx){
  const row = ADMIN_DATA_ROWS[idx];
  const { dateStr, storeCode, cat, item, rec } = row;
  const fields = item.subFields;

  const inputsHtml = fields.map(f=>`
    <div class="field">
      <label>${CAT_FIELD_LABELS[f]}</label>
      <input type="number" min="0" step="any" id="editField_${f}" value="${rec[f]!==undefined?rec[f]:0}">
    </div>
  `).join('');

  showModal(`
    <h3>แก้ไขข้อมูลการตรวจนับ</h3>
    <div class="text-soft" style="font-size:13px;margin-bottom:14px;">
      <div><b>วันที่:</b> ${thaiDate(dateStr)}</div>
      <div><b>สาขา:</b> ${escapeHtml(storeLabel(storeCode))}</div>
      <div><b>รายการ:</b> ${escapeHtml(item.desc)} <span class="code">(${escapeHtml(item.code)})</span></div>
    </div>
    ${inputsHtml}
    <div class="modal-actions">
      <button class="btn btn-secondary" id="editCancelBtn">ยกเลิก</button>
      <button class="btn btn-primary" id="editSaveBtn">บันทึก</button>
    </div>
  `, ()=>{
    document.getElementById('editCancelBtn').addEventListener('click', closeModal);
    document.getElementById('editSaveBtn').addEventListener('click', ()=> saveEditedRecord(idx));
  });
}

async function saveEditedRecord(idx){
  const row = ADMIN_DATA_ROWS[idx];
  const { dateStr, storeCode, cat, item, rec } = row;
  const fields = item.subFields;
  const newRec = {};
  const changes = [];

  fields.forEach(f=>{
    const inp = document.getElementById(`editField_${f}`);
    const nv = parseFloat(inp.value) || 0;
    const ov = Number(rec[f]) || 0;
    newRec[f] = nv;
    if(nv !== ov) changes.push({ itemCode:item.code, itemDesc:item.desc, field:f, oldVal:ov, newVal:nv });
  });

  if(changes.length === 0){
    toast('ไม่มีการเปลี่ยนแปลง');
    closeModal();
    return;
  }

  try{
    const updates = {};
    updates[`counts/${dateStr}/${storeCode}/${cat}/${item.code}`] = newRec;
    updates[`counts/${dateStr}/${storeCode}/_meta/updatedAt`] = Date.now();
    updates[`counts/${dateStr}/${storeCode}/_meta/updatedBy`] = `${SESSION.username} (admin)`;
    await dbUpdate(updates);
    await dbPush('logs', {
      ts: Date.now(), date: dateStr, store: storeCode, storeName: getStoreByCode(storeCode)?.name || storeCode,
      user: SESSION.username, action: 'UPDATE', category: cat, changes
    });

    row.rec = newRec;
    closeModal();
    toast('แก้ไขข้อมูลเรียบร้อย', 'success');
    renderAdminDataTable(ADMIN_DATA_ROWS.slice(0, 1000));
  }catch(err){
    console.error(err);
    toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
}

function confirmDeleteRecord(idx){
  const row = ADMIN_DATA_ROWS[idx];
  const { dateStr, storeCode, cat, item } = row;
  showModal(`
    <h3>ยืนยันการลบข้อมูล</h3>
    <div class="text-soft" style="font-size:13px;margin-bottom:14px;">
      ต้องการลบข้อมูลตรวจนับของรายการนี้ใช่หรือไม่?<br><br>
      <b>วันที่:</b> ${thaiDate(dateStr)}<br>
      <b>สาขา:</b> ${escapeHtml(storeLabel(storeCode))}<br>
      <b>รายการ:</b> ${escapeHtml(item.desc)} <span class="code">(${escapeHtml(item.code)})</span>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="delCancelBtn">ยกเลิก</button>
      <button class="btn btn-danger" id="delConfirmBtn">ลบข้อมูล</button>
    </div>
  `, ()=>{
    document.getElementById('delCancelBtn').addEventListener('click', closeModal);
    document.getElementById('delConfirmBtn').addEventListener('click', ()=> deleteRecord(idx));
  });
}

async function deleteRecord(idx){
  const row = ADMIN_DATA_ROWS[idx];
  const { dateStr, storeCode, cat, item, rec } = row;
  const fields = item.subFields;
  const changes = fields.map(f=>({ itemCode:item.code, itemDesc:item.desc, field:f, oldVal:Number(rec[f])||0, newVal:0 }));

  try{
    const updates = {};
    updates[`counts/${dateStr}/${storeCode}/${cat}/${item.code}`] = null;
    updates[`counts/${dateStr}/${storeCode}/_meta/updatedAt`] = Date.now();
    updates[`counts/${dateStr}/${storeCode}/_meta/updatedBy`] = `${SESSION.username} (admin)`;
    await dbUpdate(updates);
    await dbPush('logs', {
      ts: Date.now(), date: dateStr, store: storeCode, storeName: getStoreByCode(storeCode)?.name || storeCode,
      user: SESSION.username, action: 'DELETE', category: cat, changes
    });

    ADMIN_DATA_ROWS.splice(idx, 1);
    closeModal();
    toast('ลบข้อมูลเรียบร้อย', 'success');
    renderAdminDataTable(ADMIN_DATA_ROWS.slice(0, 1000));
  }catch(err){
    console.error(err);
    toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
}

/* ============================================================
   ITEM MASTER
============================================================ */
let ADMIN_ITEMS_CAT = 'FRESH';

async function renderAdminItems(){
  setTopbar('รายการสินค้า (Item Master)', 'เพิ่ม / แก้ไข / ลบ รายการสินค้าในระบบ');
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-title">รายการสินค้า</div>
          <div class="muted">รายการที่เพิ่มหรือแก้ไขที่นี่ จะมีผลกับหน้าบันทึกของทุกสาขาทันที</div>
        </div>
        <button class="btn btn-primary" id="addItemBtn">+ เพิ่มรายการสินค้า</button>
      </div>
      <div class="tabs" id="itemCatTabs">
        ${['FRESH','TRANSFER','NONFRESH'].map(c=>`<div class="tab ${c===ADMIN_ITEMS_CAT?'active':''}" data-cat="${c}">${CAT_LABELS[c]} (${ITEMS_BY_CAT[c].length})</div>`).join('')}
      </div>
      <div class="table-wrap mt-12" id="itemsTableWrap"></div>
    </div>
  `;

  content.querySelectorAll('#itemCatTabs .tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      ADMIN_ITEMS_CAT = t.dataset.cat;
      content.querySelectorAll('#itemCatTabs .tab').forEach(x=> x.classList.toggle('active', x===t));
      renderItemsTable();
    });
  });
  document.getElementById('addItemBtn').addEventListener('click', ()=> openItemModal(null));

  renderItemsTable();
}

function renderItemsTable(){
  const cat = ADMIN_ITEMS_CAT;
  const items = ITEMS_BY_CAT[cat] || [];
  const wrap = document.getElementById('itemsTableWrap');

  const rows = items.map((item, idx)=>`
    <tr>
      <td class="num text-soft">${idx+1}</td>
      <td class="code">${escapeHtml(item.code)}</td>
      <td class="desc">${escapeHtml(item.desc)}</td>
      <td>${escapeHtml(item.supplier||'')}</td>
      <td class="text-right num">${fmtMoney(item.price)}</td>
      <td class="nowrap">${escapeHtml(item.uomRec||'')}</td>
      <td class="text-right num">${fmtNum(item.packRec,2)}</td>
      <td class="nowrap">${escapeHtml(item.uomCount||'')}</td>
      <td class="text-right num">${fmtNum(item.packCount,2)}</td>
      <td class="nowrap">
        <button class="btn btn-secondary btn-sm" data-edit-item="${item.code}">แก้ไข</button>
        <button class="btn btn-danger btn-sm" data-del-item="${item.code}">ลบ</button>
      </td>
    </tr>
  `).join('');

  wrap.innerHTML = `
    <table class="dtable">
      <thead><tr>
        <th>#</th><th>รหัสสินค้า</th><th>รายการสินค้า</th><th>Supplier</th>
        <th class="text-right">ราคา (บาท)</th><th>หน่วยรับ</th><th class="text-right">Pack รับ</th>
        <th>หน่วยตรวจนับ</th><th class="text-right">Pack ตรวจนับ</th><th>การจัดการ</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="10" class="text-center text-soft" style="padding:24px;">ไม่มีรายการ</td></tr>`}</tbody>
    </table>
  `;

  wrap.querySelectorAll('[data-edit-item]').forEach(b=> b.addEventListener('click', ()=> openItemModal(b.dataset.editItem)));
  wrap.querySelectorAll('[data-del-item]').forEach(b=> b.addEventListener('click', ()=> confirmDeleteItem(b.dataset.delItem)));
}

function openItemModal(code){
  const cat = ADMIN_ITEMS_CAT;
  const isEdit = !!code;
  const item = isEdit ? ITEM_MAP[cat][code] : null;

  showModal(`
    <h3>${isEdit ? 'แก้ไขรายการสินค้า' : 'เพิ่มรายการสินค้าใหม่'}</h3>
    <div class="field"><label>หมวดหมู่</label>
      <input type="text" value="${CAT_LABELS[cat]}" disabled>
    </div>
    <div class="field"><label>รหัสสินค้า (Item Code)</label>
      <input type="text" id="itCode" value="${isEdit ? escapeHtml(code) : ''}" ${isEdit?'disabled':''} placeholder="เช่น 0240080001Y">
    </div>
    <div class="field"><label>รายการสินค้า</label>
      <input type="text" id="itDesc" value="${isEdit ? escapeHtml(item.desc) : ''}">
    </div>
    <div class="field"><label>Supplier</label>
      <input type="text" id="itSupplier" value="${isEdit ? escapeHtml(item.supplier||'') : ''}">
    </div>
    <div class="form-row">
      <div class="form-group flex-1"><label>ราคา (บาท)</label>
        <input type="number" step="any" id="itPrice" value="${isEdit ? item.price : 0}"></div>
      <div class="form-group flex-1"><label>หน่วยรับ (UOM รับ)</label>
        <input type="text" id="itUomRec" value="${isEdit ? escapeHtml(item.uomRec||'') : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group flex-1"><label>Pack รับ (Unit Pack Rec)</label>
        <input type="number" step="any" id="itPackRec" value="${isEdit ? item.packRec : 1}"></div>
      <div class="form-group flex-1"><label>หน่วยตรวจนับ</label>
        <input type="text" id="itUomCount" value="${isEdit ? escapeHtml(item.uomCount||'') : ''}"></div>
    </div>
    <div class="form-group"><label>Pack ตรวจนับ (Unit Pack Count)</label>
      <input type="number" step="any" id="itPackCount" value="${isEdit ? item.packCount : 1}"></div>

    <div class="modal-actions">
      <button class="btn btn-secondary" id="itCancelBtn">ยกเลิก</button>
      <button class="btn btn-primary" id="itSaveBtn">บันทึก</button>
    </div>
  `, ()=>{
    document.getElementById('itCancelBtn').addEventListener('click', closeModal);
    document.getElementById('itSaveBtn').addEventListener('click', ()=> saveItem(isEdit, code));
  });
}

async function saveItem(isEdit, oldCode){
  const cat = ADMIN_ITEMS_CAT;
  const code = isEdit ? oldCode : document.getElementById('itCode').value.trim();
  const desc = document.getElementById('itDesc').value.trim();

  if(!code || !desc){ toast('กรุณากรอกรหัสสินค้าและชื่อรายการ', 'error'); return; }
  if(!isEdit && ITEM_MAP[cat][code]){ toast('รหัสสินค้านี้มีอยู่แล้วในหมวดนี้', 'error'); return; }

  const newItem = {
    code,
    desc,
    supplier: document.getElementById('itSupplier').value.trim(),
    price: parseFloat(document.getElementById('itPrice').value) || 0,
    uomRec: document.getElementById('itUomRec').value.trim(),
    packRec: parseFloat(document.getElementById('itPackRec').value) || 1,
    uomCount: document.getElementById('itUomCount').value.trim(),
    packCount: parseFloat(document.getElementById('itPackCount').value) || 1,
    subFields: cat === 'NONFRESH' ? ['QTY'] : ['FV','BUT','FISH'],
    no: isEdit ? ITEM_MAP[cat][code].no : (ITEMS_BY_CAT[cat].length ? Math.max(...ITEMS_BY_CAT[cat].map(i=>i.no||0))+1 : 1)
  };

  try{
    await dbSet(`items/${cat}/${code}`, newItem);
    await dbPush('logs', {
      ts: Date.now(), date: todayStr(), store: '-', storeName: '-',
      user: SESSION.username, action: isEdit ? 'ITEM_EDIT' : 'ITEM_ADD',
      category: cat, changes: [{ itemCode: code, itemDesc: desc, field: '-', oldVal: '-', newVal: '-' }]
    });

    if(isEdit){
      const idx = ITEMS_BY_CAT[cat].findIndex(i=>i.code===code);
      ITEMS_BY_CAT[cat][idx] = newItem;
    } else {
      ITEMS_BY_CAT[cat].push(newItem);
    }
    ITEM_MAP[cat][code] = newItem;

    closeModal();
    toast(isEdit ? 'แก้ไขรายการเรียบร้อย' : 'เพิ่มรายการเรียบร้อย', 'success');
    await renderAdminItems();
  }catch(err){
    console.error(err);
    toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
}

function confirmDeleteItem(code){
  const cat = ADMIN_ITEMS_CAT;
  const item = ITEM_MAP[cat][code];
  showModal(`
    <h3>ยืนยันการลบรายการสินค้า</h3>
    <div class="text-soft" style="font-size:13px;margin-bottom:14px;">
      ต้องการลบ <b>${escapeHtml(item.desc)}</b> (${escapeHtml(code)}) ออกจากรายการสินค้าใช่หรือไม่?<br><br>
      <span class="pill pill-warning">หมายเหตุ: ข้อมูลตรวจนับที่บันทึกไปแล้วในอดีตจะยังคงอยู่ แต่จะไม่แสดงในหน้าบันทึกของสาขาอีกต่อไป</span>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="diCancelBtn">ยกเลิก</button>
      <button class="btn btn-danger" id="diConfirmBtn">ลบรายการ</button>
    </div>
  `, ()=>{
    document.getElementById('diCancelBtn').addEventListener('click', closeModal);
    document.getElementById('diConfirmBtn').addEventListener('click', ()=> deleteItem(code));
  });
}

async function deleteItem(code){
  const cat = ADMIN_ITEMS_CAT;
  const item = ITEM_MAP[cat][code];
  try{
    await dbRemove(`items/${cat}/${code}`);
    await dbPush('logs', {
      ts: Date.now(), date: todayStr(), store: '-', storeName: '-',
      user: SESSION.username, action: 'ITEM_DELETE',
      category: cat, changes: [{ itemCode: code, itemDesc: item.desc, field: '-', oldVal: '-', newVal: '-' }]
    });

    ITEMS_BY_CAT[cat] = ITEMS_BY_CAT[cat].filter(i=>i.code!==code);
    delete ITEM_MAP[cat][code];

    closeModal();
    toast('ลบรายการเรียบร้อย', 'success');
    await renderAdminItems();
  }catch(err){
    console.error(err);
    toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
}

/* ============================================================
   LOGS
============================================================ */
async function renderAdminLogs(){
  setTopbar('Log การใช้งาน', 'ประวัติการบันทึก / แก้ไข / ลบ ข้อมูล');
  const content = document.getElementById('content');

  const storeOptions = STORES_DATA
    .slice().sort((a,b)=> Number(a.locNo) - Number(b.locNo))
    .map(s=>`<option value="${s.username}">${s.locNo} - ${escapeHtml(s.name)}</option>`).join('');

  content.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-title">Log การใช้งานระบบ</div>
          <div class="muted">แสดง Log ล่าสุดตามจำนวนที่เลือก สามารถกรองตามสาขาและประเภทการทำงาน</div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="min-width:220px;">
          <label>สาขา</label>
          <select id="logStore">
            <option value="ALL">-- ทุกสาขา --</option>
            <option value="-">-- ระบบ / Admin (รายการสินค้า) --</option>
            ${storeOptions}
          </select>
        </div>
        <div class="form-group">
          <label>ประเภทการทำงาน</label>
          <select id="logAction">
            <option value="ALL">ทั้งหมด</option>
            <option value="SAVE">SAVE (สาขาบันทึก)</option>
            <option value="UPDATE">UPDATE (แก้ไขโดย Admin)</option>
            <option value="DELETE">DELETE (ลบโดย Admin)</option>
            <option value="ITEM_ADD">ITEM_ADD (เพิ่มสินค้า)</option>
            <option value="ITEM_EDIT">ITEM_EDIT (แก้ไขสินค้า)</option>
            <option value="ITEM_DELETE">ITEM_DELETE (ลบสินค้า)</option>
          </select>
        </div>
        <div class="form-group">
          <label>จำนวน Log ล่าสุด</label>
          <select id="logLimit">
            <option value="200">200 รายการ</option>
            <option value="500">500 รายการ</option>
            <option value="1000">1,000 รายการ</option>
          </select>
        </div>
        <button class="btn btn-primary" id="logSearchBtn">โหลด Log</button>
      </div>
      <div class="mt-12" id="logResultInfo"></div>
      <div class="table-wrap mt-12" id="logResultWrap"></div>
    </div>
  `;

  document.getElementById('logSearchBtn').addEventListener('click', loadLogs);
  await loadLogs();
}

async function loadLogs(){
  const storeFilter = document.getElementById('logStore').value;
  const actionFilter = document.getElementById('logAction').value;
  const limit = parseInt(document.getElementById('logLimit').value, 10) || 200;
  const infoEl = document.getElementById('logResultInfo');
  const wrapEl = document.getElementById('logResultWrap');

  infoEl.innerHTML = '<div class="text-soft">กำลังโหลด...</div>';
  wrapEl.innerHTML = '';

  let data;
  try{
    const snap = await db.ref('logs').orderByChild('ts').limitToLast(limit).once('value');
    data = snap.val() || {};
  }catch(err){
    console.error(err);
    infoEl.innerHTML = `<div class="pill pill-danger">ไม่สามารถโหลด Log ได้ (ตรวจสอบว่าได้ตั้งค่า .indexOn: ["ts"] ใน Database Rules แล้ว) — ${err.message}</div>`;
    return;
  }

  let entries = Object.entries(data).map(([id, v])=>({ id, ...v }));
  if(storeFilter !== 'ALL') entries = entries.filter(e=> e.store === storeFilter);
  if(actionFilter !== 'ALL') entries = entries.filter(e=> e.action === actionFilter);
  entries.sort((a,b)=> (b.ts||0) - (a.ts||0));

  if(entries.length === 0){
    infoEl.innerHTML = '<div class="text-soft">ไม่พบ Log ตามเงื่อนไขที่เลือก</div>';
    return;
  }

  infoEl.innerHTML = `พบ <b class="num">${fmtNum(entries.length)}</b> รายการ`;

  const rows = entries.map(e=>{
    const changeCount = (e.changes||[]).length;
    const detailId = 'log_' + e.id;
    const changesRows = (e.changes||[]).map(c=>`
      <tr>
        <td class="desc"><div>${escapeHtml(c.itemDesc||'')}</div><div class="code">${escapeHtml(c.itemCode||'')}</div></td>
        <td>${escapeHtml(CAT_FIELD_LABELS[c.field] || c.field || '-')}</td>
        <td class="text-right num">${c.oldVal === '-' ? '-' : fmtNum(c.oldVal,2)}</td>
        <td class="text-right num">${c.newVal === '-' ? '-' : fmtNum(c.newVal,2)}</td>
      </tr>
    `).join('');

    return `
      <tr>
        <td class="num nowrap">${fmtDateTime(e.ts)}</td>
        <td class="nowrap">${e.store==='-' ? '-' : escapeHtml(storeLabel(e.store))}</td>
        <td>${escapeHtml(e.user||'-')}</td>
        <td><span class="pill ${logActionPillClass(e.action)}">${e.action}</span></td>
        <td>${e.category ? `<span class="pill pill-muted">${CAT_LABELS[e.category]||e.category}</span>` : '-'}</td>
        <td class="text-center">
          ${changeCount ? `<button class="btn btn-ghost btn-sm" data-toggle="${detailId}">${changeCount} รายการ ▾</button>` : '-'}
        </td>
      </tr>
      ${changeCount ? `
      <tr class="hidden" id="${detailId}">
        <td colspan="6" style="padding:0;">
          <table class="dtable" style="margin:0;">
            <thead><tr><th>รายการสินค้า</th><th>ฟิลด์</th><th class="text-right">ค่าเดิม</th><th class="text-right">ค่าใหม่</th></tr></thead>
            <tbody>${changesRows}</tbody>
          </table>
        </td>
      </tr>` : ''}
    `;
  }).join('');

  wrapEl.innerHTML = `
    <table class="dtable">
      <thead><tr>
        <th>เวลา</th><th>สาขา</th><th>ผู้ใช้งาน</th><th>การทำงาน</th><th>หมวดหมู่</th><th class="text-center">รายละเอียด</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  wrapEl.querySelectorAll('[data-toggle]').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.getElementById(b.dataset.toggle).classList.toggle('hidden');
    });
  });
}

function logActionPillClass(action){
  switch(action){
    case 'SAVE': return 'pill-success';
    case 'UPDATE': return 'pill-info';
    case 'DELETE': return 'pill-danger';
    case 'ITEM_ADD': return 'pill-success';
    case 'ITEM_EDIT': return 'pill-info';
    case 'ITEM_DELETE': return 'pill-danger';
    default: return 'pill-muted';
  }
}

/* ============================================================
   EXPORT (ALL BRANCHES)
============================================================ */
async function renderAdminExport(){
  setTopbar('Export ข้อมูล', 'ส่งออกข้อมูลการตรวจนับเป็นไฟล์ Excel');
  const content = document.getElementById('content');
  const today = todayStr();

  const storeChecks = STORES_DATA
    .slice().sort((a,b)=> Number(a.locNo) - Number(b.locNo))
    .map(s=>`
      <label class="flex items-center gap-8" style="padding:4px 0;font-weight:500;font-size:13px;cursor:pointer;">
        <input type="checkbox" class="exp-store-chk" value="${s.username}" checked>
        ${s.locNo} - ${escapeHtml(s.name)}
      </label>
    `).join('');

  content.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-title">Export ข้อมูลการตรวจนับ</div>
          <div class="muted">เลือกสาขา ช่วงวันที่ และหมวดหมู่ที่ต้องการ Export เป็นไฟล์ Excel (.xlsx)</div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>จากวันที่</label><input type="date" id="expFrom" value="${today}" max="${today}"></div>
        <div class="form-group"><label>ถึงวันที่</label><input type="date" id="expTo" value="${today}" max="${today}"></div>
        <div class="form-group">
          <label>หมวดหมู่</label>
          <select id="expCat">
            <option value="ALL">ทั้งหมด</option>
            <option value="FRESH">FRESH FOOD</option>
            <option value="TRANSFER">TRANSFER</option>
            <option value="NONFRESH">NON FRESH</option>
          </select>
        </div>
        <button class="btn btn-primary" id="expRunBtn">Export Excel</button>
      </div>

      <div class="mt-16">
        <div class="flex items-center justify-between" style="margin-bottom:8px;">
          <div class="card-title" style="font-size:13px;">เลือกสาขา (${STORES_DATA.length} สาขา)</div>
          <div class="flex gap-8">
            <button class="btn btn-secondary btn-sm" id="expSelectAll">เลือกทั้งหมด</button>
            <button class="btn btn-secondary btn-sm" id="expSelectNone">ไม่เลือกเลย</button>
          </div>
        </div>
        <input type="text" id="expStoreFilter" placeholder="ค้นหาสาขา..." style="width:100%;padding:9px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);margin-bottom:8px;">
        <div id="expStoreList" style="max-height:260px;overflow:auto;border:1px solid var(--border-soft);border-radius:10px;padding:8px 12px;background:var(--surface-2);">
          ${storeChecks}
        </div>
      </div>

      <div class="mt-12 text-faint" style="font-size:12px;">
        การ Export อ่านข้อมูลจาก Firebase 1 ครั้งต่อวัน (ครอบคลุมทุกสาขาในการอ่านครั้งเดียว) จึงรองรับการ Export ข้อมูลจำนวนมากกว่า 200 สาขาได้อย่างรวดเร็ว
      </div>
    </div>
  `;

  document.getElementById('expSelectAll').addEventListener('click', ()=>{
    content.querySelectorAll('.exp-store-chk').forEach(c=> c.checked = true);
  });
  document.getElementById('expSelectNone').addEventListener('click', ()=>{
    content.querySelectorAll('.exp-store-chk').forEach(c=> c.checked = false);
  });
  document.getElementById('expStoreFilter').addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    content.querySelectorAll('#expStoreList label').forEach(label=>{
      label.style.display = label.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
  document.getElementById('expRunBtn').addEventListener('click', runAdminExport);
}

async function runAdminExport(){
  const from = document.getElementById('expFrom').value;
  const to = document.getElementById('expTo').value;
  const catFilter = document.getElementById('expCat').value;

  if(!from || !to || from > to){ toast('กรุณาเลือกช่วงวันที่ให้ถูกต้อง', 'error'); return; }
  const dates = dateRange(from, to);
  if(dates.length > 370){ toast('ช่วงวันที่กว้างเกินไป (เกิน 1 ปี)', 'error'); return; }

  const selectedStores = new Set(
    Array.from(document.querySelectorAll('.exp-store-chk:checked')).map(c=>c.value)
  );
  if(selectedStores.size === 0){ toast('กรุณาเลือกสาขาอย่างน้อย 1 สาขา', 'error'); return; }

  const btn = document.getElementById('expRunBtn');
  setLoading(btn, true, 'กำลัง Export...');

  try{
    const rows = [];
    for(const dateStr of dates){
      const data = await dbGetOnce(`counts/${dateStr}`);
      if(!data) continue;
      Object.entries(data).forEach(([storeCode, rec])=>{
        if(!selectedStores.has(storeCode)) return;
        ['FRESH','TRANSFER','NONFRESH'].forEach(cat=>{
          if(catFilter !== 'ALL' && catFilter !== cat) return;
          const catData = rec[cat];
          if(!catData) return;
          Object.entries(catData).forEach(([itemCode, r])=>{
            const item = ITEM_MAP[cat][itemCode] || placeholderItem(cat, itemCode);
            rows.push(buildExportRow(dateStr, storeCode, cat, item, r));
          });
        });
      });
    }

    if(rows.length === 0){ toast('ไม่พบข้อมูลตามเงื่อนไขที่เลือก', 'error'); return; }

    const filename = `PackingCount_AllBranches_${from}_to_${to}.xlsx`;
    exportRowsToExcel({ 'ข้อมูลตรวจนับ': rows }, filename);
    toast(`Export สำเร็จ (${fmtNum(rows.length)} รายการ)`, 'success');
  }catch(err){
    console.error(err);
    toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }finally{
    setLoading(btn, false);
  }
}
