// NOTA: Usamos Nominatim de OpenStreetMap para geocodificación
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Variables globales
let userLocation = null;
let userLocationCoords = null;
let selectedDestination = null;
let planningMap = null;
let resultMap = null;
let currentRoute = null;
let nearbyPlaces = [];

// Constantes de precios simulados por km
const PRICE_PER_KM = 2.5; // C$ por kilómetro
const BASE_FARE = 10; // Tarifa base en C$

// Clase LocationService (adaptada de desktop)
class LocationService {
    constructor() {
        this.nominatimBaseUrl = NOMINATIM_BASE_URL;
    }

    async getLocationName(lat, lng) {
        try {
            const response = await fetch(
                `${this.nominatimBaseUrl}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'NextStop-Mobile/1.0'
                    }
                }
            );

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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

    extractConciseName(data) {
        const address = data.address;

        if (address.tourism) return address.tourism;
        if (address.amenity) return address.amenity;
        if (address.attraction) return address.attraction;
        if (address.road) {
            let name = address.road;
            if (address.house_number) name += ` ${address.house_number}`;
            return name;
        }

        if (address.pedestrian) return address.pedestrian;
        if (address.suburb) return address.suburb;
        if (address.village) return address.village;
        if (address.town) return address.town;

        return data.display_name.split(',')[0];
    }

    async searchNearbyPlaces(lat, lng, radius = 25000, tags = 'tourism') {
        try {
            // Buscar solo lugares turísticos relevantes, SIN cerros/peaks
            const query = `
                [out:json][timeout:10];
                (
                    node["tourism"="attraction"]["name"](around:${radius},${lat},${lng});
                    node["tourism"="viewpoint"]["name"](around:${radius},${lat},${lng});
                    node["tourism"="museum"]["name"](around:${radius},${lat},${lng});
                    way["tourism"="attraction"]["name"](around:${radius},${lat},${lng});
                    node["natural"="waterfall"]["name"](around:${radius},${lat},${lng});
                    node["natural"="cave_entrance"]["name"](around:${radius},${lat},${lng});
                    way["natural"="lake"]["name"](around:${radius},${lat},${lng});
                    node["leisure"="park"]["name"](around:${radius},${lat},${lng});
                    way["leisure"="park"]["name"](around:${radius},${lat},${lng});
                    node["historic"="monument"]["name"](around:${radius},${lat},${lng});
                    node["historic"="memorial"]["name"](around:${radius},${lat},${lng});
                    way["historic"="monument"]["name"](around:${radius},${lat},${lng});
                );
                out center;
            `;

            console.log(`Consultando Overpass API para ${lat}, ${lng} (radio: ${radius/1000}km)`);

            // Crear un controller para abortar el fetch si tarda mucho
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Error en Overpass API: ${response.status}`);

            const data = await response.json();
            console.log(`✓ Overpass API respondió con ${data.elements.length} elementos`);
            return this.processOverpassResults(data.elements, lat, lng);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('⏱ Overpass API timeout - la consulta tardó demasiado');
            } else {
                console.error('❌ Error buscando lugares cercanos:', error);
            }
            return [];
        }
    }

    async processOverpassResults(elements, userLat, userLng) {
        const places = [];
        const processedNames = new Set();

        console.log(`Procesando ${elements.length} elementos de Overpass...`);

        for (const element of elements) {
            if (!element.tags || !element.tags.name) {
                continue;
            }

            const name = element.tags.name;
            if (processedNames.has(name)) {
                console.log(`  - Duplicado ignorado: ${name}`);
                continue;
            }
            processedNames.add(name);

            const lat = element.lat || (element.center && element.center.lat);
            const lng = element.lon || (element.center && element.center.lon);

            if (!lat || !lng) {
                console.log(`  - Sin coordenadas: ${name}`);
                continue;
            }

            const distance = this.calculateDistance(userLat, userLng, lat, lng);

            if (distance > 50) {
                console.log(`  - Muy lejos (${distance.toFixed(1)}km): ${name}`);
                continue;
            }

            const placeType = element.tags.tourism || element.tags.leisure || element.tags.natural || element.tags.historic || 'place';

            console.log(`  ✓ ${name} - ${placeType} - ${distance.toFixed(1)}km - Coords: [${lat}, ${lng}] - Wiki:${element.tags.wikipedia ? 'Sí' : 'No'} Wikidata:${element.tags.wikidata ? 'Sí' : 'No'}`);

            // NO esperar por las imágenes aquí - se cargarán después
            places.push({
                id: element.id,
                name: name,
                description: this.getPlaceDescription(element.tags),
                coordinates: [lat, lng], // Leaflet usa [lat, lng]
                tags: element.tags,
                type: placeType,
                vicinity: this.extractVicinity(element.tags),
                distanceValue: distance,
                rating: this.estimateRating(element.tags),
                imageUrl: null, // Se cargará después
                hasRealImage: false
            });
        }

        const sortedPlaces = places.sort((a, b) => a.distanceValue - b.distanceValue);
        console.log(`Total de lugares válidos procesados: ${sortedPlaces.length}`);
        return sortedPlaces;
    }

    async getPlaceImage(placeName, tags) {
        try {
            // SOLO intentar con Wikidata/Wikipedia si el lugar tiene estos tags
            // Esto evita imágenes aleatorias de búsquedas genéricas
            if (tags.wikidata) {
                console.log(`Buscando imagen en Wikidata para: ${placeName}`);
                const wikidataImage = await this.getWikidataImage(tags.wikidata);
                if (wikidataImage) {
                    console.log(`✓ Imagen encontrada en Wikidata para: ${placeName}`);
                    return wikidataImage;
                }
            }

            if (tags.wikipedia) {
                console.log(`Buscando imagen en Wikipedia para: ${placeName}`);
                const wikipediaImage = await this.getWikipediaImage(tags.wikipedia);
                if (wikipediaImage) {
                    console.log(`✓ Imagen encontrada en Wikipedia para: ${placeName}`);
                    return wikipediaImage;
                }
            }

            // NO buscar en Wikipedia genéricamente - genera resultados muy aleatorios
            console.log(`✗ No hay imagen wiki para: ${placeName}`);
            return null;
        } catch (error) {
            console.warn('Error obteniendo imagen para', placeName, error);
            return null;
        }
    }

    async getWikidataImage(wikidataId) {
        try {
            const query = `
                SELECT ?image WHERE {
                    wd:${wikidataId} wdt:P18 ?image.
                }
            `;

            const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'NextStop-Mobile/1.0'
                }
            });

            if (!response.ok) return null;

            const data = await response.json();

            if (data.results?.bindings?.length > 0) {
                return data.results.bindings[0].image.value;
            }

            return null;
        } catch (error) {
            console.warn('Error en Wikidata:', error);
            return null;
        }
    }

    async getWikipediaImage(wikipediaTag) {
        try {
            // El tag viene en formato "es:Nombre del artículo"
            const [lang, ...titleParts] = wikipediaTag.split(':');
            const title = titleParts.join(':');

            const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;

            const response = await fetch(url);
            if (!response.ok) return null;

            const data = await response.json();
            const pages = data.query?.pages;

            if (pages) {
                const pageId = Object.keys(pages)[0];
                const page = pages[pageId];

                if (page.thumbnail?.source) {
                    return page.thumbnail.source;
                }
            }

            return null;
        } catch (error) {
            console.warn('Error en Wikipedia:', error);
            return null;
        }
    }

    async searchWikipediaImage(placeName) {
        try {
            // Buscar en Wikipedia en español
            const searchUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(placeName)}&format=json&origin=*`;

            const searchResponse = await fetch(searchUrl);
            if (!searchResponse.ok) return null;

            const searchData = await searchResponse.json();

            if (searchData.query?.search?.length > 0) {
                const firstResult = searchData.query.search[0];
                const title = firstResult.title;

                // Obtener imagen del primer resultado
                const imageUrl = `https://es.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;

                const imageResponse = await fetch(imageUrl);
                if (!imageResponse.ok) return null;

                const imageData = await imageResponse.json();
                const pages = imageData.query?.pages;

                if (pages) {
                    const pageId = Object.keys(pages)[0];
                    const page = pages[pageId];

                    if (page.thumbnail?.source) {
                        return page.thumbnail.source;
                    }
                }
            }

            return null;
        } catch (error) {
            console.warn('Error buscando en Wikipedia:', error);
            return null;
        }
    }

    getPlaceDescription(tags) {
        // Tourism
        if (tags.tourism === 'attraction') return 'Atracción turística popular';
        if (tags.tourism === 'viewpoint') return 'Mirador con vistas panorámicas';
        if (tags.tourism === 'museum') return 'Museo cultural';
        if (tags.tourism === 'artwork') return 'Obra de arte público';
        if (tags.tourism === 'hotel') return 'Hotel y hospedaje';

        // Natural
        if (tags.natural === 'peak') return 'Pico montañoso';
        if (tags.natural === 'waterfall') return 'Cascada natural';
        if (tags.natural === 'lake') return 'Lago natural';
        if (tags.natural === 'cave_entrance') return 'Entrada a cueva';
        if (tags.natural === 'spring') return 'Manantial natural';

        // Leisure
        if (tags.leisure === 'park') return 'Parque y área recreativa';
        if (tags.leisure === 'garden') return 'Jardín';

        // Historic
        if (tags.historic === 'monument') return 'Monumento histórico';
        if (tags.historic === 'memorial') return 'Memorial conmemorativo';
        if (tags.historic === 'ruins') return 'Ruinas históricas';
        if (tags.historic === 'archaeological_site') return 'Sitio arqueológico';
        if (tags.historic) return 'Lugar histórico';

        // Amenity
        if (tags.amenity === 'restaurant') return 'Restaurante';
        if (tags.amenity === 'cafe') return 'Cafetería';

        return 'Punto de interés turístico';
    }

    extractVicinity(tags) {
        if (tags['addr:city']) return tags['addr:city'];
        if (tags['addr:town']) return tags['addr:town'];
        if (tags['addr:village']) return tags['addr:village'];
        return 'Jinotega';
    }

    estimateRating(tags) {
        // Estimar rating basado en tipo de lugar
        if (tags.tourism === 'attraction') return 4.5;
        if (tags.tourism === 'viewpoint') return 4.7;
        if (tags.tourism === 'museum') return 4.3;
        if (tags.natural === 'waterfall') return 4.6;
        if (tags.natural === 'lake') return 4.4;
        return 4.0;
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng/2) * Math.sin(dLng/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
}

const locationService = new LocationService();

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    detectUserLocation();
}

// Detectar ubicación real del usuario
function detectUserLocation() {
    if (!navigator.geolocation) {
        console.log('Navegador no soporta geolocalización');
        userLocationCoords = { lat: 13.0894, lng: -85.9639 }; // Jinotega centro
        userLocation = [userLocationCoords.lat, userLocationCoords.lng];
        loadNearbyPlacesDirect();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocationCoords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            userLocation = [userLocationCoords.lat, userLocationCoords.lng];
            console.log('Ubicación detectada:', userLocationCoords);
            loadNearbyPlacesDirect();
        },
        (error) => {
            console.error('Error al obtener ubicación:', error);
            userLocationCoords = { lat: 13.0894, lng: -85.9639 };
            userLocation = [userLocationCoords.lat, userLocationCoords.lng];
            loadNearbyPlacesDirect();
        },
        {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000
        }
    );
}

// Cargar lugares cercanos directamente
async function loadNearbyPlacesDirect() {
    console.log('Buscando lugares turísticos reales cercanos...');

    // Timeout de seguridad: si tarda más de 8 segundos, usar fallback
    const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
            console.log('Timeout alcanzado, usando lugares fallback');
            resolve([]);
        }, 8000);
    });

    try {
        // Buscar lugares reales usando Overpass API con timeout
        const placesPromise = locationService.searchNearbyPlaces(
            userLocationCoords.lat,
            userLocationCoords.lng,
            50000 // 50km de radio
        );

        const realPlaces = await Promise.race([placesPromise, timeoutPromise]);

        console.log('Lugares reales encontrados:', realPlaces.length);

        if (realPlaces.length > 0) {
            // Procesar lugares reales
            nearbyPlaces = realPlaces.slice(0, 15).map(place => {
                return {
                    ...place,
                    emoji: getEmojiForType(place.type, place.tags),
                    price: calculatePrice(place.distanceValue),
                    distance: `${place.distanceValue.toFixed(1)} km`,
                    buses: place.distanceValue > 15 ? 2 : 1,
                    time: calculateTravelTime(place.distanceValue)
                };
            });

            console.log('Lugares procesados:', nearbyPlaces);
            hideLoadingOverlay();
            loadRecommendedDestinations();

            // Cargar imágenes de forma asíncrona en segundo plano (solo para lugares con tags wiki)
            loadPlaceImagesAsync();
        } else {
            // Si no se encuentran lugares, usar fallback
            console.log('No se encontraron lugares reales, usando fallback');
            loadFallbackPlaces();
        }
    } catch (error) {
        console.error('Error cargando lugares:', error);
        // En caso de error, usar fallback
        loadFallbackPlaces();
    }
}

// Cargar imágenes de lugares de forma asíncrona
async function loadPlaceImagesAsync() {
    console.log('Cargando imágenes de lugares en segundo plano...');

    for (let i = 0; i < nearbyPlaces.length; i++) {
        const place = nearbyPlaces[i];

        if (place.tags && !place.hasRealImage) {
            try {
                const imageUrl = await locationService.getPlaceImage(place.name, place.tags);

                if (imageUrl) {
                    // Actualizar el lugar con la imagen
                    nearbyPlaces[i].imageUrl = imageUrl;
                    nearbyPlaces[i].hasRealImage = true;

                    // Actualizar la tarjeta en el DOM si existe
                    updateDestinationCardImage(place.id, imageUrl);
                }
            } catch (error) {
                console.warn(`No se pudo cargar imagen para ${place.name}:`, error);
            }
        }
    }
}

// Actualizar imagen de tarjeta en el DOM
function updateDestinationCardImage(placeId, imageUrl) {
    const cards = document.querySelectorAll('.destination-card');
    cards.forEach(card => {
        const cardName = card.querySelector('.card-name');
        const place = nearbyPlaces.find(p => p.id === placeId);

        if (place && cardName && cardName.textContent === place.name) {
            const cardImage = card.querySelector('.card-image');
            if (cardImage) {
                // Reemplazar contenido con imagen real
                cardImage.style.backgroundImage = `url('${imageUrl}')`;
                cardImage.style.backgroundSize = 'cover';
                cardImage.style.backgroundPosition = 'center';

                // Agregar overlay si no existe
                if (!cardImage.querySelector('.card-overlay')) {
                    const overlay = document.createElement('div');
                    overlay.className = 'card-overlay';
                    cardImage.insertBefore(overlay, cardImage.firstChild);
                }

                // Remover emoji si existe
                const emoji = cardImage.querySelector('.card-emoji');
                if (emoji) {
                    emoji.remove();
                }
            }
        }
    });
}

// Obtener emoji según el tipo de lugar
function getEmojiForType(type, tags) {
    // Natural
    if (tags?.natural === 'waterfall') return '💧';
    if (tags?.natural === 'lake') return '🏞️';
    if (tags?.natural === 'peak') return '⛰️';
    if (tags?.natural === 'forest') return '🌲';
    if (tags?.natural === 'cave_entrance') return '🕳️';
    if (tags?.natural === 'spring') return '⛲';

    // Tourism
    if (tags?.tourism === 'viewpoint') return '👁️';
    if (tags?.tourism === 'museum') return '🏛️';
    if (tags?.tourism === 'attraction') return '⭐';
    if (tags?.tourism === 'hotel') return '🏨';
    if (tags?.tourism === 'artwork') return '🎨';

    // Leisure
    if (tags?.leisure === 'park') return '🌳';
    if (tags?.leisure === 'garden') return '🌺';

    // Historic
    if (tags?.historic === 'monument') return '🗿';
    if (tags?.historic === 'memorial') return '🕊️';
    if (tags?.historic === 'ruins') return '🏛️';
    if (tags?.historic === 'archaeological_site') return '⚱️';
    if (tags?.historic) return '🏰';

    // Amenity
    if (tags?.amenity === 'restaurant') return '🍽️';
    if (tags?.amenity === 'cafe') return '☕';

    return '📍'; // Default
}

// Lugares turísticos de Nicaragua con coordenadas reales
function loadFallbackPlaces() {
    const basePlaces = [
        {
            id: 1,
            name: "Lago de Apanás",
            emoji: "🏞️",
            description: "Hermoso lago rodeado de montañas",
            coordinates: [13.1558, -85.9567],
            vicinity: "Jinotega Norte",
            rating: 4.5
        },
        {
            id: 2,
            name: "Parque Central Jinotega",
            emoji: "🌳",
            description: "Centro histórico de la ciudad",
            coordinates: [13.0892, -85.9630],
            vicinity: "Centro, Jinotega",
            rating: 4.2
        },
        {
            id: 3,
            name: "La Bastilla",
            emoji: "🏰",
            description: "Mirador con vistas panorámicas",
            coordinates: [13.0920, -85.9511],
            vicinity: "Jinotega",
            rating: 4.7
        },
        {
            id: 4,
            name: "Cascada El Chorrito",
            emoji: "💧",
            description: "Cascada natural en medio del bosque",
            coordinates: [13.1234, -85.9789],
            vicinity: "San Rafael del Norte",
            rating: 4.3
        },
        {
            id: 5,
            name: "Reserva Natural Datanlí-El Diablo",
            emoji: "🌲",
            description: "Reserva natural con biodiversidad",
            coordinates: [13.1890, -85.9234],
            vicinity: "Jinotega",
            rating: 4.6
        },
        {
            id: 6,
            name: "Finca La Hammonia",
            emoji: "☕",
            description: "Tour por plantaciones de café",
            coordinates: [13.1345, -85.9890],
            vicinity: "Jinotega",
            rating: 4.8
        }
    ];

    // Calcular datos dinámicos basados en ubicación del usuario
    nearbyPlaces = basePlaces.map(place => {
        const distance = calculateDistance(
            userLocationCoords.lat,
            userLocationCoords.lng,
            place.coordinates[0],
            place.coordinates[1]
        );

        return {
            ...place,
            price: calculatePrice(distance),
            distance: `${distance.toFixed(1)} km`,
            distanceValue: distance,
            buses: distance > 15 ? 2 : 1,
            time: calculateTravelTime(distance),
            useLeafletMap: true
        };
    });

    console.log('Lugares cargados:', nearbyPlaces.length);
    hideLoadingOverlay();
    loadRecommendedDestinations();
}

// Usar función de LocationService para calcular distancia
function calculateDistance(lat1, lon1, lat2, lon2) {
    return locationService.calculateDistance(lat1, lon1, lat2, lon2);
}

// Calcular precio basado en distancia
function calculatePrice(distanceKm) {
    return Math.round((BASE_FARE + (distanceKm * PRICE_PER_KM)) / 5) * 5; // Redondear a múltiplos de 5
}

// Calcular tiempo de viaje
function calculateTravelTime(distanceKm) {
    const avgSpeed = 35; // km/h promedio en transporte público
    const minutes = Math.round((distanceKm / avgSpeed) * 60);

    if (minutes < 60) {
        return `${minutes} min`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    }
}

// Generar mapa estático con Leaflet (canvas to image)
function generateLeafletStaticMap(coordinates, width = 400, height = 300) {
    return new Promise((resolve) => {
        // Crear un contenedor temporal para el mapa
        const tempContainer = document.createElement('div');
        tempContainer.style.width = `${width}px`;
        tempContainer.style.height = `${height}px`;
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.id = 'temp-map-' + Date.now();
        document.body.appendChild(tempContainer);

        // Crear el mapa
        const tempMap = L.map(tempContainer.id, {
            zoomControl: false,
            attributionControl: false
        }).setView(coordinates, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(tempMap);

        // Agregar marcador
        L.marker(coordinates, {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background: #FF5722; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20]
            })
        }).addTo(tempMap);

        // Esperar a que las tiles carguen
        setTimeout(() => {
            // Usar leaflet-image o capturar como URL del tile
            const canvas = tempContainer.querySelector('canvas');
            let imageUrl;

            if (canvas) {
                imageUrl = canvas.toDataURL();
            } else {
                // Fallback: usar URL de tile de OpenStreetMap
                const [lat, lng] = coordinates;
                const zoom = 13;
                const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
                const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
                imageUrl = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
            }

            // Limpiar
            tempMap.remove();
            document.body.removeChild(tempContainer);

            resolve(imageUrl);
        }, 1000);
    });
}

// Obtener URL de imagen para el lugar
function getPlaceImageUrl(place, width = 400, height = 300) {
    // Usar tile estático de OpenStreetMap como imagen
    const [lat, lng] = place.coordinates;
    const zoom = 14;

    // Generar URL de mapa estático usando MapBox Static API (gratis, sin API key para uso básico)
    // O usar el servicio de OpenStreetMap StaticMap
    return `https://tile.openstreetmap.org/cgi-bin/export?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&scale=2000&format=png`;
}

// Mostrar overlay de carga
function showLoadingOverlay(message = 'Cargando...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = overlay.querySelector('.loading-text');
    if (overlay) {
        loadingText.textContent = message;
        overlay.classList.remove('hidden');
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// Cargar destinos recomendados
function loadRecommendedDestinations() {
    const container = document.getElementById('recommendedCards');
    container.innerHTML = '';

    const topPlaces = nearbyPlaces
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 6);

    topPlaces.forEach(destination => {
        const card = createDestinationCard(destination);
        container.appendChild(card);
    });
}

// Crear tarjeta de destino
function createDestinationCard(destination) {
    const card = document.createElement('div');
    card.className = 'destination-card';

    // Siempre usar mapa satelital (si no tiene imagen real de Wikipedia)
    let imageContent;

    if (destination.imageUrl && destination.hasRealImage) {
        // Tiene imagen real de Wikipedia/Wikimedia - usar la imagen
        imageContent = `
            <div class="card-image" style="background-image: url('${destination.imageUrl}'); background-size: cover; background-position: center;">
                <div class="card-overlay"></div>
                <div class="card-rating">
                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px; color: #FFBB00;">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span>${destination.rating ? destination.rating.toFixed(1) : 'N/A'}</span>
                </div>
            </div>
        `;
    } else {
        // Usar mapa satelital
        const mapId = `card-map-${destination.id}`;
        imageContent = `
            <div class="card-image">
                <div id="${mapId}" class="card-map-container"></div>
                <div class="card-rating">
                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px; color: #FFBB00;">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span>${destination.rating ? destination.rating.toFixed(1) : 'N/A'}</span>
                </div>
            </div>
        `;
    }

    card.innerHTML = `
        ${imageContent}
        <div class="card-info">
            <div class="card-name">${destination.name}</div>
            <div class="card-description">${destination.description}</div>
            <div class="card-meta">
                <span class="card-price">C$ ${destination.price}</span>
                <span class="card-distance">${destination.distance}</span>
            </div>
        </div>
    `;

    // Si no tiene imagen real, crear mini mapa con vista satelital
    if (!destination.imageUrl || !destination.hasRealImage) {
        setTimeout(() => {
            const mapContainer = document.getElementById(`card-map-${destination.id}`);
            if (mapContainer) {
                const miniMap = L.map(mapContainer, {
                    zoomControl: false,
                    attributionControl: false,
                    dragging: false,
                    scrollWheelZoom: false,
                    doubleClickZoom: false,
                    boxZoom: false,
                    keyboard: false,
                    tap: false,
                    touchZoom: false
                }).setView(destination.coordinates, 15);

                // Usar tiles de satélite de Esri (gratuitos)
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'Esri',
                    maxZoom: 18
                }).addTo(miniMap);

                // Agregar marcador
                L.marker(destination.coordinates, {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background: #FFBB00; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.5);"></div>',
                        iconSize: [20, 20]
                    })
                }).addTo(miniMap);
            }
        }, 100);
    }

    card.addEventListener('click', () => showDestinationDetails(destination));
    return card;
}

// Mostrar detalles de destino
function showDestinationDetails(destination) {
    const modal = document.getElementById('destinationModal');
    const title = document.getElementById('destinationTitle');
    const image = document.getElementById('destinationImage');
    const details = document.getElementById('destinationDetails');

    title.textContent = destination.name;

    // Limpiar imagen anterior
    image.style.backgroundImage = '';
    image.innerHTML = '';

    // Usar imagen real si existe, sino mapa satelital
    if (destination.imageUrl && destination.hasRealImage) {
        image.style.backgroundImage = `url('${destination.imageUrl}')`;
        image.style.backgroundSize = 'cover';
        image.style.backgroundPosition = 'center';
    } else {
        // Crear un mapa satelital en el modal
        image.id = 'destinationImageMap';
        const modalMapId = 'modal-map-' + destination.id;
        image.innerHTML = `<div id="${modalMapId}" style="width: 100%; height: 100%;"></div>`;

        setTimeout(() => {
            const mapContainer = document.getElementById(modalMapId);
            if (mapContainer) {
                const modalMap = L.map(modalMapId, {
                    zoomControl: true,
                    attributionControl: false
                }).setView(destination.coordinates, 16);

                // Vista satelital de Esri
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'Esri',
                    maxZoom: 18
                }).addTo(modalMap);

                // Marcador amarillo
                L.marker(destination.coordinates, {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background: #FFBB00; width: 28px; height: 28px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.5);"></div>',
                        iconSize: [28, 28]
                    })
                }).addTo(modalMap);
            }
        }, 100);
    }

    details.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">Descripción</span>
            <span class="detail-value">${destination.description}</span>
        </div>
        ${destination.vicinity ? `
        <div class="detail-item">
            <span class="detail-label">Ubicación</span>
            <span class="detail-value">${destination.vicinity}</span>
        </div>
        ` : ''}
        <div class="detail-item">
            <span class="detail-label">Precio estimado del viaje</span>
            <span class="detail-value">C$ ${destination.price}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Distancia</span>
            <span class="detail-value">${destination.distance}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Tiempo estimado</span>
            <span class="detail-value">${destination.time}</span>
        </div>
        ${destination.rating ? `
        <div class="detail-item">
            <span class="detail-label">Calificación</span>
            <span class="detail-value">⭐ ${destination.rating.toFixed(1)} / 5.0</span>
        </div>
        ` : ''}
    `;

    const planBtn = document.getElementById('planToDestinationBtn');
    planBtn.onclick = () => {
        modal.classList.remove('active');
        openPlanningModal(destination);
    };

    modal.classList.add('active');
}

// Buscar por presupuesto
function searchByBudget() {
    const budgetInput = document.getElementById('budgetInput');
    const resultsContainer = document.getElementById('budgetResults');
    const budget = parseFloat(budgetInput.value);

    if (!budget || budget <= 0) {
        resultsContainer.innerHTML = '<div class="budget-card"><div class="budget-card-title">Por favor ingresa un presupuesto válido</div></div>';
        return;
    }

    const affordableDestinations = nearbyPlaces
        .filter(d => d.price <= budget)
        .sort((a, b) => b.price - a.price);

    if (affordableDestinations.length === 0) {
        resultsContainer.innerHTML = '<div class="budget-card"><div class="budget-card-title">No hay destinos disponibles con ese presupuesto</div><div class="budget-card-info">Intenta aumentar tu presupuesto</div></div>';
        return;
    }

    resultsContainer.innerHTML = '';
    affordableDestinations.forEach(destination => {
        const card = document.createElement('div');
        card.className = 'budget-card';
        card.innerHTML = `
            <div class="budget-card-title">${destination.name}</div>
            <div class="budget-card-info">C$ ${destination.price} • ${destination.distance} • ${destination.time}</div>
            ${destination.rating ? `<div class="budget-card-rating">⭐ ${destination.rating.toFixed(1)}</div>` : ''}
        `;
        card.addEventListener('click', () => showDestinationDetails(destination));
        resultsContainer.appendChild(card);
    });
}

// Abrir modal de planificación
async function openPlanningModal(preselectedDestination = null) {
    const modal = document.getElementById('planningModal');
    const stateSelect = document.getElementById('stateSelectDestination');
    const stateResults = document.getElementById('stateRouteResults');
    const currentLocationEl = document.getElementById('currentLocation');

    stateSelect.classList.add('active');
    stateSelect.classList.remove('hidden');
    stateResults.classList.remove('active');
    stateResults.classList.add('hidden');

    // Obtener nombre real de la ubicación actual
    currentLocationEl.textContent = 'Obteniendo ubicación...';

    locationService.getLocationName(userLocationCoords.lat, userLocationCoords.lng)
        .then(locationName => {
            if (locationName) {
                currentLocationEl.textContent = locationName;
            } else {
                currentLocationEl.textContent = `${userLocationCoords.lat.toFixed(4)}, ${userLocationCoords.lng.toFixed(4)}`;
            }
        })
        .catch(() => {
            currentLocationEl.textContent = `${userLocationCoords.lat.toFixed(4)}, ${userLocationCoords.lng.toFixed(4)}`;
        });

    setTimeout(() => initializePlanningMap(preselectedDestination), 300);
    modal.classList.add('active');
}

// Inicializar mapa de planificación
function initializePlanningMap(preselectedDestination) {
    if (planningMap) {
        planningMap.remove();
    }

    planningMap = L.map('planningMap').setView(userLocation, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(planningMap);

    // Marcador de ubicación actual
    L.marker(userLocation, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background: #3B82F6; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6);"></div>',
            iconSize: [24, 24]
        })
    }).addTo(planningMap).bindPopup('Tu ubicación actual');

    // Agregar marcadores de lugares
    nearbyPlaces.forEach(destination => {
        const marker = L.marker(destination.coordinates, {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: #FFBB00; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(255, 187, 0, 0.6);"></div>`,
                iconSize: [16, 16]
            })
        }).addTo(planningMap);

        marker.on('click', () => selectDestination(destination));
        marker.bindPopup(`<strong>${destination.name}</strong><br>${destination.distance} • C$ ${destination.price}`);
    });

    if (preselectedDestination) {
        selectDestination(preselectedDestination);
    }
}

// Seleccionar destino
function selectDestination(destination) {
    selectedDestination = destination;
    const destinationInfo = document.getElementById('destinationInfo');
    const calculateBtn = document.getElementById('calculateRouteBtn');

    destinationInfo.innerHTML = `
        <span class="info-selected">${destination.name}</span>
    `;

    calculateBtn.disabled = false;

    if (planningMap) {
        planningMap.setView(destination.coordinates, 13);
    }
}

// Calcular ruta
function calculateRoute() {
    if (!selectedDestination) return;

    const stateSelect = document.getElementById('stateSelectDestination');
    const stateResults = document.getElementById('stateRouteResults');

    showLoadingOverlay('Calculando mejor ruta...');

    stateSelect.classList.remove('active');
    stateSelect.classList.add('hidden');

    setTimeout(() => {
        generateRouteResults();
        hideLoadingOverlay();
        stateResults.classList.add('active');
        stateResults.classList.remove('hidden');
    }, 1500);
}

// Generar resultados de ruta
function generateRouteResults() {
    const destination = selectedDestination;

    currentRoute = {
        destination: destination,
        totalTime: destination.time,
        totalCost: destination.price,
        busCount: destination.buses,
        steps: generateRouteSteps(destination)
    };

    document.getElementById('travelTime').textContent = currentRoute.totalTime;
    document.getElementById('totalCost').textContent = `C$ ${currentRoute.totalCost}`;
    document.getElementById('busCount').textContent = `${currentRoute.busCount} ${currentRoute.busCount === 1 ? 'bus' : 'buses'}`;

    const stepsContainer = document.getElementById('routeSteps');
    stepsContainer.innerHTML = '';

    currentRoute.steps.forEach((step, index) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'route-step';
        stepEl.innerHTML = `
            <div class="step-number">${index + 1}</div>
            <div class="step-content">
                <div class="step-title">${step.title}</div>
                <div class="step-description">${step.description}</div>
                <div class="step-meta">
                    <span class="step-time">⏱️ ${step.time}</span>
                    ${step.cost > 0 ? `<span class="step-cost">💰 C$ ${step.cost}</span>` : ''}
                </div>
            </div>
        `;
        stepsContainer.appendChild(stepEl);
    });

    setTimeout(() => initializeResultMap(), 300);
}

// Generar pasos de la ruta
function generateRouteSteps(destination) {
    const steps = [];

    steps.push({
        title: "Preparación",
        description: "Dirígete a la parada de buses más cercana",
        time: "5 min",
        cost: 0
    });

    if (destination.buses === 1) {
        steps.push({
            title: "Transporte directo",
            description: `Toma el bus con destino hacia ${destination.name}`,
            time: destination.time,
            cost: destination.price
        });
    } else {
        const firstLegPrice = Math.round(destination.price * 0.6);
        const secondLegPrice = destination.price - firstLegPrice;

        steps.push({
            title: "Primer transporte",
            description: "Toma el bus hacia la zona intermedia",
            time: calculateTravelTime(destination.distanceValue * 0.6),
            cost: firstLegPrice
        });

        steps.push({
            title: "Transbordo",
            description: "Cambia de bus en la parada intermedia",
            time: "10 min",
            cost: 0
        });

        steps.push({
            title: "Segundo transporte",
            description: `Toma el bus final hacia ${destination.name}`,
            time: calculateTravelTime(destination.distanceValue * 0.4),
            cost: secondLegPrice
        });
    }

    steps.push({
        title: "Llegada",
        description: `¡Has llegado a ${destination.name}! Disfruta tu visita`,
        time: "0 min",
        cost: 0
    });

    return steps;
}

// Inicializar mapa de resultado
function initializeResultMap() {
    if (resultMap) {
        resultMap.remove();
    }

    resultMap = L.map('resultMap').setView(userLocation, 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(resultMap);

    L.marker(userLocation, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background: #3B82F6; width: 28px; height: 28px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6);"></div>',
            iconSize: [28, 28]
        })
    }).addTo(resultMap).bindPopup('<strong>Punto de partida</strong>');

    L.marker(selectedDestination.coordinates, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background: #10B981; width: 28px; height: 28px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.6);"></div>',
            iconSize: [28, 28]
        })
    }).addTo(resultMap).bindPopup(`<strong>${selectedDestination.name}</strong>`);

    const routeLine = L.polyline([userLocation, selectedDestination.coordinates], {
        color: '#FFBB00',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10'
    }).addTo(resultMap);

    resultMap.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
}

// Chatbot
const chatResponses = [
    {
        keywords: ['precio', 'costo', 'cuanto', 'pagar'],
        response: 'El costo total de tu viaje es de C$ {cost}. Este incluye todos los transportes necesarios.'
    },
    {
        keywords: ['tiempo', 'cuanto tarda', 'duración', 'demora'],
        response: 'El tiempo estimado de viaje es de {time}. Esto puede variar según el tráfico.'
    },
    {
        keywords: ['bus', 'buses', 'transporte'],
        response: 'Necesitarás tomar {buses} para llegar a tu destino. Te hemos indicado los pasos exactos en la ruta.'
    },
    {
        keywords: ['parada', 'donde', 'salida'],
        response: 'Debes dirigirte a la parada de buses más cercana a tu ubicación actual.'
    },
    {
        keywords: ['horario', 'hora', 'cuando'],
        response: 'Los buses generalmente operan desde las 6:00 AM hasta las 6:00 PM. Te recomendamos verificar horarios específicos en la terminal.'
    },
    {
        keywords: ['hola', 'buenos días', 'buenas tardes', 'buenas'],
        response: '¡Hola! Soy tu asistente de viajes. Puedo ayudarte con información sobre tu ruta, costos, tiempos y más. ¿Qué necesitas saber?'
    },
    {
        keywords: ['gracias', 'ok', 'vale'],
        response: '¡De nada! Que tengas un excelente viaje. Si necesitas algo más, no dudes en preguntar.'
    },
    {
        keywords: ['distancia'],
        response: 'La distancia total a tu destino es de aproximadamente {distance}.'
    }
];

function openChatModal() {
    const modal = document.getElementById('chatModal');
    modal.classList.add('active');
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    addChatMessage(message, true);
    input.value = '';

    setTimeout(() => {
        const response = generateBotResponse(message);
        addChatMessage(response, false);
    }, 800);
}

function addChatMessage(message, isUser) {
    const container = document.getElementById('chatContainer');
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${isUser ? 'user-message' : 'bot-message'}`;

    messageEl.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="currentColor">
                ${isUser
                    ? '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>'
                    : '<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>'
                }
            </svg>
        </div>
        <div class="message-content">
            <p>${message}</p>
        </div>
    `;

    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

function generateBotResponse(message) {
    const messageLower = message.toLowerCase();

    for (const response of chatResponses) {
        if (response.keywords.some(keyword => messageLower.includes(keyword))) {
            let answer = response.response;

            if (currentRoute) {
                answer = answer
                    .replace('{cost}', currentRoute.totalCost)
                    .replace('{time}', currentRoute.totalTime)
                    .replace('{buses}', currentRoute.busCount === 1 ? '1 bus' : `${currentRoute.busCount} buses`)
                    .replace('{distance}', selectedDestination?.distance || 'N/A');
            }

            return answer;
        }
    }

    return 'Entiendo tu pregunta. Puedo ayudarte con información sobre precios, tiempos de viaje, paradas, horarios y detalles de tu ruta. ¿Qué te gustaría saber?';
}

// Event Listeners
function setupEventListeners() {
    const budgetSearchBtn = document.getElementById('budgetSearchBtn');
    budgetSearchBtn?.addEventListener('click', searchByBudget);

    const budgetInput = document.getElementById('budgetInput');
    budgetInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchByBudget();
    });

    const startPlanningBtn = document.getElementById('startPlanningBtn');
    startPlanningBtn?.addEventListener('click', () => openPlanningModal());

    const modalClose = document.getElementById('modalClose');
    modalClose?.addEventListener('click', () => {
        document.getElementById('planningModal').classList.remove('active');
    });

    const modalOverlay = document.getElementById('modalOverlay');
    modalOverlay?.addEventListener('click', () => {
        document.getElementById('planningModal').classList.remove('active');
    });

    const calculateRouteBtn = document.getElementById('calculateRouteBtn');
    calculateRouteBtn?.addEventListener('click', calculateRoute);

    const newPlanningBtn = document.getElementById('newPlanningBtn');
    newPlanningBtn?.addEventListener('click', () => {
        selectedDestination = null;
        currentRoute = null;
        openPlanningModal();
    });

    const destinationModalClose = document.getElementById('destinationModalClose');
    destinationModalClose?.addEventListener('click', () => {
        document.getElementById('destinationModal').classList.remove('active');
    });

    const destinationModalOverlay = document.getElementById('destinationModalOverlay');
    destinationModalOverlay?.addEventListener('click', () => {
        document.getElementById('destinationModal').classList.remove('active');
    });

    const openChatBtn = document.getElementById('openChatBtn');
    openChatBtn?.addEventListener('click', openChatModal);

    const chatModalClose = document.getElementById('chatModalClose');
    chatModalClose?.addEventListener('click', () => {
        document.getElementById('chatModal').classList.remove('active');
    });

    const chatModalOverlay = document.getElementById('chatModalOverlay');
    chatModalOverlay?.addEventListener('click', () => {
        document.getElementById('chatModal').classList.remove('active');
    });

    const chatSendBtn = document.getElementById('chatSendBtn');
    chatSendBtn?.addEventListener('click', sendChatMessage);

    const chatInput = document.getElementById('chatInput');
    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
}
