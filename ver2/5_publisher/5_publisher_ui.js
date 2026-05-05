// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/232
// 5_publisher_ui.js - UI функции модуля Publisher (отображение результатов визуализации)
// issue #234: Объединён с ui-utils.js (стили, масштабирование, панели свойств, клики по узлам)

        function showLoading() {
            const output = document.getElementById('output');
            const resultContainer = document.getElementById('result-container');

            if (resultContainer) resultContainer.style.display = 'block';
            if (output) output.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Обработка RDF данных...</p>
                </div>
            `;

            const exportBtns = document.getElementById('export-buttons');
            const zoomCtrls = document.getElementById('zoom-controls');
            const prefixPanel = document.getElementById('prefixes-panel');
            const legendPanel = document.getElementById('legend-panel');
            if (exportBtns) exportBtns.style.display = 'none';
            if (zoomCtrls) zoomCtrls.style.display = 'none';
            if (prefixPanel) prefixPanel.style.display = 'none';
            if (legendPanel) legendPanel.style.display = 'none';
            // filter-panel removed in minimization
        }

        /**
         * Улучшает сообщение об ошибке парсинга, добавляя содержимое проблемной строки
         * @param {string} errorMessage - Исходное сообщение об ошибке
         * @param {string} rdfInput - Исходные RDF данные
         * @returns {string} - Улучшенное сообщение об ошибке
         */
        function enhanceParseError(errorMessage, rdfInput) {
            // Ищем номер строки в сообщении об ошибке (паттерн "on line N" или "line N")
            const lineMatch = errorMessage.match(/(?:on\s+)?line\s+(\d+)/i);
            if (lineMatch && rdfInput) {
                const lineNumber = parseInt(lineMatch[1], 10);
                const lines = rdfInput.split('\n');
                if (lineNumber > 0 && lineNumber <= lines.length) {
                    const problemLine = lines[lineNumber - 1];
                    return `${errorMessage}\nСтрока ${lineNumber}: ${problemLine}`;
                }
            }
            return errorMessage;
        }

        function showError(message) {
            const output = document.getElementById('output');
            const resultContainer = document.getElementById('result-container');
            const vadTrigOutput = document.getElementById('vad-trig-output');
            const vadTrigContainer = document.getElementById('vad-trig-container');

            if (resultContainer) resultContainer.style.display = 'block';
            // Заменяем переносы строк на <br> для корректного отображения в HTML
            const formattedMessage = message.replace(/\n/g, '<br>');
            const errorHtml = `<div class="error"><strong>Ошибка:</strong> ${formattedMessage}</div>`;

            // Если активен режим VAD-TriG, показываем ошибку также в его контейнере
            const isVadTrigMode = vadTrigContainer && vadTrigContainer.style.display !== 'none';
            if (isVadTrigMode && vadTrigOutput) {
                vadTrigOutput.innerHTML = errorHtml;
            }

            // Всегда показываем ошибку в основном output (для не-VAD-TriG режимов или при переключении)
            if (output) output.innerHTML = errorHtml;

            // Скрываем VAD-TriG панели при ошибке, чтобы показать основной output
            if (typeof toggleVADTriGPanels === 'function') toggleVADTriGPanels(false);

            const exportBtns2 = document.getElementById('export-buttons');
            const zoomCtrls2 = document.getElementById('zoom-controls');
            const prefixPanel2 = document.getElementById('prefixes-panel');
            const legendPanel2 = document.getElementById('legend-panel');
            if (exportBtns2) exportBtns2.style.display = 'none';
            if (zoomCtrls2) zoomCtrls2.style.display = 'none';
            if (prefixPanel2) prefixPanel2.style.display = 'none';
            if (legendPanel2) legendPanel2.style.display = 'none';
            // filter-panel removed in minimization
        }

        function showValidationError(message) {
            const output = document.getElementById('output');
            const resultContainer = document.getElementById('result-container');
            const vadTrigOutput = document.getElementById('vad-trig-output');
            const vadTrigContainer = document.getElementById('vad-trig-container');

            if (resultContainer) resultContainer.style.display = 'block';
            const errorHtml = `<div class="validation-error">${message}</div>`;

            // Если активен режим VAD-TriG, показываем ошибку также в его контейнере
            const isVadTrigMode = vadTrigContainer && vadTrigContainer.style.display !== 'none';
            if (isVadTrigMode && vadTrigOutput) {
                vadTrigOutput.innerHTML = errorHtml;
            }

            // Всегда показываем ошибку в основном output (для не-VAD-TriG режимов или при переключении)
            if (output) output.innerHTML = errorHtml;

            // Скрываем VAD-TriG панели при ошибке, чтобы показать основной output
            if (typeof toggleVADTriGPanels === 'function') toggleVADTriGPanels(false);

            const exportBtns3 = document.getElementById('export-buttons');
            const zoomCtrls3 = document.getElementById('zoom-controls');
            const prefixPanel3 = document.getElementById('prefixes-panel');
            const legendPanel3 = document.getElementById('legend-panel');
            if (exportBtns3) exportBtns3.style.display = 'none';
            if (zoomCtrls3) zoomCtrls3.style.display = 'none';
            if (prefixPanel3) prefixPanel3.style.display = 'none';
            if (legendPanel3) legendPanel3.style.display = 'none';
            // filter-panel removed in minimization
        }

        /**
         * Показывает или скрывает панели VAD TriG режима
         * @param {boolean} show - Показать или скрыть
         */
        function toggleVADTriGPanels(show) {
            const vadTrigContainer = document.getElementById('vad-trig-container');
            const regularZoomContainer = document.getElementById('zoom-container');
            const regularZoomControls = document.getElementById('zoom-controls');
            const regularOutput = document.getElementById('output');

            if (vadTrigContainer) {
                vadTrigContainer.style.display = show ? 'flex' : 'none';
            }

            // Hide regular zoom container and clear output when showing VAD TriG panels
            if (regularZoomContainer) {
                regularZoomContainer.style.display = show ? 'none' : 'block';
            }
            if (regularZoomControls && show) {
                regularZoomControls.style.display = 'none';
            }
            if (regularOutput && show) {
                regularOutput.innerHTML = '';
            }
        }

// ============================================================================
// ФУНКЦИИ РАБОТЫ СО СТИЛЯМИ (перемещено из ui-utils.js, issue #234)
// ============================================================================

const BaseStyles = {
    literal: 'shape="box" style="filled" fillcolor="#ffffcc"',
    blankNode: 'shape="ellipse" style="filled" fillcolor="#e0e0e0"',
    uri: 'shape="ellipse" style="filled" fillcolor="#cce5ff"',
    edge: ''
};

function getNodeStyle(nodeUri, isLiteral, isBlankNode) {
    if (currentMode === 'base') {
        if (isLiteral) return BaseStyles.literal;
        if (isBlankNode) return BaseStyles.blankNode;
        return BaseStyles.uri;
    }

    if (currentMode === 'aggregation') {
        if (isBlankNode) return AggregationNodeStyles['BlankNodeStyle'].dot;
        // issue #334: Используем getNodeTypes() вместо nodeTypesCache
        const nodeTypes = getNodeTypes(nodeUri);
        for (const [styleName, styleConfig] of Object.entries(AggregationNodeStyles)) {
            if (styleName === 'default') continue;
            for (const type of styleConfig.types) {
                if (type.startsWith('_')) continue;
                if (nodeTypes.includes(type)) return styleConfig.dot;
            }
        }
        return AggregationNodeStyles['default'].dot;
    }

    if (currentMode === 'vad' || currentMode === 'vad-trig') {
        if (isBlankNode) return VADNodeStyles['default'].dot;
        // issue #334: Используем getNodeTypes() и getNodeSubtypes() вместо кэшей
        const nodeTypes = getNodeTypes(nodeUri);
        const nodeSubtypes = getNodeSubtypes(nodeUri);

        // First, check styles that have subtypes defined (DetailedChild, DetailedExternal, notDetailedChild, notDetailedExternal, NotDefinedType, Detailed, notDetailed)
        for (const [styleName, styleConfig] of Object.entries(VADNodeStyles)) {
            if (styleName === 'default') continue;
            if (!styleConfig.subtypes) continue; // Skip styles without subtypes

            // Check if node has matching type
            const hasMatchingType = styleConfig.types.some(type => nodeTypes.includes(type));
            if (!hasMatchingType) continue;

            // Check if node has matching subtype
            const hasMatchingSubtype = styleConfig.subtypes.some(subtype => nodeSubtypes.includes(subtype));
            if (hasMatchingSubtype) return styleConfig.dot;
        }

        // Then, check styles without subtypes (ExecutorGroupStyle, ExecutorStyle, etc.)
        for (const [styleName, styleConfig] of Object.entries(VADNodeStyles)) {
            if (styleName === 'default') continue;
            if (styleConfig.subtypes) continue; // Skip styles with subtypes (already checked)

            for (const type of styleConfig.types) {
                if (nodeTypes.includes(type)) return styleConfig.dot;
            }
        }

        // For Process nodes without explicit subtype, default to notDetailedChild style
        // (ProcessStyleBasic не определён, используем стиль не детализированного подпроцесса как fallback)
        const isProcess = nodeTypes.some(t =>
            t === 'vad:TypeProcess' || t === 'http://example.org/vad#TypeProcess'
        );
        if (isProcess) {
            return VADNodeStyles['ProcessStyleNotDetailedChild'].dot;
        }

        return VADNodeStyles['default'].dot;
    }

    // Режим нотации
    if (isLiteral) return StyleName.nodeStyles['LiteralStyle'].dot;
    if (isBlankNode) return StyleName.nodeStyles['BlankNodeStyle'].dot;

    // issue #334: Используем getNodeTypes() вместо nodeTypesCache
    const nodeTypes = getNodeTypes(nodeUri);
    for (const [styleName, styleConfig] of Object.entries(StyleName.nodeStyles)) {
        if (styleName === 'default') continue;
        for (const type of styleConfig.types) {
            if (type.startsWith('_')) continue;
            if (nodeTypes.includes(type)) return styleConfig.dot;
        }
    }
    return StyleName.nodeStyles['default'].dot;
}

function getEdgeStyle(predicateUri, predicateLabel) {
    if (currentMode === 'base') return BaseStyles.edge;

    if (currentMode === 'vad') {
        for (const [styleName, styleConfig] of Object.entries(VADEdgeStyles)) {
            if (styleName === 'default') continue;
            for (const predicate of styleConfig.predicates) {
                if (predicateUri === predicate || predicateLabel === predicate) {
                    return styleConfig.dot;
                }
            }
        }
        return VADEdgeStyles['default'].dot;
    }

    // Режим нотации или агрегации
    for (const [styleName, styleConfig] of Object.entries(StyleName.edgeStyles)) {
        if (styleName === 'default') continue;
        for (const predicate of styleConfig.predicates) {
            if (predicateUri === predicate || predicateLabel === predicate) {
                return styleConfig.dot;
            }
        }
    }
    return StyleName.edgeStyles['default'].dot;
}

// issue #334: buildNodeTypesCache удалён - заменён на getNodeTypes() и getNodeSubtypes() в vadlib.js
// issue #334: updateSubtypesCacheFromVirtualData удалён - более не требуется, т.к. getNodeSubtypes()
// напрямую получает данные из currentStore

// ============================================================================
// ФУНКЦИИ МАСШТАБИРОВАНИЯ (перемещено из ui-utils.js, issue #234)
// ============================================================================

function applyZoom() {
    // Применяем масштаб к обоим контейнерам (обычный и VAD TriG)
    const zoomContent = document.getElementById('zoom-content');
    const zoomLevel = document.getElementById('zoom-level');
    const vadTrigZoomContent = document.getElementById('vad-trig-zoom-content');
    const vadTrigZoomLevel = document.getElementById('vad-trig-zoom-level');

    if (zoomContent) zoomContent.style.transform = `scale(${currentScale})`;
    if (zoomLevel) zoomLevel.textContent = Math.round(currentScale * 100) + '%';
    if (vadTrigZoomContent) vadTrigZoomContent.style.transform = `scale(${currentScale})`;
    if (vadTrigZoomLevel) vadTrigZoomLevel.textContent = Math.round(currentScale * 100) + '%';
}

function zoomIn() {
    if (currentScale < 3.0) { currentScale += 0.1; applyZoom(); }
}

function zoomOut() {
    if (currentScale > 0.1) { currentScale -= 0.1; applyZoom(); }
}

function zoomReset() {
    currentScale = 1.0;
    applyZoom();
}

function zoomFit() {
    // Определяем, какой контейнер сейчас активен
    const vadTrigContainer = document.getElementById('vad-trig-container');
    const isVadTrigMode = vadTrigContainer && vadTrigContainer.style.display !== 'none';

    let zoomContainer, output;
    if (isVadTrigMode) {
        zoomContainer = document.getElementById('vad-trig-zoom-container');
        output = document.getElementById('vad-trig-output');
    } else {
        zoomContainer = document.getElementById('zoom-container');
        output = document.getElementById('output');
    }

    const svg = output ? output.querySelector('svg') : null;
    if (!zoomContainer || !svg) return;

    const containerWidth = zoomContainer.clientWidth - 20;
    const containerHeight = zoomContainer.clientHeight - 20;

    let svgWidth = parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
    let svgHeight = parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height;

    const widthStr = svg.getAttribute('width') || '';
    const heightStr = svg.getAttribute('height') || '';
    if (widthStr.includes('pt')) svgWidth = parseFloat(widthStr) * 1.33;
    if (heightStr.includes('pt')) svgHeight = parseFloat(heightStr) * 1.33;

    const scaleX = containerWidth / svgWidth;
    const scaleY = containerHeight / svgHeight;
    currentScale = Math.min(scaleX, scaleY, 1.0);
    applyZoom();
}

// ============================================================================
// ФУНКЦИИ ПАНЕЛИ СВОЙСТВ УЗЛА (перемещено из ui-utils.js, issue #234)
// ============================================================================

function closePropertiesPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.remove();
        openPropertiesPanels = openPropertiesPanels.filter(p => p.id !== panelId);
    }
    if (selectedNodeElement) {
        selectedNodeElement.classList.remove('selected');
        selectedNodeElement = null;
    }
}

function closeAllPropertiesPanels() {
    const container = document.getElementById('properties-panels-container');
    if (container) container.innerHTML = '';
    openPropertiesPanels = [];
    if (selectedNodeElement) {
        selectedNodeElement.classList.remove('selected');
        selectedNodeElement = null;
    }
}

function getNodeProperties(nodeUri) {
    const properties = [];
    // issue #324: Используем currentStore вместо currentQuads
    const allQuads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
    allQuads.forEach(quad => {
        if (quad.subject.value === nodeUri) {
            const predicateLabel = getPrefixedName(quad.predicate.value, currentPrefixes);
            const isLiteral = quad.object.termType === 'Literal';
            const objectLabel = isLiteral
                ? `"${quad.object.value}"`
                : getPrefixedName(quad.object.value, currentPrefixes);
            const graphUri = quad.graph ? quad.graph.value : null;

            properties.push({
                predicate: quad.predicate.value,
                predicateLabel: predicateLabel,
                object: quad.object.value,
                objectLabel: objectLabel,
                isLiteral: isLiteral,
                graphUri: graphUri
            });
        }
    });
    return properties;
}

function showNodeProperties(nodeUri, nodeLabel) {
    const container = document.getElementById('properties-panels-container');
    if (!container) return;

    const existingPanel = openPropertiesPanels.find(p => p.uri === nodeUri);
    if (existingPanel) {
        const panel = document.getElementById(existingPanel.id);
        if (panel) bringPanelToFront(panel);
        return;
    }

    propertiesPanelCounter++;
    const panelId = 'properties-panel-' + propertiesPanelCounter;

    const offsetMultiplier = openPropertiesPanels.length % 5;
    const rightOffset = 20 + (offsetMultiplier * 30);
    const topOffset = 100 + (offsetMultiplier * 30);

    const properties = getNodeProperties(nodeUri);

    // Разделяем свойства на индивидуальные (из текущего TriG) и концептные (из ptree)
    const trigProperties = [];
    const conceptProperties = [];
    const seenTrigProps = new Set();
    const seenConceptProps = new Set();

    // issue #336: Определяем тип объекта для кнопки Методы
    let objectMethodType = null;  // 'isSubprocessTrig' или 'ExecutorGroup'

    properties.forEach(prop => {
        // Создаём уникальный ключ для дедупликации
        const propKey = `${prop.predicateLabel}|${prop.objectLabel}`;

        // issue #336: Определяем тип объекта по предикатам
        if (prop.predicate === 'http://example.org/vad#isSubprocessTrig' || prop.predicateLabel === 'vad:isSubprocessTrig') {
            objectMethodType = 'isSubprocessTrig';
        }
        if (prop.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
            if (prop.object === 'http://example.org/vad#ExecutorGroup' || prop.objectLabel === 'vad:ExecutorGroup') {
                objectMethodType = 'ExecutorGroup';
            }
        }

        if (prop.graphUri === PTREE_GRAPH_URI) {
            // Дедупликация свойств концепта
            if (!seenConceptProps.has(propKey)) {
                seenConceptProps.add(propKey);
                conceptProperties.push(prop);
            }
        } else if (selectedTrigUri && prop.graphUri === selectedTrigUri) {
            // Дедупликация свойств индивида
            if (!seenTrigProps.has(propKey)) {
                seenTrigProps.add(propKey);
                trigProperties.push(prop);
            }
        } else {
            // Если нет выбранного TriG, показываем все не-ptree свойства
            if (!selectedTrigUri) {
                if (!seenTrigProps.has(propKey)) {
                    seenTrigProps.add(propKey);
                    trigProperties.push(prop);
                }
            }
        }
    });

    let propertiesHtml = '';

    // Блок 1: Свойства индивида из текущего TriG
    if (trigProperties.length === 0 && conceptProperties.length === 0) {
        propertiesHtml = '<div class="properties-empty">У этого узла нет свойств</div>';
    } else {
        trigProperties.forEach(prop => {
            propertiesHtml += '<div class="property-item">';
            propertiesHtml += `<div class="property-predicate">${prop.predicateLabel}</div>`;
            propertiesHtml += `<div class="property-value ${prop.isLiteral ? 'literal' : 'uri'}">${prop.objectLabel}</div>`;
            propertiesHtml += '</div>';
        });
    }

    // issue #324, issue #355: Добавляем VirtualTriG секцию (вычисляемые свойства) из store
    // Унифицированный подход: получаем ВСЕ свойства узла из Virtual TriG (processSubtype, rdfs:label и др.)
    const virtualTrigProperties = [];
    if (selectedTrigUri && currentStore) {
        // Формируем URI виртуального TriG
        const virtualTrigUri = selectedTrigUri.replace('#t_', '#vt_');

        // issue #355: Получаем ВСЕ свойства для данного узла из Virtual TriG (унифицированный подход)
        const virtualQuads = currentStore.getQuads(nodeUri, null, null, virtualTrigUri);
        virtualQuads.forEach(quad => {
            // Пропускаем rdf:type и vad:hasParentObj - это метаданные графа
            const predicateUri = quad.predicate.value;
            if (predicateUri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' ||
                predicateUri === 'http://example.org/vad#hasParentObj') {
                return;
            }

            const predicateLabel = getPrefixedName(predicateUri, currentPrefixes);
            const isLiteral = quad.object.termType === 'Literal';
            let objectLabel;
            if (isLiteral) {
                objectLabel = `"${quad.object.value}"`;
            } else {
                // Для URI объектов извлекаем локальное имя для более читабельного отображения
                const fullPrefixed = getPrefixedName(quad.object.value, currentPrefixes);
                objectLabel = fullPrefixed;
            }

            virtualTrigProperties.push({
                predicateLabel: predicateLabel,
                objectLabel: objectLabel,
                isLiteral: isLiteral
            });
        });
    }

    if (virtualTrigProperties.length > 0) {
        // Добавляем разделитель
        propertiesHtml += '<div class="trig-property-separator" style="margin-top: 15px;">';
        propertiesHtml += '<div class="separator-line"></div>';
        propertiesHtml += '<div class="separator-text">Virtual TriG</div>';
        propertiesHtml += '<div class="separator-line"></div>';
        propertiesHtml += '</div>';

        virtualTrigProperties.forEach(prop => {
            propertiesHtml += '<div class="property-item" style="margin-top: 10px;">';
            propertiesHtml += `<div class="property-predicate">${prop.predicateLabel}</div>`;
            propertiesHtml += `<div class="property-value ${prop.isLiteral ? 'literal' : 'uri'}" style="color: #6a1b9a; font-style: italic;">${prop.objectLabel}</div>`;
            propertiesHtml += '</div>';
        });
    }

    // Блок 3: Свойства концепта из ptree (отделённые линией)
    if (conceptProperties.length > 0) {
        // Добавляем разделитель
        propertiesHtml += '<div class="trig-property-separator" style="margin-top: 15px;">';
        propertiesHtml += '<div class="separator-line"></div>';
        propertiesHtml += '<div class="separator-text">Свойства концепта (ptree)</div>';
        propertiesHtml += '<div class="separator-line"></div>';
        propertiesHtml += '</div>';

        conceptProperties.forEach(prop => {
            propertiesHtml += '<div class="property-item concept-property" style="margin-top: 10px;">';
            propertiesHtml += `<div class="property-predicate">${prop.predicateLabel}</div>`;
            propertiesHtml += `<div class="property-value ${prop.isLiteral ? 'literal' : 'uri'}">${prop.objectLabel}</div>`;
            propertiesHtml += '</div>';
        });
    }

    // issue #334: Используем getNodeTypes() вместо nodeTypesCache
    const nodeTypes = getNodeTypes(nodeUri);
    if (nodeTypes.length > 0) {
        const prefixedTypes = nodeTypes.filter(t => t.includes(':') && !t.startsWith('http'));
        if (prefixedTypes.length > 0) {
            propertiesHtml += '<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd;">';
            propertiesHtml += '<div style="font-size: 12px; color: #666; margin-bottom: 5px;">Тип узла:</div>';
            prefixedTypes.forEach(type => {
                propertiesHtml += `<span class="properties-type-badge">${type}</span> `;
            });
            propertiesHtml += '</div>';
        }
    }

    const escapedNodeLabel = nodeLabel.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const escapedNodeUri = nodeUri.replace(/'/g, "\\'");
    const escapedTrigUri = selectedTrigUri ? selectedTrigUri.replace(/'/g, "\\'") : '';

    // issue #336: Генерируем кнопку Методы если есть тип объекта и контекст TriG
    // issue #390: Добавлена всплывающая подсказка (title) для кнопки Методы
    let methodsButtonHtml = '';
    if (objectMethodType && selectedTrigUri) {
        methodsButtonHtml = `<button class="methods-btn" onclick="event.stopPropagation(); toggleMethodsDropdown(event, '${escapedNodeUri}', '${escapedTrigUri}', '${objectMethodType}')" title="Методы объекта">Методы</button>`;
    }

    const panelHtml = `
        <div class="properties-panel visible" id="${panelId}" style="right: ${rightOffset}px; top: ${topOffset}px;">
            <div class="properties-header" onmousedown="startDragPanel(event, '${panelId}')">
                <div class="properties-header-content">
                    <div class="properties-header-title">Свойство объекта диаграммы</div>
                    <div class="properties-header-row">
                        <h3>${nodeLabel}</h3>
                        <button class="properties-copy-btn" onclick="event.stopPropagation(); copyObjectId('${escapedNodeLabel}', this)">Копировать</button>
                        ${methodsButtonHtml}
                    </div>
                </div>
                <button class="properties-close-btn" onclick="closePropertiesPanel('${panelId}')">&times;</button>
            </div>
            <div class="properties-content">
                ${propertiesHtml}
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', panelHtml);
    openPropertiesPanels.push({ id: panelId, uri: nodeUri, label: nodeLabel });

    const newPanel = document.getElementById(panelId);
    if (newPanel) bringPanelToFront(newPanel);
}

function bringPanelToFront(panel) {
    let maxZIndex = 1000;
    openPropertiesPanels.forEach(p => {
        const el = document.getElementById(p.id);
        if (el) {
            const z = parseInt(el.style.zIndex) || 1000;
            if (z > maxZIndex) maxZIndex = z;
        }
    });
    panel.style.zIndex = maxZIndex + 1;
}

function startDragPanel(event, panelId) {
    if (event.target.classList.contains('properties-close-btn')) return;
    const panel = document.getElementById(panelId);
    if (!panel) return;

    draggedPanel = panel;
    const rect = panel.getBoundingClientRect();
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;

    bringPanelToFront(panel);
    document.addEventListener('mousemove', dragPanel);
    document.addEventListener('mouseup', stopDragPanel);
    event.preventDefault();
}

function dragPanel(event) {
    if (!draggedPanel) return;
    const newLeft = event.clientX - dragOffsetX;
    const newTop = event.clientY - dragOffsetY;
    draggedPanel.style.left = newLeft + 'px';
    draggedPanel.style.top = newTop + 'px';
    draggedPanel.style.right = 'auto';
}

function stopDragPanel() {
    draggedPanel = null;
    document.removeEventListener('mousemove', dragPanel);
    document.removeEventListener('mouseup', stopDragPanel);
}

// ============================================================================
// ФУНКЦИИ ДЛЯ КЛИКОВ ПО УЗЛАМ (перемещено из ui-utils.js, issue #234)
// ============================================================================

function addNodeClickHandlers() {
    // Add click handlers to both regular output and VAD TriG output
    const regularSvg = document.querySelector('#output svg');
    const vadTrigSvg = document.querySelector('#vad-trig-output svg');

    const svgElements = [regularSvg, vadTrigSvg].filter(svg => svg !== null);

    svgElements.forEach(svg => {
        const nodes = svg.querySelectorAll('.node');
        nodes.forEach(node => {
            node.addEventListener('click', handleNodeClick);
            node.addEventListener('dblclick', handleNodeDoubleClick);
        });
    });
}

function handleNodeClick(event) {
    const nodeElement = event.currentTarget;
    const titleElement = nodeElement.querySelector('title');
    if (!titleElement) return;

    const dotId = titleElement.textContent;

    let nodeUri = null;
    let nodeLabel = null;

    for (const [label, info] of Object.entries(nodeLabelToUri)) {
        if (info.dotId === dotId) {
            nodeUri = info.uri;
            nodeLabel = label;
            break;
        }
    }

    if (!nodeUri) return;

    // НЕ снимаем выделение с элемента TriG-дерева при клике на узел диаграммы.
    // Выделенный элемент TriG дерева всегда должен отражать, чья схема отображается на диаграмме.
    // Снимаем только выделение с процессов в списке "Состав объектов" и подсветку на диаграмме.
    const processItems = document.querySelectorAll('.process-item.process-selected');
    processItems.forEach(item => {
        item.classList.remove('process-selected');
    });
    const highlightedProcesses = document.querySelectorAll('.node.process-highlighted');
    highlightedProcesses.forEach(node => {
        node.classList.remove('process-highlighted');
    });

    if (selectedNodeElement) {
        selectedNodeElement.classList.remove('selected');
    }
    nodeElement.classList.add('selected');
    selectedNodeElement = nodeElement;

    showNodeProperties(nodeUri, nodeLabel);
}

/**
 * Обработчик двойного клика по узлу диаграммы
 * Для процессов с подтипом "Детализированный" (vad:Detailed) открывает соответствующую схему TriG
 * @param {Event} event - Событие двойного клика
 */
function handleNodeDoubleClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const nodeElement = event.currentTarget;
    const titleElement = nodeElement.querySelector('title');
    if (!titleElement) return;

    const dotId = titleElement.textContent;

    let nodeUri = null;
    let nodeLabel = null;

    for (const [label, info] of Object.entries(nodeLabelToUri)) {
        if (info.dotId === dotId) {
            nodeUri = info.uri;
            nodeLabel = label;
            break;
        }
    }

    if (!nodeUri) return;

    // Ищем свойство vad:hasTrig для данного узла
    const hasTrigPredicate = 'http://example.org/vad#hasTrig';
    let targetTrigUri = null;

    // Сначала проверяем в vad:ptree (там хранятся метаданные процессов, включая hasTrig)
    if (trigHierarchy && trigHierarchy[PTREE_GRAPH_URI]) {
        const ptreeQuads = trigHierarchy[PTREE_GRAPH_URI].quads;
        for (const quad of ptreeQuads) {
            if (quad.subject.value === nodeUri && quad.predicate.value === hasTrigPredicate) {
                targetTrigUri = quad.object.value;
                break;
            }
        }
    }

    // Если не найдено в ptree, проверяем в текущем графе или во всех графах
    if (!targetTrigUri) {
        // issue #324: Используем currentStore вместо currentQuads
        const quadsToCheck = selectedTrigUri && trigHierarchy[selectedTrigUri]
            ? trigHierarchy[selectedTrigUri].quads
            : (currentStore ? currentStore.getQuads(null, null, null, null) : []);

        for (const quad of quadsToCheck) {
            if (quad.subject.value === nodeUri && quad.predicate.value === hasTrigPredicate) {
                targetTrigUri = quad.object.value;
                break;
            }
        }
    }

    // Если найден связанный TriG, открываем его
    if (targetTrigUri && trigHierarchy[targetTrigUri]) {
        selectTriG(targetTrigUri);
    }
}

/**
 * Снимает выделение со всех элементов TriG-дерева
 */
function clearTriGTreeSelection() {
    // Снимаем выделение с TriG-элементов дерева
    const treeItems = document.querySelectorAll('.trig-tree-item');
    treeItems.forEach(item => {
        item.classList.remove('selected', 'active');
    });

    // Снимаем выделение с процессов в дереве
    const processItems = document.querySelectorAll('.process-item.process-selected');
    processItems.forEach(item => {
        item.classList.remove('process-selected');
    });

    // Снимаем подсветку процесса на диаграмме
    const highlightedProcesses = document.querySelectorAll('.node.process-highlighted');
    highlightedProcesses.forEach(node => {
        node.classList.remove('process-highlighted');
    });
}

