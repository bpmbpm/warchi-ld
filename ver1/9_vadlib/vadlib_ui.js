// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/368
// vadlib_ui.js - UI функции общей библиотеки RDF Grapher
// Рендеринг интерфейса, обработка событий, взаимодействие с DOM

/**
 * Показывает диалоговое окно при ошибке загрузки файла
 * @param {Object} options - Параметры диалога
 * @param {string} options.title - Заголовок диалога
 * @param {string} options.message - Сообщение об ошибке
 * @param {string} options.fileType - Тип файла (.ttl, .trig и т.д.)
 * @param {Function} options.onFileSelected - Callback при выборе файла
 */
function showFileNotFoundDialog(options) {
    const { title, message, fileType, onFileSelected } = options;

    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'file-not-found-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 10000;
    `;
    modal.innerHTML = `
        <div class="modal-content" style="
            background: white; padding: 25px; border-radius: 8px;
            max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">
            <h3 style="color: #c62828; margin-top: 0; margin-bottom: 15px;">${title}</h3>
            <p style="color: #333; margin-bottom: 20px; word-break: break-all;">${message}</p>
            <div class="modal-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                <label class="file-select-btn" style="
                    padding: 10px 20px; background: #4CAF50; color: white;
                    border-radius: 4px; cursor: pointer; font-weight: 500;
                ">
                    Выбрать файл
                    <input type="file" accept="${fileType}" style="display: none;">
                </label>
                <button class="cancel-btn" style="
                    padding: 10px 20px; background: #9E9E9E; color: white;
                    border: none; border-radius: 4px; cursor: pointer; font-weight: 500;
                ">Отмена</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Обработчики событий
    const fileInput = modal.querySelector('input[type="file"]');
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            onFileSelected(e.target.files[0]);
            modal.remove();
        }
    });

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

/**
 * Показывает уведомление об успешной операции
 * @param {string} message - Сообщение для отображения
 */
function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 15px 25px;
        background: #4CAF50; color: white; border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 10001;
        animation: fadeIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

/**
 * Показывает уведомление об ошибке
 * @param {string} message - Сообщение об ошибке
 */
function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 15px 25px;
        background: #c62828; color: white; border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 10001;
        animation: fadeIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

/**
 * Копирует идентификатор объекта в буфер обмена
 * @param {string} id - Идентификатор для копирования
 * @param {HTMLElement} button - Кнопка, которую нажали
 */
function copyObjectId(id, button) {
    navigator.clipboard.writeText(id).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Скопировано!';
        button.classList.add('copied');
        setTimeout(() => { button.textContent = originalText; button.classList.remove('copied'); }, 2000);
    }).catch(err => {
        console.error('Ошибка копирования:', err);
        const textArea = document.createElement('textarea');
        textArea.value = id;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            button.textContent = 'Скопировано!';
            button.classList.add('copied');
            setTimeout(() => { button.textContent = 'Копировать'; button.classList.remove('copied'); }, 2000);
        } catch (e) { console.error('Fallback copy failed:', e); }
        document.body.removeChild(textArea);
    });
}

