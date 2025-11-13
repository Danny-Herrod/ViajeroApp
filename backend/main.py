"""
ViajeroApp - API Backend
FastAPI application para gestión de rutas, buses, usuarios y viajes

Autor: Claude Code
Versión: 2.0.0
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from config import settings

# Importar routers
from routers import auth, buses, favoritos, estadisticas, notificaciones
from routers.buses import router_paradas
from routers.favoritos import router_viajes

# Importar modelos para asegurar que se registren las tablas
import models

# Crear las tablas en la base de datos
Base.metadata.create_all(bind=engine)

# Crear la aplicación FastAPI
app = FastAPI(
    title="ViajeroApp API",
    description="""
    ## API REST para gestión integral de transporte y rutas

    ### Funcionalidades:

    **Autenticación y Usuarios**
    - Registro y login de usuarios
    - Gestión de perfiles
    - Cambio de contraseña

    **Rutas**
    - CRUD completo de rutas de buses
    - Paradas con coordenadas GPS
    - Geometría de rutas (trazado en calles reales)

    **Buses y Horarios**
    - Gestión de líneas de transporte
    - Horarios de salidas y entradas
    - Estados en tiempo real (operativo, con retraso, fuera de servicio)
    - Paradas físicas de buses

    **Favoritos y Viajes**
    - Guardar lugares favoritos
    - Planificar viajes
    - Historial de viajes

    **Estadísticas**
    - Métricas por usuario (viajes, distancia, ahorro)
    - Dashboard administrativo
    - Analytics en tiempo real

    **Notificaciones**
    - Notificaciones personalizadas
    - Broadcast a todos los usuarios
    - Sistema de lectura/no leída

    ### Tecnologías:
    - **Framework**: FastAPI
    - **Base de Datos**: MySQL
    - **ORM**: SQLAlchemy
    - **Validación**: Pydantic
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS para permitir acceso desde desktop y mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar los orígenes exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== INCLUIR ROUTERS ====================

# Autenticación y usuarios
app.include_router(auth.router)

# Rutas (importar del main_old.py - ya existente)
from routers import rutas
app.include_router(rutas.router)

# Buses, horarios y paradas
app.include_router(buses.router)
app.include_router(router_paradas)

# Favoritos y viajes
app.include_router(favoritos.router)
app.include_router(router_viajes)

# Estadísticas
app.include_router(estadisticas.router)

# Notificaciones
app.include_router(notificaciones.router)

# ==================== ENDPOINTS RAÍZ ====================

@app.get("/", tags=["Root"])
async def root():
    """
    Endpoint raíz - Información de la API
    """
    return {
        "message": "ViajeroApp API v2.0",
        "version": "2.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "endpoints": {
            "Autenticación": {
                "POST /auth/register": "Registrar nuevo usuario",
                "POST /auth/login": "Iniciar sesión",
                "GET /auth/users/{id}": "Obtener usuario",
                "PUT /auth/users/{id}": "Actualizar usuario",
                "PUT /auth/users/{id}/password": "Cambiar contraseña",
                "GET /auth/users": "Listar usuarios (admin)",
                "DELETE /auth/users/{id}": "Desactivar usuario"
            },
            "Rutas": {
                "GET /rutas": "Obtener todas las rutas",
                "GET /rutas/{id}": "Obtener ruta por ID",
                "POST /rutas": "Crear ruta",
                "PUT /rutas/{id}": "Actualizar ruta",
                "DELETE /rutas/{id}": "Eliminar ruta",
                "GET /rutas/search/{term}": "Buscar rutas"
            },
            "Buses y Horarios": {
                "GET /buses": "Obtener todos los buses",
                "POST /buses": "Crear bus",
                "PUT /buses/{id}": "Actualizar bus",
                "DELETE /buses/{id}": "Eliminar bus",
                "POST /buses/{id}/horarios": "Agregar horario a bus",
                "GET /buses/{zona}/salidas": "Salidas de zona (sur/norte)",
                "GET /buses/{zona}/entradas": "Entradas de zona",
                "PUT /buses/horarios/{id}": "Actualizar horario",
                "DELETE /buses/horarios/{id}": "Eliminar horario"
            },
            "Paradas de Buses": {
                "GET /paradas-buses": "Obtener paradas",
                "POST /paradas-buses": "Crear parada",
                "GET /paradas-buses/cercanas": "Paradas cercanas a ubicación",
                "PUT /paradas-buses/{id}": "Actualizar parada",
                "DELETE /paradas-buses/{id}": "Eliminar parada"
            },
            "Favoritos": {
                "GET /favoritos/usuario/{id}": "Favoritos de usuario",
                "POST /favoritos/usuario/{id}": "Agregar favorito",
                "DELETE /favoritos/{id}": "Eliminar favorito"
            },
            "Viajes": {
                "GET /viajes/usuario/{id}": "Viajes de usuario",
                "POST /viajes/usuario/{id}": "Crear viaje planeado",
                "PUT /viajes/{id}": "Actualizar viaje (completar)",
                "DELETE /viajes/{id}": "Eliminar viaje"
            },
            "Estadísticas": {
                "GET /stats/usuario/{id}": "Estadísticas de usuario",
                "POST /stats/usuario/{id}/viaje": "Registrar viaje completado",
                "GET /stats/dashboard": "Estadísticas globales (dashboard admin)"
            },
            "Notificaciones": {
                "GET /notificaciones/usuario/{id}": "Notificaciones de usuario",
                "POST /notificaciones": "Crear notificación",
                "PUT /notificaciones/{id}/leer": "Marcar como leída",
                "DELETE /notificaciones/{id}": "Eliminar notificación",
                "POST /notificaciones/broadcast": "Enviar a todos los usuarios"
            }
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Verificar estado del servidor
    """
    return {
        "status": "ok",
        "message": "El servidor está funcionando correctamente",
        "version": "2.0.0"
    }

# Ejecutar el servidor
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )
