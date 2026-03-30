const Stats = {
  currentYear: new Date().getFullYear(),
  viewMode: 'year', // 'year' or 'month'

  async render() {
    if (this.viewMode === 'month') return this.renderMonth();
    return this.renderYear();
  },

  async renderYear() {
    const annee = this.currentYear.toString();
    const yearDisplay = document.getElementById('yearDisplayS');
    if (yearDisplay) yearDisplay.textContent = annee;

    const [missions, paiements, config] = await Promise.all([
      API.missions.listAnnee(annee),
      API.paiements.listAnnee(annee),
      API.config.get()
    ]);

    this.renderPage(missions, paiements, config, `Statistiques ${annee}`);
  },

  async renderMonth() {
    const moisKey = App.getMoisKey();
    const yearDisplay = document.getElementById('yearDisplayS');
    if (yearDisplay) yearDisplay.textContent = App.getMoisLabel();

    const [missions, paiements, config] = await Promise.all([
      API.missions.list(moisKey),
      API.paiements.list(moisKey),
      API.config.get()
    ]);

    this.renderPage(missions, paiements, config, `Statistiques - ${App.getMoisLabel()}`);
  },

  renderPage(missions, paiements, config, title) {
    const absenceNames = ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv'];
    const isAbsence = (name) => absenceNames.some(a => (name || '').toLowerCase().includes(a));
    const workMissions = missions.filter(m => !isAbsence(m.etablissement));

    const totalH = workMissions.reduce((s, m) => s + (m.heuresTravaillees || 0), 0);
    const totalKm = workMissions.reduce((s, m) => s + (m.km || 0), 0);
    const totalRevenus = paiements.reduce((s, p) => s + (p.montant || 0), 0);
    const nbMissions = workMissions.length;
    const uniqueDays = new Set(workMissions.map(m => m.date)).size;

    const prixGasoil = config.prixGasoil || 1.949;
    const consommation = config.consommation || 6.5;
    const coutCarburant = (totalKm / 100) * consommation * prixGasoil;

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
      .map(([etab, km]) => {
        const cout = (km / 100) * consommation * prixGasoil;
        return `<tr><td style="font-weight:500">${etab}</td><td class="num">${km.toFixed(0)} km</td><td class="num" style="color:var(--orange)">${cout.toFixed(2)} &euro;</td></tr>`;
      }).join('');

    const isYear = this.viewMode === 'year';
    const page = document.getElementById('page-statistiques');
    page.innerHTML = `
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:16px">
        <button class="btn btn-sm ${!isYear ? 'btn-primary' : 'btn-secondary'}" id="statViewMonth">Vue mois</button>
        <button class="btn btn-sm ${isYear ? 'btn-primary' : 'btn-secondary'}" id="statViewYear">Vue annee</button>
      </div>

      <div class="cards-row">
        <div class="stat-card accent">
          <div class="label">Missions</div>
          <div class="value">${nbMissions}</div>
          <div class="sub">${uniqueDays} jours</div>
        </div>
        <div class="stat-card blue">
          <div class="label">Heures</div>
          <div class="value">${totalH.toFixed(1)}h</div>
        </div>
        <div class="stat-card green">
          <div class="label">Revenus</div>
          <div class="value">${totalRevenus.toFixed(2)} &euro;</div>
        </div>
        <div class="stat-card orange">
          <div class="label">Kilometres</div>
          <div class="value">${totalKm.toFixed(0)} km</div>
          <div class="sub">Carburant : ${coutCarburant.toFixed(2)} &euro;</div>
        </div>
      </div>

      <div class="impot-grid" style="margin-top:24px">
        <div class="impot-card">
          <h3>Heures par etablissement</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Etablissement</th><th style="text-align:right">Heures</th></tr></thead>
              <tbody>${heuresRows || '<tr><td colspan="2" style="text-align:center;color:var(--txt3)">Aucune donnee</td></tr>'}</tbody>
            </table>
          </div>
          <div class="impot-total">
            <span>Total</span>
            <span style="color:var(--blue)">${totalH.toFixed(1)}h</span>
          </div>
        </div>

        <div class="impot-card">
          <h3>KM et carburant par etablissement</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Etablissement</th><th style="text-align:right">KM</th><th style="text-align:right">Carburant</th></tr></thead>
              <tbody>${kmRows || '<tr><td colspan="3" style="text-align:center;color:var(--txt3)">Aucune donnee</td></tr>'}</tbody>
            </table>
          </div>
          <div class="impot-total">
            <span>Total ${totalKm.toFixed(0)} km</span>
            <span style="color:var(--orange)">${coutCarburant.toFixed(2)} &euro;</span>
          </div>
        </div>
      </div>
      <div style="text-align:center;padding:20px;font-size:11px;color:var(--txt3)">&copy; Thomas</div>
    `;

    document.getElementById('statViewMonth').onclick = () => { this.viewMode = 'month'; this.render(); };
    document.getElementById('statViewYear').onclick = () => { this.viewMode = 'year'; this.render(); };
  }
};
