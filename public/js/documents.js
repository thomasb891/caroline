const Documents = {
  async render() {
    const etabs = await API.etablissements.list();
    const ABSENCES = ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv', 'stage', 'ecole'];
    const isAbs = (n) => ABSENCES.some(a => (n || '').toLowerCase().includes(a));
    const workEtabs = etabs.filter(e => !isAbs(e.nom));

    const page = document.getElementById('page-documents');
    page.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Suivi des documents par etablissement</h2>
      </div>
      <p style="font-size:13px;color:var(--txt2);margin-bottom:20px">Cliquez sur une ligne pour modifier les documents recus.</p>

      <div class="table-wrap"><table>
        <thead><tr>
          <th>Etablissement</th>
          <th style="text-align:center">Contrat</th>
          <th style="text-align:center">Fin contrat</th>
          <th style="text-align:center">Attestation</th>
          <th style="text-align:center">Solde</th>
          <th>Notes</th>
        </tr></thead>
        <tbody>${workEtabs.map(e => {
          const check = (v) => v ? '<span style="color:var(--green);font-size:16px">&#10003;</span>' : '<span style="color:var(--red);font-size:14px">&#10007;</span>';
          return `<tr class="doc-row" data-id="${e.id}" style="cursor:pointer">
            <td style="font-weight:500">${e.nom}</td>
            <td style="text-align:center">${check(e.docContrat)}</td>
            <td style="text-align:center">${check(e.docFinContrat)}</td>
            <td style="text-align:center">${check(e.docAttestation)}</td>
            <td style="text-align:center">${check(e.docSolde)}</td>
            <td style="font-size:11px;color:var(--txt3)">${e.docNotes || ''}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    `;

    page.querySelectorAll('.doc-row').forEach(row => {
      row.onclick = () => {
        const etab = etabs.find(e => e.id === row.dataset.id);
        if (etab) this.openDocModal(etab);
      };
    });
  },

  openDocModal(etab) {
    const body = `
      <div style="font-size:14px;font-weight:600;margin-bottom:16px">${etab.nom}</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <label class="form-check"><input type="checkbox" id="dContrat" ${etab.docContrat ? 'checked' : ''}> Contrat de travail</label>
        <label class="form-check"><input type="checkbox" id="dFinContrat" ${etab.docFinContrat ? 'checked' : ''}> Certificat de fin de contrat</label>
        <label class="form-check"><input type="checkbox" id="dAttestation" ${etab.docAttestation ? 'checked' : ''}> Attestation employeur (Pole Emploi)</label>
        <label class="form-check"><input type="checkbox" id="dSolde" ${etab.docSolde ? 'checked' : ''}> Solde de tout compte</label>
      </div>
      <div class="form-group" style="margin-top:16px">
        <label class="form-label">Notes</label>
        <textarea class="form-input" id="dNotes" rows="3" style="resize:vertical" placeholder="Ex: Manque attestation, relancer par email...">${etab.docNotes || ''}</textarea>
      </div>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
      <button class="btn btn-primary" id="dSave">Sauvegarder</button>
    `;
    App.openModal('Documents - ' + etab.nom, body, footer);

    document.getElementById('dSave').onclick = async () => {
      await API.etablissements.update(etab.id, {
        docContrat: document.getElementById('dContrat').checked,
        docFinContrat: document.getElementById('dFinContrat').checked,
        docAttestation: document.getElementById('dAttestation').checked,
        docSolde: document.getElementById('dSolde').checked,
        docNotes: document.getElementById('dNotes').value.trim()
      });
      App.closeModal();
      App.toast('Documents mis a jour');
      this.render();
    };
  }
};
