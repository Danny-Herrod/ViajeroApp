// Sistema de navegación entre páginas
// Este archivo maneja la navegación centralizada de la aplicación

const navItems = document.querySelectorAll('.nav-item');

// Mapeo de navegación a páginas
const navRoutes = {
    'home': 'home.html',
    'location': 'mapa.html',
    'walk': 'viajar.html',
    'bus': 'buses.html',
    'settings': 'ajustes.html'
};

function handleNavClick(event) {
    const clickedItem = event.currentTarget;
    const navType = clickedItem.dataset.nav;

    // Si ya está activo y es el botón de ubicación, no hacer nada
    // (dejar que mapa.js maneje el centrado del mapa si aplica)
    if (clickedItem.classList.contains('active') && navType === 'location') {
        return;
    }

    // Si ya está activo en cualquier otra página, no navegar
    if (clickedItem.classList.contains('active')) {
        return;
    }

    navItems.forEach(item => {
        item.classList.remove('active');
    });

    clickedItem.classList.add('active');

    clickedItem.classList.add('clicked');
    setTimeout(() => {
        clickedItem.classList.remove('clicked');
    }, 600);

    console.log(`Navegando a: ${navType}`);

    // Navegar a la página correspondiente
    if (navRoutes[navType]) {
        setTimeout(() => {
            window.location.href = navRoutes[navType];
        }, 300);
    }
}

// Inicializar navegación
navItems.forEach(item => {
    item.addEventListener('click', handleNavClick);
});
