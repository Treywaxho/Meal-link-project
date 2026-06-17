/**
 * js/auth.js
 * Handles Firebase Login and Registration Logic
 */

import { showToast, toggleLoader } from './ui.js';
import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

async function handleLogin(e) {
    e.preventDefault();

    const emailInput = document.getElementById('studentId');
    const passwordInput = document.getElementById('password');
    const btn = e.target.querySelector('button');

    // Basic Validation
    let isValid = true;
    if (!emailInput.value.trim()) { emailInput.classList.add('is-invalid'); isValid = false; }
    else { emailInput.classList.remove('is-invalid'); }

    if (!passwordInput.value.trim()) { passwordInput.classList.add('is-invalid'); isValid = false; }
    else { passwordInput.classList.remove('is-invalid'); }

    if (!isValid) return;

    btn.style.animationPlayState = 'running';
    toggleLoader(true);

    try {
        const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        const user = userCredential.user;

        // Fetch user document to store in local storage to keep sync with rest of app dynamically
        // Later we will refactor all pages to read directly from firestore, but grabbing it here for now
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            localStorage.setItem('user', JSON.stringify({
                id: user.uid,
                ...userData
            }));
        } else {
            console.warn("User document not found in Firestore!");
            // Fallback
            localStorage.setItem('user', JSON.stringify({
                id: user.uid,
                name: user.email.split('@')[0],
                email: user.email,
                role: 'student',
                balance: 0
            }));
        }

        showToast('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (error) {
        console.error("Login Error:", error);
        showToast(error.message, 'error');
    } finally {
        toggleLoader(false);
        btn.style.animationPlayState = 'paused';
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const nameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const roleInput = document.getElementById('role');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const btn = document.getElementById('register-btn');

    let isValid = true;

    [nameInput, emailInput, roleInput, passwordInput, confirmInput].forEach(el => el.classList.remove('is-invalid'));

    if (!nameInput.value.trim()) { nameInput.classList.add('is-invalid'); isValid = false; }
    if (!emailInput.value.trim()) { emailInput.classList.add('is-invalid'); isValid = false; }
    if (!roleInput.value) { roleInput.classList.add('is-invalid'); isValid = false; }

    if (passwordInput.value.length < 6) {
        passwordInput.classList.add('is-invalid');
        isValid = false;
    }

    if (passwordInput.value !== confirmInput.value) {
        confirmInput.classList.add('is-invalid');
        isValid = false;
    }

    if (!isValid) return;

    btn.style.animationPlayState = 'running';
    toggleLoader(true);

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        const user = userCredential.user;

        // Create User Doc in Firestore
        const userData = {
            name: nameInput.value,
            email: emailInput.value,
            role: roleInput.value,
            balance: 0.00,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), userData);

        // Keep local copy
        localStorage.setItem('user', JSON.stringify({
            id: user.uid,
            ...userData
        }));

        showToast('Registration successful! Welcome.', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (error) {
        console.error("Registration Error:", error);
        showToast(error.message, 'error');
    } finally {
        toggleLoader(false);
        btn.style.animationPlayState = 'paused';
    }
}
