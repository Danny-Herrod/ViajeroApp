let map;
let userMarker;
let userLocation = null;
let routes = [];
let routeLayers = {};
let busMarkers = {};
let busAnimations = {};
let cardsMinimized = false;
let activeRouteFilter = null; // null = todas las rutas, o el ID de una ruta específica

// Tamaños configurables para cada tipo de icono (puedes modificar estos valores fácilmente)
const ICON_SIZES = {
    bus: [32, 32],
    stopStart: [32, 32],
    stopEnd: [32, 32],
    stopRegular: [32, 32]  // Cambia este valor para ajustar el tamaño de las paradas regulares
};

// Configuración de zoom (puedes modificar estos valores fácilmente)
const ZOOM_CONFIG = {
    singleRouteZoom: 16,     // Nivel de zoom al filtrar una ruta (valores típicos: 13-18)
    allRoutesZoom: 14,       // Nivel de zoom al mostrar todas las rutas
    zoomDuration: 1.5        // Duración de la animación de zoom en segundos
};

// URLs de iconos personalizados con color dinámico
const ICONS = {
    bus: (color) => `
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="15" fill="${color}" stroke="white" stroke-width="2"/>
            <path d="M8 19c0 .88.39 1.67 1 2.22V23c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V11c0-3.5-3.58-4-8-4s-8 .5-8 4v8zm3.5 1c-.83 0-1.5-.67-1.5-1.5S10.67 17 11.5 17s1.5.67 1.5 1.5S12.33 20 11.5 20zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H10v-5h12v5z" fill="white"/>
        </svg>
    `,
    stopStart: (color) => `
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="15" fill="${color}" stroke="white" stroke-width="3"/>
            <circle cx="16" cy="16" r="8" fill="white"/>
        </svg>
    `,
    stopEnd: (color) => `
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="28" height="28" rx="4" fill="${color}" stroke="white" stroke-width="3"/>
            <rect x="10" y="10" width="12" height="12" fill="white"/>
        </svg>
    `,
    stopRegular: (color) => `
        <svg viewBox="0 0 453 453" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="226.5" cy="226.5" r="216.5" fill="${color}" stroke="white" stroke-width="20"/>
            <path d="M298 140C298 140 296.5 156 293 177.5C290 195.927 273.045 201.499 268.258 202.715C267.42 202.928 266.566 202.964 265.704 202.899C259.786 202.458 235.019 200.81 221 203C205 205.5 210 203 202.5 237C195 271 198.5 256 195.5 269.5" stroke="white" stroke-width="20" stroke-linecap="round"/>
            <path d="M215.5 381L227.5 279.5V214C227.5 208.477 231.977 204 237.5 204H242M268 379L256.5 279.5V214C256.5 208.477 252.023 204 246.5 204H242M242 204V279.5" stroke="white" stroke-width="20" stroke-linecap="round"/>
            <path d="M142 375V88C142 82.4771 146.477 78 152 78H321" stroke="white" stroke-width="28" stroke-linecap="round"/>
            <circle cx="240.5" cy="159.5" r="25" fill="white"/>
        </svg>
    `
};

// Función para crear icono personalizado con color dinámico
function createCustomIcon(iconType, color, customSize = null) {
    // Usar tamaño personalizado si se proporciona, sino usar el tamaño por defecto
    const finalSize = customSize || ICON_SIZES[iconType] || [24, 24];
    
    // Crear el SVG con el color
    const svgContent = ICONS[iconType](color);
    
    // Codificar el SVG a base64
    const iconSvg = 'data:image/svg+xml;base64,' + btoa(svgContent);
    
    return L.icon({
        iconUrl: iconSvg,
        iconSize: finalSize,
        iconAnchor: [finalSize[0] / 2, finalSize[1] / 2],
        popupAnchor: [0, -finalSize[1] / 2]
    });
}

// Función para simular movimiento de bus en una ruta
function simulateBusMovement(route, color) {
    const routeId = route.id;
    const coordinates = route.routeGeometry.map(coord => [coord[1], coord[0]]);
    
    if (!busMarkers[routeId]) {
        const busIcon = createCustomIcon('bus', color, [32, 32]);
        busMarkers[routeId] = L.marker(coordinates[0], {
            icon: busIcon,
            zIndexOffset: 1000
        }).addTo(map);
        
        busMarkers[routeId].bindPopup(`
            <div style="font-family: 'Nunito', sans-serif; text-align: center;">
                <b style="color: ${color}">${route.name}</b><br>
                🚌 Bus en servicio<br>
                <small>Posición en tiempo real</small>
            </div>
        `);
    }
    
    let currentIndex = 0;
    let direction = 1;
    const speed = 3000;
    
    function animateBus() {
        let nextIndex = currentIndex + direction;
        
        if (nextIndex >= coordinates.length) {
            direction = -1;
            nextIndex = coordinates.length - 2;
        } else if (nextIndex < 0) {
            direction = 1;
            nextIndex = 1;
        }
        
        const currentPos = coordinates[currentIndex];
        const nextPos = coordinates[nextIndex];
        
        const directionText = direction === 1 ? '🚌 Bus en servicio (ida)' : '🚌 Bus en servicio (regreso)';
        busMarkers[routeId].setPopupContent(`
            <div style="font-family: 'Nunito', sans-serif; text-align: center;">
                <b style="color: ${color}">${route.name}</b><br>
                ${directionText}<br>
                <small>Posición en tiempo real</small>
            </div>
        `);
        
        animateMarkerTo(busMarkers[routeId], currentPos, nextPos, speed);
        
        currentIndex = nextIndex;
        busAnimations[routeId] = setTimeout(animateBus, speed);
    }
    
    animateBus();
}

// Función para animar suavemente un marcador
function animateMarkerTo(marker, fromLatLng, toLatLng, duration) {
    const start = Date.now();
    const startLat = fromLatLng[0];
    const startLng = fromLatLng[1];
    const endLat = toLatLng[0];
    const endLng = toLatLng[1];
    
    function frame() {
        const now = Date.now();
        const progress = Math.min((now - start) / duration, 1);
        
        const lat = startLat + (endLat - startLat) * progress;
        const lng = startLng + (endLng - startLng) * progress;
        
        marker.setLatLng([lat, lng]);
        
        if (progress < 1) {
            requestAnimationFrame(frame);
        }
    }
    
    requestAnimationFrame(frame);
}

// Función para detener animaciones de buses
function stopAllBusAnimations() {
    Object.keys(busAnimations).forEach(routeId => {
        clearTimeout(busAnimations[routeId]);
    });
    busAnimations = {};
}

// Coordenadas de Jinotega
const jinotegaCenter = [13.0878, -86.0010];
const jinotegaBounds = {
    north: 13.2,
    south: 12.9,
    east: -85.8,
    west: -86.3
};

const routeColors = ['#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#F44336', '#FF5722', '#795548', '#607D8B'];

function isInJinotega(lat, lng) {
    return lat <= jinotegaBounds.north && 
           lat >= jinotegaBounds.south && 
           lng <= jinotegaBounds.east && 
           lng >= jinotegaBounds.west;
}

// Cargar todas las rutas
async function loadRoutes() {
    try {
        const routeFiles = ['Homero.json'];
        
        for (const file of routeFiles) {
            try {
                const response = await fetch(`./rutas/${file}`);
                if (response.ok) {
                    const routeData = await response.json();
                    if (Array.isArray(routeData) && routeData.length > 0) {
                        routes.push(routeData[0]);
                    }
                }
            } catch (error) {
                console.error(`Error cargando ruta ${file}:`, error);
            }
        }
        
        console.log('Rutas cargadas:', routes);
        return routes;
    } catch (error) {
        console.error('Error cargando rutas:', error);
        return [];
    }
}

// Generar las tarjetas de rutas con nuevos controles
function generateRouteCards() {
    const routeCardsContainer = document.querySelector('.route-cards');
    routeCardsContainer.innerHTML = '';
    
    // Agregar botones de control como primera tarjeta
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'route-controls';
    controlsDiv.innerHTML = `
        <button class="control-btn minimize-btn" onclick="toggleMinimize()" title="Minimizar tarjetas">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13H5v-2h14v2z"/>
            </svg>
        </button>
        <button class="control-btn show-all-btn ${activeRouteFilter === null ? 'active' : ''}" onclick="showAllRoutes()" title="Mostrar todas las rutas">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
            </svg>
            <span>Todas</span>
        </button>
    `;
    routeCardsContainer.appendChild(controlsDiv);
    
    routes.forEach((route, index) => {
        const color = routeColors[index % routeColors.length];
        const colorClass = getColorClass(color);
        
        const firstStop = route.paradas[0]?.name || 'Desconocido';
        const lastStop = route.paradas[route.paradas.length - 1]?.name || 'Desconocido';
        
        const card = document.createElement('div');
        card.className = `route-card ${colorClass} ${activeRouteFilter === route.id ? 'active-filter' : ''}`;
        card.setAttribute('data-route-id', route.id);
        card.style.borderColor = color;
        
        card.innerHTML = `
            <div class="route-header">
                <div class="route-title" style="background: ${color}">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
                    </svg>
                    ${route.name || `Ruta ${route.number}`}
                </div>
                <button class="filter-route-btn" onclick="filterRoute('${route.id}')" title="Ver solo esta ruta">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                </button>
            </div>
            <div class="route-info">
                <div class="route-status">
                    <span>Estado:</span>
                    <div class="status-dot" style="background: ${color}"></div>
                </div>
                <div class="route-schedule">
                    <svg width="14" height="14" fill="#666" viewBox="0 0 24 24">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                        <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    <span>${route.startTime || '07:00'} - ${route.endTime || '19:00'}</span>
                </div>
                <div class="route-location">
                    <div class="location-icon"></div>
                    <div>
                        <div class="location-text">Salida:</div>
                        <div class="location-value">${firstStop}</div>
                    </div>
                </div>
                <div class="route-location">
                    <div class="location-icon"></div>
                    <div>
                        <div class="location-text">Destino:</div>
                        <div class="location-value">${lastStop}</div>
                    </div>
                </div>
                <div class="route-details">
                    <span>📍 ${route.paradas.length} paradas</span>
                    <span>📏 ${route.distance || 'N/A'} km</span>
                    <span>⏱️ ${route.duration || 'N/A'} min</span>
                </div>
            </div>
            <div class="units-counter" style="background: ${color}20; border-color: ${color}40">
                <div class="units-dot" style="background: ${color}"></div>
                <span id="route-units-${route.id}">Calculando...</span>
            </div>
        `;
        
        routeCardsContainer.appendChild(card);
    });
}

// Función para minimizar/maximizar tarjetas
function toggleMinimize() {
    cardsMinimized = !cardsMinimized;
    const routeCards = document.querySelector('.route-cards');
    const minimizeBtn = document.querySelector('.minimize-btn');
    
    if (cardsMinimized) {
        routeCards.classList.add('minimized');
        minimizeBtn.innerHTML = `
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13H5v-2h14v2z"/>
                <path d="M19 9H5V7h14v2z"/>
            </svg>
        `;
        minimizeBtn.title = "Maximizar tarjetas";
    } else {
        routeCards.classList.remove('minimized');
        minimizeBtn.innerHTML = `
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13H5v-2h14v2z"/>
            </svg>
        `;
        minimizeBtn.title = "Minimizar tarjetas";
    }
}

// Función para filtrar una ruta específica
function filterRoute(routeId) {
    if (activeRouteFilter === routeId) {
        // Si ya está filtrada, volver a mostrar todas
        showAllRoutes();
        return;
    }
    
    activeRouteFilter = routeId;
    
    // Ocultar todas las rutas y buses
    Object.keys(routeLayers).forEach(id => {
        if (id !== routeId) {
            routeLayers[id].line.setStyle({ opacity: 0, fillOpacity: 0 });
            routeLayers[id].markers.forEach(marker => marker.setOpacity(0));
            if (busMarkers[id]) {
                busMarkers[id].setOpacity(0);
            }
        } else {
            routeLayers[id].line.setStyle({ opacity: 0.7, fillOpacity: 0.7 });
            routeLayers[id].markers.forEach(marker => marker.setOpacity(1));
            if (busMarkers[id]) {
                busMarkers[id].setOpacity(1);
            }
        }
    });
    
    // Actualizar estilos de tarjetas
    document.querySelectorAll('.route-card').forEach(card => {
        if (card.getAttribute('data-route-id') === routeId) {
            card.classList.add('active-filter');
        } else {
            card.classList.remove('active-filter');
        }
    });
    
    document.querySelector('.show-all-btn').classList.remove('active');
    
    // Hacer zoom suave al bus de la ruta filtrada
    if (busMarkers[routeId]) {
        const busPosition = busMarkers[routeId].getLatLng();
        map.flyTo(busPosition, ZOOM_CONFIG.singleRouteZoom, {
            duration: ZOOM_CONFIG.zoomDuration,
            easeLinearity: 0.25
        });
    } else {
        // Si no hay bus todavía, centrar en la ruta
        focusOnRoute(routeId);
    }
}

// Función para mostrar todas las rutas
function showAllRoutes() {
    activeRouteFilter = null;
    
    // Mostrar todas las rutas y buses
    Object.keys(routeLayers).forEach(id => {
        routeLayers[id].line.setStyle({ opacity: 0.7, fillOpacity: 0.7 });
        routeLayers[id].markers.forEach(marker => marker.setOpacity(1));
        if (busMarkers[id]) {
            busMarkers[id].setOpacity(1);
        }
    });
    
    // Actualizar estilos de tarjetas
    document.querySelectorAll('.route-card').forEach(card => {
        card.classList.remove('active-filter');
    });
    
    document.querySelector('.show-all-btn').classList.add('active');
    
    // Ajustar vista para mostrar todas las rutas con zoom suave
    if (routes.length > 0) {
        const allCoordinates = routes.flatMap(route => 
            route.routeGeometry.map(coord => [coord[1], coord[0]])
        );
        const bounds = L.latLngBounds(allCoordinates);
        map.flyToBounds(bounds, {
            padding: [50, 100],
            duration: ZOOM_CONFIG.zoomDuration,
            easeLinearity: 0.25
        });
    }
}

function getColorClass(color) {
    const colorMap = {
        '#4CAF50': 'green',
        '#FF9800': 'orange',
        '#2196F3': 'blue',
        '#9C27B0': 'purple',
        '#F44336': 'red'
    };
    return colorMap[color] || 'default';
}

// Dibujar las rutas en el mapa
function drawRoutes() {
    routes.forEach((route, index) => {
        const color = routeColors[index % routeColors.length];
        
        const coordinates = route.routeGeometry.map(coord => [coord[1], coord[0]]);
        
        const routeLine = L.polyline(coordinates, {
            color: color,
            weight: 4,
            opacity: 0.7,
            routeId: route.id
        }).addTo(map);
        
        routeLayers[route.id] = {
            line: routeLine,
            markers: []
        };
        
        route.paradas.forEach((parada, paradasIndex) => {
            const isFirst = paradasIndex === 0;
            const isLast = paradasIndex === route.paradas.length - 1;
            
            let markerIcon;
            if (isFirst) {
                markerIcon = createCustomIcon('stopStart', color);
            } else if (isLast) {
                markerIcon = createCustomIcon('stopEnd', color);
            } else {
                markerIcon = createCustomIcon('stopRegular', color);
            }
            
            const marker = L.marker([parada.lat, parada.lng], {
                icon: markerIcon
            }).addTo(map);
            
            const popupContent = `
                <div style="font-family: 'Nunito', sans-serif;">
                    <b style="color: ${color}">${route.name}</b><br>
                    <b>${parada.name}</b><br>
                    ${isFirst ? '🚏 Punto de inicio' : isLast ? '🏁 Punto final' : '📍 Parada'}
                </div>
            `;
            marker.bindPopup(popupContent);
            
            routeLayers[route.id].markers.push(marker);
        });
        
        routeLine.bindPopup(`
            <div style="font-family: 'Nunito', sans-serif;">
                <b style="color: ${color}">${route.name}</b><br>
                📏 Distancia: ${route.distance || 'N/A'} km<br>
                ⏱️ Duración: ${route.duration || 'N/A'} min<br>
                🕐 Horario: ${route.startTime} - ${route.endTime}<br>
                🔄 Frecuencia: cada ${route.frequency || 'N/A'} min
            </div>
        `);
    });
    
    if (routes.length > 0) {
        const allCoordinates = routes.flatMap(route => 
            route.routeGeometry.map(coord => [coord[1], coord[0]])
        );
        const bounds = L.latLngBounds(allCoordinates);
        map.fitBounds(bounds, { padding: [50, 100] });
    }

    routes.forEach((route, index) => {
        const color = routeColors[index % routeColors.length];
        setTimeout(() => {
            simulateBusMovement(route, color);
        }, Math.random() * 5000);
    });
}

function focusOnRoute(routeId) {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    
    const coordinates = route.routeGeometry.map(coord => [coord[1], coord[0]]);
    const bounds = L.latLngBounds(coordinates);
    map.fitBounds(bounds, { padding: [50, 150] });
    
    if (routeLayers[routeId]) {
        const layer = routeLayers[routeId].line;
        const originalWeight = layer.options.weight;
        
        layer.setStyle({ weight: 6 });
        setTimeout(() => {
            layer.setStyle({ weight: originalWeight });
        }, 2000);
    }
}

function showLocationModal() {
    const modal = document.getElementById('locationModal');
    modal.classList.add('show');
}

function goToJinotega() {
    const modal = document.getElementById('locationModal');
    modal.classList.remove('show');
    
    map.setView(jinotegaCenter, 14);
    addUserMarker(jinotegaCenter[0], jinotegaCenter[1]);
}

function getUserLocation() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (!navigator.geolocation) {
        console.log('Geolocalización no soportada');
        loadingOverlay.classList.add('hidden');
        setTimeout(() => showLocationModal(), 500);
        return;
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            userLocation = { lat, lng };
            
            if (isInJinotega(lat, lng)) {
                map.setView([lat, lng], 16);
                addUserMarker(lat, lng);
                loadingOverlay.classList.add('hidden');
            } else {
                loadingOverlay.classList.add('hidden');
                setTimeout(() => showLocationModal(), 500);
            }
        },
        function(error) {
            console.log('Error obteniendo ubicación:', error);
            loadingOverlay.classList.add('hidden');
            setTimeout(() => showLocationModal(), 500);
        },
        options
    );
}

function addUserMarker(lat, lng) {
    const userMarkerIcon = L.divIcon({
        className: 'custom-marker user',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    userMarker = L.marker([lat, lng], {
        icon: userMarkerIcon
    }).addTo(map);

    userMarker.bindPopup("<b>Tu ubicación</b><br>Estás aquí");
}

async function initializeMap() {
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true
    }).setView(jinotegaCenter, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    await loadRoutes();
    generateRouteCards();
    drawRoutes();
    
    getUserLocation();
    updateActiveUnits();
}

function updateActiveUnits() {
    routes.forEach(route => {
        const units = Math.floor(Math.random() * 5) + 1;
        const element = document.getElementById(`route-units-${route.id}`);
        if (element) {
            element.textContent = `${units} ${units === 1 ? 'unidad' : 'unidades'}`;
        }
    });
}

setInterval(updateActiveUnits, 30000);

const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
    item.addEventListener('click', function() {
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        
        const navType = this.getAttribute('data-nav');
        
        switch(navType) {
            case 'home':
                window.location.href = './index.html';
                break;
            case 'location':
                if (userLocation && userMarker) {
                    map.setView([userLocation.lat, userLocation.lng], 16);
                }
                break;
            case 'walk':
                break;
            case 'bus':
                showAllRoutes();
                break;
            case 'settings':
                break;
        }
    });
});

function trackUserLocation() {
    if (!navigator.geolocation) return;

    const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000
    };

    navigator.geolocation.watchPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            if (isInJinotega(lat, lng)) {
                userLocation = { lat, lng };
                
                if (userMarker) {
                    userMarker.setLatLng([lat, lng]);
                } else {
                    addUserMarker(lat, lng);
                }
            }
        },
        function(error) {
            console.log('Error actualizando ubicación:', error);
        },
        options
    );
}

document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    
    setTimeout(() => {
        trackUserLocation();
    }, 60000);
});

// Funciones globales para los botones
window.goToJinotega = goToJinotega;
window.toggleMinimize = toggleMinimize;
window.filterRoute = filterRoute;
window.showAllRoutes = showAllRoutes;