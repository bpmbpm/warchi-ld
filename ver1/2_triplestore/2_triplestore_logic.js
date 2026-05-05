// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/232
// 2_triplestore_logic.js - Логика парсинга и валидации RDF данных

/**
 * Валидирует RDF триплеты на соответствие схеме VAD онтологии
 *
 * Проверяет, что все предикаты и типы объектов в RDF данных соответствуют
 * разрешенным значениям, определенным в VAD онтологии (VAD_ALLOWED_PREDICATES,
 * VAD_ALLOWED_TYPES). Используется для проверки корректности данных перед
 * визуализацией и при ручном тестировании через кнопку "Тест".
 *
 * @param {Array} quads - Массив RDF квадов (N3.js quad objects)
 * @param {Object} prefixes - Объект с префиксами {prefix: namespace}
 * @returns {Object} Результат валидации с полями:
 *   - valid {boolean} - true если данные валидны, false если есть ошибки
 *   - errors {Array<Object>} - Массив ошибок, каждая с полями:
 *       - triple {string} - Триплет с ошибкой
 *       - position {string} - Позиция ошибки (predicate, object, etc.)
 *       - value {string} - Недопустимое значение
 *       - message {string} - Описание ошибки
 *
 * @example
 * const quads = [...]; // Parsed RDF quads
 * const prefixes = { vad: 'http://example.org/vad#', rdf: '...' };
 * const result = validateVAD(quads, prefixes);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 *
 * @see VAD_ALLOWED_PREDICATES - Список разрешенных предикатов
 * @see VAD_ALLOWED_TYPES - Список разрешенных типов объектов
 * @see formatVADErrors - Форматирование ошибок для отображения
 */
function validateVAD(quads, prefixes) {
    const errors = [];

    quads.forEach((quad, index) => {
        const predicateUri = quad.predicate.value;
        const predicateLabel = getPrefixedName(predicateUri, prefixes);

        // Проверяем, что предикат разрешен
        const predicateAllowed = VAD_ALLOWED_PREDICATES.some(allowed =>
            predicateUri === allowed || predicateLabel === allowed
        );

        if (!predicateAllowed) {
            const subjectLabel = getPrefixedName(quad.subject.value, prefixes);
            const objectLabel = quad.object.termType === 'Literal'
                ? `"${quad.object.value}"`
                : getPrefixedName(quad.object.value, prefixes);

            errors.push({
                triple: `${subjectLabel} ${predicateLabel} ${objectLabel}`,
                position: 'predicate',
                value: predicateLabel,
                message: `Недопустимый предикат: ${predicateLabel}`
            });
        }

        // Если предикат - rdf:type, проверяем, что тип разрешен
        const typePredicates = [
            'rdf:type',
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
        ];

        if (typePredicates.includes(predicateUri) || typePredicates.includes(predicateLabel)) {
            const typeUri = quad.object.value;
            const typeLabel = getPrefixedName(typeUri, prefixes);

            const typeAllowed = VAD_ALLOWED_TYPES.some(allowed =>
                typeUri === allowed || typeLabel === allowed
            );

            if (!typeAllowed) {
                const subjectLabel = getPrefixedName(quad.subject.value, prefixes);

                errors.push({
                    triple: `${subjectLabel} ${predicateLabel} ${typeLabel}`,
                    position: 'object (type)',
                    value: typeLabel,
                    message: `Недопустимый тип объекта: ${typeLabel}`
                });
            }
        }
    });

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * Форматирует ошибки валидации VAD для отображения
 * @param {Array} errors - Массив ошибок
 * @returns {string} - Отформатированное сообщение
 */
function formatVADErrors(errors) {
    let message = 'ОШИБКА ВАЛИДАЦИИ VAD\n';
    message += '═══════════════════════════════════════\n\n';

    errors.forEach((error, index) => {
        message += `Ошибка ${index + 1}:\n`;
        message += `  Триплет: ${error.triple}\n`;
        message += `  Позиция: ${error.position}\n`;
        message += `  Значение: ${error.value}\n`;
        message += `  ${error.message}\n\n`;
    });

    message += '═══════════════════════════════════════\n';
    message += `Всего ошибок: ${errors.length}\n`;
    message += '\nРазрешенные типы: vad:TypeProcess, vad:ExecutorGroup, vad:TypeExecutor\n';
    message += 'Разрешенные предикаты: rdf:type, rdfs:label, dcterms:description,\n';
    message += '  vad:hasNext, vad:hasExecutor, vad:hasParentObj, vad:includes,\n';
    message += '  vad:processSubtype, vad:hasTrig';

    return message;
}

/**
 * Проверяет существование триплета во всех графах (для проверки дубликатов)
 * Поддерживает проверку как полных URI, так и prefixed names
 *
 * issue #322: Использует currentStore.getQuads() вместо currentQuads
 *
 * @param {string} subjectValue - URI или prefixed name субъекта
 * @param {string} predicateValue - URI или prefixed name предиката
 * @param {string} objectValue - URI, prefixed name или литерал объекта
 * @returns {Object|null} - {graphUri, graphLabel} если найден дубликат, иначе null
 */
function findDuplicateTriple(subjectValue, predicateValue, objectValue) {
    // issue #322: Проверяем наличие currentStore
    if (!currentStore) {
        console.warn('findDuplicateTriple: currentStore not initialized');
        return null;
    }

    // Преобразуем prefixed names в полные URI для сравнения
    let subjectUri = subjectValue;
    let predicateUri = predicateValue;
    let objectUri = objectValue;

    for (const [prefix, namespace] of Object.entries(currentPrefixes)) {
        if (subjectValue.startsWith(prefix + ':')) {
            subjectUri = namespace + subjectValue.substring(prefix.length + 1);
        }
        if (predicateValue.startsWith(prefix + ':')) {
            predicateUri = namespace + predicateValue.substring(prefix.length + 1);
        }
        if (objectValue.startsWith(prefix + ':')) {
            objectUri = namespace + objectValue.substring(prefix.length + 1);
        }
    }

    // issue #322: Используем currentStore.getQuads() для эффективного поиска
    // Сначала пробуем точный поиск по URI
    const exactQuads = currentStore.getQuads(subjectUri, predicateUri, objectUri, null);
    if (exactQuads.length > 0) {
        const graphUri = exactQuads[0].graph ? exactQuads[0].graph.value : null;
        const graphLabel = graphUri ? getPrefixedName(graphUri, currentPrefixes) : 'default graph';
        return { graphUri, graphLabel };
    }

    // Если точный поиск не дал результата, ищем по subject
    const subjectQuads = currentStore.getQuads(subjectUri, null, null, null);

    // Также преобразуем полные URI в prefixed names для альтернативной проверки
    const subjectPrefixed = getPrefixedName(subjectUri, currentPrefixes);
    const predicatePrefixed = getPrefixedName(predicateUri, currentPrefixes);
    const objectPrefixed = getPrefixedName(objectUri, currentPrefixes);

    for (const quad of subjectQuads) {
        const qPredicateUri = quad.predicate.value;
        const qObjectValue = quad.object.value;
        const qPredicatePrefixed = getPrefixedName(qPredicateUri, currentPrefixes);
        const qObjectPrefixed = quad.object.termType === 'Literal'
            ? quad.object.value
            : getPrefixedName(qObjectValue, currentPrefixes);

        // Сравниваем как полные URI, так и prefixed names
        const predicateMatch = (predicateUri === qPredicateUri) || (predicatePrefixed === qPredicatePrefixed);
        const objectMatch = (objectUri === qObjectValue) || (objectPrefixed === qObjectPrefixed) ||
            (objectValue === qObjectValue) || (objectValue === qObjectPrefixed);

        if (predicateMatch && objectMatch) {
            const graphUri = quad.graph ? quad.graph.value : null;
            const graphLabel = graphUri ? getPrefixedName(graphUri, currentPrefixes) : 'default graph';
            return { graphUri, graphLabel };
        }
    }

    return null;
}

/**
 * Определяет целевой граф для триплета на основе правил ptree
 * Если субъект является vad:TypeProcess и предикат в PTREE_PREDICATES,
 * триплет должен быть добавлен в vad:ptree
 * @param {string} subjectValue - URI или prefixed name субъекта
 * @param {string} predicateValue - URI или prefixed name предиката
 * @param {string} originalTrigValue - Исходный выбранный граф
 * @param {string} objectValue - URI или prefixed name объекта (опционально, для проверки rdf:type)
 * @returns {string} - URI графа для добавления триплета
 */
function determineTargetGraph(subjectValue, predicateValue, originalTrigValue, objectValue = null) {
    // Преобразуем prefixed names в полные URI
    let subjectUri = subjectValue;
    let predicateUri = predicateValue;
    let objectUri = objectValue;

    for (const [prefix, namespace] of Object.entries(currentPrefixes)) {
        if (subjectValue.startsWith(prefix + ':')) {
            subjectUri = namespace + subjectValue.substring(prefix.length + 1);
        }
        if (predicateValue.startsWith(prefix + ':')) {
            predicateUri = namespace + predicateValue.substring(prefix.length + 1);
        }
        if (objectValue && objectValue.startsWith(prefix + ':')) {
            objectUri = namespace + objectValue.substring(prefix.length + 1);
        }
    }

    // Специальный случай: добавление rdf:type vad:TypeProcess - всегда в ptree
    const isRdfType = (predicateUri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' ||
                      predicateValue === 'rdf:type');
    const isProcessType = (objectUri === 'http://example.org/vad#TypeProcess' ||
                          objectValue === 'vad:TypeProcess');
    if (isRdfType && isProcessType) {
        return 'vad:ptree';
    }

    // Проверяем, является ли субъект типом vad:TypeProcess
    if (isSubjectVadProcess(subjectUri)) {
        // Проверяем, является ли предикат предикатом для ptree
        if (isPtreePredicate(predicateUri) || isPtreePredicate(predicateValue)) {
            // Возвращаем vad:ptree
            return 'vad:ptree';
        }
    }

    return originalTrigValue;
}

/**
 * Вычисляет vad:processSubtype для всех процессов в каждом TriG
 * Алгоритм:
 * 1. Если hasParentObj = pNotDefined -> NotDefinedType
 * 2. Если концепт имеет hasTrig -> Detailed*
 *    - Если индивид в схеме родительского процесса -> DetailedChild
 *    - Иначе -> DetailedExternal
 * 3. Если концепт НЕ имеет hasTrig -> notDetailed*
 *    - Если индивид в схеме родительского процесса -> notDetailedChild
 *    - Иначе -> notDetailedExternal
 *
 * @param {Object} trigHierarchy - Иерархия TriG графов
 * @param {Object} prefixes - Словарь префиксов
 * @returns {Object} - virtualRDFdata с вычисленными подтипами
 *                     Формат: { trigUri: { processUri: { processSubtype, ... } } }
 */
function calculateProcessSubtypes(hierarchy, prefixes) {
    // Результат: { trigUri: { processUri: { processSubtype, label, hasParentObj, hasTrig } } }
    const result = {};
    // URI для неопределённого родителя (NotDefined)
    const notDefinedUris = [
        'http://example.org/vad#pNotDefined',
        'vad:pNotDefined',
        'http://example.org/vad#NotDefined',
        'vad:NotDefined'
    ];

    // Получаем метаданные процессов из ptree
    const ptreeUri = 'http://example.org/vad#ptree';
    const ptreeInfo = hierarchy[ptreeUri];
    const processMetadata = {}; // { processUri: { hasParentObj, hasTrig, label } }

    if (ptreeInfo && ptreeInfo.quads) {
        ptreeInfo.quads.forEach(quad => {
            const subjectUri = quad.subject.value;
            const predicateUri = quad.predicate.value;
            const predicateLabel = getPrefixedName(predicateUri, prefixes);
            const objectValue = quad.object.value;

            // Инициализируем запись для процесса
            if (!processMetadata[subjectUri]) {
                processMetadata[subjectUri] = {
                    hasParentObj: null,
                    hasTrig: null,
                    label: null
                };
            }

            // Собираем hasParentObj/hasParentProcess, hasTrig и label для всех процессов
            // Поддерживаем оба предиката: vad:hasParentObj (новый) и vad:hasParentProcess (старый)
            if (predicateLabel === 'vad:hasParentObj' ||
                predicateUri === 'http://example.org/vad#hasParentObj' ||
                predicateLabel === 'vad:hasParentProcess' ||
                predicateUri === 'http://example.org/vad#hasParentProcess') {
                processMetadata[subjectUri].hasParentObj = objectValue;
            }

            if (predicateLabel === 'vad:hasTrig' ||
                predicateUri === 'http://example.org/vad#hasTrig') {
                processMetadata[subjectUri].hasTrig = objectValue;
            }

            if (predicateLabel === 'rdfs:label' ||
                predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label') {
                processMetadata[subjectUri].label = objectValue;
            }
        });
    }

    // Проходим по всем TriG в иерархии
    for (const [trigUri, trigInfo] of Object.entries(hierarchy)) {
        // Пропускаем служебные графы (ptree, rtree, root)
        if (trigUri.endsWith('#ptree') || trigUri.endsWith('#rtree') ||
            trigUri.endsWith('#root') || !trigInfo.quads) {
            continue;
        }

        // Проверяем, что это TriG типа VADProcessDia
        const trigType = trigInfo.type;
        const isVADProcessDia = trigType &&
            (trigType === 'http://example.org/vad#VADProcessDia' ||
             trigType.endsWith('#VADProcessDia'));

        if (!isVADProcessDia) {
            continue;
        }

        // Получаем definesProcess текущего TriG (это процесс-владелец схемы)
        // Если TriG имеет vad:definesProcess - используем его
        // Иначе используем hasParent для обратной совместимости
        const trigDefinesProcess = trigInfo.definesProcess || trigInfo.hasParent;

        // Инициализируем контейнер для этого TriG
        result[trigUri] = {};

        // Находим все индивиды процессов в этом TriG через vad:isSubprocessTrig
        trigInfo.quads.forEach(quad => {
            const subjectUri = quad.subject.value;
            const predicateUri = quad.predicate.value;
            const objectValue = quad.object.value;

            // Ищем индивиды процессов через vad:isSubprocessTrig
            if (predicateUri === 'http://example.org/vad#isSubprocessTrig' ||
                predicateUri.endsWith('#isSubprocessTrig')) {
                // objectValue - это URI TriG, в котором находится индивид
                // subjectUri - это URI процесса
                if (objectValue === trigUri) {
                    // Этот процесс является индивидом в текущем TriG
                    const metadata = processMetadata[subjectUri] || {};
                    const hasParentObj = metadata.hasParentObj;
                    const hasTrig = metadata.hasTrig;
                    const label = metadata.label;

                    // Вычисляем processSubtype
                    let processSubtype = null;

                    // 1. Проверяем NotDefined (неопределённый родитель)
                    if (hasParentObj && notDefinedUris.some(uri =>
                        hasParentObj === uri || hasParentObj.endsWith('#pNotDefined') || hasParentObj.endsWith('#NotDefined'))) {
                        processSubtype = 'NotDefinedType';
                    } else {
                        // 2. Определяем, находится ли индивид в схеме родительского процесса
                        // Процесс является подпроцессом (Child), если его hasParentObj/hasParentProcess
                        // совпадает с definesProcess TriG (процессом-владельцем схемы)
                        const isChild = trigDefinesProcess && hasParentObj === trigDefinesProcess;

                        // 3. Вычисляем подтип на основе hasTrig и isChild
                        if (hasTrig) {
                            // Детализированный процесс
                            processSubtype = isChild ? 'DetailedChild' : 'DetailedExternal';
                        } else {
                            // Не детализированный процесс
                            processSubtype = isChild ? 'notDetailedChild' : 'notDetailedExternal';
                        }
                    }

                    result[trigUri][subjectUri] = {
                        processSubtype: processSubtype,
                        label: label,
                        hasParentObj: hasParentObj,
                        hasTrig: hasTrig
                    };
                }
            }
        });
    }

    return result;
}

/**
 * Генерирует строковое представление virtualRDFdata в формате TriG
 * Создаёт виртуальные контейнеры (vt_*) для каждого TriG типа VADProcessDia
 *
 * issue #264, #270: Каждый Virtual TriG имеет:
 * - rdf:type vad:Virtual (для SPARQL-driven проверки типа)
 * - vad:hasParentObj <parentTrigUri> (связь с родительским VADProcessDia)
 *
 * @param {Object} virtualData - Виртуальные данные { trigUri: { processUri: processInfo } }
 * @param {Object} prefixes - Словарь префиксов
 * @returns {string} - Строка в формате TriG
 */
function formatVirtualRDFdata(virtualData, prefixes) {
    let output = '# ==============================================================================\n';
    output += '# VIRTUAL RDF DATA - Автоматически вычисленные свойства процессов\n';
    output += '# ==============================================================================\n';
    output += '# Эти данные вычисляются автоматически при загрузке и не хранятся в RDF.\n';
    output += '# Пересчёт происходит при изменении схемы процесса.\n';
    output += '# Для каждого TriG типа VADProcessDia создаётся виртуальный двойник (vt_*).\n';
    output += '# issue #264: Virtual TriG связан с родителем через vad:hasParentObj.\n';
    output += '# ==============================================================================\n\n';

    // Добавляем префиксы
    output += '@prefix rdf:      <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n';
    output += '@prefix rdfs:     <http://www.w3.org/2000/01/rdf-schema#> .\n';
    output += '@prefix vad:      <http://example.org/vad#> .\n\n';

    // Выводим для каждого TriG виртуальный контейнер
    for (const [trigUri, processes] of Object.entries(virtualData)) {
        const trigLabel = getPrefixedName(trigUri, prefixes);

        // Формируем имя виртуального контейнера (vt_ вместо t_)
        let virtualContainerName;
        if (trigLabel.startsWith('vad:t_')) {
            virtualContainerName = 'vad:vt_' + trigLabel.substring(6);
        } else if (trigLabel.startsWith('vad:')) {
            virtualContainerName = 'vad:vt_' + trigLabel.substring(4);
        } else {
            virtualContainerName = 'vt_' + trigLabel;
        }

        // Пропускаем TriG без процессов
        if (Object.keys(processes).length === 0) {
            continue;
        }

        output += `# Виртуальный контейнер для ${trigLabel}\n`;
        output += `${virtualContainerName} {\n`;

        // Свойства самого виртуального TriG (используем virtualContainerName, а не trigLabel)
        // issue #270: rdf:type vad:Virtual для SPARQL-driven проверки
        output += `    ${virtualContainerName} rdf:type vad:Virtual .\n`;
        // issue #264, #270: hasParentObj связывает Virtual TriG с родительским VADProcessDia
        output += `    ${virtualContainerName} vad:hasParentObj ${trigLabel} .\n\n`;

        // Свойства процессов
        for (const [processUri, processInfo] of Object.entries(processes)) {
            const processLabel = getPrefixedName(processUri, prefixes);
            const subtype = processInfo.processSubtype || 'unknown';

            output += `    ${processLabel} vad:processSubtype vad:${subtype} .\n`;
        }

        output += `}\n\n`;
    }

    return output;
}

/**
 * issue #270, #322: Добавляет виртуальные квады только в currentStore
 * Парсит virtualRDFdata и создаёт N3.Quad объекты для хранения в store
 *
 * issue #322: Миграция к единому хранилищу - currentQuads больше не используется
 *
 * @param {Object} virtualData - Виртуальные данные { trigUri: { processUri: processInfo } }
 * @param {Object} prefixes - Словарь префиксов
 * @returns {Array} - Массив созданных квадов
 */
function addVirtualQuadsToStore(virtualData, prefixes) {
    if (!virtualData || Object.keys(virtualData).length === 0) {
        return [];
    }

    // issue #322: Проверяем наличие currentStore
    if (!currentStore) {
        console.error('addVirtualQuadsToStore: currentStore not initialized');
        return [];
    }

    const VAD_NS = 'http://example.org/vad#';
    const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

    const newQuads = [];
    const factory = N3.DataFactory;
    const { namedNode } = factory;

    // Для каждого TriG создаём виртуальный контейнер
    for (const [trigUri, processes] of Object.entries(virtualData)) {
        // Пропускаем TriG без процессов
        if (Object.keys(processes).length === 0) {
            continue;
        }

        // Формируем URI виртуального контейнера (vt_ вместо t_)
        let virtualContainerUri;
        if (trigUri.includes('#t_')) {
            virtualContainerUri = trigUri.replace('#t_', '#vt_');
        } else {
            // Извлекаем локальное имя и добавляем vt_ префикс
            const localName = trigUri.split('#').pop() || trigUri.split('/').pop();
            virtualContainerUri = VAD_NS + 'vt_' + localName;
        }

        const virtualGraphNode = namedNode(virtualContainerUri);

        // rdf:type vad:Virtual
        newQuads.push(factory.quad(
            virtualGraphNode,
            namedNode(RDF_NS + 'type'),
            namedNode(VAD_NS + 'Virtual'),
            virtualGraphNode
        ));

        // vad:hasParentObj <parentTrigUri>
        newQuads.push(factory.quad(
            virtualGraphNode,
            namedNode(VAD_NS + 'hasParentObj'),
            namedNode(trigUri),
            virtualGraphNode
        ));

        // Добавляем processSubtype для каждого процесса
        for (const [processUri, processInfo] of Object.entries(processes)) {
            const subtype = processInfo.processSubtype || 'unknown';
            newQuads.push(factory.quad(
                namedNode(processUri),
                namedNode(VAD_NS + 'processSubtype'),
                namedNode(VAD_NS + subtype),
                virtualGraphNode
            ));
        }
    }

    // issue #322: Добавляем квады только в currentStore (без currentQuads)
    if (newQuads.length > 0) {
        newQuads.forEach(quad => currentStore.addQuad(quad));

        // Также добавляем виртуальные графы в trigHierarchy
        addVirtualTrigsToHierarchy(newQuads, virtualData, prefixes);
    }

    console.log(`addVirtualQuadsToStore: Added ${newQuads.length} virtual quads to store`);
    return newQuads;
}

/**
 * issue #270: Добавляет виртуальные TriG в trigHierarchy для корректной фильтрации
 *
 * @param {Array} virtualQuads - Массив виртуальных квадов
 * @param {Object} virtualData - Виртуальные данные
 * @param {Object} prefixes - Словарь префиксов
 */
function addVirtualTrigsToHierarchy(virtualQuads, virtualData, prefixes) {
    if (!trigHierarchy) return;

    const VAD_NS = 'http://example.org/vad#';

    // Группируем квады по графу
    const quadsByGraph = {};
    virtualQuads.forEach(quad => {
        const graphUri = quad.graph?.value;
        if (graphUri) {
            if (!quadsByGraph[graphUri]) {
                quadsByGraph[graphUri] = [];
            }
            quadsByGraph[graphUri].push(quad);
        }
    });

    // Добавляем записи в trigHierarchy для каждого виртуального графа
    for (const [graphUri, quads] of Object.entries(quadsByGraph)) {
        // Находим родительский trigUri
        let parentTrigUri = null;
        if (graphUri.includes('#vt_')) {
            parentTrigUri = graphUri.replace('#vt_', '#t_');
        }

        trigHierarchy[graphUri] = {
            uri: graphUri,
            label: getPrefixedName(graphUri, prefixes),
            type: VAD_NS + 'Virtual',
            hasParent: parentTrigUri,
            children: [],
            quads: quads,
            processes: [],
            isTrig: true,
            isVirtual: true  // issue #270: Маркер виртуального TriG
        };
    }
}

/**
 * Парсит иерархию TriG графов из квадов
 * @param {Array} quads - Массив RDF квадов
 * @param {Object} prefixes - Словарь префиксов
 * @returns {Object} - { valid, errors, hierarchy, rootTrigUris }
 */
function parseTriGHierarchy(quads, prefixes) {
    const errors = [];
    const hierarchy = {};
    const graphUris = new Set();
    const rootUri = 'http://example.org/vad#root';

    // Типы, которые являются TriG (отображаются жирным в дереве)
    const TRIG_TYPE_URIS = [
        'http://example.org/vad#VADProcessDia',
        'http://example.org/vad#ObjectTree',
        'http://example.org/vad#TechTree',
        'http://example.org/vad#TechnoTree',   // issue #262: технологические деревья
        'http://example.org/vad#ProcessTree',  // устаревший
        'http://example.org/vad#ExecutorTree'  // устаревший
    ];

    // issue #262: TechnoTree типы (не отображаются в Publisher treeview)
    const TECHNO_TREE_TYPE_URIS = [
        'http://example.org/vad#TechnoTree'
    ];

    // Собираем все уникальные именованные графы
    quads.forEach(quad => {
        if (quad.graph && quad.graph.value && quad.graph.value !== '') {
            graphUris.add(quad.graph.value);
        }
    });

    // Инициализируем структуру для каждого графа
    graphUris.forEach(graphUri => {
        hierarchy[graphUri] = {
            uri: graphUri,
            label: null,
            type: null,
            hasParent: null,
            children: [],
            quads: [],
            processes: [],
            isTrig: true  // По умолчанию граф считается TriG
        };
    });

    // Собираем квады для каждого графа
    quads.forEach(quad => {
        const graphUri = quad.graph?.value || '';
        if (graphUri && hierarchy[graphUri]) {
            hierarchy[graphUri].quads.push(quad);
        }
    });

    // Собираем ВСЕ объекты с hasParentObj (не только графы)
    // и их метаданные (label, type, hasParentObj)
    const allObjects = {};

    quads.forEach(quad => {
        const subjectUri = quad.subject.value;
        const predicateUri = quad.predicate.value;
        const predicateLabel = getPrefixedName(predicateUri, prefixes);

        // Инициализируем объект, если ещё не существует
        if (!allObjects[subjectUri]) {
            allObjects[subjectUri] = {
                uri: subjectUri,
                label: null,
                type: null,
                hasParent: null,
                children: [],
                processes: [],
                isTrig: graphUris.has(subjectUri),  // Является ли объект именованным графом
                isTechnoTree: false  // issue #262: флаг для TechnoTree типов
            };
        }

        // rdfs:label
        if (predicateLabel === 'rdfs:label' || predicateUri === 'http://www.w3.org/2000/01/rdf-schema#label') {
            allObjects[subjectUri].label = quad.object.value;
        }

        // rdf:type
        if (predicateLabel === 'rdf:type' || predicateUri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
            allObjects[subjectUri].type = quad.object.value;
            // Проверяем, является ли тип TriG
            if (TRIG_TYPE_URIS.includes(quad.object.value)) {
                allObjects[subjectUri].isTrig = true;
            }
            // issue #262: Проверяем, является ли тип TechnoTree
            if (TECHNO_TREE_TYPE_URIS.includes(quad.object.value)) {
                allObjects[subjectUri].isTechnoTree = true;
            }
        }

        // vad:hasParentObj
        if (predicateLabel === 'vad:hasParentObj' || predicateUri === 'http://example.org/vad#hasParentObj') {
            allObjects[subjectUri].hasParent = quad.object.value;
        }

        // vad:definesProcess - для VADProcessDia указывает, какой процесс определяется этой схемой
        if (predicateLabel === 'vad:definesProcess' || predicateUri === 'http://example.org/vad#definesProcess') {
            allObjects[subjectUri].definesProcess = quad.object.value;
        }
    });

    // Копируем данные в hierarchy для графов и добавляем все объекты с hasParentObj
    Object.entries(allObjects).forEach(([uri, objInfo]) => {
        if (hierarchy[uri]) {
            // Граф уже существует - обновляем данные
            hierarchy[uri].label = objInfo.label;
            hierarchy[uri].type = objInfo.type;
            hierarchy[uri].hasParent = objInfo.hasParent;
            hierarchy[uri].isTrig = objInfo.isTrig;
            hierarchy[uri].isTechnoTree = objInfo.isTechnoTree;  // issue #262
            hierarchy[uri].definesProcess = objInfo.definesProcess;
        } else if (objInfo.hasParent) {
            // Не граф, но имеет hasParentObj - добавляем в иерархию
            hierarchy[uri] = {
                uri: uri,
                label: objInfo.label,
                type: objInfo.type,
                hasParent: objInfo.hasParent,
                children: [],
                quads: [],
                processes: [],
                isTrig: objInfo.isTrig,
                isTechnoTree: objInfo.isTechnoTree,  // issue #262
                definesProcess: objInfo.definesProcess
            };
        }
    });

    // Проверяем, что все графы имеют hasParentObj
    // ИСКЛЮЧЕНИЕ: vad:root (тип TechTree) не имеет hasParentObj - это корень дерева
    // issue #262: TechnoTree типы проверяются отдельно (они должны иметь hasParentObj,
    // но это не является ошибкой валидации в данном контексте)
    Object.values(hierarchy).forEach(graphInfo => {
        // Только для именованных графов проверяем наличие hasParentObj
        // Пропускаем vad:root и TechnoTree типы (techtree, vtree имеют hasParentObj=techroot)
        if (graphUris.has(graphInfo.uri) && !graphInfo.hasParent && graphInfo.uri !== rootUri) {
            // issue #262: Пропускаем TechnoTree типы - они не отображаются в treeview
            if (graphInfo.isTechnoTree) {
                return;
            }
            const graphLabel = getPrefixedName(graphInfo.uri, prefixes);
            errors.push({
                graph: graphLabel,
                message: `TriG "${graphLabel}" не имеет свойства hasParentObj. В режиме VAD TriG каждый TriG граф (кроме vad:root) должен иметь свойство hasParentObj.`
            });
        }
    });

    if (errors.length > 0) {
        return { valid: false, errors, hierarchy: null, rootTrigUris: [] };
    }

    // Строим дерево: находим корневые элементы (hasParentObj = vad:root)
    const rootTrigUris = [];

    Object.values(hierarchy).forEach(graphInfo => {
        const parentUri = graphInfo.hasParent;
        const parentLabel = parentUri ? getPrefixedName(parentUri, prefixes) : null;

        // Проверяем, является ли родитель "root"
        if (parentUri === rootUri || parentLabel === 'vad:root') {
            // vad:ptree и vad:rtree - это специальные графы для метаданных,
            // они сами являются корневыми элементами дерева
            rootTrigUris.push(graphInfo.uri);
        } else if (parentUri && hierarchy[parentUri]) {
            // Добавляем как дочерний элемент к родителю
            hierarchy[parentUri].children.push(graphInfo.uri);
        } else if (parentUri && !hierarchy[parentUri]) {
            // Родитель не найден в иерархии - возможно, объект без hasParentObj
            // Создаём заглушку для родителя
            hierarchy[parentUri] = {
                uri: parentUri,
                label: getLocalName(parentUri),
                type: null,
                hasParent: null,
                children: [graphInfo.uri],
                quads: [],
                processes: [],
                isTrig: false
            };
        }
    });

    // Собираем информацию о процессах для каждого графа (VADProcessDia)
    // Шаг 1: Собираем все URI процессов из всех графов (включая vad:ptree)
    const allProcessUris = new Set();
    Object.values(hierarchy).forEach(graphInfo => {
        if (graphInfo.quads) {
            graphInfo.quads.forEach(quad => {
                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, prefixes);

                // Если это rdf:type и тип = vad:TypeProcess
                if (predicateLabel === 'rdf:type' || predicateUri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
                    const typeUri = quad.object.value;
                    const typeLabel = getPrefixedName(typeUri, prefixes);
                    if (typeLabel === 'vad:TypeProcess' || typeUri === 'http://example.org/vad#TypeProcess') {
                        allProcessUris.add(quad.subject.value);
                    }
                }
            });
        }
    });

    // Шаг 2: Для каждого графа (кроме ptree и rtree) определяем, какие процессы в нём присутствуют
    const processPredicates = [
        'http://example.org/vad#hasExecutor',
        'vad:hasExecutor',
        'http://example.org/vad#hasNext',
        'vad:hasNext',
        'http://example.org/vad#processSubtype',
        'vad:processSubtype',
        'http://example.org/vad#isSubprocessTrig',
        'vad:isSubprocessTrig'
    ];

    Object.values(hierarchy).forEach(graphInfo => {
        // Для vad:ptree и vad:rtree пропускаем присваивание процессов (это графы метаданных)
        if (graphInfo.uri === PTREE_GRAPH_URI || graphInfo.uri === RTREE_GRAPH_URI) {
            return;
        }

        // Ищем процессы, которые имеют свойства в этом графе
        const processesInGraph = new Set();
        if (graphInfo.quads) {
            graphInfo.quads.forEach(quad => {
                const subjectUri = quad.subject.value;
                const predicateUri = quad.predicate.value;
                const predicateLabel = getPrefixedName(predicateUri, prefixes);

                // Если субъект является процессом (из allProcessUris) и предикат - это свойство процесса
                if (allProcessUris.has(subjectUri)) {
                    if (processPredicates.includes(predicateUri) || processPredicates.includes(predicateLabel)) {
                        processesInGraph.add(subjectUri);
                    }
                }
            });
        }

        graphInfo.processes = Array.from(processesInGraph);
    });

    return { valid: true, errors: [], hierarchy, rootTrigUris };
}

/**
 * Форматирует ошибки VAD TriG для отображения
 * @param {Array} errors - Массив ошибок
 * @returns {string} - Отформатированное сообщение
 */
function formatVADTriGErrors(errors) {
    let message = 'ОШИБКА ВАЛИДАЦИИ VAD TriG\n';
    message += '═══════════════════════════════════════\n\n';

    errors.forEach((error, index) => {
        message += `Ошибка ${index + 1}:\n`;
        message += `  TriG граф: ${error.graph}\n`;
        message += `  ${error.message}\n\n`;
    });

    message += '═══════════════════════════════════════\n';
    message += `Всего ошибок: ${errors.length}\n`;
    message += '\nВ режиме VAD TriG каждый TriG граф (кроме vad:root) должен иметь свойство vad:hasParentObj.\n';
    message += 'Объект vad:root (типа vad:TechTree) не имеет hasParentObj - это корень дерева.\n';
    message += 'Все остальные объекты указывают на родительский объект через hasParentObj.';

    return message;
}

/**
 * Определяет тип TriG графа по его URI и квадам
 * @param {string} trigUri - URI TriG графа
 * @param {Array} quads - Массив RDF квадов
 * @returns {string} - Тип TriG ('vad:ProcessTree', 'vad:ExecutorTree', 'vad:VADProcessDia')
 */
function getTrigType(trigUri, quads) {
    const typeQuad = quads.find(quad =>
        quad.subject.value === trigUri &&
        (quad.predicate.value.endsWith('#type') ||
         quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
    );

    if (typeQuad) {
        const typeValue = typeQuad.object.value;
        if (TRIG_TYPES.PROCESS_TREE.some(t => typeValue === t || typeValue.endsWith('#ProcessTree'))) {
            return 'vad:ProcessTree';
        }
        if (TRIG_TYPES.EXECUTOR_TREE.some(t => typeValue === t || typeValue.endsWith('#ExecutorTree'))) {
            return 'vad:ExecutorTree';
        }
        if (TRIG_TYPES.VAD_PROCESS_DIA.some(t => typeValue === t || typeValue.endsWith('#VADProcessDia'))) {
            return 'vad:VADProcessDia';
        }
    }

    // Определение типа по эвристике (для обратной совместимости)
    if (trigUri.endsWith('#ptree') || trigUri.includes('ptree')) {
        return 'vad:ProcessTree';
    }
    if (trigUri.endsWith('#rtree') || trigUri.includes('rtree')) {
        return 'vad:ExecutorTree';
    }
    return 'vad:VADProcessDia';
}

