const Documents = {
  viewMode: 'month', // 'month' or 'year'
  currentYear: new Date().getFullYear(),

  async render() {
    if (this.viewMode === 'year') {
      return this.renderYear();
    }
    return this.renderMonth();
  },

  async renderMonth() {
    const moisKey = App.getMoisKey();
    const [missions, docs, etabs] = await Promise.all([
      API.missions.list(moisKey),
      API.documents.list(moisKey),
      API.etablissements.list()
    ]);

    const display = document.getElementById('monthDisplayD');
    if (display) display.textContent = App.getMoisLabel();

    // Get unique etablissements worked this month (exclude absences)
    const ABSENCES = ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv', 'stage', 'ecole', 'école'];
    const workedEtabs = [...new Set(
      missions
        .filter(m => !ABSENCES.some(a => (m.etablissement || '').toLowerCase().includes(a)))
        .map(m => m.etablissement)
    )].sort();

    // Map docs by etablissement
    const docsMap = {};
    docs.forEach(d => { docsMap[d.etablissement] = d; });

    const check = (v) => v ? '<span style="color:var(--green);font-size:16px">&#10003;</span>' : '<span style="color:var(--red);font-size:14px">&#10007;</span>';

    const page = document.getElementById('page-documents');

    if (!workedEtabs.length) {
      page.innerHTML = `
        ${this.renderLastUpdated()}
        ${this.renderViewToggle()}
        <div class="empty-state" style="padding:80px 20px"><p>Aucune mission ce mois</p></div>`;
      this.bindViewToggle();
      this.bindUploadBtn();
      this.loadLastUpdated('documents');
      return;
    }

    // Count status
    const docNames = { fichePaye: 'Fiche paie', contrat: 'Contrat', finContrat: 'Fin contrat', attestation: 'Attestation', solde: 'Solde' };
    let nbComplet = 0;
    let nbManquant = 0;
    const etabRows = workedEtabs.map(etabNom => {
      const d = docsMap[etabNom] || {};
      const manquants = Object.keys(docNames).filter(k => !d[k]);
      const isComplet = manquants.length === 0;
      if (isComplet) nbComplet++; else nbManquant++;
      const statusHTML = isComplet
        ? '<span class="badge badge-green">Complet</span>'
        : '<span class="badge badge-red">Manque : ' + manquants.map(k => docNames[k]).join(', ') + '</span>';
      return `<tr class="doc-row" data-etab="${etabNom}" style="cursor:pointer">
        <td style="font-weight:500">${etabNom}</td>
        <td style="text-align:center">${check(d.fichePaye)}</td>
        <td style="text-align:center">${check(d.contrat)}</td>
        <td style="text-align:center">${check(d.finContrat)}</td>
        <td style="text-align:center">${check(d.attestation)}</td>
        <td style="text-align:center">${check(d.solde)}</td>
        <td>${statusHTML}</td>
      </tr>`;
    }).join('');

    page.innerHTML = `
      ${this.renderLastUpdated()}
      ${this.renderViewToggle()}
      <div class="cards-row" style="margin-bottom:20px">
        <div class="stat-card green">
          <div class="label">Complets</div>
          <div class="value">${nbComplet}</div>
          <div class="sub">etablissements</div>
        </div>
        <div class="stat-card red" style="--stat-color:var(--red)">
          <div class="label">Documents manquants</div>
          <div class="value" style="color:var(--red)">${nbManquant}</div>
          <div class="sub">etablissements</div>
        </div>
      </div>

      <div class="section-header">
        <h2 class="section-title">Documents - ${App.getMoisLabel()}</h2>
      </div>
      <p style="font-size:13px;color:var(--txt2);margin-bottom:16px">Cliquez sur une ligne pour mettre a jour.</p>

      <div class="table-wrap"><table>
        <thead><tr>
          <th>Etablissement</th>
          <th style="text-align:center">Fiche paie</th>
          <th style="text-align:center">Contrat</th>
          <th style="text-align:center">Fin contrat</th>
          <th style="text-align:center">Attestation</th>
          <th style="text-align:center">Solde</th>
          <th>Statut</th>
        </tr></thead>
        <tbody>${etabRows}</tbody>
      </table></div>
    `;

    page.querySelectorAll('.doc-row').forEach(row => {
      row.onclick = () => this.openDocModal(row.dataset.etab, moisKey, docsMap[row.dataset.etab] || {});
    });

    this.bindViewToggle();
    this.bindUploadBtn();
    this.loadLastUpdated('documents');
  },

  async renderYear() {
    const annee = this.currentYear.toString();
    const ABSENCES = ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv', 'stage', 'ecole', 'école'];
    const isAbs = (n) => ABSENCES.some(a => (n || '').toLowerCase().includes(a));

    const display = document.getElementById('monthDisplayD');
    if (display) display.textContent = annee;

    const moisNoms = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Load missions + docs for each month
    const allDocs = [];
    const moisMissions = {}; // mois -> Set of etab names
    for (let m = 1; m <= 12; m++) {
      const key = `${annee}-${String(m).padStart(2, '0')}`;
      const [missions, docs] = await Promise.all([
        API.missions.list(key),
        API.documents.list(key)
      ]);
      docs.forEach(d => allDocs.push(d));
      moisMissions[key] = new Set(
        missions.filter(mi => !isAbs(mi.etablissement)).map(mi => mi.etablissement)
      );
    }

    // Build docs map: etab -> mois -> doc
    const docsMap = {};
    allDocs.forEach(d => {
      if (!docsMap[d.etablissement]) docsMap[d.etablissement] = {};
      docsMap[d.etablissement][d.mois] = d;
    });

    // Get all etab names that worked this year (exclude absences)
    const allWorkedEtabs = new Set();
    Object.values(moisMissions).forEach(s => s.forEach(e => allWorkedEtabs.add(e)));
    const etabNames = [...allWorkedEtabs].sort();

    const check = (doc, worked) => {
      if (!worked) return '<span style="color:var(--txt3)">-</span>';
      if (!doc) return '<span style="color:var(--red);font-size:12px;font-weight:700">&#10007;</span>';
      const keys = ['fichePaye', 'contrat', 'finContrat', 'attestation', 'solde'];
      const done = keys.filter(k => doc[k]).length;
      if (done === keys.length) return '<span style="color:var(--green);font-size:14px">&#10003;</span>';
      if (done > 0) return `<span style="color:var(--orange);font-size:11px;font-weight:700">${done}/5</span>`;
      return '<span style="color:var(--red);font-size:12px;font-weight:700">&#10007;</span>';
    };

    const headerCols = moisNoms.map(n => `<th style="text-align:center;font-size:11px;padding:6px 4px">${n}</th>`).join('');
    let totalManquants = 0;
    const rows = etabNames.map(etab => {
      const cols = [];
      for (let m = 1; m <= 12; m++) {
        const key = `${annee}-${String(m).padStart(2, '0')}`;
        const worked = moisMissions[key] && moisMissions[key].has(etab);
        const doc = docsMap[etab] && docsMap[etab][key];
        if (worked && (!doc || !['fichePaye','contrat','finContrat','attestation','solde'].every(k => doc[k]))) totalManquants++;
        cols.push(`<td style="text-align:center;padding:6px 4px">${check(doc, worked)}</td>`);
      }
      return `<tr><td style="font-weight:500;white-space:nowrap">${etab}</td>${cols.join('')}</tr>`;
    }).join('');

    const page = document.getElementById('page-documents');
    page.innerHTML = `
      ${this.renderLastUpdated()}
      ${this.renderViewToggle()}
      ${totalManquants > 0 ? `<div class="stat-card" style="margin-bottom:16px;border-left:4px solid var(--red)">
        <div class="label" style="color:var(--red)">DOCUMENTS MANQUANTS</div>
        <div class="value" style="color:var(--red)">${totalManquants}</div>
        <div class="sub">mois/etablissement incomplets sur ${annee}</div>
      </div>` : `<div class="stat-card" style="margin-bottom:16px;border-left:4px solid var(--green)">
        <div class="label" style="color:var(--green)">TOUS LES DOCUMENTS RECUS</div>
        <div class="value" style="color:var(--green)">OK</div>
      </div>`}
      <p style="font-size:12px;color:var(--txt2);margin-bottom:12px">
        <span style="color:var(--green)">&#10003;</span> complet &nbsp;
        <span style="color:var(--orange)">X/5</span> partiel &nbsp;
        <span style="color:var(--red)">&#10007;</span> manquant &nbsp;
        <span style="color:var(--txt3)">-</span> pas travaille
      </p>
      <div class="table-wrap" style="overflow-x:auto"><table style="font-size:13px">
        <thead><tr><th>Etablissement</th>${headerCols}</tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    `;

    this.bindViewToggle();
    this.bindUploadBtn();
    this.loadLastUpdated('documents');
  },

  renderViewToggle() {
    const isYear = this.viewMode === 'year';
    return `
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn btn-sm ${isYear ? 'btn-secondary' : 'btn-primary'}" id="docViewMonth">Vue mois</button>
        <button class="btn btn-sm ${isYear ? 'btn-primary' : 'btn-secondary'}" id="docViewYear">Vue annee</button>
        <button class="btn btn-sm btn-primary" id="docUploadBtn" style="margin-left:auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Envoyer un document
        </button>
      </div>
    `;
  },

  renderLastUpdated() {
    return '<div id="docLastUpdated" style="text-align:right;font-size:11px;color:var(--txt3);margin-bottom:4px"></div>';
  },

  async loadLastUpdated(section) {
    try {
      const log = await API.logs.lastForSection(section);
      const el = document.getElementById('docLastUpdated');
      if (el && log) {
        const d = new Date(log.timestamp);
        el.textContent = `Derniere maj: ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      }
    } catch(e) {}
  },

  bindViewToggle() {
    const monthBtn = document.getElementById('docViewMonth');
    const yearBtn = document.getElementById('docViewYear');
    if (monthBtn) monthBtn.onclick = () => { this.viewMode = 'month'; this.render(); };
    if (yearBtn) yearBtn.onclick = () => { this.viewMode = 'year'; this.render(); };
  },

  bindUploadBtn() {
    const btn = document.getElementById('docUploadBtn');
    if (btn) btn.onclick = () => this.openUploadModal();
  },

  async openUploadModal() {
    const etabs = await API.etablissements.list();
    const etabOptions = etabs.map(e => `<option value="${e.nom}">${e.nom}</option>`).join('');
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let y = currentYear; y >= currentYear - 3; y--) {
      yearOptions.push(`<option value="${y}">${y}</option>`);
    }
    const moisOptions = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre']
      .map((n, i) => `<option value="${String(i+1).padStart(2,'0')}">${n}</option>`).join('');

    const body = `
      <div class="form-group">
        <label class="form-label">Etablissement</label>
        <select class="form-select" id="ulEtab"><option value="">Choisir...</option>${etabOptions}</select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Annee</label>
          <select class="form-select" id="ulAnnee">${yearOptions.join('')}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Mois</label>
          <select class="form-select" id="ulMois">${moisOptions}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Fichier (PDF ou image)</label>
        <input type="file" class="form-input" id="ulFile" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" style="padding:8px">
      </div>
      <div id="ulProgress" style="display:none;margin-top:12px">
        <div style="background:var(--bg2);border-radius:6px;overflow:hidden;height:8px">
          <div id="ulProgressBar" style="height:100%;background:var(--green);transition:width 0.3s;width:0%"></div>
        </div>
        <div id="ulProgressText" style="font-size:11px;color:var(--txt2);margin-top:4px">Envoi en cours...</div>
      </div>
      <div id="ulSuccess" style="display:none;margin-top:12px;padding:12px;background:rgba(76,175,80,0.15);border-radius:8px;color:var(--green);font-weight:500;text-align:center">
        Document envoye avec succes !
      </div>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Fermer</button>
      <button class="btn btn-primary" id="ulSend">Envoyer</button>
    `;
    App.openModal('Envoyer un document', body, footer);

    document.getElementById('ulSend').onclick = async () => {
      const etab = document.getElementById('ulEtab').value;
      const annee = document.getElementById('ulAnnee').value;
      const mois = document.getElementById('ulMois').value;
      const file = document.getElementById('ulFile').files[0];

      if (!etab) return App.toast('Choisir un etablissement', 'error');
      if (!file) return App.toast('Choisir un fichier', 'error');

      const formData = new FormData();
      formData.append('etablissement', etab);
      formData.append('annee', annee);
      formData.append('mois', mois);
      formData.append('file', file);

      // Show progress
      document.getElementById('ulProgress').style.display = 'block';
      document.getElementById('ulSuccess').style.display = 'none';
      document.getElementById('ulSend').disabled = true;
      document.getElementById('ulProgressBar').style.width = '30%';

      try {
        document.getElementById('ulProgressBar').style.width = '60%';
        const result = await API.documentsUpload.upload(formData);
        document.getElementById('ulProgressBar').style.width = '100%';

        if (result.ok) {
          document.getElementById('ulProgressText').textContent = 'Termine !';
          document.getElementById('ulSuccess').style.display = 'block';
          document.getElementById('ulProgress').style.display = 'none';
          App.toast('Document envoye');
        } else {
          App.toast(result.error || 'Erreur lors de l\'envoi', 'error');
          document.getElementById('ulProgress').style.display = 'none';
        }
      } catch(e) {
        App.toast('Erreur lors de l\'envoi', 'error');
        document.getElementById('ulProgress').style.display = 'none';
      }
      document.getElementById('ulSend').disabled = false;
    };
  },

  openDocModal(etabNom, mois, doc) {
    const moisLabel = new Date(mois + '-01T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const body = `
      <div style="font-size:14px;font-weight:600;margin-bottom:4px">${etabNom}</div>
      <div style="font-size:12px;color:var(--txt2);margin-bottom:16px">${moisLabel}</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <label class="form-check"><input type="checkbox" id="dFichePaye" ${doc.fichePaye ? 'checked' : ''}> Fiche de paie</label>
        <label class="form-check"><input type="checkbox" id="dContrat" ${doc.contrat ? 'checked' : ''}> Contrat de travail</label>
        <label class="form-check"><input type="checkbox" id="dFinContrat" ${doc.finContrat ? 'checked' : ''}> Certificat de fin de contrat</label>
        <label class="form-check"><input type="checkbox" id="dAttestation" ${doc.attestation ? 'checked' : ''}> Attestation employeur</label>
        <label class="form-check"><input type="checkbox" id="dSolde" ${doc.solde ? 'checked' : ''}> Solde de tout compte</label>
      </div>
      <div class="form-group" style="margin-top:16px">
        <label class="form-label">Notes</label>
        <textarea class="form-input" id="dNotes" rows="2" style="resize:vertical" placeholder="Ex: Relancer par email...">${doc.notes || ''}</textarea>
      </div>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
      <button class="btn btn-primary" id="dSave">Sauvegarder</button>
    `;
    App.openModal('Documents', body, footer);

    document.getElementById('dSave').onclick = async () => {
      await API.documents.save({
        mois,
        etablissement: etabNom,
        fichePaye: document.getElementById('dFichePaye').checked,
        contrat: document.getElementById('dContrat').checked,
        finContrat: document.getElementById('dFinContrat').checked,
        attestation: document.getElementById('dAttestation').checked,
        solde: document.getElementById('dSolde').checked,
        notes: document.getElementById('dNotes').value.trim()
      });
      App.closeModal();
      App.toast('Documents mis a jour');
      this.render();
    };
  }
};
