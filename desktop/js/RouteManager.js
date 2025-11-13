// RouteManager.js - Gestión de rutas de autobús con integración al backend
class RouteManager {
    constructor(mapManager, routeCalculator, apiService = null) {
        this.routes = [];
        this.mapManager = mapManager;
        this.routeCalculator = routeCalculator;
        this.apiService = apiService; // APIService para comunicación con backend
    }

    // Cargar rutas desde el backend
    async loadRoutesFromBackend() {
        if (!this.apiService) {
            console.warn('APIService no disponible');
            return [];
        }

        try {
            console.log('🔄 Cargando rutas desde el backend...');
            const backendRoutes = await this.apiService.getAllRutas();

            this.routes = backendRoutes;
            console.log(`✅ ${this.routes.length} rutas cargadas desde el backend`);

            // Mostrar rutas en el mapa
            this.routes.forEach((route, index) => {
                if (route.visible !== false) {
                    this.mapManager.addRouteToMap(route, index);
                }
            });

            return this.routes;
        } catch (error) {
            console.error('❌ Error cargando rutas del backend:', error);
            throw error;
        }
    }

    // Agregar nueva ruta (guardando en backend)
    async addRoute(routeData) {
        // Validar datos primero
        this.validateRouteData(routeData);

        const route = {
            name: routeData.name,
            number: routeData.number,
            startTime: routeData.startTime,
            endTime: routeData.endTime,
            frequency: routeData.frequency,
            paradas: routeData.paradas,
            visible: true,
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

        // Guardar en el backend si está disponible
        if (this.apiService) {
            try {
                console.log('💾 Guardando ruta en el backend...');
                const response = await this.apiService.createRuta(route);
                console.log('✅ Ruta guardada en el backend:', response);

                // Recargar rutas desde el backend para obtener el ID
                await this.loadRoutesFromBackend();

                return response;
            } catch (error) {
                console.error('❌ Error guardando ruta en el backend:', error);
                throw new Error(`No se pudo guardar la ruta: ${error.message}`);
            }
        } else {
            // Fallback: guardar solo localmente
            console.warn('⚠️ APIService no disponible, guardando solo localmente');
            route.id = Date.now();
            route.createdAt = new Date().toLocaleDateString();

            const routeIndex = this.routes.length;
            this.routes.push(route);
            this.mapManager.addRouteToMap(route, routeIndex);

            return route;
        }
    }

    // Eliminar ruta (del backend y localmente)
    async deleteRoute(routeId, confirm = true) {
        if (confirm && !window.confirm('¿Estás seguro de que deseas eliminar esta ruta?')) {
            return false;
        }

        // Buscar el índice de la ruta por ID
        const routeIndex = this.routes.findIndex(r => r.id === routeId);

        if (routeIndex === -1) {
            throw new Error('Ruta no encontrada');
        }

        // Eliminar del backend si está disponible
        if (this.apiService) {
            try {
                console.log(`🗑️ Eliminando ruta ${routeId} del backend...`);
                await this.apiService.deleteRuta(routeId);
                console.log('✅ Ruta eliminada del backend');

                // Remover del mapa
                this.mapManager.removeRoute(routeIndex);

                // Remover del array local
                this.routes.splice(routeIndex, 1);

                return true;
            } catch (error) {
                console.error('❌ Error eliminando ruta del backend:', error);
                throw new Error(`No se pudo eliminar la ruta: ${error.message}`);
            }
        } else {
            // Fallback: eliminar solo localmente
            console.warn('⚠️ APIService no disponible, eliminando solo localmente');
            this.mapManager.removeRoute(routeIndex);
            this.routes.splice(routeIndex, 1);
            return true;
        }
    }

    // Actualizar ruta existente
    async updateRoute(routeId, newRouteData) {
        const routeIndex = this.routes.findIndex(r => r.id === routeId);

        if (routeIndex === -1) {
            throw new Error('Ruta no encontrada');
        }

        // Validar datos
        this.validateRouteData(newRouteData);

        const updatedRoute = {
            ...this.routes[routeIndex],
            ...newRouteData
        };

        // Recalcular geometría si cambió paradas
        if (newRouteData.paradas && newRouteData.paradas.length > 1) {
            try {
                const coordinates = newRouteData.paradas.map(p => [p.lng, p.lat]);
                const calculatedRoute = await this.routeCalculator.calculateRoute(coordinates);
                const routeInfo = this.routeCalculator.getRouteInfo(calculatedRoute);

                if (routeInfo) {
                    updatedRoute.routeGeometry = routeInfo.geometry;
                    updatedRoute.distance = routeInfo.distance;
                    updatedRoute.duration = routeInfo.duration;
                }
            } catch (error) {
                console.warn('No se pudo recalcular ruta:', error);
            }
        }

        // Actualizar en backend
        if (this.apiService) {
            try {
                console.log(`🔄 Actualizando ruta ${routeId} en el backend...`);
                await this.apiService.updateRuta(routeId, updatedRoute);
                console.log('✅ Ruta actualizada en el backend');

                // Actualizar localmente
                this.routes[routeIndex] = updatedRoute;

                // Actualizar en mapa
                this.mapManager.removeRoute(routeIndex);
                this.mapManager.addRouteToMap(updatedRoute, routeIndex);

                return updatedRoute;
            } catch (error) {
                console.error('❌ Error actualizando ruta en el backend:', error);
                throw new Error(`No se pudo actualizar la ruta: ${error.message}`);
            }
        } else {
            // Fallback: actualizar solo localmente
            this.routes[routeIndex] = updatedRoute;
            this.mapManager.removeRoute(routeIndex);
            this.mapManager.addRouteToMap(updatedRoute, routeIndex);
            return updatedRoute;
        }
    }

    // Alternar visibilidad de ruta
    toggleRouteVisibility(routeIndex) {
        if (routeIndex < 0 || routeIndex >= this.routes.length) {
            return;
        }

        const route = this.routes[routeIndex];
        route.visible = !route.visible;

        if (route.visible) {
            this.mapManager.addRouteToMap(route, routeIndex);
        } else {
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

    // Obtener ruta por ID
    getRouteById(routeId) {
        return this.routes.find(r => r.id === routeId);
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

            reader.onload = async (e) => {
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

                    // Importar cada ruta al backend
                    let importedCount = 0;
                    for (const route of validRoutes) {
                        try {
                            await this.addRoute(route);
                            importedCount++;
                        } catch (error) {
                            console.error(`Error importando ruta ${route.name}:`, error);
                        }
                    }

                    resolve(importedCount);
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
    async clearAllRoutes() {
        if (!window.confirm('¿Estás seguro de que deseas eliminar todas las rutas?')) {
            return false;
        }

        // Si hay backend, eliminar una por una
        if (this.apiService && this.routes.length > 0) {
            try {
                for (const route of this.routes) {
                    await this.apiService.deleteRuta(route.id);
                }
            } catch (error) {
                console.error('Error eliminando rutas:', error);
            }
        }

        // Remover todas las rutas del mapa
        this.routes.forEach((_, index) => {
            this.mapManager.removeRoute(index);
        });

        this.routes = [];
        return true;
    }

    // Verificar conexión con backend
    async checkBackendConnection() {
        if (!this.apiService) {
            return false;
        }

        try {
            const isConnected = await this.apiService.checkConnection();
            return isConnected;
        } catch (error) {
            return false;
        }
    }
}
