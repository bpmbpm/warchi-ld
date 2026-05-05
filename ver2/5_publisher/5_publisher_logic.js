// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/232
// 5_publisher_logic.js - Основная логика визуализации модуля Publisher

        // ============================================================================
        // ОСНОВНАЯ ФУНКЦИЯ ВИЗУАЛИЗАЦИИ
        // ============================================================================

        async function visualize() {
            const rdfInput = document.getElementById('rdf-input').value.trim();
            const inputFormat = document.getElementById('input-format').value;
            const outputFormat = document.getElementById('output-format').value;
            const layoutEngine = document.getElementById('layout-engine').value;
            const visualizationMode = document.getElementById('visualization-mode').value;

            const maxLabelLengthInput = document.getElementById('max-label-length');
            const maxLabelLengthValue = parseInt(maxLabelLengthInput.value, 10);
            if (!isNaN(maxLabelLengthValue) && maxLabelLengthValue >= 5 && maxLabelLengthValue <= 200) {
                currentMaxLabelLength = maxLabelLengthValue;
            } else {
                currentMaxLabelLength = DEFAULT_MAX_LABEL_LENGTH;
                maxLabelLengthInput.value = DEFAULT_MAX_LABEL_LENGTH;
            }

            // Чтение параметра "Макс. длина VAD" для режима VAD
            const maxVadRowLengthInput = document.getElementById('max-vad-row-length');
            const maxVadRowLengthValue = parseInt(maxVadRowLengthInput.value, 10);
            if (!isNaN(maxVadRowLengthValue) && maxVadRowLengthValue >= 2 && maxVadRowLengthValue <= 20) {
                currentMaxVadRowLength = maxVadRowLengthValue;
            } else {
                currentMaxVadRowLength = DEFAULT_MAX_VAD_ROW_LENGTH;
                maxVadRowLengthInput.value = DEFAULT_MAX_VAD_ROW_LENGTH;
            }

            currentMode = visualizationMode;

            // issue #270, #276: В режиме vad-trig, если данные уже загружены (trigHierarchy не пустой),
            // Кнопка "Обновить" должна ревизуализировать текущий выбранный TriG,
            // не перепарсивая textarea (который может содержать отфильтрованные данные).
            // Фильтр quadstore влияет только на отображение в textarea, не на Publisher.
            if (visualizationMode === 'vad-trig' &&
                trigHierarchy && Object.keys(trigHierarchy).length > 0 &&
                selectedTrigUri && trigHierarchy[selectedTrigUri]) {
                // Данные уже загружены, делаем ревизуализацию выбранного TriG
                console.log('issue #270: Re-visualizing existing data for TriG:', selectedTrigUri);
                await revisualizeTrigVAD(selectedTrigUri);
                return;
            }

            if (!rdfInput) {
                showError('Пожалуйста, введите RDF данные');
                return;
            }

            showLoading();

            // issue #276: Кнопка теперь называется refresh-btn и находится в Publisher
            const button = document.getElementById('refresh-btn');
            if (button) {
                button.disabled = true;
                button.textContent = 'Обработка...';
            }

            try {
                const parser = new N3.Parser({ format: inputFormat });
                const quads = [];
                let prefixes = {};

                await new Promise((resolve, reject) => {
                    parser.parse(rdfInput, (error, quad, parsedPrefixes) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        if (quad) {
                            quads.push(quad);
                        } else {
                            if (parsedPrefixes) {
                                prefixes = parsedPrefixes;
                            }
                            resolve();
                        }
                    });
                });

                currentPrefixes = prefixes;

                // issue #324: Инициализируем currentStore (единственное хранилище)
                currentStore = new N3.Store();
                quads.forEach(quad => currentStore.addQuad(quad));

                // issue #260: Добавляем технологические квады в общий quadstore (Вариант 2)
                if (typeof addTechQuadsToStore === 'function') {
                    addTechQuadsToStore();
                }

                // issue #359: Добавляем квады базовой онтологии VAD для semantic reasoning
                if (typeof addVADOntologyQuadsToStore === 'function') {
                    addVADOntologyQuadsToStore();
                }

                // issue #260: Обновляем отображение quadstore с учётом текущего фильтра
                if (typeof updateQuadstoreDisplay === 'function') {
                    updateQuadstoreDisplay();
                }

                if (quads.length === 0) {
                    showError('Не найдено RDF триплетов в данных');
                    return;
                }

                // Валидация для режима VAD
                if (currentMode === 'vad') {
                    const validation = validateVAD(quads, prefixes);
                    if (!validation.valid) {
                        showValidationError(formatVADErrors(validation.errors));
                        if (button) {
                            button.disabled = false;
                            button.textContent = 'Обновить';
                        }
                        return;
                    }
                }

                // Обработка режима VAD TriG
                if (currentMode === 'vad-trig') {
                    // Парсим иерархию TriG графов
                    const hierarchyResult = parseTriGHierarchy(quads, prefixes);

                    if (!hierarchyResult.valid) {
                        showValidationError(formatVADTriGErrors(hierarchyResult.errors));
                        toggleVADTriGPanels(false);
                        if (button) {
                            button.disabled = false;
                            button.textContent = 'Обновить';
                        }
                        return;
                    }

                    // Сохраняем иерархию
                    trigHierarchy = hierarchyResult.hierarchy;

                    // issue #324: Вычисляем Virtual TriG через recalculateAllVirtualTriGs
                    // (виртуальные данные хранятся напрямую в store, без virtualRDFdata)
                    if (typeof recalculateAllVirtualTriGs === 'function') {
                        await recalculateAllVirtualTriGs(prefixes);
                    }

                    // issue #270: Обновляем отображение quadstore с виртуальными данными
                    if (typeof updateQuadstoreDisplay === 'function') {
                        updateQuadstoreDisplay();
                    }

                    // Выбираем корневой TriG для начального отображения
                    // Используем первый из корневых TriG, если есть
                    selectedTrigUri = hierarchyResult.rootTrigUris.length > 0 ? hierarchyResult.rootTrigUris[0] : null;

                    // Показываем панели VAD TriG
                    toggleVADTriGPanels(true);

                    // Отображаем дерево TriG (передаём массив всех корневых TriG)
                    displayTriGTree(trigHierarchy, hierarchyResult.rootTrigUris, prefixes);

                    // Отображаем свойства корневого TriG
                    if (selectedTrigUri) {
                        displayTriGProperties(selectedTrigUri, trigHierarchy, prefixes);
                    }

                    // Валидация VAD для квадов корневого графа
                    const rootGraphInfo = trigHierarchy[selectedTrigUri];

                    // issue #270: Проверка существования rootGraphInfo и его quads перед использованием
                    if (!rootGraphInfo || !rootGraphInfo.quads) {
                        console.warn('issue #270: rootGraphInfo или rootGraphInfo.quads отсутствует для:', selectedTrigUri);
                        showError('Не удалось найти данные для выбранного TriG');
                        if (button) {
                            button.disabled = false;
                            button.textContent = 'Обновить';
                        }
                        return;
                    }

                    const validation = validateVAD(rootGraphInfo.quads, prefixes);
                    if (!validation.valid) {
                        showValidationError(formatVADErrors(validation.errors));
                        if (button) {
                            button.disabled = false;
                            button.textContent = 'Обновить';
                        }
                        return;
                    }

                    // Продолжаем с квадами только из выбранного графа
                    activeFilters = [...getFilterConfig('vad').hiddenPredicates];

                    const filteredQuads = rootGraphInfo.quads.filter(quad => {
                        const predicateUri = quad.predicate.value;
                        const predicateLabel = getPrefixedName(predicateUri, prefixes);
                        return !isPredicateHidden(predicateUri, predicateLabel);
                    });

                    // Временно переключаемся в режим VAD для генерации DOT
                    // issue #324: Не используем currentQuads, работаем напрямую с графовыми квадами
                    currentMode = 'vad';

                    const dotCode = rdfToDot(filteredQuads, prefixes);
                    currentDotCode = dotCode;
                    console.log('VAD TriG - Сгенерированный DOT-код:', dotCode);

                    currentMode = 'vad-trig';

                    const viz = await Viz.instance();
                    const svgString = await viz.renderString(dotCode, {
                        format: 'svg',
                        engine: layoutEngine
                    });

                    // В режиме VAD TriG используем специальный контейнер vad-trig-output
                    const output = document.getElementById('vad-trig-output');
                    currentScale = 1.0;
                    applyZoom();

                    if (outputFormat === 'svg') {
                        output.innerHTML = svgString;
                        currentSvgElement = output.querySelector('svg');
                        document.getElementById('export-buttons').style.display = 'block';
                        document.getElementById('vad-trig-zoom-controls').style.display = 'flex';
                    } else if (outputFormat === 'png') {
                        const pngDataUrl = await svgToPng(svgString);
                        output.innerHTML = `<img src="${pngDataUrl}" alt="RDF Graph" style="max-width: 100%;">`;
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = svgString;
                        currentSvgElement = tempDiv.querySelector('svg');
                        document.getElementById('export-buttons').style.display = 'block';
                        document.getElementById('vad-trig-zoom-controls').style.display = 'flex';
                    }

                    displayLegend();
                    displayPrefixes(prefixes);
                    displayFilters();
                    addNodeClickHandlers();
                    closeAllPropertiesPanels();

                    // Обновляем SPARQL запрос для выбранного TriG
                    updateSparqlQueryForTriG();

                    // Обновляем выпадающие списки Smart Design, если режим активен
                    if (document.getElementById('sparql-mode').value === 'smart-design') {
                        populateSmartDesignDropdowns();
                    }

                    console.log(`VAD TriG: Обработано ${quads.length} триплетов, отображается граф ${getPrefixedName(selectedTrigUri, prefixes)}`);

                    if (button) {
                        button.disabled = false;
                        button.textContent = 'Обновить';
                    }
                    return;
                }

                // Скрываем панели VAD TriG для других режимов
                toggleVADTriGPanels(false);

                activeFilters = [...getFilterConfig(currentMode).hiddenPredicates];

                const filteredQuads = quads.filter(quad => {
                    const predicateUri = quad.predicate.value;
                    const predicateLabel = getPrefixedName(predicateUri, prefixes);
                    return !isPredicateHidden(predicateUri, predicateLabel);
                });

                const dotCode = rdfToDot(filteredQuads, prefixes);
                currentDotCode = dotCode;
                console.log('Сгенерированный DOT-код:', dotCode);

                const viz = await Viz.instance();
                const svgString = await viz.renderString(dotCode, {
                    format: 'svg',
                    engine: layoutEngine
                });

                const output = document.getElementById('output');
                currentScale = 1.0;
                applyZoom();

                if (outputFormat === 'svg') {
                    output.innerHTML = svgString;
                    currentSvgElement = output.querySelector('svg');
                    document.getElementById('export-buttons').style.display = 'block';
                    document.getElementById('zoom-controls').style.display = 'flex';
                } else if (outputFormat === 'png') {
                    const pngDataUrl = await svgToPng(svgString);
                    output.innerHTML = `<img src="${pngDataUrl}" alt="RDF Graph" style="max-width: 100%;">`;
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = svgString;
                    currentSvgElement = tempDiv.querySelector('svg');
                    document.getElementById('export-buttons').style.display = 'block';
                    document.getElementById('zoom-controls').style.display = 'flex';
                }

                if (currentMode !== 'base') {
                    displayLegend();
                } else {
                    document.getElementById('legend-panel').style.display = 'none';
                }

                displayPrefixes(prefixes);
                displayFilters();
                addNodeClickHandlers();
                closeAllPropertiesPanels();

                console.log(`Обработано ${quads.length} триплетов`);

            } catch (error) {
                console.error('Ошибка визуализации:', error);
                const enhancedMessage = enhanceParseError(error.message, rdfInput);
                showError(enhancedMessage);
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Обновить';
                }
            }
        }

        // ============================================================================
        // ПЕРЕВИЗУАЛИЗАЦИЯ
        // ============================================================================

        async function revisualize() {
            const layoutEngine = document.getElementById('layout-engine').value;

            try {
                // issue #324: Используем currentStore вместо currentQuads
                const allQuads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
                const filteredQuads = allQuads.filter(quad => {
                    const predicateUri = quad.predicate.value;
                    const predicateLabel = getPrefixedName(predicateUri, currentPrefixes);
                    return !isPredicateHidden(predicateUri, predicateLabel);
                });

                const dotCode = rdfToDot(filteredQuads, currentPrefixes);
                currentDotCode = dotCode;
                console.log('Пересгенерированный DOT-код:', dotCode);

                const viz = await Viz.instance();
                const svgString = await viz.renderString(dotCode, { format: 'svg', engine: layoutEngine });

                const output = document.getElementById('output');
                output.innerHTML = svgString;
                currentSvgElement = output.querySelector('svg');
                addNodeClickHandlers();

            } catch (error) {
                console.error('Ошибка при перевизуализации:', error);
            }
        }

        /**
         * Перевизуализирует VAD для выбранного TriG
         * @param {string} trigUri - URI TriG для отображения
         */
        async function revisualizeTrigVAD(trigUri) {
            const graphInfo = trigHierarchy[trigUri];
            // issue #270: Проверка наличия graphInfo и graphInfo.quads
            if (!graphInfo || !graphInfo.quads) {
                console.warn('issue #270: graphInfo или graphInfo.quads отсутствует для:', trigUri);
                return;
            }

            const layoutEngine = document.getElementById('layout-engine').value;

            try {
                // Используем квады только из выбранного графа
                const filteredQuads = graphInfo.quads.filter(quad => {
                    const predicateUri = quad.predicate.value;
                    const predicateLabel = getPrefixedName(predicateUri, currentPrefixes);
                    return !isPredicateHidden(predicateUri, predicateLabel);
                });

                // Генерируем DOT-код в режиме VAD
                const originalMode = currentMode;
                currentMode = 'vad';  // Используем логику VAD для рендеринга

                // issue #334: getNodeTypes() и getNodeSubtypes() работают напрямую с currentStore
                const dotCode = rdfToDot(filteredQuads, currentPrefixes, trigUri);
                currentDotCode = dotCode;
                console.log('VAD TriG - Сгенерированный DOT-код:', dotCode);

                // Восстанавливаем режим
                currentMode = originalMode;

                const viz = await Viz.instance();
                const svgString = await viz.renderString(dotCode, { format: 'svg', engine: layoutEngine });

                // В режиме VAD TriG используем специальный контейнер vad-trig-output
                const output = document.getElementById('vad-trig-output');
                output.innerHTML = svgString;
                currentSvgElement = output.querySelector('svg');
                document.getElementById('vad-trig-zoom-controls').style.display = 'flex';
                addNodeClickHandlers();

            } catch (error) {
                console.error('Ошибка при перевизуализации VAD TriG:', error);
            }
        }

        // ============================================================================
        // ОБНОВЛЕНИЕ ВИЗУАЛИЗАЦИИ (issue #276)
        // ============================================================================

        /**
         * issue #276: Обновляет визуализацию: пере-читает quadstore, перестраивает treeview,
         * отображает схему. Запоминает последний активный узел и восстанавливает фокус.
         *
         * Логика работы:
         * 1. Запоминает текущий выбранный TriG URI (selectedTrigUri)
         * 2. Пере-парсит данные из textarea rdf-input
         * 3. Перестраивает trigHierarchy и treeview
         * 4. Если запомненный TriG существует - восстанавливает на него фокус
         * 5. Если запомненный TriG удалён - фокус как при первом открытии схемы
         */
        async function refreshVisualization() {
            const rdfInput = document.getElementById('rdf-input').value.trim();
            const inputFormat = document.getElementById('input-format').value;
            const outputFormat = document.getElementById('output-format').value;
            const layoutEngine = document.getElementById('layout-engine').value;
            const visualizationMode = document.getElementById('visualization-mode').value;

            // issue #276: Запоминаем текущий выбранный TriG для последующего восстановления фокуса
            const previousSelectedTrigUri = selectedTrigUri;
            console.log('issue #276: refreshVisualization - remembering selectedTrigUri:', previousSelectedTrigUri);

            // issue #376: Сохраняем состояние раскрытия TreeView перед перестроением
            const previousTreeViewState = typeof saveTreeViewState === 'function' ? saveTreeViewState() : null;

            const maxLabelLengthInput = document.getElementById('max-label-length');
            const maxLabelLengthValue = parseInt(maxLabelLengthInput.value, 10);
            if (!isNaN(maxLabelLengthValue) && maxLabelLengthValue >= 5 && maxLabelLengthValue <= 200) {
                currentMaxLabelLength = maxLabelLengthValue;
            } else {
                currentMaxLabelLength = DEFAULT_MAX_LABEL_LENGTH;
                maxLabelLengthInput.value = DEFAULT_MAX_LABEL_LENGTH;
            }

            const maxVadRowLengthInput = document.getElementById('max-vad-row-length');
            const maxVadRowLengthValue = parseInt(maxVadRowLengthInput.value, 10);
            if (!isNaN(maxVadRowLengthValue) && maxVadRowLengthValue >= 2 && maxVadRowLengthValue <= 20) {
                currentMaxVadRowLength = maxVadRowLengthValue;
            } else {
                currentMaxVadRowLength = DEFAULT_MAX_VAD_ROW_LENGTH;
                maxVadRowLengthInput.value = DEFAULT_MAX_VAD_ROW_LENGTH;
            }

            currentMode = visualizationMode;

            if (!rdfInput) {
                showError('Пожалуйста, введите RDF данные');
                return;
            }

            showLoading();

            const button = document.getElementById('refresh-btn');
            if (button) {
                button.disabled = true;
                button.textContent = 'Обновление...';
            }

            try {
                // issue #276: Сбрасываем trigHierarchy для полного пере-парсинга
                trigHierarchy = null;

                const parser = new N3.Parser({ format: inputFormat });
                const quads = [];
                let prefixes = {};

                await new Promise((resolve, reject) => {
                    parser.parse(rdfInput, (error, quad, parsedPrefixes) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        if (quad) {
                            quads.push(quad);
                        } else {
                            if (parsedPrefixes) {
                                prefixes = parsedPrefixes;
                            }
                            resolve();
                        }
                    });
                });

                currentPrefixes = prefixes;

                // issue #324: Инициализируем currentStore (единственное хранилище)
                currentStore = new N3.Store();
                quads.forEach(quad => currentStore.addQuad(quad));

                // Добавляем технологические квады в общий quadstore
                if (typeof addTechQuadsToStore === 'function') {
                    addTechQuadsToStore();
                }

                // issue #359: Добавляем квады базовой онтологии VAD для semantic reasoning
                if (typeof addVADOntologyQuadsToStore === 'function') {
                    addVADOntologyQuadsToStore();
                }

                // Обновляем отображение quadstore с учётом текущего фильтра
                if (typeof updateQuadstoreDisplay === 'function') {
                    updateQuadstoreDisplay();
                }

                if (quads.length === 0) {
                    showError('Не найдено RDF триплетов в данных');
                    return;
                }

                // Обработка режима VAD TriG
                if (currentMode === 'vad-trig') {
                    // issue #301: Сбрасываем историю навигации при загрузке новых данных
                    if (typeof resetNavigationHistory === 'function') {
                        resetNavigationHistory();
                    }

                    // Парсим иерархию TriG графов
                    const hierarchyResult = parseTriGHierarchy(quads, prefixes);

                    if (!hierarchyResult.valid) {
                        showValidationError(formatVADTriGErrors(hierarchyResult.errors));
                        toggleVADTriGPanels(false);
                        if (button) {
                            button.disabled = false;
                            button.textContent = 'Обновить';
                        }
                        return;
                    }

                    // Сохраняем иерархию
                    trigHierarchy = hierarchyResult.hierarchy;

                    // issue #324: Вычисляем Virtual TriG через recalculateAllVirtualTriGs
                    // (виртуальные данные хранятся напрямую в store)
                    if (typeof recalculateAllVirtualTriGs === 'function') {
                        await recalculateAllVirtualTriGs(prefixes);
                    }

                    // Обновляем отображение quadstore с виртуальными данными
                    if (typeof updateQuadstoreDisplay === 'function') {
                        updateQuadstoreDisplay();
                    }

                    // issue #276: Определяем TriG для фокуса
                    // Если ранее выбранный TriG всё ещё существует, используем его
                    // Иначе выбираем первый корневой TriG (как при первом открытии)
                    if (previousSelectedTrigUri && trigHierarchy[previousSelectedTrigUri]) {
                        selectedTrigUri = previousSelectedTrigUri;
                        console.log('issue #276: Restored focus to previously selected TriG:', selectedTrigUri);
                    } else {
                        selectedTrigUri = hierarchyResult.rootTrigUris.length > 0 ? hierarchyResult.rootTrigUris[0] : null;
                        console.log('issue #276: Previous TriG not found, using first root TriG:', selectedTrigUri);
                    }

                    // issue #301: Добавляем начальный TriG в историю навигации
                    if (selectedTrigUri && typeof addToNavigationHistory === 'function') {
                        addToNavigationHistory(selectedTrigUri);
                    }

                    // Показываем панели VAD TriG
                    toggleVADTriGPanels(true);

                    // Отображаем дерево TriG (передаём массив всех корневых TriG)
                    displayTriGTree(trigHierarchy, hierarchyResult.rootTrigUris, prefixes);

                    // issue #376: Восстанавливаем состояние раскрытия TreeView после перестроения
                    // Это гарантирует, что дерево не сворачивается при обновлении
                    if (previousTreeViewState && typeof restoreTreeViewState === 'function') {
                        restoreTreeViewState(previousTreeViewState);
                    }

                    // issue #276: Выделяем выбранный TriG в дереве
                    if (selectedTrigUri) {
                        // Отображаем свойства выбранного TriG
                        displayTriGProperties(selectedTrigUri, trigHierarchy, prefixes);

                        // issue #378: Раскрываем путь к текущей диаграмме в TreeView
                        // Это гарантирует, что ветвь с текущей диаграммой всегда раскрыта после обновления
                        if (typeof highlightAndExpandTreePath === 'function') {
                            highlightAndExpandTreePath(selectedTrigUri);
                            console.log('issue #378: Раскрыт путь к текущей диаграмме:', selectedTrigUri);
                        } else {
                            // Fallback: выделяем элемент в дереве
                            const treeItems = document.querySelectorAll('.trig-tree-item');
                            treeItems.forEach(item => {
                                if (item.getAttribute('data-trig-uri') === selectedTrigUri) {
                                    item.classList.add('selected', 'active');
                                } else {
                                    item.classList.remove('selected', 'active');
                                }
                            });
                        }
                    }

                    // Валидация VAD для квадов выбранного графа
                    const rootGraphInfo = trigHierarchy[selectedTrigUri];

                    if (!rootGraphInfo || !rootGraphInfo.quads) {
                        console.warn('issue #276: rootGraphInfo или rootGraphInfo.quads отсутствует для:', selectedTrigUri);
                        showError('Не удалось найти данные для выбранного TriG');
                        if (button) {
                            button.disabled = false;
                            button.textContent = 'Обновить';
                        }
                        return;
                    }

                    const validation = validateVAD(rootGraphInfo.quads, prefixes);
                    if (!validation.valid) {
                        showValidationError(formatVADErrors(validation.errors));
                        if (button) {
                            button.disabled = false;
                            button.textContent = 'Обновить';
                        }
                        return;
                    }

                    // Продолжаем с квадами только из выбранного графа
                    activeFilters = [...getFilterConfig('vad').hiddenPredicates];

                    const filteredQuads = rootGraphInfo.quads.filter(quad => {
                        const predicateUri = quad.predicate.value;
                        const predicateLabel = getPrefixedName(predicateUri, prefixes);
                        return !isPredicateHidden(predicateUri, predicateLabel);
                    });

                    // Временно переключаемся в режим VAD для генерации DOT
                    // issue #324: Не используем currentQuads
                    currentMode = 'vad';

                    const dotCode = rdfToDot(filteredQuads, prefixes, selectedTrigUri);
                    currentDotCode = dotCode;
                    console.log('issue #276: refresh VAD TriG - Сгенерированный DOT-код:', dotCode);

                    currentMode = 'vad-trig';

                    const viz = await Viz.instance();
                    const svgString = await viz.renderString(dotCode, {
                        format: 'svg',
                        engine: layoutEngine
                    });

                    // В режиме VAD TriG используем специальный контейнер vad-trig-output
                    const output = document.getElementById('vad-trig-output');
                    currentScale = 1.0;
                    applyZoom();

                    if (outputFormat === 'svg') {
                        output.innerHTML = svgString;
                        currentSvgElement = output.querySelector('svg');
                        document.getElementById('export-buttons').style.display = 'block';
                        document.getElementById('vad-trig-zoom-controls').style.display = 'flex';
                    } else if (outputFormat === 'png') {
                        const pngDataUrl = await svgToPng(svgString);
                        output.innerHTML = `<img src="${pngDataUrl}" alt="RDF Graph" style="max-width: 100%;">`;
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = svgString;
                        currentSvgElement = tempDiv.querySelector('svg');
                        document.getElementById('export-buttons').style.display = 'block';
                        document.getElementById('vad-trig-zoom-controls').style.display = 'flex';
                    }

                    displayLegend();
                    displayPrefixes(prefixes);
                    displayFilters();
                    addNodeClickHandlers();
                    closeAllPropertiesPanels();

                    // Обновляем SPARQL запрос для выбранного TriG
                    updateSparqlQueryForTriG();

                    // Обновляем выпадающие списки Smart Design, если режим активен
                    if (document.getElementById('sparql-mode').value === 'smart-design') {
                        populateSmartDesignDropdowns();
                    }

                    console.log(`issue #276: refresh - Обработано ${quads.length} триплетов, отображается граф ${getPrefixedName(selectedTrigUri, prefixes)}`);

                    if (button) {
                        button.disabled = false;
                        button.textContent = 'Обновить';
                    }
                    return;
                }

                // Скрываем панели VAD TriG для других режимов
                toggleVADTriGPanels(false);

                // Обычный режим визуализации (не VAD TriG)
                activeFilters = [...getFilterConfig(currentMode).hiddenPredicates];

                const filteredQuads = quads.filter(quad => {
                    const predicateUri = quad.predicate.value;
                    const predicateLabel = getPrefixedName(predicateUri, prefixes);
                    return !isPredicateHidden(predicateUri, predicateLabel);
                });

                const dotCode = rdfToDot(filteredQuads, prefixes);
                currentDotCode = dotCode;

                const viz = await Viz.instance();
                const svgString = await viz.renderString(dotCode, {
                    format: 'svg',
                    engine: layoutEngine
                });

                const output = document.getElementById('output');
                currentScale = 1.0;
                applyZoom();

                if (outputFormat === 'svg') {
                    output.innerHTML = svgString;
                    currentSvgElement = output.querySelector('svg');
                    document.getElementById('export-buttons').style.display = 'block';
                    document.getElementById('zoom-controls').style.display = 'flex';
                } else if (outputFormat === 'png') {
                    const pngDataUrl = await svgToPng(svgString);
                    output.innerHTML = `<img src="${pngDataUrl}" alt="RDF Graph" style="max-width: 100%;">`;
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = svgString;
                    currentSvgElement = tempDiv.querySelector('svg');
                    document.getElementById('export-buttons').style.display = 'block';
                    document.getElementById('zoom-controls').style.display = 'flex';
                }

                if (currentMode !== 'base') {
                    displayLegend();
                } else {
                    document.getElementById('legend-panel').style.display = 'none';
                }

                displayPrefixes(prefixes);
                displayFilters();
                addNodeClickHandlers();
                closeAllPropertiesPanels();

                console.log(`issue #276: refresh - Обработано ${quads.length} триплетов`);

            } catch (error) {
                console.error('Ошибка при обновлении визуализации:', error);
                const enhancedMessage = enhanceParseError(error.message, rdfInput);
                showError(enhancedMessage);
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Обновить';
                }
            }
        }

        // ============================================================================
        // ГЕНЕРАЦИЯ DOT-КОДА
        // ============================================================================

        function rdfToDot(quads, prefixes = {}, trigUri = null) {
            if (currentMode === 'aggregation') {
                return rdfToDotAggregation(quads, prefixes);
            }

            if (currentMode === 'vad') {
                return rdfToDotVAD(quads, prefixes, trigUri);
            }

            // issue #334: buildNodeTypesCache удалён - используем getNodeTypes() напрямую
            nodeLabelToUri = {};

            const nodes = new Map();
            const edges = [];

            quads.forEach(quad => {
                const subject = quad.subject;
                const predicate = quad.predicate;
                const object = quad.object;

                const subjectValue = subject.value;
                const predicateValue = predicate.value;
                const objectValue = object.value;

                const subjectLabel = getPrefixedName(subjectValue, prefixes);
                const predicateLabel = getPrefixedName(predicateValue, prefixes);
                const objectLabel = object.termType === 'Literal'
                    ? `"${objectValue}"`
                    : getPrefixedName(objectValue, prefixes);

                if (!nodes.has(subjectValue)) {
                    const nodeId = generateNodeId(subjectValue);
                    nodes.set(subjectValue, {
                        id: nodeId,
                        label: subjectLabel,
                        value: subjectValue,
                        isUri: subject.termType === 'NamedNode',
                        isBlank: subject.termType === 'BlankNode',
                        isLiteral: false
                    });
                    nodeLabelToUri[subjectLabel] = { uri: subjectValue, dotId: nodeId };
                }

                if (!nodes.has(objectValue)) {
                    const nodeId = generateNodeId(objectValue);
                    nodes.set(objectValue, {
                        id: nodeId,
                        label: objectLabel,
                        value: objectValue,
                        isUri: object.termType === 'NamedNode',
                        isLiteral: object.termType === 'Literal',
                        isBlank: object.termType === 'BlankNode'
                    });
                    nodeLabelToUri[objectLabel] = { uri: objectValue, dotId: nodeId };
                }

                edges.push({
                    from: nodes.get(subjectValue).id,
                    to: nodes.get(objectValue).id,
                    label: predicateLabel,
                    predicateUri: predicateValue
                });
            });

            let dot = 'digraph RDFGraph {\n';
            dot += '    rankdir=LR;\n';
            dot += '    node [fontname="Arial"];\n';
            dot += '    edge [fontname="Arial", fontsize=10];\n';
            dot += '\n';

            nodes.forEach((nodeInfo, value) => {
                const nodeStyle = getNodeStyle(nodeInfo.value, nodeInfo.isLiteral, nodeInfo.isBlank);

                if (currentMode === 'notation' && nodeInfo.label.length > currentMaxLabelLength) {
                    const wrappedLabel = formatLabelWithWrap(nodeInfo.label, currentMaxLabelLength, false);
                    dot += `    ${nodeInfo.id} [label=<${wrappedLabel}> ${nodeStyle}];\n`;
                } else {
                    dot += `    ${nodeInfo.id} [label="${escapeDotString(nodeInfo.label)}" ${nodeStyle}];\n`;
                }
            });

            dot += '\n';

            edges.forEach(edge => {
                const edgeStyle = getEdgeStyle(edge.predicateUri, edge.label);
                dot += `    ${edge.from} -> ${edge.to} [label="${escapeDotString(edge.label)}" ${edgeStyle}];\n`;
            });

            dot += '}\n';
            return dot;
        }

        function rdfToDotVAD(quads, prefixes = {}, trigUri = null) {
            // issue #334: buildNodeTypesCache и updateSubtypesCacheFromVirtualData удалены
            // Теперь используются getNodeTypes() и getNodeSubtypes() из vadlib.js

            // Import namedNode from N3.DataFactory
            const factory = N3.DataFactory;
            const { namedNode } = factory;

            nodeLabelToUri = {};

            // Собираем информацию о процессах и их исполнителях
            const processes = new Map();  // URI процесса -> информация
            const executorGroups = new Map();  // URI группы -> список исполнителей
            const hasNextEdges = [];  // Связи hasNext между процессами

            // Извлекаем информацию об именованном графе для отображения заголовка схемы
            let namedGraphUri = null;
            const graphLabels = new Map();  // URI графа -> rdfs:label

            // Собираем все именованные графы и их метки
            quads.forEach(quad => {
                // Получаем URI именованного графа (если есть)
                if (quad.graph && quad.graph.value && quad.graph.value !== '') {
                    if (!namedGraphUri) {
                        namedGraphUri = quad.graph.value;  // Берём первый именованный граф
                    }
                }
            });

            // Ищем rdfs:label для именованных графов (определяется вне графа)
            quads.forEach(quad => {
                const subjectUri = quad.subject.value;
                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, prefixes);

                if (predicateLabel === 'rdfs:label' || predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label') {
                    // Проверяем, является ли subject именованным графом
                    if (subjectUri === namedGraphUri) {
                        graphLabels.set(subjectUri, quad.object.value);
                    }
                }
            });

            // Первый проход: собираем все объекты
            quads.forEach(quad => {
                const subjectUri = quad.subject.value;
                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, prefixes);
                const objectValue = quad.object.value;

                // issue #334: Используем getNodeTypes() вместо nodeTypesCache
                const subjectTypes = getNodeTypes(subjectUri);
                const isProcess = subjectTypes.some(t =>
                    t === 'vad:TypeProcess' || t === 'http://example.org/vad#TypeProcess'
                );

                if (isProcess) {
                    if (!processes.has(subjectUri)) {
                        processes.set(subjectUri, {
                            uri: subjectUri,
                            label: getPrefixedName(subjectUri, prefixes),
                            name: null,
                            executorGroup: null,
                            hasNext: [],
                            hasParent: null
                        });
                    }

                    const processInfo = processes.get(subjectUri);

                    // Собираем rdfs:label для имени
                    if (predicateLabel === 'rdfs:label' || predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label') {
                        processInfo.name = objectValue;
                    }

                    // Собираем hasExecutor
                    if (predicateLabel === 'vad:hasExecutor' || predicateUri === 'http://example.org/vad#hasExecutor') {
                        processInfo.executorGroup = objectValue;
                    }

                    // Собираем hasNext
                    if (predicateLabel === 'vad:hasNext' || predicateUri === 'http://example.org/vad#hasNext') {
                        processInfo.hasNext.push(objectValue);
                        hasNextEdges.push({ from: subjectUri, to: objectValue });
                    }
                }

                // Собираем информацию о группах исполнителей
                const isExecutorGroup = subjectTypes.some(t =>
                    t === 'vad:ExecutorGroup' || t === 'http://example.org/vad#ExecutorGroup'
                );

                if (isExecutorGroup) {
                    if (!executorGroups.has(subjectUri)) {
                        executorGroups.set(subjectUri, {
                            uri: subjectUri,
                            label: null,
                            executors: []
                        });
                    }

                    const groupInfo = executorGroups.get(subjectUri);

                    if (predicateLabel === 'rdfs:label' || predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label') {
                        groupInfo.label = objectValue;
                    }

                    if (predicateLabel === 'vad:includes' || predicateUri === 'http://example.org/vad#includes') {
                        groupInfo.executors.push(objectValue);
                    }
                }
            });

            // Дополняем метаданные процессов из vad:ptree (если не найдены в текущем TriG)
            processes.forEach((processInfo, processUri) => {
                if (!processInfo.name) {
                    const ptreeMetadata = getProcessMetadataFromPtree(processUri, prefixes);
                    if (ptreeMetadata.label) {
                        processInfo.name = ptreeMetadata.label;
                    }
                }
            });

            // Собираем имена исполнителей
            // Сначала из текущих quads (если rdfs:label есть в этом графе)
            const executorNames = new Map();
            quads.forEach(quad => {
                const subjectUri = quad.subject.value;
                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, prefixes);
                const objectValue = quad.object.value;

                // issue #334: Используем getNodeTypes() вместо nodeTypesCache
                const subjectTypes = getNodeTypes(subjectUri);
                const isExecutor = subjectTypes.some(t =>
                    t === 'vad:TypeExecutor' || t === 'http://example.org/vad#TypeExecutor'
                );

                if (isExecutor && (predicateLabel === 'rdfs:label' || predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label')) {
                    executorNames.set(subjectUri, objectValue);
                }
            });

            // Дополняем имена исполнителей из vad:rtree (если не найдены в текущем TriG)
            executorGroups.forEach((groupInfo, groupUri) => {
                groupInfo.executors.forEach(executorUri => {
                    if (!executorNames.has(executorUri)) {
                        const nameFromRtree = getExecutorNameFromRtree(executorUri, prefixes);
                        if (nameFromRtree) {
                            executorNames.set(executorUri, nameFromRtree);
                        }
                    }
                });
            });

            // Получаем rdfs:label для ExecutorGroup из Virtual TriG
            if (trigUri && currentStore) {
                // Ищем соответствующий Virtual TriG для ExecutorGroup
                let virtualTrigUri = null;
                if (trigUri.includes('#t_')) {
                    virtualTrigUri = trigUri.replace('#t_', '#vt_eg_');
                } else {
                    const localName = trigUri.split('#').pop() || trigUri.split('/').pop();
                    virtualTrigUri = 'http://example.org/vad#vt_eg_' + localName;
                }

                // Получаем rdfs:label из Virtual TriG
                const virtualQuads = currentStore.getQuads(
                    null,
                    namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
                    null,
                    namedNode(virtualTrigUri)
                );

                virtualQuads.forEach(quad => {
                    const executorGroupUri = quad.subject.value;
                    const label = quad.object.value;
                    
                    if (executorGroups.has(executorGroupUri)) {
                        const groupInfo = executorGroups.get(executorGroupUri);
                        groupInfo.label = label;
                    }
                });
            }

            // Генерация DOT-кода
            // Используем rankdir=TB чтобы rank=same группировал узлы горизонтально
            // А процессы идут в одной строке благодаря rank=same
            let dot = 'digraph VADGraph {\n';
            dot += '    // VAD (Value Added Chain Diagram)\n';
            dot += '    rankdir=TB;\n';  // Top-to-bottom позволяет горизонтальное выравнивание через rank=same
            dot += '    node [fontname="Arial"];\n';
            dot += '    edge [fontname="Arial", fontsize=10];\n';
            dot += '    splines=spline;\n';  // spline для лучшей маршрутизации skip-ребер
            dot += '    nodesep=0.8;\n';  // Расстояние между узлами
            dot += '    ranksep=0.3;\n';  // Минимальное расстояние между рангами (CDS и ExecutorGroup)

            // Добавляем заголовок схемы из именованного графа (если есть)
            // Сначала проверяем graphLabels (для обычного VAD режима)
            // Затем проверяем trigHierarchy (для VAD TriG режима)
            let schemaTitle = null;
            if (namedGraphUri && graphLabels.has(namedGraphUri)) {
                schemaTitle = graphLabels.get(namedGraphUri);
            } else if (namedGraphUri && trigHierarchy && trigHierarchy[namedGraphUri] && trigHierarchy[namedGraphUri].label) {
                schemaTitle = trigHierarchy[namedGraphUri].label;
            }
            if (schemaTitle) {
                dot += `    label="${escapeDotString(schemaTitle)}";\n`;
                dot += '    labelloc="t";\n';  // Заголовок вверху
                dot += '    fontname="Arial";\n';
                dot += '    fontsize=16;\n';
            }
            dot += '\n';

            // issue #311 п.2: Фильтруем процессы — показываем индивидов процесса в данном TriG.
            // Процесс виден, если он является индивидом текущей схемы (имеет isSubprocessTrig),
            // ИЛИ если он участвует в hasNext-связях.
            // Схемы должны отображаться даже если у объектов нет ни одного предиката vad:hasNext.
            const isSubprocessTrigUri = 'http://example.org/vad#isSubprocessTrig';
            const individualsInCurrentTrig = new Set();
            quads.forEach(quad => {
                const predUri = quad.predicate.value;
                if (predUri === isSubprocessTrigUri || predUri.endsWith('#isSubprocessTrig')) {
                    individualsInCurrentTrig.add(quad.subject.value);
                }
            });

            const visibleProcesses = new Map();
            processes.forEach((processInfo, uri) => {
                // Показываем процесс, если он:
                // 1) является индивидом текущей схемы (vad:isSubprocessTrig), ИЛИ
                // 2) имеет исходящие hasNext, ИЛИ
                // 3) имеет входящие hasNext
                const isIndividualInTrig = individualsInCurrentTrig.has(uri);
                const hasOutgoingNext = processInfo.hasNext.length > 0;
                const hasIncomingNext = [...processes.values()].some(p => p.hasNext.includes(uri));

                if (isIndividualInTrig || hasOutgoingNext || hasIncomingNext) {
                    visibleProcesses.set(uri, processInfo);
                }
            });

            // Строим порядок процессов для определения skip-ребер (ребер, которые пропускают промежуточные узлы)
            // Топологическая сортировка процессов по hasNext для определения их порядка
            const processOrder = [];
            const visited = new Set();
            const processUris = [...visibleProcesses.keys()];

            // Найти начальный процесс (процесс без входящих hasNext)
            const incomingCount = new Map();
            processUris.forEach(uri => incomingCount.set(uri, 0));
            hasNextEdges.forEach(edge => {
                if (visibleProcesses.has(edge.to)) {
                    incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1);
                }
            });

            // Топологическая сортировка (BFS)
            const queue = [];
            processUris.forEach(uri => {
                if (incomingCount.get(uri) === 0) {
                    queue.push(uri);
                }
            });

            while (queue.length > 0) {
                const uri = queue.shift();
                if (!visited.has(uri)) {
                    visited.add(uri);
                    processOrder.push(uri);
                    const processInfo = visibleProcesses.get(uri);
                    if (processInfo) {
                        processInfo.hasNext.forEach(nextUri => {
                            if (visibleProcesses.has(nextUri)) {
                                const count = incomingCount.get(nextUri) - 1;
                                incomingCount.set(nextUri, count);
                                if (count === 0 && !visited.has(nextUri)) {
                                    queue.push(nextUri);
                                }
                            }
                        });
                    }
                }
            }

            // Добавляем оставшиеся процессы (на случай циклов или изолированных)
            processUris.forEach(uri => {
                if (!visited.has(uri)) {
                    processOrder.push(uri);
                }
            });

            // Создаем индекс позиции процесса для определения skip-ребер
            const processPositionIndex = new Map();
            processOrder.forEach((uri, index) => {
                processPositionIndex.set(uri, index);
            });

            // Добавляем узлы процессов (CDS) и ExecutorGroup как отдельные узлы
            dot += '    // Процессы VAD (cds shape) и ExecutorGroup (ellipse желтый)\n';

            // Сначала добавляем все узлы CDS
            visibleProcesses.forEach((processInfo, uri) => {
                const nodeId = generateVadNodeId(uri, prefixes);
                const processName = processInfo.name || processInfo.label;

                // Формируем HTML label с именем процесса (БЕЗ жирного шрифта)
                const wrappedProcessName = wrapTextByWords(processName, currentMaxLabelLength);

                let htmlLabel = '<';
                for (let i = 0; i < wrappedProcessName.length; i++) {
                    if (i > 0) htmlLabel += '<BR/>';
                    htmlLabel += escapeHtmlLabel(wrappedProcessName[i]);
                }
                htmlLabel += '>';

                // issue #334: Используем getNodeSubtypes() вместо nodeSubtypesCache
                // Стили определяются в VADNodeStyles и загружаются из TTL файла при старте
                const nodeSubtypes = getNodeSubtypes(uri);

                // Ищем подходящий стиль на основе подтипа процесса
                let nodeStyle = null;

                // Порядок проверки: более специфичные стили сначала
                // (DetailedChild, DetailedExternal, notDetailedChild, notDetailedExternal, NotDefinedType)
                const subtypeStyleMapping = [
                    { subtype: 'DetailedChild', style: 'ProcessStyleDetailedChild' },
                    { subtype: 'DetailedExternal', style: 'ProcessStyleDetailedExternal' },
                    { subtype: 'notDetailedChild', style: 'ProcessStyleNotDetailedChild' },
                    { subtype: 'notDetailedExternal', style: 'ProcessStyleNotDetailedExternal' },
                    { subtype: 'NotDefinedType', style: 'ProcessStyleNotDefinedType' },
                    // Общие типы (Detailed, notDetailed) - для обратной совместимости
                    { subtype: 'Detailed', style: 'ProcessStyleDetailed' },
                    { subtype: 'notDetailed', style: 'ProcessStyleNotDetailed' }
                ];

                for (const mapping of subtypeStyleMapping) {
                    const subtypePrefixed = 'vad:' + mapping.subtype;
                    const subtypeFullUri = 'http://example.org/vad#' + mapping.subtype;

                    if (nodeSubtypes.includes(subtypePrefixed) || nodeSubtypes.includes(subtypeFullUri)) {
                        if (VADNodeStyles[mapping.style]) {
                            nodeStyle = VADNodeStyles[mapping.style].dot;
                            break;
                        }
                    }
                }

                // Если стиль не найден, используем стиль notDetailedChild по умолчанию
                if (!nodeStyle) {
                    nodeStyle = VADNodeStyles['ProcessStyleNotDetailedChild'].dot;
                }
                dot += `    ${nodeId} [label=${htmlLabel} ${nodeStyle}];\n`;

                nodeLabelToUri[processInfo.label] = { uri: uri, dotId: nodeId };
            });

            dot += '\n';

            // issue #406: Проверяем текущий фильтр диаграммы
            // Если фильтр = 'hideExecutors', пропускаем рендеринг ExecutorGroup узлов
            const shouldShowExecutors = (typeof getCurrentDiagramFilter === 'function')
                ? getCurrentDiagramFilter() !== 'hideExecutors'
                : true;

            // Добавляем ExecutorGroup узлы (желтые эллипсы)
            // ExecutorGroup объекты теперь кликабельны и показывают свойства
            if (shouldShowExecutors) {
                dot += '    // ExecutorGroup узлы (эллипсы с желтоватой заливкой)\n';
                visibleProcesses.forEach((processInfo, uri) => {
                    const nodeId = generateVadNodeId(uri, prefixes);

                    // Получаем метку ExecutorGroup (вычисленную в Virtual TriG)
                    let executorsList = '';
                    let executorGroupUri = null;
                    if (processInfo.executorGroup && executorGroups.has(processInfo.executorGroup)) {
                        executorGroupUri = processInfo.executorGroup;
                        const group = executorGroups.get(processInfo.executorGroup);

                        // Используем вычисленную rdfs:label из Virtual TriG
                        if (group.label) {
                            executorsList = group.label;
                        } else {
                            // Fallback: строим список из имен исполнителей (старый способ)
                            const executorNamesList = group.executors.map(exUri =>
                                executorNames.get(exUri) || getPrefixedName(exUri, prefixes)
                            );
                            executorsList = executorNamesList.join(', ');
                        }
                    }

                    if (executorsList && executorGroupUri) {
                        const executorNodeId = `${nodeId}_exec`;
                        const wrappedExecutors = wrapTextByWords(executorsList, currentMaxLabelLength);

                        let execLabel = '<<FONT POINT-SIZE="9">';
                        for (let i = 0; i < wrappedExecutors.length; i++) {
                            if (i > 0) execLabel += '<BR/>';
                            execLabel += escapeHtmlLabel(wrappedExecutors[i]);
                        }
                        execLabel += '</FONT>>';

                        // ExecutorGroup как эллипс с желтоватой заливкой
                        dot += `    ${executorNodeId} [label=${execLabel} shape="ellipse" color="#B8860B" fillcolor="#FFFFCC" fontname="Arial" style="filled"];\n`;

                        // Регистрируем ExecutorGroup для кликабельности (показ свойств объекта)
                        const executorGroupLabel = getPrefixedName(executorGroupUri, prefixes);
                        nodeLabelToUri[executorGroupLabel] = { uri: executorGroupUri, dotId: executorNodeId };
                    }
                });
            } else {
                dot += '    // issue #406: ExecutorGroup узлы скрыты фильтром\n';
            }

            dot += '\n';

            // Собираем ID узлов для rank constraints, используя порядок из topological sort
            const cdsNodeIds = [];
            const execNodeIds = [];
            const nodeIdToUri = new Map();  // Обратное отображение для быстрого поиска

            // Используем отсортированный порядок процессов
            processOrder.forEach(uri => {
                if (visibleProcesses.has(uri)) {
                    const processInfo = visibleProcesses.get(uri);
                    const nodeId = generateVadNodeId(uri, prefixes);
                    cdsNodeIds.push(nodeId);
                    nodeIdToUri.set(nodeId, uri);

                    // issue #406: Добавляем execNodeIds только если ExecutorGroup видимы
                    if (shouldShowExecutors && processInfo.executorGroup && executorGroups.has(processInfo.executorGroup)) {
                        const group = executorGroups.get(processInfo.executorGroup);
                        if (group.executors.length > 0) {
                            execNodeIds.push(`${nodeId}_exec`);
                        }
                    }
                }
            });

            // Разбиваем процессы на строки по currentMaxVadRowLength
            const rows = [];
            for (let i = 0; i < cdsNodeIds.length; i += currentMaxVadRowLength) {
                rows.push(cdsNodeIds.slice(i, i + currentMaxVadRowLength));
            }

            // Собираем соответствующие execNodeIds для каждой строки
            // Важно: execNodeIds должны соответствовать позициям cdsNodeIds
            const execRows = [];
            rows.forEach((rowCdsIds, rowIndex) => {
                const rowExecIds = [];
                rowCdsIds.forEach(cdsId => {
                    const execId = `${cdsId}_exec`;
                    if (execNodeIds.includes(execId)) {
                        rowExecIds.push(execId);
                    }
                });
                execRows.push(rowExecIds);
            });

            // Генерация rank constraints для каждой строки
            dot += '    // Rank constraints для CDS строк и ExecutorGroup строк\n';
            rows.forEach((rowCdsIds, rowIndex) => {
                // CDS строка
                dot += `    { rank=same; ${rowCdsIds.join('; ')}; }\n`;
            });

            // Генерация rank constraints для ExecutorGroup строк
            execRows.forEach((rowExecIds, rowIndex) => {
                if (rowExecIds.length > 0) {
                    dot += `    { rank=same; ${rowExecIds.join('; ')}; }\n`;
                }
            });

            // Добавляем невидимые ребра между строками для правильного разделения рядов
            // Это необходимо для того, чтобы Graphviz разместил строки одну под другой
            // FIX issue #60: Связываем ПЕРВЫЙ CDS текущей строки с ПЕРВЫМ CDS следующей строки
            // для выравнивания всех строк по левому краю (как требуется в issue #60)
            dot += '\n    // Невидимые ребра между строками для разделения рядов и выравнивания по левому краю\n';
            for (let rowIndex = 0; rowIndex < rows.length - 1; rowIndex++) {
                const currentRowCdsIds = rows[rowIndex];
                const nextRowCdsIds = rows[rowIndex + 1];

                if (currentRowCdsIds.length > 0 && nextRowCdsIds.length > 0) {
                    // Связываем ПЕРВЫЙ CDS текущей строки с ПЕРВЫМ CDS следующей строки
                    // Это выравнивает все строки по левому краю (issue #60)
                    const firstCurrentCdsId = currentRowCdsIds[0];
                    const firstNextCdsId = nextRowCdsIds[0];
                    dot += `    ${firstCurrentCdsId} -> ${firstNextCdsId} [style=invis weight=100 minlen=2];\n`;
                }
            }
            dot += '\n';

            // Добавляем видимые связи vad:hasExecutor между CDS и ExecutorGroup
            // issue #406: Связи vad:hasExecutor отображаются только если ExecutorGroup видимы
            if (shouldShowExecutors) {
                dot += '    // Связи vad:hasExecutor - видимые ребра от процессов к группам исполнителей\n';
                visibleProcesses.forEach((processInfo, uri) => {
                    const nodeId = generateVadNodeId(uri, prefixes);

                    let hasExecutorGroup = false;
                    if (processInfo.executorGroup && executorGroups.has(processInfo.executorGroup)) {
                        const group = executorGroups.get(processInfo.executorGroup);
                        hasExecutorGroup = group.executors.length > 0;
                    }

                    if (hasExecutorGroup) {
                        const executorNodeId = `${nodeId}_exec`;
                        // Видимая связь vad:hasExecutor (синяя пунктирная, ненаправленная)
                        dot += `    ${nodeId} -> ${executorNodeId} [color="#1565C0" penwidth="1" style="dashed" arrowhead="none" weight=10];\n`;
                    }
                });
            } else {
                dot += '    // issue #406: Связи vad:hasExecutor скрыты фильтром\n';
            }

            dot += '\n';

            // Добавляем ребра hasNext между процессами
            // Все ребра hasNext используют порты East -> West (выход справа, вход слева) согласно issue #58
            dot += '    // Связи hasNext - горизонтальный поток процессов (East -> West)\n';

            // Добавляем все ребра hasNext
            hasNextEdges.forEach(edge => {
                // Проверяем, что оба процесса видимы
                if (visibleProcesses.has(edge.from) && visibleProcesses.has(edge.to)) {
                    const fromId = generateVadNodeId(edge.from, prefixes);
                    const toId = generateVadNodeId(edge.to, prefixes);

                    // Все ребра hasNext используют порты East -> West (выход справа, вход слева)
                    // Это обеспечивает единообразное направление связей согласно требованиям issue #58
                    dot += `    ${fromId}:e -> ${toId}:w [color="#2E7D32" penwidth="1" style="solid" arrowhead="vee"];\n`;
                }
            });

            dot += '}\n';

            return dot;
        }

        function rdfToDotAggregation(quads, prefixes = {}) {
            // issue #334: buildNodeTypesCache удалён - используем getNodeTypes() напрямую
            nodeLabelToUri = {};

            const nodes = new Map();
            const edges = [];
            const nodeLiterals = new Map();

            quads.forEach(quad => {
                const subject = quad.subject;
                const predicate = quad.predicate;
                const object = quad.object;

                const subjectValue = subject.value;
                const predicateValue = predicate.value;
                const objectValue = object.value;

                const subjectLabel = getPrefixedName(subjectValue, prefixes);
                const predicateLabel = getPrefixedName(predicateValue, prefixes);

                if (!nodes.has(subjectValue)) {
                    const nodeId = generateNodeId(subjectValue);
                    nodes.set(subjectValue, {
                        id: nodeId,
                        label: subjectLabel,
                        value: subjectValue,
                        isUri: subject.termType === 'NamedNode',
                        isBlank: subject.termType === 'BlankNode',
                        isLiteral: false
                    });
                    nodeLabelToUri[subjectLabel] = { uri: subjectValue, dotId: nodeId };
                    nodeLiterals.set(subjectValue, []);
                }

                if (object.termType === 'Literal') {
                    const literals = nodeLiterals.get(subjectValue);
                    literals.push({
                        predicate: predicateLabel,
                        value: objectValue,
                        isNameLabel: isNameOrLabelPredicate(predicateLabel)
                    });
                } else {
                    const objectLabel = getPrefixedName(objectValue, prefixes);
                    if (!nodes.has(objectValue)) {
                        const nodeId = generateNodeId(objectValue);
                        nodes.set(objectValue, {
                            id: nodeId,
                            label: objectLabel,
                            value: objectValue,
                            isUri: object.termType === 'NamedNode',
                            isLiteral: false,
                            isBlank: object.termType === 'BlankNode'
                        });
                        nodeLabelToUri[objectLabel] = { uri: objectValue, dotId: nodeId };
                        if (!nodeLiterals.has(objectValue)) {
                            nodeLiterals.set(objectValue, []);
                        }
                    }
                    edges.push({
                        from: nodes.get(subjectValue).id,
                        to: nodes.get(objectValue).id,
                        label: predicateLabel,
                        predicateUri: predicateValue
                    });
                }
            });

            let dot = 'digraph RDFGraph {\n';
            dot += '    rankdir=LR;\n';
            dot += '    node [fontname="Arial", shape="ellipse"];\n';
            dot += '    edge [fontname="Arial", fontsize=10];\n';
            dot += '\n';

            nodes.forEach((nodeInfo, value) => {
                const literals = nodeLiterals.get(value) || [];
                const nameLabelLiterals = literals.filter(l => l.isNameLabel);
                const otherLiterals = literals.filter(l => !l.isNameLabel);

                let htmlLabel = '<';
                htmlLabel += formatLabelWithWrap(nodeInfo.label, currentMaxLabelLength, true);

                let addedLines = 1;
                for (const lit of nameLabelLiterals) {
                    if (addedLines >= MaxAggregationParams) break;
                    htmlLabel += '<BR/>';
                    htmlLabel += formatLabelWithWrap(lit.value, currentMaxLabelLength, false);
                    addedLines++;
                }

                for (const lit of otherLiterals) {
                    if (addedLines >= MaxAggregationParams) break;
                    htmlLabel += '<BR/>';
                    const fullText = lit.predicate + ': ' + lit.value;
                    const wrappedLines = wrapTextByWords(fullText, currentMaxLabelLength);
                    for (let j = 0; j < wrappedLines.length; j++) {
                        if (j > 0) htmlLabel += '<BR/>';
                        htmlLabel += `<FONT POINT-SIZE="8">${escapeHtmlLabel(wrappedLines[j])}</FONT>`;
                    }
                    addedLines++;
                }

                htmlLabel += '>';

                const nodeStyle = getNodeStyle(nodeInfo.value, false, nodeInfo.isBlank);
                dot += `    ${nodeInfo.id} [label=${htmlLabel} ${nodeStyle}];\n`;
            });

            dot += '\n';

            edges.forEach(edge => {
                const edgeStyle = getEdgeStyle(edge.predicateUri, edge.label);
                dot += `    ${edge.from} -> ${edge.to} [label="${escapeDotString(edge.label)}" ${edgeStyle}];\n`;
            });

            dot += '}\n';
            return dot;
        }

        // ============================================================================
        // ФУНКЦИИ ЭКСПОРТА
        // ============================================================================

        function svgToPng(svgString) {
            return new Promise((resolve, reject) => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = svgString;
                const svgElement = tempDiv.querySelector('svg');

                let width = parseInt(svgElement.getAttribute('width')) || 800;
                let height = parseInt(svgElement.getAttribute('height')) || 600;

                const widthStr = svgElement.getAttribute('width') || '';
                const heightStr = svgElement.getAttribute('height') || '';

                if (widthStr.includes('pt')) {
                    width = Math.ceil(parseFloat(widthStr) * 1.33);
                }
                if (heightStr.includes('pt')) {
                    height = Math.ceil(parseFloat(heightStr) * 1.33);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width * 2;
                canvas.height = height * 2;
                const ctx = canvas.getContext('2d');
                ctx.scale(2, 2);
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);

                const img = new Image();
                const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                img.onload = function() {
                    ctx.drawImage(img, 0, 0, width, height);
                    URL.revokeObjectURL(url);
                    resolve(canvas.toDataURL('image/png'));
                };

                img.onerror = function() {
                    URL.revokeObjectURL(url);
                    reject(new Error('Ошибка при конвертации SVG в PNG'));
                };

                img.src = url;
            });
        }

        function downloadSVG() {
            if (!currentSvgElement) {
                alert('Сначала визуализируйте RDF данные');
                return;
            }

            const svgData = new XMLSerializer().serializeToString(currentSvgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(svgBlob);
            downloadLink.download = 'rdf-graph.svg';

            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(downloadLink.href);
        }

        async function downloadPNG() {
            if (!currentSvgElement) {
                alert('Сначала визуализируйте RDF данные');
                return;
            }

            try {
                const svgData = new XMLSerializer().serializeToString(currentSvgElement);
                const pngDataUrl = await svgToPng(svgData);

                const downloadLink = document.createElement('a');
                downloadLink.href = pngDataUrl;
                downloadLink.download = 'rdf-graph.png';

                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);

            } catch (error) {
                console.error('Ошибка при скачивании PNG:', error);
                alert('Ошибка при создании PNG файла');
            }
        }

        // ============================================================================
        // ФУНКЦИИ ОТКРЫТИЯ В НОВОМ ОКНЕ
        // ============================================================================

        // formatMapping определён в 9_vadlib/vadlib.js (issue #234)

        /**
         * Открывает визуализацию в новом окне через внешний LDF сервис
         * Формирует URL с параметрами: rdf=данные&from=формат&to=png
         */
        function openInNewWindowLdfFi() {
            // Получаем входные данные
            const rdfInput = document.getElementById('rdf-input').value.trim();
            const inputFormat = document.getElementById('input-format').value;

            // Проверяем, что данные введены
            if (!rdfInput) {
                alert('Пожалуйста, введите RDF данные');
                return;
            }

            // Получаем формат для параметра URL
            const fromFormat = formatMapping[inputFormat] || 'ttl';

            // Кодируем RDF данные для URL
            // Заменяем пробелы на + для совместимости с LDF сервисом
            const encodedRdf = encodeURIComponent(rdfInput).replace(/%20/g, '+');

            // Формируем URL для внешнего сервиса
            const serviceUrl = `https://www.ldf.fi/service/rdf-grapher?rdf=${encodedRdf}&from=${fromFormat}&to=png`;

            // Открываем в новом окне
            window.open(serviceUrl, '_blank');
        }

        /**
         * Открывает визуализацию в новом окне через внешний LDF сервис с форматом TriG
         * Формирует URL с параметрами: rdf=данные&from=trig&to=png
         */
        function openInNewWindowLdfFiTrig() {
            // Получаем входные данные
            const rdfInput = document.getElementById('rdf-input').value.trim();

            // Проверяем, что данные введены
            if (!rdfInput) {
                alert('Пожалуйста, введите RDF данные');
                return;
            }

            // Кодируем RDF данные для URL
            // Заменяем пробелы на + для совместимости с LDF сервисом
            const encodedRdf = encodeURIComponent(rdfInput).replace(/%20/g, '+');

            // Формируем URL для внешнего сервиса с явным указанием формата TriG
            const serviceUrl = `https://www.ldf.fi/service/rdf-grapher?rdf=${encodedRdf}&from=trig&to=png`;

            // Открываем в новом окне
            window.open(serviceUrl, '_blank');
        }

        /**
         * Открывает визуализацию в новом окне через GitHub Pages (без внешнего сервиса)
         * Формирует URL с данными в хеше: #rdf=данные&from=формат&to=формат&mode=режим
         * Использует URL fragment (hash) вместо query params для избежания ошибки URI Too Long
         */
        function openInNewWindowGitHub() {
            // Получаем входные данные
            const rdfInput = document.getElementById('rdf-input').value.trim();
            const inputFormat = document.getElementById('input-format').value;
            const outputFormat = document.getElementById('output-format').value;
            const visualizationMode = document.getElementById('visualization-mode').value;

            // Проверяем, что данные введены
            if (!rdfInput) {
                alert('Пожалуйста, введите RDF данные');
                return;
            }

            // Получаем формат для параметра URL
            const fromFormat = formatMapping[inputFormat] || 'ttl';

            // Кодируем RDF данные для URL
            const encodedRdf = encodeURIComponent(rdfInput);

            // Определяем базовый URL динамически на основе текущего расположения HTML файла
            // Это позволяет корректно работать как на GitHub Pages, так и локально
            let baseUrl;
            // Используем текущую директорию HTML файла как базовый URL
            baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');

            // Формируем URL с данными в хеше (избегает ошибки URI Too Long)
            const hashParams = `rdf=${encodedRdf}&from=${fromFormat}&to=${outputFormat}&mode=${visualizationMode}`;
            const serviceUrl = `${baseUrl}#${hashParams}`;

            // Открываем в новом окне
            window.open(serviceUrl, '_blank');
        }

        /**
         * Открывает DOT-код в GraphvizOnline для интерактивного редактирования
         * Использует хеш URL для передачи DOT-кода
         */
        function openInNewWindowGraphvizOnline() {
            // Проверяем, что DOT-код был сгенерирован
            if (!currentDotCode) {
                alert('Сначала визуализируйте RDF данные');
                return;
            }

            // Кодируем DOT-код для URL
            const encodedDot = encodeURIComponent(currentDotCode);

            // Формируем URL с DOT-кодом в хеше
            const graphvizUrl = `https://dreampuf.github.io/GraphvizOnline/#${encodedDot}`;

            // Открываем в новом окне
            window.open(graphvizUrl, '_blank');
        }

        // ============================================================================
        // ФУНКЦИИ ФИЛЬТРОВ
        // ============================================================================

        function isPredicateHidden(predicateUri, predicateLabel) {
            return activeFilters.includes(predicateUri) || activeFilters.includes(predicateLabel);
        }

        function displayFilters() {
            // filter-panel removed in minimization - function kept for compatibility
            return;

            allPredicates = [];
            const predicateSet = new Set();

            // issue #324: Используем currentStore вместо currentQuads
            const allQuads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
            allQuads.forEach(quad => {
                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, currentPrefixes);
                if (!predicateSet.has(predicateLabel)) {
                    predicateSet.add(predicateLabel);
                    allPredicates.push({ uri: predicateUri, label: predicateLabel });
                }
            });

            if (allPredicates.length === 0) {
                filterPanel.style.display = 'none';
                return;
            }

            allPredicates.sort((a, b) => a.label.localeCompare(b.label));

            let html = '';
            allPredicates.forEach(pred => {
                const isHidden = isPredicateHidden(pred.uri, pred.label);
                const checkboxId = 'filter-' + pred.label.replace(/[^a-zA-Z0-9]/g, '_');

                html += `<div class="filter-item">`;
                html += `<input type="checkbox" id="${checkboxId}" ${!isHidden ? 'checked' : ''} onchange="togglePredicateFilter('${pred.uri}', '${pred.label}', this.checked)">`;
                html += `<label for="${checkboxId}">${pred.label}</label>`;
                html += `</div>`;
            });

            filterContent.innerHTML = html;
            filterPanel.style.display = 'block';
        }

        function togglePredicateFilter(predicateUri, predicateLabel, isVisible) {
            if (isVisible) {
                activeFilters = activeFilters.filter(f => f !== predicateUri && f !== predicateLabel);
            } else {
                if (!activeFilters.includes(predicateUri)) {
                    activeFilters.push(predicateUri);
                }
                if (!activeFilters.includes(predicateLabel)) {
                    activeFilters.push(predicateLabel);
                }
            }
            revisualize();
        }

        function selectAllFilters() {
            activeFilters = [];
            displayFilters();
            revisualize();
        }

        function deselectAllFilters() {
            activeFilters = allPredicates.flatMap(p => [p.uri, p.label]);
            displayFilters();
            revisualize();
        }

        // ============================================================================
        // ФУНКЦИИ УПРАВЛЕНИЯ РЕЖИМАМИ
        // ============================================================================

        function updateModeDescription() {
            const mode = document.getElementById('visualization-mode').value;
            const description = document.getElementById('mode-description');
            const maxVadRowLengthGroup = document.getElementById('max-vad-row-length-group');
            const sparqlModeSelect = document.getElementById('sparql-mode');
            const smartDesignOption = sparqlModeSelect ? sparqlModeSelect.querySelector('option[value="smart-design"]') : null;

            const descriptions = {
                'notation': 'С выделением типов объектов и предикатов цветом и формами',
                'base': 'Базовый режим без специальных стилей',
                'aggregation': 'Литералы агрегируются в узел субъекта',
                'vad': 'VAD: процессы как cds-фигуры с исполнителями',
                'vad-trig': 'VAD TriG: иерархия TriG с деревом и свойствами'
            };

            description.textContent = descriptions[mode] || '';

            // Показываем/скрываем параметр "Макс. длина VAD" для режимов VAD и VAD TriG
            if (mode === 'vad' || mode === 'vad-trig') {
                maxVadRowLengthGroup.style.display = 'block';
            } else {
                maxVadRowLengthGroup.style.display = 'none';
            }

            // Показываем/скрываем опцию "SPARQL Smart Design" в зависимости от режима визуализации
            if (smartDesignOption) {
                if (mode === 'vad-trig') {
                    smartDesignOption.style.display = '';
                } else {
                    smartDesignOption.style.display = 'none';
                    // Если был выбран smart-design, сбрасываем на 'no'
                    if (sparqlModeSelect.value === 'smart-design') {
                        sparqlModeSelect.value = 'no';
                    }
                }
            }

            // Обновляем состояние SPARQL панели
            toggleSparqlPanel();
        }

        function toggleSparqlPanel() {
            const sparqlMode = document.getElementById('sparql-mode').value;
            const visualizationMode = document.getElementById('visualization-mode').value;
            const sparqlPanel = document.getElementById('sparql-panel');
            const smartDesignContainer = document.getElementById('smart-design-container');

            // Скрываем оба панели по умолчанию
            if (sparqlPanel) sparqlPanel.classList.remove('visible');
            if (smartDesignContainer) smartDesignContainer.classList.remove('visible');

            if (sparqlMode === 'smart-design') {
                // SPARQL Smart Design отображается только в режиме VAD TriG
                if (visualizationMode === 'vad-trig') {
                    if (smartDesignContainer) smartDesignContainer.classList.add('visible');
                    // В режиме SPARQL Smart Design всегда также отображается окно SPARQL запрос
                    if (sparqlPanel) sparqlPanel.classList.add('visible');
                    // Заполняем выпадающие списки при активации Smart Design
                    populateSmartDesignDropdowns();
                    // Показываем справочные сообщения при открытии панели
                    showSmartDesignMessage('Выберите TriG, затем Subject, Predicate и Object. Нажмите "Создать SPARQL" для генерации запроса.', 'info');
                    showResultSparqlMessage('После генерации SPARQL запроса нажмите "Применить как Simple Triple" или "Применить как Shorthand Triple" для добавления в RDF данные.', 'info');
                } else {
                    // Показываем сообщение, что Smart Design доступен только в VAD TriG
                    showSmartDesignMessage('SPARQL Smart Design доступен только в режиме "Режим VAD TriG"', 'info');
                }
            }
        }

        // ============================================================================
        // ПАРСИНГ URL ПАРАМЕТРОВ
        // ============================================================================

        /**
         * Парсит URL параметры и возвращает объект с параметрами
         * Поддерживает параметры как в query string (?...), так и в hash (#...)
         * Hash имеет приоритет над query string для избежания ошибки URI Too Long
         *
         * Поддерживаемые параметры:
         * - rdf: RDF данные (URL-encoded)
         * - from: входной формат (ttl, nt, nq, trig)
         * - to: выходной формат (svg, png)
         * - mode: режим визуализации (notation, base, aggregation, vad)
         *
         * @returns {Object} - Объект с параметрами
         */
        function parseUrlParams() {
            // Сначала пробуем получить параметры из hash (приоритет)
            let urlParams;
            if (window.location.hash && window.location.hash.length > 1) {
                // Убираем # и парсим как URLSearchParams
                urlParams = new URLSearchParams(window.location.hash.substring(1));
            } else {
                // Fallback на query string для обратной совместимости
                urlParams = new URLSearchParams(window.location.search);
            }

            const params = {};

            // Маппинг обратный: параметры URL -> внутренние форматы
            const reverseFormatMapping = {
                'ttl': 'turtle',
                'turtle': 'turtle',
                'nt': 'n-triples',
                'n-triples': 'n-triples',
                'nq': 'n-quads',
                'n-quads': 'n-quads',
                'trig': 'trig'
            };

            // Получаем RDF данные из параметра
            if (urlParams.has('rdf')) {
                params.rdf = urlParams.get('rdf');
            }

            // Получаем входной формат
            if (urlParams.has('from')) {
                const fromParam = urlParams.get('from');
                params.from = reverseFormatMapping[fromParam] || 'turtle';
            }

            // Получаем выходной формат
            if (urlParams.has('to')) {
                const toParam = urlParams.get('to');
                if (toParam === 'png' || toParam === 'svg') {
                    params.to = toParam;
                }
            }

            // Получаем режим визуализации
            if (urlParams.has('mode')) {
                const modeParam = urlParams.get('mode');
                const validModes = ['notation', 'base', 'aggregation', 'vad', 'vad-trig'];
                if (validModes.includes(modeParam)) {
                    params.mode = modeParam;
                }
            }

            return params;
        }

