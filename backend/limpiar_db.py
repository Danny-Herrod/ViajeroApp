"""
Script para limpiar la base de datos completamente
"""
import sys
from sqlalchemy import text
from database import engine, SessionLocal
from models import Ruta, Parada

def limpiar_todo():
    """Eliminar todas las rutas y paradas"""
    db = SessionLocal()
    try:
        # Eliminar todas las paradas primero
        count_paradas = db.query(Parada).delete()

        # Eliminar todas las rutas
        count_rutas = db.query(Ruta).delete()

        db.commit()

        print(f"[OK] {count_rutas} rutas eliminadas")
        print(f"[OK] {count_paradas} paradas eliminadas")
        print("[OK] Base de datos limpia")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {str(e)}")
        return 1
    finally:
        db.close()

    return 0

if __name__ == "__main__":
    print("=" * 50)
    print("Limpiando base de datos")
    print("=" * 50)
    sys.exit(limpiar_todo())
