"""
Router de Favoritos y Viajes
Endpoints para gestión de lugares favoritos y viajes planeados
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from database import get_db
from models import Favorito, ViajePlaneado, Usuario
from schemas import (
    FavoritoCreate, FavoritoResponse,
    ViajeCreate, ViajeUpdate, ViajeResponse,
    MessageResponse
)

router = APIRouter(prefix="/favoritos", tags=["Favoritos y Viajes"])

# ==================== FAVORITOS ====================

@router.get("/usuario/{usuario_id}", response_model=List[FavoritoResponse])
async def get_favoritos_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Obtener todos los favoritos de un usuario"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    favoritos = db.query(Favorito).filter(Favorito.usuario_id == usuario_id).all()
    return [FavoritoResponse.model_validate(f.to_dict()) for f in favoritos]

@router.post("/usuario/{usuario_id}", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def add_favorito(usuario_id: int, favorito_data: FavoritoCreate, db: Session = Depends(get_db)):
    """Agregar un lugar a favoritos"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    try:
        data = favorito_data.model_dump()
        # Convertir tags dict a JSON string
        if data.get('tags'):
            data['tags'] = json.dumps(data['tags'])

        nuevo_favorito = Favorito(usuario_id=usuario_id, **data)
        db.add(nuevo_favorito)
        db.commit()
        db.refresh(nuevo_favorito)

        return MessageResponse(message="Favorito agregado exitosamente", id=nuevo_favorito.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.delete("/{favorito_id}", response_model=MessageResponse)
async def delete_favorito(favorito_id: int, db: Session = Depends(get_db)):
    """Eliminar un favorito"""
    favorito = db.query(Favorito).filter(Favorito.id == favorito_id).first()
    if not favorito:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")

    try:
        db.delete(favorito)
        db.commit()
        return MessageResponse(message="Favorito eliminado exitosamente", id=favorito_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ==================== VIAJES PLANEADOS ====================

router_viajes = APIRouter(prefix="/viajes", tags=["Viajes Planeados"])

@router_viajes.get("/usuario/{usuario_id}", response_model=List[ViajeResponse])
async def get_viajes_usuario(
    usuario_id: int,
    solo_completados: bool = False,
    db: Session = Depends(get_db)
):
    """Obtener todos los viajes planeados de un usuario"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    query = db.query(ViajePlaneado).filter(ViajePlaneado.usuario_id == usuario_id)

    if solo_completados:
        query = query.filter(ViajePlaneado.completado == True)

    viajes = query.order_by(ViajePlaneado.created_at.desc()).all()
    return [ViajeResponse.model_validate(v.to_dict()) for v in viajes]

@router_viajes.post("/usuario/{usuario_id}", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_viaje(usuario_id: int, viaje_data: ViajeCreate, db: Session = Depends(get_db)):
    """Crear un nuevo viaje planeado"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    try:
        nuevo_viaje = ViajePlaneado(usuario_id=usuario_id, **viaje_data.model_dump())
        db.add(nuevo_viaje)
        db.commit()
        db.refresh(nuevo_viaje)

        return MessageResponse(message="Viaje planeado creado exitosamente", id=nuevo_viaje.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router_viajes.put("/{viaje_id}", response_model=MessageResponse)
async def update_viaje(viaje_id: int, viaje_data: ViajeUpdate, db: Session = Depends(get_db)):
    """Actualizar un viaje (marcar como completado)"""
    viaje = db.query(ViajePlaneado).filter(ViajePlaneado.id == viaje_id).first()
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    try:
        for key, value in viaje_data.model_dump(exclude_unset=True).items():
            setattr(viaje, key, value)
        db.commit()
        return MessageResponse(message="Viaje actualizado exitosamente", id=viaje_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router_viajes.delete("/{viaje_id}", response_model=MessageResponse)
async def delete_viaje(viaje_id: int, db: Session = Depends(get_db)):
    """Eliminar un viaje planeado"""
    viaje = db.query(ViajePlaneado).filter(ViajePlaneado.id == viaje_id).first()
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    try:
        db.delete(viaje)
        db.commit()
        return MessageResponse(message="Viaje eliminado exitosamente", id=viaje_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
