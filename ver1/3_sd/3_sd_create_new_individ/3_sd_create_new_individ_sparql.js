// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/309
// PR #310

/**
 * SPARQL Queries for Create New Individ module
 *
 * Модуль содержит все SPARQL запросы, используемые при создании
 * новых Индивидов (процессов и исполнителей) в соответствии с
 * концепцией SPARQL-driven Programming.
 *
 * @file 3_sd_create_new_individ_sparql.js
 * @version 1.0
 * @date 2026-02-06
 * @see sparql-driven-programming_min1.md - Концепция SPARQL-driven Programming
 * @see io_concept_individ_v4.md - Алгоритмы создания/удаления (v4)
 * @see new_individ_process.md - Анализ именования индивидов
 */

/**
 * SPARQL запросы для модуля создания индивидов
 */
const NEW_INDIVID_SPARQL = {
    /**
     * Получение всех TriG типа VADProcessDia для выбора схемы
     */
    GET_ALL_TRIGS: `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vad: <http://example.org/vad#>

SELECT ?trig ?label WHERE {
    ?trig rdf:type vad:VADProcessDia .
    OPTIONAL { ?trig rdfs:label ?label }
}`,

    /**
     * Получение всех концептов процессов из ptree
     * Используется для выбора концепта процесса при создании индивида
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
     * Используется для выбора при создании индивида исполнителя
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
     * Проверка существования индивида процесса в TriG
     * Проверяет, есть ли уже индивид данного концепта в выбранном TriG
     * @param {string} conceptUri - URI концепта процесса
     * @param {string} trigUri - URI TriG схемы
     */
    CHECK_INDIVID_EXISTS_IN_TRIG: (conceptUri, trigUri) => `
PREFIX vad: <http://example.org/vad#>

SELECT ?individ WHERE {
    GRAPH <${trigUri}> {
        <${conceptUri}> vad:isSubprocessTrig <${trigUri}> .
    }
    BIND(<${conceptUri}> AS ?individ)
}`,

    /**
     * Получение всех индивидов процесса в TriG для выбора vad:hasNext
     * @param {string} trigUri - URI TriG схемы
     */
    GET_INDIVIDS_IN_TRIG: (trigUri) => `
PREFIX vad: <http://example.org/vad#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

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
     * Получение всех ExecutorGroup в TriG для генерации уникального ID
     * @param {string} trigUri - URI TriG схемы
     */
    GET_EXECUTOR_GROUPS_IN_TRIG: (trigUri) => `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX vad: <http://example.org/vad#>

SELECT ?group WHERE {
    GRAPH <${trigUri}> {
        ?group rdf:type vad:ExecutorGroup .
    }
}`,

    /**
     * Генерирует INSERT SPARQL запрос для создания нового индивида процесса
     * Включает: сам индивид + ExecutorGroup
     * @param {string} trigUri - URI TriG графа (prefixed)
     * @param {string} individUri - URI индивида (prefixed)
     * @param {string} executorGroupUri - URI ExecutorGroup (prefixed)
     * @param {Array<string>} hasNextUris - Массив URI для vad:hasNext (prefixed)
     * @param {string} individLabel - Label индивида
     * @param {Object} prefixes - Объект префиксов
     */
    GENERATE_INSERT_PROCESS_INDIVID_QUERY: (trigUri, individUri, executorGroupUri, hasNextUris, individLabel, prefixes) => {
        const prefixDeclarations = Object.entries(prefixes)
            .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
            .join('\n');

        let triplets = '';
        triplets += `        ${individUri} vad:isSubprocessTrig ${trigUri} ;\n`;
        triplets += `            vad:hasExecutor ${executorGroupUri}`;

        if (hasNextUris && hasNextUris.length > 0) {
            triplets += ` ;\n            vad:hasNext ${hasNextUris.join(' , ')}`;
        }

        triplets += ' .\n';

        // ExecutorGroup
        triplets += `\n        # Группа исполнителей (ID формируется как ExecutorGroup_ + ID процесса)\n`;
        triplets += `        ${executorGroupUri} rdf:type vad:ExecutorGroup ;\n`;
        triplets += `            dcterms:description "Группа исполнителей процесса ${individLabel}" .`;

        return `${prefixDeclarations}

# Создание нового индивида процесса с ExecutorGroup
INSERT DATA {
    GRAPH ${trigUri} {
${triplets}
    }
}`;
    },

    /**
     * Генерирует INSERT SPARQL запрос для добавления vad:includes к ExecutorGroup
     * (создание индивида исполнителя)
     * @param {string} trigUri - URI TriG графа (prefixed)
     * @param {string} executorGroupUri - URI ExecutorGroup (prefixed)
     * @param {string} executorUri - URI исполнителя (prefixed)
     * @param {Object} prefixes - Объект префиксов
     */
    GENERATE_INSERT_EXECUTOR_INDIVID_QUERY: (trigUri, executorGroupUri, executorUri, prefixes) => {
        const prefixDeclarations = Object.entries(prefixes)
            .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
            .join('\n');

        return `${prefixDeclarations}

# Добавление исполнителя в группу (индивид исполнителя)
INSERT DATA {
    GRAPH ${trigUri} {
        ${executorGroupUri} vad:includes ${executorUri} .
    }
}`;
    },

    /**
     * Получение всех ExecutorGroups в TriG для выбора при добавлении исполнителя
     * @param {string} trigUri - URI TriG графа
     */
    GET_EXECUTOR_GROUPS_FOR_TRIG: (trigUri) => `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vad: <http://example.org/vad#>

SELECT ?group ?label WHERE {
    GRAPH <${trigUri}> {
        ?group rdf:type vad:ExecutorGroup .
        OPTIONAL { ?group rdfs:label ?label }
    }
}`,

    /**
     * issue #309: Поиск ExecutorGroup для указанного индивида процесса в TriG
     * Используется для авто-определения ExecutorGroup при создании индивида исполнителя
     * @param {string} processIndividUri - URI индивида процесса
     * @param {string} trigUri - URI TriG графа
     */
    FIND_EXECUTOR_GROUP_FOR_PROCESS_INDIVID: (processIndividUri, trigUri) => `
PREFIX vad: <http://example.org/vad#>

SELECT ?executorGroup WHERE {
    GRAPH <${trigUri}> {
        <${processIndividUri}> vad:hasExecutor ?executorGroup .
    }
}`,

    /**
     * issue #429: Получение уже привязанных исполнителей для ExecutorGroup в TriG
     * Используется для формирования списка недоступных значений в справочнике исполнителей
     * (через funSPARQLvaluesDoubleSync — исполнители, уже входящие в ExecutorGroup, отображаются
     * серым и недоступны для повторного выбора)
     * @param {string} executorGroupUri - URI ExecutorGroup
     * @param {string} trigUri - URI TriG графа
     */
    GET_BOUND_EXECUTORS_FOR_GROUP: (executorGroupUri, trigUri) => `
PREFIX vad: <http://example.org/vad#>

SELECT ?executor WHERE {
    GRAPH <${trigUri}> {
        <${executorGroupUri}> vad:includes ?executor .
    }
}`
};

