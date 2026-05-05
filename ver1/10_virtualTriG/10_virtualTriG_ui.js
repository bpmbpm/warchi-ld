// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/317
// 10_virtualTriG_ui.js - UI функции для модуля Virtual TriG

/**
 * Показывает окно с содержимым Virtual TriG
 * Заменяет функцию showVirtualRDFdataWindow()
 * Унифицирует кнопки "Показать Virtual TriG" и "virtualRDFdata"
 */
function showVirtualTriGWindow() {
    // Получаем форматированные данные Virtual TriG из store
    const virtualTriGContent = formatVirtualTriGFromStore(currentPrefixes);

    // Создаём модальное окно или используем существующее
    let modal = document.getElementById('virtual-trig-modal');

    if (!modal) {
        // Создаём модальное окно, если его нет
        modal = document.createElement('div');
        modal.id = 'virtual-trig-modal';
        modal.className = 'virtual-trig-modal';
        modal.innerHTML = `
            <div class="virtual-trig-modal-content">
                <div class="virtual-trig-modal-header">
                    <h3>Virtual TriG (vad:Virtual)</h3>
                    <button class="virtual-trig-modal-close" onclick="closeVirtualTriGModal()">&times;</button>
                </div>
                <div class="virtual-trig-modal-body">
                    <textarea class="virtual-trig-textarea" id="virtual-trig-result" rows="20" readonly></textarea>
                </div>
                <div class="virtual-trig-modal-buttons">
                    <button class="virtual-trig-copy-btn" onclick="copyVirtualTriGToClipboard()">Копировать</button>
                    <button class="virtual-trig-recalc-btn" onclick="recalculateVirtualTriGFromUI()">Пересчитать</button>
                    <button class="virtual-trig-close-btn" onclick="closeVirtualTriGModal()">Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Заполняем содержимое
    const textarea = document.getElementById('virtual-trig-result');
    if (textarea) {
        textarea.value = virtualTriGContent;
    }

    // Показываем модальное окно
    modal.style.display = 'block';

    // Сбрасываем позицию модального окна
    resetModalPosition('virtual-trig-modal');
}

/**
 * Закрывает модальное окно Virtual TriG
 */
function closeVirtualTriGModal() {
    const modal = document.getElementById('virtual-trig-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Копирует содержимое Virtual TriG в буфер обмена
 */
function copyVirtualTriGToClipboard() {
    const textarea = document.getElementById('virtual-trig-result');
    if (!textarea) return;

    textarea.select();
    textarea.setSelectionRange(0, 99999); // Для мобильных устройств

    try {
        navigator.clipboard.writeText(textarea.value).then(() => {
            showSuccessNotification('Virtual TriG скопирован в буфер обмена');
        }).catch(err => {
            // Fallback для старых браузеров
            document.execCommand('copy');
            showSuccessNotification('Virtual TriG скопирован в буфер обмена');
        });
    } catch (err) {
        console.error('Ошибка копирования:', err);
        showErrorNotification('Ошибка копирования в буфер обмена');
    }
}

/**
 * Пересчитывает Virtual TriG и обновляет отображение
 */
async function recalculateVirtualTriGFromUI() {
    const textarea = document.getElementById('virtual-trig-result');

    try {
        // Показываем индикатор загрузки
        if (textarea) {
            textarea.value = '# Пересчёт Virtual TriG...\n';
        }

        // Выполняем пересчёт
        const stats = await recalculateAllVirtualTriGs(currentPrefixes);

        // Обновляем отображение
        const virtualTriGContent = formatVirtualTriGFromStore(currentPrefixes);
        if (textarea) {
            textarea.value = virtualTriGContent;
            textarea.value += '\n# --- Статистика пересчёта ---\n';
            textarea.value += `# Удалено квадов: ${stats.removedQuads}\n`;
            textarea.value += `# Создано квадов: ${stats.createdQuads}\n`;
            textarea.value += `# Создано Virtual TriG: ${stats.virtualTrigsCreated}\n`;
            if (stats.errors.length > 0) {
                textarea.value += `# Ошибки: ${stats.errors.join(', ')}\n`;
            }
        }

        showSuccessNotification(`Virtual TriG пересчитан: создано ${stats.virtualTrigsCreated} графов`);

    } catch (error) {
        console.error('recalculateVirtualTriGFromUI error:', error);
        if (textarea) {
            textarea.value = `# Ошибка пересчёта:\n# ${error.message}\n`;
        }
        showErrorNotification('Ошибка пересчёта Virtual TriG');
    }
}

/**
 * Показывает Virtual TriG после применения SPARQL
 * Заменяет функцию showVirtualTrigAfterApply()
 */
async function showVirtualTriGAfterApply() {
    // Пересчитываем Virtual TriG
    await recalculateAllVirtualTriGs(currentPrefixes);

    // Показываем окно
    showVirtualTriGWindow();
}

/**
 * Обновляет UI для отображения Virtual TriG в панели свойств
 *
 * @param {string} processUri - URI процесса
 * @param {HTMLElement} container - Контейнер для отображения
 */
async function displayVirtualTriGDataInPanel(processUri, container) {
    if (!container || !processUri) return;

    try {
        // Получаем подтип процесса через SPARQL
        const query = VIRTUAL_TRIG_SPARQL.GET_PROCESS_SUBTYPE(processUri);
        const results = await funSPARQLvaluesComunica(query, currentPrefixes);

        if (results && results.length > 0) {
            const subtype = results[0].subtype;
            const subtypeLabel = getPrefixedName(subtype, currentPrefixes);

            // Создаём секцию Virtual TriG
            const section = document.createElement('div');
            section.className = 'virtual-trig-section';
            section.innerHTML = `
                <div class="virtual-trig-section-header">Virtual TriG</div>
                <div class="virtual-trig-section-content">
                    <div class="virtual-trig-property">
                        <span class="property-label">vad:processSubtype:</span>
                        <span class="property-value">${subtypeLabel}</span>
                    </div>
                </div>
            `;
            container.appendChild(section);
        }
    } catch (error) {
        console.error('displayVirtualTriGDataInPanel error:', error);
    }
}

/**
 * Обновляет секцию Virtual TriG в панели свойств объекта
 * Вызывается из 5_publisher_ui.js при выборе узла
 *
 * @param {string} nodeUri - URI выбранного узла
 */
async function updateVirtualTriGSection(nodeUri) {
    const propertiesContent = document.getElementById('trig-properties-content');
    if (!propertiesContent || !nodeUri) return;

    // Удаляем старую секцию Virtual TriG если есть
    const oldSection = propertiesContent.querySelector('.virtual-trig-section');
    if (oldSection) {
        oldSection.remove();
    }

    // issue #334: Используем getNodeTypes() вместо nodeTypesCache
    const types = getNodeTypes(nodeUri);
    const isProcess = types.some(t =>
        t === 'vad:TypeProcess' ||
        t === 'http://example.org/vad#TypeProcess'
    );

    if (!isProcess) return;

    // Добавляем новую секцию Virtual TriG
    await displayVirtualTriGDataInPanel(nodeUri, propertiesContent);
}

// ============================================================================
// СОВМЕСТИМОСТЬ СО СТАРЫМ API
// ============================================================================

/**
 * Alias для совместимости со старым кодом
 * @deprecated Используйте showVirtualTriGWindow()
 */
function showVirtualRDFdataWindow() {
    console.warn('showVirtualRDFdataWindow is deprecated. Use showVirtualTriGWindow() instead.');
    showVirtualTriGWindow();
}

/**
 * Alias для совместимости со старым кодом
 * @deprecated Используйте showVirtualTriGAfterApply()
 */
function showVirtualTrigAfterApply() {
    console.warn('showVirtualTrigAfterApply is deprecated. Use showVirtualTriGAfterApply() instead.');
    showVirtualTriGAfterApply();
}

