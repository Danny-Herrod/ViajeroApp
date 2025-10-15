// MapManager.js - Gestión del mapa y marcadores
class MapManager {
    constructor() {
        this.map = null;
        this.clickMarkers = [];
        this.previewLayer = null;
        this.routeLayers = [];
        this.colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e67e22', '#1abc9c', '#34495e'];
    }

    // Inicializar el mapa
    initMap() {
        this.map = L.map('map').setView([13.089818735558172, -85.99986525944635], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        this.setupMapEvents();
    }

    // Configurar eventos del mapa
    setupMapEvents() {
        this.map.on('click', (e) => {
            this.handleMapClick(e);
        });
    }

    // Manejar clics en el mapa
    handleMapClick(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        
        // Agregar marcador temporal
        const tempMarker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: '#FFA500',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(this.map);
        
        this.clickMarkers.push(tempMarker);
        
        // Delegar la actualización de coordenadas al FormManager
        window.formManager.updateCoordinatesFromClick(lat, lng);
    }

    // Centrar mapa en ubicación actual
    centerToCurrentLocation(callback) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    
                    this.map.setView([lat, lng], 15);
                    
                    const tempMarker = L.circleMarker([lat, lng], {
                        radius: 8,
                        fillColor: '#4CAF50',
                        color: '#fff',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).addTo(this.map);
                    
                    this.clickMarkers.push(tempMarker);
                    
                    if (callback) callback(lat, lng);
                },
                () => alert('No se pudo obtener la ubicación actual.')
            );
        } else {
            alert('Geolocalización no soportada por este navegador.');
        }
    }

    // Mostrar ruta de preview
    displayPreviewRoute(routeData, coordinates) {
        this.clearPreviewRoute();
        
        const feature = routeData.features[0];
        const routeCoordinates = feature.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        this.previewLayer = L.layerGroup();
        
        // Dibujar la ruta real
        const routeLine = L.polyline(routeCoordinates, {
            color: '#4CAF50',
            weight: 5,
            opacity: 0.8,
            dashArray: '10, 5'
        });
        
        this.previewLayer.addLayer(routeLine);
        
        // Agregar marcadores
        this.addRouteMarkers(coordinates, this.previewLayer);
        this.previewLayer.addTo(this.map);
        
        // Ajustar vista
        this.map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });
    }

    // Mostrar ruta directa (fallback)
    displayDirectRoute(coordinates) {
        this.clearPreviewRoute();
        
        this.previewLayer = L.layerGroup();
        
        const directCoords = coordinates.map(coord => [coord[1], coord[0]]);
        const routeLine = L.polyline(directCoords, {
            color: '#FF9800',
            weight: 4,
            opacity: 0.7,
            dashArray: '15, 10'
        });
        
        this.previewLayer.addLayer(routeLine);
        this.addSimpleMarkers(coordinates, this.previewLayer);
        this.previewLayer.addTo(this.map);
        this.map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });
    }

    // Agregar marcadores de ruta con iconos personalizados
    addRouteMarkers(coordinates, layerGroup) {
        const nameInputs = document.querySelectorAll('.parada-name');
        
        coordinates.forEach((coord, index) => {
            const lat = coord[1];
            const lng = coord[0];
            const name = nameInputs[index]?.value || `Parada ${index + 1}`;
            
            let markerIcon, markerClass;
            if (index === 0) {
                markerClass = 'marker-start';
                markerIcon = '🚀';
            } else if (index === coordinates.length - 1) {
                markerClass = 'marker-end';
                markerIcon = '🏁';
            } else {
                markerClass = 'marker-stop';
                markerIcon = '🚏';
            }
            
            const customIcon = L.divIcon({
                className: markerClass,
                html: `<div style="transform: rotate(45deg); color: white; font-size: 12px;">${markerIcon}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            });
            
            const marker = L.marker([lat, lng], { icon: customIcon });
            marker.bindPopup(this.createPopupContent(name, index, coordinates.length, lat, lng));
            layerGroup.addLayer(marker);
        });
    }

    // Agregar marcadores simples
    addSimpleMarkers(coordinates, layerGroup) {
        const nameInputs = document.querySelectorAll('.parada-name');
        
        coordinates.forEach((coord, index) => {
            const lat = coord[1];
            const lng = coord[0];
            const name = nameInputs[index]?.value || `Parada ${index + 1}`;
            
            const marker = L.circleMarker([lat, lng], {
                radius: 8,
                fillColor: index === 0 ? '#4CAF50' : index === coordinates.length - 1 ? '#f44336' : '#2196F3',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
            
            marker.bindPopup(this.createPopupContent(name, index, coordinates.length, lat, lng));
            layerGroup.addLayer(marker);
        });
    }

    // Crear contenido del popup
    createPopupContent(name, index, total, lat, lng) {
        const position = index === 0 ? 'Inicio' : index === total - 1 ? 'Final' : 'Intermedia';
        return `
            <div class="custom-popup">
                <h4>${name}</h4>
                <strong>Posición:</strong> ${position}<br>
                <strong>Coordenadas:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}
            </div>
        `;
    }

    // Agregar ruta al mapa
    addRouteToMap(route, routeIndex) {
        const color = this.colors[routeIndex % this.colors.length];
        const layerGroup = L.layerGroup();
        
        // Dibujar ruta
        if (route.routeGeometry?.length > 0) {
            const routeCoords = route.routeGeometry.map(coord => [coord[1], coord[0]]);
            const polyline = L.polyline(routeCoords, {
                color: color,
                weight: 4,
                opacity: 0.8
            });
            layerGroup.addLayer(polyline);
        } else if (route.paradas.length > 1) {
            const polyline = L.polyline(
                route.paradas.map(p => [p.lat, p.lng]), 
                {
                    color: color,
                    weight: 4,
                    opacity: 0.7,
                    dashArray: '10, 5'
                }
            );
            layerGroup.addLayer(polyline);
        }
        
        // Agregar marcadores de paradas
        this.addRouteStopMarkers(route, layerGroup);
        
        this.routeLayers[routeIndex] = layerGroup;
        layerGroup.addTo(this.map);
    }

    // Agregar marcadores de paradas de ruta
    addRouteStopMarkers(route, layerGroup) {
        route.paradas.forEach((parada, index) => {
            const customIcon = this.createStopIcon(index, route.paradas.length);
            const marker = L.marker([parada.lat, parada.lng], { icon: customIcon });
            
            marker.bindPopup(`
                <div class="custom-popup">
                    <h4>${route.name}</h4>
                    <strong>Parada ${index + 1}:</strong> ${parada.name}<br>
                    <strong>Tipo:</strong> ${index === 0 ? 'Inicio' : index === route.paradas.length - 1 ? 'Final' : 'Intermedia'}<br>
                    <strong>Horario:</strong> ${route.startTime} - ${route.endTime}<br>
                    <strong>Frecuencia:</strong> Cada ${route.frequency} min<br>
                    ${route.distance ? `<strong>Distancia total:</strong> ${route.distance} km<br>` : ''}
                    ${route.duration ? `<strong>Duración:</strong> ${route.duration} min` : ''}
                </div>
            `);
            
            layerGroup.addLayer(marker);
        });
    }

    // Crear icono de parada
    createStopIcon(index, total) {
        let className, html;
        
        if (index === 0) {
            className = 'marker-start';
            html = '<div style="transform: rotate(45deg); color: white; font-size: 12px;">🚀</div>';
        } else if (index === total - 1) {
            className = 'marker-end';
            html = '<div style="transform: rotate(45deg); color: white; font-size: 12px;">🏁</div>';
        } else {
            className = 'marker-stop';
            html = '<div style="color: white; font-size: 10px;">🚏</div>';
        }
        
        return L.divIcon({
            className: className,
            html: html,
            iconSize: index === total - 1 || index === 0 ? [30, 30] : [25, 25],
            iconAnchor: index === total - 1 || index === 0 ? [15, 30] : [12, 25],
            popupAnchor: [0, index === total - 1 || index === 0 ? -30 : -25]
        });
    }

    // Mostrar ruta en el mapa
    showRouteOnMap(route) {
        if (route.paradas.length > 0) {
            let bounds;
            
            if (route.routeGeometry) {
                const coords = route.routeGeometry.map(coord => [coord[1], coord[0]]);
                bounds = L.latLngBounds(coords);
            } else {
                bounds = L.latLngBounds(route.paradas.map(p => [p.lat, p.lng]));
            }
            
            this.map.fitBounds(bounds, { padding: [20, 20] });
        }
    }

    // Alternar visibilidad de ruta
    toggleRouteVisibility(routeIndex, visible) {
        if (visible) {
            // La ruta ya debería estar agregada
        } else {
            if (this.routeLayers[routeIndex]) {
                this.map.removeLayer(this.routeLayers[routeIndex]);
                this.routeLayers[routeIndex] = null;
            }
        }
    }

    // Remover ruta del mapa
    removeRoute(routeIndex) {
        if (this.routeLayers[routeIndex]) {
            this.map.removeLayer(this.routeLayers[routeIndex]);
            this.routeLayers.splice(routeIndex, 1);
        }
    }

    // Limpiar preview de ruta
    clearPreviewRoute() {
        if (this.previewLayer) {
            this.map.removeLayer(this.previewLayer);
            this.previewLayer = null;
        }
        
        // Limpiar marcadores temporales
        this.clickMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.clickMarkers = [];
    }
}