/**
 * js/menu.js
 * Renders food items, handles filtering and cart logic with Firestore
 */

import { showToast, toggleModal } from './ui.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Keep Food Items as hardcoded constants for now to prevent needing an admin data entry script
const foodItems = [
    { id: 'F001', name: 'Campus Breakfast Plate', vendor: 'Sunrise Cafe', price: 3.50, category: 'breakfast', rating: 4.8, imageType: 'fas fa-coffee' },
    { id: 'F002', name: 'Classic Beef Burger', vendor: 'Grill Station', price: 5.00, category: 'lunch', rating: 4.5, imageType: 'fas fa-hamburger' },
    { id: 'F003', name: 'Chicken Wrap', vendor: 'Healthy Bites', price: 4.50, category: 'lunch', rating: 4.2, imageType: 'fas fa-drumstick-bite' },
    { id: 'F004', name: 'Margherita Pizza', vendor: 'Pizza Point', price: 7.00, category: 'lunch', rating: 4.9, imageType: 'fas fa-pizza-slice' },
    { id: 'F005', name: 'Fries & Dip', vendor: 'Grill Station', price: 2.00, category: 'snacks', rating: 4.0, imageType: 'fas fa-utensils' },
    { id: 'F006', name: 'Fresh Smoothie', vendor: 'Healthy Bites', price: 2.50, category: 'drinks', rating: 4.7, imageType: 'fas fa-glass-whiskey' },
    { id: 'F007', name: 'Iced Latte', vendor: 'Sunrise Cafe', price: 3.00, category: 'drinks', rating: 4.6, imageType: 'fas fa-mug-hot' },
    { id: 'F008', name: 'Spicy Noodles', vendor: 'Asian Wok', price: 6.00, category: 'lunch', rating: 4.3, imageType: 'fas fa-bowl-food' }
];

let cart = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadCartFromStorage();
            renderMenu(foodItems);
        } else {
            window.location.href = 'login.html';
        }
    });

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const category = e.target.dataset.category;
            const filtered = category === 'all'
                ? foodItems
                : foodItems.filter(item => item.category === category);

            renderMenu(filtered);
        });
    });

    // Cart Modal Toggles
    document.getElementById('open-cart-btn').addEventListener('click', () => {
        renderCartModal();
        toggleModal('cart-modal', true);
    });

    document.getElementById('close-cart-btn').addEventListener('click', () => {
        toggleModal('cart-modal', false);
    });

    // Checkout
    document.getElementById('checkout-btn').addEventListener('click', handleCheckout);
});

function renderMenu(items) {
    const grid = document.getElementById('food-grid');
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = '<p class="text-center text-muted" style="grid-column: 1/-1;">No items found in this category.</p>';
        return;
    }

    items.forEach((item, index) => {
        const delayClass = `delay-${(index % 5) + 1}`;

        // Generate stars
        let stars = '';
        for (let i = 0; i < 5; i++) {
            if (i < Math.floor(item.rating)) stars += '<i class="fas fa-star" style="color: var(--accent-color);"></i>';
            else stars += '<i class="far fa-star" style="color: #ccc;"></i>';
        }

        const card = document.createElement('div');
        card.className = `glass-card food-card slide-up ${delayClass}`;
        card.innerHTML = `
            <div class="food-image-placeholder">
                <i class="${item.imageType}"></i>
            </div>
            <div class="food-details">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h3 class="food-title">${item.name}</h3>
                    <div style="font-size: 0.8rem;">${stars} <span class="text-muted">(${item.rating})</span></div>
                </div>
                <p class="food-vendor"><i class="fas fa-store"></i> ${item.vendor}</p>
                
                <div class="food-price-row">
                    <span class="food-price">$${item.price.toFixed(2)}</span>
                    <button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${item.id}">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    // Add listners to new buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            addToCart(id);

            // Small animation feedback
            const icon = e.currentTarget.querySelector('i');
            icon.className = 'fas fa-check';
            setTimeout(() => { icon.className = 'fas fa-plus'; }, 1000);
        });
    });
}

function addToCart(itemId) {
    const item = foodItems.find(f => f.id === itemId);
    if (!item) return;

    const existing = cart.find(c => c.id === itemId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...item, qty: 1 });
    }

    saveCart();
    updateCartIcon();
    showToast(`${item.name} added to cart`, 'success');
}

function removeFromCart(itemId) {
    cart = cart.filter(c => c.id !== itemId);
    saveCart();
    updateCartIcon();
    renderCartModal();
}

function updateQty(itemId, change) {
    const item = cart.find(c => c.id === itemId);
    if (!item) return;

    item.qty += change;
    if (item.qty <= 0) {
        removeFromCart(itemId);
    } else {
        saveCart();
        updateCartIcon();
        renderCartModal();
    }
}

function updateCartIcon() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cart-count');
    badge.textContent = count;

    if (count > 0) {
        badge.style.animation = 'pulse 0.5s';
        setTimeout(() => badge.style.animation = '', 500);
    }
}

function saveCart() {
    localStorage.setItem(`cart_${currentUser.uid}`, JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem(`cart_${currentUser.uid}`);
    if (saved) {
        cart = JSON.parse(saved);
        updateCartIcon();
    }
}

// Ensure functions are available globally for inline onclick in modal
window.updateQty = updateQty;
window.removeFromCart = removeFromCart;

function renderCartModal() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (cart.length === 0) {
        container.innerHTML = '<p class="text-muted text-center" style="padding: 20px 0;">Your cart is empty.</p>';
        totalEl.textContent = '$0.00';
        checkoutBtn.disabled = true;
        return;
    }

    checkoutBtn.disabled = false;
    let html = '';
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        html += `
            <div class="cart-item fade-in">
                <div>
                    <h4 style="margin-bottom: 5px;">${item.name}</h4>
                    <p class="text-muted" style="font-size: 0.85rem;">$${item.price.toFixed(2)} x ${item.qty}</p>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateQty('${item.id}', -1)"><i class="fas fa-minus"></i></button>
                    <span style="font-weight: 600; width: 20px; text-align: center;">${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty('${item.id}', 1)"><i class="fas fa-plus"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    totalEl.textContent = `$${total.toFixed(2)}`;
}

async function handleCheckout() {
    if (!currentUser) return;

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const checkoutBtn = document.getElementById('checkout-btn');

    checkoutBtn.style.animationPlayState = 'running';
    checkoutBtn.textContent = 'Processing...';

    try {
        // 1. Get current balance from Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) throw new Error("User data not found.");

        const currentBalance = userDoc.data().balance || 0;

        if (currentBalance < total) {
            showToast('Insufficient funds in wallet!', 'error');
            return;
        }

        // 2. Deduct balance
        const newBalance = currentBalance - total;
        await updateDoc(userDocRef, { balance: newBalance });

        // 3. Create Order to Firestore
        const uniqueOrderNum = 'ORD-' + Math.floor(Math.random() * 90000 + 10000);
        await addDoc(collection(db, 'orders'), {
            userId: currentUser.uid,
            orderNumber: uniqueOrderNum,
            date: new Date().toISOString(),
            total: total,
            items: [...cart],
            status: 'pending' // pending, preparing, completed
        });

        // 4. Create Transaction Log to Firestore
        await addDoc(collection(db, 'transactions'), {
            userId: currentUser.uid,
            type: 'out',
            amount: total,
            title: `Order Checkout (${uniqueOrderNum})`,
            date: new Date().toISOString()
        });

        // 5. Clean up local state
        cart = [];
        saveCart();
        updateCartIcon();

        toggleModal('cart-modal', false);
        showToast('Order placed successfully!', 'success');

        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 1500);

    } catch (error) {
        console.error("Checkout Error:", error);
        showToast("Checkout failed. Please try again.", "error");
    } finally {
        checkoutBtn.style.animationPlayState = 'paused';
        checkoutBtn.textContent = 'Proceed to Checkout';
    }
}
