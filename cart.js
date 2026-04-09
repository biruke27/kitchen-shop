console.log('🛒 cart.js loaded');

let cart = [];
const CART_KEY = 'hnb_prime_cart';

function getCart() {
  const saved = localStorage.getItem(CART_KEY);
  console.log('📦 getCart - raw data:', saved);
  
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    console.log('📦 getCart - parsed:', parsed);
    return parsed;
  } catch (error) {
    console.warn('Failed to parse cart from localStorage:', error);
    return [];
  }
}

function saveCart(cartItems) {
  console.log('💾 saveCart called with:', cartItems);
  cart = cartItems;
  localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  updateCartCount();
  
  // Also update the cart page if we're on it
  if (document.getElementById('cart-items')) {
    console.log('📄 On cart page, rendering...');
    renderCartPage();
  }
}

function clearCart() {
  saveCart([]);
}

function updateCartCount() {
  const countEls = document.querySelectorAll('#cart-count');
  const total = getCart().reduce((sum, item) => sum + (item.quantity || 0), 0);
  console.log('🔢 updateCartCount - total:', total);

  countEls.forEach(el => {
    el.textContent = total;
    el.style.display = total === 0 ? 'none' : 'flex';
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-lg z-50';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function addToCart(productId, productName, productPrice, productImage) {
  console.log('🛒 addToCart called with:', {productId, productName, productPrice, productImage});
  
  let id, name, price, image;
  
  if (typeof productId === 'object') {
    const product = productId;
    id = product.id;
    name = product.name;
    price = product.price;
    image = product.image;
  } else {
    id = productId;
    name = productName;
    price = productPrice;
    image = productImage;
  }

  cart = getCart();
  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ 
      id: id, 
      name: name, 
      price: parseFloat(price), 
      image: image || 'https://via.placeholder.com/96?text=No+Image', 
      quantity: 1 
    });
  }

  saveCart(cart);
  showToast(`${name} added to cart`);
}

function updateQuantity(id, change) {
  console.log('🔧 updateQuantity:', id, change);
  cart = getCart();
  const item = cart.find(item => item.id === id);
  
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      cart = cart.filter(item => item.id !== id);
    }
    saveCart(cart);
  }
}

function removeFromCart(id) {
  console.log('🗑️ removeFromCart:', id);
  cart = getCart().filter(item => item.id !== id);
  saveCart(cart);
}

function renderCartPage() {
  console.log('🎨 renderCartPage START');
  
  const cartItemsContainer = document.getElementById('cart-items');
  const cartFooter = document.getElementById('cart-footer');
  const emptyMessage = document.getElementById('empty-cart-message');
  const itemCount = document.getElementById('cart-item-count');
  const subtotalEl = document.getElementById('cart-subtotal');

  console.log('Elements found:', {
    cartItemsContainer: !!cartItemsContainer,
    cartFooter: !!cartFooter,
    emptyMessage: !!emptyMessage,
    itemCount: !!itemCount,
    subtotalEl: !!subtotalEl
  });

  if (!cartItemsContainer || !emptyMessage || !itemCount || !subtotalEl) {
    console.error('❌ Required elements missing!');
    return;
  }

  cart = getCart();
  console.log('📦 Cart contents:', cart);
  
  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  itemCount.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'}`;

  if (cart.length === 0) {
    console.log('📭 Cart is empty');
    cartItemsContainer.innerHTML = '';
    emptyMessage.classList.remove('hidden');
    if (cartFooter) cartFooter.style.opacity = '0.5';
    subtotalEl.textContent = '0 ETB';
    return;
  }

  console.log('✅ Rendering', cart.length, 'items');
  emptyMessage.classList.add('hidden');
  if (cartFooter) cartFooter.style.opacity = '1';

  let subtotal = 0;
  cartItemsContainer.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    return `
      <div class="flex flex-col gap-4 rounded-3xl border border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-4">
          <img src="${item.image}" alt="${item.name}" class="h-24 w-24 rounded-2xl object-cover" onerror="this.src='https://via.placeholder.com/96?text=No+Image'">
          <div>
            <h3 class="font-semibold text-lg">${item.name}</h3>
            <div class="flex items-center gap-3 mt-2">
              <button onclick="updateQuantity('${item.id}', -1)" class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold">−</button>
              <span class="font-medium">${item.quantity}</span>
              <button onclick="updateQuantity('${item.id}', 1)" class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold">+</button>
            </div>
            <p class="text-gray-500 mt-1">${item.price} ETB each</p>
          </div>
        </div>
        <div class="flex items-center justify-between gap-4 md:max-w-xs md:flex-col md:items-end">
          <span class="font-semibold text-orange-600 text-lg">${itemTotal} ETB</span>
          <button onclick="removeFromCart('${item.id}')" class="rounded-full border border-gray-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
            <i class="fas fa-trash mr-2"></i>Remove
          </button>
        </div>
      </div>
    `;
  }).join('');

  subtotalEl.textContent = `${subtotal} ETB`;
  console.log('✅ Render complete. Subtotal:', subtotal);
}

function checkout() {
  cart = getCart();
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }

  let message = '🛒 *New Order from HNB PRIME*%0A%0A';
  let total = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    message += `• ${item.quantity}x ${item.name} - ${itemTotal} ETB%0A`;
    total += itemTotal;
  });

  message += `%0A*Total: ${total} ETB*%0A%0APlease confirm my order and share payment/delivery details.`;
  
  const telegramLink = `https://t.me/Lovebarr?text=${message}`;
  window.open(telegramLink, '_blank');
  
  if (confirm('Order message prepared. Clear cart and continue shopping?')) {
    clearCart();
    renderCartPage();
  }
}

function initCartPage() {
  console.log('🚀 initCartPage called');
  if (document.getElementById('cart-items')) {
    console.log('✅ On cart page, rendering...');
    renderCartPage();
  } else {
    console.log('ℹ️ Not on cart page');
  }
  updateCartCount();
}

function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
      const icon = hamburger.querySelector('i');
      if (icon) {
        if (mobileMenu.classList.contains('hidden')) {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        } else {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-times');
        }
      }
    });
  }
}

// Make functions globally available
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.checkout = checkout;
window.getCart = getCart;
window.renderCartPage = renderCartPage;

// Export what script.js imports so module loading succeeds
export { addToCart, updateCartCount };

// IMMEDIATE EXECUTION - Don't wait for DOMContentLoaded
console.log('🔥 Running immediate cart check');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing...');
    updateCartCount();
    initCartPage();
    initMobileMenu();
  });
} else {
  console.log('📄 DOM already loaded, initializing now...');
  updateCartCount();
  initCartPage();
  initMobileMenu();
}

// Force render after a small delay (safety net)
setTimeout(() => {
  console.log('⏰ Timeout safety check');
  if (document.getElementById('cart-items')) {
    const cart = getCart();
    console.log('🔄 Timeout check - cart has', cart.length, 'items');
    if (cart.length > 0) {
      console.log('⚠️ Forcing render from timeout');
      renderCartPage();
    }
  }
}, 500);

// Storage event listener
window.addEventListener('storage', (e) => {
  if (e.key === CART_KEY) {
    updateCartCount();
    if (document.getElementById('cart-items')) {
      renderCartPage();
    }
  }
});

console.log('✅ cart.js fully loaded and ready');