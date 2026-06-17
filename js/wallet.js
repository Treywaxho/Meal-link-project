/**
 * js/wallet.js
 * Handles Wallet Balance and Transaction History with Firestore
 */

import { showToast, toggleModal } from './ui.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth state to confirm user
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await initializeWallet();
            setupDepositForm();
        } else {
            window.location.href = 'login.html';
        }
    });

    // Expose toggles to window for inline HTML onclicks
    window.toggleModal = toggleModal;
});

async function initializeWallet() {
    try {
        // Fetch User Balance
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        let initialBalance = 0;
        if (userDoc.exists()) {
            initialBalance = userDoc.data().balance || 0;
        }

        animateBalance(0, initialBalance);

        // Fetch Transactions
        await renderTransactions();

    } catch (error) {
        console.error("Error initializing wallet:", error);
        showToast("Failed to load wallet data.", "error");
    }
}

function setupDepositForm() {
    const customAmountInput = document.getElementById('custom-amount');
    const presets = document.querySelectorAll('.amount-preset');
    const form = document.getElementById('deposit-form');
    let selectedAmount = 0;

    // Preset buttons
    presets.forEach(btn => {
        btn.addEventListener('click', (e) => {
            presets.forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-outline');
            });
            e.target.classList.remove('btn-outline');
            e.target.classList.add('btn-primary');

            selectedAmount = parseFloat(e.target.dataset.amount);
            customAmountInput.value = selectedAmount; // Sync value
        });
    });

    customAmountInput.addEventListener('input', (e) => {
        selectedAmount = parseFloat(e.target.value);
        // Deselect presets
        presets.forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-outline');
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedAmount || selectedAmount <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }

        const btn = document.getElementById('confirm-deposit-btn');
        btn.style.animationPlayState = 'running';
        btn.textContent = 'Processing...';

        try {
            // 1. Get current balance
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) throw new Error("User data not found.");

            const currentBalance = userDoc.data().balance || 0;
            const newBalance = currentBalance + selectedAmount;

            // 2. Update balance
            await updateDoc(userDocRef, { balance: newBalance });

            // 3. Log transaction
            await addDoc(collection(db, 'transactions'), {
                userId: currentUser.uid,
                type: 'in',
                amount: selectedAmount,
                title: 'Wallet Deposit',
                date: new Date().toISOString()
            });

            // 4. Update UI
            toggleModal('deposit-modal', false);
            showToast(`Successfully deposited $${selectedAmount.toFixed(2)}`, 'success');

            // Reset Form
            form.reset();
            presets.forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-outline');
            });
            selectedAmount = 0;

            // Re-render
            animateBalance(currentBalance, newBalance);
            await renderTransactions();

        } catch (error) {
            console.error("Deposit Error:", error);
            showToast("Deposit failed. Try again.", "error");
        } finally {
            btn.style.animationPlayState = 'paused';
            btn.textContent = 'Confirm Deposit';
        }
    });
}

async function renderTransactions() {
    const container = document.getElementById('transactions-container');
    container.innerHTML = '<div style="text-align: center; padding: 30px;"><div class="spinner"></div></div>';

    try {
        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = '<p class="text-muted text-center">No recent transactions.</p>';
            return;
        }

        let html = '';
        let index = 0;
        querySnapshot.forEach((doc) => {
            const tx = doc.data();
            const dateOpt = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const dateStr = new Date(tx.date).toLocaleDateString(undefined, dateOpt);
            const typeClass = tx.type === 'in' ? 'tx-in' : 'tx-out';
            const iconClass = tx.type === 'in' ? 'fa-arrow-down' : 'fa-arrow-up';
            const sign = tx.type === 'in' ? '+' : '-';
            const delay = `delay-${(index % 3) + 1}`;
            index++;

            html += `
                <div class="transaction-item fade-in ${delay} ${typeClass}">
                    <div style="display: flex; align-items: center;">
                        <div class="transaction-icon">
                            <i class="fas ${iconClass}"></i>
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 1rem;">${tx.title}</h4>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${dateStr}</span>
                        </div>
                    </div>
                    <div class="tx-amount">
                        ${sign}$${tx.amount.toFixed(2)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (error) {
        console.error("Error fetching transactions:", error);
        container.innerHTML = '<p class="text-danger text-center">Error loading transactions.</p>';

        // Firestore composite index rule error handler:
        if (error.message.includes("requires an index")) {
            console.warn("Firestore requires a composite index for this query. For now, removing order by date to work without index creation.");
            await renderTransactionsWithoutIndex();
        }
    }
}

// Fallback if the user hasn't created the composite index in Firebase Console
async function renderTransactionsWithoutIndex() {
    const container = document.getElementById('transactions-container');
    const q = query(
        collection(db, 'transactions'),
        where('userId', '==', currentUser.uid)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        container.innerHTML = '<p class="text-muted text-center">No recent transactions.</p>';
        return;
    }

    // Sort manually in client
    const txs = [];
    querySnapshot.forEach(doc => txs.push(doc.data()));
    txs.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '';
    txs.forEach((tx, index) => {
        const dateOpt = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const dateStr = new Date(tx.date).toLocaleDateString(undefined, dateOpt);
        const typeClass = tx.type === 'in' ? 'tx-in' : 'tx-out';
        const iconClass = tx.type === 'in' ? 'fa-arrow-down' : 'fa-arrow-up';
        const sign = tx.type === 'in' ? '+' : '-';
        const delay = `delay-${(index % 3) + 1}`;

        html += `
                <div class="transaction-item fade-in ${delay} ${typeClass}">
                    <div style="display: flex; align-items: center;">
                        <div class="transaction-icon">
                            <i class="fas ${iconClass}"></i>
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 1rem;">${tx.title}</h4>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${dateStr}</span>
                        </div>
                    </div>
                    <div class="tx-amount">
                        ${sign}$${tx.amount.toFixed(2)}
                    </div>
                </div>
            `;
    });
    container.innerHTML = html;
}


// Number Counter Animation
function animateBalance(start, end) {
    const duration = 1000; // ms
    const el = document.getElementById('balance-display');
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing easeOutQuart
        const easeProgress = 1 - Math.pow(1 - progress, 4);

        const current = start + (end - start) * easeProgress;
        el.textContent = current.toFixed(2);

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = end.toFixed(2);
        }
    }

    requestAnimationFrame(update);
}
