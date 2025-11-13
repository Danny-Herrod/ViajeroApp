// ============================================
// DATOS Y VARIABLES GLOBALES
// ============================================

// Datos de ejemplo para las rutas de buses
const busesData = {
    sur: {
        salidas: [
            { transporte: 'Castillo', destino: 'Managua', hora: '5:00 am', estado: 'yellow' },
            { transporte: 'Mendoza', destino: 'Managua', hora: '8:00 am', estado: 'green' },
            { transporte: 'Blandon', destino: 'Matagalpa', hora: '10:30 am', estado: 'green' },
            { transporte: 'Mendoza', destino: 'Estelí', hora: '11:00 am', estado: 'red' }
        ],
        entradas: [
            { transporte: 'Castillo', procedencia: 'Leon', hora: '12:00 pm', estado: 'yellow' },
            { transporte: 'Mendoza', procedencia: 'Matagalpa', hora: '1:30 pm', estado: 'green' },
            { transporte: 'Blandon', procedencia: 'Estelí', hora: '3:00 pm', estado: 'green' }
        ]
    },
    norte: {
        salidas: [
            { transporte: 'Express Norte', destino: 'Managua', hora: '6:00 am', estado: 'green' },
            { transporte: 'Ticabus', destino: 'Matagalpa', hora: '9:00 am', estado: 'yellow' },
            { transporte: 'TransNica', destino: 'Estelí', hora: '11:30 am', estado: 'green' }
        ],
        entradas: [
            { transporte: 'Express Norte', procedencia: 'Managua', hora: '2:00 pm', estado: 'green' },
            { transporte: 'Ticabus', procedencia: 'Leon', hora: '4:00 pm', estado: 'yellow' }
        ]
    }
};

let currentTab = 'sur';

// ============================================
// FUNCIONES DE RENDERIZADO
// ============================================

// Función para renderizar la lista de salidas
function renderSalidas(data) {
    const salidasList = document.getElementById('salidasList');
    salidasList.innerHTML = '';

    data.forEach(bus => {
        const busCard = document.createElement('div');
        busCard.className = 'bus-card';
        busCard.innerHTML = `
            <div class="bus-info">
                <span class="bus-origin">${bus.transporte}</span>
                <span class="bus-destination">${bus.destino}</span>
                <span class="bus-time">${bus.hora}</span>
            </div>
            <div class="bus-status status-${bus.estado}"></div>
        `;
        salidasList.appendChild(busCard);
    });
}

// Función para renderizar la lista de entradas
function renderEntradas(data) {
    const entradasList = document.getElementById('entradasList');
    entradasList.innerHTML = '';

    data.forEach(bus => {
        const busCard = document.createElement('div');
        busCard.className = 'bus-card';
        busCard.innerHTML = `
            <div class="bus-info">
                <span class="bus-origin">${bus.transporte}</span>
                <span class="bus-destination">${bus.procedencia}</span>
                <span class="bus-time">${bus.hora}</span>
            </div>
            <div class="bus-status status-${bus.estado}"></div>
        `;
        entradasList.appendChild(busCard);
    });
}

// ============================================
// FUNCIONES DE NAVEGACIÓN
// ============================================

// Función para cambiar entre tabs
function switchTab(tab) {
    currentTab = tab;

    // Actualizar estado visual de los tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Renderizar datos del tab seleccionado
    renderSalidas(busesData[tab].salidas);
    renderEntradas(busesData[tab].entradas);
}

// ============================================
// INICIALIZACIÓN Y EVENT LISTENERS
// ============================================

// Event listeners para los tabs
document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.dataset.tab);
        });
    });

    // Cargar datos iniciales
    renderSalidas(busesData.sur.salidas);
    renderEntradas(busesData.sur.entradas);
});

// Event listeners para los filtros
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remover active de todos
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Agregar active al clickeado
            button.classList.add('active');

            // Aquí puedes agregar la lógica de filtrado
            console.log('Filtro seleccionado:', button.dataset.filter);
        });
    });
});

// ============================================
// EFECTOS VISUALES Y ANIMACIONES
// ============================================

// Animación al hacer scroll
let lastScrollTop = 0;
const header = document.querySelector('.header-pattern');

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > lastScrollTop) {
        // Scroll hacia abajo
        header.style.transform = 'translateY(-10px)';
        header.style.opacity = '0.9';
    } else {
        // Scroll hacia arriba
        header.style.transform = 'translateY(0)';
        header.style.opacity = '1';
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}, false);
