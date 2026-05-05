// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/368
// vadlib_logic.js - Логика общей библиотеки утилит RDF Grapher
// Алгоритмы, вычисления, обработка данных

// ============================================================================
// РЕЖИМ ВИЗУАЛИЗАЦИИ
// ============================================================================
const Mode = 'notation';

// ============================================================================
// КОНФИГУРАЦИЯ ФИЛЬТРОВ
// ============================================================================
const Filter = {
    hiddenPredicates: [
        'rdf:type', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        'rdfs:subClassOf', 'http://www.w3.org/2000/01/rdf-schema#subClassOf'
    ]
};
const FilterBase = { hiddenPredicates: [] };
const FilterAggregation = {
    hiddenPredicates: [
        'rdf:type', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        'rdfs:subClassOf', 'http://www.w3.org/2000/01/rdf-schema#subClassOf'
    ]
};
const FilterVAD = {
    hiddenPredicates: [
        'rdf:type', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        'vad:hasParentObj', 'http://example.org/vad#hasParentObj'
    ]
};

function getFilterConfig(mode) {
    if (mode === 'base') return FilterBase;
    else if (mode === 'aggregation') return FilterAggregation;
    else if (mode === 'vad' || mode === 'vad-trig') return FilterVAD;
    return Filter;
}

// ============================================================================
// КОНФИГУРАЦИЯ АГРЕГАЦИИ
// ============================================================================
const MaxAggregationParams = 5;
const DEFAULT_MAX_LABEL_LENGTH = 25;
let currentMaxLabelLength = DEFAULT_MAX_LABEL_LENGTH;
const DEFAULT_MAX_VAD_ROW_LENGTH = 8;
let currentMaxVadRowLength = DEFAULT_MAX_VAD_ROW_LENGTH;

// ============================================================================
// КОНФИГУРАЦИЯ VAD
// ============================================================================
const VAD_ALLOWED_TYPES = [
    'vad:TypeProcess', 'http://example.org/vad#TypeProcess',
    'vad:ExecutorGroup', 'http://example.org/vad#ExecutorGroup',
    'vad:TypeExecutor', 'http://example.org/vad#TypeExecutor',
    'vad:VADProcessDia', 'http://example.org/vad#VADProcessDia',
    'vad:ObjectTree', 'http://example.org/vad#ObjectTree',
    'vad:TechTree', 'http://example.org/vad#TechTree',
    'vad:TechnoTree', 'http://example.org/vad#TechnoTree',
    'vad:ProcessTree', 'http://example.org/vad#ProcessTree',
    'vad:ExecutorTree', 'http://example.org/vad#ExecutorTree',
    'vad:Detailed', 'http://example.org/vad#Detailed',
    'vad:DetailedChild', 'http://example.org/vad#DetailedChild',
    'vad:DetailedExternal', 'http://example.org/vad#DetailedExternal',
    'vad:notDetailed', 'http://example.org/vad#notDetailed',
    'vad:notDetailedChild', 'http://example.org/vad#notDetailedChild',
    'vad:notDetailedExternal', 'http://example.org/vad#notDetailedExternal',
    'vad:NotDefinedType', 'http://example.org/vad#NotDefinedType'
];

const VAD_ALLOWED_PREDICATES = [
    'rdf:type', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    'rdfs:label', 'http://www.w3.org/2000/01/rdf-schema#label',
    'dcterms:description', 'http://purl.org/dc/terms/description',
    'vad:hasNext', 'http://example.org/vad#hasNext',
    'vad:hasExecutor', 'http://example.org/vad#hasExecutor',
    'vad:hasParentObj', 'http://example.org/vad#hasParentObj',
    'vad:includes', 'http://example.org/vad#includes',
    'vad:processSubtype', 'http://example.org/vad#processSubtype',
    'vad:hasTrig', 'http://example.org/vad#hasTrig',
    'vad:hasParentProcess', 'http://example.org/vad#hasParentProcess',
    'vad:definesProcess', 'http://example.org/vad#definesProcess',
    'vad:isSubprocessTrig', 'http://example.org/vad#isSubprocessTrig'
];

const PTREE_PREDICATES = [
    'rdf:type', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    'rdfs:label', 'http://www.w3.org/2000/01/rdf-schema#label',
    'dcterms:description', 'http://purl.org/dc/terms/description',
    'vad:hasTrig', 'http://example.org/vad#hasTrig',
    'vad:hasParentProcess', 'http://example.org/vad#hasParentProcess',
    'vad:hasParentObj', 'http://example.org/vad#hasParentObj'
];

const RTREE_PREDICATES = [
    'rdf:type', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    'rdfs:label', 'http://www.w3.org/2000/01/rdf-schema#label',
    'vad:hasParentObj', 'http://example.org/vad#hasParentObj'
];

const TRIG_TYPES = {
    OBJECT_TREE: ['vad:ObjectTree', 'http://example.org/vad#ObjectTree'],
    TECH_TREE: ['vad:TechTree', 'http://example.org/vad#TechTree'],
    TECHNO_TREE: ['vad:TechnoTree', 'http://example.org/vad#TechnoTree'],
    PROCESS_TREE: ['vad:ProcessTree', 'http://example.org/vad#ProcessTree'],
    EXECUTOR_TREE: ['vad:ExecutorTree', 'http://example.org/vad#ExecutorTree'],
    VAD_PROCESS_DIA: ['vad:VADProcessDia', 'http://example.org/vad#VADProcessDia']
};

const PROCESS_SUBTYPES = {
    DETAILED: ['vad:Detailed', 'http://example.org/vad#Detailed'],
    DETAILED_CHILD: ['vad:DetailedChild', 'http://example.org/vad#DetailedChild'],
    DETAILED_EXTERNAL: ['vad:DetailedExternal', 'http://example.org/vad#DetailedExternal'],
    NOT_DETAILED: ['vad:notDetailed', 'http://example.org/vad#notDetailed'],
    NOT_DETAILED_CHILD: ['vad:notDetailedChild', 'http://example.org/vad#notDetailedChild'],
    NOT_DETAILED_EXTERNAL: ['vad:notDetailedExternal', 'http://example.org/vad#notDetailedExternal'],
    NOT_DEFINED_TYPE: ['vad:NotDefinedType', 'http://example.org/vad#NotDefinedType']
};

const TYPE_PREDICATE_MAP = {
    'vad:TypeProcess': {
        ptree: ['rdf:type', 'rdfs:label', 'dcterms:description', 'vad:hasTrig', 'vad:hasParentObj'],
        vadProcessDia: ['vad:isSubprocessTrig', 'vad:hasExecutor', 'vad:processSubtype', 'vad:hasNext']
    },
    'vad:TypeExecutor': {
        rtree: ['rdf:type', 'rdfs:label', 'vad:hasParentObj']
    },
    'vad:ExecutorGroup': {
        vadProcessDia: ['rdf:type', 'rdfs:label', 'vad:includes']
    },
    'vad:VADProcessDia': {
        vadProcessDia: ['rdf:type', 'rdfs:label', 'vad:hasParentObj', 'vad:definesProcess']
    },
    'vad:ObjectTree': {
        objectTree: ['rdf:type', 'rdfs:label', 'vad:hasParentObj']
    },
    'vad:TechTree': {
        techTree: ['rdf:type', 'rdfs:label']
    },
    'vad:ProcessTree': {
        ptree: ['rdf:type', 'rdfs:label', 'vad:hasParentObj']
    },
    'vad:ExecutorTree': {
        rtree: ['rdf:type', 'rdfs:label', 'vad:hasParentObj']
    }
};

// ============================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================================
let currentSvgElement = null;
let currentScale = 1.0;
let currentPrefixes = {};
// issue #334: nodeTypesCache удалён - заменён на getNodeTypes() функцию
// issue #334: nodeSubtypesCache удалён - заменён на getNodeSubtypes() функцию
// issue #324: currentQuads удалён - все операции через currentStore (N3.Store)
let nodeLabelToUri = {};
let selectedNodeElement = null;
let propertiesPanelCounter = 0;
let openPropertiesPanels = [];
let currentMode = Mode;
let draggedPanel = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let currentStore = null;
// Note: comunicaEngine is declared in vadlib_sparql.js
let currentDotCode = '';
// issue #324: virtualRDFdata удалён - виртуальные данные хранятся в TriG типа vad:Virtual (vt_*)
let smartDesignMode = 'filtered';
let activeFilters = [...getFilterConfig(Mode).hiddenPredicates];
let allPredicates = [];
let trigHierarchy = {};
let selectedTrigUri = null;
// issue #334: allTrigGraphs удалён - заменён на getAllTrigGraphs() функцию
// issue #301: Navigation history for diagram navigation (back/forward like browser)
let diagramNavigationHistory = [];
let diagramNavigationIndex = -1;
let isNewTrigQuery = false;
const PTREE_GRAPH_URI = 'http://example.org/vad#ptree';
const RTREE_GRAPH_URI = 'http://example.org/vad#rtree';
const TECHROOT_GRAPH_URI = 'http://example.org/vad#techroot';
// issue #264: VTREE_GRAPH_URI устарел - теперь используются отдельные TriG типа vad:Virtual (vt_*)
// Константа сохранена для обратной совместимости
const VTREE_GRAPH_URI = 'http://example.org/vad#vtree'; // @deprecated - use isVirtualGraph() instead
let techAppendixData = {
    loaded: false,
    predicateGroups: {},
    autoGeneratedPredicates: {},
    contextTriGTypes: {},
    quads: []  // issue #361: Квады из tech_Appendix.trig для добавления в общий quadstore (Вариант 2)
};

// Константа для URI графа технологических данных (Вариант 2: общий quadstore)
const TECHTREE_GRAPH_URI = 'http://example.org/vad#techtree';

// issue #359: Константа для URI графа базовой онтологии VAD
const VADONTOLOGY_GRAPH_URI = 'http://example.org/vad#VADontology';

// issue #359: Данные базовой онтологии VAD (для semantic reasoning)
let vadOntologyData = {
    loaded: false,
    quads: []  // Квады из vad-basic-ontology.trig для semantic reasoning
};

// Режимы фильтрации TriG в окне RDF данные
// issue #262, #264: Расширенные режимы фильтрации
// issue #359: Добавлен режим VADONTOLOGY для просмотра базовой онтологии
const TRIG_FILTER_MODES = {
    ALL: 'all',                       // Все TriG (full quadstore без фильтров)
    NO_TECH: 'noTech',                // Без TechnoTree (устаревший, сохранён для совместимости)
    ONLY_TECH: 'onlyTech',            // Только TechnoTree (устаревший, сохранён для совместимости)
    OBJECT_TREE: 'objectTree',        // Только ObjectTree (концепты процесса и исполнителя: ptree, rtree)
    VAD_PROCESS_DIA: 'vadProcessDia', // Только VADProcessDia (схемы процессов с индивидами)
    OBJECT_TREE_PLUS_VAD: 'objectTreePlusVad', // ObjectTree + VADProcessDia (по умолчанию)
    VIRTUAL: 'virtual',               // Только Virtual (виртуальный TriG вычисляемых параметров) - issue #264
    TECHTREE: 'techtree',             // issue #361: Только techtree (vad-basic-ontology_tech_Appendix.trig)
    VADONTOLOGY: 'vadontology'        // issue #359: Базовая онтология VAD (vad-basic-ontology.trig)
};

// issue #264: Текущий режим фильтрации TriG (по умолчанию - ObjectTree + VADProcessDia)
let currentTrigFilterMode = TRIG_FILTER_MODES.OBJECT_TREE_PLUS_VAD;

const PROCESS_OBJECT_PREDICATES = [
    'vad:hasNext', 'http://example.org/vad#hasNext'
];

const defaultSparqlQuery = `SELECT ?s ?p ?o\nWHERE {\n    ?s ?p ?o .\n}`;

const formatMapping = {
    'turtle': 'ttl', 'n-triples': 'nt', 'n-quads': 'nq', 'trig': 'trig'
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

function getLocalName(uri) {
    if (typeof uri !== 'string') return String(uri);
    const hashIndex = uri.lastIndexOf('#');
    const slashIndex = uri.lastIndexOf('/');
    const splitIndex = Math.max(hashIndex, slashIndex);
    if (splitIndex !== -1 && splitIndex < uri.length - 1) {
        return uri.substring(splitIndex + 1);
    }
    return uri;
}

function getPrefixedName(uri, prefixes) {
    if (typeof uri !== 'string') return String(uri);
    for (const [prefix, namespace] of Object.entries(prefixes)) {
        if (uri.startsWith(namespace)) {
            const localName = uri.substring(namespace.length);
            return prefix + ':' + localName;
        }
    }
    return getLocalName(uri);
}

/**
 * issue #410: Форматирует текст для отображения в dropdown справочниках
 * Возвращает строку в формате "id (label)" если label отличается от id,
 * иначе возвращает только id
 *
 * @param {string} uri - URI объекта
 * @param {string} label - Метка объекта (rdfs:label)
 * @param {Object} prefixes - Объект префиксов для преобразования URI
 * @returns {string} Форматированный текст для отображения
 */
function formatDropdownDisplayText(uri, label, prefixes) {
    // Получаем prefixed форму URI (например, vad:p1)
    const id = typeof getPrefixedName === 'function'
        ? getPrefixedName(uri, prefixes)
        : uri;

    // Если label не задан или совпадает с id, возвращаем только id
    if (!label || label === id || label === uri) {
        return id;
    }

    // Возвращаем формат "id (label)"
    return `${id} (${label})`;
}

function escapeDotString(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function generateNodeId(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        const char = value.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'node' + Math.abs(hash);
}

function generateVadNodeId(uri, prefixes) {
    const prefixedName = getPrefixedName(uri, prefixes);
    return prefixedName.replace(/[:\-\.\s]/g, '_');
}

function isNameOrLabelPredicate(predicateLabel) {
    const lowerPredicate = predicateLabel.toLowerCase();
    return lowerPredicate.includes('name') || lowerPredicate.includes('label');
}

function escapeHtmlLabel(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function wrapTextByWords(text, maxLength) {
    if (!text || text.length <= maxLength) return [text];
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';
    for (const word of words) {
        if (currentLine.length === 0) { currentLine = word; }
        else if (currentLine.length + 1 + word.length <= maxLength) { currentLine += ' ' + word; }
        else { lines.push(currentLine); currentLine = word; }
    }
    if (currentLine.length > 0) lines.push(currentLine);
    return lines;
}

function formatLabelWithWrap(label, maxLength, isBold = false) {
    const lines = wrapTextByWords(label, maxLength);
    const needsWrap = lines.length > 1;
    if (!needsWrap) {
        if (isBold) return `<B>${escapeHtmlLabel(label)}</B>`;
        return escapeHtmlLabel(label);
    }
    let result = '';
    for (let i = 0; i < lines.length; i++) {
        if (i > 0) result += '<BR/>';
        const escapedLine = escapeHtmlLabel(lines[i]);
        if (isBold) { result += `<FONT POINT-SIZE="9"><B>${escapedLine}</B></FONT>`; }
        else { result += `<FONT POINT-SIZE="9">${escapedLine}</FONT>`; }
    }
    return result;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPtreePredicate(predicateUri) {
    return PTREE_PREDICATES.some(allowed =>
        predicateUri === allowed || predicateUri.endsWith('#' + allowed.split(':')[1])
    );
}

function isRtreePredicate(predicateUri) {
    return RTREE_PREDICATES.some(allowed =>
        predicateUri === allowed || predicateUri.endsWith('#' + allowed.split(':')[1])
    );
}

// ============================================================================
// SPARQL-DRIVEN ФУНКЦИИ ДЛЯ РАБОТЫ С ТИПАМИ И ПОДТИПАМИ
// issue #334: Замена nodeTypesCache, nodeSubtypesCache, allTrigGraphs на SPARQL-запросы
// ============================================================================

/**
 * issue #334: Получает типы узла через currentStore.getQuads()
 * Замена nodeTypesCache[subjectUri] на SPARQL-driven подход
 *
 * @param {string} subjectUri - URI субъекта
 * @returns {Array<string>} - Массив типов (и полные URI, и prefixed names)
 */
function getNodeTypes(subjectUri) {
    if (!currentStore || !subjectUri) return [];

    const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

    // Получаем все rdf:type квады для данного субъекта
    const quads = currentStore.getQuads(
        subjectUri,
        RDF_TYPE,
        null,
        null
    );

    const types = [];
    quads.forEach(quad => {
        const typeUri = quad.object.value;
        // Добавляем полный URI
        if (!types.includes(typeUri)) {
            types.push(typeUri);
        }
        // Добавляем prefixed name
        const prefixedType = getPrefixedName(typeUri, currentPrefixes);
        if (prefixedType !== typeUri && !types.includes(prefixedType)) {
            types.push(prefixedType);
        }
    });

    return types;
}

/**
 * issue #334: Получает подтипы процесса через currentStore.getQuads()
 * Замена nodeSubtypesCache[subjectUri] на SPARQL-driven подход
 *
 * @param {string} subjectUri - URI субъекта (процесса)
 * @returns {Array<string>} - Массив подтипов (и полные URI, и prefixed names)
 */
function getNodeSubtypes(subjectUri) {
    if (!currentStore || !subjectUri) return [];

    const PROCESS_SUBTYPE = 'http://example.org/vad#processSubtype';

    // Получаем все vad:processSubtype квады для данного субъекта
    const quads = currentStore.getQuads(
        subjectUri,
        PROCESS_SUBTYPE,
        null,
        null
    );

    const subtypes = [];
    quads.forEach(quad => {
        const subtypeUri = quad.object.value;
        // Добавляем полный URI
        if (!subtypes.includes(subtypeUri)) {
            subtypes.push(subtypeUri);
        }
        // Добавляем prefixed name
        const prefixedSubtype = getPrefixedName(subtypeUri, currentPrefixes);
        if (prefixedSubtype !== subtypeUri && !subtypes.includes(prefixedSubtype)) {
            subtypes.push(prefixedSubtype);
        }
    });

    return subtypes;
}

/**
 * issue #334: Получает все уникальные графы из currentStore
 * Замена allTrigGraphs на SPARQL-driven подход
 *
 * @returns {Array<string>} - Массив URI всех графов
 */
function getAllTrigGraphs() {
    if (!currentStore) return [];

    const quads = currentStore.getQuads(null, null, null, null);
    const graphSet = new Set();

    quads.forEach(quad => {
        if (quad.graph && quad.graph.value) {
            graphSet.add(quad.graph.value);
        }
    });

    return Array.from(graphSet);
}

function isSubjectVadProcess(subjectUri) {
    // issue #334: Используем getNodeTypes() вместо nodeTypesCache
    const types = getNodeTypes(subjectUri);
    return types.some(t => t === 'vad:TypeProcess' || t === 'http://example.org/vad#TypeProcess');
}

function isSubjectVadExecutor(subjectUri) {
    // issue #334: Используем getNodeTypes() вместо nodeTypesCache
    const types = getNodeTypes(subjectUri);
    return types.some(t => t === 'vad:TypeExecutor' || t === 'http://example.org/vad#TypeExecutor');
}

function isProcessTreeType(typeUri) {
    return TRIG_TYPES.PROCESS_TREE.some(t => typeUri === t || typeUri.endsWith('#ProcessTree'));
}

function isExecutorTreeType(typeUri) {
    return TRIG_TYPES.EXECUTOR_TREE.some(t => typeUri === t || typeUri.endsWith('#ExecutorTree'));
}

function isVADProcessDiaType(typeUri) {
    return TRIG_TYPES.VAD_PROCESS_DIA.some(t => typeUri === t || typeUri.endsWith('#VADProcessDia'));
}

function isDetailedSubtype(subtypeUri) {
    return PROCESS_SUBTYPES.DETAILED.some(t => subtypeUri === t || subtypeUri.endsWith('#Detailed')) ||
           PROCESS_SUBTYPES.DETAILED_CHILD.some(t => subtypeUri === t || subtypeUri.endsWith('#DetailedChild')) ||
           PROCESS_SUBTYPES.DETAILED_EXTERNAL.some(t => subtypeUri === t || subtypeUri.endsWith('#DetailedExternal'));
}

function isNotDetailedSubtype(subtypeUri) {
    return PROCESS_SUBTYPES.NOT_DETAILED.some(t => subtypeUri === t || subtypeUri.endsWith('#notDetailed')) ||
           PROCESS_SUBTYPES.NOT_DETAILED_CHILD.some(t => subtypeUri === t || subtypeUri.endsWith('#notDetailedChild')) ||
           PROCESS_SUBTYPES.NOT_DETAILED_EXTERNAL.some(t => subtypeUri === t || subtypeUri.endsWith('#notDetailedExternal'));
}

function isNotDefinedTypeSubtype(subtypeUri) {
    return PROCESS_SUBTYPES.NOT_DEFINED_TYPE.some(t => subtypeUri === t || subtypeUri.endsWith('#NotDefinedType'));
}

function getProcessSubtypeName(subtypeUri) {
    if (PROCESS_SUBTYPES.DETAILED_CHILD.some(t => subtypeUri === t || subtypeUri.endsWith('#DetailedChild'))) return 'DetailedChild';
    if (PROCESS_SUBTYPES.DETAILED_EXTERNAL.some(t => subtypeUri === t || subtypeUri.endsWith('#DetailedExternal'))) return 'DetailedExternal';
    if (PROCESS_SUBTYPES.NOT_DETAILED_CHILD.some(t => subtypeUri === t || subtypeUri.endsWith('#notDetailedChild'))) return 'notDetailedChild';
    if (PROCESS_SUBTYPES.NOT_DETAILED_EXTERNAL.some(t => subtypeUri === t || subtypeUri.endsWith('#notDetailedExternal'))) return 'notDetailedExternal';
    if (PROCESS_SUBTYPES.NOT_DEFINED_TYPE.some(t => subtypeUri === t || subtypeUri.endsWith('#NotDefinedType'))) return 'NotDefinedType';
    if (PROCESS_SUBTYPES.DETAILED.some(t => subtypeUri === t || subtypeUri.endsWith('#Detailed'))) return 'Detailed';
    if (PROCESS_SUBTYPES.NOT_DETAILED.some(t => subtypeUri === t || subtypeUri.endsWith('#notDetailed'))) return 'notDetailed';
    return null;
}

function isPredicateHidden(predicateUri, predicateLabel) {
    return activeFilters.includes(predicateUri) || activeFilters.includes(predicateLabel);
}

function generateSparqlPrefixes(prefixes) {
    if (!prefixes || Object.keys(prefixes).length === 0) return '';
    let prefixLines = [];
    for (const [prefix, uri] of Object.entries(prefixes)) {
        prefixLines.push(`PREFIX ${prefix}: <${uri}>`);
    }
    return prefixLines.join('\n') + '\n\n';
}

function isProcessObjectPredicate(predicateUri) {
    return PROCESS_OBJECT_PREDICATES.some(allowed =>
        predicateUri === allowed || predicateUri.endsWith('#hasNext')
    );
}

function normalizeUri(uri) {
    if (!uri) return uri;
    for (const [prefix, namespace] of Object.entries(currentPrefixes)) {
        if (uri.startsWith(prefix + ':')) {
            return namespace + uri.substring(prefix.length + 1);
        }
    }
    return uri;
}

function getTrigContext(trigUri) {
    if (!trigUri) return '';
    if (trigUri === 'vad:ptree' || trigUri === 'http://example.org/vad#ptree' || trigUri.endsWith('#ptree')) return 'ptree';
    if (trigUri === 'vad:rtree' || trigUri === 'http://example.org/vad#rtree' || trigUri.endsWith('#rtree')) return 'rtree';
    return 'vadProcessDia';
}

function getPredicatesForSubjectType(subjectType, trigContext) {
    const typeConfig = TYPE_PREDICATE_MAP[subjectType];
    if (!typeConfig) return [];
    if (trigContext === 'ptree' && typeConfig.ptree) return typeConfig.ptree;
    if (trigContext === 'rtree' && typeConfig.rtree) return typeConfig.rtree;
    if (trigContext === 'vadProcessDia' && typeConfig.vadProcessDia) return typeConfig.vadProcessDia;
    return [];
}

// copyObjectId перемещён в vadlib_ui.js

// ============================================================================
// ЗАГРУЗКА ТЕХНОЛОГИЧЕСКОГО ПРИЛОЖЕНИЯ (issue #234: перенесено из ver8tree)
// ============================================================================

/**
 * issue #361: Загружает vad-basic-ontology_tech_Appendix.trig и парсит технологические объекты
 * Вызывается при старте приложения
 *
 * Вариант 2 (issue #260): Технологические данные добавляются в общий quadstore
 * как отдельный TriG vad:techtree. Fallback предикаты НЕ используются -
 * только загруженные данные из файла.
 *
 * issue #361: Изменён формат файла с .ttl на .trig для совместимости
 * с архитектурой quadstore (Правило 2: "В Quadstore хранятся только данные в формате TriG")
 */
async function loadTechAppendix() {
    const defaultPath = 'ontology/vad-basic-ontology_tech_Appendix.trig';
    // Вычисляем полный путь для информативных сообщений об ошибках
    const fullPath = new URL(defaultPath, window.location.href).href;

    try {
        const response = await fetch(defaultPath);
        if (!response.ok) {
            throw new Error(`Файл не найден: ${fullPath}`);
        }

        const trigContent = await response.text();
        await parseTechAppendix(trigContent);

        techAppendixData.loaded = true;
        console.log('Tech appendix loaded successfully');
        console.log('Predicate groups:', Object.keys(techAppendixData.predicateGroups).length);
        console.log('Auto-generated predicates:', Object.keys(techAppendixData.autoGeneratedPredicates).length);
        console.log('Tech quads count:', techAppendixData.quads.length);

    } catch (error) {
        console.error('Error loading tech appendix:', error);

        // Показываем диалог с ошибкой и предложением выбрать файл
        showFileNotFoundDialog({
            title: 'Ошибка загрузки технологического приложения',
            message: `Файл не найден по пути: ${fullPath}`,
            fileType: '.trig',
            onFileSelected: async (file) => {
                try {
                    const content = await file.text();
                    await parseTechAppendix(content);
                    techAppendixData.loaded = true;
                    showSuccessNotification('Технологическое приложение загружено из файла: ' + file.name);
                } catch (parseError) {
                    showErrorNotification(`Ошибка парсинга: ${parseError.message}`);
                }
            }
        });
    }
}

/**
 * issue #361: Парсит содержимое vad-basic-ontology_tech_Appendix.trig
 * Отдельная функция для повторного использования при выборе файла вручную
 * @param {string} trigContent - Содержимое TriG файла
 */
async function parseTechAppendix(trigContent) {
    // issue #361: Парсим TriG файл (не TTL) с использованием Promise для ожидания завершения
    const techQuads = await new Promise((resolve, reject) => {
        const parser = new N3.Parser({ format: 'application/trig' });
        const quads = [];

        parser.parse(trigContent, (error, quad, prefixes) => {
            if (error) {
                reject(error);
                return;
            }
            if (quad) {
                quads.push(quad);
            } else {
                // quad is null, parsing is complete
                resolve(quads);
            }
        });
    });

    // issue #361: TriG файл уже содержит именованный граф vad:techtree,
    // поэтому квады используются напрямую без преобразования
    techAppendixData.quads = techQuads;

    // Извлекаем группы предикатов
    extractPredicateGroups(techQuads);
}

// UI функции showFileNotFoundDialog, showSuccessNotification, showErrorNotification
// перемещены в vadlib_ui.js

/**
 * Добавляет технологические квады в общий quadstore (Вариант 2)
 * Вызывается после загрузки пользовательских данных
 *
 * issue #322: Миграция к единому хранилищу - используем только currentStore
 */
function addTechQuadsToStore() {
    if (!techAppendixData.loaded || techAppendixData.quads.length === 0) {
        console.log('addTechQuadsToStore: Tech appendix not loaded or empty');
        return;
    }

    // issue #322: Проверяем наличие currentStore
    if (!currentStore) {
        console.error('addTechQuadsToStore: currentStore not initialized');
        return;
    }

    // issue #322: Проверяем дубликаты через currentStore.getQuads()
    const techQuadsToAdd = techAppendixData.quads.filter(techQuad => {
        // Проверяем, нет ли уже этого квада в store
        const existing = currentStore.getQuads(
            techQuad.subject,
            techQuad.predicate,
            techQuad.object,
            techQuad.graph
        );
        return existing.length === 0;
    });

    if (techQuadsToAdd.length > 0) {
        // issue #322: Добавляем только в currentStore (без currentQuads)
        techQuadsToAdd.forEach(quad => currentStore.addQuad(quad));
        console.log(`Added ${techQuadsToAdd.length} tech quads to store`);
    }
}

/**
 * Удаляет технологические квады из общего quadstore
 * Используется при очистке данных (сохраняем techtree неизменным)
 *
 * issue #322: Миграция к единому хранилищу - работаем напрямую с currentStore
 */
function removeTechQuadsFromStore() {
    // issue #322: Удаляем квады напрямую из currentStore
    if (!currentStore) {
        return;
    }

    // Получаем все квады из techtree графа
    const techQuads = currentStore.getQuads(null, null, null, TECHTREE_GRAPH_URI);

    // Удаляем каждый квад
    techQuads.forEach(quad => currentStore.removeQuad(quad));

    if (techQuads.length > 0) {
        console.log(`Removed ${techQuads.length} tech quads from store`);
    }
}

// ============================================================================
// issue #359: ЗАГРУЗКА БАЗОВОЙ ОНТОЛОГИИ VAD ДЛЯ SEMANTIC REASONING
// ============================================================================

/**
 * issue #359: Загружает vad-basic-ontology.trig и парсит базовую онтологию
 * Вызывается при старте приложения для поддержки semantic reasoning
 *
 * Онтология загружается в граф vad:VADontology и используется для:
 * - RDFS/OWL reasoning через comunica-feature-reasoning
 * - Семантического вывода типов и подтипов процессов
 * - Замены жёстко закодированных констант на SPARQL-запросы к онтологии
 */
async function loadVADOntology() {
    const defaultPath = 'ontology/vad-basic-ontology.trig';
    // Вычисляем полный путь для информативных сообщений об ошибках
    const fullPath = new URL(defaultPath, window.location.href).href;

    try {
        const response = await fetch(defaultPath);
        if (!response.ok) {
            throw new Error(`Файл не найден: ${fullPath}`);
        }

        const trigContent = await response.text();
        await parseVADOntology(trigContent);

        vadOntologyData.loaded = true;
        console.log('VAD ontology loaded successfully');
        console.log('VAD ontology quads count:', vadOntologyData.quads.length);

    } catch (error) {
        console.error('Error loading VAD ontology:', error);

        // Показываем диалог с ошибкой и предложением выбрать файл
        showFileNotFoundDialog({
            title: 'Ошибка загрузки базовой онтологии VAD',
            message: `Файл не найден по пути: ${fullPath}`,
            fileType: '.trig',
            onFileSelected: async (file) => {
                try {
                    const content = await file.text();
                    await parseVADOntology(content);
                    vadOntologyData.loaded = true;
                    showSuccessNotification('Базовая онтология VAD загружена из файла: ' + file.name);
                } catch (parseError) {
                    showErrorNotification(`Ошибка парсинга: ${parseError.message}`);
                }
            }
        });
    }
}

/**
 * issue #359: Парсит содержимое vad-basic-ontology.trig
 * Отдельная функция для повторного использования при выборе файла вручную
 * @param {string} trigContent - Содержимое TriG файла
 */
async function parseVADOntology(trigContent) {
    // Парсим TriG файл с использованием Promise для ожидания завершения
    const ontologyQuads = await new Promise((resolve, reject) => {
        const parser = new N3.Parser({ format: 'application/trig' });
        const quads = [];

        parser.parse(trigContent, (error, quad, prefixes) => {
            if (error) {
                reject(error);
                return;
            }
            if (quad) {
                quads.push(quad);
            } else {
                // quad is null, parsing is complete
                resolve(quads);
            }
        });
    });

    // Сохраняем квады (TriG уже содержит именованный граф vad:VADontology)
    vadOntologyData.quads = ontologyQuads;
}

/**
 * issue #359: Добавляет квады базовой онтологии VAD в общий quadstore
 * Вызывается после загрузки пользовательских данных
 */
function addVADOntologyQuadsToStore() {
    if (!vadOntologyData.loaded || vadOntologyData.quads.length === 0) {
        console.log('addVADOntologyQuadsToStore: VAD ontology not loaded or empty');
        return;
    }

    if (!currentStore) {
        console.error('addVADOntologyQuadsToStore: currentStore not initialized');
        return;
    }

    // Проверяем дубликаты через currentStore.getQuads()
    const ontologyQuadsToAdd = vadOntologyData.quads.filter(ontologyQuad => {
        const existing = currentStore.getQuads(
            ontologyQuad.subject,
            ontologyQuad.predicate,
            ontologyQuad.object,
            ontologyQuad.graph
        );
        return existing.length === 0;
    });

    if (ontologyQuadsToAdd.length > 0) {
        ontologyQuadsToAdd.forEach(quad => currentStore.addQuad(quad));
        console.log(`Added ${ontologyQuadsToAdd.length} VAD ontology quads to store`);
    }
}

/**
 * issue #359: Удаляет квады базовой онтологии VAD из общего quadstore
 * Используется при очистке данных
 */
function removeVADOntologyQuadsFromStore() {
    if (!currentStore) {
        return;
    }

    // Получаем все квады из VADontology графа
    const ontologyQuads = currentStore.getQuads(null, null, null, VADONTOLOGY_GRAPH_URI);

    // Удаляем каждый квад
    ontologyQuads.forEach(quad => currentStore.removeQuad(quad));

    if (ontologyQuads.length > 0) {
        console.log(`Removed ${ontologyQuads.length} VAD ontology quads from store`);
    }
}

/**
 * Проверяет, является ли граф типом TechnoTree
 * @param {string} graphUri - URI графа
 * @returns {boolean} - true если граф типа TechnoTree
 */
function isTechnoTreeGraph(graphUri) {
    if (!graphUri) return false;
    // issue #264: TechnoTree графы: techtree, techroot (vtree устарел)
    // issue #359: Добавлен VADontology как TechnoTree
    // Также включает Virtual графы (vt_*) для обратной совместимости
    return graphUri === TECHTREE_GRAPH_URI ||
           graphUri === VADONTOLOGY_GRAPH_URI || // issue #359: VAD basic ontology
           graphUri === VTREE_GRAPH_URI || // @deprecated - для обратной совместимости
           graphUri === TECHROOT_GRAPH_URI ||
           graphUri.endsWith('#techtree') ||
           graphUri.endsWith('#VADontology') || // issue #359
           graphUri.endsWith('#vtree') || // @deprecated
           graphUri.endsWith('#techroot') ||
           isVirtualGraph(graphUri); // issue #264: Virtual графы (vt_*)
}

/**
 * issue #359: Проверяет, является ли граф базовой онтологией VAD
 * @param {string} graphUri - URI графа
 * @returns {boolean} - true если граф типа VADontology
 */
function isVADOntologyGraph(graphUri) {
    if (!graphUri) return false;
    return graphUri === VADONTOLOGY_GRAPH_URI ||
           graphUri.endsWith('#VADontology');
}

/**
 * Проверяет, является ли граф типом ObjectTree (ptree или rtree)
 * @param {string} graphUri - URI графа
 * @returns {boolean} - true если граф типа ObjectTree
 */
function isObjectTreeGraph(graphUri) {
    if (!graphUri) return false;
    return graphUri === PTREE_GRAPH_URI ||
           graphUri === RTREE_GRAPH_URI ||
           graphUri.endsWith('#ptree') ||
           graphUri.endsWith('#rtree');
}

/**
 * Проверяет, является ли граф типом VADProcessDia
 * Все графы кроме root, ptree, rtree, techtree, vtree, techroot, VADontology и vt_* считаются VADProcessDia
 * @param {string} graphUri - URI графа
 * @returns {boolean} - true если граф типа VADProcessDia
 */
function isVADProcessDiaGraph(graphUri) {
    if (!graphUri) return false;
    // Исключаем служебные графы
    if (graphUri.endsWith('#root') ||
        graphUri.endsWith('#ptree') ||
        graphUri.endsWith('#rtree') ||
        graphUri.endsWith('#techtree') ||
        graphUri.endsWith('#vtree') ||
        graphUri.endsWith('#techroot') ||
        graphUri.endsWith('#VADontology')) { // issue #359: Исключаем VADontology
        return false;
    }
    // issue #264: Исключаем виртуальные графы типа vad:Virtual (vt_*)
    if (isVirtualGraph(graphUri)) {
        return false;
    }
    // issue #359: Исключаем VADontology граф
    if (isVADOntologyGraph(graphUri)) {
        return false;
    }
    return true;
}

/**
 * issue #264, #270: Проверяет, является ли граф виртуальным (vad:Virtual)
 *
 * Стратегия проверки (issue #270 - SPARQL-driven programming):
 * 1. Первичная проверка: через rdf:type vad:Virtual в N3.Store (SPARQL-driven)
 * 2. Fallback: проверка имени vt_* (для обратной совместимости до загрузки данных)
 *
 * Согласно store_concept_v3.md:
 * - Для критичных по производительности операций используем синхронную проверку
 * - Имя vt_* ДОЛЖНО соответствовать типу vad:Virtual (правило валидации)
 *
 * @param {string} graphUri - URI графа
 * @returns {boolean} - true если граф типа Virtual
 */
function isVirtualGraph(graphUri) {
    if (!graphUri) return false;

    // issue #270: Первичная проверка через rdf:type vad:Virtual (SPARQL-driven)
    // Используем синхронную версию isVirtualGraphByType если доступен currentStore
    if (currentStore && typeof isVirtualGraphByType === 'function') {
        const byType = isVirtualGraphByType(graphUri);
        if (byType) return true;
    }

    // Fallback: проверка по имени vt_* (для обратной совместимости)
    // Виртуальные графы имеют формат vad:vt_* (v=virtual, t=trig)
    const localName = getLocalName(graphUri);
    return localName.startsWith('vt_');
}

/**
 * Возвращает отфильтрованные квады в зависимости от режима фильтрации
 * issue #262, #264: Расширенные режимы фильтрации
 * issue #270: Phase 1 - Использует currentStore.getQuads() вместо currentQuads
 * issue #324: currentQuads удалён - только currentStore
 * @param {string} filterMode - Режим фильтрации
 * @returns {Array} - Отфильтрованный массив квадов
 */
function getFilteredQuads(filterMode = TRIG_FILTER_MODES.OBJECT_TREE_PLUS_VAD) {
    // issue #324: Используем только currentStore.getQuads() как источник данных
    const sourceQuads = (currentStore && typeof currentStore.getQuads === 'function')
        ? currentStore.getQuads(null, null, null, null)
        : [];

    if (!sourceQuads || sourceQuads.length === 0) {
        return [];
    }

    switch(filterMode) {
        case TRIG_FILTER_MODES.ALL:
            // Все TriG (full quadstore без фильтров)
            return sourceQuads;

        case TRIG_FILTER_MODES.NO_TECH:
            // Без TechnoTree (устаревший, сохранён для совместимости)
            return sourceQuads.filter(quad => !isTechnoTreeGraph(quad.graph?.value));

        case TRIG_FILTER_MODES.ONLY_TECH:
            // Только TechnoTree (устаревший, сохранён для совместимости)
            return sourceQuads.filter(quad => isTechnoTreeGraph(quad.graph?.value));

        case TRIG_FILTER_MODES.OBJECT_TREE:
            // ObjectTree (концепты процесса и исполнителя: ptree, rtree)
            return sourceQuads.filter(quad => isObjectTreeGraph(quad.graph?.value));

        case TRIG_FILTER_MODES.VAD_PROCESS_DIA:
            // VADProcessDia (схемы процессов с индивидами)
            return sourceQuads.filter(quad => isVADProcessDiaGraph(quad.graph?.value));

        case TRIG_FILTER_MODES.OBJECT_TREE_PLUS_VAD:
            // ObjectTree + VADProcessDia (по умолчанию)
            return sourceQuads.filter(quad => {
                const graphUri = quad.graph?.value;
                return isObjectTreeGraph(graphUri) || isVADProcessDiaGraph(graphUri);
            });

        case TRIG_FILTER_MODES.VIRTUAL:
            // issue #264: Virtual (виртуальный TriG вычисляемых параметров)
            // Включает все графы типа vad:Virtual (vt_*)
            return sourceQuads.filter(quad => isVirtualGraph(quad.graph?.value));

        case TRIG_FILTER_MODES.TECHTREE:
            // issue #361: TechTree (vad-basic-ontology_tech_Appendix.trig)
            return sourceQuads.filter(quad =>
                quad.graph?.value === TECHTREE_GRAPH_URI ||
                quad.graph?.value?.endsWith('#techtree')
            );

        case TRIG_FILTER_MODES.VADONTOLOGY:
            // issue #359: VADontology (vad-basic-ontology.trig - базовая онтология)
            return sourceQuads.filter(quad => isVADOntologyGraph(quad.graph?.value));

        default:
            // issue #264: По умолчанию - ObjectTree + VADProcessDia
            return sourceQuads.filter(quad => {
                const graphUri = quad.graph?.value;
                return isObjectTreeGraph(graphUri) || isVADProcessDiaGraph(graphUri);
            });
    }
}

/**
 * Извлекает группы предикатов из технологических объектов
 */
function extractPredicateGroups(quads) {
    const VAD_NS = 'http://example.org/vad#';

    quads.forEach(quad => {
        const subject = quad.subject.value;
        const predicate = quad.predicate.value;
        const object = quad.object.value;

        // Извлекаем includePredicate
        if (predicate === VAD_NS + 'includePredicate' ||
            predicate.endsWith('#includePredicate')) {
            if (!techAppendixData.predicateGroups[subject]) {
                techAppendixData.predicateGroups[subject] = [];
            }
            techAppendixData.predicateGroups[subject].push(object);
        }

        // Извлекаем autoGeneratedPredicate
        if (predicate === VAD_NS + 'autoGeneratedPredicate' ||
            predicate.endsWith('#autoGeneratedPredicate')) {
            if (!techAppendixData.autoGeneratedPredicates[subject]) {
                techAppendixData.autoGeneratedPredicates[subject] = [];
            }
            techAppendixData.autoGeneratedPredicates[subject].push(object);
        }

        // Извлекаем contextTriGType
        if (predicate === VAD_NS + 'contextTriGType' ||
            predicate.endsWith('#contextTriGType')) {
            techAppendixData.contextTriGTypes[subject] = object;
        }

        // Извлекаем hasNodeStyle (стили узлов в формате DOT)
        if (predicate === VAD_NS + 'hasNodeStyle' ||
            predicate.endsWith('#hasNodeStyle')) {
            if (!techAppendixData.nodeStyles) {
                techAppendixData.nodeStyles = {};
            }
            if (!techAppendixData.nodeStyles[subject]) {
                techAppendixData.nodeStyles[subject] = {};
            }
            techAppendixData.nodeStyles[subject].dot = object;
        }

        // Извлекаем styleLegendLabel (названия для легенды)
        if (predicate === VAD_NS + 'styleLegendLabel' ||
            predicate.endsWith('#styleLegendLabel')) {
            if (!techAppendixData.nodeStyles) {
                techAppendixData.nodeStyles = {};
            }
            if (!techAppendixData.nodeStyles[subject]) {
                techAppendixData.nodeStyles[subject] = {};
            }
            techAppendixData.nodeStyles[subject].label = object;
        }
    });

    // После извлечения стилей, обновляем VADNodeStyles
    updateVADNodeStylesFromTech();
}

/**
 * Обновляет VADNodeStyles на основе стилей из tech appendix
 * Стили из TTL имеют приоритет над встроенными стилями
 */
function updateVADNodeStylesFromTech() {
    if (!techAppendixData.nodeStyles) return;

    const VAD_NS = 'http://example.org/vad#';

    for (const [subjectUri, styleData] of Object.entries(techAppendixData.nodeStyles)) {
        if (!styleData.dot) continue;

        // Извлекаем имя подтипа из URI (например, http://example.org/vad#DetailedChild -> DetailedChild)
        let subtypeName = subjectUri;
        if (subjectUri.startsWith(VAD_NS)) {
            subtypeName = subjectUri.substring(VAD_NS.length);
        }

        // Ищем соответствующий стиль в VADNodeStyles
        const styleMapping = {
            'DetailedChild': 'ProcessStyleDetailedChild',
            'DetailedExternal': 'ProcessStyleDetailedExternal',
            'notDetailedChild': 'ProcessStyleNotDetailedChild',
            'notDetailedExternal': 'ProcessStyleNotDetailedExternal',
            'NotDefinedType': 'ProcessStyleNotDefinedType'
        };

        const styleName = styleMapping[subtypeName];
        if (styleName && typeof VADNodeStyles !== 'undefined' && VADNodeStyles[styleName]) {
            // Обновляем DOT-стиль из TTL
            VADNodeStyles[styleName].dot = styleData.dot;
            // Обновляем label если указан
            if (styleData.label) {
                VADNodeStyles[styleName].label = styleData.label;
            }
            console.log(`Updated style ${styleName} from TTL:`, styleData);
        }
    }
}

/**
 * Получает предикаты для заданного технологического объекта
 * @param {string} techObjectUri - URI технологического объекта
 * @returns {Array} - Массив URI предикатов
 */
function getPredicatesFromTechObject(techObjectUri) {
    // Нормализуем URI
    let normalizedUri = techObjectUri;
    if (techObjectUri.startsWith('vad:')) {
        normalizedUri = 'http://example.org/vad#' + techObjectUri.substring(4);
    }

    return techAppendixData.predicateGroups[normalizedUri] || [];
}

/**
 * Проверяет, является ли предикат автоматически генерируемым
 * Если techObjectUri не указан, проверяет во всех технологических объектах
 * @param {string} predicateUri - URI предиката
 * @param {string} [techObjectUri] - URI технологического объекта (опционально)
 * @returns {boolean}
 */
function isAutoGeneratedPredicate(predicateUri, techObjectUri) {
    if (!predicateUri) return false;

    let normalizedPredUri = predicateUri;
    if (predicateUri.startsWith('vad:')) {
        normalizedPredUri = 'http://example.org/vad#' + predicateUri.substring(4);
    }

    // Если techObjectUri указан, проверяем только в этом объекте
    if (techObjectUri) {
        let normalizedTechUri = techObjectUri;
        if (techObjectUri.startsWith('vad:')) {
            normalizedTechUri = 'http://example.org/vad#' + techObjectUri.substring(4);
        }
        const autoGenerated = techAppendixData.autoGeneratedPredicates[normalizedTechUri] || [];
        return autoGenerated.includes(normalizedPredUri);
    }

    // Если techObjectUri не указан, проверяем во всех технологических объектах
    for (const techUri in techAppendixData.autoGeneratedPredicates) {
        const autoGenerated = techAppendixData.autoGeneratedPredicates[techUri];
        if (autoGenerated && autoGenerated.includes(normalizedPredUri)) {
            return true;
        }
    }
    return false;
}

