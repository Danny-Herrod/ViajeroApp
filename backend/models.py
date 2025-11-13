from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import json
import enum

# ==================== ENUMS ====================

class EstadoBus(str, enum.Enum):
    """Estados posibles de un bus"""
    GREEN = "green"      # Operativo normal
    YELLOW = "yellow"    # Con retraso
    RED = "red"          # Fuera de servicio

class TipoHorario(str, enum.Enum):
    """Tipo de horario: salida o entrada"""
    SALIDA = "salida"
    ENTRADA = "entrada"

class ZonaBus(str, enum.Enum):
    """Zona del bus: sur o norte"""
    SUR = "sur"
    NORTE = "norte"

class TipoNotificacion(str, enum.Enum):
    """Tipos de notificaciones"""
    INFO = "info"
    WARNING = "warning"
    ALERT = "alert"
    SUCCESS = "success"

# ==================== MODELOS ====================

class Usuario(Base):
    """
    Modelo de Usuario
    Gestiona la información de los usuarios de la aplicación móvil
    """
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    foto_perfil = Column(Text, nullable=True)  # Base64 o URL
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    ultimo_acceso = Column(DateTime(timezone=True), nullable=True)
    activo = Column(Boolean, default=True)

    # Relaciones
    favoritos = relationship("Favorito", back_populates="usuario", cascade="all, delete-orphan")
    viajes = relationship("ViajePlaneado", back_populates="usuario", cascade="all, delete-orphan")
    estadisticas = relationship("EstadisticaUsuario", back_populates="usuario", uselist=False, cascade="all, delete-orphan")
    notificaciones = relationship("Notificacion", back_populates="usuario", cascade="all, delete-orphan")

    def to_dict(self, include_sensitive=False):
        """Convertir usuario a diccionario (sin password por defecto)"""
        data = {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "foto_perfil": self.foto_perfil,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "ultimo_acceso": self.ultimo_acceso.isoformat() if self.ultimo_acceso else None,
            "activo": self.activo
        }
        if include_sensitive:
            data["password_hash"] = self.password_hash
        return data

class Ruta(Base):
    __tablename__ = "rutas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    number = Column(String(50), nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    frequency = Column(Integer, nullable=False)  # Frecuencia en minutos
    visible = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    distance = Column(Float, nullable=True)  # Distancia en km
    duration = Column(Integer, nullable=True)  # Duración en minutos
    route_geometry = Column(Text, nullable=True)  # JSON string de coordenadas

    # Relación con paradas
    paradas = relationship("Parada", back_populates="ruta", cascade="all, delete-orphan")

    def to_dict(self):
        """Convertir el modelo a diccionario para JSON"""
        return {
            "id": self.id,
            "name": self.name,
            "number": self.number,
            "startTime": self.start_time,
            "endTime": self.end_time,
            "frequency": str(self.frequency),
            "visible": self.visible,
            "createdAt": self.created_at.strftime("%d/%m/%Y") if self.created_at else None,
            "distance": str(self.distance) if self.distance else None,
            "duration": self.duration,
            "routeGeometry": json.loads(self.route_geometry) if self.route_geometry else [],
            "paradas": [parada.to_dict() for parada in self.paradas]
        }

class Parada(Base):
    """
    Modelo de Parada de Ruta
    Representa las paradas que componen una ruta de bus
    """
    __tablename__ = "paradas"

    id = Column(Integer, primary_key=True, index=True)
    ruta_id = Column(Integer, ForeignKey("rutas.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    order = Column(Integer, nullable=False)  # Orden de la parada en la ruta

    # Relación con ruta
    ruta = relationship("Ruta", back_populates="paradas")

    def to_dict(self):
        """Convertir el modelo a diccionario para JSON"""
        return {
            "name": self.name,
            "lat": self.lat,
            "lng": self.lng
        }

class Bus(Base):
    """
    Modelo de Bus
    Representa una compañía o línea de transporte
    """
    __tablename__ = "buses"

    id = Column(Integer, primary_key=True, index=True)
    nombre_transporte = Column(String(100), nullable=False)
    zona = Column(Enum(ZonaBus), nullable=False)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relaciones
    horarios = relationship("Horario", back_populates="bus", cascade="all, delete-orphan")

    def to_dict(self):
        """Convertir bus a diccionario"""
        return {
            "id": self.id,
            "nombre_transporte": self.nombre_transporte,
            "zona": self.zona.value,
            "activo": self.activo,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "horarios": [horario.to_dict() for horario in self.horarios]
        }

class Horario(Base):
    """
    Modelo de Horario
    Representa los horarios de salida/entrada de un bus
    """
    __tablename__ = "horarios"

    id = Column(Integer, primary_key=True, index=True)
    bus_id = Column(Integer, ForeignKey("buses.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(Enum(TipoHorario), nullable=False)  # salida o entrada
    destino_procedencia = Column(String(100), nullable=False)  # Destino (salida) o Procedencia (entrada)
    hora = Column(String(10), nullable=False)  # Formato: "HH:MM am/pm"
    estado = Column(Enum(EstadoBus), default=EstadoBus.GREEN)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relación con bus
    bus = relationship("Bus", back_populates="horarios")

    def to_dict(self):
        """Convertir horario a diccionario"""
        return {
            "id": self.id,
            "transporte": self.bus.nombre_transporte if self.bus else None,
            "tipo": self.tipo.value,
            "destino" if self.tipo == TipoHorario.SALIDA else "procedencia": self.destino_procedencia,
            "hora": self.hora,
            "estado": self.estado.value
        }

class ParadaBus(Base):
    """
    Modelo de Parada de Bus
    Representa paradas físicas donde los buses se detienen
    (Diferente de 'Parada' que son paradas de rutas específicas)
    """
    __tablename__ = "paradas_buses"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    zona = Column(Enum(ZonaBus), nullable=False)
    descripcion = Column(Text, nullable=True)
    activa = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        """Convertir parada de bus a diccionario"""
        return {
            "id": self.id,
            "nombre": self.nombre,
            "lat": self.lat,
            "lng": self.lng,
            "zona": self.zona.value,
            "descripcion": self.descripcion,
            "activa": self.activa
        }

class Favorito(Base):
    """
    Modelo de Favorito
    Lugares guardados como favoritos por los usuarios
    """
    __tablename__ = "favoritos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    lugar_nombre = Column(String(200), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    descripcion = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # JSON string con tags del lugar
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación con usuario
    usuario = relationship("Usuario", back_populates="favoritos")

    def to_dict(self):
        """Convertir favorito a diccionario"""
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "lugar_nombre": self.lugar_nombre,
            "lat": self.lat,
            "lng": self.lng,
            "descripcion": self.descripcion,
            "tags": json.loads(self.tags) if self.tags else {},
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class ViajePlaneado(Base):
    """
    Modelo de Viaje Planeado
    Historial de viajes que los usuarios han planeado
    """
    __tablename__ = "viajes_planeados"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    origen_nombre = Column(String(200), nullable=False)
    origen_lat = Column(Float, nullable=False)
    origen_lng = Column(Float, nullable=False)
    destino_nombre = Column(String(200), nullable=False)
    destino_lat = Column(Float, nullable=False)
    destino_lng = Column(Float, nullable=False)
    distancia_km = Column(Float, nullable=True)
    tiempo_estimado = Column(String(50), nullable=True)  # Ej: "45 min", "1h 20min"
    costo_estimado = Column(Float, nullable=True)
    numero_buses = Column(Integer, default=1)
    fecha_viaje = Column(DateTime(timezone=True), nullable=True)
    completado = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación con usuario
    usuario = relationship("Usuario", back_populates="viajes")

    def to_dict(self):
        """Convertir viaje a diccionario"""
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "origen": {
                "nombre": self.origen_nombre,
                "lat": self.origen_lat,
                "lng": self.origen_lng
            },
            "destino": {
                "nombre": self.destino_nombre,
                "lat": self.destino_lat,
                "lng": self.destino_lng
            },
            "distancia_km": self.distancia_km,
            "tiempo_estimado": self.tiempo_estimado,
            "costo_estimado": self.costo_estimado,
            "numero_buses": self.numero_buses,
            "fecha_viaje": self.fecha_viaje.isoformat() if self.fecha_viaje else None,
            "completado": self.completado,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class EstadisticaUsuario(Base):
    """
    Modelo de Estadísticas de Usuario
    Acumula estadísticas de uso de cada usuario
    """
    __tablename__ = "estadisticas_usuarios"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, unique=True)
    viajes_realizados = Column(Integer, default=0)
    distancia_total_km = Column(Float, default=0.0)
    ahorro_total = Column(Float, default=0.0)  # Ahorro estimado vs. taxi
    lugares_visitados = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relación con usuario
    usuario = relationship("Usuario", back_populates="estadisticas")

    def to_dict(self):
        """Convertir estadísticas a diccionario"""
        return {
            "usuario_id": self.usuario_id,
            "viajes_realizados": self.viajes_realizados,
            "distancia_total_km": round(self.distancia_total_km, 2),
            "ahorro_total": round(self.ahorro_total, 2),
            "lugares_visitados": self.lugares_visitados,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class Notificacion(Base):
    """
    Modelo de Notificación
    Notificaciones enviadas a usuarios
    """
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True)  # Null = notificación global
    tipo = Column(Enum(TipoNotificacion), default=TipoNotificacion.INFO)
    titulo = Column(String(200), nullable=False)
    mensaje = Column(Text, nullable=False)
    leida = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación con usuario
    usuario = relationship("Usuario", back_populates="notificaciones")

    def to_dict(self):
        """Convertir notificación a diccionario"""
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "tipo": self.tipo.value,
            "titulo": self.titulo,
            "mensaje": self.mensaje,
            "leida": self.leida,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
