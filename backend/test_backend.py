"""
Script para verificar que el backend esté funcionando correctamente
"""
import requests
import sys

def test_backend():
    backend_url = "http://127.0.0.1:8000"

    print("=" * 60)
    print("🧪 VERIFICACIÓN DEL BACKEND - ViajeroApp")
    print("=" * 60)
    print()

    # Test 1: Verificar que el servidor esté corriendo
    print("✓ Test 1: Verificando servidor...")
    try:
        response = requests.get(f"{backend_url}/health", timeout=5)
        if response.status_code == 200:
            print("  ✅ Servidor activo y respondiendo")
            print(f"  Respuesta: {response.json()}")
        else:
            print(f"  ❌ Servidor respondió con código {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("  ❌ No se pudo conectar al servidor")
        print("  💡 Asegúrate de ejecutar: python main.py")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

    print()

    # Test 2: Verificar endpoint de rutas
    print("✓ Test 2: Verificando endpoint de rutas...")
    try:
        response = requests.get(f"{backend_url}/rutas", timeout=5)
        if response.status_code == 200:
            rutas = response.json()
            print(f"  ✅ Endpoint de rutas funcionando")
            print(f"  📊 Rutas encontradas: {len(rutas)}")

            if len(rutas) > 0:
                print(f"  📍 Primera ruta: {rutas[0].get('name', 'Sin nombre')}")
            else:
                print("  ⚠️  No hay rutas en la base de datos")
                print("  💡 Agrega rutas desde la aplicación desktop")
        else:
            print(f"  ❌ Error al obtener rutas: {response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

    print()

    # Test 3: Verificar CORS
    print("✓ Test 3: Verificando CORS...")
    try:
        response = requests.options(f"{backend_url}/rutas", headers={
            "Origin": "http://localhost:5500",
            "Access-Control-Request-Method": "GET"
        })
        if 'access-control-allow-origin' in response.headers:
            print("  ✅ CORS configurado correctamente")
        else:
            print("  ⚠️  CORS podría no estar configurado")
    except Exception as e:
        print(f"  ⚠️  No se pudo verificar CORS: {e}")

    print()
    print("=" * 60)
    print("✅ TODOS LOS TESTS PASARON - Backend funcionando correctamente")
    print("=" * 60)
    print()
    print("Ahora puedes:")
    print("  1. Abrir desktop/index.html para gestionar rutas")
    print("  2. Abrir Movil/mapa.html para ver las rutas en el mapa")
    print()

    return True

if __name__ == "__main__":
    success = test_backend()
    sys.exit(0 if success else 1)
