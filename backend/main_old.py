from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import json

from database import engine, get_db, Base
from models import Ruta, Parada
from schemas import RutaCreate, RutaUpdate, RutaResponse, MessageResponse
from config import settings

# Crear las tablas en la base de datos
Base.metadata.create_all(bind=engine)

# Crear la aplicación FastAPI
app = FastAPI(
    title="ViajeroApp API",
    description="API REST para gestión de rutas de autobuses",
    version="1.0.0"
)

# Configurar CORS para permitir acceso desde desktop y mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar los orígenes exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== ENDPOINTS ====================

@app.get("/", tags=["Root"])
async def root():
    """Endpoint raíz - Información de la API"""
    return {
        "message": "ViajeroApp API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "GET /rutas": "Obtener todas las rutas",
            "GET /rutas/{id}": "Obtener una ruta por ID",
            "POST /rutas": "Crear una nueva ruta",
            "PUT /rutas/{id}": "Actualizar una ruta",
            "DELETE /rutas/{id}": "Eliminar una ruta",
            "GET /health": "Estado del servidor"
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Verificar estado del servidor"""
    return {
        "status": "ok",
        "message": "El servidor está funcionando correctamente"
    }

@app.get("/rutas", tags=["Rutas"])
async def get_all_rutas(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Obtener todas las rutas

    - **skip**: Número de registros a omitir (para paginación)
    - **limit**: Número máximo de registros a devolver
    """
    rutas = db.query(Ruta).offset(skip).limit(limit).all()
    return [ruta.to_dict() for ruta in rutas]

@app.get("/rutas/{ruta_id}", tags=["Rutas"])
async def get_ruta_by_id(
    ruta_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener una ruta específica por ID

    - **ruta_id**: ID de la ruta a buscar
    """
    ruta = db.query(Ruta).filter(Ruta.id == ruta_id).first()

    if not ruta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ruta con ID {ruta_id} no encontrada"
        )

    return ruta.to_dict()

@app.post("/rutas", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, tags=["Rutas"])
async def create_ruta(
    ruta_data: RutaCreate,
    db: Session = Depends(get_db)
):
    """
    Crear una nueva ruta

    Requiere:
    - **name**: Nombre de la ruta
    - **number**: Número de la ruta
    - **startTime**: Hora de inicio (formato HH:MM)
    - **endTime**: Hora de fin (formato HH:MM)
    - **frequency**: Frecuencia en minutos
    - **paradas**: Lista de paradas (mínimo 1)
    - **visible**: Visibilidad de la ruta (opcional, default: true)
    - **distance**: Distancia en km (opcional)
    - **duration**: Duración en minutos (opcional)
    - **routeGeometry**: Geometría de la ruta como lista de coordenadas (opcional)
    """
    try:
        # Crear la ruta
        nueva_ruta = Ruta(
            name=ruta_data.name,
            number=ruta_data.number,
            start_time=ruta_data.startTime,
            end_time=ruta_data.endTime,
            frequency=ruta_data.frequency,
            visible=ruta_data.visible,
            distance=ruta_data.distance,
            duration=ruta_data.duration,
            route_geometry=json.dumps(ruta_data.routeGeometry) if ruta_data.routeGeometry else None
        )

        db.add(nueva_ruta)
        db.flush()  # Para obtener el ID antes de commit

        # Crear las paradas
        for order, parada_data in enumerate(ruta_data.paradas):
            nueva_parada = Parada(
                ruta_id=nueva_ruta.id,
                name=parada_data.name,
                lat=parada_data.lat,
                lng=parada_data.lng,
                order=order
            )
            db.add(nueva_parada)

        db.commit()
        db.refresh(nueva_ruta)

        return MessageResponse(
            message="Ruta creada exitosamente",
            id=nueva_ruta.id
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear la ruta: {str(e)}"
        )

@app.put("/rutas/{ruta_id}", response_model=MessageResponse, tags=["Rutas"])
async def update_ruta(
    ruta_id: int,
    ruta_data: RutaUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizar una ruta existente

    - **ruta_id**: ID de la ruta a actualizar
    - Todos los campos son opcionales
    """
    ruta = db.query(Ruta).filter(Ruta.id == ruta_id).first()

    if not ruta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ruta con ID {ruta_id} no encontrada"
        )

    try:
        # Actualizar campos de la ruta
        update_data = ruta_data.model_dump(exclude_unset=True, by_alias=True)

        # Manejar paradas si se proporcionan
        if "paradas" in update_data:
            # Eliminar paradas antiguas
            db.query(Parada).filter(Parada.ruta_id == ruta_id).delete()

            # Crear nuevas paradas
            paradas_data = update_data.pop("paradas")
            for order, parada_data in enumerate(paradas_data):
                nueva_parada = Parada(
                    ruta_id=ruta_id,
                    name=parada_data["name"],
                    lat=parada_data["lat"],
                    lng=parada_data["lng"],
                    order=order
                )
                db.add(nueva_parada)

        # Actualizar routeGeometry si se proporciona
        if "routeGeometry" in update_data:
            update_data["route_geometry"] = json.dumps(update_data.pop("routeGeometry"))

        # Mapear campos con alias
        field_mapping = {
            "startTime": "start_time",
            "endTime": "end_time",
            "frequency": "frequency"
        }

        for key, value in update_data.items():
            db_field = field_mapping.get(key, key)
            if hasattr(ruta, db_field):
                setattr(ruta, db_field, value)

        db.commit()

        return MessageResponse(
            message="Ruta actualizada exitosamente",
            id=ruta_id
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar la ruta: {str(e)}"
        )

@app.delete("/rutas/{ruta_id}", response_model=MessageResponse, tags=["Rutas"])
async def delete_ruta(
    ruta_id: int,
    db: Session = Depends(get_db)
):
    """
    Eliminar una ruta

    - **ruta_id**: ID de la ruta a eliminar
    """
    ruta = db.query(Ruta).filter(Ruta.id == ruta_id).first()

    if not ruta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ruta con ID {ruta_id} no encontrada"
        )

    try:
        db.delete(ruta)
        db.commit()

        return MessageResponse(
            message="Ruta eliminada exitosamente",
            id=ruta_id
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar la ruta: {str(e)}"
        )

@app.get("/rutas/search/{search_term}", tags=["Rutas"])
async def search_rutas(
    search_term: str,
    db: Session = Depends(get_db)
):
    """
    Buscar rutas por nombre o número

    - **search_term**: Término de búsqueda
    """
    rutas = db.query(Ruta).filter(
        (Ruta.name.like(f"%{search_term}%")) |
        (Ruta.number.like(f"%{search_term}%"))
    ).all()

    return [ruta.to_dict() for ruta in rutas]

# Ejecutar el servidor
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )
