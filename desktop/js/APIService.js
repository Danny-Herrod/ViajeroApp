// APIService.js - Servicio para comunicación con el backend
class APIService {
    constructor() {
        // URL del backend - cambiar según tu configuración
        this.baseURL = 'http://localhost:8000';
    }

    // Método auxiliar para hacer peticiones fetch
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `Error HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error en la petición API:', error);
            throw error;
        }
    }

    // ========== ENDPOINTS DE RUTAS ==========

    // Obtener todas las rutas
    async getAllRutas() {
        try {
            return await this.request('/rutas');
        } catch (error) {
            console.error('Error obteniendo rutas:', error);
            throw error;
        }
    }

    // Obtener una ruta por ID
    async getRutaById(id) {
        try {
            return await this.request(`/rutas/${id}`);
        } catch (error) {
            console.error(`Error obteniendo ruta ${id}:`, error);
            throw error;
        }
    }

    // Crear una nueva ruta
    async createRuta(rutaData) {
        try {
            return await this.request('/rutas', {
                method: 'POST',
                body: JSON.stringify(rutaData)
            });
        } catch (error) {
            console.error('Error creando ruta:', error);
            throw error;
        }
    }

    // Actualizar una ruta existente
    async updateRuta(id, rutaData) {
        try {
            return await this.request(`/rutas/${id}`, {
                method: 'PUT',
                body: JSON.stringify(rutaData)
            });
        } catch (error) {
            console.error(`Error actualizando ruta ${id}:`, error);
            throw error;
        }
    }

    // Eliminar una ruta
    async deleteRuta(id) {
        try {
            return await this.request(`/rutas/${id}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error(`Error eliminando ruta ${id}:`, error);
            throw error;
        }
    }

    // Buscar rutas por término
    async searchRutas(searchTerm) {
        try {
            return await this.request(`/rutas/search/${encodeURIComponent(searchTerm)}`);
        } catch (error) {
            console.error('Error buscando rutas:', error);
            throw error;
        }
    }

    // Verificar estado del servidor
    async healthCheck() {
        try {
            return await this.request('/health');
        } catch (error) {
            console.error('Error verificando estado del servidor:', error);
            return { status: 'offline' };
        }
    }

    // Verificar conexión con el backend
    async checkConnection() {
        try {
            const health = await this.healthCheck();
            return health.status === 'ok';
        } catch (error) {
            return false;
        }
    }
}
