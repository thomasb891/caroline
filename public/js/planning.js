const Planning = {
  missions: [],
  etablissements: [],

  async render() {
    const moisKey = App.getMoisKey();
    const [missions, etabs] = await Promise.all([
      API.missions.list(moisKey),
      API.etablissements.list()
    ]);
    this.missions = missions;
    this.etablissements = etabs;

    const display = document.getElementById('monthDisplay');
    if (display) display.textContent = App.getMoisLabel();

    const totalH = missions.reduce((s, m) => s + (m.heuresTravaillees || 0), 0);
    const totalKm = missions.reduce((s, m) => s + (m.km || 0), 0);

    // Estimation salaire par etablissement (taux/IFC/CP propres a chaque etab)
    const etabMap = {};
    etabs.forEach(e => { etabMap[e.nom] = e; });
    let estimTotal = 0;
    let salaireBase = 0;
    let totalIFC = 0;
    let totalCP = 0;
    missions.forEach(m => {
      const e = etabMap[m.etablissement];
      const taux = e && e.tauxHoraire ? e.tauxHoraire : 0;
      const ifcPct = e && e.ifc ? e.ifc : 0;
      const cpPct = e && e.cp ? e.cp : 0;
      const base = (m.heuresTravaillees || 0) * taux;
      const ifc = base * ifcPct / 100;
      const cp = (base + ifc) * cpPct / 100;
      salaireBase += base;
      totalIFC += ifc;
      totalCP += cp;
      estimTotal += base + ifc + cp;
    });

    const page = document.getElementById('page-planning');
    page.innerHTML = `
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
          <div class="sub">Base ${salaireBase.toFixed(0)}&euro; + IFC ${totalIFC.toFixed(0)}&euro; + CP ${totalCP.toFixed(0)}&euro;</div>
        </div>
        <div class="stat-card orange">
          <div class="label">Kilometres</div>
          <div class="value">${totalKm.toFixed(0)}</div>
          <div class="sub">km parcourus</div>
        </div>
      </div>
      <div class="calendar-grid" id="calGrid"></div>
    `;
    this.renderCalendar();
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

      let cls = 'cal-day';
      if (isToday) cls += ' today';
      if (dayMissions.length) cls += ' has-mission';
      if (isWeekend) cls += ' day-weekend';

      let chips = dayMissions.map(m => {
        const name = m.etablissement || '?';
        const short = name.length > 15 ? name.slice(0, 14) + '...' : name;
        const isStage = name.toLowerCase().includes('stage');
        const hours = m.heuresTravaillees ? `${m.heuresTravaillees.toFixed(1)}h` : '';
        return `<div class="mission-chip${isStage ? ' stage' : ''}" data-id="${m.id}">${short}${hours ? `<span class="chip-hours"> ${hours}</span>` : ''}</div>`;
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
      `<option value="${e.nom}" data-km="${e.km}" ${mission && mission.etablissement === e.nom ? 'selected' : ''}>${e.nom} (${e.km} km)</option>`
    ).join('');

    const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    const body = `
      <p style="color:var(--txt2);font-size:13px;margin-bottom:16px">${dateLabel}</p>
      <div class="form-group">
        <label class="form-label">Etablissement</label>
        <select class="form-select" id="mEtab">
          <option value="">Choisir...</option>
          ${etabOptions}
        </select>
      </div>
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
    `;

    const footer = `
      ${isEdit ? '<button class="btn btn-danger" id="mDelete">Supprimer</button>' : ''}
      <button class="btn btn-secondary" onclick="App.closeModal()">Annuler</button>
      <button class="btn btn-primary" id="mSave">${isEdit ? 'Modifier' : 'Ajouter'}</button>
    `;

    App.openModal(isEdit ? 'Modifier la mission' : 'Nouvelle mission', body, footer);

    // Auto-fill KM from etablissement
    const etabSelect = document.getElementById('mEtab');
    etabSelect.addEventListener('change', () => {
      const opt = etabSelect.selectedOptions[0];
      if (opt && opt.dataset.km) {
        document.getElementById('mKm').value = opt.dataset.km;
      }
    });

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

      const debut = document.getElementById('mDebut').value;
      const fin = document.getElementById('mFin').value;
      const pauseD = document.getElementById('mPauseD').value;
      const pauseF = document.getElementById('mPauseF').value;
      const km = parseFloat(document.getElementById('mKm').value) || 0;

      let heures = 0;
      const dVal = App.parseTime(debut);
      const fVal = App.parseTime(fin);
      if (dVal !== null && fVal !== null) {
        heures = fVal - dVal;
        const pdVal = App.parseTime(pauseD);
        const pfVal = App.parseTime(pauseF);
        if (pdVal !== null && pfVal !== null) heures -= (pfVal - pdVal);
        heures = Math.max(0, heures);
      }

      const data = {
        date, etablissement: etab,
        heureDebut: debut, heureFin: fin,
        pauseDebut: pauseD, pauseFin: pauseF,
        km, heuresTravaillees: +heures.toFixed(4)
      };

      if (isEdit) await API.missions.update(mission.id, data);
      else await API.missions.create(data);

      App.closeModal();
      App.toast(isEdit ? 'Mission modifiee' : 'Mission ajoutee');
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
  }
};
