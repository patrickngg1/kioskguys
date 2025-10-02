// Import Firebase services and functions from your config file and the SDK
import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
    doc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- UTILITY FUNCTIONS ---
const messageContainer = document.getElementById('message-container');

function displayMessage(message, isError = false, duration = null) {
    if (!messageContainer) return;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isError ? 'error' : 'success'}`;
    messageDiv.textContent = message;
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageDiv);
    if (duration) {
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => messageContainer.innerHTML = '', 500);
        }, duration);
    }
}

function disableButton(button, text = 'Processing...') {
    button.disabled = true;
    button.textContent = text;
}

function enableButton(button, originalText) {
    button.disabled = false;
    button.textContent = originalText;
}


// --- LIVE VALIDATION LOGIC ---
const registerForm = document.getElementById('register-form');
const emailInput = document.getElementById('register-email');
const emailError = document.getElementById('email-error');
const passwordInput = document.getElementById('register-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordMatchError = document.getElementById('password-match-error');
const registerBtn = document.getElementById('register-btn');
const reqLength = document.getElementById('req-length');
const reqUppercase = document.getElementById('req-uppercase');
const reqNumber = document.getElementById('req-number');
const reqSpecial = document.getElementById('req-special');
const validationState = { email: false, password: false, passwordMatch: false };
function validateEmail() { if (!emailInput) return; const email = emailInput.value; const isValid = email.endsWith('@uta.edu') || email.endsWith('@mavs.uta.edu'); emailInput.classList.toggle('valid', isValid); emailInput.classList.toggle('invalid', !isValid); emailError.classList.toggle('hidden', isValid); validationState.email = isValid; checkFormValidity(); }
function validatePassword() { if (!passwordInput) return; const password = passwordInput.value; const hasLength = password.length >= 8; const hasUppercase = /[A-Z]/.test(password); const hasNumber = /[0-9]/.test(password); const hasSpecial = /[!@#$%^&*]/.test(password); updateRequirement(reqLength, hasLength); updateRequirement(reqUppercase, hasUppercase); updateRequirement(reqNumber, hasNumber); updateRequirement(reqSpecial, hasSpecial); const isPasswordValid = hasLength && hasUppercase && hasNumber && hasSpecial; updateInputField(passwordInput, isPasswordValid); validationState.password = isPasswordValid; validateConfirmPassword(); }
function validateConfirmPassword() { if (!confirmPasswordInput) return; const password = passwordInput.value; const confirmPassword = confirmPasswordInput.value; if (confirmPassword) { const doPasswordsMatch = password === confirmPassword; updateInputField(confirmPasswordInput, doPasswordsMatch); passwordMatchError.classList.toggle('hidden', doPasswordsMatch); validationState.passwordMatch = doPasswordsMatch; } else { confirmPasswordInput.classList.remove('valid', 'invalid'); passwordMatchError.classList.add('hidden'); validationState.passwordMatch = false; } checkFormValidity(); }
function updateRequirement(element, isValid) { if (element) element.classList.toggle('valid', isValid); }
function updateInputField(element, isValid) { if(element) { element.classList.toggle('valid', isValid); element.classList.toggle('invalid', !isValid); } }
function checkFormValidity() { if (registerBtn) { const isFormValid = validationState.email && validationState.password && validationState.passwordMatch; registerBtn.disabled = !isFormValid; } }

// --- COOLDOWN HELPER FOR RESEND LINK ---
let isCooldownActive = false;
function startResendCooldown(linkElement) {
    isCooldownActive = true;
    let seconds = 60;
    const originalText = linkElement.textContent;
    
    linkElement.style.pointerEvents = 'none';
    linkElement.style.opacity = '0.5';

    const timer = setInterval(() => {
        seconds--;
        if (seconds > 0) {
            linkElement.textContent = `Resend in ${seconds}s`;
        } else {
            clearInterval(timer);
            linkElement.textContent = originalText;
            linkElement.style.pointerEvents = 'auto';
            linkElement.style.opacity = '1';
            isCooldownActive = false;
        }
    }, 1000);
}

// --- AUTHENTICATION LOGIC ---
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const fullName = form['register-full-name'].value;
    const email = form['register-email'].value;
    const password = form['register-password'].value;
    disableButton(registerBtn, 'Registering...');

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await sendEmailVerification(user);

        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
            uid: user.uid,
            displayName: fullName,
            email: email,
            isAdmin: false, // Defaults to false for all new users.
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            profilePicture: null,
            isActive: true,
            preferences: { // Simplified preferences
                emailNotifications: true,
            }
        });
        
        form.style.display = 'none';
        displayMessage('Success! Check your inbox for a link to verify your email. Redirecting to login...', false);
        setTimeout(() => { window.location.href = 'login.html'; }, 5000);

    } catch (error) {
        displayMessage(error.message, true);
        enableButton(registerBtn, 'Register');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const email = form['login-email'].value;
    const password = form['login-password'].value;
    const loginBtn = form.querySelector('#login-btn');
    const originalBtnText = loginBtn.textContent;
    const resendLink = document.getElementById('resend-verification-link');
    
    if (resendLink) resendLink.classList.add('hidden');
    disableButton(loginBtn);

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
            displayMessage('You must verify your email to proceed. Please check your inbox.', true);
            
            if (resendLink) {
                resendLink.classList.remove('hidden');
                resendLink.onclick = async (e) => {
                    e.preventDefault();
                    if (isCooldownActive) return;
                    try {
                        await sendEmailVerification(user);
                        displayMessage('A new verification email has been sent.', false);
                        startResendCooldown(resendLink);
                    } catch (error) {
                        displayMessage(`Error: ${error.message}`, true);
                    }
                };
            }
            
            await signOut(auth);
        } else {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
            displayMessage('Login successful! Redirecting...', false);
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        displayMessage(error.message, true);
    } finally {
        if (!auth.currentUser || !auth.currentUser.emailVerified) {
           enableButton(loginBtn, originalBtnText);
        }
    }
}

async function handlePasswordReset() {
    const email = document.getElementById('login-email').value;
    if (!email) {
        displayMessage('Please enter your email address to reset your password.', true);
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        displayMessage('Password reset email sent! Please check your inbox.', false);
    } catch (error) {
        displayMessage(error.message, true);
    }
}

async function handleSignOut() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

function protectDashboard() {
    onAuthStateChanged(auth, (user) => {
        if (user && user.emailVerified) {
            const userEmailSpan = document.getElementById('user-email');
            if (userEmailSpan) userEmailSpan.textContent = user.email;
        } else {
            window.location.href = 'login.html';
        }
    });
}

// --- EVENT LISTENERS ---
const path = window.location.pathname;

if (path.includes('login.html')) {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); handlePasswordReset(); });
}

if (path.includes('register.html')) {
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        emailInput.addEventListener('input', validateEmail);
        passwordInput.addEventListener('input', validatePassword);
        confirmPasswordInput.addEventListener('input', validateConfirmPassword);
    }
}

if (path.includes('dashboard.html')) {
    protectDashboard();
    const signoutBtn = document.getElementById('signout-btn');
    if(signoutBtn) signoutBtn.addEventListener('click', handleSignOut);
}