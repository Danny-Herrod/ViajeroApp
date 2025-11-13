# 📚 ViajeroApp API - Documentación Completa

## 🚀 Información General

**Versión:** 2.0.0
**Base URL:** `http://localhost:8000`
**Documentación Interactiva:** `http://localhost:8000/docs`
**ReDoc:** `http://localhost:8000/redoc`

---

## 📋 Índice

1. [Autenticación y Usuarios](#autenticación-y-usuarios)
2. [Rutas](#rutas)
3. [Buses y Horarios](#buses-y-horarios)
4. [Paradas de Buses](#paradas-de-buses)
5. [Favoritos](#favoritos)
6. [Viajes Planeados](#viajes-planeados)
7. [Estadísticas](#estadísticas)
8. [Notificaciones](#notificaciones)
9. [Modelos de Datos](#modelos-de-datos)
10. [Códigos de Estado](#códigos-de-estado)

---

## 🔐 Autenticación y Usuarios

### Registrar Usuario
```http
POST /auth/register
```

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "message": "Usuario registrado exitosamente",
  "usuario": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "foto_perfil": null,
    "activo": true
  }
}
```

---

### Iniciar Sesión
```http
POST /auth/login
```

**Body:**
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

---

### Obtener Usuario
```http
GET /auth/users/{usuario_id}
```

---

### Actualizar Usuario
```http
PUT /auth/users/{usuario_id}
```

**Body (todos los campos opcionales):**
```json
{
  "nombre": "Juan Carlos Pérez",
  "email": "juancarlos@example.com",
  "foto_perfil": "data:image/png;base64,..."
}
```

---

### Cambiar Contraseña
```http
PUT /auth/users/{usuario_id}/password
```

**Body:**
```json
{
  "password_actual": "password123",
  "password_nueva": "newpassword456"
}
```

---

### Listar Usuarios (Admin)
```http
GET /auth/users?skip=0&limit=100&activos_solo=true
```

---

### Desactivar Usuario
```http
DELETE /auth/users/{usuario_id}
```

---

## 🗺️ Rutas

### Obtener Todas las Rutas
```http
GET /rutas?skip=0&limit=100
```

---

### Obtener Ruta por ID
```http
GET /rutas/{ruta_id}
```

---

### Crear Ruta
```http
POST /rutas
```

**Body:**
```json
{
  "name": "Centro - Universidad",
  "number": "R-101",
  "startTime": "06:00",
  "endTime": "22:00",
  "frequency": 15,
  "visible": true,
  "paradas": [
    {
      "name": "Terminal Norte",
      "lat": 13.0892,
      "lng": -85.9630
    },
    {
      "name": "Parque Central",
      "lat": 13.0900,
      "lng": -85.9640
    }
  ],
  "distance": 5.2,
  "duration": 25,
  "routeGeometry": [[13.0892, -85.9630], [13.0900, -85.9640]]
}
```

---

### Actualizar Ruta
```http
PUT /rutas/{ruta_id}
```

---

### Eliminar Ruta
```http
DELETE /rutas/{ruta_id}
```

---

### Buscar Rutas
```http
GET /rutas/search/{search_term}
```

---

## 🚌 Buses y Horarios

### Obtener Todos los Buses
```http
GET /buses?zona=sur&activos_solo=true
```

**Parámetros:**
- `zona`: "sur" o "norte" (opcional)
- `activos_solo`: boolean (default: true)

---

### Crear Bus
```http
POST /buses
```

**Body:**
```json
{
  "nombre_transporte": "Express Norte",
  "zona": "norte"
}
```

---

### Agregar Horario a Bus
```http
POST /buses/{bus_id}/horarios
```

**Body:**
```json
{
  "tipo": "salida",
  "destino_procedencia": "Managua",
  "hora": "8:00 am",
  "estado": "green"
}
```

**Estados posibles:**
- `green`: Operativo normal
- `yellow`: Con retraso
- `red`: Fuera de servicio

---

### Obtener Salidas de Zona
```http
GET /buses/sur/salidas
GET /buses/norte/salidas
```

---

### Obtener Entradas de Zona
```http
GET /buses/sur/entradas
GET /buses/norte/entradas
```

---

### Actualizar Horario
```http
PUT /buses/horarios/{horario_id}
```

**Body:**
```json
{
  "estado": "yellow"
}
```

---

## 🚏 Paradas de Buses

### Obtener Paradas
```http
GET /paradas-buses?zona=sur&activas_solo=true
```

---

### Crear Parada
```http
POST /paradas-buses
```

**Body:**
```json
{
  "nombre": "Terminal Sur",
  "lat": 13.0892,
  "lng": -85.9630,
  "zona": "sur",
  "descripcion": "Terminal principal zona sur"
}
```

---

### Paradas Cercanas
```http
GET /paradas-buses/cercanas?lat=13.0892&lng=-85.9630&radio_km=1.0
```

---

## ⭐ Favoritos

### Obtener Favoritos de Usuario
```http
GET /favoritos/usuario/{usuario_id}
```

---

### Agregar Favorito
```http
POST /favoritos/usuario/{usuario_id}
```

**Body:**
```json
{
  "lugar_nombre": "Lago de Apanás",
  "lat": 13.1558,
  "lng": -85.9567,
  "descripcion": "Hermoso lago rodeado de montañas",
  "tags": {
    "tourism": "attraction",
    "natural": "lake"
  }
}
```

---

### Eliminar Favorito
```http
DELETE /favoritos/{favorito_id}
```

---

## 🧳 Viajes Planeados

### Obtener Viajes de Usuario
```http
GET /viajes/usuario/{usuario_id}?solo_completados=false
```

---

### Crear Viaje
```http
POST /viajes/usuario/{usuario_id}
```

**Body:**
```json
{
  "origen_nombre": "Jinotega Centro",
  "origen_lat": 13.0892,
  "origen_lng": -85.9630,
  "destino_nombre": "Lago de Apanás",
  "destino_lat": 13.1558,
  "destino_lng": -85.9567,
  "distancia_km": 12.5,
  "tiempo_estimado": "45 min",
  "costo_estimado": 35.0,
  "numero_buses": 1
}
```

---

### Marcar Viaje como Completado
```http
PUT /viajes/{viaje_id}
```

**Body:**
```json
{
  "completado": true
}
```

---

## 📊 Estadísticas

### Obtener Estadísticas de Usuario
```http
GET /stats/usuario/{usuario_id}
```

**Respuesta:**
```json
{
  "usuario_id": 1,
  "viajes_realizados": 15,
  "distancia_total_km": 250.5,
  "ahorro_total": 750.0,
  "lugares_visitados": 8
}
```

---

### Registrar Viaje Completado
```http
POST /stats/usuario/{usuario_id}/viaje
```

**Body:**
```json
{
  "distancia_km": 12.5,
  "costo": 35.0,
  "nuevo_lugar": true
}
```

---

### Dashboard de Administración
```http
GET /stats/dashboard
```

**Respuesta:**
```json
{
  "total_usuarios": 150,
  "total_rutas": 25,
  "total_buses": 30,
  "total_viajes_hoy": 45,
  "usuarios_activos_mes": 89,
  "distancia_total_mes": 5250.75
}
```

---

## 🔔 Notificaciones

### Obtener Notificaciones de Usuario
```http
GET /notificaciones/usuario/{usuario_id}?solo_no_leidas=false
```

---

### Crear Notificación
```http
POST /notificaciones
```

**Body:**
```json
{
  "usuario_id": 1,
  "tipo": "info",
  "titulo": "Nueva ruta disponible",
  "mensaje": "La ruta Centro-Universidad ya está operativa"
}
```

**Tipos de notificación:**
- `info`: Información general
- `warning`: Advertencia
- `alert`: Alerta importante
- `success`: Éxito

---

### Marcar como Leída
```http
PUT /notificaciones/{notif_id}/leer
```

**Body:**
```json
{
  "leida": true
}
```

---

### Broadcast (Enviar a Todos)
```http
POST /notificaciones/broadcast
```

**Body:**
```json
{
  "tipo": "alert",
  "titulo": "Mantenimiento Programado",
  "mensaje": "El sistema estará en mantenimiento el domingo de 2am a 6am"
}
```

---

## 📦 Modelos de Datos

### Usuario
```typescript
{
  id: number
  nombre: string
  email: string
  foto_perfil: string | null
  created_at: string
  ultimo_acceso: string
  activo: boolean
}
```

### Ruta
```typescript
{
  id: number
  name: string
  number: string
  startTime: string
  endTime: string
  frequency: string
  visible: boolean
  distance: string | null
  duration: number | null
  routeGeometry: Array<[number, number]>
  paradas: Parada[]
}
```

### Bus
```typescript
{
  id: number
  nombre_transporte: string
  zona: "sur" | "norte"
  activo: boolean
  horarios: Horario[]
}
```

### Horario
```typescript
{
  id: number
  tipo: "salida" | "entrada"
  destino_procedencia: string
  hora: string
  estado: "green" | "yellow" | "red"
}
```

---

## ⚠️ Códigos de Estado

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Credenciales incorrectas |
| 403 | Forbidden - Usuario desactivado |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

---

## 🛠️ Ejemplos de Uso

### Flujo Completo: Registro → Login → Crear Viaje

```javascript
// 1. Registrar usuario
const registro = await fetch('http://localhost:8000/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    password: 'password123'
  })
});

const { usuario } = await registro.json();

// 2. Login
const login = await fetch('http://localhost:8000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'juan@example.com',
    password: 'password123'
  })
});

// 3. Crear viaje
const viaje = await fetch(`http://localhost:8000/viajes/usuario/${usuario.id}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    origen_nombre: 'Jinotega',
    origen_lat: 13.0892,
    origen_lng: -85.9630,
    destino_nombre: 'Lago Apanás',
    destino_lat: 13.1558,
    destino_lng: -85.9567,
    distancia_km: 12.5,
    costo_estimado: 35
  })
});
```

---

## 📞 Soporte

Para más información, consulta la documentación interactiva en:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

*Documentación generada para ViajeroApp API v2.0*
