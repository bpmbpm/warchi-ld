// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/252
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/384
// 3_sd_del_concept_individ_logic.js - Модуль удаления концептов и индивидов
/**
 * ==============================================================================
 * DELETE CONCEPT/INDIVID MODULE - BUSINESS LOGIC
 * ==============================================================================
 *
 * Модуль бизнес-логики для удаления Концептов и Индивидов в системе RDF Grapher.
 * Содержит:
 * - Константы и конфигурацию операций удаления
 * - Функции работы с данными и SPARQL
 * - Алгоритмы поиска и проверки зависимостей
 * - Генерацию SPARQL DELETE запросов
 *
 * UI функции (рендеринг, обработка событий DOM) находятся в 3_sd_del_concept_individ_ui.js
 * SPARQL запросы находятся в 3_sd_del_concept_individ_sparql.js
 *
 * Позволяет удалять:
 * - Концепт процесса (vad:TypeProcess) из vad:ptree
 * - Концепт исполнителя (vad:TypeExecutor) из vad:rtree
 * - Индивид процесса из vad:VADProcessDia
 * - Индивид исполнителя из vad:VADProcessDia
 * - Схему процесса (TriG типа vad:VADProcessDia)
 *
 * Алгоритм работы:
 * 1. Пользователь нажимает кнопку "Del Concept\Individ\Schema" в окне Smart Design
 * 2. Выбирает тип операции удаления из выпадающего списка:
 *    - Удалить концепт процесса
 *    - Удалить концепт исполнителя
 *    - Удалить индивид процесса во всех схемах
 *    - Удалить индивид исполнителя во всех схемах
 *    - Удалить схему процесса (TriG)
 *    - Удалить индивид процесса в схеме (issue #311)
 *    - Удалить индивид исполнителя в схеме (issue #311)
 * 3. В зависимости от типа операции:
 *    - Для концептов: проверяется наличие индивидов и дочерних элементов
 *    - Для индивидов: показывается список индивидов для удаления
 *    - Для схем: показывается список TriG для удаления
 * 4. Формируются промежуточные SPARQL запросы для проверок
 * 5. Генерируется итоговый SPARQL DELETE запрос
 *
 * Правила удаления:
 *
 * 1. Удаление концепта процесса (vad:TypeProcess):
 *    - Проверка наличия индивидов процесса (isSubprocessTrig)
 *    - Проверка наличия схемы процесса (hasTrig)
 *    - Проверка наличия дочерних процессов (hasParentObj)
 *    - Если найдены индивиды/схема - ошибка, сначала удалите их
 *    - Если найдены дочерние - ошибка, сначала исправьте hasParentObj
 *
 * 2. Удаление концепта исполнителя (vad:TypeExecutor):
 *    - Проверка использования исполнителя в TriG (vad:includes)
 *    - Если найден - ошибка со списком TriG, где используется
 *
 * 3. Удаление индивида процесса:
 *    - Выбор концепта процесса
 *    - Показ всех индивидов (кнопка "Показать индивиды")
 *    - Удаление всех триплетов с subject = id удаляемого индивида
 *
 * 4. Удаление индивида исполнителя:
 *    - Выбор концепта исполнителя
 *    - Показ всех TriG, где используется (кнопка "Показать индивиды")
 *    - Удаление vad:includes из соответствующих TriG
 *
 * 5. Удаление схемы процесса (TriG):
 *    - Выбор TriG для удаления
 *    - Удаление всего графа TriG
 *    - Удаление триплета vad:hasTrig в концепте процесса
 *
 * @file 3_sd_del_concept_individ_logic.js
 * @version 2.0
 * @date 2026-02-12
 * @see 3_sd_del_concept_individ_ui.js - UI функции модуля
 * @see 3_sd_del_concept_individ_sparql.js - SPARQL запросы
 * @see file_naming.md - Соглашение по именованию файлов
 * @see sparql-driven-programming.md - Концепция SPARQL-driven программирования
 */

// ==============================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// ==============================================================================

/**
 * Типы операций удаления
 */
const DEL_OPERATION_TYPES = {
    CONCEPT_PROCESS: 'concept-process',
    CONCEPT_EXECUTOR: 'concept-executor',
    INDIVID_PROCESS: 'individ-process',
    INDIVID_EXECUTOR: 'individ-executor',
    TRIG_SCHEMA: 'trig-schema',
    // issue #311 п.3: Удаление индивида процесса в конкретной схеме
    INDIVID_PROCESS_IN_SCHEMA: 'individ-process-in-schema',
    // issue #311 п.4: Удаление индивида исполнителя в конкретной схеме
    INDIVID_EXECUTOR_IN_SCHEMA: 'individ-executor-in-schema'
};

/**
 * Конфигурация типов операций удаления
 */
const DEL_CONCEPT_CONFIG = {
    [DEL_OPERATION_TYPES.CONCEPT_PROCESS]: {
        displayName: 'Удалить концепт процесса',
        description: 'Удаление концепта процесса (vad:TypeProcess) из vad:ptree',
        targetGraph: 'vad:ptree',
        targetGraphUri: 'http://example.org/vad#ptree',
        typeValue: 'vad:TypeProcess',
        typeValueUri: 'http://example.org/vad#TypeProcess',
        // Проверки перед удалением
        checks: ['individuals', 'schema', 'children']
    },
    [DEL_OPERATION_TYPES.CONCEPT_EXECUTOR]: {
        displayName: 'Удалить концепт исполнителя',
        description: 'Удаление концепта исполнителя (vad:TypeExecutor) из vad:rtree',
        targetGraph: 'vad:rtree',
        targetGraphUri: 'http://example.org/vad#rtree',
        typeValue: 'vad:TypeExecutor',
        typeValueUri: 'http://example.org/vad#TypeExecutor',
        // Проверки перед удалением
        checks: ['usedInTrigs']
    },
    [DEL_OPERATION_TYPES.INDIVID_PROCESS]: {
        // issue #311 п.3: Переименовано — теперь «во всех схемах»
        displayName: 'Удалить индивид процесса во всех схемах',
        description: 'Удаление индивида процесса из всех TriG типа vad:VADProcessDia',
        // Индивиды находятся в разных TriG
        hasShowIndividualsButton: true
        // issue #309: Предупреждение удалено — алгоритм теперь полностью удаляет
        // ExecutorGroup и входящие vad:hasNext других индивидов процесса
    },
    [DEL_OPERATION_TYPES.INDIVID_EXECUTOR]: {
        // issue #311 п.4: Переименовано — теперь «во всех схемах»
        displayName: 'Удалить индивид исполнителя во всех схемах',
        description: 'Удаление vad:includes из всех TriG типа vad:VADProcessDia',
        hasShowIndividualsButton: true
    },
    [DEL_OPERATION_TYPES.TRIG_SCHEMA]: {
        displayName: 'Удалить схему процесса (TriG)',
        description: 'Удаление TriG типа vad:VADProcessDia и связи vad:hasTrig'
    },
    // issue #311 п.3: Удаление индивида процесса в конкретной схеме
    [DEL_OPERATION_TYPES.INDIVID_PROCESS_IN_SCHEMA]: {
        displayName: 'Удалить индивид процесса в схеме',
        description: 'Удаление индивида процесса только из выбранной схемы (TriG)',
        hasShowIndividualsButton: true
    },
    // issue #311 п.4: Удаление индивида исполнителя в конкретной схеме
    [DEL_OPERATION_TYPES.INDIVID_EXECUTOR_IN_SCHEMA]: {
        displayName: 'Удалить индивид исполнителя в схеме',
        description: 'Удаление vad:includes только из выбранной схемы (TriG)',
        hasShowIndividualsButton: true
    }
};

// SPARQL запросы вынесены в 3_sd_del_concept_individ_sparql.js
// в соответствии с концепцией SPARQL-driven Programming (issue #252)

// ==============================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ МОДУЛЯ
// ==============================================================================

/**
 * Текущее состояние модуля удаления
 */
let delConceptState = {
    isOpen: false,
    selectedOperation: null,
    selectedConcept: null,
    selectedTrig: null,           // issue #311: Выбранный TriG для «в схеме»
    selectedIndividuals: [],
    foundIndividuals: [],
    foundTrigs: [],
    validationErrors: [],
    intermediateSparql: ''
};

/**
 * Хранилище промежуточных SPARQL запросов для отображения
 */
let delIntermediateSparqlQueries = [];

// ==============================================================================
// ФУНКЦИИ РАБОТЫ С SPARQL
// ==============================================================================

/**
 * Получает концепты процессов из ptree для dropdown
 * issue #372: SPARQL-Driven подход — без JavaScript fallback
 * issue #427: Заменяем funSPARQLvalues на funConceptList_v2 с полными URI
 * @returns {Promise<Array<{uri: string, label: string}>>} Массив концептов
 */
async function getProcessConceptsForDeletion() {
    let concepts = [];

    // issue #427: Используем funConceptList_v2 с полными URI вместо funSPARQLvalues
    if (typeof funConceptList_v2 === 'function') {
        const raw = await funConceptList_v2(currentStore, 'http://example.org/vad#ptree', 'http://example.org/vad#TypeProcess');
        // funConceptList_v2 возвращает [{id, label}], приводим к [{uri, label}]
        concepts = raw.map(function(item) { return { uri: item.id, label: item.label }; });
    } else {
        console.error('getProcessConceptsForDeletion: funConceptList_v2 not available');
    }

    delIntermediateSparqlQueries.push({
        description: 'Получение концептов процессов из ptree (funConceptList_v2)',
        query: 'funConceptList_v2(currentStore, "http://example.org/vad#ptree", "http://example.org/vad#TypeProcess")',
        result: concepts.length > 0
            ? concepts.map(c => c.label || c.uri).join(', ')
            : '(нет результатов)'
    });

    return concepts;
}

/**
 * Получает концепты исполнителей из rtree для dropdown
 * issue #372: SPARQL-Driven подход — без JavaScript fallback
 * issue #427: Заменяем funSPARQLvalues на funConceptList_v2 с полными URI
 * @returns {Promise<Array<{uri: string, label: string}>>} Массив концептов
 */
async function getExecutorConceptsForDeletion() {
    let concepts = [];

    // issue #427: Используем funConceptList_v2 с полными URI вместо funSPARQLvalues
    if (typeof funConceptList_v2 === 'function') {
        const raw = await funConceptList_v2(currentStore, 'http://example.org/vad#rtree', 'http://example.org/vad#TypeExecutor');
        // funConceptList_v2 возвращает [{id, label}], приводим к [{uri, label}]
        concepts = raw.map(function(item) { return { uri: item.id, label: item.label }; });
    } else {
        console.error('getExecutorConceptsForDeletion: funConceptList_v2 not available');
    }

    delIntermediateSparqlQueries.push({
        description: 'Получение концептов исполнителей из rtree (funConceptList_v2)',
        query: 'funConceptList_v2(currentStore, "http://example.org/vad#rtree", "http://example.org/vad#TypeExecutor")',
        result: concepts.length > 0
            ? concepts.map(c => c.label || c.uri).join(', ')
            : '(нет результатов)'
    });

    return concepts;
}

/**
 * issue #372: DEPRECATED — эта функция больше не используется
 * Оставлена для обратной совместимости, но не вызывается из основного кода
 *
 * Ручное получение концептов (устаревший fallback)
 * @deprecated Используйте funSPARQLvalues вместо этой функции
 * @param {string} typeUri - URI типа концепта
 * @param {string} graphUri - URI графа
 * @returns {Array<{uri: string, label: string}>} Массив концептов
 */
function getConceptsManual(typeUri, graphUri) {
    const concepts = [];
    const rdfTypeUri = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
    const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        const conceptUris = new Set();

        // Найти все концепты с указанным типом в указанном графе
        quads.forEach(quad => {
            if (quad.predicate.value === rdfTypeUri &&
                quad.object.value === typeUri &&
                quad.graph && quad.graph.value === graphUri) {
                conceptUris.add(quad.subject.value);
            }
        });

        conceptUris.forEach(uri => {
            let label = typeof getPrefixedName === 'function'
                ? getPrefixedName(uri, currentPrefixes)
                : uri;

            // Ищем label В ТОМ ЖЕ ГРАФЕ, где находится концепт
            quads.forEach(quad => {
                if (quad.subject.value === uri &&
                    quad.predicate.value === rdfsLabelUri &&
                    quad.graph && quad.graph.value === graphUri) {
                    label = quad.object.value;
                }
            });

            concepts.push({ uri, label });
        });
    }

    return concepts;
}

/**
 * Проверяет наличие индивидов для концепта процесса
 * Issue #217: Теперь также проверяет, используется ли сам концепт как индивид в других TriG
 * @param {string} conceptUri - URI концепта
 * @returns {Array<{uri: string, trig: string, label: string}>} Найденные индивиды
 */
function checkProcessIndividuals(conceptUri) {
    const sparqlQuery = DEL_CONCEPT_SPARQL.CHECK_PROCESS_INDIVIDUALS(conceptUri);

    // 1. Ищем индивиды ВНУТРИ схемы данного концепта (через hasTrig)
    let individuals = findProcessIndividualsManual(conceptUri);

    delIntermediateSparqlQueries.push({
        description: 'Проверка наличия индивидов В схеме концепта',
        query: sparqlQuery,
        result: individuals.length > 0
            ? `Найдено ${individuals.length} индивидов: ${individuals.map(i => i.label || i.uri).join(', ')}`
            : 'Индивиды в схеме не найдены'
    });

    // 2. Issue #217: Проверяем, используется ли сам концепт как индивид в ДРУГИХ TriG
    const conceptAsIndividual = findConceptAsIndividualInTrigs(conceptUri);

    const checkConceptAsIndividSparql = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX vad: <http://example.org/vad#>

# Проверка: используется ли концепт как индивид (подпроцесс) в каких-либо TriG
SELECT ?trig WHERE {
    GRAPH ?trig {
        <${conceptUri}> vad:isSubprocessTrig ?trig .
    }
}`;

    delIntermediateSparqlQueries.push({
        description: 'Проверка использования концепта как индивида в TriG',
        query: checkConceptAsIndividSparql,
        result: conceptAsIndividual.length > 0
            ? `Концепт используется как индивид в ${conceptAsIndividual.length} TriG: ${conceptAsIndividual.map(i => typeof getPrefixedName === 'function' ? getPrefixedName(i.trig, currentPrefixes) : i.trig).join(', ')}`
            : 'Концепт не используется как индивид'
    });

    // Объединяем результаты: возвращаем индивиды из схемы + использования концепта как индивида
    return [...individuals, ...conceptAsIndividual];
}

/**
 * Issue #221 Fix #2: Ручной поиск индивидов процесса для операции "Удалить индивид процесса"
 * issue #443: Добавлен поиск rdfs:label из ptree для отображения "id (label)"
 *
 * Индивид процесса - это использование концепта процесса (из ptree) в схеме процесса (TriG типа VADProcessDia).
 * Индивид идентифицируется по предикату vad:isSubprocessTrig в TriG типа VADProcessDia.
 *
 * При выборе концепта процесса (например vad:p2.2) эта функция ищет ВСЕ использования
 * данного концепта как индивида (подпроцесса) во всех TriG типа VADProcessDia.
 *
 * @param {string} conceptUri - URI концепта процесса
 * @returns {Array} Найденные индивиды (использования концепта в схемах)
 */
function findProcessIndividualsManual(conceptUri) {
    const individuals = [];
    const isSubprocessTrigUri = 'http://example.org/vad#isSubprocessTrig';
    const rdfTypeUri = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
    const vadProcessDiaUri = 'http://example.org/vad#VADProcessDia';
    const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';
    const ptreeUri = 'http://example.org/vad#ptree';

    // Issue #221 Fix #2: Отладочная информация (отключена по умолчанию)
    const DEBUG_INDIVID_SEARCH = false;

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        if (DEBUG_INDIVID_SEARCH) {
            console.log(`[findProcessIndividualsManual] Поиск индивидов для концепта: ${conceptUri}`);
            console.log(`[findProcessIndividualsManual] Всего квадов: ${quads.length}`);
        }

        // Issue #221 Fix #2: Находим все TriG типа VADProcessDia
        const vadProcessDiaTrigs = new Set();
        quads.forEach(quad => {
            if (quad.predicate.value === rdfTypeUri &&
                quad.object.value === vadProcessDiaUri) {
                vadProcessDiaTrigs.add(quad.subject.value);
                if (DEBUG_INDIVID_SEARCH) {
                    console.log(`[findProcessIndividualsManual] Найден TriG типа VADProcessDia: ${quad.subject.value}`);
                }
            }
        });

        if (DEBUG_INDIVID_SEARCH) {
            console.log(`[findProcessIndividualsManual] Всего TriG типа VADProcessDia: ${vadProcessDiaTrigs.size}`);
        }

        // Issue #221 Fix #2: Ищем использования данного концепта как индивида (vad:isSubprocessTrig)
        // во ВСЕХ TriG типа VADProcessDia
        quads.forEach(quad => {
            // Проверяем предикат vad:isSubprocessTrig
            const predicateMatches = quad.predicate.value === isSubprocessTrigUri ||
                quad.predicate.value.endsWith('#isSubprocessTrig');

            if (!predicateMatches) return;

            // Проверяем, что subject совпадает с искомым концептом
            const subjectMatches = quad.subject.value === conceptUri ||
                (typeof getPrefixedName === 'function' &&
                 getPrefixedName(quad.subject.value, currentPrefixes) === getPrefixedName(conceptUri, currentPrefixes));

            if (!subjectMatches) return;

            // Проверяем, что граф является TriG типа VADProcessDia
            if (quad.graph && vadProcessDiaTrigs.has(quad.graph.value)) {
                // issue #443: Используем prefixed ID как базовый label, затем ищем rdfs:label из ptree
                let label = typeof getPrefixedName === 'function'
                    ? getPrefixedName(quad.subject.value, currentPrefixes)
                    : quad.subject.value;

                // Ищем rdfs:label из ptree для отображения "id (label)" как в других справочниках
                quads.forEach(q2 => {
                    if (q2.subject.value === quad.subject.value &&
                        q2.predicate.value === rdfsLabelUri &&
                        q2.graph && q2.graph.value === ptreeUri) {
                        label = q2.object.value;
                    }
                });

                individuals.push({
                    uri: quad.subject.value,
                    trig: quad.graph.value,
                    label: label
                });

                if (DEBUG_INDIVID_SEARCH) {
                    console.log(`[findProcessIndividualsManual] Найден индивид: ${quad.subject.value} в TriG: ${quad.graph.value}`);
                }
            }
        });

        if (DEBUG_INDIVID_SEARCH) {
            console.log(`[findProcessIndividualsManual] Итого найдено индивидов: ${individuals.length}`);
        }
    }

    return individuals;
}

/**
 * Issue #217: Проверяет, используется ли концепт процесса как индивид (подпроцесс)
 * в каких-либо TriG схемах (vad:isSubprocessTrig).
 * Это проверка для операции "Удаление концепта" - нельзя удалить концепт,
 * если он используется как индивид в схемах процессов.
 * issue #443: Добавлен поиск rdfs:label из ptree для отображения "id (label)"
 * @param {string} conceptUri - URI концепта процесса
 * @returns {Array} Найденные использования концепта как индивида
 */
function findConceptAsIndividualInTrigs(conceptUri) {
    const usages = [];
    const isSubprocessTrigUri = 'http://example.org/vad#isSubprocessTrig';
    const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';
    const ptreeUri = 'http://example.org/vad#ptree';

    // Issue #219 Fix #1: Отладочная информация (отключена по умолчанию)
    const DEBUG_INDIVID_DETECTION = false;

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        if (DEBUG_INDIVID_DETECTION) {
            console.log(`[findConceptAsIndividualInTrigs] Поиск для концепта: ${conceptUri}`);
            console.log(`[findConceptAsIndividualInTrigs] Всего квадов: ${quads.length}`);
        }

        // issue #443: Ищем rdfs:label концепта из ptree один раз перед перебором квадов
        let conceptLabel = typeof getPrefixedName === 'function'
            ? getPrefixedName(conceptUri, currentPrefixes)
            : conceptUri;
        quads.forEach(q2 => {
            if (q2.subject.value === conceptUri &&
                q2.predicate.value === rdfsLabelUri &&
                q2.graph && q2.graph.value === ptreeUri) {
                conceptLabel = q2.object.value;
            }
        });

        // Ищем все случаи, где данный концепт используется как индивид (subject с isSubprocessTrig)
        quads.forEach(quad => {
            // Issue #219 Fix #1: Расширенная проверка - также поддерживаем сокращенные URI
            const subjectMatches = quad.subject.value === conceptUri ||
                (typeof getPrefixedName === 'function' &&
                 getPrefixedName(quad.subject.value, currentPrefixes) === getPrefixedName(conceptUri, currentPrefixes));

            const predicateMatches = quad.predicate.value === isSubprocessTrigUri ||
                quad.predicate.value.endsWith('#isSubprocessTrig');

            if (DEBUG_INDIVID_DETECTION && predicateMatches) {
                console.log(`[findConceptAsIndividualInTrigs] Найден isSubprocessTrig: subject=${quad.subject.value}, graph=${quad.graph ? quad.graph.value : 'undefined'}`);
            }

            if (subjectMatches && predicateMatches && quad.graph) {
                usages.push({
                    uri: conceptUri,
                    trig: quad.graph.value,
                    label: conceptLabel
                });

                if (DEBUG_INDIVID_DETECTION) {
                    console.log(`[findConceptAsIndividualInTrigs] Добавлено использование в TriG: ${quad.graph.value}`);
                }
            }
        });

        if (DEBUG_INDIVID_DETECTION) {
            console.log(`[findConceptAsIndividualInTrigs] Найдено использований: ${usages.length}`);
        }
    } else {
        if (DEBUG_INDIVID_DETECTION) {
            console.log(`[findConceptAsIndividualInTrigs] currentStore не определён`);
        }
    }

    return usages;
}

/**
 * Проверяет наличие схемы (hasTrig) для концепта
 * Issue #252: Обновлён — сначала пробует funSPARQLvalues, затем manual fallback
 * issue #437: Заменяем funSPARQLvalues на funSPARQLvaluesComunica
 * @param {string} conceptUri - URI концепта
 * @returns {Promise<Array<string>>} URI найденных TriG
 */
async function checkProcessSchema(conceptUri) {
    const sparqlQuery = DEL_CONCEPT_SPARQL.CHECK_PROCESS_SCHEMA(conceptUri);

    let trigs = [];

    // issue #437: Заменяем funSPARQLvalues на funSPARQLvaluesComunica
    if (typeof funSPARQLvaluesComunica === 'function') {
        const results = await funSPARQLvaluesComunica(sparqlQuery, 'trig');
        trigs = results.map(r => r.uri || r.trig);
    } else {
        console.error('checkProcessSchema: funSPARQLvaluesComunica not available');
    }

    delIntermediateSparqlQueries.push({
        description: 'Проверка наличия схемы процесса (hasTrig)',
        query: sparqlQuery,
        result: trigs.length > 0
            ? `Найдено ${trigs.length} схем: ${trigs.map(t => typeof getPrefixedName === 'function' ? getPrefixedName(t, currentPrefixes) : t).join(', ')}`
            : 'Схемы не найдены'
    });

    return trigs;
}

/**
 * Проверяет наличие дочерних элементов
 * issue #372: SPARQL-Driven подход — без JavaScript fallback
 * issue #437: Заменяем funSPARQLvalues на funSPARQLvaluesComunica
 * @param {string} conceptUri - URI родительского концепта
 * @param {string} graphUri - URI графа (ptree или rtree)
 * @returns {Promise<Array<{uri: string, label: string}>>} Найденные дочерние элементы
 */
async function checkChildrenElements(conceptUri, graphUri) {
    const isProcess = graphUri.includes('ptree');
    const sparqlQuery = isProcess
        ? DEL_CONCEPT_SPARQL.CHECK_CHILDREN_PROCESSES(conceptUri)
        : DEL_CONCEPT_SPARQL.CHECK_CHILDREN_EXECUTORS(conceptUri);

    let children = [];

    // issue #437: Заменяем funSPARQLvalues на funSPARQLvaluesComunica
    if (typeof funSPARQLvaluesComunica === 'function') {
        const results = await funSPARQLvaluesComunica(sparqlQuery, 'child');
        children = results.map(r => ({
            uri: r.uri || r.child,
            label: r.label || (typeof getPrefixedName === 'function'
                ? getPrefixedName(r.uri || r.child, currentPrefixes)
                : (r.uri || r.child))
        }));
    } else {
        console.error('checkChildrenElements: funSPARQLvaluesComunica not available');
    }

    delIntermediateSparqlQueries.push({
        description: `Проверка наличия дочерних ${isProcess ? 'процессов' : 'исполнителей'}`,
        query: sparqlQuery,
        result: children.length > 0
            ? `Найдено ${children.length} дочерних элементов: ${children.map(c => c.label).join(', ')}`
            : 'Дочерние элементы не найдены'
    });

    return children;
}

/**
 * Проверяет использование исполнителя в TriG
 * issue #372: SPARQL-Driven подход — без JavaScript fallback
 * issue #437: Заменяем funSPARQLvalues на funSPARQLvaluesComunica
 * @param {string} executorUri - URI исполнителя
 * @returns {Promise<Array<{trig: string, processIndivid: string}>>} Найденные использования
 */
async function checkExecutorUsage(executorUri) {
    const sparqlQuery = DEL_CONCEPT_SPARQL.CHECK_EXECUTOR_USAGE(executorUri);

    let usages = [];

    // issue #437: Заменяем funSPARQLvalues на funSPARQLvaluesComunica
    if (typeof funSPARQLvaluesComunica === 'function') {
        const results = await funSPARQLvaluesComunica(sparqlQuery, 'trig');
        usages = results.map(r => ({
            trig: r.uri || r.trig,
            processIndivid: r.processIndivid || r.label || r.uri || r.trig
        }));
    } else {
        console.error('checkExecutorUsage: funSPARQLvaluesComunica not available');
    }

    delIntermediateSparqlQueries.push({
        description: 'Проверка использования исполнителя в TriG (наличие индивидов исполнителя)',
        query: sparqlQuery,
        result: usages.length > 0
            ? `Найдено ${usages.length} использований в TriG: ${usages.map(u => typeof getPrefixedName === 'function' ? getPrefixedName(u.trig, currentPrefixes) : u.trig).join(', ')}`
            : 'Исполнитель не используется в схемах'
    });

    return usages;
}

/**
 * Получает все TriG типа VADProcessDia
 * issue #372: SPARQL-Driven подход
 * issue #431: Добавлен manual fallback через currentStore.getQuads()
 * issue #433: Заменяем fallback на funTrigNameList_v2 из vadlib_sparql_v2.js
 * @returns {Promise<Array<{uri: string, label: string}>>} Массив TriG
 */
async function getAllTrigs() {
    const sparqlQuery = DEL_CONCEPT_SPARQL.GET_ALL_TRIGS;

    let trigs = [];

    // issue #433: Используем funTrigNameList_v2 с полными URI вместо funSPARQLvalues и fallback
    if (typeof funTrigNameList_v2 === 'function') {
        const raw = await funTrigNameList_v2(currentStore, 'http://example.org/vad#VADProcessDia');
        // funTrigNameList_v2 возвращает [{id, label}], приводим к [{uri, label}]
        trigs = raw.map(function(item) {
            return {
                uri: item.id,
                label: item.label || (typeof getPrefixedName === 'function'
                    ? getPrefixedName(item.id, currentPrefixes)
                    : item.id)
            };
        });
    } else {
        console.error('getAllTrigs: funTrigNameList_v2 not available');
    }

    delIntermediateSparqlQueries.push({
        description: 'Получение всех TriG типа VADProcessDia (funTrigNameList_v2)',
        query: 'funTrigNameList_v2(currentStore, "http://example.org/vad#VADProcessDia")',
        result: trigs.length > 0
            ? `Найдено ${trigs.length} TriG: ${trigs.map(t => t.label).join(', ')}`
            : 'TriG не найдены'
    });

    return trigs;
}

/**
 * Находит концепт процесса для указанного TriG
 * @param {string} trigUri - URI TriG
 * @returns {string|null} URI концепта или null
 */
function findConceptForTrig(trigUri) {
    const hasTrigUri = 'http://example.org/vad#hasTrig';
    const ptreeUri = 'http://example.org/vad#ptree';

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        for (const quad of quads) {
            if (quad.predicate.value === hasTrigUri &&
                quad.object.value === trigUri &&
                quad.graph && quad.graph.value === ptreeUri) {
                return quad.subject.value;
            }
        }
    }

    return null;
}

/**
 * issue #311 п.3: Находит индивидов процесса в конкретном TriG
 * issue #441: Добавлен поиск rdfs:label из ptree для отображения "id (label)"
 * @param {string} trigUri - URI TriG
 * @returns {Array<{uri: string, label: string}>} Массив индивидов
 */
function findProcessIndividualsInTrig(trigUri) {
    const individuals = [];
    const isSubprocessTrigUri = 'http://example.org/vad#isSubprocessTrig';
    const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';
    const ptreeUri = 'http://example.org/vad#ptree';
    const seen = new Set();

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        quads.forEach(quad => {
            const predicateMatches = quad.predicate.value === isSubprocessTrigUri ||
                quad.predicate.value.endsWith('#isSubprocessTrig');

            if (predicateMatches && quad.graph && quad.graph.value === trigUri && !seen.has(quad.subject.value)) {
                seen.add(quad.subject.value);

                // issue #441: Используем prefixed ID как базовый label, затем ищем rdfs:label из ptree
                let label = typeof getPrefixedName === 'function'
                    ? getPrefixedName(quad.subject.value, currentPrefixes)
                    : quad.subject.value;

                // Ищем rdfs:label из ptree для отображения "id (label)" как в других справочниках
                quads.forEach(q2 => {
                    if (q2.subject.value === quad.subject.value &&
                        q2.predicate.value === rdfsLabelUri &&
                        q2.graph && q2.graph.value === ptreeUri) {
                        label = q2.object.value;
                    }
                });

                individuals.push({
                    uri: quad.subject.value,
                    label: label
                });
            }
        });
    }

    return individuals;
}

/**
 * issue #311 п.4: Находит индивидов исполнителей (концепты из rtree, которые используются через vad:includes) в конкретном TriG
 * issue #443: Добавлен поиск rdfs:label из rtree для отображения "id (label)"
 * @param {string} trigUri - URI TriG
 * @returns {Array<{uri: string, label: string}>} Массив исполнителей
 */
function findExecutorIndividualsInTrig(trigUri) {
    const executors = [];
    const includesUri = 'http://example.org/vad#includes';
    const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';
    const rtreeUri = 'http://example.org/vad#rtree';
    const seen = new Set();

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        quads.forEach(quad => {
            const predicateMatches = quad.predicate.value === includesUri ||
                quad.predicate.value.endsWith('#includes');

            if (predicateMatches && quad.graph && quad.graph.value === trigUri && !seen.has(quad.object.value)) {
                seen.add(quad.object.value);

                // issue #443: Используем prefixed ID как базовый label, затем ищем rdfs:label из rtree
                let label = typeof getPrefixedName === 'function'
                    ? getPrefixedName(quad.object.value, currentPrefixes)
                    : quad.object.value;

                // Ищем rdfs:label из rtree для отображения "id (label)" как в других справочниках
                quads.forEach(q2 => {
                    if (q2.subject.value === quad.object.value &&
                        q2.predicate.value === rdfsLabelUri &&
                        q2.graph && q2.graph.value === rtreeUri) {
                        label = q2.object.value;
                    }
                });

                executors.push({
                    uri: quad.object.value,
                    label: label
                });
            }
        });
    }

    return executors;
}

/**
 * issue #311 п.4: Находит использования исполнителя в конкретном TriG
 * @param {string} executorUri - URI исполнителя
 * @param {string} trigUri - URI TriG
 * @returns {Array<{executorGroupUri: string}>} Массив ExecutorGroup
 */
function findExecutorUsageInTrig(executorUri, trigUri) {
    const usages = [];
    const includesUri = 'http://example.org/vad#includes';

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        quads.forEach(quad => {
            const predicateMatches = quad.predicate.value === includesUri ||
                quad.predicate.value.endsWith('#includes');

            if (predicateMatches && quad.object.value === executorUri && quad.graph && quad.graph.value === trigUri) {
                usages.push({
                    executorGroupUri: quad.subject.value
                });
            }
        });
    }

    return usages;
}

/**
 * issue #372: Раскрывает prefixed URI в полный URI
 * @param {string} prefixedUri - Prefixed URI, например 'vad:t_p1'
 * @param {Object} prefixes - Словарь префиксов
 * @returns {string} Полный URI
 */
function expandPrefixedName(prefixedUri, prefixes) {
    if (!prefixedUri) return prefixedUri;

    // Если уже полный URI
    if (prefixedUri.startsWith('http://') || prefixedUri.startsWith('https://')) {
        return prefixedUri;
    }

    // Разбираем prefix:localName
    const colonIndex = prefixedUri.indexOf(':');
    if (colonIndex === -1) return prefixedUri;

    const prefix = prefixedUri.substring(0, colonIndex);
    const localName = prefixedUri.substring(colonIndex + 1);

    // Ищем namespace для prefix
    if (prefixes && prefixes[prefix]) {
        return prefixes[prefix] + localName;
    }

    // Стандартные префиксы
    const standardPrefixes = {
        'vad': 'http://example.org/vad#',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'owl': 'http://www.w3.org/2002/07/owl#',
        'xsd': 'http://www.w3.org/2001/XMLSchema#'
    };

    if (standardPrefixes[prefix]) {
        return standardPrefixes[prefix] + localName;
    }

    return prefixedUri;
}

/**
 * issue #309: Ручной поиск ExecutorGroup для индивида в TriG
 * @param {string} individUri - URI индивида процесса
 * @param {string} trigUri - URI TriG
 * @returns {string|null} URI ExecutorGroup или null
 */
function findExecutorGroupForIndivid(individUri, trigUri) {
    const hasExecutorUri = 'http://example.org/vad#hasExecutor';

    // issue #309: Отладочная информация (отключена по умолчанию)
    const DEBUG_EG_SEARCH = false;

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        for (const quad of quads) {
            if (quad.subject.value === individUri &&
                quad.predicate.value === hasExecutorUri &&
                quad.graph && quad.graph.value === trigUri) {
                if (DEBUG_EG_SEARCH) {
                    console.log(`[findExecutorGroupForIndivid] Найдена ExecutorGroup: ${quad.object.value} для ${individUri} в ${trigUri}`);
                }
                return quad.object.value;
            }
        }
    }

    if (DEBUG_EG_SEARCH) {
        console.log(`[findExecutorGroupForIndivid] ExecutorGroup не найдена для ${individUri} в ${trigUri}`);
    }
    return null;
}

/**
 * issue #309: Ручной поиск входящих vad:hasNext на индивид в TriG
 * @param {string} individUri - URI индивида процесса
 * @param {string} trigUri - URI TriG
 * @returns {Array<string>} Массив URI индивидов с входящими vad:hasNext
 */
function findIncomingHasNext(individUri, trigUri) {
    const hasNextUri = 'http://example.org/vad#hasNext';
    const sources = [];

    // issue #309: Отладочная информация (отключена по умолчанию)
    const DEBUG_HN_SEARCH = false;

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        quads.forEach(quad => {
            if (quad.predicate.value === hasNextUri &&
                quad.object.value === individUri &&
                quad.graph && quad.graph.value === trigUri) {
                sources.push(quad.subject.value);
                if (DEBUG_HN_SEARCH) {
                    console.log(`[findIncomingHasNext] Найдена входящая hasNext от ${quad.subject.value} для ${individUri} в ${trigUri}`);
                }
            }
        });
    }

    if (DEBUG_HN_SEARCH) {
        console.log(`[findIncomingHasNext] Найдено ${sources.length} входящих hasNext для ${individUri} в ${trigUri}`);
    }
    return sources;
}

// ==============================================================================
// ФУНКЦИИ ГЕНЕРАЦИИ SPARQL DELETE ЗАПРОСОВ
// ==============================================================================

/**
 * Обработчик кнопки "Удалить индивиды"
 * issue #309: Формирует полный SPARQL DELETE запрос для всех найденных индивидов,
 * включая удаление ExecutorGroup и входящих vad:hasNext
 */
function deleteIndividuals() {
    const operationType = delConceptState.selectedOperation;
    const conceptUri = delConceptState.selectedConcept;

    if (!conceptUri || delConceptState.foundIndividuals.length === 0) {
        showDelConceptMessage('Нет индивидов для удаления', 'error');
        return;
    }

    const prefixes = {
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'vad': 'http://example.org/vad#'
    };

    let sparqlQuery = '';

    if (operationType === DEL_OPERATION_TYPES.INDIVID_PROCESS ||
        operationType === DEL_OPERATION_TYPES.INDIVID_PROCESS_IN_SCHEMA) {
        // issue #309, #311: Для каждого индивида находим ExecutorGroup и входящие hasNext,
        // затем формируем полный DELETE запрос.
        // Для INDIVID_PROCESS — удаляем из всех схем, для INDIVID_PROCESS_IN_SCHEMA — только из выбранной.
        const queries = delConceptState.foundIndividuals.map(individ => {
            // Ищем ExecutorGroup для данного индивида
            const executorGroupUri = findExecutorGroupForIndivid(individ.uri, individ.trig);

            // Ищем входящие vad:hasNext от других индивидов
            const incomingHasNextUris = findIncomingHasNext(individ.uri, individ.trig);

            // issue #309: Добавляем промежуточную информацию
            const trigLabel = typeof getPrefixedName === 'function'
                ? getPrefixedName(individ.trig, currentPrefixes)
                : individ.trig;
            const individLabel = individ.label || individ.uri;

            if (executorGroupUri) {
                const egLabel = typeof getPrefixedName === 'function'
                    ? getPrefixedName(executorGroupUri, currentPrefixes)
                    : executorGroupUri;
                delIntermediateSparqlQueries.push({
                    description: `ExecutorGroup для ${individLabel} в ${trigLabel}`,
                    query: DEL_CONCEPT_SPARQL.FIND_EXECUTOR_GROUP_FOR_INDIVID(individ.uri, individ.trig),
                    result: `Найдена: ${egLabel}`
                });
            }

            if (incomingHasNextUris.length > 0) {
                const sourceLabels = incomingHasNextUris.map(u =>
                    typeof getPrefixedName === 'function'
                        ? getPrefixedName(u, currentPrefixes)
                        : u
                );
                delIntermediateSparqlQueries.push({
                    description: `Входящие hasNext для ${individLabel} в ${trigLabel}`,
                    query: DEL_CONCEPT_SPARQL.FIND_INCOMING_HAS_NEXT(individ.uri, individ.trig),
                    result: `Найдено ${incomingHasNextUris.length}: ${sourceLabels.join(', ')}`
                });
            }

            return DEL_CONCEPT_SPARQL.GENERATE_DELETE_PROCESS_INDIVID_QUERY(
                individ.trig,
                individ.uri,
                prefixes,
                executorGroupUri,
                incomingHasNextUris
            );
        });
        sparqlQuery = queries.join('\n;\n\n');
    } else if (operationType === DEL_OPERATION_TYPES.INDIVID_EXECUTOR ||
               operationType === DEL_OPERATION_TYPES.INDIVID_EXECUTOR_IN_SCHEMA) {
        // issue #311: Формируем запросы на удаление vad:includes
        // Для INDIVID_EXECUTOR — из всех схем, для INDIVID_EXECUTOR_IN_SCHEMA — только из выбранной.
        const queries = delConceptState.foundIndividuals.map(individ => {
            const executorUri = individ.executorUri || conceptUri;
            return DEL_CONCEPT_SPARQL.GENERATE_DELETE_EXECUTOR_INDIVID_QUERY(
                individ.trig,
                individ.uri,
                executorUri,
                prefixes
            );
        });
        sparqlQuery = queries.join('\n;\n\n');
    }

    displayDelIntermediateSparql();
    outputDeleteSparql(sparqlQuery, `индивидов (${delConceptState.foundIndividuals.length})`);
}

/**
 * Создаёт итоговый SPARQL DELETE запрос
 */
function createDeleteSparql() {
    hideDelConceptMessage();

    const operationType = delConceptState.selectedOperation;
    const selectedUri = delConceptState.selectedConcept;

    if (!operationType || !selectedUri) {
        showDelConceptMessage('Выберите тип операции и элемент для удаления', 'error');
        return;
    }

    // Проверяем ошибки валидации для концептов
    if ((operationType === DEL_OPERATION_TYPES.CONCEPT_PROCESS ||
         operationType === DEL_OPERATION_TYPES.CONCEPT_EXECUTOR) &&
        delConceptState.validationErrors.length > 0) {
        showDelConceptMessage('Невозможно удалить концепт. Сначала устраните найденные проблемы.', 'error');
        return;
    }

    const config = DEL_CONCEPT_CONFIG[operationType];
    const prefixes = {
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'vad': 'http://example.org/vad#'
    };

    let sparqlQuery = '';
    let elementDescription = '';

    switch (operationType) {
        case DEL_OPERATION_TYPES.CONCEPT_PROCESS:
        case DEL_OPERATION_TYPES.CONCEPT_EXECUTOR:
            sparqlQuery = DEL_CONCEPT_SPARQL.GENERATE_DELETE_CONCEPT_QUERY(
                config.targetGraph,
                selectedUri,
                prefixes
            );
            elementDescription = `концепта ${operationType === DEL_OPERATION_TYPES.CONCEPT_PROCESS ? 'процесса' : 'исполнителя'}`;
            break;

        case DEL_OPERATION_TYPES.INDIVID_PROCESS:
            if (delConceptState.foundIndividuals.length === 0) {
                showDelConceptMessage('Сначала нажмите "Показать индивиды"', 'error');
                return;
            }
            // Используем deleteIndividuals для генерации
            deleteIndividuals();
            return;

        case DEL_OPERATION_TYPES.INDIVID_EXECUTOR:
            if (delConceptState.foundIndividuals.length === 0) {
                showDelConceptMessage('Сначала нажмите "Показать индивиды"', 'error');
                return;
            }
            // Используем deleteIndividuals для генерации
            deleteIndividuals();
            return;

        case DEL_OPERATION_TYPES.TRIG_SCHEMA:
            const conceptForTrig = findConceptForTrig(selectedUri);
            if (!conceptForTrig) {
                showDelConceptMessage('Не найден концепт процесса для данного TriG', 'warning');
            }
            sparqlQuery = DEL_CONCEPT_SPARQL.GENERATE_DELETE_TRIG_QUERY(
                selectedUri,
                conceptForTrig || 'UNKNOWN_CONCEPT',
                prefixes
            );
            elementDescription = 'схемы процесса (TriG)';
            break;

        // issue #311 п.3: Удаление индивида процесса в конкретной схеме
        case DEL_OPERATION_TYPES.INDIVID_PROCESS_IN_SCHEMA:
            if (delConceptState.foundIndividuals.length === 0) {
                showDelConceptMessage('Сначала выберите индивид процесса для удаления', 'error');
                return;
            }
            // Используем deleteIndividuals для генерации (он обрабатывает foundIndividuals)
            deleteIndividuals();
            return;

        // issue #311 п.4: Удаление индивида исполнителя в конкретной схеме
        case DEL_OPERATION_TYPES.INDIVID_EXECUTOR_IN_SCHEMA:
            if (delConceptState.foundIndividuals.length === 0) {
                showDelConceptMessage('Сначала выберите индивид исполнителя для удаления', 'error');
                return;
            }
            deleteIndividuals();
            return;
    }

    outputDeleteSparql(sparqlQuery, elementDescription);
}

/**
 * Выводит SPARQL DELETE запрос в "Result in SPARQL"
 * @param {string} sparqlQuery - SPARQL запрос
 * @param {string} elementDescription - Описание удаляемого элемента
 */
function outputDeleteSparql(sparqlQuery, elementDescription) {
    const resultTextarea = document.getElementById('result-sparql-query');
    if (resultTextarea) {
        resultTextarea.value = sparqlQuery;
    }

    // Отмечаем что это запрос удаления
    window.isDeleteQuery = true;

    showDelConceptMessage(
        `SPARQL DELETE запрос для ${elementDescription} успешно сгенерирован. ` +
        `Запрос выведен в "Result in SPARQL".`,
        'success'
    );

    closeDelConceptModal();
}

