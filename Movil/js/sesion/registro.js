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

        // Función para validar que el email no esté registrado
        function emailExists(email) {
            return users.some(user => user.email.toLowerCase() === email.toLowerCase());
        }

        // Función para validar contraseña (mínimo 6 caracteres)
        function isValidPassword(password) {
            return password.length >= 6;
        }

        // Manejo del formulario de registro
        document.getElementById('registerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validaciones
            if (!name || !email || !password || !confirmPassword) {
                showMessage('Por favor completa todos los campos', 'error');
                return;
            }

            if (name.length < 2) {
                showMessage('El nombre debe tener al menos 2 caracteres', 'error');
                return;
            }

            if (!isValidEmail(email)) {
                showMessage('Por favor ingresa un email válido', 'error');
                return;
            }

            if (emailExists(email)) {
                showMessage('Este email ya está registrado', 'error');
                return;
            }

            if (!isValidPassword(password)) {
                showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showMessage('Las contraseñas no coinciden', 'error');
                return;
            }

            // Crear nuevo usuario
            const newUser = {
                id: Date.now(),
                name: name,
                email: email,
                password: password,
                registrationDate: new Date().toISOString()
            };

            // Agregar usuario al array y guardar
            users.push(newUser);
            localStorage.setItem('nextstop_users', JSON.stringify(users));

            // Mostrar mensaje de éxito
            showMessage(`¡Registro exitoso! Bienvenido ${name}`, 'success');

            // Limpiar formulario
            document.getElementById('registerForm').reset();

            // Simular redirección al login después de 2 segundos
            setTimeout(() => {
                alert(`¡Cuenta creada exitosamente!\n\nNombre: ${name}\nEmail: ${email}\n\nYa puedes iniciar sesión con tus credenciales.`);
                // Redirigir automáticamente al login
                window.location.href = './index.html';
            }, 2000);

            console.log('Nuevo usuario registrado:', newUser);
        });

        // Manejo del enlace de login
        document.getElementById('loginLink').addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = './index.html';
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
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    await window.pageTransition.handleFormSubmit(e.target, 'Creando cuenta');
    
    // Tu lógica de registro aquí
    console.log('Registro procesado');
});
