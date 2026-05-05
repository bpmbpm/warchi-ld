// issue #408: Функциональность поиска в TreeView
// 5_publisher_treeview_search.js - Поиск и навигация по дереву TriG

        /**
         * Состояние поиска
         */
        let searchState = {
            searchTerm: '',
            results: [],
            currentIndex: -1,
            isSearchActive: false
        };

        /**
         * Открывает диалоговое окно поиска
         */
        function openTriGSearchDialog() {
            // Проверяем, не открыто ли уже диалоговое окно
            if (document.getElementById('trig-search-overlay')) {
                return;
            }

            // Создаем overlay
            const overlay = document.createElement('div');
            overlay.id = 'trig-search-overlay';
            overlay.className = 'trig-search-overlay';
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    closeTriGSearchDialog();
                }
            };

            // Создаем диалоговое окно
            const dialog = document.createElement('div');
            dialog.className = 'trig-search-dialog';
            dialog.onclick = (e) => e.stopPropagation();

            // Заголовок
            const header = document.createElement('div');
            header.className = 'trig-search-header';
            header.innerHTML = `
                <div class="trig-search-title">Поиск в дереве TriG</div>
                <button class="trig-search-close-btn" onclick="closeTriGSearchDialog()">&times;</button>
            `;

            // Тело диалога
            const body = document.createElement('div');
            body.className = 'trig-search-body';
            body.innerHTML = `
                <div class="trig-search-input-group">
                    <label class="trig-search-label" for="trig-search-input">Введите текст для поиска:</label>
                    <input type="text"
                           id="trig-search-input"
                           class="trig-search-input"
                           placeholder="Введите текст..."
                           autocomplete="off">
                </div>
                <div id="trig-search-status" class="trig-search-status"></div>
            `;

            // Футер с кнопками
            const footer = document.createElement('div');
            footer.className = 'trig-search-footer';
            footer.innerHTML = `
                <button class="trig-search-btn trig-search-btn-secondary"
                        id="trig-search-restart-btn"
                        onclick="restartTriGSearch()"
                        disabled>Начать с начала</button>
                <button class="trig-search-btn trig-search-btn-primary"
                        id="trig-search-next-btn"
                        onclick="findNextInTriGTree()"
                        disabled>Найти следующего</button>
            `;

            // Собираем диалог
            dialog.appendChild(header);
            dialog.appendChild(body);
            dialog.appendChild(footer);
            overlay.appendChild(dialog);

            // Добавляем на страницу
            document.body.appendChild(overlay);

            // Устанавливаем фокус на поле ввода
            const input = document.getElementById('trig-search-input');
            input.focus();

            // Обработчик ввода текста
            input.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                const nextBtn = document.getElementById('trig-search-next-btn');
                const restartBtn = document.getElementById('trig-search-restart-btn');

                if (searchTerm.length > 0) {
                    nextBtn.disabled = false;
                    restartBtn.disabled = false;
                } else {
                    nextBtn.disabled = true;
                    restartBtn.disabled = true;
                    clearSearchResults();
                }
            });

            // Обработчик Enter для поиска
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    findNextInTriGTree();
                }
            });

            // Обработчик Escape для закрытия
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeTriGSearchDialog();
                }
            });
        }

        /**
         * Закрывает диалоговое окно поиска
         */
        function closeTriGSearchDialog() {
            const overlay = document.getElementById('trig-search-overlay');
            if (overlay) {
                overlay.remove();
            }
            clearSearchHighlight();
        }

        /**
         * Выполняет поиск следующего вхождения в дереве TriG
         */
        function findNextInTriGTree() {
            const input = document.getElementById('trig-search-input');
            const searchTerm = input ? input.value.trim().toLowerCase() : '';

            if (!searchTerm) {
                showSearchStatus('Введите текст для поиска', 'error');
                return;
            }

            // Если это новый поиск или изменился поисковый запрос
            if (searchState.searchTerm !== searchTerm) {
                searchState.searchTerm = searchTerm;
                searchState.results = findAllMatchingNodes(searchTerm);
                searchState.currentIndex = -1;
            }

            // Если нет результатов
            if (searchState.results.length === 0) {
                showSearchStatus('Ничего не найдено', 'error');
                clearSearchHighlight();
                return;
            }

            // Переходим к следующему результату
            searchState.currentIndex++;
            if (searchState.currentIndex >= searchState.results.length) {
                searchState.currentIndex = 0;
                showSearchStatus('Достигнут конец списка, начинаем с начала', 'info');
            }

            const currentResult = searchState.results[searchState.currentIndex];
            highlightAndScrollToNode(currentResult);

            // Обновляем статус
            const statusText = `Найдено: ${searchState.currentIndex + 1} из ${searchState.results.length}`;
            showSearchStatus(statusText, 'success');
        }

        /**
         * Начинает поиск с начала дерева
         */
        function restartTriGSearch() {
            const input = document.getElementById('trig-search-input');
            const searchTerm = input ? input.value.trim().toLowerCase() : '';

            if (!searchTerm) {
                showSearchStatus('Введите текст для поиска', 'error');
                return;
            }

            // Сбрасываем индекс и выполняем поиск с начала
            searchState.searchTerm = searchTerm;
            searchState.results = findAllMatchingNodes(searchTerm);
            searchState.currentIndex = -1;

            if (searchState.results.length === 0) {
                showSearchStatus('Ничего не найдено', 'error');
                clearSearchHighlight();
                return;
            }

            // Переходим к первому результату
            searchState.currentIndex = 0;
            const currentResult = searchState.results[searchState.currentIndex];
            highlightAndScrollToNode(currentResult);

            // Обновляем статус
            const statusText = `Найдено: ${searchState.currentIndex + 1} из ${searchState.results.length}`;
            showSearchStatus(statusText, 'success');
        }

        /**
         * Находит все узлы в дереве, соответствующие поисковому запросу
         * @param {string} searchTerm - Поисковый запрос (в нижнем регистре)
         * @returns {Array} - Массив элементов, соответствующих запросу
         */
        function findAllMatchingNodes(searchTerm) {
            const results = [];
            const treeItems = document.querySelectorAll('.trig-tree-item');

            treeItems.forEach(item => {
                // Пропускаем заголовки "Состав объектов"
                if (item.classList.contains('object-composition-header')) {
                    return;
                }

                // Получаем текстовое содержимое элемента
                const labelElement = item.querySelector('.trig-tree-label');
                const idElement = item.querySelector('.trig-tree-id');

                if (labelElement || idElement) {
                    const labelText = labelElement ? labelElement.textContent.toLowerCase() : '';
                    const idText = idElement ? idElement.textContent.toLowerCase() : '';
                    const combinedText = labelText + ' ' + idText;

                    if (combinedText.includes(searchTerm)) {
                        results.push(item);
                    }
                }
            });

            return results;
        }

        /**
         * Подсвечивает и прокручивает к указанному узлу дерева
         * @param {HTMLElement} node - Элемент узла дерева
         */
        function highlightAndScrollToNode(node) {
            // Очищаем предыдущую подсветку
            clearSearchHighlight();

            // Раскрываем все родительские узлы
            expandParentNodes(node);

            // Добавляем подсветку
            node.classList.add('search-highlight');

            // Прокручиваем к элементу
            const treeContent = document.getElementById('trig-tree-content');
            if (treeContent) {
                // Вычисляем позицию элемента относительно контейнера
                const nodeRect = node.getBoundingClientRect();
                const containerRect = treeContent.getBoundingClientRect();
                const scrollOffset = nodeRect.top - containerRect.top + treeContent.scrollTop - 50;

                treeContent.scrollTo({
                    top: scrollOffset,
                    behavior: 'smooth'
                });
            }
        }

        /**
         * Очищает подсветку поиска
         */
        function clearSearchHighlight() {
            const highlightedItems = document.querySelectorAll('.trig-tree-item.search-highlight');
            highlightedItems.forEach(item => {
                item.classList.remove('search-highlight');
            });
        }

        /**
         * Очищает результаты поиска
         */
        function clearSearchResults() {
            searchState = {
                searchTerm: '',
                results: [],
                currentIndex: -1,
                isSearchActive: false
            };
            clearSearchHighlight();
            showSearchStatus('', '');
        }

        /**
         * Показывает статус поиска
         * @param {string} message - Сообщение для отображения
         * @param {string} type - Тип сообщения ('success', 'error', 'info')
         */
        function showSearchStatus(message, type) {
            const statusElement = document.getElementById('trig-search-status');
            if (!statusElement) return;

            statusElement.textContent = message;
            statusElement.className = 'trig-search-status';

            if (type && message) {
                statusElement.classList.add(type);
            }
        }

