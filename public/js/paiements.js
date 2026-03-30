const Paiements = {
  paiements: [],
  etablissements: [],
  viewMode: 'mois',

  async render() {
    const moisKey = App.getMoisKey();
    const annee = App.currentDate.getFullYear().toString();
    const [paiements, paiementsAnnee, etabs] = await Promise.all([
      API.paiements.list(moisKey),
      API.paiements.listAnnee(annee),
      API.etablissements.list()
    ]);
    this.paiements = paiements;
    this.etablissements = etabs;

    const display = document.getElementById('monthDisplayP');
    if (display) display.textContent = App.getMoisLabel();

    const totalMois = paiements.reduce((s, p) => s + (p.montant || 0), 0);
    const totalAnnee = paiementsAnnee.reduce((s, p) => s + (p.montant || 0), 0);
    const enAttente = paiements.filter(p => !p.fichePaye).length;

    const page = document.getElementById('page-paiements');
    page.innerHTML = `
      <div class="cards-row">
        <div class="stat-card green">
          <div class="label">Total du mois</div>
          <div class="value">${totalMois.toFixed(2)} &euro;</div>
        </div>
        <div class="stat-card blue">
          <div class="label">Total annuel</div>
          <div class="value">${totalAnnee.toFixed(2)} &euro;</div>
        </div>
        <div class="stat-card orange">
          <div class="label">En attente</div>
          <div class="value">${enAttente}</div>
          <div class="sub">fiches de paie</div>
        </div>
      </div>

      <div class="section-header">
        <div style="display:flex;gap:8px;align-items:center">
          <h2 class="section-title">Virements du mois</h2>
          <button class="btn btn-sm btn-secondary" id="toggleViewPaie">${this.viewMode === 'mois' ? 'Voir annuel' : 'Voir mensuel'}</button>
        </div>
        <button class="btn btn-sm btn-primary" id="addPaiement">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter
        </button>
      </div>

      <div id="paiementContent"></div>
    `;

    document.getElementById('addPaiement').onclick = () => this.openPaiementModal();
    document.getElementById('toggleViewPaie').onclick = () => {
      this.viewMode = this.viewMode === 'mois' ? 'annuel' : 'mois';
      this.render();
    };

    if (this.viewMode === 'mois') this.renderMois(paiements);
    else this.renderAnnuel(paiementsAnnee, annee);
  },

  renderMois(paiements) {
    const container = document.getElementById('paiementContent');
    if (!paiements.length) {
      container.innerHTML = `<div class="empty-state"><p>Aucun paiement ce mois</p></div>`;
      return;
    }
    container.innerHTML = `<div class="table-wrap"><table>
      <thead><tr>
        <th>Date</th><th>Etablissement</th><th>Montant</th>
        <th>Fiche Paie</th><th>Fin Contrat</th><th>Statut</th><th></th>
      </tr></thead>
      <tbody>${paiements.map(p => `<tr>
        <td>${p.dateVersement || '-'}</td>
        <td>${p.etablissement || '-'}</td>
        <td class="num">${(p.montant || 0).toFixed(2)} &euro;</td>
        <td>${p.fichePaye ? '<span class="badge badge-green">Oui</span>' : '<span class="badge badge-orange">Non</span>'}</td>
        <td>${p.finContrat ? '<span class="badge badge-blue">Oui</span>' : '-'}</td>
        <td>${p.fichePaye ? '<span class="badge badge-green">Recu</span>' : '<span class="badge badge-orange">Attente</span>'}</td>
        <td><button class="btn-ghost btn-sm" data-edit="${p.id}">Modifier</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.onclick = () => {
        const p = paiements.find(x => x.id === btn.dataset.edit);
        if (p) this.openPaiementModal(p);
      };
    });
  },

  renderAnnuel(paiements, annee) {
    const container = document.getElementById('paiementContent');
    const moisNoms = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
    let total = 0;
    const rows = moisNoms.map((nom, i) => {
      const key = `${annee}-${String(i + 1).padStart(2, '0')}`;
      const moisP = paiements.filter(p => p.dateVersement && p.dateVersement.startsWith(key));
      const montant = moisP.reduce((s, p) => s + (p.montant || 0), 0);
      total += montant;
      return `<tr>
        <td>${nom}</td>
        <td class="num">${moisP.length}</td>
        <td class="num">${montant.toFixed(2)} &euro;</td>
        <td class="num">${moisP.filter(p => p.fichePaye).length} / ${moisP.length}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Mois</th><th>Virements</th><th>Montant</th><th>Fiches recues</th></tr></thead>
      <tbody>${rows}
      <tr style="font-weight:700;border-top:2px solid var(--border)">
        <td>Total ${annee}</td><td></td><td class="num">${total.toFixed(2)} &euro;</td><td></td>
      </tr></tbody>
    </table></div>`;
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
      <div class="form-row">
        <div class="form-group">
          <label class="form-check">
            <input type="checkbox" id="pFiche" ${paiement && paiement.fichePaye ? 'checked' : ''}>
            Fiche de paie recue
          </label>
        </div>
        <div class="form-group">
          <label class="form-check">
            <input type="checkbox" id="pFinContrat" ${paiement && paiement.finContrat ? 'checked' : ''}>
            Fin de contrat
          </label>
        </div>
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
        fichePaye: document.getElementById('pFiche').checked,
        finContrat: document.getElementById('pFinContrat').checked
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
