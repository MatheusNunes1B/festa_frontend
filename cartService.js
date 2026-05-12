// cartService.js — Arraiá Boa Demais
// Gerenciamento global de carrinho via localStorage
// ES Module — frontend puro, sem backend

const CART_KEY   = 'arraia_cart';
const COUPON_KEY = 'arraia_coupon';

/* ── Eventos customizados ── */
function dispatch(type, detail = {}) {
  window.dispatchEvent(new CustomEvent(`cart:${type}`, { detail }));
}

/* ── Helpers ── */
function load() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch { return []; }
}

function save(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  dispatch('updated', { items, summary: cartService.getSummary() });
}

/* ══════════════════════════════════════
   PUBLIC API
══════════════════════════════════════ */

const cartService = {

  /* ── Retorna todos os itens ── */
  getItems() {
    return load();
  },

  /* ── Adicionar item ── */
  add(item, quantity = 1) {
    const items = load();
    const idx   = items.findIndex(i => i.id === item.id);

    if (idx !== -1) {
      items[idx].quantity += quantity;
    } else {
      items.push({
        id:          item.id,
        name:        item.name,
        price:       item.price,
        emoji:       item.emoji   || '🍽️',
        category:    item.category || '',
        image_url:   item.image_url || null,
        quantity,
      });
    }

    save(items);
    dispatch('added', { item, quantity });
    return items;
  },

  /* ── Remover item (por id) ── */
  remove(id) {
    const items = load().filter(i => i.id !== id);
    save(items);
    dispatch('removed', { id });
    return items;
  },

  /* ── Alterar quantidade ── */
  setQuantity(id, quantity) {
    if (quantity <= 0) return this.remove(id);
    const items = load();
    const idx   = items.findIndex(i => i.id === id);
    if (idx !== -1) { items[idx].quantity = quantity; save(items); }
    return items;
  },

  /* ── Incrementar / Decrementar ── */
  increment(id) {
    const items = load();
    const idx   = items.findIndex(i => i.id === id);
    if (idx !== -1) { items[idx].quantity++; save(items); }
    return items;
  },

  decrement(id) {
    const items = load();
    const idx   = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx].quantity--;
      if (items[idx].quantity <= 0) items.splice(idx, 1);
      save(items);
    }
    return items;
  },

  /* ── Limpar carrinho ── */
  clear() {
    save([]);
    localStorage.removeItem(COUPON_KEY);
    dispatch('cleared');
    return [];
  },

  /* ── Resumo ── */
  getSummary() {
    const items    = load();
    const count    = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const coupon   = this.getCoupon();
    const discount = coupon ? subtotal * (coupon.percent / 100) : 0;
    const total    = Math.max(0, subtotal - discount);
    return { items, count, subtotal, discount, total, coupon };
  },

  /* ── Coupon ── */
  COUPONS: {
    'ARRAIA10': { percent: 10, label: '10% de desconto' },
    'FORROZAO': { percent: 15, label: '15% de desconto' },
    'SAOJOO20': { percent: 20, label: '20% para amigos da festa' },
  },

  applyCoupon(code) {
    const coupon = this.COUPONS[code.toUpperCase()];
    if (!coupon) throw new Error('Cupom inválido');
    localStorage.setItem(COUPON_KEY, JSON.stringify({ code: code.toUpperCase(), ...coupon }));
    dispatch('coupon', { coupon });
    return coupon;
  },

  getCoupon() {
    try {
      return JSON.parse(localStorage.getItem(COUPON_KEY) || 'null');
    } catch { return null; }
  },

  removeCoupon() {
    localStorage.removeItem(COUPON_KEY);
    dispatch('updated', { items: load(), summary: this.getSummary() });
  },

  /* ── Count badge helper ── */
  getCount() {
    return load().reduce((s, i) => s + i.quantity, 0);
  },

  /* ── Verifica se item está no carrinho ── */
  has(id) {
    return load().some(i => i.id === id);
  },

  /* ── Qty de item específico ── */
  getQuantity(id) {
    const item = load().find(i => i.id === id);
    return item ? item.quantity : 0;
  },
};

export default cartService;