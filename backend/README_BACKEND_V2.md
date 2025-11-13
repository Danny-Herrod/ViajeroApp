# 🚀 ViajeroApp Backend v2.0

## ✨ Novedades de la Versión 2.0

### 🎯 Nuevas Funcionalidades

1. **Sistema de Autenticación Completo**
   - Registro de usuarios
   - Login con email y contraseña
   - Gestión de perfiles
   - Cambio de contraseña seguro

2. **Gestión de Buses y Horarios**
   - CRUD completo de buses por zona (sur/norte)
   - Horarios de salidas y entradas
   - Estados en tiempo real (operativo, retraso, fuera de servicio)
   - Paradas físicas de buses

3. **Favoritos y Viajes**
   - Guardar lugares favoritos
   - Planificar y guardar viajes
   - Historial de viajes
   - Marcar viajes como completados

4. **Estadísticas y Analytics**
   - Métricas por usuario (viajes, distancia, ahorro)
   - Dashboard administrativo global
   - Seguimiento de actividad

5. **Sistema de Notificaciones**
   - Notificaciones personalizadas
   - Broadcast a todos los usuarios
   - Sistema de lectura/no leída

---

## 📁 Estructura del Proyecto

```
backend/
├── routers/
│   ├── __init__.py
│   ├── auth.py              # Autenticación y usuarios
│   ├── rutas.py             # Rutas de buses (existente)
│   ├── buses.py             # Buses, horarios y paradas
│   ├── favoritos.py         # Favoritos y viajes
│   ├── estadisticas.py      # Estadísticas y dashboard
│   └── notificaciones.py    # Notificaciones
├── models.py                # Modelos SQLAlchemy (10 tablas)
├── schemas.py               # Schemas Pydantic (validación)
├── database.py              # Configuración de base de datos
├── config.py                # Configuración general
├── auth_utils.py            # Utilidades de autenticación
├── main.py                  # Aplicación FastAPI principal
├── init_db.py               # Script de inicialización
├── requirements.txt         # Dependencias
├── API_DOCUMENTATION.md     # Documentación completa
└── README_BACKEND_V2.md     # Este archivo
```

---

## 🗄️ Tablas de Base de Datos

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Usuarios de la aplicación móvil |
| `rutas` | Rutas de buses |
| `paradas` | Paradas de cada ruta |
| `buses` | Líneas de transporte |
| `horarios` | Horarios de salidas/entradas |
| `paradas_buses` | Paradas físicas de buses |
| `favoritos` | Lugares favoritos de usuarios |
| `viajes_planeados` | Viajes guardados |
| `estadisticas_usuarios` | Métricas por usuario |
| `notificaciones` | Notificaciones del sistema |

---

## 🚀 Guía de Inicio Rápido

### 1. Activar el Entorno Virtual

```bash
cd backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

### 2. Instalar Dependencias (si no están instaladas)

```bash
pip install -r requirements.txt
```

### 3. Inicializar la Base de Datos

```bash
python init_db.py
```

**Salida esperada:**
```
============================================================
   ViajeroApp - Inicialización de Base de Datos v2.0
============================================================
Host: localhost
Usuario: root
Base de datos: viajero_app

Paso 1: Creando base de datos...
[OK] Base de datos 'viajero_app' creada exitosamente

Paso 2: Creando tablas...
[OK] Tablas creadas exitosamente

📋 Tablas creadas:
  ✓ usuarios
  ✓ rutas
  ✓ paradas
  ✓ buses
  ✓ horarios
  ✓ paradas_buses
  ✓ favoritos
  ✓ viajes_planeados
  ✓ estadisticas_usuarios
  ✓ notificaciones

============================================================
✅ Inicialización completada exitosamente
============================================================
```

### 4. Ejecutar el Servidor

```bash
python main.py
```

**El servidor estará disponible en:**
- API: http://localhost:8000
- Documentación interactiva (Swagger): http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 🧪 Pruebas Rápidas

### Verificar Estado del Servidor

```bash
curl http://localhost:8000/health
```

### Registrar un Usuario

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Ver Estadísticas del Dashboard

```bash
curl http://localhost:8000/stats/dashboard
```

---

## 📊 Endpoints Principales

### Autenticación
- `POST /auth/register` - Registrar usuario
- `POST /auth/login` - Iniciar sesión
- `GET /auth/users/{id}` - Obtener usuario
- `PUT /auth/users/{id}` - Actualizar usuario
- `PUT /auth/users/{id}/password` - Cambiar contraseña

### Rutas (Existentes)
- `GET /rutas` - Listar rutas
- `POST /rutas` - Crear ruta
- `PUT /rutas/{id}` - Actualizar ruta
- `DELETE /rutas/{id}` - Eliminar ruta

### Buses y Horarios (Nuevos)
- `GET /buses` - Listar buses
- `POST /buses` - Crear bus
- `GET /buses/{zona}/salidas` - Salidas por zona
- `GET /buses/{zona}/entradas` - Entradas por zona
- `POST /buses/{id}/horarios` - Agregar horario

### Paradas de Buses (Nuevo)
- `GET /paradas-buses` - Listar paradas
- `POST /paradas-buses` - Crear parada
- `GET /paradas-buses/cercanas` - Paradas cercanas

### Favoritos (Nuevo)
- `GET /favoritos/usuario/{id}` - Favoritos del usuario
- `POST /favoritos/usuario/{id}` - Agregar favorito

### Viajes (Nuevo)
- `GET /viajes/usuario/{id}` - Viajes del usuario
- `POST /viajes/usuario/{id}` - Crear viaje

### Estadísticas (Nuevo)
- `GET /stats/usuario/{id}` - Estadísticas del usuario
- `GET /stats/dashboard` - Dashboard admin

### Notificaciones (Nuevo)
- `GET /notificaciones/usuario/{id}` - Notificaciones
- `POST /notificaciones` - Crear notificación
- `POST /notificaciones/broadcast` - Enviar a todos

---

## 🔒 Seguridad

- Las contraseñas se almacenan hasheadas con SHA-256 + sal aleatoria
- Cada usuario tiene una sal única
- Las contraseñas nunca se devuelven en las respuestas de la API

---

## 🐛 Solución de Problemas

### Error: "No module named 'fastapi'"

```bash
pip install -r requirements.txt
```

### Error: "Access denied for user"

Verifica las credenciales en `config.py`:
```python
DB_USER = "root"
DB_PASSWORD = ""  # Tu contraseña de MySQL
```

### Error: "Can't connect to MySQL server"

1. Verifica que XAMPP esté ejecutándose
2. Asegúrate de que MySQL esté activo
3. Verifica el puerto en `config.py` (default: 3306)

### Error: "Table doesn't exist"

Ejecuta nuevamente el script de inicialización:
```bash
python init_db.py
```

---

## 📚 Documentación Adicional

- **Documentación completa de la API**: Ver `API_DOCUMENTATION.md`
- **Documentación interactiva**: http://localhost:8000/docs (después de iniciar el servidor)

---

## 🔄 Migración desde v1.0

Si ya tienes datos en la versión 1.0:

1. **Haz backup de tu base de datos**
2. **Opción 1 - Crear nueva BD**:
   ```bash
   python init_db.py
   ```
   Esto creará las nuevas tablas sin afectar las existentes.

3. **Opción 2 - Reset completo** (PERDERÁS DATOS):
   - Elimina la BD `viajero_app` desde phpMyAdmin
   - Ejecuta `python init_db.py`

---

## ✅ Checklist de Verificación

- [ ] XAMPP está ejecutándose
- [ ] MySQL está activo
- [ ] Entorno virtual activado
- [ ] Dependencias instaladas
- [ ] Base de datos inicializada
- [ ] Servidor ejecutándose en http://localhost:8000
- [ ] Documentación accesible en http://localhost:8000/docs

---

## 🎯 Próximos Pasos

Ahora que el backend está completo, puedes:

1. ✅ Probar todos los endpoints en http://localhost:8000/docs
2. ✅ Integrar el frontend móvil con los nuevos endpoints
3. ✅ Crear el panel de administración desktop (FASE 2)

---

*ViajeroApp Backend v2.0 - Construido con FastAPI, SQLAlchemy y ❤️*
