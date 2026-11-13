/**
 * MotoGear PH - User Storefront Controller (Async MySQL Synced)
 */
let selectedCategory = 'All';
let pendingCartProductId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await MotoStore.sync();
  renderAuthHeader();
  renderCategories();
  renderProducts();
  updateCartBadge();
  renderOrders();

  document.getElementById('searchInput').addEventListener('input', renderProducts);
  document.getElementById('cartOpenBtn').addEventListener('click', openCart);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('signupForm').addEventListener('submit', handleSignup);
  document.getElementById('checkoutForm').addEventListener('submit', handlePlaceOrder);
  document.getElementById('cancelOrderForm').addEventListener('submit', handleCancelOrderSubmit);
});

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg, isError = false) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function renderAuthHeader() {
  const session = MotoStore.getUserSession();
  const area = document.getElementById('authArea');
  if (session) {
    area.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <span style="font-size:0.84rem; color:var(--text-muted);">Hi, <strong style="color:#fff;">${escapeHtml(session.username)}</strong></span>
        <button class="btn btn-outline btn-sm" onclick="handleLogout()">Logout</button>
      </div>
    `;
  } else {
    area.innerHTML = `<button class="btn btn-teal btn-sm" onclick="openAuthModal()">Log In / Sign Up</button>`;
  }
}

async function handleLogout() {
  await MotoStore.logoutUser();
  renderAuthHeader();
  renderOrders();
  showToast('Logged out of your account.');
}

function switchUserView(view) {
  const isCatalog = view === 'catalog';
  document.getElementById('catalogView').style.display = isCatalog ? 'block' : 'none';
  document.getElementById('ordersView').style.display = isCatalog ? 'none' : 'block';
  document.getElementById('tabCatalogBtn').classList.toggle('active', isCatalog);
  document.getElementById('tabOrdersBtn').classList.toggle('active', !isCatalog);
  if (!isCatalog) renderOrders();
}

function renderCategories() {
  const products = MotoStore.getProducts();
  const categories = ['All', ...new Set(products.map(p => p.category))];
  const container = document.getElementById('categoryPills');
  container.innerHTML = categories
    .map(cat => `<button class="pill ${cat === selectedCategory ? 'active' : ''}" onclick="selectCategory('${escapeHtml(cat)}')">${escapeHtml(cat)}</button>`)
    .join('');
}

function selectCategory(cat) {
  selectedCategory = cat;
  renderCategories();
  renderProducts();
}

function renderProducts() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const products = MotoStore.getProducts().filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchText =
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.compatibility.toLowerCase().includes(query);
    return matchCat && matchText;
  });

  const grid = document.getElementById('productGrid');
  if (products.length === 0) {
    grid.innerHTML = `<div class="glass-card" style="grid-column:1/-1; text-align:center; color:var(--text-muted);">No motorcycle accessories matched your filter.</div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const stockBadge =
      p.stock === 0
        ? `<span class="badge-stock stock-out">Out of Stock</span>`
        : p.stock <= 5
        ? `<span class="badge-stock stock-low">Low Stock: ${p.stock}</span>`
        : `<span class="badge-stock stock-ok">In Stock: ${p.stock}</span>`;

    const mediaHtml = p.image
      ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="product-photo" />`
      : `<div class="product-emoji">${escapeHtml(p.emoji || '🏍️')}</div>`;

    return `
      <article class="glass-card product-card">
        <div>
          <div class="product-thumb">
            <span class="badge-cat">${escapeHtml(p.category)}</span>
            ${stockBadge}
            ${mediaHtml}
          </div>
          <h3 class="product-title">${escapeHtml(p.name)}</h3>
          <p class="product-desc">${escapeHtml(p.description)}</p>
        </div>
        <div>
          <div class="product-price">${MotoStore.formatPeso(p.price)}</div>
          <div class="card-actions">
            <button class="btn btn-outline btn-sm" onclick="inspectProduct('${escapeHtml(p.id)}')">🔍 Inspect Details</button>
            <button class="btn btn-teal btn-sm" ${p.stock === 0 ? 'disabled' : ''} onclick="attemptAddToCart('${escapeHtml(p.id)}')">+ Add to Cart</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function inspectProduct(productId) {
  const p = MotoStore.getProducts().find(item => item.id === productId);
  if (!p) return;

  const modalMedia = p.image
    ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" style="width:100%; height:auto; max-height:360px; object-fit:contain; border-radius:12px; margin-bottom:0.65rem; display:block;" />`
    : `<div style="font-size:4rem;">${escapeHtml(p.emoji || '🏍️')}</div>`;

  document.getElementById('modalProdTitle').textContent = p.name;
  document.getElementById('modalProdBody').innerHTML = `
    <div style="text-align:center; background:rgba(15,23,42,0.7); border-radius:14px; padding:1rem; margin-bottom:1rem;">
      ${modalMedia}
      <span class="status-pill status-shipped">${escapeHtml(p.category)}</span>
    </div>
    <p style="margin-bottom:1rem; font-size:0.92rem;">${escapeHtml(p.description)}</p>
    <div class="glass-card" style="padding:0.9rem; margin-bottom:1.1rem; font-size:0.86rem; display:grid; gap:0.5rem;">
      <div><strong>Product Code:</strong> ${escapeHtml(p.id)}</div>
      <div><strong>Fitment / Compatibility:</strong> ${escapeHtml(p.compatibility)}</div>
      <div><strong>Warranty Coverage:</strong> ${escapeHtml(p.warranty)}</div>
      <div><strong>Available Stock:</strong> ${p.stock} unit(s)</div>
      <div><strong>Unit Price:</strong> <span style="color:var(--accent-amber); font-weight:800;">${MotoStore.formatPeso(p.price)}</span></div>
    </div>
    <button class="btn btn-teal" style="width:100%;" ${p.stock === 0 ? 'disabled' : ''} onclick="closeModal('productModal'); attemptAddToCart('${escapeHtml(p.id)}')">
      ${p.stock === 0 ? 'Out of Stock' : '🛒 Add to Cart & Order'}
    </button>
  `;
  openModal('productModal');
}

function attemptAddToCart(productId) {
  const session = MotoStore.getUserSession();
  if (!session) {
    pendingCartProductId = productId;
    openAuthModal();
    return;
  }
  const res = MotoStore.addToCart(productId, 1);
  if (!res.ok) {
    showToast(res.message, true);
    return;
  }
  updateCartBadge();
  showToast('Added to cart!');
  openCart();
}

function openAuthModal() {
  document.getElementById('authErrorBox').innerHTML = '';
  toggleAuthMode('login');
  openModal('authModal');
}

function toggleAuthMode(mode) {
  const isLogin = mode === 'login';
  document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
  document.getElementById('signupForm').style.display = isLogin ? 'none' : 'block';
  document.getElementById('showLoginTab').classList.toggle('active', isLogin);
  document.getElementById('showSignupTab').classList.toggle('active', !isLogin);
  document.getElementById('authErrorBox').innerHTML = '';
}

async function handleLogin(e) {
  e.preventDefault();
  const res = await MotoStore.loginUser(
    document.getElementById('loginUsername').value,
    document.getElementById('loginPassword').value
  );
  if (!res.ok) {
    document.getElementById('authErrorBox').innerHTML = `<div class="alert-box alert-error">⚠️ ${escapeHtml(res.message)}</div>`;
    return;
  }
  onAuthSuccess(res.user);
}

async function handleSignup(e) {
  e.preventDefault();
  const res = await MotoStore.signup({
    name: document.getElementById('signupName').value,
    username: document.getElementById('signupUsername').value,
    phone: document.getElementById('signupPhone').value,
    address: document.getElementById('signupAddress').value,
    password: document.getElementById('signupPassword').value
  });
  if (!res.ok) {
    document.getElementById('authErrorBox').innerHTML = `<div class="alert-box alert-error">⚠️ ${escapeHtml(res.message)}</div>`;
    return;
  }
  onAuthSuccess(res.user);
}

function onAuthSuccess(user) {
  closeModal('authModal');
  renderAuthHeader();
  renderOrders();
  showToast(`Welcome, ${user.username}!`);
  if (pendingCartProductId) {
    const prodId = pendingCartProductId;
    pendingCartProductId = null;
    attemptAddToCart(prodId);
  }
}

function updateCartBadge() {
  const count = MotoStore.getCart().reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('cartCount').textContent = count;
}

function openCart() {
  renderCartItems();
  document.getElementById('cartDrawer').classList.add('open');
}

function closeCart() { document.getElementById('cartDrawer').classList.remove('open'); }

function renderCartItems() {
  const cart = MotoStore.getCart();
  const products = MotoStore.getProducts();
  const container = document.getElementById('cartItemsContainer');
  let subtotal = 0;

  if (cart.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); text-align:center; margin-top:2rem;">Your cart is currently empty.</p>`;
    document.getElementById('cartSubtotal').textContent = '₱0.00';
    document.getElementById('proceedCheckoutBtn').disabled = true;
    return;
  }

  document.getElementById('proceedCheckoutBtn').disabled = false;
  container.innerHTML = cart.map(item => {
    const p = products.find(prod => prod.id === item.productId);
    if (!p) return '';
    const lineTotal = p.price * item.qty;
    subtotal += lineTotal;
    const thumb = p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" />` : escapeHtml(p.emoji || '🏍️');
    return `
      <div class="cart-item">
        <div class="table-prod-cell">
          <div class="table-thumb">${thumb}</div>
          <div>
            <div style="font-weight:700; font-size:0.9rem;">${escapeHtml(p.name)}</div>
            <div style="color:var(--accent-amber); font-size:0.84rem; font-weight:600;">${MotoStore.formatPeso(lineTotal)}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:0.4rem;">
          <button class="btn btn-outline btn-sm" onclick="changeCartQty('${escapeHtml(p.id)}', -1)">-</button>
          <span style="min-width:20px; text-align:center; font-weight:700;">${item.qty}</span>
          <button class="btn btn-outline btn-sm" onclick="changeCartQty('${escapeHtml(p.id)}', 1)">+</button>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('cartSubtotal').textContent = MotoStore.formatPeso(subtotal);
}

function changeCartQty(productId, delta) {
  MotoStore.updateCartQty(productId, delta);
  updateCartBadge();
  renderCartItems();
}

function openCheckoutModal() {
  const session = MotoStore.getUserSession();
  if (!session) { closeCart(); openAuthModal(); return; }
  const cart = MotoStore.getCart();
  if (cart.length === 0) return;

  const products = MotoStore.getProducts();
  const subtotal = cart.reduce((sum, item) => {
    const p = products.find(prod => prod.id === item.productId);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);

  document.getElementById('chkName').value = session.name || '';
  document.getElementById('chkPhone').value = session.phone || '';
  document.getElementById('chkAddress').value = session.address || '';
  document.getElementById('chkSubtotal').textContent = MotoStore.formatPeso(subtotal);
  document.getElementById('chkTotal').textContent = MotoStore.formatPeso(subtotal + 85);
  document.getElementById('checkoutErrorBox').innerHTML = '';
  selectPayment('COD');
  closeCart();
  openModal('checkoutModal');
}

function selectPayment(method) {
  document.getElementById('payCardCOD').classList.toggle('selected', method === 'COD');
  document.getElementById('payCardGCash').classList.toggle('selected', method === 'GCash');
  document.querySelector(`input[name="paymentMethod"][value="${method}"]`).checked = true;
  document.getElementById('gcashFields').style.display = method === 'GCash' ? 'block' : 'none';
}

async function handlePlaceOrder(e) {
  e.preventDefault();
  const session = MotoStore.getUserSession();
  if (!session) return;

  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
  const gcashNumber = document.getElementById('gcashNumber').value.trim();
  const gcashRef = document.getElementById('gcashRef').value.trim();

  if (paymentMethod === 'GCash') {
    if (!/^09\d{9}$/.test(gcashNumber)) {
      document.getElementById('checkoutErrorBox').innerHTML = `<div class="alert-box alert-error">⚠️ Error: Please enter a valid 11-digit GCash mobile number starting with 09.</div>`;
      return;
    }
    if (gcashRef.length < 8) {
      document.getElementById('checkoutErrorBox').innerHTML = `<div class="alert-box alert-error">⚠️ Error: Please enter a valid GCash Reference Number.</div>`;
      return;
    }
  }

  const result = await MotoStore.placeOrder({
    fullName: document.getElementById('chkName').value.trim(),
    phone: document.getElementById('chkPhone').value.trim(),
    address: document.getElementById('chkAddress').value.trim(),
    paymentMethod,
    gcashNumber,
    gcashRef
  });

  if (!result.ok) {
    document.getElementById('checkoutErrorBox').innerHTML = `<div class="alert-box alert-error">⚠️ ${escapeHtml(result.message)}</div>`;
    return;
  }

  closeModal('checkoutModal');
  updateCartBadge();
  renderProducts();
  renderOrders();

  const ord = result.order;
  document.getElementById('successSummary').innerHTML = `
    <div><strong>Order ID:</strong> ${escapeHtml(ord.orderId)}</div>
    <div><strong>Payment Method:</strong> ${escapeHtml(ord.paymentMethod)} ${ord.gcashRef ? `(Ref: ${escapeHtml(ord.gcashRef)})` : ''}</div>
    <div><strong>Deliver To:</strong> ${escapeHtml(ord.address)}</div>
    <div><strong>Total Amount:</strong> <span style="color:var(--accent-amber); font-weight:800;">${MotoStore.formatPeso(ord.total)}</span></div>
  `;
  openModal('successModal');
}

function renderOrders() {
  const session = MotoStore.getUserSession();
  const orders = session ? MotoStore.getOrders().filter(o => o.userId === session.id) : [];
  document.getElementById('myOrdersCount').textContent = orders.length;
  const list = document.getElementById('ordersList');

  if (!session) {
    list.innerHTML = `<div class="glass-card" style="text-align:center;">Please <button class="btn btn-teal btn-sm" onclick="openAuthModal()">Log In</button> to view your orders.</div>`;
    return;
  }
  if (orders.length === 0) {
    list.innerHTML = `<div class="glass-card" style="text-align:center; color:var(--text-muted);">You haven't placed any motorcycle accessory orders yet.</div>`;
    return;
  }

  list.innerHTML = orders.map(o => {
    const statusClass =
      o.status === 'Pending' ? 'status-pending' :
      o.status === 'Shipped' ? 'status-shipped' :
      o.status === 'Delivered' ? 'status-delivered' : 'status-cancelled';

    const itemsHtml = o.items.map(i => `<li>${escapeHtml(i.emoji)} ${escapeHtml(i.name)} &times; ${i.qty} — ${MotoStore.formatPeso(i.price * i.qty)}</li>`).join('');

    return `
      <div class="glass-card">
        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.75rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.75rem; margin-bottom:0.75rem;">
          <div>
            <strong style="font-size:1.05rem;">Order #${escapeHtml(o.orderId)}</strong>
            <span style="color:var(--text-muted); font-size:0.82rem; margin-left:0.6rem;">${escapeHtml(o.createdAt)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.65rem;">
            <span class="status-pill ${statusClass}">${escapeHtml(o.status)}</span>
            ${o.status === 'Pending' ? `<button class="btn btn-danger btn-sm" onclick="openCancelModal('${escapeHtml(o.orderId)}')">Cancel Order</button>` : ''}
          </div>
        </div>
        <ul style="padding-left:1.2rem; margin-bottom:0.75rem; font-size:0.88rem;">${itemsHtml}</ul>
        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; font-size:0.85rem; color:var(--text-muted);">
          <div>Payment: <strong style="color:#fff;">${escapeHtml(o.paymentMethod)}</strong> ${o.gcashRef ? `(Ref: ${escapeHtml(o.gcashRef)})` : ''}</div>
          <div>Total Paid: <strong style="color:var(--accent-amber); font-size:1rem;">${MotoStore.formatPeso(o.total)}</strong></div>
        </div>
        ${o.cancelReason ? `<div class="alert-box alert-error" style="margin-top:0.75rem; margin-bottom:0;">Cancelled Reason: ${escapeHtml(o.cancelReason)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function openCancelModal(orderId) {
  document.getElementById('cancelTargetId').textContent = orderId;
  document.getElementById('cancelOrderIdInput').value = orderId;
  document.getElementById('cancelReasonSelect').value = '';
  document.getElementById('cancelReasonCustom').value = '';
  document.getElementById('cancelModalError').innerHTML = '';
  openModal('cancelModal');
}

async function handleCancelOrderSubmit(e) {
  e.preventDefault();
  const orderId = document.getElementById('cancelOrderIdInput').value;
  const selectVal = document.getElementById('cancelReasonSelect').value;
  const customVal = document.getElementById('cancelReasonCustom').value.trim();
  const finalReason = selectVal === 'Other' ? customVal : (customVal ? `${selectVal} — ${customVal}` : selectVal);

  const res = await MotoStore.cancelOrder(orderId, finalReason);
  if (!res.ok) {
    document.getElementById('cancelModalError').innerHTML = `<div class="alert-box alert-error">🚨 ${escapeHtml(res.message)}</div>`;
    showToast(res.message, true);
    return;
  }

  closeModal('cancelModal');
  document.getElementById('orderCancelAlert').innerHTML = `<div class="alert-box alert-success">✅ Order ${escapeHtml(orderId)} has been cancelled and product stock has been restored.</div>`;
  renderProducts();
  renderOrders();
  showToast(`Order ${orderId} cancelled.`);
}
