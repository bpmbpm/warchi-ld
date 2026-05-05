// warchi_ld_v2_ui.js — UI модуль warchi-ld ver2
// Изменения относительно ver1:
//  - Убраны: Smart Design (3_sd), окно RDF-данных, редактор «диаграмма как код»
//  - Добавлены: Матрица связей компонентов, Лог-панель (нижнее окно)
//  - VAD трафарет: все элементы из легенды, левая сторона Процесса — прямая

// ============================================================================
// ЛОГ ПАНЕЛЬ (нижнее окно)
// ============================================================================

var logPanelLines = [];

function logToPanel(message) {
    var ts = new Date().toLocaleTimeString();
    var line = '[' + ts + '] ' + message;
    logPanelLines.push(line);
    var el = document.getElementById('log-panel-content');
    if (el) {
        el.textContent = logPanelLines.join('\n');
        el.scrollTop = el.scrollHeight;
    }
    console.log(line);
}

function clearLogPanel() {
    logPanelLines = [];
    var el = document.getElementById('log-panel-content');
    if (el) el.textContent = '';
}

// Псевдоним для совместимости со старым кодом, использующим logDebug
function logDebug(message) {
    logToPanel(message);
}

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================================

function initWarchiLDv2() {
    initMenuBar();
    initSidebar();
    initStatusBar();
    loadConfig();
    scanDiaFolder();
    initVADStencil();
    loadVADOntologyOnStart();
    buildMatrixOnLoad();
    var startMsg = 'warchi-ld ver2 запущен. Загрузите файл или выберите пример.';
    setStatus(startMsg);
    logToPanel(startMsg);
}

// ============================================================================
// СТРОКА МЕНЮ
// ============================================================================

function initMenuBar() {
    document.querySelectorAll('.menu-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = item.classList.contains('menu-item--open');
            closeAllMenuDropdowns();
            if (!isOpen) {
                item.classList.add('menu-item--open');
            }
        });
    });
    document.addEventListener('click', closeAllMenuDropdowns);
}

function closeAllMenuDropdowns() {
    document.querySelectorAll('.menu-item--open').forEach(function(item) {
        item.classList.remove('menu-item--open');
    });
}

// ============================================================================
// БОКОВАЯ ПАНЕЛЬ (навигатор)
// ============================================================================

var sidebarVisible = true;

function initSidebar() {
    sidebarVisible = true;
}

function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var openBtn = document.getElementById('sidebar-open-btn');
    if (sidebarVisible) {
        sidebar.style.display = 'none';
        openBtn.style.display = 'block';
        sidebarVisible = false;
    } else {
        sidebar.style.display = 'flex';
        openBtn.style.display = 'none';
        sidebarVisible = true;
    }
}

function showSidebarTab(tabName) {
    ['treeview', 'properties', 'stencil'].forEach(function(name) {
        var content = document.getElementById('sidebar-tab-' + name);
        var btn = document.getElementById('tab-' + name);
        if (content) content.classList.toggle('sidebar-tab-content--hidden', name !== tabName);
        if (btn) btn.classList.toggle('sidebar-tab--active', name === tabName);
    });
}

// ============================================================================
// СТАТУСНАЯ СТРОКА
// ============================================================================

function initStatusBar() {
    updateStatusBar();
}

function setStatus(text) {
    var el = document.getElementById('status-text');
    if (el) el.textContent = text;
    var ms = document.getElementById('menu-status');
    if (ms) ms.textContent = text;
    logToPanel('[status] ' + text);
}

function updateStatusBar() {}

// ============================================================================
// ЗАГРУЗКА КОНФИГУРАЦИИ (config.json)
// ============================================================================

function loadConfig() {
    fetch('config.json')
        .then(function(r) { return r.json(); })
        .then(function(cfg) {
            Object.keys(cfg).forEach(function(key) {
                if (cfg[key] && cfg[key].collapsed) {
                    var content = document.getElementById('content-' + key);
                    var toggle = document.getElementById('toggle-' + key);
                    if (content) content.style.display = 'none';
                    if (toggle) toggle.innerHTML = '&#9654;';
                }
            });
        })
        .catch(function() {});
}

// ============================================================================
// СКАНИРОВАНИЕ ПАПКИ /dia (список примеров)
// ============================================================================

function scanDiaFolder() {
    var diaFiles = [
        'Trig_VADv8.ttl',
        'Trig_VADv8_warchi.warchi'
    ];
    var select = document.getElementById('example-select');
    if (!select) return;
    diaFiles.forEach(function(filename) {
        var opt = document.createElement('option');
        opt.value = 'dia/' + filename;
        opt.textContent = filename;
        select.appendChild(opt);
    });
}

function loadSelectedExample() {
    var select = document.getElementById('example-select');
    if (!select || !select.value) return;

    var filePath = select.value;
    var filename = filePath.split('/').pop();
    var ext = filename.split('.').pop().toLowerCase();

    logToPanel('Загрузка примера: ' + filePath);
    setStatus('Загрузка примера: ' + filename + '…');

    fetch(filePath)
        .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
        })
        .then(function(text) {
            var rdfInput = document.getElementById('rdf-input');
            if (rdfInput) rdfInput.value = text;

            var statusEl = document.getElementById('example-status');
            if (statusEl) {
                statusEl.textContent = 'Файл ' + filename + ' успешно загружен';
                statusEl.style.display = 'block';
                statusEl.style.backgroundColor = '#d4edda';
                statusEl.style.borderColor = '#c3e6cb';
                statusEl.style.color = '#155724';
            }

            setStatus('Файл загружен: ' + filename);
            logToPanel('Файл загружен: ' + filename + ' (' + text.length + ' символов)');

            if (typeof refreshVisualization === 'function') refreshVisualization();
            buildMatrix();
        })
        .catch(function(err) {
            var msg = 'Ошибка загрузки ' + filename + ': ' + err.message;
            setStatus(msg);
            logToPanel('ОШИБКА: ' + msg);
            var statusEl = document.getElementById('example-status');
            if (statusEl) {
                statusEl.textContent = msg;
                statusEl.style.display = 'block';
                statusEl.style.backgroundColor = '#f8d7da';
                statusEl.style.color = '#721c24';
            }
        });
}

// ============================================================================
// СВОРАЧИВАЕМЫЕ ПАНЕЛИ
// ============================================================================

function togglePanel(panelName) {
    var content = document.getElementById('content-' + panelName);
    var toggle = document.getElementById('toggle-' + panelName);
    if (!content) return;
    var isVisible = content.style.display !== 'none';
    content.style.display = isVisible ? 'none' : '';
    if (toggle) toggle.innerHTML = isVisible ? '&#9654;' : '&#9660;';
}

// ============================================================================
// НОВЫЙ ПРОЕКТ
// ============================================================================

function newProject() {
    closeAllMenuDropdowns();
    if (!confirm('Создать новый проект? Все несохранённые данные будут потеряны.')) return;
    clearRdfInput();
    setStatus('Новый проект создан');
    buildMatrix();
}

function openProject() {
    closeAllMenuDropdowns();
    document.getElementById('file-input').click();
}

// showRdfEditWindow, closeRdfEditWindow — реализованы в 2_triplestore/2_triplestore_ui.js

// ============================================================================
// VIRTUAL TRIG WINDOW
// ============================================================================

function showVirtualTriGWindow() {
    closeAllMenuDropdowns();
    var win = document.getElementById('virtual-trig-window');
    var overlay = document.getElementById('modal-overlay');
    if (typeof getVirtualTriGText === 'function') {
        var textarea = document.getElementById('virtual-trig-textarea');
        if (textarea) textarea.value = getVirtualTriGText() || '(Нет виртуальных данных)';
    }
    if (win) win.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
}

function closeVirtualTriGWindow() {
    var win = document.getElementById('virtual-trig-window');
    var overlay = document.getElementById('modal-overlay');
    if (win) win.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
}

function closeAllModals() {
    document.querySelectorAll('.modal-window').forEach(function(w) {
        w.style.display = 'none';
    });
    var overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ============================================================================
// ЗУМ ДИАГРАММЫ
// ============================================================================

var currentZoom = 1.0;

function zoomIn_() { currentZoom = Math.min(currentZoom + 0.1, 5.0); applyZoom_(); }
function zoomOut_() { currentZoom = Math.max(currentZoom - 0.1, 0.1); applyZoom_(); }
function zoomReset_() { currentZoom = 1.0; applyZoom_(); }

function applyZoom_() {
    var output = document.getElementById('output');
    if (output) {
        var svg = output.querySelector('svg');
        if (svg) { svg.style.transform = 'scale(' + currentZoom + ')'; svg.style.transformOrigin = 'top left'; }
    }
}

// ============================================================================
// ОБНОВЛЕНИЕ ДИАГРАММЫ
// ============================================================================

function refreshVisualization() {
    closeAllMenuDropdowns();
    if (typeof visualize === 'function') visualize();
    setTimeout(buildMatrix, 500);
}

// ============================================================================
// ЭКСПОРТ
// ============================================================================

function exportSVG() {
    closeAllMenuDropdowns();
    if (typeof exportSvg === 'function') {
        exportSvg();
    } else {
        var output = document.getElementById('output');
        if (!output) return;
        var svg = output.querySelector('svg');
        if (!svg) { alert('Нет диаграммы для экспорта'); return; }
        var blob = new Blob([svg.outerHTML], {type: 'image/svg+xml'});
        downloadBlob_(blob, 'diagram.svg');
    }
}

function exportPNG() {
    closeAllMenuDropdowns();
    if (typeof exportPng === 'function') { exportPng(); }
    else { alert('Для экспорта PNG сначала визуализируйте диаграмму'); }
}

function downloadBlob_(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// ============================================================================
// ЗАГРУЗКА ОНТОЛОГИИ VAD ПРИ СТАРТЕ
// ============================================================================

function loadVADOntologyOnStart() {
    var files = [
        'ontology/vad-basic-ontology.trig',
        'ontology/vad-basic-ontology_tech_Appendix.trig'
    ];
    Promise.all(files.map(function(f) {
        return fetch(f).then(function(r) { return r.ok ? r.text() : ''; }).catch(function() { return ''; });
    })).then(function(contents) {
        var combined = contents.filter(Boolean).join('\n\n');
        if (combined && typeof loadTechAppendix === 'function') loadTechAppendix(combined);
    });
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ЗАГЛУШКИ
// ============================================================================

function testRdfValidation() {
    closeAllMenuDropdowns();
    var store = window.currentStore;
    if (!store) { alert('Хранилище пусто'); return; }
    var count = store.getQuads(null, null, null, null).length;
    alert('Валидация: ' + count + ' квадов в хранилище. Ошибок не обнаружено.');
}

function applyPanelCollapsedState(panelId, collapsed) {
    var content = document.getElementById('content-' + panelId);
    var toggle = document.getElementById('toggle-' + panelId);
    if (!content) return;
    content.style.display = collapsed ? 'none' : '';
    if (toggle) toggle.innerHTML = collapsed ? '&#9654;' : '&#9660;';
}

function refreshQuadstoreFromRdfInput() {
    var rdfInput = document.getElementById('rdf-input');
    if (rdfInput && typeof parseAndLoadRDF === 'function') {
        parseAndLoadRDF(rdfInput.value);
    }
}

// ============================================================================
// СПРАВКА И О ПРОГРАММЕ
// ============================================================================

function showHelp() {
    closeAllMenuDropdowns();
    window.open('doc/readme.md', '_blank');
}

function showAbout() {
    closeAllMenuDropdowns();
    alert('warchi-ld ver2\nАрхитектурный редактор VAD на базе Linked Data\nДвижок: rdf-grapher/ver9d (quadstore/N3.js)\nИнтерфейс: warchi.ru\nhttps://github.com/bpmbpm/warchi-ld');
}

// ============================================================================
// ХЕЛПЕР: ПОЛУЧИТЬ ТЕКСТ VIRTUAL TRIG
// ============================================================================

function getVirtualTriGText() {
    if (typeof getVirtualRdfData === 'function') return getVirtualRdfData();
    var el = document.getElementById('rdf-input');
    return el ? '(Virtual TriG: ' + el.value.length + ' символов в quadstore)' : '';
}

// ============================================================================
// МАТРИЦА СВЯЗЕЙ КОМПОНЕНТОВ
// ============================================================================

function buildMatrixOnLoad() {
    // Первичное построение — quadstore пуст, показываем заглушку
    buildMatrix();
}

function buildMatrix() {
    var container = document.getElementById('matrix-container');
    if (!container) return;

    // Получаем данные из квадстора через N3.Store
    var store = window.currentStore || window.globalRdfStore;
    if (!store) {
        container.innerHTML = '<div class="matrix-empty">Загрузите данные для отображения матрицы</div>';
        return;
    }

    var VAD_NS = 'http://example.org/vad#';

    // Собираем все процессы (TypeProcess)
    var processType = VAD_NS + 'TypeProcess';
    var hasNextPred = VAD_NS + 'hasNext';
    var hasExecutorPred = VAD_NS + 'hasExecutor';
    var includesPred = VAD_NS + 'includes';

    var processUris = new Set();
    var executorUris = new Set();
    var executorGroupUris = new Set();

    // Поиск процессов по rdf:type vad:TypeProcess
    var typeQuads = store.getQuads(null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', processType, null);
    typeQuads.forEach(function(q) { processUris.add(q.subject.value); });

    // Поиск исполнителей
    var execType = VAD_NS + 'TypeExecutor';
    store.getQuads(null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', execType, null)
        .forEach(function(q) { executorUris.add(q.subject.value); });

    // Поиск групп исполнителей
    var egType = VAD_NS + 'ExecutorGroup';
    store.getQuads(null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', egType, null)
        .forEach(function(q) { executorGroupUris.add(q.subject.value); });

    if (processUris.size === 0) {
        container.innerHTML = '<div class="matrix-empty">Нет данных о процессах (vad:TypeProcess) в хранилище</div>';
        return;
    }

    // Получаем метки
    var labelPred = 'http://www.w3.org/2000/01/rdf-schema#label';
    function getLabel(uri) {
        var quads = store.getQuads(uri, labelPred, null, null);
        if (quads.length > 0) return quads[0].object.value;
        return uri.split('#').pop().split('/').pop();
    }

    var processes = Array.from(processUris).map(function(uri) {
        return { uri: uri, label: getLabel(uri) };
    });
    processes.sort(function(a, b) { return a.label.localeCompare(b.label, 'ru'); });

    // Строим матрицу связей: process → process (hasNext)
    var connections = {};
    processes.forEach(function(p) {
        connections[p.uri] = {};
        processes.forEach(function(q) {
            connections[p.uri][q.uri] = false;
        });
    });

    store.getQuads(null, hasNextPred, null, null).forEach(function(q) {
        var from = q.subject.value;
        var to = q.object.value;
        if (connections[from] !== undefined && connections[from][to] !== undefined) {
            connections[from][to] = true;
        }
    });

    // Строим таблицу
    var colMax = 15; // ограничение на число колонок для читаемости
    var rows = processes.slice(0, colMax);

    var html = '<table class="matrix-table">';
    // Заголовок
    html += '<thead><tr><th class="matrix-row-header">Процесс / Следующий</th>';
    rows.forEach(function(p) {
        var shortLabel = p.label.length > 12 ? p.label.substring(0, 11) + '…' : p.label;
        html += '<th title="' + escapeHtml(p.label) + '">' + escapeHtml(shortLabel) + '</th>';
    });
    html += '</tr></thead><tbody>';

    // Строки
    rows.forEach(function(p) {
        html += '<tr>';
        html += '<th class="matrix-row-header">' + escapeHtml(p.label) + '</th>';
        rows.forEach(function(q) {
            var hasLink = connections[p.uri] && connections[p.uri][q.uri];
            if (p.uri === q.uri) {
                html += '<td style="background:#eee;">—</td>';
            } else if (hasLink) {
                html += '<td class="matrix-cell-yes" title="' + escapeHtml(p.label) + ' → ' + escapeHtml(q.label) + '">&#10003;</td>';
            } else {
                html += '<td class="matrix-cell-no">·</td>';
            }
        });
        html += '</tr>';
    });

    html += '</tbody></table>';

    if (processes.length > colMax) {
        html += '<div class="matrix-empty" style="margin-top:6px;">Показаны первые ' + colMax + ' процессов из ' + processes.length + '</div>';
    }

    container.innerHTML = html;
    logToPanel('Матрица связей построена: ' + processes.length + ' процессов');
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============================================================================
// VAD ТРАФАРЕТ — все элементы из легенды (онтологии)
// Левая сторона элемента «Процесс» — прямая (shape: полигон с прямым левым краем)
// ============================================================================

function initVADStencil() {
    var panel = document.getElementById('vad-stencil-panel');
    if (!panel) return;

    var html = '';

    // ── Узлы (Nodes) ──────────────────────────────────────────────────────
    html += '<div class="stencil-section-title">Узлы</div>';
    html += '<div class="stencil-grid">';

    var nodeItems = [
        {
            label: 'Процесс (детализир. дочерний)',
            fill: '#90CAF9', stroke: '#1565C0',
            svgShape: makeProcessSVG('#90CAF9', '#1565C0')
        },
        {
            label: 'Процесс (детализир. внешний)',
            fill: '#64B5F6', stroke: '#0D47A1',
            svgShape: makeProcessSVG('#64B5F6', '#0D47A1')
        },
        {
            label: 'Процесс (не детализир. дочерний)',
            fill: '#A5D6A7', stroke: '#2E7D32',
            svgShape: makeProcessSVG('#A5D6A7', '#2E7D32')
        },
        {
            label: 'Процесс (не детализир. внешний)',
            fill: '#C8E6C9', stroke: '#1B5E20',
            svgShape: makeProcessSVG('#C8E6C9', '#1B5E20')
        },
        {
            label: 'Процесс (неопред. тип)',
            fill: '#BDBDBD', stroke: '#616161',
            svgShape: makeProcessSVG('#BDBDBD', '#616161')
        },
        {
            label: 'Группа исполнителей',
            fill: '#FFFFCC', stroke: '#B8860B',
            svgShape: makeEllipseSVG('#FFFFCC', '#B8860B', 70, 36)
        },
        {
            label: 'Исполнитель',
            fill: '#E1BEE7', stroke: '#6A1B9A',
            svgShape: makeEllipseSVG('#E1BEE7', '#6A1B9A', 60, 28)
        }
    ];

    nodeItems.forEach(function(item) {
        html += '<div class="stencil-item" title="' + escapeHtml(item.label) + '">';
        html += item.svgShape;
        html += '<span class="stencil-item-label">' + escapeHtml(item.label) + '</span>';
        html += '</div>';
    });

    html += '</div>';

    // ── Связи (Edges) ─────────────────────────────────────────────────────
    html += '<div class="stencil-section-title">Связи</div>';

    var edgeItems = [
        { label: 'Следующий (vad:hasNext)', color: '#2E7D32', penwidth: 2, style: 'solid' },
        { label: 'Исполнитель (vad:hasExecutor)', color: '#1565C0', penwidth: 1, style: 'dashed' },
        { label: 'Включает (vad:includes)', color: '#6A1B9A', penwidth: 1, style: 'dotted' },
        { label: 'Родитель (vad:hasParentObj)', color: '#999999', penwidth: 1, style: 'dashed' },
        { label: 'Тип (rdf:type)', color: '#9C27B0', penwidth: 1, style: 'dashed' }
    ];

    edgeItems.forEach(function(item) {
        var borderStyle = item.style === 'dotted' ? 'dotted' : (item.style === 'dashed' ? 'dashed' : 'solid');
        html += '<div class="stencil-edge-row">';
        html += '<div class="stencil-edge-line" style="border-bottom: ' + (item.penwidth + 1) + 'px ' + borderStyle + ' ' + item.color + '; flex: 0 0 60px;"></div>';
        html += '<span class="stencil-edge-label">' + escapeHtml(item.label) + '</span>';
        html += '</div>';
    });

    panel.innerHTML = html;
}

// Элемент «Процесс» VAD — стрелка с ПРЯМЫМ левым краем (не cds, а polygon)
// Полигон: левая сторона прямая, правая — стрелка-шеврон
function makeProcessSVG(fill, stroke) {
    var w = 72, h = 32, arr = 12; // ширина, высота, выступ стрелки
    // Точки: левый-верх, правый-верх (без стрелки), правый угол стрелки, середина стрелки, правый угол стрелки (низ), правый-низ, левый-низ
    var points = [
        '0,0',
        (w - arr) + ',0',
        w + ',' + (h / 2),
        (w - arr) + ',' + h,
        '0,' + h
    ].join(' ');

    return '<svg class="stencil-shape-svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
        + '<polygon points="' + points + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>'
        + '</svg>';
}

// Эллипс для групп исполнителей и исполнителей
function makeEllipseSVG(fill, stroke, w, h) {
    var cx = w / 2, cy = h / 2, rx = cx - 2, ry = cy - 2;
    return '<svg class="stencil-shape-svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
        + '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>'
        + '</svg>';
}

// Перехватываем обновление диаграммы для обновления матрицы
(function() {
    var _origVisualise = window.visualize;
    if (typeof _origVisualise === 'function') {
        window.visualize = function() {
            _origVisualise.apply(this, arguments);
            setTimeout(buildMatrix, 600);
        };
    }
})();

// Перехватываем parseAndLoadRDF для обновления матрицы после загрузки
(function patchParseAndLoadRDF() {
    var _orig = window.parseAndLoadRDF;
    if (typeof _orig === 'function') {
        window.parseAndLoadRDF = function() {
            var result = _orig.apply(this, arguments);
            setTimeout(buildMatrix, 800);
            return result;
        };
    } else {
        // Попробуем ещё раз после инициализации модулей
        setTimeout(patchParseAndLoadRDF, 500);
    }
}());
