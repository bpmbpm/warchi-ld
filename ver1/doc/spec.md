# Спецификация требований к проекту warchi-ld (ver1)

Источники требований помечены:
- **[warchi]** — заимствовано из warchi.ru
- **[issue]** — взято из issue #1 warchi-ld
- **[gen]** — сгенерировано в ходе реализации

---

## 1. Общие требования

| # | Требование | Источник |
|---|-----------|---------|
| 1.1 | Приложение работает полностью в браузере (browser-only JS, без Node.js) | [issue] 1.1 |
| 1.2 | Развёртывание: статический веб-сервер (GitHub Pages) или локально | [issue] 1.1 |
| 1.3 | Авторизация отсутствует; все действия выполняются под учётной записью `user` | [issue] 1.1 |
| 1.4 | Комментарии в коде и файлы .md создаются на русском языке | [issue] requirement |
| 1.5 | Максимальный размер файла с кодом — 1500 строк | [issue] file_naming.md |

## 2. Пользовательский интерфейс

| # | Требование | Источник |
|---|-----------|---------|
| 2.1 | Внешний вид приложения аналогичен warchi.ru: строка меню, линейка инструментов, боковая панель навигатора, рабочая область с панелями | [warchi] |
| 2.2 | Строка меню: Файл, Правка, Вид, Нотация, Инструменты, Справка | [warchi] |
| 2.3 | Линейка инструментов с кнопками: Новый, Открыть, Сохранить, Концепт, Индивид, Схема, Обновить, SVG, PNG | [warchi] |
| 2.4 | Боковая панель: дерево объектов (treeview) и панель свойств | [warchi] |
| 2.5 | Панели сворачиваемые (collapsible), состояние сохраняется в config.json | [warchi] |
| 2.6 | Новые элементы UI (отсутствующие в warchi.ru) имеют символ `_` в конце названия | [issue] 3 |
| 2.7 | Статусная строка в нижней части экрана | [warchi] |
| 2.8 | Механизм добавления собственной (custom) нотации | [issue] 3 / [warchi] |

## 3. Хранилище данных

| # | Требование | Источник |
|---|-----------|---------|
| 3.1 | Хранение данных в quadstore in-memory (N3.js / quadstore) | [issue] 1.2 |
| 3.2 | Вместо PostgreSQL используется quadstore | [issue] 1.2 |
| 3.3 | Данные хранятся в формате TriG (именованные графы) | [issue] 1.2 |
| 3.4 | Поддержка загрузки файлов `.ttl` и `.trig` | [issue] 1.4 |
| 3.5 | Загрузка файла `Trig_VADv8.ttl` | [issue] 1.4 |
| 3.6 | Загрузка файлов в формате warchi и взаимная конвертация TTL↔warchi | [issue] 1.4 |
| 3.7 | Поддержка Simple Triple и Shorthand Triple форм записи | [issue] programming_information.md |
| 3.8 | Использование записи с префиксом (`@prefix`) | [issue] programming_information.md |
| 3.9 | Вместо `a` использовать полную запись `rdf:type` | [issue] programming_information.md |

## 4. Нотация VAD

| # | Требование | Источник |
|---|-----------|---------|
| 4.1 | Реализована нотация VAD (Value Added Diagram) | [issue] 1.3 |
| 4.2 | Использование онтологии: `vad-basic-ontology.trig` и `vad-basic-ontology_tech_Appendix.trig` | [issue] 1.3 |
| 4.3 | Классы: `vad:Process`, `vad:TypeProcess`, `vad:VADProcessDia`, `vad:ObjectTree`, `vad:ExecutorGroup`, `vad:Executor` | [issue] ontology |
| 4.4 | Предикаты: `vad:hasParentObj`, `vad:hasTrig`, `vad:hasNext`, `vad:isSubprocessTrig`, `vad:hasExecutor`, `vad:includes` | [issue] ontology |
| 4.5 | Визуализация типов процессов: DetailedChild, DetailedExternal, notDetailedChild, notDetailedExternal, NotDefinedType | [issue] 1.3 |
| 4.6 | Дерево процессов (ptree) и дерево исполнителей (rtree) | [issue] ontology |
| 4.7 | Схемы хранятся в TriG (VADProcessDia граф) | [issue] 1.2 |
| 4.8 | Нотации ArchiMate, C4, BPMN, UML **не реализуются** (только VAD) | [issue] 1.3 |

## 5. SPARQL-driven Programming

| # | Требование | Источник |
|---|-----------|---------|
| 5.1 | Максимальное использование SPARQL-запросов в коде | [issue] programming_information.md |
| 5.2 | SPARQL-запросы вынесены в отдельные файлы `*_sparql.js` | [issue] programming_information.md |
| 5.3 | Типовые запросы размещены в `9_vadlib/vadlib_sparql.js` | [issue] file_naming.md |
| 5.4 | Движок SPARQL: Comunica (браузерная версия) | [issue] 1.2 |

## 6. Визуализация

| # | Требование | Источник |
|---|-----------|---------|
| 6.1 | Визуализация через Graphviz (Viz.js) | [issue] 1.2 |
| 6.2 | Поддержка режима VAD TriG | [issue] 1.2 |
| 6.3 | Экспорт в SVG и PNG | [warchi] |
| 6.4 | Treeview дерево процессов в боковой панели | [warchi] |
| 6.5 | Легенда стилей узлов и рёбер | [warchi] |

## 7. Smart Design (редактирование)

| # | Требование | Источник |
|---|-----------|---------|
| 7.1 | Создание нового концепта (New Concept) | [issue] 1.2 |
| 7.2 | Создание нового индивида (New Individ) | [issue] 1.2 |
| 7.3 | Создание новой схемы (New TriG VADProcessDia) | [issue] 1.2 |
| 7.4 | Удаление концепта/индивида/схемы | [issue] 1.2 |
| 7.5 | Результат операции в виде SPARQL запроса (Result in SPARQL) | [issue] 1.2 |

## 8. Virtual TriG и Reasoning

| # | Требование | Источник |
|---|-----------|---------|
| 8.1 | Virtual TriG: вычисляемые свойства процессов (processSubtype) | [issue] 1.2 |
| 8.2 | Semantic reasoning через Comunica (RDFS правила) | [issue] 1.2 |
| 8.3 | Окно Virtual TriG для просмотра вычисляемых данных | [gen] |

## 9. Именование файлов

| # | Требование | Источник |
|---|-----------|---------|
| 9.1 | Файлы именуются согласно `requirements/file_naming.md` | [issue] |
| 9.2 | Суффиксы: `_ui.js`, `_logic.js`, `_sparql.js`, `.css` | [issue] |
| 9.3 | Размер файла ≤ 1500 строк | [issue] |
| 9.4 | Минимизация `index.html` | [issue] |
| 9.5 | Базовая библиотека в `9_vadlib/` | [issue] |

## 10. Документация

| # | Требование | Источник |
|---|-----------|---------|
| 10.1 | Документация в стиле wArchi с учётом реализации | [issue] 2 |
| 10.2 | Полная спецификация требований (данный файл) | [issue] 2 |
| 10.3 | Краткая инструкция `start.md` | [issue] 2 |
| 10.4 | Файл `Trig_VADv8_warchi.warchi` — аналог `Trig_VADv8.ttl` в формате warchi | [issue] 2 |
| 10.5 | Файлы `problems_v1.md` и `improvements_v1.md` | [issue] 4 |
| 10.6 | Документация к модулям в папке `doc/` | [gen] |
