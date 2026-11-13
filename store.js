/**
 * MotoGear PH - MySQL API Bridge & State Sync
 */
const CART_KEY = 'motogear_cart_v3';

const MotoStore = {
  _products: [],
  _orders: [],
  _userSession: null,
  _adminSession: null,

  async sync() {
    const [prodRes, ordRes, sessRes] = await Promise.all([
      fetch('api.php?action=get_products').then(r => r.json()),
      fetch('api.php?action=get_orders').then(r => r.json()),
      fetch('api.php?action=get_sessions').then(r => r.json())
    ]);
    if (prodRes.ok) this._products = prodRes.products;
    if (ordRes.ok) this._orders = ordRes.orders;
    if (sessRes.ok) {
      this._userSession = sessRes.user;
      this._adminSession = sessRes.admin;
    }
  },

  async _post(action, body = {}) {
    const res = await fetch(`api.php?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  },

  getProducts() { return this._products; },

  async addProduct(productData) {
    const res = await this._post('add_product', productData);
    if (res.ok) await this.sync();
    return res;
  },

  async updateProduct(id, updatedData) {
    const res = await this._post('update_product', { id, ...updatedData });
    if (res.ok) await this.sync();
    return res;
  },

  async deleteProduct(id) {
    const res = await this._post('delete_product', { id });
    if (res.ok) await this.sync();
    return res;
  },

  getUserSession() { return this._userSession; },
  getAdminSession() { return this._adminSession; },

  async loginUser(username, password) {
    const res = await this._post('login_user', { username, password });
    if (res.ok) this._userSession = res.user;
    return res;
  },

  async loginAdmin(username, password) {
    const res = await this._post('login_admin', { username, password });
    if (res.ok) this._adminSession = res.user;
    return res;
  },

  async signup(data) {
    const res = await this._post('signup', data);
    if (res.ok) this._userSession = res.user;
    return res;
  },

  async logoutUser() {
    await this._post('logout_user');
    this._userSession = null;
  },

  async logoutAdmin() {
    await this._post('logout_admin');
    this._adminSession = null;
  },

  getCart() { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); },
  saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); },

  addToCart(productId, qty = 1) {
    const product = this.getProducts().find(p => p.id === productId);
    if (!product || product.stock <= 0) return { ok: false, message: 'Product is out of stock.' };
    const cart = this.getCart();
    const existing = cart.find(item => item.productId === productId);
    if ((existing ? existing.qty : 0) + qty > product.stock) {
      return { ok: false, message: `Only ${product.stock} unit(s) available in stock.` };
    }
    if (existing) existing.qty += qty;
    else cart.push({ productId, qty });
    this.saveCart(cart);
    return { ok: true };
  },

  updateCartQty(productId, delta) {
    const product = this.getProducts().find(p => p.id === productId);
    let cart = this.getCart();
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    const nextQty = item.qty + delta;
    if (nextQty <= 0) cart = cart.filter(i => i.productId !== productId);
    else if (product && nextQty <= product.stock) item.qty = nextQty;
    this.saveCart(cart);
  },

  clearCart() { this.saveCart([]); },

  getOrders() { return this._orders; },

  async placeOrder(payload) {
    const res = await this._post('place_order', { ...payload, cart: this.getCart() });
    if (res.ok) {
      this.clearCart();
      await this.sync();
    }
    return res;
  },

  async cancelOrder(orderId, reason) {
    const res = await this._post('cancel_order', { orderId, reason });
    if (res.ok) await this.sync();
    return res;
  },

  async updateOrderStatus(orderId, status) {
    const res = await this._post('update_order_status', { orderId, status });
    if (res.ok) await this.sync();
    return res;
  },

  formatPeso(amount) {
    return '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
};
