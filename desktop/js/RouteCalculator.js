// RouteCalculator.js - Servicios de cálculo de rutas
class RouteCalculator {
    constructor() {
        this.apiKeys = {
            openRouteService: '5b3ce3597851110001cf62489c8b8e2df85d4e7bb07e8f0dd3de22e4',
            mapbox: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
        };
    }

    // Calcular ruta con múltiples servicios de respaldo
    async calculateRoute(coordinates) {
        if (coordinates.length < 2) {
            throw new Error('Necesitas al menos 2 paradas para calcular la ruta.');
        }

        const services = [
            () => this.getRouteFromORS(coordinates),
            () => this.getRouteFromOSRM(coordinates),
            () => this.getRouteFromMapbox(coordinates)
        ];

        for (const service of services) {
            try {
                const result = await service();
                if (result?.features?.length > 0) {
                    return result;
                }
            } catch (error) {
                console.log('Servicio de routing falló, intentando siguiente...', error);
                continue;
            }
        }

        throw new Error('Todos los servicios de routing fallaron');
    }

    // OpenRouteService
    async getRouteFromORS(coordinates) {
        const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
        
        const requestBody = {
            coordinates: coordinates,
            instructions: true,
            geometry: true
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.apiKeys.openRouteService
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`ORS HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    // OSRM (Open Source Routing Machine)
    async getRouteFromOSRM(coordinates) {
        const coordString = coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OSRM HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Convertir formato OSRM a formato compatible
        return {
            features: [{
                geometry: data.routes[0].geometry,
                properties: {
                    segments: [{
                        distance: data.routes[0].distance,
                        duration: data.routes[0].duration
                    }]
                }
            }]
        };
    }

    // Mapbox
    async getRouteFromMapbox(coordinates) {
        const coordString = coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&access_token=${this.apiKeys.mapbox}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Mapbox HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            throw new Error('No routes found from Mapbox');
        }

        // Convertir formato Mapbox a formato compatible
        return {
            features: [{
                geometry: data.routes[0].geometry,
                properties: {
                    segments: [{
                        distance: data.routes[0].distance,
                        duration: data.routes[0].duration
                    }]
                }
            }]
        };
    }

    // Obtener información de la ruta calculada
    getRouteInfo(routeData) {
        if (!routeData?.features?.[0]?.properties?.segments?.[0]) {
            return null;
        }

        const segment = routeData.features[0].properties.segments[0];
        return {
            distance: (segment.distance / 1000).toFixed(2),
            duration: Math.round(segment.duration / 60),
            geometry: routeData.features[0].geometry.coordinates
        };
    }
}