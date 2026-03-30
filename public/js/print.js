const Print = {
  ABSENCES: ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv'],
  isAbsence(name) { return this.ABSENCES.some(a => (name || '').toLowerCase().includes(a)); },

  formatDateFR(d) {
    if (!d) return '-';
    const p = d.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  },

  openPrintWindow(title, content) {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; line-height: 1.4; }
  .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
  .header h1 { font-size: 20px; margin-bottom: 2px; }
  .header p { font-size: 11px; color: #444; }
  .footer { text-align: center; font-size: 9px; color: #888; margin-top: 20px; padding-top: 8px; border-top: 1px solid #ccc; }

  /* Calendar */
  .cal-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .cal-table th { background: #222; color: #fff; padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 700; }
  .cal-table td { border: 1px solid #999; padding: 4px; vertical-align: top; height: 62px; width: 14.28%; font-size: 10px; }
  .cal-table td.empty { background: #f5f5f5; border-color: #ddd; }
  .cal-table td.worked { background: #e8f5e9; }
  .cal-table td.absence { background: #f3e8ff; }
  .cal-table td.weekend { background: #f9f9f9; }
  .day-num { font-weight: 700; font-size: 12px; margin-bottom: 2px; }
  .mission-name { font-size: 9px; color: #333; }
  .mission-hours { font-size: 9px; font-weight: 700; }
  .absence-name { font-size: 9px; color: #7c3aed; font-style: italic; }

  /* Stats bar */
  .stats-bar { display: flex; justify-content: space-between; margin-bottom: 14px; border: 2px solid #000; border-radius: 4px; overflow: hidden; }
  .stats-bar .stat { flex: 1; text-align: center; padding: 8px 4px; border-right: 1px solid #ccc; }
  .stats-bar .stat:last-child { border-right: none; }
  .stats-bar .stat-label { font-size: 8px; text-transform: uppercase; color: #666; font-weight: 700; letter-spacing: 0.5px; }
  .stats-bar .stat-val { font-size: 16px; font-weight: 700; margin-top: 2px; }

  /* Impots tables */
  .section-title { font-size: 14px; font-weight: 700; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #000; }
  table.data { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.data th { background: #eee; border: 1px solid #999; padding: 5px 8px; text-align: left; font-size: 10px; font-weight: 700; }
  table.data td { border: 1px solid #ccc; padding: 4px 8px; font-size: 10px; }
  table.data td.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.data tr.total { font-weight: 700; background: #f0f0f0; }
  table.data tr.total td { border-top: 2px solid #000; }
  .two-col { display: flex; gap: 16px; }
  .two-col > div { flex: 1; }

  /* Resume box */
  .resume-box { border: 3px solid #000; border-radius: 6px; padding: 14px; margin-top: 16px; }
  .resume-box h3 { font-size: 13px; margin-bottom: 10px; text-align: center; }
  .resume-row { display: flex; justify-content: space-between; padding: 6px 0; }
  .resume-row.total { border-top: 2px solid #000; margin-top: 6px; padding-top: 8px; font-size: 14px; }
  .resume-label { color: #444; }
  .resume-val { font-weight: 700; }

  /* Verification */
  .check-box { display: inline-block; width: 12px; height: 12px; border: 2px solid #000; margin-right: 6px; vertical-align: middle; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
${content}
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`);
    w.document.close();
  },

  async printPlanning() {
    const moisKey = App.getMoisKey();
    const [missions, etabs] = await Promise.all([
      API.missions.list(moisKey),
      API.etablissements.list()
    ]);

    const d = App.currentDate;
    const year = d.getFullYear();
    const month = d.getMonth();
    const moisLabel = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7;

    const workMissions = missions.filter(m => !this.isAbsence(m.etablissement));
    const totalH = workMissions.reduce((s, m) => s + (m.heuresTravaillees || 0), 0);
    const totalKm = workMissions.reduce((s, m) => s + (m.km || 0), 0);

    // Build calendar rows
    let cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push('<td class="empty"></td>');

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayM = missions.filter(m => m.date === dateStr);
      const weekday = (new Date(year, month, day).getDay() + 6) % 7;
      const isWE = weekday >= 5;
      const hasWork = dayM.some(m => !this.isAbsence(m.etablissement));
      const hasAbs = dayM.some(m => this.isAbsence(m.etablissement));

      let cls = hasWork ? 'worked' : hasAbs ? 'absence' : isWE ? 'weekend' : '';
      let content = `<div class="day-num">${day}</div>`;
      dayM.forEach(m => {
        const abs = this.isAbsence(m.etablissement);
        const name = m.etablissement || '';
        const short = name.length > 25 ? name.slice(0, 24) + '...' : name;
        if (abs) {
          content += `<div class="absence-name">${short}</div>`;
        } else {
          const h = m.heuresTravaillees ? m.heuresTravaillees.toFixed(1) + 'h' : '';
          content += `<div class="mission-name">${short} <span class="mission-hours">${h}</span></div>`;
        }
      });
      cells.push(`<td class="${cls}">${content}</td>`);
    }
    // Fill end of last week
    while (cells.length % 7 !== 0) cells.push('<td class="empty"></td>');

    let calRows = '';
    for (let i = 0; i < cells.length; i += 7) {
      calRows += '<tr>' + cells.slice(i, i + 7).join('') + '</tr>';
    }

    const html = `
      <div class="header">
        <h1>Planning - ${moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1)}</h1>
        <p>Caroline - Missions Hublo</p>
      </div>
      <div class="stats-bar">
        <div class="stat"><div class="stat-label">Missions</div><div class="stat-val">${workMissions.length}</div></div>
        <div class="stat"><div class="stat-label">Heures</div><div class="stat-val">${totalH.toFixed(1)}h</div></div>
        <div class="stat"><div class="stat-label">Kilometres</div><div class="stat-val">${totalKm.toFixed(0)} km</div></div>
        <div class="stat"><div class="stat-label">Jours travailles</div><div class="stat-val">${workMissions.length}</div></div>
      </div>
      <table class="cal-table">
        <thead><tr><th>Lundi</th><th>Mardi</th><th>Mercredi</th><th>Jeudi</th><th>Vendredi</th><th>Samedi</th><th>Dimanche</th></tr></thead>
        <tbody>${calRows}</tbody>
      </table>
      <div class="footer">Document genere le ${new Date().toLocaleDateString('fr-FR')} - Hublo Gestion</div>
    `;

    this.openPrintWindow(`Planning ${moisLabel}`, html);
  },

  async printImpots() {
    const annee = Impots.currentYear.toString();
    const [stats, paiements, etablissements] = await Promise.all([
      API.stats.annuel(annee),
      API.paiements.listAnnee(annee),
      API.etablissements.list()
    ]);

    const moisNoms = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

    // Revenus par mois
    let revRows = '';
    moisNoms.forEach((nom, i) => {
      const key = `${annee}-${String(i + 1).padStart(2, '0')}`;
      const d = stats.moisData[key] || { revenus: 0 };
      revRows += `<tr><td>${nom}</td><td class="num">${d.revenus.toFixed(2)} &euro;</td></tr>`;
    });
    revRows += `<tr class="total"><td>Total</td><td class="num">${stats.totalRevenus.toFixed(2)} &euro;</td></tr>`;

    // KM par mois
    let kmRows = '';
    moisNoms.forEach((nom, i) => {
      const key = `${annee}-${String(i + 1).padStart(2, '0')}`;
      const d = stats.moisData[key] || { km: 0, nbMissions: 0 };
      kmRows += `<tr><td>${nom}</td><td class="num">${d.nbMissions}</td><td class="num">${d.km.toFixed(0)} km</td></tr>`;
    });
    kmRows += `<tr class="total"><td>Total</td><td class="num"></td><td class="num">${stats.totalKm.toFixed(0)} km</td></tr>`;

    // Verification par etablissement
    const byEtab = {};
    paiements.forEach(p => {
      const key = p.etablissement || 'Inconnu';
      if (!byEtab[key]) byEtab[key] = [];
      byEtab[key].push(p);
    });
    let verifRows = '';
    let totalPaie = 0;
    Object.keys(byEtab).filter(etab => byEtab[etab].length > 0).sort().forEach(etab => {
      const list = byEtab[etab];
      const total = list.reduce((s, p) => s + (p.montant || 0), 0);
      totalPaie += total;
      const sorted = [...list].sort((a, b) => (b.dateVersement || '').localeCompare(a.dateVersement || ''));
      const last = sorted[0];
      verifRows += `<tr>
        <td><span class="check-box"></span></td>
        <td>${etab}</td>
        <td class="num">${list.length}</td>
        <td class="num">${total > 0 ? total.toFixed(2) + ' &euro;' : '-'}</td>
        <td class="num">${last ? this.formatDateFR(last.dateVersement) : '-'}</td>
        <td class="num">${last ? last.montant.toFixed(2) + ' &euro;' : '-'}</td>
      </tr>`;
    });
    verifRows += `<tr class="total"><td></td><td>TOTAL</td><td class="num">${paiements.length}</td><td class="num">${totalPaie.toFixed(2)} &euro;</td><td></td><td></td></tr>`;

    const fraisKm = stats.fraisKm;
    const netImposable = stats.totalRevenus - fraisKm;

    const html = `
      <div class="header">
        <h1>Declaration des revenus ${annee}</h1>
        <p>Caroline - Missions Hublo (Interim)</p>
      </div>

      <div class="two-col">
        <div>
          <div class="section-title">Revenus annuels</div>
          <table class="data">
            <thead><tr><th>Mois</th><th style="text-align:right">Montant net</th></tr></thead>
            <tbody>${revRows}</tbody>
          </table>
        </div>
        <div>
          <div class="section-title">Frais kilometriques</div>
          <p style="font-size:9px;color:#666;margin-bottom:6px">Puissance fiscale : ${stats.config.puissanceFiscale} CV - Bareme : ${stats.config.baremeKm} &euro;/km</p>
          <table class="data">
            <thead><tr><th>Mois</th><th style="text-align:right">Missions</th><th style="text-align:right">KM</th></tr></thead>
            <tbody>${kmRows}</tbody>
          </table>
          <p style="font-size:10px;margin-top:4px"><strong>Frais deductibles : ${fraisKm.toFixed(2)} &euro;</strong> (${stats.totalKm.toFixed(0)} km x ${stats.config.baremeKm} &euro;)</p>
        </div>
      </div>

      <div class="resume-box">
        <h3>Resume pour la declaration d'impots ${annee}</h3>
        <div class="resume-row"><span class="resume-label">Revenus nets percus</span><span class="resume-val">${stats.totalRevenus.toFixed(2)} &euro;</span></div>
        <div class="resume-row"><span class="resume-label">Frais kilometriques deductibles</span><span class="resume-val">- ${fraisKm.toFixed(2)} &euro;</span></div>
        <div class="resume-row total"><span class="resume-label">Net imposable</span><span class="resume-val">${netImposable.toFixed(2)} &euro;</span></div>
      </div>

      <div class="section-title">Verification des fiches de paie par etablissement</div>
      <table class="data">
        <thead><tr><th style="width:30px">OK</th><th>Etablissement</th><th style="text-align:right">Nb fiches</th><th style="text-align:right">Total</th><th style="text-align:right">Derniere</th><th style="text-align:right">Montant</th></tr></thead>
        <tbody>${verifRows}</tbody>
      </table>

      <div class="footer">Document genere le ${new Date().toLocaleDateString('fr-FR')} - Hublo Gestion</div>
    `;

    this.openPrintWindow(`Impots ${annee} - Caroline`, html);
  }
};
