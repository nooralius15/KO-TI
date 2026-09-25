// Header Scroll
let header = document.querySelector("header");
window.addEventListener("scroll", () => {
  header.classList.toggle("shadow", window.scrollY > 0);
});

// Products - fetched from server (no longer hardcoded)
let products = [];

// Elements
const productList = document.getElementById("productList");
const cartItemsElement = document.getElementById("cartItems");
const cartTotalElement = document.getElementById("cartTotal");
const cartIcon = document.getElementById("cart-icon");

// Load or initialize cart
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Fetch products from server API
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to load products');
    products = await res.json();
    // Ensure price is a number (MySQL returns decimal as string)
    products = products.map(p => ({ ...p, price: parseFloat(p.price), stock_quantity: parseInt(p.stock_quantity) }));
    renderProducts(products);
    setupSearchAndSort();
  } catch (err) {
    console.error('Error loading products:', err);
    if (productList) productList.innerHTML = '<p style="text-align:center;color:#888;">Failed to load products. Please refresh the page.</p>';
  }
}

// Render Products (accepts filtered/sorted array)
function renderProducts(displayProducts) {
  if (!productList) return;
  const list = displayProducts || products;
  if (list.length === 0) {
    productList.innerHTML = '<div class="no-results">No products found matching your search.</div>';
    return;
  }
  productList.innerHTML = list.map(product => {
    const isOutOfStock = product.stock_quantity <= 0;
    return `
    <div class="product${isOutOfStock ? ' out-of-stock' : ''}">
      <div style="position: relative;">
        <img src="${product.image}" alt="${product.title}" class="product-img" />
        ${isOutOfStock ? '<span class="oos-badge">Out of Stock</span>' : ''}
      </div>
      <div class="product-info">
        <h2 class="product-title">${product.title}</h2>
        <p class="product-price">$${product.price.toFixed(2)}</p>
        ${isOutOfStock
          ? '<span class="sold-out-btn">Sold Out</span>'
          : `<a class="add-to-cart" data-id="${product.id}">Add to cart</a>`
        }
      </div>
    </div>
  `;
  }).join("");

  document.querySelectorAll(".add-to-cart").forEach(btn => {
    btn.addEventListener("click", addToCart);
  });
}

// Search & Sort
function setupSearchAndSort() {
  const searchInput = document.getElementById('productSearch');
  const sortSelect = document.getElementById('productSort');
  if (!searchInput || !sortSelect) return;

  function filterAndSort() {
    const query = searchInput.value.toLowerCase().trim();
    const sortBy = sortSelect.value;

    let filtered = products.filter(p =>
      p.title.toLowerCase().includes(query)
    );

    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    renderProducts(filtered);
  }

  searchInput.addEventListener('input', filterAndSort);
  sortSelect.addEventListener('change', filterAndSort);
}

// Add to Cart
function addToCart(event) {
  const productID = parseInt(event.target.dataset.id);
  const product = products.find(p => p.id === productID);
  if (!product) return;

  const existingItem = cart.find(item => item.id === productID);
  if (existingItem) {
    // Check stock before incrementing
    if (existingItem.quantity >= product.stock_quantity) {
      event.target.textContent = "Max qty";
      setTimeout(() => { event.target.textContent = "Add to cart"; }, 1500);
      return;
    }
    existingItem.quantity++;
  } else {
    cart.push({ id: product.id, title: product.title, price: product.price, image: product.image, quantity: 1 });
  }

  event.target.textContent = "Added";
  saveToLocalStorage();
  updateCartIcon();
  renderCartItems();
  calculateCartTotal();
}

// Remove from Cart
function removeFromCart(event) {
  const productID = parseInt(event.target.dataset.id);
  cart = cart.filter(item => item.id !== productID);
  saveToLocalStorage();
  renderCartItems();
  calculateCartTotal();
  updateCartIcon();
}

// Quantity Change
function changeQuantity(event) {
  const productID = parseInt(event.target.dataset.id);
  const quantity = parseInt(event.target.value);
  if (quantity > 0) {
    const item = cart.find(item => item.id === productID);
    if (item) {
      item.quantity = quantity;
      saveToLocalStorage();
      calculateCartTotal();
      updateCartIcon();
    }
  }
}

// Render Cart Items
function renderCartItems() {
  if (!cartItemsElement) return;
  cartItemsElement.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.title}" />
      <div class="cart-item-info">
        <h2 class="cart-item-title">${item.title}</h2>
        <input class="cart-item-quantity" type="number" min="1" value="${item.quantity}" data-id="${item.id}" />
      </div>
      <h2 class="cart-item-price">$${item.price}</h2>
      <button class="remove-from-cart" data-id="${item.id}">Remove</button>
    </div>
  `).join("");

  document.querySelectorAll(".remove-from-cart").forEach(btn => {
    btn.addEventListener("click", removeFromCart);
  });

  document.querySelectorAll(".cart-item-quantity").forEach(input => {
    input.addEventListener("change", changeQuantity);
  });
}

// Calculate Total
function calculateCartTotal() {
  if (!cartTotalElement) return;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotalElement.textContent = `Total: $${total.toFixed(2)}`;
}

// Save to LocalStorage
function saveToLocalStorage() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Update cart icon quantity
function updateCartIcon() {
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartIcon) cartIcon.setAttribute("data-quantity", totalQuantity);
}

// Clear cart (after success)
function clearCart() {
  cart = [];
  saveToLocalStorage();
  updateCartIcon();
}

// Detect page and load accordingly
if (window.location.pathname.includes("cart.html")) {
  renderCartItems();
  calculateCartTotal();
} else if (window.location.pathname.includes("success.html")) {
  clearCart();
} else {
  loadProducts();
}

// Sync with other tabs
window.addEventListener("storage", () => {
  cart = JSON.parse(localStorage.getItem("cart")) || [];
  updateCartIcon();
});

// Initial icon update
updateCartIcon();

// User Dashboard icon
document.getElementById('user-icon').addEventListener('click', () => {
  fetch('/api/user')
    .then(res => {
      if (res.ok) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login';
      }
    })
    .catch(() => {
      window.location.href = '/login';
    });
});
