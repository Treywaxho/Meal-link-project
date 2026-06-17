/**
 * js/ui.js
 * Common UI utilities for notifications, modals, spinners, and theme toggling.
 */

// Toast Notifications
export function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Add icon based on type
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300); // Wait for transition
    }, 3000);
}

// Loading Spinner Overlay
export function toggleLoader(show = true) {
    let loader = document.getElementById('global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="spinner"></div>
            <p style="margin-top: 10px; font-weight: 500; color: var(--text-main);">Loading...</p>
        `;
        document.body.appendChild(loader);
    }

    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

// Modal Toggle
export function toggleModal(modalId, show = true) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (show) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Dark Mode Toggle
export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Check local storage for preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark-theme');
            const isDark = document.documentElement.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');

            // Update button icon if needed
            themeToggleBtn.innerHTML = isDark ? '☀️' : '🌙';
        });

        // Initial icon state
        themeToggleBtn.innerHTML = document.documentElement.classList.contains('dark-theme') ? '☀️' : '🌙';
    }
}

// Responsive Nav Toggle
export function initNav() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active'); // Optional: animate hamburger to X
        });
    }
}
