/**
 * js/orders.js
 * Handles reading and displaying Order History with Firestore
 */

import { toggleModal } from './ui.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    orderBy,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let orders = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await fetchAndRenderOrders();
        } else {
            window.location.href = 'login.html';
        }
    });

    // Expose toggles to window for inline HTML onclicks
    window.toggleModal = toggleModal;
    window.viewOrderDetails = viewOrderDetails;
});

async function fetchAndRenderOrders() {
    const container = document.getElementById('orders-list');
    container.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner"></div></div>';

    try {
        const q = query(
            collection(db, 'orders'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
        );

        const snapshot = await getDocs(q);

        orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });

        renderOrdersHTML(container);

    } catch (error) {
        console.error("Error fetching orders:", error);

        if (error.message.includes("requires an index")) {
            console.warn("Firestore needs an index. Falling back to client-side sort.");
            await fetchOrdersWithoutIndex(container);
        } else {
            container.innerHTML = '<p class="text-danger text-center">Failed to load orders.</p>';
        }
    }
}

async function fetchOrdersWithoutIndex(container) {
    try {
        const q = query(
            collection(db, 'orders'),
            where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });

        // Client side sort
        orders.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderOrdersHTML(container);
    } catch (e) {
        container.innerHTML = '<p class="text-danger text-center">Failed to load orders.</p>';
    }
}

function renderOrdersHTML(container) {
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 60px 20px;">
                <i class="fas fa-receipt" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No Orders Yet</h3>
                <p class="text-muted">When you place an order, it will appear here.</p>
                <a href="menu.html" class="btn btn-primary mt-1">Browse Menu</a>
            </div>
        `;
        return;
    }

    let html = '';
    orders.forEach((order, index) => {
        const delayClass = `delay-${(index % 5) + 1}`;
        const dateOpt = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };

        // Handle firestore timestamps vs iso strings
        const dateObj = (order.date && order.date.toDate) ? order.date.toDate() : new Date(order.date);
        const dateStr = dateObj.toLocaleDateString(undefined, dateOpt);

        // Format Items Preview
        const itemsPreview = order.items.map(item => `${item.qty}x ${item.name}`).join(', ');

        // Status Badge
        let badgeClass = 'badge-pending';
        let badgeText = 'Pending';
        if (order.status === 'preparing') { badgeClass = 'badge-preparing'; badgeText = 'Preparing'; }
        if (order.status === 'completed') { badgeClass = 'badge-completed'; badgeText = 'Completed'; }

        html += `
            <div class="glass-card order-card slide-up ${delayClass}">
                <div class="order-header">
                    <div>
                        <div class="order-id">${order.orderNumber || order.id}</div>
                        <div class="order-date"><i class="far fa-clock"></i> ${dateStr}</div>
                    </div>
                    <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="order-body">
                    <div class="order-items-preview truncate" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${itemsPreview}
                    </div>
                    <div class="order-total">$${parseFloat(order.total).toFixed(2)}</div>
                </div>
                <div class="order-footer">
                    <button class="btn btn-outline btn-sm" onclick="viewOrderDetails('${order.id}')">
                        View Details
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function viewOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Populate Modal
    document.getElementById('modal-order-id').textContent = order.orderNumber || order.id;

    // Status
    const statusBadge = document.getElementById('modal-order-status');
    statusBadge.className = 'badge'; // reset
    if (order.status === 'pending') { statusBadge.classList.add('badge-pending'); statusBadge.textContent = 'Pending'; }
    if (order.status === 'preparing') { statusBadge.classList.add('badge-preparing'); statusBadge.textContent = 'Preparing'; }
    if (order.status === 'completed') { statusBadge.classList.add('badge-completed'); statusBadge.textContent = 'Completed'; }

    // Date
    const dateObj = (order.date && order.date.toDate) ? order.date.toDate() : new Date(order.date);
    const dateOpt = { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('modal-order-date').textContent = dateObj.toLocaleDateString(undefined, dateOpt);

    // Items
    const itemsContainer = document.getElementById('modal-order-items');
    let itemsHTML = '';
    order.items.forEach(item => {
        itemsHTML += `
            <div class="details-item">
                <span>${item.qty}x ${item.name}</span>
                <span>$${(item.price * item.qty).toFixed(2)}</span>
            </div>
        `;
    });
    itemsContainer.innerHTML = itemsHTML;

    // Total
    document.getElementById('modal-order-total').textContent = `$${parseFloat(order.total).toFixed(2)}`;

    toggleModal('order-details-modal', true);
}
