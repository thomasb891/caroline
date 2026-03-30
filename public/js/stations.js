const Stations = {
  async render() {
    // Charger les missions de la semaine en cours
    const now = new Date();
    const lundi = new Date(now);
    lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);

    const moisKey = App.getMoisKey();
    const [data, missions, etabs] = await Promise.all([
      API.get('/api/prix-gasoil/stations'),
      API.missions.list(moisKey),
      API.etablissements.list()
    ]);

    // Missions de cette semaine
    const lundiStr = lundi.toISOString().slice(0, 10);
    const dimancheStr = dimanche.toISOString().slice(0, 10);
    const ABSENCES = ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv', 'stage', 'ecole'];
    const isAbs = (n) => ABSENCES.some(a => (n || '').toLowerCase().includes(a));
    const weekMissions = missions.filter(m => m.date >= lundiStr && m.date <= dimancheStr && !isAbs(m.etablissement));
    const weekEtabs = [...new Set(weekMissions.map(m => m.etablissement))];

    // Determiner les zones de la semaine
    const etabZones = {
      'Royan': ['Issambres', 'Harmonie', 'Aloes', 'Oceane', 'Royan'],
      'Saintes': ['Jardins', 'Clinique', 'Petites', 'Domaine', 'Pervenches', 'Saintes'],
      'Saujon': ['Sud Saintonge', 'Saujon', 'Saint Romain'],
      'St Porchaire': ['Moulin', 'Porchaire'],
      'Floirac': ['Florius']
    };

    const weekZones = new Set();
    weekEtabs.forEach(etab => {
      for (const [zone, keywords] of Object.entries(etabZones)) {
        if (keywords.some(k => etab.toLowerCase().includes(k.toLowerCase()))) {
          weekZones.add(zone);
        }
      }
    });

    const page = document.getElementById('page-stations');

    const trajets = {
      'Trajet Royan': { desc: 'Issambres, Harmonie, Aloes, Oceane', villes: ['Royan', 'Breuillet', 'Saint-Sulpice', 'Arvert', 'Les Mathes', 'Le Gua', 'Saint-Georges'] },
      'Trajet Saintes': { desc: 'Jardins, Clinique, Petites Soeurs', villes: ['Saintes', 'Saint-Savinien'] },
      'Trajet Saujon': { desc: 'Sud Saintonge', villes: ['Saujon', 'Pons'] },
    };

    let zoneCards = '';
    if (data.stations && data.stations.length) {
      for (const [trajet, info] of Object.entries(trajets)) {
        const match = data.stations.filter(s => info.villes.some(v => (s.ville || '').includes(v)));
        if (match.length) {
          const best = match[0];
          const others = match.slice(1, 4);
          zoneCards += `
            <div class="stat-card" style="border-left:4px solid var(--green);margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;align-items:start">
                <div>
                  <div style="font-size:15px;font-weight:700">${trajet}</div>
                  <div style="font-size:11px;color:var(--txt3);margin-bottom:8px">${info.desc}</div>
                  <div style="font-size:13px">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" style="width:14px;height:14px;vertical-align:middle"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${best.nom ? '<strong>' + best.nom + '</strong> - ' : ''}${best.adresse}, ${best.ville}
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:28px;font-weight:700;color:var(--green)">${best.prix}</div>
                  <div style="font-size:11px;color:var(--txt3)">&euro;/L</div>
                </div>
              </div>
              ${others.length ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
                ${others.map(s => `<div style="font-size:11px;color:var(--txt2);padding:2px 0">${s.prix} &euro;/L - ${s.nom ? s.nom + ' - ' : ''}${s.adresse}, ${s.ville}</div>`).join('')}
              </div>` : ''}
            </div>
          `;
        }
      }
    }

    // All stations table
    let allRows = '';
    if (data.stations) {
      allRows = data.stations.map((s, i) => `
        <tr${i === 0 ? ' style="color:var(--green);font-weight:600"' : ''}>
          <td style="font-size:12px">${s.nom || '-'}</td>
          <td style="font-size:12px">${s.adresse}, ${s.ville}</td>
          <td class="num" style="font-size:13px;font-weight:600">${s.prix} &euro;/L</td>
          <td style="font-size:10px;color:var(--txt3)">${s.maj ? new Date(s.maj).toLocaleDateString('fr-FR') : ''}</td>
        </tr>
      `).join('');
    }

    const maj = data.maj ? new Date(data.maj).toLocaleDateString('fr-FR') + ' ' + new Date(data.maj).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) : 'jamais';

    // Section "Cette semaine" - stations recommandees
    let weekHTML = '';
    if (weekMissions.length > 0 && data.stations) {
      const joursFR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      let weekDetails = weekMissions.map(m => {
        const d = new Date(m.date + 'T00:00:00');
        return `<span style="background:var(--card);padding:2px 8px;border-radius:12px;font-size:11px">${joursFR[d.getDay()]} ${d.getDate()} - ${m.etablissement}</span>`;
      }).join(' ');

      let weekStations = '';
      for (const zone of weekZones) {
        const villeMap = {
          'Royan': ['Royan', 'Les Mathes', 'Arvert', 'Le Gua', 'Saint-Georges', 'Breuillet'],
          'Saintes': ['Saintes', 'Saint-Savinien'],
          'Saujon': ['Saujon', 'Pons'],
          'St Porchaire': ['Saint-Porchaire'],
          'Floirac': ['Floirac']
        };
        const villes = villeMap[zone] || [];
        const match = data.stations.filter(s => villes.some(v => (s.ville || '').includes(v)));
        if (match.length) {
          weekStations += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-size:13px;font-weight:600">Direction ${zone}</div>
                <div style="font-size:11px;color:var(--txt2)">${match[0].adresse}, ${match[0].ville}</div>
              </div>
              <div style="font-size:20px;font-weight:700;color:var(--green)">${match[0].prix} &euro;</div>
            </div>`;
        }
      }

      weekHTML = `
        <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:16px;margin-bottom:20px">
          <div style="font-size:15px;font-weight:700;color:var(--green);margin-bottom:8px">Cette semaine</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">${weekDetails}</div>
          ${weekStations || '<div style="font-size:12px;color:var(--txt3)">Pas de station trouvee pour ces trajets</div>'}
        </div>
      `;
    } else if (weekMissions.length === 0) {
      weekHTML = '<div style="background:var(--card);border-radius:12px;padding:16px;margin-bottom:20px;color:var(--txt3);font-size:13px">Pas de mission cette semaine</div>';
    }

    page.innerHTML = `
      <div class="section-header" style="margin-bottom:16px">
        <h2 class="section-title">Stations essence</h2>
        <button class="btn btn-sm btn-primary" id="refreshStations">Actualiser</button>
      </div>

      ${weekHTML}

      <p style="font-size:12px;color:var(--txt3);margin-bottom:16px">MAJ : ${maj} - prix-carburants.gouv.fr (auto toutes les 6h)</p>

      ${zoneCards || '<div class="empty-state"><p>Aucune station trouvee</p></div>'}

      <div class="section-header" style="margin-top:24px;margin-bottom:12px">
        <h2 class="section-title">Toutes les stations (50km)</h2>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Enseigne</th><th>Adresse</th><th style="text-align:right">Gazole</th><th>MAJ</th></tr></thead>
        <tbody>${allRows}</tbody>
      </table></div>
      <div style="text-align:center;padding:20px;font-size:11px;color:var(--txt3)">&copy; Thomas</div>
    `;

    document.getElementById('refreshStations').onclick = async () => {
      document.getElementById('refreshStations').textContent = 'Chargement...';
      document.getElementById('refreshStations').disabled = true;
      await API.post('/api/prix-gasoil/refresh', {});
      App.toast('Prix mis a jour');
      this.render();
    };
  }
};
