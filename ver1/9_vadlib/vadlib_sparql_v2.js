// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/425
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/427
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/433
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/435
// vadlib_sparql_v2.js — модуль с функциями, добавляемыми по прямому указанию.
//
// Зависимости:
//   - N3.js (window.N3) для парсинга TriG
//   - Comunica (window.Comunica) для выполнения SPARQL-запросов
//   - funSPARQLvaluesComunica() из vadlib_sparql.js (используется как основной движок)
//
// Экспортируемые функции:
//   - funConceptList_v2(quadstore1, trig1, type1)
//   - funTrigNameList_v2(quadstore1, type_trig1)

// ==============================================================================
// funConceptList_v2 — список доступных концептов в указанном TriG
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/425
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/427
// ==============================================================================

/**
 * Возвращает список концептов из указанного TriG-графа в заданном quadstore.
 *
 * Функция выполняет SPARQL SELECT-запрос через Comunica и возвращает массив
 * пар {id, label}. Если rdfs:label у концепта отсутствует — label равен пустой строке.
 *
 * @param {Object} quadstore1  — N3.Store (квадстор) с загруженными данными.
 *                               Передаётся явно, чтобы поддерживать несколько квадсторов
 *                               в будущем.
 * @param {string} trig1       — URI TriG-графа в любом формате:
 *                               - Полный URI: 'http://example.org/vad#ptree'
 *                               - Полный URI в угловых скобках: '<http://example.org/vad#ptree>'
 *                               - Короткое curie: 'vad:ptree'
 *                               - Короткое имя (устаревший формат): 'ptree' — будет дополнено vad:
 *                               issue #427: Теперь принимает полные URI для универсальности.
 * @param {string} type1       — URI типа концепта в любом формате:
 *                               - Полный URI: 'http://example.org/vad#TypeProcess'
 *                               - Полный URI в угловых скобках: '<http://example.org/vad#TypeProcess>'
 *                               - Curie: 'vad:TypeProcess'
 *                               Для ptree: 'http://example.org/vad#TypeProcess'
 *                               Для rtree: 'http://example.org/vad#TypeExecutor'
 *
 * @returns {Promise<Array<{id: string, label: string}>>}
 *   Массив объектов {id, label}, где:
 *   - id    — полный URI концепта
 *   - label — значение rdfs:label, или пустая строка если label отсутствует
 *
 * @example
 *   // Получить список концептов процессов из ptree (полный URI — рекомендуемый способ)
 *   var items = await funConceptList_v2(currentStore, 'http://example.org/vad#ptree', 'http://example.org/vad#TypeProcess');
 *   // Результат: [{id: 'http://example.org/vad#p1', label: 'Процесс 1'}, ...]
 *
 * @example
 *   // Получить список концептов исполнителей из rtree (полный URI — рекомендуемый способ)
 *   var items = await funConceptList_v2(currentStore, 'http://example.org/vad#rtree', 'http://example.org/vad#TypeExecutor');
 */
async function funConceptList_v2(quadstore1, trig1, type1) {

    // Список результатов: массив {id, label}
    var results = [];

    // Проверяем, что квадстор передан
    if (!quadstore1) {
        console.log('funConceptList_v2: quadstore1 не задан');
        return results;
    }

    // Проверяем, что TriG задан
    if (!trig1) {
        console.log('funConceptList_v2: trig1 не задан');
        return results;
    }

    // Проверяем, что тип задан
    if (!type1) {
        console.log('funConceptList_v2: type1 не задан');
        return results;
    }

    // Инициализируем Comunica engine
    // Comunica загружается как глобальная переменная из CDN в index.html
    var engine = null;
    if (typeof Comunica !== 'undefined' && Comunica.QueryEngine) {
        engine = new Comunica.QueryEngine();
    } else {
        console.error('funConceptList_v2: Comunica не загружена');
        return results;
    }

    // issue #427: Нормализуем URI графа для подстановки в SPARQL.
    // Поддерживаются форматы:
    //   - Полный URI без скобок: 'http://example.org/vad#ptree' → '<http://example.org/vad#ptree>'
    //   - Полный URI в угловых скобках: '<http://example.org/vad#ptree>' → оставляем как есть
    //   - Curie: 'vad:ptree' → оставляем как есть (префикс определён в запросе)
    //   - Короткое имя (устаревший формат): 'ptree' → 'vad:ptree' (добавляем префикс vad:)
    var graphUri;
    if (trig1.startsWith('<') && trig1.endsWith('>')) {
        // Уже в угловых скобках
        graphUri = trig1;
    } else if (trig1.startsWith('http://') || trig1.startsWith('https://')) {
        // Полный URI без скобок — оборачиваем
        graphUri = '<' + trig1 + '>';
    } else if (trig1.indexOf(':') !== -1) {
        // Curie вида 'vad:ptree' — оставляем как есть
        graphUri = trig1;
    } else {
        // Короткое имя без двоеточия (устаревший формат 'ptree') — добавляем префикс vad:
        graphUri = 'vad:' + trig1;
    }

    // issue #427: Нормализуем URI типа концепта для подстановки в SPARQL.
    // Поддерживаются форматы:
    //   - Полный URI без скобок: 'http://example.org/vad#TypeProcess' → '<http://example.org/vad#TypeProcess>'
    //   - Полный URI в угловых скобках: '<http://example.org/vad#TypeProcess>' → оставляем как есть
    //   - Curie: 'vad:TypeProcess' → оставляем как есть (префикс определён в запросе)
    var typeUri;
    if (type1.startsWith('<') && type1.endsWith('>')) {
        // Уже в угловых скобках
        typeUri = type1;
    } else if (type1.startsWith('http://') || type1.startsWith('https://')) {
        // Полный URI без скобок — оборачиваем
        typeUri = '<' + type1 + '>';
    } else {
        // Curie вида 'vad:TypeProcess' — оставляем как есть
        typeUri = type1;
    }

    // Формируем SPARQL-запрос.
    // graphUri и typeUri подставляются напрямую в текст запроса.
    // OPTIONAL позволяет вернуть концепт даже если rdfs:label отсутствует.
    var sparqlQuery = 'prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n' +
        'prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
        'prefix vad: <http://example.org/vad#>\n' +
        'SELECT ?id_concept ?label_concept WHERE {\n' +
        '    GRAPH ' + graphUri + ' {\n' +
        '        ?id_concept rdf:type ' + typeUri + ' .\n' +
        '        OPTIONAL { ?id_concept rdfs:label ?label_concept . }\n' +
        '    }\n' +
        '}';

    console.log('funConceptList_v2: выполняем запрос для trig1=' + trig1 + ', type1=' + type1);
    console.log('funConceptList_v2: sparqlQuery=\n' + sparqlQuery);

    try {
        // Выполняем SPARQL SELECT через Comunica
        // Источник данных — переданный квадстор (quadstore1)
        var bindingsStream = await engine.queryBindings(sparqlQuery, {
            sources: [quadstore1]
        });

        // Получаем все результаты как массив
        var bindings = await bindingsStream.toArray();

        // Преобразуем каждый binding в объект {id, label}
        var i;
        for (i = 0; i < bindings.length; i++) {
            var binding = bindings[i];

            // Извлекаем URI концепта (?id_concept)
            var idTerm = binding.get('id_concept');
            if (!idTerm) {
                // Пропускаем строки без id
                continue;
            }
            var id = idTerm.value;

            // Извлекаем label (?label_concept), если он есть
            var labelTerm = binding.get('label_concept');
            var label = '';
            if (labelTerm) {
                label = labelTerm.value;
            }

            results.push({ id: id, label: label });
        }

        console.log('funConceptList_v2: найдено ' + results.length + ' концептов');

    } catch (error) {
        console.error('funConceptList_v2: ошибка при выполнении запроса:', error);
    }

    return results;
}

// ==============================================================================
// funTrigNameList_v2 — список TriG заданного типа (справочник схем процессов)
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/433
// ==============================================================================

/**
 * Возвращает список TriG-графов заданного типа из quadstore.
 *
 * Функция выполняет SPARQL SELECT-запрос через Comunica и возвращает массив
 * пар {id, label}. Перебираются все TriG-графы, у которых тип (rdf:type) совпадает
 * с переданным type_trig1. Если rdfs:label у TriG отсутствует — label равен пустой строке.
 *
 * Аналог funConceptList_v2, но вместо фильтрации по конкретному TriG-графу (параметр trig1)
 * перебирает все TriG заданного типа (параметр type_trig1).
 * Используется для построения выпадающего справочника схем процессов.
 *
 * @param {Object} quadstore1   — N3.Store (квадстор) с загруженными данными.
 *                                Передаётся явно, чтобы поддерживать несколько квадсторов
 *                                в будущем.
 * @param {string} type_trig1  — URI типа TriG в любом формате:
 *                               - Полный URI: 'http://example.org/vad#VADProcessDia'
 *                               - Полный URI в угловых скобках: '<http://example.org/vad#VADProcessDia>'
 *                               - Curie: 'vad:VADProcessDia'
 *
 * @returns {Promise<Array<{id: string, label: string}>>}
 *   Массив объектов {id, label}, где:
 *   - id    — полный URI TriG-графа
 *   - label — значение rdfs:label TriG-графа, или пустая строка если label отсутствует
 *
 * @example
 *   // Получить список всех схем процессов типа vad:VADProcessDia
 *   var items = await funTrigNameList_v2(currentStore, 'http://example.org/vad#VADProcessDia');
 *   // Результат: [{id: 'http://example.org/vad#t_p1', label: 'Схема p1'}, ...]
 *
 * @example
 *   // То же самое через curie
 *   var items = await funTrigNameList_v2(currentStore, 'vad:VADProcessDia');
 */
async function funTrigNameList_v2(quadstore1, type_trig1) {

    // Список результатов: массив {id, label}
    var results = [];

    // Проверяем, что квадстор передан
    if (!quadstore1) {
        console.log('funTrigNameList_v2: quadstore1 не задан');
        return results;
    }

    // Проверяем, что тип TriG задан
    if (!type_trig1) {
        console.log('funTrigNameList_v2: type_trig1 не задан');
        return results;
    }

    // Инициализируем Comunica engine
    // Comunica загружается как глобальная переменная из CDN в index.html
    var engine = null;
    if (typeof Comunica !== 'undefined' && Comunica.QueryEngine) {
        engine = new Comunica.QueryEngine();
    } else {
        console.error('funTrigNameList_v2: Comunica не загружена');
        return results;
    }

    // Нормализуем URI типа TriG для подстановки в SPARQL.
    // Поддерживаются форматы:
    //   - Полный URI в угловых скобках: '<http://example.org/vad#VADProcessDia>' → оставляем как есть
    //   - Полный URI без скобок: 'http://example.org/vad#VADProcessDia' → оборачиваем
    //   - Curie: 'vad:VADProcessDia' → оставляем как есть (префикс определён в запросе)
    var typeTrigUri;
    if (type_trig1.startsWith('<') && type_trig1.endsWith('>')) {
        // Уже в угловых скобках
        typeTrigUri = type_trig1;
    } else if (type_trig1.startsWith('http://') || type_trig1.startsWith('https://')) {
        // Полный URI без скобок — оборачиваем
        typeTrigUri = '<' + type_trig1 + '>';
    } else {
        // Curie вида 'vad:VADProcessDia' — оставляем как есть
        typeTrigUri = type_trig1;
    }

    // Формируем SPARQL-запрос.
    // typeTrigUri подставляется напрямую в текст запроса.
    // ?id_trig — субъект триплета rdf:type (URI TriG-графа, объявленного как субъект),
    // ?label_trig — значение rdfs:label TriG-графа (если есть).
    // OPTIONAL позволяет вернуть TriG даже если rdfs:label отсутствует.
    // issue #435: Используем GRAPH ?id_trig { ... }, так как тип TriG объявлен внутри
    // именованного графа (например: vad:t_p1 { vad:t_p1 rdf:type vad:VADProcessDia }),
    // а не в default graph. Запрос без GRAPH-клаузы ничего не находил.
    var sparqlQuery = 'prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n' +
        'prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
        'prefix vad: <http://example.org/vad#>\n' +
        'SELECT ?id_trig ?label_trig WHERE {\n' +
        '    GRAPH ?id_trig {\n' +
        '        ?id_trig rdf:type ' + typeTrigUri + ' .\n' +
        '        OPTIONAL { ?id_trig rdfs:label ?label_trig . }\n' +
        '    }\n' +
        '}';

    console.log('funTrigNameList_v2: выполняем запрос для type_trig1=' + type_trig1);
    console.log('funTrigNameList_v2: sparqlQuery=\n' + sparqlQuery);

    try {
        // Выполняем SPARQL SELECT через Comunica
        // Источник данных — переданный квадстор (quadstore1)
        var bindingsStream = await engine.queryBindings(sparqlQuery, {
            sources: [quadstore1]
        });

        // Получаем все результаты как массив
        var bindings = await bindingsStream.toArray();

        // Преобразуем каждый binding в объект {id, label}
        var i;
        for (i = 0; i < bindings.length; i++) {
            var binding = bindings[i];

            // Извлекаем URI TriG (?id_trig)
            var idTerm = binding.get('id_trig');
            if (!idTerm) {
                // Пропускаем строки без id
                continue;
            }
            var id = idTerm.value;

            // Извлекаем label (?label_trig), если он есть
            var labelTerm = binding.get('label_trig');
            var label = '';
            if (labelTerm) {
                label = labelTerm.value;
            }

            results.push({ id: id, label: label });
        }

        console.log('funTrigNameList_v2: найдено ' + results.length + ' TriG типа ' + type_trig1);

    } catch (error) {
        console.error('funTrigNameList_v2: ошибка при выполнении запроса:', error);
    }

    return results;
}

