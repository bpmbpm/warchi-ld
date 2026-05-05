// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/317
// 11_reasoning_sparql.js - SPARQL запросы для модуля Reasoning

/**
 * Коллекция SPARQL запросов для работы с Reasoner
 * Включает CONSTRUCT запросы для материализации и SELECT для валидации
 */

const REASONING_SPARQL = {
    /**
     * CONSTRUCT запрос для вычисления processSubtype
     * Используется comunica-feature-reasoning
     *
     * @returns {string} - SPARQL CONSTRUCT запрос
     */
    CONSTRUCT_PROCESS_SUBTYPES: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        CONSTRUCT {
            ?process vad:processSubtype ?subtype .
        }
        WHERE {
            # Получаем процессы из ptree
            GRAPH vad:ptree {
                ?process rdf:type vad:TypeProcess .
                OPTIONAL { ?process vad:hasParentObj ?parentObj }
                OPTIONAL { ?process vad:hasParentProcess ?parentProcess }
                OPTIONAL { ?process vad:hasTrig ?hasTrig }
            }

            # Объединяем hasParentObj и hasParentProcess
            BIND(COALESCE(?parentObj, ?parentProcess) AS ?parent)

            # Находим в каком TriG находится индивид
            OPTIONAL {
                GRAPH ?trig {
                    ?process vad:isSubprocessTrig ?trig .
                    ?trig vad:definesProcess ?defines .
                }
            }

            # Вычисляем подтип
            BIND(
                IF(?parent = vad:pNotDefined || ?parent = vad:NotDefined,
                    vad:NotDefinedType,
                    IF(BOUND(?hasTrig),
                        IF(?parent = ?defines, vad:DetailedChild, vad:DetailedExternal),
                        IF(?parent = ?defines, vad:notDetailedChild, vad:notDetailedExternal)
                    )
                ) AS ?subtype
            )

            FILTER(BOUND(?subtype))
        }
    `,

    /**
     * SELECT запрос для получения всех процессов с их атрибутами
     * Используется для подготовки данных для reasoning
     *
     * @returns {string} - SPARQL SELECT запрос
     */
    GET_PROCESSES_FOR_REASONING: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX vad: <http://example.org/vad#>

        SELECT ?process ?parent ?hasTrig ?label ?inTrig ?defines WHERE {
            GRAPH vad:ptree {
                ?process rdf:type vad:TypeProcess .
                OPTIONAL { ?process vad:hasParentObj ?parentObj }
                OPTIONAL { ?process vad:hasParentProcess ?parentProcess }
                OPTIONAL { ?process vad:hasTrig ?hasTrig }
                OPTIONAL { ?process rdfs:label ?label }
            }

            BIND(COALESCE(?parentObj, ?parentProcess) AS ?parent)

            OPTIONAL {
                GRAPH ?inTrig {
                    ?process vad:isSubprocessTrig ?inTrig .
                    ?inTrig rdf:type vad:VADProcessDia .
                    OPTIONAL { ?inTrig vad:definesProcess ?defines }
                }
            }
        }
    `,

    /**
     * INSERT запрос для материализации выведенных подтипов
     *
     * @param {string} virtualTrigUri - URI виртуального TriG
     * @param {string} parentTrigUri - URI родительского TriG
     * @param {Array} subtypes - [{ processUri, subtype }]
     * @returns {string} - SPARQL INSERT запрос
     */
    INSERT_INFERRED_SUBTYPES: (virtualTrigUri, parentTrigUri, subtypes) => {
        let insertData = '';

        // Метаданные Virtual TriG
        insertData += `        <${virtualTrigUri}> rdf:type vad:Virtual .\n`;
        insertData += `        <${virtualTrigUri}> vad:hasParentObj <${parentTrigUri}> .\n`;

        // Выведенные подтипы
        subtypes.forEach(({ processUri, subtype }) => {
            insertData += `        <${processUri}> vad:processSubtype <${subtype}> .\n`;
        });

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
     * DELETE запрос для очистки выведенных данных перед пересчётом
     *
     * @returns {string} - SPARQL DELETE запрос
     */
    DELETE_ALL_INFERRED_SUBTYPES: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        DELETE {
            GRAPH ?g { ?s vad:processSubtype ?o }
        }
        WHERE {
            GRAPH ?g {
                ?g rdf:type vad:Virtual .
                ?s vad:processSubtype ?o .
            }
        }
    `,

    /**
     * SELECT для проверки консистентности выведенных данных
     * Находит процессы без вычисленного подтипа
     *
     * @returns {string} - SPARQL SELECT запрос
     */
    CHECK_MISSING_SUBTYPES: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        SELECT ?process ?trig WHERE {
            GRAPH ?trig {
                ?process vad:isSubprocessTrig ?trig .
                ?trig rdf:type vad:VADProcessDia .
            }

            FILTER NOT EXISTS {
                GRAPH ?virtualTrig {
                    ?virtualTrig rdf:type vad:Virtual .
                    ?process vad:processSubtype ?anySubtype .
                }
            }
        }
    `,

    /**
     * SELECT для проверки конфликтующих подтипов
     * Находит процессы с несколькими подтипами
     *
     * @returns {string} - SPARQL SELECT запрос
     */
    CHECK_CONFLICTING_SUBTYPES: () => `
        PREFIX vad: <http://example.org/vad#>

        SELECT ?process (COUNT(?subtype) AS ?count) WHERE {
            GRAPH ?g {
                ?process vad:processSubtype ?subtype .
            }
        }
        GROUP BY ?process
        HAVING (COUNT(?subtype) > 1)
    `,

    /**
     * CONSTRUCT для генерации RDFS иерархии классов
     * Используется для reasoning с rdfs:subClassOf
     *
     * @returns {string} - SPARQL CONSTRUCT запрос
     */
    CONSTRUCT_RDFS_HIERARCHY: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX vad: <http://example.org/vad#>

        CONSTRUCT {
            vad:DetailedChild rdfs:subClassOf vad:Detailed .
            vad:DetailedExternal rdfs:subClassOf vad:Detailed .
            vad:notDetailedChild rdfs:subClassOf vad:notDetailed .
            vad:notDetailedExternal rdfs:subClassOf vad:notDetailed .
            vad:Detailed rdfs:subClassOf vad:ProcessSubtype .
            vad:notDetailed rdfs:subClassOf vad:ProcessSubtype .
            vad:NotDefinedType rdfs:subClassOf vad:ProcessSubtype .
        }
        WHERE { }
    `,

    /**
     * ASK запрос для проверки типа reasoning engine
     * Проверяет поддержку RDFS entailment
     *
     * @returns {string} - SPARQL ASK запрос
     */
    CHECK_RDFS_SUPPORT: () => `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX vad: <http://example.org/vad#>

        ASK {
            vad:DetailedChild rdfs:subClassOf vad:Detailed .
            vad:Detailed rdfs:subClassOf vad:ProcessSubtype .
            # Если reasoning работает, следующее должно быть true:
            # vad:DetailedChild rdfs:subClassOf vad:ProcessSubtype .
        }
    `,

    /**
     * SELECT для получения всех подклассов ProcessSubtype
     * Используется для валидации подтипов
     *
     * @returns {string} - SPARQL SELECT запрос
     */
    GET_PROCESS_SUBTYPE_CLASSES: () => `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX vad: <http://example.org/vad#>

        SELECT ?subtype WHERE {
            ?subtype rdfs:subClassOf* vad:ProcessSubtype .
            FILTER(?subtype != vad:ProcessSubtype)
        }
    `,

    /**
     * CONSTRUCT для вывода isDetailed свойства
     * Промежуточный шаг для вычисления подтипов
     *
     * @returns {string} - SPARQL CONSTRUCT запрос
     */
    CONSTRUCT_IS_DETAILED: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX vad: <http://example.org/vad#>

        CONSTRUCT {
            ?process vad:isDetailed ?isDetailed .
        }
        WHERE {
            GRAPH vad:ptree {
                ?process rdf:type vad:TypeProcess .
            }
            OPTIONAL {
                GRAPH vad:ptree {
                    ?process vad:hasTrig ?trig .
                }
            }
            BIND(BOUND(?trig) AS ?isDetailed)
        }
    `,

    /**
     * SELECT для отладки: показать все данные для reasoning
     *
     * @returns {string} - SPARQL SELECT запрос
     */
    DEBUG_REASONING_DATA: () => `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX vad: <http://example.org/vad#>

        SELECT ?process ?parent ?hasTrig ?isDetailed ?inTrig ?defines ?expectedSubtype WHERE {
            # Процессы из ptree
            GRAPH vad:ptree {
                ?process rdf:type vad:TypeProcess .
                OPTIONAL { ?process vad:hasParentObj ?parent }
                OPTIONAL { ?process vad:hasTrig ?hasTrig }
            }

            # Где находится индивид
            OPTIONAL {
                GRAPH ?inTrig {
                    ?process vad:isSubprocessTrig ?inTrig .
                    ?inTrig rdf:type vad:VADProcessDia .
                    OPTIONAL { ?inTrig vad:definesProcess ?defines }
                }
            }

            # Вычисленные значения
            BIND(BOUND(?hasTrig) AS ?isDetailed)
            BIND(
                IF(?parent = vad:pNotDefined,
                    "NotDefinedType",
                    IF(?isDetailed,
                        IF(?parent = ?defines, "DetailedChild", "DetailedExternal"),
                        IF(?parent = ?defines, "notDetailedChild", "notDetailedExternal")
                    )
                ) AS ?expectedSubtype
            )
        }
        ORDER BY ?process
    `
};

// Экспорт для использования в других модулях

