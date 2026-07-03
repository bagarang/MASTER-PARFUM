/**
 * =====================================================================
 * MASTER PARFUM POS — BACKEND (Google Apps Script)
 * =====================================================================
 * Cara pakai singkat (detail lengkap ada di PANDUAN_SETUP.md):
 *  1. Buat Google Spreadsheet baru.
 *  2. Extensions > Apps Script, hapus isi default, tempel SELURUH isi
 *     file ini.
 *  3. Jalankan fungsi setupSheets() sekali (menu Run > setupSheets)
 *     untuk membuat semua sheet + header + data awal + akun owner.
 *  4. Deploy > New deployment > Web app.
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  5. Salin URL /exec yang muncul, tempel ke js/config.js (APPS_SCRIPT_URL).
 * =====================================================================
 */

const SHEETS = {
  USERS: 'Users',
  KATEGORI: 'Kategori',
  PRODUK: 'Produk',
  MATRIKS: 'MatriksOplosan',
  TRANSAKSI: 'Transaksi',
  DETAIL: 'DetailTransaksi',
  KARTU_STOK: 'KartuStok',
  BUKU_KAS: 'BukuKas'
};

const HEADERS = {
  Users: ['id_user', 'username', 'password_hash', 'salt', 'role', 'nama'],
  Kategori: ['id', 'nama_kategori'],
  Produk: ['id', 'nama', 'kategori', 'modal', 'jual', 'sisa'],
  MatriksOplosan: ['id_matriks', 'ukuran', 'kualitas', 'takaran_bibit', 'takaran_base'],
  Transaksi: ['id', 'waktu', 'omset', 'untung', 'metode_bayar', 'uang_bayar', 'uang_kembali', 'kasir_pemberi'],
  DetailTransaksi: ['id_detail', 'id_nota', 'id_produk', 'nama_item_terjual', 'jumlah_item_terjual', 'nominal_penjualan', 'tanggal_transaksi'],
  KartuStok: ['id_log', 'id_produk', 'tanggal', 'jenis_transaksi', 'stok_masuk', 'stok_keluar', 'saldo', 'keterangan'],
  BukuKas: ['id_kas', 'tanggal', 'jenis_transaksi', 'kategori_produk', 'nama_produk', 'jumlah_item', 'nominal_harga', 'keterangan']
};

const UNTUNG_MARGIN = 0.40; // estimasi margin keuntungan 40% dari omset, sama seperti versi PHP

// ===================================================================
// ENTRY POINTS
// ===================================================================
function doGet(e) {
  return handle(e, 'GET');
}
function doPost(e) {
  return handle(e, 'POST');
}

function handle(e, method) {
  let action = '', params = {};
  try {
    if (method === 'GET') {
      params = e.parameter || {};
      action = params.action || '';
    } else {
      const body = JSON.parse(e.postData.contents || '{}');
      action = body.action || '';
      params = body;
    }
    const data = route(action, params);
    return jsonOut({ ok: true, data: data });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err.message || err) });
  }
}

function route(action, p) {
  switch (action) {
    case 'login': return actionLogin(p);
    case 'init': return actionInit();
    case 'checkout': return actionCheckout(p);
    case 'tambahProduk': return actionTambahProduk(p);
    case 'editProduk': return actionEditProduk(p);
    case 'adjustStok': return actionAdjustStok(p);
    case 'kartuStok': return actionKartuStok(p);
    case 'tambahMatriks': return actionTambahMatriks(p);
    case 'updateMatriks': return actionUpdateMatriks(p);
    case 'bukuKas': return actionBukuKas(p);
    case 'tambahKas': return actionTambahKas(p);
    case 'laporanPenjualan': return actionLaporanPenjualan(p);
    case 'users': return actionListUsers();
    case 'tambahUser': return actionTambahUser(p);
    case 'resetPassword': return actionResetPassword(p);
    default: throw new Error('Aksi tidak dikenal: ' + action);
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ===================================================================
// SHEET HELPERS
// ===================================================================
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet(name) {
  const sh = ss().getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" belum ada. Jalankan setupSheets() dulu.');
  return sh;
}

function sheetToObjects(name) {
  const sh = sheet(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const out = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i].every(c => c === '' || c === null)) continue;
    const obj = {};
    headers.forEach((h, idx) => obj[h] = values[i][idx]);
    out.push(obj);
  }
  return out;
}

function appendRow(name, obj) {
  const sh = sheet(name);
  const headers = HEADERS[name];
  const row = headers.map(h => (obj[h] === undefined ? '' : obj[h]));
  sh.appendRow(row);
  return obj;
}

function nextId(name, idField) {
  const rows = sheetToObjects(name);
  if (!rows.length) return 1;
  const max = rows.reduce((m, r) => Math.max(m, Number(r[idField]) || 0), 0);
  return max + 1;
}

function findRowIndexById(name, idField, idValue) {
  const sh = sheet(name);
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const col = headers.indexOf(idField);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][col]) === String(idValue)) return { rowNum: i + 1, headers, values: values[i] };
  }
  return null;
}

function updateCellsById(name, idField, idValue, patch) {
  const sh = sheet(name);
  const found = findRowIndexById(name, idField, idValue);
  if (!found) throw new Error('Data dengan ' + idField + '=' + idValue + ' tidak ditemukan di ' + name);
  Object.keys(patch).forEach(key => {
    const col = found.headers.indexOf(key);
    if (col === -1) return;
    sh.getRange(found.rowNum, col + 1).setValue(patch[key]);
  });
}

function todayIso() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd');
}
function nowIso() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
}

// ===================================================================
// AUTH
// ===================================================================
function hashPassword(password, salt) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + '::' + salt);
  return raw.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}
function makeSalt() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function actionLogin(p) {
  const username = String(p.username || '').trim();
  const password = String(p.password || '');
  if (!username || !password) throw new Error('Username dan password wajib diisi.');
  const users = sheetToObjects(SHEETS.USERS);
  const u = users.find(x => String(x.username).toLowerCase() === username.toLowerCase());
  if (!u) throw new Error('Username tidak ditemukan.');
  const hash = hashPassword(password, u.salt);
  if (hash !== u.password_hash) throw new Error('Password salah.');
  return { user: { id_user: u.id_user, username: u.username, role: u.role, nama: u.nama } };
}

function actionListUsers() {
  return sheetToObjects(SHEETS.USERS).map(u => ({ id_user: u.id_user, username: u.username, role: u.role, nama: u.nama }));
}

function actionTambahUser(p) {
  const username = String(p.username || '').trim();
  if (!username || !p.password) throw new Error('Username & password wajib diisi.');
  const users = sheetToObjects(SHEETS.USERS);
  if (users.some(u => String(u.username).toLowerCase() === username.toLowerCase())) throw new Error('Username sudah dipakai.');
  const salt = makeSalt();
  appendRow(SHEETS.USERS, {
    id_user: nextId(SHEETS.USERS, 'id_user'),
    username: username,
    password_hash: hashPassword(String(p.password), salt),
    salt: salt,
    role: p.role === 'Owner' ? 'Owner' : 'Kasir',
    nama: p.nama || username
  });
  return { ok: true };
}

function actionResetPassword(p) {
  const salt = makeSalt();
  updateCellsById(SHEETS.USERS, 'id_user', p.id_user, {
    password_hash: hashPassword(String(p.password), salt),
    salt: salt
  });
  return { ok: true };
}

// ===================================================================
// INIT (produk + kategori + matriks dalam satu panggilan)
// ===================================================================
function actionInit() {
  return {
    produk: sheetToObjects(SHEETS.PRODUK),
    kategori: sheetToObjects(SHEETS.KATEGORI),
    matriks: sheetToObjects(SHEETS.MATRIKS)
  };
}

// ===================================================================
// PRODUK & STOK
// ===================================================================
function actionTambahProduk(p) {
  const id = nextId(SHEETS.PRODUK, 'id');
  appendRow(SHEETS.PRODUK, {
    id: id, nama: p.nama, kategori: p.kategori,
    modal: Number(p.modal || 0), jual: Number(p.jual || 0), sisa: Number(p.sisa || 0)
  });
  if (Number(p.sisa) > 0) {
    logKartuStok(id, todayIso(), 'Stok Awal', Number(p.sisa), 0, Number(p.sisa), 'Produk baru dibuat');
  }
  return { id: id };
}

function actionEditProduk(p) {
  updateCellsById(SHEETS.PRODUK, 'id', p.id, {
    nama: p.nama, kategori: p.kategori, modal: Number(p.modal || 0), jual: Number(p.jual || 0)
  });
  return { ok: true };
}

function actionAdjustStok(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const idProduk = p.id_produk;
    const jumlah = Number(p.jumlah || 0);
    if (jumlah <= 0) throw new Error('Jumlah harus lebih dari 0.');
    const found = findRowIndexById(SHEETS.PRODUK, 'id', idProduk);
    if (!found) throw new Error('Produk tidak ditemukan.');
    const sisaCol = found.headers.indexOf('sisa');
    const sisaBaru = Number(found.values[sisaCol] || 0) + jumlah;
    updateCellsById(SHEETS.PRODUK, 'id', idProduk, { sisa: sisaBaru });
    logKartuStok(idProduk, nowIso(), 'Pembelian', jumlah, 0, sisaBaru, p.keterangan || 'Stok masuk');
    return { sisa: sisaBaru };
  } finally {
    lock.releaseLock();
  }
}

function logKartuStok(idProduk, tanggal, jenis, masuk, keluar, saldo, keterangan) {
  appendRow(SHEETS.KARTU_STOK, {
    id_log: nextId(SHEETS.KARTU_STOK, 'id_log'),
    id_produk: idProduk, tanggal: tanggal, jenis_transaksi: jenis,
    stok_masuk: masuk, stok_keluar: keluar, saldo: saldo, keterangan: keterangan
  });
}

function actionKartuStok(p) {
  const rows = sheetToObjects(SHEETS.KARTU_STOK);
  return rows.filter(r => String(r.id_produk) === String(p.id_produk));
}

// ===================================================================
// MATRIKS OPLOSAN
// ===================================================================
function actionTambahMatriks(p) {
  const id = nextId(SHEETS.MATRIKS, 'id_matriks');
  appendRow(SHEETS.MATRIKS, {
    id_matriks: id, ukuran: Number(p.ukuran), kualitas: p.kualitas,
    takaran_bibit: Number(p.takaran_bibit), takaran_base: Number(p.takaran_base)
  });
  return { id_matriks: id };
}

function actionUpdateMatriks(p) {
  updateCellsById(SHEETS.MATRIKS, 'id_matriks', p.id_matriks, {
    ukuran: Number(p.ukuran), kualitas: p.kualitas,
    takaran_bibit: Number(p.takaran_bibit), takaran_base: Number(p.takaran_base)
  });
  return { ok: true };
}

// ===================================================================
// CHECKOUT — inti transaksi kasir
// ===================================================================
function actionCheckout(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const items = p.items || [];
    if (!items.length) throw new Error('Keranjang kosong.');

    const tanggal = p.tanggal || todayIso();
    const waktu = tanggal + ' ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'HH:mm:ss');
    let total = 0;
    items.forEach(it => total += Number(it.harga) * Number(it.qty));
    if (total <= 0) throw new Error('Total transaksi tidak valid.');

    const uangDibayar = Number(p.uang_dibayar || 0);
    let uangKembali = uangDibayar - total;
    if (uangKembali < 0) uangKembali = 0;
    const untung = Math.round(total * UNTUNG_MARGIN);

    const idNota = nextId(SHEETS.TRANSAKSI, 'id');
    appendRow(SHEETS.TRANSAKSI, {
      id: idNota, waktu: waktu, omset: total, untung: untung,
      metode_bayar: p.metode_bayar || 'Tunai / Cash',
      uang_bayar: uangDibayar, uang_kembali: uangKembali,
      kasir_pemberi: p.kasir || 'Kasir'
    });

    items.forEach(it => {
      const qty = Number(it.qty);
      const subtotal = Number(it.harga) * qty;

      if (it.jenis === 'racikan') {
        const matriksRows = sheetToObjects(SHEETS.MATRIKS);
        const m = matriksRows.find(x => Number(x.ukuran) === Number(it.ukuran) && x.kualitas === it.kualitas);
        if (!m) throw new Error('Kombinasi ukuran/kualitas racikan tidak ada di Matriks Oplosan.');

        const bibitIds = (it.id_bibit_array || []).filter(Boolean);
        if (!bibitIds.length) throw new Error('Racikan tanpa bibit tidak valid.');
        const totalBibitMl = Number(m.takaran_bibit) * qty;
        const totalBaseMl = Number(m.takaran_base) * qty;
        const mlPerBibit = totalBibitMl / bibitIds.length;
        const subtotalPerBibit = subtotal / bibitIds.length;

        bibitIds.forEach(idBibit => {
          kurangiStokDanCatat(idBibit, mlPerBibit, idNota, it.nama, subtotalPerBibit, tanggal, waktu);
        });
        if (it.id_base) {
          kurangiStokDanCatat(it.id_base, totalBaseMl, idNota, it.nama + ' (Base)', 0, tanggal, waktu);
        }
      } else {
        if (it.id_produk) {
          kurangiStokDanCatat(it.id_produk, qty, idNota, it.nama, subtotal, tanggal, waktu);
        }
      }
    });

    appendRow(SHEETS.BUKU_KAS, {
      id_kas: nextId(SHEETS.BUKU_KAS, 'id_kas'),
      tanggal: tanggal, jenis_transaksi: 'penjualan',
      kategori_produk: '', nama_produk: 'Penjualan Kasir', jumlah_item: items.length,
      nominal_harga: total, keterangan: 'Pendapatan Transaksi Kasir #NOTA-' + idNota
    });

    return { id_nota: idNota, total: total, uang_kembali: uangKembali };
  } finally {
    lock.releaseLock();
  }
}

function kurangiStokDanCatat(idProduk, jumlah, idNota, namaItem, nominal, tanggal, waktu) {
  const found = findRowIndexById(SHEETS.PRODUK, 'id', idProduk);
  if (!found) throw new Error('Produk id ' + idProduk + ' tidak ditemukan.');
  const sisaCol = found.headers.indexOf('sisa');
  const sisaBaru = Number(found.values[sisaCol] || 0) - jumlah;
  updateCellsById(SHEETS.PRODUK, 'id', idProduk, { sisa: sisaBaru });

  appendRow(SHEETS.DETAIL, {
    id_detail: nextId(SHEETS.DETAIL, 'id_detail'),
    id_nota: idNota, id_produk: idProduk, nama_item_terjual: namaItem,
    jumlah_item_terjual: jumlah, nominal_penjualan: nominal, tanggal_transaksi: tanggal
  });

  logKartuStok(idProduk, waktu, 'Penjualan', 0, jumlah, sisaBaru, 'Nota #NOTA-' + idNota);
}

// ===================================================================
// BUKU KAS & LAPORAN
// ===================================================================
function actionBukuKas(p) {
  const rows = sheetToObjects(SHEETS.BUKU_KAS);
  return filterByDate(rows, 'tanggal', p.tgl_awal, p.tgl_akhir);
}

function actionTambahKas(p) {
  appendRow(SHEETS.BUKU_KAS, {
    id_kas: nextId(SHEETS.BUKU_KAS, 'id_kas'),
    tanggal: p.tanggal || todayIso(), jenis_transaksi: p.jenis_transaksi,
    kategori_produk: p.kategori_produk || '', nama_produk: p.nama_produk || '',
    jumlah_item: p.jumlah_item || '', nominal_harga: Number(p.nominal_harga || 0),
    keterangan: p.keterangan || ''
  });
  return { ok: true };
}

function actionLaporanPenjualan(p) {
  const rows = sheetToObjects(SHEETS.TRANSAKSI);
  return filterByDate(rows, 'waktu', p.tgl_awal, p.tgl_akhir);
}

function filterByDate(rows, field, awal, akhir) {
  if (!awal && !akhir) return rows;
  return rows.filter(r => {
    const d = String(r[field]).slice(0, 10);
    if (awal && d < awal) return false;
    if (akhir && d > akhir) return false;
    return true;
  });
}

// ===================================================================
// SETUP — jalankan sekali secara manual dari editor Apps Script
// ===================================================================
function setupSheets() {
  const spreadsheet = ss();

  Object.keys(HEADERS).forEach(name => {
    let sh = spreadsheet.getSheetByName(name);
    if (!sh) sh = spreadsheet.insertSheet(name);
    sh.clear();
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold').setBackground('#F1E9D8');
  });

  // Hapus sheet default "Sheet1" jika masih ada dan kosong
  const def = spreadsheet.getSheetByName('Sheet1');
  if (def && spreadsheet.getSheets().length > 1) spreadsheet.deleteSheet(def);

  // --- Data awal: kategori ---
  const kategoriSheet = spreadsheet.getSheetByName(SHEETS.KATEGORI);
  [[1, 'bibit'], [2, 'base'], [3, 'botol'], [4, 'bukhur'], [5, 'pelengkap']].forEach(r => kategoriSheet.appendRow(r));

  // --- Data awal: matriks oplosan (identik dengan versi PHP) ---
  const matriksSheet = spreadsheet.getSheetByName(SHEETS.MATRIKS);
  const matriksData = [
    [1, 15, 'Standard', 5, 10], [2, 15, 'Super', 6, 9], [3, 15, 'Premium', 8, 7],
    [4, 20, 'Standard', 6, 14], [5, 20, 'Super', 8, 12], [6, 20, 'Premium', 10, 10],
    [7, 30, 'Standard', 9, 21], [8, 30, 'Super', 12, 18], [9, 30, 'Premium', 15, 15],
    [10, 35, 'Standard', 10, 25], [11, 35, 'Super', 13, 22], [12, 35, 'Premium', 16, 19],
    [13, 50, 'Standard', 15, 35], [14, 50, 'Super', 20, 30], [15, 50, 'Premium', 25, 25],
    [16, 55, 'Standard', 16, 39], [17, 55, 'Super', 21, 34], [18, 55, 'Premium', 26, 29],
    [19, 100, 'Standard', 30, 70], [20, 100, 'Super', 40, 60], [21, 100, 'Premium', 50, 50],
    [22, 10, 'Standard', 3, 7], [23, 10, 'Super', 4, 6], [24, 10, 'Premium', 5, 5]
  ];
  matriksSheet.getRange(2, 1, matriksData.length, 5).setValues(matriksData);

  // --- Akun owner default ---
  const usersSheet = spreadsheet.getSheetByName(SHEETS.USERS);
  const salt = makeSalt();
  usersSheet.appendRow([1, 'admin', hashPassword('admin123', salt), salt, 'Owner', 'Owner Toko']);

  SpreadsheetApp.getUi().alert(
    'Setup selesai!\n\n' +
    'Akun login pertama:\nUsername: admin\nPassword: admin123\n\n' +
    'Segera ganti password ini lewat menu Pengguna setelah login pertama kali.'
  );
}
