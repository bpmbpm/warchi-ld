// issue #291: UI модуль создания нового TriG контейнера
// issue #384: Выделено из 3_sd_create_new_trig_logic.js для соответствия file_naming.md
// PR #292 | 2026-02-12

/**
 * ==============================================================================
 * CREATE NEW TRIG UI MODULE
 * ==============================================================================
 *
 * UI модуль для создания новых TriG контейнеров (VADProcessDia) в системе RDF Grapher.
 * Содержит функции пользовательского интерфейса:
 * - Рендеринг модальных окон
 * - Обработка событий DOM
 * - Взаимодействие с пользователем
 *
 * Бизнес-логика и работа с данными находятся в 3_sd_create_new_trig_logic.js
 *
 * @file 3_sd_create_new_trig_ui.js
 * @version 1.0
 * @date 2026-02-12
 * @see 3_sd_create_new_trig_logic.js - Бизнес-логика модуля
 * @see file_naming.md - Соглашение по именованию файлов
 * @see funSPARQLvaluesDouble - функция для справочников с недоступными значениями
 */

// ==============================================================================
// ФУНКЦИИ UI: МОДАЛЬНОЕ ОКНО
// ==============================================================================

/**
 * Открывает модальное окно создания нового TriG
 * issue #291: Унифицировано с openNewConceptModal() и openDelConceptModal()
 * - Сначала проверяется quadstore
 * - Затем открывается окно
 */
async function openNewTrigModal() {
    // issue #291, #326: Проверяем, что данные загружены и распарсены
    // issue #326: Используем currentStore вместо currentQuads
    if (!currentStore || currentStore.size === 0) {
        alert('Данные quadstore пусты. Загрузите пример данных (Trig_VADv5 или Trig_VADv6) в разделе "Загрузить пример RDF данных".\n\nQuadstore is empty. Load example data (Trig_VADv5 or Trig_VADv6) in "Load example RDF data" section.');
        return;
    }

    const modal = document.getElementById('new-trig-modal');
    if (!modal) {
        console.error('[3_sd_create_new_trig] Модальное окно new-trig-modal не найдено');
        return;
    }

    // Очищаем предыдущее состояние
    newTrigState = {
        isOpen: true,
        selectedProcess: null,
        processesWithTrig: new Set(),
        intermediateSparql: ''
    };
    newTrigIntermediateSparqlQueries = [];

    // Сбрасываем форму
    resetNewTrigForm();

    // issue #293: Сбрасываем позицию модального окна
    if (typeof resetModalPosition === 'function') {
        resetModalPosition('new-trig-modal');
    }

    // Заполняем список концептов процессов с использованием funSPARQLvaluesDouble
    await populateProcessConceptsWithDouble();

    // Показываем модальное окно
    modal.style.display = 'block';

    // Обновляем состояние полей Smart Design
    if (typeof updateSmartDesignFieldsState === 'function') {
        updateSmartDesignFieldsState();
    }
}

/**
 * Закрывает модальное окно создания нового TriG
 */
function closeNewTrigModal() {
    const modal = document.getElementById('new-trig-modal');
    if (modal) {
        modal.style.display = 'none';
    }

    newTrigState.isOpen = false;

    // Обновляем состояние полей Smart Design
    if (typeof updateSmartDesignFieldsState === 'function') {
        updateSmartDesignFieldsState();
    }
}

/**
 * Сбрасывает форму создания TriG
 */
function resetNewTrigForm() {
    const processSelect = document.getElementById('new-trig-process-concept');
    const trigIdInput = document.getElementById('new-trig-id');
    const trigLabelInput = document.getElementById('new-trig-label');

    if (processSelect) processSelect.innerHTML = '<option value="">-- Выберите концепт процесса --</option>';
    if (trigIdInput) trigIdInput.value = '';
    if (trigLabelInput) trigLabelInput.value = '';

    // Скрываем промежуточный SPARQL
    const intermediateSparqlContainer = document.getElementById('new-trig-intermediate-sparql');
    if (intermediateSparqlContainer) {
        intermediateSparqlContainer.style.display = 'none';
        const textarea = intermediateSparqlContainer.querySelector('textarea');
        if (textarea) textarea.value = '';
    }

    // Скрываем сообщения
    hideNewTrigMessage();
}

// ==============================================================================
// ФУНКЦИИ UI: ЗАПОЛНЕНИЕ DROPDOWN
// ==============================================================================

/**
 * Заполняет dropdown концептов процессов с использованием funSPARQLvaluesDouble
 * issue #291: Процессы с hasTrig отмечаются серым (disabled)
 */
async function populateProcessConceptsWithDouble() {
    const processSelect = document.getElementById('new-trig-process-concept');
    if (!processSelect) return;

    processSelect.innerHTML = '<option value="">-- Выберите концепт процесса --</option>';

    // issue #291: Используем funSPARQLvaluesDouble для получения справочника
    // Первый запрос: все процессы
    // Второй запрос: процессы с hasTrig (будут disabled)
    if (typeof funSPARQLvaluesDouble === 'function') {
        try {
            const concepts = await funSPARQLvaluesDouble(
                SPARQL_ALL_PROCESSES,
                'process',
                SPARQL_PROCESSES_WITH_TRIG,
                'process'
            );

            console.log(`[3_sd_create_new_trig] funSPARQLvaluesDouble returned ${concepts.length} processes`);

            // Сохраняем промежуточные SPARQL запросы
            newTrigIntermediateSparqlQueries.push({
                description: 'Получение всех концептов процессов из ptree (funSPARQLvaluesDouble - Query 1)',
                query: SPARQL_ALL_PROCESSES,
                result: `Найдено ${concepts.length} процессов`
            });

            const disabledCount = concepts.filter(c => c.disabled).length;
            newTrigIntermediateSparqlQueries.push({
                description: 'Получение процессов с существующим hasTrig (funSPARQLvaluesDouble - Query 2)',
                query: SPARQL_PROCESSES_WITH_TRIG,
                result: `Найдено ${disabledCount} процессов с существующим TriG (отмечены серым)`
            });

            // Сохраняем Set процессов с TriG для проверки при создании
            newTrigState.processesWithTrig = new Set(
                concepts.filter(c => c.disabled).map(c => c.uri)
            );

            // Добавляем опции в select
            // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
            concepts.forEach(concept => {
                const option = document.createElement('option');
                option.value = concept.uri;
                option.textContent = typeof formatDropdownDisplayText === 'function'
                    ? formatDropdownDisplayText(concept.uri, concept.label, currentPrefixes)
                    : (concept.label || concept.uri);

                // Помечаем disabled процессы серым
                if (concept.disabled) {
                    option.disabled = true;
                    option.classList.add('disabled-option');
                    option.textContent += ' (уже имеет TriG)';
                }

                processSelect.appendChild(option);
            });

            // Обновляем отображение промежуточного SPARQL
            displayNewTrigIntermediateSparql();

        } catch (error) {
            console.error('[3_sd_create_new_trig] funSPARQLvaluesDouble error:', error);
            // Fallback на старый метод
            await populateProcessConceptsFallback();
        }
    } else if (typeof funSPARQLvaluesDoubleSync === 'function') {
        // Используем синхронную версию
        try {
            const concepts = funSPARQLvaluesDoubleSync(
                SPARQL_ALL_PROCESSES,
                'process',
                SPARQL_PROCESSES_WITH_TRIG,
                'process'
            );

            console.log(`[3_sd_create_new_trig] funSPARQLvaluesDoubleSync returned ${concepts.length} processes`);

            // Сохраняем промежуточные SPARQL запросы
            newTrigIntermediateSparqlQueries.push({
                description: 'Получение всех концептов процессов из ptree',
                query: SPARQL_ALL_PROCESSES,
                result: `Найдено ${concepts.length} процессов`
            });

            const disabledCount = concepts.filter(c => c.disabled).length;
            newTrigIntermediateSparqlQueries.push({
                description: 'Получение процессов с существующим hasTrig',
                query: SPARQL_PROCESSES_WITH_TRIG,
                result: `Найдено ${disabledCount} процессов с существующим TriG`
            });

            newTrigState.processesWithTrig = new Set(
                concepts.filter(c => c.disabled).map(c => c.uri)
            );

            // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
            concepts.forEach(concept => {
                const option = document.createElement('option');
                option.value = concept.uri;
                option.textContent = typeof formatDropdownDisplayText === 'function'
                    ? formatDropdownDisplayText(concept.uri, concept.label, currentPrefixes)
                    : (concept.label || concept.uri);

                if (concept.disabled) {
                    option.disabled = true;
                    option.classList.add('disabled-option');
                    option.textContent += ' (уже имеет TriG)';
                }

                processSelect.appendChild(option);
            });

            displayNewTrigIntermediateSparql();

        } catch (error) {
            console.error('[3_sd_create_new_trig] funSPARQLvaluesDoubleSync error:', error);
            await populateProcessConceptsFallback();
        }
    } else {
        // Fallback: используем старый метод с funSPARQLvaluesComunica
        await populateProcessConceptsFallback();
    }
}

/**
 * Fallback метод для заполнения dropdown (использует FILTER NOT EXISTS)
 */
async function populateProcessConceptsFallback() {
    const processSelect = document.getElementById('new-trig-process-concept');
    if (!processSelect) return;

    // issue #286: SPARQL-driven Programming - фильтрация через SPARQL запрос
    if (typeof funSPARQLvaluesComunica === 'function') {
        try {
            const filteredConcepts = await funSPARQLvaluesComunica(
                SPARQL_PROCESSES_WITHOUT_VADPROCESSDIA,
                'process'
            );

            console.log(`[3_sd_create_new_trig] Fallback: funSPARQLvaluesComunica returned ${filteredConcepts.length} processes without VADProcessDia`);

            newTrigIntermediateSparqlQueries.push({
                description: 'Получение процессов без VADProcessDia (fallback метод с FILTER NOT EXISTS)',
                query: SPARQL_PROCESSES_WITHOUT_VADPROCESSDIA,
                result: `Найдено ${filteredConcepts.length} процессов без схемы`
            });

            // issue #410: Используем formatDropdownDisplayText для отображения "id (label)"
            filteredConcepts.forEach(concept => {
                const option = document.createElement('option');
                option.value = concept.uri;
                option.textContent = typeof formatDropdownDisplayText === 'function'
                    ? formatDropdownDisplayText(concept.uri, concept.label, currentPrefixes)
                    : (concept.label || concept.uri);
                processSelect.appendChild(option);
            });

            displayNewTrigIntermediateSparql();

        } catch (error) {
            console.error('[3_sd_create_new_trig] Fallback SPARQL query error:', error);
        }
    } else {
        console.error('[3_sd_create_new_trig] No SPARQL query function available');
    }
}

// ==============================================================================
// ФУНКЦИИ UI: ОБРАБОТЧИКИ СОБЫТИЙ
// ==============================================================================

/**
 * Обновляет поля формы при выборе концепта процесса
 */
function updateNewTrigFields() {
    const processSelect = document.getElementById('new-trig-process-concept');
    const trigIdInput = document.getElementById('new-trig-id');
    const trigLabelInput = document.getElementById('new-trig-label');

    if (!processSelect || !trigIdInput || !trigLabelInput) return;

    const processUri = processSelect.value;
    if (!processUri) {
        trigIdInput.value = '';
        trigLabelInput.value = '';
        newTrigState.selectedProcess = null;
        return;
    }

    newTrigState.selectedProcess = processUri;

    // Извлекаем ID процесса
    const processId = typeof getPrefixedName === 'function'
        ? getPrefixedName(processUri, currentPrefixes).replace('vad:', '')
        : processUri.split('#').pop();

    const processLabel = processSelect.options[processSelect.selectedIndex].textContent.replace(' (уже имеет TriG)', '');

    trigIdInput.value = `t_${processId}`;
    trigLabelInput.value = `Схема процесса ${processLabel}`;
}

// ==============================================================================
// ФУНКЦИИ UI: ОТОБРАЖЕНИЕ SPARQL
// ==============================================================================

/**
 * Переключает видимость промежуточного SPARQL
 */
function toggleNewTrigIntermediateSparql() {
    const container = document.getElementById('new-trig-intermediate-sparql');
    if (container) {
        const isVisible = container.style.display !== 'none';
        container.style.display = isVisible ? 'none' : 'block';
    }
}

/**
 * Отображает промежуточные SPARQL запросы
 */
function displayNewTrigIntermediateSparql() {
    const container = document.getElementById('new-trig-intermediate-sparql');
    const textarea = container ? container.querySelector('textarea') : null;

    if (!container || !textarea) return;

    if (newTrigIntermediateSparqlQueries.length === 0) {
        container.style.display = 'none';
        return;
    }

    let sparqlText = '# ===== Промежуточные SPARQL запросы (funSPARQLvaluesDouble) =====\n\n';

    newTrigIntermediateSparqlQueries.forEach((query, index) => {
        sparqlText += `# --- ${index + 1}. ${query.description} ---\n`;
        sparqlText += query.query.trim() + '\n';
        if (query.result) {
            sparqlText += `\n# Результат:\n# ${query.result}\n`;
        }
        sparqlText += '\n';
    });

    textarea.value = sparqlText;
    newTrigState.intermediateSparql = sparqlText;

    // Показываем контейнер по умолчанию (issue #291: как в New Concept)
    container.style.display = 'block';
}

// ==============================================================================
// ФУНКЦИИ UI: СООБЩЕНИЯ
// ==============================================================================

/**
 * Показывает сообщение в модальном окне
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип: 'success', 'error', 'warning'
 */
function showNewTrigMessage(message, type = 'info') {
    const messageDiv = document.getElementById('new-trig-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `new-trig-message ${type}`;
        messageDiv.style.display = 'block';
    }
}

/**
 * Скрывает сообщение
 */
function hideNewTrigMessage() {
    const messageDiv = document.getElementById('new-trig-message');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
}

// ==============================================================================
// ФУНКЦИИ UI: ГЕНЕРАЦИЯ SPARQL
// ==============================================================================

/**
 * Создаёт SPARQL запрос для нового TriG контейнера
 * issue #280: Исправлено - все триплеты размещены в именованных графах
 * issue #291: Добавлена проверка на уже существующий TriG
 */
function createNewTrig() {
    hideNewTrigMessage();

    const processSelect = document.getElementById('new-trig-process-concept');
    const trigIdInput = document.getElementById('new-trig-id');
    const trigLabelInput = document.getElementById('new-trig-label');

    if (!processSelect || !processSelect.value) {
        showNewTrigMessage('Выберите концепт процесса', 'error');
        return;
    }

    const processUri = processSelect.value;

    // issue #291: Проверяем, что у выбранного процесса ещё нет TriG
    if (newTrigState.processesWithTrig.has(processUri)) {
        showNewTrigMessage('Выбранный процесс уже имеет схему (TriG). Выберите другой процесс.', 'error');
        return;
    }

    const trigId = trigIdInput ? trigIdInput.value : '';
    const trigLabel = trigLabelInput ? trigLabelInput.value : '';

    if (!trigId) {
        showNewTrigMessage('ID TriG не может быть пустым', 'error');
        return;
    }

    // issue #280: Получаем prefixed name для процесса
    const processPrefixed = typeof getPrefixedName === 'function'
        ? getPrefixedName(processUri, currentPrefixes)
        : '<' + processUri + '>';

    // issue #280: Формируем SPARQL INSERT запрос
    // Все триплеты размещены внутри соответствующих именованных графов:
    // - Метаданные TriG (rdf:type, rdfs:label, vad:hasParentObj) внутри нового графа vad:${trigId}
    // - Связь концепта процесса со схемой (vad:hasTrig) в графе vad:ptree
    const sparqlQuery = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vad: <http://example.org/vad#>

# Создание нового TriG контейнера (VADProcessDia)
# issue #280: Все триплеты размещены в именованных графах
INSERT DATA {
    # Связь концепта процесса со схемой в ptree
    GRAPH vad:ptree {
        ${processPrefixed} vad:hasTrig vad:${trigId} .
    }

    # Метаданные и содержимое нового TriG
    GRAPH vad:${trigId} {
        vad:${trigId} rdf:type vad:VADProcessDia .
        vad:${trigId} rdfs:label "${trigLabel}" .
        vad:${trigId} vad:hasParentObj ${processPrefixed} .
    }
}`;

    // Добавляем финальный SPARQL в промежуточные запросы
    newTrigIntermediateSparqlQueries.push({
        description: 'Итоговый SPARQL INSERT запрос для создания TriG',
        query: sparqlQuery,
        result: `Создание TriG: vad:${trigId} для процесса ${processPrefixed}`
    });

    // Обновляем отображение промежуточного SPARQL
    displayNewTrigIntermediateSparql();

    // Выводим в Result in SPARQL
    const resultTextarea = document.getElementById('result-sparql-query');
    if (resultTextarea) {
        resultTextarea.value = sparqlQuery;
    }

    // Отмечаем что это запрос New TriG
    window.isNewTrigQuery = true;

    showNewTrigMessage(
        `SPARQL INSERT запрос для нового TriG "vad:${trigId}" успешно сгенерирован. ` +
        `Запрос выведен в "Result in SPARQL".`,
        'success'
    );

    closeNewTrigModal();
}

// ==============================================================================
// ЭКСПОРТ ФУНКЦИЙ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА
// ==============================================================================

// Делаем функции доступными глобально для использования из HTML
if (typeof window !== 'undefined') {
    window.openNewTrigModal = openNewTrigModal;
    window.closeNewTrigModal = closeNewTrigModal;
    window.updateNewTrigFields = updateNewTrigFields;
    window.toggleNewTrigIntermediateSparql = toggleNewTrigIntermediateSparql;
    window.createNewTrig = createNewTrig;
    window.showNewTrigMessage = showNewTrigMessage;
    window.hideNewTrigMessage = hideNewTrigMessage;
}

