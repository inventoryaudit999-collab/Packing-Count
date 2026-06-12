// ============================================================
// auth.js — เข้าสู่ระบบ / จัดการ Session
// ============================================================

const SESSION_KEY = 'pc_session_v1';

let SESSION = null; // { role:'store'|'admin', username, storeCode, storeName, locNo }

function findAccount(username, password){
  username = (username||'').trim();
  password = (password||'').trim();
  if(!username || !password) return null;

  if(username === ADMIN_ACCOUNT.username && password === ADMIN_ACCOUNT.password){
    return { role:'admin', username, name: ADMIN_ACCOUNT.name };
  }
  const s = STORES_DATA.find(s=> s.username === username && s.password === password);
  if(s){
    return { role:'store', username: s.username, storeCode: s.username, storeName: s.name, locNo: s.locNo };
  }
  return null;
}

function restoreSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}

function saveSession(session){
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession(){
  localStorage.removeItem(SESSION_KEY);
}

function initLoginForm(){
  const form = document.getElementById('loginForm');
  const errBox = document.getElementById('loginError');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const u = document.getElementById('loginUser').value;
    const p = document.getElementById('loginPass').value;
    const account = findAccount(u, p);
    if(!account){
      errBox.style.display = 'block';
      return;
    }
    errBox.style.display = 'none';
    SESSION = account;
    saveSession(account);
    startApp();
  });

  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    clearSession();
    SESSION = null;
    location.reload();
  });
}
