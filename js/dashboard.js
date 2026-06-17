/**
 * js/dashboard.js
 * Renders Dashboard Layouts based on Role with Firestore
 */

import { showToast } from './ui.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    // Set Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dashboard-date').textContent = new Date().toLocaleDateString(undefined, options);

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // Fetch User Role and Balance from Firestore
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();

                    // Set Profile Info
                    document.getElementById('profile-name').textContent = userData.name || user.email.split('@')[0];
                    document.getElementById('profile-role').textContent = userData.role || 'student';

                    // Cache in local storage for quick sync
                    localStorage.setItem('user', JSON.stringify({ id: user.uid, ...userData }));

                    renderSidebar(userData.role);
                    await renderDashboardContent(user.uid, userData);
                } else {
                    console.error("User data not found in Firestore.");
                    window.location.href = 'login.html';
                }
            } catch (error) {
                console.error("Error loading dashboard data:", error);
                showToast("Error loading dashboard.", "error");
            }
        } else {
            window.location.href = 'login.html';
        }
    });

});

function renderSidebar(role) {
    const sidebar = document.getElementById('sidebar-menu-container');
    let linksHTML = '';

    const commonLinks = `
        <li><a href="dashboard.html" class="sidebar-link active"><i class="fas fa-home"></i> Dashboard</a></li>
    `;

    if (role === 'student') {
        linksHTML = `
            ${commonLinks}
            <li><a href="menu.html" class="sidebar-link"><i class="fas fa-hamburger"></i> Order Food</a></li>
            <li><a href="wallet.html" class="sidebar-link"><i class="fas fa-wallet"></i> My Wallet</a></li>
            <li><a href="orders.html" class="sidebar-link"><i class="fas fa-receipt"></i> Order History</a></li>
        `;
    } else if (role === 'vendor') {
        linksHTML = `
            ${commonLinks}
            <li><a href="orders.html" class="sidebar-link"><i class="fas fa-clipboard-list"></i> Active Orders</a></li>
            <li><a href="menu.html" class="sidebar-link"><i class="fas fa-edit"></i> Manage Menu</a></li>
            <li><a href="#" class="sidebar-link"><i class="fas fa-chart-line"></i> Earnings Report</a></li>
        `;
    } else if (role === 'admin') {
        linksHTML = `
            ${commonLinks}
            <li><a href="#" class="sidebar-link"><i class="fas fa-users"></i> Manage Users</a></li>
            <li><a href="#" class="sidebar-link"><i class="fas fa-store"></i> Approve Vendors</a></li>
            <li><a href="#" class="sidebar-link"><i class="fas fa-cogs"></i> System Settings</a></li>
        `;
    }

    sidebar.innerHTML = linksHTML;
}

async function renderDashboardContent(userId, userData) {
    const mainContent = document.getElementById('dashboard-main-content');
    const quickAction = document.getElementById('quick-action-container');

    if (userData.role === 'student') {

        // Fetch Order Stats dynamically
        let totalOrders = 0;
        let recentOrdersHTML = '';
        try {
            const q = query(collection(db, 'orders'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            totalOrders = snapshot.size;

            // Simple recent activity 
            // In a real app we would sort/limit, but skipping index requirements for Demo
            const ordersList = [];
            snapshot.forEach(doc => ordersList.push(doc.data()));
            ordersList.sort((a, b) => new Date(b.date) - new Date(a.date));

            const recent = ordersList.slice(0, 2);
            if (recent.length > 0) {
                recent.forEach(r => {
                    const dateStr = new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const itemsPreview = r.items.map(item => item.name).join(', ').substring(0, 40) + '...';
                    recentOrdersHTML += `
                      <div style="margin-bottom: 15px;">
                          <span style="font-size: 0.8rem; color: var(--text-muted);">${dateStr}</span>
                          <p style="font-weight: 500;">Ordered ${itemsPreview}</p>
                          <span class="badge badge-${r.status === 'completed' ? 'completed' : 'pending'}">${r.status.toUpperCase()}</span>
                      </div>
                   `;
                });
            } else {
                recentOrdersHTML = `<p class="text-muted">No recent activity.</p>`;
            }
        } catch (e) {
            console.error(e);
            recentOrdersHTML = `<p class="text-danger">Failed to load activity.</p>`;
        }

        // QUICK ACTION
        quickAction.innerHTML = `<a href="menu.html" class="btn btn-primary pulse">Order Now</a>`;

        // MAIN CONTENT
        mainContent.innerHTML = `
            <div class="stats-grid slide-up">
                <div class="glass-card stat-card">
                    <div class="stat-icon" style="background: rgba(46, 204, 113, 0.2); color: var(--success-color);">
                        <i class="fas fa-wallet"></i>
                    </div>
                    <div class="stat-info">
                        <p>Available Balance</p>
                        <h3>$${Number(userData.balance || 0).toFixed(2)}</h3>
                    </div>
                </div>
                
                <div class="glass-card stat-card delay-1">
                    <div class="stat-icon" style="background: rgba(52, 152, 219, 0.2); color: #3498db;">
                        <i class="fas fa-pizza-slice"></i>
                    </div>
                    <div class="stat-info">
                        <p>Total Orders</p>
                        <h3>${totalOrders}</h3>
                    </div>
                </div>

                <div class="glass-card stat-card delay-2">
                    <div class="stat-icon" style="background: rgba(231, 76, 60, 0.2); color: var(--danger-color);">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="stat-info">
                        <p>Points Earned</p>
                        <h3>${totalOrders * 10}</h3>
                    </div>
                </div>
            </div>

            <div class="glass-card slide-up delay-3" style="padding: 24px;">
                <h3 style="margin-bottom: 20px;">Recent Activity</h3>
                <div style="border-left: 2px solid var(--primary-color); padding-left: 20px;">
                    ${recentOrdersHTML}
                </div>
                <a href="orders.html" class="btn btn-outline btn-block mt-2">View Full History</a>
            </div>
        `;
    } else if (userData.role === 'vendor') {
        quickAction.innerHTML = `<button class="btn btn-primary">Add Menu Item</button>`;

        mainContent.innerHTML = `
            <div class="stats-grid slide-up">
                <div class="glass-card stat-card">
                    <div class="stat-icon" style="background: rgba(241, 196, 15, 0.2); color: #f1c40f;">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <p>Pending Orders</p>
                        <h3>0</h3>
                    </div>
                </div>
                <div class="glass-card stat-card delay-1">
                    <div class="stat-icon" style="background: rgba(46, 204, 113, 0.2); color: var(--success-color);">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stat-info">
                        <p>Today's Revenue</p>
                        <h3>$0.00</h3>
                    </div>
                </div>
            </div>

            <div class="glass-card slide-up delay-2">
                <h3 style="margin-bottom: 15px;">Incoming Orders</h3>
                <p class="text-muted">No pending orders.</p>
            </div>
        `;
    } else if (userData.role === 'admin') {
        quickAction.innerHTML = `<button class="btn btn-secondary">Generate Report</button>`;
        mainContent.innerHTML = `
            <div class="stats-grid slide-up">
                 <div class="glass-card stat-card">
                    <div class="stat-icon" style="background: rgba(52, 152, 219, 0.2); color: #3498db;">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <p>Total Users</p>
                        <h3>Demo</h3>
                    </div>
                </div>
                 <div class="glass-card stat-card delay-1">
                    <div class="stat-icon" style="background: rgba(46, 204, 113, 0.2); color: var(--success-color);">
                        <i class="fas fa-store"></i>
                    </div>
                    <div class="stat-info">
                        <p>Active Vendors</p>
                        <h3>Demo</h3>
                    </div>
                </div>
                <div class="glass-card stat-card delay-2">
                    <div class="stat-icon" style="background: rgba(155, 89, 182, 0.2); color: #9b59b6;">
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                    <div class="stat-info">
                        <p>Total Transactions</p>
                        <h3>-</h3>
                    </div>
                </div>
            </div>
        `;
    }
}
