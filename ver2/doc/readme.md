# Документация warchi-ld ver1

## Содержание

| Файл | Описание |
|------|---------|
| [start.md](start.md) | Краткая инструкция по запуску и открытию примеров |
| [spec.md](spec.md) | Полная спецификация требований проекта |
| [problems_v1.md](problems_v1.md) | Проблемы и ограничения текущей версии |
| [improvements_v1.md](improvements_v1.md) | Предложения по улучшению |
| [Custom/readme.md](Custom/readme.md) | Добавление custom нотаций |
| [autodoc.md](autodoc.md) | Требования к автодокументированию |

## Архитектура

Проект warchi-ld использует модульную архитектуру, заимствованную из [rdf-grapher/ver9d](https://github.com/bpmbpm/rdf-grapher/tree/main/ver9d):

```
ver1/
├── index.html              — точка входа (минимальный HTML)
├── warchi_ld.css           — стили UI warchi-ld (меню, toolbar, sidebar)
├── warchi_ld_ui.js         — инициализация, меню, toolbar, sidebar
├── warchi_ld_convert.js    — конвертация TTL↔warchi форматов
├── styles.css              — базовые стили (из rdf-grapher/ver9d)
├── config.json             — конфигурация свёрнутых панелей
│
├── 9_vadlib/               — базовая библиотека (константы, SPARQL движок)
├── 1_example_data/         — загрузка примеров из папки /dia
├── 2_triplestore/          — хранилище триплетов (N3.js quadstore)
├── 3_sd/                   — Smart Design (создание/удаление объектов)
├── 4_resSPARQL/            — отображение результирующего SPARQL запроса
├── 5_publisher/            — визуализация (DOT/Graphviz)
├── 6_legend/               — легенда стилей VAD
├── 7_info/                 — отображение префиксов
├── 8_infoSPARQL/           — SPARQL панель запросов
├── 10_virtualTriG/         — виртуальные вычисляемые данные
├── 11_reasoning/           — semantic reasoning (Comunica)
├── 12_method/              — метод/алгоритм визуализации
│
├── ontology/               — онтология VAD
├── dia/                    — примеры схем
├── requirements/           — технические требования
└── doc/                    — документация (этот файл)
```

## Технологический стек

| Компонент | Технология |
|-----------|-----------|
| Парсинг RDF | N3.js (браузерная версия) |
| In-memory store | N3.Store (quadstore) |
| SPARQL движок | Comunica (@comunica/query-sparql-rdfjs) |
| Визуализация | Viz.js (Graphviz в браузере) |
| Нотация | VAD (Value Added Diagram) |
| Онтология | OWL/RDFS (vad:, rdf:, rdfs:, dcterms:) |
