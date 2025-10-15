// main.js - Archivo principal que inicializa y coordina toda la aplicación
class BusRouteApp {
    constructor() {
        this.mapManager = null;
        this.routeCalculator = null;
        this.locationService = null;
        this.formManager = null;
        this.routeManager = null;
        this.uiManager = null;
    }

    // Inicializar la aplicación
    async init() {
        try {
            // Inicializar servicios core
            this.locationService = new LocationService();
            this.routeCalculator = new RouteCalculator();
            this.mapManager = new MapManager();
            
            // Inicializar gestores
            this.formManager = new FormManager(this.mapManager, this.locationService);
            this.routeManager = new RouteManager(this.mapManager, this.routeCalculator);
            this.uiManager = new UIManager(this.routeManager);
            
            // Hacer disponibles globalmente para compatibilidad
            window.mapManager = this.mapManager;
            window.formManager = this.formManager;
            window.routeManager = this.routeManager;
            window.uiManager = this.uiManager;
            
            // Inicializar mapa
            this.mapManager.initMap();
            
            // Configurar eventos
            this.setupEvents();
            
            // Inicializar UI
            this.uiManager.displayRoutes();
            this.uiManager.addImportExportButtons();
            this.uiManager.setupUIEvents();
            
            console.log('Bus Route App inicializada correctamente');
        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
            alert('Error al cargar la aplicación. Por favor, recarga la página.');
        }
    }

    // Configurar eventos principales
    setupEvents() {
        this.setupFormEvents();
        this.setupButtonEvents();
    }

    // Configurar eventos del formulario
    setupFormEvents() {
        const routeForm = document.getElementById('routeForm');
        if (routeForm) {
            routeForm.addEventListener('submit', (e) => this.handleRouteSubmit(e));
        }
    }

    // Configurar eventos de botones
    setupButtonEvents() {
        // Botón calcular ruta
        const calculateBtn = document.getElementById('calculateBtn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.handleCalculateRoute());
        }

        // Botón ubicación actual
        const locationBtn = document.querySelector('.location-btn');
        if (locationBtn) {
            locationBtn.addEventListener('click', () => this.formManager.getCurrentLocation());
        }

        // Botón agregar parada
        const addStopBtn = document.querySelector('.add-stop-btn');
        if (addStopBtn) {
            addStopBtn.addEventListener('click', () => this.formManager.addParada());
        }

        // Botón limpiar formulario
        const clearBtn = document.querySelector('.clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.formManager.clearForm());
        }
    }

    // Manejar envío del formulario de ruta
    async handleRouteSubmit(e) {
        e.preventDefault();
        
        try {
            // Validar datos del formulario
            const { routeName, routeNumber, paradas } = this.formManager.validateRouteForm();
            
            // Obtener datos adicionales del formulario
            const formData = new FormData(e.target);
            const routeData = {
                name: routeName,
                number: routeNumber,
                startTime: formData.get('startTime'),
                endTime: formData.get('endTime'),
                frequency: formData.get('frequency'),
                paradas: paradas
            };

            // Mostrar loading
            this.uiManager.showLoading(true, 'Guardando ruta...');

            // Agregar ruta
            const savedRoute = await this.routeManager.addRoute(routeData);

            // Actualizar UI
            this.uiManager.displayRoutes();
            this.formManager.clearForm();
            
            // Mostrar feedback
            const submitBtn = e.target.querySelector('button[type="submit"]');
            this.uiManager.showSaveSuccess(submitBtn, !!savedRoute.routeGeometry);
            
        } catch (error) {
            this.uiManager.showError(error.message);
        } finally {
            this.uiManager.showLoading(false);
        }
    }

    // Manejar cálculo de ruta
    async handleCalculateRoute() {
        try {
            const coordinates = this.formManager.getCoordinatesFromForm();
            
            if (coordinates.length < 2) {
                this.uiManager.showError('Necesitas al menos 2 paradas para calcular la ruta.');
                return;
            }

            this.uiManager.showLoading(true, 'Calculando ruta...');
            this.mapManager.clearPreviewRoute();

            try {
                // Calcular ruta real
                const routeData = await this.routeCalculator.calculateRoute(coordinates);
                
                if (routeData?.features?.length > 0) {
                    this.mapManager.displayPreviewRoute(routeData, coordinates);
                    const routeInfo = this.routeCalculator.getRouteInfo(routeData);
                    this.uiManager.showRouteInfo(routeInfo);
                } else {
                    throw new Error('No se pudo calcular la ruta');
                }
            } catch (error) {
                console.warn('Error calculando ruta:', error);
                this.uiManager.showError('Error al calcular la ruta. Usando línea directa como respaldo.');
                this.mapManager.displayDirectRoute(coordinates);
            }
        } catch (error) {
            this.uiManager.showError(error.message);
        } finally {
            this.uiManager.showLoading(false);
        }
    }

    // Métodos de utilidad para compatibilidad con código existente
    addParada() {
        return this.formManager.addParada();
    }

    removeParada(button) {
        return this.formManager.removeParada(button);
    }

    getCurrentLocation() {
        return this.formManager.getCurrentLocation();
    }

    async calculateRoute() {
        return this.handleCalculateRoute();
    }

    clearForm() {
        return this.formManager.clearForm();
    }

    showRouteOnMap(routeIndex) {
        return this.uiManager.handleRouteClick(routeIndex);
    }

    toggleRoute(routeIndex) {
        return this.uiManager.toggleRoute(routeIndex);
    }

    editRoute(routeIndex) {
        return this.uiManager.editRoute(routeIndex);
    }

    deleteRoute(routeIndex) {
        return this.uiManager.deleteRoute(routeIndex);
    }

    exportRoutes() {
        return this.uiManager.handleExportRoutes();
    }

    importRoutes(event) {
        return this.uiManager.handleImportRoutes(event);
    }
}

// Instancia global de la aplicación
let app;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    app = new BusRouteApp();
    await app.init();
    
    // Hacer métodos disponibles globalmente para compatibilidad
    window.addParada = () => app.addParada();
    window.removeParada = (button) => app.removeParada(button);
    window.getCurrentLocation = () => app.getCurrentLocation();
    window.calculateRoute = () => app.calculateRoute();
    window.clearForm = () => app.clearForm();
    window.showRouteOnMap = (index) => app.showRouteOnMap(index);
    window.toggleRoute = (index) => app.toggleRoute(index);
    window.editRoute = (index) => app.editRoute(index);
    window.deleteRoute = (index) => app.deleteRoute(index);
    window.exportRoutes = () => app.exportRoutes();
    window.importRoutes = (event) => app.importRoutes(event);
});

// Exportar la clase para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BusRouteApp;
}