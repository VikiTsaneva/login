// Firebase конфигурация - ВАШИТЕ ДАННИ
const firebaseConfig = {
    apiKey: "AIzaSyCtTNJsKJWnOVpRazP5Txz37ll_odEkEo8",
    authDomain: "registration-88c86.firebaseapp.com",
    projectId: "registration-88c86",
    storageBucket: "registration-88c86.firebasestorage.app",
    messagingSenderId: "344139226116",
    appId: "1:344139226116:web:4d1559eab47beab89a2951"
};

// Инициализиране на Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Вземане на референции към DOM елементи
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const nameFields = document.getElementById('nameFields');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const infoMessage = document.getElementById('infoMessage');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const switchToLoginBtn = document.getElementById('switchToLoginBtn');
const forgotPasswordLink = document.getElementById('forgotPassword');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const googleRegisterBtn = document.getElementById('googleRegisterBtn');

// Състояние на формата (вход или регистрация)
let isLoginMode = true;

// ==================== ФУНКЦИИ ЗА ПОКАЗВАНЕ НА СЪОБЩЕНИЯ ====================
function showError(message) {
    errorMessage.innerHTML = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    infoMessage.style.display = 'none';
    
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 7000);
}

function showSuccess(message) {
    successMessage.innerHTML = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    infoMessage.style.display = 'none';
    
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 5000);
}

function showInfo(message) {
    infoMessage.innerHTML = message;
    infoMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

// ==================== ПРЕВКЛЮЧВАНЕ МЕЖДУ ВХОД И РЕГИСТРАЦИЯ ====================
function toggleMode() {
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        // Режим ВХОД
        nameFields.style.display = 'none';
        loginBtn.style.display = 'block';
        registerBtn.textContent = 'Регистрация';
        switchToLoginBtn.style.display = 'none';
        forgotPasswordLink.style.display = 'block';
        document.querySelector('h2').textContent = 'Вход в системата';
        
        firstNameInput.value = '';
        lastNameInput.value = '';
    } else {
        // Режим РЕГИСТРАЦИЯ
        nameFields.style.display = 'block';
        loginBtn.style.display = 'none';
        registerBtn.textContent = 'Създай профил';
        switchToLoginBtn.style.display = 'block';
        forgotPasswordLink.style.display = 'none';
        document.querySelector('h2').textContent = 'Създаване на профил';
    }
    
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    infoMessage.style.display = 'none';
}

// ==================== ФУНКЦИЯ ЗА РЕГИСТРАЦИЯ (ИМЕЙЛ/ПАРОЛА) ====================
async function registerUser(email, password, firstName, lastName) {
    if (!email || !password || !firstName || !lastName) {
        showError('❌ Моля, попълнете всички полета');
        return;
    }
    
    if (password.length < 6) {
        showError('❌ Паролата трябва да е поне 6 символа');
        return;
    }
    
    registerBtn.innerHTML = '<span class="loading"></span> Създаване...';
    registerBtn.disabled = true;
    
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await user.updateProfile({
            displayName: `${firstName} ${lastName}`
        });
        
        await db.collection('users').doc(user.uid).set({
            firstName: firstName,
            lastName: lastName,
            fullName: `${firstName} ${lastName}`,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false,
            provider: 'email'
        });
        
        await user.sendEmailVerification();
        
        showSuccess(`✅ Регистрацията е успешна, ${firstName}! Изпратихме имейл за потвърждение до <strong>${email}</strong>. Моля, проверете пощата си.`);
        
        await firebase.auth().signOut();
        
        setTimeout(() => {
            toggleMode();
        }, 3000);
        
    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessageText = '';
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMessageText = '❌ Този имейл вече е регистриран. <button class="btn-resend" onclick="switchToLogin()">Отиди на вход</button>';
                break;
            case 'auth/invalid-email':
                errorMessageText = '❌ Невалиден имейл адрес';
                break;
            case 'auth/weak-password':
                errorMessageText = '❌ Паролата е твърде слаба (минимум 6 символа)';
                break;
            default:
                errorMessageText = '❌ Грешка при регистрация: ' + error.message;
        }
        
        showError(errorMessageText);
    } finally {
        registerBtn.innerHTML = 'Създай профил';
        registerBtn.disabled = false;
    }
}

// ==================== ФУНКЦИЯ ЗА ВХОД (ИМЕЙЛ/ПАРОЛА) ====================
async function loginUser(email, password) {
    if (!email || !password) {
        showError('❌ Моля, попълнете всички полета');
        return;
    }
    
    loginBtn.innerHTML = '<span class="loading"></span> Влизане...';
    loginBtn.disabled = true;
    
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            await firebase.auth().signOut();
            
            const resendButton = `<button class="btn-resend" onclick="resendVerificationEmail('${email}')">Изпрати отново имейл за потвърждение</button>`;
            
            showError(`❌ Имейлът <strong>${email}</strong> не е потвърден. Моля, проверете пощата си.<br><br>${resendButton}`);
            
            loginBtn.innerHTML = 'Вход';
            loginBtn.disabled = false;
            return;
        }
        
        await db.collection('users').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        showSuccess(`✅ Добре дошъл обратно, ${userData?.firstName || user.displayName || 'потребител'}! Пренасочване...`);
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        let errorMessageText = '';
        
        switch(error.code) {
            case 'auth/invalid-email':
                errorMessageText = '❌ Невалиден имейл адрес';
                break;
            case 'auth/user-disabled':
                errorMessageText = '❌ Потребителят е деактивиран';
                break;
            case 'auth/user-not-found':
                errorMessageText = '❌ Няма потребител с този имейл';
                break;
            case 'auth/wrong-password':
                errorMessageText = '❌ Грешна парола';
                break;
            default:
                errorMessageText = '❌ Грешка при вход: ' + error.message;
        }
        
        showError(errorMessageText);
        
        loginBtn.innerHTML = 'Вход';
        loginBtn.disabled = false;
    }
}

// ==================== ФУНКЦИЯ ЗА ВХОД С GOOGLE ====================
async function signInWithGoogle() {
    googleSignInBtn.innerHTML = '<span class="loading"></span> Вход с Google...';
    googleSignInBtn.disabled = true;
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        provider.setCustomParameters({ 'prompt': 'select_account' });
        
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        
        // Проверка дали потребителят съществува
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Ако не съществува - казваме да използва регистрация
            await firebase.auth().signOut();
            showError('❌ Нямате профил. Моля, използвайте "Регистрация с Google".');
            return;
        }
        
        // Обновяване на lastLogin
        await db.collection('users').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            photoURL: user.photoURL || ''
        });
        
        const userData = userDoc.data();
        showSuccess(`✅ Добре дошъл обратно, ${userData.fullName || user.displayName || 'потребител'}!`);
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Google sign-in error:', error);
        
        let errorMessage = '';
        switch(error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = '❌ Прозорецът за вход беше затворен.';
                break;
            case 'auth/popup-blocked':
                errorMessage = '❌ Изскачащият прозорец беше блокиран.';
                break;
            default:
                errorMessage = '❌ Грешка при вход с Google: ' + error.message;
        }
        
        showError(errorMessage);
        
    } finally {
        googleSignInBtn.innerHTML = `
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo">
            Вход с Google
        `;
        googleSignInBtn.disabled = false;
    }
}

// ==================== ФУНКЦИЯ ЗА РЕГИСТРАЦИЯ С GOOGLE ====================
async function registerWithGoogle() {
    googleRegisterBtn.innerHTML = '<span class="loading"></span> Регистрация с Google...';
    googleRegisterBtn.disabled = true;
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        provider.setCustomParameters({ 'prompt': 'select_account' });
        
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        
        // Проверка дали потребителят вече съществува
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            // Ако съществува - казваме да използва вход
            await firebase.auth().signOut();
            showError('❌ Този Google акаунт вече е регистриран. Моля, използвайте "Вход с Google".');
            return;
        }
        
        // Нов потребител - правим регистрация
        let firstName = '';
        let lastName = '';
        
        if (user.displayName) {
            const nameParts = user.displayName.split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
        }
        
        await db.collection('users').doc(user.uid).set({
            firstName: firstName,
            lastName: lastName,
            fullName: user.displayName || '',
            email: user.email,
            photoURL: user.photoURL || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: user.emailVerified,
            provider: 'google'
        });
        
        showSuccess(`✅ Успешна регистрация с Google! Добре дошъл, ${user.displayName || 'потребител'}.`);
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Google registration error:', error);
        
        let errorMessage = '';
        switch(error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = '❌ Прозорецът за регистрация беше затворен.';
                break;
            case 'auth/popup-blocked':
                errorMessage = '❌ Изскачащият прозорец беше блокиран.';
                break;
            default:
                errorMessage = '❌ Грешка при регистрация с Google: ' + error.message;
        }
        
        showError(errorMessage);
        
    } finally {
        googleRegisterBtn.innerHTML = `
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo">
            Регистрация с Google
        `;
        googleRegisterBtn.disabled = false;
    }
}

// ==================== ФУНКЦИИ ЗА ПОМОЩ ====================
window.switchToLogin = function() {
    if (!isLoginMode) {
        toggleMode();
    }
};

window.resendVerificationEmail = async function(email) {
    const password = prompt('За да изпратите нов имейл за потвърждение, моля въведете паролата си:');
    
    if (!password) return;
    
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await user.sendEmailVerification();
        await firebase.auth().signOut();
        
        showSuccess('✅ Имейл за потвърждение е изпратен отново!');
    } catch (error) {
        showError('❌ Грешка: ' + error.message);
    }
};

// ==================== ЗАБРАВЕНА ПАРОЛА ====================
forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    
    if (!email) {
        showError('❌ Моля, въведете имейл за възстановяване на паролата');
        return;
    }
    
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        showSuccess(`✅ Изпратен е имейл за възстановяване на паролата до <strong>${email}</strong>`);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            showError('❌ Няма потребител с този имейл');
        } else {
            showError('❌ Грешка: ' + error.message);
        }
    }
});

// ==================== СЪБИТИЯ ЗА БУТОНИТЕ ====================

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (isLoginMode) {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        loginUser(email, password);
    } else {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        registerUser(email, password, firstName, lastName);
    }
});

registerBtn.addEventListener('click', () => {
    if (isLoginMode) {
        toggleMode();
    } else {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        registerUser(email, password, firstName, lastName);
    }
});

switchToLoginBtn.addEventListener('click', toggleMode);

if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', signInWithGoogle);
}

if (googleRegisterBtn) {
    googleRegisterBtn.addEventListener('click', registerWithGoogle);
}

// ==================== ПРОВЕРКА ЗА ВЕЧЕ ЛОГНАТ ПОТРЕБИТЕЛ ====================
firebase.auth().onAuthStateChanged((user) => {
    if (user && user.emailVerified) {
        console.log('Логнат потребител:', user.email);
    }
});