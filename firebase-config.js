// ============================================================
// Firebase Configuration — READY TO USE
// Project: packing-cost
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyDYSCqX52ubME3P3rfO7bcqg0TTfUVvWNc",
  authDomain:        "packing-cost.firebaseapp.com",
  databaseURL:       "https://packing-cost-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "packing-cost",
  storageBucket:     "packing-cost.firebasestorage.app",
  messagingSenderId: "384560968075",
  appId:             "1:384560968075:web:f66bee0746bada60a5bf8e"
};

// ============================================================
// รายชื่อผู้ใช้งาน — แก้ไขเพิ่มสาขาได้ที่นี่
// format: "username": { password: "...", storeName: "...", role: "store" | "admin" }
// ============================================================
const LOCAL_USERS = {
  "store001": { password: "welcome1", storeName: "สาขา 001",          role: "store" },
  "store002": { password: "welcome1", storeName: "สาขา 002",          role: "store" },
  "store003": { password: "welcome1", storeName: "สาขา 003",          role: "store" },
  "admin":    { password: "admin2025", storeName: "Admin / Head Office", role: "admin" }
};

// ============================================================
// Init Firebase (ไม่ต้องแก้ส่วนนี้)
// ============================================================
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
