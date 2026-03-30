const Logs = {
  async render() {
    const logs = await API.logs.list(100);
    const page = document.getElementById('page-logs');

    const actionLabels = {
      'POST': 'Ajout',
      'PUT': 'Modification',
      'DELETE': 'Suppression'
    };

    const sectionLabels = {
      'missions': 'Planning',
      'paiements': 'Paiements',
      'documents': 'Documents',
      'etablissements': 'Etablissements',
      'vacances': 'Vacances',
      'config': 'Configuration',
      'comparaison': 'Comparaison'
    };

    const rows = logs.map(log => {
      const d = new Date(log.timestamp);
      const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;

      const method = (log.action || '').split(' ')[0];
      const actionLabel = actionLabels[method] || method;
      const section = log.details && log.details.section ? (sectionLabels[log.details.section] || log.details.section) : '-';

      let badgeClass = 'badge-blue';
      if (method === 'POST') badgeClass = 'badge-green';
      else if (method === 'DELETE') badgeClass = 'badge-red';
      else if (method === 'PUT') badgeClass = 'badge-orange';

      // Build details summary
      let details = '';
      if (log.details && log.details.body) {
        const b = log.details.body;
        if (b.etablissement) details += b.etablissement;
        if (b.date) details += (details ? ' - ' : '') + b.date;
        if (b.mois) details += (details ? ' - ' : '') + b.mois;
        if (b.montant) details += (details ? ' - ' : '') + b.montant + ' \u20ac';
      }

      return `<tr>
        <td style="white-space:nowrap;font-size:12px;color:var(--txt2)">${dateStr}<br><span style="color:var(--txt3)">${timeStr}</span></td>
        <td><span class="badge ${badgeClass}">${actionLabel}</span></td>
        <td style="font-weight:500">${section}</td>
        <td style="font-size:12px;color:var(--txt2);max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${details || '-'}</td>
        <td style="font-size:11px;color:var(--txt3);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(log.action || '').replace(/"/g, '&quot;')}">${log.action || ''}</td>
      </tr>`;
    }).join('');

    page.innerHTML = `
      <div class="section-header" style="margin-bottom:16px">
        <h2 class="section-title">Journal d'activite</h2>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:12px;color:var(--txt3)">${logs.length} evenements</span>
          <button class="btn btn-sm btn-danger" id="logPurge">Purger</button>
        </div>
      </div>

      ${logs.length === 0 ? '<div class="empty-state" style="padding:60px 20px"><p>Aucune activite enregistree</p></div>' : `
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Date</th>
          <th>Action</th>
          <th>Section</th>
          <th>Details</th>
          <th>Route</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`}
    `;

    document.getElementById('logPurge').onclick = () => {
      const body = `
        <p style="margin-bottom:16px;color:var(--txt2)">Cette action va supprimer tout le journal d'activite.</p>
        <div class="form-group">
          <label class="form-label">Mot de passe</label>
          <input type="password" class="form-input" id="purgePass" placeholder="Entrer le mot de passe">
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
        <button class="btn btn-danger" id="purgeConfirm">Purger</button>
      `;
      App.openModal('Purger le journal', body, footer);
      document.getElementById('purgeConfirm').onclick = async () => {
        const pass = document.getElementById('purgePass').value;
        const res = await API.post('/api/logs/purge', { password: pass });
        if (res.ok) {
          App.closeModal();
          App.toast('Journal purge');
          this.render();
        } else {
          App.toast(res.error || 'Mot de passe incorrect', 'error');
        }
      };
    };
  }
};
