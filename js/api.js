/* =====================================================================
   API — jembatan ke Google Apps Script (yang membaca/menulis Spreadsheet)

   Trik penting: request POST dikirim dengan Content-Type "text/plain"
   (bukan application/json). Ini membuat browser menganggapnya "simple
   request" sehingga TIDAK memicu CORS preflight (OPTIONS) — dan Apps
   Script Web App memang tidak bisa merespons preflight dengan baik.
   Apps Script tetap membaca body-nya sebagai JSON biasa di sisi server.
   ===================================================================== */
const API = (() => {

  function baseUrl() {
    const url = APP_CONFIG.APPS_SCRIPT_URL;
    if (!url || url.indexOf('PASTE_URL_WEB_APP') !== -1) {
      throw new Error('URL Apps Script belum diatur. Buka js/config.js dan isi APPS_SCRIPT_URL.');
    }
    return url;
  }

  function setSync(state) {
    const dot = document.getElementById('syncDot');
    const label = document.getElementById('syncLabel');
    if (!dot) return;
    dot.classList.remove('busy', 'err');
    if (state === 'busy') { dot.classList.add('busy'); label.textContent = 'menyinkronkan…'; }
    else if (state === 'err') { dot.classList.add('err'); label.textContent = 'gagal sinkron'; }
    else { label.textContent = 'tersinkron'; }
  }

  async function get(action, params) {
    const qs = new URLSearchParams(Object.assign({ action }, params || {}));
    setSync('busy');
    try {
      const res = await fetch(baseUrl() + '?' + qs.toString(), { method: 'GET' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Terjadi kesalahan di server');
      setSync('ok');
      return json.data;
    } catch (e) {
      setSync('err');
      throw e;
    }
  }

  async function post(action, payload) {
    setSync('busy');
    try {
      const res = await fetch(baseUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action }, payload || {}))
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Terjadi kesalahan di server');
      setSync('ok');
      return json.data;
    } catch (e) {
      setSync('err');
      throw e;
    }
  }

  return { get, post };
})();
