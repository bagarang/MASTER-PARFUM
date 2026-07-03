/* =====================================================================
   JURNAL & LAPORAN — buku kas + laporan penjualan
   ===================================================================== */
const Jurnal = (() => {
  let tab = 'kas';
  let tglAwal = UI.todayStr();
  let tglAkhir = UI.todayStr();

  function render() {
    const el = document.getElementById('content');
    el.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Jurnal &amp; Laporan</h2>
          <div class="page-sub">Buku kas toko dan ringkasan penjualan.</div>
        </div>
        <div class="toolbar">
          <input type="date" id="jTglAwal" value="${tglAwal}">
          <span style="color:var(--ink-soft);">s/d</span>
          <input type="date" id="jTglAkhir" value="${tglAkhir}">
          <button class="btn btn-ghost btn-sm" id="jFilter">Terapkan</button>
        </div>
      </div>
      <div class="kasir-tabs">
        <button class="kasir-tab ${tab === 'kas' ? 'active' : ''}" data-tab="kas">Buku Kas</button>
        <button class="kasir-tab ${tab === 'laporan' ? 'active' : ''}" data-tab="laporan">Laporan Penjualan</button>
      </div>
      <div id="jurnalBody"></div>
    `;
    document.querySelectorAll('.kasir-tabs .kasir-tab').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
    document.getElementById('jFilter').onclick = () => {
      tglAwal = document.getElementById('jTglAwal').value;
      tglAkhir = document.getElementById('jTglAkhir').value;
      renderBody();
    };
    renderBody();
  }

  async function renderBody() {
    const wrap = document.getElementById('jurnalBody');
    wrap.innerHTML = `<div class="empty-state">Memuat data…</div>`;
    try {
      if (tab === 'kas') await renderKas(wrap);
      else await renderLaporan(wrap);
    } catch (e) {
      wrap.innerHTML = `<div class="empty-state"><div class="emoji">⚠️</div>Gagal memuat: ${UI.escapeHtml(e.message)}</div>`;
    }
  }

  async function renderKas(wrap) {
    const rows = await API.get('bukuKas', { tgl_awal: tglAwal, tgl_akhir: tglAkhir });
    const masuk = rows.filter(r => ['penjualan', 'modal'].includes(r.jenis_transaksi)).reduce((s, r) => s + Number(r.nominal_harga), 0);
    const keluar = rows.filter(r => ['pembelian barang', 'biaya-biaya'].includes(r.jenis_transaksi)).reduce((s, r) => s + Number(r.nominal_harga), 0);
    wrap.innerHTML = `
      <div class="page-head" style="margin:16px 0;">
        <div class="card pad" style="flex:1;"><div class="page-sub">Kas Masuk</div><div style="font-family:var(--font-mono); font-weight:800; font-size:19px; color:var(--success);">${UI.rupiah(masuk)}</div></div>
      </div>
      <div class="toolbar" style="margin-bottom:14px;">
        <button class="btn btn-primary btn-sm" id="btnTambahKas">+ Catat Transaksi Kas</button>
        <button class="btn btn-ghost btn-sm" id="btnExportKas">Ekspor CSV</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Tanggal</th><th>Jenis</th><th>Nama/Kategori</th><th>Nominal</th><th>Keterangan</th></tr></thead>
          <tbody>
            ${rows.length ? rows.slice().reverse().map(r => `
              <tr>
                <td>${r.tanggal}</td>
                <td>${badgeJenis(r.jenis_transaksi)}</td>
                <td>${UI.escapeHtml(r.nama_produk || r.kategori_produk || '-')}</td>
                <td style="font-family:var(--font-mono);">${UI.rupiah(r.nominal_harga)}</td>
                <td>${UI.escapeHtml(r.keterangan || '')}</td>
              </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state"><div class="emoji">📒</div>Tidak ada transaksi kas pada rentang ini.</div></td></tr>`}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('btnTambahKas').onclick = openTambahKasModal;
    document.getElementById('btnExportKas').onclick = () => {
      UI.downloadCsv(`buku-kas_${tglAwal}_${tglAkhir}.csv`,
        [['Tanggal', 'Jenis', 'Kategori', 'Nama', 'Jumlah Item', 'Nominal', 'Keterangan']]
          .concat(rows.map(r => [r.tanggal, r.jenis_transaksi, r.kategori_produk, r.nama_produk, r.jumlah_item, r.nominal_harga, r.keterangan])));
    };
  }

  function badgeJenis(j) {
    const map = { penjualan: 'badge-green', modal: 'badge-amber', 'pembelian barang': 'badge-red', 'biaya-biaya': 'badge-red' };
    return `<span class="badge ${map[j] || 'badge-gray'}">${j}</span>`;
  }

  function openTambahKasModal() {
    UI.openModal(`
      <h3>Catat Transaksi Kas</h3>
      <label class="field"><span>Jenis</span>
        <select id="fJenis">
          <option value="modal">Modal masuk</option>
          <option value="pembelian barang">Pembelian barang</option>
          <option value="biaya-biaya">Biaya-biaya</option>
        </select>
      </label>
      <label class="field"><span>Nama / kategori</span><input type="text" id="fNama" placeholder="mis. Sewa toko, beli botol, dll"></label>
      <label class="field"><span>Nominal</span><input type="number" id="fNominal" min="0" step="500"></label>
      <label class="field"><span>Tanggal</span><input type="date" id="fTanggal" value="${UI.todayStr()}"></label>
      <label class="field"><span>Keterangan</span><input type="text" id="fKet" placeholder="opsional"></label>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mCancel">Batal</button>
        <button class="btn btn-primary" id="mSave">Simpan</button>
      </div>
    `);
    document.getElementById('mCancel').onclick = UI.closeModal;
    document.getElementById('mSave').onclick = async () => {
      const jenis_transaksi = document.getElementById('fJenis').value;
      const nama_produk = document.getElementById('fNama').value.trim();
      const nominal_harga = Number(document.getElementById('fNominal').value || 0);
      const tanggal = document.getElementById('fTanggal').value || UI.todayStr();
      const keterangan = document.getElementById('fKet').value.trim();
      if (!nominal_harga) return UI.toast('Isi nominal.', 'error');
      try {
        await API.post('tambahKas', { jenis_transaksi, nama_produk, nominal_harga, tanggal, keterangan });
        UI.closeModal();
        renderBody();
        UI.toast('Transaksi kas tercatat.', 'success');
      } catch (e) { UI.toast('Gagal: ' + e.message, 'error'); }
    };
  }

  async function renderLaporan(wrap) {
    const rows = await API.get('laporanPenjualan', { tgl_awal: tglAwal, tgl_akhir: tglAkhir });
    const omset = rows.reduce((s, r) => s + Number(r.omset), 0);
    const untung = rows.reduce((s, r) => s + Number(r.untung), 0);
    wrap.innerHTML = `
      <div class="rk-row" style="margin:16px 0;">
        <div class="card pad"><div class="page-sub">Total Omset</div><div style="font-family:var(--font-mono); font-weight:800; font-size:19px;">${UI.rupiah(omset)}</div></div>
        <div class="card pad"><div class="page-sub">Estimasi Untung</div><div style="font-family:var(--font-mono); font-weight:800; font-size:19px; color:var(--success);">${UI.rupiah(untung)}</div></div>
      </div>
      <div class="toolbar" style="margin-bottom:14px;">
        <button class="btn btn-ghost btn-sm" id="btnExportLap">Ekspor CSV</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#Nota</th><th>Waktu</th><th>Kasir</th><th>Metode</th><th>Omset</th><th>Untung</th></tr></thead>
          <tbody>
            ${rows.length ? rows.slice().reverse().map(r => `
              <tr>
                <td>#${r.id}</td><td>${r.waktu}</td><td>${UI.escapeHtml(r.kasir_pemberi)}</td>
                <td><span class="badge badge-gray">${r.metode_bayar}</span></td>
                <td style="font-family:var(--font-mono);">${UI.rupiah(r.omset)}</td>
                <td style="font-family:var(--font-mono); color:var(--success);">${UI.rupiah(r.untung)}</td>
              </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="emoji">📊</div>Tidak ada transaksi pada rentang ini.</div></td></tr>`}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('btnExportLap').onclick = () => {
      UI.downloadCsv(`laporan-penjualan_${tglAwal}_${tglAkhir}.csv`,
        [['Nota', 'Waktu', 'Kasir', 'Metode', 'Omset', 'Untung']]
          .concat(rows.map(r => [r.id, r.waktu, r.kasir_pemberi, r.metode_bayar, r.omset, r.untung])));
    };
  }

  return { render };
})();
