// ============================================================
// Firebase Configuration
// ============================================================
// วิธีตั้งค่า (ดูรายละเอียดเต็มใน README.md):
// 1) ไปที่ https://console.firebase.google.com -> สร้างโครงการ (Add project)
// 2) ในโครงการ ไปที่ Build > Realtime Database -> Create Database
//    - เลือก Location ที่ใกล้ (เช่น Singapore asia-southeast1)
//    - เริ่มต้นด้วย "Start in test mode" (ค่อยตั้ง Rules ตามไฟล์ database.rules.json ทีหลัง)
// 3) ไปที่ Project settings (รูปเฟือง) > General > Your apps -> เลือก "</>" (Web)
//    - ตั้งชื่อแอป แล้วกด Register app (ไม่ต้องติ๊ก Firebase Hosting)
// 4) คัดลอกค่า firebaseConfig ที่ได้ มาวางแทนค่าด้านล่างนี้ทั้งหมด
//
// ตัวอย่างค่าที่ได้จาก Firebase Console:
// const firebaseConfig = {
//   apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
//   authDomain: "your-project-id.firebaseapp.com",
//   databaseURL: "https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "your-project-id",
//   storageBucket: "your-project-id.appspot.com",
//   messagingSenderId: "123456789012",
//   appId: "1:123456789012:web:abcdef1234567890"
// };
//
// *** databaseURL จำเป็นมาก ต้องมีค่านี้ ไม่เช่นนั้นระบบจะบันทึกข้อมูลไม่ได้ ***
// ============================================================

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
