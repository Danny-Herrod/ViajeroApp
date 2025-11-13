// Sistema de usuarios con localStorage
let users = JSON.parse(localStorage.getItem('nextstop_users') || '[]');
let currentUser = JSON.parse(localStorage.getItem('nextstop_current_user') || 'null');

// Función para mostrar mensajes
function showMessage(message, type) {
    let messageContainer = document.querySelector('.message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';
        document.querySelector('.main-content').insertBefore(messageContainer, document.querySelector('form'));
    }
    
    const messageClass = type === 'error' ? 'error-message' : 'success-message';
    messageContainer.innerHTML = `<div class="${messageClass}">${message}</div>`;
    
    setTimeout(() => {
        messageContainer.innerHTML = '';
    }, 5000);
}

// Función para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Función para autenticar usuario
function authenticateUser(email, password) {
    return users.find(user => 
        user.email.toLowerCase() === email.toLowerCase() && 
        user.password === password
    );
}

// Función para mostrar usuarios de prueba
function showTestUsers() {
    const container = document.getElementById('testUsersContainer');
    
    if (users.length > 0) {
        let testUsersHTML = `
            <div class="test-users" style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 15px; border: 1px solid #e9ecef;">
                <h4 style="color: #495057; margin-bottom: 15px;">👥 Usuarios disponibles para testing:</h4>
        `;
        
        users.forEach(user => {
            testUsersHTML += `
                <div class="user-item" style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 8px; border-left: 4px solid #FFB000;">
                    <strong style="color: #02003C;">${user.name}</strong><br>
                    📧 ${user.email} | 🔐 ${user.password}
                </div>
            `;
        });
        
        testUsersHTML += '</div>';
        container.innerHTML = testUsersHTML;
    } else {
        container.innerHTML = `
            <div class="test-users" style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 15px; border: 1px solid #ffeaa7;">
                <h4 style="color: #856404;">ℹ️ No hay usuarios registrados</h4>
                <p style="color: #856404; margin: 10px 0 0 0;">¡Regístrate primero para poder iniciar sesión!</p>
            </div>
        `;
    }
}

// Función para redirigir a home
function redirectToHome() {
    // Mostrar mensaje de carga
    const loginButton = document.querySelector('.login-button');
    const originalText = loginButton.textContent;
    loginButton.textContent = 'Redirigiendo...';
    loginButton.disabled = true;

    // Redirigir después de un breve delay para mejor UX
    setTimeout(() => {
        window.location.href = './home.html';
    }, 1500);
}

// Manejo del formulario de login
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showMessage('Por favor completa todos los campos', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showMessage('Por favor ingresa un email válido', 'error');
        return;
    }

    // Verificar si el usuario existe en nuestro sistema
    const user = authenticateUser(email, password);

    if (user) {
        // Guardar usuario actual
        localStorage.setItem('nextstop_current_user', JSON.stringify(user));
        showMessage(`¡Bienvenido de vuelta, ${user.name}!`, 'success');
        
        // Limpiar formulario
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        
        // Redirigir automáticamente a home
        redirectToHome();
        
    } else {
        if (users.length === 0) {
            showMessage('No hay usuarios registrados. ¡Regístrate primero!', 'error');
        } else {
            showMessage('Email o contraseña incorrectos', 'error');
        }
    }
});

// Manejo del enlace de registro
document.getElementById('signupLink').addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = './registro.html';
});

// Animaciones para los inputs
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-2px)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});

// Verificar si hay usuario logueado al cargar
if (currentUser) {
    console.log('Usuario logueado:', currentUser);
    showMessage(`Sesión activa: ${currentUser.name}`, 'success');
    
    // Si ya hay una sesión activa, redirigir automáticamente
    setTimeout(() => {
        redirectToHome();
    }, 2000);
}

// Funciones de debug y utilidad
function showAllUsers() {
    console.log('Todos los usuarios:', users);
    return users;
}

function clearAllData() {
    localStorage.removeItem('nextstop_users');
    localStorage.removeItem('nextstop_current_user');
    users = [];
    currentUser = null;
    console.log('Todos los datos eliminados');
    location.reload();
}

function addTestUser(name, email, password) {
    // Verificar que el email no esté registrado
    if (users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
        console.log('Error: El email ya está registrado');
        return null;
    }

    const newUser = {
        id: Date.now(),
        name: name,
        email: email,
        password: password,
        registrationDate: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('nextstop_users', JSON.stringify(users));
    console.log('Usuario agregado:', newUser);
    showTestUsers(); // Actualizar la vista
    return newUser;
}

function logoutUser() {
    localStorage.removeItem('nextstop_current_user');
    currentUser = null;
    console.log('Sesión cerrada');
    location.reload();
}

// Manejo de transición de página (si existe)
if (typeof window.pageTransition !== 'undefined') {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        await window.pageTransition.handleFormSubmit(e.target, 'Iniciando sesión');
        
        // La lógica de login ya está manejada arriba
        console.log('Login procesado con transición');
    });
}