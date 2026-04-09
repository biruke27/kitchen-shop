// admin.js - Final Version with Undo Sold + Grand Total Profit

import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let products = [];
let editingId = null;

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 text-white ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
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
    updateGrandTotal();
  } catch (error) {
    console.error("Failed to load products:", error);
    showToast("Failed to load products", "error");
  }
}

function updateGrandTotal() {
  const grandTotalEl = document.getElementById('grand-total');
  if (!grandTotalEl) return;

  let totalProfit = 0;
  products.forEach(product => {
    const unitProfit = (product.sellingPrice || product.price || 0) - (product.purchasePrice || 0);
    const totalSold = product.totalSold || 0;
    totalProfit += unitProfit * totalSold;
  });

  grandTotalEl.textContent = totalProfit.toLocaleString() + " ETB";
}

function renderProducts() {
  const container = document.getElementById('products-list');
  if (!container) return;

  container.innerHTML = products.map(product => {
    const unitProfit = (product.sellingPrice || product.price || 0) - (product.purchasePrice || 0);
    const totalSold = product.totalSold || 0;
    const currentStock = product.stock || 0;
    const totalProfit = unitProfit * totalSold;

    return `
      <div class="border rounded-xl p-5 hover:shadow-md transition-all">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="font-semibold text-lg">${product.name}</h3>
            <p class="text-gray-600">${product.category} • ${product.sellingPrice || product.price} ETB</p>
            
            <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>Stock: <span class="${currentStock <= 5 ? 'text-red-600 font-bold' : 'text-gray-600'}">${currentStock}</span></div>
              <div>Total Sold: <span class="font-medium">${totalSold}</span></div>
              <div>Unit Profit: <span class="text-green-600">${unitProfit} ETB</span></div>
              <div>Total Profit: <span class="text-green-600 font-semibold">${totalProfit} ETB</span></div>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <button onclick="sellProduct('${product.id}')" 
                    class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm">Sold (+1)</button>
            <button onclick="returnOneSold('${product.id}')" 
                    class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm">Return (-1)</button>
            <button onclick="editProduct('${product.id}')" 
                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Edit</button>
            <button onclick="deleteProduct('${product.id}')" 
                    class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Sell One Unit
async function sellProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product || (product.stock || 0) <= 0) {
    showToast("No stock available!", "error");
    return;
  }

  if (!confirm(`Mark 1 unit of "${product.name}" as sold?`)) return;

  try {
    await updateDoc(doc(window.db, "products", id), {
      stock: (product.stock || 0) - 1,
      totalSold: (product.totalSold || 0) + 1,
      lastUpdated: serverTimestamp()
    });
    showToast(`1 unit sold!`, "success");
    await loadProducts();
  } catch (error) {
    showToast("Failed to record sale", "error");
  }
}

// Return One Sold Unit (Undo)
async function returnOneSold(id) {
  const product = products.find(p => p.id === id);
  if (!product || (product.totalSold || 0) <= 0) {
    showToast("No sold records to return", "error");
    return;
  }

  if (!confirm(`Return 1 sold unit of "${product.name}"? (Stock will increase)`)) return;

  try {
    await updateDoc(doc(window.db, "products", id), {
      stock: (product.stock || 0) + 1,
      totalSold: (product.totalSold || 0) - 1,
      lastUpdated: serverTimestamp()
    });
    showToast(`1 unit returned!`, "success");
    await loadProducts();
  } catch (error) {
    showToast("Failed to return unit", "error");
  }
}

// Reset All Sold Records (Clear Grand Total)
async function resetAllSoldRecords() {
  if (!confirm("This will reset TOTAL SOLD and PROFIT for ALL products to zero.\n\nAre you sure?")) return;

  try {
    for (const product of products) {
      if (product.totalSold && product.totalSold > 0) {
        await updateDoc(doc(window.db, "products", product.id), {
          totalSold: 0,
          lastUpdated: serverTimestamp()
        });
      }
    }
    showToast("All sold records cleared successfully!", "success");
    await loadProducts();
  } catch (error) {
    showToast("Failed to clear records", "error");
  }
}

// Add or Update Product
async function addProduct(event) {
  event.preventDefault();

  const name = document.getElementById('product-name').value.trim();
  const sellingPrice = parseInt(document.getElementById('product-price').value);
  const purchasePrice = parseInt(document.getElementById('purchase-price').value) || 0;
  const stock = parseInt(document.getElementById('product-stock').value) || 0;
  const category = document.getElementById('product-category').value;
  const image = document.getElementById('product-image').value.trim();
  const featured = document.getElementById('product-featured').checked;

  if (!name || !sellingPrice || !category) {
    showToast('Please fill Product Name, Selling Price and Category', 'error');
    return;
  }

  try {
    const productData = {
      name,
      sellingPrice,
      purchasePrice,
      stock,
      totalSold: 0,
      category,
      image: image || null,
      featured: featured || false,
      lastUpdated: serverTimestamp()
    };

    if (editingId) {
      await updateDoc(doc(window.db, "products", editingId), productData);
      showToast('Product updated successfully!');
    } else {
      await addDoc(collection(window.db, "products"), productData);
      showToast('Product added successfully!');
    }

    event.target.reset();
    editingId = null;
    document.getElementById('form-title').textContent = 'Add New Product';
    document.querySelector('button[type="submit"]').textContent = 'Add Product';

    await loadProducts();
  } catch (error) {
    showToast('Error saving product', 'error');
  }
}

// Delete & Edit functions remain the same
async function deleteProduct(id) {
  if (!confirm('Delete this product permanently?')) return;
  try {
    await deleteDoc(doc(window.db, "products", id));
    showToast('Product deleted successfully!');
    await loadProducts();
  } catch (error) {
    showToast('Failed to delete product', 'error');
  }
}

function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  editingId = id;

  document.getElementById('product-name').value = product.name || '';
  document.getElementById('product-price').value = product.sellingPrice || product.price || '';
  document.getElementById('purchase-price').value = product.purchasePrice || 0;
  document.getElementById('product-stock').value = product.stock || 0;
  document.getElementById('product-category').value = product.category || '';
  document.getElementById('product-image').value = product.image || '';
  document.getElementById('product-featured').checked = product.featured || false;

  document.getElementById('form-title').textContent = 'Edit Product';
  document.querySelector('button[type="submit"]').textContent = 'Update Product';

  document.getElementById('add-product-form').scrollIntoView({ behavior: 'smooth' });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const checkFirebase = () => {
    if (window.db) loadProducts();
    else setTimeout(checkFirebase, 100);
  };
  checkFirebase();

  const form = document.getElementById('add-product-form');
  if (form) form.addEventListener('submit', addProduct);

  window.editProduct = editProduct;
  window.deleteProduct = deleteProduct;
  window.sellProduct = sellProduct;
  window.returnOneSold = returnOneSold;
  window.resetAllSoldRecords = resetAllSoldRecords;
});