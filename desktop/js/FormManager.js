// FormManager.js - Gestión de formularios y entrada de datos
class FormManager {
    constructor(mapManager, locationService) {
        this.mapManager = mapManager;
        this.locationService = locationService;
        this.setupFormEvents();
    }

    // Configurar eventos del formulario
    setupFormEvents() {
        // Evento para actualizar displays de coordenadas
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('parada-lat') || e.target.classList.contains('parada-lng')) {
                this.updateCoordinateDisplay(e.target);
            }
        });
    }

    // Agregar nueva parada
    addParada() {
        const container = document.getElementById('paradasContainer');
        const paradaDiv = document.createElement('div');
        paradaDiv.className = 'parada-item';
        
        const paradaCount = container.children.length;
        const placeholder = this.getParadaPlaceholder(paradaCount);
        
        paradaDiv.innerHTML = `
            <div class="parada-inputs">
                <input type="text" placeholder="${placeholder}" class="parada-name">
                <input type="number" placeholder="Latitud" step="any" class="parada-lat">
                <input type="number" placeholder="Longitud" step="any" class="parada-lng">
                <div class="coordinate-display"></div>
            </div>
            <button type="button" class="btn-remove" onclick="formManager.removeParada(this)">×</button>
        `;
        
        container.appendChild(paradaDiv);
    }

    // Obtener placeholder para parada según su posición
    getParadaPlaceholder(count) {
        switch (count) {
            case 0: return 'Parada de inicio';
            case 1: return 'Parada final';
            default: return `Parada intermedia ${count - 1}`;
        }
    }

    // Remover parada
    removeParada(button) {
        const container = document.getElementById('paradasContainer');
        
        if (container.children.length > 1) {
            button.parentElement.remove();
            this.mapManager.clearPreviewRoute();
        } else {
            alert('Debe haber al menos una parada en la ruta.');
        }
    }

    // Actualizar coordenadas desde clic en mapa
    async updateCoordinatesFromClick(lat, lng) {
        // Buscar el primer input vacío de coordenadas
        const latInputs = document.querySelectorAll('.parada-lat');
        const lngInputs = document.querySelectorAll('.parada-lng');
        const coordDisplays = document.querySelectorAll('.coordinate-display');
        
        for (let i = 0; i < latInputs.length; i++) {
            if (!latInputs[i].value && !lngInputs[i].value) {
                latInputs[i].value = lat;
                lngInputs[i].value = lng;
                coordDisplays[i].textContent = `📍 ${lat}, ${lng}`;
                
                // Obtener nombre del lugar si no hay uno
                const nameInput = latInputs[i].parentElement.querySelector('.parada-name');
                if (!nameInput.value) {
                    const locationName = await this.locationService.getLocationName(lat, lng);
                    if (locationName) {
                        nameInput.placeholder = locationName;
                        nameInput.value = locationName;
                    }
                }
                break;
            }
        }
    }

    // Usar ubicación actual
    async getCurrentLocation() {
        try {
            const position = await this.locationService.getCurrentPosition();
            
            // Buscar el primer input vacío
            const latInputs = document.querySelectorAll('.parada-lat');
            const lngInputs = document.querySelectorAll('.parada-lng');
            const coordDisplays = document.querySelectorAll('.coordinate-display');
            
            for (let i = 0; i < latInputs.length; i++) {
                if (!latInputs[i].value && !lngInputs[i].value) {
                    latInputs[i].value = position.lat;
                    lngInputs[i].value = position.lng;
                    coordDisplays[i].textContent = `📍 ${position.lat}, ${position.lng}`;
                    
                    this.mapManager.centerToCurrentLocation((lat, lng) => {
                        // Obtener nombre del lugar
                        const nameInput = latInputs[i].parentElement.querySelector('.parada-name');
                        if (!nameInput.value) {
                            this.locationService.getLocationName(lat, lng).then(name => {
                                if (name) {
                                    nameInput.placeholder = name;
                                    nameInput.value = name;
                                }
                            });
                        }
                    });
                    break;
                }
            }
        } catch (error) {
            alert(error.message);
        }
    }

    // Actualizar display de coordenadas
    updateCoordinateDisplay(input) {
        const coordDisplay = input.parentElement.querySelector('.coordinate-display');
        const latInput = input.classList.contains('parada-lat') ? 
            input : input.parentElement.querySelector('.parada-lat');
        const lngInput = input.classList.contains('parada-lng') ? 
            input : input.parentElement.querySelector('.parada-lng');
        
        if (latInput.value && lngInput.value) {
            coordDisplay.textContent = `📍 ${latInput.value}, ${lngInput.value}`;
        } else {
            coordDisplay.textContent = '';
        }
    }

    // Obtener coordenadas del formulario
    getCoordinatesFromForm() {
        const latInputs = document.querySelectorAll('.parada-lat');
        const lngInputs = document.querySelectorAll('.parada-lng');
        
        const coordinates = [];
        for (let i = 0; i < latInputs.length; i++) {
            const lat = parseFloat(latInputs[i].value);
            const lng = parseFloat(lngInputs[i].value);
            
            if (this.locationService.isValidCoordinate(lat, lng)) {
                coordinates.push([lng, lat]); // ORS usa [lng, lat]
            }
        }
        
        return coordinates;
    }

    // Obtener paradas del formulario
    getParadasFromForm() {
        const nameInputs = document.querySelectorAll('.parada-name');
        const latInputs = document.querySelectorAll('.parada-lat');
        const lngInputs = document.querySelectorAll('.parada-lng');
        
        const paradas = [];
        for (let i = 0; i < nameInputs.length; i++) {
            const name = nameInputs[i].value.trim();
            const lat = parseFloat(latInputs[i].value);
            const lng = parseFloat(lngInputs[i].value);
            
            if (name && this.locationService.isValidCoordinate(lat, lng)) {
                paradas.push({ name, lat, lng });
            }
        }
        
        return paradas;
    }

    // Llenar formulario con datos de ruta (para edición)
    fillFormWithRoute(route) {
        document.getElementById('routeName').value = route.name;
        document.getElementById('routeNumber').value = route.number;
        document.getElementById('startTime').value = route.startTime;
        document.getElementById('endTime').value = route.endTime;
        document.getElementById('frequency').value = route.frequency;
        
        // Limpiar paradas actuales
        const container = document.getElementById('paradasContainer');
        container.innerHTML = '';
        
        // Agregar paradas de la ruta
        route.paradas.forEach((parada) => {
            const paradaDiv = document.createElement('div');
            paradaDiv.className = 'parada-item';
            paradaDiv.innerHTML = `
                <div class="parada-inputs">
                    <input type="text" placeholder="Nombre de la parada" class="parada-name" value="${parada.name}">
                    <input type="number" placeholder="Latitud" step="any" class="parada-lat" value="${parada.lat}">
                    <input type="number" placeholder="Longitud" step="any" class="parada-lng" value="${parada.lng}">
                    <div class="coordinate-display">📍 ${parada.lat}, ${parada.lng}</div>
                </div>
                <button type="button" class="btn-remove" onclick="formManager.removeParada(this)">×</button>
            `;
            container.appendChild(paradaDiv);
        });
    }

    // Limpiar formulario
    clearForm() {
        document.getElementById('routeForm').reset();
        this.mapManager.clearPreviewRoute();
        
        const container = document.getElementById('paradasContainer');
        container.innerHTML = `
            <div class="parada-item">
                <div class="parada-inputs">
                    <input type="text" placeholder="Nombre de la parada de inicio" class="parada-name">
                    <input type="number" placeholder="Latitud" step="any" class="parada-lat">
                    <input type="number" placeholder="Longitud" step="any" class="parada-lng">
                    <div class="coordinate-display"></div>
                </div>
                <button type="button" class="btn-remove" onclick="formManager.removeParada(this)">×</button>
            </div>
        `;
    }

    // Validar datos del formulario
    validateRouteForm() {
        const routeName = document.getElementById('routeName').value.trim();
        const routeNumber = document.getElementById('routeNumber').value.trim();
        const paradas = this.getParadasFromForm();
        
        if (!routeName) {
            throw new Error('El nombre de la ruta es obligatorio.');
        }
        
        if (!routeNumber) {
            throw new Error('El número de la ruta es obligatorio.');
        }
        
        if (paradas.length === 0) {
            throw new Error('Debe agregar al menos una parada con coordenadas válidas.');
        }
        
        return { routeName, routeNumber, paradas };
    }
}