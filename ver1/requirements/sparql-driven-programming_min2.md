# SPARQL-driven Programming Guide (warchi-ld)

Обновлено: PR #2, 2026-05-05

## Концепция

SPARQL-driven Programming — подход, при котором вся бизнес-логика работы с данными выражается через SPARQL-запросы, а не через прямые манипуляции с JavaScript-объектами.

## Правила

1. **Все запросы к quadstore — через SPARQL** (SELECT, ASK, CONSTRUCT, INSERT, DELETE).
2. **SPARQL-запросы в отдельных файлах** `*_sparql.js`, не inline в логике.
3. **Типовые запросы** — в `9_vadlib/vadlib_sparql.js`.
4. **Функции-обёртки** — каждый SPARQL-запрос оборачивается в функцию с понятным именем.

## Пример функции на основе SPARQL

```javascript
// vadlib_sparql.js — пример SPARQL-driven функции

/**
 * Возвращает метку объекта по URI
 * @param {string} uri — URI объекта
 * @returns {Promise<string>} метка или пустая строка
 */
async function getLabelSPARQL(uri) {
    const query = `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?label WHERE {
            <${uri}> rdfs:label ?label .
        } LIMIT 1
    `;
    const result = await executeSPARQLSelect(query);
    return result.length > 0 ? result[0].label.value : '';
}

/**
 * Возвращает список всех концептов процесса (ptree)
 * @returns {Promise<Array>} массив {uri, label}
 */
async function getAllProcessConceptsSPARQL() {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX vad: <http://example.org/vad#>
        SELECT ?proc ?label WHERE {
            GRAPH vad:ptree {
                ?proc rdf:type vad:TypeProcess .
                OPTIONAL { ?proc rdfs:label ?label }
            }
        } ORDER BY ?label
    `;
    return await executeSPARQLSelect(query);
}
```

## Структура _sparql.js файла

```javascript
// N_modulename_sparql.js
// SPARQL запросы модуля N_modulename

// 1. Константы запросов (строки)
const SPARQL_GET_LABEL = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?label WHERE { <__URI__> rdfs:label ?label . } LIMIT 1
`;

// 2. Функции-обёртки
async function getLabel(uri) {
    const q = SPARQL_GET_LABEL.replace('__URI__', uri);
    const rows = await executeSPARQLSelect(q);
    return rows.length > 0 ? rows[0].label.value : '';
}
```

## Типовые запросы (vadlib_sparql.js)

| Функция | Назначение |
|---------|-----------|
| `executeSPARQLSelect(query)` | Выполнить SELECT запрос, вернуть массив строк |
| `executeSPARQLAsk(query)` | Выполнить ASK запрос, вернуть boolean |
| `executeSPARQLInsert(triples, graph)` | Вставить триплеты в граф |
| `executeSPARQLDelete(triples, graph)` | Удалить триплеты из графа |
| `getLabelByUri(uri)` | Получить rdfs:label объекта |
| `getParentObj(uri, graph)` | Получить vad:hasParentObj |
