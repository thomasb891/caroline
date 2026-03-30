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

    // Compute previous year same month key
    const [y, m] = moisKey.split('-');
    const prevMoisKey = `${parseInt(y) - 1}-${m}`;

    // Check if viewing current month for prevision
    const now = new Date();
    const currentMoisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonth = (moisKey === currentMoisKey);

    // Next month key
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMoisKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    const fetches = [
      API.missions.list(moisKey),
      API.paiements.list(moisKey),
      API.config.get(),
      API.missions.list(prevMoisKey),
      API.paiements.list(prevMoisKey)
    ];
    if (isCurrentMonth) {
      fetches.push(API.missions.list(nextMoisKey));
      fetches.push(API.etablissements.list());
    }
    const results = await Promise.all(fetches);
    const [missions, paiements, config, prevMissions, prevPaiements] = results;
    const nextMissions = isCurrentMonth ? results[5] : [];
    const etabs = isCurrentMonth ? results[6] : [];

    // Build prevision data for next month
    this._prevision = null;
    if (isCurrentMonth) {
      const absenceNames = ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv'];
      const isAbsence = (name) => absenceNames.some(a => (name || '').toLowerCase().includes(a));
      const workNext = nextMissions.filter(m => !isAbsence(m.etablissement));

      if (workNext.length > 0) {
        const etabMap = {};
        etabs.forEach(e => { etabMap[e.nom] = e; });

        let estimTotal = 0, salaireBase = 0, totalIFC = 0, totalCP = 0, totalPrimeNuit = 0, totalH = 0;
        workNext.forEach(m => {
          const e = etabMap[m.etablissement];
          const taux = e && e.tauxHoraire ? e.tauxHoraire : 0;
          const hDebut = parseInt((m.heureDebut || '08:00').split(':')[0]);
          const estNuit = m.horaire === 'nuit' || (hDebut >= 21 || hDebut < 6);
          const primeNuit = (estNuit && e && e.primeNuit) ? e.primeNuit : 0;
          const ifcPct = e && e.ifc ? e.ifc : 0;
          const cpPct = e && e.cp ? e.cp : 0;
          const heures = m.heuresTravaillees || 0;
          totalH += heures;
          const base = heures * taux + heures * primeNuit;
          totalPrimeNuit += heures * primeNuit;
          const ifc = base * ifcPct / 100;
          const cp = (base + ifc) * cpPct / 100;
          salaireBase += base;
          totalIFC += ifc;
          totalCP += cp;
          estimTotal += base + ifc + cp;
        });

        const nextMoisLabel = nextDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        this._prevision = { nbMissions: workNext.length, totalH, estimTotal, salaireBase, totalIFC, totalCP, totalPrimeNuit, nextMoisLabel };
      } else {
        this._prevision = { empty: true, nextMoisLabel: nextDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) };
      }
    }

    this.renderPage(missions, paiements, config, `Statistiques - ${App.getMoisLabel()}`, prevMissions, prevPaiements, prevMoisKey);
  },

  renderPage(missions, paiements, config, title, prevMissions, prevPaiements, prevMoisKey) {
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

    // Build prevision HTML
    let previsionHTML = '';
    if (this._prevision) {
      const p = this._prevision;
      if (p.empty) {
        previsionHTML = `
          <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:16px 20px;margin-bottom:16px">
            <div style="font-weight:600;font-size:14px;color:var(--accent);margin-bottom:4px">Prevision ${p.nextMoisLabel}</div>
            <div style="color:var(--txt2);font-size:13px">Aucune mission prevue</div>
          </div>`;
      } else {
        previsionHTML = `
          <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:16px 20px;margin-bottom:16px">
            <div style="font-weight:600;font-size:14px;color:var(--accent);margin-bottom:8px">Prevision ${p.nextMoisLabel}</div>
            <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:13px">
              <div><span style="color:var(--txt2)">Missions :</span> <strong>${p.nbMissions}</strong></div>
              <div><span style="color:var(--txt2)">Heures :</span> <strong>${p.totalH.toFixed(1)}h</strong></div>
              <div><span style="color:var(--txt2)">Estimation salaire :</span> <strong style="color:var(--green)">${p.estimTotal.toFixed(2)} &euro;</strong></div>
              <div style="font-size:11px;color:var(--txt3)">Base ${p.salaireBase.toFixed(0)}&euro;${p.totalPrimeNuit > 0 ? ' (dont nuit ' + p.totalPrimeNuit.toFixed(0) + '&euro;)' : ''} + IFC ${p.totalIFC.toFixed(0)}&euro; + CP ${p.totalCP.toFixed(0)}&euro;</div>
            </div>
          </div>`;
      }
    }

    const isYear = this.viewMode === 'year';
    const page = document.getElementById('page-statistiques');
    page.innerHTML = `
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:16px">
        <button class="btn btn-sm ${!isYear ? 'btn-primary' : 'btn-secondary'}" id="statViewMonth">Vue mois</button>
        <button class="btn btn-sm ${isYear ? 'btn-primary' : 'btn-secondary'}" id="statViewYear">Vue annee</button>
      </div>

      ${previsionHTML}

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
      ${this._buildComparison(missions, paiements, config, prevMissions, prevPaiements, prevMoisKey)}
      <div style="text-align:center;padding:20px;font-size:11px;color:var(--txt3)">&copy; Thomas</div>
    `;

    document.getElementById('statViewMonth').onclick = () => { this.viewMode = 'month'; this.render(); };
    document.getElementById('statViewYear').onclick = () => { this.viewMode = 'year'; this.render(); };
  },

  _buildComparison(missions, paiements, config, prevMissions, prevPaiements, prevMoisKey) {
    if (!prevMissions || !prevPaiements || !prevMoisKey) return '';

    const absenceNames = ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv'];
    const isAbsence = (name) => absenceNames.some(a => (name || '').toLowerCase().includes(a));
    const prixGasoil = config.prixGasoil || 1.949;
    const consommation = config.consommation || 6.5;

    const curWork = missions.filter(m => !isAbsence(m.etablissement));
    const prevWork = prevMissions.filter(m => !isAbsence(m.etablissement));

    const cur = {
      heures: curWork.reduce((s, m) => s + (m.heuresTravaillees || 0), 0),
      km: curWork.reduce((s, m) => s + (m.km || 0), 0),
      revenus: paiements.reduce((s, p) => s + (p.montant || 0), 0),
      missions: curWork.length
    };
    cur.carburant = (cur.km / 100) * consommation * prixGasoil;

    const prev = {
      heures: prevWork.reduce((s, m) => s + (m.heuresTravaillees || 0), 0),
      km: prevWork.reduce((s, m) => s + (m.km || 0), 0),
      revenus: prevPaiements.reduce((s, p) => s + (p.montant || 0), 0),
      missions: prevWork.length
    };
    prev.carburant = (prev.km / 100) * consommation * prixGasoil;

    const pct = (cur, prev) => {
      if (!prev) return cur > 0 ? '+100' : '0';
      return ((cur - prev) / prev * 100).toFixed(1);
    };

    const row = (label, curVal, prevVal, unit, higherIsBetter) => {
      const diff = curVal - prevVal;
      const p = pct(curVal, prevVal);
      const positive = higherIsBetter ? diff >= 0 : diff <= 0;
      const color = diff === 0 ? 'var(--txt3)' : (positive ? '#22c55e' : '#ef4444');
      const arrow = diff > 0 ? '&#9650;' : (diff < 0 ? '&#9660;' : '');
      return `<tr>
        <td style="font-weight:500">${label}</td>
        <td class="num">${curVal.toFixed(1)}${unit}</td>
        <td class="num">${prevVal.toFixed(1)}${unit}</td>
        <td class="num" style="color:${color};font-weight:600">${arrow} ${p > 0 ? '+' : ''}${p}%</td>
      </tr>`;
    };

    const prevLabel = prevMoisKey.split('-').reverse().join('/');

    return `
      <div class="impot-card" style="margin-top:24px">
        <h3>Comparaison vs meme mois l'an dernier (${prevLabel})</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th></th><th style="text-align:right">Ce mois</th><th style="text-align:right">Meme mois N-1</th><th style="text-align:right">Evolution</th></tr></thead>
            <tbody>
              ${row('Heures', cur.heures, prev.heures, 'h', true)}
              ${row('KM', cur.km, prev.km, '', false)}
              ${row('Revenus', cur.revenus, prev.revenus, ' &euro;', true)}
              ${row('Missions', cur.missions, prev.missions, '', true)}
              ${row('Carburant', cur.carburant, prev.carburant, ' &euro;', false)}
            </tbody>
          </table>
        </div>
      </div>`;
  }
};
