/**
 * MotoGear PH - Admin Portal Controller (Async MySQL Synced)
 */
document.addEventListener('DOMContentLoaded', async () => {
  await MotoStore.sync();
  checkAdminAccess();

  document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
  document.getElementById('productCrudForm').addEventListener('submit', handleSaveProduct);
  document.getElementById('adminSearchInput').addEventListener('input', renderAdminProducts);
  document.getElementById('prodPhotoFile').addEventListener('change', handlePhotoFileSelect);
  document.getElementById('prodPhotoUrl').addEventListener('input', handlePhotoUrlInput);
});

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showAdminToast(msg, isError = false) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function isAdminAuthenticated() {
  const session = MotoStore.getAdminSession();
  return session && session.role === 'admin';
}

function checkAdminAccess() {
  const authed = isAdminAuthenticated();
  document.getElementById('adminLoginGate').style.display = authed ? 'none' : 'block';
  document.getElementById('adminDashboard').style.display = authed ? 'block' : 'none';

  const headerActions = document.getElementById('adminHeaderActions');
  if (authed) {
    const session = MotoStore.getAdminSession();
    headerActions.innerHTML = `
      <span style="font-size:0.84rem; color:var(--text-muted);">Admin: <strong style="color:#fff;">${escapeHtml(session.username)}</strong></span>
      <button class="btn btn-outline btn-sm" onclick="adminLogout()">Logout</button>
    `;
    renderStats();
    renderAdminProducts();
    renderAdminOrders();
  } else {
    headerActions.innerHTML = '';
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const res = await MotoStore.loginAdmin(
    document.getElementById('adminUsername').value,
    document.getElementById('adminPassword').value
  );
  if (!res.ok) {
    document.getElementById('adminLoginError').innerHTML = `<div class="alert-box alert-error">⚠️ Invalid administrator username or password.</div>`;
    return;
  }
  await MotoStore.sync();
  checkAdminAccess();
  showAdminToast('Signed in to MotoGear Admin Portal.');
}

async function adminLogout() {
  await MotoStore.logoutAdmin();
  checkAdminAccess();
}

function switchAdminView(view) {
  const isProducts = view === 'products';
  document.getElementById('adminProductsSection').style.display = isProducts ? 'block' : 'none';
  document.getElementById('adminOrdersSection').style.display = isProducts ? 'none' : 'block';
  document.getElementById('adminTabProducts').classList.toggle('active', isProducts);
  document.getElementById('adminTabOrders').classList.toggle('active', !isProducts);
}

function renderStats() {
  const products = MotoStore.getProducts();
  const orders = MotoStore.getOrders();
  const activeOrders = orders.filter(o => o.status !== 'Cancelled');
  const revenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

  document.getElementById('adminStats').innerHTML = `
    <div class="glass-card">
      <div class="stat-label">Total Products Listed</div>
      <div class="stat-value" style="color:var(--accent-teal);">${products.length}</div>
    </div>
    <div class="glass-card">
      <div class="stat-label">Total Units in Stock</div>
      <div class="stat-value">${totalStock}</div>
    </div>
    <div class="glass-card">
      <div class="stat-label">Active Customer Orders</div>
      <div class="stat-value" style="color:var(--accent-amber);">${activeOrders.length}</div>
    </div>
    <div class="glass-card">
      <div class="stat-label">Gross Order Revenue</div>
      <div class="stat-value" style="color:var(--success);">${MotoStore.formatPeso(revenue)}</div>
    </div>
  `;
}

function updatePhotoPreview(src) {
  const box = document.getElementById('photoPreviewBox');
  const clearBtn = document.getElementById('clearPhotoBtn');
  if (src) {
    box.innerHTML = `<img src="${escapeHtml(src)}" alt="Product Preview" onerror="this.parentElement.innerHTML='<span>⚠️ Unable to load image preview</span>'" />`;
    clearBtn.style.display = 'inline-flex';
  } else {
    box.innerHTML = `<span>📷 No photo selected — fallback icon will be shown</span>`;
    clearBtn.style.display = 'none';
  }
}

function clearProductPhoto() {
  document.getElementById('prodPhotoFile').value = '';
  document.getElementById('prodPhotoUrl').value = '';
  document.getElementById('prodImageData').value = '';
  updatePhotoPreview('');
}

function handlePhotoUrlInput(e) {
  const url = e.target.value.trim();
  document.getElementById('prodPhotoFile').value = '';
  document.getElementById('prodImageData').value = url;
  updatePhotoPreview(url);
}

function handlePhotoFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showAdminToast('Please select a valid image file (JPG, PNG, WEBP).', true);
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      const maxDim = 800;
      let width = img.width, height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
        else { width = Math.round((width * maxDim) / height); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      document.getElementById('prodPhotoUrl').value = '';
      document.getElementById('prodImageData').value = compressedDataUrl;
      updatePhotoPreview(compressedDataUrl);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function renderAdminProducts() {
  const query = document.getElementById('adminSearchInput').value.trim().toLowerCase();
  const products = MotoStore.getProducts().filter(
    p => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
  );
  const tbody = document.getElementById('adminProductsTable');
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const thumbHtml = p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" />` : escapeHtml(p.emoji || '🏍️');
    return `
      <tr>
        <td><strong>${escapeHtml(p.id)}</strong></td>
        <td>
          <div class="table-prod-cell">
            <div class="table-thumb">${thumbHtml}</div>
            <div>
              <div style="font-weight:700;">${escapeHtml(p.name)}</div>
              <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(p.compatibility)}</div>
            </div>
          </div>
        </td>
        <td><span class="status-pill status-shipped">${escapeHtml(p.category)}</span></td>
        <td style="font-weight:700; color:var(--accent-amber);">${MotoStore.formatPeso(p.price)}</td>
        <td>${p.stock} pcs</td>
        <td>
          <div style="display:flex; gap:0.45rem;">
            <button type="button" class="btn btn-outline btn-sm" onclick="openEditProductModal('${escapeHtml(p.id)}')">✏️ Edit</button>
            <button type="button" class="btn btn-danger btn-sm" onclick="handleDeleteProduct('${escapeHtml(p.id)}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddProductModal() {
  document.getElementById('productFormTitle').textContent = 'Add New Motorcycle Accessory';
  document.getElementById('productFormError').innerHTML = '';
  document.getElementById('editProductId').value = '';
  document.getElementById('productCrudForm').reset();
  document.getElementById('prodEmoji').value = '🏍️';
  clearProductPhoto();
  document.getElementById('productFormModal').classList.add('open');
}

function openEditProductModal(id) {
  const p = MotoStore.getProducts().find(item => item.id === id);
  if (!p) return;
  document.getElementById('productFormTitle').textContent = `Edit Product (${p.id})`;
  document.getElementById('productFormError').innerHTML = '';
  document.getElementById('editProductId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodEmoji').value = p.emoji || '🏍️';
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodStock').value = p.stock;
  document.getElementById('prodCompat').value = p.compatibility;
  document.getElementById('prodWarranty').value = p.warranty;
  document.getElementById('prodDesc').value = p.description;

  const existingImg = p.image || '';
  document.getElementById('prodPhotoFile').value = '';
  document.getElementById('prodImageData').value = existingImg;
  document.getElementById('prodPhotoUrl').value = existingImg.startsWith('http') ? existingImg : '';
  updatePhotoPreview(existingImg);
  document.getElementById('productFormModal').classList.add('open');
}

function closeAdminModal(id) { document.getElementById(id).classList.remove('open'); }

async function handleSaveProduct(e) {
  e.preventDefault();
  document.getElementById('productFormError').innerHTML = '';
  const editId = document.getElementById('editProductId').value;
  const payload = {
    name: document.getElementById('prodName').value.trim(),
    category: document.getElementById('prodCategory').value,
    emoji: document.getElementById('prodEmoji').value.trim() || '🏍️',
    image: document.getElementById('prodImageData').value.trim(),
    price: document.getElementById('prodPrice').value,
    stock: document.getElementById('prodStock').value,
    compatibility: document.getElementById('prodCompat').value.trim(),
    warranty: document.getElementById('prodWarranty').value.trim(),
    description: document.getElementById('prodDesc').value.trim()
  };

  if (editId) {
    const res = await MotoStore.updateProduct(editId, payload);
    if (!res.ok) {
      document.getElementById('productFormError').innerHTML = `<div class="alert-box alert-error">⚠️ ${escapeHtml(res.message)}</div>`;
      return;
    }
    showAdminToast(`Updated product ${editId}.`);
  } else {
    const res = await MotoStore.addProduct(payload);
    if (!res.ok) {
      document.getElementById('productFormError').innerHTML = `<div class="alert-box alert-error">⚠️ ${escapeHtml(res.message)}</div>`;
      return;
    }
    showAdminToast(`Added new product ${res.product.id}.`);
  }

  closeAdminModal('productFormModal');
  renderStats();
  renderAdminProducts();
}

async function handleDeleteProduct(id) {
  const product = MotoStore.getProducts().find(item => item.id === id);
  const label = product ? `"${product.name}" (${id})` : id;
  if (!confirm(`Are you sure you want to delete ${label}?`)) return;
  await MotoStore.deleteProduct(id);
  renderStats();
  renderAdminProducts();
  showAdminToast(`Deleted product ${id}.`);
}

function renderAdminOrders() {
  const orders = MotoStore.getOrders();
  const tbody = document.getElementById('adminOrdersTable');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No customer orders placed yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const statusClass =
      o.status === 'Pending' ? 'status-pending' :
      o.status === 'Shipped' ? 'status-shipped' :
      o.status === 'Delivered' ? 'status-delivered' : 'status-cancelled';
    const itemsSummary = o.items.map(i => `${escapeHtml(i.name)} (x${i.qty})`).join(', ');

    return `
      <tr>
        <td><strong>${escapeHtml(o.orderId)}</strong><div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(o.createdAt)}</div></td>
        <td>
          <strong>${escapeHtml(o.customerName)}</strong>
          <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(o.phone)} • ${escapeHtml(o.address)}</div>
        </td>
        <td style="max-width:220px; font-size:0.82rem;">${itemsSummary}</td>
        <td>
          <strong>${escapeHtml(o.paymentMethod)}</strong>
          ${o.gcashRef ? `<div style="font-size:0.75rem; color:#7dd3fc;">Ref: ${escapeHtml(o.gcashRef)}</div>` : ''}
        </td>
        <td style="font-weight:700; color:var(--accent-amber);">${MotoStore.formatPeso(o.total)}</td>
        <td><span class="status-pill ${statusClass}">${escapeHtml(o.status)}</span></td>
        <td>
          <select class="form-control" style="padding:0.35rem 0.5rem; font-size:0.8rem;" ${o.status === 'Cancelled' ? 'disabled' : ''} onchange="changeOrderStatus('${escapeHtml(o.orderId)}', this.value)">
            <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''} disabled>Cancelled</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

async function changeOrderStatus(orderId, status) {
  await MotoStore.updateOrderStatus(orderId, status);
  renderStats();
  renderAdminOrders();
  showAdminToast(`Order ${orderId} marked as ${status}.`);
}
