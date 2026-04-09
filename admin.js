// Firebase imports
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let products = [];
let editingId = null;

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 text-white ${
    type === 'success' ? 'bg-green-600' : 'bg-red-600'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

async function loadProducts() {
  try {
    const querySnapshot = await getDocs(collection(window.db, "products"));
    products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderProducts();
  } catch (error) {
    console.error("Failed to load products:", error);
  }
}

function renderProducts() {
  const container = document.getElementById('products-list');
  if (!container) return;

  container.innerHTML = products.map(product => `
    <div class="border rounded-lg p-4 flex justify-between items-center">
      <div class="flex-1">
        <h3 class="font-semibold">${product.name}</h3>
        <p class="text-gray-600">${product.category} - ${product.price} ETB</p>
        ${product.featured ? '<span class="text-orange-600 text-sm">Featured</span>' : ''}
      </div>
      <div class="flex gap-2">
        <button onclick="editProduct('${product.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
          Edit
        </button>
        <button onclick="deleteProduct('${product.id}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

async function addProduct(event) {
  event.preventDefault();

  const name = document.getElementById('product-name').value;
  const price = parseInt(document.getElementById('product-price').value);
  const category = document.getElementById('product-category').value;
  const featured = document.getElementById('product-featured').checked;
  const imageFile = document.getElementById('product-image').value.trim();

  if (!name || !price || !category) {
    showToast('Please fill all required fields (name, price, category)', 'error');
    return;
  }

  try {
    if (editingId) {
      // Update existing
      await updateDoc(doc(window.db, "products", editingId), {
        name,
        price,
        category,
        image: imageFile || undefined,
        featured
      });
      showToast('Product updated successfully!');
    } else {
      // Add new
      await addDoc(collection(window.db, "products"), {
        name,
        price,
        category,
        image: imageFile,
        featured
      });
      showToast('Product added successfully!');
    }

    // Reset form
    event.target.reset();
    editingId = null;
    const formTitle = document.getElementById('form-title');
    if (formTitle) formTitle.textContent = 'Add New Product';
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Add Product';

    // Reload products
    await loadProducts();
  } catch (error) {
    console.error("Failed to save product:", error);
    showToast('Failed to save product: ' + error.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    console.log('Deleting product:', id);
    await deleteDoc(doc(window.db, "products", id));
    await loadProducts();
    showToast('Product deleted successfully!');
  } catch (error) {
    console.error("Failed to delete product:", error);
    showToast('Failed to delete product', 'error');
  }
}

function editProduct(id) {
  console.log('Editing product:', id);
  const product = products.find(p => p.id === id);
  if (!product) {
    console.error('Product not found:', id);
    return;
  }

  console.log('Found product:', product);

  // Populate form
  document.getElementById('product-name').value = product.name;
  document.getElementById('product-price').value = product.price;
  document.getElementById('product-category').value = product.category;
  document.getElementById('product-image').value = product.image;
  document.getElementById('product-featured').checked = product.featured;

  // Set editing mode
  editingId = id;
  const formTitle = document.getElementById('form-title');
  if (formTitle) formTitle.textContent = 'Edit Product';
  const submitBtn = document.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Update Product';

  // Scroll to form
  document.getElementById('add-product-form').scrollIntoView({ behavior: 'smooth' });

  console.log('Edit mode set, editingId:', editingId);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready
  const checkFirebase = () => {
    if (window.db) {
      loadProducts();
    } else {
      setTimeout(checkFirebase, 100);
    }
  };
  checkFirebase();

  const form = document.getElementById('add-product-form');
  if (form) {
    form.addEventListener('submit', addProduct);
  }

  // Expose functions to global scope for onclick handlers
  window.editProduct = editProduct;
  window.deleteProduct = deleteProduct;
});
