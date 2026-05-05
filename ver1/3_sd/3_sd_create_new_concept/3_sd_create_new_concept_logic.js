// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/252
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/384

/**
 * ==============================================================================
 * CREATE NEW CONCEPT MODULE - BUSINESS LOGIC
 * ==============================================================================
 *
 * Модуль бизнес-логики для создания новых Концептов (Concept) в системе RDF Grapher.
 * Содержит:
 * - Константы и конфигурацию типов концептов
 * - Функции работы с данными и SPARQL
 * - Алгоритмы проверки уникальности ID
 * - Генерацию ID
 *
 * Позволяет создавать:
 * - Концепт процесса (vad:TypeProcess) в vad:ptree
 * - Концепт исполнителя (vad:TypeExecutor) в vad:rtree
 *
 * UI функции (рендеринг, обработка событий DOM) находятся в 3_sd_create_new_concept_ui.js
 * SPARQL запросы находятся в 3_sd_create_new_concept_sparql.js
 *
 * Алгоритм работы:
 * 1. Пользователь нажимает кнопку "New Concept" в окне Smart Design
 * 2. Выбирает тип концепта из выпадающего списка
 * 3. На основе выбранного типа формируется промежуточный SPARQL запрос
 *    к vad:techtree для получения списка предикатов данного типа
 * 4. Отображается форма с полями для ввода значений предикатов
 * 5. Автоматически генерируемые предикаты отображаются, но заблокированы
 * 6. После заполнения формируется итоговый SPARQL INSERT запрос
 *
 * Используемые технологические объекты из vad:techtree:
 * - vad:ConceptProcessPredicate - для vad:TypeProcess
 * - vad:ConceptExecutorPredicate - для vad:TypeExecutor
 *
 * @file 3_sd_create_new_concept_logic.js
 * @version 2.0
 * @date 2026-02-12
 * @see 3_sd_create_new_concept_ui.js - UI функции модуля
 * @see 3_sd_create_new_concept_sparql.js - SPARQL запросы
 * @see file_naming.md - Соглашение по именованию файлов
 * @see vad-basic-ontology_tech_Appendix.ttl - Технологические объекты
 */

// ==============================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// ==============================================================================

/**
 * Конфигурация типов концептов и соответствующих технологических объектов
 *
 * Каждый тип концепта связан с:
 * - techObject: URI технологического объекта в vad:techtree
 * - targetGraph: граф назначения для INSERT запроса
 * - displayName: отображаемое имя для пользователя
 * - autoPredicates: предикаты, заполняемые автоматически
 * - virtualPredicates: виртуальные (вычисляемые) предикаты, не заполняемые
 * - parentSelector: тип объектов для выбора родителя
 */
const NEW_CONCEPT_CONFIG = {
    'vad:TypeProcess': {
        techObject: 'http://example.org/vad#ConceptProcessPredicate',
        techObjectPrefixed: 'vad:ConceptProcessPredicate',
        targetGraph: 'vad:ptree',
        targetGraphUri: 'http://example.org/vad#ptree',
        displayName: 'Концепт процесса (vad:TypeProcess)',
        typeValue: 'vad:TypeProcess',
        typeValueUri: 'http://example.org/vad#TypeProcess',
        // Автоматически устанавливаемые предикаты (отображаются, но заблокированы)
        autoPredicates: ['rdf:type'],
        // Виртуальные предикаты (не вводятся, вычисляются)
        virtualPredicates: [],
        // Предикаты, которые отображаются, но не вводятся
        readOnlyPredicates: ['vad:hasTrig'],
        // Тип объектов для выбора родителя
        parentSelectorType: 'vad:TypeProcess',
        parentSelectorGraph: 'vad:ptree',
        // Дополнительные корневые элементы для выбора родителя
        parentRootOptions: ['vad:ptree']
        // issue #260: Fallback предикаты удалены - используются только загруженные из techtree
    },
    'vad:TypeExecutor': {
        techObject: 'http://example.org/vad#ConceptExecutorPredicate',
        techObjectPrefixed: 'vad:ConceptExecutorPredicate',
        targetGraph: 'vad:rtree',
        targetGraphUri: 'http://example.org/vad#rtree',
        displayName: 'Концепт исполнителя (vad:TypeExecutor)',
        typeValue: 'vad:TypeExecutor',
        typeValueUri: 'http://example.org/vad#TypeExecutor',
        autoPredicates: ['rdf:type'],
        virtualPredicates: [],
        readOnlyPredicates: [],
        parentSelectorType: 'vad:TypeExecutor',
        parentSelectorGraph: 'vad:rtree',
        parentRootOptions: ['vad:rtree']
        // issue #260: Fallback предикаты удалены - используются только загруженные из techtree
    }
};

// SPARQL запросы вынесены в 3_sd_create_new_concept_sparql.js
// в соответствии с концепцией SPARQL-driven Programming (issue #252)

// ==============================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ МОДУЛЯ
// ==============================================================================

/**
 * Текущее состояние модуля создания концепта
 */
let newConceptState = {
    isOpen: false,
    selectedType: null,
    predicates: [],
    autoPredicates: [],
    fieldValues: {},
    intermediateSparql: '',
    idGenerationMode: 'manual' // issue #313: по умолчанию 'manual' (ввести вручную)
};

/**
 * Хранилище промежуточных SPARQL запросов для отображения
 */
let intermediateSparqlQueries = [];

// ==============================================================================
// ФУНКЦИИ РАБОТЫ С SPARQL
// ==============================================================================

/**
 * Получает предикаты из технологического объекта через SPARQL для создания нового концепта
 * Использует funSPARQLvalues для выполнения запроса
 * issue #260: Fallback предикаты не используются - при отсутствии techtree показывается ошибка
 *
 * Примечание: функция названа getPredicatesForNewConcept чтобы не конфликтовать
 * с существующей функцией getPredicatesFromTechObject в index.html
 *
 * @param {string} techObjectUri - URI технологического объекта
 * @param {Object} config - Конфигурация типа концепта
 * @returns {Array<{uri: string, prefixed: string}>} Массив предикатов
 */
function getPredicatesForNewConcept(techObjectUri, config) {
    const sparqlQuery = NEW_CONCEPT_SPARQL.GET_PREDICATES_FROM_TECH_OBJECT(techObjectUri);

    let predicates = [];

    // Выполняем через funSPARQLvalues (функция из index.html)
    if (typeof funSPARQLvalues === 'function') {
        const results = funSPARQLvalues(sparqlQuery, 'predicate');
        predicates = results.map(r => ({
            uri: r.uri,
            prefixed: getPrefixedName(r.uri, currentPrefixes)
        }));
    } else {
        // Fallback: ручной разбор если funSPARQLvalues недоступна
        predicates = getPredicatesForNewConceptManual(techObjectUri);
    }

    // Fix #2: Сохраняем промежуточный запрос вместе с результатом
    intermediateSparqlQueries.push({
        description: 'Получение предикатов из технологического объекта',
        query: sparqlQuery,
        result: predicates.length > 0
            ? predicates.map(p => p.prefixed).join(', ')
            : '(нет результатов)'
    });

    // issue #260: Если данные techtree не найдены, показываем ошибку (без fallback)
    if (predicates.length === 0) {
        console.error('ОШИБКА: techtree не загружен. Необходимо загрузить vad-basic-ontology_tech_Appendix.ttl');
        intermediateSparqlQueries.push({
            description: 'ОШИБКА: techtree не загружен',
            query: '-- ОШИБКА: Нет данных techtree.\n-- Загрузите vad-basic-ontology_tech_Appendix.ttl --',
            result: '(предикаты не найдены)'
        });

        // Показываем уведомление об ошибке
        if (typeof showErrorNotification === 'function') {
            showErrorNotification('Techtree не загружен. Загрузите vad-basic-ontology_tech_Appendix.ttl');
        }

        // Показываем диалог для загрузки файла techtree
        if (typeof showFileNotFoundDialog === 'function') {
            showFileNotFoundDialog({
                title: 'Techtree не загружен',
                message: 'Для создания нового концепта необходимо загрузить технологические данные из файла vad-basic-ontology_tech_Appendix.ttl',
                fileType: '.ttl',
                onFileSelected: async (file) => {
                    try {
                        const content = await file.text();
                        // Парсим и добавляем tech appendix в quadstore
                        if (typeof parseTechAppendix === 'function' && typeof addTechQuadsToStore === 'function') {
                            const quads = await parseTechAppendix(content);
                            if (quads && quads.length > 0) {
                                window.techAppendixQuads = quads;
                                addTechQuadsToStore();
                                if (typeof showSuccessNotification === 'function') {
                                    showSuccessNotification(`Tech appendix загружен из файла: ${file.name}`);
                                }
                                // Повторно загружаем предикаты
                                onNewConceptTypeChange();
                            }
                        }
                    } catch (parseError) {
                        console.error('Ошибка парсинга tech appendix:', parseError);
                        if (typeof showErrorNotification === 'function') {
                            showErrorNotification(`Ошибка парсинга: ${parseError.message}`);
                        }
                    }
                }
            });
        }
    }

    return predicates;
}

/**
 * Ручное получение предикатов из технологического объекта
 * Используется как fallback если funSPARQLvalues недоступна
 *
 * @param {string} techObjectUri - URI технологического объекта
 * @returns {Array<{uri: string, prefixed: string}>} Массив предикатов
 */
function getPredicatesForNewConceptManual(techObjectUri) {
    const predicates = [];
    const includePredicateUri = 'http://example.org/vad#includePredicate';

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        quads.forEach(quad => {
            if (quad.subject.value === techObjectUri &&
                quad.predicate.value === includePredicateUri) {
                predicates.push({
                    uri: quad.object.value,
                    prefixed: typeof getPrefixedName === 'function'
                        ? getPrefixedName(quad.object.value, currentPrefixes)
                        : quad.object.value
                });
            }
        });
    }

    return predicates;
}

/**
 * Получает автоматически генерируемые предикаты
 *
 * @param {string} techObjectUri - URI технологического объекта
 * @returns {Array<string>} Массив URI автогенерируемых предикатов
 */
function getAutoGeneratedPredicates(techObjectUri) {
    const sparqlQuery = NEW_CONCEPT_SPARQL.GET_AUTO_GENERATED_PREDICATES(techObjectUri);

    let autoPredicates = [];

    if (typeof funSPARQLvalues === 'function') {
        const results = funSPARQLvalues(sparqlQuery, 'predicate');
        autoPredicates = results.map(r => r.uri);
    }

    // Fix #2: Сохраняем промежуточный запрос вместе с результатом
    intermediateSparqlQueries.push({
        description: 'Получение автоматически генерируемых предикатов',
        query: sparqlQuery,
        result: autoPredicates.length > 0
            ? autoPredicates.map(uri => typeof getPrefixedName === 'function' ? getPrefixedName(uri, currentPrefixes) : uri).join(', ')
            : '(нет результатов)'
    });

    return autoPredicates;
}

/**
 * Получает объекты определённого типа для справочника родительских объектов.
 * Issue #250: Обновлена цепочка вызовов — сначала funSPARQLvaluesComunica (полная SPARQL),
 * затем funSPARQLvalues, затем manual fallback.
 *
 * @param {string} typeUri - URI типа
 * @param {string} graphUri - URI графа
 * @returns {Array<{uri: string, label: string}>} Массив объектов
 */
function getObjectsForParentSelector(typeUri, graphUri) {
    const sparqlQuery = NEW_CONCEPT_SPARQL.GET_OBJECTS_BY_TYPE_IN_GRAPH(typeUri, graphUri);

    let results = [];
    let querySource = 'funSPARQLvalues';

    // Issue #250: Попытка выполнить через funSPARQLvaluesComunica (поддерживает OPTIONAL)
    if (typeof funSPARQLvaluesComunica === 'function') {
        // funSPARQLvaluesComunica — async, но для совместимости используем синхронный fallback
        // В будущем весь pipeline станет async
        try {
            // Пробуем синхронный funSPARQLvalues сначала
            if (typeof funSPARQLvalues === 'function') {
                results = funSPARQLvalues(sparqlQuery, 'object');
            }
        } catch (e) {
            console.log('getObjectsForParentSelector: funSPARQLvalues error, trying manual fallback');
        }
    } else if (typeof funSPARQLvalues === 'function') {
        results = funSPARQLvalues(sparqlQuery, 'object');
    }

    // Если SPARQL не вернул результатов, используем manual fallback
    // (SPARQL парсер может не справиться с OPTIONAL и вложенными GRAPH блоками)
    if (results.length === 0) {
        console.log('getObjectsForParentSelector: SPARQL вернул пустой результат, используем manual fallback');
        results = getObjectsByTypeManual(typeUri, graphUri);
        querySource = 'manual fallback';
    }

    // Сохраняем промежуточный запрос вместе с результатом
    intermediateSparqlQueries.push({
        description: 'Получение объектов для справочника родительских элементов',
        query: sparqlQuery,
        result: results.length > 0
            ? `(${querySource}) ${results.map(obj => obj.label || obj.uri).join(', ')}`
            : '(нет результатов)'
    });

    return results;
}

/**
 * Ручное получение объектов по типу
 * Issue #209 Fix #2: Улучшено логирование для диагностики пустых результатов
 *
 * @param {string} typeUri - URI типа
 * @param {string} graphUri - URI графа
 * @returns {Array<{uri: string, label: string}>} Массив объектов
 */
function getObjectsByTypeManual(typeUri, graphUri) {
    const objects = [];
    const rdfTypeUri = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
    const rdfsLabelUri = 'http://www.w3.org/2000/01/rdf-schema#label';

    console.log(`getObjectsByTypeManual: Searching for type=${typeUri} in graph=${graphUri}`);

    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        console.log(`getObjectsByTypeManual: quads count = ${quads.length}`);

        // Сначала находим все субъекты нужного типа в нужном графе
        const subjectsOfType = new Set();
        quads.forEach(quad => {
            // Issue #209 Fix #2: Улучшенная проверка графа
            // Проверяем соответствие типа и графа
            const quadGraphValue = quad.graph ? quad.graph.value : null;

            if (quad.predicate.value === rdfTypeUri && quad.object.value === typeUri) {
                // Проверяем, совпадает ли граф
                if (quadGraphValue === graphUri) {
                    subjectsOfType.add(quad.subject.value);
                }
            }
        });

        console.log(`getObjectsByTypeManual: Found ${subjectsOfType.size} subjects of type ${typeUri}`);

        // Затем получаем их label
        subjectsOfType.forEach(subjectUri => {
            let label = typeof getPrefixedName === 'function'
                ? getPrefixedName(subjectUri, currentPrefixes)
                : subjectUri;

            // Ищем rdfs:label
            quads.forEach(quad => {
                if (quad.subject.value === subjectUri &&
                    quad.predicate.value === rdfsLabelUri) {
                    label = quad.object.value;
                }
            });

            objects.push({ uri: subjectUri, label: label });
        });

        console.log(`getObjectsByTypeManual: Returning ${objects.length} objects`);
    } else {
        console.log('getObjectsByTypeManual: currentStore is not available');
    }

    return objects;
}

/**
 * Проверяет существование ID в текущих данных.
 * issue #326: Использует currentStore.getQuads() вместо currentQuads.
 *
 * @param {string} uri - URI для проверки
 * @returns {boolean} true если ID уже существует
 * @deprecated Используйте checkIdExistsSparql для SPARQL-ориентированного подхода
 */
function checkIdExists(uri) {
    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    if (currentStore) {
        const quads = currentStore.getQuads(null, null, null, null);
        return quads.some(quad =>
            quad.subject.value === uri || quad.object.value === uri
        );
    }
    return false;
}

/**
 * Issue #250: Проверяет существование ID через SPARQL-запрос.
 * В соответствии с принципом SPARQL-driven programming (sparql-driven-programming_min1.md),
 * использует funSPARQLvalues вместо прямого обращения к currentQuads.
 *
 * Преимущества:
 * - Независимость от используемой библиотеки (при замене N3.js логика не изменится)
 * - Проверка уникальности в конкретном графе (ptree/rtree), а не во всех данных
 * - Самодокументируемый SPARQL-запрос
 *
 * @param {string} fullUri - Полный URI нового объекта
 * @param {string} graphUri - URI графа для проверки (например, vad:ptree или vad:rtree)
 * @returns {boolean} true если ID уже существует в указанном графе
 */
function checkIdExistsSparql(fullUri, graphUri) {
    const sparqlQuery = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX vad: <http://example.org/vad#>

SELECT ?s WHERE {
    GRAPH <${graphUri}> {
        <${fullUri}> ?p ?o .
        BIND(<${fullUri}> AS ?s)
    }
}`;

    // Сохраняем промежуточный запрос для отображения
    intermediateSparqlQueries.push({
        description: 'Проверка уникальности ID нового концепта',
        query: sparqlQuery,
        result: '(выполняется...)'
    });

    let exists = false;

    if (typeof funSPARQLvalues === 'function') {
        const results = funSPARQLvalues(sparqlQuery, 's');
        exists = results.length > 0;
    } else {
        // Fallback на прямую проверку
        exists = checkIdExists(fullUri);
    }

    // Обновляем результат промежуточного запроса
    const lastQuery = intermediateSparqlQueries[intermediateSparqlQueries.length - 1];
    if (lastQuery && lastQuery.description === 'Проверка уникальности ID нового концепта') {
        lastQuery.result = exists
            ? `ID уже существует: ${fullUri}`
            : `ID свободен: ${fullUri}`;
    }

    return exists;
}

/**
 * issue #270: Проверяет существование ID через SPARQL ASK запрос.
 * Рекомендуемый подход согласно store_concept_v3.md Phase 1.
 *
 * Использует ASK запрос вместо SELECT для более эффективной проверки.
 *
 * @param {string} fullUri - Полный URI объекта для проверки
 * @param {string} graphUri - URI графа для проверки (например, vad:ptree или vad:rtree)
 * @returns {Promise<boolean>} true если ID уже существует в указанном графе
 */
async function checkIdExistsAsk(fullUri, graphUri) {
    const sparqlQuery = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX vad: <http://example.org/vad#>

ASK {
    GRAPH <${graphUri}> {
        <${fullUri}> ?p ?o .
    }
}`;

    // Сохраняем промежуточный запрос для отображения
    intermediateSparqlQueries.push({
        description: 'issue #270: Проверка существования ID через ASK',
        query: sparqlQuery,
        result: '(выполняется...)'
    });

    let exists = false;

    if (typeof funSPARQLask === 'function') {
        exists = await funSPARQLask(sparqlQuery);
    } else {
        // Fallback на SELECT-версию
        exists = checkIdExistsSparql(fullUri, graphUri);
    }

    // Обновляем результат промежуточного запроса
    const lastQuery = intermediateSparqlQueries[intermediateSparqlQueries.length - 1];
    if (lastQuery && lastQuery.description === 'issue #270: Проверка существования ID через ASK') {
        lastQuery.result = exists
            ? `ID уже существует: ${fullUri}`
            : `ID свободен: ${fullUri}`;
    }

    return exists;
}

// ==============================================================================
// ФУНКЦИИ ГЕНЕРАЦИИ ID
// ==============================================================================

/**
 * Генерирует ID на основе label (замена пробелов на подчёркивания)
 *
 * @param {string} label - Исходный label
 * @returns {string} Сгенерированный ID
 *
 * @example
 * generateIdFromLabel("Мой процесс") // "Мой_процесс"
 * generateIdFromLabel("Process 1.1") // "Process_1.1"
 */
function generateIdFromLabel(label) {
    if (!label) return '';

    // Заменяем пробелы на подчёркивания
    let id = label.replace(/\s+/g, '_');

    // Убираем специальные символы, кроме подчёркивания, точки, тире и цифр
    id = id.replace(/[^a-zA-Z\u0430-\u044F\u0410-\u042F\u0451\u04010-9_.\-]/g, '');

    return id;
}

/**
 * Формирует полный URI для нового концепта
 *
 * @param {string} id - Локальный ID (без префикса)
 * @param {string} prefix - Префикс (по умолчанию 'vad')
 * @returns {string} Полный URI
 */
function buildConceptUri(id, prefix = 'vad') {
    if (typeof currentPrefixes !== 'undefined' && currentPrefixes[prefix]) {
        return currentPrefixes[prefix] + id;
    }
    return `http://example.org/${prefix}#${id}`;
}

/**
 * Fix #5: Санитизирует ID концепта, удаляя лишние префиксы
 * Предотвращает ошибку вида vad:vad:Something
 *
 * @param {string} id - Исходный ID
 * @returns {string} Санитизированный ID без префикса
 */
function sanitizeConceptId(id) {
    if (!id) return '';

    let sanitized = id.trim();

    // Удаляем префиксы вида "prefix:" в начале строки
    // Поддерживаемые префиксы: vad:, rdf:, rdfs:, и др.
    const prefixPattern = /^([a-zA-Z_][a-zA-Z0-9_]*):(.+)$/;
    const match = sanitized.match(prefixPattern);

    if (match) {
        // Если есть префикс, берём только локальную часть
        sanitized = match[2];
        console.log(`sanitizeConceptId: удалён префикс "${match[1]}:", ID: "${match[2]}"`);
    }

    return sanitized;
}

// ==============================================================================
// ЭКСПОРТ ФУНКЦИЙ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА
// ==============================================================================

// Делаем функции доступными глобально для использования из HTML
if (typeof window !== 'undefined') {
    window.generateIdFromLabel = generateIdFromLabel;
    window.sanitizeConceptId = sanitizeConceptId;            // Fix #5
    window.checkIdExistsSparql = checkIdExistsSparql;        // Issue #250
    window.NEW_CONCEPT_CONFIG = NEW_CONCEPT_CONFIG;
    window.NEW_CONCEPT_SPARQL = NEW_CONCEPT_SPARQL;
}

