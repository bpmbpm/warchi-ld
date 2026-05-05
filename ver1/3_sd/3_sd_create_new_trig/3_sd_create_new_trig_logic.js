// issue #291: Модуль создания нового TriG контейнера (бизнес-логика)
// issue #384: UI функции перенесены в 3_sd_create_new_trig_ui.js
// PR #292 | 2026-02-12

/**
 * ==============================================================================
 * CREATE NEW TRIG MODULE - BUSINESS LOGIC
 * ==============================================================================
 *
 * Модуль бизнес-логики для создания новых TriG контейнеров (VADProcessDia)
 * в системе RDF Grapher.
 * Содержит:
 * - Константы и SPARQL запросы
 * - Глобальные переменные состояния
 *
 * UI функции (рендеринг, обработка событий DOM) находятся в 3_sd_create_new_trig_ui.js
 *
 * Алгоритм работы (issue #291):
 * 1. Пользователь нажимает кнопку "New TriG (VADProcessDia)" в окне Smart Design
 * 2. Проверяется, что quadstore не пуст (аналогично New Concept и Del Concept)
 * 3. Через funSPARQLvaluesDouble загружается список концептов процессов:
 *    - Первый запрос: все процессы из vad:ptree
 *    - Второй запрос: процессы, у которых уже есть vad:hasTrig
 *    - Процессы с hasTrig отмечаются серым (disabled) в справочнике
 * 4. Отображается форма с полями ввода
 * 5. Кнопка "Промежуточный SPARQL" показывает использованные SPARQL запросы
 * 6. Формируется итоговый SPARQL INSERT запрос
 *
 * @file 3_sd_create_new_trig_logic.js
 * @version 2.0
 * @date 2026-02-12
 * @see 3_sd_create_new_trig_ui.js - UI функции модуля
 * @see file_naming.md - Соглашение по именованию файлов
 * @see funSPARQLvaluesDouble - функция для справочников с недоступными значениями
 */

// ==============================================================================
// SPARQL ЗАПРОСЫ
// ==============================================================================

/**
 * SPARQL запрос для получения ВСЕХ концептов процессов из ptree
 * (первый запрос для funSPARQLvaluesDouble)
 */
const SPARQL_ALL_PROCESSES = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vad: <http://example.org/vad#>

SELECT ?process ?label WHERE {
    GRAPH vad:ptree {
        ?process rdf:type vad:TypeProcess .
        ?process rdfs:label ?label .
    }
}`;

/**
 * SPARQL запрос для получения процессов, у которых УЖЕ ЕСТЬ hasTrig
 * (второй запрос для funSPARQLvaluesDouble - эти будут disabled)
 */
const SPARQL_PROCESSES_WITH_TRIG = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX vad: <http://example.org/vad#>

SELECT ?process WHERE {
    GRAPH vad:ptree {
        ?process rdf:type vad:TypeProcess .
        ?process vad:hasTrig ?trig .
    }
}`;

/**
 * issue #286: SPARQL запрос для получения концептов процессов БЕЗ существующего VADProcessDia.
 * Использует FILTER NOT EXISTS для фильтрации процессов, у которых уже есть схема.
 * (Оставлен для обратной совместимости с funSPARQLvaluesComunica)
 */
const SPARQL_PROCESSES_WITHOUT_VADPROCESSDIA = `
    SELECT ?process ?label WHERE {
        GRAPH vad:ptree {
            ?process rdf:type vad:TypeProcess .
            ?process rdfs:label ?label .
            FILTER NOT EXISTS {
                ?process vad:hasTrig ?trig .
                GRAPH ?trig {
                    ?trig rdf:type vad:VADProcessDia .
                }
            }
        }
    }
`;

// ==============================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ МОДУЛЯ
// ==============================================================================

/**
 * Состояние модуля создания TriG
 */
let newTrigState = {
    isOpen: false,
    selectedProcess: null,
    processesWithTrig: new Set(), // URI процессов, у которых уже есть TriG
    intermediateSparql: ''
};

/**
 * Хранилище промежуточных SPARQL запросов для отображения
 */
let newTrigIntermediateSparqlQueries = [];

