# Packing Count — ระบบบันทึกการตรวจนับ Packing (Fresh Food / Transfer / Non Fresh)

ระบบเว็บแอปสำหรับบันทึกผลการตรวจนับ Packing รายวันของแต่ละสาขา CP Axtra (Makro)
รองรับ 208 สาขา + ผู้ดูแลระบบ (Admin), ใช้ Firebase Realtime Database เป็นฐานข้อมูลกลาง
และ deploy ผ่าน GitHub Pages (ไฟล์ static ล้วน ไม่ต้องมี backend แยก)

---

## 1) โครงสร้างไฟล์

```
index.html              หน้าหลักของเว็บแอป (Login + App Shell)
css/style.css           ดีไซน์ระบบ (สีขาว-น้ำเงิน-ส้ม โทน Makro)
js/data.js              ข้อมูลรายการสินค้า (283 รายการ) + รายชื่อสาขา (208 สาขา) + บัญชี Admin
js/firebase-config.js   ค่าตั้งค่า Firebase (ต้องแก้ไขก่อนใช้งานจริง)
js/utils.js             ฟังก์ชันช่วยทั่วไป (วันที่, Toast, Modal, Excel Export, การคำนวณ)
js/auth.js              ระบบ Login / Session
js/store-view.js        หน้าจอสาขา: บันทึกตรวจนับรายวัน + ประวัติ/Export
js/admin-view.js        หน้าจอแอดมิน: ภาพรวม, ข้อมูล, รายการสินค้า, Log, Export
js/app.js                Bootstrap + เมนู + Routing
database.rules.json     กฎความปลอดภัยของ Realtime Database
```

---

## 2) ตั้งค่า Firebase (ทำครั้งเดียว)

1. ไปที่ [Firebase Console](https://console.firebase.google.com) → **Add project** → สร้างโครงการใหม่
   (ปิด Google Analytics ได้ ไม่จำเป็นสำหรับระบบนี้)

2. ในเมนูซ้าย ไปที่ **Build → Realtime Database** → **Create Database**
   - เลือก Location ที่ใกล้ (แนะนำ `asia-southeast1` หรือ `Singapore`)
   - เริ่มต้นด้วย **Start in test mode** (จะตั้งค่า Rules จริงในขั้นตอนที่ 4)

3. ไปที่ **Project settings** (ไอคอนเฟือง) → แท็บ **General** → เลื่อนลงไปที่ **Your apps**
   - กดไอคอน **`</>`** (Web) → ตั้งชื่อแอป (เช่น `packing-count`) → **Register app**
   - **ไม่ต้อง** ติ๊ก Firebase Hosting
   - คัดลอกค่า `firebaseConfig` ที่ปรากฏ

4. เปิดไฟล์ `js/firebase-config.js` แล้ววางค่าที่คัดลอกมาแทนที่ค่า placeholder ทั้งหมด
   - **databaseURL จำเป็นมาก** ต้องตรงกับ Realtime Database ที่สร้างในขั้นตอนที่ 2
     (รูปแบบ: `https://<project-id>-default-rtdb.asia-southeast1.firebasedatabase.app`)

5. ตั้งค่า **Database Rules**:
   - ไปที่ **Build → Realtime Database → Rules**
   - คัดลอกเนื้อหาจากไฟล์ `database.rules.json` ไปวางแทนของเดิม แล้วกด **Publish**

   > **หมายเหตุด้านความปลอดภัย:** กฎด้านบนเป็นแบบเปิด (อ่าน/เขียนได้โดยไม่ต้อง login Firebase)
   > เหมาะสำหรับใช้งานภายในองค์กรที่ไม่ต้องการความซับซ้อนของ Firebase Authentication
   > ระบบจำกัดสิทธิ์ผู้ใช้งานด้วย Username/Password ของแอปเอง (ดูข้อ 3) แทน
   > หากต้องการความปลอดภัยสูงขึ้น ควรพิจารณาเพิ่ม Firebase Authentication + ปรับ Rules ภายหลัง

---

## 3) บัญชีผู้ใช้งาน

ระบบไม่มีหน้าสมัครสมาชิก — บัญชีทั้งหมดถูกกำหนดไว้ล่วงหน้าในไฟล์ `js/data.js`

| ประเภท | Username | Password | สิทธิ์การใช้งาน |
|---|---|---|---|
| สาขา | `storeXXX` (XXX = เลข Loc เติม 0 ข้างหน้าให้ครบ 3 หลัก เช่น Loc 1 → `store001`, Loc 990 → `store990`) | `welcome1` | บันทึก/แก้ไขข้อมูลตรวจนับของสาขาตนเอง, ดูประวัติ, Export Excel ของสาขาตนเอง |
| ผู้ดูแลระบบ | `admin` | `MakroAdmin#2026` | ดูภาพรวมทุกสาขา, ค้นหา/แก้ไข/ลบข้อมูลทุกสาขา, จัดการรายการสินค้า, ดู Log, Export ข้อมูลทุกสาขา |

> **แนะนำ:** เปลี่ยนรหัสผ่าน Admin ในไฟล์ `js/data.js` (ตัวแปร `ADMIN_ACCOUNT`) ก่อนนำไปใช้งานจริง
> หากต้องการเปลี่ยนรหัสผ่านของสาขา ให้แก้ไขค่า `password` ของสาขานั้นในตัวแปร `STORES_DATA`

---

## 4) การทำงานของระบบ (สรุป)

### หน้าสาขา
- **บันทึกการตรวจนับ**: เลือกวันที่ (ย้อนหลังได้) → เลือกแท็บหมวดหมู่ (FRESH FOOD / TRANSFER / NON FRESH)
  → กรอกจำนวนที่ตรวจนับ (F&V / BUT / FISH สำหรับ Fresh Food และ Transfer, จำนวนเดียวสำหรับ Non Fresh)
  → ระบบคำนวณ "รวม" และ "มูลค่า" ให้อัตโนมัติ → กด **บันทึกข้อมูล**
  - หากย้อนกลับมาแก้ไขข้อมูลวันเดิม ค่าที่บันทึกไว้แล้วจะถูกโหลดมาแสดงให้แก้ไขได้
  - แท็บที่มีข้อมูลที่ยังไม่บันทึกจะมีจุดสีส้มแสดงเตือน
- **ประวัติ / Export Excel**: เลือกเดือนเพื่อดูว่าวันใดมีการบันทึกแล้วบ้าง (กดเปิด/แก้ไขได้ทันที)
  หรือเลือกช่วงวันที่ + หมวดหมู่ เพื่อ Export เป็นไฟล์ Excel

### หน้า Admin
- **ภาพรวมระบบ**: สรุปจำนวนสาขาที่บันทึกข้อมูลแล้ว/ยังไม่บันทึกของวันที่เลือก และมูลค่ารวม
- **ข้อมูลการตรวจนับ**: ค้นหาข้อมูลของสาขาใดสาขาหนึ่ง หรือทุกสาขา ตามช่วงวันที่/หมวดหมู่
  พร้อมแก้ไข/ลบข้อมูลรายรายการได้ (มีการบันทึก Log ทุกครั้ง)
- **รายการสินค้า**: เพิ่ม/แก้ไข/ลบรายการสินค้าในแต่ละหมวดหมู่ — มีผลกับหน้าบันทึกของทุกสาขาทันที
- **Log การใช้งาน**: ดูประวัติการบันทึก/แก้ไข/ลบ ของทุกสาขาและของ Admin
- **Export ข้อมูล**: เลือกสาขา (หลายสาขา/ทั้งหมด) + ช่วงวันที่ + หมวดหมู่ → Export เป็นไฟล์ Excel เดียว

---

## 5) โครงสร้างข้อมูลใน Firebase Realtime Database

```
/items/{FRESH|TRANSFER|NONFRESH}/{รหัสสินค้า}
    = { code, desc, supplier, price, uomRec, packRec, uomCount, packCount, subFields, no }
    (สร้างให้อัตโนมัติจากข้อมูลตั้งต้นในครั้งแรกที่มีผู้ใช้งานเข้าระบบ)

/counts/{YYYY-MM-DD}/{storeCode}/{FRESH|TRANSFER|NONFRESH}/{รหัสสินค้า}
    = { FV, BUT, FISH }   (สำหรับ FRESH / TRANSFER)
    = { QTY }             (สำหรับ NONFRESH)

/counts/{YYYY-MM-DD}/{storeCode}/_meta
    = { storeName, locNo, updatedAt, updatedBy }

/logs/{pushId}
    = { ts, date, store, storeName, user, action, category, changes:[ {itemCode, itemDesc, field, oldVal, newVal} ] }
```

โครงสร้างนี้จัดเรียงโดยใช้ **วันที่เป็นระดับบนสุด** ของ `/counts` ทำให้ Admin สามารถอ่านข้อมูล
ของ **ทุกสาขาในวันเดียว** ได้ด้วยการอ่านเพียง 1 ครั้ง (`counts/{date}`) จึงรองรับการค้นหา/Export
ข้อมูลของสาขาจำนวนมาก (200+ สาขา) ได้อย่างรวดเร็ว และแต่ละสาขาบันทึกข้อมูลแยกคนละ path กัน
จึงไม่มีปัญหาการเขียนชนกัน รองรับการใช้งานพร้อมกันหลายสาขาได้

---

## 6) Deploy ขึ้น GitHub Pages

1. สร้าง repository ใหม่บน GitHub (Public หรือ Private ก็ได้ — Private ต้องมี GitHub Pro/Team
   เพื่อเปิดใช้ GitHub Pages)

2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ (`index.html`, `css/`, `js/`, `database.rules.json`, `README.md`)
   ขึ้นไปที่ repository (ผ่านเว็บ GitHub หรือ `git push`)

3. ไปที่ **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: เลือก branch หลัก (เช่น `main`) และโฟลเดอร์ `/ (root)`
   - กด **Save**

4. รอประมาณ 1-2 นาที จะได้ลิงก์เว็บไซต์ในรูปแบบ:
   `https://<username>.github.io/<repository-name>/`

5. ทดสอบเข้าสู่ระบบด้วยบัญชี Admin (`admin` / `MakroAdmin#2026`) และบัญชีสาขาตัวอย่าง
   (เช่น `store001` / `welcome1`)

---

## 7) การแก้ไข/ปรับแต่งเพิ่มเติม

- **เปลี่ยนรหัสผ่าน**: แก้ไขที่ `js/data.js` (`ADMIN_ACCOUNT.password` และ `STORES_DATA[i].password`)
- **เพิ่ม/ลบสาขา**: แก้ไขอาเรย์ `STORES_DATA` ใน `js/data.js` (ต้องมี `username` ไม่ซ้ำกัน)
- **เพิ่ม/ลบ/แก้ไขรายการสินค้า**: ทำได้ผ่านหน้า Admin → "รายการสินค้า" โดยไม่ต้องแก้โค้ด
  (ข้อมูลตั้งต้นใน `js/data.js` ใช้สำหรับ seed ข้อมูลเข้า Firebase ในครั้งแรกเท่านั้น)
- **สีและธีม**: แก้ไขตัวแปร CSS ในไฟล์ `css/style.css` (ส่วน `:root { ... }`)
