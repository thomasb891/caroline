const Impots = {
  async render() {
    const annee = App.currentDate.getFullYear().toString();
    const stats = await API.stats.annuel(annee);
    const moisNoms = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

    const page = document.getElementById('page-impots');

    // Revenus table rows
    const revRows = moisNoms.map((nom, i) => {
      const key = `${annee}-${String(i + 1).padStart(2, '0')}`;
      const d = stats.moisData[key] || { revenus: 0 };
      return `<tr><td>${nom}</td><td class="num">${d.revenus.toFixed(2)} &euro;</td></tr>`;
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
      <div class="section-header" style="margin-bottom:20px">
        <h2 class="section-title">Declaration ${annee}</h2>
        <button class="btn btn-sm btn-secondary" id="editBareme">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4"/></svg>
          Bareme KM
        </button>
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
          <h3>Resume pour la declaration</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:16px">
            <div>
              <div style="font-size:12px;color:var(--txt3);margin-bottom:4px">REVENUS BRUTS</div>
              <div style="font-size:24px;font-weight:700;color:var(--green)">${stats.totalRevenus.toFixed(2)} &euro;</div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--txt3);margin-bottom:4px">FRAIS KM DEDUCTIBLES</div>
              <div style="font-size:24px;font-weight:700;color:var(--orange)">- ${stats.fraisKm.toFixed(2)} &euro;</div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--txt3);margin-bottom:4px">NET IMPOSABLE</div>
              <div style="font-size:24px;font-weight:700;color:var(--accent2)">${(stats.totalRevenus - stats.fraisKm).toFixed(2)} &euro;</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('editBareme').onclick = () => this.openBaremeModal(stats.config);
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
