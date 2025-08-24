```
██╗   ██╗██╗ █████╗      ██╗███████╗██████╗  ██████╗      █████╗ ██████╗ ██████╗ 
██║   ██║██║██╔══██╗     ██║██╔════╝██╔══██╗██╔═══██╗    ██╔══██╗██╔══██╗██╔══██╗
██║   ██║██║███████║     ██║█████╗  ██████╔╝██║   ██║    ███████║██████╔╝██████╔╝
╚██╗ ██╔╝██║██╔══██║██   ██║██╔══╝  ██╔══██╗██║   ██║    ██╔══██║██╔═══╝ ██╔═══╝ 
 ╚████╔╝ ██║██║  ██║╚█████╔╝███████╗██║  ██║╚██████╔╝    ██║  ██║██║     ██║     
  ╚═══╝  ╚═╝╚═╝  ╚═╝ ╚════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝     ╚═╝  ╚═╝╚═╝     ╚═╝     
                               ╔═══════════════════╗
                               ║  🧳 → 🗺️ → 📍 → ✨ 
                               ╚═══════════════════╝
```
#  ViajeroApp – Demo de Panel de Registro de Rutas

Este proyecto es una **implementación temprana** de **ViajeroApp**, enfocado en la **gestión y visualización de rutas de buses** con soporte para cálculo de caminos reales en el mapa.  
El objetivo es sentar las bases de un sistema que permita **registrar rutas, paradas y horarios**, mostrando la información de forma interactiva.

---

##  Funcionalidades implementadas en la demo

-  **Registro de rutas** mediante formulario:
  - Nombre de la ruta.  
  - Número de ruta.  
  - Horarios de inicio y fin.  
  - Frecuencia de paso.  

- 🗺 **Gestión de paradas:**
  - Agregar paradas manualmente con latitud/longitud.  
  - Selección de paradas haciendo clic en el mapa.  
  - Opción para usar la ubicación actual del usuario.  
  - Eliminación de paradas con un clic.  

-  **Visualización en mapa (Leaflet):**
  - Inicio de ruta en verde.  
  - Paradas intermedias en azul.  
  - Final de ruta en rojo.  
  - Rutas calculadas siguiendo **las calles reales** (no líneas rectas).  

-  **Gestión de rutas guardadas:**
  - Listado de rutas registradas en la interfaz.  
  - Estado vacío inicial indicando que aún no hay rutas.  

---

## 🛠 Tecnologías utilizadas

- **Frontend:** HTML5, CSS3, JavaScript.  
- **Mapas:** [Leaflet.js](https://leafletjs.com/) (visualización de mapas y coordenadas).  
- **Servicios:**  
  - `LocationService.js` → obtiene ubicación actual.  
  - `RouteCalculator.js` → cálculo de rutas siguiendo calles reales.  
  - `MapManager.js` → gestión del mapa, marcadores y líneas.  
  - `FormManager.js` → manejo del formulario de registro de rutas.  
  - `RouteManager.js` → almacenamiento y gestión de rutas guardadas.  
  - `UIManager.js` → actualiza la interfaz según el estado del sistema.  

---

##  Cómo usar la demo

1. Abre el proyecto en tu navegador mediante el siguiente link ([Viajero app Demo](http://viajeroapp-demo.surge.sh/)).  
2. En el formulario lateral:
   - Ingresa nombre, número, horarios y frecuencia de la ruta.  
   - Añade paradas con clic en el mapa o manualmente.  
   - Usa **📍 Mi Ubicación** para agregar tu posición actual.  
   - Haz clic en **🗺️ Calcular Ruta** para generar el camino siguiendo calles reales.  
3. Guarda la ruta y visualízala en la lista lateral.  

---

##  Estado actual

Esta demo es una **primera versión funcional del panel de registro de rutas**, centrada en:
- Captura y almacenamiento de rutas.  
- Visualización de recorridos reales en el mapa.  
