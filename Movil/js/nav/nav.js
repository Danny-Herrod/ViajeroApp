// Accesibilidad con teclado para navegación
// Este archivo agrega funcionalidades de accesibilidad
// La navegación principal está manejada en navigation.js

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');

    // Accesibilidad con teclado
    navItems.forEach((item) => {
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', item.dataset.label);

        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click(); // Dispara el evento click manejado por navigation.js
            }

            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const currentIndex = Array.from(navItems).indexOf(item);
                let newIndex;

                if (e.key === 'ArrowLeft') {
                    newIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1;
                } else {
                    newIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0;
                }

                navItems[newIndex].focus();
            }
        });
    });
});