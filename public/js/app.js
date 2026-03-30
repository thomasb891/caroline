const App = {
  currentPage: 'planning',
  currentDate: new Date(),

  init() {
    this.bindNav();
    this.bindModal();
    this.bindMenu();
    const hash = location.hash.slice(1) || 'planning';
    this.navigate(hash);
  },

  bindNav() {
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(el.dataset.page);
      });
    });
  },

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.nav-item, .mob-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(el => {
      el.classList.toggle('active', el.id === `page-${page}`);
    });
    const titles = { planning: 'Planning', paiements: 'Paiements', documents: 'Documents', statistiques: 'Statistiques', impots: 'Impots & Frais KM', comparaison: 'Comparaison Impots', logs: 'Journal d\'activite', parametres: 'Parametres' };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    location.hash = page;

    if (page === 'planning') Planning.render();
    else if (page === 'paiements') Paiements.render();
    else if (page === 'documents') Documents.render();
    else if (page === 'statistiques') Stats.render();
    else if (page === 'impots') Impots.render();
    else if (page === 'comparaison') Comparaison.render();
    else if (page === 'logs') Logs.render();
    else if (page === 'parametres') Etablissements.render();

    // Update topbar actions
    const actions = document.getElementById('topbarActions');
    if (page === 'planning') {
      actions.innerHTML = `<div class="month-selector">
        <button class="btn-icon" id="prevMonth"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="month-display clickable" id="monthDisplay"></span>
        <button class="btn-icon" id="nextMonth"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>`;
      document.getElementById('prevMonth').onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth() - 1); Planning.render(); };
      document.getElementById('nextMonth').onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth() + 1); Planning.render(); };
      document.getElementById('monthDisplay').onclick = (e) => {
        e.stopPropagation();
        this.openMonthPicker(e.target, { mode: 'month', onSelect: (y, m) => { this.currentDate.setFullYear(y); this.currentDate.setMonth(m); Planning.render(); } });
      };
    } else if (page === 'paiements') {
      actions.innerHTML = `<div class="month-selector">
        <button class="btn-icon" id="prevYearP"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="month-display clickable" id="monthDisplayP"></span>
        <button class="btn-icon" id="nextYearP"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>`;
      document.getElementById('prevYearP').onclick = () => { Paiements.currentYear--; Paiements.render(); };
      document.getElementById('nextYearP').onclick = () => { Paiements.currentYear++; Paiements.render(); };
      document.getElementById('monthDisplayP').onclick = (e) => {
        e.stopPropagation();
        const cb = (year) => { Paiements.currentYear = year; Paiements.render(); };
        cb._currentYear = Paiements.currentYear;
        this.openMonthPicker(e.target, { mode: 'year', onSelect: cb });
      };
    } else if (page === 'statistiques') {
      actions.innerHTML = `<div class="month-selector">
        <button class="btn-icon" id="prevS"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="month-display clickable" id="yearDisplayS"></span>
        <button class="btn-icon" id="nextS"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>`;
      document.getElementById('prevS').onclick = () => {
        if (Stats.viewMode === 'month') this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        else Stats.currentYear--;
        Stats.render();
      };
      document.getElementById('nextS').onclick = () => {
        if (Stats.viewMode === 'month') this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        else Stats.currentYear++;
        Stats.render();
      };
      document.getElementById('yearDisplayS').onclick = (e) => {
        e.stopPropagation();
        if (Stats.viewMode === 'month') {
          this.openMonthPicker(e.target, { mode: 'month', onSelect: (y, m) => { this.currentDate.setFullYear(y); this.currentDate.setMonth(m); Stats.render(); } });
        } else {
          const cb = (year) => { Stats.currentYear = year; Stats.render(); };
          cb._currentYear = Stats.currentYear;
          this.openMonthPicker(e.target, { mode: 'year', onSelect: cb });
        }
      };
    } else if (page === 'impots') {
      actions.innerHTML = `<div class="month-selector">
        <button class="btn-icon" id="prevYearI"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="month-display clickable" id="yearDisplayI"></span>
        <button class="btn-icon" id="nextYearI"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>`;
      document.getElementById('prevYearI').onclick = () => { Impots.currentYear--; Impots.render(); };
      document.getElementById('nextYearI').onclick = () => { Impots.currentYear++; Impots.render(); };
      document.getElementById('yearDisplayI').onclick = (e) => {
        e.stopPropagation();
        const cb = (year) => { Impots.currentYear = year; Impots.render(); };
        cb._currentYear = Impots.currentYear;
        this.openMonthPicker(e.target, { mode: 'year', onSelect: cb });
      };
    } else if (page === 'documents') {
      actions.innerHTML = `<div class="month-selector">
        <button class="btn-icon" id="prevMonthD"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="month-display clickable" id="monthDisplayD"></span>
        <button class="btn-icon" id="nextMonthD"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>`;
      document.getElementById('prevMonthD').onclick = () => {
        if (Documents.viewMode === 'year') { Documents.currentYear--; }
        else { this.currentDate.setMonth(this.currentDate.getMonth() - 1); }
        Documents.render();
      };
      document.getElementById('nextMonthD').onclick = () => {
        if (Documents.viewMode === 'year') { Documents.currentYear++; }
        else { this.currentDate.setMonth(this.currentDate.getMonth() + 1); }
        Documents.render();
      };
      document.getElementById('monthDisplayD').onclick = (e) => {
        e.stopPropagation();
        if (Documents.viewMode === 'year') {
          const cb = (year) => { Documents.currentYear = year; Documents.render(); };
          cb._currentYear = Documents.currentYear;
          this.openMonthPicker(e.target, { mode: 'year', onSelect: cb });
        } else {
          this.openMonthPicker(e.target, { mode: 'month', onSelect: (y, m) => { this.currentDate.setFullYear(y); this.currentDate.setMonth(m); Documents.render(); } });
        }
      };
    } else {
      actions.innerHTML = '';
    }

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
  },

  bindModal() {
    document.getElementById('modalClose').onclick = () => this.closeModal();
    document.getElementById('modalOverlay').onclick = e => {
      if (e.target === e.currentTarget) this.closeModal();
    };
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.closeModal();
    });
  },

  openModal(title, bodyHTML, footerHTML) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalFooter').innerHTML = footerHTML;
    document.getElementById('modalOverlay').classList.add('open');
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
  },

  bindMenu() {
    document.getElementById('menuBtn').onclick = () => {
      document.getElementById('sidebar').classList.toggle('open');
    };
  },

  toast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  },

  getMoisKey() {
    const y = this.currentDate.getFullYear();
    const m = String(this.currentDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  },

  getMoisLabel() {
    return this.currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  },

  formatTime(decimal) {
    if (!decimal && decimal !== 0) return '';
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  parseTime(str) {
    if (!str) return null;
    const [h, m] = str.split(':').map(Number);
    return h + m / 60;
  },

  // --- Month Picker Popup ---
  _monthPickerOpen: false,

  openMonthPicker(targetEl, { mode, onSelect }) {
    // mode: 'month' (month+year) or 'year' (year only)
    this.closeMonthPicker();
    const rect = targetEl.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.id = 'monthPickerPopup';
    popup.style.cssText = `position:fixed;top:${rect.bottom + 4}px;left:${rect.left}px;z-index:9999;background:#1e293b;border:1px solid rgba(148,163,184,0.2);border-radius:10px;padding:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);min-width:220px;`;

    let pickerYear = this.currentDate.getFullYear();
    if (mode === 'year') {
      // For year-only pages (paiements, impots) use a different source
      pickerYear = (typeof onSelect._currentYear === 'number') ? onSelect._currentYear : pickerYear;
    }

    const renderContent = () => {
      if (mode === 'year') {
        const years = [];
        for (let y = 2024; y <= 2027; y++) years.push(y);
        popup.innerHTML = `
          <div style="font-size:12px;font-weight:600;color:#94a3b8;text-align:center;margin-bottom:8px">Annee</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            ${years.map(y => `<button class="mp-btn${y === pickerYear ? ' mp-active' : ''}" data-year="${y}">${y}</button>`).join('')}
          </div>
        `;
        popup.querySelectorAll('[data-year]').forEach(btn => {
          btn.onclick = () => {
            onSelect(parseInt(btn.dataset.year));
            this.closeMonthPicker();
          };
        });
      } else {
        const moisNoms = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
        const curMonth = this.currentDate.getMonth();
        const curYear = this.currentDate.getFullYear();
        popup.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <button class="mp-arrow" id="mpPrevYear"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg></button>
            <span style="font-size:14px;font-weight:600;color:#f1f5f9" id="mpYearLabel">${pickerYear}</span>
            <button class="mp-arrow" id="mpNextYear"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg></button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
            ${moisNoms.map((m, i) => `<button class="mp-btn${(i === curMonth && pickerYear === curYear) ? ' mp-active' : ''}" data-month="${i}">${m}</button>`).join('')}
          </div>
        `;
        popup.querySelector('#mpPrevYear').onclick = () => { pickerYear--; renderContent(); };
        popup.querySelector('#mpNextYear').onclick = () => { pickerYear++; renderContent(); };
        popup.querySelectorAll('[data-month]').forEach(btn => {
          btn.onclick = () => {
            onSelect(pickerYear, parseInt(btn.dataset.month));
            this.closeMonthPicker();
          };
        });
      }
    };

    renderContent();
    document.body.appendChild(popup);
    this._monthPickerOpen = true;

    // Add styles for picker buttons if not present
    if (!document.getElementById('mpStyles')) {
      const style = document.createElement('style');
      style.id = 'mpStyles';
      style.textContent = `
        .mp-btn{background:rgba(255,255,255,0.06);border:1px solid rgba(148,163,184,0.12);color:#f1f5f9;border-radius:6px;padding:7px 4px;font-size:13px;cursor:pointer;transition:all .15s}
        .mp-btn:hover{background:rgba(99,102,241,0.2);border-color:rgba(99,102,241,0.4)}
        .mp-btn.mp-active{background:#6366f1;border-color:#6366f1;color:#fff;font-weight:600}
        .mp-arrow{background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center}
        .mp-arrow:hover{background:rgba(255,255,255,0.08);color:#f1f5f9}
        .month-display.clickable{cursor:pointer;padding:2px 8px;border-radius:6px;transition:background .15s}
        .month-display.clickable:hover{background:rgba(255,255,255,0.08)}
      `;
      document.head.appendChild(style);
    }

    // Close on outside click
    setTimeout(() => {
      const handler = (e) => {
        if (!popup.contains(e.target) && e.target !== targetEl) {
          this.closeMonthPicker();
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
      popup._outsideHandler = handler;
    }, 0);
  },

  closeMonthPicker() {
    const existing = document.getElementById('monthPickerPopup');
    if (existing) {
      if (existing._outsideHandler) document.removeEventListener('click', existing._outsideHandler);
      existing.remove();
    }
    this._monthPickerOpen = false;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();

  // Offline detection
  const banner = document.getElementById('offlineBanner');
  const updateOnlineStatus = () => {
    if (!navigator.onLine) {
      if (banner) banner.style.display = 'block';
    } else {
      if (banner) banner.style.display = 'none';
    }
  };
  updateOnlineStatus();

  window.addEventListener('offline', () => {
    if (banner) banner.style.display = 'block';
  });

  window.addEventListener('online', () => {
    if (banner) banner.style.display = 'none';
    App.toast('Connexion retablie', 'success');
    // Replay offline queue
    if (typeof API !== 'undefined' && API._replayQueue) API._replayQueue();
  });
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
