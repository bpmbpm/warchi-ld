// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/232
// 7_info_ui.js - UI модуль панели Info (отображение префиксов)

        function displayPrefixes(prefixes) {
            const prefixesPanel = document.getElementById('prefixes-panel');
            const prefixesContent = document.getElementById('prefixes-content');

            const prefixEntries = Object.entries(prefixes);
            if (prefixEntries.length === 0) {
                prefixesPanel.style.display = 'none';
                return;
            }

            prefixEntries.sort((a, b) => a[0].localeCompare(b[0]));

            let html = '';
            for (const [prefix, namespace] of prefixEntries) {
                html += `<div class="prefix-line">`;
                html += `<span class="prefix-name">@prefix ${prefix}:</span> `;
                html += `<a href="${namespace}" class="prefix-url" target="_blank">&lt;${namespace}&gt;</a> .`;
                html += `</div>`;
            }

            prefixesContent.innerHTML = html;
            prefixesPanel.style.display = 'block';
        }

