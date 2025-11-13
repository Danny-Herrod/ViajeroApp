"""
Router de Autenticación
Endpoints para registro, login y gestión de usuarios
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from models import Usuario, EstadisticaUsuario
from schemas import (
    UsuarioCreate, UsuarioUpdate, UsuarioUpdatePassword, UsuarioResponse,
    LoginRequest, LoginResponse, MessageResponse
)
from auth_utils import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):
    """
    Registrar un nuevo usuario

    - **nombre**: Nombre completo del usuario
    - **email**: Email único del usuario
    - **password**: Contraseña (mínimo 6 caracteres)

    Returns:
        LoginResponse con los datos del usuario creado
    """
    # Verificar si el email ya existe
    existing_user = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )

    try:
        # Hashear la contraseña
        password_hash = hash_password(usuario_data.password)

        # Crear usuario
        nuevo_usuario = Usuario(
            nombre=usuario_data.nombre,
            email=usuario_data.email,
            password_hash=password_hash,
            ultimo_acceso=datetime.now()
        )

        db.add(nuevo_usuario)
        db.flush()  # Para obtener el ID

        # Crear estadísticas iniciales para el usuario
        estadisticas = EstadisticaUsuario(usuario_id=nuevo_usuario.id)
        db.add(estadisticas)

        db.commit()
        db.refresh(nuevo_usuario)

        return LoginResponse(
            message="Usuario registrado exitosamente",
            usuario=UsuarioResponse.model_validate(nuevo_usuario.to_dict())
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar usuario: {str(e)}"
        )

@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Iniciar sesión

    - **email**: Email del usuario
    - **password**: Contraseña

    Returns:
        LoginResponse con los datos del usuario
    """
    # Buscar usuario por email
    usuario = db.query(Usuario).filter(Usuario.email == credentials.email).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )

    # Verificar contraseña
    if not verify_password(credentials.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )

    # Verificar si el usuario está activo
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado. Contacta al administrador"
        )

    # Actualizar último acceso
    usuario.ultimo_acceso = datetime.now()
    db.commit()

    return LoginResponse(
        message="Login exitoso",
        usuario=UsuarioResponse.model_validate(usuario.to_dict())
    )

@router.get("/users/{usuario_id}", response_model=UsuarioResponse)
async def get_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """
    Obtener información de un usuario por ID

    - **usuario_id**: ID del usuario
    """
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {usuario_id} no encontrado"
        )

    return UsuarioResponse.model_validate(usuario.to_dict())

@router.put("/users/{usuario_id}", response_model=MessageResponse)
async def update_usuario(
    usuario_id: int,
    usuario_data: UsuarioUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizar información de un usuario

    - **usuario_id**: ID del usuario
    - Todos los campos son opcionales
    """
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {usuario_id} no encontrado"
        )

    try:
        # Actualizar campos proporcionados
        update_data = usuario_data.model_dump(exclude_unset=True)

        # Verificar email único si se está actualizando
        if "email" in update_data and update_data["email"] != usuario.email:
            existing_user = db.query(Usuario).filter(Usuario.email == update_data["email"]).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El email ya está en uso"
                )

        for key, value in update_data.items():
            setattr(usuario, key, value)

        db.commit()

        return MessageResponse(
            message="Usuario actualizado exitosamente",
            id=usuario_id
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar usuario: {str(e)}"
        )

@router.put("/users/{usuario_id}/password", response_model=MessageResponse)
async def change_password(
    usuario_id: int,
    password_data: UsuarioUpdatePassword,
    db: Session = Depends(get_db)
):
    """
    Cambiar contraseña de un usuario

    - **usuario_id**: ID del usuario
    - **password_actual**: Contraseña actual
    - **password_nueva**: Nueva contraseña
    """
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {usuario_id} no encontrado"
        )

    # Verificar contraseña actual
    if not verify_password(password_data.password_actual, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña actual incorrecta"
        )

    try:
        # Hashear nueva contraseña
        nuevo_hash = hash_password(password_data.password_nueva)
        usuario.password_hash = nuevo_hash

        db.commit()

        return MessageResponse(
            message="Contraseña actualizada exitosamente",
            id=usuario_id
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cambiar contraseña: {str(e)}"
        )

@router.get("/users", response_model=List[UsuarioResponse])
async def get_all_usuarios(
    skip: int = 0,
    limit: int = 100,
    activos_solo: bool = False,
    db: Session = Depends(get_db)
):
    """
    Obtener lista de usuarios (para administración)

    - **skip**: Registros a omitir (paginación)
    - **limit**: Máximo de registros a devolver
    - **activos_solo**: Si es True, solo devuelve usuarios activos
    """
    query = db.query(Usuario)

    if activos_solo:
        query = query.filter(Usuario.activo == True)

    usuarios = query.offset(skip).limit(limit).all()
    return [UsuarioResponse.model_validate(u.to_dict()) for u in usuarios]

@router.delete("/users/{usuario_id}", response_model=MessageResponse)
async def delete_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """
    Eliminar (desactivar) un usuario

    - **usuario_id**: ID del usuario a desactivar

    Nota: Los usuarios no se eliminan físicamente, solo se desactivan
    """
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {usuario_id} no encontrado"
        )

    try:
        usuario.activo = False
        db.commit()

        return MessageResponse(
            message="Usuario desactivado exitosamente",
            id=usuario_id
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al desactivar usuario: {str(e)}"
        )
