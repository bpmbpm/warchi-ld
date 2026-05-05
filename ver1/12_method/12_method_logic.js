// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/368
// issue #370: Добавлен метод addHasNextDia
// issue #386: Добавлены методы editLabelConceptProcess и delDia
// 12_method_logic.js - Логика модуля Методы
// Выполнение методов объектов диаграммы

        // ==============================================================================
        // issue #386: Состояние модуля редактирования label концепта процесса
        // ==============================================================================

        let editLabelState = {
            isOpen: false,
            processUri: null,       // URI концепта процесса
            trigUri: null,          // URI текущего TriG (для контекста)
            currentLabel: '',       // Текущее значение label
            newLabel: '',           // Новое значение label
            hasTrig: null,          // URI связанной схемы процесса (если есть)
            intermediateSparql: ''
        };

        let editLabelIntermediateSparqlQueries = [];

        // ==============================================================================
        // issue #370: Состояние модуля редактирования hasNext
        // ==============================================================================

        let hasNextDiaState = {
            isOpen: false,
            processUri: null,       // URI индивида процесса
            trigUri: null,          // URI текущего TriG
            currentHasNext: [],     // Текущие значения hasNext
            selectedHasNext: [],    // Выбранные значения hasNext
            intermediateSparql: ''
        };

        let hasNextDiaIntermediateSparqlQueries = [];

        /**
         * Выполняет метод объекта
         * issue #404: Добавлен метод newExecutorIndivid
         * @param {string} functionId - Идентификатор функции ('deleteIndividProcess', 'deleteIndividExecutor', 'addHasNextDia', 'editLabelConceptProcess' или 'newExecutorIndivid')
         * @param {string} objectUri - URI объекта
         * @param {string} trigUri - URI текущего TriG
         */
        function executeObjectMethod(functionId, objectUri, trigUri) {
            console.log(`Executing method: ${functionId} for ${objectUri} in ${trigUri}`);

            switch (functionId) {
                case 'deleteIndividProcess':
                    deleteIndividProcessFromTrig(objectUri, trigUri);
                    break;
                case 'deleteIndividExecutor':
                    deleteIndividExecutorFromTrig(objectUri, trigUri);
                    break;
                case 'addHasNextDia':
                    // issue #370: Открываем диалог редактирования hasNext
                    openHasNextDiaModal(objectUri, trigUri);
                    break;
                case 'editLabelConceptProcess':
                    // issue #386: Открываем диалог редактирования label концепта процесса
                    openEditLabelModal(objectUri, trigUri);
                    break;
                case 'newExecutorIndivid':
                    // issue #404: Открываем диалог создания нового исполнителя
                    openNewExecutorIndividModal(objectUri, trigUri);
                    break;
                default:
                    console.warn(`Unknown method function: ${functionId}`);
                    alert(`Метод "${functionId}" не реализован`);
            }
        }

        /**
         * issue #386: Выполняет метод диаграммы
         * issue #404: Добавлен метод newProcessIndivid
         * @param {string} functionId - Идентификатор функции (например, 'delDia' или 'newProcessIndivid')
         * @param {string} trigUri - URI текущего TriG
         */
        function executeDiagramMethod(functionId, trigUri) {
            console.log(`Executing diagram method: ${functionId} for ${trigUri}`);

            switch (functionId) {
                case 'newProcessIndivid':
                    // issue #404: Вызываем окно создания индивида процесса с предустановленным TriG
                    openNewProcessIndividModal(trigUri);
                    break;
                case 'delDia':
                    // issue #386: Вызываем окно удаления схемы с предустановленным TriG
                    openDeleteSchemaModal(trigUri);
                    break;
                default:
                    console.warn(`Unknown diagram method function: ${functionId}`);
                    alert(`Метод диаграммы "${functionId}" не реализован`);
            }
        }

        /**
         * issue #404: Открывает окно создания нового индивида процесса с предустановленным TriG
         * @param {string} trigUri - URI TriG для создания индивида
         */
        function openNewProcessIndividModal(trigUri) {
            // Проверяем наличие данных
            if (!currentStore || currentStore.size === 0) {
                alert('Данные quadstore пусты.\n\nQuadstore is empty.');
                return;
            }

            // Открываем окно создания индивида
            if (typeof openNewIndividModal === 'function') {
                openNewIndividModal();

                // После открытия окна предустанавливаем значения
                setTimeout(() => {
                    // Выбираем тип "Индивид процесса"
                    const typeSelect = document.getElementById('new-individ-type');
                    if (typeSelect) {
                        typeSelect.value = 'individ-process';
                        // Эмулируем событие change
                        if (typeof onNewIndividTypeChange === 'function') {
                            onNewIndividTypeChange();
                        }

                        // После загрузки формы предустанавливаем TriG
                        setTimeout(() => {
                            const trigSelect = document.getElementById('new-individ-trig');
                            if (trigSelect) {
                                trigSelect.value = trigUri;
                                // Эмулируем событие change
                                if (typeof onNewIndividTrigChange === 'function') {
                                    onNewIndividTrigChange();
                                }
                            }
                        }, 100);
                    }
                }, 50);
            } else {
                alert('Функция openNewIndividModal не найдена');
            }
        }

        /**
         * issue #404: Открывает окно создания нового индивида исполнителя с предустановленными полями
         * @param {string} processUri - URI индивида процесса
         * @param {string} trigUri - URI текущего TriG
         */
        function openNewExecutorIndividModal(processUri, trigUri) {
            // Проверяем наличие данных
            if (!currentStore || currentStore.size === 0) {
                alert('Данные quadstore пусты.\n\nQuadstore is empty.');
                return;
            }

            // Открываем окно создания индивида
            if (typeof openNewIndividModal === 'function') {
                openNewIndividModal();

                // После открытия окна предустанавливаем значения
                setTimeout(() => {
                    // Выбираем тип "Индивид исполнителя"
                    const typeSelect = document.getElementById('new-individ-type');
                    if (typeSelect) {
                        typeSelect.value = 'individ-executor';
                        // Эмулируем событие change
                        if (typeof onNewIndividTypeChange === 'function') {
                            onNewIndividTypeChange();
                        }

                        // После загрузки формы предустанавливаем TriG и индивид процесса
                        setTimeout(() => {
                            const trigSelect = document.getElementById('new-individ-trig');
                            if (trigSelect) {
                                trigSelect.value = trigUri;
                                // Эмулируем событие change
                                if (typeof onNewIndividTrigChange === 'function') {
                                    onNewIndividTrigChange();
                                }

                                // После загрузки списка индивидов процесса выбираем нужный
                                setTimeout(() => {
                                    const processSelect = document.getElementById('new-individ-process-individ');
                                    if (processSelect) {
                                        processSelect.value = processUri;
                                        // Эмулируем событие change
                                        if (typeof onNewIndividProcessIndividChange === 'function') {
                                            onNewIndividProcessIndividChange();
                                        }
                                    }
                                }, 100);
                            }
                        }, 100);
                    }
                }, 50);
            } else {
                alert('Функция openNewIndividModal не найдена');
            }
        }

        /**
         * issue #386: Открывает окно удаления схемы процесса с предустановленным TriG
         * @param {string} trigUri - URI TriG для удаления
         */
        function openDeleteSchemaModal(trigUri) {
            // Проверяем наличие данных
            if (!currentStore || currentStore.size === 0) {
                alert('Данные quadstore пусты.\n\nQuadstore is empty.');
                return;
            }

            // Открываем окно удаления и предустанавливаем выбор
            if (typeof openDelConceptModal === 'function') {
                openDelConceptModal();

                // После открытия окна предустанавливаем значения
                setTimeout(() => {
                    // Выбираем операцию "Удалить схему процесса (TriG)"
                    const operationSelect = document.getElementById('del-concept-operation');
                    if (operationSelect) {
                        operationSelect.value = 'trig-schema';
                        // Эмулируем событие change
                        if (typeof onDelOperationChange === 'function') {
                            onDelOperationChange();
                        }

                        // После загрузки списка TriG выбираем нужный
                        setTimeout(() => {
                            const trigSelect = document.getElementById('del-trig-select');
                            if (trigSelect) {
                                trigSelect.value = trigUri;
                                // Эмулируем событие change
                                if (typeof onDelTrigSelect === 'function') {
                                    onDelTrigSelect();
                                }
                            }
                        }, 100);
                    }
                }, 50);
            } else {
                alert('Функция openDelConceptModal не найдена');
            }
        }

        /**
         * Удаляет индивид процесса из указанного TriG
         * issue #336: Реализация метода Delete Individ Process
         * issue #372: Переработан на SPARQL-Driven подход (без JavaScript fallback)
         *
         * Алгоритм работы (аналогично Add hasNext Dia):
         * 1. Вызывается окно «Удалить индивид процесса в схеме» (openDeleteModal)
         * 2. Значения «Схема процесса» и «Индивид процесса» подставляются из текущей схемы
         * 3. По кнопке «Создать запрос на удаление» SPARQL-запрос передаётся в Result in SPARQL
         * 4. Пользователь применяет запрос через стандартную процедуру
         *
         * @param {string} processUri - URI процесса
         * @param {string} trigUri - URI TriG
         */
        function deleteIndividProcessFromTrig(processUri, trigUri) {
            // issue #372: SPARQL-Driven подход — всегда используем модальное окно
            // Преобразуем URI в prefixed формат для отображения в UI
            const prefixedProcessUri = getPrefixedName(processUri, currentPrefixes);
            const prefixedTrigUri = getPrefixedName(trigUri, currentPrefixes);

            // Вызываем окно удаления индивида в схеме с предустановленными значениями
            // Функция openDeleteModal определена в 3_sd_del_concept_individ_logic.js
            // https://github.com/bpmbpm/rdf-grapher/blob/main/ver9d/3_sd/3_sd_del_concept_individ/3_sd_del_concept_individ_logic.js    
            // issue #382: Используем новое обозначение individProcess вместо individ
            openDeleteModal('individProcess', prefixedTrigUri, prefixedProcessUri);
        }

        /**
         * Удаляет все предикаты vad:includes для ExecutorGroup из указанного TriG
         * issue #336: Реализация метода Delete Individ Executor
         * issue #372: Переработан на SPARQL-Driven подход (без JavaScript fallback)
         * issue #441: Передаём URI исполнителя (концепта), а не ExecutorGroup
         *
         * Алгоритм работы (аналогично deleteIndividProcessFromTrig):
         * 1. Вызывается окно «Удалить индивид исполнителя в схеме» (openDeleteModal)
         * 2. Значения «Схема» и «Исполнитель» подставляются из текущего контекста
         * 3. По кнопке «Создать запрос на удаление» SPARQL-запрос передаётся в Result in SPARQL
         *
         * @param {string} executorGroupUri - URI ExecutorGroup
         * @param {string} trigUri - URI TriG
         */
        function deleteIndividExecutorFromTrig(executorGroupUri, trigUri) {
            // issue #372: SPARQL-Driven подход — всегда используем модальное окно
            // issue #441: Находим URI исполнителя (концепта из rtree) через vad:includes
            // Выпадающий список «Выберите индивид для удаления:» содержит URI исполнителей (объектов vad:includes),
            // а не URI ExecutorGroup, поэтому передаём именно URI исполнителя
            const includesUri = 'http://example.org/vad#includes';
            let executorConceptUri = null;
            if (currentStore) {
                const includesQuads = currentStore.getQuads(executorGroupUri, includesUri, null, trigUri);
                if (includesQuads.length > 0) {
                    executorConceptUri = includesQuads[0].object.value;
                }
            }

            const prefixedUri = executorConceptUri
                ? getPrefixedName(executorConceptUri, currentPrefixes)
                : getPrefixedName(executorGroupUri, currentPrefixes);
            const prefixedTrigUri = getPrefixedName(trigUri, currentPrefixes);

            // Вызываем окно удаления индивида исполнителя в схеме с предустановленными значениями
            // issue #382: Используем новое обозначение individExecutor вместо executor
            openDeleteModal('individExecutor', prefixedTrigUri, prefixedUri);
        }

        // ==============================================================================
        // issue #372: Удалены функции performDeleteIndividProcess и performDeleteIndividExecutor
        // Теперь используется SPARQL-Driven подход — удаление выполняется через
        // модальное окно Del Concept\Individ\Schema, которое генерирует SPARQL запрос
        // для применения через стандартную процедуру в Result in SPARQL.
        // ==============================================================================

        // ==============================================================================
        // issue #370: ФУНКЦИИ МОДУЛЯ РЕДАКТИРОВАНИЯ vad:hasNext (Add hasNext Dia)
        // ==============================================================================

        /**
         * issue #370: Открывает модальное окно редактирования vad:hasNext
         * @param {string} processUri - URI индивида процесса
         * @param {string} trigUri - URI текущего TriG
         */
        function openHasNextDiaModal(processUri, trigUri) {
            // Инициализируем состояние
            hasNextDiaState = {
                isOpen: true,
                processUri: processUri,
                trigUri: trigUri,
                currentHasNext: [],
                selectedHasNext: [],
                intermediateSparql: ''
            };
            hasNextDiaIntermediateSparqlQueries = [];

            const modal = document.getElementById('hasnext-dia-modal');
            if (!modal) {
                console.error('Модальное окно hasnext-dia-modal не найдено');
                return;
            }

            // Заполняем предустановленные поля
            const trigInput = document.getElementById('hasnext-dia-trig');
            const conceptInput = document.getElementById('hasnext-dia-concept');

            const prefixedTrig = typeof getPrefixedName === 'function'
                ? getPrefixedName(trigUri, currentPrefixes) : trigUri;
            const prefixedProcess = typeof getPrefixedName === 'function'
                ? getPrefixedName(processUri, currentPrefixes) : processUri;

            if (trigInput) trigInput.value = prefixedTrig;
            if (conceptInput) conceptInput.value = prefixedProcess;

            // Получаем текущие hasNext для процесса
            hasNextDiaState.currentHasNext = getCurrentHasNext(processUri, trigUri);
            hasNextDiaState.selectedHasNext = [...hasNextDiaState.currentHasNext];

            // Заполняем checkboxes
            fillHasNextDiaCheckboxes(trigUri);

            // Сбрасываем позицию модального окна
            if (typeof resetModalPosition === 'function') {
                resetModalPosition('hasnext-dia-modal');
            }

            hideHasNextDiaMessage();
            modal.style.display = 'block';
        }

        /**
         * issue #370: Закрывает модальное окно редактирования hasNext
         */
        function closeHasNextDiaModal() {
            const modal = document.getElementById('hasnext-dia-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            hasNextDiaState.isOpen = false;
        }

        /**
         * issue #370: Получает текущие значения vad:hasNext для процесса
         * @param {string} processUri - URI процесса
         * @param {string} trigUri - URI TriG
         * @returns {Array<string>} Массив URI следующих процессов
         */
        function getCurrentHasNext(processUri, trigUri) {
            const hasNextUri = 'http://example.org/vad#hasNext';
            const hasNextUris = [];

            if (currentStore) {
                const quads = currentStore.getQuads(processUri, hasNextUri, null, trigUri);
                quads.forEach(quad => {
                    hasNextUris.push(quad.object.value);
                });
            }

            hasNextDiaIntermediateSparqlQueries.push({
                description: 'Получение текущих vad:hasNext для процесса',
                query: `SELECT ?next WHERE {\n    GRAPH <${trigUri}> {\n        <${processUri}> vad:hasNext ?next .\n    }\n}`,
                result: hasNextUris.length > 0
                    ? `Найдено ${hasNextUris.length} hasNext: ${hasNextUris.map(u => typeof getPrefixedName === 'function' ? getPrefixedName(u, currentPrefixes) : u).join(', ')}`
                    : 'hasNext не найдены'
            });

            return hasNextUris;
        }

        /**
         * issue #370: Получает все индивиды процесса в TriG для справочника hasNext
         * @param {string} trigUri - URI TriG
         * @returns {Array<{uri: string, label: string}>}
         */
        function getIndividsForHasNextDia(trigUri) {
            const isSubprocessTrigUri = 'http://example.org/vad#isSubprocessTrig';
            const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';
            const ptreeUri = 'http://example.org/vad#ptree';
            const individs = [];

            if (currentStore) {
                const quads = currentStore.getQuads(null, null, null, null);
                quads.forEach(quad => {
                    if (quad.predicate.value === isSubprocessTrigUri &&
                        quad.object.value === trigUri &&
                        quad.graph && quad.graph.value === trigUri) {
                        // Не добавляем текущий процесс в список
                        if (quad.subject.value === hasNextDiaState.processUri) return;

                        let label = typeof getPrefixedName === 'function'
                            ? getPrefixedName(quad.subject.value, currentPrefixes)
                            : quad.subject.value;

                        // Ищем label из ptree
                        quads.forEach(q2 => {
                            if (q2.subject.value === quad.subject.value &&
                                q2.predicate.value === rdfsLabelUri &&
                                q2.graph && q2.graph.value === ptreeUri) {
                                label = q2.object.value;
                            }
                        });

                        individs.push({ uri: quad.subject.value, label });
                    }
                });
            }

            return individs;
        }

        /**
         * issue #370: Заполняет checkboxes для hasNext
         * @param {string} trigUri - URI TriG
         */
        function fillHasNextDiaCheckboxes(trigUri) {
            const container = document.getElementById('hasnext-dia-checkbox-container');
            if (!container) return;

            const individs = getIndividsForHasNextDia(trigUri);

            hasNextDiaIntermediateSparqlQueries.push({
                description: 'Получение индивидов процесса из TriG для справочника hasNext',
                query: `SELECT ?individ WHERE {\n    GRAPH <${trigUri}> {\n        ?individ vad:isSubprocessTrig <${trigUri}> .\n    }\n}`,
                result: individs.length > 0
                    ? `Найдено ${individs.length} индивидов: ${individs.map(i => i.label).join(', ')}`
                    : 'Индивиды не найдены'
            });

            if (individs.length === 0) {
                container.innerHTML = '<p class="hasnext-dia-hint">Другие индивиды процессов в TriG не найдены</p>';
                return;
            }

            let html = '';
            individs.forEach(item => {
                const isChecked = hasNextDiaState.currentHasNext.includes(item.uri);
                const prefixedName = typeof getPrefixedName === 'function'
                    ? getPrefixedName(item.uri, currentPrefixes) : item.uri;
                const displayLabel = item.label || prefixedName;

                html += `
                    <label class="hasnext-dia-checkbox-label">
                        <input type="checkbox" value="${item.uri}" ${isChecked ? 'checked' : ''} onchange="onHasNextDiaCheckboxChange()">
                        ${displayLabel}
                    </label>
                `;
            });

            container.innerHTML = html;
            displayHasNextDiaIntermediateSparql();
        }

        /**
         * issue #370: Обработчик изменения checkbox
         */
        function onHasNextDiaCheckboxChange() {
            const checkboxes = document.querySelectorAll('#hasnext-dia-checkbox-container input[type="checkbox"]:checked');
            hasNextDiaState.selectedHasNext = Array.from(checkboxes).map(cb => cb.value);
        }

        /**
         * issue #370: Обработчик смены режима hasNext
         */
        function onHasNextDiaModeChange() {
            // В текущей версии поддерживается только режим "existing"
            fillHasNextDiaCheckboxes(hasNextDiaState.trigUri);
        }

        /**
         * issue #370: Генерирует SPARQL запрос для обновления hasNext
         */
        function createHasNextDiaSparql() {
            hideHasNextDiaMessage();

            const processUri = hasNextDiaState.processUri;
            const trigUri = hasNextDiaState.trigUri;
            const currentHasNext = hasNextDiaState.currentHasNext;
            const selectedHasNext = hasNextDiaState.selectedHasNext;

            if (!processUri || !trigUri) {
                showHasNextDiaMessage('Ошибка: не выбран процесс или TriG', 'error');
                return;
            }

            // Определяем что добавить и что удалить
            const toAdd = selectedHasNext.filter(uri => !currentHasNext.includes(uri));
            const toRemove = currentHasNext.filter(uri => !selectedHasNext.includes(uri));

            if (toAdd.length === 0 && toRemove.length === 0) {
                showHasNextDiaMessage('Изменений нет. Добавьте или снимите отметки для изменения hasNext.', 'error');
                return;
            }

            const prefixes = {
                'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
                'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
                'vad': 'http://example.org/vad#'
            };

            const prefixDeclarations = Object.entries(prefixes)
                .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
                .join('\n');

            const trigPrefixed = typeof getPrefixedName === 'function'
                ? getPrefixedName(trigUri, currentPrefixes) : `<${trigUri}>`;
            const processPrefixed = typeof getPrefixedName === 'function'
                ? getPrefixedName(processUri, currentPrefixes) : `<${processUri}>`;

            let sparqlQuery = `${prefixDeclarations}\n\n`;
            sparqlQuery += `# issue #370: Изменение vad:hasNext для ${processPrefixed}\n`;

            // Удаление старых hasNext
            if (toRemove.length > 0) {
                sparqlQuery += `\n# Удаление существующих hasNext\n`;
                sparqlQuery += `DELETE DATA {\n`;
                sparqlQuery += `    GRAPH ${trigPrefixed} {\n`;
                toRemove.forEach(uri => {
                    const prefixedUri = typeof getPrefixedName === 'function'
                        ? getPrefixedName(uri, currentPrefixes) : `<${uri}>`;
                    sparqlQuery += `        ${processPrefixed} vad:hasNext ${prefixedUri} .\n`;
                });
                sparqlQuery += `    }\n`;
                sparqlQuery += `}`;
            }

            // Добавление новых hasNext
            if (toAdd.length > 0) {
                if (toRemove.length > 0) {
                    sparqlQuery += `\n;\n`;
                }
                sparqlQuery += `\n# Добавление новых hasNext\n`;
                sparqlQuery += `INSERT DATA {\n`;
                sparqlQuery += `    GRAPH ${trigPrefixed} {\n`;
                toAdd.forEach(uri => {
                    const prefixedUri = typeof getPrefixedName === 'function'
                        ? getPrefixedName(uri, currentPrefixes) : `<${uri}>`;
                    sparqlQuery += `        ${processPrefixed} vad:hasNext ${prefixedUri} .\n`;
                });
                sparqlQuery += `    }\n`;
                sparqlQuery += `}`;
            }

            // Выводим в Result in SPARQL
            const resultTextarea = document.getElementById('result-sparql-query');
            if (resultTextarea) {
                resultTextarea.value = sparqlQuery;
            }

            showHasNextDiaMessage(
                `SPARQL запрос для изменения vad:hasNext успешно сгенерирован. Добавлено: ${toAdd.length}, Удалено: ${toRemove.length}. Запрос выведен в "Result in SPARQL".`,
                'success'
            );

            closeHasNextDiaModal();
        }

        /**
         * issue #370: Показывает сообщение в диалоге hasNext
         * @param {string} message - Текст сообщения
         * @param {string} type - Тип: 'success' или 'error'
         */
        function showHasNextDiaMessage(message, type) {
            const messageDiv = document.getElementById('hasnext-dia-message');
            if (messageDiv) {
                messageDiv.textContent = message;
                messageDiv.className = `hasnext-dia-message ${type}`;
                messageDiv.style.display = 'block';
            }
        }

        /**
         * issue #370: Скрывает сообщение в диалоге hasNext
         */
        function hideHasNextDiaMessage() {
            const messageDiv = document.getElementById('hasnext-dia-message');
            if (messageDiv) {
                messageDiv.style.display = 'none';
            }
        }

        /**
         * issue #370: Отображает промежуточные SPARQL запросы
         */
        function displayHasNextDiaIntermediateSparql() {
            const container = document.getElementById('hasnext-dia-intermediate-sparql');
            const textarea = container ? container.querySelector('textarea') : null;

            if (!container || !textarea) return;

            if (hasNextDiaIntermediateSparqlQueries.length === 0) {
                container.style.display = 'none';
                return;
            }

            let sparqlText = '# ===== Промежуточные SPARQL запросы и результаты =====\n\n';

            hasNextDiaIntermediateSparqlQueries.forEach((query, index) => {
                sparqlText += `# --- ${index + 1}. ${query.description} ---\n`;
                sparqlText += query.query.trim() + '\n';
                if (query.result) {
                    sparqlText += `\n# Результат:\n# ${query.result}\n`;
                }
                sparqlText += '\n';
            });

            textarea.value = sparqlText;
            hasNextDiaState.intermediateSparql = sparqlText;
        }

        /**
         * issue #370: Переключает видимость промежуточного SPARQL
         */
        function toggleHasNextDiaIntermediateSparql() {
            const container = document.getElementById('hasnext-dia-intermediate-sparql');
            if (container) {
                const isVisible = container.style.display !== 'none';
                container.style.display = isVisible ? 'none' : 'block';
            }
        }

        /**
         * issue #370: Показывает справку по редактированию hasNext
         */
        function showHasNextDiaHelp() {
            const helpText = `Редактирование vad:hasNext — справка:

=== Назначение ===
Данный диалог позволяет изменять связи vad:hasNext
для выбранного индивида процесса.

=== Как пользоваться ===
1. Поля "Схема процесса" и "Концепт процесса" заполнены
   автоматически и не изменяемы
2. В чекбоксах отмечены текущие значения vad:hasNext
3. Добавьте или снимите отметки для изменения связей
4. Нажмите "Создать запрос hasNext"

=== Результат ===
Генерируется SPARQL запрос с операциями DELETE DATA
и/или INSERT DATA для изменения значений vad:hasNext.

Запрос выводится в окно "Result in SPARQL" для
стандартной процедуры применения.

=== Примечание ===
В списке отображаются только другие индивиды процесса,
находящиеся в той же схеме (TriG).`;

            alert(helpText);
        }

        // ==============================================================================
        // issue #386: ФУНКЦИИ МОДУЛЯ РЕДАКТИРОВАНИЯ LABEL КОНЦЕПТА ПРОЦЕССА
        // ==============================================================================

        /**
         * issue #386: Открывает модальное окно редактирования label концепта процесса
         * @param {string} processUri - URI концепта процесса (индивида)
         * @param {string} trigUri - URI текущего TriG (контекст)
         */
        function openEditLabelModal(processUri, trigUri) {
            // Инициализируем состояние
            editLabelState = {
                isOpen: true,
                processUri: processUri,
                trigUri: trigUri,
                currentLabel: '',
                newLabel: '',
                hasTrig: null,
                intermediateSparql: ''
            };
            editLabelIntermediateSparqlQueries = [];

            const modal = document.getElementById('edit-label-modal');
            if (!modal) {
                console.error('Модальное окно edit-label-modal не найдено');
                return;
            }

            // Получаем текущие данные концепта из ptree
            const conceptData = getConceptLabelData(processUri);
            editLabelState.currentLabel = conceptData.label;
            editLabelState.newLabel = conceptData.label;
            editLabelState.hasTrig = conceptData.hasTrig;

            // Заполняем поля формы
            // issue #388: Исправлены ID элементов для соответствия HTML
            const idInput = document.getElementById('edit-label-process-id');
            const labelInput = document.getElementById('edit-label-input');
            const hasTrigInfo = document.getElementById('edit-label-trig-info');

            const prefixedProcess = typeof getPrefixedName === 'function'
                ? getPrefixedName(processUri, currentPrefixes) : processUri;

            if (idInput) idInput.value = prefixedProcess;
            if (labelInput) {
                labelInput.value = conceptData.label;
                labelInput.focus();
            }

            // Показываем информацию о связанной схеме
            // issue #388: Исправлено отображение hasTrig через поле edit-label-trig-uri
            const hasTrigInput = document.getElementById('edit-label-trig-uri');
            if (hasTrigInfo && hasTrigInput) {
                if (conceptData.hasTrig) {
                    const prefixedTrig = typeof getPrefixedName === 'function'
                        ? getPrefixedName(conceptData.hasTrig, currentPrefixes) : conceptData.hasTrig;
                    hasTrigInput.value = prefixedTrig;
                    hasTrigInfo.style.display = 'block';
                } else {
                    hasTrigInput.value = '';
                    hasTrigInfo.style.display = 'none';
                }
            }

            // Сбрасываем позицию модального окна
            if (typeof resetModalPosition === 'function') {
                resetModalPosition('edit-label-modal');
            }

            hideEditLabelMessage();
            displayEditLabelIntermediateSparql();
            modal.style.display = 'block';
        }

        /**
         * issue #386: Закрывает модальное окно редактирования label
         */
        function closeEditLabelModal() {
            const modal = document.getElementById('edit-label-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            editLabelState.isOpen = false;
        }

        /**
         * issue #386: Получает данные label и hasTrig для концепта процесса из ptree
         * @param {string} processUri - URI концепта процесса
         * @returns {{label: string, hasTrig: string|null}} Данные концепта
         */
        function getConceptLabelData(processUri) {
            const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';
            const hasTrigUri = 'http://example.org/vad#hasTrig';
            const ptreeUri = 'http://example.org/vad#ptree';

            let label = '';
            let hasTrig = null;

            if (currentStore) {
                // Получаем label из ptree
                const labelQuads = currentStore.getQuads(processUri, rdfsLabelUri, null, ptreeUri);
                if (labelQuads.length > 0) {
                    label = labelQuads[0].object.value;
                }

                // Получаем hasTrig из ptree
                const trigQuads = currentStore.getQuads(processUri, hasTrigUri, null, ptreeUri);
                if (trigQuads.length > 0) {
                    hasTrig = trigQuads[0].object.value;
                }
            }

            // Записываем промежуточные запросы
            editLabelIntermediateSparqlQueries.push({
                description: 'Получение rdfs:label концепта процесса из ptree',
                query: `SELECT ?label WHERE {\n    GRAPH vad:ptree {\n        <${processUri}> rdfs:label ?label .\n    }\n}`,
                result: label ? `Найдено: "${label}"` : 'Label не найден'
            });

            editLabelIntermediateSparqlQueries.push({
                description: 'Проверка наличия связанной схемы (vad:hasTrig)',
                query: `SELECT ?trig WHERE {\n    GRAPH vad:ptree {\n        <${processUri}> vad:hasTrig ?trig .\n    }\n}`,
                result: hasTrig
                    ? `Найдена схема: ${typeof getPrefixedName === 'function' ? getPrefixedName(hasTrig, currentPrefixes) : hasTrig}`
                    : 'Схема отсутствует'
            });

            return { label, hasTrig };
        }

        /**
         * issue #386: Обработчик изменения поля label
         * issue #390: Исправлен ID элемента (edit-label-value -> edit-label-input)
         */
        function onEditLabelInput() {
            const labelInput = document.getElementById('edit-label-input');
            if (labelInput) {
                editLabelState.newLabel = labelInput.value;
            }
        }

        /**
         * issue #386: Генерирует SPARQL запрос для изменения label
         */
        function createEditLabelSparql() {
            hideEditLabelMessage();

            const processUri = editLabelState.processUri;
            const currentLabel = editLabelState.currentLabel;
            const newLabel = editLabelState.newLabel;
            const hasTrig = editLabelState.hasTrig;

            if (!processUri) {
                showEditLabelMessage('Ошибка: не определён концепт процесса', 'error');
                return;
            }

            if (!newLabel || newLabel.trim() === '') {
                showEditLabelMessage('Ошибка: label не может быть пустым', 'error');
                return;
            }

            if (newLabel === currentLabel) {
                showEditLabelMessage('Изменений нет. Введите новое значение label.', 'error');
                return;
            }

            const prefixes = {
                'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
                'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
                'vad': 'http://example.org/vad#'
            };

            const prefixDeclarations = Object.entries(prefixes)
                .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
                .join('\n');

            const processPrefixed = typeof getPrefixedName === 'function'
                ? getPrefixedName(processUri, currentPrefixes) : `<${processUri}>`;

            let sparqlQuery = `${prefixDeclarations}\n\n`;
            sparqlQuery += `# issue #386: Изменение rdfs:label для концепта процесса ${processPrefixed}\n\n`;

            // Удаление старого label
            sparqlQuery += `# Удаление старого label в ptree\n`;
            sparqlQuery += `DELETE DATA {\n`;
            sparqlQuery += `    GRAPH vad:ptree {\n`;
            sparqlQuery += `        ${processPrefixed} rdfs:label "${currentLabel}" .\n`;
            sparqlQuery += `    }\n`;
            sparqlQuery += `}\n;\n\n`;

            // Добавление нового label
            sparqlQuery += `# Добавление нового label в ptree\n`;
            sparqlQuery += `INSERT DATA {\n`;
            sparqlQuery += `    GRAPH vad:ptree {\n`;
            sparqlQuery += `        ${processPrefixed} rdfs:label "${newLabel}" .\n`;
            sparqlQuery += `    }\n`;
            sparqlQuery += `}`;

            // Если есть связанная схема, также обновляем её label
            if (hasTrig) {
                const trigPrefixed = typeof getPrefixedName === 'function'
                    ? getPrefixedName(hasTrig, currentPrefixes) : `<${hasTrig}>`;

                // Получаем текущий label схемы
                const currentTrigLabel = getCurrentTrigLabel(hasTrig);
                // Новый label схемы по правилу: "Схема процесса {newLabel}"
                const newTrigLabel = `Схема процесса ${newLabel}`;

                sparqlQuery += `\n;\n\n`;
                sparqlQuery += `# Обновление label связанной схемы (TriG)\n`;
                sparqlQuery += `# Правило: "Схема процесса {processLabel}"\n\n`;

                if (currentTrigLabel) {
                    sparqlQuery += `# Удаление старого label схемы\n`;
                    sparqlQuery += `DELETE DATA {\n`;
                    sparqlQuery += `    GRAPH ${trigPrefixed} {\n`;
                    sparqlQuery += `        ${trigPrefixed} rdfs:label "${currentTrigLabel}" .\n`;
                    sparqlQuery += `    }\n`;
                    sparqlQuery += `}\n;\n\n`;
                }

                sparqlQuery += `# Добавление нового label схемы\n`;
                sparqlQuery += `INSERT DATA {\n`;
                sparqlQuery += `    GRAPH ${trigPrefixed} {\n`;
                sparqlQuery += `        ${trigPrefixed} rdfs:label "${newTrigLabel}" .\n`;
                sparqlQuery += `    }\n`;
                sparqlQuery += `}`;
            }

            // Выводим в Result in SPARQL
            const resultTextarea = document.getElementById('result-sparql-query');
            if (resultTextarea) {
                resultTextarea.value = sparqlQuery;
            }

            let message = `SPARQL запрос для изменения rdfs:label успешно сгенерирован.`;
            if (hasTrig) {
                message += ` Label связанной схемы также будет обновлён.`;
            }
            message += ` Запрос выведен в "Result in SPARQL".`;

            showEditLabelMessage(message, 'success');
            closeEditLabelModal();
        }

        /**
         * issue #386: Получает текущий label TriG схемы
         * @param {string} trigUri - URI TriG
         * @returns {string|null} Текущий label или null
         */
        function getCurrentTrigLabel(trigUri) {
            const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';

            if (currentStore) {
                // Label схемы хранится внутри самой схемы (в её графе)
                const labelQuads = currentStore.getQuads(trigUri, rdfsLabelUri, null, trigUri);
                if (labelQuads.length > 0) {
                    return labelQuads[0].object.value;
                }
            }

            return null;
        }

        /**
         * issue #386: Показывает сообщение в диалоге редактирования label
         * @param {string} message - Текст сообщения
         * @param {string} type - Тип: 'success' или 'error'
         */
        function showEditLabelMessage(message, type) {
            const messageDiv = document.getElementById('edit-label-message');
            if (messageDiv) {
                messageDiv.textContent = message;
                messageDiv.className = `edit-label-message ${type}`;
                messageDiv.style.display = 'block';
            }
        }

        /**
         * issue #386: Скрывает сообщение в диалоге редактирования label
         */
        function hideEditLabelMessage() {
            const messageDiv = document.getElementById('edit-label-message');
            if (messageDiv) {
                messageDiv.style.display = 'none';
            }
        }

        /**
         * issue #386: Отображает промежуточные SPARQL запросы
         */
        function displayEditLabelIntermediateSparql() {
            const container = document.getElementById('edit-label-intermediate-sparql');
            const textarea = container ? container.querySelector('textarea') : null;

            if (!container || !textarea) return;

            if (editLabelIntermediateSparqlQueries.length === 0) {
                container.style.display = 'none';
                return;
            }

            let sparqlText = '# ===== Промежуточные SPARQL запросы и результаты =====\n\n';

            editLabelIntermediateSparqlQueries.forEach((query, index) => {
                sparqlText += `# --- ${index + 1}. ${query.description} ---\n`;
                sparqlText += query.query.trim() + '\n';
                if (query.result) {
                    sparqlText += `\n# Результат:\n# ${query.result}\n`;
                }
                sparqlText += '\n';
            });

            textarea.value = sparqlText;
            editLabelState.intermediateSparql = sparqlText;
        }

        /**
         * issue #386: Переключает видимость промежуточного SPARQL
         */
        function toggleEditLabelIntermediateSparql() {
            const container = document.getElementById('edit-label-intermediate-sparql');
            if (container) {
                const isVisible = container.style.display !== 'none';
                container.style.display = isVisible ? 'none' : 'block';
            }
        }

        /**
         * issue #386: Показывает справку по редактированию label
         */
        function showEditLabelHelp() {
            const helpText = `Редактирование rdfs:label концепта процесса — справка:

=== Назначение ===
Данный диалог позволяет изменять rdfs:label для концепта процесса.

=== Как пользоваться ===
1. Поле "ID" показывает идентификатор концепта (только для чтения)
2. Измените значение в поле "Label"
3. Нажмите "Создать запрос"

=== Автоматическое обновление схемы ===
Если у процесса есть связанная схема (vad:hasTrig в ptree),
её rdfs:label будет автоматически обновлён по правилу:
"Схема процесса {новый_label}"

=== Результат ===
Генерируется SPARQL запрос с операциями DELETE DATA
и INSERT DATA для изменения rdfs:label.

Запрос выводится в окно "Result in SPARQL" для
стандартной процедуры применения.`;

            alert(helpText);
        }

        // ==============================================================================
        // issue #386: ФУНКЦИИ МЕТОДОВ ДИАГРАММЫ
        // ==============================================================================

        /**
         * issue #386: Показывает/скрывает выпадающий список методов диаграммы
         * @param {Event} event - Событие клика
         */
        async function toggleDiagramMethodsDropdown(event) {
            event.stopPropagation();

            // Закрываем существующий dropdown если есть
            const existingDropdown = document.querySelector('.diagram-methods-dropdown.visible');
            if (existingDropdown) {
                existingDropdown.remove();
                return;
            }

            // Получаем текущий открытый TriG
            const currentTrigUri = getCurrentOpenTrigUri();
            if (!currentTrigUri) {
                alert('Нет открытой схемы процесса (TriG)');
                return;
            }

            const button = event.target;
            const buttonRect = button.getBoundingClientRect();

            // Создаём dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'diagram-methods-dropdown visible';
            dropdown.style.position = 'fixed';
            dropdown.style.left = buttonRect.left + 'px';
            dropdown.style.top = (buttonRect.bottom + 2) + 'px';

            // Получаем методы диаграммы
            const methods = getDiagramMethods();

            if (methods.length === 0) {
                dropdown.innerHTML = '<div class="diagram-methods-dropdown-empty">Нет доступных методов</div>';
            } else {
                methods.forEach(method => {
                    const item = document.createElement('div');
                    item.className = 'diagram-methods-dropdown-item';
                    item.textContent = method.label;
                    item.onclick = (e) => {
                        e.stopPropagation();
                        dropdown.remove();
                        executeDiagramMethod(method.functionId, currentTrigUri);
                    };
                    dropdown.appendChild(item);
                });
            }

            document.body.appendChild(dropdown);

            // Закрываем dropdown при клике вне его
            const closeDropdown = (e) => {
                if (!dropdown.contains(e.target) && e.target !== button) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            };
            setTimeout(() => document.addEventListener('click', closeDropdown), 0);
        }

        /**
         * issue #386: Получает список методов диаграммы
         * issue #404: Добавлен метод "New Process Individ"
         * @returns {Array<{label: string, functionId: string}>}
         */
        function getDiagramMethods() {
            // Статический список методов диаграммы
            // В будущем можно загружать из techtree через SPARQL
            return [
                { label: 'New Process Individ', functionId: 'newProcessIndivid' },
                { label: 'Del Dia', functionId: 'delDia' }
            ];
        }

        /**
         * issue #386: Получает URI текущего открытого TriG
         * @returns {string|null} URI TriG или null
         */
        function getCurrentOpenTrigUri() {
            // Пробуем получить из глобальной переменной selectedTrigUri
            if (typeof selectedTrigUri !== 'undefined' && selectedTrigUri) {
                return selectedTrigUri;
            }

            // Пробуем получить из глобальной переменной currentTrigUri
            if (typeof currentTrigUri !== 'undefined' && currentTrigUri) {
                return currentTrigUri;
            }

            // Пробуем получить из состояния TreeView
            if (typeof treeViewState !== 'undefined' && treeViewState && treeViewState.currentTrigUri) {
                return treeViewState.currentTrigUri;
            }

            return null;
        }

        // ==============================================================================
        // ЭКСПОРТ ФУНКЦИЙ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА
        // ==============================================================================

        if (typeof window !== 'undefined') {
            // issue #370: Функции hasNext
            window.openHasNextDiaModal = openHasNextDiaModal;
            window.closeHasNextDiaModal = closeHasNextDiaModal;
            window.onHasNextDiaCheckboxChange = onHasNextDiaCheckboxChange;
            window.onHasNextDiaModeChange = onHasNextDiaModeChange;
            window.toggleHasNextDiaIntermediateSparql = toggleHasNextDiaIntermediateSparql;
            window.createHasNextDiaSparql = createHasNextDiaSparql;
            window.showHasNextDiaHelp = showHasNextDiaHelp;

            // issue #386: Функции Edit Label
            window.openEditLabelModal = openEditLabelModal;
            window.closeEditLabelModal = closeEditLabelModal;
            window.onEditLabelInput = onEditLabelInput;
            window.createEditLabelSparql = createEditLabelSparql;
            window.toggleEditLabelIntermediateSparql = toggleEditLabelIntermediateSparql;
            window.showEditLabelHelp = showEditLabelHelp;

            // issue #386: Функции методов диаграммы
            window.toggleDiagramMethodsDropdown = toggleDiagramMethodsDropdown;
            window.executeDiagramMethod = executeDiagramMethod;
            window.openDeleteSchemaModal = openDeleteSchemaModal;
            window.getCurrentOpenTrigUri = getCurrentOpenTrigUri;

            // issue #404: Функции новых методов
            window.openNewProcessIndividModal = openNewProcessIndividModal;
            window.openNewExecutorIndividModal = openNewExecutorIndividModal;
        }

