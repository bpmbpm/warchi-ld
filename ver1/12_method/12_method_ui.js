// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/368
// 12_method_ui.js - UI функции модуля Методы
// Обработка кнопки "Методы" в окне "Свойство объекта диаграммы"

        // ==============================================================================
        // issue #336: Функции для кнопки Методы и выпадающего списка методов
        // ==============================================================================

        /**
         * Показывает/скрывает выпадающий список методов для объекта
         * @param {Event} event - Событие клика
         * @param {string} objectUri - URI объекта
         * @param {string} trigUri - URI текущего TriG
         * @param {string} objectMethodType - Тип объекта ('isSubprocessTrig' или 'ExecutorGroup')
         */
        async function toggleMethodsDropdown(event, objectUri, trigUri, objectMethodType) {
            event.stopPropagation();

            // Закрываем существующий dropdown если есть
            const existingDropdown = document.querySelector('.methods-dropdown.visible');
            if (existingDropdown) {
                existingDropdown.remove();
            }

            const button = event.target;
            const buttonRect = button.getBoundingClientRect();

            // Создаём dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'methods-dropdown visible';
            dropdown.style.position = 'fixed';
            dropdown.style.left = buttonRect.left + 'px';
            dropdown.style.top = (buttonRect.bottom + 2) + 'px';

            // Получаем методы для данного типа объекта через SPARQL
            const methods = await getMethodsForType(objectMethodType);

            if (methods.length === 0) {
                dropdown.innerHTML = '<div class="methods-dropdown-empty">Нет доступных методов</div>';
            } else {
                methods.forEach(method => {
                    const item = document.createElement('div');
                    item.className = 'methods-dropdown-item';
                    item.textContent = method.label;
                    item.onclick = (e) => {
                        e.stopPropagation();
                        dropdown.remove();
                        executeObjectMethod(method.functionId, objectUri, trigUri);
                    };
                    dropdown.appendChild(item);
                });
            }

            document.body.appendChild(dropdown);

            // Закрываем dropdown при клике вне его
            const closeDropdown = (e) => {
                if (!dropdown.contains(e.target) && e.target !== button) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            };
            setTimeout(() => document.addEventListener('click', closeDropdown), 0);
        }

