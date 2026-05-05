// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/232

// ==============================================================================
// SMART DESIGN UI FUNCTIONS
// ==============================================================================
// Функции пользовательского интерфейса Smart Design,
// извлечённые из index.html при реструктуризации ver9d.
// ==============================================================================

/**
 * Показывает сообщение в панели Smart Design
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип сообщения
 */
function showSmartDesignMessage(message, type) {
    const messageDiv = document.getElementById('smart-design-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = 'smart-design-message ' + type;
        messageDiv.style.display = 'block';
        // Сообщение остается видимым до следующего действия пользователя
        // (не скрываем автоматически по таймеру)
    }
}

/**
 * Скрывает сообщение в панели Smart Design
 */
function hideSmartDesignMessage() {
    const messageDiv = document.getElementById('smart-design-message');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
}

/**
 * Собирает все уникальные TriG графы из текущих данных
 * @returns {Array} - Массив объектов {uri, label}
 */
function getAllTriGs() {
    const trigs = [];
    const seen = new Set();

    // Собираем из trigHierarchy (если есть) - только объекты с isTrig === true
    for (const [uri, info] of Object.entries(trigHierarchy)) {
        if (!seen.has(uri) && info.isTrig === true) {
            seen.add(uri);
            const label = info.label || getPrefixedName(uri, currentPrefixes);
            trigs.push({ uri: uri, label: label });
        }
    }

    // issue #334: Используем getAllTrigGraphs() вместо allTrigGraphs
    for (const trigUri of getAllTrigGraphs()) {
        if (!seen.has(trigUri)) {
            // Проверяем, есть ли объект в trigHierarchy с isTrig
            const info = trigHierarchy[trigUri];
            if (!info || info.isTrig === true) {
                seen.add(trigUri);
                const label = getPrefixedName(trigUri, currentPrefixes);
                trigs.push({ uri: trigUri, label: label });
            }
        }
    }

    return trigs.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Собирает все уникальные субъекты (объекты) из текущих RDF данных
 * @returns {Array} - Массив объектов {uri, label}
 */
function getAllSubjects() {
    const subjects = [];
    const seen = new Set();

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    const quads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
    quads.forEach(quad => {
        const uri = quad.subject.value;
        if (!seen.has(uri)) {
            seen.add(uri);
            const label = getPrefixedName(uri, currentPrefixes);
            subjects.push({ uri: uri, label: label });
        }
    });

    return subjects.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Собирает все уникальные предикаты из текущих RDF данных
 * @returns {Array} - Массив объектов {uri, label}
 */
function getAllPredicates() {
    const predicates = [];
    const seen = new Set();

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    const quads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
    quads.forEach(quad => {
        const uri = quad.predicate.value;
        if (!seen.has(uri)) {
            seen.add(uri);
            const label = getPrefixedName(uri, currentPrefixes);
            predicates.push({ uri: uri, label: label });
        }
    });

    return predicates.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Собирает все уникальные объекты (исключая литералы) из текущих RDF данных
 * @returns {Array} - Массив объектов {uri, label}
 */
function getAllObjects() {
    const objects = [];
    const seen = new Set();

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    const quads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
    quads.forEach(quad => {
        // Исключаем литералы согласно требованиям
        if (quad.object.termType !== 'Literal') {
            const uri = quad.object.value;
            if (!seen.has(uri)) {
                seen.add(uri);
                const label = getPrefixedName(uri, currentPrefixes);
                objects.push({ uri: uri, label: label });
            }
        }
    });

    return objects.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Проверяет, существует ли TriG с указанным именем в RDF данных
 * @param {string} name - Имя TriG для проверки
 * @returns {boolean}
 */
function trigExists(name) {
    const trigs = getAllTriGs();
    const normalizedName = name.toLowerCase();
    return trigs.some(t => {
        const label = t.label.toLowerCase();
        const localName = getLocalName(t.uri).toLowerCase();
        return label === normalizedName || localName === normalizedName || t.uri === name;
    });
}

/**
 * Проверяет, существует ли субъект с указанным именем в RDF данных
 * @param {string} name - Имя субъекта для проверки
 * @returns {boolean}
 */
function subjectExists(name) {
    const subjects = getAllSubjects();
    const normalizedName = name.toLowerCase();
    return subjects.some(s => {
        const label = s.label.toLowerCase();
        const localName = getLocalName(s.uri).toLowerCase();
        return label === normalizedName || localName === normalizedName || s.uri === name;
    });
}

/**
 * Проверяет, существует ли предикат с указанным именем в RDF данных
 * @param {string} name - Имя предиката для проверки
 * @returns {boolean}
 */
function predicateExists(name) {
    const predicates = getAllPredicates();
    const normalizedName = name.toLowerCase();
    return predicates.some(p => {
        const label = p.label.toLowerCase();
        const localName = getLocalName(p.uri).toLowerCase();
        return label === normalizedName || localName === normalizedName || p.uri === name;
    });
}

/**
 * Заполняет выпадающие списки в панели Smart Design
 */
function populateSmartDesignDropdowns() {
    const trigSelect = document.getElementById('smart-design-trig');
    const subjectSelect = document.getElementById('smart-design-subject');
    const subjectTypeSelect = document.getElementById('smart-design-subject-type');
    const predicateSelect = document.getElementById('smart-design-predicate');
    const objectSelect = document.getElementById('smart-design-object');

    if (!trigSelect || !subjectSelect || !predicateSelect || !objectSelect) return;

    // Очищаем и заполняем TriG (без опции "New" - для создания новых TriG есть отдельная кнопка)
    trigSelect.innerHTML = '<option value="">-- Выберите TriG --</option>';
    const trigs = getAllTriGs();
    trigs.forEach(t => {
        const option = document.createElement('option');
        option.value = t.uri;
        // Отображаем id с label в скобках (при наличии)
        const id = getPrefixedName(t.uri, currentPrefixes);
        const displayText = t.label && t.label !== id ? `${id} (${t.label})` : id;
        option.textContent = displayText;
        trigSelect.appendChild(option);
    });

    // Очищаем и заполняем Subject
    subjectSelect.innerHTML = '<option value="">-- Выберите Subject --</option>';
    subjectSelect.innerHTML += '<option value="__NEW__">New (создать новый)</option>';
    const subjects = getAllSubjects();
    subjects.forEach(s => {
        const option = document.createElement('option');
        option.value = s.uri;
        option.textContent = s.label;
        subjectSelect.appendChild(option);
    });

    // Очищаем и заполняем Subject Type
    if (subjectTypeSelect) {
        populateSubjectTypeDropdown();
    }

    // Очищаем и заполняем Predicate (без опции "New" - предикаты берутся только из онтологии)
    predicateSelect.innerHTML = '<option value="">-- Выберите Predicate --</option>';
    const predicates = getAllPredicates();
    predicates.forEach(p => {
        const option = document.createElement('option');
        option.value = p.uri;
        option.textContent = p.label;
        predicateSelect.appendChild(option);
    });

    // Очищаем и заполняем Object (без литералов)
    objectSelect.innerHTML = '<option value="">-- Выберите Object --</option>';
    objectSelect.innerHTML += '<option value="__NEW__">New (создать новый литерал)</option>';
    const objects = getAllObjects();
    objects.forEach(o => {
        const option = document.createElement('option');
        option.value = o.uri;
        option.textContent = o.label;
        objectSelect.appendChild(option);
    });

    // Деактивируем Subject/Predicate/Object поля до выбора TriG
    updateSmartDesignFieldsState();
}

/**
 * Заполняет выпадающий список Subject Type
 * Типы зависят от выбранного TriG
 */
function populateSubjectTypeDropdown() {
    const subjectTypeSelect = document.getElementById('smart-design-subject-type');
    const trigSelect = document.getElementById('smart-design-trig');

    if (!subjectTypeSelect) return;

    subjectTypeSelect.innerHTML = '<option value="">-- Выберите тип Subject --</option>';

    // Определяем доступные типы в зависимости от выбранного TriG
    const trigValue = trigSelect ? trigSelect.value : '';
    const isPtree = trigValue === 'vad:ptree' || trigValue === 'http://example.org/vad#ptree' || trigValue.endsWith('#ptree');
    const isRtree = trigValue === 'vad:rtree' || trigValue === 'http://example.org/vad#rtree' || trigValue.endsWith('#rtree');

    let availableTypes = [];

    // Используем данные из Tech appendix, если они загружены
    if (techAppendixData && techAppendixData.predicateGroups) {
        if (isPtree) {
            // В ptree: ConceptProcessPredicate, ConceptTreePredicate
            availableTypes = [
                { value: 'vad:TypeProcess', label: 'vad:TypeProcess (концепт процесса)' },
                { value: 'vad:ProcessTree', label: 'vad:ProcessTree (дерево процессов)' }
            ];
        } else if (isRtree) {
            // В rtree: ConceptExecutorPredicate, ExecutorTreePredicate
            availableTypes = [
                { value: 'vad:TypeExecutor', label: 'vad:TypeExecutor (концепт исполнителя)' },
                { value: 'vad:ExecutorTree', label: 'vad:ExecutorTree (дерево исполнителей)' }
            ];
        } else if (trigValue) {
            // В VADProcessDia: IndividProcessPredicate, ExecutorGroupPredicate, DiagramPredicate
            availableTypes = [
                { value: 'vad:TypeProcess', label: 'vad:TypeProcess (индивид процесса)' },
                { value: 'vad:ExecutorGroup', label: 'vad:ExecutorGroup (группа исполнителей)' },
                { value: 'vad:VADProcessDia', label: 'vad:VADProcessDia (диаграмма)' }
            ];
        }
    } else {
        // Fallback: исходная логика, если Tech appendix не загружен
        if (isPtree) {
            availableTypes = [
                { value: 'vad:TypeProcess', label: 'vad:TypeProcess' },
                { value: 'vad:ProcessTree', label: 'vad:ProcessTree' }
            ];
        } else if (isRtree) {
            availableTypes = [
                { value: 'vad:TypeExecutor', label: 'vad:TypeExecutor' },
                { value: 'vad:ExecutorTree', label: 'vad:ExecutorTree' }
            ];
        } else if (trigValue) {
            availableTypes = [
                { value: 'vad:TypeProcess', label: 'vad:TypeProcess' },
                { value: 'vad:ExecutorGroup', label: 'vad:ExecutorGroup' },
                { value: 'vad:VADProcessDia', label: 'vad:VADProcessDia' }
            ];
        }
    }

    availableTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.label;
        subjectTypeSelect.appendChild(option);
    });
}

/**
 * Обновляет выпадающий список Predicate на основе выбранного Subject Type
 * Автогенерируемые предикаты (isSubprocessTrig, hasExecutor) отображаются как disabled
 */
function updatePredicateBySubjectType() {
    const subjectTypeSelect = document.getElementById('smart-design-subject-type');
    const predicateSelect = document.getElementById('smart-design-predicate');
    const trigSelect = document.getElementById('smart-design-trig');

    if (!subjectTypeSelect || !predicateSelect || !trigSelect) return;

    const subjectType = subjectTypeSelect.value;
    const trigUri = trigSelect.value;
    const trigContext = getTrigContext(trigUri);

    // Сохраняем текущее выбранное значение
    const currentPredicateValue = predicateSelect.value;

    // Всегда показываем допустимые предикаты для выбранного типа
    if (!subjectType) {
        // Если тип не выбран - показываем все предикаты
        predicateSelect.innerHTML = '<option value="">-- Выберите Predicate --</option>';
        const allPredicates = getAllPredicates();
        allPredicates.forEach(p => {
            const option = document.createElement('option');
            option.value = p.uri;
            option.textContent = p.label;
            predicateSelect.appendChild(option);
        });
    } else {
        // Показываем допустимые предикаты с учетом автогенерируемых
        const allowedPredicates = getPredicatesForSubjectType(subjectType, trigContext);

        predicateSelect.innerHTML = '<option value="">-- Выберите Predicate --</option>';

        allowedPredicates.forEach(pred => {
            const option = document.createElement('option');
            // Пробуем развернуть в полный URI
            let fullUri = pred;
            for (const [prefix, namespace] of Object.entries(currentPrefixes)) {
                if (pred.startsWith(prefix + ':')) {
                    fullUri = namespace + pred.substring(prefix.length + 1);
                    break;
                }
            }
            option.value = fullUri;

            // Проверяем, является ли предикат автогенерируемым
            const isAutoGen = isAutoGeneratedPredicate(pred);
            if (isAutoGen) {
                option.textContent = pred + ' (автогенерируемый)';
                option.disabled = true;
                option.style.color = '#999';
            } else {
                option.textContent = pred;
            }

            predicateSelect.appendChild(option);
        });
    }

    // Восстанавливаем выбор если значение все еще доступно и не disabled
    if (currentPredicateValue) {
        const matchingOption = Array.from(predicateSelect.options).find(o => o.value === currentPredicateValue && !o.disabled);
        if (matchingOption) {
            predicateSelect.value = currentPredicateValue;
        } else {
            predicateSelect.value = '';
        }
    } else {
        predicateSelect.value = '';
    }
}

/**
 * Обновляет список Object в зависимости от выбранного Predicate
 * В режиме Filter: если выбран vad:hasNext, показываем только объекты типа vad:Process из ptree
 */
function updateObjectsByPredicate() {
    const predicateSelect = document.getElementById('smart-design-predicate');
    const objectSelect = document.getElementById('smart-design-object');

    if (!predicateSelect || !objectSelect) return;

    const predicateValue = predicateSelect.value;

    // Сохраняем текущее выбранное значение
    const currentObjectValue = objectSelect.value;

    // В режиме 'full' не фильтруем объекты
    if (smartDesignMode === 'full' || !predicateValue) {
        // Восстанавливаем полный список объектов
        objectSelect.innerHTML = '<option value="">-- Выберите Object --</option>';
        objectSelect.innerHTML += '<option value="__NEW__">New (создать новый литерал)</option>';
        const allObjects = getAllObjects();
        allObjects.forEach(o => {
            const option = document.createElement('option');
            option.value = o.uri;
            option.textContent = o.label;
            objectSelect.appendChild(option);
        });
    } else if (isProcessObjectPredicate(predicateValue)) {
        // Режим 'filtered' и предикат требует Object типа Process
        objectSelect.innerHTML = '<option value="">-- Выберите Object --</option>';
        // Для hasNext не показываем опцию "New (создать новый литерал)" т.к. объект должен быть Process

        // Получаем только объекты типа vad:Process из ptree
        const processObjects = getProcessSubjects();
        processObjects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.uri;
            option.textContent = p.label;
            objectSelect.appendChild(option);
        });
    } else {
        // Режим 'filtered' но предикат не требует специальной фильтрации
        objectSelect.innerHTML = '<option value="">-- Выберите Object --</option>';
        objectSelect.innerHTML += '<option value="__NEW__">New (создать новый литерал)</option>';
        const allObjects = getAllObjects();
        allObjects.forEach(o => {
            const option = document.createElement('option');
            option.value = o.uri;
            option.textContent = o.label;
            objectSelect.appendChild(option);
        });
    }

    // Восстанавливаем выбор если значение все еще доступно
    if (currentObjectValue && Array.from(objectSelect.options).some(o => o.value === currentObjectValue)) {
        objectSelect.value = currentObjectValue;
    } else {
        objectSelect.value = '';
    }
}

/**
 * Переключает режим работы Smart Design (filtered/full)
 */
function toggleSmartDesignMode() {
    const toggleBtn = document.getElementById('smart-design-mode-toggle');

    if (smartDesignMode === 'filtered') {
        smartDesignMode = 'full';
        if (toggleBtn) toggleBtn.textContent = 'Режим: Полный';
    } else {
        smartDesignMode = 'filtered';
        if (toggleBtn) toggleBtn.textContent = 'Режим: Фильтр';
    }

    // Обновляем список предикатов
    updatePredicateBySubjectType();
    // Обновляем список объектов
    updateObjectsByPredicate();
}

/**
 * Обновляет состояние полей Subject/SubjectType/Predicate/Object (активные только после выбора TriG)
 */
function updateSmartDesignFieldsState() {
    const trigSelect = document.getElementById('smart-design-trig');
    const subjectSelect = document.getElementById('smart-design-subject');
    const subjectTypeSelect = document.getElementById('smart-design-subject-type');
    const predicateSelect = document.getElementById('smart-design-predicate');
    const objectSelect = document.getElementById('smart-design-object');

    if (!trigSelect || !subjectSelect || !predicateSelect || !objectSelect) return;

    const trigSelected = trigSelect.value && trigSelect.value !== '';
    const newTrigActive = document.getElementById('new-trig-modal')?.style.display === 'block';

    // Если активно окно New TriG, деактивируем все поля
    if (newTrigActive) {
        trigSelect.disabled = true;
        subjectSelect.disabled = true;
        if (subjectTypeSelect) subjectTypeSelect.disabled = true;
        predicateSelect.disabled = true;
        objectSelect.disabled = true;
    } else {
        trigSelect.disabled = false;
        subjectSelect.disabled = !trigSelected;
        if (subjectTypeSelect) subjectTypeSelect.disabled = !trigSelected;
        predicateSelect.disabled = !trigSelected;
        objectSelect.disabled = !trigSelected;
    }
}

/**
 * Проверяет, является ли выбранный TriG графом vad:ptree
 * @returns {boolean}
 */
function isSelectedTrigPtree() {
    const trigSelect = document.getElementById('smart-design-trig');
    if (!trigSelect || !trigSelect.value) return false;
    const trigValue = trigSelect.value;
    return trigValue === 'vad:ptree' ||
           trigValue === 'http://example.org/vad#ptree' ||
           trigValue.endsWith('#ptree');
}

/**
 * Получает субъекты типа vad:Process для фильтрации в режиме vad:ptree
 * @returns {Array} - Массив объектов {uri, label}
 */
function getProcessSubjects() {
    const subjects = [];
    const seen = new Set();

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    const quads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
    quads.forEach(quad => {
        const uri = quad.subject.value;
        if (!seen.has(uri) && isSubjectVadProcess(uri)) {
            seen.add(uri);
            const label = getPrefixedName(uri, currentPrefixes);
            subjects.push({ uri: uri, label: label });
        }
    });

    return subjects.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Получает субъекты определённого типа для фильтрации в режиме Filter
 * @param {string} typeValue - Тип субъекта (prefixed name или полный URI)
 * @returns {Array} - Массив объектов {uri, label}
 */
function getSubjectsByType(typeValue) {
    const subjects = [];
    const seen = new Set();

    // Преобразуем typeValue в полный URI для сравнения
    let typeUri = typeValue;
    for (const [prefix, namespace] of Object.entries(currentPrefixes)) {
        if (typeValue.startsWith(prefix + ':')) {
            typeUri = namespace + typeValue.substring(prefix.length + 1);
            break;
        }
    }

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    const quads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
    quads.forEach(quad => {
        const uri = quad.subject.value;
        if (seen.has(uri)) return;

        // issue #334: Используем getNodeTypes() вместо nodeTypesCache
        const subjectTypes = getNodeTypes(uri);
        const hasType = subjectTypes.some(t =>
            t === typeValue || t === typeUri
        );

        if (hasType) {
            seen.add(uri);
            const label = getPrefixedName(uri, currentPrefixes);
            subjects.push({ uri: uri, label: label });
        }
    });

    return subjects.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Обновляет содержимое выпадающего списка Subject на основе выбранного Subject Type
 * в режиме Filter (smartDesignMode === 'filtered')
 *
 * issue #425: Для ptree и rtree используется funConceptList_v2 из vadlib_sparql_v2.js
 * вместо funSPARQLvalues. Формат отображения: "id label" (через пробел).
 */
async function updateSubjectsBySubjectType() {
    const subjectSelect = document.getElementById('smart-design-subject');
    const subjectTypeSelect = document.getElementById('smart-design-subject-type');
    const trigSelect = document.getElementById('smart-design-trig');

    if (!subjectSelect || !subjectTypeSelect) return;

    const selectedType = subjectTypeSelect.value;
    const trigUri = trigSelect ? trigSelect.value : '';
    if (!selectedType) return; // Если тип не выбран, не фильтруем

    // Сохраняем текущее выбранное значение
    const currentSubjectValue = subjectSelect.value;

    // Очищаем и заполняем Subject
    subjectSelect.innerHTML = '<option value="">-- Выберите Subject --</option>';
    subjectSelect.innerHTML += '<option value="__NEW__">New (создать новый)</option>';

    // Используем SPARQL-based подход для заполнения субъектов
    // в зависимости от выбранного типа и контекста TriG
    const trigContext = getTrigContext(trigUri);

    if (selectedType === 'vad:TypeProcess') {
        if (trigContext === 'ptree') {
            // issue #425: В ptree показываем концепты процессов через funConceptList_v2
            // issue #427: Передаём полные URI для универсальности
            // Формат отображения: "id label" (id и label через пробел)
            const concepts = await funConceptList_v2(currentStore, 'http://example.org/vad#ptree', 'http://example.org/vad#TypeProcess');
            concepts.forEach(function(item) {
                const option = document.createElement('option');
                option.value = item.id;
                const id = getPrefixedName(item.id, currentPrefixes);
                // Формат "id label" через пробел; если label пуст — только id
                option.textContent = item.label ? id + ' ' + item.label : id;
                subjectSelect.appendChild(option);
            });
        } else {
            // В VADProcessDia показываем индивиды процессов из текущего TriG
            const subjects = getProcessIndividualsInTriG(trigUri);
            subjects.forEach(function(uri) {
                const option = document.createElement('option');
                if (typeof uri === 'object' && uri.uri) {
                    option.value = uri.uri;
                    option.textContent = typeof formatDropdownDisplayText === 'function'
                        ? formatDropdownDisplayText(uri.uri, uri.label, currentPrefixes)
                        : (uri.label || getPrefixedName(uri.uri, currentPrefixes));
                } else {
                    option.value = uri;
                    option.textContent = getPrefixedName(uri, currentPrefixes);
                }
                subjectSelect.appendChild(option);
            });
        }
    } else if (selectedType === 'vad:ExecutorGroup') {
        // Группы исполнителей из текущего TriG
        const subjects = getExecutorGroupsInTriG(trigUri);
        subjects.forEach(function(uri) {
            const option = document.createElement('option');
            if (typeof uri === 'object' && uri.uri) {
                option.value = uri.uri;
                option.textContent = typeof formatDropdownDisplayText === 'function'
                    ? formatDropdownDisplayText(uri.uri, uri.label, currentPrefixes)
                    : (uri.label || getPrefixedName(uri.uri, currentPrefixes));
            } else {
                option.value = uri;
                option.textContent = getPrefixedName(uri, currentPrefixes);
            }
            subjectSelect.appendChild(option);
        });
    } else if (selectedType === 'vad:TypeExecutor') {
        // issue #425: Концепты исполнителей из rtree через funConceptList_v2
        // issue #427: Передаём полные URI для универсальности
        // Формат отображения: "id label" (id и label через пробел)
        const concepts = await funConceptList_v2(currentStore, 'http://example.org/vad#rtree', 'http://example.org/vad#TypeExecutor');
        concepts.forEach(function(item) {
            const option = document.createElement('option');
            option.value = item.id;
            const id = getPrefixedName(item.id, currentPrefixes);
            // Формат "id label" через пробел; если label пуст — только id
            option.textContent = item.label ? id + ' ' + item.label : id;
            subjectSelect.appendChild(option);
        });
    } else if (selectedType === 'vad:ProcessTree' || selectedType === 'vad:ExecutorTree' || selectedType === 'vad:VADProcessDia') {
        // Для структурных типов используем старый подход
        const subjects = getSubjectsByType(selectedType);
        subjects.forEach(function(uri) {
            const option = document.createElement('option');
            if (typeof uri === 'object' && uri.uri) {
                option.value = uri.uri;
                option.textContent = typeof formatDropdownDisplayText === 'function'
                    ? formatDropdownDisplayText(uri.uri, uri.label, currentPrefixes)
                    : (uri.label || getPrefixedName(uri.uri, currentPrefixes));
            } else {
                option.value = uri;
                option.textContent = getPrefixedName(uri, currentPrefixes);
            }
            subjectSelect.appendChild(option);
        });
    }

    // Восстанавливаем выбор если значение все еще доступно
    if (currentSubjectValue && Array.from(subjectSelect.options).some(function(o) { return o.value === currentSubjectValue; })) {
        subjectSelect.value = currentSubjectValue;
    } else {
        subjectSelect.value = '';
    }
}

/**
 * Получает предикаты из PTREE_PREDICATES для фильтрации в режиме vad:ptree
 * @returns {Array} - Массив объектов {uri, label}
 */
function getPtreePredicates() {
    const predicates = [];
    const seen = new Set();

    // Добавляем только предикаты, которые есть в PTREE_PREDICATES и присутствуют в данных
    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    const quads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
    quads.forEach(quad => {
        const uri = quad.predicate.value;
        const prefixedName = getPrefixedName(uri, currentPrefixes);
        if (!seen.has(uri) && (isPtreePredicate(uri) || isPtreePredicate(prefixedName))) {
            seen.add(uri);
            predicates.push({ uri: uri, label: prefixedName });
        }
    });

    // Также добавляем предикаты из PTREE_PREDICATES, которых может не быть в данных
    PTREE_PREDICATES.forEach(pred => {
        if (!seen.has(pred) && !pred.startsWith('http')) {
            // Это prefixed name, проверяем есть ли такой в списке
            const alreadyInList = predicates.some(p => p.label === pred);
            if (!alreadyInList) {
                // Пробуем развернуть в полный URI
                let fullUri = pred;
                for (const [prefix, namespace] of Object.entries(currentPrefixes)) {
                    if (pred.startsWith(prefix + ':')) {
                        fullUri = namespace + pred.substring(prefix.length + 1);
                        break;
                    }
                }
                if (!seen.has(fullUri)) {
                    seen.add(fullUri);
                    predicates.push({ uri: fullUri, label: pred });
                }
            }
        }
    });

    return predicates.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Обновляет содержимое выпадающих списков Subject и Predicate
 * в зависимости от выбранного TriG (vad:ptree или другой)
 */
function updateSubjectPredicateDropdowns() {
    const subjectSelect = document.getElementById('smart-design-subject');
    const subjectTypeSelect = document.getElementById('smart-design-subject-type');
    const predicateSelect = document.getElementById('smart-design-predicate');

    if (!subjectSelect || !predicateSelect) return;

    const isPtree = isSelectedTrigPtree();

    // Сохраняем текущие выбранные значения (если возможно)
    const currentSubjectValue = subjectSelect.value;
    const currentPredicateValue = predicateSelect.value;

    // Очищаем и заполняем Subject
    subjectSelect.innerHTML = '<option value="">-- Выберите Subject --</option>';
    subjectSelect.innerHTML += '<option value="__NEW__">New (создать новый)</option>';

    const subjects = isPtree ? getProcessSubjects() : getAllSubjects();
    subjects.forEach(s => {
        const option = document.createElement('option');
        option.value = s.uri;
        option.textContent = s.label;
        subjectSelect.appendChild(option);
    });

    // Сбрасываем Subject Type при смене TriG
    if (subjectTypeSelect) {
        subjectTypeSelect.value = '';
    }

    // Обновляем Predicate с учетом режима и Subject Type
    updatePredicateBySubjectType();

    // Восстанавливаем выбор если значение все еще доступно
    if (currentSubjectValue && Array.from(subjectSelect.options).some(o => o.value === currentSubjectValue)) {
        subjectSelect.value = currentSubjectValue;
    } else {
        subjectSelect.value = '';
    }
    if (currentPredicateValue && Array.from(predicateSelect.options).some(o => o.value === currentPredicateValue)) {
        predicateSelect.value = currentPredicateValue;
    } else {
        predicateSelect.value = '';
    }
}

/**
 * Запрашивает у пользователя новое имя и проверяет его уникальность
 * @param {string} fieldName - Название поля (TriG, Subject, Predicate, Object)
 * @param {Function} existsChecker - Функция проверки существования
 * @param {boolean} allowDuplicate - Разрешить дубликаты (для Object)
 * @returns {string|null} - Введенное имя или null если отменено
 */
function promptForNewValue(fieldName, existsChecker, allowDuplicate = false) {
    const name = prompt(`Введите имя для нового ${fieldName}:`);
    if (!name || name.trim() === '') {
        return null;
    }

    const trimmedName = name.trim();

    if (!allowDuplicate && existsChecker(trimmedName)) {
        showSmartDesignMessage(`Ошибка: ${fieldName} с именем "${trimmedName}" уже существует в RDF данных`, 'error');
        return null;
    }

    return trimmedName;
}

/**
 * Обработчик изменения выбора в выпадающем списке
 * @param {HTMLSelectElement} selectElement - Элемент select
 * @param {string} fieldName - Название поля
 * @param {Function} existsChecker - Функция проверки существования
 * @param {boolean} allowDuplicate - Разрешить дубликаты
 */
function handleSelectChange(selectElement, fieldName, existsChecker, allowDuplicate = false) {
    if (selectElement.value === '__NEW__') {
        const newValue = promptForNewValue(fieldName, existsChecker, allowDuplicate);
        if (newValue) {
            // Добавляем новый элемент в список и выбираем его
            const option = document.createElement('option');
            option.value = '__CUSTOM__:' + newValue;
            option.textContent = newValue + ' (новый)';
            selectElement.insertBefore(option, selectElement.options[2]); // После "New"
            selectElement.value = option.value;
            hideSmartDesignMessage();
        } else {
            // Сбрасываем выбор
            selectElement.value = '';
        }
    }
}

/**
 * Специализированный обработчик для поля Subject с учётом логики концепт/индивид
 * @param {HTMLSelectElement} selectElement - Элемент select
 */
function handleSubjectSelectChange(selectElement) {
    const trigSelect = document.getElementById('smart-design-trig');
    const trigContext = getTrigContext(trigSelect ? trigSelect.value : '');

    if (selectElement.value === '__NEW__') {
        if (trigContext === 'ptree') {
            // В ptree можно создавать новые концепты Process
            const newValue = promptForNewValue('Process (концепт)', subjectExists, false);
            if (newValue) {
                const option = document.createElement('option');
                option.value = '__CUSTOM__:' + newValue;
                option.textContent = newValue + ' (новый концепт)';
                selectElement.insertBefore(option, selectElement.options[2]);
                selectElement.value = option.value;
                hideSmartDesignMessage();
                showSmartDesignMessage('Создаётся новый концепт Process в ptree. Не забудьте добавить rdf:type, rdfs:label и другие обязательные свойства.', 'info');
            } else {
                selectElement.value = '';
            }
        } else if (trigContext === 'rtree') {
            // В rtree можно создавать новые концепты Executor
            const newValue = promptForNewValue('Executor (концепт)', subjectExists, false);
            if (newValue) {
                const option = document.createElement('option');
                option.value = '__CUSTOM__:' + newValue;
                option.textContent = newValue + ' (новый концепт)';
                selectElement.insertBefore(option, selectElement.options[2]);
                selectElement.value = option.value;
                hideSmartDesignMessage();
                showSmartDesignMessage('Создаётся новый концепт Executor в rtree. Не забудьте добавить rdf:type и rdfs:label.', 'info');
            } else {
                selectElement.value = '';
            }
        } else if (trigContext === 'vadProcessDia') {
            // В VADProcessDia можно только выбирать существующие концепты из ptree
            // Показываем диалог выбора концепта
            showConceptSelectionDialog(selectElement);
        } else {
            // Нет выбранного TriG - стандартное поведение
            handleSelectChange(selectElement, 'Subject', subjectExists, false);
        }
    }
}

/**
 * Показывает диалог выбора концепта из ptree для создания индивида в VADProcessDia
 * @param {HTMLSelectElement} selectElement - Элемент select для Subject
 */
function showConceptSelectionDialog(selectElement) {
    // Получаем список концептов Process из ptree
    const processConcepts = getProcessSubjects();

    if (processConcepts.length === 0) {
        showSmartDesignMessage('В ptree нет концептов Process. Сначала создайте концепт процесса в ptree.', 'error');
        selectElement.value = '';
        return;
    }

    // Создаём список для выбора
    const conceptNames = processConcepts.map(c => c.label).join('\n');
    const selectedConcept = prompt(
        'В VADProcessDia нельзя создавать новые имена - только индивиды существующих концептов.\n\n' +
        'Выберите концепт из ptree (введите имя):\n\n' +
        conceptNames
    );

    if (selectedConcept && selectedConcept.trim()) {
        const trimmed = selectedConcept.trim();
        // Ищем соответствующий концепт
        const matchingConcept = processConcepts.find(c =>
            c.label === trimmed ||
            c.label.toLowerCase() === trimmed.toLowerCase() ||
            c.uri.endsWith('#' + trimmed) ||
            c.uri.endsWith('/' + trimmed)
        );

        if (matchingConcept) {
            // Выбираем существующий концепт
            selectElement.value = matchingConcept.uri;
            hideSmartDesignMessage();
            showSmartDesignMessage(
                `Выбран концепт "${matchingConcept.label}". Для создания индивида добавьте vad:isSubprocessTrig первым.`,
                'info'
            );
        } else {
            showSmartDesignMessage(`Концепт "${trimmed}" не найден в ptree. Сначала создайте его там.`, 'error');
            selectElement.value = '';
        }
    } else {
        selectElement.value = '';
    }
}

/**
 * Проверяет, существует ли концепт Process в ptree
 * @param {string} processUri - URI процесса для проверки
 * @returns {boolean} - true если концепт существует в ptree
 */
function isProcessConceptInPtree(processUri) {
    const processConcepts = getProcessSubjects();
    return processConcepts.some(c => c.uri === processUri);
}

/**
 * Автоматически определяет тип выбранного Subject и устанавливает его в Subject Type
 */
function autoDetectSubjectType() {
    const subjectSelect = document.getElementById('smart-design-subject');
    const subjectTypeSelect = document.getElementById('smart-design-subject-type');

    if (!subjectSelect || !subjectTypeSelect) return;

    const subjectUri = subjectSelect.value;
    if (!subjectUri || subjectUri === '__NEW__' || subjectUri.startsWith('__CUSTOM__:')) {
        // Для нового Subject не меняем Subject Type
        return;
    }

    // issue #334: Используем getNodeTypes() вместо nodeTypesCache
    const types = getNodeTypes(subjectUri);

    // Проверяем каждый известный тип
    for (const type of types) {
        const prefixedType = getPrefixedName(type, currentPrefixes);
        // Ищем соответствующий тип в выпадающем списке
        const options = Array.from(subjectTypeSelect.options);
        const matchingOption = options.find(o =>
            o.value === prefixedType || o.value === type
        );
        if (matchingOption) {
            subjectTypeSelect.value = matchingOption.value;
            // Обновляем список Predicate
            updatePredicateBySubjectType();
            return;
        }
    }
}

/**
 * Получает значение из выпадающего списка (с учетом кастомных значений)
 * @param {string} selectId - ID элемента select
 * @returns {string|null} - URI или кастомное значение
 */
function getSmartDesignValue(selectId) {
    const select = document.getElementById(selectId);
    if (!select || !select.value || select.value === '__NEW__') {
        return null;
    }

    if (select.value.startsWith('__CUSTOM__:')) {
        return select.value.substring('__CUSTOM__:'.length);
    }

    return select.value;
}

/**
 * Проверяет, является ли значение в выпадающем списке кастомным (новым литералом)
 * @param {string} selectId - ID элемента select
 * @returns {boolean} - true если это кастомное значение
 */
function isSmartDesignValueCustom(selectId) {
    const select = document.getElementById(selectId);
    if (!select || !select.value) {
        return false;
    }
    return select.value.startsWith('__CUSTOM__:');
}

/**
 * Обновленная функция заполнения Predicate dropdown с учетом автогенерируемых предикатов
 */
function updatePredicateBySubjectTypeWithAutoGen() {
    const subjectTypeSelect = document.getElementById('smart-design-subject-type');
    const predicateSelect = document.getElementById('smart-design-predicate');
    const trigSelect = document.getElementById('smart-design-trig');

    if (!subjectTypeSelect || !predicateSelect || !trigSelect) return;

    const subjectType = subjectTypeSelect.value;
    const trigUri = trigSelect.value;
    const trigContext = getTrigContext(trigUri);

    // Сохраняем текущее выбранное значение
    const currentPredicateValue = predicateSelect.value;

    predicateSelect.innerHTML = '<option value="">-- Выберите Predicate --</option>';

    if (!subjectType) {
        // Показываем все предикаты если тип не выбран
        const allPredicates = getAllPredicates();
        allPredicates.forEach(p => {
            const option = document.createElement('option');
            option.value = p.uri;
            option.textContent = p.label;
            predicateSelect.appendChild(option);
        });
        return;
    }

    // Получаем допустимые предикаты для типа
    const allowedPredicates = getPredicatesForSubjectType(subjectType, trigContext);

    // Определяем технологический объект для проверки автогенерации
    let techObjectUri = '';
    if (subjectType === 'vad:TypeProcess' && trigContext === 'vadProcessDia') {
        techObjectUri = 'http://example.org/vad#IndividProcessPredicate';
    } else if (subjectType === 'vad:ExecutorGroup') {
        techObjectUri = 'http://example.org/vad#ConceptExecutorGroupPredicate';
    } else if (subjectType === 'vad:VADProcessDia') {
        techObjectUri = 'http://example.org/vad#ConceptTriGPredicate';
    }

    allowedPredicates.forEach(pred => {
        const option = document.createElement('option');

        // Разворачиваем в полный URI
        let fullUri = pred;
        for (const [prefix, namespace] of Object.entries(currentPrefixes)) {
            if (pred.startsWith(prefix + ':')) {
                fullUri = namespace + pred.substring(prefix.length + 1);
                break;
            }
        }
        option.value = fullUri;

        // Проверяем, является ли предикат автогенерируемым
        const isAutoGen = techObjectUri && isAutoGeneratedPredicate(techObjectUri, fullUri);

        if (isAutoGen) {
            option.textContent = pred + ' (авто)';
            option.disabled = true;
            option.style.color = '#999';
            option.style.fontStyle = 'italic';
        } else {
            option.textContent = pred;
        }

        predicateSelect.appendChild(option);
    });

    // Восстанавливаем выбор если значение все еще доступно и не disabled
    const availableOption = Array.from(predicateSelect.options).find(
        o => o.value === currentPredicateValue && !o.disabled
    );
    if (availableOption) {
        predicateSelect.value = currentPredicateValue;
    }
}

/**
 * issue #241: Получает индивиды процессов в конкретном TriG графе (VADProcessDia)
 * Ищет субъекты с предикатом vad:isSubprocessTrig, указывающим на данный TriG
 * @param {string} trigUri - URI TriG графа
 * @returns {Array} - Массив объектов {uri, label}
 */
function getProcessIndividualsInTriG(trigUri) {
    // Используем SPARQL запрос для получения индивидов
    const query = SPARQL_QUERIES.PROCESS_INDIVIDUALS_IN_TRIG(trigUri);
    // issue #427: funSPARQLvalues помечена к удалению; guard для обратной совместимости
    const results = typeof funSPARQLvalues === 'function' ? funSPARQLvalues(query, 'process') : [];

    // Если SPARQL не вернул результатов, пробуем прямой поиск по квадам
    if (results.length === 0) {
        const individuals = [];
        const seen = new Set();
        const normalizedTrigUri = normalizeUri(trigUri);

        // issue #326: Используем currentStore.getQuads() вместо currentQuads
        const allQuads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
        allQuads.forEach(quad => {
            const predUri = quad.predicate.value;
            const isSubprocessTrig = predUri === 'http://example.org/vad#isSubprocessTrig' ||
                                     predUri.endsWith('#isSubprocessTrig');
            const graphMatch = quad.graph && (quad.graph.value === trigUri || quad.graph.value === normalizedTrigUri);
            const objectMatch = quad.object.value === trigUri || quad.object.value === normalizedTrigUri;

            if (isSubprocessTrig && (graphMatch || objectMatch)) {
                const subjectUri = quad.subject.value;
                if (!seen.has(subjectUri)) {
                    seen.add(subjectUri);
                    // Пытаемся найти label из ptree
                    let label = getPrefixedName(subjectUri, currentPrefixes);
                    allQuads.forEach(q => {
                        if (q.subject.value === subjectUri &&
                            (q.predicate.value === 'http://www.w3.org/2000/01/rdf-schema#label' ||
                             q.predicate.value.endsWith('#label')) &&
                            q.graph && (q.graph.value === PTREE_GRAPH_URI || q.graph.value.endsWith('#ptree'))) {
                            label = q.object.value;
                        }
                    });
                    individuals.push({ uri: subjectUri, label: label });
                }
            }
        });

        return individuals.sort((a, b) => a.label.localeCompare(b.label));
    }

    return results;
}

/**
 * issue #241: Получает группы исполнителей в конкретном TriG графе
 * @param {string} trigUri - URI TriG графа
 * @returns {Array} - Массив объектов {uri, label}
 */
function getExecutorGroupsInTriG(trigUri) {
    // Используем SPARQL запрос
    const query = SPARQL_QUERIES.EXECUTOR_GROUPS_IN_TRIG(trigUri);
    // issue #427: funSPARQLvalues помечена к удалению; guard для обратной совместимости
    const results = typeof funSPARQLvalues === 'function' ? funSPARQLvalues(query, 'group') : [];

    // Если SPARQL не вернул результатов, пробуем прямой поиск по квадам
    if (results.length === 0) {
        const groups = [];
        const seen = new Set();
        const normalizedTrigUri = normalizeUri(trigUri);

        // issue #326: Используем currentStore.getQuads() вместо currentQuads
        const allQuads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
        allQuads.forEach(quad => {
            // Ищем субъекты с rdf:type vad:ExecutorGroup в данном графе
            const isTypeTriple = quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' ||
                                 quad.predicate.value.endsWith('#type');
            const isExecutorGroup = quad.object.value === 'http://example.org/vad#ExecutorGroup' ||
                                    quad.object.value.endsWith('#ExecutorGroup');
            const graphMatch = quad.graph && (quad.graph.value === trigUri || quad.graph.value === normalizedTrigUri);

            if (isTypeTriple && isExecutorGroup && graphMatch) {
                const subjectUri = quad.subject.value;
                if (!seen.has(subjectUri)) {
                    seen.add(subjectUri);
                    // Ищем label
                    let label = getPrefixedName(subjectUri, currentPrefixes);
                    allQuads.forEach(q => {
                        if (q.subject.value === subjectUri &&
                            (q.predicate.value === 'http://www.w3.org/2000/01/rdf-schema#label' ||
                             q.predicate.value.endsWith('#label'))) {
                            label = q.object.value;
                        }
                    });
                    groups.push({ uri: subjectUri, label: label });
                }
            }
        });

        return groups.sort((a, b) => a.label.localeCompare(b.label));
    }

    return results;
}

/**
 * Копирует значение выбранного поля в буфер обмена
 * @param {string} selectId - ID элемента select
 */
async function copyFieldValue(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const value = select.value;
    if (!value || value === '' || value === '__NEW__') {
        showSmartDesignMessage('Выберите значение для копирования', 'info');
        return;
    }

    // Получаем текст выбранной опции
    const selectedOption = select.options[select.selectedIndex];
    const textToCopy = selectedOption ? selectedOption.textContent : value;

    try {
        await navigator.clipboard.writeText(textToCopy);

        // Визуальная индикация успеха
        const btn = select.parentElement.querySelector('.copy-to-clipboard-btn');
        if (btn) {
            btn.classList.add('copied');
            btn.textContent = '\u2713';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.textContent = '\uD83D\uDCCB';
            }, 1500);
        }

        showSmartDesignMessage(`Скопировано: ${textToCopy}`, 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showSmartDesignMessage('Ошибка копирования в буфер обмена', 'error');
    }
}

