const Etablissements = {
  etablissements: [],

  async render() {
    const etabs = await API.etablissements.list();
    this.etablissements = etabs;

    const page = document.getElementById('page-parametres');
    page.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Etablissements (${etabs.length})</h2>
        <button class="btn btn-sm btn-primary" id="addEtab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter
        </button>
      </div>

      <div class="etab-grid" id="etabGrid">
        ${etabs.length === 0 ? '<div class="empty-state"><p>Aucun etablissement. Ajoutez-en un !</p></div>' : ''}
        ${etabs.map(e => `
          <div class="etab-card" data-id="${e.id}">
            <div class="etab-name">${e.nom}</div>
            <span class="etab-km">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${e.km} km A/R
            </span>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:40px">
        <div class="section-header">
          <h2 class="section-title">Vehicule</h2>
        </div>
        <div id="vehiculeSection"></div>
      </div>
    `;

    document.getElementById('addEtab').onclick = () => this.openEtabModal();
    document.querySelectorAll('.etab-card').forEach(card => {
      card.onclick = () => {
        const etab = etabs.find(e => e.id === card.dataset.id);
        if (etab) this.openEtabModal(etab);
      };
    });

    this.renderVehicule();
  },

  async renderVehicule() {
    const config = await API.config.get();
    document.getElementById('vehiculeSection').innerHTML = `
      <div class="stat-card" style="max-width:400px;cursor:pointer" id="editVehicule">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div>
            <div class="label">Puissance fiscale</div>
            <div class="value" style="font-size:22px">${config.puissanceFiscale || 4} CV</div>
          </div>
          <div style="text-align:right">
            <div class="label">Bareme KM</div>
            <div class="value" style="font-size:22px;color:var(--accent2)">${config.baremeKm || 0.523} &euro;/km</div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('editVehicule').onclick = () => Impots.openBaremeModal(config);
  },

  openEtabModal(etab = null) {
    const isEdit = !!etab;
    const body = `
      <div class="form-group">
        <label class="form-label">Nom de l'etablissement</label>
        <input type="text" class="form-input" id="eNom" value="${etab ? etab.nom : ''}" placeholder="Ex: Residence Harmonie Breuillet">
      </div>
      <div class="form-group">
        <label class="form-label">Distance KM (aller-retour)</label>
        <input type="number" step="0.1" class="form-input" id="eKm" value="${etab ? etab.km : ''}" placeholder="Ex: 75.8">
      </div>
    `;
    const footer = `
      ${isEdit ? '<button class="btn btn-danger" id="eDelete">Supprimer</button>' : ''}
      <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
      <button class="btn btn-primary" id="eSave">${isEdit ? 'Modifier' : 'Ajouter'}</button>
    `;
    App.openModal(isEdit ? 'Modifier l\'etablissement' : 'Nouvel etablissement', body, footer);

    document.getElementById('eSave').onclick = async () => {
      const nom = document.getElementById('eNom').value.trim();
      if (!nom) return App.toast('Entrer un nom', 'error');
      const km = parseFloat(document.getElementById('eKm').value) || 0;
      if (isEdit) await API.etablissements.update(etab.id, { nom, km });
      else await API.etablissements.create({ nom, km });
      App.closeModal();
      App.toast(isEdit ? 'Etablissement modifie' : 'Etablissement ajoute');
      this.render();
    };

    if (isEdit) {
      document.getElementById('eDelete').onclick = async () => {
        await API.etablissements.remove(etab.id);
        App.closeModal();
        App.toast('Etablissement supprime');
        this.render();
      };
    }
  }
};
