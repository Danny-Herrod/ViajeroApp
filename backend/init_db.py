"""
Script para inicializar la base de datos y crear las tablas
Versión 2.0 - Incluye todas las nuevas tablas
"""
import sys
from sqlalchemy import create_engine, text
from database import Base, engine
from models import (
    Usuario, Ruta, Parada, Bus, Horario, ParadaBus,
    Favorito, ViajePlaneado, EstadisticaUsuario, Notificacion
)
from config import settings

# Forzar UTF-8 en Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def create_database():
    """Crear la base de datos si no existe"""
    # Crear engine sin especificar la base de datos
    temp_engine = create_engine(
        f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}",
        echo=False  # Cambiar a False para menos logs
    )

    with temp_engine.connect() as conn:
        # Verificar si la base de datos existe
        result = conn.execute(
            text(f"SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '{settings.DB_NAME}'")
        )

        if not result.fetchone():
            # Crear la base de datos
            conn.execute(text(f"CREATE DATABASE {settings.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
            conn.commit()
            print(f"[OK] Base de datos '{settings.DB_NAME}' creada exitosamente")
        else:
            print(f"[OK] Base de datos '{settings.DB_NAME}' ya existe")

def create_tables():
    """Crear todas las tablas"""
    Base.metadata.create_all(bind=engine)
    print("[OK] Tablas creadas exitosamente")

def main():
    """Función principal"""
    print("=" * 60)
    print("   ViajeroApp - Inicialización de Base de Datos v2.0")
    print("=" * 60)
    print(f"Host: {settings.DB_HOST}")
    print(f"Usuario: {settings.DB_USER}")
    print(f"Base de datos: {settings.DB_NAME}")
    print()

    try:
        # Paso 1: Crear base de datos
        print("Paso 1: Creando base de datos...")
        create_database()
        print()

        # Paso 2: Crear tablas
        print("Paso 2: Creando tablas...")
        create_tables()
        print()

        print("📋 Tablas creadas:")
        print("  ✓ usuarios")
        print("  ✓ rutas")
        print("  ✓ paradas")
        print("  ✓ buses")
        print("  ✓ horarios")
        print("  ✓ paradas_buses")
        print("  ✓ favoritos")
        print("  ✓ viajes_planeados")
        print("  ✓ estadisticas_usuarios")
        print("  ✓ notificaciones")
        print()

        print("=" * 60)
        print("✅ Inicialización completada exitosamente")
        print("=" * 60)
        print()
        print("Próximos pasos:")
        print("1. Ejecutar el servidor: python main.py")
        print("2. Ver documentación API: http://localhost:8000/docs")
        print()
        return 0

    except Exception as e:
        print(f"❌ [ERROR] Error durante la inicialización: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
