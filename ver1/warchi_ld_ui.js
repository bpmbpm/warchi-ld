// warchi_ld_ui.js — UI модуль warchi-ld: меню, тулбар, боковая панель, инициализация
// Внешний вид: warchi.ru | Движок: rdf-grapher/ver9d
// Новые элементы UI (относительно warchi.ru) помечены "_" в конце названия

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================================

/**
 * Точка входа — вызывается при DOMContentLoaded из index.html
 */
function initWarchiLD() {
    initMenuBar();
    initSidebar();
    initStatusBar();
    loadConfig();
    scanDiaFolder();
    // Загрузить онтологию VAD при старте
    loadVADOntologyOnStart();
    setStatus('warchi-ld запущен. Загрузите файл или выберите пример.');
}

// ============================================================================
// СТРОКА МЕНЮ
// ============================================================================

/**
 * Инициализирует обработчики строки меню (click outside = close)
 */
function initMenuBar() {
    document.querySelectorAll('.menu-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = item.classList.contains('menu-item--open');
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

let sidebarVisible = true;

function initSidebar() {
    // По умолчанию боковая панель открыта
    sidebarVisible = true;
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('sidebar-open-btn');
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
    // Переключение вкладок навигатора
    ['treeview', 'properties'].forEach(function(name) {
        const content = document.getElementById('sidebar-tab-' + name);
        const btn = document.getElementById('tab-' + name);
        if (content) {
            content.classList.toggle('sidebar-tab-content--hidden', name !== tabName);
        }
        if (btn) {
            btn.classList.toggle('sidebar-tab--active', name === tabName);
        }
    });
}

// ============================================================================
// СТАТУСНАЯ СТРОКА
// ============================================================================

function initStatusBar() {
    updateStatusBar();
}

function setStatus(text) {
    const el = document.getElementById('status-text');
    if (el) el.textContent = text;
    // Дублируем в menu-status
    const ms = document.getElementById('menu-status');
    if (ms) ms.textContent = text;
}

function updateStatusBar() {
    // Обновляет счётчики триплетов и графов из глобального quadstore
    try {
        if (typeof window.quadstore !== 'undefined' && window.quadstore) {
            const triples = document.getElementById('status-triples');
            const graphs = document.getElementById('status-graphs');
            // vadlib_logic.js хранит данные в глобальных переменных
            if (triples && typeof window.globalRdfStore !== 'undefined') {
                // Подсчёт через N3.Store
            }
        }
    } catch(e) {}
}

// ============================================================================
// ЗАГРУЗКА КОНФИГУРАЦИИ (config.json)
// ============================================================================

function loadConfig() {
    fetch('config.json')
        .then(function(r) { return r.json(); })
        .then(function(cfg) {
            // Применяем свёрнутость панелей из конфига
            Object.keys(cfg).forEach(function(key) {
                if (cfg[key] && cfg[key].collapsed) {
                    const content = document.getElementById('content-' + key);
                    const toggle = document.getElementById('toggle-' + key);
                    if (content) content.style.display = 'none';
                    if (toggle) toggle.innerHTML = '&#9654;';
                }
            });
        })
        .catch(function() {
            // config.json не найден — используем defaults
        });
}

// ============================================================================
// СКАНИРОВАНИЕ ПАПКИ /dia (список примеров)
// ============================================================================

function scanDiaFolder() {
    // Список файлов TTL из папки dia (статически заданный для GitHub Pages)
    const diaFiles = [
        'Trig_VADv8.ttl',
        'Trig_VADv8_warchi.warchi'
    ];
    const select = document.getElementById('example-select');
    if (!select) return;

    diaFiles.forEach(function(filename) {
        const opt = document.createElement('option');
        opt.value = 'dia/' + filename;
        opt.textContent = filename;
        select.appendChild(opt);
    });
}

// ============================================================================
// СВОРАЧИВАЕМЫЕ ПАНЕЛИ
// ============================================================================

function togglePanel(panelName) {
    const content = document.getElementById('content-' + panelName);
    const toggle = document.getElementById('toggle-' + panelName);
    if (!content) return;
    const isVisible = content.style.display !== 'none';
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
}

function openProject() {
    closeAllMenuDropdowns();
    document.getElementById('file-input').click();
}

// ============================================================================
// RDF EDIT WINDOW
// ============================================================================

function showRdfEditWindow() {
    closeAllMenuDropdowns();
    const textarea = document.getElementById('rdf-edit-textarea');
    const mainTextarea = document.getElementById('rdf-input');
    if (textarea && mainTextarea) {
        textarea.value = mainTextarea.value;
    }
    const win = document.getElementById('rdf-edit-window');
    const overlay = document.getElementById('modal-overlay');
    if (win) win.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
}

function closeRdfEditWindow() {
    const win = document.getElementById('rdf-edit-window');
    const overlay = document.getElementById('modal-overlay');
    if (win) win.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
}

function applyRdfEdit() {
    const textarea = document.getElementById('rdf-edit-textarea');
    const mainTextarea = document.getElementById('rdf-input');
    if (textarea && mainTextarea) {
        mainTextarea.value = textarea.value;
        // Перезагружаем данные в triplestore
        if (typeof parseAndLoadRDF === 'function') {
            parseAndLoadRDF(textarea.value);
        }
    }
    closeRdfEditWindow();
    setStatus('RDF данные обновлены');
}

// ============================================================================
// VIRTUAL TRIG WINDOW
// ============================================================================

function showVirtualTriGWindow() {
    closeAllMenuDropdowns();
    const win = document.getElementById('virtual-trig-window');
    const overlay = document.getElementById('modal-overlay');
    // Получаем виртуальные данные через 10_virtualTriG_logic.js
    if (typeof getVirtualTriGText === 'function') {
        const textarea = document.getElementById('virtual-trig-textarea');
        if (textarea) {
            textarea.value = getVirtualTriGText() || '(Нет виртуальных данных)';
        }
    }
    if (win) win.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
}

function closeVirtualTriGWindow() {
    const win = document.getElementById('virtual-trig-window');
    const overlay = document.getElementById('modal-overlay');
    if (win) win.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
}

function closeAllModals() {
    document.querySelectorAll('.modal-window').forEach(function(w) {
        w.style.display = 'none';
    });
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ============================================================================
// ЗУМ ДИАГРАММЫ
// ============================================================================

let currentZoom = 1.0;

function zoomIn_() {
    currentZoom = Math.min(currentZoom + 0.1, 5.0);
    applyZoom_();
}

function zoomOut_() {
    currentZoom = Math.max(currentZoom - 0.1, 0.1);
    applyZoom_();
}

function zoomReset_() {
    currentZoom = 1.0;
    applyZoom_();
}

function applyZoom_() {
    const output = document.getElementById('output');
    if (output) {
        const svg = output.querySelector('svg');
        if (svg) {
            svg.style.transform = 'scale(' + currentZoom + ')';
            svg.style.transformOrigin = 'top left';
        }
    }
}

// ============================================================================
// ОБНОВЛЕНИЕ ДИАГРАММЫ
// ============================================================================

function refreshVisualization() {
    closeAllMenuDropdowns();
    if (typeof visualize === 'function') {
        visualize();
    }
}

// ============================================================================
// ЭКСПОРТ
// ============================================================================

function exportSVG() {
    closeAllMenuDropdowns();
    if (typeof exportSvg === 'function') {
        exportSvg();
    } else {
        const output = document.getElementById('output');
        if (!output) return;
        const svg = output.querySelector('svg');
        if (!svg) { alert('Нет диаграммы для экспорта'); return; }
        const blob = new Blob([svg.outerHTML], {type: 'image/svg+xml'});
        downloadBlob_(blob, 'diagram.svg');
    }
}

function exportPNG() {
    closeAllMenuDropdowns();
    if (typeof exportPng === 'function') {
        exportPng();
    } else {
        alert('Для экспорта PNG сначала визуализируйте диаграмму');
    }
}

function downloadBlob_(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================================
// ЗАГРУЗКА ОНТОЛОГИИ VAD ПРИ СТАРТЕ
// ============================================================================

function loadVADOntologyOnStart() {
    // Загружает онтологию из ontology/vad-basic-ontology.trig и tech_Appendix
    const files = [
        'ontology/vad-basic-ontology.trig',
        'ontology/vad-basic-ontology_tech_Appendix.trig'
    ];
    Promise.all(files.map(function(f) {
        return fetch(f).then(function(r) {
            if (!r.ok) return '';
            return r.text();
        }).catch(function() { return ''; });
    })).then(function(contents) {
        const combined = contents.filter(Boolean).join('\n\n');
        if (combined && typeof loadTechAppendix === 'function') {
            loadTechAppendix(combined);
        }
    });
}

// ============================================================================
// CUSTOM НОТАЦИЯ (заглушка — расширяется в будущих версиях)
// ============================================================================

function openCustomNotationDialog_() {
    closeAllMenuDropdowns();
    alert('Механизм Custom нотации: добавьте свои классы и свойства в ontology/ и перезагрузите страницу.\nПодробнее: doc/Custom/readme.md');
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
    alert('warchi-ld ver1\nАрхитектурный редактор VAD на базе Linked Data\nДвижок: rdf-grapher/ver9d (quadstore/N3.js)\nИнтерфейс: warchi.ru\nhttps://github.com/bpmbpm/warchi-ld');
}

// ============================================================================
// ХЕЛПЕР: ПОЛУЧИТЬ ТЕКСТ VIRTUAL TRIG
// ============================================================================

function getVirtualTriGText() {
    // Пробует получить виртуальные данные из глобального хранилища
    if (typeof getVirtualRdfData === 'function') {
        return getVirtualRdfData();
    }
    const el = document.getElementById('rdf-input');
    return el ? '(Virtual TriG: ' + el.value.length + ' символов в quadstore)' : '';
}
