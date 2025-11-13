"""
Router de Notificaciones
Endpoints para gestión de notificaciones
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Notificacion, Usuario
from schemas import NotificacionCreate, NotificacionResponse, MarcarLeidaRequest, MessageResponse

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])

# ==================== NOTIFICACIONES ====================

@router.get("/usuario/{usuario_id}", response_model=List[NotificacionResponse])
async def get_notificaciones_usuario(
    usuario_id: int,
    solo_no_leidas: bool = False,
    db: Session = Depends(get_db)
):
    """Obtener notificaciones de un usuario"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    query = db.query(Notificacion).filter(
        (Notificacion.usuario_id == usuario_id) | (Notificacion.usuario_id == None)
    )

    if solo_no_leidas:
        query = query.filter(Notificacion.leida == False)

    notificaciones = query.order_by(Notificacion.created_at.desc()).all()
    return [NotificacionResponse.model_validate(n.to_dict()) for n in notificaciones]

@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_notificacion(notif_data: NotificacionCreate, db: Session = Depends(get_db)):
    """Crear una notificación (puede ser para un usuario específico o global)"""
    # Si es para un usuario específico, verificar que exista
    if notif_data.usuario_id:
        usuario = db.query(Usuario).filter(Usuario.id == notif_data.usuario_id).first()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

    try:
        nueva_notif = Notificacion(**notif_data.model_dump())
        db.add(nueva_notif)
        db.commit()
        db.refresh(nueva_notif)

        return MessageResponse(message="Notificación creada exitosamente", id=nueva_notif.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.put("/{notif_id}/leer", response_model=MessageResponse)
async def marcar_como_leida(
    notif_id: int,
    data: MarcarLeidaRequest,
    db: Session = Depends(get_db)
):
    """Marcar una notificación como leída o no leída"""
    notif = db.query(Notificacion).filter(Notificacion.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    try:
        notif.leida = data.leida
        db.commit()
        return MessageResponse(
            message=f"Notificación marcada como {'leída' if data.leida else 'no leída'}",
            id=notif_id
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.delete("/{notif_id}", response_model=MessageResponse)
async def delete_notificacion(notif_id: int, db: Session = Depends(get_db)):
    """Eliminar una notificación"""
    notif = db.query(Notificacion).filter(Notificacion.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    try:
        db.delete(notif)
        db.commit()
        return MessageResponse(message="Notificación eliminada exitosamente", id=notif_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/broadcast", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def broadcast_notificacion(notif_data: NotificacionCreate, db: Session = Depends(get_db)):
    """Enviar notificación a todos los usuarios activos"""
    try:
        usuarios_activos = db.query(Usuario).filter(Usuario.activo == True).all()

        count = 0
        for usuario in usuarios_activos:
            nueva_notif = Notificacion(
                usuario_id=usuario.id,
                tipo=notif_data.tipo,
                titulo=notif_data.titulo,
                mensaje=notif_data.mensaje
            )
            db.add(nueva_notif)
            count += 1

        db.commit()

        return MessageResponse(
            message=f"Notificación enviada a {count} usuarios",
            id=count
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
