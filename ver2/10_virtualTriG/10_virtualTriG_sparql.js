// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/317
// 10_virtualTriG_sparql.js - SPARQL запросы для модуля Virtual TriG

/**
 * Коллекция SPARQL запросов для работы с Virtual TriG
 * Согласно SPARQL-driven programming (base_concept_rules.md)
 */

const VIRTUAL_TRIG_SPARQL = {
    /**
     * Проверяет, является ли граф виртуальным (vad:Virtual)
     * @param {string} graphUri - URI графа для проверки
     * @returns {string} - SPARQL ASK запрос
     */
    IS_VIRTUAL_GRAPH: (graphUri) => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        ASK {
            GRAPH <${graphUri}> {
                <${graphUri}> rdf:type vad:Virtual .
            }
        }
    `,

    /**
     * Получает все виртуальные графы с их родителями
     * @returns {string} - SPARQL SELECT запрос
     */
    GET_ALL_VIRTUAL_TRIGS: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        SELECT ?virtualTrig ?parentTrig WHERE {
            GRAPH ?virtualTrig {
                ?virtualTrig rdf:type vad:Virtual ;
                    vad:hasParentObj ?parentTrig .
            }
        }
    `,

    /**
     * Получает родительский TriG для виртуального графа
     * @param {string} virtualGraphUri - URI виртуального графа
     * @returns {string} - SPARQL SELECT запрос
     */
    GET_VIRTUAL_TRIG_PARENT: (virtualGraphUri) => `
        PREFIX vad: <http://example.org/vad#>

        SELECT ?parent WHERE {
            GRAPH <${virtualGraphUri}> {
                <${virtualGraphUri}> vad:hasParentObj ?parent .
            }
        }
        LIMIT 1
    `,

    /**
     * Получает все processSubtype для указанного Virtual TriG
     * @param {string} virtualGraphUri - URI виртуального графа
     * @returns {string} - SPARQL SELECT запрос
     */
    GET_PROCESS_SUBTYPES: (virtualGraphUri) => `
        PREFIX vad: <http://example.org/vad#>

        SELECT ?process ?subtype WHERE {
            GRAPH <${virtualGraphUri}> {
                ?process vad:processSubtype ?subtype .
            }
        }
    `,

    /**
     * Получает все виртуальные данные для всех графов
     * @returns {string} - SPARQL SELECT запрос
     */
    GET_ALL_VIRTUAL_DATA: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        SELECT ?virtualTrig ?parentTrig ?process ?subtype WHERE {
            GRAPH ?virtualTrig {
                ?virtualTrig rdf:type vad:Virtual ;
                    vad:hasParentObj ?parentTrig .
                OPTIONAL {
                    ?process vad:processSubtype ?subtype .
                }
            }
        }
        ORDER BY ?virtualTrig ?process
    `,

    /**
     * Получает метаданные процессов из ptree для вычисления подтипов
     * @returns {string} - SPARQL SELECT запрос
     */
    GET_PROCESS_METADATA_FROM_PTREE: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX vad: <http://example.org/vad#>

        SELECT ?process ?hasParentObj ?hasTrig ?label WHERE {
            GRAPH vad:ptree {
                ?process rdf:type vad:TypeProcess .
                OPTIONAL { ?process vad:hasParentObj ?hasParentObj }
                OPTIONAL { ?process vad:hasParentProcess ?hasParentProcess }
                OPTIONAL { ?process vad:hasTrig ?hasTrig }
                OPTIONAL { ?process rdfs:label ?label }
            }
        }
    `,

    /**
     * Получает все VADProcessDia графы с их definesProcess
     * @returns {string} - SPARQL SELECT запрос
     */
    GET_VAD_PROCESS_DIA_GRAPHS: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX vad: <http://example.org/vad#>

        SELECT DISTINCT ?trig ?definesProcess ?label WHERE {
            GRAPH ?trig {
                ?trig rdf:type vad:VADProcessDia .
                OPTIONAL { ?trig vad:definesProcess ?definesProcess }
                OPTIONAL { ?trig vad:hasParentObj ?hasParent }
                OPTIONAL { ?trig rdfs:label ?label }
            }
        }
    `,

    /**
     * Получает индивиды процессов в TriG через isSubprocessTrig
     * @param {string} trigUri - URI TriG графа
     * @returns {string} - SPARQL SELECT запрос
     */
    GET_PROCESS_INDIVIDUALS_IN_TRIG: (trigUri) => `
        PREFIX vad: <http://example.org/vad#>

        SELECT DISTINCT ?process WHERE {
            GRAPH <${trigUri}> {
                ?process vad:isSubprocessTrig <${trigUri}> .
            }
        }
    `,

    /**
     * Удаляет Virtual TriG по родительскому TriG
     * @param {string} parentTrigUri - URI родительского VADProcessDia
     * @returns {string} - SPARQL DELETE запрос
     */
    DELETE_VIRTUAL_TRIG_BY_PARENT: (parentTrigUri) => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        DELETE {
            GRAPH ?virtualGraph { ?s ?p ?o }
        }
        WHERE {
            GRAPH ?virtualGraph {
                ?virtualGraph rdf:type vad:Virtual ;
                    vad:hasParentObj <${parentTrigUri}> .
                ?s ?p ?o .
            }
        }
    `,

    /**
     * Удаляет все Virtual TriG
     * @returns {string} - SPARQL DELETE запрос
     */
    DELETE_ALL_VIRTUAL_TRIGS: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        DELETE {
            GRAPH ?virtualGraph { ?s ?p ?o }
        }
        WHERE {
            GRAPH ?virtualGraph {
                ?virtualGraph rdf:type vad:Virtual .
                ?s ?p ?o .
            }
        }
    `,

    /**
     * Создаёт INSERT запрос для Virtual TriG
     * @param {string} virtualTrigUri - URI виртуального TriG
     * @param {string} parentTrigUri - URI родительского TriG
     * @param {Object} processSubtypes - { processUri: subtypeName }
     * @returns {string} - SPARQL INSERT запрос
     */
    INSERT_VIRTUAL_TRIG: (virtualTrigUri, parentTrigUri, processSubtypes) => {
        let insertData = '';

        // Метаданные Virtual TriG
        insertData += `        <${virtualTrigUri}> rdf:type vad:Virtual .\n`;
        insertData += `        <${virtualTrigUri}> vad:hasParentObj <${parentTrigUri}> .\n`;

        // processSubtype для каждого процесса
        for (const [processUri, subtypeName] of Object.entries(processSubtypes)) {
            insertData += `        <${processUri}> vad:processSubtype vad:${subtypeName} .\n`;
        }

        return `
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX vad: <http://example.org/vad#>

            INSERT DATA {
                GRAPH <${virtualTrigUri}> {
${insertData}                }
            }
        `;
    },

    /**
     * Проверяет консистентность: все vt_* графы должны иметь тип vad:Virtual
     * @returns {string} - SPARQL SELECT запрос для поиска нарушений
     */
    CHECK_VIRTUAL_TRIG_CONSISTENCY: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        SELECT ?graph WHERE {
            GRAPH ?graph { ?s ?p ?o }
            FILTER(STRENDS(STR(?graph), "vt_"))
            FILTER NOT EXISTS {
                GRAPH ?graph { ?graph rdf:type vad:Virtual }
            }
        }
    `,

    /**
     * Получает подтип процесса из любого Virtual TriG
     * @param {string} processUri - URI процесса
     * @returns {string} - SPARQL SELECT запрос
     */
    GET_PROCESS_SUBTYPE: (processUri) => `
        PREFIX vad: <http://example.org/vad#>

        SELECT ?subtype ?virtualTrig WHERE {
            GRAPH ?virtualTrig {
                ?virtualTrig rdf:type vad:Virtual .
                <${processUri}> vad:processSubtype ?subtype .
            }
        }
        LIMIT 1
    `,

    /**
     * Получает все процессы с подтипами для визуализации
     * @returns {string} - SPARQL SELECT запрос
     */
    GET_ALL_PROCESS_SUBTYPES_FOR_VIZ: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        SELECT ?process ?subtype ?parentTrig WHERE {
            GRAPH ?virtualTrig {
                ?virtualTrig rdf:type vad:Virtual ;
                    vad:hasParentObj ?parentTrig .
                ?process vad:processSubtype ?subtype .
            }
        }
    `
};

// Экспорт для использования в других модулях

