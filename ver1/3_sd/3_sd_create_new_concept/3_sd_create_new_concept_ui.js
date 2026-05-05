// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/252
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/384
// 3_sd_create_new_concept_ui.js - UI модуль создания новых концептов

/**
 * ==============================================================================
 * CREATE NEW CONCEPT UI MODULE
 * ==============================================================================
 *
 * UI модуль для создания новых Концептов (Concept) в системе RDF Grapher.
 * Содержит функции пользовательского интерфейса:
 * - Рендеринг модальных окон
 * - Обработка событий DOM
 * - Взаимодействие с пользователем
 *
 * Бизнес-логика и работа с данными находятся в 3_sd_create_new_concept_logic.js
 * SPARQL запросы находятся в 3_sd_create_new_concept_sparql.js
 *
 * @file 3_sd_create_new_concept_ui.js
 * @version 1.0
 * @date 2026-02-12
 * @see 3_sd_create_new_concept_logic.js - Бизнес-логика модуля
 * @see 3_sd_create_new_concept_sparql.js - SPARQL запросы
 * @see file_naming.md - Соглашение по именованию файлов
 */

// ==============================================================================
// ФУНКЦИИ UI: МОДАЛЬНОЕ ОКНО
// ==============================================================================

/**
 * Открывает модальное окно создания нового концепта
 * Вызывается по клику на кнопку "New Concept"
 */
function openNewConceptModal() {
    // Issue #223, #282, #326: Проверяем, что данные загружены и распарсены
    // issue #282: Удалено сообщение "нажмите кнопку Показать" - данные загружаются автоматически
    // issue #326: Используем currentStore вместо currentQuads
    if (!currentStore || currentStore.size === 0) {
        alert('Данные quadstore пусты. Загрузите пример данных (Trig_VADv5 или Trig_VADv6) в разделе "Загрузить пример RDF данных".\n\nQuadstore is empty. Load example data (Trig_VADv5 or Trig_VADv6) in "Load example RDF data" section.');
        return;
    }

    // Очищаем предыдущее состояние
    newConceptState = {
        isOpen: true,
        selectedType: null,
        predicates: [],
        autoPredicates: [],
        fieldValues: {},
        intermediateSparql: '',
        idGenerationMode: 'manual' // issue #313: по умолчанию 'manual' (ввести вручную)
    };
    intermediateSparqlQueries = [];

    const modal = document.getElementById('new-concept-modal');
    if (modal) {
        // Сбрасываем форму
        resetNewConceptForm();

        // issue #293: Сбрасываем позицию модального окна
        if (typeof resetModalPosition === 'function') {
            resetModalPosition('new-concept-modal');
        }

        modal.style.display = 'block';

        // Обновляем состояние полей Smart Design
        if (typeof updateSmartDesignFieldsState === 'function') {
            updateSmartDesignFieldsState();
        }
    } else {
        console.error('Модальное окно new-concept-modal не найдено');
    }
}

/**
 * Закрывает модальное окно создания нового концепта
 */
function closeNewConceptModal() {
    const modal = document.getElementById('new-concept-modal');
    if (modal) {
        modal.style.display = 'none';
    }

    newConceptState.isOpen = false;

    // Обновляем состояние полей Smart Design
    if (typeof updateSmartDesignFieldsState === 'function') {
        updateSmartDesignFieldsState();
    }
}

/**
 * Сбрасывает форму создания концепта
 */
function resetNewConceptForm() {
    // Сбрасываем выбор типа концепта
    const typeSelect = document.getElementById('new-concept-type');
    if (typeSelect) {
        typeSelect.value = '';
    }

    // Очищаем контейнер полей
    const fieldsContainer = document.getElementById('new-concept-fields-container');
    if (fieldsContainer) {
        fieldsContainer.innerHTML = '<p class="new-concept-hint">Выберите тип концепта для отображения полей ввода</p>';
    }

    // Очищаем промежуточный SPARQL
    const intermediateSparqlContainer = document.getElementById('new-concept-intermediate-sparql');
    if (intermediateSparqlContainer) {
        intermediateSparqlContainer.style.display = 'none';
        intermediateSparqlContainer.querySelector('textarea').value = '';
    }

    // Сбрасываем сообщения
    hideNewConceptMessage();
}

// ==============================================================================
// ФУНКЦИИ UI: ОБРАБОТЧИКИ СОБЫТИЙ
// ==============================================================================

/**
 * Обработчик изменения типа концепта
 * Вызывается при выборе типа в выпадающем списке
 */
function onNewConceptTypeChange() {
    const typeSelect = document.getElementById('new-concept-type');
    const selectedType = typeSelect ? typeSelect.value : null;

    if (!selectedType || !NEW_CONCEPT_CONFIG[selectedType]) {
        resetNewConceptForm();
        return;
    }

    newConceptState.selectedType = selectedType;
    intermediateSparqlQueries = [];

    const config = NEW_CONCEPT_CONFIG[selectedType];

    // Получаем предикаты из технологического объекта (передаём config для fallback)
    const predicates = getPredicatesForNewConcept(config.techObject, config);
    newConceptState.predicates = predicates;

    // Получаем автоматически генерируемые предикаты
    const autoPredicates = getAutoGeneratedPredicates(config.techObject);
    newConceptState.autoPredicates = autoPredicates;

    // Строим форму
    buildNewConceptForm(config, predicates, autoPredicates);

    // Отображаем промежуточный SPARQL
    displayIntermediateSparql();
}

/**
 * Обработчик изменения режима генерации ID
 */
function onIdGenerationModeChange() {
    const autoMode = document.querySelector('input[name="id-generation-mode"][value="auto"]');
    const idInput = document.getElementById('new-concept-id');

    if (autoMode && autoMode.checked) {
        newConceptState.idGenerationMode = 'auto';
        idInput.readOnly = true;
        idInput.placeholder = 'ID будет сгенерирован из label';
        // Обновляем ID из текущего label
        onLabelInput();
    } else {
        newConceptState.idGenerationMode = 'manual';
        idInput.readOnly = false;
        idInput.placeholder = 'Введите ID вручную';
    }
}

/**
 * Обработчик ввода в поле label
 * Автоматически генерирует ID если включён режим автогенерации
 * Issue #209 Fix #1: Также обновляет состояние кнопки создания
 */
function onLabelInput() {
    const labelInput = document.getElementById('new-concept-field-rdfs-label');
    const idInput = document.getElementById('new-concept-id');

    // Генерируем ID автоматически если режим авто
    if (newConceptState.idGenerationMode === 'auto' && labelInput && idInput) {
        const label = labelInput.value;
        const generatedId = generateIdFromLabel(label);
        idInput.value = generatedId;
    }

    // Issue #209 Fix #1: Обновляем состояние кнопки при изменении label
    updateCreateButtonState();
}

/**
 * Fix #3: Обработчик изменения выбора родительского объекта
 * Обновляет состояние кнопки "Создать запрос New Concept"
 */
function onParentObjChange() {
    updateCreateButtonState();
}

/**
 * Issue #209 Fix #1: Обновляет состояние кнопки "Создать запрос New Concept"
 * Кнопка активна только если заполнены все обязательные поля:
 * - Выбран тип концепта
 * - Заполнен rdfs:label (название)
 * - Выбран родительский объект (vad:hasParentObj)
 */
function updateCreateButtonState() {
    const createBtn = document.querySelector('.new-concept-create-btn');
    const parentSelect = document.getElementById('new-concept-field-vad-hasParentObj');
    const labelInput = document.getElementById('new-concept-field-rdfs-label');

    if (!createBtn) return;

    // Кнопка неактивна если:
    // 1. Не выбран тип концепта
    // 2. Не заполнен rdfs:label (название)
    // 3. Не выбран родительский объект
    const typeSelected = newConceptState.selectedType != null;
    const labelFilled = labelInput && labelInput.value && labelInput.value.trim() !== '';
    const parentSelected = parentSelect && parentSelect.value && parentSelect.value.trim() !== '';

    if (typeSelected && labelFilled && parentSelected) {
        createBtn.disabled = false;
        createBtn.title = '';
    } else {
        createBtn.disabled = true;
        if (!typeSelected) {
            createBtn.title = 'Сначала выберите тип концепта';
        } else if (!labelFilled) {
            createBtn.title = 'Введите название концепта (rdfs:label)';
        } else if (!parentSelected) {
            createBtn.title = 'Сначала выберите родительский элемент (vad:hasParentObj)';
        }
    }
}

// ==============================================================================
// ФУНКЦИИ UI: ПОСТРОЕНИЕ ФОРМ
// ==============================================================================

/**
 * Строит форму ввода для нового концепта
 *
 * @param {Object} config - Конфигурация типа концепта
 * @param {Array} predicates - Список предикатов
 * @param {Array} autoPredicates - Список автоматических предикатов
 */
function buildNewConceptForm(config, predicates, autoPredicates) {
    const fieldsContainer = document.getElementById('new-concept-fields-container');
    if (!fieldsContainer) return;

    let html = '';

    // Поле ID с выбором режима генерации
    // issue #313: по умолчанию выбран режим "Ввести вручную"
    html += `
        <div class="new-concept-field new-concept-field-id">
            <label>ID нового концепта:</label>
            <div class="new-concept-id-options">
                <label class="new-concept-radio">
                    <input type="radio" name="id-generation-mode" value="auto" onchange="onIdGenerationModeChange()">
                    Автоматически из label (замена пробелов на _)
                </label>
                <label class="new-concept-radio">
                    <input type="radio" name="id-generation-mode" value="manual" checked onchange="onIdGenerationModeChange()">
                    Ввести вручную
                </label>
            </div>
            <input type="text" id="new-concept-id" placeholder="Введите ID вручную">
            <small class="field-hint">URI: vad:{ID}</small>
        </div>
    `;

    // Перебираем предикаты и создаём поля
    predicates.forEach(predicate => {
        const predicateUri = predicate.uri;
        const predicatePrefixed = predicate.prefixed;

        // Проверяем, является ли предикат автоматическим
        const isAuto = config.autoPredicates.includes(predicatePrefixed) ||
                       autoPredicates.includes(predicateUri);

        // Проверяем, является ли предикат read-only
        const isReadOnly = config.readOnlyPredicates &&
                          config.readOnlyPredicates.includes(predicatePrefixed);

        // Проверяем, является ли предикат виртуальным
        const isVirtual = config.virtualPredicates &&
                         config.virtualPredicates.includes(predicatePrefixed);

        if (isVirtual) {
            // Виртуальные предикаты не отображаем
            return;
        }

        html += buildPredicateField(predicatePrefixed, predicateUri, config, isAuto, isReadOnly);
    });

    fieldsContainer.innerHTML = html;

    // Инициализируем справочники после построения формы
    initializeParentSelector(config);
}

/**
 * Строит HTML для поля ввода предиката
 *
 * @param {string} predicatePrefixed - Предикат в префиксной форме
 * @param {string} predicateUri - URI предиката
 * @param {Object} config - Конфигурация типа концепта
 * @param {boolean} isAuto - Является ли предикат автоматическим
 * @param {boolean} isReadOnly - Является ли предикат только для чтения
 * @returns {string} HTML разметка поля
 */
function buildPredicateField(predicatePrefixed, predicateUri, config, isAuto, isReadOnly) {
    const fieldId = `new-concept-field-${predicatePrefixed.replace(':', '-')}`;
    const disabled = isAuto || isReadOnly ? 'disabled' : '';
    const fieldClass = isAuto ? 'new-concept-field-auto' : (isReadOnly ? 'new-concept-field-readonly' : '');

    let fieldHtml = `<div class="new-concept-field ${fieldClass}">`;
    fieldHtml += `<label for="${fieldId}">${predicatePrefixed}:`;

    if (isAuto) {
        fieldHtml += ' <span class="auto-badge">(авто)</span>';
    } else if (isReadOnly) {
        fieldHtml += ' <span class="readonly-badge">(только чтение)</span>';
    }

    fieldHtml += '</label>';

    // Определяем тип поля по предикату
    switch (predicatePrefixed) {
        case 'rdf:type':
            // rdf:type - автоматически заполняется типом концепта
            fieldHtml += `
                <input type="text" id="${fieldId}" value="${config.typeValue}" ${disabled}
                       data-predicate="${predicatePrefixed}" data-predicate-uri="${predicateUri}">
                <small class="field-hint">Тип объекта устанавливается автоматически</small>
            `;
            break;

        case 'rdfs:label':
            // rdfs:label - текстовое поле с обработчиком для автогенерации ID
            fieldHtml += `
                <input type="text" id="${fieldId}" placeholder="Введите название концепта" ${disabled}
                       data-predicate="${predicatePrefixed}" data-predicate-uri="${predicateUri}"
                       oninput="onLabelInput()">
                <small class="field-hint">Название будет использоваться для автогенерации ID</small>
            `;
            break;

        case 'dcterms:description':
            // dcterms:description - многострочное текстовое поле
            fieldHtml += `
                <textarea id="${fieldId}" rows="3" placeholder="Введите описание концепта" ${disabled}
                          data-predicate="${predicatePrefixed}" data-predicate-uri="${predicateUri}"></textarea>
                <small class="field-hint">Описание концепта (необязательно)</small>
            `;
            break;

        case 'vad:hasParentObj':
            // vad:hasParentObj - выпадающий список с родительскими объектами
            // Fix #3: Добавлен onchange для обновления состояния кнопки "Создать запрос"
            fieldHtml += `
                <select id="${fieldId}" ${disabled}
                        data-predicate="${predicatePrefixed}" data-predicate-uri="${predicateUri}"
                        onchange="onParentObjChange()">
                    <option value="">-- Выберите родительский элемент --</option>
                </select>
                <small class="field-hint">Родительский элемент в иерархии</small>
            `;
            break;

        case 'vad:hasTrig':
            // vad:hasTrig - показывается, но не редактируется
            fieldHtml += `
                <input type="text" id="${fieldId}" value="" disabled
                       data-predicate="${predicatePrefixed}" data-predicate-uri="${predicateUri}"
                       placeholder="TriG создаётся после создания концепта">
                <small class="field-hint">TriG-схема может быть создана только для существующего концепта процесса</small>
            `;
            break;

        default:
            // По умолчанию - текстовое поле
            fieldHtml += `
                <input type="text" id="${fieldId}" placeholder="Введите значение" ${disabled}
                       data-predicate="${predicatePrefixed}" data-predicate-uri="${predicateUri}">
            `;
    }

    fieldHtml += '</div>';
    return fieldHtml;
}

/**
 * Инициализирует справочник родительских объектов
 * Issue #209 Fix #2: Улучшено логирование для диагностики
 *
 * @param {Object} config - Конфигурация типа концепта
 */
function initializeParentSelector(config) {
    const parentSelect = document.getElementById('new-concept-field-vad-hasParentObj');
    if (!parentSelect) return;

    console.log('initializeParentSelector: Starting with config:', {
        typeValueUri: config.typeValueUri,
        targetGraphUri: config.targetGraphUri
    });

    // Получаем объекты для справочника
    const objects = getObjectsForParentSelector(
        config.typeValueUri,
        config.targetGraphUri
    );

    console.log(`initializeParentSelector: Got ${objects.length} objects from getObjectsForParentSelector`);

    // Очищаем и заполняем список
    parentSelect.innerHTML = '<option value="">-- Выберите родительский элемент --</option>';

    // Добавляем корневые опции (vad:ptree или vad:rtree)
    // issue #412: Используем formatDropdownDisplayText для отображения "id (label)"
    if (config.parentRootOptions) {
        config.parentRootOptions.forEach(rootOption => {
            const rootUri = typeof currentPrefixes !== 'undefined' && currentPrefixes['vad']
                ? currentPrefixes['vad'] + rootOption.replace('vad:', '')
                : `http://example.org/vad#${rootOption.replace('vad:', '')}`;

            // Получаем label из RDF store
            let rootLabel = null;
            if (currentStore) {
                const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';
                const quads = currentStore.getQuads(null, rdfsLabelUri, null, null);
                quads.forEach(quad => {
                    if (quad.subject.value === rootUri) {
                        rootLabel = quad.object.value;
                    }
                });
            }

            const option = document.createElement('option');
            option.value = rootUri;
            // Используем formatDropdownDisplayText для консистентного отображения
            option.textContent = typeof formatDropdownDisplayText === 'function'
                ? formatDropdownDisplayText(rootUri, rootLabel, currentPrefixes)
                : (rootLabel || rootOption);
            parentSelect.appendChild(option);
        });
    }

    // Добавляем найденные объекты
    // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
    objects.forEach(obj => {
        const option = document.createElement('option');
        option.value = obj.uri;
        option.textContent = typeof formatDropdownDisplayText === 'function'
            ? formatDropdownDisplayText(obj.uri, obj.label, currentPrefixes)
            : (obj.label || obj.uri);
        parentSelect.appendChild(option);
    });

    console.log(`initializeParentSelector: Total options in dropdown: ${parentSelect.options.length}`);

    // Fix #3: Обновляем состояние кнопки после заполнения справочника
    updateCreateButtonState();
}

// ==============================================================================
// ФУНКЦИИ UI: ОТОБРАЖЕНИЕ SPARQL
// ==============================================================================

/**
 * Отображает промежуточные SPARQL запросы
 * Fix #2: Теперь также показывает результаты выполнения запросов
 */
function displayIntermediateSparql() {
    const container = document.getElementById('new-concept-intermediate-sparql');
    const textarea = container ? container.querySelector('textarea') : null;

    if (!container || !textarea) return;

    if (intermediateSparqlQueries.length === 0) {
        container.style.display = 'none';
        return;
    }

    let sparqlText = '# ===== Промежуточные SPARQL запросы и результаты =====\n\n';

    intermediateSparqlQueries.forEach((query, index) => {
        sparqlText += `# --- ${index + 1}. ${query.description} ---\n`;
        sparqlText += query.query.trim() + '\n';
        // Fix #2: Добавляем результат выполнения запроса
        if (query.result) {
            sparqlText += `\n# Результат:\n# ${query.result}\n`;
        }
        sparqlText += '\n';
    });

    textarea.value = sparqlText;
    newConceptState.intermediateSparql = sparqlText;

    // Показываем контейнер
    container.style.display = 'block';
}

/**
 * Переключает видимость промежуточного SPARQL
 */
function toggleIntermediateSparql() {
    const container = document.getElementById('new-concept-intermediate-sparql');
    if (container) {
        const isVisible = container.style.display !== 'none';
        container.style.display = isVisible ? 'none' : 'block';
    }
}

// ==============================================================================
// ФУНКЦИИ UI: ГЕНЕРАЦИЯ SPARQL
// ==============================================================================

/**
 * Создаёт итоговый SPARQL запрос для нового концепта
 * Вызывается по кнопке "Создать запрос New Concept"
 */
function createNewConceptSparql() {
    hideNewConceptMessage();

    const selectedType = newConceptState.selectedType;
    if (!selectedType || !NEW_CONCEPT_CONFIG[selectedType]) {
        showNewConceptMessage('Выберите тип концепта', 'error');
        return;
    }

    const config = NEW_CONCEPT_CONFIG[selectedType];

    // Собираем значения полей
    // Fix #5: Санитизируем ID, удаляя возможные лишние префиксы
    const rawId = document.getElementById('new-concept-id')?.value?.trim();
    const id = sanitizeConceptId(rawId);
    if (!id) {
        showNewConceptMessage('Введите или сгенерируйте ID концепта', 'error');
        return;
    }

    // Проверяем уникальность ID
    // Issue #250: используем SPARQL-запрос для проверки уникальности в конкретном графе
    const fullUri = buildConceptUri(id);
    if (checkIdExistsSparql(fullUri, config.targetGraphUri)) {
        showNewConceptMessage(`Концепт с ID "${id}" уже существует в ${config.targetGraph}. Выберите другой ID.`, 'error');
        return;
    }

    // Собираем триплеты
    const triples = collectFormTriples(config, id);

    if (triples.length === 0) {
        showNewConceptMessage('Заполните хотя бы одно обязательное поле (rdfs:label)', 'error');
        return;
    }

    // Генерируем SPARQL INSERT запрос
    const prefixes = {
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'dcterms': 'http://purl.org/dc/terms/',
        'vad': 'http://example.org/vad#'
    };

    const sparqlQuery = NEW_CONCEPT_SPARQL.GENERATE_INSERT_QUERY(
        config.targetGraph,
        triples,
        `vad:${id}`,
        prefixes
    );

    // Выводим в поле Result in SPARQL
    const resultTextarea = document.getElementById('result-sparql-query');
    if (resultTextarea) {
        resultTextarea.value = sparqlQuery;
    }

    // Отмечаем что это запрос New Concept (аналогично isNewTrigQuery)
    if (typeof isNewTrigQuery !== 'undefined') {
        window.isNewConceptQuery = true;
    }

    // Показываем сообщение об успехе
    showNewConceptMessage(
        `SPARQL INSERT запрос для нового концепта "${id}" успешно сгенерирован. ` +
        `Запрос выведен в "Result in SPARQL".`,
        'success'
    );

    // Закрываем модальное окно
    closeNewConceptModal();
}

/**
 * Собирает значения из формы в массив триплетов
 *
 * @param {Object} config - Конфигурация типа концепта
 * @param {string} id - ID нового концепта
 * @returns {Array<{predicate: string, object: string, isLiteral: boolean}>} Массив триплетов
 */
function collectFormTriples(config, id) {
    const triples = [];

    // rdf:type - всегда добавляем
    triples.push({
        predicate: 'rdf:type',
        object: config.typeValue,
        isLiteral: false
    });

    // Перебираем поля формы
    const fields = document.querySelectorAll('#new-concept-fields-container [data-predicate]');

    fields.forEach(field => {
        const predicatePrefixed = field.dataset.predicate;
        const value = field.value?.trim();

        // Пропускаем rdf:type (уже добавлен)
        if (predicatePrefixed === 'rdf:type') return;

        // Пропускаем пустые значения
        if (!value) return;

        // Пропускаем vad:hasTrig (он read-only и пустой)
        if (predicatePrefixed === 'vad:hasTrig') return;

        // Определяем, является ли значение литералом
        const isLiteral = ['rdfs:label', 'dcterms:description'].includes(predicatePrefixed);

        // Для vad:hasParentObj преобразуем URI в prefixed форму
        let objectValue = value;
        if (predicatePrefixed === 'vad:hasParentObj' && value.startsWith('http://')) {
            objectValue = typeof getPrefixedName === 'function'
                ? getPrefixedName(value, currentPrefixes)
                : value;
        }

        triples.push({
            predicate: predicatePrefixed,
            object: objectValue,
            isLiteral: isLiteral
        });
    });

    return triples;
}

// ==============================================================================
// ФУНКЦИИ UI: СООБЩЕНИЯ
// ==============================================================================

/**
 * Показывает сообщение в модальном окне New Concept
 *
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип сообщения: 'success', 'error', 'warning'
 */
function showNewConceptMessage(message, type = 'info') {
    const messageDiv = document.getElementById('new-concept-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `new-concept-message ${type}`;
        messageDiv.style.display = 'block';
    }
}

/**
 * Скрывает сообщение в модальном окне New Concept
 */
function hideNewConceptMessage() {
    const messageDiv = document.getElementById('new-concept-message');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
}

// ==============================================================================
// ФУНКЦИИ UI: HELP
// ==============================================================================

/**
 * issue #268: Показывает справку по именованию концептов
 * Объясняет проблему с точками в идентификаторах (ID) и предлагает альтернативы
 *
 * Проблема: N3.Writer при сериализации может выбирать полный URI вместо
 * prefixed формы для URI, содержащих точки (например, vad:p1.1.1).
 * Это связано с тем, что точка является специальным символом в Turtle.
 *
 * @see https://github.com/bpmbpm/rdf-grapher/blob/main/ver9d/design/store/n3js_serialization_format.md#1-%D0%BF%D0%BE%D0%BB%D0%BD%D1%8B%D0%B9-uri-%D0%B2%D0%BC%D0%B5%D1%81%D1%82%D0%BE-prefix
 */
function showNewConceptHelp() {
    const helpMessage = `
ВНИМАНИЕ: Проблема использования точки (.) в именах (ID) концептов

При использовании точки в идентификаторе концепта (например: p1.1.1, process.1.2)
библиотека N3.js может сериализовать URI в полной форме вместо префиксной:

   Ожидаемый формат:  vad:p1.1.1
   Фактический формат: <http://example.org/vad#p1.1.1>

Это происходит потому, что точка (.) является специальным символом в синтаксисе Turtle.

РЕКОМЕНДАЦИЯ:
Используйте альтернативные разделители для номеров процессов:
   - Подчёркивание: p1_1_1
   - Дефис: p1-1-1
   - CamelCase: p1s1s1 (s = sub)

Подробнее см. документацию:
https://github.com/bpmbpm/rdf-grapher/blob/main/ver9d/design/store/n3js_serialization_format.md#1-полный-uri-вместо-prefix
    `.trim();

    // Используем более красивый диалог, если доступен, иначе alert
    if (typeof showInfoDialog === 'function') {
        showInfoDialog({
            title: 'Справка: именование концептов',
            message: helpMessage,
            linkText: 'Подробнее в документации',
            linkUrl: 'https://github.com/bpmbpm/rdf-grapher/blob/main/ver9d/design/store/n3js_serialization_format.md#1-%D0%BF%D0%BE%D0%BB%D0%BD%D1%8B%D0%B9-uri-%D0%B2%D0%BC%D0%B5%D1%81%D1%82%D0%BE-prefix'
        });
    } else {
        // Fallback на стандартный alert с возможностью открыть ссылку
        const openDoc = confirm(helpMessage + '\n\nОткрыть документацию в новой вкладке?');
        if (openDoc) {
            window.open('https://github.com/bpmbpm/rdf-grapher/blob/main/ver9d/design/store/n3js_serialization_format.md#1-%D0%BF%D0%BE%D0%BB%D0%BD%D1%8B%D0%B9-uri-%D0%B2%D0%BC%D0%B5%D1%81%D1%82%D0%BE-prefix', '_blank');
        }
    }
}

// ==============================================================================
// ЭКСПОРТ ФУНКЦИЙ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА
// ==============================================================================

// Делаем функции доступными глобально для использования из HTML
if (typeof window !== 'undefined') {
    window.openNewConceptModal = openNewConceptModal;
    window.closeNewConceptModal = closeNewConceptModal;
    window.onNewConceptTypeChange = onNewConceptTypeChange;
    window.onIdGenerationModeChange = onIdGenerationModeChange;
    window.onLabelInput = onLabelInput;
    window.onParentObjChange = onParentObjChange;           // Fix #3
    window.updateCreateButtonState = updateCreateButtonState; // Fix #3
    window.toggleIntermediateSparql = toggleIntermediateSparql;
    window.createNewConceptSparql = createNewConceptSparql;
    window.showNewConceptHelp = showNewConceptHelp;          // Issue #268
}

