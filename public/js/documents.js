const Documents = {
  async render() {
    const moisKey = App.getMoisKey();
    const [missions, docs, etabs] = await Promise.all([
      API.missions.list(moisKey),
      API.documents.list(moisKey),
      API.etablissements.list()
    ]);

    const display = document.getElementById('monthDisplayD');
    if (display) display.textContent = App.getMoisLabel();

    // Get unique etablissements worked this month (exclude absences)
    const ABSENCES = ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv'];
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
      page.innerHTML = `<div class="empty-state" style="padding:80px 20px"><p>Aucune mission ce mois</p></div>`;
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
