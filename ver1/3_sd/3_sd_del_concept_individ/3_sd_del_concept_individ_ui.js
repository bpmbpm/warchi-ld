// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/384
// 3_sd_del_concept_individ_ui.js - UI модуль удаления концептов и индивидов

/**
 * ==============================================================================
 * DELETE CONCEPT/INDIVID UI MODULE
 * ==============================================================================
 *
 * UI модуль для удаления Концептов и Индивидов в системе RDF Grapher.
 * Содержит функции пользовательского интерфейса:
 * - Рендеринг модальных окон
 * - Обработка событий DOM
 * - Взаимодействие с пользователем
 *
 * Бизнес-логика и работа с данными находятся в 3_sd_del_concept_individ_logic.js
 * SPARQL запросы находятся в 3_sd_del_concept_individ_sparql.js
 *
 * @file 3_sd_del_concept_individ_ui.js
 * @version 1.0
 * @date 2026-02-12
 * @see 3_sd_del_concept_individ_logic.js - Бизнес-логика модуля
 * @see 3_sd_del_concept_individ_sparql.js - SPARQL запросы
 * @see file_naming.md - Соглашение по именованию файлов
 */

// ==============================================================================
// ФУНКЦИИ UI: МОДАЛЬНОЕ ОКНО
// ==============================================================================

/**
 * Открывает модальное окно удаления концепта/индивида
 * Вызывается по клику на кнопку "Del Concept\Individ"
 */
function openDelConceptModal() {
    // Issue #223, #282, #326: Проверяем, что данные загружены и распарсены
    // issue #282: Удалено сообщение "нажмите кнопку Показать" - данные загружаются автоматически
    // issue #326: Используем currentStore вместо currentQuads
    if (!currentStore || currentStore.size === 0) {
        alert('Данные quadstore пусты. Загрузите пример данных (Trig_VADv5 или Trig_VADv6) в разделе "Загрузить пример RDF данных".\n\nQuadstore is empty. Load example data (Trig_VADv5 or Trig_VADv6) in "Load example RDF data" section.');
        return;
    }

    // Очищаем предыдущее состояние
    delConceptState = {
        isOpen: true,
        selectedOperation: null,
        selectedConcept: null,
        selectedTrig: null,           // issue #311
        selectedIndividuals: [],
        foundIndividuals: [],
        foundTrigs: [],
        validationErrors: [],
        intermediateSparql: ''
    };
    delIntermediateSparqlQueries = [];

    const modal = document.getElementById('del-concept-modal');
    if (modal) {
        resetDelConceptForm();

        // issue #293: Сбрасываем позицию модального окна
        if (typeof resetModalPosition === 'function') {
            resetModalPosition('del-concept-modal');
        }

        modal.style.display = 'block';

        if (typeof updateSmartDesignFieldsState === 'function') {
            updateSmartDesignFieldsState();
        }
    } else {
        console.error('Модальное окно del-concept-modal не найдено');
    }
}

/**
 * issue #372: Открывает модальное окно удаления с предустановленными значениями
 * SPARQL-Driven подход — вызывается из метода Delete Individ Process (12_method)
 *
 * Аналогично Add hasNext Dia — подставляются значения из текущей схемы,
 * пользователь получает готовый SPARQL-запрос для применения.
 *
 * @param {string} type - Тип удаления: 'individProcess' для индивида процесса, 'individExecutor' для индивида исполнителя
 * @param {string} prefixedTrigUri - Prefixed URI схемы (TriG), например 'vad:t_p1'
 * @param {string} prefixedIndividUri - Prefixed URI индивида, например 'vad:p1.1'
 */
// issue #427: Сделана async для поддержки await initializeDelDropdowns
async function openDeleteModal(type, prefixedTrigUri, prefixedIndividUri) {
    // Проверяем наличие данных
    if (!currentStore || currentStore.size === 0) {
        alert('Данные quadstore пусты. Загрузите пример данных.\n\nQuadstore is empty. Load example data.');
        return;
    }

    // issue #382: Проверяем корректность параметра type (только новые обозначения)
    if (type !== 'individProcess' && type !== 'individExecutor') {
        console.error(`openDeleteModal: неверный тип "${type}". Используйте 'individProcess' или 'individExecutor'.`);
        alert(`Неверный тип удаления: "${type}".\nИспользуйте 'individProcess' или 'individExecutor'.\n\nInvalid deletion type: "${type}".\nUse 'individProcess' or 'individExecutor'.`);
        return;
    }

    // Очищаем предыдущее состояние
    delConceptState = {
        isOpen: true,
        selectedOperation: null,
        selectedConcept: null,
        selectedTrig: null,
        selectedIndividuals: [],
        foundIndividuals: [],
        foundTrigs: [],
        validationErrors: [],
        intermediateSparql: ''
    };
    delIntermediateSparqlQueries = [];

    const modal = document.getElementById('del-concept-modal');
    if (!modal) {
        console.error('Модальное окно del-concept-modal не найдено');
        return;
    }

    // Сбрасываем форму
    resetDelConceptForm();

    // issue #382: Выбираем тип операции в зависимости от параметра type
    // Используем только новые обозначения: individProcess, individExecutor
    const operationType = (type === 'individExecutor')
        ? DEL_OPERATION_TYPES.INDIVID_EXECUTOR_IN_SCHEMA
        : DEL_OPERATION_TYPES.INDIVID_PROCESS_IN_SCHEMA;

    const operationSelect = document.getElementById('del-concept-operation');
    if (operationSelect) {
        operationSelect.value = operationType;
    }

    // Устанавливаем состояние
    delConceptState.selectedOperation = operationType;

    // Преобразуем prefixed URI в полные URI
    const trigUri = expandPrefixedName(prefixedTrigUri, currentPrefixes);
    const individUri = expandPrefixedName(prefixedIndividUri, currentPrefixes);

    delConceptState.selectedTrig = trigUri;

    // Строим форму для выбранной операции
    const config = DEL_CONCEPT_CONFIG[operationType];
    // issue #427: await для async функции
    await buildDelConceptForm(config, operationType);

    // initializeDelDropdowns уже вызвана внутри buildDelConceptForm

    // После рендеринга формы — заполняем dropdowns предустановленными значениями
    setTimeout(() => {
        // Выбираем TriG
        const trigSelect = document.getElementById('del-trig-select');
        if (trigSelect) {
            trigSelect.value = trigUri;
            // Эмулируем событие выбора TriG
            onDelTrigSelectForIndivid();

            // После загрузки индивидов — выбираем нужный индивид
            setTimeout(() => {
                const individSelect = document.getElementById('del-individ-in-schema-select');
                if (individSelect) {
                    individSelect.value = individUri;
                    // Эмулируем событие выбора индивида
                    onDelIndividInSchemaSelect();
                }
            }, 100);
        }
    }, 50);

    // Сбрасываем позицию модального окна
    if (typeof resetModalPosition === 'function') {
        resetModalPosition('del-concept-modal');
    }

    modal.style.display = 'block';

    if (typeof updateSmartDesignFieldsState === 'function') {
        updateSmartDesignFieldsState();
    }
}

/**
 * Закрывает модальное окно удаления
 */
function closeDelConceptModal() {
    const modal = document.getElementById('del-concept-modal');
    if (modal) {
        modal.style.display = 'none';
    }

    delConceptState.isOpen = false;

    if (typeof updateSmartDesignFieldsState === 'function') {
        updateSmartDesignFieldsState();
    }
}

/**
 * Сбрасывает форму удаления
 */
function resetDelConceptForm() {
    const operationSelect = document.getElementById('del-concept-operation');
    if (operationSelect) {
        operationSelect.value = '';
    }

    const fieldsContainer = document.getElementById('del-concept-fields-container');
    if (fieldsContainer) {
        fieldsContainer.innerHTML = '<p class="del-concept-hint">Выберите тип операции для отображения полей</p>';
    }

    const resultsContainer = document.getElementById('del-concept-results-container');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }

    const intermediateSparqlContainer = document.getElementById('del-concept-intermediate-sparql');
    if (intermediateSparqlContainer) {
        intermediateSparqlContainer.style.display = 'none';
        const textarea = intermediateSparqlContainer.querySelector('textarea');
        if (textarea) {
            textarea.value = '';
        }
    }

    hideDelConceptMessage();
    updateDelButtonsState();
}

// ==============================================================================
// ФУНКЦИИ UI: ОБРАБОТЧИКИ СОБЫТИЙ
// ==============================================================================

/**
 * Обработчик изменения типа операции
 * issue #427: Сделан async для поддержки await buildDelConceptForm
 */
async function onDelOperationChange() {
    const operationSelect = document.getElementById('del-concept-operation');
    const selectedOperation = operationSelect ? operationSelect.value : null;

    if (!selectedOperation || !DEL_CONCEPT_CONFIG[selectedOperation]) {
        resetDelConceptForm();
        return;
    }

    delConceptState.selectedOperation = selectedOperation;
    delConceptState.selectedConcept = null;
    delConceptState.foundIndividuals = [];
    delConceptState.validationErrors = [];
    delIntermediateSparqlQueries = [];

    const config = DEL_CONCEPT_CONFIG[selectedOperation];

    // issue #427: await для async функции
    await buildDelConceptForm(config, selectedOperation);
    displayDelIntermediateSparql();
    updateDelButtonsState();
}

/**
 * Обработчик выбора концепта
 * issue #437: Сделан async для поддержки await performValidationChecks
 */
async function onDelConceptSelect() {
    const select = document.getElementById('del-concept-select');
    const conceptUri = select ? select.value : null;

    if (!conceptUri) {
        delConceptState.selectedConcept = null;
        hideDelResults();
        updateDelButtonsState();
        return;
    }

    delConceptState.selectedConcept = conceptUri;
    delConceptState.validationErrors = [];
    delConceptState.foundIndividuals = [];

    // Выполняем проверки в зависимости от типа операции
    // issue #437: await для async performValidationChecks
    await performValidationChecks();
    displayDelIntermediateSparql();
    updateDelButtonsState();
}

/**
 * Обработчик выбора TriG
 */
function onDelTrigSelect() {
    const select = document.getElementById('del-trig-select');
    const trigUri = select ? select.value : null;

    if (!trigUri) {
        delConceptState.selectedConcept = null;
        hideDelResults();
        updateDelButtonsState();
        return;
    }

    delConceptState.selectedConcept = trigUri;
    delConceptState.validationErrors = [];

    displayDelIntermediateSparql();
    updateDelButtonsState();
}

/**
 * issue #311 п.3, п.4: Обработчик выбора TriG для операций «в схеме»
 */
function onDelTrigSelectForIndivid() {
    const trigSelect = document.getElementById('del-trig-select');
    const trigUri = trigSelect ? trigSelect.value : null;

    if (!trigUri) {
        // Скрываем выбор индивида
        const container = document.getElementById('del-individ-in-schema-container');
        if (container) container.style.display = 'none';
        delConceptState.selectedConcept = null;
        delConceptState.foundIndividuals = [];
        hideDelResults();
        updateDelButtonsState();
        return;
    }

    // issue #311: Сохраняем выбранный TriG
    delConceptState.selectedTrig = trigUri;
    delConceptState.selectedConcept = null;
    delConceptState.foundIndividuals = [];
    delIntermediateSparqlQueries = [];

    const operationType = delConceptState.selectedOperation;

    // Заполняем список индивидов в выбранной схеме
    const container = document.getElementById('del-individ-in-schema-container');
    const individSelect = document.getElementById('del-individ-in-schema-select');
    if (!container || !individSelect) return;

    // Очищаем dropdown
    individSelect.innerHTML = '<option value="">-- Выберите индивид --</option>';

    if (operationType === DEL_OPERATION_TYPES.INDIVID_PROCESS_IN_SCHEMA) {
        // issue #311 п.3: Находим индивидов процесса в выбранной схеме
        const individuals = findProcessIndividualsInTrig(trigUri);

        delIntermediateSparqlQueries.push({
            description: 'Индивиды процессов в выбранной схеме',
            query: DEL_CONCEPT_SPARQL.GET_PROCESS_INDIVIDUALS_IN_TRIG(trigUri),
            result: individuals.length > 0
                ? `Найдено ${individuals.length}: ${individuals.map(i => i.label || i.uri).join(', ')}`
                : 'Индивиды не найдены'
        });

        // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
        individuals.forEach(individ => {
            const option = document.createElement('option');
            option.value = individ.uri;
            option.textContent = typeof formatDropdownDisplayText === 'function'
                ? formatDropdownDisplayText(individ.uri, individ.label, currentPrefixes)
                : (individ.label || individ.uri);
            individSelect.appendChild(option);
        });
    } else if (operationType === DEL_OPERATION_TYPES.INDIVID_EXECUTOR_IN_SCHEMA) {
        // issue #311 п.4: Находим индивидов исполнителей в выбранной схеме
        const executors = findExecutorIndividualsInTrig(trigUri);

        delIntermediateSparqlQueries.push({
            description: 'Индивиды исполнителей в выбранной схеме',
            query: DEL_CONCEPT_SPARQL.GET_EXECUTOR_INDIVIDUALS_IN_TRIG(trigUri),
            result: executors.length > 0
                ? `Найдено ${executors.length}: ${executors.map(e => e.label || e.uri).join(', ')}`
                : 'Индивиды не найдены'
        });

        // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
        executors.forEach(executor => {
            const option = document.createElement('option');
            option.value = executor.uri;
            option.textContent = typeof formatDropdownDisplayText === 'function'
                ? formatDropdownDisplayText(executor.uri, executor.label, currentPrefixes)
                : (executor.label || executor.uri);
            individSelect.appendChild(option);
        });
    }

    container.style.display = 'block';
    displayDelIntermediateSparql();
    updateDelButtonsState();
}

/**
 * issue #311 п.3, п.4: Обработчик выбора индивида для удаления из конкретной схемы
 */
function onDelIndividInSchemaSelect() {
    const individSelect = document.getElementById('del-individ-in-schema-select');
    const individUri = individSelect ? individSelect.value : null;

    if (!individUri) {
        delConceptState.selectedConcept = null;
        delConceptState.foundIndividuals = [];
        hideDelResults();
        updateDelButtonsState();
        return;
    }

    const operationType = delConceptState.selectedOperation;
    const trigUri = delConceptState.selectedTrig;

    delConceptState.selectedConcept = individUri;

    if (operationType === DEL_OPERATION_TYPES.INDIVID_PROCESS_IN_SCHEMA) {
        // issue #311 п.3: Формируем одного индивида для удаления в конкретной схеме
        delConceptState.foundIndividuals = [{
            uri: individUri,
            trig: trigUri,
            label: typeof getPrefixedName === 'function'
                ? getPrefixedName(individUri, currentPrefixes)
                : individUri
        }];
    } else if (operationType === DEL_OPERATION_TYPES.INDIVID_EXECUTOR_IN_SCHEMA) {
        // issue #311 п.4: Формируем данные для удаления исполнителя в схеме
        // Находим ExecutorGroup, в которой участвует данный исполнитель в выбранном TriG
        const usages = findExecutorUsageInTrig(individUri, trigUri);
        delConceptState.foundIndividuals = usages.map(u => ({
            uri: u.executorGroupUri,
            trig: trigUri,
            executorUri: individUri,
            label: typeof getPrefixedName === 'function'
                ? getPrefixedName(u.executorGroupUri, currentPrefixes)
                : u.executorGroupUri
        }));
    }

    // Показываем результаты
    const resultsContainer = document.getElementById('del-concept-results-container');
    if (resultsContainer && delConceptState.foundIndividuals.length > 0) {
        resultsContainer.innerHTML = buildFoundIndividualsHtml();
        resultsContainer.style.display = 'block';
    }

    displayDelIntermediateSparql();
    updateDelButtonsState();
}

// ==============================================================================
// ФУНКЦИИ UI: ПОСТРОЕНИЕ ФОРМ
// ==============================================================================

/**
 * Строит форму для выбранной операции удаления
 * @param {Object} config - Конфигурация операции
 * @param {string} operationType - Тип операции
 */
// issue #427: Сделана async для поддержки await initializeDelDropdowns
async function buildDelConceptForm(config, operationType) {
    const fieldsContainer = document.getElementById('del-concept-fields-container');
    if (!fieldsContainer) return;

    let html = '';

    // Добавляем предупреждение, если функция не рекомендована
    if (config && config.notRecommended && config.warningMessage) {
        html += `<div class="del-concept-warning" style="background-color: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <strong>⚠️ Внимание:</strong> ${config.warningMessage}
        </div>`;
    }

    switch (operationType) {
        case DEL_OPERATION_TYPES.CONCEPT_PROCESS:
        case DEL_OPERATION_TYPES.INDIVID_PROCESS:
            // Dropdown для выбора концепта процесса
            html += buildConceptSelector('process', 'Выберите концепт процесса:');
            break;

        case DEL_OPERATION_TYPES.CONCEPT_EXECUTOR:
        case DEL_OPERATION_TYPES.INDIVID_EXECUTOR:
            // Dropdown для выбора концепта исполнителя
            html += buildConceptSelector('executor', 'Выберите концепт исполнителя:');
            break;

        case DEL_OPERATION_TYPES.TRIG_SCHEMA:
            // Dropdown для выбора TriG
            html += buildTrigSelector();
            break;

        // issue #311 п.3: Удаление индивида процесса в конкретной схеме
        case DEL_OPERATION_TYPES.INDIVID_PROCESS_IN_SCHEMA:
            html += buildTrigSelectorForIndivid('process');
            break;

        // issue #311 п.4: Удаление индивида исполнителя в конкретной схеме
        case DEL_OPERATION_TYPES.INDIVID_EXECUTOR_IN_SCHEMA:
            html += buildTrigSelectorForIndivid('executor');
            break;
    }

    // Добавляем контейнер для результатов
    html += '<div id="del-concept-results-container" style="display: none;"></div>';

    fieldsContainer.innerHTML = html;

    // Инициализируем dropdown после построения формы
    // issue #427: await для async функции
    await initializeDelDropdowns(operationType);
}

/**
 * Строит HTML для выбора концепта
 * @param {string} type - Тип: 'process' или 'executor'
 * @param {string} label - Текст label
 * @returns {string} HTML
 */
function buildConceptSelector(type, label) {
    return `
        <div class="del-concept-field">
            <label for="del-concept-select">${label}</label>
            <select id="del-concept-select" onchange="onDelConceptSelect()">
                <option value="">-- Выберите ${type === 'process' ? 'процесс' : 'исполнителя'} --</option>
            </select>
            <small class="field-hint">Выберите элемент для проверки и удаления</small>
        </div>
    `;
}

/**
 * Строит HTML для выбора TriG
 * @returns {string} HTML
 */
function buildTrigSelector() {
    return `
        <div class="del-concept-field">
            <label for="del-trig-select">Выберите схему (TriG) для удаления:</label>
            <select id="del-trig-select" onchange="onDelTrigSelect()">
                <option value="">-- Выберите TriG --</option>
            </select>
            <small class="field-hint">Будет удалён весь граф TriG и связь vad:hasTrig</small>
        </div>
    `;
}

/**
 * issue #311 п.3, п.4: Строит HTML для выбора схемы (TriG) и затем индивида в этой схеме
 * @param {string} type - Тип: 'process' или 'executor'
 * @returns {string} HTML
 */
function buildTrigSelectorForIndivid(type) {
    const label = type === 'process'
        ? 'Выберите схему процесса для удаления индивида:'
        : 'Выберите схему процесса для удаления индивида исполнителя:';

    return `
        <div class="del-concept-field">
            <label for="del-trig-select">${label}</label>
            <select id="del-trig-select" onchange="onDelTrigSelectForIndivid()">
                <option value="">-- Выберите схему (TriG) --</option>
            </select>
            <small class="field-hint">После выбора схемы отобразится список индивидов ${type === 'process' ? 'процессов' : 'исполнителей'} для удаления</small>
        </div>
        <div id="del-individ-in-schema-container" style="display: none;">
            <div class="del-concept-field">
                <label for="del-individ-in-schema-select">Выберите индивид для удаления:</label>
                <select id="del-individ-in-schema-select" onchange="onDelIndividInSchemaSelect()">
                    <option value="">-- Выберите индивид --</option>
                </select>
            </div>
        </div>
    `;
}

// ==============================================================================
// ФУНКЦИИ UI: ЗАПОЛНЕНИЕ DROPDOWN
// ==============================================================================

/**
 * issue #311 п.3, п.4: Заполняет dropdown TriG для операций «в схеме»
 * issue #433: Сделана async для поддержки await getAllTrigs
 */
async function fillTrigDropdownForIndivid() {
    const select = document.getElementById('del-trig-select');
    if (!select) return;

    // issue #433: await для async getAllTrigs
    const trigs = await getAllTrigs();

    // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
    trigs.forEach(trig => {
        const option = document.createElement('option');
        option.value = trig.uri;
        option.textContent = typeof formatDropdownDisplayText === 'function'
            ? formatDropdownDisplayText(trig.uri, trig.label, currentPrefixes)
            : (trig.label || trig.uri);
        select.appendChild(option);
    });
}

/**
 * Инициализирует dropdowns для выбранной операции
 * @param {string} operationType - Тип операции
 * issue #427: Сделана async для поддержки await fillConceptDropdown
 */
async function initializeDelDropdowns(operationType) {
    switch (operationType) {
        case DEL_OPERATION_TYPES.CONCEPT_PROCESS:
        case DEL_OPERATION_TYPES.INDIVID_PROCESS:
            // issue #427: await для async функции
            await fillConceptDropdown('process');
            break;

        case DEL_OPERATION_TYPES.CONCEPT_EXECUTOR:
        case DEL_OPERATION_TYPES.INDIVID_EXECUTOR:
            // issue #427: await для async функции
            await fillConceptDropdown('executor');
            break;

        case DEL_OPERATION_TYPES.TRIG_SCHEMA:
            // issue #433: await для async функции
            await fillTrigDropdown();
            break;

        // issue #311 п.3, п.4: Заполняем dropdown TriG для «в схеме»
        case DEL_OPERATION_TYPES.INDIVID_PROCESS_IN_SCHEMA:
        case DEL_OPERATION_TYPES.INDIVID_EXECUTOR_IN_SCHEMA:
            // issue #433: await для async функции
            await fillTrigDropdownForIndivid();
            break;
    }

    displayDelIntermediateSparql();
}

/**
 * Заполняет dropdown концептов
 * @param {string} type - Тип: 'process' или 'executor'
 * issue #427: Сделана async для поддержки await getProcessConceptsForDeletion/getExecutorConceptsForDeletion
 */
async function fillConceptDropdown(type) {
    const select = document.getElementById('del-concept-select');
    if (!select) return;

    // issue #427: await для async функций
    const concepts = type === 'process'
        ? await getProcessConceptsForDeletion()
        : await getExecutorConceptsForDeletion();

    // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
    concepts.forEach(concept => {
        const option = document.createElement('option');
        option.value = concept.uri;
        option.textContent = typeof formatDropdownDisplayText === 'function'
            ? formatDropdownDisplayText(concept.uri, concept.label, currentPrefixes)
            : (concept.label || concept.uri);
        select.appendChild(option);
    });
}

/**
 * Заполняет dropdown TriG
 * issue #433: Сделана async для поддержки await getAllTrigs
 */
async function fillTrigDropdown() {
    const select = document.getElementById('del-trig-select');
    if (!select) return;

    // issue #433: await для async getAllTrigs
    const trigs = await getAllTrigs();

    // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
    trigs.forEach(trig => {
        const option = document.createElement('option');
        option.value = trig.uri;
        option.textContent = typeof formatDropdownDisplayText === 'function'
            ? formatDropdownDisplayText(trig.uri, trig.label, currentPrefixes)
            : (trig.label || trig.uri);
        select.appendChild(option);
    });
}

// ==============================================================================
// ФУНКЦИИ UI: ВАЛИДАЦИЯ И ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ
// ==============================================================================

/**
 * Выполняет проверки перед удалением
 * issue #437: Сделана async для поддержки await checkProcessSchema, checkChildrenElements, checkExecutorUsage
 */
async function performValidationChecks() {
    const operationType = delConceptState.selectedOperation;
    const conceptUri = delConceptState.selectedConcept;
    const config = DEL_CONCEPT_CONFIG[operationType];

    if (!config || !conceptUri) return;

    const resultsContainer = document.getElementById('del-concept-results-container');
    if (!resultsContainer) return;

    let resultsHtml = '';
    delConceptState.validationErrors = [];

    switch (operationType) {
        case DEL_OPERATION_TYPES.CONCEPT_PROCESS:
            // Issue #217: Проверка индивидов (включая проверку использования концепта как индивида)
            const individuals = checkProcessIndividuals(conceptUri);
            if (individuals.length > 0) {
                // Разделяем индивиды на два типа для более понятного сообщения
                const individualsInSchema = individuals.filter(i => i.uri !== conceptUri);
                const conceptAsIndividual = individuals.filter(i => i.uri === conceptUri);

                let errorMessage = '';
                if (individualsInSchema.length > 0 && conceptAsIndividual.length > 0) {
                    errorMessage = `Найдено ${individualsInSchema.length} индивидов в схеме концепта и концепт используется как индивид в ${conceptAsIndividual.length} TriG. Сначала удалите все индивиды и использования концепта.`;
                } else if (conceptAsIndividual.length > 0) {
                    errorMessage = `Концепт используется как индивид (подпроцесс) в ${conceptAsIndividual.length} TriG. Сначала удалите эти индивиды процесса из соответствующих схем.`;
                } else {
                    errorMessage = `Найдено ${individualsInSchema.length} индивидов процесса в схеме. Сначала удалите все индивиды.`;
                }

                delConceptState.validationErrors.push({
                    type: 'individuals',
                    message: errorMessage,
                    items: individuals
                });
            }

            // Проверка схемы
            // issue #437: await для async checkProcessSchema
            const schemas = await checkProcessSchema(conceptUri);
            if (schemas.length > 0) {
                delConceptState.validationErrors.push({
                    type: 'schema',
                    message: `Найдено ${schemas.length} схем процесса. Сначала удалите все схемы.`,
                    items: schemas.map(s => ({ uri: s }))
                });
            }

            // Проверка дочерних элементов
            // issue #437: await для async checkChildrenElements
            const children = await checkChildrenElements(conceptUri, config.targetGraphUri);
            if (children.length > 0) {
                delConceptState.validationErrors.push({
                    type: 'children',
                    message: `Найдено ${children.length} дочерних процессов. Сначала измените их vad:hasParentObj.`,
                    items: children
                });
            }
            break;

        case DEL_OPERATION_TYPES.CONCEPT_EXECUTOR:
            // Проверка использования в TriG (наличие индивидов исполнителя)
            // issue #437: await для async checkExecutorUsage — восстановлена проверка наличия индивидов исполнителя
            const usages = await checkExecutorUsage(conceptUri);
            if (usages.length > 0) {
                delConceptState.validationErrors.push({
                    type: 'usedInTrigs',
                    message: `Исполнитель используется в ${usages.length} TriG. Сначала удалите эти индивиды исполнителя.`,
                    items: usages.map(u => ({ uri: u.trig, processIndivid: u.processIndivid }))
                });
            }

            // Проверка дочерних исполнителей
            // issue #437: await для async checkChildrenElements
            const childExecutors = await checkChildrenElements(conceptUri, config.targetGraphUri);
            if (childExecutors.length > 0) {
                delConceptState.validationErrors.push({
                    type: 'children',
                    message: `Найдено ${childExecutors.length} дочерних исполнителей. Сначала измените их vad:hasParentObj.`,
                    items: childExecutors
                });
            }
            break;

        case DEL_OPERATION_TYPES.INDIVID_PROCESS:
            // issue #309: Для индивидов процесса показываем список найденных индивидов
            // и список всех TriG, где обнаружен данный индивид
            const processIndividuals = findProcessIndividualsManual(conceptUri);
            delConceptState.foundIndividuals = processIndividuals;

            // issue #309: Показываем список TriG, где найден индивид
            if (processIndividuals.length > 0) {
                const trigsList = processIndividuals.map(i => {
                    const trigLabel = typeof getPrefixedName === 'function'
                        ? getPrefixedName(i.trig, currentPrefixes)
                        : i.trig;
                    return trigLabel;
                });
                delIntermediateSparqlQueries.push({
                    description: 'Список TriG, содержащих данный индивид процесса',
                    query: DEL_CONCEPT_SPARQL.GET_PROCESS_INDIVIDUALS_FOR_CONCEPT(conceptUri),
                    result: `Найден в ${trigsList.length} TriG: ${trigsList.join(', ')}`
                });
            }
            break;

        case DEL_OPERATION_TYPES.INDIVID_EXECUTOR:
            // Для индивидов исполнителя показываем использования
            // issue #437: await для async checkExecutorUsage
            const executorUsages = await checkExecutorUsage(conceptUri);
            delConceptState.foundIndividuals = executorUsages.map(u => ({
                uri: u.processIndivid,
                trig: u.trig,
                label: typeof getPrefixedName === 'function'
                    ? getPrefixedName(u.processIndivid, currentPrefixes)
                    : u.processIndivid
            }));
            break;
    }

    // Формируем HTML для отображения результатов
    if (delConceptState.validationErrors.length > 0) {
        resultsHtml = buildValidationErrorsHtml();
    } else if (delConceptState.foundIndividuals.length > 0) {
        resultsHtml = buildFoundIndividualsHtml();
    } else if (operationType === DEL_OPERATION_TYPES.CONCEPT_PROCESS ||
               operationType === DEL_OPERATION_TYPES.CONCEPT_EXECUTOR) {
        resultsHtml = '<div class="del-concept-success">Проверки пройдены. Концепт можно удалить.</div>';
    }

    if (resultsHtml) {
        resultsContainer.innerHTML = resultsHtml;
        resultsContainer.style.display = 'block';
    } else {
        resultsContainer.style.display = 'none';
    }
}

/**
 * Формирует HTML для ошибок валидации
 * @returns {string} HTML
 */
function buildValidationErrorsHtml() {
    let html = '<div class="del-concept-errors">';
    html += '<h4>Удаление невозможно:</h4>';

    delConceptState.validationErrors.forEach(error => {
        html += `<div class="del-concept-error-item">`;
        html += `<p class="error-message">${error.message}</p>`;

        if (error.items && error.items.length > 0) {
            html += '<ul class="error-items">';
            error.items.forEach(item => {
                const label = item.label || (typeof getPrefixedName === 'function'
                    ? getPrefixedName(item.uri, currentPrefixes)
                    : item.uri);
                html += `<li>${label}</li>`;
            });
            html += '</ul>';
        }

        html += '</div>';
    });

    html += '</div>';
    return html;
}

/**
 * Формирует HTML для найденных индивидов
 * issue #309: Добавлен список TriG, где обнаружен индивид
 * @returns {string} HTML
 */
function buildFoundIndividualsHtml() {
    const operationType = delConceptState.selectedOperation;
    const config = DEL_CONCEPT_CONFIG[operationType];

    let html = '<div class="del-concept-individuals">';

    if (delConceptState.foundIndividuals.length === 0) {
        html += '<p class="no-individuals">Индивиды не найдены</p>';
    } else {
        // issue #309, #311: Для INDIVID_PROCESS показываем сводку TriG
        if (operationType === DEL_OPERATION_TYPES.INDIVID_PROCESS ||
            operationType === DEL_OPERATION_TYPES.INDIVID_PROCESS_IN_SCHEMA) {
            const uniqueTrigs = [...new Set(delConceptState.foundIndividuals.map(i => i.trig))];
            const trigLabels = uniqueTrigs.map(t =>
                typeof getPrefixedName === 'function'
                    ? getPrefixedName(t, currentPrefixes)
                    : t
            );
            html += `<div class="del-concept-trig-list" style="background-color: #e8f4fd; border: 1px solid #bee5eb; padding: 8px; margin-bottom: 10px; border-radius: 4px;">`;
            html += `<strong>Индивид найден в ${uniqueTrigs.length} TriG:</strong> ${trigLabels.join(', ')}`;
            html += `</div>`;
        }

        html += `<h4>Найденные индивиды (${delConceptState.foundIndividuals.length}):</h4>`;
        html += '<ul class="individuals-list">';

        delConceptState.foundIndividuals.forEach(individ => {
            const label = individ.label || (typeof getPrefixedName === 'function'
                ? getPrefixedName(individ.uri, currentPrefixes)
                : individ.uri);

            const trigLabel = individ.trig
                ? (typeof getPrefixedName === 'function'
                    ? getPrefixedName(individ.trig, currentPrefixes)
                    : individ.trig)
                : '';

            html += `<li>`;
            html += `<span class="individ-label">${label}</span>`;
            if (trigLabel) {
                html += ` <span class="individ-trig">(в ${trigLabel})</span>`;
            }
            html += `</li>`;
        });

        html += '</ul>';
    }

    html += '</div>';
    return html;
}

/**
 * Скрывает контейнер результатов
 */
function hideDelResults() {
    const resultsContainer = document.getElementById('del-concept-results-container');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}

/**
 * Обновляет состояние кнопок
 */
function updateDelButtonsState() {
    const showIndividualsBtn = document.getElementById('del-show-individuals-btn');
    const createDeleteBtn = document.querySelector('.del-concept-create-btn');

    const operationType = delConceptState.selectedOperation;
    const hasSelectedConcept = delConceptState.selectedConcept != null;
    const hasErrors = delConceptState.validationErrors.length > 0;
    const config = operationType ? DEL_CONCEPT_CONFIG[operationType] : null;

    // Кнопка "Показать индивиды"
    // issue #311: Для «в схеме» кнопка не нужна — индивиды отображаются в dropdown после выбора TriG
    if (showIndividualsBtn) {
        const isInSchemaOp = operationType === DEL_OPERATION_TYPES.INDIVID_PROCESS_IN_SCHEMA ||
                             operationType === DEL_OPERATION_TYPES.INDIVID_EXECUTOR_IN_SCHEMA;
        const showButton = config && config.hasShowIndividualsButton && hasSelectedConcept && !isInSchemaOp;
        showIndividualsBtn.style.display = showButton ? 'inline-block' : 'none';
    }

    // Кнопка "Создать запрос на удаление"
    if (createDeleteBtn) {
        // Для концептов - активна только если нет ошибок валидации
        // Для индивидов - активна если есть найденные индивиды
        // Для TriG - активна если выбран TriG
        let canCreate = false;

        switch (operationType) {
            case DEL_OPERATION_TYPES.CONCEPT_PROCESS:
            case DEL_OPERATION_TYPES.CONCEPT_EXECUTOR:
                canCreate = hasSelectedConcept && !hasErrors;
                break;

            case DEL_OPERATION_TYPES.INDIVID_PROCESS:
            case DEL_OPERATION_TYPES.INDIVID_EXECUTOR:
                canCreate = hasSelectedConcept && delConceptState.foundIndividuals.length > 0;
                break;

            case DEL_OPERATION_TYPES.TRIG_SCHEMA:
                canCreate = hasSelectedConcept;
                break;

            // issue #311 п.3, п.4: Для «в схеме» — активна если выбран индивид и есть данные
            case DEL_OPERATION_TYPES.INDIVID_PROCESS_IN_SCHEMA:
            case DEL_OPERATION_TYPES.INDIVID_EXECUTOR_IN_SCHEMA:
                canCreate = hasSelectedConcept && delConceptState.foundIndividuals.length > 0;
                break;
        }

        createDeleteBtn.disabled = !canCreate;
        createDeleteBtn.title = canCreate ? '' : 'Сначала выберите элемент и пройдите проверки';
    }
}

/**
 * Обработчик кнопки "Показать индивиды"
 * Issue #221 Fix #2: Обновлена логика для корректного поиска индивидов процесса
 * issue #437: Сделана async для поддержки await checkExecutorUsage
 */
async function showIndividuals() {
    const operationType = delConceptState.selectedOperation;
    const conceptUri = delConceptState.selectedConcept;

    if (!conceptUri) {
        showDelConceptMessage('Сначала выберите концепт', 'error');
        return;
    }

    // Перезапускаем поиск индивидов
    if (operationType === DEL_OPERATION_TYPES.INDIVID_PROCESS) {
        const individuals = findProcessIndividualsManual(conceptUri);
        delConceptState.foundIndividuals = individuals;

        // Issue #221 Fix #2: Добавляем промежуточный SPARQL для отображения
        const sparqlQuery = DEL_CONCEPT_SPARQL.GET_PROCESS_INDIVIDUALS_FOR_CONCEPT(conceptUri);
        delIntermediateSparqlQueries.push({
            description: 'Поиск использований концепта как индивида в схемах процессов (VADProcessDia)',
            query: sparqlQuery,
            result: individuals.length > 0
                ? `Найдено ${individuals.length} использований: ${individuals.map(i => {
                    const trigLabel = typeof getPrefixedName === 'function'
                        ? getPrefixedName(i.trig, currentPrefixes)
                        : i.trig;
                    return `${i.label || i.uri} в ${trigLabel}`;
                }).join(', ')}`
                : 'Индивиды не найдены'
        });
    } else if (operationType === DEL_OPERATION_TYPES.INDIVID_EXECUTOR) {
        // issue #437: await для async checkExecutorUsage
        const usages = await checkExecutorUsage(conceptUri);
        delConceptState.foundIndividuals = usages.map(u => ({
            uri: u.processIndivid,
            trig: u.trig,
            label: typeof getPrefixedName === 'function'
                ? getPrefixedName(u.processIndivid, currentPrefixes)
                : u.processIndivid
        }));
    }

    // Обновляем отображение
    const resultsContainer = document.getElementById('del-concept-results-container');
    if (resultsContainer) {
        resultsContainer.innerHTML = buildFoundIndividualsHtml();
        resultsContainer.style.display = 'block';
    }

    displayDelIntermediateSparql();
    updateDelButtonsState();
}

// ==============================================================================
// ФУНКЦИИ UI: ОТОБРАЖЕНИЕ SPARQL
// ==============================================================================

/**
 * Отображает промежуточные SPARQL запросы
 */
function displayDelIntermediateSparql() {
    const container = document.getElementById('del-concept-intermediate-sparql');
    const textarea = container ? container.querySelector('textarea') : null;

    if (!container || !textarea) return;

    if (delIntermediateSparqlQueries.length === 0) {
        container.style.display = 'none';
        return;
    }

    let sparqlText = '# ===== Промежуточные SPARQL запросы и результаты =====\n\n';

    delIntermediateSparqlQueries.forEach((query, index) => {
        sparqlText += `# --- ${index + 1}. ${query.description} ---\n`;
        sparqlText += query.query.trim() + '\n';
        if (query.result) {
            sparqlText += `\n# Результат:\n# ${query.result}\n`;
        }
        sparqlText += '\n';
    });

    textarea.value = sparqlText;
    delConceptState.intermediateSparql = sparqlText;

    container.style.display = 'block';
}

/**
 * Переключает видимость промежуточного SPARQL
 */
function toggleDelIntermediateSparql() {
    const container = document.getElementById('del-concept-intermediate-sparql');
    if (container) {
        const isVisible = container.style.display !== 'none';
        container.style.display = isVisible ? 'none' : 'block';
    }
}

// ==============================================================================
// ФУНКЦИИ UI: СООБЩЕНИЯ
// ==============================================================================

/**
 * Показывает сообщение в модальном окне
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип: 'success', 'error', 'warning'
 */
function showDelConceptMessage(message, type = 'info') {
    const messageDiv = document.getElementById('del-concept-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `del-concept-message ${type}`;
        messageDiv.style.display = 'block';
    }
}

/**
 * Скрывает сообщение
 */
function hideDelConceptMessage() {
    const messageDiv = document.getElementById('del-concept-message');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
}

// ==============================================================================
// ФУНКЦИИ UI: HELP
// ==============================================================================

/**
 * issue #309: Показывает справку по удалению индивида процесса
 * По аналогии с showNewConceptHelp() в модуле создания концептов
 */
function showDelIndividProcessHelp() {
    const helpText = `Удаление индивида процесса — основные этапы:

1. Выбор концепта процесса:
   Из справочника концептов процессов (vad:ptree) выберите концепт,
   индивид которого нужно удалить.

2. Поиск индивидов:
   Система автоматически находит все использования данного концепта
   как индивида (подпроцесса) во всех TriG типа VADProcessDia
   по предикату vad:isSubprocessTrig.
   Отображается список TriG, где обнаружен индивид.

3. Генерация DELETE запроса (по каждому TriG):
   a) Удаление ВСЕХ исходящих триплетов индивида:
      DELETE WHERE { GRAPH <trig> { <individ> ?p ?o . } }
      Удаляются все предикаты без явного перечисления,
      что обеспечивает расширяемость при добавлении
      новых предикатов индивида.

   b) Удаление объекта ExecutorGroup (все триплеты):
      DELETE WHERE { GRAPH <trig> { <ExecutorGroup> ?p ?o . } }
      ExecutorGroup автоматически определяется по vad:hasExecutor.

   c) Удаление входящих связей vad:hasNext:
      Из других индивидов процесса в данном TriG,
      ссылающихся на удаляемый индивид.

4. Применение SPARQL:
   Сгенерированный запрос выводится в "Result in SPARQL"
   для просмотра и применения.

Примечание: После применения SPARQL Virtual TriG пересчитывается
автоматически. Кнопка "Показать Virtual TriG" в Result in SPARQL
отображает результат пересчёта.`;

    alert(helpText);
}

