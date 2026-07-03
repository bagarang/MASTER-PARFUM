/* =====================================================================
   STOK — daftar produk, tambah/edit produk, adjust stok, kartu stok
   ===================================================================== */
const Stok = (() => {
  let search = '';
  let filterKategori = 'semua';

  const KATEGORI_LIST = ['bibit', 'base', 'botol', 'bukhur', 'pelengkap'];

  function render() {
    const el = document.getElementById('content');
    el.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Stok &amp; Inventori</h2>
          <div class="page-sub">Kelola produk, bibit, base, dan pantau sisa stok gudang.</div>
        </div>
        <div class="toolbar">
          <input type="text" id="stokSearch" placeholder="Cari produk…">
          <select id="stokFilter">
            <option value="semua">Semua kategori</option>
            ${KATEGORI_LIST.map(k => `<option value="${k}">${cap(k)}</option>`).join('')}
          </select>
          ${Auth.isOwner() ? `<button class="btn btn-primary btn-sm" id="btnTambahProduk">+ Produk Baru</button>` : ''}
        </div>
      </div>
      ${Auth.isOwner() ? '' : `<div class="page-sub" style="margin-bottom:12px;">Mode lihat saja &mdash; hanya Owner yang bisa menambah, mengedit, atau mengubah stok.</div>`}
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Produk</th><th>Kategori</th><th>Modal</th><th>Jual</th><th>Sisa Stok</th>${Auth.isOwner() ? '<th></th>' : ''}
          </tr></thead>
          <tbody id="stokBody"></tbody>
        </table>
      </div>
    `;
    document.getElementById('stokSearch').addEventListener('input', e => { search = e.target.value.toLowerCase(); renderBody(); });
    document.getElementById('stokFilter').addEventListener('change', e => { filterKategori = e.target.value; renderBody(); });
    if (Auth.isOwner()) document.getElementById('btnTambahProduk').addEventListener('click', () => openProdukModal(null));
    renderBody();
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function renderBody() {
    const body = document.getElementById('stokBody');
    const list = Store.produk.filter(p => {
      if (filterKategori !== 'semua' && p.kategori !== filterKategori) return false;
      if (search && !p.nama.toLowerCase().includes(search)) return false;
      return true;
    });
    if (!list.length) {
      body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="emoji">📦</div>Tidak ada produk yang cocok.</div></td></tr>`;
      return;
    }
    body.innerHTML = list.map(p => {
      const habis = Number(p.sisa) <= 0;
      const rendah = !habis && Number(p.sisa) < 20;
      const badge = habis ? `<span class="badge badge-red">Habis</span>` : rendah ? `<span class="badge badge-amber">Menipis</span>` : `<span class="badge badge-green">Aman</span>`;
      return `
      <tr>
        <td><b>${UI.escapeHtml(p.nama)}</b></td>
        <td><span class="badge badge-gray">${cap(p.kategori)}</span></td>
        <td>${UI.rupiah(p.modal)}</td>
        <td>${UI.rupiah(p.jual)}</td>
        <td>${UI.ml(p.sisa)} ${badge}</td>
        ${Auth.isOwner() ? `
        <td style="white-space:nowrap;">
          <button class="btn btn-ghost btn-sm" data-adjust="${p.id}">Stok Masuk</button>
          <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Edit</button>
          <button class="btn btn-ghost btn-sm" data-kartu="${p.id}">Kartu Stok</button>
        </td>` : ''}
      </tr>`;
    }).join('');

    if (Auth.isOwner()) {
      body.querySelectorAll('[data-adjust]').forEach(b => b.onclick = () => openAdjustModal(b.dataset.adjust));
      body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openProdukModal(b.dataset.edit));
      body.querySelectorAll('[data-kartu]').forEach(b => b.onclick = () => openKartuStokModal(b.dataset.kartu));
    }
  }

  function openProdukModal(id) {
    const editing = !!id;
    const p = editing ? Store.produk.find(x => String(x.id) === String(id)) : null;
    UI.openModal(`
      <h3>${editing ? 'Edit Produk' : 'Produk Baru'}</h3>
      <label class="field"><span>Nama produk</span><input type="text" id="fNama" value="${p ? UI.escapeHtml(p.nama) : ''}"></label>
      <label class="field"><span>Kategori</span>
        <select id="fKategori">${KATEGORI_LIST.map(k => `<option value="${k}" ${p && p.kategori === k ? 'selected' : ''}>${cap(k)}</option>`).join('')}</select>
      </label>
      <div class="rk-row">
        <label class="field"><span>Harga modal</span><input type="number" id="fModal" min="0" value="${p ? p.modal : 0}"></label>
        <label class="field"><span>Harga jual</span><input type="number" id="fJual" min="0" value="${p ? p.jual : 0}"></label>
      </div>
      <label class="field"><span>Stok awal ${editing ? '(sisa saat ini)' : ''}</span><input type="number" id="fSisa" min="0" step="0.1" value="${p ? p.sisa : 0}" ${editing ? 'disabled' : ''}></label>
      ${editing ? `<div class="page-sub">Gunakan tombol "Stok Masuk" di tabel untuk menambah stok, agar tercatat rapi di kartu stok.</div>` : ''}
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mCancel">Batal</button>
        <button class="btn btn-primary" id="mSave">Simpan</button>
      </div>
    `);
    document.getElementById('mCancel').onclick = UI.closeModal;
    document.getElementById('mSave').onclick = async () => {
      const nama = document.getElementById('fNama').value.trim();
      const kategori = document.getElementById('fKategori').value;
      const modal = Number(document.getElementById('fModal').value || 0);
      const jual = Number(document.getElementById('fJual').value || 0);
      const sisa = Number(document.getElementById('fSisa').value || 0);
      if (!nama) return UI.toast('Nama produk wajib diisi.', 'error');
      try {
        const actor_username = (Auth.getUser() || {}).username || '';
        if (editing) await API.post('editProduk', { id, nama, kategori, modal, jual, actor_username });
        else await API.post('tambahProduk', { nama, kategori, modal, jual, sisa, actor_username });
        UI.closeModal();
        await Store.reload();
        renderBody();
        UI.toast('Produk tersimpan.', 'success');
      } catch (e) { UI.toast('Gagal menyimpan: ' + e.message, 'error'); }
    };
  }

  function openAdjustModal(id) {
    const p = Store.produk.find(x => String(x.id) === String(id));
    if (!p) return;
    UI.openModal(`
      <h3>Stok Masuk &mdash; ${UI.escapeHtml(p.nama)}</h3>
      <div class="page-sub">Sisa saat ini: ${UI.ml(p.sisa)}</div>
      <label class="field"><span>Jumlah masuk</span><input type="number" id="fJumlah" min="0.1" step="0.1" placeholder="mis. 100"></label>
      <label class="field"><span>Keterangan</span><input type="text" id="fKet" placeholder="mis. Pembelian dari supplier"></label>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mCancel">Batal</button>
        <button class="btn btn-primary" id="mSave">Simpan</button>
      </div>
    `);
    document.getElementById('mCancel').onclick = UI.closeModal;
    document.getElementById('mSave').onclick = async () => {
      const jumlah = Number(document.getElementById('fJumlah').value || 0);
      const keterangan = document.getElementById('fKet').value.trim() || 'Stok masuk';
      if (!jumlah || jumlah <= 0) return UI.toast('Isi jumlah stok masuk.', 'error');
      try {
        await API.post('adjustStok', { id_produk: id, jumlah, keterangan, actor_username: (Auth.getUser() || {}).username || '' });
        UI.closeModal();
        await Store.reload();
        renderBody();
        UI.toast('Stok berhasil ditambahkan.', 'success');
      } catch (e) { UI.toast('Gagal: ' + e.message, 'error'); }
    };
  }

  async function openKartuStokModal(id) {
    const p = Store.produk.find(x => String(x.id) === String(id));
    UI.openModal(`<h3>Kartu Stok &mdash; ${UI.escapeHtml(p ? p.nama : '')}</h3><div class="page-sub">Memuat riwayat…</div>`);
    try {
      const rows = await API.get('kartuStok', { id_produk: id });
      let html = `<h3>Kartu Stok &mdash; ${UI.escapeHtml(p ? p.nama : '')}</h3>`;
      if (!rows.length) {
        html += `<div class="empty-state"><div class="emoji">📄</div>Belum ada riwayat stok.</div>`;
      } else {
        html += `<div class="table-wrap" style="max-height:340px; overflow-y:auto;"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Masuk</th><th>Keluar</th><th>Saldo</th><th>Ket.</th></tr></thead><tbody>`;
        rows.slice().reverse().forEach(r => {
          html += `<tr><td>${fmtDate(r.tanggal)}</td><td>${r.jenis_transaksi}</td><td>${r.stok_masuk || 0}</td><td>${r.stok_keluar || 0}</td><td>${r.saldo}</td><td>${UI.escapeHtml(r.keterangan)}</td></tr>`;
        });
        html += `</tbody></table></div>`;
      }
      html += `<div class="modal-actions"><button class="btn btn-primary btn-block" id="mClose">Tutup</button></div>`;
      UI.openModal(html);
      document.getElementById('mClose').onclick = UI.closeModal;
    } catch (e) {
      UI.toast('Gagal memuat kartu stok: ' + e.message, 'error');
      UI.closeModal();
    }
  }

  function fmtDate(s) {
    try { return new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return s; }
  }

  return { render };
})();
