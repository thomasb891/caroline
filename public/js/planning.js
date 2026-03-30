const ABSENCE_NAMES = ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv'];

function etabColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

// --- Jours feries francais ---
function getEasterMonday(year) {
  // Algorithme de Meeus/Jones/Butcher pour le dimanche de Paques
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  // Dimanche de Paques
  const easter = new Date(year, month - 1, day);
  // Lundi de Paques = +1
  easter.setDate(easter.getDate() + 1);
  return easter;
}

function getJoursFeries(year) {
  const feries = {};
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Jours fixes
  feries[`${year}-01-01`] = 'Jour de l\'An';
  feries[`${year}-05-01`] = 'Fete du Travail';
  feries[`${year}-05-08`] = 'Victoire 1945';
  feries[`${year}-07-14`] = 'Fete nationale';
  feries[`${year}-08-15`] = 'Assomption';
  feries[`${year}-11-01`] = 'Toussaint';
  feries[`${year}-11-11`] = 'Armistice';
  feries[`${year}-12-25`] = 'Noel';

  // Jours mobiles bases sur Paques
  const easterMonday = getEasterMonday(year);
  feries[fmt(easterMonday)] = 'Lundi de Paques';

  // Ascension = Paques + 39 jours (depuis le dimanche, donc lundi +38)
  const ascension = new Date(easterMonday.getTime());
  ascension.setDate(easterMonday.getDate() + 38);
  feries[fmt(ascension)] = 'Ascension';

  // Lundi de Pentecote = Paques + 50 jours (depuis le dimanche, donc lundi +49)
  const pentecote = new Date(easterMonday.getTime());
  pentecote.setDate(easterMonday.getDate() + 49);
  feries[fmt(pentecote)] = 'Lundi de Pentecote';

  return feries;
}

const Planning = {
  missions: [],
  etablissements: [],

  vacances: [],

  async render() {
    const moisKey = App.getMoisKey();
    const [missions, etabs, vacances, config, prixMois, notifications] = await Promise.all([
      API.missions.list(moisKey),
      API.etablissements.list(),
      API.vacances.list(moisKey),
      API.config.get(),
      API.prixGasoil.getForMonth(App.getMoisKey()),
      API.notifications.list().catch(() => [])
    ]);
    this.missions = missions;
    this.etablissements = etabs;
    this.vacances = vacances;

    const display = document.getElementById('monthDisplay');
    if (display) display.textContent = App.getMoisLabel();

    this._isAbsence = (name) => ABSENCE_NAMES.some(a => (name || '').toLowerCase().includes(a));
    const isAbsence = this._isAbsence;
    const workMissions = missions.filter(m => !isAbsence(m.etablissement));

    const totalH = workMissions.reduce((s, m) => s + (m.heuresTravaillees || 0), 0);
    const totalKm = workMissions.reduce((s, m) => s + (m.km || 0), 0);

    // Estimation salaire par etablissement (taux/IFC/CP propres a chaque etab)
    const etabMap = {};
    etabs.forEach(e => { etabMap[e.nom] = e; });
    let estimTotal = 0;
    let salaireBase = 0;
    let totalIFC = 0;
    let totalCP = 0;
    let totalPrimes = 0;
    workMissions.forEach(m => {
      const e = etabMap[m.etablissement];
      const taux = e && e.tauxHoraire ? e.tauxHoraire : 0;
      const hDebut = parseInt((m.heureDebut || '08:00').split(':')[0]);
      const estNuit = m.horaire === 'nuit' || (hDebut >= 21 || hDebut < 6);
      const primeNuit = (estNuit && e && e.primeNuit) ? e.primeNuit : 0;
      // Dimanche : detecte par le jour de la semaine
      const estDim = m.date ? new Date(m.date + 'T00:00:00').getDay() === 0 : false;
      const primeDim = (estDim && e && e.primeDimanche) ? e.primeDimanche : 0;
      const ifcPct = e && e.ifc ? e.ifc : 0;
      const cpPct = e && e.cp ? e.cp : 0;
      const heures = m.heuresTravaillees || 0;
      const base = heures * taux + heures * primeNuit + heures * primeDim;
      totalPrimes += heures * primeNuit + heures * primeDim;
      const ifc = base * ifcPct / 100;
      const cp = (base + ifc) * cpPct / 100;
      salaireBase += base;
      totalIFC += ifc;
      totalCP += cp;
      estimTotal += base + ifc + cp;
    });

    const page = document.getElementById('page-planning');
    page.innerHTML = `
      <div id="planningLastUpdated" style="text-align:right;font-size:11px;color:var(--txt3);margin-bottom:4px"></div>
      <div class="print-header" style="display:none">
        <h1>Planning - ${App.getMoisLabel()}</h1>
        <p>Caroline - Missions Hublo</p>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px">
        <button class="btn-print" id="btnVacances">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          Vacances
        </button>
        <button class="btn-print" id="btnExportICS">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Exporter calendrier
        </button>
        <button class="btn-print" onclick="Print.openPrintChoice()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimer
        </button>
      </div>
      <div class="cards-row">
        <div class="stat-card accent">
          <div class="label">Missions</div>
          <div class="value">${missions.length}</div>
        </div>
        <div class="stat-card blue">
          <div class="label">Heures</div>
          <div class="value">${totalH.toFixed(1)}h</div>
        </div>
        <div class="stat-card green">
          <div class="label">Estimation salaire</div>
          <div class="value">${estimTotal.toFixed(2)} &euro;</div>
          <div class="sub">Base ${salaireBase.toFixed(0)}&euro;${totalPrimes > 0 ? ' (dont primes ' + totalPrimes.toFixed(0) + '&euro;)' : ''} + IFC ${totalIFC.toFixed(0)}&euro; + CP ${totalCP.toFixed(0)}&euro;</div>
        </div>
        <div class="stat-card orange">
          <div class="label">Kilometres</div>
          <div class="value">${totalKm.toFixed(0)} km</div>
          <div class="sub">Carburant : ${(totalKm / 100 * (config.consommation || 6.5) * prixMois).toFixed(2)} &euro; (${prixMois.toFixed(3)}&euro;/L)</div>
        </div>
      </div>
      <div id="estimEtabSection" style="margin-bottom:16px;display:${workMissions.length ? 'block' : 'none'}">
        <div id="estimEtabToggle" style="cursor:pointer;display:flex;align-items:center;gap:6px;padding:8px 0;font-size:13px;font-weight:600;color:var(--txt2)">
          <span id="estimEtabIcon" style="display:inline-block;width:12px;transition:transform 0.2s">&#9654;</span>
          Estimation par etablissement
        </div>
        <div id="estimEtabContent" style="display:none">
          ${(() => {
            const byEtab = {};
            workMissions.forEach(m => {
              const nom = m.etablissement || '?';
              if (!byEtab[nom]) byEtab[nom] = { heures: 0, base: 0, primeNuit: 0, primeDim: 0, ifc: 0, cp: 0, total: 0, taux: 0 };
              const e = etabMap[nom];
              const taux = e && e.tauxHoraire ? e.tauxHoraire : 0;
              const hDebut = parseInt((m.heureDebut || '08:00').split(':')[0]);
              const estNuit = m.horaire === 'nuit' || (hDebut >= 21 || hDebut < 6);
              const pNuit = (estNuit && e && e.primeNuit) ? e.primeNuit : 0;
              const estDim = m.date ? new Date(m.date + 'T00:00:00').getDay() === 0 : false;
              const pDim = (estDim && e && e.primeDimanche) ? e.primeDimanche : 0;
              const ifcPct = e && e.ifc ? e.ifc : 0;
              const cpPct = e && e.cp ? e.cp : 0;
              const heures = m.heuresTravaillees || 0;
              const base = heures * taux;
              const primeN = heures * pNuit;
              const primeD = heures * pDim;
              const baseTotal = base + primeN + primeD;
              const ifc = baseTotal * ifcPct / 100;
              const cp = (baseTotal + ifc) * cpPct / 100;
              byEtab[nom].heures += heures;
              byEtab[nom].taux = taux;
              byEtab[nom].base += base;
              byEtab[nom].primeNuit += primeN;
              byEtab[nom].primeDim += primeD;
              byEtab[nom].ifc += ifc;
              byEtab[nom].cp += cp;
              byEtab[nom].total += baseTotal + ifc + cp;
            });
            return '<div class="table-wrap"><table style="font-size:13px"><thead><tr><th>Etablissement</th><th>Heures</th><th>Taux</th><th>Primes</th><th>IFC</th><th>CP</th><th>Total</th></tr></thead><tbody>' +
              Object.entries(byEtab).sort((a,b) => b[1].total - a[1].total).map(([nom, d]) => {
                const primes = d.primeNuit + d.primeDim;
                const primesDetail = [];
                if (d.primeNuit > 0) primesDetail.push('nuit ' + d.primeNuit.toFixed(0) + '\u20ac');
                if (d.primeDim > 0) primesDetail.push('dim ' + d.primeDim.toFixed(0) + '\u20ac');
                const primesText = primes > 0 ? primes.toFixed(2) + ' \u20ac' : '-';
                const primesTitle = primesDetail.length ? primesDetail.join(' + ') : '';
                return '<tr>' +
                  '<td style="font-weight:500"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + etabColor(nom) + ';margin-right:6px"></span>' + nom + '</td>' +
                  '<td class="num">' + d.heures.toFixed(1) + 'h</td>' +
                  '<td class="num">' + d.taux.toFixed(2) + ' \u20ac/h</td>' +
                  '<td class="num" title="' + primesTitle + '">' + primesText + '</td>' +
                  '<td class="num">' + d.ifc.toFixed(2) + ' \u20ac</td>' +
                  '<td class="num">' + d.cp.toFixed(2) + ' \u20ac</td>' +
                  '<td class="num" style="font-weight:600">' + d.total.toFixed(2) + ' \u20ac</td>' +
                '</tr>';
              }).join('') +
            '</tbody></table></div>';
          })()}
        </div>
      </div>
      <div id="notificationsBox"></div>
      <div class="calendar-grid" id="calGrid"></div>
      <div style="text-align:center;padding:20px;font-size:11px;color:var(--txt3)">&copy; Thomas</div>
    `;
    document.getElementById('btnVacances').onclick = () => this.openVacancesModal();
    const estimToggle = document.getElementById('estimEtabToggle');
    if (estimToggle) {
      estimToggle.onclick = () => {
        const content = document.getElementById('estimEtabContent');
        const icon = document.getElementById('estimEtabIcon');
        const visible = content.style.display !== 'none';
        content.style.display = visible ? 'none' : 'block';
        icon.style.transform = visible ? '' : 'rotate(90deg)';
      };
    }
    document.getElementById('btnExportICS').onclick = () => {
      window.open(API_BASE + '/api/export/ics?mois=' + App.getMoisKey());
    };

    // Notifications fiches de paie manquantes
    if (notifications && notifications.length > 0) {
      const notifBox = document.getElementById('notificationsBox');
      const items = notifications.map(n =>
        `<div style="padding:4px 0;font-size:13px">Fiche de paie manquante : <strong>${n.etablissement}</strong> - ${n.moisLabel} (il y a ${n.daysSince} jours)</div>`
      ).join('');
      notifBox.innerHTML = `
        <div style="background:rgba(255,193,7,0.15);border:1px solid rgba(255,193,7,0.4);border-radius:8px;padding:10px 16px;margin-bottom:16px;cursor:pointer" id="notifToggle">
          <div style="display:flex;align-items:center;gap:8px">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f0ad4e" stroke-width="2" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style="font-weight:600;color:#f0ad4e;font-size:13px">${notifications.length} fiche(s) de paie manquante(s)</span>
            <span style="margin-left:auto;font-size:11px;color:var(--txt3)">Cliquer pour voir</span>
          </div>
          <div id="notifDetails" style="display:none;margin-top:8px">${items}</div>
        </div>
      `;
      document.getElementById('notifToggle').onclick = () => {
        const d = document.getElementById('notifDetails');
        d.style.display = d.style.display === 'none' ? 'block' : 'none';
      };
    }

    this.renderCalendar();
    this.loadLastUpdated();
  },

  async loadLastUpdated() {
    try {
      const log = await API.logs.lastForSection('missions');
      const el = document.getElementById('planningLastUpdated');
      if (el && log) {
        const d = new Date(log.timestamp);
        el.textContent = `Derniere maj: ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      }
    } catch(e) {}
  },

  renderCalendar() {
    const grid = document.getElementById('calGrid');
    const d = App.currentDate;
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7; // lundi=0
    const today = new Date();

    const joursFeries = getJoursFeries(year);

    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    let html = days.map(d => `<div class="cal-day-name">${d}</div>`).join('');

    for (let i = 0; i < startWeekday; i++) {
      html += '<div class="cal-day empty"></div>';
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayMissions = this.missions.filter(m => m.date === dateStr);
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      const weekday = (new Date(year, month, day).getDay() + 6) % 7;
      const isWeekend = weekday >= 5;
      const jourFerie = joursFeries[dateStr] || null;

      const hasWork = dayMissions.some(m => !this._isAbsence(m.etablissement));
      const hasAbsence = dayMissions.some(m => this._isAbsence(m.etablissement));
      const dayVacances = this.vacances.filter(v => dateStr >= v.dateDebut && dateStr <= v.dateFin);
      const isVacances = dayVacances.length > 0;

      let cls = 'cal-day';
      if (isToday) cls += ' today';
      if (hasWork) cls += ' has-mission';
      else if (isVacances) cls += ' has-vacances';
      else if (hasAbsence) cls += ' has-absence';
      if (isWeekend) cls += ' day-weekend';
      if (jourFerie) cls += ' jour-ferie';

      let chips = '';
      if (jourFerie) {
        chips += `<div class="ferie-label">${jourFerie}</div>`;
      }
      if (isVacances && !hasWork) {
        chips += dayVacances.map(v => `<div class="mission-chip vacances">${v.motif || 'Vacances'}</div>`).join('');
      }
      chips += dayMissions.map(m => {
        const name = m.etablissement || '?';
        const short = name.length > 15 ? name.slice(0, 14) + '...' : name;
        const isStage = name.toLowerCase().includes('stage');
        const absent = this._isAbsence(name);
        const hours = m.heuresTravaillees && !absent ? `${m.heuresTravaillees.toFixed(1)}h` : '';
        const hd = parseInt((m.heureDebut || '08:00').split(':')[0]);
        const isNuit = m.horaire === 'nuit' || (hd >= 21 || hd < 6);
        const color = etabColor(name);
        const borderStyle = !isStage && !absent ? `border-left:3px solid ${color};` : '';
        const dot = !isStage && !absent ? `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${color};margin-right:3px;flex-shrink:0"></span>` : '';
        const nuitBadge = isNuit ? '<span style="font-size:8px;background:var(--blue-bg);color:var(--blue);padding:0 3px;border-radius:3px;margin-left:2px">N</span>' : '';
        return `<div class="mission-chip${isStage ? ' stage' : ''}${absent ? ' absence' : ''}" data-id="${m.id}" style="${borderStyle}">${dot}${short}${hours ? `<span class="chip-hours"> ${hours}</span>` : ''}${nuitBadge}</div>`;
      }).join('');

      html += `<div class="${cls}" data-date="${dateStr}">
        <div class="day-num">${day}</div>
        ${chips}
      </div>`;
    }

    grid.innerHTML = html;

    grid.querySelectorAll('.cal-day:not(.empty)').forEach(el => {
      el.addEventListener('click', e => {
        const chipEl = e.target.closest('.mission-chip');
        if (chipEl) {
          const mission = this.missions.find(m => m.id === chipEl.dataset.id);
          if (mission) this.openMissionModal(el.dataset.date, mission);
        } else {
          this.openMissionModal(el.dataset.date);
        }
      });
    });
  },

  openMissionModal(date, mission = null) {
    const isEdit = !!mission;
    const etabOptions = this.etablissements.map(e =>
      `<option value="${e.nom}" data-km="${e.km}" ${mission && mission.etablissement === e.nom ? 'selected' : ''}>${e.nom}</option>`
    ).join('');

    const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    const body = `
      ${isEdit ? `<p style="color:var(--txt2);font-size:13px;margin-bottom:16px">${dateLabel}</p>` : `
      <div class="form-group">
        <label class="form-check" style="margin-bottom:12px">
          <input type="checkbox" id="mMultiDays">
          Plusieurs jours (plage de dates)
        </label>
      </div>
      <div id="mSingleDate">
        <p style="color:var(--txt2);font-size:13px;margin-bottom:16px">${dateLabel}</p>
      </div>
      <div id="mDateRange" style="display:none">
        <div class="form-row" style="margin-bottom:16px">
          <div class="form-group">
            <label class="form-label">Date debut</label>
            <input type="date" class="form-input" id="mDateDebut" value="${date}">
          </div>
          <div class="form-group">
            <label class="form-label">Date fin</label>
            <input type="date" class="form-input" id="mDateFin" value="${date}">
          </div>
        </div>
      </div>`}
      <div class="form-group">
        <label class="form-label">Etablissement</label>
        <select class="form-select" id="mEtab">
          <option value="">Choisir...</option>
          ${etabOptions}
        </select>
      </div>
      <div id="mWorkFields">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Heure debut</label>
            <input type="time" class="form-input" id="mDebut" value="${mission ? mission.heureDebut || '' : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Heure fin</label>
            <input type="time" class="form-input" id="mFin" value="${mission ? mission.heureFin || '' : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Pause debut</label>
            <input type="time" class="form-input" id="mPauseD" value="${mission ? mission.pauseDebut || '' : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Pause fin</label>
            <input type="time" class="form-input" id="mPauseF" value="${mission ? mission.pauseFin || '' : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">KM (aller-retour)</label>
            <input type="number" step="0.1" class="form-input" id="mKm" value="${mission ? mission.km || '' : ''}" placeholder="Auto">
          </div>
          <div class="form-group">
            <label class="form-label">Heures travaillees</label>
            <div class="form-computed" id="mHeures">${mission ? (mission.heuresTravaillees || 0).toFixed(2) + 'h' : '0h'}</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Type de contrat</label>
          <select class="form-select" id="mContrat">
            <option value="interim" ${!mission || !mission.typeContrat || mission.typeContrat === 'interim' ? 'selected' : ''}>Interim / Mission Hublo</option>
            <option value="cdd" ${mission && mission.typeContrat === 'cdd' ? 'selected' : ''}>CDD</option>
            <option value="cdi" ${mission && mission.typeContrat === 'cdi' ? 'selected' : ''}>CDI</option>
            <option value="vacation" ${mission && mission.typeContrat === 'vacation' ? 'selected' : ''}>Vacation</option>
          </select>
        </div>
      </div>
    `;

    const footer = `
      ${isEdit ? '<button class="btn btn-danger" id="mDelete">Supprimer</button>' : ''}
      <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
      <button class="btn btn-primary" id="mSave">${isEdit ? 'Modifier' : 'Ajouter'}</button>
    `;

    App.openModal(isEdit ? 'Modifier la mission' : 'Nouvelle mission', body, footer);

    // Toggle multi-days
    if (!isEdit) {
      document.getElementById('mMultiDays').onchange = (e) => {
        document.getElementById('mSingleDate').style.display = e.target.checked ? 'none' : 'block';
        document.getElementById('mDateRange').style.display = e.target.checked ? 'block' : 'none';
      };
    }

    // Auto-fill KM from etablissement + toggle simplified modal for absences
    const etabSelect = document.getElementById('mEtab');
    const workFields = document.getElementById('mWorkFields');
    const toggleWorkFields = () => {
      const val = etabSelect.value;
      const isAbsenceEtab = ABSENCE_NAMES.some(a => (val || '').toLowerCase().includes(a));
      workFields.style.display = isAbsenceEtab ? 'none' : '';
    };
    etabSelect.addEventListener('change', () => {
      const opt = etabSelect.selectedOptions[0];
      if (opt && opt.dataset.km) {
        document.getElementById('mKm').value = opt.dataset.km;
      }
      toggleWorkFields();
    });
    // Apply on load if editing an existing absence mission
    toggleWorkFields();

    // Auto-compute hours
    const computeHours = () => {
      const debut = App.parseTime(document.getElementById('mDebut').value);
      const fin = App.parseTime(document.getElementById('mFin').value);
      const pauseD = App.parseTime(document.getElementById('mPauseD').value);
      const pauseF = App.parseTime(document.getElementById('mPauseF').value);
      if (debut !== null && fin !== null) {
        let total = fin - debut;
        if (pauseD !== null && pauseF !== null) total -= (pauseF - pauseD);
        document.getElementById('mHeures').textContent = Math.max(0, total).toFixed(2) + 'h';
      }
    };
    ['mDebut', 'mFin', 'mPauseD', 'mPauseF'].forEach(id => {
      document.getElementById(id).addEventListener('input', computeHours);
    });

    // Save
    document.getElementById('mSave').onclick = async () => {
      const etab = document.getElementById('mEtab').value;
      if (!etab) return App.toast('Choisir un etablissement', 'error');

      const isAbsenceEtab = ABSENCE_NAMES.some(a => (etab || '').toLowerCase().includes(a));

      const debut = isAbsenceEtab ? '' : document.getElementById('mDebut').value;
      const fin = isAbsenceEtab ? '' : document.getElementById('mFin').value;
      const pauseD = isAbsenceEtab ? '' : document.getElementById('mPauseD').value;
      const pauseF = isAbsenceEtab ? '' : document.getElementById('mPauseF').value;
      const km = isAbsenceEtab ? 0 : (parseFloat(document.getElementById('mKm').value) || 0);

      let heures = 0;
      if (!isAbsenceEtab) {
        const dVal = App.parseTime(debut);
        const fVal = App.parseTime(fin);
        if (dVal !== null && fVal !== null) {
          heures = fVal - dVal;
          const pdVal = App.parseTime(pauseD);
          const pfVal = App.parseTime(pauseF);
          if (pdVal !== null && pfVal !== null) heures -= (pfVal - pdVal);
          heures = Math.max(0, heures);
        }
      }

      const baseData = {
        etablissement: etab,
        heureDebut: debut, heureFin: fin,
        pauseDebut: pauseD, pauseFin: pauseF,
        km, heuresTravaillees: +heures.toFixed(4),
        typeContrat: isAbsenceEtab ? '' : document.getElementById('mContrat').value,
        horaire: isAbsenceEtab ? '' : (() => {
          const h = parseInt((debut || '00:00').split(':')[0]);
          return (h >= 21 || h < 6) ? 'nuit' : 'jour';
        })()
      };

      if (isEdit) {
        await API.missions.update(mission.id, { ...baseData, date });
        App.closeModal();
        App.toast('Mission modifiee');
      } else {
        const multiDays = document.getElementById('mMultiDays') && document.getElementById('mMultiDays').checked;
        if (multiDays) {
          const dDebut = document.getElementById('mDateDebut').value;
          const dFin = document.getElementById('mDateFin').value;
          if (!dDebut || !dFin || dFin < dDebut) return App.toast('Verifier les dates', 'error');
          let count = 0;
          const cur = new Date(dDebut + 'T00:00:00');
          const end = new Date(dFin + 'T00:00:00');
          while (cur <= end) {
            const weekday = cur.getDay();
            if (weekday !== 0 && weekday !== 6) { // Skip weekends
              const d = cur.toISOString().slice(0, 10);
              await API.missions.create({ ...baseData, date: d });
              count++;
            }
            cur.setDate(cur.getDate() + 1);
          }
          App.closeModal();
          App.toast(count + ' missions ajoutees');
        } else {
          await API.missions.create({ ...baseData, date });
          App.closeModal();
          App.toast('Mission ajoutee');
        }
      }
      this.render();
    };

    // Delete
    if (isEdit) {
      document.getElementById('mDelete').onclick = async () => {
        await API.missions.remove(mission.id);
        App.closeModal();
        App.toast('Mission supprimee');
        this.render();
      };
    }
  },

  openVacancesModal() {
    // Show existing vacances + form to add
    let listHTML = '';
    if (this.vacances.length) {
      listHTML = `<div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:600;color:var(--txt2);margin-bottom:8px">VACANCES POSEES</div>
        ${this.vacances.map(v => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(0,0,0,0.2);border-radius:6px;margin-bottom:4px">
          <div>
            <span style="font-weight:600">${v.motif || 'Vacances'}</span>
            <span style="color:var(--txt2);font-size:12px;margin-left:8px">du ${v.dateDebut ? v.dateDebut.split('-').reverse().join('/') : ''} au ${v.dateFin ? v.dateFin.split('-').reverse().join('/') : ''}</span>
          </div>
          <button class="btn-ghost btn-sm" data-del-vac="${v.id}" style="color:var(--red)">Supprimer</button>
        </div>`).join('')}
      </div>`;
    }

    const body = `
      ${listHTML}
      <div style="font-size:12px;font-weight:600;color:var(--txt2);margin-bottom:8px">AJOUTER DES VACANCES</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Date debut</label>
          <input type="date" class="form-input" id="vDebut">
        </div>
        <div class="form-group">
          <label class="form-label">Date fin</label>
          <input type="date" class="form-input" id="vFin">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Motif</label>
        <select class="form-select" id="vMotif">
          <option value="Vacances">Vacances</option>
          <option value="Conge maladie">Conge maladie</option>
          <option value="Conge sans solde">Conge sans solde</option>
          <option value="Repos">Repos</option>
          <option value="Formation">Formation</option>
        </select>
      </div>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Fermer</button>
      <button class="btn btn-primary" id="vSave">Ajouter</button>
    `;
    App.openModal('Vacances', body, footer);

    // Delete buttons
    document.querySelectorAll('[data-del-vac]').forEach(btn => {
      btn.onclick = async () => {
        await API.vacances.remove(btn.dataset.delVac);
        App.closeModal();
        App.toast('Vacances supprimees');
        this.render();
      };
    });

    document.getElementById('vSave').onclick = async () => {
      const debut = document.getElementById('vDebut').value;
      const fin = document.getElementById('vFin').value;
      if (!debut || !fin) return App.toast('Remplir les dates', 'error');
      if (fin < debut) return App.toast('La date de fin doit etre apres le debut', 'error');
      const motif = document.getElementById('vMotif').value;
      await API.vacances.create({ dateDebut: debut, dateFin: fin, motif });
      App.closeModal();
      App.toast('Vacances ajoutees');
      this.render();
    };
  }
};
