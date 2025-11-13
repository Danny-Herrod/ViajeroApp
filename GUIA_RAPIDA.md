# 🚀 Guía Rápida - ViajeroApp

## ✅ INTEGRACIÓN COMPLETA BACKEND-FRONTEND

El sistema está **COMPLETAMENTE INTEGRADO**:
- ✅ Desktop (index.html) conectado al backend para CRUD de rutas
- ✅ Móvil (mapa.html) conectado al backend para visualizar rutas
- ✅ Todas las operaciones (crear, editar, eliminar) se sincronizan automáticamente

---

## 📋 Pre-requisitos

✅ **XAMPP instalado y configurado**
✅ **Python 3.8+ instalado**
✅ **MySQL activo en XAMPP**

---

## 🔧 Configuración Inicial (Solo la primera vez)

### 1️⃣ Configurar Base de Datos

1. Abre **XAMPP Control Panel**
2. Inicia **Apache** y **MySQL**
3. Abre **phpMyAdmin**: http://localhost/phpmyadmin
4. Crea la base de datos:
   ```sql
   CREATE DATABASE viajero_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 2️⃣ Instalar Dependencias del Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3️⃣ Inicializar Base de Datos

```bash
# Desde la carpeta backend con el venv activado
python init_db.py
```

---

## 🚀 Ejecutar la Aplicación (Cada vez que quieras usar la app)

### PASO 1: Iniciar XAMPP
1. Abre **XAMPP Control Panel**
2. Inicia **MySQL** (Apache es opcional)

### PASO 2: Iniciar el Backend

```bash
cd backend
venv\Scripts\activate
python main.py
```

**Deberías ver:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### PASO 3: Verificar Backend (Opcional pero recomendado)

```bash
# En otra terminal, en la carpeta backend
python test_backend.py
```

### PASO 4: Abrir las Aplicaciones

**Desktop (Gestión de Rutas):**
- Abre `desktop/index.html` en tu navegador (mejor con Live Server)
- Desde aquí puedes crear, editar y eliminar rutas

**Móvil (Mapa y Usuario):**
- Abre `Movil/index.html` para login/registro
- Después de login, se abrirá `Movil/home.html`
- Puedes navegar al mapa para ver las rutas en tiempo real

---

## ✅ Verificar que Todo Funciona

### Backend:
```bash
# Abrir en navegador:
http://127.0.0.1:8000/health
# Deberías ver: {"status":"ok","message":"El servidor está funcionando correctamente"}

http://127.0.0.1:8000/rutas
# Deberías ver un array con las rutas (o [] si aún no hay rutas)
```

### Frontend Desktop:
1. Abre `desktop/index.html`
2. Haz clic en "Añadir Nueva Ruta"
3. Crea una ruta de prueba
4. La ruta debería aparecer en la lista

### Frontend Móvil:
1. Registra un usuario en `Movil/index.html`
2. Inicia sesión
3. Ve a la sección "Mapa"
4. Deberías ver las rutas creadas desde desktop

---

## 🐛 Solución de Problemas

### ❌ Error: "No se pudieron cargar las rutas"

**Causa:** El backend no está ejecutándose

**Solución:**
```bash
cd backend
venv\Scripts\activate
python main.py
```

### ❌ Error: "mysql.connector.errors.ProgrammingError: 1049"

**Causa:** La base de datos no existe

**Solución:**
```sql
-- En phpMyAdmin:
CREATE DATABASE viajero_app;
```
Luego ejecuta: `python init_db.py`

### ❌ Error: CORS

**Causa:** El navegador está bloqueando peticiones

**Solución:** Usa Live Server o cualquier servidor local para abrir los archivos HTML

### ❌ Las rutas no aparecen en el mapa

**Verifica:**
1. ✅ Backend ejecutándose: http://127.0.0.1:8000/health
2. ✅ Rutas en BD: http://127.0.0.1:8000/rutas
3. ✅ Consola del navegador (F12) sin errores

---

## 📊 Estructura de Datos

### Ruta en Backend:
```json
{
  "id": 1,
  "name": "Ruta Centro",
  "routeGeometry": [[lat, lng], [lat, lng], ...],
  "paradas": [
    {
      "id": 1,
      "name": "Parada 1",
      "location": [lat, lng],
      "type": "inicio"
    }
  ]
}
```

---

## 🎯 Flujo de Trabajo Recomendado

1. **Iniciar XAMPP** (MySQL)
2. **Iniciar Backend** (`python main.py`)
3. **Verificar Backend** (`python test_backend.py`)
4. **Abrir Desktop** para gestionar rutas
5. **Abrir Móvil** para ver rutas en el mapa

---

## 📝 Comandos Útiles

```bash
# Ver todas las rutas en la BD
python -c "from database import get_db; from models import Ruta; db = next(get_db()); print([r.name for r in db.query(Ruta).all()])"

# Limpiar todas las rutas (¡CUIDADO!)
python limpiar_db.py

# Verificar estado del backend
curl http://127.0.0.1:8000/health
```

---

## 🆘 Ayuda Adicional

- **Documentación API:** http://127.0.0.1:8000/docs (cuando el backend esté corriendo)
- **Logs del Backend:** Revisa la consola donde ejecutaste `python main.py`
- **Logs del Frontend:** Presiona F12 en el navegador y ve a la pestaña "Console"

---

## ✨ Nuevas Características Agregadas

### Sistema de Autenticación Completo:
- ✅ Login y registro funcional
- ✅ Gestión de perfil con foto
- ✅ Página de ajustes completa
- ✅ Cambio de nombre, email y contraseña
- ✅ Cerrar sesión real

### Home Mejorado:
- ✅ Información del próximo bus
- ✅ Accesos rápidos a todas las secciones
- ✅ Estadísticas en tiempo real
- ✅ Animaciones sutiles

### Navegación:
- ✅ Funciona en todas las páginas
- ✅ Integrada con autenticación
- ✅ Sin conflictos

---

¡Listo! Ahora todo debería funcionar correctamente 🎉
