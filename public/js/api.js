const API = {
  async get(url) { const r = await fetch(url); return r.json(); },
  async post(url, data) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return r.json(); },
  async put(url, data) { const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return r.json(); },
  async del(url) { const r = await fetch(url, { method: 'DELETE' }); return r.json(); },

  etablissements: {
    list: () => API.get('/api/etablissements'),
    create: (d) => API.post('/api/etablissements', d),
    update: (id, d) => API.put(`/api/etablissements/${id}`, d),
    remove: (id) => API.del(`/api/etablissements/${id}`)
  },
  missions: {
    list: (mois) => API.get(`/api/missions?mois=${mois}`),
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
  }
};
