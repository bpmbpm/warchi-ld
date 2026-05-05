// warchi_ld_convert.js — Конвертация между форматами TriG/TTL и warchi
// Обеспечивает взаимную конвертацию: .ttl/.trig ↔ .warchi (JSON)
// Формат warchi — упрощённый JSON, совместимый с warchi.ru

// ============================================================================
// ИМПОРТ WARCHI ФОРМАТА
// ============================================================================

/**
 * Открывает диалог загрузки файла в формате warchi
 */
function importWarchiFile_() {
    closeAllMenuDropdowns();
    document.getElementById('warchi-file-input').click();
}

/**
 * Обрабатывает загруженный warchi файл
 * @param {Event} event — событие onchange input[type=file]
 */
function loadWarchiFile_(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            let trig;
            if (file.name.endsWith('.json') || file.name.endsWith('.warchi')) {
                // Пробуем JSON формат warchi
                const obj = JSON.parse(content);
                trig = convertWarchiJsonToTrig_(obj);
            } else {
                // Предполагаем XML warchi
                trig = convertWarchiXmlToTrig_(content);
            }
            if (trig) {
                if (typeof parseAndLoadRDF === 'function') {
                    parseAndLoadRDF(trig);
                } else {
                    const ta = document.getElementById('rdf-input');
                    if (ta) ta.value = trig;
                }
                setStatus('Файл warchi загружен: ' + file.name);
            }
        } catch(err) {
            alert('Ошибка загрузки warchi файла: ' + err.message);
        }
    };
    reader.readAsText(file, 'UTF-8');
    // Сбросить input для повторной загрузки того же файла
    event.target.value = '';
}

// ============================================================================
// ЭКСПОРТ В WARCHI ФОРМАТ
// ============================================================================

/**
 * Экспортирует текущие данные quadstore в файл .warchi (JSON)
 */
function exportToWarchi_() {
    closeAllMenuDropdowns();
    const trigText = document.getElementById('rdf-input')
        ? document.getElementById('rdf-input').value
        : '';
    if (!trigText.trim()) {
        alert('Нет данных для экспорта. Загрузите TTL/TriG файл.');
        return;
    }
    try {
        const warchiObj = convertTrigToWarchiJson_(trigText);
        const json = JSON.stringify(warchiObj, null, 2);
        const blob = new Blob([json], {type: 'application/json'});
        downloadBlob_(blob, 'diagram.warchi');
        setStatus('Экспорт в warchi формат выполнен');
    } catch(err) {
        alert('Ошибка экспорта в warchi: ' + err.message);
    }
}

// ============================================================================
// КОНВЕРТЕР: WARCHI JSON → TriG
// ============================================================================

/**
 * Конвертирует объект warchi JSON в строку TriG
 * @param {Object} warchi — объект warchi JSON
 * @returns {string} TriG строка
 */
function convertWarchiJsonToTrig_(warchi) {
    const prefixes = [
        '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
        '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
        '@prefix dcterms: <http://purl.org/dc/terms/> .',
        '@prefix vad: <http://example.org/vad#> .',
        ''
    ].join('\n');

    // Извлекаем процессы
    const processes = warchi.processes || warchi.elements || [];
    const executors = warchi.executors || warchi.roles || [];
    const diagrams = warchi.diagrams || warchi.views || [];

    let ptreeTriples = '';
    let rtreeTriples = '';
    const diagGraphs = [];

    // Дерево процессов
    ptreeTriples += 'vad:ptree rdf:type vad:ObjectTree ;\n';
    ptreeTriples += '    rdfs:label "Дерево Процессов (TriG)" ;\n';
    ptreeTriples += '    vad:hasParentObj vad:root .\n\n';

    processes.forEach(function(p) {
        const id = sanitizeId_(p.id || p.name);
        const label = escapeTriGString_(p.label || p.name || id);
        const desc = escapeTriGString_(p.description || '');
        const parent = p.parent ? sanitizeId_(p.parent) : 'ptree';
        const hasTrig = p.diagram ? ' ;\n    vad:hasTrig vad:' + sanitizeId_(p.diagram) : '';
        ptreeTriples += 'vad:' + id + ' rdf:type vad:TypeProcess ;\n';
        ptreeTriples += '    rdfs:label "' + label + '" ;\n';
        if (desc) ptreeTriples += '    dcterms:description "' + desc + '" ;\n';
        ptreeTriples += '    vad:hasParentObj vad:' + parent + hasTrig + ' .\n\n';
    });

    // Дерево исполнителей
    rtreeTriples += 'vad:rtree rdf:type vad:ObjectTree ;\n';
    rtreeTriples += '    rdfs:label "Дерево Исполнителей (TriG)" ;\n';
    rtreeTriples += '    vad:hasParentObj vad:root .\n\n';

    executors.forEach(function(e) {
        const id = sanitizeId_(e.id || e.name);
        const label = escapeTriGString_(e.label || e.name || id);
        const parent = e.parent ? sanitizeId_(e.parent) : 'rtree';
        rtreeTriples += 'vad:' + id + ' rdf:type vad:TypeExecutor ;\n';
        rtreeTriples += '    rdfs:label "' + label + '" ;\n';
        rtreeTriples += '    vad:hasParentObj vad:' + parent + ' .\n\n';
    });

    // Схемы (диаграммы)
    diagrams.forEach(function(dia) {
        const diaId = sanitizeId_(dia.id || dia.name);
        const diaLabel = escapeTriGString_(dia.label || dia.name || diaId);
        const parentProc = dia.parentProcess ? sanitizeId_(dia.parentProcess) : 'ptree';
        let graph = 'vad:' + diaId + ' {\n';
        graph += '    vad:' + diaId + ' rdf:type vad:VADProcessDia ;\n';
        graph += '        rdfs:label "Схема ' + diaId + '" ;\n';
        graph += '        vad:hasParentObj vad:' + parentProc + ' .\n\n';

        const items = dia.items || dia.processes || [];
        items.forEach(function(item) {
            const itemId = sanitizeId_(item.id || item.ref);
            const execGroup = 'ExecutorGroup_' + itemId;
            const execs = item.executors || [];
            graph += '    vad:' + itemId + ' vad:isSubprocessTrig vad:' + diaId + ' ;\n';
            graph += '        vad:hasExecutor vad:' + execGroup;
            if (item.next) {
                graph += ' ;\n        vad:hasNext vad:' + sanitizeId_(item.next);
            }
            graph += ' .\n\n';
            graph += '    vad:' + execGroup + ' rdf:type vad:ExecutorGroup ;\n';
            if (execs.length > 0) {
                const execList = execs.map(function(ex) { return 'vad:' + sanitizeId_(ex); }).join(', ');
                graph += '        vad:includes ' + execList + ' .\n\n';
            } else {
                graph += '        vad:includes vad:Executor1 .\n\n';
            }
        });

        graph += '}\n';
        diagGraphs.push(graph);
    });

    // root граф
    let trig = prefixes;
    trig += 'vad:root {\n    vad:root rdf:type vad:TechTree ;\n    rdfs:label "Корень Дерева" .\n}\n\n';
    trig += 'vad:ptree {\n' + ptreeTriples + '}\n\n';
    trig += 'vad:rtree {\n' + rtreeTriples + '}\n\n';
    trig += diagGraphs.join('\n');

    return trig;
}

// ============================================================================
// КОНВЕРТЕР: TriG → WARCHI JSON
// ============================================================================

/**
 * Конвертирует строку TriG в объект warchi JSON
 * @param {string} trigText — текст в формате TriG/TTL
 * @returns {Object} объект warchi JSON
 */
function convertTrigToWarchiJson_(trigText) {
    // Базовая конвертация через N3.js парсинг
    const warchi = {
        format: 'warchi',
        version: '1.0',
        notation: 'VAD',
        source: 'warchi-ld ver1',
        processes: [],
        executors: [],
        diagrams: []
    };

    if (typeof N3 === 'undefined') {
        // Если N3 не загружен — возвращаем базовую структуру с исходным текстом
        warchi.rawTrig = trigText;
        return warchi;
    }

    const parser = new N3.Parser();
    const store = new N3.Store();
    try {
        const quads = parser.parse(trigText);
        store.addQuads(quads);
    } catch(e) {
        warchi.rawTrig = trigText;
        warchi.parseError = e.message;
        return warchi;
    }

    const VAD = 'http://example.org/vad#';
    const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
    const DCTERMS = 'http://purl.org/dc/terms/';

    function getLabel(subject) {
        const lblQuads = store.getQuads(subject, RDFS + 'label', null, null);
        return lblQuads.length > 0 ? lblQuads[0].object.value : shortId_(subject);
    }

    function getDesc(subject) {
        const q = store.getQuads(subject, DCTERMS + 'description', null, null);
        return q.length > 0 ? q[0].object.value : '';
    }

    function getParent(subject, graphId) {
        const q = store.getQuads(subject, VAD + 'hasParentObj', null, graphId || null);
        return q.length > 0 ? shortId_(q[0].object.value) : null;
    }

    // Процессы из ptree
    const ptreeId = VAD + 'ptree';
    const typeProcess = VAD + 'TypeProcess';
    store.getQuads(null, RDF + 'type', typeProcess, ptreeId).forEach(function(q) {
        const subj = q.subject.value;
        const p = {
            id: shortId_(subj),
            label: getLabel(subj),
            description: getDesc(subj),
            parent: getParent(subj, ptreeId)
        };
        // hasTrig
        const trigQ = store.getQuads(subj, VAD + 'hasTrig', null, ptreeId);
        if (trigQ.length > 0) p.diagram = shortId_(trigQ[0].object.value);
        warchi.processes.push(p);
    });

    // Исполнители из rtree
    const rtreeId = VAD + 'rtree';
    const typeExec = VAD + 'TypeExecutor';
    store.getQuads(null, RDF + 'type', typeExec, rtreeId).forEach(function(q) {
        const subj = q.subject.value;
        warchi.executors.push({
            id: shortId_(subj),
            label: getLabel(subj),
            parent: getParent(subj, rtreeId)
        });
    });

    // Схемы (VADProcessDia графы)
    const typeDia = VAD + 'VADProcessDia';
    store.getQuads(null, RDF + 'type', typeDia, null).forEach(function(q) {
        const diaSubj = q.subject.value;
        const graphId = q.graph.value || diaSubj;
        const parentQ = store.getQuads(diaSubj, VAD + 'hasParentObj', null, graphId);
        const parentProc = parentQ.length > 0 ? shortId_(parentQ[0].object.value) : null;

        const dia = {
            id: shortId_(diaSubj),
            label: getLabel(diaSubj),
            parentProcess: parentProc,
            items: []
        };

        // Индивиды в схеме
        store.getQuads(null, VAD + 'isSubprocessTrig', diaSubj, graphId).forEach(function(iq) {
            const itemSubj = iq.subject.value;
            const item = {
                id: shortId_(itemSubj),
                ref: shortId_(itemSubj)
            };
            // hasNext
            const nextQ = store.getQuads(itemSubj, VAD + 'hasNext', null, graphId);
            if (nextQ.length > 0) item.next = shortId_(nextQ[0].object.value);
            // hasExecutor → includes
            const execQ = store.getQuads(itemSubj, VAD + 'hasExecutor', null, graphId);
            if (execQ.length > 0) {
                const groupId = execQ[0].object.value;
                const inclQ = store.getQuads(groupId, VAD + 'includes', null, graphId);
                item.executors = inclQ.map(function(iq2) { return shortId_(iq2.object.value); });
            }
            dia.items.push(item);
        });

        warchi.diagrams.push(dia);
    });

    return warchi;
}

// ============================================================================
// КОНВЕРТЕР: WARCHI XML → TriG (базовая заглушка)
// ============================================================================

function convertWarchiXmlToTrig_(xmlText) {
    // Базовая поддержка XML формата warchi (через DOMParser)
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    // Проверяем наличие ошибок парсинга
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Ошибка парсинга XML: ' + parseError.textContent);
    }

    // Конвертируем XML в JSON-like структуру и затем в TriG
    const warchi = { processes: [], executors: [], diagrams: [] };

    doc.querySelectorAll('element[type="process"], process').forEach(function(el) {
        warchi.processes.push({
            id: el.getAttribute('id') || el.getAttribute('name'),
            label: el.getAttribute('label') || el.getAttribute('name') || el.getAttribute('id'),
            description: el.getAttribute('description') || '',
            parent: el.getAttribute('parent') || null,
            diagram: el.getAttribute('diagram') || null
        });
    });

    doc.querySelectorAll('element[type="executor"], role, executor').forEach(function(el) {
        warchi.executors.push({
            id: el.getAttribute('id') || el.getAttribute('name'),
            label: el.getAttribute('label') || el.getAttribute('name'),
            parent: el.getAttribute('parent') || null
        });
    });

    return convertWarchiJsonToTrig_(warchi);
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * Очищает строку для использования как URI-фрагмент
 */
function sanitizeId_(str) {
    if (!str) return 'unknown_' + Math.random().toString(36).substr(2, 6);
    return str.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/^[0-9]/, '_$&');
}

/**
 * Извлекает короткий идентификатор из URI
 */
function shortId_(uri) {
    if (!uri) return '';
    const hashIdx = uri.lastIndexOf('#');
    if (hashIdx >= 0) return uri.substring(hashIdx + 1);
    const slashIdx = uri.lastIndexOf('/');
    if (slashIdx >= 0) return uri.substring(slashIdx + 1);
    return uri;
}

/**
 * Экранирует строку для TriG литерала
 */
function escapeTriGString_(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
}
