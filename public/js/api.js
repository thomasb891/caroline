// Detect base path: standalone = '', mounted = '/caroline'
const API_BASE = (() => {
  const p = window.location.pathname;
  if (p.startsWith('/caroline')) return '/caroline';
  return '';
})();

const API = {
  async get(url) { const r = await fetch(API_BASE + url); return r.json(); },
  async post(url, data) {
    try {
      const r = await fetch(API_BASE + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      return r.json();
    } catch (e) {
      API._enqueue({ method: 'POST', url, data });
      return { ok: false, offline: true };
    }
  },
  async put(url, data) {
    try {
      const r = await fetch(API_BASE + url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      return r.json();
    } catch (e) {
      API._enqueue({ method: 'PUT', url, data });
      return { ok: false, offline: true };
    }
  },
  async del(url) {
    try {
      const r = await fetch(API_BASE + url, { method: 'DELETE' });
      return r.json();
    } catch (e) {
      API._enqueue({ method: 'DELETE', url });
      return { ok: false, offline: true };
    }
  },

  _enqueue(req) {
    const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    queue.push({ ...req, timestamp: Date.now() });
    localStorage.setItem('offlineQueue', JSON.stringify(queue));
  },

  async _replayQueue() {
    const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    if (!queue.length) return;
    localStorage.setItem('offlineQueue', '[]');
    for (const req of queue) {
      try {
        const opts = { method: req.method, headers: { 'Content-Type': 'application/json' } };
        if (req.data) opts.body = JSON.stringify(req.data);
        await fetch(API_BASE + req.url, opts);
      } catch (e) {
        API._enqueue(req);
      }
    }
  },

  etablissements: {
    list: () => API.get('/api/etablissements'),
    create: (d) => API.post('/api/etablissements', d),
    update: (id, d) => API.put(`/api/etablissements/${id}`, d),
    remove: (id) => API.del(`/api/etablissements/${id}`)
  },
  missions: {
    list: (mois) => API.get(`/api/missions?mois=${mois}`),
    listAnnee: (a) => API.get(`/api/missions?mois=${a}`),
    create: (d) => API.post('/api/missions', d),
    update: (id, d) => API.put(`/api/missions/${id}`, d),
    remove: (id) => API.del(`/api/missions/${id}`)
  },
  paiements: {
    list: (mois) => API.get(`/api/paiements?mois=${mois}`),
    listAnnee: (a) => API.get(`/api/paiements?annee=${a}`),
    create: (d) => API.post('/api/paiements', d),
    update: (id, d) => API.put(`/api/paiements/${id}`, d),
    remove: (id) => API.del(`/api/paiements/${id}`)
  },
  documents: {
    list: (mois) => API.get(`/api/documents?mois=${mois}`),
    save: (d) => API.post('/api/documents', d)
  },
  vacances: {
    list: (mois) => API.get(`/api/vacances?mois=${mois}`),
    create: (d) => API.post('/api/vacances', d),
    remove: (id) => API.del(`/api/vacances/${id}`)
  },
  stats: {
    annuel: (a) => API.get(`/api/stats/annuel?annee=${a}`)
  },
  config: {
    get: () => API.get('/api/config'),
    update: (d) => API.put('/api/config', d)
  },
  prixGasoil: {
    list: () => API.get('/api/prix-gasoil'),
    save: (mois, prix) => API.post('/api/prix-gasoil', { mois, prix }),
    getForMonth: async (mois) => {
      const list = await API.get('/api/prix-gasoil');
      const entry = list.find(p => p.mois === mois);
      if (entry) return entry.prix;
      // Fallback: closest previous month
      const sorted = list.filter(p => p.mois <= mois).sort((a, b) => b.mois.localeCompare(a.mois));
      return sorted.length ? sorted[0].prix : 1.949;
    }
  },
  documentsUpload: {
    upload: async (formData) => {
      const r = await fetch(API_BASE + '/api/documents/upload', { method: 'POST', body: formData });
      return r.json();
    }
  },
  comparaison: {
    get: (annee) => API.get(`/api/comparaison?annee=${annee}`),
    save: (d) => API.post('/api/comparaison', d)
  },
  notifications: {
    list: () => API.get('/api/notifications')
  },
  logs: {
    list: (limit = 100) => API.get(`/api/logs?limit=${limit}`),
    lastForSection: async (section) => {
      const logs = await API.get(`/api/logs?limit=200`);
      return logs.find(l => l.details && l.details.section === section) || null;
    }
  }
};
