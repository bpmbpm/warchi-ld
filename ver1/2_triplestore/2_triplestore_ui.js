// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/232
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/260
// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/435
// 2_triplestore_ui.js - UI функции для работы с RDF данными (ввод, сохранение, загрузка)

/**
 * issue #260: Обновляет отображение quadstore с учётом фильтра TriG
 * Вызывается при изменении выпадающего списка фильтра TriG
 */
function updateTrigFilter() {
    const filterSelect = document.getElementById('trig-filter');
    if (!filterSelect) return;

    const filterMode = filterSelect.value;

    // Обновляем глобальную переменную режима фильтрации
    if (typeof currentTrigFilterMode !== 'undefined') {
        currentTrigFilterMode = filterMode;
    }

    // Обновляем отображение quadstore с учётом фильтра
    updateQuadstoreDisplay();
}

/**
 * issue #260: Обновляет содержимое textarea quadstore с учётом текущего фильтра TriG
 * Сериализует отфильтрованные квады в формате TriG
 */
function updateQuadstoreDisplay() {
    const rdfInput = document.getElementById('rdf-input');
    if (!rdfInput) return;

    // Получаем отфильтрованные квады
    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    const filterMode = currentTrigFilterMode || TRIG_FILTER_MODES.NO_TECH;
    const filteredQuads = typeof getFilteredQuads === 'function'
        ? getFilteredQuads(filterMode)
        : (currentStore ? currentStore.getQuads(null, null, null, null) : []);

    if (!filteredQuads || filteredQuads.length === 0) {
        rdfInput.value = '';
        return;
    }

    // Сериализуем квады в TriG формат
    try {
        const writer = new N3.Writer({
            format: 'application/trig',
            prefixes: currentPrefixes
        });

        filteredQuads.forEach(quad => writer.addQuad(quad));

        writer.end((error, result) => {
            if (error) {
                console.error('Error serializing quads:', error);
                return;
            }
            // issue #435: Применяем replaceFullUrisWithPrefixes для корректного отображения
            // Cyrillic и других не-ASCII символов в ID. N3.Writer выводит такие ID как
            // полные URI (<http://example.org/vad#яяя22>), но после постобработки
            // они приводятся к сокращённой форме (vad:яяя22).
            if (typeof replaceFullUrisWithPrefixes === 'function') {
                rdfInput.value = replaceFullUrisWithPrefixes(result, currentPrefixes);
            } else {
                rdfInput.value = result;
            }
        });
    } catch (error) {
        console.error('Error updating quadstore display:', error);
    }
}

/**
 * Очищает содержимое поля RDF данных
 */
function clearRdfInput() {
    document.getElementById('rdf-input').value = '';
}

/**
 * Сохраняет содержимое RDF поля как файл
 * issue #262: "Save as" НЕ записывает TechnoTree TriG в файл
 */
function saveAsFile() {
    // issue #262: Получаем квады БЕЗ TechnoTree типов (режим noTech)
    // независимо от текущего фильтра отображения
    // issue #326: Используем currentStore.getQuads() вместо currentQuads
    const filteredQuads = typeof getFilteredQuads === 'function'
        ? getFilteredQuads(TRIG_FILTER_MODES.NO_TECH)
        : (currentStore ? currentStore.getQuads(null, null, null, null) : []);

    if (!filteredQuads || filteredQuads.length === 0) {
        alert('Нет данных для сохранения');
        return;
    }

    // Сериализуем квады в TriG формат
    try {
        const writer = new N3.Writer({
            format: 'application/trig',
            prefixes: currentPrefixes
        });

        filteredQuads.forEach(quad => writer.addQuad(quad));

        writer.end((error, result) => {
            if (error) {
                console.error('Error serializing quads for save:', error);
                alert('Ошибка при сериализации данных');
                return;
            }

            // issue #435: Применяем replaceFullUrisWithPrefixes для корректного отображения
            // Cyrillic символов в сохраняемом файле (аналогично updateQuadstoreDisplay)
            const processedResult = typeof replaceFullUrisWithPrefixes === 'function'
                ? replaceFullUrisWithPrefixes(result, currentPrefixes)
                : result;

            if (!processedResult || !processedResult.trim()) {
                alert('Нет данных для сохранения');
                return;
            }

            const format = document.getElementById('input-format').value;
            let extension = 'ttl';
            if (format === 'n-triples') extension = 'nt';
            else if (format === 'n-quads') extension = 'nq';
            else if (format === 'trig') extension = 'trig';

            const blob = new Blob([processedResult], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rdf-data.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    } catch (error) {
        console.error('Error in saveAsFile:', error);
        alert('Ошибка при сохранении файла');
    }
}

/**
 * Загружает файл, выбранный пользователем
 * issue #282: После успешной загрузки автоматически вызывает refreshVisualization и открывает Publisher
 */
async function loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        document.getElementById('rdf-input').value = e.target.result;

        // Определяем формат по расширению
        const extension = file.name.split('.').pop().toLowerCase();
        let format = 'turtle';
        if (extension === 'nt') format = 'n-triples';
        else if (extension === 'nq') format = 'n-quads';
        else if (extension === 'trig') format = 'trig';

        document.getElementById('input-format').value = format;

        // issue #282: Устанавливаем режим vad-trig для TriG файлов
        if (format === 'trig' || extension === 'ttl') {
            document.getElementById('visualization-mode').value = 'vad-trig';
            if (typeof updateModeDescription === 'function') {
                updateModeDescription();
            }
        }

        // Обновляем статус загрузки
        const statusEl = document.getElementById('example-status');
        statusEl.textContent = `Файл ${file.name} успешно загружен`;
        statusEl.style.display = 'block';
        statusEl.style.backgroundColor = '#d4edda';
        statusEl.style.borderColor = '#c3e6cb';
        statusEl.style.color = '#155724';

        // Сбрасываем значение input для возможности повторной загрузки того же файла
        event.target.value = '';

        // issue #282: Автоматически вызываем refreshVisualization после успешной загрузки файла
        if (typeof refreshVisualization === 'function') {
            console.log('issue #282: Auto-calling refreshVisualization after successful file load');
            await refreshVisualization();

            // issue #282: После успешной загрузки разворачиваем панель Publisher, если она свёрнута
            if (typeof applyPanelCollapsedState === 'function') {
                applyPanelCollapsedState('5_publisher', false);
            }
        }
    };
    reader.readAsText(file);
}

/**
 * Открывает RDF данные в отдельном окне браузера
 */
function showRdfInSeparateWindow() {
    const rdfInput = document.getElementById('rdf-input');
    if (!rdfInput) return;

    const rdfContent = rdfInput.value;

    // Создаем новое окно
    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');

    if (newWindow) {
        // Формируем HTML для нового окна
        const htmlContent = '<!DOCTYPE html>' +
            '<html><head><title>RDF данные</title>' +
            '<style>' +
            'body { font-family: Consolas, Monaco, monospace; padding: 20px; background-color: #f5f5f5; margin: 0; }' +
            '.container { background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }' +
            'h1 { color: #333; font-size: 18px; margin-top: 0; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }' +
            'pre { white-space: pre-wrap; word-wrap: break-word; font-size: 13px; line-height: 1.5; margin: 0; color: #333; }' +
            '.copy-btn { background-color: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-bottom: 15px; }' +
            '.copy-btn:hover { background-color: #45a049; }' +
            '</style></head>' +
            '<body><div class="container">' +
            '<h1>RDF данные</h1>' +
            '<button class="copy-btn" id="copy-btn">Копировать в буфер</button>' +
            '<pre id="rdf-content"></pre>' +
            '</div></body></html>';

        newWindow.document.write(htmlContent);
        newWindow.document.close();

        // Заполняем содержимое после записи документа
        const preElement = newWindow.document.getElementById('rdf-content');
        if (preElement) {
            preElement.textContent = rdfContent;
        }

        // Добавляем обработчик для кнопки копирования
        const copyBtn = newWindow.document.getElementById('copy-btn');
        if (copyBtn) {
            copyBtn.onclick = function() {
                newWindow.navigator.clipboard.writeText(rdfContent).then(function() {
                    newWindow.alert('Скопировано в буфер обмена');
                }).catch(function() {
                    // Fallback для старых браузеров
                    const textarea = newWindow.document.createElement('textarea');
                    textarea.value = rdfContent;
                    newWindow.document.body.appendChild(textarea);
                    textarea.select();
                    newWindow.document.execCommand('copy');
                    newWindow.document.body.removeChild(textarea);
                    newWindow.alert('Скопировано в буфер обмена');
                });
            };
        }
    } else {
        alert('Не удалось открыть новое окно. Проверьте настройки блокировки всплывающих окон.');
    }
}

/**
 * issue #258: Открывает RDF данные в отдельном окне браузера с полным редактором
 * Включает: редактирование, поиск, замену, кнопку "Сохранить" и "Тест"
 */
function showRdfEditWindow() {
    const rdfInput = document.getElementById('rdf-input');
    if (!rdfInput) return;

    const rdfContent = rdfInput.value;

    // Создаем новое окно с большим размером для редактора
    const newWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');

    if (newWindow) {
        // Формируем HTML для нового окна с полным редактором
        const htmlContent = `<!DOCTYPE html>
<html><head><title>Edit RDF данные</title>
<style>
body { font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5; margin: 0; }
.container { background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); height: calc(100vh - 80px); display: flex; flex-direction: column; }
h1 { color: #333; font-size: 18px; margin-top: 0; border-bottom: 2px solid #2196F3; padding-bottom: 10px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; align-items: center; }
.toolbar-group { display: flex; gap: 5px; align-items: center; padding: 5px 10px; background: #f0f0f0; border-radius: 4px; }
.toolbar-group label { font-size: 13px; color: #666; margin-right: 5px; }
.toolbar-group input { padding: 5px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; width: 150px; }
.btn { border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.btn-primary { background-color: #2196F3; color: white; }
.btn-primary:hover { background-color: #1976D2; }
.btn-success { background-color: #4CAF50; color: white; }
.btn-success:hover { background-color: #45a049; }
.btn-warning { background-color: #FF9800; color: white; }
.btn-warning:hover { background-color: #F57C00; }
.btn-secondary { background-color: #9E9E9E; color: white; }
.btn-secondary:hover { background-color: #757575; }
.editor-container { flex: 1; display: flex; flex-direction: column; }
#rdf-editor { flex: 1; font-family: Consolas, Monaco, monospace; font-size: 13px; line-height: 1.5; padding: 15px; border: 1px solid #ddd; border-radius: 4px; resize: none; }
.status-bar { margin-top: 10px; padding: 8px 12px; background: #e3f2fd; border-radius: 4px; font-size: 13px; color: #1565C0; }
.status-bar.success { background: #e8f5e9; color: #2e7d32; }
.status-bar.error { background: #ffebee; color: #c62828; }
</style>
</head>
<body>
<div class="container">
    <h1>Edit RDF данные</h1>
    <div class="toolbar">
        <button class="btn btn-success" id="save-btn" title="Сохранить изменения в quadstore">Сохранить</button>
        <button class="btn btn-warning" id="test-btn" title="Проверить валидность RDF данных">Тест</button>
        <div class="toolbar-group">
            <label>Поиск:</label>
            <input type="text" id="search-input" placeholder="Введите текст...">
            <button class="btn btn-secondary" id="find-btn">Найти</button>
            <button class="btn btn-secondary" id="find-next-btn">Далее</button>
        </div>
        <div class="toolbar-group">
            <label>Замена:</label>
            <input type="text" id="replace-input" placeholder="Заменить на...">
            <button class="btn btn-secondary" id="replace-btn">Заменить</button>
            <button class="btn btn-secondary" id="replace-all-btn">Заменить все</button>
        </div>
    </div>
    <div class="editor-container">
        <textarea id="rdf-editor" placeholder="Введите RDF данные..."></textarea>
    </div>
    <div class="status-bar" id="status-bar">Готово к редактированию</div>
</div>
</body></html>`;

        newWindow.document.write(htmlContent);
        newWindow.document.close();

        // Заполняем содержимое редактора
        const editorElement = newWindow.document.getElementById('rdf-editor');
        if (editorElement) {
            editorElement.value = rdfContent;
        }

        const statusBar = newWindow.document.getElementById('status-bar');
        let lastSearchIndex = -1;

        // Обработчик кнопки "Сохранить"
        const saveBtn = newWindow.document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.onclick = function() {
                const newContent = newWindow.document.getElementById('rdf-editor').value;
                // Сохраняем в основное окно
                rdfInput.value = newContent;
                // Обновляем quadstore
                if (typeof refreshQuadstoreFromRdfInput === 'function') {
                    refreshQuadstoreFromRdfInput();
                }
                statusBar.textContent = 'Данные сохранены в quadstore';
                statusBar.className = 'status-bar success';
            };
        }

        // Обработчик кнопки "Тест"
        const testBtn = newWindow.document.getElementById('test-btn');
        if (testBtn) {
            testBtn.onclick = function() {
                const editorContent = newWindow.document.getElementById('rdf-editor').value;
                // Сначала сохраняем в основное окно
                rdfInput.value = editorContent;
                // Вызываем функцию тестирования из основного окна
                if (typeof testRdfValidation === 'function') {
                    testRdfValidation();
                    statusBar.textContent = 'Тест выполнен - см. результаты в основном окне';
                    statusBar.className = 'status-bar';
                } else {
                    statusBar.textContent = 'Функция тестирования недоступна';
                    statusBar.className = 'status-bar error';
                }
            };
        }

        // Обработчик кнопки "Найти"
        const findBtn = newWindow.document.getElementById('find-btn');
        const searchInput = newWindow.document.getElementById('search-input');
        if (findBtn && searchInput) {
            findBtn.onclick = function() {
                const searchText = searchInput.value;
                if (!searchText) {
                    statusBar.textContent = 'Введите текст для поиска';
                    statusBar.className = 'status-bar error';
                    return;
                }
                const editor = newWindow.document.getElementById('rdf-editor');
                const content = editor.value;
                const index = content.indexOf(searchText);
                if (index !== -1) {
                    editor.focus();
                    editor.setSelectionRange(index, index + searchText.length);
                    lastSearchIndex = index;
                    statusBar.textContent = 'Найдено: ' + searchText;
                    statusBar.className = 'status-bar success';
                } else {
                    lastSearchIndex = -1;
                    statusBar.textContent = 'Текст не найден: ' + searchText;
                    statusBar.className = 'status-bar error';
                }
            };
        }

        // Обработчик кнопки "Далее"
        const findNextBtn = newWindow.document.getElementById('find-next-btn');
        if (findNextBtn && searchInput) {
            findNextBtn.onclick = function() {
                const searchText = searchInput.value;
                if (!searchText) {
                    statusBar.textContent = 'Введите текст для поиска';
                    statusBar.className = 'status-bar error';
                    return;
                }
                const editor = newWindow.document.getElementById('rdf-editor');
                const content = editor.value;
                const startIndex = lastSearchIndex >= 0 ? lastSearchIndex + searchText.length : 0;
                const index = content.indexOf(searchText, startIndex);
                if (index !== -1) {
                    editor.focus();
                    editor.setSelectionRange(index, index + searchText.length);
                    lastSearchIndex = index;
                    statusBar.textContent = 'Найдено: ' + searchText;
                    statusBar.className = 'status-bar success';
                } else {
                    // Начинаем сначала
                    const firstIndex = content.indexOf(searchText);
                    if (firstIndex !== -1) {
                        editor.focus();
                        editor.setSelectionRange(firstIndex, firstIndex + searchText.length);
                        lastSearchIndex = firstIndex;
                        statusBar.textContent = 'Поиск с начала: ' + searchText;
                        statusBar.className = 'status-bar';
                    } else {
                        statusBar.textContent = 'Текст не найден: ' + searchText;
                        statusBar.className = 'status-bar error';
                    }
                }
            };
        }

        // Обработчик кнопки "Заменить"
        const replaceBtn = newWindow.document.getElementById('replace-btn');
        const replaceInput = newWindow.document.getElementById('replace-input');
        if (replaceBtn && searchInput && replaceInput) {
            replaceBtn.onclick = function() {
                const searchText = searchInput.value;
                const replaceText = replaceInput.value;
                if (!searchText) {
                    statusBar.textContent = 'Введите текст для поиска';
                    statusBar.className = 'status-bar error';
                    return;
                }
                const editor = newWindow.document.getElementById('rdf-editor');
                const content = editor.value;
                const index = content.indexOf(searchText);
                if (index !== -1) {
                    editor.value = content.substring(0, index) + replaceText + content.substring(index + searchText.length);
                    editor.focus();
                    editor.setSelectionRange(index, index + replaceText.length);
                    lastSearchIndex = index;
                    statusBar.textContent = 'Заменено: ' + searchText + ' → ' + replaceText;
                    statusBar.className = 'status-bar success';
                } else {
                    statusBar.textContent = 'Текст не найден: ' + searchText;
                    statusBar.className = 'status-bar error';
                }
            };
        }

        // Обработчик кнопки "Заменить все"
        const replaceAllBtn = newWindow.document.getElementById('replace-all-btn');
        if (replaceAllBtn && searchInput && replaceInput) {
            replaceAllBtn.onclick = function() {
                const searchText = searchInput.value;
                const replaceText = replaceInput.value;
                if (!searchText) {
                    statusBar.textContent = 'Введите текст для поиска';
                    statusBar.className = 'status-bar error';
                    return;
                }
                const editor = newWindow.document.getElementById('rdf-editor');
                const content = editor.value;
                const count = (content.match(new RegExp(searchText.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g')) || []).length;
                if (count > 0) {
                    editor.value = content.split(searchText).join(replaceText);
                    statusBar.textContent = 'Заменено ' + count + ' вхождений: ' + searchText + ' → ' + replaceText;
                    statusBar.className = 'status-bar success';
                } else {
                    statusBar.textContent = 'Текст не найден: ' + searchText;
                    statusBar.className = 'status-bar error';
                }
            };
        }
    } else {
        alert('Не удалось открыть новое окно. Проверьте настройки блокировки всплывающих окон.');
    }
}

/**
 * issue #324: Устаревшая функция - перенаправляет на showVirtualTriGWindow()
 * @deprecated Используйте showVirtualTriGWindow() из 10_virtualTriG_ui.js
 */
function showVirtualRDFdataWindow() {
    console.warn('showVirtualRDFdataWindow is deprecated. Use showVirtualTriGWindow() instead.');
    if (typeof showVirtualTriGWindow === 'function') {
        showVirtualTriGWindow();
    } else {
        alert('Функция showVirtualTriGWindow не загружена');
    }
}

