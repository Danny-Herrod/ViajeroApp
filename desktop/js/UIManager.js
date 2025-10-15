// UIManager.js - Gestión de la interfaz de usuario
class UIManager {
    constructor(routeManager) {
        this.routeManager = routeManager;
    }

    // Mostrar indicador de carga
    showLoading(show, message = 'Calculando...') {
        const indicator = document.getElementById('loadingIndicator');
        const btn = document.getElementById('calculateBtn');
        
        if (show) {
            indicator.classList.add('show');
            if (btn) {
                btn.disabled = true;
                btn.textContent = `⏳ ${message}`;
            }
        } else {
            indicator.classList.remove('show');
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🗺️ Calcular Ruta';
            }
        }
    }

    // Mostrar información de ruta
    showRouteInfo(routeInfo) {
        this.clearMessages();
        
        if (!routeInfo) return;
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'route-info';
        infoDiv.innerHTML = `
            <strong>📊 Información de la Ruta:</strong><br>
            🛣️ Distancia: ${routeInfo.distance} km<br>
            ⏱️ Tiempo estimado: ${routeInfo.duration} min<br>
            🗺️ Ruta calculada por calles reales
        `;
        
        this.appendMessage(infoDiv);
    }

    // Mostrar error
    showError(message) {
        this.clearMessages();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        this.appendMessage(errorDiv);
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // Mostrar mensaje de éxito
    showSuccess(message, duration = 3000) {
        this.clearMessages();
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        
        this.appendMessage(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, duration);
    }

    // Limpiar mensajes
    clearMessages() {
        const messages = document.querySelectorAll('.route-info, .error-message, .success-message');
        messages.forEach(msg => msg.remove());
    }

    // Agregar mensaje al DOM
    appendMessage(element) {
        const targetContainer = document.querySelector('.form-group:last-of-type');
        if (targetContainer) {
            targetContainer.appendChild(element);
        }
    }

    // Mostrar lista de rutas
    displayRoutes() {
        const routesList = document.getElementById('routesList');
        const routes = this.routeManager.getAllRoutes();
        
        if (routes.length === 0) {
            routesList.innerHTML = `
                <div class="empty-state">
                    <p>No hay rutas registradas.<br>Agrega tu primera ruta.</p>
                </div>
            `;
            return;
        }
        
        routesList.innerHTML = routes.map((route, index) => 
            this.createRouteListItem(route, index)
        ).join('');
    }

    // Crear elemento de lista de ruta
    createRouteListItem(route, index) {
        return `
            <div class="route-item" onclick="uiManager.handleRouteClick(${index})">
                <h4>${route.name} (${route.number})</h4>
                <div class="info">⏰ ${route.startTime} - ${route.endTime}</div>
                <div class="info">🔄 Cada ${route.frequency} min</div>
                <div class="info">🚏 ${route.paradas.length} paradas</div>
                ${route.distance ? `<div class="info">🛣️ ${route.distance} km</div>` : ''}
                ${route.duration ? `<div class="info">⏱️ ${route.duration} min</div>` : ''}
                <div class="route-controls">
                    <button class="btn btn-secondary btn-small" 
                            onclick="event.stopPropagation(); uiManager.toggleRoute(${index})">
                        ${route.visible ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button class="btn btn-secondary btn-small" 
                            onclick="event.stopPropagation(); uiManager.editRoute(${index})">
                        Editar
                    </button>
                    <button class="btn btn-secondary btn-small" 
                            onclick="event.stopPropagation(); uiManager.deleteRoute(${index})">
                        Eliminar
                    </button>
                </div>
            </div>
        `;
    }

    // Manejar clic en ruta
    handleRouteClick(routeIndex) {
        this.routeManager.showRouteOnMap(routeIndex);
        
        // Resaltar ruta en la lista
        document.querySelectorAll('.route-item').forEach((item, index) => {
            item.classList.toggle('active', index === routeIndex);
        });
    }

    // Alternar visibilidad de ruta
    toggleRoute(routeIndex) {
        this.routeManager.toggleRouteVisibility(routeIndex);
        this.displayRoutes();
    }

    // Editar ruta
    editRoute(routeIndex) {
        const route = this.routeManager.getRoute(routeIndex);
        if (!route) return;
        
        // Llenar formulario con datos de la ruta
        window.formManager.fillFormWithRoute(route);
        
        // Eliminar la ruta original
        this.routeManager.deleteRoute(routeIndex, false);
        
        // Mostrar la ruta en el mapa para edición
        if (route.routeGeometry) {
            window.mapManager.displayPreviewRoute({
                features: [{
                    geometry: {
                        coordinates: route.routeGeometry
                    },
                    properties: {
                        segments: [{
                            distance: route.distance * 1000,
                            duration: route.duration * 60
                        }]
                    }
                }]
            }, route.paradas.map(p => [p.lng, p.lat]));
        }
        
        this.displayRoutes();
        this.showSuccess('Ruta cargada para edición');
    }

    // Eliminar ruta
    deleteRoute(routeIndex) {
        if (this.routeManager.deleteRoute(routeIndex)) {
            this.displayRoutes();
            this.showSuccess('Ruta eliminada correctamente');
        }
    }

    // Mostrar feedback de guardado
    showSaveSuccess(button, hasRouteGeometry = false) {
        const originalText = button.textContent;
        const originalStyle = button.style.background;
        
        button.textContent = hasRouteGeometry ? '✅ Ruta guardada' : '✅ Ruta guardada!';
        button.style.background = 'linear-gradient(45deg, #4caf50, #45a049)';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = originalStyle || 'linear-gradient(45deg, #2196F3, #21CBF3)';
        }, 3000);
    }

    // Agregar botones de importar/exportar
    addImportExportButtons() {
        const lastFormGroup = document.querySelector('.form-group:last-of-type');
        if (!lastFormGroup) return;
        
        // Verificar si ya existen los botones
        if (lastFormGroup.querySelector('.export-btn')) return;
        
        const exportBtn = this.createButton('📤 Exportar Rutas', 'btn-secondary btn-small export-btn', () => {
            this.handleExportRoutes();
        });
        
        const importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = '.json';
        importInput.style.display = 'none';
        importInput.addEventListener('change', (e) => this.handleImportRoutes(e));
        
        const importBtn = this.createButton('📥 Importar Rutas', 'btn-secondary btn-small', () => {
            importInput.click();
        });
        
        lastFormGroup.appendChild(exportBtn);
        lastFormGroup.appendChild(importBtn);
        lastFormGroup.appendChild(importInput);
    }

    // Crear botón
    createButton(text, className, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `btn ${className}`;
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }

    // Manejar exportación de rutas
    handleExportRoutes() {
        try {
            const fileName = this.routeManager.exportRoutes();
            this.showSuccess(`Rutas exportadas como ${fileName}`);
        } catch (error) {
            this.showError(error.message);
        }
    }

    // Manejar importación de rutas
    async handleImportRoutes(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            this.showLoading(true, 'Importando rutas...');
            const importedCount = await this.routeManager.importRoutes(file);
            this.displayRoutes();
            this.showSuccess(`${importedCount} rutas importadas exitosamente.`);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
            // Limpiar el input para permitir importar el mismo archivo nuevamente
            event.target.value = '';
        }
    }

    // Mostrar estadísticas de rutas
    displayRouteStats() {
        const stats = this.routeManager.getRouteStats();
        const statsContainer = document.getElementById('routeStats');
        
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">${stats.totalRoutes}</span>
                    <span class="stat-label">Rutas</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${stats.totalStops}</span>
                    <span class="stat-label">Paradas</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${stats.averageStopsPerRoute}</span>
                    <span class="stat-label">Paradas/Ruta</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${stats.totalDistance} km</span>
                    <span class="stat-label">Distancia Total</span>
                </div>
            </div>
        `;
    }

    // Configurar eventos de UI
    setupUIEvents() {
        // Agregar eventos para tooltips, modales, etc.
        this.setupTooltips();
        this.setupKeyboardShortcuts();
    }

    // Configurar tooltips
    setupTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip);
            element.addEventListener('mouseleave', this.hideTooltip);
        });
    }

    // Mostrar tooltip
    showTooltip(event) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = event.target.dataset.tooltip;
        document.body.appendChild(tooltip);
        
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
    }

    // Ocultar tooltip
    hideTooltip() {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    // Configurar atajos de teclado
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.handleExportRoutes();
                        break;
                    case 'o':
                        e.preventDefault();
                        document.querySelector('input[type="file"]')?.click();
                        break;
                }
            }
        });
    }
}