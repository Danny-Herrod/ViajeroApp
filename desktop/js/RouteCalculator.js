// RouteCalculator.js - Servicios de cálculo de rutas
class RouteCalculator {
    constructor() {
        // Eliminamos OpenRouteService por problemas de CORS
        this.apiKeys = {
            mapbox: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
        };
    }

    // Calcular ruta con múltiples servicios de respaldo
    async calculateRoute(coordinates) {
        if (coordinates.length < 2) {
            throw new Error('Necesitas al menos 2 paradas para calcular la ruta.');
        }

        // Priorizar OSRM (gratuito y sin CORS) y Mapbox como respaldo
        const services = [
            () => this.getRouteFromOSRM(coordinates),
            () => this.getRouteFromMapbox(coordinates)
        ];

        for (const service of services) {
            try {
                const result = await service();
                if (result?.features?.length > 0) {
                    console.log('✅ Ruta calculada exitosamente');
                    return result;
                }
            } catch (error) {
                console.log('⚠️ Servicio de routing falló, intentando siguiente...', error.message);
                continue;
            }
        }

        throw new Error('Todos los servicios de routing fallaron');
    }

    // OSRM (Open Source Routing Machine) - Sin problemas de CORS
    async getRouteFromOSRM(coordinates) {
        // OSRM soporta hasta 100 waypoints
        const coordString = coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&continue_straight=false`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OSRM HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            throw new Error('No routes found from OSRM');
        }

        // OSRM retorna UNA geometría continua para toda la ruta
        return {
            features: [{
                geometry: data.routes[0].geometry,
                properties: {
                    summary: {
                        distance: data.routes[0].distance,
                        duration: data.routes[0].duration
                    }
                }
            }]
        };
    }

    // Mapbox - Respaldo
    async getRouteFromMapbox(coordinates) {
        // Mapbox soporta hasta 25 waypoints
        if (coordinates.length > 25) {
            throw new Error('Mapbox no soporta más de 25 paradas');
        }

        const coordString = coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&overview=full&access_token=${this.apiKeys.mapbox}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Mapbox HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            throw new Error('No routes found from Mapbox');
        }

        // Mapbox retorna UNA geometría continua para toda la ruta
        return {
            features: [{
                geometry: data.routes[0].geometry,
                properties: {
                    summary: {
                        distance: data.routes[0].distance,
                        duration: data.routes[0].duration
                    }
                }
            }]
        };
    }

    // Obtener información de la ruta calculada
    getRouteInfo(routeData) {
        if (!routeData?.features?.[0]) {
            return null;
        }

        const feature = routeData.features[0];
        let totalDistance = 0;
        let totalDuration = 0;
        
        // Manejar diferentes formatos de respuesta
        if (feature.properties?.segments && Array.isArray(feature.properties.segments)) {
            // Formato ORS con segmentos
            feature.properties.segments.forEach(segment => {
                totalDistance += segment.distance || 0;
                totalDuration += segment.duration || 0;
            });
        } else if (feature.properties?.summary) {
            // Formato OSRM/Mapbox con summary
            totalDistance = feature.properties.summary.distance || 0;
            totalDuration = feature.properties.summary.duration || 0;
        }
        
        return {
            distance: (totalDistance / 1000).toFixed(2),
            duration: Math.round(totalDuration / 60),
            geometry: feature.geometry.coordinates
        };
    }
}