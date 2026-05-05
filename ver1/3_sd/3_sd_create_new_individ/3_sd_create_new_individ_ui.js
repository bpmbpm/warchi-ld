// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/309
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/384
// PR #310
// 3_sd_create_new_individ_ui.js - UI модуль создания новых индивидов

/**
 * ==============================================================================
 * CREATE NEW INDIVID UI MODULE
 * ==============================================================================
 *
 * UI модуль для создания новых Индивидов в системе RDF Grapher.
 * Содержит функции пользовательского интерфейса:
 * - Рендеринг модальных окон
 * - Обработка событий DOM
 * - Взаимодействие с пользователем
 *
 * Бизнес-логика и работа с данными находятся в 3_sd_create_new_individ_logic.js
 * SPARQL запросы находятся в 3_sd_create_new_individ_sparql.js
 *
 * @file 3_sd_create_new_individ_ui.js
 * @version 1.0
 * @date 2026-02-12
 * @see 3_sd_create_new_individ_logic.js - Бизнес-логика модуля
 * @see 3_sd_create_new_individ_sparql.js - SPARQL запросы
 * @see file_naming.md - Соглашение по именованию файлов
 */

// ==============================================================================
// ФУНКЦИИ UI: МОДАЛЬНОЕ ОКНО
// ==============================================================================

/**
 * Открывает модальное окно создания нового индивида
 * Вызывается по клику на кнопку "New Individ"
 */
function openNewIndividModal() {
    // Проверяем, что данные загружены
    // issue #326: Используем currentStore вместо currentQuads
    if (!currentStore || currentStore.size === 0) {
        alert('Данные quadstore пусты. Загрузите пример данных (Trig_VADv5 или Trig_VADv6) в разделе "Загрузить пример RDF данных".\n\nQuadstore is empty. Load example data (Trig_VADv5 or Trig_VADv6) in "Load example RDF data" section.');
        return;
    }

    // Очищаем предыдущее состояние
    newIndividState = {
        isOpen: true,
        selectedType: null,
        selectedTrig: null,
        selectedConcept: null,
        selectedHasNext: [],
        hasNextMode: 'existing',     // issue #313: по умолчанию "vad:hasNext на существующий"
        selectedProcessIndivid: null,
        selectedExecutorGroup: null,
        selectedExecutor: null,
        intermediateSparql: ''
    };
    newIndividIntermediateSparqlQueries = [];

    const modal = document.getElementById('new-individ-modal');
    if (modal) {
        resetNewIndividForm();

        if (typeof resetModalPosition === 'function') {
            resetModalPosition('new-individ-modal');
        }

        modal.style.display = 'block';

        if (typeof updateSmartDesignFieldsState === 'function') {
            updateSmartDesignFieldsState();
        }
    } else {
        console.error('Модальное окно new-individ-modal не найдено');
    }
}

/**
 * Закрывает модальное окно
 */
function closeNewIndividModal() {
    const modal = document.getElementById('new-individ-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    newIndividState.isOpen = false;

    if (typeof updateSmartDesignFieldsState === 'function') {
        updateSmartDesignFieldsState();
    }
}

/**
 * Сбрасывает форму
 */
function resetNewIndividForm() {
    const typeSelect = document.getElementById('new-individ-type');
    if (typeSelect) typeSelect.value = '';

    const fieldsContainer = document.getElementById('new-individ-fields-container');
    if (fieldsContainer) {
        fieldsContainer.innerHTML = '<p class="new-individ-hint">Выберите тип индивида для отображения полей</p>';
    }

    const intermediateSparqlContainer = document.getElementById('new-individ-intermediate-sparql');
    if (intermediateSparqlContainer) {
        intermediateSparqlContainer.style.display = 'none';
        const textarea = intermediateSparqlContainer.querySelector('textarea');
        if (textarea) textarea.value = '';
    }

    hideNewIndividMessage();
    updateNewIndividCreateButtonState();
}

// ==============================================================================
// ФУНКЦИИ UI: ОБРАБОТЧИКИ СОБЫТИЙ
// ==============================================================================

/**
 * Обработчик изменения типа индивида
 */
function onNewIndividTypeChange() {
    const typeSelect = document.getElementById('new-individ-type');
    const selectedType = typeSelect ? typeSelect.value : null;

    if (!selectedType) {
        resetNewIndividForm();
        return;
    }

    newIndividState.selectedType = selectedType;
    newIndividState.selectedTrig = null;
    newIndividState.selectedConcept = null;
    newIndividState.selectedHasNext = [];
    newIndividState.hasNextMode = 'existing'; // issue #313: сброс на значение по умолчанию
    newIndividState.selectedProcessIndivid = null;
    newIndividState.selectedExecutorGroup = null;
    newIndividState.selectedExecutor = null;
    newIndividIntermediateSparqlQueries = [];

    buildNewIndividForm(selectedType);
    displayNewIndividIntermediateSparql();
    updateNewIndividCreateButtonState();
}

/**
 * Обработчик выбора TriG
 * issue #427: Сделан async для поддержки await fillNewIndividConceptDropdown/fillNewIndividExecutorDropdown
 */
async function onNewIndividTrigChange() {
    const select = document.getElementById('new-individ-trig');
    const trigUri = select ? select.value : null;

    newIndividState.selectedTrig = trigUri;
    newIndividState.selectedConcept = null;
    newIndividState.selectedHasNext = [];
    // issue #313: не сбрасываем hasNextMode при смене TriG — режим сохраняется

    if (!trigUri) {
        updateNewIndividCreateButtonState();
        return;
    }

    const individType = newIndividState.selectedType;

    if (individType === NEW_INDIVID_TYPES.PROCESS) {
        // Заполняем концепты процессов
        // issue #427: await для async функции
        await fillNewIndividConceptDropdown();
        // Заполняем справочник hasNext (из концептов процессов)
        await fillNewIndividHasNextCheckboxes();
    } else if (individType === NEW_INDIVID_TYPES.EXECUTOR) {
        // issue #309: Заполняем связанный справочник индивидов процесса в выбранном TriG
        fillNewIndividProcessIndividDropdown(trigUri);
        // Заполняем концепты исполнителей из rtree
        // issue #427: await для async функции
        await fillNewIndividExecutorDropdown();
        // Сбрасываем ExecutorGroup info
        newIndividState.selectedProcessIndivid = null;
        newIndividState.selectedExecutorGroup = null;
        const egInfo = document.getElementById('new-individ-executor-group-info');
        if (egInfo) egInfo.style.display = 'none';
    }

    displayNewIndividIntermediateSparql();
    updateNewIndividCreateButtonState();
}

/**
 * Обработчик выбора концепта процесса
 */
function onNewIndividConceptChange() {
    const select = document.getElementById('new-individ-concept');
    const conceptUri = select ? select.value : null;
    newIndividState.selectedConcept = conceptUri;

    // Проверяем, есть ли уже такой индивид в TriG
    const checkResult = document.getElementById('new-individ-check-result');
    if (checkResult && conceptUri && newIndividState.selectedTrig) {
        const exists = checkIndividExistsInTrig(conceptUri, newIndividState.selectedTrig);
        if (exists) {
            checkResult.innerHTML = '<div class="new-individ-warning"><strong>Внимание:</strong> Индивид данного концепта уже существует в выбранном TriG. Создание запрещено (допускается только один индивид каждого концепта в TriG).</div>';
            checkResult.style.display = 'block';
        } else {
            checkResult.innerHTML = '<div class="new-individ-success">Проверка пройдена: индивид данного концепта отсутствует в выбранном TriG.</div>';
            checkResult.style.display = 'block';
        }
    }

    displayNewIndividIntermediateSparql();
    updateNewIndividCreateButtonState();
}

/**
 * Обработчик изменения hasNext checkboxes
 */
function onNewIndividHasNextChange() {
    const checkboxes = document.querySelectorAll('#new-individ-hasnext-container input[type="checkbox"]:checked');
    newIndividState.selectedHasNext = Array.from(checkboxes).map(cb => cb.value);
    updateNewIndividCreateButtonState();
}

/**
 * issue #313: Обработчик переключения режима vad:hasNext
 * Переключает между "на существующий" (индивиды в TriG) и "на любой" (концепты из ptree)
 */
// issue #427: Сделана async для поддержки await fillNewIndividHasNextCheckboxes
async function onHasNextModeChange() {
    const modeRadio = document.querySelector('input[name="hasnext-mode"]:checked');
    newIndividState.hasNextMode = modeRadio ? modeRadio.value : 'existing';
    newIndividState.selectedHasNext = [];

    // Перезаполняем checkboxes с учётом нового режима
    // issue #427: await для async функции
    await fillNewIndividHasNextCheckboxes();
    updateNewIndividCreateButtonState();
}

/**
 * issue #309: Обработчик выбора индивида процесса (для создания исполнителя)
 * Автоматически разрешает ExecutorGroup через vad:hasExecutor
 * issue #429: Сделан async для обновления справочника исполнителей с disabled-состоянием
 */
async function onNewIndividProcessIndividChange() {
    const select = document.getElementById('new-individ-process-individ');
    const processIndividUri = select ? select.value : null;

    newIndividState.selectedProcessIndivid = processIndividUri;
    newIndividState.selectedExecutorGroup = null;

    const egInfoContainer = document.getElementById('new-individ-executor-group-info');
    const egDisplay = document.getElementById('new-individ-executor-group-display');

    if (processIndividUri && newIndividState.selectedTrig) {
        // Авто-разрешаем ExecutorGroup для выбранного индивида процесса
        const executorGroupUri = findExecutorGroupForProcessIndivid(
            processIndividUri, newIndividState.selectedTrig
        );

        if (executorGroupUri) {
            newIndividState.selectedExecutorGroup = executorGroupUri;
            const egLabel = typeof getPrefixedName === 'function'
                ? getPrefixedName(executorGroupUri, currentPrefixes)
                : executorGroupUri;

            if (egDisplay) {
                egDisplay.textContent = egLabel;
                egDisplay.style.color = '#28a745';
            }
            if (egInfoContainer) egInfoContainer.style.display = 'block';

            newIndividIntermediateSparqlQueries.push({
                description: 'Авто-определение ExecutorGroup для индивида процесса',
                query: NEW_INDIVID_SPARQL.FIND_EXECUTOR_GROUP_FOR_PROCESS_INDIVID(
                    processIndividUri, newIndividState.selectedTrig
                ),
                result: `Найдена ExecutorGroup: ${egLabel}`
            });

            // issue #429: Обновляем справочник исполнителей с disabled-состоянием
            // (аналог funSPARQLvaluesDoubleSync: весь список исполнителей отображается,
            //  но уже привязанные к ExecutorGroup отмечаются как недоступные)
            await fillNewIndividExecutorDropdown(executorGroupUri, newIndividState.selectedTrig);
        } else {
            if (egDisplay) {
                egDisplay.textContent = 'ExecutorGroup не найдена для данного индивида процесса';
                egDisplay.style.color = '#dc3545';
            }
            if (egInfoContainer) egInfoContainer.style.display = 'block';
        }
    } else {
        if (egInfoContainer) egInfoContainer.style.display = 'none';
    }

    displayNewIndividIntermediateSparql();
    updateNewIndividCreateButtonState();
}

/**
 * Обработчик выбора исполнителя
 */
function onNewIndividExecutorChange() {
    const select = document.getElementById('new-individ-executor');
    newIndividState.selectedExecutor = select ? select.value : null;
    updateNewIndividCreateButtonState();
}

// ==============================================================================
// ФУНКЦИИ UI: ПОСТРОЕНИЕ ФОРМ
// ==============================================================================

/**
 * Строит форму для выбранного типа индивида
 * @param {string} individType - Тип индивида
 */
function buildNewIndividForm(individType) {
    const fieldsContainer = document.getElementById('new-individ-fields-container');
    if (!fieldsContainer) return;

    let html = '';

    // Выбор TriG
    html += `
        <div class="new-individ-field">
            <label for="new-individ-trig">TriG (схема процесса):</label>
            <select id="new-individ-trig" onchange="onNewIndividTrigChange()">
                <option value="">-- Выберите TriG --</option>
            </select>
            <small class="field-hint">Выберите схему процесса для добавления индивида</small>
        </div>
    `;

    if (individType === NEW_INDIVID_TYPES.PROCESS) {
        // Выбор концепта процесса
        html += `
            <div class="new-individ-field">
                <label for="new-individ-concept">Концепт процесса:</label>
                <select id="new-individ-concept" onchange="onNewIndividConceptChange()">
                    <option value="">-- Выберите концепт --</option>
                </select>
                <small class="field-hint">Выберите концепт процесса для создания индивида</small>
            </div>
        `;

        // issue #313: Режим выбора hasNext — "на существующий" или "на любой"
        html += `
            <div class="new-individ-field">
                <label>Режим vad:hasNext:</label>
                <div class="new-individ-hasnext-mode-options">
                    <label class="new-concept-radio">
                        <input type="radio" name="hasnext-mode" value="existing" checked onchange="onHasNextModeChange()">
                        vad:hasNext на существующий (индивиды в TriG)
                    </label>
                    <label class="new-concept-radio">
                        <input type="radio" name="hasnext-mode" value="any" onchange="onHasNextModeChange()">
                        vad:hasNext на любой (все концепты из ptree)
                    </label>
                </div>
            </div>
        `;

        // Множественный выбор hasNext (справочник зависит от выбранного режима)
        html += `
            <div class="new-individ-field">
                <label>vad:hasNext (выберите следующие элементы):</label>
                <div id="new-individ-hasnext-container" class="new-individ-checkbox-container">
                    <p class="new-individ-hint">Сначала выберите TriG</p>
                </div>
                <small class="field-hint">Множественный выбор. Предикаты типа vad:includes не заполняются при создании индивида процесса.</small>
            </div>
        `;
    } else if (individType === NEW_INDIVID_TYPES.EXECUTOR) {
        // issue #309: Связанные справочники: TriG → Индивид процесса → (ExecutorGroup авто)
        // Выбор индивида процесса в выбранном TriG
        html += `
            <div class="new-individ-field">
                <label for="new-individ-process-individ">Индивид процесса:</label>
                <select id="new-individ-process-individ" onchange="onNewIndividProcessIndividChange()">
                    <option value="">-- Сначала выберите TriG --</option>
                </select>
                <small class="field-hint">Выберите индивид процесса из выбранной схемы (TriG). ExecutorGroup определяется автоматически.</small>
            </div>
        `;

        // Информация о разрешённой ExecutorGroup (только для отображения)
        html += `
            <div class="new-individ-field" id="new-individ-executor-group-info" style="display: none;">
                <label>ExecutorGroup (автоопределение):</label>
                <div id="new-individ-executor-group-display" class="new-individ-info-display"></div>
                <small class="field-hint">ExecutorGroup создаётся при создании индивида процесса и определяется автоматически</small>
            </div>
        `;

        // Выбор концепта исполнителя из rtree
        html += `
            <div class="new-individ-field">
                <label for="new-individ-executor">Концепт исполнителя:</label>
                <select id="new-individ-executor" onchange="onNewIndividExecutorChange()">
                    <option value="">-- Выберите исполнителя --</option>
                </select>
                <small class="field-hint">Выберите концепт исполнителя (из rtree) для добавления в ExecutorGroup через vad:includes</small>
            </div>
        `;
    }

    // Контейнер для статуса проверки
    html += '<div id="new-individ-check-result" style="display: none;"></div>';

    fieldsContainer.innerHTML = html;

    // Заполняем dropdown TriG
    fillNewIndividTrigDropdown();
}

// ==============================================================================
// ФУНКЦИИ UI: ЗАПОЛНЕНИЕ DROPDOWN
// ==============================================================================

/**
 * Заполняет dropdown TriG
 */
function fillNewIndividTrigDropdown() {
    const select = document.getElementById('new-individ-trig');
    if (!select) return;

    const trigs = getTrigsForIndivid();
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
 * Заполняет dropdown концептов процессов
 * issue #427: Используем funConceptList_v2 с полными URI вместо funSPARQLvalues
 */
async function fillNewIndividConceptDropdown() {
    const select = document.getElementById('new-individ-concept');
    if (!select) return;

    select.innerHTML = '<option value="">-- Выберите концепт --</option>';

    // issue #427: Заменяем funSPARQLvalues на funConceptList_v2 с полными URI
    let concepts = [];
    if (typeof funConceptList_v2 === 'function') {
        const raw = await funConceptList_v2(currentStore, 'http://example.org/vad#ptree', 'http://example.org/vad#TypeProcess');
        // funConceptList_v2 возвращает [{id, label}], приводим к [{uri, label}]
        concepts = raw.map(function(item) { return { uri: item.id, label: item.label }; });
    }
    if (concepts.length === 0) {
        concepts = getConceptsForIndividManual(
            'http://example.org/vad#TypeProcess',
            'http://example.org/vad#ptree'
        );
    }

    newIndividIntermediateSparqlQueries.push({
        description: 'Получение концептов процессов из ptree (funConceptList_v2)',
        query: 'funConceptList_v2(currentStore, "http://example.org/vad#ptree", "http://example.org/vad#TypeProcess")',
        result: concepts.length > 0
            ? `Найдено ${concepts.length} концептов: ${concepts.map(c => c.label || c.uri).join(', ')}`
            : '(нет результатов)'
    });

    // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
    concepts.forEach(concept => {
        const option = document.createElement('option');
        option.value = concept.uri;
        option.textContent = typeof formatDropdownDisplayText === 'function'
            ? formatDropdownDisplayText(concept.uri, concept.label, currentPrefixes)
            : (concept.label || concept.uri);
        select.appendChild(option);
    });

    displayNewIndividIntermediateSparql();
}

/**
 * Заполняет checkboxes для hasNext
 * issue #313: Поддержка двух режимов:
 * - 'existing': индивиды процесса из выбранного TriG
 * - 'any': все концепты процессов из ptree
 * issue #427: Сделана async для поддержки await getProcessConceptsForHasNext
 */
async function fillNewIndividHasNextCheckboxes() {
    const container = document.getElementById('new-individ-hasnext-container');
    if (!container) return;

    const mode = newIndividState.hasNextMode || 'existing';
    let items = [];

    if (mode === 'existing') {
        // issue #313: Режим "vad:hasNext на существующий" — индивиды процесса в TriG
        const trigUri = newIndividState.selectedTrig;
        if (!trigUri) {
            container.innerHTML = '<p class="new-individ-hint">Сначала выберите TriG</p>';
            return;
        }
        items = getIndividsInTrig(trigUri);

        newIndividIntermediateSparqlQueries.push({
            description: 'issue #313: Получение индивидов процесса из TriG для hasNext (режим "на существующий")',
            query: NEW_INDIVID_SPARQL.GET_INDIVIDS_IN_TRIG(trigUri),
            result: items.length > 0
                ? `Найдено ${items.length} индивидов: ${items.map(i => i.label).join(', ')}`
                : 'Индивиды не найдены'
        });
    } else {
        // Режим "vad:hasNext на любой" — все концепты процессов из ptree
        // issue #427: await для async функции
        items = await getProcessConceptsForHasNext();
    }

    if (items.length === 0) {
        const emptyMsg = mode === 'existing'
            ? 'Индивиды процессов в выбранном TriG не найдены'
            : 'Концепты процессов не найдены';
        container.innerHTML = `<p class="new-individ-hint">${emptyMsg}</p>`;
        return;
    }

    let html = '';
    items.forEach(item => {
        const prefixedName = typeof getPrefixedName === 'function'
            ? getPrefixedName(item.uri, currentPrefixes) : item.uri;
        const displayLabel = item.label || prefixedName;

        html += `
            <label class="new-individ-checkbox-label">
                <input type="checkbox" value="${item.uri}" onchange="onNewIndividHasNextChange()">
                ${displayLabel}
            </label>
        `;
    });

    container.innerHTML = html;
    displayNewIndividIntermediateSparql();
}

/**
 * issue #309: Заполняет dropdown индивидов процесса для выбранного TriG
 * Связанный справочник: при выборе TriG загружаются его индивиды процесса
 * @param {string} trigUri - URI TriG
 */
function fillNewIndividProcessIndividDropdown(trigUri) {
    const select = document.getElementById('new-individ-process-individ');
    if (!select) return;

    select.innerHTML = '<option value="">-- Выберите индивид процесса --</option>';

    const individs = getIndividsInTrig(trigUri);

    const sparqlQuery = NEW_INDIVID_SPARQL.GET_INDIVIDS_IN_TRIG(trigUri);
    newIndividIntermediateSparqlQueries.push({
        description: 'Получение индивидов процесса из выбранного TriG',
        query: sparqlQuery,
        result: individs.length > 0
            ? `Найдено ${individs.length} индивидов: ${individs.map(i => i.label).join(', ')}`
            : 'Индивиды процесса не найдены'
    });

    // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
    individs.forEach(individ => {
        const option = document.createElement('option');
        option.value = individ.uri;
        option.textContent = typeof formatDropdownDisplayText === 'function'
            ? formatDropdownDisplayText(individ.uri, individ.label, currentPrefixes)
            : (individ.label || individ.uri);
        select.appendChild(option);
    });

    displayNewIndividIntermediateSparql();
}

/**
 * Заполняет dropdown исполнителей
 * issue #427: Используем funConceptList_v2 с полными URI вместо funSPARQLvalues
 * issue #429: Поддержка disabled-состояния для уже привязанных исполнителей
 *             (аналог funSPARQLvaluesDoubleSync: весь список исполнителей отображается,
 *              но уже привязанные к ExecutorGroup отмечаются как недоступные)
 * @param {string} [executorGroupUri] - URI ExecutorGroup для проверки уже привязанных исполнителей
 * @param {string} [trigUri] - URI TriG графа для поиска привязанных исполнителей
 */
async function fillNewIndividExecutorDropdown(executorGroupUri, trigUri) {
    const select = document.getElementById('new-individ-executor');
    if (!select) return;

    select.innerHTML = '<option value="">-- Выберите исполнителя --</option>';

    // issue #427: Заменяем funSPARQLvalues на funConceptList_v2 с полными URI
    let concepts = [];
    if (typeof funConceptList_v2 === 'function') {
        const raw = await funConceptList_v2(currentStore, 'http://example.org/vad#rtree', 'http://example.org/vad#TypeExecutor');
        // funConceptList_v2 возвращает [{id, label}], приводим к [{uri, label}]
        concepts = raw.map(function(item) { return { uri: item.id, label: item.label }; });
    }
    if (concepts.length === 0) {
        concepts = getConceptsForIndividManual(
            'http://example.org/vad#TypeExecutor',
            'http://example.org/vad#rtree'
        );
    }

    // issue #429: Получаем уже привязанных исполнителей (аналог funSPARQLvaluesDoubleSync)
    // Весь список отображается, но уже привязанные к ExecutorGroup отмечены как disabled
    const boundExecutorUris = new Set();
    if (executorGroupUri && trigUri && currentStore) {
        const sparqlQueryBound = NEW_INDIVID_SPARQL.GET_BOUND_EXECUTORS_FOR_GROUP(executorGroupUri, trigUri);

        // Получаем привязанных исполнителей напрямую из store (синхронно, аналог funSPARQLvaluesDoubleSync)
        const includesUri = 'http://example.org/vad#includes';
        const quads = currentStore.getQuads(executorGroupUri, includesUri, null, trigUri);
        quads.forEach(function(quad) {
            boundExecutorUris.add(quad.object.value);
        });

        newIndividIntermediateSparqlQueries.push({
            description: 'issue #429: Получение уже привязанных исполнителей ExecutorGroup (аналог funSPARQLvaluesDoubleSync)',
            query: sparqlQueryBound,
            result: boundExecutorUris.size > 0
                ? `Привязано ${boundExecutorUris.size} исполнителей: ${Array.from(boundExecutorUris).map(function(u) {
                    return typeof getPrefixedName === 'function' ? getPrefixedName(u, currentPrefixes) : u;
                }).join(', ')}`
                : 'Нет привязанных исполнителей'
        });
    }

    newIndividIntermediateSparqlQueries.push({
        description: 'Получение концептов исполнителей из rtree (funConceptList_v2)',
        query: 'funConceptList_v2(currentStore, "http://example.org/vad#rtree", "http://example.org/vad#TypeExecutor")',
        result: concepts.length > 0
            ? `Найдено ${concepts.length} исполнителей`
            : '(нет результатов)'
    });

    // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
    // issue #429: Помечаем уже привязанных исполнителей как disabled
    concepts.forEach(function(concept) {
        const option = document.createElement('option');
        option.value = concept.uri;
        const displayText = typeof formatDropdownDisplayText === 'function'
            ? formatDropdownDisplayText(concept.uri, concept.label, currentPrefixes)
            : (concept.label || concept.uri);

        if (boundExecutorUris.has(concept.uri)) {
            // issue #429: Исполнитель уже привязан — отображаем как недоступный
            // issue #431: "(уже привязан)" не добавляется в текст опции,
            // недоступность показывается только через атрибут disabled
            option.textContent = displayText;
            option.disabled = true;
        } else {
            option.textContent = displayText;
        }
        select.appendChild(option);
    });

    displayNewIndividIntermediateSparql();
}

// ==============================================================================
// ФУНКЦИИ UI: СОСТОЯНИЕ КНОПОК
// ==============================================================================

/**
 * Обновляет состояние кнопки "Создать запрос"
 */
function updateNewIndividCreateButtonState() {
    const createBtn = document.querySelector('.new-individ-create-btn');
    if (!createBtn) return;

    let canCreate = false;

    if (newIndividState.selectedType === NEW_INDIVID_TYPES.PROCESS) {
        const trigSelected = newIndividState.selectedTrig != null;
        const conceptSelected = newIndividState.selectedConcept != null;
        const noConflict = !checkIndividExistsInTrig(
            newIndividState.selectedConcept,
            newIndividState.selectedTrig
        );
        canCreate = trigSelected && conceptSelected && noConflict;
    } else if (newIndividState.selectedType === NEW_INDIVID_TYPES.EXECUTOR) {
        // issue #309: Проверяем TriG + индивид процесса + авто-разрешённая ExecutorGroup + исполнитель
        canCreate = newIndividState.selectedTrig != null &&
                    newIndividState.selectedProcessIndivid != null &&
                    newIndividState.selectedExecutorGroup != null &&
                    newIndividState.selectedExecutor != null;
    }

    createBtn.disabled = !canCreate;
    createBtn.title = canCreate ? '' : 'Заполните все обязательные поля';
}

// ==============================================================================
// ФУНКЦИИ UI: ГЕНЕРАЦИЯ SPARQL
// ==============================================================================

/**
 * Создаёт итоговый SPARQL запрос для нового индивида
 */
function createNewIndividSparql() {
    hideNewIndividMessage();

    const individType = newIndividState.selectedType;
    const trigUri = newIndividState.selectedTrig;

    if (!individType || !trigUri) {
        showNewIndividMessage('Выберите тип индивида и TriG', 'error');
        return;
    }

    const prefixes = {
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'vad': 'http://example.org/vad#'
    };

    let sparqlQuery = '';

    if (individType === NEW_INDIVID_TYPES.PROCESS) {
        const conceptUri = newIndividState.selectedConcept;
        if (!conceptUri) {
            showNewIndividMessage('Выберите концепт процесса', 'error');
            return;
        }

        // Проверяем, что индивид не существует
        if (checkIndividExistsInTrig(conceptUri, trigUri)) {
            showNewIndividMessage('Индивид данного концепта уже существует в выбранном TriG', 'error');
            return;
        }

        const trigPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(trigUri, currentPrefixes) : `<${trigUri}>`;

        const individPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(conceptUri, currentPrefixes) : `<${conceptUri}>`;

        // Формируем ID для ExecutorGroup
        const conceptLocalName = conceptUri.split('#').pop();
        const executorGroupUri = `vad:ExecutorGroup_${conceptLocalName}`;
        const individLabel = conceptLocalName;

        // hasNext URIs (prefixed)
        const hasNextPrefixed = newIndividState.selectedHasNext.map(uri =>
            typeof getPrefixedName === 'function'
                ? getPrefixedName(uri, currentPrefixes)
                : `<${uri}>`
        );

        sparqlQuery = NEW_INDIVID_SPARQL.GENERATE_INSERT_PROCESS_INDIVID_QUERY(
            trigPrefixed,
            individPrefixed,
            executorGroupUri,
            hasNextPrefixed,
            individLabel,
            prefixes
        );

    } else if (individType === NEW_INDIVID_TYPES.EXECUTOR) {
        const executorGroupUri = newIndividState.selectedExecutorGroup;
        const executorUri = newIndividState.selectedExecutor;

        if (!executorGroupUri || !executorUri) {
            showNewIndividMessage('Выберите индивид процесса и концепт исполнителя. ExecutorGroup должна определиться автоматически.', 'error');
            return;
        }

        const trigPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(trigUri, currentPrefixes) : `<${trigUri}>`;
        const groupPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(executorGroupUri, currentPrefixes) : `<${executorGroupUri}>`;
        const executorPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(executorUri, currentPrefixes) : `<${executorUri}>`;

        sparqlQuery = NEW_INDIVID_SPARQL.GENERATE_INSERT_EXECUTOR_INDIVID_QUERY(
            trigPrefixed,
            groupPrefixed,
            executorPrefixed,
            prefixes
        );
    }

    // Выводим в Result in SPARQL
    const resultTextarea = document.getElementById('result-sparql-query');
    if (resultTextarea) {
        resultTextarea.value = sparqlQuery;
    }

    window.isNewIndividQuery = true;

    showNewIndividMessage(
        `SPARQL INSERT запрос для нового индивида успешно сгенерирован. Запрос выведен в "Result in SPARQL".`,
        'success'
    );

    closeNewIndividModal();
}

// ==============================================================================
// ФУНКЦИИ UI: ОТОБРАЖЕНИЕ SPARQL
// ==============================================================================

/**
 * Отображает промежуточные SPARQL запросы
 */
function displayNewIndividIntermediateSparql() {
    const container = document.getElementById('new-individ-intermediate-sparql');
    const textarea = container ? container.querySelector('textarea') : null;

    if (!container || !textarea) return;

    if (newIndividIntermediateSparqlQueries.length === 0) {
        container.style.display = 'none';
        return;
    }

    let sparqlText = '# ===== Промежуточные SPARQL запросы и результаты =====\n\n';

    newIndividIntermediateSparqlQueries.forEach((query, index) => {
        sparqlText += `# --- ${index + 1}. ${query.description} ---\n`;
        sparqlText += query.query.trim() + '\n';
        if (query.result) {
            sparqlText += `\n# Результат:\n# ${query.result}\n`;
        }
        sparqlText += '\n';
    });

    textarea.value = sparqlText;
    newIndividState.intermediateSparql = sparqlText;
    container.style.display = 'block';
}

/**
 * Переключает видимость промежуточного SPARQL
 */
function toggleNewIndividIntermediateSparql() {
    const container = document.getElementById('new-individ-intermediate-sparql');
    if (container) {
        const isVisible = container.style.display !== 'none';
        container.style.display = isVisible ? 'none' : 'block';
    }
}

// ==============================================================================
// ФУНКЦИИ UI: СООБЩЕНИЯ
// ==============================================================================

/**
 * Показывает сообщение
 * @param {string} message - Текст
 * @param {string} type - Тип: 'success', 'error', 'warning'
 */
function showNewIndividMessage(message, type = 'info') {
    const messageDiv = document.getElementById('new-individ-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `new-individ-message ${type}`;
        messageDiv.style.display = 'block';
    }
}

/**
 * Скрывает сообщение
 */
function hideNewIndividMessage() {
    const messageDiv = document.getElementById('new-individ-message');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
}

// ==============================================================================
// ФУНКЦИИ UI: HELP
// ==============================================================================

/**
 * issue #309: Показывает справку по созданию индивидов
 * По аналогии с showNewConceptHelp() в модуле создания концептов
 */
function showNewIndividHelp() {
    const helpText = `Создание нового Индивида — справка:

=== Индивид процесса ===
1. Выберите тип: "Индивид процесса"
2. Выберите TriG (схему процесса), куда будет добавлен индивид
3. Выберите концепт процесса из справочника ptree
4. (Опционально) Укажите vad:hasNext — множественный выбор
   Два режима (issue #313):
   - "на существующий" (по умолчанию): из индивидов в TriG
   - "на любой": из всех концептов процесса (ptree)
5. Нажмите "Создать запрос New Individ"

Автоматически создаётся ExecutorGroup с ID формата
ExecutorGroup_<id процесса>.
Предикаты типа vad:includes НЕ заполняются при создании
индивида процесса.

=== Индивид исполнителя ===
1. Выберите тип: "Индивид исполнителя"
2. Выберите TriG (схему процесса)
3. Выберите индивид процесса из выбранной схемы (связанный справочник)
   → ExecutorGroup определяется автоматически
4. Выберите концепт исполнителя из справочника rtree
5. Нажмите "Создать запрос New Individ"

Новый индивид исполнителя добавляется в ExecutorGroup выбранного
индивида процесса через vad:includes.

Примечание: ExecutorGroup создаётся автоматически при создании
индивида процесса. Создание индивида исполнителя лишь добавляет
исполнителя в существующую ExecutorGroup.`;

    alert(helpText);
}

// ==============================================================================
// ЭКСПОРТ ФУНКЦИЙ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА
// ==============================================================================

if (typeof window !== 'undefined') {
    window.openNewIndividModal = openNewIndividModal;
    window.closeNewIndividModal = closeNewIndividModal;
    window.onNewIndividTypeChange = onNewIndividTypeChange;
    window.onNewIndividTrigChange = onNewIndividTrigChange;
    window.onNewIndividConceptChange = onNewIndividConceptChange;
    window.onNewIndividHasNextChange = onNewIndividHasNextChange;
    window.onHasNextModeChange = onHasNextModeChange;                           // issue #313
    window.onNewIndividProcessIndividChange = onNewIndividProcessIndividChange;  // issue #309
    window.onNewIndividExecutorChange = onNewIndividExecutorChange;
    window.toggleNewIndividIntermediateSparql = toggleNewIndividIntermediateSparql;
    window.createNewIndividSparql = createNewIndividSparql;
    window.showNewIndividMessage = showNewIndividMessage;
    window.hideNewIndividMessage = hideNewIndividMessage;
    window.showNewIndividHelp = showNewIndividHelp;  // issue #309
}

