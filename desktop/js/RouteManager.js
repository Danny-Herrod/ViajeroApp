// RouteManager.js - Gestión de rutas de autobús
class RouteManager {
    constructor(mapManager, routeCalculator) {
        this.routes = [];
        this.mapManager = mapManager;
        this.routeCalculator = routeCalculator;
    }

    // Agregar nueva ruta
    async addRoute(routeData) {
        const route = {
            id: Date.now(),
            name: routeData.name,
            number: routeData.number,
            startTime: routeData.startTime,
            endTime: routeData.endTime,
            frequency: routeData.frequency,
            paradas: routeData.paradas,
            visible: true,
            createdAt: new Date().toLocaleDateString(),
            routeGeometry: null,
            distance: null,
            duration: null
        };

        // Calcular ruta real si hay más de una parada
        if (routeData.paradas.length > 1) {
            try {
                const coordinates = routeData.paradas.map(p => [p.lng, p.lat]);
                const calculatedRoute = await this.routeCalculator.calculateRoute(coordinates);
                const routeInfo = this.routeCalculator.getRouteInfo(calculatedRoute);
                
                if (routeInfo) {
                    route.routeGeometry = routeInfo.geometry;
                    route.distance = routeInfo.distance;
                    route.duration = routeInfo.duration;
                }
            } catch (error) {
                console.warn('No se pudo calcular ruta real, usando línea directa:', error);
            }
        }

        const routeIndex = this.routes.length;
        this.routes.push(route);
        this.mapManager.addRouteToMap(route, routeIndex);
        
        return route;
    }

    // Editar ruta existente
    editRoute(routeIndex, newRouteData) {
        if (routeIndex < 0 || routeIndex >= this.routes.length) {
            throw new Error('Índice de ruta inválido');
        }

        // Remover ruta actual del mapa
        this.mapManager.removeRoute(routeIndex);
        
        // Eliminar ruta del array
        this.routes.splice(routeIndex, 1);
        
        return newRouteData;
    }

    // Eliminar ruta
    deleteRoute(routeIndex, confirm = true) {
        if (confirm && !window.confirm('¿Estás seguro de que deseas eliminar esta ruta?')) {
            return false;
        }
        
        if (routeIndex < 0 || routeIndex >= this.routes.length) {
            throw new Error('Índice de ruta inválido');
        }

        this.mapManager.removeRoute(routeIndex);
        this.routes.splice(routeIndex, 1);
        
        return true;
    }

    // Alternar visibilidad de ruta - CORREGIDO
    toggleRouteVisibility(routeIndex) {
        if (routeIndex < 0 || routeIndex >= this.routes.length) {
            return;
        }

        const route = this.routes[routeIndex];
        route.visible = !route.visible;
        
        if (route.visible) {
            // Agregar ruta al mapa
            this.mapManager.addRouteToMap(route, routeIndex);
        } else {
            // Remover ruta del mapa
            this.mapManager.toggleRouteVisibility(routeIndex, false);
        }
        
        return route.visible;
    }

    // Mostrar ruta específica en el mapa
    showRouteOnMap(routeIndex) {
        if (routeIndex < 0 || routeIndex >= this.routes.length) {
            return;
        }

        const route = this.routes[routeIndex];
        this.mapManager.showRouteOnMap(route);
    }

    // Obtener todas las rutas
    getAllRoutes() {
        return [...this.routes];
    }

    // Obtener ruta por índice
    getRoute(routeIndex) {
        if (routeIndex < 0 || routeIndex >= this.routes.length) {
            return null;
        }
        return this.routes[routeIndex];
    }

    // Buscar rutas por criterio
    searchRoutes(searchTerm) {
        const term = searchTerm.toLowerCase();
        
        return this.routes.filter(route => 
            route.name.toLowerCase().includes(term) ||
            route.number.toLowerCase().includes(term) ||
            route.paradas.some(parada => 
                parada.name.toLowerCase().includes(term)
            )
        );
    }

    // Exportar rutas a JSON
    exportRoutes() {
        if (this.routes.length === 0) {
            throw new Error('No hay rutas para exportar.');
        }

        const dataStr = JSON.stringify(this.routes, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `rutas_buses_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        return exportFileDefaultName;
    }

    // Importar rutas desde JSON
    async importRoutes(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const importedRoutes = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(importedRoutes)) {
                        throw new Error('Formato de archivo inválido.');
                    }

                    // Validar estructura de las rutas
                    const validRoutes = importedRoutes.filter(route => 
                        route.name && 
                        route.number && 
                        Array.isArray(route.paradas) && 
                        route.paradas.length > 0
                    );

                    if (validRoutes.length === 0) {
                        throw new Error('No se encontraron rutas válidas en el archivo.');
                    }

                    // Agregar rutas importadas
                    const startIndex = this.routes.length;
                    this.routes.push(...validRoutes);
                    
                    // Mostrar rutas en el mapa
                    validRoutes.forEach((route, index) => {
                        const routeIndex = startIndex + index;
                        this.mapManager.addRouteToMap(route, routeIndex);
                    });
                    
                    resolve(validRoutes.length);
                } catch (error) {
                    reject(new Error(`Error al procesar archivo: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error al leer el archivo.'));
            };
            
            reader.readAsText(file);
        });
    }

    // Obtener estadísticas de las rutas
    getRouteStats() {
        if (this.routes.length === 0) {
            return {
                totalRoutes: 0,
                totalStops: 0,
                averageStopsPerRoute: 0,
                totalDistance: 0,
                averageDistance: 0
            };
        }

        const totalStops = this.routes.reduce((sum, route) => sum + route.paradas.length, 0);
        const routesWithDistance = this.routes.filter(route => route.distance);
        const totalDistance = routesWithDistance.reduce((sum, route) => sum + parseFloat(route.distance), 0);

        return {
            totalRoutes: this.routes.length,
            totalStops,
            averageStopsPerRoute: (totalStops / this.routes.length).toFixed(1),
            totalDistance: totalDistance.toFixed(2),
            averageDistance: routesWithDistance.length > 0 ? 
                (totalDistance / routesWithDistance.length).toFixed(2) : 0
        };
    }

    // Validar datos de ruta
    validateRouteData(routeData) {
        if (!routeData.name || !routeData.name.trim()) {
            throw new Error('El nombre de la ruta es obligatorio.');
        }

        if (!routeData.number || !routeData.number.trim()) {
            throw new Error('El número de la ruta es obligatorio.');
        }

        if (!routeData.startTime || !routeData.endTime) {
            throw new Error('Los horarios de inicio y fin son obligatorios.');
        }

        if (!routeData.frequency || routeData.frequency <= 0) {
            throw new Error('La frecuencia debe ser un número positivo.');
        }

        if (!Array.isArray(routeData.paradas) || routeData.paradas.length === 0) {
            throw new Error('Debe incluir al menos una parada.');
        }

        // Validar paradas
        routeData.paradas.forEach((parada, index) => {
            if (!parada.name || !parada.name.trim()) {
                throw new Error(`La parada ${index + 1} debe tener un nombre.`);
            }
            
            if (typeof parada.lat !== 'number' || typeof parada.lng !== 'number') {
                throw new Error(`La parada ${index + 1} debe tener coordenadas válidas.`);
            }
        });

        return true;
    }

    // Limpiar todas las rutas
    clearAllRoutes() {
        if (!window.confirm('¿Estás seguro de que deseas eliminar todas las rutas?')) {
            return false;
        }

        // Remover todas las rutas del mapa
        this.routes.forEach((_, index) => {
            this.mapManager.removeRoute(index);
        });

        this.routes = [];
        return true;
    }
}