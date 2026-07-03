/* =====================================================================
   USERS — kelola akun kasir & owner (khusus Owner)
   ===================================================================== */
const Users = (() => {
  let list = [];

  async function render() {
    const el = document.getElementById('content');
    el.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Pengguna</h2>
          <div class="page-sub">Kelola akun kasir dan owner yang bisa login ke aplikasi.</div>
        </div>
        <div class="toolbar"><button class="btn btn-primary btn-sm" id="btnTambahUser">+ Pengguna Baru</button></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Username</th><th>Role</th><th></th></tr></thead>
        <tbody id="userBody"><tr><td colspan="4"><div class="empty-state">Memuat…</div></td></tr></tbody>
      </table></div>
    `;
    document.getElementById('btnTambahUser').onclick = () => openModal();
    try {
      list = await API.get('users', {});
      renderBody();
    } catch (e) {
      document.getElementById('userBody').innerHTML = `<tr><td colspan="4"><div class="empty-state">Gagal memuat: ${UI.escapeHtml(e.message)}</div></td></tr>`;
    }
  }

  function renderBody() {
    const body = document.getElementById('userBody');
    if (!list.length) { body.innerHTML = `<tr><td colspan="4"><div class="empty-state">Belum ada pengguna.</div></td></tr>`; return; }
    body.innerHTML = list.map(u => `
      <tr>
        <td><b>${UI.escapeHtml(u.nama || u.username)}</b></td>
        <td>${UI.escapeHtml(u.username)}</td>
        <td><span class="badge ${u.role === 'Owner' ? 'badge-amber' : 'badge-gray'}">${u.role}</span></td>
        <td><button class="btn btn-ghost btn-sm" data-reset="${u.id_user}">Reset Password</button></td>
      </tr>
    `).join('');
    body.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => openResetModal(b.dataset.reset));
  }

  function openModal() {
    UI.openModal(`
      <h3>Pengguna Baru</h3>
      <label class="field"><span>Nama</span><input type="text" id="fNama"></label>
      <label class="field"><span>Username</span><input type="text" id="fUsername"></label>
      <label class="field"><span>Password</span><input type="password" id="fPassword"></label>
      <label class="field"><span>Role</span>
        <select id="fRole"><option value="Kasir">Kasir</option><option value="Owner">Owner</option></select>
      </label>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mCancel">Batal</button>
        <button class="btn btn-primary" id="mSave">Simpan</button>
      </div>
    `);
    document.getElementById('mCancel').onclick = UI.closeModal;
    document.getElementById('mSave').onclick = async () => {
      const nama = document.getElementById('fNama').value.trim();
      const username = document.getElementById('fUsername').value.trim();
      const password = document.getElementById('fPassword').value;
      const role = document.getElementById('fRole').value;
      if (!username || !password) return UI.toast('Username & password wajib diisi.', 'error');
      try {
        await API.post('tambahUser', { nama, username, password, role });
        UI.closeModal();
        UI.toast('Pengguna baru dibuat.', 'success');
        render();
      } catch (e) { UI.toast('Gagal: ' + e.message, 'error'); }
    };
  }

  function openResetModal(id_user) {
    UI.openModal(`
      <h3>Reset Password</h3>
      <label class="field"><span>Password baru</span><input type="password" id="fPassword"></label>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mCancel">Batal</button>
        <button class="btn btn-primary" id="mSave">Simpan</button>
      </div>
    `);
    document.getElementById('mCancel').onclick = UI.closeModal;
    document.getElementById('mSave').onclick = async () => {
      const password = document.getElementById('fPassword').value;
      if (!password) return UI.toast('Isi password baru.', 'error');
      try {
        await API.post('resetPassword', { id_user, password });
        UI.closeModal();
        UI.toast('Password diperbarui.', 'success');
      } catch (e) { UI.toast('Gagal: ' + e.message, 'error'); }
    };
  }

  return { render };
})();
