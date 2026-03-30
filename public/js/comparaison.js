const Comparaison = {
  currentYear: new Date().getFullYear(),

  async render() {
    const annee = this.currentYear.toString();
    const [paiements, etabs, saved] = await Promise.all([
      API.paiements.listAnnee(annee),
      API.etablissements.list(),
      API.comparaison.get(annee)
    ]);

    // Group paiements by etablissement (Hublo amounts)
    const hubloByEtab = {};
    paiements.forEach(p => {
      const key = p.etablissement || 'Inconnu';
      if (!hubloByEtab[key]) hubloByEtab[key] = 0;
      hubloByEtab[key] += (p.montant || 0);
    });

    // Merge with saved data
    const savedMap = {};
    if (saved && saved.lignes) {
      saved.lignes.forEach(l => { savedMap[l.etablissement] = l.montantFiche || 0; });
    }

    const allEtabs = [...new Set([...Object.keys(hubloByEtab), ...etabs.map(e => e.nom)])].sort();

    let totalHublo = 0;
    let totalFiche = 0;

    const rows = allEtabs.map(etab => {
      const hublo = hubloByEtab[etab] || 0;
      const fiche = savedMap[etab] || 0;
      const ecart = Math.abs(hublo - fiche);
      const hasEcart = fiche > 0 && ecart > 0.01;
      totalHublo += hublo;
      totalFiche += fiche;

      return `<tr>
        <td style="font-weight:500">${etab}</td>
        <td class="num">${hublo.toFixed(2)} &euro;</td>
        <td><input type="number" step="0.01" class="form-input comp-fiche" data-etab="${etab}" value="${fiche || ''}" placeholder="0.00" style="width:120px;padding:6px 8px;font-size:13px;text-align:right"></td>
        <td class="num" style="${hasEcart ? 'color:var(--red);font-weight:700' : 'color:var(--green)'}">${fiche > 0 ? ecart.toFixed(2) + ' &euro;' : '-'}</td>
      </tr>`;
    }).join('');

    const totalEcart = Math.abs(totalHublo - totalFiche);

    const page = document.getElementById('page-comparaison');
    page.innerHTML = `
      <div class="section-header" style="margin-bottom:16px">
        <h2 class="section-title">Comparaison Hublo / Fiche Impots - ${annee}</h2>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn-icon" id="compPrevYear"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
          <span style="font-weight:600;font-size:14px">${annee}</span>
          <button class="btn-icon" id="compNextYear"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
      </div>
      <p style="font-size:13px;color:var(--txt2);margin-bottom:16px">Saisissez les montants de votre fiche d'impots pour comparer avec les donnees Hublo.</p>

      <div class="table-wrap"><table>
        <thead><tr>
          <th>Etablissement</th>
          <th>Montant Hublo</th>
          <th>Montant Fiche Impots</th>
          <th>Ecart</th>
        </tr></thead>
        <tbody>${rows}
          <tr style="font-weight:700;border-top:2px solid var(--border)">
            <td>TOTAL</td>
            <td class="num">${totalHublo.toFixed(2)} &euro;</td>
            <td class="num" id="compTotalFiche">${totalFiche > 0 ? totalFiche.toFixed(2) + ' &euro;' : '-'}</td>
            <td class="num" id="compTotalEcart" style="${totalFiche > 0 && totalEcart > 0.01 ? 'color:var(--red);font-weight:700' : 'color:var(--green)'}">${totalFiche > 0 ? totalEcart.toFixed(2) + ' &euro;' : '-'}</td>
          </tr>
        </tbody>
      </table></div>

      <div style="margin-top:16px;display:flex;justify-content:flex-end">
        <button class="btn btn-primary" id="compSave">Sauvegarder</button>
      </div>
    `;

    // Year navigation
    document.getElementById('compPrevYear').onclick = () => { this.currentYear--; this.render(); };
    document.getElementById('compNextYear').onclick = () => { this.currentYear++; this.render(); };

    // Live ecart calculation on input change
    page.querySelectorAll('.comp-fiche').forEach(input => {
      input.addEventListener('input', () => {
        this.updateEcarts(allEtabs, hubloByEtab);
      });
    });

    // Save
    document.getElementById('compSave').onclick = async () => {
      const lignes = [];
      page.querySelectorAll('.comp-fiche').forEach(input => {
        const val = parseFloat(input.value) || 0;
        if (val > 0) {
          lignes.push({ etablissement: input.dataset.etab, montantFiche: val });
        }
      });
      await API.comparaison.save({ annee, lignes });
      App.toast('Comparaison sauvegardee');
    };
  },

  updateEcarts(allEtabs, hubloByEtab) {
    const page = document.getElementById('page-comparaison');
    let totalFiche = 0;
    let totalHublo = 0;

    page.querySelectorAll('.comp-fiche').forEach(input => {
      const etab = input.dataset.etab;
      const hublo = hubloByEtab[etab] || 0;
      const fiche = parseFloat(input.value) || 0;
      totalHublo += hublo;
      totalFiche += fiche;

      // Update the ecart cell (4th td in same row)
      const row = input.closest('tr');
      const ecartCell = row.querySelectorAll('td')[3];
      const ecart = Math.abs(hublo - fiche);
      const hasEcart = fiche > 0 && ecart > 0.01;
      ecartCell.style.color = hasEcart ? 'var(--red)' : 'var(--green)';
      ecartCell.style.fontWeight = hasEcart ? '700' : '';
      ecartCell.textContent = fiche > 0 ? ecart.toFixed(2) + ' \u20ac' : '-';
    });

    const totalEcart = Math.abs(totalHublo - totalFiche);
    const tfEl = document.getElementById('compTotalFiche');
    const teEl = document.getElementById('compTotalEcart');
    if (tfEl) tfEl.textContent = totalFiche > 0 ? totalFiche.toFixed(2) + ' \u20ac' : '-';
    if (teEl) {
      teEl.textContent = totalFiche > 0 ? totalEcart.toFixed(2) + ' \u20ac' : '-';
      teEl.style.color = totalFiche > 0 && totalEcart > 0.01 ? 'var(--red)' : 'var(--green)';
      teEl.style.fontWeight = totalFiche > 0 && totalEcart > 0.01 ? '700' : '';
    }
  }
};
