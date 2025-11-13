"""
Router de Buses y Horarios
Endpoints para gestión de buses, horarios y paradas de buses
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Bus, Horario, ParadaBus, ZonaBus, TipoHorario, EstadoBus
from schemas import (
    BusCreate, BusUpdate, BusResponse,
    HorarioCreate, HorarioUpdate, HorarioResponse,
    ParadaBusCreate, ParadaBusUpdate, ParadaBusResponse,
    MessageResponse
)

router = APIRouter(prefix="/buses", tags=["Buses y Horarios"])

# ==================== BUSES ====================

@router.get("/", response_model=List[BusResponse])
async def get_all_buses(
    zona: str = None,
    activos_solo: bool = True,
    db: Session = Depends(get_db)
):
    """Obtener todos los buses con sus horarios"""
    query = db.query(Bus)

    if zona:
        query = query.filter(Bus.zona == zona)
    if activos_solo:
        query = query.filter(Bus.activo == True)

    buses = query.all()
    return [BusResponse.model_validate(bus.to_dict()) for bus in buses]

@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_bus(bus_data: BusCreate, db: Session = Depends(get_db)):
    """Crear un nuevo bus"""
    try:
        nuevo_bus = Bus(**bus_data.model_dump())
        db.add(nuevo_bus)
        db.commit()
        db.refresh(nuevo_bus)

        return MessageResponse(message="Bus creado exitosamente", id=nuevo_bus.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear bus: {str(e)}"
        )

@router.put("/{bus_id}", response_model=MessageResponse)
async def update_bus(bus_id: int, bus_data: BusUpdate, db: Session = Depends(get_db)):
    """Actualizar un bus"""
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus no encontrado")

    try:
        for key, value in bus_data.model_dump(exclude_unset=True).items():
            setattr(bus, key, value)
        db.commit()
        return MessageResponse(message="Bus actualizado exitosamente", id=bus_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.delete("/{bus_id}", response_model=MessageResponse)
async def delete_bus(bus_id: int, db: Session = Depends(get_db)):
    """Eliminar un bus"""
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus no encontrado")

    try:
        db.delete(bus)
        db.commit()
        return MessageResponse(message="Bus eliminado exitosamente", id=bus_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ==================== HORARIOS ====================

@router.post("/{bus_id}/horarios", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def add_horario(bus_id: int, horario_data: HorarioCreate, db: Session = Depends(get_db)):
    """Agregar un horario a un bus"""
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus no encontrado")

    try:
        nuevo_horario = Horario(bus_id=bus_id, **horario_data.model_dump())
        db.add(nuevo_horario)
        db.commit()
        db.refresh(nuevo_horario)

        return MessageResponse(message="Horario agregado exitosamente", id=nuevo_horario.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/{zona}/salidas", response_model=List[HorarioResponse])
async def get_salidas(zona: str, db: Session = Depends(get_db)):
    """Obtener salidas de una zona específica"""
    horarios = db.query(Horario).join(Bus).filter(
        Bus.zona == zona,
        Horario.tipo == TipoHorario.SALIDA,
        Bus.activo == True
    ).all()

    return [HorarioResponse.model_validate(h.to_dict()) for h in horarios]

@router.get("/{zona}/entradas", response_model=List[HorarioResponse])
async def get_entradas(zona: str, db: Session = Depends(get_db)):
    """Obtener entradas de una zona específica"""
    horarios = db.query(Horario).join(Bus).filter(
        Bus.zona == zona,
        Horario.tipo == TipoHorario.ENTRADA,
        Bus.activo == True
    ).all()

    return [HorarioResponse.model_validate(h.to_dict()) for h in horarios]

@router.put("/horarios/{horario_id}", response_model=MessageResponse)
async def update_horario(horario_id: int, horario_data: HorarioUpdate, db: Session = Depends(get_db)):
    """Actualizar un horario (especialmente el estado)"""
    horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    try:
        for key, value in horario_data.model_dump(exclude_unset=True).items():
            setattr(horario, key, value)
        db.commit()
        return MessageResponse(message="Horario actualizado exitosamente", id=horario_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.delete("/horarios/{horario_id}", response_model=MessageResponse)
async def delete_horario(horario_id: int, db: Session = Depends(get_db)):
    """Eliminar un horario"""
    horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    try:
        db.delete(horario)
        db.commit()
        return MessageResponse(message="Horario eliminado exitosamente", id=horario_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ==================== PARADAS DE BUSES ====================

router_paradas = APIRouter(prefix="/paradas-buses", tags=["Paradas de Buses"])

@router_paradas.get("/", response_model=List[ParadaBusResponse])
async def get_all_paradas(zona: str = None, activas_solo: bool = True, db: Session = Depends(get_db)):
    """Obtener todas las paradas de buses"""
    query = db.query(ParadaBus)

    if zona:
        query = query.filter(ParadaBus.zona == zona)
    if activas_solo:
        query = query.filter(ParadaBus.activa == True)

    paradas = query.all()
    return [ParadaBusResponse.model_validate(p.to_dict()) for p in paradas]

@router_paradas.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_parada(parada_data: ParadaBusCreate, db: Session = Depends(get_db)):
    """Crear una nueva parada de bus"""
    try:
        nueva_parada = ParadaBus(**parada_data.model_dump())
        db.add(nueva_parada)
        db.commit()
        db.refresh(nueva_parada)

        return MessageResponse(message="Parada creada exitosamente", id=nueva_parada.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router_paradas.get("/cercanas")
async def get_paradas_cercanas(lat: float, lng: float, radio_km: float = 1.0, db: Session = Depends(get_db)):
    """Obtener paradas cercanas a una ubicación (búsqueda simple)"""
    paradas = db.query(ParadaBus).filter(ParadaBus.activa == True).all()

    # Filtro simple por distancia aproximada
    paradas_cercanas = []
    for parada in paradas:
        dist_lat = abs(parada.lat - lat)
        dist_lng = abs(parada.lng - lng)
        if dist_lat < (radio_km / 111) and dist_lng < (radio_km / 111):
            paradas_cercanas.append(ParadaBusResponse.model_validate(parada.to_dict()))

    return paradas_cercanas

@router_paradas.put("/{parada_id}", response_model=MessageResponse)
async def update_parada(parada_id: int, parada_data: ParadaBusUpdate, db: Session = Depends(get_db)):
    """Actualizar una parada de bus"""
    parada = db.query(ParadaBus).filter(ParadaBus.id == parada_id).first()
    if not parada:
        raise HTTPException(status_code=404, detail="Parada no encontrada")

    try:
        for key, value in parada_data.model_dump(exclude_unset=True).items():
            setattr(parada, key, value)
        db.commit()
        return MessageResponse(message="Parada actualizada exitosamente", id=parada_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router_paradas.delete("/{parada_id}", response_model=MessageResponse)
async def delete_parada(parada_id: int, db: Session = Depends(get_db)):
    """Eliminar una parada de bus"""
    parada = db.query(ParadaBus).filter(ParadaBus.id == parada_id).first()
    if not parada:
        raise HTTPException(status_code=404, detail="Parada no encontrada")

    try:
        db.delete(parada)
        db.commit()
        return MessageResponse(message="Parada eliminada exitosamente", id=parada_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
