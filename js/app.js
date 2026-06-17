/**
 * js/app.js
 * Main Entry Point
 */

import { initTheme, initNav } from './ui.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  // Initialize global UI components
  initTheme();
  initNav();

  // Setup global auth state logic
  checkAuthState();
});

// Firebase Auth Check
function checkAuthState() {
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const dashboardLink = document.getElementById('dashboard-link');
  const logoutBtn = document.getElementById('logout-btn');
  const userGreeting = document.getElementById('user-greeting');

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is logged in
      if (loginLink) loginLink.style.display = 'none';
      if (registerLink) registerLink.style.display = 'none';
      if (dashboardLink) dashboardLink.style.display = 'block';

      if (logoutBtn) {
        logoutBtn.style.display = 'block';
        // Remove existing if any, to avoid duplicates
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        newLogoutBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          await signOut(auth);
          localStorage.removeItem('user');
          window.location.href = 'index.html';
        });
      }

      // Keep localStorage in sync so other pages can load instantly
      let localUser = JSON.parse(localStorage.getItem('user'));
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          localUser = { id: user.uid, ...userDoc.data() };
          localStorage.setItem('user', JSON.stringify(localUser));
        }
      } catch (err) {
        console.error("Error syncing user data:", err);
      }

      if (userGreeting && localUser) userGreeting.textContent = `Hello, ${localUser.name}`;

      // Optional: if on login/register and user is logged in, redirect to dashboard
      const currentPage = window.location.pathname.split('/').pop();
      if (currentPage === 'login.html' || currentPage === 'register.html') {
        // Prevent race conditions by only doing this if user just arrived
        // window.location.href = 'dashboard.html';
      }

    } else {
      // User is logged out
      if (loginLink) loginLink.style.display = 'block';
      if (registerLink) registerLink.style.display = 'block';
      if (dashboardLink) dashboardLink.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';

      localStorage.removeItem('user');

      // Redirect from protected pages
      const protectedPages = ['dashboard.html', 'menu.html', 'wallet.html', 'orders.html'];
      const currentPage = window.location.pathname.split('/').pop() || '';
      if (protectedPages.includes(currentPage)) {
        window.location.href = 'login.html';
      }
    }
  });
}
