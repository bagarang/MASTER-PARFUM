/* =====================================================================
   KASIR — kasir POS: katalog produk jadi + racikan oplosan + keranjang
   ===================================================================== */
const Kasir = (() => {
  let cart = [];          // {uid, jenis, id_produk, nama, harga, qty, meta}
  let activeTab = 'semua';
  let rkBibitCount = 1;   // jumlah dropdown bibit yang ditampilkan (1-5)

  function uid() { return 'c' + Math.random().toString(36).slice(2, 9); }

  function kategoriProdukJadi() {
    // kategori yang dijual langsung di katalog (bukan bahan racikan)
    return ['botol', 'bukhur', 'pelengkap'];
  }

  function render() {
    const el = document.getElementById('content');
    el.innerHTML = `
      <div class="kasir-grid">
        <div>
          <div class="kasir-tabs" id="kasirTabs"></div>
          <div class="produk-grid" id="produkGrid"></div>

          <div class="racikan-box card pad">
            <h3>🧪 Racikan Parfum Oplosan</h3>
            <div class="rk-row">
              <div class="rk-field">
                <label>Kualitas</label>
                <select id="rkKualitas">
                  <option value="Standard">Standard</option>
                  <option value="Super">Super</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              <div class="rk-field">
                <label>Ukuran botol</label>
                <select id="rkUkuran"></select>
              </div>
            </div>
            <div class="rk-row">
              <div class="rk-field" style="grid-column:1/-1;">
                <label>Bibit (1&ndash;5 jenis, dicampur rata)</label>
                <div class="rk-bibit-list" id="rkBibitList"></div>
                <button type="button" class="btn btn-ghost btn-sm" id="rkAddBibit">+ Tambah pilihan bibit</button>
              </div>
            </div>
            <div class="rk-row">
              <div class="rk-field">
                <label>Base campuran</label>
                <select id="rkBase"></select>
              </div>
              <div class="rk-field">
                <label>Harga jual</label>
                <input type="number" id="rkHarga" placeholder="mis. 35000" min="0" step="500">
              </div>
            </div>
            <div class="rk-preview" id="rkPreview"></div>
            <button class="btn btn-primary" style="margin-top:14px;" id="rkAddCart">+ Masukkan ke Keranjang</button>
          </div>
        </div>

        <div class="cart-panel card">
          <div class="cart-head">
            <h3>🧾 Keranjang</h3>
            <span class="badge badge-amber" id="cartCount">0 item</span>
          </div>
          <div class="cart-items" id="cartItems"></div>
          <div class="cart-summary">
            <div class="cs-row"><span>Subtotal</span><span id="cartSubtotal">Rp 0</span></div>
            <div class="cs-row total"><span>Total</span><span id="cartTotal">Rp 0</span></div>
          </div>
          <div class="cart-pay">
            <button class="btn btn-primary btn-block" id="btnCheckout">Bayar &amp; Simpan Nota</button>
          </div>
        </div>
      </div>
    `;

    renderTabs();
    renderProdukGrid();
    renderUkuranOptions();
    resetBibitRows();
    renderBaseOptions();
    renderCart();
    updateRacikanPreview();
    bindEvents();
  }

  function renderTabs() {
    const tabs = [{ k: 'semua', label: 'Semua' }, { k: 'botol', label: 'Botol' }, { k: 'bukhur', label: 'Bukhur' }, { k: 'pelengkap', label: 'Pelengkap' }];
    document.getElementById('kasirTabs').innerHTML = tabs.map(t =>
      `<button class="kasir-tab ${activeTab === t.k ? 'active' : ''}" data-tab="${t.k}">${t.label}</button>`
    ).join('');
  }

  function renderProdukGrid() {
    const list = Store.produk.filter(p => {
      if (!kategoriProdukJadi().includes(p.kategori)) return false;
      if (activeTab !== 'semua' && p.kategori !== activeTab) return false;
      return true;
    });
    const grid = document.getElementById('produkGrid');
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="emoji">🫙</div>Belum ada produk jadi di kategori ini.</div>`;
      return;
    }
    grid.innerHTML = list.map(p => {
      const habis = Number(p.sisa) <= 0;
      return `
      <button class="produk-card ${habis ? 'disabled' : ''}" data-id="${p.id}" ${habis ? 'disabled' : ''}>
        <div class="pc-name">${UI.escapeHtml(p.nama)}</div>
        <div class="pc-price">${UI.rupiah(p.jual)}</div>
        <div class="pc-stock">${habis ? 'Stok habis' : 'Sisa ' + UI.ml(p.sisa)}</div>
      </button>`;
    }).join('');
  }

  function renderUkuranOptions() {
    const ukuranSet = [...new Set(Store.matriks.map(m => Number(m.ukuran)))].sort((a, b) => a - b);
    document.getElementById('rkUkuran').innerHTML = ukuranSet.map(u => `<option value="${u}">${u} ml</option>`).join('');
  }

  function bibitOptionsHtml(selected) {
    const bibitList = Store.produk.filter(p => p.kategori === 'bibit' && Number(p.sisa) > 0);
    return `<option value="">&ndash; kosong &ndash;</option>` + bibitList.map(p =>
      `<option value="${p.id}" ${String(p.id) === String(selected) ? 'selected' : ''}>${UI.escapeHtml(p.nama)} (${UI.ml(p.sisa)})</option>`
    ).join('');
  }

  function resetBibitRows() {
    rkBibitCount = 1;
    renderBibitRows();
  }

  function renderBibitRows() {
    const wrap = document.getElementById('rkBibitList');
    let html = '';
    for (let i = 0; i < rkBibitCount; i++) {
      html += `<select class="rk-bibit-select" data-idx="${i}">${bibitOptionsHtml('')}</select>`;
    }
    wrap.innerHTML = html;
    wrap.querySelectorAll('select').forEach(s => s.addEventListener('change', updateRacikanPreview));
  }

  function renderBaseOptions() {
    const baseList = Store.produk.filter(p => p.kategori === 'base' && Number(p.sisa) > 0);
    document.getElementById('rkBase').innerHTML = baseList.map(p =>
      `<option value="${p.id}">${UI.escapeHtml(p.nama)} (${UI.ml(p.sisa)})</option>`
    ).join('');
  }

  function getMatriksFor(ukuran, kualitas) {
    return Store.matriks.find(m => Number(m.ukuran) === Number(ukuran) && m.kualitas === kualitas);
  }

  function updateRacikanPreview() {
    const ukuran = Number(document.getElementById('rkUkuran').value || 0);
    const kualitas = document.getElementById('rkKualitas').value;
    const m = getMatriksFor(ukuran, kualitas);
    const prev = document.getElementById('rkPreview');
    if (!m) {
      prev.innerHTML = `<span>Kombinasi ukuran/kualitas ini belum ada di Matriks Oplosan.</span>`;
      return;
    }
    const bibitIds = getSelectedBibitIds();
    const pembagi = Math.max(bibitIds.length, 1);
    const bibitPerJenis = m.takaran_bibit / pembagi;
    prev.innerHTML = `
      <span>🔹 Total bibit: <b>${UI.ml(m.takaran_bibit)}</b> ${bibitIds.length > 1 ? `(&asymp; ${UI.ml(bibitPerJenis)} / jenis)` : ''}</span>
      <span>🔹 Total base: <b>${UI.ml(m.takaran_base)}</b></span>
    `;
  }

  function getSelectedBibitIds() {
    return [...document.querySelectorAll('.rk-bibit-select')].map(s => s.value).filter(v => v);
  }

  function addRacikanToCart() {
    const ukuran = Number(document.getElementById('rkUkuran').value || 0);
    const kualitas = document.getElementById('rkKualitas').value;
    const idBase = document.getElementById('rkBase').value;
    const harga = Number(document.getElementById('rkHarga').value || 0);
    const bibitIds = getSelectedBibitIds();

    if (!bibitIds.length) return UI.toast('Pilih minimal 1 bibit.', 'error');
    if (!idBase) return UI.toast('Pilih base campuran (stok base mungkin kosong).', 'error');
    if (!harga || harga <= 0) return UI.toast('Isi harga jual racikan.', 'error');
    const m = getMatriksFor(ukuran, kualitas);
    if (!m) return UI.toast('Kombinasi ukuran & kualitas ini belum ada di Matriks Oplosan.', 'error');

    const namaBibit = bibitIds.map(id => (Store.produk.find(p => String(p.id) === String(id)) || {}).nama).filter(Boolean);
    const baseObj = Store.produk.find(p => String(p.id) === String(idBase));

    cart.push({
      uid: uid(),
      jenis: 'racikan',
      nama: `Oplos ${kualitas} (${namaBibit.join('+')}) ${ukuran}ml`,
      harga, qty: 1,
      meta: { ukuran, kualitas, id_base: idBase, id_bibit_array: bibitIds, base_nama: baseObj ? baseObj.nama : '' }
    });
    renderCart();
    UI.toast('Racikan ditambahkan ke keranjang.', 'success');
  }

  function addProdukToCart(id) {
    const p = Store.produk.find(x => String(x.id) === String(id));
    if (!p) return;
    if (Number(p.sisa) <= 0) return UI.toast('Stok barang ini habis di gudang.', 'error');
    const existing = cart.find(c => c.jenis === 'produk' && String(c.id_produk) === String(id));
    if (existing) existing.qty += 1;
    else cart.push({ uid: uid(), jenis: 'produk', id_produk: p.id, nama: p.nama, harga: Number(p.jual), qty: 1 });
    renderCart();
  }

  function changeQty(cuid, delta) {
    const item = cart.find(c => c.uid === cuid);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    renderCart();
  }

  function removeItem(cuid) {
    cart = cart.filter(c => c.uid !== cuid);
    renderCart();
  }

  function renderCart() {
    const wrap = document.getElementById('cartItems');
    document.getElementById('cartCount').textContent = cart.length + ' item';
    if (!cart.length) {
      wrap.innerHTML = `<div class="empty-state"><div class="emoji">🛒</div>Keranjang masih kosong.</div>`;
    } else {
      wrap.innerHTML = cart.map(c => `
        <div class="cart-item">
          <div style="flex:1;">
            <div class="ci-name">${UI.escapeHtml(c.nama)}</div>
            <div class="ci-sub">${UI.rupiah(c.harga)} / item</div>
            <div class="ci-qty">
              <button data-qty-minus="${c.uid}">&minus;</button>
              <span>${c.qty}</span>
              <button data-qty-plus="${c.uid}">+</button>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="ci-price">${UI.rupiah(c.harga * c.qty)}</div>
            <button class="ci-remove" data-remove="${c.uid}">Hapus</button>
          </div>
        </div>
      `).join('');
    }
    const total = cart.reduce((s, c) => s + c.harga * c.qty, 0);
    document.getElementById('cartSubtotal').textContent = UI.rupiah(total);
    document.getElementById('cartTotal').textContent = UI.rupiah(total);
  }

  function openCheckoutModal() {
    if (!cart.length) return UI.toast('Keranjang masih kosong.', 'error');
    const total = cart.reduce((s, c) => s + c.harga * c.qty, 0);
    UI.openModal(`
      <h3>Bayar Transaksi</h3>
      <div class="field"><span>Total tagihan</span><input type="text" value="${UI.rupiah(total)}" disabled></div>
      <label class="field"><span>Metode bayar</span>
        <select id="payMetode">
          <option>Tunai / Cash</option>
          <option>QRIS</option>
          <option>Transfer Bank</option>
          <option>Debit / Kredit</option>
        </select>
      </label>
      <label class="field"><span>Uang dibayar</span>
        <input type="number" id="payUang" min="0" step="500" value="${total}">
      </label>
      <label class="field"><span>Tanggal transaksi</span>
        <input type="date" id="payTanggal" value="${UI.todayStr()}">
      </label>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="payCancel">Batal</button>
        <button class="btn btn-primary" id="payConfirm">Simpan Nota</button>
      </div>
    `);
    document.getElementById('payCancel').onclick = UI.closeModal;
    document.getElementById('payConfirm').onclick = doCheckout;
  }

  async function doCheckout() {
    const metode_bayar = document.getElementById('payMetode').value;
    const uang_dibayar = Number(document.getElementById('payUang').value || 0);
    const tanggal = document.getElementById('payTanggal').value || UI.todayStr();
    const btn = document.getElementById('payConfirm');
    btn.disabled = true; btn.textContent = 'Menyimpan…';
    try {
      const payload = {
        tanggal, metode_bayar, uang_dibayar,
        kasir: (Auth.getUser() || {}).nama || (Auth.getUser() || {}).username || 'Kasir',
        items: cart.map(c => ({
          jenis: c.jenis, id_produk: c.id_produk || '', nama: c.nama, harga: c.harga, qty: c.qty,
          ukuran: c.meta ? c.meta.ukuran : '', kualitas: c.meta ? c.meta.kualitas : '',
          id_base: c.meta ? c.meta.id_base : '', id_bibit_array: c.meta ? c.meta.id_bibit_array : []
        }))
      };
      const data = await API.post('checkout', payload);
      UI.closeModal();
      cart = [];
      await Store.reload();
      renderProdukGrid(); renderBaseOptions(); resetBibitRows(); updateRacikanPreview(); renderCart();
      UI.toast(`Transaksi #${data.id_nota} tersimpan. Kembalian ${UI.rupiah(data.uang_kembali)}.`, 'success');
    } catch (e) {
      UI.toast('Gagal menyimpan transaksi: ' + e.message, 'error');
      btn.disabled = false; btn.textContent = 'Simpan Nota';
    }
  }

  function bindEvents() {
    document.getElementById('kasirTabs').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      activeTab = b.dataset.tab;
      renderTabs(); renderProdukGrid();
    });
    document.getElementById('produkGrid').addEventListener('click', e => {
      const b = e.target.closest('[data-id]');
      if (!b || b.disabled) return;
      addProdukToCart(b.dataset.id);
    });
    document.getElementById('rkAddBibit').addEventListener('click', () => {
      if (rkBibitCount >= 5) return UI.toast('Maksimal 5 jenis bibit.', 'error');
      rkBibitCount++; renderBibitRows(); updateRacikanPreview();
    });
    document.getElementById('rkUkuran').addEventListener('change', updateRacikanPreview);
    document.getElementById('rkKualitas').addEventListener('change', updateRacikanPreview);
    document.getElementById('rkAddCart').addEventListener('click', addRacikanToCart);
    document.getElementById('cartItems').addEventListener('click', e => {
      if (e.target.dataset.qtyPlus) changeQty(e.target.dataset.qtyPlus, 1);
      if (e.target.dataset.qtyMinus) changeQty(e.target.dataset.qtyMinus, -1);
      if (e.target.dataset.remove) removeItem(e.target.dataset.remove);
    });
    document.getElementById('btnCheckout').addEventListener('click', openCheckoutModal);
  }

  return { render };
})();
