const Stations = {
  async render() {
    const data = await API.get('/api/prix-gasoil/stations');
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
                    ${best.adresse}, ${best.ville}
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:28px;font-weight:700;color:var(--green)">${best.prix}</div>
                  <div style="font-size:11px;color:var(--txt3)">&euro;/L</div>
                </div>
              </div>
              ${others.length ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
                ${others.map(s => `<div style="font-size:11px;color:var(--txt2);padding:2px 0">${s.prix} &euro;/L - ${s.adresse}, ${s.ville}</div>`).join('')}
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
          <td style="font-size:12px">${s.ville}</td>
          <td style="font-size:12px">${s.adresse}</td>
          <td class="num" style="font-size:13px;font-weight:600">${s.prix} &euro;/L</td>
          <td style="font-size:10px;color:var(--txt3)">${s.maj ? new Date(s.maj).toLocaleDateString('fr-FR') : ''}</td>
        </tr>
      `).join('');
    }

    const maj = data.maj ? new Date(data.maj).toLocaleDateString('fr-FR') + ' ' + new Date(data.maj).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) : 'jamais';

    page.innerHTML = `
      <div class="section-header" style="margin-bottom:16px">
        <h2 class="section-title">Stations essence</h2>
        <button class="btn btn-sm btn-primary" id="refreshStations">Actualiser les prix</button>
      </div>
      <p style="font-size:12px;color:var(--txt3);margin-bottom:16px">Derniere MAJ : ${maj} - Source : prix-carburants.gouv.fr (MAJ auto toutes les 6h)</p>

      ${zoneCards || '<div class="empty-state"><p>Aucune station trouvee</p></div>'}

      <div class="section-header" style="margin-top:24px;margin-bottom:12px">
        <h2 class="section-title">Toutes les stations (50km)</h2>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Ville</th><th>Station</th><th style="text-align:right">Gazole</th><th>MAJ</th></tr></thead>
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
