const Impots = {
  currentYear: new Date().getFullYear(),

  async render() {
    const annee = this.currentYear.toString();
    const yearDisplay = document.getElementById('yearDisplayI');
    if (yearDisplay) yearDisplay.textContent = annee;
    const [stats, paiements, etablissements] = await Promise.all([
      API.stats.annuel(annee),
      API.paiements.listAnnee(annee),
      API.etablissements.list()
    ]);
    const moisNoms = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

    const page = document.getElementById('page-impots');

    // Group paiements by mois then by etablissement
    const paiementsByMois = {};
    paiements.forEach(p => {
      if (!p.dateVersement) return;
      const mk = p.dateVersement.slice(0, 7);
      if (!paiementsByMois[mk]) paiementsByMois[mk] = [];
      paiementsByMois[mk].push(p);
    });

    // Revenus table rows (cliquable pour detail)
    const revRows = moisNoms.map((nom, i) => {
      const key = `${annee}-${String(i + 1).padStart(2, '0')}`;
      const d = stats.moisData[key] || { revenus: 0 };
      const moisPaie = paiementsByMois[key] || [];
      const hasData = moisPaie.length > 0;

      // Detail rows by etablissement
      const byEtab = {};
      moisPaie.forEach(p => {
        const e = p.etablissement || 'Autre';
        byEtab[e] = (byEtab[e] || 0) + (p.montant || 0);
      });
      const detailRows = Object.entries(byEtab).sort((a, b) => b[1] - a[1]).map(([etab, montant]) =>
        `<tr class="rev-detail" data-mois="${key}" style="display:none">
          <td style="padding-left:24px;font-size:11px;color:var(--txt2)">${etab}</td>
          <td class="num" style="font-size:11px">${montant.toFixed(2)} &euro;</td>
        </tr>`
      ).join('');

      return `<tr class="rev-mois" data-toggle="${key}" style="cursor:${hasData ? 'pointer' : 'default'}">
        <td style="font-weight:${hasData ? '600' : '400'}">${hasData ? '<span class="rev-icon" style="display:inline-block;width:12px;transition:transform 0.2s">&#9654;</span> ' : ''}${nom}</td>
        <td class="num" style="font-weight:${d.revenus > 0 ? '600' : '400'}">${d.revenus > 0 ? d.revenus.toFixed(2) + ' &euro;' : '-'}</td>
      </tr>${detailRows}`;
    }).join('');

    // KM table rows
    const kmRows = moisNoms.map((nom, i) => {
      const key = `${annee}-${String(i + 1).padStart(2, '0')}`;
      const d = stats.moisData[key] || { km: 0, nbMissions: 0 };
      return `<tr><td>${nom}</td><td class="num">${d.nbMissions}</td><td class="num">${d.km.toFixed(0)} km</td></tr>`;
    }).join('');

    const baremeKm = stats.config.baremeKm;
    const puissance = stats.config.puissanceFiscale;

    page.innerHTML = `
      <div class="print-header" style="display:none">
        <h1>Impots & Frais KM - ${annee}</h1>
        <p>Caroline - Declaration annuelle</p>
      </div>
      <div class="section-header" style="margin-bottom:20px">
        <h2 class="section-title">Declaration ${annee}</h2>
        <div style="display:flex;gap:8px">
        <button class="btn-print" onclick="Print.printImpots()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimer
        </button>
        <button class="btn btn-sm btn-secondary" id="editBareme">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4"/></svg>
          Bareme KM
        </button>
        <button class="btn btn-sm btn-primary" id="goComparaison">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 3l-7 7"/><path d="M3 3l7 7"/><path d="M16 21h5v-5"/><path d="M8 21H3v-5"/><path d="M21 21l-7-7"/><path d="M3 21l7-7"/></svg>
          Comparer avec fiche impots
        </button>
        </div>
      </div>

      <div class="impot-grid">
        <div class="impot-card">
          <h3>Revenus annuels</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Mois</th><th>Montant</th></tr></thead>
              <tbody>${revRows}</tbody>
            </table>
          </div>
          <div class="impot-total">
            <span>Total revenus</span>
            <span style="color:var(--green)">${stats.totalRevenus.toFixed(2)} &euro;</span>
          </div>
        </div>

        <div class="impot-card">
          <h3>Frais kilometriques</h3>
          <div style="margin-bottom:12px;font-size:12px;color:var(--txt2)">
            Puissance fiscale : ${puissance} CV &bull; Bareme : ${baremeKm} &euro;/km
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Mois</th><th>Missions</th><th>KM</th></tr></thead>
              <tbody>${kmRows}</tbody>
            </table>
          </div>
          <div class="impot-total">
            <span>Total ${stats.totalKm.toFixed(0)} km</span>
            <span style="color:var(--orange)">${stats.fraisKm.toFixed(2)} &euro;</span>
          </div>
        </div>

        <div class="impot-card resume-card">
          <h3>A reporter sur la declaration d'impots</h3>
          <div style="margin-top:16px;display:flex;flex-direction:column;gap:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(0,0,0,0.2);border-radius:8px;border-left:4px solid var(--green)">
              <div>
                <div style="font-size:16px;font-weight:700">Case 1AJ</div>
                <div style="font-size:11px;color:var(--txt2)">Salaires nets imposables (missions)</div>
              </div>
              <div style="font-size:24px;font-weight:700;color:var(--green)">${(stats.totalSalaires || 0).toFixed(2)} &euro;</div>
            </div>
            ${(stats.totalPoleEmploi || 0) > 0 ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(0,0,0,0.2);border-radius:8px;border-left:4px solid var(--blue)">
              <div>
                <div style="font-size:16px;font-weight:700">Case 1AP</div>
                <div style="font-size:11px;color:var(--txt2)">Allocations chomage (Pole Emploi / ARE)</div>
              </div>
              <div style="font-size:24px;font-weight:700;color:var(--blue)">${stats.totalPoleEmploi.toFixed(2)} &euro;</div>
            </div>` : ''}
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(0,0,0,0.2);border-radius:8px;border-left:4px solid var(--orange)">
              <div>
                <div style="font-size:16px;font-weight:700">Case 1AK</div>
                <div style="font-size:11px;color:var(--txt2)">Frais reels (cocher "option frais reels")</div>
              </div>
              <div style="font-size:24px;font-weight:700;color:var(--orange)">${stats.fraisKm.toFixed(2)} &euro;</div>
            </div>
            <div style="font-size:11px;color:var(--txt3);padding:0 4px">
              ${stats.totalKm.toFixed(0)} km x ${baremeKm} &euro;/km (bareme ${puissance} CV) = ${stats.fraisKm.toFixed(2)} &euro; de frais kilometriques
            </div>
          </div>
        </div>

        <div class="impot-card" style="grid-column:1/-1">
          <h3>Verification fiches de paie par etablissement</h3>
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th style="width:40px">OK</th>
                <th>Etablissement</th>
                <th>Nb fiches</th>
                <th>Total recu</th>
                <th>Derniere fiche</th>
                <th>Dernier montant</th>
              </tr></thead>
              <tbody>${this.buildVerifRows(paiements, etablissements)}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div style="text-align:center;padding:20px;font-size:11px;color:var(--txt3)">&copy; Thomas</div>
    `;

    document.getElementById('editBareme').onclick = () => this.openBaremeModal(stats.config);

    // Toggle detail rows on click
    page.querySelectorAll('.rev-mois').forEach(row => {
      row.onclick = () => {
        const key = row.dataset.toggle;
        if (!key) return;
        const details = page.querySelectorAll(`.rev-detail[data-mois="${key}"]`);
        if (!details.length) return;
        const visible = details[0].style.display !== 'none';
        details.forEach(d => d.style.display = visible ? 'none' : 'table-row');
        const icon = row.querySelector('.rev-icon');
        if (icon) icon.style.transform = visible ? '' : 'rotate(90deg)';
      };
    });
    document.getElementById('goComparaison').onclick = () => {
      Comparaison.currentYear = this.currentYear;
      App.navigate('comparaison');
    };
  },

  buildVerifRows(paiements, etablissements) {
    // Group paiements by etablissement
    const byEtab = {};
    paiements.forEach(p => {
      const key = p.etablissement || 'Inconnu';
      if (!byEtab[key]) byEtab[key] = [];
      byEtab[key].push(p);
    });

    // Only keep etablissements with paiements (not empty ones)
    const rows = Object.keys(byEtab).filter(etab => byEtab[etab].length > 0).sort().map(etab => {
      const list = byEtab[etab];
      const total = list.reduce((s, p) => s + (p.montant || 0), 0);
      // Sort by date to get the last one
      const sorted = [...list].sort((a, b) => (b.dateVersement || '').localeCompare(a.dateVersement || ''));
      const last = sorted[0];
      const nbFiches = list.filter(p => p.fichePaye).length;

      return `<tr>
        <td class="print-check" style="text-align:center"><input type="checkbox" class="verif-check" style="width:18px;height:18px;cursor:pointer;accent-color:var(--green)"></td>
        <td style="font-weight:500">${etab}</td>
        <td class="num">${list.length} <span style="font-size:10px;color:var(--txt3)">(${nbFiches} recues)</span></td>
        <td class="num" style="font-weight:600">${total > 0 ? total.toFixed(2) + ' &euro;' : '-'}</td>
        <td>${last ? this.formatDateFR(last.dateVersement) : '-'}</td>
        <td class="num">${last ? (last.montant || 0).toFixed(2) + ' &euro;' : '-'}</td>
      </tr>`;
    }).join('');

    // Total row
    const totalAll = paiements.reduce((s, p) => s + (p.montant || 0), 0);
    return rows + `<tr style="font-weight:700;border-top:2px solid var(--border)">
      <td></td>
      <td>TOTAL</td>
      <td class="num">${paiements.length}</td>
      <td class="num">${totalAll.toFixed(2)} &euro;</td>
      <td></td>
      <td></td>
    </tr>`;
  },

  formatDateFR(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },

  openBaremeModal(config) {
    const body = `
      <div class="form-group">
        <label class="form-label">Puissance fiscale (CV)</label>
        <input type="number" class="form-input" id="cfPuissance" value="${config.puissanceFiscale || 4}">
      </div>
      <div class="form-group">
        <label class="form-label">Bareme kilometrique (&euro;/km)</label>
        <input type="number" step="0.001" class="form-input" id="cfBareme" value="${config.baremeKm || 0.523}">
      </div>
      <p style="font-size:12px;color:var(--txt3);margin-top:8px">Le bareme officiel 2026 pour 4 CV est de 0,523 &euro;/km pour les 5000 premiers km.</p>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
      <button class="btn btn-primary" id="cfSave">Sauvegarder</button>
    `;
    App.openModal('Bareme kilometrique', body, footer);

    document.getElementById('cfSave').onclick = async () => {
      await API.config.update({
        puissanceFiscale: parseInt(document.getElementById('cfPuissance').value) || 4,
        baremeKm: parseFloat(document.getElementById('cfBareme').value) || 0.523
      });
      App.closeModal();
      App.toast('Bareme mis a jour');
      this.render();
    };
  }
};
