<?php
session_start();
require_once 'db.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MotoGear PH — Admin Portal</title>
  <link rel="icon" type="image/svg+xml" href="logo.svg" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="navbar">
    <div class="nav-container">
      <a href="admin.php" class="brand">
        <img src="logo.svg" alt="MotoGear PH Logo" class="brand-logo-img" style="border-color:rgba(245, 158, 11, 0.55);" />
        <span class="brand-title">MotoGear <span>Admin</span></span>
      </a>
      <div class="nav-actions" id="adminHeaderActions"></div>
    </div>
  </header>

  <main class="container">
    <!-- Admin Login Gate -->
    <section id="adminLoginGate" style="max-width:440px; margin:3rem auto; display:none;">
      <div class="glass-card">
        <h2 style="margin-bottom:0.4rem;">🔐 Admin Authentication</h2>
        <p style="color:var(--text-muted); font-size:0.86rem; margin-bottom:1.2rem;">
          Sign in with your administrator credentials to manage products and customer orders.
        </p>
        <div id="adminLoginError"></div>
        <form id="adminLoginForm">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="adminUsername" class="form-control" required placeholder="Enter admin username" />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="adminPassword" class="form-control" required placeholder="Enter admin password" />
          </div>
          <button type="submit" class="btn btn-amber" style="width:100%;">Sign In to Admin Portal</button>
        </form>
      </div>
    </section>

    <!-- Admin Dashboard Workspace -->
    <section id="adminDashboard" style="display:none;">
      <div class="hero" style="border-color:rgba(245,158,11,0.35);">
        <div>
          <h1>Admin Inventory & Order Control</h1>
          <p>Add new motorcycle accessories with product photos, edit pricing or stock levels, delete discontinued items, and update customer order statuses.</p>
        </div>
        <button class="btn btn-amber" onclick="openAddProductModal()">+ Add New Product</button>
      </div>

      <div id="adminStats" class="stats-grid"></div>

      <div class="sub-tabs">
        <button id="adminTabProducts" class="sub-tab-btn active" onclick="switchAdminView('products')">📦 Manage Products (Add / Edit / Delete)</button>
        <button id="adminTabOrders" class="sub-tab-btn" onclick="switchAdminView('orders')">🚚 Customer Orders</button>
      </div>

      <div id="adminProductsSection" class="glass-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
          <h3>Motorcycle Accessories Catalog</h3>
          <input type="text" id="adminSearchInput" class="search-input" placeholder="Filter inventory by name or ID..." />
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Product & Photo</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions (Edit / Delete)</th>
              </tr>
            </thead>
            <tbody id="adminProductsTable"></tbody>
          </table>
        </div>
      </div>

      <div id="adminOrdersSection" class="glass-card" style="display:none;">
        <h3 style="margin-bottom:1rem;">Customer Orders & Dispatch Status</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
                <th>Update Status</th>
              </tr>
            </thead>
            <tbody id="adminOrdersTable"></tbody>
          </table>
        </div>
      </div>
    </section>
  </main>

  <!-- ADD / EDIT PRODUCT MODAL -->
  <div id="productFormModal" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <h3 id="productFormTitle">Add Motorcycle Accessory</h3>
        <button class="close-btn" onclick="closeAdminModal('productFormModal')">&times;</button>
      </div>
      <div id="productFormError"></div>
      <form id="productCrudForm">
        <input type="hidden" id="editProductId" />
        <input type="hidden" id="prodImageData" />

        <div class="form-group">
          <label>Product Photo (Upload Image File or Paste Image URL)</label>
          <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
            <input type="file" id="prodPhotoFile" accept="image/*" class="form-control" style="padding:0.45rem;" />
            <button type="button" id="clearPhotoBtn" class="btn btn-outline btn-sm" style="display:none;" onclick="clearProductPhoto()">Remove</button>
          </div>
          <input type="url" id="prodPhotoUrl" class="form-control" placeholder="Or paste image URL (https://...)" />
          <div id="photoPreviewBox" class="photo-preview-box">
            <span>📷 No photo selected — fallback icon will be shown</span>
          </div>
        </div>

        <div class="form-group">
          <label>Product Name</label>
          <input type="text" id="prodName" class="form-control" required placeholder="e.g. Full-System Stainless Exhaust Pipe" />
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <div class="form-group">
            <label>Category</label>
            <select id="prodCategory" class="form-control" required>
              <option value="Lighting">Lighting</option>
              <option value="Helmets & Visors">Helmets & Visors</option>
              <option value="Controls & Grips">Controls & Grips</option>
              <option value="Suspension">Suspension</option>
              <option value="Luggage & Racks">Luggage & Racks</option>
              <option value="Riding Gear">Riding Gear</option>
              <option value="Exhaust & Engine">Exhaust & Engine</option>
            </select>
          </div>
          <div class="form-group">
            <label>Fallback Icon / Emoji</label>
            <input type="text" id="prodEmoji" class="form-control" value="🏍️" required />
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <div class="form-group">
            <label>Price (PHP ₱)</label>
            <input type="number" id="prodPrice" class="form-control" min="1" step="0.01" required placeholder="1500" />
          </div>
          <div class="form-group">
            <label>Stock Quantity</label>
            <input type="number" id="prodStock" class="form-control" min="0" required placeholder="10" />
          </div>
        </div>
        <div class="form-group">
          <label>Motorcycle Compatibility</label>
          <input type="text" id="prodCompat" class="form-control" required placeholder="e.g. Honda Click 125/160, NMAX V2" />
        </div>
        <div class="form-group">
          <label>Warranty Details</label>
          <input type="text" id="prodWarranty" class="form-control" required placeholder="e.g. 1 Year Store Warranty" />
        </div>
        <div class="form-group">
          <label>Full Product Description</label>
          <textarea id="prodDesc" class="form-control" rows="3" required placeholder="Describe specifications, materials, and installation details..."></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.6rem;">
          <button type="button" class="btn btn-outline" onclick="closeAdminModal('productFormModal')">Cancel</button>
          <button type="submit" class="btn btn-amber">Save Product</button>
        </div>
      </form>
    </div>
  </div>

  <div id="toastContainer" class="toast-container"></div>

  <script src="store.js"></script>
  <script src="admin.js"></script>
</body>
</html>
