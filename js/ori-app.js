/* =====================================================================
   APP — state store, router, bootstrap
   ===================================================================== */
const Store = {
  produk: [], kategori: [], matriks: [], loaded: false,
  async reload() {
    const data = await API.get('init', {});
    this.produk = data.produk || [];
    this.kategori = data.kategori || [];
    this.matriks = data.matriks || [];
    this.loaded = true;
  }
};

const Router = (() => {
  const views = {
    kasir: { title: 'Kasir', render: () => Kasir.render() },
    stok: { title: 'Stok & Inventori', render: () => Stok.render() },
    matriks: { title: 'Matriks Oplosan', render: () => Matriks.render() },
    jurnal: { title: 'Jurnal & Laporan', render: () => Jurnal.render() },
    users: { title: 'Pengguna', render: () => Users.render() }
  };
  let current = 'kasir';

  function go(view) {
    if (!views[view]) view = 'kasir';
    if (view === 'users' && !Auth.isOwner()) view = 'kasir';
    current = view;
    document.getElementById('topbarTitle').textContent = views[view].title;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    document.querySelectorAll('.bn-item[data-view]').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    views[view].render();
  }

  function get() { return current; }
  return { go, get };
})();

document.addEventListener('DOMContentLoaded', async () => {
  const splash = document.getElementById('splash');
  const splashSub = document.getElementById('splashSub');

  // Basic config sanity check
  let configOk = true;
  try { API && APP_CONFIG.APPS_SCRIPT_URL && APP_CONFIG.APPS_SCRIPT_URL.indexOf('PASTE_URL_WEB_APP') === -1; }
  catch (e) { configOk = false; }
  if (APP_CONFIG.APPS_SCRIPT_URL.indexOf('PASTE_URL_WEB_APP') !== -1) configOk = false;

  if (!configOk) {
    splashSub.innerHTML = 'URL Apps Script belum diisi.<br>Buka <code>js/config.js</code> lalu isi <b>APPS_SCRIPT_URL</b>.';
    splash.style.color = 'var(--danger)';
    return;
  }

  const savedUser = Auth.loadFromStorage();
  if (savedUser) {
    try {
      splashSub.textContent = 'Memuat data toko…';
      await Store.reload();
      showApp(savedUser);
    } catch (e) {
      showLogin('Sesi berakhir, silakan masuk kembali.');
    }
  } else {
    showLogin();
  }

  function showLogin(msg) {
    splash.classList.add('hidden');
    document.getElementById('viewApp').classList.add('hidden');
    document.getElementById('viewLogin').classList.remove('hidden');
    if (msg) document.getElementById('loginMsg').textContent = msg;
  }

  function showApp(user) {
    splash.classList.add('hidden');
    document.getElementById('viewLogin').classList.add('hidden');
    document.getElementById('viewApp').classList.remove('hidden');
    document.getElementById('sideUserName').textContent = user.nama || user.username;
    document.getElementById('sideUserRole').textContent = user.role;
    document.getElementById('navUsers').style.display = user.role === 'Owner' ? '' : 'none';
    Router.go('kasir');
  }

  // ---- Login form ----
  document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnLoginSubmit');
    const msg = document.getElementById('loginMsg');
    msg.textContent = '';
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    btn.disabled = true; btn.textContent = 'Memeriksa…';
    try {
      const user = await Auth.login(username, password);
      await Store.reload();
      showApp(user);
    } catch (err) {
      msg.textContent = err.message || 'Login gagal.';
    } finally {
      btn.disabled = false; btn.textContent = 'Masuk';
    }
  });

  // ---- Nav (desktop sidebar) ----
  document.getElementById('sideNav').addEventListener('click', e => {
    const b = e.target.closest('[data-view]');
    if (b) Router.go(b.dataset.view);
  });

  // ---- Bottom nav (mobile) ----
  document.getElementById('bottomNav').addEventListener('click', e => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    if (b.dataset.view === 'more') { openMoreMenu(); return; }
    Router.go(b.dataset.view);
  });

  function openMoreMenu() {
    const user = Auth.getUser();
    UI.openModal(`
      <h3>Lainnya</h3>
      ${Auth.isOwner() ? `<button class="btn btn-ghost btn-block" style="margin-bottom:10px;" id="moreUsers">Pengguna</button>` : ''}
      <div class="page-sub" style="margin-bottom:14px;">Masuk sebagai <b>${UI.escapeHtml(user.nama || user.username)}</b> (${user.role})</div>
      <button class="btn btn-danger btn-block" id="moreLogout">Keluar</button>
    `);
    if (Auth.isOwner()) document.getElementById('moreUsers').onclick = () => { UI.closeModal(); Router.go('users'); };
    document.getElementById('moreLogout').onclick = () => { UI.closeModal(); doLogout(); };
  }

  // ---- Logout ----
  document.getElementById('btnLogout').addEventListener('click', doLogout);
  function doLogout() {
    Auth.logout();
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    showLogin();
  }
});
