// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/368
// 5_publisher_treeview_ui.js - UI функции TreeView модуля Publisher
// Управление деревом TriG и окном "Карточка объекта treeview"

        /**
         * Получает метаданные процесса из vad:ptree (rdfs:label, dcterms:description, vad:hasTrig)
         * @param {string} processUri - URI процесса
         * @param {Object} prefixes - Словарь префиксов
         * @returns {Object} - { label: string|null, description: string|null, hasTrig: string|null }
         */
        function getProcessMetadataFromPtree(processUri, prefixes) {
            const result = { label: null, description: null, hasTrig: null };

            // Если нет trigHierarchy или нет vad:ptree, возвращаем пустой результат
            if (!trigHierarchy || !trigHierarchy[PTREE_GRAPH_URI]) {
                return result;
            }

            const ptreeQuads = trigHierarchy[PTREE_GRAPH_URI].quads;

            ptreeQuads.forEach(quad => {
                if (quad.subject.value !== processUri) return;

                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, prefixes);

                if (predicateLabel === 'rdfs:label' || predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label') {
                    result.label = quad.object.value;
                }
                if (predicateLabel === 'dcterms:description' || predicateUri === 'http://purl.org/dc/terms/description') {
                    result.description = quad.object.value;
                }
                if (predicateLabel === 'vad:hasTrig' || predicateUri === 'http://example.org/vad#hasTrig') {
                    result.hasTrig = quad.object.value;
                }
            });

            return result;
        }

        /**
         * Получает имя исполнителя (rdfs:label) из vad:rtree
         * @param {string} executorUri - URI исполнителя
         * @param {Object} prefixes - Словарь префиксов
         * @returns {string|null} - rdfs:label исполнителя или null
         */
        function getExecutorNameFromRtree(executorUri, prefixes) {
            // Если нет trigHierarchy или нет vad:rtree, возвращаем null
            if (!trigHierarchy || !trigHierarchy[RTREE_GRAPH_URI]) {
                return null;
            }

            const rtreeQuads = trigHierarchy[RTREE_GRAPH_URI].quads;

            for (const quad of rtreeQuads) {
                if (quad.subject.value !== executorUri) continue;

                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, prefixes);

                if (predicateLabel === 'rdfs:label' || predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label') {
                    return quad.object.value;
                }
            }

            return null;
        }

        /**
         * Строит HTML дерево для отображения иерархии TriG графов
         * @param {string} objUri - URI текущего объекта
         * @param {Object} hierarchy - Иерархия объектов
         * @param {Object} prefixes - Словарь префиксов
         * @param {number} level - Уровень вложенности (для отступов)
         * @returns {string} - HTML дерева
         */
        function buildTriGTreeHtml(objUri, hierarchy, prefixes, level = 0, parentIsPtree = false) {
            const objInfo = hierarchy[objUri];
            if (!objInfo) return '';

            // issue #262: TechnoTree типы не отображаются в Publisher treeview
            if (objInfo.isTechnoTree) {
                return '';
            }

            const prefixedUri = getPrefixedName(objUri, prefixes);
            const localName = getLocalName(objUri);
            const displayLabel = objInfo.label || localName;
            const isSelected = objUri === selectedTrigUri;
            const hasChildren = objInfo.children && objInfo.children.length > 0;
            const hasProcesses = objInfo.processes && objInfo.processes.length > 0;
            const hasExpandableContent = hasChildren || hasProcesses;
            const isTrig = objInfo.isTrig;  // Объект типа TriG отображается жирным

            // Определяем, является ли текущий объект ptree (Дерево Процессов)
            const isPtree = objUri === PTREE_GRAPH_URI || objUri.endsWith('#ptree');

            // Определяем, должен ли узел быть раскрыт по умолчанию:
            // - ptree раскрыт на один уровень (сам ptree раскрыт, но его дети - нет)
            // - Остальные TriG деревья свернуты по умолчанию
            const shouldBeExpanded = isPtree;  // Only ptree is expanded by default

            // Генерируем уникальные ID для переключения свертывания/развертывания
            const childrenId = `tree-children-${escapeHtml(objUri).replace(/[^a-zA-Z0-9]/g, '_')}`;
            const toggleId = `tree-toggle-${escapeHtml(objUri).replace(/[^a-zA-Z0-9]/g, '_')}`;

            let html = '';

            // Элемент дерева
            // Для объектов типа TriG (VADProcessDia, ObjectTree) - кликабельные, можно выбрать для отображения схемы
            // Для других объектов (TypeProcess, TypeExecutor) - кликабельные для отображения свойств
            const isTriGClickable = isTrig && objInfo.quads && objInfo.quads.length > 0;
            let clickHandler;
            if (isTriGClickable) {
                // Клик по TriG - выбираем его для отображения схемы
                clickHandler = `onclick="selectTriG('${escapeHtml(objUri)}')"`;
            } else {
                // Клик по не-TriG объекту - показываем свойства объекта
                clickHandler = `onclick="selectTreeObject('${escapeHtml(objUri)}')"`;
            }
            const trigClass = isTrig ? 'trig-item-bold' : 'trig-item-normal';

            html += `<div class="trig-tree-item ${isSelected ? 'selected active' : ''} ${trigClass}"
                         data-trig-uri="${escapeHtml(objUri)}"
                         ${clickHandler}>`;

            // Значок раскрытия/закрытия (кликабельный для свертывания/развертывания)
            // По умолчанию свернуто (>), кроме ptree (v)
            if (hasExpandableContent) {
                const toggleIcon = shouldBeExpanded ? '\u25BC' : '\u25B6';
                html += `<span class="trig-tree-toggle" id="${toggleId}" onclick="event.stopPropagation(); toggleTreeNode('${childrenId}', '${toggleId}')">${toggleIcon}</span>`;
            } else {
                html += `<span class="trig-tree-toggle"></span>`;
            }

            // Метка с id (жирный текст для TriG объектов)
            if (isTrig) {
                html += `<span class="trig-tree-label" style="font-weight: bold;">${escapeHtml(displayLabel)}</span>`;
            } else {
                html += `<span class="trig-tree-label">${escapeHtml(displayLabel)}</span>`;
            }
            html += `<span class="trig-tree-id">(${escapeHtml(localName)})</span>`;
            html += `</div>`;

            // Содержимое дерева (дочерние объекты и состав объектов)
            // По умолчанию скрыто (display: none), кроме ptree
            if (hasExpandableContent) {
                const displayStyle = shouldBeExpanded ? '' : 'style="display: none;"';
                html += `<div class="trig-tree-children" id="${childrenId}" ${displayStyle}>`;

                // Сначала показываем дочерние объекты
                // Дети ptree передаются с флагом parentIsPtree=true, чтобы они были свернуты
                if (hasChildren) {
                    objInfo.children.forEach(childUri => {
                        html += buildTriGTreeHtml(childUri, hierarchy, prefixes, level + 1, isPtree);
                    });
                }

                // Для VADProcessDia показываем "Состав объектов" с процессами (индивиды)
                if (hasProcesses && isTrig) {
                    html += buildObjectCompositionHtml(objUri, objInfo.processes, prefixes);
                }

                html += `</div>`;
            }

            return html;
        }

        /**
         * Переключает видимость дочерних элементов в дереве TriG
         * @param {string} childrenId - ID контейнера с дочерними элементами
         * @param {string} toggleId - ID значка переключения
         */
        function toggleTreeNode(childrenId, toggleId) {
            const children = document.getElementById(childrenId);
            const toggle = document.getElementById(toggleId);

            if (children && toggle) {
                if (children.style.display === 'none') {
                    children.style.display = 'block';
                    toggle.textContent = '\u25BC';
                } else {
                    children.style.display = 'none';
                    toggle.textContent = '\u25B6';
                }
            }
        }

        /**
         * Строит HTML для раздела "Состав объектов" с процессами
         * @param {string} trigUri - URI TriG, которому принадлежат процессы
         * @param {Array} processes - Массив URI процессов
         * @param {Object} prefixes - Словарь префиксов
         * @returns {string} - HTML раздела
         */
        function buildObjectCompositionHtml(trigUri, processes, prefixes) {
            const objectCompositionId = `obj-comp-${escapeHtml(trigUri).replace(/[^a-zA-Z0-9]/g, '_')}`;

            let html = '';

            // Заголовок "Состав объектов"
            html += `<div class="trig-tree-item object-composition-header"
                         onclick="toggleObjectComposition('${objectCompositionId}')">`;
            html += `<span class="trig-tree-toggle object-composition-toggle" id="${objectCompositionId}-toggle">\u25B6</span>`;
            html += `<span class="trig-tree-label object-composition-label">Состав объектов</span>`;
            html += `<span class="trig-tree-id">(${processes.length})</span>`;
            html += `</div>`;

            // Список процессов (скрыт по умолчанию)
            html += `<div class="trig-tree-children object-composition-list" id="${objectCompositionId}" style="display: none;">`;

            processes.forEach(processUri => {
                const processLabel = getPrefixedName(processUri, prefixes);
                const processLocalName = getLocalName(processUri);

                // Ищем rdfs:label процесса - сначала в текущем TriG, затем в vad:ptree
                let processDisplayName = processLocalName;
                if (trigHierarchy && trigHierarchy[trigUri]) {
                    const graphQuads = trigHierarchy[trigUri].quads;
                    const labelQuad = graphQuads.find(q =>
                        q.subject.value === processUri &&
                        (q.predicate.value === 'http://www.w3.org/2000/01/rdf-schema#label' ||
                         getPrefixedName(q.predicate.value, prefixes) === 'rdfs:label')
                    );
                    if (labelQuad) {
                        processDisplayName = labelQuad.object.value;
                    } else {
                        // Fallback: ищем в vad:ptree
                        const ptreeMetadata = getProcessMetadataFromPtree(processUri, prefixes);
                        if (ptreeMetadata.label) {
                            processDisplayName = ptreeMetadata.label;
                        }
                    }
                }

                html += `<div class="trig-tree-item process-item"
                             data-process-uri="${escapeHtml(processUri)}"
                             data-trig-uri="${escapeHtml(trigUri)}"
                             onclick="event.stopPropagation(); selectProcess('${escapeHtml(processUri)}', '${escapeHtml(trigUri)}')">`;
                html += `<span class="trig-tree-toggle"></span>`;
                html += `<span class="process-icon">\u2699</span>`;
                html += `<span class="trig-tree-label">${escapeHtml(processDisplayName)}</span>`;
                html += `</div>`;
            });

            html += `</div>`;

            return html;
        }

        /**
         * Переключает видимость списка объектов (Состав объектов)
         * @param {string} listId - ID списка для переключения
         */
        function toggleObjectComposition(listId) {
            const list = document.getElementById(listId);
            const toggle = document.getElementById(listId + '-toggle');

            if (list && toggle) {
                if (list.style.display === 'none') {
                    list.style.display = 'block';
                    toggle.textContent = '\u25BC';
                } else {
                    list.style.display = 'none';
                    toggle.textContent = '\u25B6';
                }
            }
        }

        /**
         * Обработчик выбора процесса в дереве
         * @param {string} processUri - URI выбранного процесса
         * @param {string} trigUri - URI TriG, содержащего процесс
         */
        function selectProcess(processUri, trigUri) {
            // Если выбранный процесс из другого TriG, сначала переключаемся на этот TriG
            if (selectedTrigUri !== trigUri) {
                selectTriG(trigUri);
            }

            // Подсвечиваем процесс на диаграмме
            highlightProcessOnDiagram(processUri);

            // Отображаем свойства выбранного объекта в окне "Карточка объекта treeview"
            displayObjectProperties(processUri, trigUri, currentPrefixes);
        }

        /**
         * Отображает свойства любого объекта (не только TriG) в панели "Карточка объекта treeview"
         * Разделяет свойства на три блока:
         * 1. Свойства индивида из текущего TriG (IndividProcessPredicate)
         * 2. VirtualTriG - вычисляемые свойства (отделённые горизонтальной линией)
         * 3. Свойства концепта из ptree (ConceptProcessPredicate)
         *
         * @param {string} objectUri - URI объекта
         * @param {string} contextTrigUri - URI TriG контекста (может быть null)
         * @param {Object} prefixes - Словарь префиксов
         */
        function displayObjectProperties(objectUri, contextTrigUri, prefixes) {
            const propertiesContent = document.getElementById('trig-properties-content');
            if (!propertiesContent) return;

            const prefixedUri = getPrefixedName(objectUri, prefixes);

            // Предикаты для концепта процесса (из vad:ConceptProcessPredicate)
            // Эти свойства хранятся в ptree
            const conceptPredicates = [
                'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                'http://www.w3.org/2000/01/rdf-schema#label',
                'http://purl.org/dc/terms/description',
                'http://example.org/vad#hasTrig',
                'http://example.org/vad#hasParentObj'
            ];

            // Собираем свойства из текущего TriG контекста (индивидуальные свойства)
            const trigProperties = [];
            // Собираем свойства из ptree (свойства концепта)
            const conceptProperties = [];
            // Наборы для дедупликации свойств
            const seenTrigProps = new Set();
            const seenConceptProps = new Set();
            let objectLabel = null;

            // issue #336: Определяем тип объекта для кнопки Методы
            let objectMethodType = null;  // 'isSubprocessTrig' или 'ExecutorGroup'

            // issue #324: Используем currentStore вместо currentQuads
            const allQuads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
            allQuads.forEach(quad => {
                if (quad.subject.value === objectUri) {
                    const predicateUri = quad.predicate.value;
                    const predicateLabel = getPrefixedName(predicateUri, prefixes);
                    const objectValue = quad.object.termType === 'Literal'
                        ? `"${quad.object.value}"`
                        : getPrefixedName(quad.object.value, prefixes);
                    const isLiteral = quad.object.termType === 'Literal';
                    const graphUri = quad.graph ? quad.graph.value : null;

                    // Запоминаем rdfs:label для отображения в заголовке
                    if (predicateLabel === 'rdfs:label' || predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label') {
                        objectLabel = quad.object.value;
                    }

                    // issue #336: Определяем тип объекта по предикатам
                    if (predicateUri === 'http://example.org/vad#isSubprocessTrig' || predicateLabel === 'vad:isSubprocessTrig') {
                        objectMethodType = 'isSubprocessTrig';
                    }
                    if (predicateUri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
                        if (quad.object.value === 'http://example.org/vad#ExecutorGroup' ||
                            objectValue === 'vad:ExecutorGroup') {
                            objectMethodType = 'ExecutorGroup';
                        }
                    }

                    const propInfo = {
                        predicate: predicateLabel,
                        predicateUri: predicateUri,
                        value: objectValue,
                        valueUri: quad.object.termType === 'Literal' ? null : quad.object.value,
                        isLiteral: isLiteral,
                        graphUri: graphUri
                    };

                    // Создаём уникальный ключ для дедупликации
                    const propKey = `${predicateLabel}|${objectValue}`;

                    // Разделяем свойства по источнику с дедупликацией
                    if (graphUri === PTREE_GRAPH_URI) {
                        // Свойства из ptree (концепт)
                        if (!seenConceptProps.has(propKey)) {
                            seenConceptProps.add(propKey);
                            conceptProperties.push(propInfo);
                        }
                    } else if (contextTrigUri && graphUri === contextTrigUri) {
                        // Свойства из текущего TriG (индивид)
                        if (!seenTrigProps.has(propKey)) {
                            seenTrigProps.add(propKey);
                            trigProperties.push(propInfo);
                        }
                    } else {
                        // issue #374: Fallback - показываем свойства из других графов (rtree, etc.)
                        // когда нет выбранного TriG или объект находится в специальном графе
                        // Это позволяет отображать свойства объектов вроде vad:Executor3 из vad:rtree
                        if (!contextTrigUri || graphUri === RTREE_GRAPH_URI) {
                            if (!seenTrigProps.has(propKey)) {
                                seenTrigProps.add(propKey);
                                trigProperties.push(propInfo);
                            }
                        }
                    }
                }
            });

            let html = '';

            // ============================================================================
            // БЛОК 1: Свойства индивида из текущего TriG
            // ============================================================================
            html += `<div class="trig-property-section">`;

            // Заголовок - URI объекта с кнопкой копирования и Методы
            html += `<div class="trig-property-item">`;
            html += `<div class="trig-property-predicate">URI</div>`;
            html += `<div class="trig-property-value-container">`;
            html += `<div class="trig-property-value uri">${escapeHtml(prefixedUri)}</div>`;
            html += `<div class="trig-property-buttons">`;
            html += `<button class="copy-id-btn" onclick="copyObjectId('${escapeHtml(objectUri)}', this)">Копировать</button>`;
            // issue #336: Кнопка Методы (только если объект имеет тип с методами)
            // issue #390: Добавлена всплывающая подсказка (title) для кнопки Методы
            if (objectMethodType && contextTrigUri) {
                const escapedObjectUri = escapeHtml(objectUri).replace(/'/g, "\\'");
                const escapedTrigUri = escapeHtml(contextTrigUri).replace(/'/g, "\\'");
                html += `<button class="methods-btn" onclick="toggleMethodsDropdown(event, '${escapedObjectUri}', '${escapedTrigUri}', '${objectMethodType}')" title="Методы объекта">Методы</button>`;
            }
            html += `</div>`;
            html += `</div>`;
            html += `</div>`;

            // Свойства из текущего TriG
            trigProperties.forEach(prop => {
                html += `<div class="trig-property-item">`;
                html += `<div class="trig-property-predicate">${escapeHtml(prop.predicate)}</div>`;
                if (prop.isLiteral) {
                    html += `<div class="trig-property-value literal">${escapeHtml(prop.value)}</div>`;
                } else {
                    html += `<div class="trig-property-value uri">${escapeHtml(prop.value)}</div>`;
                }
                html += `</div>`;
            });

            html += `</div>`; // end section 1

            // ============================================================================
            // issue #324: БЛОК 2: VirtualTriG - вычисляемые свойства (отделённые линией)
            // ============================================================================
            let processSubtype = null;
            if (contextTrigUri && currentStore) {
                // Формируем URI виртуального TriG
                const virtualTrigUri = contextTrigUri.replace('#t_', '#vt_');
                const PROCESS_SUBTYPE_URI = 'http://example.org/vad#processSubtype';

                // Получаем processSubtype для данного объекта из Virtual TriG
                const subtypeQuads = currentStore.getQuads(objectUri, PROCESS_SUBTYPE_URI, null, virtualTrigUri);
                if (subtypeQuads.length > 0) {
                    const subtypeUri = subtypeQuads[0].object.value;
                    processSubtype = subtypeUri.split('#').pop();
                }
            }

            if (processSubtype) {
                // Добавляем разделитель
                html += `<div class="trig-property-separator">`;
                html += `<div class="separator-line"></div>`;
                html += `<div class="separator-text">VirtualTriG</div>`;
                html += `<div class="separator-line"></div>`;
                html += `</div>`;

                html += `<div class="trig-property-section">`;
                html += `<div class="trig-property-item virtual-property">`;
                html += `<div class="trig-property-predicate">vad:processSubtype</div>`;
                html += `<div class="trig-property-value uri virtual">vad:${escapeHtml(processSubtype)}</div>`;
                html += `</div>`;
                html += `</div>`; // end section 2
            }

            // ============================================================================
            // БЛОК 3: Свойства концепта из ptree (отделённые линией)
            // ============================================================================
            if (conceptProperties.length > 0) {
                // Добавляем разделитель
                html += `<div class="trig-property-separator">`;
                html += `<div class="separator-line"></div>`;
                html += `<div class="separator-text">Свойства концепта (ptree)</div>`;
                html += `<div class="separator-line"></div>`;
                html += `</div>`;

                html += `<div class="trig-property-section concept-section">`;

                conceptProperties.forEach(prop => {
                    html += `<div class="trig-property-item concept-property">`;
                    html += `<div class="trig-property-predicate">${escapeHtml(prop.predicate)}</div>`;
                    if (prop.isLiteral) {
                        html += `<div class="trig-property-value literal">${escapeHtml(prop.value)}</div>`;
                    } else {
                        html += `<div class="trig-property-value uri">${escapeHtml(prop.value)}</div>`;
                    }
                    html += `</div>`;
                });

                html += `</div>`; // end section 3
            }

            // Если нет свойств вообще
            if (trigProperties.length === 0 && conceptProperties.length === 0 && !processSubtype) {
                html = `<div class="trig-properties-empty">Нет свойств для объекта ${escapeHtml(prefixedUri)}</div>`;
            }

            propertiesContent.innerHTML = html;
        }

        /**
         * Обработчик выбора объекта в дереве (для не-TriG объектов)
         * Отображает свойства объекта без изменения выбранного TriG
         * @param {string} objectUri - URI выбранного объекта
         */
        function selectTreeObject(objectUri) {
            // Выделяем элемент в дереве
            const treeItems = document.querySelectorAll('.trig-tree-item');
            treeItems.forEach(item => {
                if (item.getAttribute('data-trig-uri') === objectUri) {
                    item.classList.add('selected');
                } else {
                    // Не снимаем выделение с активного TriG, только с других не-TriG элементов
                    if (!item.classList.contains('active')) {
                        item.classList.remove('selected');
                    }
                }
            });

            // Отображаем свойства объекта в окне "Карточка объекта treeview"
            displayObjectProperties(objectUri, selectedTrigUri, currentPrefixes);
        }

        /**
         * Подсвечивает процесс на диаграмме
         * @param {string} processUri - URI процесса для подсветки
         */
        function highlightProcessOnDiagram(processUri) {
            // Снимаем предыдущее выделение
            const previouslySelected = document.querySelectorAll('#vad-trig-output .node.process-highlighted');
            previouslySelected.forEach(node => {
                node.classList.remove('process-highlighted');
            });

            // Находим узел процесса по его ID (используем nodeLabelToUri для поиска)
            const prefixedUri = getPrefixedName(processUri, currentPrefixes);
            const nodeId = generateVadNodeId(processUri, currentPrefixes);

            // Ищем узел SVG по ID или по тексту
            const output = document.getElementById('vad-trig-output');
            if (!output) return;

            const nodes = output.querySelectorAll('.node');
            nodes.forEach(node => {
                const titleElement = node.querySelector('title');
                if (titleElement) {
                    const nodeTitle = titleElement.textContent.trim();
                    // Проверяем, совпадает ли ID узла или его метка с URI процесса
                    if (nodeTitle === nodeId || nodeLabelToUri[nodeTitle] === processUri) {
                        node.classList.add('process-highlighted');
                        // Прокручиваем к выбранному элементу
                        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            });

            // Также выделяем элемент в дереве
            const processItems = document.querySelectorAll('.process-item');
            processItems.forEach(item => {
                if (item.getAttribute('data-process-uri') === processUri) {
                    item.classList.add('process-selected');
                } else {
                    item.classList.remove('process-selected');
                }
            });
        }

        /**
         * Отображает дерево TriG
         * @param {Object} hierarchy - Иерархия TriG
         * @param {string} rootUri - URI корневого TriG
         * @param {Object} prefixes - Словарь префиксов
         */
        function displayTriGTree(hierarchy, rootUris, prefixes) {
            const treeContent = document.getElementById('trig-tree-content');
            if (!treeContent) return;

            if (!rootUris || rootUris.length === 0) {
                treeContent.innerHTML = '<div class="trig-properties-empty">Нет доступных TriG графов</div>';
                return;
            }

            // issue #262: фильтруем TechnoTree типы из корневых элементов
            const filteredRootUris = rootUris.filter(rootUri => {
                const objInfo = hierarchy[rootUri];
                return objInfo && !objInfo.isTechnoTree;
            });

            if (filteredRootUris.length === 0) {
                treeContent.innerHTML = '<div class="trig-properties-empty">Нет доступных TriG графов</div>';
                return;
            }

            let html = '';
            filteredRootUris.forEach(rootUri => {
                if (hierarchy[rootUri]) {
                    html += buildTriGTreeHtml(rootUri, hierarchy, prefixes, 0);
                }
            });
            treeContent.innerHTML = html;
        }

        /**
         * Отображает свойства выбранного TriG в окне "Карточка объекта treeview"
         * @param {string} trigUri - URI TriG
         * @param {Object} hierarchy - Иерархия TriG
         * @param {Object} prefixes - Словарь префиксов
         */
        function displayTriGProperties(trigUri, hierarchy, prefixes) {
            const propertiesContent = document.getElementById('trig-properties-content');
            if (!propertiesContent) return;

            const graphInfo = hierarchy[trigUri];
            if (!graphInfo) {
                propertiesContent.innerHTML = '<div class="trig-properties-empty">Выберите TriG в дереве</div>';
                return;
            }

            let html = '';

            // Основные свойства TriG
            const prefixedUri = getPrefixedName(trigUri, prefixes);

            // URI with copy button
            html += `<div class="trig-property-item">`;
            html += `<div class="trig-property-predicate">URI</div>`;
            html += `<div class="trig-property-value-container">`;
            html += `<div class="trig-property-value uri">${escapeHtml(prefixedUri)}</div>`;
            html += `<button class="copy-id-btn" onclick="copyObjectId('${escapeHtml(trigUri)}', this)">Копировать</button>`;
            html += `</div>`;
            html += `</div>`;

            // Label
            if (graphInfo.label) {
                html += `<div class="trig-property-item">`;
                html += `<div class="trig-property-predicate">rdfs:label</div>`;
                html += `<div class="trig-property-value literal">"${escapeHtml(graphInfo.label)}"</div>`;
                html += `</div>`;
            }

            // hasParent
            if (graphInfo.hasParent) {
                const parentLabel = getPrefixedName(graphInfo.hasParent, prefixes);
                html += `<div class="trig-property-item">`;
                html += `<div class="trig-property-predicate">vad:hasParentObj</div>`;
                html += `<div class="trig-property-value uri">${escapeHtml(parentLabel)}</div>`;
                html += `</div>`;
            }

            // Количество процессов
            html += `<div class="trig-property-item">`;
            html += `<div class="trig-property-predicate">Процессы (vad:TypeProcess)</div>`;
            html += `<div class="trig-property-value">${graphInfo.processes.length} шт.</div>`;
            html += `</div>`;

            // Количество дочерних TriG
            if (graphInfo.children.length > 0) {
                html += `<div class="trig-property-item">`;
                html += `<div class="trig-property-predicate">Дочерние TriG</div>`;
                html += `<div class="trig-property-value">${graphInfo.children.length} шт.</div>`;
                html += `</div>`;
            }

            // Количество триплетов
            // issue #270: Проверка наличия quads перед обращением к length
            html += `<div class="trig-property-item">`;
            html += `<div class="trig-property-predicate">Триплеты</div>`;
            html += `<div class="trig-property-value">${graphInfo.quads?.length || 0} шт.</div>`;
            html += `</div>`;

            propertiesContent.innerHTML = html;
        }

        /**
         * Обработчик выбора TriG в дереве
         * issue #301: Добавлена поддержка навигационной истории и синхронизации TreeView
         * @param {string} trigUri - URI выбранного TriG
         * @param {boolean} skipHistoryUpdate - Пропустить обновление истории (используется при навигации назад/вперёд)
         */
        function selectTriG(trigUri, skipHistoryUpdate = false) {
            selectedTrigUri = trigUri;

            // issue #301: Обновляем историю навигации (если это не навигация по истории)
            if (!skipHistoryUpdate && trigUri) {
                addToNavigationHistory(trigUri);
            }

            // issue #301: Обновляем выделение в дереве и раскрываем путь к элементу
            highlightAndExpandTreePath(trigUri);

            // Отображаем свойства выбранного TriG в окне "Карточка объекта treeview"
            displayTriGProperties(trigUri, trigHierarchy, currentPrefixes);

            // Перевизуализируем граф для выбранного TriG
            revisualizeTrigVAD(trigUri);

            // Обновляем SPARQL запрос для выбранного TriG
            updateSparqlQueryForTriG();

            // Обновляем классический редактор диаграмм
            if (typeof window.editorRefresh === 'function') {
                window.editorRefresh();
            }
            // Показываем метку текущего графа в тулбаре редактора
            const editorTrigLabel = document.getElementById('editor-trig-label');
            if (editorTrigLabel && trigUri) {
                const shortUri = trigUri.split('#').pop() || trigUri;
                editorTrigLabel.textContent = 'Граф: ' + shortUri;
            }
        }

        /**
         * issue #301: Добавляет TriG в историю навигации
         * @param {string} trigUri - URI TriG для добавления в историю
         */
        function addToNavigationHistory(trigUri) {
            // Если мы в середине истории, удаляем всё после текущей позиции
            if (diagramNavigationIndex < diagramNavigationHistory.length - 1) {
                diagramNavigationHistory = diagramNavigationHistory.slice(0, diagramNavigationIndex + 1);
            }

            // Добавляем только если это не дубликат последнего элемента
            if (diagramNavigationHistory.length === 0 ||
                diagramNavigationHistory[diagramNavigationHistory.length - 1] !== trigUri) {
                diagramNavigationHistory.push(trigUri);
                diagramNavigationIndex = diagramNavigationHistory.length - 1;
            }

            // Обновляем состояние кнопок навигации
            updateNavigationButtons();
        }

        /**
         * issue #301: Обновляет состояние кнопок навигации (активность/неактивность)
         */
        function updateNavigationButtons() {
            const backBtn = document.getElementById('diagram-nav-back');
            const forwardBtn = document.getElementById('diagram-nav-forward');

            if (backBtn) {
                backBtn.disabled = diagramNavigationIndex <= 0;
            }
            if (forwardBtn) {
                forwardBtn.disabled = diagramNavigationIndex >= diagramNavigationHistory.length - 1;
            }
        }

        /**
         * issue #301: Навигация назад по истории диаграмм
         */
        function navigateDiagramBack() {
            if (diagramNavigationIndex > 0) {
                diagramNavigationIndex--;
                const trigUri = diagramNavigationHistory[diagramNavigationIndex];
                selectTriG(trigUri, true);  // skipHistoryUpdate = true
                updateNavigationButtons();
            }
        }

        /**
         * issue #301: Навигация вперёд по истории диаграмм
         */
        function navigateDiagramForward() {
            if (diagramNavigationIndex < diagramNavigationHistory.length - 1) {
                diagramNavigationIndex++;
                const trigUri = diagramNavigationHistory[diagramNavigationIndex];
                selectTriG(trigUri, true);  // skipHistoryUpdate = true
                updateNavigationButtons();
            }
        }

        /**
         * issue #301: Сбрасывает историю навигации (вызывается при загрузке новых данных)
         */
        function resetNavigationHistory() {
            diagramNavigationHistory = [];
            diagramNavigationIndex = -1;
            updateNavigationButtons();
        }

        /**
         * issue #301: Подсвечивает элемент в TreeView и раскрывает путь к нему
         * @param {string} trigUri - URI TriG для подсветки
         */
        function highlightAndExpandTreePath(trigUri) {
            // Обновляем выделение в дереве
            const treeItems = document.querySelectorAll('.trig-tree-item');
            treeItems.forEach(item => {
                if (item.getAttribute('data-trig-uri') === trigUri) {
                    item.classList.add('selected', 'active');

                    // Раскрываем все родительские узлы до этого элемента
                    expandParentNodes(item);

                    // Прокручиваем к выбранному элементу
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    item.classList.remove('selected', 'active');
                }
            });
        }

        /**
         * issue #301: Раскрывает все родительские узлы до указанного элемента
         * issue #305: Исключаем object-composition-list из автоматического раскрытия
         * @param {HTMLElement} element - Элемент дерева
         */
        function expandParentNodes(element) {
            let parent = element.parentElement;

            while (parent) {
                // Если родитель - это контейнер дочерних элементов (.trig-tree-children), раскрываем его
                // issue #305: Исключаем object-composition-list - "Состав объектов" не должен раскрываться автоматически
                if (parent.classList && parent.classList.contains('trig-tree-children') &&
                    !parent.classList.contains('object-composition-list')) {
                    parent.style.display = 'block';

                    // Также обновляем иконку переключателя (toggle)
                    const toggleId = parent.id.replace('tree-children-', 'tree-toggle-');
                    const toggle = document.getElementById(toggleId);
                    if (toggle) {
                        toggle.textContent = '\u25BC';  // ▼ (развёрнуто)
                    }
                }
                parent = parent.parentElement;
            }
        }

        /**
         * issue #376: Сохраняет состояние раскрытия/свёртки дерева TreeView
         * @returns {Object} - Объект с состоянием: { expandedNodes: Set, expandedCompositions: Set }
         */
        function saveTreeViewState() {
            const state = {
                expandedNodes: new Set(),
                expandedCompositions: new Set()
            };

            // Сохраняем раскрытые узлы дерева (.trig-tree-children)
            const treeChildren = document.querySelectorAll('.trig-tree-children');
            treeChildren.forEach(child => {
                if (child.style.display !== 'none' && child.id) {
                    if (child.classList.contains('object-composition-list')) {
                        state.expandedCompositions.add(child.id);
                    } else {
                        state.expandedNodes.add(child.id);
                    }
                }
            });

            console.log('issue #376: Saved TreeView state -', state.expandedNodes.size, 'nodes,', state.expandedCompositions.size, 'compositions');
            return state;
        }

        /**
         * issue #376: Восстанавливает состояние раскрытия/свёртки дерева TreeView
         * @param {Object} state - Объект с состоянием от saveTreeViewState()
         */
        function restoreTreeViewState(state) {
            if (!state) return;

            let restoredNodes = 0;
            let restoredCompositions = 0;

            // Восстанавливаем раскрытые узлы дерева
            state.expandedNodes.forEach(id => {
                const child = document.getElementById(id);
                if (child) {
                    child.style.display = 'block';
                    restoredNodes++;

                    // Обновляем иконку переключателя
                    const toggleId = id.replace('tree-children-', 'tree-toggle-');
                    const toggle = document.getElementById(toggleId);
                    if (toggle) {
                        toggle.textContent = '\u25BC';  // ▼ (развёрнуто)
                    }
                }
            });

            // Восстанавливаем раскрытые секции "Состав объектов"
            state.expandedCompositions.forEach(id => {
                const child = document.getElementById(id);
                if (child) {
                    child.style.display = 'block';
                    restoredCompositions++;

                    // Обновляем иконку переключателя
                    const toggle = document.getElementById(id + '-toggle');
                    if (toggle) {
                        toggle.textContent = '\u25BC';  // ▼ (развёрнуто)
                    }
                }
            });

            console.log('issue #376: Restored TreeView state -', restoredNodes, 'nodes,', restoredCompositions, 'compositions');
        }

        /**
         * issue #376: Сбрасывает TreeView в исходное состояние (как при старте программы)
         * Сворачивает все узлы, кроме ptree (который раскрыт по умолчанию)
         * issue #380: Также сбрасывает диаграмму на ptree (Дерево Процессов)
         */
        function resetTreeViewToInitialState() {
            // Сворачиваем все узлы дерева
            const treeChildren = document.querySelectorAll('.trig-tree-children');
            treeChildren.forEach(child => {
                // ptree остаётся раскрытым по умолчанию
                const isPtree = child.id && child.id.includes('ptree');
                child.style.display = isPtree ? 'block' : 'none';

                // Обновляем иконку переключателя
                let toggleId;
                if (child.classList.contains('object-composition-list')) {
                    toggleId = child.id + '-toggle';
                } else {
                    toggleId = child.id.replace('tree-children-', 'tree-toggle-');
                }
                const toggle = document.getElementById(toggleId);
                if (toggle) {
                    toggle.textContent = isPtree ? '\u25BC' : '\u25B6';  // ▼ или ▶
                }
            });

            // Снимаем выделение со всех элементов
            const treeItems = document.querySelectorAll('.trig-tree-item');
            treeItems.forEach(item => {
                item.classList.remove('selected', 'active', 'process-selected');
            });

            // issue #380: Находим и выбираем ptree для отображения начальной диаграммы
            const ptreeUri = 'http://example.org/vad#ptree';
            if (trigHierarchy && trigHierarchy[ptreeUri]) {
                // Выбираем ptree и отображаем его диаграмму
                selectTriG(ptreeUri, true); // skipHistoryUpdate = true чтобы не засорять историю
                console.log('issue #380: Diagram reset to ptree (Дерево Процессов)');
            } else {
                // Fallback: если ptree не найден, ищем первый корневой TriG
                const rootUri = Object.keys(trigHierarchy || {}).find(uri => {
                    const info = trigHierarchy[uri];
                    return info && (info.hasParent === 'http://example.org/vad#root' ||
                                   (info.hasParent && info.hasParent.endsWith('#root')));
                });
                if (rootUri) {
                    selectTriG(rootUri, true);
                    console.log('issue #380: Diagram reset to first root TriG:', rootUri);
                }
            }

            console.log('issue #376: TreeView reset to initial state');
        }

