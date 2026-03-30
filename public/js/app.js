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
    const titles = { planning: 'Planning', paiements: 'Paiements', documents: 'Documents', impots: 'Impots & Frais KM', parametres: 'Parametres' };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    location.hash = page;

    if (page === 'planning') Planning.render();
    else if (page === 'paiements') Paiements.render();
    else if (page === 'documents') Documents.render();
    else if (page === 'impots') Impots.render();
    else if (page === 'parametres') Etablissements.render();

    // Update topbar actions
    const actions = document.getElementById('topbarActions');
    if (page === 'planning') {
      actions.innerHTML = `<div class="month-selector">
        <button class="btn-icon" id="prevMonth"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="month-display" id="monthDisplay"></span>
        <button class="btn-icon" id="nextMonth"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>`;
      document.getElementById('prevMonth').onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth() - 1); Planning.render(); };
      document.getElementById('nextMonth').onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth() + 1); Planning.render(); };
    } else if (page === 'paiements') {
      actions.innerHTML = `<div class="month-selector">
        <button class="btn-icon" id="prevYearP"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="month-display" id="monthDisplayP"></span>
        <button class="btn-icon" id="nextYearP"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>`;
      document.getElementById('prevYearP').onclick = () => { Paiements.currentYear--; Paiements.render(); };
      document.getElementById('nextYearP').onclick = () => { Paiements.currentYear++; Paiements.render(); };
    } else if (page === 'impots') {
      actions.innerHTML = `<div class="month-selector">
        <button class="btn-icon" id="prevYearI"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="month-display" id="yearDisplayI"></span>
        <button class="btn-icon" id="nextYearI"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>`;
      document.getElementById('prevYearI').onclick = () => { Impots.currentYear--; Impots.render(); };
      document.getElementById('nextYearI').onclick = () => { Impots.currentYear++; Impots.render(); };
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
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
