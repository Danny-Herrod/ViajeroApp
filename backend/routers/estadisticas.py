"""
Router de Estadísticas
Endpoints para gestión y consulta de estadísticas de usuarios
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from database import get_db
from models import EstadisticaUsuario, Usuario, ViajePlaneado, Ruta, Bus
from schemas import EstadisticaUsuarioResponse, ActualizarEstadisticaRequest, DashboardStats, MessageResponse

router = APIRouter(prefix="/stats", tags=["Estadísticas"])

# ==================== ESTADÍSTICAS DE USUARIO ====================

@router.get("/usuario/{usuario_id}", response_model=EstadisticaUsuarioResponse)
async def get_estadisticas_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Obtener estadísticas de un usuario"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Buscar o crear estadísticas
    stats = db.query(EstadisticaUsuario).filter(EstadisticaUsuario.usuario_id == usuario_id).first()

    if not stats:
        # Crear estadísticas si no existen
        stats = EstadisticaUsuario(usuario_id=usuario_id)
        db.add(stats)
        db.commit()
        db.refresh(stats)

    return EstadisticaUsuarioResponse.model_validate(stats.to_dict())

@router.post("/usuario/{usuario_id}/viaje", response_model=MessageResponse)
async def registrar_viaje_completado(
    usuario_id: int,
    viaje_data: ActualizarEstadisticaRequest,
    db: Session = Depends(get_db)
):
    """Registrar un viaje completado y actualizar estadísticas"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    stats = db.query(EstadisticaUsuario).filter(EstadisticaUsuario.usuario_id == usuario_id).first()

    if not stats:
        stats = EstadisticaUsuario(usuario_id=usuario_id)
        db.add(stats)

    try:
        # Actualizar estadísticas
        stats.viajes_realizados += 1
        stats.distancia_total_km += viaje_data.distancia_km

        # Calcular ahorro estimado (asumiendo taxi cuesta 4x más que bus)
        ahorro_estimado = viaje_data.costo * 3
        stats.ahorro_total += ahorro_estimado

        if viaje_data.nuevo_lugar:
            stats.lugares_visitados += 1

        db.commit()

        return MessageResponse(
            message="Estadísticas actualizadas exitosamente",
            id=usuario_id
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ==================== ESTADÍSTICAS GLOBALES (DASHBOARD) ====================

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Obtener estadísticas generales para el dashboard de administración"""
    try:
        # Total de usuarios
        total_usuarios = db.query(func.count(Usuario.id)).scalar()

        # Total de rutas
        total_rutas = db.query(func.count(Ruta.id)).scalar()

        # Total de buses
        total_buses = db.query(func.count(Bus.id)).scalar()

        # Viajes creados hoy
        hoy = datetime.now().date()
        total_viajes_hoy = db.query(func.count(ViajePlaneado.id)).filter(
            func.date(ViajePlaneado.created_at) == hoy
        ).scalar()

        # Usuarios activos este mes (que han iniciado sesión)
        inicio_mes = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        usuarios_activos_mes = db.query(func.count(Usuario.id)).filter(
            Usuario.ultimo_acceso >= inicio_mes
        ).scalar()

        # Distancia total recorrida este mes
        distancia_total_mes = db.query(func.sum(ViajePlaneado.distancia_km)).filter(
            ViajePlaneado.created_at >= inicio_mes,
            ViajePlaneado.completado == True
        ).scalar() or 0.0

        return DashboardStats(
            total_usuarios=total_usuarios or 0,
            total_rutas=total_rutas or 0,
            total_buses=total_buses or 0,
            total_viajes_hoy=total_viajes_hoy or 0,
            usuarios_activos_mes=usuarios_activos_mes or 0,
            distancia_total_mes=float(distancia_total_mes)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")
