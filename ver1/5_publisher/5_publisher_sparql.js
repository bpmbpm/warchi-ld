// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/232
// 5_publisher_sparql.js - SPARQL-related функции модуля Publisher

        /**
         * Генерирует SPARQL запрос с GRAPH clause для указанного TriG
         * @param {string} trigUri - URI TriG для фильтрации
         * @returns {string} - SPARQL запрос с GRAPH clause и PREFIX декларациями
         */
        function getSparqlQueryForTriG(trigUri) {
            if (!trigUri) return defaultSparqlQuery;

            const prefixedUri = getPrefixedName(trigUri, currentPrefixes);
            // Если URI имеет префикс, используем его, иначе используем полный URI в угловых скобках
            const graphRef = prefixedUri.includes(':') && !prefixedUri.startsWith('http')
                ? prefixedUri
                : `<${trigUri}>`;

            // Генерируем PREFIX декларации для SPARQL запроса
            const prefixDeclarations = generateSparqlPrefixes(currentPrefixes);

            return `${prefixDeclarations}SELECT ?s ?p ?o
WHERE {
    GRAPH ${graphRef} {
        ?s ?p ?o .
    }
}`;
        }

        /**
         * Обновляет SPARQL запрос в текстовом поле для текущего выбранного TriG
         */
        function updateSparqlQueryForTriG() {
            if (currentMode !== 'vad-trig' || !selectedTrigUri) return;

            const queryInput = document.getElementById('sparql-query');
            if (!queryInput) return;

            queryInput.value = getSparqlQueryForTriG(selectedTrigUri);
        }

