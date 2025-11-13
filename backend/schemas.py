from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# ==================== ENUMS ====================

class EstadoBusEnum(str, Enum):
    """Estados posibles de un bus"""
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"

class TipoHorarioEnum(str, Enum):
    """Tipo de horario"""
    SALIDA = "salida"
    ENTRADA = "entrada"

class ZonaBusEnum(str, Enum):
    """Zona del bus"""
    SUR = "sur"
    NORTE = "norte"

class TipoNotificacionEnum(str, Enum):
    """Tipo de notificación"""
    INFO = "info"
    WARNING = "warning"
    ALERT = "alert"
    SUCCESS = "success"

# ==================== SCHEMAS DE USUARIOS ====================

class UsuarioBase(BaseModel):
    """Schema base de usuario"""
    nombre: str = Field(..., min_length=1, max_length=100)
    email: EmailStr

class UsuarioCreate(UsuarioBase):
    """Schema para crear usuario (registro)"""
    password: str = Field(..., min_length=6, max_length=100)

class UsuarioUpdate(BaseModel):
    """Schema para actualizar usuario"""
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    foto_perfil: Optional[str] = None

class UsuarioUpdatePassword(BaseModel):
    """Schema para cambiar contraseña"""
    password_actual: str
    password_nueva: str = Field(..., min_length=6, max_length=100)

class UsuarioResponse(UsuarioBase):
    """Schema de respuesta de usuario"""
    id: int
    foto_perfil: Optional[str] = None
    created_at: Optional[str] = None
    ultimo_acceso: Optional[str] = None
    activo: bool

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    """Schema para login"""
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    """Schema de respuesta de login"""
    message: str
    usuario: UsuarioResponse
    token: Optional[str] = None  # Para futuro JWT

# ==================== SCHEMAS DE RUTAS (Existentes) ====================

class ParadaBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)

class ParadaCreate(ParadaBase):
    pass

class ParadaResponse(ParadaBase):
    id: int

    class Config:
        from_attributes = True

class RutaBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    number: str = Field(..., min_length=1, max_length=50)
    startTime: str = Field(..., alias="startTime")
    endTime: str = Field(..., alias="endTime")
    frequency: int = Field(..., gt=0, alias="frequency")
    visible: bool = True
    distance: Optional[float] = None
    duration: Optional[int] = None
    routeGeometry: Optional[List[List[float]]] = Field(default=None, alias="routeGeometry")

class RutaCreate(RutaBase):
    paradas: List[ParadaBase] = Field(..., min_items=1)

    class Config:
        populate_by_name = True

class RutaUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    number: Optional[str] = Field(None, min_length=1, max_length=50)
    startTime: Optional[str] = Field(None, alias="startTime")
    endTime: Optional[str] = Field(None, alias="endTime")
    frequency: Optional[int] = Field(None, gt=0, alias="frequency")
    visible: Optional[bool] = None
    distance: Optional[float] = None
    duration: Optional[int] = None
    routeGeometry: Optional[List[List[float]]] = Field(None, alias="routeGeometry")
    paradas: Optional[List[ParadaBase]] = None

    class Config:
        populate_by_name = True

class RutaResponse(BaseModel):
    id: int
    name: str
    number: str
    startTime: str
    endTime: str
    frequency: str
    visible: bool
    createdAt: Optional[str]
    distance: Optional[str]
    duration: Optional[int]
    routeGeometry: List[List[float]]
    paradas: List[ParadaResponse]

    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    message: str
    id: Optional[int] = None

# ==================== SCHEMAS DE BUSES Y HORARIOS ====================

class BusBase(BaseModel):
    """Schema base de bus"""
    nombre_transporte: str = Field(..., min_length=1, max_length=100)
    zona: ZonaBusEnum

class BusCreate(BusBase):
    """Schema para crear bus"""
    pass

class BusUpdate(BaseModel):
    """Schema para actualizar bus"""
    nombre_transporte: Optional[str] = Field(None, min_length=1, max_length=100)
    zona: Optional[ZonaBusEnum] = None
    activo: Optional[bool] = None

class HorarioBase(BaseModel):
    """Schema base de horario"""
    tipo: TipoHorarioEnum
    destino_procedencia: str = Field(..., min_length=1, max_length=100)
    hora: str = Field(..., pattern=r'^\d{1,2}:\d{2}\s(am|pm)$')
    estado: EstadoBusEnum = EstadoBusEnum.GREEN

class HorarioCreate(HorarioBase):
    """Schema para crear horario"""
    pass

class HorarioUpdate(BaseModel):
    """Schema para actualizar horario"""
    tipo: Optional[TipoHorarioEnum] = None
    destino_procedencia: Optional[str] = Field(None, min_length=1, max_length=100)
    hora: Optional[str] = Field(None, pattern=r'^\d{1,2}:\d{2}\s(am|pm)$')
    estado: Optional[EstadoBusEnum] = None

class HorarioResponse(HorarioBase):
    """Schema de respuesta de horario"""
    id: int
    transporte: Optional[str] = None

    class Config:
        from_attributes = True

class BusResponse(BusBase):
    """Schema de respuesta de bus"""
    id: int
    activo: bool
    created_at: Optional[str] = None
    horarios: List[HorarioResponse] = []

    class Config:
        from_attributes = True

# ==================== SCHEMAS DE PARADAS DE BUS ====================

class ParadaBusBase(BaseModel):
    """Schema base de parada de bus"""
    nombre: str = Field(..., min_length=1, max_length=200)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    zona: ZonaBusEnum
    descripcion: Optional[str] = None

class ParadaBusCreate(ParadaBusBase):
    """Schema para crear parada de bus"""
    pass

class ParadaBusUpdate(BaseModel):
    """Schema para actualizar parada de bus"""
    nombre: Optional[str] = Field(None, min_length=1, max_length=200)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    zona: Optional[ZonaBusEnum] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None

class ParadaBusResponse(ParadaBusBase):
    """Schema de respuesta de parada de bus"""
    id: int
    activa: bool

    class Config:
        from_attributes = True

# ==================== SCHEMAS DE FAVORITOS ====================

class FavoritoBase(BaseModel):
    """Schema base de favorito"""
    lugar_nombre: str = Field(..., min_length=1, max_length=200)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    descripcion: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None

class FavoritoCreate(FavoritoBase):
    """Schema para crear favorito"""
    pass

class FavoritoResponse(FavoritoBase):
    """Schema de respuesta de favorito"""
    id: int
    usuario_id: int
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

# ==================== SCHEMAS DE VIAJES ====================

class OrigenDestinoBase(BaseModel):
    """Schema para origen/destino"""
    nombre: str
    lat: float
    lng: float

class ViajeBase(BaseModel):
    """Schema base de viaje"""
    origen_nombre: str = Field(..., min_length=1, max_length=200)
    origen_lat: float = Field(..., ge=-90, le=90)
    origen_lng: float = Field(..., ge=-180, le=180)
    destino_nombre: str = Field(..., min_length=1, max_length=200)
    destino_lat: float = Field(..., ge=-90, le=90)
    destino_lng: float = Field(..., ge=-180, le=180)
    distancia_km: Optional[float] = None
    tiempo_estimado: Optional[str] = None
    costo_estimado: Optional[float] = None
    numero_buses: int = 1
    fecha_viaje: Optional[datetime] = None

class ViajeCreate(ViajeBase):
    """Schema para crear viaje"""
    pass

class ViajeUpdate(BaseModel):
    """Schema para actualizar viaje"""
    completado: Optional[bool] = None

class ViajeResponse(BaseModel):
    """Schema de respuesta de viaje"""
    id: int
    usuario_id: int
    origen: OrigenDestinoBase
    destino: OrigenDestinoBase
    distancia_km: Optional[float] = None
    tiempo_estimado: Optional[str] = None
    costo_estimado: Optional[float] = None
    numero_buses: int
    fecha_viaje: Optional[str] = None
    completado: bool
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

# ==================== SCHEMAS DE ESTADÍSTICAS ====================

class EstadisticaUsuarioResponse(BaseModel):
    """Schema de respuesta de estadísticas"""
    usuario_id: int
    viajes_realizados: int
    distancia_total_km: float
    ahorro_total: float
    lugares_visitados: int
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class ActualizarEstadisticaRequest(BaseModel):
    """Schema para actualizar estadísticas después de un viaje"""
    distancia_km: float = Field(..., gt=0)
    costo: float = Field(..., gt=0)
    nuevo_lugar: bool = False

# ==================== SCHEMAS DE NOTIFICACIONES ====================

class NotificacionBase(BaseModel):
    """Schema base de notificación"""
    tipo: TipoNotificacionEnum = TipoNotificacionEnum.INFO
    titulo: str = Field(..., min_length=1, max_length=200)
    mensaje: str = Field(..., min_length=1)

class NotificacionCreate(NotificacionBase):
    """Schema para crear notificación"""
    usuario_id: Optional[int] = None  # None = notificación global

class NotificacionResponse(NotificacionBase):
    """Schema de respuesta de notificación"""
    id: int
    usuario_id: Optional[int] = None
    leida: bool
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

class MarcarLeidaRequest(BaseModel):
    """Schema para marcar notificación como leída"""
    leida: bool = True

# ==================== SCHEMAS DE DASHBOARD/ESTADÍSTICAS GLOBALES ====================

class DashboardStats(BaseModel):
    """Estadísticas generales para el dashboard de administración"""
    total_usuarios: int
    total_rutas: int
    total_buses: int
    total_viajes_hoy: int
    usuarios_activos_mes: int
    distancia_total_mes: float
