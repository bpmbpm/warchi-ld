// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/252

/**
 * SPARQL Queries for Delete Concept/Individ module
 *
 * Модуль содержит все SPARQL запросы, используемые при удалении
 * Концептов и Индивидов в соответствии с концепцией SPARQL-driven Programming.
 *
 * @file 3_sd_del_concept_individ_sparql.js
 * @version 1.0
 * @date 2026-02-02
 * @see sparql-driven-programming_min1.md - Концепция SPARQL-driven Programming
 * @see io_concept_individ_v2.md - Алгоритмы удаления концептов (v2)
 */

/**
 * SPARQL запросы для модуля удаления концептов/индивидов
 * Использует концепцию максимального использования SPARQL-запросов
 */
const DEL_CONCEPT_SPARQL = {
    /**
     * Получение всех концептов процессов из ptree
     * Используется для выбора концепта для удаления
     */
    GET_PROCESS_CONCEPTS: `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vad: <http://example.org/vad#>

SELECT ?concept ?label WHERE {
    GRAPH vad:ptree {
        ?concept rdf:type vad:TypeProcess .
        OPTIONAL { ?concept rdfs:label ?label }
    }
}`,

    /**
     * Получение всех концептов исполнителей из rtree
     * Используется для выбора концепта для удаления
     */
    GET_EXECUTOR_CONCEPTS: `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vad: <http://example.org/vad#>

SELECT ?concept ?label WHERE {
    GRAPH vad:rtree {
        ?concept rdf:type vad:TypeExecutor .
        OPTIONAL { ?concept rdfs:label ?label }
    }
}`,

    /**
     * Проверка наличия индивидов процесса для концепта
     * Ищет все индивиды во всех TriG типа VADProcessDia
     * @param {string} conceptUri - URI концепта процесса
     */
    CHECK_PROCESS_INDIVIDUALS: (conceptUri) => `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vad: <http://example.org/vad#>

SELECT ?individ ?trig ?label WHERE {
    GRAPH ?trig {
        ?individ vad:isSubprocessTrig ?trig .
    }
    GRAPH vad:ptree {
        <${conceptUri}> vad:hasTrig ?trig .
    }
    OPTIONAL {
        GRAPH vad:ptree {
            ?individ rdfs:label ?label .
        }
    }
}`,

    /**
     * Проверка наличия схемы процесса (hasTrig)
     * @param {string} conceptUri - URI концепта процесса
     */
    CHECK_PROCESS_SCHEMA: (conceptUri) => `
PREFIX vad: <http://example.org/vad#>

SELECT ?trig WHERE {
    GRAPH vad:ptree {
        <${conceptUri}> vad:hasTrig ?trig .
    }
}`,

    /**
     * Проверка наличия дочерних процессов
     * @param {string} conceptUri - URI родительского концепта
     */
    CHECK_CHILDREN_PROCESSES: (conceptUri) => `
PREFIX vad: <http://example.org/vad#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?child ?label WHERE {
    GRAPH vad:ptree {
        ?child vad:hasParentObj <${conceptUri}> .
        OPTIONAL { ?child rdfs:label ?label }
    }
}`,

    /**
     * Проверка наличия дочерних исполнителей
     * @param {string} conceptUri - URI родительского концепта
     */
    CHECK_CHILDREN_EXECUTORS: (conceptUri) => `
PREFIX vad: <http://example.org/vad#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?child ?label WHERE {
    GRAPH vad:rtree {
        ?child vad:hasParentObj <${conceptUri}> .
        OPTIONAL { ?child rdfs:label ?label }
    }
}`,

    /**
     * Проверка использования исполнителя в TriG
     * @param {string} executorUri - URI исполнителя
     */
    CHECK_EXECUTOR_USAGE: (executorUri) => `
PREFIX vad: <http://example.org/vad#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

# issue #439: rdf:type VADProcessDia is stored inside named graphs, not in the default graph
SELECT DISTINCT ?trig ?processIndivid WHERE {
    GRAPH ?trig {
        ?trig rdf:type vad:VADProcessDia .
        ?processIndivid vad:includes <${executorUri}> .
    }
}`,

    /**
     * Получение всех TriG типа VADProcessDia
     */
    GET_ALL_TRIGS: `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vad: <http://example.org/vad#>

# issue #439: rdf:type VADProcessDia is stored inside named graphs, not in the default graph
SELECT ?trig ?label WHERE {
    GRAPH ?trig {
        ?trig rdf:type vad:VADProcessDia .
        OPTIONAL { ?trig rdfs:label ?label }
    }
}`,

    /**
     * Issue #221 Fix #2: Получение всех использований концепта процесса как индивида
     * в схемах процессов (TriG типа VADProcessDia)
     *
     * Индивид процесса - это использование концепта в схеме процесса,
     * идентифицируемое по предикату vad:isSubprocessTrig в TriG типа VADProcessDia.
     *
     * @param {string} conceptUri - URI концепта процесса
     */
    GET_PROCESS_INDIVIDUALS_FOR_CONCEPT: (conceptUri) => `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vad: <http://example.org/vad#>

# Issue #221 Fix #2: Ищем использования концепта как индивида во всех TriG типа VADProcessDia
# issue #439: rdf:type VADProcessDia is stored inside named graphs, not in the default graph
SELECT ?individ ?trig ?label WHERE {
    # Находим TriG типа VADProcessDia и ищем концепт как индивид (подпроцесс)
    GRAPH ?trig {
        ?trig rdf:type vad:VADProcessDia .
        <${conceptUri}> vad:isSubprocessTrig ?trig .
    }

    # Возвращаем URI концепта как индивид
    BIND(<${conceptUri}> AS ?individ)

    # Опционально получаем label из ptree
    OPTIONAL {
        GRAPH vad:ptree {
            <${conceptUri}> rdfs:label ?label .
        }
    }
}`,

    /**
     * Получение всех TriG, где используется исполнитель
     * @param {string} executorUri - URI исполнителя
     */
    GET_TRIGS_WITH_EXECUTOR: (executorUri) => `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX vad: <http://example.org/vad#>

# issue #439: rdf:type VADProcessDia is stored inside named graphs, not in the default graph
SELECT DISTINCT ?trig ?processIndivid WHERE {
    GRAPH ?trig {
        ?trig rdf:type vad:VADProcessDia .
        ?processIndivid vad:includes <${executorUri}> .
    }
}`,

    /**
     * Проверка использования концепта как индивида (подпроцесса) в TriG
     * Issue #252: Новый запрос для funSPARQLvaluesComunica
     * @param {string} conceptUri - URI концепта процесса
     */
    CHECK_CONCEPT_AS_INDIVIDUAL: (conceptUri) => `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX vad: <http://example.org/vad#>

SELECT ?trig WHERE {
    GRAPH ?trig {
        <${conceptUri}> vad:isSubprocessTrig ?trig .
    }
}`,

    /**
     * issue #311 п.3: Получение индивидов процесса в конкретном TriG
     * @param {string} trigUri - URI TriG
     */
    GET_PROCESS_INDIVIDUALS_IN_TRIG: (trigUri) => `
PREFIX vad: <http://example.org/vad#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

# issue #311: Индивиды процессов в конкретной схеме
SELECT ?individ ?label WHERE {
    GRAPH <${trigUri}> {
        ?individ vad:isSubprocessTrig <${trigUri}> .
    }
    OPTIONAL {
        GRAPH vad:ptree {
            ?individ rdfs:label ?label .
        }
    }
}`,

    /**
     * issue #311 п.4: Получение индивидов исполнителей в конкретном TriG
     * @param {string} trigUri - URI TriG
     */
    GET_EXECUTOR_INDIVIDUALS_IN_TRIG: (trigUri) => `
PREFIX vad: <http://example.org/vad#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

# issue #311: Исполнители (через vad:includes) в конкретной схеме
SELECT DISTINCT ?executor ?label WHERE {
    GRAPH <${trigUri}> {
        ?group vad:includes ?executor .
    }
    OPTIONAL {
        GRAPH vad:rtree {
            ?executor rdfs:label ?label .
        }
    }
}`,

    /**
     * Генерирует DELETE SPARQL запрос для удаления концепта
     * @param {string} graphUri - URI графа (ptree или rtree)
     * @param {string} conceptUri - URI концепта для удаления
     * @param {Object} prefixes - Объект префиксов
     */
    GENERATE_DELETE_CONCEPT_QUERY: (graphUri, conceptUri, prefixes) => {
        const prefixDeclarations = Object.entries(prefixes)
            .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
            .join('\n');

        const conceptPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(conceptUri, currentPrefixes)
            : `<${conceptUri}>`;

        return `${prefixDeclarations}

DELETE WHERE {
    GRAPH ${graphUri} {
        ${conceptPrefixed} ?p ?o .
    }
}`;
    },

    /**
     * issue #309: Поиск ExecutorGroup для индивида процесса
     * @param {string} individUri - URI индивида процесса
     * @param {string} trigUri - URI TriG графа
     */
    FIND_EXECUTOR_GROUP_FOR_INDIVID: (individUri, trigUri) => `
PREFIX vad: <http://example.org/vad#>

SELECT ?executorGroup WHERE {
    GRAPH <${trigUri}> {
        <${individUri}> vad:hasExecutor ?executorGroup .
    }
}`,

    /**
     * issue #309: Поиск входящих vad:hasNext связей на удаляемый индивид в TriG
     * @param {string} individUri - URI индивида процесса
     * @param {string} trigUri - URI TriG графа
     */
    FIND_INCOMING_HAS_NEXT: (individUri, trigUri) => `
PREFIX vad: <http://example.org/vad#>

SELECT ?sourceIndivid WHERE {
    GRAPH <${trigUri}> {
        ?sourceIndivid vad:hasNext <${individUri}> .
    }
}`,

    /**
     * issue #309: Генерирует полный DELETE SPARQL запрос для удаления индивида процесса
     * Включает:
     * 1. Удаление всех исходящих триплетов индивида (isSubprocessTrig, hasExecutor, hasNext)
     * 2. Удаление связанного объекта ExecutorGroup (rdf:type, rdfs:label, vad:includes)
     * 3. Удаление входящих vad:hasNext от других индивидов
     * @param {string} trigUri - URI TriG графа
     * @param {string} individUri - URI индивида процесса
     * @param {string|null} executorGroupUri - URI ExecutorGroup (если найдена)
     * @param {Array<string>} incomingHasNextUris - URI индивидов с входящими vad:hasNext
     * @param {Object} prefixes - Объект префиксов
     */
    GENERATE_DELETE_PROCESS_INDIVID_QUERY: (trigUri, individUri, prefixes, executorGroupUri = null, incomingHasNextUris = []) => {
        const prefixDeclarations = Object.entries(prefixes)
            .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
            .join('\n');

        const trigPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(trigUri, currentPrefixes)
            : `<${trigUri}>`;

        const individPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(individUri, currentPrefixes)
            : `<${individUri}>`;

        let parts = [];

        // 1. Удаление всех исходящих триплетов индивида процесса
        parts.push(`# issue #309: Удаление всех исходящих триплетов индивида процесса
DELETE WHERE {
    GRAPH ${trigPrefixed} {
        ${individPrefixed} ?p ?o .
    }
}`);

        // 2. Удаление ExecutorGroup (если найдена)
        if (executorGroupUri) {
            const egPrefixed = typeof getPrefixedName === 'function'
                ? getPrefixedName(executorGroupUri, currentPrefixes)
                : `<${executorGroupUri}>`;

            parts.push(`# issue #309: Удаление объекта ExecutorGroup
DELETE WHERE {
    GRAPH ${trigPrefixed} {
        ${egPrefixed} ?p ?o .
    }
}`);
        }

        // 3. Удаление входящих vad:hasNext от других индивидов
        if (incomingHasNextUris && incomingHasNextUris.length > 0) {
            incomingHasNextUris.forEach(sourceUri => {
                const sourcePrefixed = typeof getPrefixedName === 'function'
                    ? getPrefixedName(sourceUri, currentPrefixes)
                    : `<${sourceUri}>`;

                parts.push(`# issue #309: Удаление входящей связи vad:hasNext от ${sourcePrefixed}
DELETE DATA {
    GRAPH ${trigPrefixed} {
        ${sourcePrefixed} vad:hasNext ${individPrefixed} .
    }
}`);
            });
        }

        return `${prefixDeclarations}\n\n` + parts.join('\n;\n\n');
    },

    /**
     * Генерирует DELETE SPARQL запрос для удаления индивида исполнителя (vad:includes)
     * @param {string} trigUri - URI TriG графа
     * @param {string} processIndividUri - URI индивида процесса
     * @param {string} executorUri - URI исполнителя
     * @param {Object} prefixes - Объект префиксов
     */
    GENERATE_DELETE_EXECUTOR_INDIVID_QUERY: (trigUri, processIndividUri, executorUri, prefixes) => {
        const prefixDeclarations = Object.entries(prefixes)
            .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
            .join('\n');

        const trigPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(trigUri, currentPrefixes)
            : `<${trigUri}>`;

        const processIndividPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(processIndividUri, currentPrefixes)
            : `<${processIndividUri}>`;

        const executorPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(executorUri, currentPrefixes)
            : `<${executorUri}>`;

        return `${prefixDeclarations}

# Удаление связи vad:includes для исполнителя
DELETE DATA {
    GRAPH ${trigPrefixed} {
        ${processIndividPrefixed} vad:includes ${executorPrefixed} .
    }
}`;
    },

    /**
     * Генерирует DELETE SPARQL запрос для удаления TriG схемы
     * issue #264, #270: Также удаляет связанный Virtual TriG (каскадное удаление)
     * @param {string} trigUri - URI TriG графа
     * @param {string} conceptUri - URI концепта процесса
     * @param {Object} prefixes - Объект префиксов
     */
    GENERATE_DELETE_TRIG_QUERY: (trigUri, conceptUri, prefixes) => {
        const prefixDeclarations = Object.entries(prefixes)
            .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
            .join('\n');

        const trigPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(trigUri, currentPrefixes)
            : `<${trigUri}>`;

        const conceptPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(conceptUri, currentPrefixes)
            : `<${conceptUri}>`;

        // issue #264, #270: Вычисляем URI виртуального контейнера (vt_* вместо t_*)
        // Virtual TriG имеет формат vad:vt_* для TriG vad:t_*
        let virtualTrigPrefixed = trigPrefixed;
        if (trigPrefixed.startsWith('vad:t_')) {
            virtualTrigPrefixed = 'vad:vt_' + trigPrefixed.substring(6);
        } else if (trigPrefixed.startsWith('<') && trigPrefixed.includes('#t_')) {
            virtualTrigPrefixed = trigPrefixed.replace('#t_', '#vt_');
        }

        return `${prefixDeclarations}

# Удаление триплета vad:hasTrig в концепте процесса
DELETE DATA {
    GRAPH vad:ptree {
        ${conceptPrefixed} vad:hasTrig ${trigPrefixed} .
    }
};

# Удаление всего графа TriG
DROP GRAPH ${trigPrefixed};

# issue #264, #270: Каскадное удаление связанного Virtual TriG
# Virtual TriG (vt_*) удаляется вместе с родительским VADProcessDia (t_*)
DROP SILENT GRAPH ${virtualTrigPrefixed}`;
    },

    /**
     * issue #264, #270: Запрос для поиска Virtual TriG по родительскому VADProcessDia
     * Используется для каскадного удаления Virtual TriG
     * @param {string} parentTrigUri - URI родительского VADProcessDia TriG
     */
    FIND_VIRTUAL_TRIG_BY_PARENT: (parentTrigUri) => `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX vad: <http://example.org/vad#>

SELECT ?virtualTrig WHERE {
    GRAPH ?virtualTrig {
        ?virtualTrig rdf:type vad:Virtual .
        ?virtualTrig vad:hasParentObj <${parentTrigUri}> .
    }
}`,

    /**
     * issue #270: Генерирует DELETE запрос для удаления Virtual TriG
     * @param {string} virtualTrigUri - URI виртуального TriG
     * @param {Object} prefixes - Объект префиксов
     */
    GENERATE_DELETE_VIRTUAL_TRIG_QUERY: (virtualTrigUri, prefixes) => {
        const prefixDeclarations = Object.entries(prefixes)
            .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
            .join('\n');

        const virtualTrigPrefixed = typeof getPrefixedName === 'function'
            ? getPrefixedName(virtualTrigUri, currentPrefixes)
            : `<${virtualTrigUri}>`;

        return `${prefixDeclarations}

# issue #270: Удаление Virtual TriG
DROP GRAPH ${virtualTrigPrefixed}`;
    }
};

