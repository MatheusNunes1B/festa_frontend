// menuService.js — Produção
// Frontend: Cloudflare Pages → Backend: Vercel
// ES Module — sem localhost, sem fallback, sem mock

const API_BASE = 'https://festa-backend.vercel.app/api';

const CACHE_KEY = 'arraia_menu_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/* ── Cache ── */
function getCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* storage cheio, ignora */ }
}

/* ── Fetch com retry e tratamento de erro ── */
async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(8000),
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
}

/* ══════════════════════════════════════
   PUBLIC API
══════════════════════════════════════ */

const menuService = {

  /* ── Buscar todos os itens ── */
  async getAll({ category, featured, search, sort, forceRefresh = false } = {}) {
    const hasFilters = category || featured || search || sort;

    if (!hasFilters && !forceRefresh) {
      const cached = getCache();
      if (cached) return cached;
    }

    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (featured) params.set('featured', featured);
    if (search)   params.set('search', search);
    if (sort)     params.set('sort', sort);

    const url = `${API_BASE}/menu${params.toString() ? '?' + params : ''}`;
    const data = await fetchWithRetry(url);

    if (!hasFilters) setCache(data);

    return data;
  },

  /* ── Buscar categorias ── */
  async getCategories() {
    return fetchWithRetry(`${API_BASE}/menu/categories`);
  },

  /* ── Buscar item por ID ── */
  async getById(id) {
    return fetchWithRetry(`${API_BASE}/menu/${id}`);
  },

  /* ── Criar item (admin) ── */
  async create(payload, token) {
    return fetchWithRetry(`${API_BASE}/menu`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },

  /* ── Atualizar item (admin) ── */
  async update(id, payload, token) {
    sessionStorage.removeItem(CACHE_KEY);
    return fetchWithRetry(`${API_BASE}/menu/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },

  /* ── Deletar item (admin) ── */
  async delete(id, token) {
    sessionStorage.removeItem(CACHE_KEY);
    return fetchWithRetry(`${API_BASE}/menu/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /* ── Toggle disponibilidade ── */
  async toggleAvailability(id, currentStatus, token) {
    return this.update(id, { available: !currentStatus }, token);
  },

  /* ── Toggle destaque ── */
  async toggleFeatured(id, currentStatus, token) {
    return this.update(id, { featured: !currentStatus }, token);
  },

  /* ── Limpar cache ── */
  clearCache() {
    sessionStorage.removeItem(CACHE_KEY);
  },
};

export default menuService;