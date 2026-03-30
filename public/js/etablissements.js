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
        ${etabs.map(e => {
          const contratLabels = { interim: 'Interim', cdd: 'CDD', cdi: 'CDI', vacation: 'Vacation', stage: 'Stage' };
          const receptionIcons = { email: 'Email', courrier: 'Courrier', site: 'Site' };
          return `
          <div class="etab-card" data-id="${e.id}">
            <div class="etab-name">${e.nom}</div>
            ${e.adresse ? `<div style="font-size:10px;color:var(--txt3);margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.adresse}</div>` : ''}
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px">
              <span class="etab-km">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ${e.km} km
              </span>
              ${e.typeContrat ? `<span class="etab-km" style="color:var(--accent2)">${contratLabels[e.typeContrat] || e.typeContrat}</span>` : ''}
              ${e.tauxHoraire ? `<span class="etab-km" style="color:var(--green)">${e.tauxHoraire}&euro;/h</span>` : ''}
              ${e.receptionDocs ? `<span class="etab-km" style="color:var(--txt3)">${receptionIcons[e.receptionDocs] || ''}</span>` : ''}
            </div>
            ${e.telephone || e.email ? `<div style="font-size:10px;color:var(--txt3);margin-top:6px">${e.telephone ? e.telephone : ''}${e.telephone && e.email ? ' | ' : ''}${e.email ? e.email : ''}</div>` : ''}
          </div>`;
        }).join('')}
      </div>

      <div style="margin-top:40px">
        <div class="section-header">
          <h2 class="section-title">Vehicule & KM</h2>
        </div>
        <div id="vehiculeSection"></div>
      </div>

      <div style="margin-top:32px">
        <div class="section-header">
          <h2 class="section-title">Sauvegarde</h2>
        </div>
        <div id="backupSection"></div>
      </div>
      <div style="text-align:center;padding:20px;font-size:11px;color:var(--txt3)">&copy; Thomas</div>
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
    this.renderBackup();
  },

  async renderBackup() {
    const status = await API.get('/api/backup/status');
    const backupEl = document.getElementById('backupSection');
    if (!backupEl) return;
    backupEl.innerHTML = `
      <div class="stat-card" style="max-width:500px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div class="label">SAUVEGARDE NAS</div>
            <div style="font-size:14px;font-weight:600;margin-top:4px">${status.nasOk ? (status.lastBackup ? 'Dernier : ' + status.lastBackup : 'Aucun backup') : 'NAS non accessible'}</div>
            <div class="sub">${status.nasOk ? status.nbBackups + ' sauvegardes conservees' : 'Verifier la connexion au NAS'}</div>
          </div>
          <button class="btn btn-sm btn-primary" id="doBackup">${status.nasOk ? 'Sauvegarder' : 'Reessayer'}</button>
        </div>
      </div>
    `;
    document.getElementById('doBackup').onclick = async () => {
      document.getElementById('doBackup').textContent = 'En cours...';
      document.getElementById('doBackup').disabled = true;
      await API.post('/api/backup', {});
      App.toast('Backup effectue');
      this.renderBackup();
    };
  },

  async renderVehicule(config) {
    const vehicules = config.vehicules || [];
    const vCards = vehicules.map(v => `
      <div class="stat-card" style="cursor:pointer;margin-bottom:8px;${v.actif ? 'border-left:3px solid var(--green)' : ''}" data-vid="${v.id}">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div>
            <div style="font-size:14px;font-weight:600">${v.marque} ${v.modele}</div>
            <div style="font-size:12px;color:var(--txt2)">${v.plaque || 'Pas de plaque'} - ${v.carburant || '?'} - ${v.puissanceFiscale || '?'} CV - ${v.consommation || '?'} L/100km</div>
          </div>
          ${v.actif ? '<span class="badge badge-green">Actif</span>' : '<span class="badge badge-blue" style="cursor:pointer">Utiliser</span>'}
        </div>
      </div>
    `).join('');

    let stationsHTML = '';
    try {
      const data = await API.get('/api/prix-gasoil/stations');
      if (data.stations && data.stations.length) {
        const best = data.stations[0];
        stationsHTML = `
          <div style="margin-top:12px;font-size:12px;color:var(--txt2)">
            Gazole : <strong style="color:var(--green)">${best.prix} &euro;/L</strong> (${best.adresse}, ${best.ville})
            - <a href="#stations" style="color:var(--accent)" onclick="App.navigate('stations')">Voir toutes</a>
          </div>
            <div style="font-size:10px;color:var(--txt3);margin-top:4px">MAJ: ${maj} - Source: prix-carburants.gouv.fr</div>
          </div>
        `;
      }
    } catch(e) {}

    document.getElementById('vehiculeSection').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="label">VEHICULES</div>
        <button class="btn btn-sm btn-primary" id="addVehicule">+ Ajouter</button>
      </div>
      ${vCards || '<p style="color:var(--txt3);font-size:13px">Aucun vehicule</p>'}
      <div class="stat-card" style="max-width:400px;cursor:pointer;margin-top:12px" id="editBareme">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div>
            <div class="label">Bareme KM impots</div>
            <div class="value" style="font-size:20px;color:var(--accent2)">${config.baremeKm || 0.523} &euro;/km</div>
          </div>
        </div>
      </div>
      ${stationsHTML}
    `;

    document.getElementById('editBareme').onclick = () => Impots.openBaremeModal(config);
    document.getElementById('addVehicule').onclick = () => this.openVehiculeModal(config, null);
    document.querySelectorAll('[data-vid]').forEach(card => {
      card.onclick = () => {
        const v = vehicules.find(x => x.id === card.dataset.vid);
        if (v) this.openVehiculeModal(config, v);
      };
    });
    const refreshBtn = document.getElementById('refreshPrix');
    if (refreshBtn) {
      refreshBtn.onclick = async (e) => {
        e.stopPropagation();
        refreshBtn.textContent = '...';
        await API.post('/api/prix-gasoil/refresh', {});
        App.toast('Prix mis a jour');
        this.render();
      };
    }
  },

  openVehiculeModal(config, vehicule) {
    const isEdit = !!vehicule;
    const v = vehicule || {};
    const body = `
      <div class="form-group">
        <label class="form-label">Plaque d'immatriculation</label>
        <div style="display:flex;gap:8px">
          <input type="text" class="form-input" id="vPlaque" value="${v.plaque || ''}" placeholder="Ex: AB-123-CD" style="text-transform:uppercase;flex:1">
          <button class="btn btn-sm btn-secondary" id="vSearch">Rechercher</button>
        </div>
        <div id="vSearchResult" style="font-size:11px;color:var(--txt3);margin-top:4px"></div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Marque</label>
          <input type="text" class="form-input" id="vMarque" value="${v.marque || ''}" placeholder="Ex: Renault">
        </div>
        <div class="form-group">
          <label class="form-label">Modele</label>
          <input type="text" class="form-input" id="vModele" value="${v.modele || ''}" placeholder="Ex: Megane Break">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Carburant</label>
          <select class="form-select" id="vCarburant">
            <option value="diesel" ${v.carburant === 'diesel' ? 'selected' : ''}>Diesel</option>
            <option value="essence" ${v.carburant === 'essence' ? 'selected' : ''}>Essence</option>
            <option value="electrique" ${v.carburant === 'electrique' ? 'selected' : ''}>Electrique</option>
            <option value="hybride" ${v.carburant === 'hybride' ? 'selected' : ''}>Hybride</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Puissance fiscale (CV)</label>
          <input type="number" class="form-input" id="vCV" value="${v.puissanceFiscale || ''}" placeholder="Ex: 4">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Consommation (L/100km)</label>
        <input type="number" step="0.1" class="form-input" id="vConso" value="${v.consommation || ''}" placeholder="Ex: 5.5">
      </div>
    `;
    const footer = `
      ${isEdit ? '<button class="btn btn-danger" id="vDelete">Supprimer</button>' : ''}
      ${isEdit && !v.actif ? '<button class="btn btn-secondary" id="vSetActif">Definir comme actif</button>' : ''}
      <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
      <button class="btn btn-primary" id="vSave">${isEdit ? 'Modifier' : 'Ajouter'}</button>
    `;
    App.openModal(isEdit ? 'Modifier le vehicule' : 'Nouveau vehicule', body, footer);

    // Search by plate
    document.getElementById('vSearch').onclick = async () => {
      const plaque = document.getElementById('vPlaque').value.trim();
      if (!plaque) return;
      document.getElementById('vSearchResult').innerHTML = '<span style="color:var(--accent)">Recherche...</span>';
      const r = await API.get('/api/vehicule/plaque/' + encodeURIComponent(plaque));
      if (r.ok) {
        document.getElementById('vMarque').value = r.marque;
        document.getElementById('vModele').value = r.modele;
        if (r.carburant) document.getElementById('vCarburant').value = r.carburant.includes('gas') ? 'diesel' : r.carburant;
        if (r.puissanceFiscale) document.getElementById('vCV').value = r.puissanceFiscale;
        document.getElementById('vSearchResult').innerHTML = '<span style="color:var(--green)">Trouve : ' + r.marque + ' ' + r.modele + '</span>';
      } else {
        document.getElementById('vSearchResult').innerHTML = '<span style="color:var(--orange)">Non trouve. Entrez manuellement.</span>';
      }
    };

    // Save
    document.getElementById('vSave').onclick = async () => {
      const data = {
        id: v.id || Date.now().toString(36),
        plaque: document.getElementById('vPlaque').value.trim().toUpperCase(),
        marque: document.getElementById('vMarque').value.trim(),
        modele: document.getElementById('vModele').value.trim(),
        carburant: document.getElementById('vCarburant').value,
        puissanceFiscale: parseInt(document.getElementById('vCV').value) || 0,
        consommation: parseFloat(document.getElementById('vConso').value) || 0,
        actif: v.actif || false
      };
      if (!data.marque) return App.toast('Entrer la marque', 'error');

      if (!config.vehicules) config.vehicules = [];
      const i = config.vehicules.findIndex(x => x.id === data.id);
      if (i >= 0) config.vehicules[i] = { ...config.vehicules[i], ...data };
      else { data.actif = config.vehicules.length === 0; config.vehicules.push(data); }

      // Update global config
      const actif = config.vehicules.find(x => x.actif);
      if (actif) {
        config.consommation = actif.consommation;
        config.puissanceFiscale = actif.puissanceFiscale;
        config.vehicule = actif.marque + ' ' + actif.modele;
      }
      await API.config.update(config);
      App.closeModal();
      App.toast(isEdit ? 'Vehicule modifie' : 'Vehicule ajoute');
      this.render();
    };

    // Delete
    if (isEdit) {
      const delBtn = document.getElementById('vDelete');
      if (delBtn) delBtn.onclick = async () => {
        config.vehicules = config.vehicules.filter(x => x.id !== v.id);
        await API.config.update(config);
        App.closeModal();
        App.toast('Vehicule supprime');
        this.render();
      };
      const actifBtn = document.getElementById('vSetActif');
      if (actifBtn) actifBtn.onclick = async () => {
        config.vehicules.forEach(x => x.actif = false);
        const vi = config.vehicules.find(x => x.id === v.id);
        if (vi) vi.actif = true;
        config.consommation = vi.consommation;
        config.puissanceFiscale = vi.puissanceFiscale;
        await API.config.update(config);
        App.closeModal();
        App.toast('Vehicule actif mis a jour');
        this.render();
      };
    }
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
        <div id="eNomSuggestions" class="search-suggestions"></div>
      </div>
      <div class="etab-section">
      <div class="form-group">
        <label class="form-label">Adresse</label>
        <input type="text" class="form-input" id="eAdresse" value="${etab ? etab.adresse || '' : ''}" placeholder="Completee automatiquement...">
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

      </div><!-- end etab-section adresse/km -->
      <div class="etab-section">
      <div style="border-top:1px solid var(--border);margin:16px 0;padding-top:16px">
        <div style="font-size:12px;font-weight:600;color:var(--txt2);margin-bottom:12px">CONTACT</div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Telephone</label>
          <input type="tel" class="form-input" id="eTel" value="${etab ? etab.telephone || '' : ''}" placeholder="Ex: 05 46 XX XX XX">
        </div>
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input type="email" class="form-input" id="eEmail" value="${etab ? etab.email || '' : ''}" placeholder="Ex: contact@residence.fr">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Reception des documents</label>
        <select class="form-select" id="eReceptionDocs">
          <option value="" ${!etab || !etab.receptionDocs ? 'selected' : ''}>Non renseigne</option>
          <option value="email" ${etab && etab.receptionDocs === 'email' ? 'selected' : ''}>Par e-mail</option>
          <option value="courrier" ${etab && etab.receptionDocs === 'courrier' ? 'selected' : ''}>Par courrier</option>
          <option value="site" ${etab && etab.receptionDocs === 'site' ? 'selected' : ''}>Via un site internet</option>
        </select>
      </div>
      <div class="form-group" id="eSiteGroup" style="display:${etab && etab.receptionDocs === 'site' ? 'block' : 'none'}">
        <label class="form-label">Nom / URL du site</label>
        <input type="text" class="form-input" id="eSiteUrl" value="${etab ? etab.siteUrl || '' : ''}" placeholder="Ex: https://mon-espace.fr">
      </div>

      </div><!-- end etab-section contact -->
      <div class="etab-section">
      <div style="border-top:1px solid var(--border);margin:16px 0;padding-top:16px">
        <div style="font-size:12px;font-weight:600;color:var(--txt2);margin-bottom:12px">CONTRAT & REMUNERATION</div>
      </div>
      <div class="form-group">
        <label class="form-label">Type de contrat</label>
        <select class="form-select" id="eContrat">
          <option value="" ${!etab || !etab.typeContrat ? 'selected' : ''}>Non renseigne</option>
          <option value="interim" ${etab && etab.typeContrat === 'interim' ? 'selected' : ''}>Interim / Mission Hublo</option>
          <option value="cdd" ${etab && etab.typeContrat === 'cdd' ? 'selected' : ''}>CDD</option>
          <option value="cdi" ${etab && etab.typeContrat === 'cdi' ? 'selected' : ''}>CDI</option>
          <option value="vacation" ${etab && etab.typeContrat === 'vacation' ? 'selected' : ''}>Vacation</option>
          <option value="stage" ${etab && etab.typeContrat === 'stage' ? 'selected' : ''}>Stage</option>
        </select>
      </div>
      <div id="remuEtab">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Taux horaire net (&euro;/h)</label>
            <input type="number" step="0.01" class="form-input" id="eTaux" value="${etab ? etab.tauxHoraire || '' : ''}" placeholder="Ex: 8.60">
          </div>
          <div class="form-group">
            <label class="form-label">Segur net (&euro;/h)</label>
            <input type="number" step="0.01" class="form-input" id="eSegur" value="${etab ? etab.segur || '' : ''}" placeholder="Ex: 0.98">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Prime nuit net (&euro;/h)</label>
            <input type="number" step="0.01" class="form-input" id="ePrimeNuit" value="${etab ? etab.primeNuit || '' : ''}" placeholder="Ex: 0.92">
          </div>
          <div class="form-group">
            <label class="form-label">Prime dimanche net (&euro;/h)</label>
            <input type="number" step="0.01" class="form-input" id="ePrimeDim" value="${etab ? etab.primeDimanche || '' : ''}" placeholder="Ex: 4.21">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Indemnite fin contrat (%)</label>
            <input type="number" step="0.1" class="form-input" id="eIFC" value="${etab ? etab.ifc || '' : ''}" placeholder="10">
          </div>
          <div class="form-group">
            <label class="form-label">Conges payes (%)</label>
            <input type="number" step="0.1" class="form-input" id="eCP" value="${etab ? etab.cp || '' : ''}" placeholder="10">
        </div>
      </div>
      </div>
      <div id="remuPE" style="display:none">
        <div class="form-group">
          <label class="form-label">Allocation journaliere ARE (&euro;/jour)</label>
          <input type="number" step="0.01" class="form-input" id="eARE" value="${etab ? etab.allocationARE || '' : ''}" placeholder="Ex: 48.64">
        </div>
      </div>
      </div><!-- end etab-section remuneration -->
    `;
    const footer = `
      ${isEdit ? '<button class="btn btn-danger" id="eDelete">Supprimer</button>' : ''}
      <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
      <button class="btn btn-primary" id="eSave">${isEdit ? 'Modifier' : 'Ajouter'}</button>
    `;
    App.openModal(isEdit ? 'Modifier l\'etablissement' : 'Nouvel etablissement', body, footer);

    // Toggle fields based on name
    const SIMPLE_NAMES = ['rdv', 'timeo', 'timéo', 'hotel', 'hôtel'];
    const updateFields = () => {
      const nom = (document.getElementById('eNom').value || '').toLowerCase();
      const isPE = nom.includes('emploi') || nom.includes('pole');
      const isSimple = SIMPLE_NAMES.some(s => nom.includes(s));
      const isStage = nom.includes('stage');
      // Hide everything for simple entries
      const hideAll = isSimple;
      document.querySelectorAll('.etab-section').forEach(s => s.style.display = hideAll ? 'none' : 'block');
      if (!hideAll) {
        document.getElementById('remuEtab').style.display = (isPE || isStage) ? 'none' : 'block';
        document.getElementById('remuPE').style.display = isPE ? 'block' : 'none';
      }
    };
    document.getElementById('eNom').addEventListener('input', updateFields);
    updateFields();

    // Auto-search establishment by name (Nominatim for places/buildings)
    this.setupPlaceSearch('eNom', 'eNomSuggestions', (place) => {
      document.getElementById('eAdresse').value = place.display_name;
      document.getElementById('eLat').value = place.lat;
      document.getElementById('eLon').value = place.lon;
      document.getElementById('eNomSuggestions').innerHTML = '';
      this.calculateKm();
    });

    // Also allow manual address search
    this.setupAddressSearch('eAdresse', 'eSuggestions', (place) => {
      document.getElementById('eAdresse').value = place.display_name;
      document.getElementById('eLat').value = place.lat;
      document.getElementById('eLon').value = place.lon;
      document.getElementById('eSuggestions').innerHTML = '';
      this.calculateKm();
    });

    // Show/hide site URL field
    document.getElementById('eReceptionDocs').onchange = () => {
      document.getElementById('eSiteGroup').style.display =
        document.getElementById('eReceptionDocs').value === 'site' ? 'block' : 'none';
    };

    document.getElementById('eCalcKm').onclick = () => this.calculateKm();

    document.getElementById('eSave').onclick = () => {
      const nom = document.getElementById('eNom').value.trim();
      if (!nom) return App.toast('Entrer un nom', 'error');

      // Collect all data
      const data = {
        nom,
        km: parseFloat(document.getElementById('eKm').value) || 0,
        adresse: document.getElementById('eAdresse').value.trim(),
        lat: document.getElementById('eLat').value ? parseFloat(document.getElementById('eLat').value) : null,
        lon: document.getElementById('eLon').value ? parseFloat(document.getElementById('eLon').value) : null,
        telephone: document.getElementById('eTel').value.trim(),
        email: document.getElementById('eEmail').value.trim(),
        receptionDocs: document.getElementById('eReceptionDocs').value,
        siteUrl: document.getElementById('eSiteUrl').value.trim(),
        typeContrat: document.getElementById('eContrat').value,
        tauxHoraire: parseFloat(document.getElementById('eTaux').value) || 0,
        segur: parseFloat(document.getElementById('eSegur').value) || 0,
        primeNuit: parseFloat(document.getElementById('ePrimeNuit').value) || 0,
        primeDimanche: parseFloat(document.getElementById('ePrimeDim').value) || 0,
        allocationARE: parseFloat(document.getElementById('eARE').value) || 0,
        ifc: parseFloat(document.getElementById('eIFC').value) || 0,
        cp: parseFloat(document.getElementById('eCP').value) || 0
      };

      if (isEdit) {
        this.saveEtab(data, etab.id, true);
      } else {
        this.showConfirmModal(data);
      }
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

  showConfirmModal(data) {
    const contratLabels = { interim: 'Interim / Mission Hublo', cdd: 'CDD', cdi: 'CDI', vacation: 'Vacation', stage: 'Stage' };
    const receptionLabels = { email: 'Par e-mail', courrier: 'Par courrier', site: 'Via site internet' };
    const body = `
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:16px;font-size:13px">
        <div style="margin-bottom:12px;font-weight:700;font-size:15px">${data.nom}</div>
        ${data.adresse ? `<div style="color:var(--txt2);margin-bottom:4px">${data.adresse}</div>` : ''}
        ${data.km ? `<div style="margin-bottom:8px"><strong>${data.km} km</strong> aller-retour</div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
          ${data.telephone ? `<div><span style="color:var(--txt3)">Tel :</span> ${data.telephone}</div>` : ''}
          ${data.email ? `<div><span style="color:var(--txt3)">Email :</span> ${data.email}</div>` : ''}
          ${data.typeContrat ? `<div><span style="color:var(--txt3)">Contrat :</span> ${contratLabels[data.typeContrat] || data.typeContrat}</div>` : ''}
          ${data.receptionDocs ? `<div><span style="color:var(--txt3)">Documents via :</span> ${receptionLabels[data.receptionDocs] || data.receptionDocs}${data.siteUrl ? ' (' + data.siteUrl + ')' : ''}</div>` : ''}
          ${data.tauxHoraire ? `<div><span style="color:var(--txt3)">Taux :</span> ${data.tauxHoraire} &euro;/h</div>` : ''}
          ${data.ifc ? `<div><span style="color:var(--txt3)">IFC :</span> ${data.ifc}%</div>` : ''}
          ${data.cp ? `<div><span style="color:var(--txt3)">CP :</span> ${data.cp}%</div>` : ''}
        </div>
      </div>
      <p style="margin-top:14px;font-size:13px;color:var(--txt2);text-align:center">Les informations sont-elles correctes ?</p>
    `;
    const footer = `
      <button class="btn btn-secondary" id="confirmBack">Corriger</button>
      <button class="btn btn-primary" id="confirmOk">Confirmer et ajouter</button>
    `;
    App.openModal('Verifier les informations', body, footer);
    document.getElementById('confirmOk').onclick = () => this.saveEtab(data, null, false);
    document.getElementById('confirmBack').onclick = () => this.openEtabModal(data);
  },

  async saveEtab(data, id, isEdit) {
    if (isEdit && id) await API.etablissements.update(id, data);
    else await API.etablissements.create(data);
    App.closeModal();
    App.toast(isEdit ? 'Etablissement modifie' : 'Etablissement ajoute');
    this.render();
  },

  setupPlaceSearch(inputId, suggestionsId, onSelect) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(suggestionsId);

    const renderResults = (results) => {
      container.innerHTML = results.map(r => `
        <div class="suggestion-item" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${r.label.replace(/"/g, '&quot;')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0;color:var(--txt3)"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${r.label}</span>
        </div>
      `).join('');
      container.querySelectorAll('.suggestion-item').forEach(item => {
        item.onclick = () => onSelect({ display_name: item.dataset.name, lat: item.dataset.lat, lon: item.dataset.lon });
      });
    };

    input.addEventListener('input', () => {
      clearTimeout(this.searchTimeout);
      const q = input.value.trim();
      if (q.length < 4) { container.innerHTML = ''; return; }

      this.searchTimeout = setTimeout(async () => {
        try {
          // 1) Try Nominatim (finds named places like EHPAD, residences)
          const res1 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=fr&limit=5`, {
            headers: { 'Accept-Language': 'fr' }
          });
          const nominatim = await res1.json();
          if (nominatim.length) {
            renderResults(nominatim.map(r => ({ label: r.display_name, lat: r.lat, lon: r.lon })));
            return;
          }

          // 2) Fallback: API adresse.data.gouv.fr (for street addresses)
          const res2 = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`);
          const gouv = await res2.json();
          if (gouv.features && gouv.features.length) {
            renderResults(gouv.features.map(f => ({ label: f.properties.label, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] })));
            return;
          }

          container.innerHTML = '<div style="padding:8px;font-size:12px;color:var(--txt3)">Aucun resultat - entrez l\'adresse manuellement</div>';
        } catch (e) {
          container.innerHTML = '<div style="padding:8px;font-size:12px;color:var(--red)">Erreur de recherche</div>';
        }
      }, 600);
    });
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
          // Use French government address API (precise with street numbers)
          const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`);
          const data = await res.json();
          const results = (data.features || []).map(f => ({
            label: f.properties.label,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0]
          }));
          container.innerHTML = results.map(r => `
            <div class="suggestion-item" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${r.label.replace(/"/g, '&quot;')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0;color:var(--txt3)"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${r.label}</span>
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
