// LocationService.js - Servicios de geocodificación y ubicación
class LocationService {
    constructor() {
        this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
    }

    // Obtener nombre del lugar usando reverse geocoding
    async getLocationName(lat, lng) {
        try {
            const response = await fetch(
                `${this.nominatimBaseUrl}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data?.display_name) {
                return this.extractConciseName(data);
            }
            
            return null;
        } catch (error) {
            console.warn('No se pudo obtener el nombre del lugar:', error);
            return null;
        }
    }

    // Extraer nombre conciso del resultado de geocodificación
    extractConciseName(data) {
        const address = data.address;
        
        if (address.road) {
            let name = address.road;
            if (address.house_number) {
                name += ` ${address.house_number}`;
            }
            return name;
        }
        
        if (address.pedestrian) return address.pedestrian;
        if (address.suburb) return address.suburb;
        
        // Fallback: primera parte del display_name
        return data.display_name.split(',')[0];
    }

    // Geocodificación directa (de dirección a coordenadas)
    async searchLocation(query) {
        try {
            const response = await fetch(
                `${this.nominatimBaseUrl}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const results = await response.json();
            
            return results.map(result => ({
                name: result.display_name,
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                importance: result.importance || 0
            }));
        } catch (error) {
            console.warn('Error en búsqueda de ubicación:', error);
            return [];
        }
    }

    // Obtener ubicación actual del navegador
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no soportada por este navegador.'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude.toFixed(6),
                        lng: position.coords.longitude.toFixed(6),
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    let message = 'Error al obtener ubicación';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message = 'Permiso de ubicación denegado';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = 'Información de ubicación no disponible';
                            break;
                        case error.TIMEOUT:
                            message = 'Tiempo de espera agotado para obtener ubicación';
                            break;
                    }
                    reject(new Error(message));
                },
                options
            );
        });
    }

    // Validar coordenadas
    isValidCoordinate(lat, lng) {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        return !isNaN(latitude) && 
               !isNaN(longitude) && 
               latitude >= -90 && 
               latitude <= 90 && 
               longitude >= -180 && 
               longitude <= 180;
    }

    // Calcular distancia aproximada entre dos puntos (en km)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
                Math.sin(dLng/2) * Math.sin(dLng/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }

    // Convertir grados a radianes
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
}