/* =====================================================================
   UI HELPERS — toast, modal, formatter
   ===================================================================== */
const UI = (() => {

  function toast(message, type) {
    const host = document.getElementById('toastHost');
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
    setTimeout(() => el.remove(), 3000);
  }

  function openModal(html) {
    document.getElementById('modalBox').innerHTML = html;
    document.getElementById('modalHost').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modalHost').classList.add('hidden');
    document.getElementById('modalBox').innerHTML = '';
  }

  function rupiah(n) {
    n = Number(n) || 0;
    return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  }

  function ml(n) {
    n = Number(n) || 0;
    return (Math.round(n * 100) / 100).toLocaleString('id-ID') + ' ml';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function todayStr() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map(r => r.map(cell => {
      const s = String(cell == null ? '' : cell);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById('modalBackdrop').addEventListener('click', closeModal);

  return { toast, openModal, closeModal, rupiah, ml, escapeHtml, todayStr, downloadCsv };
})();
