// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/252
// vadlib_sparql.js - SPARQL query engine functions for RDF Grapher

// Ensure comunicaEngine is available in current scope
if (typeof comunicaEngine === 'undefined') {
    var comunicaEngine = null;
}

        // ==============================================================================
        // TODO к удалению: funSPARQLvalues
        // issue #427: Функция помечена к удалению. Заменяется на funConceptList_v2.
        // Все вызовы для получения концептов из ptree/rtree заменены на funConceptList_v2.
        // ==============================================================================
        /*
        function funSPARQLvalues(sparqlQuery, variableName = 'value') {
            const results = [];

            // issue #322: Используем currentStore как единственный источник данных
            // Fallback на currentQuads для обратной совместимости
            if (!currentStore) {
                console.log('funSPARQLvalues: No data in store');
                return results;
            }

            // issue #322: Получаем квады из store вместо currentQuads
            const sourceQuads = currentStore.getQuads(null, null, null, null);
            if (sourceQuads.length === 0) {
                console.log('funSPARQLvalues: Store is empty');
                return results;
            }

            try {
                // Простая реализация через анализ текущих квадов
                // Для сложных SPARQL запросов нужно использовать Comunica
                // Но для базовых SELECT запросов можно обойтись анализом квадов

                // Парсим тип запроса
                const selectMatch = sparqlQuery.match(/SELECT\s+(\?[\w]+(?:\s+\?[\w]+)*)/i);
                if (!selectMatch) {
                    console.log('funSPARQLvalues: Not a SELECT query');
                    return results;
                }

                const variables = selectMatch[1].split(/\s+/).map(v => v.substring(1));

                // Парсим WHERE условие с поддержкой вложенных скобок
                const whereStartIndex = sparqlQuery.search(/WHERE\s*\{/i);
                if (whereStartIndex === -1) {
                    console.log('funSPARQLvalues: No WHERE clause found');
                    return results;
                }

                // Находим открывающую скобку WHERE
                const openBraceIndex = sparqlQuery.indexOf('{', whereStartIndex);
                let braceCount = 1;
                let closeIndex = openBraceIndex + 1;

                // Ищем соответствующую закрывающую скобку с учетом вложенности
                while (braceCount > 0 && closeIndex < sparqlQuery.length) {
                    if (sparqlQuery[closeIndex] === '{') braceCount++;
                    else if (sparqlQuery[closeIndex] === '}') braceCount--;
                    closeIndex++;
                }

                const whereClause = sparqlQuery.substring(openBraceIndex + 1, closeIndex - 1).trim();

                // Парсим triple patterns (упрощенно)
                const triplePatterns = parseTriplePatterns(whereClause);

                // Выполняем запрос через сопоставление паттернов
                const bindings = executeSimpleSelect(triplePatterns, variables);

                // Формируем результаты
                const seen = new Set();
                bindings.forEach(binding => {
                    const valueVar = variableName in binding ? variableName : variables[0];
                    const value = binding[valueVar];
                    if (value && !seen.has(value)) {
                        seen.add(value);
                        const label = binding['label'] || getPrefixedName(value, currentPrefixes);
                        results.push({
                            uri: value,
                            label: label
                        });
                    }
                });

            } catch (error) {
                console.error('funSPARQLvalues error:', error);
            }

            return results;
        }
        */

        /**
         * Разбивает строку SPARQL triple patterns по символу '.' (конец триплета),
         * игнорируя точки внутри URI в угловых скобках (<...>) и строковых литералов ("...").
         * @param {string} content - Строка с triple patterns
         * @returns {Array<string>} - Массив строк-триплетов
         */
        function splitSparqlStatements(content) {
            const statements = [];
            let current = '';
            let inAngleBrackets = 0;
            let inDoubleQuotes = false;
            let inSingleQuotes = false;

            for (let i = 0; i < content.length; i++) {
                const ch = content[i];

                if (ch === '"' && !inSingleQuotes && inAngleBrackets === 0) {
                    inDoubleQuotes = !inDoubleQuotes;
                    current += ch;
                } else if (ch === "'" && !inDoubleQuotes && inAngleBrackets === 0) {
                    inSingleQuotes = !inSingleQuotes;
                    current += ch;
                } else if (ch === '<' && !inDoubleQuotes && !inSingleQuotes) {
                    inAngleBrackets++;
                    current += ch;
                } else if (ch === '>' && !inDoubleQuotes && !inSingleQuotes && inAngleBrackets > 0) {
                    inAngleBrackets--;
                    current += ch;
                } else if (ch === '.' && inAngleBrackets === 0 && !inDoubleQuotes && !inSingleQuotes) {
                    // Это разделитель триплета
                    const trimmed = current.trim();
                    if (trimmed) {
                        statements.push(trimmed);
                    }
                    current = '';
                } else {
                    current += ch;
                }
            }

            // Добавляем последний фрагмент (без завершающей точки)
            const trimmed = current.trim();
            if (trimmed) {
                statements.push(trimmed);
            }

            return statements;
        }

        /**
         * Парсит простые triple patterns из WHERE клаузы
         * @param {string} whereClause - Строка с triple patterns
         * @returns {Array} - Массив паттернов {subject, predicate, object, graph}
         */
        function parseTriplePatterns(whereClause) {
            const patterns = [];

            // Ищем GRAPH блоки с поддержкой вложенных скобок
            const graphRegex = /GRAPH\s+(\S+)\s*\{/gi;
            let graphMatch;
            let processedRanges = [];

            while ((graphMatch = graphRegex.exec(whereClause)) !== null) {
                const graphUri = resolveValue(graphMatch[1]);
                const openBraceIndex = graphMatch.index + graphMatch[0].length - 1;

                // Находим закрывающую скобку с учетом вложенности
                let braceCount = 1;
                let closeIndex = openBraceIndex + 1;
                while (braceCount > 0 && closeIndex < whereClause.length) {
                    if (whereClause[closeIndex] === '{') braceCount++;
                    else if (whereClause[closeIndex] === '}') braceCount--;
                    closeIndex++;
                }

                const graphContent = whereClause.substring(openBraceIndex + 1, closeIndex - 1);
                processedRanges.push({ start: graphMatch.index, end: closeIndex });

                // Удаляем OPTIONAL блоки из содержимого графа (они пока не поддерживаются)
                const cleanedContent = graphContent.replace(/OPTIONAL\s*\{[^}]*\}/gi, '');

                // Парсим триплеты внутри графа (splitSparqlStatements учитывает точки внутри URI)
                const innerStatements = splitSparqlStatements(cleanedContent);
                innerStatements.forEach(inner => {
                    // Пропускаем пустые строки и комментарии
                    const trimmed = inner.trim();
                    if (!trimmed || trimmed.startsWith('#')) return;

                    const parts = trimmed.split(/\s+/);
                    if (parts.length >= 3) {
                        patterns.push({
                            subject: resolveValue(parts[0]),
                            predicate: resolveValue(parts[1]),
                            object: resolveValue(parts.slice(2).join(' ')),
                            graph: graphUri
                        });
                    }
                });
            }

            // Обрабатываем триплеты вне GRAPH блоков
            let remainingClause = whereClause;
            // Удаляем обработанные GRAPH блоки (в обратном порядке чтобы индексы не сбились)
            processedRanges.sort((a, b) => b.start - a.start).forEach(range => {
                remainingClause = remainingClause.substring(0, range.start) + remainingClause.substring(range.end);
            });

            // Удаляем OPTIONAL блоки
            remainingClause = remainingClause.replace(/OPTIONAL\s*\{[^}]*\}/gi, '');

            const statements = splitSparqlStatements(remainingClause);
            statements.forEach(statement => {
                const trimmed = statement.trim();
                if (!trimmed || trimmed.startsWith('#')) return;

                const parts = trimmed.split(/\s+/);
                if (parts.length >= 3) {
                    patterns.push({
                        subject: resolveValue(parts[0]),
                        predicate: resolveValue(parts[1]),
                        object: resolveValue(parts.slice(2).join(' ')),
                        graph: null
                    });
                }
            });

            return patterns;
        }

        /**
         * Разрешает значение (prefix:local -> полный URI, или оставляет переменную)
         */
        function resolveValue(value) {
            if (!value) return null;
            value = value.trim();

            // Если переменная
            if (value.startsWith('?')) {
                return { type: 'variable', name: value.substring(1) };
            }

            // Если полный URI в угловых скобках
            if (value.startsWith('<') && value.endsWith('>')) {
                return { type: 'uri', value: value.slice(1, -1) };
            }

            // Если prefixed name
            const colonIndex = value.indexOf(':');
            if (colonIndex > 0) {
                const prefix = value.substring(0, colonIndex);
                const local = value.substring(colonIndex + 1);
                const namespace = currentPrefixes[prefix];
                if (namespace) {
                    return { type: 'uri', value: namespace + local };
                }
            }

            // Если литерал в кавычках
            if (value.startsWith('"') || value.startsWith("'")) {
                return { type: 'literal', value: value.replace(/^["']|["']$/g, '') };
            }

            // Иначе считаем что это prefixed name без разрешения
            return { type: 'uri', value: value };
        }

        /**
         * Выполняет простой SELECT запрос через сопоставление паттернов с квадами
         * issue #322: Использует currentStore.getQuads() вместо currentQuads
         */
        function executeSimpleSelect(patterns, variables) {
            const bindings = [{}];

            // issue #322: Получаем квады из store
            const sourceQuads = currentStore ? currentStore.getQuads(null, null, null, null) : [];

            patterns.forEach(pattern => {
                const newBindings = [];

                bindings.forEach(binding => {
                    // Фильтруем квады по паттерну
                    sourceQuads.forEach(quad => {
                        const match = matchQuadToPattern(quad, pattern, binding);
                        if (match) {
                            newBindings.push({...binding, ...match});
                        }
                    });
                });

                // Заменяем bindings новыми
                bindings.length = 0;
                bindings.push(...newBindings);
            });

            return bindings;
        }

        /**
         * Сопоставляет квад с паттерном
         */
        // ==============================================================================
        // funSPARQLvaluesComunica — полная поддержка SPARQL через Comunica
        // Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/250
        // ==============================================================================

        /**
         * Выполняет SPARQL SELECT запрос с полной поддержкой SPARQL через Comunica.
         * Поддерживает UNION, OPTIONAL, FILTER, BIND и другие конструкции SPARQL,
         * которые не поддерживаются в funSPARQLvalues.
         *
         * issue #328: Исправлено - теперь возвращает полные bindings как объекты
         * со всеми SELECT-переменными в качестве ключей. Это необходимо для
         * правильной работы Virtual TriG и Reasoning модулей.
         *
         * @param {string} sparqlQuery - SPARQL SELECT запрос
         * @param {string|Object} variableNameOrPrefixes - Имя переменной для дедупликации (без '?') или словарь префиксов
         * @returns {Promise<Array<Object>>} Массив результатов - объектов со всеми переменными
         */
        async function funSPARQLvaluesComunica(sparqlQuery, variableNameOrPrefixes = 'value') {
            const results = [];

            // issue #328: Определяем, передан ли словарь префиксов или имя переменной
            // Если передан объект (не строка), это префиксы - используем 'value' по умолчанию
            let variableName = 'value';
            if (typeof variableNameOrPrefixes === 'string') {
                variableName = variableNameOrPrefixes;
            }

            // issue #322: Используем currentStore как единственный источник данных
            if (!currentStore) {
                console.log('funSPARQLvaluesComunica: No data in store');
                return results;
            }

            // issue #322: Проверяем наличие данных через store.size или getQuads
            const storeSize = currentStore.size !== undefined ? currentStore.size : currentStore.getQuads(null, null, null, null).length;
            if (storeSize === 0) {
                console.log('funSPARQLvaluesComunica: Store is empty');
                return results;
            }

            try {
                // Инициализируем Comunica engine если нужно
                // Use global or scope variable as available
                let engine = typeof comunicaEngine !== 'undefined' ? comunicaEngine : global.comunicaEngine;
                if (!engine) {
                    if (typeof Comunica !== 'undefined' && Comunica.QueryEngine) {
                        engine = new Comunica.QueryEngine();
                        // Store back to both scope locations
                        if (typeof comunicaEngine !== 'undefined') {
                            comunicaEngine = engine;
                        }
                        if (typeof global !== 'undefined') {
                            global.comunicaEngine = engine;
                        }
                    } else {
                        console.error('funSPARQLvaluesComunica: Comunica не загружена, возврат пустого результата');
                        return results;
                    }
                }

                // issue #322: Не нужно инициализировать store из currentQuads
                // currentStore уже является единственным источником данных

                // Выполняем запрос через Comunica
                const bindingsStream = await engine.queryBindings(sparqlQuery, {
                    sources: [currentStore]
                });

                const bindings = await bindingsStream.toArray();

                // issue #328: Возвращаем полные bindings как объекты
                // Каждый binding преобразуем в объект с именами переменных как ключами
                bindings.forEach(binding => {
                    const resultObj = {};

                    // Извлекаем все переменные из binding
                    for (const [variable, term] of binding) {
                        // variable.value содержит имя переменной без '?'
                        const varName = variable.value;
                        resultObj[varName] = term.value;
                    }

                    // Для обратной совместимости добавляем uri и label
                    // если есть основная переменная
                    if (resultObj[variableName]) {
                        resultObj.uri = resultObj[variableName];
                        resultObj.label = resultObj.label ||
                            getPrefixedName(resultObj[variableName], currentPrefixes);
                    }

                    results.push(resultObj);
                });

            } catch (error) {
                console.error('funSPARQLvaluesComunica error:', error);
                // Fallback на простую реализацию при ошибке Comunica
                console.log('funSPARQLvaluesComunica: Ошибка Comunica, возврат пустого результата');
                return results;
            }

            return results;
        }

        // ==============================================================================
        // funSPARQLvaluesDouble — получение справочника с выделением недоступных значений
        // Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/291
        // ==============================================================================

        /**
         * Выполняет два SPARQL SELECT запроса и возвращает объединённый результат
         * с пометкой недоступных (disabled) значений.
         *
         * Функция позволяет формировать справочники, где:
         * - Первый запрос (sparqlQuery1) возвращает полный список значений
         * - Второй запрос (sparqlQuery2) возвращает подмножество значений,
         *   которые должны быть помечены как недоступные (disabled)
         *
         * Пример использования: в справочнике концептов процессов вывести все процессы
         * из ptree, но подсветить серым те, которые уже имеют TriG (vad:hasTrig).
         *
         * @param {string} sparqlQuery1 - SPARQL SELECT запрос для полного списка
         * @param {string} variableName1 - Имя переменной для извлечения (без '?')
         * @param {string} sparqlQuery2 - SPARQL SELECT запрос для списка недоступных значений
         * @param {string} variableName2 - Имя переменной для извлечения (без '?')
         * @returns {Promise<Array<{uri: string, label: string, disabled: boolean}>>} Массив результатов
         *          где disabled=true означает, что значение найдено во втором запросе
         *
         * @example
         * // Получить все процессы, пометив серым те, у которых есть TriG
         * const processes = await funSPARQLvaluesDouble(
         *     `SELECT ?process ?label WHERE {
         *         GRAPH vad:ptree {
         *             ?process rdf:type vad:TypeProcess .
         *             ?process rdfs:label ?label .
         *         }
         *     }`,
         *     'process',
         *     `SELECT ?process WHERE {
         *         GRAPH vad:ptree {
         *             ?process rdf:type vad:TypeProcess .
         *             ?process vad:hasTrig ?trig .
         *         }
         *     }`,
         *     'process'
         * );
         * // Результат: [{uri: "vad:p1", label: "Процесс 1", disabled: false},
         * //             {uri: "vad:pGA", label: "Процесс ГА", disabled: true}, ...]
         */
        async function funSPARQLvaluesDouble(sparqlQuery1, variableName1 = 'value', sparqlQuery2, variableName2 = 'value') {
            const results = [];

            // issue #322: Используем currentStore как единственный источник данных
            if (!currentStore) {
                console.log('funSPARQLvaluesDouble: No data in store');
                return results;
            }

            try {
                // Получаем полный список из первого запроса
                let allValues = [];
                if (typeof funSPARQLvaluesComunica === 'function') {
                    allValues = await funSPARQLvaluesComunica(sparqlQuery1, variableName1);
                } else if (typeof funSPARQLvalues === 'function') {
                    allValues = funSPARQLvalues(sparqlQuery1, variableName1);
                }

                console.log(`funSPARQLvaluesDouble: Query1 returned ${allValues.length} values`);

                // Получаем список недоступных значений из второго запроса
                let disabledValues = [];
                if (typeof funSPARQLvaluesComunica === 'function') {
                    disabledValues = await funSPARQLvaluesComunica(sparqlQuery2, variableName2);
                } else if (typeof funSPARQLvalues === 'function') {
                    disabledValues = funSPARQLvalues(sparqlQuery2, variableName2);
                }

                console.log(`funSPARQLvaluesDouble: Query2 returned ${disabledValues.length} disabled values`);

                // Создаём Set для быстрой проверки недоступных значений
                const disabledUris = new Set(disabledValues.map(v => v.uri));

                // Формируем результат с пометкой disabled
                allValues.forEach(value => {
                    results.push({
                        uri: value.uri,
                        label: value.label,
                        disabled: disabledUris.has(value.uri)
                    });
                });

            } catch (error) {
                console.error('funSPARQLvaluesDouble error:', error);
            }

            return results;
        }

        /**
         * Синхронная версия funSPARQLvaluesDouble для случаев,
         * когда асинхронный вызов неудобен.
         *
         * @param {string} sparqlQuery1 - SPARQL SELECT запрос для полного списка
         * @param {string} variableName1 - Имя переменной для извлечения
         * @param {string} sparqlQuery2 - SPARQL SELECT запрос для списка недоступных значений
         * @param {string} variableName2 - Имя переменной для извлечения
         * @returns {Array<{uri: string, label: string, disabled: boolean}>} Массив результатов
         */
        function funSPARQLvaluesDoubleSync(sparqlQuery1, variableName1 = 'value', sparqlQuery2, variableName2 = 'value') {
            const results = [];

            // issue #322: Используем currentStore как единственный источник данных
            if (!currentStore) {
                console.log('funSPARQLvaluesDoubleSync: No data in store');
                return results;
            }

            try {
                // Получаем полный список из первого запроса (синхронно)
                let allValues = [];
                if (typeof funSPARQLvalues === 'function') {
                    allValues = funSPARQLvalues(sparqlQuery1, variableName1);
                }

                console.log(`funSPARQLvaluesDoubleSync: Query1 returned ${allValues.length} values`);

                // Получаем список недоступных значений из второго запроса (синхронно)
                let disabledValues = [];
                if (typeof funSPARQLvalues === 'function') {
                    disabledValues = funSPARQLvalues(sparqlQuery2, variableName2);
                }

                console.log(`funSPARQLvaluesDoubleSync: Query2 returned ${disabledValues.length} disabled values`);

                // Создаём Set для быстрой проверки недоступных значений
                const disabledUris = new Set(disabledValues.map(v => v.uri));

                // Формируем результат с пометкой disabled
                allValues.forEach(value => {
                    results.push({
                        uri: value.uri,
                        label: value.label,
                        disabled: disabledUris.has(value.uri)
                    });
                });

            } catch (error) {
                console.error('funSPARQLvaluesDoubleSync error:', error);
            }

            return results;
        }

        /**
         * Выполняет SPARQL UPDATE запрос (INSERT/DELETE) через Comunica.
         * Предназначена для будущего использования при автоматическом выполнении
         * UPDATE-запросов (в текущей архитектуре запросы генерируются, но не выполняются).
         *
         * @param {string} sparqlUpdateQuery - SPARQL UPDATE запрос (INSERT DATA / DELETE WHERE и т.д.)
         * @returns {Promise<boolean>} true если запрос выполнен успешно
         */
        async function funSPARQLvaluesComunicaUpdate(sparqlUpdateQuery) {
            // issue #322: Используем currentStore как единственный источник данных
            if (!currentStore) {
                console.log('funSPARQLvaluesComunicaUpdate: No data in store');
                return false;
            }

            try {
                // Инициализируем Comunica engine если нужно
                // Use global or scope variable as available
                let engine = typeof comunicaEngine !== 'undefined' ? comunicaEngine : global.comunicaEngine;
                if (!engine) {
                    if (typeof Comunica !== 'undefined' && Comunica.QueryEngine) {
                        engine = new Comunica.QueryEngine();
                        // Store back to both scope locations
                        if (typeof comunicaEngine !== 'undefined') {
                            comunicaEngine = engine;
                        }
                        if (typeof global !== 'undefined') {
                            global.comunicaEngine = engine;
                        }
                    } else {
                        console.error('funSPARQLvaluesComunicaUpdate: Comunica не загружена');
                        return false;
                    }
                }

                // issue #322: currentStore уже является единственным источником данных
                // Не нужно инициализировать из currentQuads

                // Выполняем UPDATE запрос через Comunica
                await engine.queryVoid(sparqlUpdateQuery, {
                    sources: [currentStore]
                });

                // issue #322: Не нужно обновлять currentQuads - он устарел
                // currentQuads больше не используется как источник данных

                return true;
            } catch (error) {
                console.error('funSPARQLvaluesComunicaUpdate error:', error);
                return false;
            }
        }

        function matchQuadToPattern(quad, pattern, currentBinding) {
            const newBinding = {};

            // Проверяем граф
            if (pattern.graph) {
                if (pattern.graph.type === 'variable') {
                    const boundValue = currentBinding[pattern.graph.name];
                    if (boundValue && boundValue !== quad.graph.value) return null;
                    newBinding[pattern.graph.name] = quad.graph.value;
                } else if (pattern.graph.type === 'uri') {
                    if (quad.graph.value !== pattern.graph.value) return null;
                }
            }

            // Проверяем субъект
            if (pattern.subject) {
                if (pattern.subject.type === 'variable') {
                    const boundValue = currentBinding[pattern.subject.name];
                    if (boundValue && boundValue !== quad.subject.value) return null;
                    newBinding[pattern.subject.name] = quad.subject.value;
                } else if (pattern.subject.type === 'uri') {
                    if (quad.subject.value !== pattern.subject.value) return null;
                }
            }

            // Проверяем предикат
            if (pattern.predicate) {
                if (pattern.predicate.type === 'variable') {
                    const boundValue = currentBinding[pattern.predicate.name];
                    if (boundValue && boundValue !== quad.predicate.value) return null;
                    newBinding[pattern.predicate.name] = quad.predicate.value;
                } else if (pattern.predicate.type === 'uri') {
                    if (quad.predicate.value !== pattern.predicate.value) return null;
                }
            }

            // Проверяем объект
            if (pattern.object) {
                if (pattern.object.type === 'variable') {
                    const boundValue = currentBinding[pattern.object.name];
                    const quadObjectValue = quad.object.value;
                    if (boundValue && boundValue !== quadObjectValue) return null;
                    newBinding[pattern.object.name] = quadObjectValue;
                } else if (pattern.object.type === 'uri') {
                    if (quad.object.value !== pattern.object.value) return null;
                } else if (pattern.object.type === 'literal') {
                    if (quad.object.value !== pattern.object.value) return null;
                }
            }

            return newBinding;
        }

        // ==============================================================================
        // funSPARQLask — выполнение SPARQL ASK запросов
        // Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/270
        // ==============================================================================

        /**
         * Выполняет SPARQL ASK запрос и возвращает boolean результат.
         * Поддерживает простые ASK запросы с GRAPH паттернами.
         *
         * @param {string} sparqlQuery - SPARQL ASK запрос
         * @returns {Promise<boolean>} true если паттерн найден, false иначе
         *
         * @example
         * // Проверка: является ли граф виртуальным
         * const isVirtual = await funSPARQLask(`
         *     ASK {
         *         GRAPH <http://example.org/vad#vt_p1> {
         *             <http://example.org/vad#vt_p1> rdf:type vad:Virtual .
         *         }
         *     }
         * `);
         */
        async function funSPARQLask(sparqlQuery) {
            // issue #322: Используем currentStore как единственный источник данных
            if (!currentStore) {
                console.log('funSPARQLask: No data in store');
                return false;
            }

            try {
                // Инициализируем Comunica engine если нужно
                // Use global or scope variable as available
                let engine = typeof comunicaEngine !== 'undefined' ? comunicaEngine : global.comunicaEngine;
                if (!engine) {
                    if (typeof Comunica !== 'undefined' && Comunica.QueryEngine) {
                        engine = new Comunica.QueryEngine();
                        // Store back to both scope locations
                        if (typeof comunicaEngine !== 'undefined') {
                            comunicaEngine = engine;
                        }
                        if (typeof global !== 'undefined') {
                            global.comunicaEngine = engine;
                        }
                    } else {
                        console.error('funSPARQLask: Comunica не загружена, используем fallback');
                        return funSPARQLaskSimple(sparqlQuery);
                    }
                }

                // Выполняем ASK запрос через Comunica
                const result = await engine.queryBoolean(sparqlQuery, {
                    sources: [currentStore]
                });

                return result;
            } catch (error) {
                console.error('funSPARQLask error:', error);
                // Fallback на простую реализацию при ошибке Comunica
                console.log('funSPARQLask: Fallback на funSPARQLaskSimple');
                return funSPARQLaskSimple(sparqlQuery);
            }
        }

        /**
         * Простая реализация SPARQL ASK для случаев когда Comunica недоступна.
         * Поддерживает базовые паттерны с GRAPH.
         *
         * @param {string} sparqlQuery - SPARQL ASK запрос
         * @returns {boolean} true если паттерн найден, false иначе
         */
        function funSPARQLaskSimple(sparqlQuery) {
            try {
                // Парсим ASK запрос
                const askMatch = sparqlQuery.match(/ASK\s*\{([\s\S]*)\}/i);
                if (!askMatch) {
                    console.log('funSPARQLaskSimple: Not an ASK query');
                    return false;
                }

                const whereClause = askMatch[1].trim();

                // Парсим GRAPH паттерн если есть
                const graphMatch = whereClause.match(/GRAPH\s+(<[^>]+>|[\w]+:[\w]+)\s*\{([\s\S]*?)\}/i);

                let graphUri = null;
                let patterns;

                if (graphMatch) {
                    // Разрешаем URI графа
                    let graphValue = graphMatch[1];
                    if (graphValue.startsWith('<') && graphValue.endsWith('>')) {
                        graphUri = graphValue.slice(1, -1);
                    } else {
                        // Prefixed name
                        const colonIndex = graphValue.indexOf(':');
                        if (colonIndex > 0) {
                            const prefix = graphValue.substring(0, colonIndex);
                            const local = graphValue.substring(colonIndex + 1);
                            const namespace = currentPrefixes[prefix];
                            if (namespace) {
                                graphUri = namespace + local;
                            }
                        }
                    }
                    patterns = parseTriplePatterns(graphMatch[2]);
                } else {
                    patterns = parseTriplePatterns(whereClause);
                }

                // issue #322: Используем currentStore.getQuads() вместо currentQuads
                const sourceQuads = currentStore ? currentStore.getQuads(null, null, null, null) : [];
                for (const quad of sourceQuads) {
                    // Если указан граф, проверяем соответствие
                    if (graphUri && quad.graph?.value !== graphUri) {
                        continue;
                    }

                    // Проверяем соответствие паттернам
                    let allPatternsMatch = true;
                    for (const pattern of patterns) {
                        const match = matchQuadToPattern(quad, pattern, {});
                        if (!match) {
                            allPatternsMatch = false;
                            break;
                        }
                    }

                    if (allPatternsMatch && patterns.length > 0) {
                        return true;
                    }
                }

                return false;
            } catch (error) {
                console.error('funSPARQLaskSimple error:', error);
                return false;
            }
        }

        /**
         * Проверяет, является ли граф виртуальным через SPARQL ASK запрос.
         * SPARQL-driven альтернатива isVirtualGraph().
         *
         * issue #270: Замена isVirtualGraph() на SPARQL-проверку rdf:type vad:Virtual
         *
         * @param {string} graphUri - URI графа для проверки
         * @returns {Promise<boolean>} true если граф типа vad:Virtual
         */
        async function isVirtualGraphSPARQL(graphUri) {
            if (!graphUri) return false;

            const sparqlQuery = `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX vad: <http://example.org/vad#>
                ASK {
                    GRAPH <${graphUri}> {
                        <${graphUri}> rdf:type vad:Virtual .
                    }
                }
            `;

            return await funSPARQLask(sparqlQuery);
        }

        /**
         * Синхронная версия проверки виртуального графа через N3.Store.
         * Используется для критичных по производительности операций.
         *
         * issue #270: SPARQL-driven альтернатива isVirtualGraph()
         *
         * @param {string} graphUri - URI графа для проверки
         * @returns {boolean} true если граф типа vad:Virtual
         */
        function isVirtualGraphByType(graphUri) {
            if (!graphUri || !currentStore) return false;

            const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
            const VAD_VIRTUAL = 'http://example.org/vad#Virtual';

            // Используем N3.Store.getQuads() для быстрой проверки
            const quads = currentStore.getQuads(
                graphUri,      // subject = graphUri
                RDF_TYPE,      // predicate = rdf:type
                VAD_VIRTUAL,   // object = vad:Virtual
                graphUri       // graph = graphUri
            );

            return quads.length > 0;
        }

