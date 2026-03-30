const Etablissements = {
  etablissements: [],
  searchTimeout: null,

  async render() {
    const [etabs, config] = await Promise.all([
      API.etablissements.list(),
      API.config.get()
    ]);
    this.etablissements = etabs;

    const page = document.getElementById('page-parametres');
    page.innerHTML = `
      <div style="margin-bottom:32px">
        <div class="section-header">
          <h2 class="section-title">Adresse du domicile</h2>
        </div>
        <div class="stat-card" style="max-width:600px;cursor:pointer" id="editDomicile">
          <div style="display:flex;align-items:center;gap:12px">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" style="width:24px;height:24px;flex-shrink:0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <div>
              <div class="label">DOMICILE</div>
              <div style="font-size:15px;font-weight:600">${config.domicile || 'Non defini - cliquez pour configurer'}</div>
            </div>
          </div>
        </div>
      </div>

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
            ${e.adresse ? `<div style="font-size:11px;color:var(--txt3);margin-bottom:6px">${e.adresse}</div>` : ''}
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
    document.getElementById('editDomicile').onclick = () => this.openDomicileModal(config);
    document.querySelectorAll('.etab-card').forEach(card => {
      card.onclick = () => {
        const etab = etabs.find(e => e.id === card.dataset.id);
        if (etab) this.openEtabModal(etab);
      };
    });

    this.renderVehicule(config);
  },

  renderVehicule(config) {
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

  openDomicileModal(config) {
    const body = `
      <div class="form-group">
        <label class="form-label">Adresse du domicile</label>
        <input type="text" class="form-input" id="dAdresse" value="${config.domicile || ''}" placeholder="Ex: 12 rue de la Paix, 17100 Saintes">
        <div id="dSuggestions" class="search-suggestions"></div>
      </div>
      <input type="hidden" id="dLat" value="${config.domicileLat || ''}">
      <input type="hidden" id="dLon" value="${config.domicileLon || ''}">
      <div id="dCoords" style="font-size:12px;color:var(--txt3);margin-top:8px">
        ${config.domicileLat ? 'Coordonnees : ' + config.domicileLat + ', ' + config.domicileLon : ''}
      </div>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
      <button class="btn btn-primary" id="dSave">Sauvegarder</button>
    `;
    App.openModal('Adresse du domicile', body, footer);

    this.setupAddressSearch('dAdresse', 'dSuggestions', (place) => {
      document.getElementById('dAdresse').value = place.display_name;
      document.getElementById('dLat').value = place.lat;
      document.getElementById('dLon').value = place.lon;
      document.getElementById('dCoords').textContent = 'Coordonnees : ' + place.lat + ', ' + place.lon;
      document.getElementById('dSuggestions').innerHTML = '';
    });

    document.getElementById('dSave').onclick = async () => {
      const adresse = document.getElementById('dAdresse').value.trim();
      const lat = document.getElementById('dLat').value;
      const lon = document.getElementById('dLon').value;
      await API.config.update({
        ...config,
        domicile: adresse,
        domicileLat: lat ? parseFloat(lat) : null,
        domicileLon: lon ? parseFloat(lon) : null
      });
      App.closeModal();
      App.toast('Adresse domicile mise a jour');
      this.render();
    };
  },

  openEtabModal(etab = null) {
    const isEdit = !!etab;
    const body = `
      <div class="form-group">
        <label class="form-label">Nom de l'etablissement</label>
        <input type="text" class="form-input" id="eNom" value="${etab ? etab.nom : ''}" placeholder="Ex: Residence Harmonie Breuillet">
      </div>
      <div class="form-group">
        <label class="form-label">Adresse</label>
        <input type="text" class="form-input" id="eAdresse" value="${etab ? etab.adresse || '' : ''}" placeholder="Rechercher une adresse...">
        <div id="eSuggestions" class="search-suggestions"></div>
      </div>
      <input type="hidden" id="eLat" value="${etab ? etab.lat || '' : ''}">
      <input type="hidden" id="eLon" value="${etab ? etab.lon || '' : ''}">
      <div class="form-group">
        <label class="form-label">Distance KM (aller-retour)</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="number" step="0.1" class="form-input" id="eKm" value="${etab ? etab.km : ''}" placeholder="Auto" style="flex:1">
          <button class="btn btn-sm btn-secondary" id="eCalcKm" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Calculer
          </button>
        </div>
        <div id="eKmInfo" style="font-size:11px;color:var(--txt3);margin-top:4px"></div>
      </div>
    `;
    const footer = `
      ${isEdit ? '<button class="btn btn-danger" id="eDelete">Supprimer</button>' : ''}
      <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
      <button class="btn btn-primary" id="eSave">${isEdit ? 'Modifier' : 'Ajouter'}</button>
    `;
    App.openModal(isEdit ? 'Modifier l\'etablissement' : 'Nouvel etablissement', body, footer);

    this.setupAddressSearch('eAdresse', 'eSuggestions', (place) => {
      document.getElementById('eAdresse').value = place.display_name;
      document.getElementById('eLat').value = place.lat;
      document.getElementById('eLon').value = place.lon;
      document.getElementById('eSuggestions').innerHTML = '';
      // Auto-calculate KM
      this.calculateKm();
    });

    document.getElementById('eCalcKm').onclick = () => this.calculateKm();

    document.getElementById('eSave').onclick = async () => {
      const nom = document.getElementById('eNom').value.trim();
      if (!nom) return App.toast('Entrer un nom', 'error');
      const km = parseFloat(document.getElementById('eKm').value) || 0;
      const adresse = document.getElementById('eAdresse').value.trim();
      const lat = document.getElementById('eLat').value;
      const lon = document.getElementById('eLon').value;
      const data = { nom, km, adresse, lat: lat ? parseFloat(lat) : null, lon: lon ? parseFloat(lon) : null };
      if (isEdit) await API.etablissements.update(etab.id, data);
      else await API.etablissements.create(data);
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
  },

  setupAddressSearch(inputId, suggestionsId, onSelect) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(suggestionsId);

    input.addEventListener('input', () => {
      clearTimeout(this.searchTimeout);
      const q = input.value.trim();
      if (q.length < 3) { container.innerHTML = ''; return; }

      this.searchTimeout = setTimeout(async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=fr&limit=5`, {
            headers: { 'Accept-Language': 'fr' }
          });
          const results = await res.json();
          container.innerHTML = results.map(r => `
            <div class="suggestion-item" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${r.display_name.replace(/"/g, '&quot;')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0;color:var(--txt3)"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${r.display_name}</span>
            </div>
          `).join('');

          container.querySelectorAll('.suggestion-item').forEach(item => {
            item.onclick = () => {
              onSelect({ display_name: item.dataset.name, lat: item.dataset.lat, lon: item.dataset.lon });
            };
          });
        } catch (e) {
          container.innerHTML = '<div style="padding:8px;font-size:12px;color:var(--red)">Erreur de recherche</div>';
        }
      }, 400);
    });
  },

  async calculateKm() {
    const lat = document.getElementById('eLat').value;
    const lon = document.getElementById('eLon').value;
    const info = document.getElementById('eKmInfo');

    if (!lat || !lon) {
      info.textContent = 'Selectionnez une adresse d\'abord';
      return;
    }

    const config = await API.config.get();
    if (!config.domicileLat || !config.domicileLon) {
      info.textContent = 'Configurez l\'adresse du domicile dans les parametres d\'abord';
      return;
    }

    info.innerHTML = '<span style="color:var(--accent2)">Calcul en cours...</span>';

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${config.domicileLon},${config.domicileLat};${lon},${lat}?overview=false`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const distKm = data.routes[0].distance / 1000;
        const allerRetour = +(distKm * 2).toFixed(1);
        document.getElementById('eKm').value = allerRetour;
        const duree = Math.round(data.routes[0].duration / 60);
        info.innerHTML = `<span style="color:var(--green)">Aller simple : ${distKm.toFixed(1)} km (${duree} min) &bull; A/R : ${allerRetour} km</span>`;
      } else {
        info.textContent = 'Impossible de calculer l\'itineraire';
      }
    } catch (e) {
      info.textContent = 'Erreur de calcul : ' + e.message;
    }
  }
};
