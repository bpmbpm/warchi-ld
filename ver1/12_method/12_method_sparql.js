// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/368
// 12_method_sparql.js - SPARQL запросы модуля Методы
// Запросы для получения и выполнения методов объектов

        /**
         * Получает список методов для указанного типа объекта через SPARQL
         * @param {string} objectMethodType - Тип объекта ('isSubprocessTrig' или 'ExecutorGroup')
         * @returns {Promise<Array>} - Массив объектов { label, functionId }
         */
        async function getMethodsForType(objectMethodType) {
            // Формируем URI типа для SPARQL запроса
            const typeUri = objectMethodType === 'ExecutorGroup'
                ? 'http://example.org/vad#ExecutorGroup'
                : 'http://example.org/vad#isSubprocessTrig';

            // issue #336: Запрос методов из графа vad:techtree (технологическое приложение)
            const query = `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                PREFIX vad: <http://example.org/vad#>

                SELECT ?method ?label ?functionId WHERE {
                    GRAPH vad:techtree {
                        ?method rdf:type vad:ObjectMethod .
                        ?method vad:methodForType <${typeUri}> .
                        ?method rdfs:label ?label .
                        ?method vad:methodFunction ?functionId .
                    }
                }
            `;

            try {
                // Используем funSPARQLvaluesComunica для выполнения запроса
                if (typeof funSPARQLvaluesComunica === 'function') {
                    const results = await funSPARQLvaluesComunica(query, currentPrefixes);
                    return results.map(row => ({
                        uri: row.method,
                        label: row.label,
                        functionId: row.functionId
                    }));
                } else {
                    console.warn('funSPARQLvaluesComunica not available');
                    return [];
                }
            } catch (error) {
                console.error('getMethodsForType error:', error);
                return [];
            }
        }

