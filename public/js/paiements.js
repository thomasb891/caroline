const Paiements = {
  paiements: [],
  etablissements: [],
  currentYear: new Date().getFullYear(),

  async render() {
    const annee = this.currentYear.toString();
    const [paiements, etabs] = await Promise.all([
      API.paiements.listAnnee(annee),
      API.etablissements.list()
    ]);
    this.paiements = paiements;
    this.etablissements = etabs;

    const display = document.getElementById('monthDisplayP');
    if (display) display.textContent = annee;

    const totalAnnee = paiements.reduce((s, p) => s + (p.montant || 0), 0);
    const enAttente = paiements.filter(p => !p.fichePaye).length;
    const nbFiches = paiements.filter(p => p.fichePaye).length;

    const moisNoms = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

    // Build month rows with expandable detail
    let total = 0;
    const rows = moisNoms.map((nom, i) => {
      const key = `${annee}-${String(i + 1).padStart(2, '0')}`;
      const moisP = paiements.filter(p => p.dateVersement && p.dateVersement.startsWith(key));
      const montant = moisP.reduce((s, p) => s + (p.montant || 0), 0);
      total += montant;

      let detailRows = '';
      if (moisP.length > 0) {
        detailRows = moisP.map(p => `<tr class="detail-row" data-month="${key}" style="display:none">
          <td style="padding-left:36px;font-size:12px;color:var(--txt2)">${p.dateVersement ? p.dateVersement.split('-').reverse().join('/') : '-'}</td>
          <td style="font-size:12px">${p.etablissement}</td>
          <td class="num" style="font-size:12px">${(p.montant || 0).toFixed(2)} &euro;</td>
          <td>${p.fichePaye ? '<span class="badge badge-green">Oui</span>' : '<span class="badge badge-orange">Non</span>'}</td>
          <td>${p.finContrat ? '<span class="badge badge-blue">Oui</span>' : '-'}</td>
          <td style="display:flex;align-items:center;gap:6px">
            ${p.note ? '<span title="' + p.note.replace(/"/g, '&quot;') + '" style="font-size:10px;color:var(--txt3);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + p.note + '</span>' : ''}
            <button class="btn-ghost btn-sm" data-edit="${p.id}">Modifier</button>
          </td>
        </tr>`).join('');
      }

      return `<tr class="month-row" data-toggle="${key}" style="cursor:pointer">
        <td style="font-weight:600">${moisP.length > 0 ? '<span class="toggle-icon" style="display:inline-block;width:16px;transition:transform 0.2s">&#9654;</span> ' : '<span style="display:inline-block;width:16px"></span> '}${nom}</td>
        <td class="num">${moisP.length}</td>
        <td class="num" style="font-weight:600">${montant > 0 ? montant.toFixed(2) + ' &euro;' : '-'}</td>
        <td class="num">${moisP.filter(p => p.fichePaye).length} / ${moisP.length}</td>
        <td>${moisP.some(p => p.finContrat) ? '<span class="badge badge-blue">Oui</span>' : ''}</td>
        <td></td>
      </tr>${detailRows}`;
    }).join('');

    const page = document.getElementById('page-paiements');
    page.innerHTML = `
      <div id="paiementsLastUpdated" style="text-align:right;font-size:11px;color:var(--txt3);margin-bottom:4px"></div>
      <div class="cards-row">
        <div class="stat-card green">
          <div class="label">Total ${annee}</div>
          <div class="value">${totalAnnee.toFixed(2)} &euro;</div>
          <div class="sub">${paiements.length} virements</div>
        </div>
        <div class="stat-card blue">
          <div class="label">Fiches de paie</div>
          <div class="value">${nbFiches} / ${paiements.length}</div>
          <div class="sub">recues</div>
        </div>
        <div class="stat-card orange">
          <div class="label">En attente</div>
          <div class="value">${enAttente}</div>
          <div class="sub">fiches de paie</div>
        </div>
      </div>

      <div class="section-header">
        <h2 class="section-title">Virements ${annee}</h2>
        <button class="btn btn-sm btn-primary" id="addPaiement">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter
        </button>
      </div>

      <div class="table-wrap"><table>
        <thead><tr><th>Mois</th><th>Virements</th><th>Montant</th><th>Fiches</th><th>Fin contrat</th><th></th></tr></thead>
        <tbody>${rows}
        <tr style="font-weight:700;border-top:2px solid var(--border)">
          <td>Total ${annee}</td><td class="num">${paiements.length}</td><td class="num">${total.toFixed(2)} &euro;</td><td class="num">${nbFiches} / ${paiements.length}</td><td></td><td></td>
        </tr></tbody>
      </table></div>

      <div style="text-align:center;padding:20px;font-size:11px;color:var(--txt3)">&copy; Thomas</div>
    `;

    // Expand/collapse months
    page.querySelectorAll('.month-row').forEach(row => {
      row.onclick = () => {
        const key = row.dataset.toggle;
        const details = page.querySelectorAll(`.detail-row[data-month="${key}"]`);
        const icon = row.querySelector('.toggle-icon');
        const visible = details.length > 0 && details[0].style.display !== 'none';
        details.forEach(d => d.style.display = visible ? 'none' : 'table-row');
        if (icon) icon.style.transform = visible ? '' : 'rotate(90deg)';
      };
    });

    // Edit buttons
    page.querySelectorAll('[data-edit]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const p = paiements.find(x => x.id === btn.dataset.edit);
        if (p) this.openPaiementModal(p);
      };
    });

    document.getElementById('addPaiement').onclick = () => this.openPaiementModal();
    this.loadLastUpdated();
  },

  async loadLastUpdated() {
    try {
      const log = await API.logs.lastForSection('paiements');
      const el = document.getElementById('paiementsLastUpdated');
      if (el && log) {
        const d = new Date(log.timestamp);
        el.textContent = `Derniere maj: ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      }
    } catch(e) {}
  },

  openPaiementModal(paiement = null) {
    const isEdit = !!paiement;
    const etabOptions = this.etablissements.map(e =>
      `<option value="${e.nom}" ${paiement && paiement.etablissement === e.nom ? 'selected' : ''}>${e.nom}</option>`
    ).join('');

    const body = `
      <div class="form-group">
        <label class="form-label">Etablissement</label>
        <select class="form-select" id="pEtab">
          <option value="">Choisir...</option>
          ${etabOptions}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Date versement</label>
          <input type="date" class="form-input" id="pDate" value="${paiement ? paiement.dateVersement || '' : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Montant (&euro;)</label>
          <input type="number" step="0.01" class="form-input" id="pMontant" value="${paiement ? paiement.montant || '' : ''}" placeholder="0.00">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <textarea class="form-input" id="pNote" rows="2" placeholder="Ajouter une note..." style="resize:vertical">${paiement ? paiement.note || '' : ''}</textarea>
      </div>
    `;

    const footer = `
      ${isEdit ? '<button class="btn btn-danger" id="pDelete">Supprimer</button>' : ''}
      <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
      <button class="btn btn-primary" id="pSave">${isEdit ? 'Modifier' : 'Ajouter'}</button>
    `;

    App.openModal(isEdit ? 'Modifier le paiement' : 'Nouveau paiement', body, footer);

    document.getElementById('pSave').onclick = async () => {
      const etab = document.getElementById('pEtab').value;
      if (!etab) return App.toast('Choisir un etablissement', 'error');
      const data = {
        etablissement: etab,
        dateVersement: document.getElementById('pDate').value,
        montant: parseFloat(document.getElementById('pMontant').value) || 0,
        note: document.getElementById('pNote').value.trim()
      };
      if (isEdit) await API.paiements.update(paiement.id, data);
      else await API.paiements.create(data);
      App.closeModal();
      App.toast(isEdit ? 'Paiement modifie' : 'Paiement ajoute');
      this.render();
    };

    if (isEdit) {
      document.getElementById('pDelete').onclick = async () => {
        await API.paiements.remove(paiement.id);
        App.closeModal();
        App.toast('Paiement supprime');
        this.render();
      };
    }
  }
};
