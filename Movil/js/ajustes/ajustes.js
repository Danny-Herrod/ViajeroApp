// Ajustes Page JavaScript
// Manejo completo de configuración de perfil

let currentUser = null;
let users = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    loadUserData();
    setupEventListeners();
    setupModalHandlers();
});

// Check if user is authenticated
function checkAuthentication() {
    currentUser = JSON.parse(localStorage.getItem('nextstop_current_user'));
    users = JSON.parse(localStorage.getItem('nextstop_users') || '[]');

    if (!currentUser) {
        // No hay sesión activa, redirigir al login
        window.location.href = './index.html';
        return;
    }

    console.log('Usuario autenticado:', currentUser);
}

// Load user data
function loadUserData() {
    if (!currentUser) return;

    // Update profile information
    document.getElementById('settingsProfileName').textContent = currentUser.name;
    document.getElementById('settingsProfileEmail').textContent = currentUser.email;

    // Update member since date
    if (currentUser.registrationDate) {
        const date = new Date(currentUser.registrationDate);
        const formattedDate = date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long'
        });
        document.getElementById('memberSinceDate').textContent = formattedDate;
    }

    // Load profile image if exists
    if (currentUser.profileImage) {
        loadProfileImage(currentUser.profileImage);
    }

    // Load user preferences
    loadPreferences();
}

// Load profile image
function loadProfileImage(imageData) {
    const img = document.getElementById('settingsProfileImage');
    const icon = document.getElementById('settingsProfileIcon');

    if (imageData) {
        img.src = imageData;
        img.style.display = 'block';
        icon.style.display = 'none';
    } else {
        img.style.display = 'none';
        icon.style.display = 'block';
    }
}

// Load user preferences
function loadPreferences() {
    if (currentUser.preferences) {
        // Notifications toggle
        const notificationsToggle = document.getElementById('notificationsToggle');
        if (notificationsToggle) {
            notificationsToggle.checked = currentUser.preferences.notifications !== false;
        }

        // Dark mode toggle (when implemented)
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.checked = currentUser.preferences.darkMode === true;
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Photo change button
    document.getElementById('changePhotoBtn').addEventListener('click', handleChangePhoto);
    document.getElementById('photoInput').addEventListener('change', handlePhotoSelected);

    // Edit buttons
    document.getElementById('editNameBtn').addEventListener('click', () => openModal('nameModal'));
    document.getElementById('editEmailBtn').addEventListener('click', () => openModal('emailModal'));
    document.getElementById('changePasswordBtn').addEventListener('click', () => openModal('passwordModal'));

    // Settings buttons
    document.getElementById('aboutBtn').addEventListener('click', showAbout);
    document.getElementById('deleteAccountBtn').addEventListener('click', handleDeleteAccount);
    document.getElementById('logoutBtnSettings').addEventListener('click', handleLogout);

    // Form submissions
    document.getElementById('nameForm').addEventListener('submit', handleNameChange);
    document.getElementById('emailForm').addEventListener('submit', handleEmailChange);
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);

    // Preference toggles
    document.getElementById('notificationsToggle').addEventListener('change', handleNotificationsToggle);
}

// Setup modal handlers
function setupModalHandlers() {
    // Close buttons
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            closeModal(modalId);
        });
    });

    // Overlay clicks
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => {
        overlay.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';

        // Reset form
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

// Handle photo change
function handleChangePhoto() {
    document.getElementById('photoInput').click();
}

function handlePhotoSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Por favor selecciona una imagen válida', 'error');
        return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showNotification('La imagen debe ser menor a 2MB', 'error');
        return;
    }

    // Read and convert to base64
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;

        // Update current user
        currentUser.profileImage = imageData;
        updateUserInStorage();

        // Update UI
        loadProfileImage(imageData);
        showNotification('Foto de perfil actualizada', 'success');
    };
    reader.readAsDataURL(file);
}

// Handle name change
function handleNameChange(e) {
    e.preventDefault();

    const newName = document.getElementById('newName').value.trim();

    if (!newName || newName.length < 2) {
        showNotification('El nombre debe tener al menos 2 caracteres', 'error');
        return;
    }

    // Update user
    currentUser.name = newName;
    updateUserInStorage();

    // Update UI
    document.getElementById('settingsProfileName').textContent = newName;

    closeModal('nameModal');
    showNotification('Nombre actualizado correctamente', 'success');
}

// Handle email change
function handleEmailChange(e) {
    e.preventDefault();

    const newEmail = document.getElementById('newEmail').value.trim();
    const confirmPassword = document.getElementById('confirmPasswordEmail').value;

    // Validate email
    if (!isValidEmail(newEmail)) {
        showNotification('Por favor ingresa un email válido', 'error');
        return;
    }

    // Check if email is already in use
    if (users.some(u => u.email.toLowerCase() === newEmail.toLowerCase() && u.id !== currentUser.id)) {
        showNotification('Este email ya está en uso', 'error');
        return;
    }

    // Verify password
    if (confirmPassword !== currentUser.password) {
        showNotification('Contraseña incorrecta', 'error');
        return;
    }

    // Update user
    currentUser.email = newEmail;
    updateUserInStorage();

    // Update UI
    document.getElementById('settingsProfileEmail').textContent = newEmail;

    closeModal('emailModal');
    showNotification('Correo actualizado correctamente', 'success');
}

// Handle password change
function handlePasswordChange(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Verify current password
    if (currentPassword !== currentUser.password) {
        showNotification('Contraseña actual incorrecta', 'error');
        return;
    }

    // Validate new password
    if (newPassword.length < 6) {
        showNotification('La nueva contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
        showNotification('Las contraseñas no coinciden', 'error');
        return;
    }

    // Update password
    currentUser.password = newPassword;
    updateUserInStorage();

    closeModal('passwordModal');
    showNotification('Contraseña actualizada correctamente', 'success');
}

// Handle notifications toggle
function handleNotificationsToggle(e) {
    if (!currentUser.preferences) {
        currentUser.preferences = {};
    }

    currentUser.preferences.notifications = e.target.checked;
    updateUserInStorage();

    const message = e.target.checked ? 'Notificaciones activadas' : 'Notificaciones desactivadas';
    showNotification(message, 'success');
}

// Update user in storage
function updateUserInStorage() {
    // Update in users array
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('nextstop_users', JSON.stringify(users));
    }

    // Update current user
    localStorage.setItem('nextstop_current_user', JSON.stringify(currentUser));
}

// Show about
function showAbout() {
    alert('NextStop v1.0.0\n\nSistema de transporte inteligente para Jinotega.\n\nDesarrollado con ❤️ para mejorar tu experiencia de viaje.');
}

// Handle delete account
function handleDeleteAccount() {
    const confirmed = confirm(
        '⚠️ ADVERTENCIA\n\n' +
        'Esta acción eliminará permanentemente tu cuenta y todos tus datos.\n\n' +
        '¿Estás completamente seguro de que deseas continuar?'
    );

    if (!confirmed) return;

    // Double confirmation
    const doubleConfirm = confirm(
        'Esta es tu última oportunidad.\n\n' +
        '¿Realmente deseas eliminar tu cuenta de forma permanente?'
    );

    if (!doubleConfirm) return;

    // Remove user from users array
    users = users.filter(u => u.id !== currentUser.id);
    localStorage.setItem('nextstop_users', JSON.stringify(users));

    // Clear current session
    localStorage.removeItem('nextstop_current_user');

    // Show message and redirect
    alert('Tu cuenta ha sido eliminada. Esperamos verte pronto.');
    window.location.href = './index.html';
}

// Handle logout
function handleLogout() {
    const confirmed = confirm('¿Estás seguro que deseas cerrar sesión?');

    if (confirmed) {
        // Clear current session
        localStorage.removeItem('nextstop_current_user');

        // Redirect to login
        window.location.href = './index.html';
    }
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Styling
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: type === 'error' ? '#ff5252' : type === 'success' ? '#4CAF50' : '#2196F3',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        zIndex: '10001',
        fontWeight: '700',
        fontSize: '14px',
        maxWidth: '300px',
        animation: 'slideInRight 0.3s ease'
    });

    // Add to body
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export for global access
window.settingsModule = {
    loadUserData,
    updateUserInStorage,
    showNotification
};
