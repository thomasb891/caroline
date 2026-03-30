const Stats = {
  currentYear: new Date().getFullYear(),

  async render() {
    const annee = this.currentYear.toString();
    const yearDisplay = document.getElementById('yearDisplayS');
    if (yearDisplay) yearDisplay.textContent = annee;

    const [missions, paiements, config] = await Promise.all([
      API.missions.listAnnee(annee),
      API.paiements.listAnnee(annee),
      API.config.get()
    ]);

    const absenceNames = ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv'];
    const isAbsence = (name) => absenceNames.some(a => (name || '').toLowerCase().includes(a));
    const workMissions = missions.filter(m => !isAbsence(m.etablissement));

    const totalH = workMissions.reduce((s, m) => s + (m.heuresTravaillees || 0), 0);
    const totalKm = workMissions.reduce((s, m) => s + (m.km || 0), 0);
    const totalRevenus = paiements.reduce((s, p) => s + (p.montant || 0), 0);
    const nbMissions = workMissions.length;

    // Cout carburant
    const prixGasoil = config.prixGasoil || 1.65;
    const consommation = config.consommation || 6.5;
    const coutCarburant = (totalKm / 100) * consommation * prixGasoil;

    // Heures par etablissement
    const heuresParEtab = {};
    const kmParEtab = {};
    workMissions.forEach(m => {
      const etab = m.etablissement || 'Inconnu';
      heuresParEtab[etab] = (heuresParEtab[etab] || 0) + (m.heuresTravaillees || 0);
      kmParEtab[etab] = (kmParEtab[etab] || 0) + (m.km || 0);
    });

    const heuresRows = Object.entries(heuresParEtab)
      .sort((a, b) => b[1] - a[1])
      .map(([etab, h]) => `<tr><td style="font-weight:500">${etab}</td><td class="num">${h.toFixed(1)}h</td></tr>`)
      .join('');

    const kmRows = Object.entries(kmParEtab)
      .sort((a, b) => b[1] - a[1])
      .map(([etab, km]) => `<tr><td style="font-weight:500">${etab}</td><td class="num">${km.toFixed(0)} km</td></tr>`)
      .join('');

    const page = document.getElementById('page-statistiques');
    page.innerHTML = `
      <div class="print-header" style="display:none">
        <h1>Statistiques - ${annee}</h1>
        <p>Caroline - Bilan annuel</p>
      </div>

      <div class="cards-row">
        <div class="stat-card blue">
          <div class="label">Total heures</div>
          <div class="value">${totalH.toFixed(1)}h</div>
        </div>
        <div class="stat-card orange">
          <div class="label">Total KM</div>
          <div class="value">${totalKm.toFixed(0)}</div>
          <div class="sub">km parcourus</div>
        </div>
        <div class="stat-card green">
          <div class="label">Total revenus</div>
          <div class="value">${totalRevenus.toFixed(2)} &euro;</div>
        </div>
        <div class="stat-card accent">
          <div class="label">Nb missions</div>
          <div class="value">${nbMissions}</div>
        </div>
      </div>

      <div class="cards-row" style="grid-template-columns:1fr">
        <div class="stat-card" style="border-left:4px solid var(--orange)">
          <div class="label">Cout carburant estime</div>
          <div class="value" style="color:var(--orange)">${coutCarburant.toFixed(2)} &euro;</div>
          <div class="sub">${totalKm.toFixed(0)} km x ${consommation} L/100km x ${prixGasoil.toFixed(2)} &euro;/L</div>
        </div>
      </div>

      <div class="impot-grid" style="margin-top:24px">
        <div class="impot-card">
          <h3>Heures par etablissement</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Etablissement</th><th>Heures</th></tr></thead>
              <tbody>${heuresRows || '<tr><td colspan="2" style="text-align:center;color:var(--txt3)">Aucune donnee</td></tr>'}</tbody>
            </table>
          </div>
          <div class="impot-total">
            <span>Total</span>
            <span style="color:var(--blue)">${totalH.toFixed(1)}h</span>
          </div>
        </div>

        <div class="impot-card">
          <h3>KM par etablissement</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Etablissement</th><th>KM</th></tr></thead>
              <tbody>${kmRows || '<tr><td colspan="2" style="text-align:center;color:var(--txt3)">Aucune donnee</td></tr>'}</tbody>
            </table>
          </div>
          <div class="impot-total">
            <span>Total</span>
            <span style="color:var(--orange)">${totalKm.toFixed(0)} km</span>
          </div>
        </div>
      </div>
    `;
  }
};
