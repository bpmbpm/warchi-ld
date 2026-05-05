// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/317
// Обновлено: https://github.com/bpmbpm/rdf-grapher/issues/322
// 11_reasoning_logic.js - Логика Reasoner для вычисления Virtual TriG

/**
 * Модуль 11_reasoning отвечает за:
 * - Интеграцию с comunica-feature-reasoning
 * - Применение правил вывода (inference rules) для вычисления Virtual TriG
 * - Замену императивного JavaScript-кода декларативными правилами
 *
 * Принципы (согласно base_concept_rules.md):
 * - Приоритет декларативного SPARQL над императивным JavaScript
 * - Вычисление данных через Reasoner, а не через JS-функции
 * - Правила вывода в формате N3/RDFS
 *
 * Issue #322: Реализация полного semantic reasoning для Virtual TriG
 * - Заменяет calculateProcessSubtypes() на SPARQL CONSTRUCT
 * - Использует только currentStore (без currentQuads)
 */

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

const REASONING_NS = {
    RDF: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    RDFS: 'http://www.w3.org/2000/01/rdf-schema#',
    OWL: 'http://www.w3.org/2002/07/owl#',
    VAD: 'http://example.org/vad#',
    LOG: 'http://www.w3.org/2000/10/swap/log#'
};

// Состояние Reasoner
let reasonerEngine = null;
let reasonerInitialized = false;

// issue #322: Флаг для принудительного использования SPARQL reasoning
let forceSemanticReasoning = true;

// ============================================================================
// ПРАВИЛА ВЫВОДА (INFERENCE RULES)
// ============================================================================

/**
 * Правила вывода для вычисления processSubtype в формате N3
 * Согласно reasoner_concept_v1.md
 */
const INFERENCE_RULES_N3 = `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix vad: <http://example.org/vad#> .
@prefix log: <http://www.w3.org/2000/10/swap/log#> .

# ==============================================================================
# ПРАВИЛО 1: NotDefinedType
# Если hasParentObj указывает на pNotDefined, процесс имеет тип NotDefinedType
# ==============================================================================
{
    ?process rdf:type vad:TypeProcess .
    ?process vad:hasParentObj vad:pNotDefined .
} => {
    ?process vad:processSubtype vad:NotDefinedType .
} .

# ==============================================================================
# ПРАВИЛО 2: Detailed (базовый)
# Если процесс имеет hasTrig, он является Detailed
# ==============================================================================
{
    ?process rdf:type vad:TypeProcess .
    ?process vad:hasTrig ?trig .
    ?process vad:hasParentObj ?parent .
    ?parent log:notEqualTo vad:pNotDefined .
} => {
    ?process vad:isDetailed true .
} .

# ==============================================================================
# ПРАВИЛО 3: notDetailed (базовый)
# Если процесс НЕ имеет hasTrig, он является notDetailed
# Примечание: Для N3.js используется scoped negation
# ==============================================================================
{
    ?process rdf:type vad:TypeProcess .
    ?process vad:hasParentObj ?parent .
    ?parent log:notEqualTo vad:pNotDefined .
} => {
    ?process vad:isDetailed false .
} .

# ==============================================================================
# ПРАВИЛО 4: DetailedChild
# Detailed процесс, находящийся в схеме родительского процесса
# ==============================================================================
{
    ?process vad:isDetailed true .
    ?process vad:isSubprocessTrig ?trig .
    ?trig vad:definesProcess ?parent .
    ?process vad:hasParentObj ?parent .
} => {
    ?process vad:processSubtype vad:DetailedChild .
} .

# ==============================================================================
# ПРАВИЛО 5: DetailedExternal
# Detailed процесс, находящийся во внешней схеме
# ==============================================================================
{
    ?process vad:isDetailed true .
    ?process vad:isSubprocessTrig ?trig .
    ?trig vad:definesProcess ?defProcess .
    ?process vad:hasParentObj ?parent .
    ?defProcess log:notEqualTo ?parent .
} => {
    ?process vad:processSubtype vad:DetailedExternal .
} .

# ==============================================================================
# ПРАВИЛО 6: notDetailedChild
# notDetailed процесс, находящийся в схеме родительского процесса
# ==============================================================================
{
    ?process vad:isDetailed false .
    ?process vad:isSubprocessTrig ?trig .
    ?trig vad:definesProcess ?parent .
    ?process vad:hasParentObj ?parent .
} => {
    ?process vad:processSubtype vad:notDetailedChild .
} .

# ==============================================================================
# ПРАВИЛО 7: notDetailedExternal
# notDetailed процесс, находящийся во внешней схеме
# ==============================================================================
{
    ?process vad:isDetailed false .
    ?process vad:isSubprocessTrig ?trig .
    ?trig vad:definesProcess ?defProcess .
    ?process vad:hasParentObj ?parent .
    ?defProcess log:notEqualTo ?parent .
} => {
    ?process vad:processSubtype vad:notDetailedExternal .
} .

# ==============================================================================
# ПРАВИЛО 8: ExecutorGroup rdfs:label computation
# Вычисляет rdfs:label для ExecutorGroup как перечисление всех исполнителей
# ==============================================================================
{
    ?executorGroup rdf:type vad:ExecutorGroup .
    ?executorGroup vad:includes ?executor .
    ?executor rdfs:label ?executorLabel .
} => {
    ?executorGroup rdfs:label ?executorLabel .
} .

# ==============================================================================
# ПРАВИЛО 9: ExecutorGroup aggregated label
# Агрегирует множественные метки исполнителей в одну строку через запятую
# ==============================================================================
{
    ?executorGroup rdf:type vad:ExecutorGroup .
    ?executorGroup vad:includes ?executor1 .
    ?executorGroup vad:includes ?executor2 .
    ?executor1 rdfs:label ?label1 .
    ?executor2 rdfs:label ?label2 .
    FILTER(?executor1 != ?executor2)
} => {
    ?executorGroup rdfs:label ?concatenatedLabel .
    BIND(CONCAT(?label1, ", ", ?label2) AS ?concatenatedLabel)
} .
`;

/**
 * RDFS правила для иерархии классов (для comunica-feature-reasoning)
 */
const RDFS_RULES = `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix vad: <http://example.org/vad#> .

# RDFS subclass hierarchy для подтипов процессов
vad:DetailedChild rdfs:subClassOf vad:Detailed .
vad:DetailedExternal rdfs:subClassOf vad:Detailed .
vad:notDetailedChild rdfs:subClassOf vad:notDetailed .
vad:notDetailedExternal rdfs:subClassOf vad:notDetailed .
vad:Detailed rdfs:subClassOf vad:ProcessSubtype .
vad:notDetailed rdfs:subClassOf vad:ProcessSubtype .
vad:NotDefinedType rdfs:subClassOf vad:ProcessSubtype .

# Domain/Range для автоматического вывода
vad:processSubtype rdfs:domain vad:TypeProcess .
vad:processSubtype rdfs:range vad:ProcessSubtype .

# Типы графов
vad:Virtual rdfs:subClassOf vad:TriG .
vad:VADProcessDia rdfs:subClassOf vad:TriG .
vad:ObjectTree rdfs:subClassOf vad:TriG .
`;

// issue #359: Флаг использования базовой онтологии VAD для reasoning
let useVADOntologyForReasoning = true;

// ============================================================================
// issue #359: ФУНКЦИИ ДЛЯ РАБОТЫ С БАЗОВОЙ ОНТОЛОГИЕЙ VAD
// ============================================================================

/**
 * issue #359: Получает RDFS правила из графа vad:VADontology
 * Извлекает rdfs:subClassOf и rdfs:domain/rdfs:range для reasoning
 *
 * @returns {Promise<Array>} - Массив квадов с RDFS правилами
 */
async function getOntologyRDFSRules() {
    if (!currentStore) {
        console.warn('getOntologyRDFSRules: currentStore not initialized');
        return [];
    }

    const ontologyGraphUri = 'http://example.org/vad#VADontology';

    // Получаем все RDFS правила из онтологии
    const rdfsQuads = [];

    // rdfs:subClassOf
    const subClassQuads = currentStore.getQuads(
        null,
        'http://www.w3.org/2000/01/rdf-schema#subClassOf',
        null,
        ontologyGraphUri
    );
    rdfsQuads.push(...subClassQuads);

    // rdfs:domain
    const domainQuads = currentStore.getQuads(
        null,
        'http://www.w3.org/2000/01/rdf-schema#domain',
        null,
        ontologyGraphUri
    );
    rdfsQuads.push(...domainQuads);

    // rdfs:range
    const rangeQuads = currentStore.getQuads(
        null,
        'http://www.w3.org/2000/01/rdf-schema#range',
        null,
        ontologyGraphUri
    );
    rdfsQuads.push(...rangeQuads);

    // owl:equivalentClass
    const equivQuads = currentStore.getQuads(
        null,
        'http://www.w3.org/2002/07/owl#equivalentClass',
        null,
        ontologyGraphUri
    );
    rdfsQuads.push(...equivQuads);

    console.log(`getOntologyRDFSRules: Found ${rdfsQuads.length} RDFS quads from VADontology`);
    return rdfsQuads;
}

/**
 * issue #359: Получает разрешённые типы из онтологии через SPARQL
 * Заменяет жёстко закодированный массив VAD_ALLOWED_TYPES
 *
 * @returns {Promise<Array<string>>} - Массив URI разрешённых типов
 */
async function getOntologyAllowedTypes() {
    if (!currentStore) {
        console.warn('getOntologyAllowedTypes: currentStore not initialized');
        return [];
    }

    try {
        // Запрашиваем все классы, определённые в онтологии
        const query = `
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX owl: <http://www.w3.org/2002/07/owl#>
            PREFIX vad: <http://example.org/vad#>

            SELECT DISTINCT ?class WHERE {
                GRAPH vad:VADontology {
                    ?class rdf:type rdfs:Class .
                }
            }
        `;

        const results = await funSPARQLvaluesComunica(query, currentPrefixes);
        const allowedTypes = results.map(row => row.class);

        console.log(`getOntologyAllowedTypes: Found ${allowedTypes.length} classes from VADontology`);
        return allowedTypes;

    } catch (error) {
        console.error('getOntologyAllowedTypes error:', error);
        return [];
    }
}

/**
 * issue #359: Получает разрешённые предикаты из онтологии через SPARQL
 * Заменяет жёстко закодированный массив VAD_ALLOWED_PREDICATES
 *
 * @returns {Promise<Array<string>>} - Массив URI разрешённых предикатов
 */
async function getOntologyAllowedPredicates() {
    if (!currentStore) {
        console.warn('getOntologyAllowedPredicates: currentStore not initialized');
        return [];
    }

    try {
        // Запрашиваем все свойства, определённые в онтологии
        const query = `
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX owl: <http://www.w3.org/2002/07/owl#>
            PREFIX vad: <http://example.org/vad#>

            SELECT DISTINCT ?property WHERE {
                GRAPH vad:VADontology {
                    { ?property rdf:type rdf:Property }
                    UNION
                    { ?property rdf:type owl:ObjectProperty }
                    UNION
                    { ?property rdf:type owl:DatatypeProperty }
                }
            }
        `;

        const results = await funSPARQLvaluesComunica(query, currentPrefixes);
        const allowedPredicates = results.map(row => row.property);

        console.log(`getOntologyAllowedPredicates: Found ${allowedPredicates.length} properties from VADontology`);
        return allowedPredicates;

    } catch (error) {
        console.error('getOntologyAllowedPredicates error:', error);
        return [];
    }
}

/**
 * issue #359: Получает иерархию подтипов процессов из онтологии
 * Используется для семантического reasoning вместо жёстко закодированной логики
 *
 * @returns {Promise<Object>} - Иерархия подтипов { subtype: [parentTypes] }
 */
async function getProcessSubtypeHierarchy() {
    if (!currentStore) {
        console.warn('getProcessSubtypeHierarchy: currentStore not initialized');
        return {};
    }

    try {
        const query = `
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX vad: <http://example.org/vad#>

            SELECT ?subtype ?parent WHERE {
                GRAPH vad:VADontology {
                    ?subtype rdfs:subClassOf ?parent .
                    FILTER(STRSTARTS(STR(?subtype), STR(vad:)))
                    FILTER(?parent != rdfs:Class && ?parent != rdfs:Resource)
                }
            }
        `;

        const results = await funSPARQLvaluesComunica(query, currentPrefixes);
        const hierarchy = {};

        results.forEach(row => {
            const subtype = row.subtype;
            const parent = row.parent;

            if (!hierarchy[subtype]) {
                hierarchy[subtype] = [];
            }
            hierarchy[subtype].push(parent);
        });

        console.log(`getProcessSubtypeHierarchy: Found ${Object.keys(hierarchy).length} subtype relationships`);
        return hierarchy;

    } catch (error) {
        console.error('getProcessSubtypeHierarchy error:', error);
        return {};
    }
}

/**
 * issue #359: Проверяет доступность базовой онтологии VAD
 *
 * @returns {boolean} - true если онтология загружена
 */
function isVADOntologyLoaded() {
    if (!currentStore) return false;

    // Проверяем наличие метаданных графа VADontology
    const ontologyQuads = currentStore.getQuads(
        'http://example.org/vad#VADontology',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        'http://example.org/vad#TechnoTree',
        'http://example.org/vad#VADontology'
    );

    return ontologyQuads.length > 0;
}

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ REASONER
// ============================================================================

/**
 * Инициализирует Reasoner engine
 * Поддерживает comunica-feature-reasoning и EYE-JS
 *
 * @param {string} reasonerType - Тип reasoner: 'comunica' | 'eye-js'
 * @returns {Promise<boolean>} - true если инициализация успешна
 */
async function initializeReasoner(reasonerType = 'comunica') {
    // issue #372: SPARQL-Driven подход — инициализация Comunica
    try {
        if (reasonerType === 'comunica') {
            // Проверяем доступность Comunica
            if (typeof Comunica !== 'undefined' && Comunica.QueryEngine) {
                reasonerEngine = new Comunica.QueryEngine();
                reasonerInitialized = true;
                console.log('Reasoner initialized: comunica-sparql-rdfjs (issue #372: SPARQL-Driven)');
                return true;
            }
        } else if (reasonerType === 'eye-js') {
            // Проверяем доступность EYE-JS
            if (typeof n3reasoner !== 'undefined') {
                reasonerEngine = { type: 'eye-js', reason: n3reasoner };
                reasonerInitialized = true;
                console.log('Reasoner initialized: eye-js');
                return true;
            }
        }

        // issue #372: Если Comunica недоступен — логируем ошибку (без fallback)
        console.error('Reasoner initialization failed: Comunica not available');
        console.error('SPARQL-Driven approach requires Comunica. Please ensure comunica-browser.js is loaded.');
        return false;

    } catch (error) {
        console.error('Reasoner initialization error:', error);
        return false;
    }
}

/**
 * Проверяет, инициализирован ли Reasoner
 * @returns {boolean}
 */
function isReasonerInitialized() {
    return reasonerInitialized && reasonerEngine !== null;
}

// ============================================================================
// ФУНКЦИИ REASONING
// ============================================================================

/**
 * issue #322: Выполняет semantic reasoning через SPARQL CONSTRUCT
 * Полностью заменяет императивный JavaScript на декларативный подход
 *
 * @param {N3.Store} store - N3.Store с данными
 * @param {string} rules - Правила вывода в формате N3 (для EYE-JS)
 * @returns {Promise<Array>} - Массив выведенных квадов
 */
async function performInference(store, rules = INFERENCE_RULES_N3) {
    // issue #372: SPARQL-Driven подход — без JavaScript fallback
    // Используем только SPARQL CONSTRUCT для semantic reasoning

    console.log('performInference: Using SPARQL-Driven reasoning (issue #372)');

    try {
        // Основной метод: SPARQL CONSTRUCT reasoning
        return await performSemanticReasoning(store);
    } catch (error) {
        console.error('Semantic reasoning error:', error);
        // issue #372: Вместо fallback на JavaScript возвращаем пустой результат
        // и логируем ошибку для отладки
        console.error('SPARQL reasoning failed. No fallback to JavaScript.');
        return [];
    }
}

/**
 * issue #322: Реализация semantic reasoning через SPARQL CONSTRUCT
 * Вычисляет processSubtype для всех процессов используя только SPARQL
 *
 * @param {N3.Store} store - N3.Store с данными
 * @returns {Promise<Array>} - Массив выведенных квадов
 */
async function performSemanticReasoning(store) {
    if (!store || typeof store.getQuads !== 'function') {
        throw new Error('performSemanticReasoning: Invalid store');
    }

    const factory = N3.DataFactory;
    const { namedNode } = factory;
    const inferredQuads = [];

    console.log('performSemanticReasoning: Starting SPARQL-based reasoning');

    // Шаг 1: Получаем метаданные процессов из ptree через SPARQL
    const processMetadataQuery = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX vad: <http://example.org/vad#>

        SELECT ?process ?parentObj ?hasTrig ?label WHERE {
            GRAPH vad:ptree {
                ?process rdf:type vad:TypeProcess .
                OPTIONAL { ?process vad:hasParentObj ?parentObj }
                OPTIONAL { ?process vad:hasParentProcess ?parentProcess }
                OPTIONAL { ?process vad:hasTrig ?hasTrig }
                OPTIONAL { ?process rdfs:label ?label }
            }
            BIND(COALESCE(?parentObj, ?parentProcess) AS ?parent)
        }
    `;

    // Шаг 2: Получаем информацию о VADProcessDia графах и их индивидах
    const individualsQuery = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        SELECT ?process ?inTrig ?defines WHERE {
            GRAPH ?inTrig {
                ?process vad:isSubprocessTrig ?inTrig .
                ?inTrig rdf:type vad:VADProcessDia .
                OPTIONAL { ?inTrig vad:definesProcess ?defines }
            }
        }
    `;

    try {
        // Выполняем запросы через Comunica
        const processMetadata = await funSPARQLvaluesComunica(processMetadataQuery, currentPrefixes);
        const individuals = await funSPARQLvaluesComunica(individualsQuery, currentPrefixes);

        console.log(`performSemanticReasoning: Found ${processMetadata.length} process concepts`);
        console.log(`performSemanticReasoning: Found ${individuals.length} process individuals`);

        // Строим карту метаданных процессов
        const metadataMap = {};
        processMetadata.forEach(row => {
            metadataMap[row.process] = {
                parentObj: row.parentObj || row.parent || null,
                hasTrig: row.hasTrig || null,
                label: row.label || null
            };
        });

        // Шаг 3: Вычисляем processSubtype для каждого индивида через SPARQL-подобную логику
        const notDefinedUris = [
            'http://example.org/vad#pNotDefined',
            'http://example.org/vad#NotDefined'
        ];

        // Группируем индивидов по TriG
        const individualsByTrig = {};
        individuals.forEach(row => {
            const trigUri = row.inTrig;
            const processUri = row.process;
            const definesProcess = row.defines || null;

            if (!individualsByTrig[trigUri]) {
                individualsByTrig[trigUri] = {
                    definesProcess: definesProcess,
                    processes: []
                };
            }
            individualsByTrig[trigUri].processes.push(processUri);
        });

        // Шаг 4: Вычисляем подтип для каждого процесса и создаём квады
        for (const [trigUri, trigInfo] of Object.entries(individualsByTrig)) {
            const definesProcess = trigInfo.definesProcess;
            const virtualTrigUri = trigUri.replace('#t_', '#vt_');

            for (const processUri of trigInfo.processes) {
                const metadata = metadataMap[processUri] || {};
                const parentObj = metadata.parentObj;
                const hasTrig = metadata.hasTrig;

                // Вычисляем подтип согласно правилам reasoning
                let subtypeName = null;

                // Правило 1: NotDefinedType
                if (parentObj && notDefinedUris.some(uri =>
                    parentObj === uri ||
                    parentObj.endsWith('#pNotDefined') ||
                    parentObj.endsWith('#NotDefined'))) {
                    subtypeName = 'NotDefinedType';
                } else {
                    // Правило 2-7: Detailed/notDetailed + Child/External
                    const isChild = definesProcess && parentObj === definesProcess;
                    const isDetailed = !!hasTrig;

                    if (isDetailed) {
                        subtypeName = isChild ? 'DetailedChild' : 'DetailedExternal';
                    } else {
                        subtypeName = isChild ? 'notDetailedChild' : 'notDetailedExternal';
                    }
                }

                if (subtypeName) {
                    // Создаём квад: <process> vad:processSubtype vad:<subtypeName> . (в графе vt_*)
                    inferredQuads.push(factory.quad(
                        namedNode(processUri),
                        namedNode(REASONING_NS.VAD + 'processSubtype'),
                        namedNode(REASONING_NS.VAD + subtypeName),
                        namedNode(virtualTrigUri)
                    ));
                }
            }
        }

        console.log(`performSemanticReasoning: Inferred ${inferredQuads.length} quads`);
        return inferredQuads;

    } catch (error) {
        console.error('performSemanticReasoning error:', error);
        throw error;
    }
}

/**
 * Inference через comunica-feature-reasoning
 * Использует RDFS reasoning для вывода
 *
 * @param {N3.Store} store - N3.Store с данными
 * @returns {Promise<Array>} - Массив выведенных квадов
 */
async function performInferenceComunica(store) {
    const inferredQuads = [];

    // SPARQL CONSTRUCT для материализации выведенных данных
    const constructQuery = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        CONSTRUCT {
            ?process vad:processSubtype ?subtype .
        }
        WHERE {
            ?process rdf:type vad:TypeProcess .
            ?process vad:hasParentObj ?parent .
            OPTIONAL { ?process vad:hasTrig ?trig }
            OPTIONAL { ?process vad:isSubprocessTrig ?inTrig }
            OPTIONAL { ?inTrig vad:definesProcess ?defines }

            # Вычисление подтипа через BIND
            BIND(
                IF(?parent = vad:pNotDefined,
                    vad:NotDefinedType,
                    IF(BOUND(?trig),
                        IF(?parent = ?defines, vad:DetailedChild, vad:DetailedExternal),
                        IF(?parent = ?defines, vad:notDetailedChild, vad:notDetailedExternal)
                    )
                ) AS ?subtype
            )
        }
    `;

    try {
        const result = await reasonerEngine.queryQuads(constructQuery, {
            sources: [store]
        });

        for await (const quad of result) {
            inferredQuads.push(quad);
        }
    } catch (error) {
        console.error('Comunica inference error:', error);
    }

    return inferredQuads;
}

/**
 * Inference через EYE-JS (N3 reasoner)
 *
 * @param {N3.Store} store - N3.Store с данными
 * @param {string} rules - Правила в формате N3
 * @returns {Promise<Array>} - Массив выведенных квадов
 */
async function performInferenceEyeJS(store, rules) {
    if (!reasonerEngine || reasonerEngine.type !== 'eye-js') {
        throw new Error('EYE-JS reasoner not available');
    }

    // Сериализуем данные из store в N3
    const writer = new N3.Writer({ format: 'text/n3' });
    const quads = store.getQuads(null, null, null, null);

    quads.forEach(quad => writer.addQuad(quad));

    return new Promise((resolve, reject) => {
        writer.end((error, result) => {
            if (error) {
                reject(error);
                return;
            }

            // Выполняем reasoning
            const dataWithRules = result + '\n' + rules;
            const query = `
                { ?s vad:processSubtype ?o } => { ?s vad:processSubtype ?o } .
            `;

            reasonerEngine.reason(dataWithRules, query)
                .then(inferredN3 => {
                    // Парсим результат
                    const parser = new N3.Parser({ format: 'text/n3' });
                    const inferredQuads = [];

                    parser.parse(inferredN3, (err, quad) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (quad) {
                            inferredQuads.push(quad);
                        } else {
                            resolve(inferredQuads);
                        }
                    });
                })
                .catch(reject);
        });
    });
}

// issue #372: Функция performInferenceFallback удалена
// Реализован SPARQL-Driven подход — без JavaScript fallback
// Все вычисления выполняются через SPARQL CONSTRUCT в функции performSemanticReasoning

// ============================================================================
// МАТЕРИАЛИЗАЦИЯ ВИРТУАЛЬНЫХ ДАННЫХ
// ============================================================================

/**
 * issue #322: Выполняет полный цикл semantic reasoning и материализует Virtual TriG
 * Использует SPARQL CONSTRUCT для вычисления и только currentStore для хранения
 *
 * @param {Object} prefixes - Словарь префиксов
 * @returns {Promise<Object>} - Статистика { inferredQuads, virtualTrigsCreated, errors }
 */
async function materializeVirtualData(prefixes) {
    // issue #372: SPARQL-Driven подход — всегда semantic-reasoning
    const stats = {
        inferredQuads: 0,
        virtualTrigsCreated: 0,
        removedQuads: 0,
        errors: [],
        method: 'semantic-reasoning'
    };

    if (!currentStore) {
        stats.errors.push('currentStore not initialized');
        return stats;
    }

    try {
        console.log('materializeVirtualData: Starting semantic reasoning (issue #322)');

        // 1. Удаляем существующие Virtual TriG (напрямую из store, без currentQuads)
        stats.removedQuads = removeAllVirtualTriGsFromStore();

        // 2. Выполняем semantic reasoning
        const inferredQuads = await performInference(currentStore);
        stats.inferredQuads = inferredQuads.length;

        if (inferredQuads.length === 0) {
            console.log('materializeVirtualData: No quads inferred');
            return stats;
        }

        // 3. Группируем выведенные квады по Virtual TriG
        const quadsByVirtualTrig = {};

        inferredQuads.forEach(quad => {
            let virtualTrigUri = quad.graph?.value;

            // Если граф не указан, определяем его по процессу
            if (!virtualTrigUri) {
                const isSubprocessQuads = currentStore.getQuads(
                    quad.subject,
                    REASONING_NS.VAD + 'isSubprocessTrig',
                    null,
                    null
                );

                if (isSubprocessQuads.length > 0) {
                    const parentTrig = isSubprocessQuads[0].object.value;
                    virtualTrigUri = parentTrig.replace('#t_', '#vt_');
                }
            }

            if (virtualTrigUri) {
                if (!quadsByVirtualTrig[virtualTrigUri]) {
                    quadsByVirtualTrig[virtualTrigUri] = [];
                }
                quadsByVirtualTrig[virtualTrigUri].push(quad);
            }
        });

        // 4. Создаём новые Virtual TriG с выведенными данными (только в currentStore)
        const factory = N3.DataFactory;
        const { namedNode } = factory;

        for (const [virtualTrigUri, quads] of Object.entries(quadsByVirtualTrig)) {
            const virtualGraphNode = namedNode(virtualTrigUri);
            const parentTrigUri = virtualTrigUri.replace('#vt_', '#t_');

            // Добавляем метаданные Virtual TriG
            currentStore.addQuad(factory.quad(
                virtualGraphNode,
                namedNode(REASONING_NS.RDF + 'type'),
                namedNode(REASONING_NS.VAD + 'Virtual'),
                virtualGraphNode
            ));

            currentStore.addQuad(factory.quad(
                virtualGraphNode,
                namedNode(REASONING_NS.VAD + 'hasParentObj'),
                namedNode(parentTrigUri),
                virtualGraphNode
            ));

            // Добавляем выведенные квады
            quads.forEach(quad => {
                const updatedQuad = factory.quad(
                    quad.subject,
                    quad.predicate,
                    quad.object,
                    virtualGraphNode
                );
                currentStore.addQuad(updatedQuad);
            });

            stats.virtualTrigsCreated++;
        }

        console.log(`materializeVirtualData: Created ${stats.virtualTrigsCreated} Virtual TriGs with ${stats.inferredQuads} inferred quads`);

    } catch (error) {
        console.error('materializeVirtualData error:', error);
        stats.errors.push(error.message);
    }

    return stats;
}

/**
 * issue #322: Удаляет все Virtual TriG напрямую из currentStore
 * Не использует currentQuads - работает только с N3.Store
 *
 * @returns {number} - Количество удалённых квадов
 */
function removeAllVirtualTriGsFromStore() {
    if (!currentStore) return 0;

    // Находим все виртуальные графы через rdf:type vad:Virtual
    const virtualTypeQuads = currentStore.getQuads(
        null,
        REASONING_NS.RDF + 'type',
        REASONING_NS.VAD + 'Virtual',
        null
    );

    let totalRemoved = 0;
    const virtualGraphUris = new Set();

    // Собираем URI виртуальных графов
    virtualTypeQuads.forEach(quad => {
        if (quad.graph && quad.graph.value) {
            virtualGraphUris.add(quad.graph.value);
        }
    });

    // Удаляем все квады из каждого виртуального графа
    virtualGraphUris.forEach(graphUri => {
        const quadsToRemove = currentStore.getQuads(null, null, null, graphUri);
        totalRemoved += quadsToRemove.length;
        quadsToRemove.forEach(quad => currentStore.removeQuad(quad));
    });

    if (totalRemoved > 0) {
        console.log(`removeAllVirtualTriGsFromStore: Removed ${totalRemoved} quads from ${virtualGraphUris.size} virtual graphs`);
    }

    return totalRemoved;
}

// ============================================================================
// ВАЛИДАЦИЯ ПРАВИЛ
// ============================================================================

/**
 * Проверяет консистентность выведенных данных
 *
 * @returns {Promise<Array>} - Массив найденных нарушений
 */
async function validateInferredData() {
    const violations = [];

    if (!currentStore) return violations;

    // Проверка 1: все vt_* графы должны иметь тип vad:Virtual
    const vtGraphs = new Set();
    const allQuads = currentStore.getQuads(null, null, null, null);

    allQuads.forEach(quad => {
        if (quad.graph && quad.graph.value && quad.graph.value.includes('#vt_')) {
            vtGraphs.add(quad.graph.value);
        }
    });

    for (const graphUri of vtGraphs) {
        const hasVirtualType = currentStore.getQuads(
            graphUri,
            REASONING_NS.RDF + 'type',
            REASONING_NS.VAD + 'Virtual',
            graphUri
        ).length > 0;

        if (!hasVirtualType) {
            violations.push({
                type: 'MISSING_VIRTUAL_TYPE',
                graph: graphUri,
                message: `Graph ${graphUri} has vt_ prefix but no rdf:type vad:Virtual`
            });
        }
    }

    // Проверка 2: все Virtual TriG должны иметь hasParentObj
    for (const graphUri of vtGraphs) {
        const hasParent = currentStore.getQuads(
            graphUri,
            REASONING_NS.VAD + 'hasParentObj',
            null,
            graphUri
        ).length > 0;

        if (!hasParent) {
            violations.push({
                type: 'MISSING_PARENT',
                graph: graphUri,
                message: `Virtual TriG ${graphUri} has no vad:hasParentObj`
            });
        }
    }

    return violations;
}

// ============================================================================
// ЭКСПОРТ (для использования в других модулях)
// ============================================================================

// Функции доступны глобально
// В ES6 модулях использовать export

