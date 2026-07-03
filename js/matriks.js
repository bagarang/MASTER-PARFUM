/* =====================================================================
   MATRIKS OPLOSAN — tabel takaran bibit:base per ukuran & kualitas
   ===================================================================== */
const Matriks = (() => {

  function render() {
    const owner = Auth.isOwner();
    const el = document.getElementById('content');
    el.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Matriks Oplosan</h2>
          <div class="page-sub">Takaran bibit &amp; base (ml) untuk tiap kombinasi ukuran botol dan kualitas racikan.</div>
        </div>
        <div class="toolbar">
          ${owner ? `<button class="btn btn-primary btn-sm" id="btnTambahMatriks">+ Kombinasi Baru</button>` : ''}
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ukuran</th><th>Kualitas</th><th>Takaran Bibit</th><th>Takaran Base</th><th>Total</th>${owner ? '<th></th>' : ''}</tr></thead>
          <tbody id="matriksBody"></tbody>
        </table>
      </div>
      ${owner ? '' : `<div class="page-sub" style="margin-top:12px;">Hanya akun Owner yang dapat mengubah matriks ini.</div>`}
    `;
    if (owner) document.getElementById('btnTambahMatriks').addEventListener('click', () => openModal(null));
    renderBody();
  }

  function renderBody() {
    const owner = Auth.isOwner();
    const rows = Store.matriks.slice().sort((a, b) => a.ukuran - b.ukuran || a.kualitas.localeCompare(b.kualitas));
    const body = document.getElementById('matriksBody');
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="${owner ? 6 : 5}"><div class="empty-state"><div class="emoji">🧮</div>Belum ada data matriks.</div></td></tr>`;
      return;
    }
    body.innerHTML = rows.map(m => `
      <tr>
        <td><b>${m.ukuran} ml</b></td>
        <td><span class="badge badge-amber">${m.kualitas}</span></td>
        <td>${UI.ml(m.takaran_bibit)}</td>
        <td>${UI.ml(m.takaran_base)}</td>
        <td>${UI.ml(Number(m.takaran_bibit) + Number(m.takaran_base))}</td>
        ${owner ? `<td><button class="btn btn-ghost btn-sm" data-edit="${m.id_matriks}">Edit</button></td>` : ''}
      </tr>
    `).join('');
    if (owner) body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openModal(b.dataset.edit));
  }

  function openModal(id) {
    const editing = !!id;
    const m = editing ? Store.matriks.find(x => String(x.id_matriks) === String(id)) : null;
    UI.openModal(`
      <h3>${editing ? 'Edit Kombinasi' : 'Kombinasi Baru'}</h3>
      <div class="rk-row">
        <label class="field"><span>Ukuran (ml)</span><input type="number" id="fUkuran" min="1" value="${m ? m.ukuran : ''}"></label>
        <label class="field"><span>Kualitas</span>
          <select id="fKualitas">
            <option ${m && m.kualitas === 'Standard' ? 'selected' : ''}>Standard</option>
            <option ${m && m.kualitas === 'Super' ? 'selected' : ''}>Super</option>
            <option ${m && m.kualitas === 'Premium' ? 'selected' : ''}>Premium</option>
          </select>
        </label>
      </div>
      <div class="rk-row">
        <label class="field"><span>Takaran bibit (ml)</span><input type="number" id="fBibit" min="0" step="0.1" value="${m ? m.takaran_bibit : ''}"></label>
        <label class="field"><span>Takaran base (ml)</span><input type="number" id="fBase" min="0" step="0.1" value="${m ? m.takaran_base : ''}"></label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mCancel">Batal</button>
        <button class="btn btn-primary" id="mSave">Simpan</button>
      </div>
    `);
    document.getElementById('mCancel').onclick = UI.closeModal;
    document.getElementById('mSave').onclick = async () => {
      const ukuran = Number(document.getElementById('fUkuran').value || 0);
      const kualitas = document.getElementById('fKualitas').value;
      const takaran_bibit = Number(document.getElementById('fBibit').value || 0);
      const takaran_base = Number(document.getElementById('fBase').value || 0);
      if (!ukuran || (!takaran_bibit && !takaran_base)) return UI.toast('Lengkapi ukuran dan takaran.', 'error');
      try {
        const actor_username = (Auth.getUser() || {}).username || '';
        if (editing) await API.post('updateMatriks', { id_matriks: id, ukuran, kualitas, takaran_bibit, takaran_base, actor_username });
        else await API.post('tambahMatriks', { ukuran, kualitas, takaran_bibit, takaran_base, actor_username });
        UI.closeModal();
        await Store.reload();
        renderBody();
        UI.toast('Matriks tersimpan.', 'success');
      } catch (e) { UI.toast('Gagal: ' + e.message, 'error'); }
    };
  }

  return { render };
})();
