// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/309
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/384
// PR #310
// 3_sd_create_new_individ_logic.js - Модуль создания новых индивидов (бизнес-логика)

/**
 * ==============================================================================
 * CREATE NEW INDIVID MODULE - BUSINESS LOGIC
 * ==============================================================================
 *
 * Модуль бизнес-логики для создания новых Индивидов в системе RDF Grapher.
 * Содержит:
 * - Константы и конфигурацию типов индивидов
 * - Функции работы с данными и SPARQL
 * - Алгоритмы поиска и проверки
 *
 * Позволяет создавать:
 * - Индивид процесса (с автоматическим назначением ExecutorGroup)
 * - Индивид исполнителя (добавление vad:includes в ExecutorGroup)
 *
 * UI функции (рендеринг, обработка событий DOM) находятся в 3_sd_create_new_individ_ui.js
 * SPARQL запросы находятся в 3_sd_create_new_individ_sparql.js
 *
 * Алгоритм создания индивида:
 * 1. Пользователь выбирает тип: процесс или исполнитель
 * 2. Для процесса:
 *    - Выбирает TriG (схему процесса)
 *    - Выбирает концепт процесса
 *    - Проверяется наличие одноимённого индивида в TriG
 *    - Выбирает vad:hasNext (множественный выбор из справочника концептов)
 *    - Автоматически создаётся ExecutorGroup
 *    - Генерируется INSERT SPARQL
 * 3. Для исполнителя (issue #309: связанные справочники):
 *    - Выбирает TriG (схему процесса)
 *    - Выбирает индивид процесса из выбранного TriG (связанный справочник)
 *    - ExecutorGroup определяется автоматически из выбранного индивида
 *    - Выбирает концепт исполнителя из rtree
 *    - Генерируется INSERT SPARQL для vad:includes в ExecutorGroup
 *
 * @file 3_sd_create_new_individ_logic.js
 * @version 2.0
 * @date 2026-02-12
 * @see 3_sd_create_new_individ_ui.js - UI функции модуля
 * @see 3_sd_create_new_individ_sparql.js - SPARQL запросы
 * @see file_naming.md - Соглашение по именованию файлов
 * @see new_individ_process.md - Анализ именования индивидов
 */

// ==============================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// ==============================================================================

/**
 * Типы операций создания индивида
 */
const NEW_INDIVID_TYPES = {
    PROCESS: 'individ-process',
    EXECUTOR: 'individ-executor'
};

/**
 * Конфигурация типов индивидов
 */
const NEW_INDIVID_CONFIG = {
    [NEW_INDIVID_TYPES.PROCESS]: {
        displayName: 'Индивид процесса',
        description: 'Создание индивида процесса с автоматическим ExecutorGroup'
    },
    [NEW_INDIVID_TYPES.EXECUTOR]: {
        displayName: 'Индивид исполнителя',
        description: 'Добавление исполнителя (vad:includes) в ExecutorGroup'
    }
};

// ==============================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ МОДУЛЯ
// ==============================================================================

/**
 * Текущее состояние модуля создания индивида
 */
let newIndividState = {
    isOpen: false,
    selectedType: null,
    selectedTrig: null,
    selectedConcept: null,
    selectedHasNext: [],
    hasNextMode: 'existing',         // issue #313: 'existing' (индивиды в TriG) или 'any' (все концепты из ptree)
    selectedProcessIndivid: null,    // issue #309: выбранный индивид процесса (для исполнителя)
    selectedExecutorGroup: null,     // issue #309: авто-разрешённая ExecutorGroup
    selectedExecutor: null,
    intermediateSparql: ''
};

/**
 * Хранилище промежуточных SPARQL запросов для отображения
 */
let newIndividIntermediateSparqlQueries = [];

// ==============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==============================================================================

/**
 * Получает концепты из quadstore (manual fallback)
 * @param {string} typeUri - URI типа
 * @param {string} graphUri - URI графа
 * @returns {Array<{uri: string, label: string}>}
 */
function getConceptsForIndividManual(typeUri, graphUri) {
    const concepts = [];
    const rdfTypeUri = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
    const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        const conceptUris = new Set();
        quads.forEach(quad => {
            if (quad.predicate.value === rdfTypeUri &&
                quad.object.value === typeUri &&
                quad.graph && quad.graph.value === graphUri) {
                conceptUris.add(quad.subject.value);
            }
        });

        conceptUris.forEach(uri => {
            let label = typeof getPrefixedName === 'function'
                ? getPrefixedName(uri, currentPrefixes) : uri;

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
 * Получает все TriG типа VADProcessDia
 * @returns {Array<{uri: string, label: string}>}
 */
function getTrigsForIndivid() {
    const sparqlQuery = NEW_INDIVID_SPARQL.GET_ALL_TRIGS;
    let trigs = [];

    if (typeof funSPARQLvalues === 'function') {
        const results = funSPARQLvalues(sparqlQuery, 'trig');
        trigs = results.map(r => ({
            uri: r.uri,
            label: r.label || (typeof getPrefixedName === 'function'
                ? getPrefixedName(r.uri, currentPrefixes) : r.uri)
        }));
    }

    if (trigs.length === 0) {
        const rdfTypeUri = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        const vadProcessDiaUri = 'http://example.org/vad#VADProcessDia';
        const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';

        // issue #326: Используем currentStore.getQuads() вместо currentQuads
        if (currentStore) {
            const quads = currentStore.getQuads(null, null, null, null);
            quads.forEach(quad => {
                if (quad.predicate.value === rdfTypeUri &&
                    quad.object.value === vadProcessDiaUri) {
                    let label = typeof getPrefixedName === 'function'
                        ? getPrefixedName(quad.subject.value, currentPrefixes)
                        : quad.subject.value;
                    // Find label
                    quads.forEach(q2 => {
                        if (q2.subject.value === quad.subject.value &&
                            q2.predicate.value === rdfsLabelUri) {
                            label = q2.object.value;
                        }
                    });
                    trigs.push({ uri: quad.subject.value, label });
                }
            });
        }
    }

    newIndividIntermediateSparqlQueries.push({
        description: 'Получение всех TriG типа VADProcessDia',
        query: sparqlQuery,
        result: trigs.length > 0
            ? `Найдено ${trigs.length} TriG: ${trigs.map(t => t.label).join(', ')}`
            : 'TriG не найдены'
    });

    return trigs;
}

/**
 * Проверяет, существует ли индивид данного концепта в TriG
 * @param {string} conceptUri - URI концепта
 * @param {string} trigUri - URI TriG
 * @returns {boolean}
 */
function checkIndividExistsInTrig(conceptUri, trigUri) {
    const isSubprocessTrigUri = 'http://example.org/vad#isSubprocessTrig';

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        return quads.some(quad =>
            quad.subject.value === conceptUri &&
            quad.predicate.value === isSubprocessTrigUri &&
            quad.object.value === trigUri &&
            quad.graph && quad.graph.value === trigUri
        );
    }
    return false;
}

/**
 * Получает все индивиды процесса в TriG (для справочника hasNext)
 * @param {string} trigUri - URI TriG
 * @returns {Array<{uri: string, label: string}>}
 */
function getIndividsInTrig(trigUri) {
    const isSubprocessTrigUri = 'http://example.org/vad#isSubprocessTrig';
    const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';
    const ptreeUri = 'http://example.org/vad#ptree';
    const individs = [];

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        quads.forEach(quad => {
            if (quad.predicate.value === isSubprocessTrigUri &&
                quad.object.value === trigUri &&
                quad.graph && quad.graph.value === trigUri) {
                let label = typeof getPrefixedName === 'function'
                    ? getPrefixedName(quad.subject.value, currentPrefixes)
                    : quad.subject.value;

                // Find label from ptree
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
 * Получает концепты процессов для справочника hasNext
 * Возвращает все концепты процессов из ptree
 * issue #427: Заменяем funSPARQLvalues на funConceptList_v2 с полными URI
 * @returns {Promise<Array<{uri: string, label: string}>>}
 */
async function getProcessConceptsForHasNext() {
    let concepts = [];

    // issue #427: Используем funConceptList_v2 с полными URI вместо funSPARQLvalues
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
        description: 'Получение концептов процессов для справочника hasNext (funConceptList_v2)',
        query: 'funConceptList_v2(currentStore, "http://example.org/vad#ptree", "http://example.org/vad#TypeProcess")',
        result: concepts.length > 0
            ? `Найдено ${concepts.length} концептов`
            : '(нет результатов)'
    });

    return concepts;
}

/**
 * issue #309: Находит ExecutorGroup для указанного индивида процесса в TriG
 * @param {string} processIndividUri - URI индивида процесса
 * @param {string} trigUri - URI TriG
 * @returns {string|null} URI ExecutorGroup или null
 */
function findExecutorGroupForProcessIndivid(processIndividUri, trigUri) {
    const hasExecutorUri = 'http://example.org/vad#hasExecutor';

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        for (const quad of quads) {
            if (quad.subject.value === processIndividUri &&
                quad.predicate.value === hasExecutorUri &&
                quad.graph && quad.graph.value === trigUri) {
                return quad.object.value;
            }
        }
    }
    return null;
}

// ==============================================================================
// ЭКСПОРТ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА
// ==============================================================================

if (typeof window !== 'undefined') {
    window.NEW_INDIVID_TYPES = NEW_INDIVID_TYPES;
    window.NEW_INDIVID_CONFIG = NEW_INDIVID_CONFIG;
    window.NEW_INDIVID_SPARQL = NEW_INDIVID_SPARQL;
}

