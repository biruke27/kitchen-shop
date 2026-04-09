// Firebase imports
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Import cart functions from cart.js
import { addToCart, updateCartCount } from './cart.js';

let allProducts = [];

async function loadProducts() {
  try {
    // Try to load from Firestore first
    if (window.db) {
      console.log('Loading products from Firestore...');
      const querySnapshot = await getDocs(collection(window.db, "products"));
      allProducts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`Loaded ${allProducts.length} products from Firestore:`, allProducts);
    } else {
      // Fallback to JSON if Firebase not available
      console.warn("Firebase not available, falling back to products.json");
      const response = await fetch('products.json');
      const data = await response.json();
      allProducts = data.products || [];
    }

    // Make products available globally for debugging
    window.allProducts = allProducts;

    renderProducts(allProducts);
    renderFeaturedProducts(allProducts);
  } catch (error) {
    console.error("Failed to load products:", error);
    allProducts = [];
    const container = document.getElementById('all-products');
    if (container) container.innerHTML = '<p class="text-red-500 text-center col-span-full">Failed to load products. Please try again later.</p>';
  }
}

// ==================== RENDER PRODUCTS ====================
function renderProducts(productList) {
  const container = document.getElementById('all-products');
  const noResults = document.getElementById('no-results');

  if (!container) return;

  if (productList.length === 0) {
    container.innerHTML = '';
    if (noResults) noResults.classList.remove('hidden');
    return;
  }

  if (noResults) noResults.classList.add('hidden');

  container.innerHTML = productList.map(product => {
    // Escape product name for JavaScript string
    const escapedName = product.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    return `
      <div class="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
        <img src="${product.image}" 
             alt="${product.name}" 
             class="w-full h-48 object-cover"
             onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
        <div class="p-5">
          <h3 class="font-semibold text-lg leading-tight">${product.name}</h3>
          <p class="text-orange-600 font-bold text-2xl mt-2">${product.price} ETB</p>
          
          <button data-product-id="${product.id}"
                  data-product-name="${escapedName}"
                  data-product-price="${product.price}"
                  data-product-image="${product.image}"
                  class="add-to-cart-btn mt-5 w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-medium transition">
            Add to Cart
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners AFTER rendering
  attachAddToCartListeners();
}

function renderFeaturedProducts(productList) {
  const container = document.getElementById('featured-products');
  if (!container) return;

  const featured = productList.filter(product => product.featured).slice(0, 4);
  if (featured.length === 0) {
    container.innerHTML = '<p class="col-span-full text-center text-gray-500">No featured products available yet.</p>';
    return;
  }

  container.innerHTML = featured.map(product => {
    const escapedName = product.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    return `
      <div class="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
        <img src="${product.image}"
             alt="${product.name}"
             class="w-full h-48 object-cover"
             onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
        <div class="p-5">
          <h3 class="font-semibold text-lg leading-tight">${product.name}</h3>
          <p class="text-orange-600 font-bold text-2xl mt-2">${product.price} ETB</p>
          
          <button data-product-id="${product.id}"
                  data-product-name="${escapedName}"
                  data-product-price="${product.price}"
                  data-product-image="${product.image}"
                  class="add-to-cart-btn mt-5 w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-medium transition">
            Add to Cart
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners AFTER rendering
  attachAddToCartListeners();
}

// ==================== ADD TO CART EVENT LISTENER ====================
function attachAddToCartListeners() {
  document.querySelectorAll('.add-to-cart-btn').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const productId = this.dataset.productId;
      const productName = this.dataset.productName;
      const productPrice = parseFloat(this.dataset.productPrice);
      const productImage = this.dataset.productImage;
      
      console.log('🛒 Adding to cart:', { productId, productName, productPrice, productImage });
      
      // Call the imported addToCart function
      addToCart(productId, productName, productPrice, productImage);
      
      // Visual feedback
      this.textContent = 'Added! ✓';
      this.classList.remove('bg-orange-600', 'hover:bg-orange-700');
      this.classList.add('bg-green-600');
      
      setTimeout(() => {
        this.textContent = 'Add to Cart';
        this.classList.remove('bg-green-600');
        this.classList.add('bg-orange-600', 'hover:bg-orange-700');
      }, 1500);
    });
  });
}

// ==================== FILTER & SEARCH ====================
function filterProducts() {
  const searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
  const category = document.getElementById('category-filter')?.value || '';

  let filtered = allProducts;

  // Filter by category
  if (category && category !== '') {
    filtered = filtered.filter(product => product.category === category);
  }

  // Filter by search term
  if (searchTerm) {
    filtered = filtered.filter(product => 
      product.name.toLowerCase().includes(searchTerm)
    );
  }

  renderProducts(filtered);
}

// ==================== CART INITIALIZATION ====================
function initCartOnPage() {
  if (typeof updateCartCount === 'function') {
    updateCartCount();
  }
}

// ==================== INITIALIZE ====================
document.addEventListener('DOMContentLoaded', () => {
  // Load products
  loadProducts();

  // Setup search and filter
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');

  if (searchInput) searchInput.addEventListener('input', filterProducts);
  if (categoryFilter) categoryFilter.addEventListener('change', filterProducts);

  // Initialize cart count
  initCartOnPage();
});