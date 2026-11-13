<?php
session_start();
require_once 'db.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MotoGear PH — Storefront</title>
  <link rel="icon" type="image/svg+xml" href="logo.svg" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="navbar">
    <div class="nav-container">
      <a href="index.php" class="brand">
        <img src="logo.svg" alt="MotoGear PH Logo" class="brand-logo-img" />
        <span class="brand-title">MotoGear <span>PH</span></span>
      </a>
      <div class="nav-actions">
        <button id="cartOpenBtn" class="btn btn-outline">
          🛒 Cart (<span id="cartCount">0</span>)
        </button>
        <div id="authArea"></div>
      </div>
    </div>
  </header>

  <main class="container">
    <section class="hero">
      <div>
        <h1>Performance Motorcycle Accessories & Riding Gear</h1>
        <p>Inspect full specs, compatibility, and stock availability before ordering. Sign in when ready to add items to your cart and check out via COD or GCash.</p>
      </div>
      <div style="display:flex; gap:0.65rem; flex-wrap:wrap;">
        <button class="btn btn-teal" onclick="switchUserView('catalog')">Browse Catalog</button>
        <button class="btn btn-outline" onclick="switchUserView('orders')">📦 My Orders (<span id="myOrdersCount">0</span>)</button>
      </div>
    </section>

    <div class="sub-tabs">
      <button id="tabCatalogBtn" class="sub-tab-btn active" onclick="switchUserView('catalog')">🛍️ All Products</button>
      <button id="tabOrdersBtn" class="sub-tab-btn" onclick="switchUserView('orders')">📦 My Orders & Cancellations</button>
    </div>

    <section id="catalogView">
      <div class="filter-bar">
        <input type="text" id="searchInput" class="search-input" placeholder="Search headlights, visors, levers, top boxes..." />
        <div id="categoryPills" class="category-pills"></div>
      </div>
      <div id="productGrid" class="product-grid"></div>
    </section>

    <section id="ordersView" style="display:none;">
      <div id="orderCancelAlert"></div>
      <div id="ordersList" style="display:flex; flex-direction:column; gap:1rem;"></div>
    </section>
  </main>

  <!-- PRODUCT DETAILS MODAL -->
  <div id="productModal" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <h3 id="modalProdTitle">Product Specifications</h3>
        <button class="close-btn" onclick="closeModal('productModal')">&times;</button>
      </div>
      <div id="modalProdBody"></div>
    </div>
  </div>

  <!-- AUTH MODAL -->
  <div id="authModal" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <h3 id="authModalTitle">Account Required</h3>
        <button class="close-btn" onclick="closeModal('authModal')">&times;</button>
      </div>
      <p style="color:var(--text-muted); font-size:0.86rem; margin-bottom:1rem;">
        Please log in or sign up before adding items to your cart and proceeding to checkout.
      </p>
      <div class="sub-tabs" style="margin-bottom:1rem;">
        <button id="showLoginTab" class="sub-tab-btn active" onclick="toggleAuthMode('login')">Log In</button>
        <button id="showSignupTab" class="sub-tab-btn" onclick="toggleAuthMode('signup')">Sign Up</button>
      </div>
      <div id="authErrorBox"></div>

      <form id="loginForm">
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="loginUsername" class="form-control" required placeholder="Enter your username" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="loginPassword" class="form-control" required placeholder="Enter your password" />
        </div>
        <button type="submit" class="btn btn-teal" style="width:100%;">Log In & Continue</button>
      </form>

      <form id="signupForm" style="display:none;">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="signupName" class="form-control" required placeholder="Juan Dela Cruz" />
        </div>
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="signupUsername" class="form-control" required placeholder="Choose a username" />
        </div>
        <div class="form-group">
          <label>Mobile Number</label>
          <input type="tel" id="signupPhone" class="form-control" required placeholder="09171234567" />
        </div>
        <div class="form-group">
          <label>Delivery Address</label>
          <input type="text" id="signupAddress" class="form-control" required placeholder="Street, Barangay, City" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="signupPassword" class="form-control" required placeholder="Create a password" />
        </div>
        <button type="submit" class="btn btn-teal" style="width:100%;">Create Account & Continue</button>
      </form>
    </div>
  </div>

  <!-- SLIDE-OVER CART DRAWER -->
  <div id="cartDrawer" class="drawer-backdrop">
    <div class="drawer-panel">
      <div class="modal-header" style="margin-bottom:0;">
        <h3>🛒 Shopping Cart</h3>
        <button class="close-btn" onclick="closeCart()">&times;</button>
      </div>
      <div id="cartItemsContainer" class="drawer-items"></div>
      <div style="border-top:1px solid var(--border-glass); padding-top:1rem;">
        <div style="display:flex; justify-content:space-between; margin-bottom:0.85rem; font-weight:700;">
          <span>Subtotal</span>
          <span id="cartSubtotal" style="color:var(--accent-amber);">₱0.00</span>
        </div>
        <button id="proceedCheckoutBtn" class="btn btn-teal" style="width:100%;" onclick="openCheckoutModal()">
          Proceed to Purchase & Checkout →
        </button>
      </div>
    </div>
  </div>

  <!-- CHECKOUT & PAYMENT MODAL -->
  <div id="checkoutModal" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <h3>💳 Purchase & Payment Form</h3>
        <button class="close-btn" onclick="closeModal('checkoutModal')">&times;</button>
      </div>
      <div id="checkoutErrorBox"></div>
      <form id="checkoutForm">
        <div class="form-group">
          <label>Recipient Full Name</label>
          <input type="text" id="chkName" class="form-control" required />
        </div>
        <div class="form-group">
          <label>Contact Number</label>
          <input type="tel" id="chkPhone" class="form-control" required />
        </div>
        <div class="form-group">
          <label>Complete Delivery Address</label>
          <textarea id="chkAddress" class="form-control" rows="2" required></textarea>
        </div>

        <div class="form-group">
          <label>Select Payment Method</label>
          <div class="radio-cards">
            <label id="payCardCOD" class="radio-card selected" onclick="selectPayment('COD')">
              <input type="radio" name="paymentMethod" value="COD" checked style="display:none;" />
              💵 Cash on Delivery (COD)
            </label>
            <label id="payCardGCash" class="radio-card" onclick="selectPayment('GCash')">
              <input type="radio" name="paymentMethod" value="GCash" style="display:none;" />
              📱 GCash E-Wallet
            </label>
          </div>
        </div>

        <div id="gcashFields" style="display:none; background:rgba(2,132,199,0.12); border:1px solid rgba(56,189,248,0.3); padding:0.9rem; border-radius:12px; margin-bottom:1rem;">
          <p style="font-size:0.8rem; color:#7dd3fc; margin-bottom:0.65rem;">
            Send exact payment to <strong>MotoGear PH (0917-888-9900)</strong> and enter your GCash details below:
          </p>
          <div class="form-group">
            <label>Sender GCash Mobile Number (11 digits)</label>
            <input type="tel" id="gcashNumber" class="form-control" placeholder="09XXXXXXXXX" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>GCash Reference No. (13 digits)</label>
            <input type="text" id="gcashRef" class="form-control" placeholder="e.g. 9012345678901" />
          </div>
        </div>

        <div class="glass-card" style="padding:0.9rem; margin-bottom:1rem; font-size:0.88rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem;">
            <span>Items Subtotal:</span>
            <span id="chkSubtotal">₱0.00</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:0.45rem; color:var(--text-muted);">
            <span>Standard Rider Shipping:</span>
            <span>₱85.00</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-weight:800; font-size:1.05rem; border-top:1px solid var(--border-glass); padding-top:0.45rem;">
            <span>Total Payable:</span>
            <span id="chkTotal" style="color:var(--accent-amber);">₱0.00</span>
          </div>
        </div>

        <button type="submit" class="btn btn-teal" style="width:100%;">Confirm & Place Order</button>
      </form>
    </div>
  </div>

  <!-- ORDER SUCCESS MODAL -->
  <div id="successModal" class="modal-backdrop">
    <div class="modal-box" style="text-align:center;">
      <div style="font-size:3.2rem; margin-bottom:0.5rem;">✅</div>
      <h2 style="color:var(--success); margin-bottom:0.4rem;">Successfully Ordered!</h2>
      <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">
        Your motorcycle accessories order has been confirmed and queued for dispatch.
      </p>
      <div id="successSummary" class="glass-card" style="text-align:left; margin-bottom:1.2rem; font-size:0.86rem;"></div>
      <div style="display:flex; gap:0.65rem; justify-content:center;">
        <button class="btn btn-teal" onclick="closeModal('successModal'); switchUserView('orders');">View My Orders</button>
        <button class="btn btn-outline" onclick="closeModal('successModal')">Continue Shopping</button>
      </div>
    </div>
  </div>

  <!-- CANCEL ORDER MODAL -->
  <div id="cancelModal" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <h3>⚠️ Cancel Order <span id="cancelTargetId" style="color:var(--accent-amber);"></span></h3>
        <button class="close-btn" onclick="closeModal('cancelModal')">&times;</button>
      </div>
      <div id="cancelModalError"></div>
      <form id="cancelOrderForm">
        <input type="hidden" id="cancelOrderIdInput" />
        <div class="form-group">
          <label>Reason for Cancellation (Required)</label>
          <select id="cancelReasonSelect" class="form-control" style="margin-bottom:0.6rem;">
            <option value="">-- Select a cancellation reason --</option>
            <option value="Ordered wrong motorcycle model compatibility">Ordered wrong motorcycle model compatibility</option>
            <option value="Need to change payment method or delivery address">Need to change payment method or delivery address</option>
            <option value="Found another item / changing order items">Found another item / changing order items</option>
            <option value="Other">Other (specify below)</option>
          </select>
          <input type="text" id="cancelReasonCustom" class="form-control" placeholder="Additional details (optional unless 'Other' selected)" />
        </div>
        <div style="display:flex; gap:0.6rem; justify-content:flex-end;">
          <button type="button" class="btn btn-outline" onclick="closeModal('cancelModal')">Keep Order</button>
          <button type="submit" class="btn btn-danger">Confirm Cancellation</button>
        </div>
      </form>
    </div>
  </div>

  <div id="toastContainer" class="toast-container"></div>

  <script src="store.js"></script>
  <script src="user.js"></script>
</body>
</html>
