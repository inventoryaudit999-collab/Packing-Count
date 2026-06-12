// ============================================================
// store-view.js — หน้าจอสาขา: บันทึกตรวจนับรายวัน + ประวัติ/Export
// ============================================================

let CURRENT_DATE = todayStr();
let CURRENT_CAT  = 'FRESH';
let CURRENT_DATA = { FRESH:{}, TRANSFER:{}, NONFRESH:{} };
let CURRENT_META = null;
let DIRTY = { FRESH:false, TRANSFER:false, NONFRESH:false };

/* ============================================================
   ENTRY VIEW
============================================================ */
async function renderEntryView(){
  setTopbar('บันทึกการตรวจนับ Packing', `${SESSION.locNo} - ${SESSION.storeName}`);
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-title">บันทึกการตรวจนับ Packing</div>
          <div class="muted">เลือกวันที่เพื่อบันทึก หรือแก้ไขข้อมูลย้อนหลัง ก่อนกด "บันทึกข้อมูล"</div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>วันที่ตรวจนับ</label>
            <input type="date" id="entryDate" value="${CURRENT_DATE}" max="${todayStr()}">
          </div>
          <button class="btn btn-secondary" id="loadDateBtn">โหลดข้อมูล</button>
        </div>
      </div>

      <div class="tabs" id="catTabs">
        ${['FRESH','TRANSFER','NONFRESH'].map(c=>`
          <div class="tab ${c===CURRENT_CAT?'active':''} ${DIRTY[c]?'dirty':''}" data-cat="${c}">
            ${CAT_LABELS[c]} <span class="dot"></span>
          </div>`).join('')}
      </div>

      <div class="mt-12" id="entryMeta"></div>
      <div class="table-wrap mt-12" id="entryTableWrap"></div>

      <div class="flex justify-between items-center mt-16" style="flex-wrap:wrap;gap:12px;">
        <div class="text-soft" id="entryTotals"></div>
        <button class="btn btn-primary" id="saveEntryBtn">บันทึกข้อมูล (${CAT_LABELS[CURRENT_CAT]})</button>
      </div>
    </div>
  `;

  document.getElementById('entryDate').addEventListener('change', e=>{
    CURRENT_DATE = e.target.value;
    loadDateData();
  });
  document.getElementById('loadDateBtn').addEventListener('click', ()=> loadDateData());

  content.querySelectorAll('#catTabs .tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      CURRENT_CAT = t.dataset.cat;
      content.querySelectorAll('#catTabs .tab').forEach(x=> x.classList.toggle('active', x===t));
      renderEntryTable();
      document.getElementById('saveEntryBtn').textContent = `บันทึกข้อมูล (${CAT_LABELS[CURRENT_CAT]})`;
    });
  });

  document.getElementById('saveEntryBtn').addEventListener('click', saveCategory);

  await loadDateData();
}

async function loadDateData(){
  const wrap = document.getElementById('entryTableWrap');
  wrap.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text-soft)">กำลังโหลดข้อมูล...</div>';

  const data = await dbGetOnce(`counts/${CURRENT_DATE}/${SESSION.storeCode}`) || {};
  CURRENT_DATA = { FRESH: data.FRESH||{}, TRANSFER: data.TRANSFER||{}, NONFRESH: data.NONFRESH||{} };
  CURRENT_META = data._meta || null;
  DIRTY = { FRESH:false, TRANSFER:false, NONFRESH:false };

  updateTabDots();
  renderEntryMeta();
  renderEntryTable();
}

function renderEntryMeta(){
  const el = document.getElementById('entryMeta');
  if(!el) return;
  if(CURRENT_META){
    el.innerHTML = `<span class="pill pill-success">✔ มีข้อมูลของวันที่ ${thaiDate(CURRENT_DATE)} แล้ว</span>
      <span class="text-faint" style="margin-left:8px;font-size:12px;">
        ปรับปรุงล่าสุด ${fmtDateTime(CURRENT_META.updatedAt)} โดย ${escapeHtml(CURRENT_META.updatedBy||'-')}
      </span>`;
  } else {
    el.innerHTML = `<span class="pill pill-warning">⚠ ยังไม่มีข้อมูลของวันที่ ${thaiDate(CURRENT_DATE)}</span>`;
  }
}

function renderEntryTable(){
  const cat = CURRENT_CAT;
  const items = ITEMS_BY_CAT[cat] || [];
  const fields = cat === 'NONFRESH' ? ['QTY'] : ['FV','BUT','FISH'];
  const wrap = document.getElementById('entryTableWrap');

  if(items.length === 0){
    wrap.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text-soft)">ไม่มีรายการสินค้าในหมวดนี้</div>';
    return;
  }

  const headCols = fields.map(f=>`<th class="text-right">${CAT_FIELD_LABELS[f]}</th>`).join('');

  const rows = items.map((item, idx)=>{
    const rec = CURRENT_DATA[cat][item.code];
    const inputCols = fields.map(f=>{
      const val = (rec && rec[f]!==undefined) ? rec[f] : '';
      return `<td class="text-right">
        <input class="qty-input" type="number" min="0" step="any" inputmode="decimal"
          id="inp_${cat}_${item.code}_${f}" data-cat="${cat}" data-code="${item.code}" data-field="${f}"
          value="${val===''?'':val}">
      </td>`;
    }).join('');
    const total = recordTotal(item, rec);
    const amount = recordAmount(item, rec);
    return `<tr>
      <td class="num text-soft">${idx+1}</td>
      <td class="desc"><div>${escapeHtml(item.desc)}</div><div class="code">${escapeHtml(item.code)}</div></td>
      <td class="nowrap text-soft">${escapeHtml(item.uomCount)}</td>
      ${inputCols}
      <td class="text-right num" id="total_${cat}_${item.code}">${fmtNum(total,2)}</td>
      <td class="text-right num" id="amount_${cat}_${item.code}">${fmtMoney(amount)}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="dtable">
      <thead><tr>
        <th>#</th><th>รายการสินค้า</th><th>หน่วยนับ</th>${headCols}<th class="text-right">รวม</th><th class="text-right">มูลค่า (บาท)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="${3+fields.length}" class="text-right">รวมมูลค่าทั้งหมวด</td>
        <td class="text-right num" id="grandTotalQty">0</td>
        <td class="text-right num" id="grandTotalAmount">0.00</td>
      </tr></tfoot>
    </table>
  `;

  wrap.querySelectorAll('.qty-input').forEach(inp=> inp.addEventListener('input', onQtyInput));
  updateGrandTotals();
}

function onQtyInput(e){
  const inp = e.target;
  const { cat, code, field } = inp.dataset;
  const item = ITEM_MAP[cat][code];
  if(!item) return;

  const rec = {};
  item.subFields.forEach(f=>{
    const v = document.getElementById(`inp_${cat}_${code}_${f}`).value;
    rec[f] = v===''?0:(parseFloat(v)||0);
  });

  const total = recordTotal(item, rec);
  const amount = recordAmount(item, rec);
  const totalEl = document.getElementById(`total_${cat}_${code}`);
  const amountEl = document.getElementById(`amount_${cat}_${code}`);
  if(totalEl) totalEl.textContent = fmtNum(total, 2);
  if(amountEl) amountEl.textContent = fmtMoney(amount);

  const baseline = CURRENT_DATA[cat][code];
  const baseVal = (baseline && baseline[field]!==undefined) ? Number(baseline[field]) : 0;
  const curVal = inp.value===''?0:(parseFloat(inp.value)||0);
  inp.classList.toggle('changed', curVal !== baseVal);

  DIRTY[cat] = true;
  updateTabDots();
  updateGrandTotals();
}

function updateGrandTotals(){
  const cat = CURRENT_CAT;
  const items = ITEMS_BY_CAT[cat] || [];
  const fields = cat === 'NONFRESH' ? ['QTY'] : ['FV','BUT','FISH'];
  let totalQty = 0, totalAmount = 0, filledCount = 0;

  items.forEach(item=>{
    const rec = {};
    let has = false;
    fields.forEach(f=>{
      const inp = document.getElementById(`inp_${cat}_${item.code}_${f}`);
      const v = inp ? inp.value : '';
      if(v !== '') has = true;
      rec[f] = v===''?0:(parseFloat(v)||0);
    });
    if(has) filledCount++;
    totalQty += recordTotal(item, rec);
    totalAmount += recordAmount(item, rec);
  });

  const qtyEl = document.getElementById('grandTotalQty');
  const amtEl = document.getElementById('grandTotalAmount');
  if(qtyEl) qtyEl.textContent = fmtNum(totalQty, 2);
  if(amtEl) amtEl.textContent = fmtMoney(totalAmount);

  const totalsEl = document.getElementById('entryTotals');
  if(totalsEl){
    totalsEl.innerHTML = `กรอกแล้ว <b class="num">${filledCount}</b> / ${items.length} รายการ
      &nbsp;&middot;&nbsp; มูลค่ารวม <b class="num">${fmtMoney(totalAmount)}</b> บาท`;
  }
}

function updateTabDots(){
  document.querySelectorAll('#catTabs .tab').forEach(t=>{
    t.classList.toggle('dirty', !!DIRTY[t.dataset.cat]);
  });
}

/* ============================================================
   SAVE
============================================================ */
async function saveCategory(){
  const cat = CURRENT_CAT;
  const items = ITEMS_BY_CAT[cat] || [];
  const updates = {};
  const changesLog = [];
  const newDataCat = {};

  items.forEach(item=>{
    const fields = item.subFields;
    let hasInput = false;
    const rec = {};
    fields.forEach(f=>{
      const inp = document.getElementById(`inp_${cat}_${item.code}_${f}`);
      const raw = inp ? inp.value : '';
      if(raw !== '') hasInput = true;
      rec[f] = raw===''?0:(parseFloat(raw)||0);
    });

    const baseline = CURRENT_DATA[cat][item.code];
    const recsEqual = (a,b)=>{
      if(!a && !b) return true;
      if(!a || !b) return false;
      return fields.every(f=> (Number(a[f])||0) === (Number(b[f])||0));
    };

    if(hasInput){
      if(!recsEqual(baseline, rec)){
        updates[`counts/${CURRENT_DATE}/${SESSION.storeCode}/${cat}/${item.code}`] = rec;
        fields.forEach(f=>{
          const ov = (baseline && Number(baseline[f])) || 0;
          const nv = Number(rec[f]) || 0;
          if(ov !== nv) changesLog.push({ itemCode:item.code, itemDesc:item.desc, field:f, oldVal:ov, newVal:nv });
        });
      }
      newDataCat[item.code] = rec;
    } else if(baseline){
      updates[`counts/${CURRENT_DATE}/${SESSION.storeCode}/${cat}/${item.code}`] = null;
      fields.forEach(f=>{
        const ov = Number(baseline[f]) || 0;
        if(ov !== 0) changesLog.push({ itemCode:item.code, itemDesc:item.desc, field:f, oldVal:ov, newVal:0 });
      });
    }
  });

  if(changesLog.length === 0){
    toast('ไม่มีข้อมูลที่เปลี่ยนแปลง');
    return;
  }

  const btn = document.getElementById('saveEntryBtn');
  setLoading(btn, true, 'กำลังบันทึก...');
  try{
    updates[`counts/${CURRENT_DATE}/${SESSION.storeCode}/_meta`] = {
      storeName: SESSION.storeName,
      locNo: SESSION.locNo,
      updatedAt: Date.now(),
      updatedBy: SESSION.username
    };
    await dbUpdate(updates);
    await dbPush('logs', {
      ts: Date.now(),
      date: CURRENT_DATE,
      store: SESSION.storeCode,
      storeName: SESSION.storeName,
      user: SESSION.username,
      action: 'SAVE',
      category: cat,
      changes: changesLog
    });

    CURRENT_DATA[cat] = newDataCat;
    DIRTY[cat] = false;
    updateTabDots();
    renderEntryMeta();
    document.querySelectorAll('#entryTableWrap .qty-input.changed').forEach(i=> i.classList.remove('changed'));
    toast(`บันทึกข้อมูลเรียบร้อย (${changesLog.length} การเปลี่ยนแปลง)`, 'success');
  }catch(err){
    console.error(err);
    toast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'error');
  }finally{
    setLoading(btn, false);
  }
}

/* ============================================================
   HISTORY / EXPORT VIEW
============================================================ */
async function renderHistoryView(){
  setTopbar('ประวัติการตรวจนับ / Export Excel', `${SESSION.locNo} - ${SESSION.storeName}`);
  const content = document.getElementById('content');
  const thisMonth = todayStr().slice(0,7);

  content.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-title">ค้นหาข้อมูลรายเดือน</div>
          <div class="muted">เลือกเดือนเพื่อดูวันที่มีการบันทึกข้อมูลแล้ว และเปิดแก้ไขย้อนหลัง</div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>เดือน</label><input type="month" id="histMonth" value="${thisMonth}"></div>
          <button class="btn btn-secondary" id="histSearchBtn">ค้นหา</button>
          <button class="btn btn-accent" id="histExportBtn">Export เดือนนี้</button>
        </div>
      </div>
      <div id="histResult"><div class="text-soft" style="padding:32px;text-align:center;">เลือกเดือนแล้วกด "ค้นหา"</div></div>
    </div>

    <div class="card">
      <div class="card-head"><div><div class="card-title">Export ตามช่วงวันที่</div>
        <div class="muted">เลือกช่วงวันที่และหมวดหมู่ที่ต้องการ Export เป็นไฟล์ Excel</div></div></div>
      <div class="form-row">
        <div class="form-group"><label>จากวันที่</label><input type="date" id="expFrom" max="${todayStr()}"></div>
        <div class="form-group"><label>ถึงวันที่</label><input type="date" id="expTo" max="${todayStr()}"></div>
        <div class="form-group"><label>หมวดหมู่</label>
          <select id="expCat">
            <option value="ALL">ทั้งหมด</option>
            <option value="FRESH">FRESH FOOD</option>
            <option value="TRANSFER">TRANSFER</option>
            <option value="NONFRESH">NON FRESH</option>
          </select>
        </div>
        <button class="btn btn-accent" id="rangeExportBtn">Export Excel</button>
      </div>
    </div>
  `;

  document.getElementById('histSearchBtn').addEventListener('click', searchHistoryMonth);
  document.getElementById('histExportBtn').addEventListener('click', ()=>{
    const month = document.getElementById('histMonth').value;
    if(!month){ toast('กรุณาเลือกเดือน','error'); return; }
    const days = daysInMonth(month);
    exportStoreDateRange(`${month}-01`, `${month}-${pad2(days)}`, 'ALL', `PackingCount_${storeFileTag()}_${month}.xlsx`);
  });
  document.getElementById('rangeExportBtn').addEventListener('click', ()=>{
    const from = document.getElementById('expFrom').value;
    const to = document.getElementById('expTo').value;
    const cat = document.getElementById('expCat').value;
    if(!from || !to){ toast('กรุณาเลือกช่วงวันที่','error'); return; }
    if(from > to){ toast('วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด','error'); return; }
    exportStoreDateRange(from, to, cat, `PackingCount_${storeFileTag()}_${from}_to_${to}.xlsx`);
  });
}

async function searchHistoryMonth(){
  const month = document.getElementById('histMonth').value;
  if(!month) return;
  const resultEl = document.getElementById('histResult');
  resultEl.innerHTML = '<div class="text-soft" style="padding:32px;text-align:center;">กำลังค้นหา...</div>';

  const days = daysInMonth(month);
  const promises = [];
  for(let d=1; d<=days; d++){
    const dateStr = `${month}-${pad2(d)}`;
    promises.push(dbGetOnce(`counts/${dateStr}/${SESSION.storeCode}/_meta`).then(meta=>({dateStr, meta})));
  }
  const results = await Promise.all(promises);
  const found = results.filter(r=>r.meta);

  if(found.length === 0){
    resultEl.innerHTML = '<div class="text-soft" style="padding:32px;text-align:center;">ไม่พบข้อมูลในเดือนที่เลือก</div>';
    return;
  }

  resultEl.innerHTML = `
    <div class="table-wrap mt-12">
      <table class="dtable">
        <thead><tr><th>วันที่</th><th>ปรับปรุงล่าสุด</th><th>บันทึกโดย</th><th></th></tr></thead>
        <tbody>
          ${found.map(r=>`
            <tr>
              <td class="num">${thaiDate(r.dateStr)}</td>
              <td class="num">${fmtDateTime(r.meta.updatedAt)}</td>
              <td>${escapeHtml(r.meta.updatedBy || '-')}</td>
              <td><button class="btn btn-secondary btn-sm" data-jump="${r.dateStr}">เปิด / แก้ไข</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  resultEl.querySelectorAll('[data-jump]').forEach(b=>{
    b.addEventListener('click', ()=>{
      CURRENT_DATE = b.dataset.jump;
      navigateTo('entry');
    });
  });
}

function storeFileTag(){
  return `${SESSION.locNo}_${SESSION.storeCode}`;
}

async function exportStoreDateRange(from, to, catFilter, filename){
  const dates = dateRange(from, to);
  if(dates.length === 0){ toast('ช่วงวันที่ไม่ถูกต้อง','error'); return; }
  if(dates.length > 370){ toast('ช่วงวันที่กว้างเกินไป (เกิน 1 ปี)','error'); return; }

  toast('กำลังเตรียมไฟล์ Export...');
  const rows = [];
  for(const dateStr of dates){
    const data = await dbGetOnce(`counts/${dateStr}/${SESSION.storeCode}`);
    if(!data) continue;
    ['FRESH','TRANSFER','NONFRESH'].forEach(cat=>{
      if(catFilter !== 'ALL' && catFilter !== cat) return;
      const catData = data[cat];
      if(!catData) return;
      Object.entries(catData).forEach(([code, rec])=>{
        const item = ITEM_MAP[cat][code];
        if(!item) return;
        rows.push(buildExportRow(dateStr, SESSION.storeCode, cat, item, rec));
      });
    });
  }

  if(rows.length === 0){ toast('ไม่พบข้อมูลในช่วงที่เลือก','error'); return; }
  exportRowsToExcel({ 'ข้อมูลตรวจนับ': rows }, filename);
  toast('Export ไฟล์เรียบร้อย', 'success');
}
