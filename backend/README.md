# ViajeroApp Backend API

Backend API REST para el sistema de gestión de rutas de autobuses ViajeroApp.

## Tecnologías

- **Python 3.8+**
- **FastAPI** - Framework web moderno y rápido
- **SQLAlchemy** - ORM para base de datos
- **MySQL** - Base de datos relacional
- **Pydantic** - Validación de datos
- **Uvicorn** - Servidor ASGI

## Estructura del Proyecto

```
backend/
├── main.py              # Aplicación principal y endpoints
├── models.py            # Modelos de base de datos (SQLAlchemy)
├── schemas.py           # Esquemas de validación (Pydantic)
├── database.py          # Configuración de base de datos
├── config.py            # Configuración y variables de entorno
├── init_db.py           # Script de inicialización de BD
├── requirements.txt     # Dependencias Python
├── .env                 # Variables de entorno (crear desde .env.example)
└── .env.example         # Ejemplo de variables de entorno
```

## Instalación

### 1. Requisitos Previos

- Python 3.8 o superior
- MySQL Server 5.7 o superior
- pip (gestor de paquetes de Python)

### 2. Clonar e instalar dependencias

```bash
cd backend

# Crear entorno virtual (recomendado)
python -m venv venv

# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3. Configurar Base de Datos

#### Opción A: Usando MySQL

1. Instalar MySQL Server si no lo tienes
2. Crear un usuario y contraseña para la aplicación
3. Configurar las credenciales en el archivo `.env`

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=tu_password
# DB_NAME=viajero_app
```

#### Opción B: Usando XAMPP (Windows)

1. Descargar e instalar [XAMPP](https://www.apachefriends.org/)
2. Iniciar los servicios Apache y MySQL desde el panel de control de XAMPP
3. Abrir phpMyAdmin (http://localhost/phpmyadmin)
4. Configurar `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=viajero_app
```

### 4. Inicializar la Base de Datos

```bash
python init_db.py
```

Este script:
- Crea la base de datos si no existe
- Crea todas las tablas necesarias (rutas, paradas)

## Ejecución

### Modo Desarrollo (con auto-reload)

```bash
python main.py
```

O usando uvicorn directamente:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Modo Producción

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

El servidor estará disponible en:
- API: http://localhost:8000
- Documentación interactiva: http://localhost:8000/docs
- Documentación alternativa: http://localhost:8000/redoc

## API Endpoints

### Información General

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Información de la API |
| GET | `/health` | Estado del servidor |
| GET | `/docs` | Documentación interactiva (Swagger) |

### Rutas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/rutas` | Obtener todas las rutas |
| GET | `/rutas/{id}` | Obtener una ruta específica |
| POST | `/rutas` | Crear una nueva ruta |
| PUT | `/rutas/{id}` | Actualizar una ruta |
| DELETE | `/rutas/{id}` | Eliminar una ruta |
| GET | `/rutas/search/{term}` | Buscar rutas por nombre o número |

## Ejemplos de Uso

### 1. Obtener todas las rutas

```bash
curl http://localhost:8000/rutas
```

```javascript
// Desde JavaScript
fetch('http://localhost:8000/rutas')
  .then(response => response.json())
  .then(data => console.log(data));
```

### 2. Crear una nueva ruta

```bash
curl -X POST http://localhost:8000/rutas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ruta Norte",
    "number": "101",
    "startTime": "06:00",
    "endTime": "22:00",
    "frequency": 30,
    "visible": true,
    "distance": 12.5,
    "duration": 45,
    "routeGeometry": [[-86.001, 13.103], [-86.002, 13.104]],
    "paradas": [
      {
        "name": "Terminal Norte",
        "lat": 13.103581,
        "lng": -86.001365
      },
      {
        "name": "Mercado Central",
        "lat": 13.089534,
        "lng": -85.994804
      }
    ]
  }'
```

```javascript
// Desde JavaScript
fetch('http://localhost:8000/rutas', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: "Ruta Norte",
    number: "101",
    startTime: "06:00",
    endTime: "22:00",
    frequency: 30,
    visible: true,
    distance: 12.5,
    duration: 45,
    routeGeometry: [[-86.001, 13.103], [-86.002, 13.104]],
    paradas: [
      {
        name: "Terminal Norte",
        lat: 13.103581,
        lng: -86.001365
      },
      {
        name: "Mercado Central",
        lat: 13.089534,
        lng: -85.994804
      }
    ]
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

### 3. Actualizar una ruta

```bash
curl -X PUT http://localhost:8000/rutas/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ruta Norte Actualizada",
    "frequency": 20
  }'
```

### 4. Eliminar una ruta

```bash
curl -X DELETE http://localhost:8000/rutas/1
```

## Integración con las Aplicaciones

### Desktop App (RouteManager.js)

Modificar el método `addRoute` en `desktop/js/RouteManager.js`:

```javascript
async addRoute(routeData) {
    // ... código existente ...

    // Enviar al backend
    try {
        const response = await fetch('http://localhost:8000/rutas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: route.name,
                number: route.number,
                startTime: route.startTime,
                endTime: route.endTime,
                frequency: parseInt(route.frequency),
                visible: route.visible,
                distance: route.distance ? parseFloat(route.distance) : null,
                duration: route.duration,
                routeGeometry: route.routeGeometry,
                paradas: route.paradas
            })
        });

        if (!response.ok) {
            throw new Error('Error al guardar en el servidor');
        }

        const result = await response.json();
        console.log('Ruta guardada en el servidor:', result);
    } catch (error) {
        console.error('Error guardando en el servidor:', error);
        alert('La ruta se guardó localmente pero no se pudo sincronizar con el servidor');
    }

    return route;
}
```

### Mobile App (mapa.js)

Modificar la función `loadRoutes` en `movil/js/mapa/mapa.js`:

```javascript
async function loadRoutes() {
    try {
        // Cargar desde el backend
        const response = await fetch('http://localhost:8000/rutas');

        if (!response.ok) {
            throw new Error('Error cargando rutas del servidor');
        }

        const routesData = await response.json();
        routes = routesData;

        console.log('Rutas cargadas desde el servidor:', routes);
        return routes;
    } catch (error) {
        console.error('Error cargando rutas:', error);

        // Fallback: cargar desde archivos locales
        const routeFiles = ['Homero.json'];

        for (const file of routeFiles) {
            try {
                const response = await fetch(`./rutas/${file}`);
                if (response.ok) {
                    const routeData = await response.json();
                    if (Array.isArray(routeData) && routeData.length > 0) {
                        routes.push(routeData[0]);
                    }
                }
            } catch (error) {
                console.error(`Error cargando ruta ${file}:`, error);
            }
        }

        return routes;
    }
}
```

## Solución de Problemas

### Error: "Access denied for user"

Verificar credenciales en `.env` y permisos del usuario MySQL:

```sql
GRANT ALL PRIVILEGES ON viajero_app.* TO 'tu_usuario'@'localhost';
FLUSH PRIVILEGES;
```

### Error: "Can't connect to MySQL server"

- Verificar que MySQL esté ejecutándose
- Verificar el puerto (por defecto 3306)
- Verificar firewall

### Error de CORS

Si tienes problemas de CORS desde las aplicaciones web, verifica que los orígenes estén permitidos en `main.py`.

## Seguridad

Para producción, considera:

1. Cambiar `allow_origins=["*"]` por los dominios específicos
2. Usar HTTPS
3. Implementar autenticación (JWT)
4. Validar y sanitizar todas las entradas
5. Usar variables de entorno seguras
6. Implementar rate limiting

## Licencia

Este proyecto es parte de ViajeroApp.
