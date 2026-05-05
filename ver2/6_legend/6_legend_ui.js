// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/232
// 6_legend_ui.js - UI модуль панели Legend (легенда стилей)

        // ============================================================================
        // КОНФИГУРАЦИЯ СТИЛЕЙ
        // ============================================================================

        const StyleName = {
            nodeStyles: {
                'PersonStyle': {
                    types: ['foaf:Person', 'schema:Person', 'http://xmlns.com/foaf/0.1/Person'],
                    dot: 'shape="octagon" height="0.75" width="0.75" fixedsize="true" color="#9C27B0" fillcolor="#F3E5F5" fontname="Arial" fontsize="10" style="filled"',
                    label: 'Люди (foaf:Person)',
                    description: 'Объекты типа foaf:Person или schema:Person'
                },
                'OrganizationStyle': {
                    types: ['foaf:Organization', 'schema:Organization', 'http://xmlns.com/foaf/0.1/Organization'],
                    dot: 'shape="box" height="0.6" width="1.2" color="Blue" fillcolor="#E6F3FF" fontname="Arial" fontsize="10" style="filled,bold"',
                    label: 'Организации (foaf:Organization)',
                    description: 'Объекты типа foaf:Organization'
                },
                'DocumentStyle': {
                    types: ['foaf:Document', 'schema:Document', 'http://xmlns.com/foaf/0.1/Document'],
                    dot: 'shape="note" height="0.6" width="1.0" color="Green" fillcolor="#E8F5E9" fontname="Arial" fontsize="10" style="filled"',
                    label: 'Документы (foaf:Document)',
                    description: 'Объекты типа foaf:Document'
                },
                'LiteralStyle': {
                    types: ['_Literal'],
                    dot: 'shape="box" color="#666666" fillcolor="#FFFFCC" fontname="Arial" fontsize="9" style="filled,rounded"',
                    label: 'Литералы (Literal)',
                    description: 'Строковые значения, числа, даты'
                },
                'BlankNodeStyle': {
                    types: ['_BlankNode'],
                    dot: 'shape="ellipse" color="#999999" fillcolor="#E0E0E0" fontname="Arial" fontsize="9" style="filled,dashed"',
                    label: 'Пустые узлы (BlankNode)',
                    description: 'Анонимные узлы без URI'
                },
                'default': {
                    types: [],
                    dot: 'shape="ellipse" color="#1976D2" fillcolor="#CCE5FF" fontname="Arial" fontsize="10" style="filled"',
                    label: 'По умолчанию (URI)',
                    description: 'Все остальные URI-ресурсы'
                }
            },
            edgeStyles: {
                'TypeStyle': {
                    predicates: ['rdf:type', 'a', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'],
                    dot: 'color="#9C27B0" penwidth="2" style="dashed" arrowhead="empty"',
                    label: 'Тип объекта (rdf:type)',
                    description: 'Связь объекта с его RDF-типом'
                },
                'KnowsStyle': {
                    predicates: ['foaf:knows', 'http://xmlns.com/foaf/0.1/knows'],
                    dot: 'color="#4CAF50" penwidth="2" style="solid" arrowhead="vee"',
                    label: 'Знает (foaf:knows)',
                    description: 'Социальная связь между людьми'
                },
                'MemberStyle': {
                    predicates: ['foaf:member', 'schema:member', 'http://xmlns.com/foaf/0.1/member'],
                    dot: 'color="#795548" penwidth="2" style="solid" arrowhead="diamond"',
                    label: 'Член (foaf:member)',
                    description: 'Членство в организации'
                },
                'AttributeStyle': {
                    predicates: [
                        'foaf:name', 'http://xmlns.com/foaf/0.1/name',
                        'foaf:age', 'http://xmlns.com/foaf/0.1/age',
                        'rdfs:label', 'http://www.w3.org/2000/01/rdf-schema#label',
                        'rdfs:comment', 'http://www.w3.org/2000/01/rdf-schema#comment'
                    ],
                    dot: 'color="#2196F3" penwidth="1" style="dotted" arrowhead="normal"',
                    label: 'Атрибуты (name, label...)',
                    description: 'Свойства объекта: имя, возраст и др.'
                },
                'default': {
                    predicates: [],
                    dot: 'color="#666666" penwidth="1" style="solid" arrowhead="normal"',
                    label: 'По умолчанию',
                    description: 'Все остальные предикаты'
                }
            }
        };

        // ============================================================================
        // СТИЛИ VAD (Value Added Chain Diagram)
        // ============================================================================

        const VADNodeStyles = {
            // =====================================================
            // Детализированные процессы (имеют vad:hasTrig в ptree)
            // =====================================================
            'ProcessStyleDetailedChild': {
                types: ['vad:TypeProcess', 'http://example.org/vad#TypeProcess'],
                subtypes: ['vad:DetailedChild', 'http://example.org/vad#DetailedChild'],
                // cds shape (chevron) с голубой заливкой для детализированного подпроцесса
                dot: 'shape="cds" height="0.8" width="1.5" color="#1565C0" fillcolor="#90CAF9" fontname="Arial" fontsize="11" style="filled"',
                label: 'Детализ. подпроцесс (DetailedChild)',
                description: 'Детализированный подпроцесс (в схеме родителя)'
            },
            'ProcessStyleDetailedExternal': {
                types: ['vad:TypeProcess', 'http://example.org/vad#TypeProcess'],
                subtypes: ['vad:DetailedExternal', 'http://example.org/vad#DetailedExternal'],
                // cds shape (chevron) с синей заливкой для внешнего детализированного
                dot: 'shape="cds" height="0.8" width="1.5" color="#0D47A1" fillcolor="#64B5F6" fontname="Arial" fontsize="11" style="filled"',
                label: 'Детализ. внешний (DetailedExternal)',
                description: 'Детализированный внешний процесс (из другой схемы)'
            },
            // =====================================================
            // Не детализированные процессы (НЕ имеют vad:hasTrig в ptree)
            // =====================================================
            'ProcessStyleNotDetailedChild': {
                types: ['vad:TypeProcess', 'http://example.org/vad#TypeProcess'],
                subtypes: ['vad:notDetailedChild', 'http://example.org/vad#notDetailedChild'],
                // cds shape (chevron) с зелёной заливкой для не детализированного подпроцесса
                dot: 'shape="cds" height="0.8" width="1.5" color="#2E7D32" fillcolor="#A5D6A7" fontname="Arial" fontsize="11" style="filled"',
                label: 'Не детализ. подпроцесс (notDetailedChild)',
                description: 'Не детализированный подпроцесс (в схеме родителя)'
            },
            'ProcessStyleNotDetailedExternal': {
                types: ['vad:TypeProcess', 'http://example.org/vad#TypeProcess'],
                subtypes: ['vad:notDetailedExternal', 'http://example.org/vad#notDetailedExternal'],
                // cds shape (chevron) с светло-зелёной заливкой для внешнего не детализированного
                dot: 'shape="cds" height="0.8" width="1.5" color="#1B5E20" fillcolor="#C8E6C9" fontname="Arial" fontsize="11" style="filled"',
                label: 'Не детализ. внешний (notDetailedExternal)',
                description: 'Не детализированный внешний процесс (из другой схемы)'
            },
            // =====================================================
            // Специальный тип для процессов с pNotDefined
            // =====================================================
            'ProcessStyleNotDefinedType': {
                types: ['vad:TypeProcess', 'http://example.org/vad#TypeProcess'],
                subtypes: ['vad:NotDefinedType', 'http://example.org/vad#NotDefinedType'],
                // cds shape (chevron) с серой заливкой для неопределённого типа
                dot: 'shape="cds" height="0.8" width="1.5" color="#616161" fillcolor="#BDBDBD" fontname="Arial" fontsize="11" style="filled,dashed"',
                label: 'Неопред. родитель (NotDefinedType)',
                description: 'Процесс с неопределённым родителем (hasParentObj = pNotDefined)'
            },
            // =====================================================
            // Промежуточные типы (НЕ отображаются в легенде)
            // Это базовые классы, не имеющие собственного визуального стиля.
            // Визуальные стили применяются только к подтипам выше.
            // =====================================================
            'ProcessStyleDetailed': {
                types: ['vad:TypeProcess', 'http://example.org/vad#TypeProcess'],
                subtypes: ['vad:Detailed', 'http://example.org/vad#Detailed'],
                // cds shape (chevron) с голубой заливкой для детализированного типа
                dot: 'shape="cds" height="0.8" width="1.5" color="#1565C0" fillcolor="#90CAF9" fontname="Arial" fontsize="11" style="filled"',
                label: 'Детализированный (Detailed)',
                description: 'Детализированный бизнес-процесс (общий)',
                hideFromLegend: true  // Промежуточный тип - не показывать в легенде
            },
            'ProcessStyleNotDetailed': {
                types: ['vad:TypeProcess', 'http://example.org/vad#TypeProcess'],
                subtypes: ['vad:notDetailed', 'http://example.org/vad#notDetailed'],
                // cds shape (chevron) с зелёной заливкой для не детализированного типа
                dot: 'shape="cds" height="0.8" width="1.5" color="#2E7D32" fillcolor="#A5D6A7" fontname="Arial" fontsize="11" style="filled"',
                label: 'Не детализированный (notDetailed)',
                description: 'Не детализированный бизнес-процесс (общий)',
                hideFromLegend: true  // Промежуточный тип - не показывать в легенде
            },
            // =====================================================
            // Другие типы узлов
            // =====================================================
            'ExecutorGroupStyle': {
                types: ['vad:ExecutorGroup', 'http://example.org/vad#ExecutorGroup'],
                dot: 'shape="ellipse" color="#B8860B" fillcolor="#FFFFCC" fontname="Arial" fontsize="9" style="filled"',
                label: 'Группа исполнителей (ExecutorGroup)',
                description: 'Группа исполнителей процесса (эллипс с желтоватой заливкой)'
            },
            'ExecutorStyle': {
                types: ['vad:TypeExecutor', 'http://example.org/vad#TypeExecutor'],
                dot: 'shape="ellipse" height="0.4" width="0.8" color="#6A1B9A" fillcolor="#E1BEE7" fontname="Arial" fontsize="9" style="filled"',
                label: 'Исполнитель (TypeExecutor)',
                description: 'Исполнитель процесса'
            },
            'default': {
                types: [],
                dot: 'shape="ellipse" color="#1976D2" fillcolor="#CCE5FF" fontname="Arial" fontsize="10" style="filled"',
                label: 'По умолчанию',
                description: 'Другие объекты'
            }
        };

        const VADEdgeStyles = {
            'HasNextStyle': {
                predicates: ['vad:hasNext', 'http://example.org/vad#hasNext'],
                // Зелёная стрелка для связей между процессами
                dot: 'color="#2E7D32" penwidth="2" style="solid" arrowhead="vee"',
                label: 'Следующий (vad:hasNext)',
                description: 'Связь с следующим процессом'
            },
            'HasExecutorStyle': {
                predicates: ['vad:hasExecutor', 'http://example.org/vad#hasExecutor'],
                dot: 'color="#1565C0" penwidth="1" style="dashed" arrowhead="none"',
                label: 'Исполнитель (vad:hasExecutor)',
                description: 'Связь процесса с группой исполнителей (ненаправленная)'
            },
            'IncludesStyle': {
                predicates: ['vad:includes', 'http://example.org/vad#includes'],
                dot: 'color="#6A1B9A" penwidth="1" style="dotted" arrowhead="normal"',
                label: 'Включает (vad:includes)',
                description: 'Связь группы с исполнителями'
            },
            'HasParentStyle': {
                predicates: ['vad:hasParentObj', 'http://example.org/vad#hasParentObj'],
                dot: 'color="#999999" penwidth="1" style="dashed" arrowhead="empty"',
                label: 'Родитель (vad:hasParentObj)',
                description: 'Связь с родительским объектом'
            },
            'TypeStyle': {
                predicates: ['rdf:type', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'],
                dot: 'color="#9C27B0" penwidth="1" style="dashed" arrowhead="empty"',
                label: 'Тип (rdf:type)',
                description: 'Тип объекта'
            },
            'default': {
                predicates: [],
                dot: 'color="#666666" penwidth="1" style="solid" arrowhead="normal"',
                label: 'По умолчанию',
                description: 'Другие связи'
            }
        };

        const AggregationNodeStyles = {
            'PersonStyle': {
                types: ['foaf:Person', 'schema:Person', 'http://xmlns.com/foaf/0.1/Person'],
                dot: 'shape="ellipse" color="#9C27B0" penwidth="2" fillcolor="#F3E5F5" fontname="Arial" fontsize="10" style="filled"',
                label: 'Люди (foaf:Person)',
                description: 'Объекты типа foaf:Person'
            },
            'OrganizationStyle': {
                types: ['foaf:Organization', 'schema:Organization', 'http://xmlns.com/foaf/0.1/Organization'],
                dot: 'shape="ellipse" color="Blue" penwidth="3" fillcolor="#E3F2FD" fontname="Arial" fontsize="10" style="filled"',
                label: 'Организации (foaf:Organization)',
                description: 'Объекты типа foaf:Organization'
            },
            'DocumentStyle': {
                types: ['foaf:Document', 'schema:Document', 'http://xmlns.com/foaf/0.1/Document'],
                dot: 'shape="ellipse" color="Green" penwidth="2" fillcolor="#E8F5E9" fontname="Arial" fontsize="10" style="filled"',
                label: 'Документы (foaf:Document)',
                description: 'Объекты типа foaf:Document'
            },
            'BlankNodeStyle': {
                types: ['_BlankNode'],
                dot: 'shape="ellipse" color="#999999" penwidth="1" fillcolor="#E0E0E0" fontname="Arial" fontsize="9" style="filled,dashed"',
                label: 'Пустые узлы (BlankNode)',
                description: 'Анонимные узлы без URI'
            },
            'default': {
                types: [],
                dot: 'shape="ellipse" color="#1976D2" penwidth="1" fillcolor="#CCE5FF" fontname="Arial" fontsize="10" style="filled"',
                label: 'По умолчанию (URI)',
                description: 'Все остальные URI-ресурсы'
            }
        };

        // ============================================================================
        // ФУНКЦИЯ ОТОБРАЖЕНИЯ ЛЕГЕНДЫ
        // ============================================================================

        function displayLegend() {
            const legendPanel = document.getElementById('legend-panel');
            const legendContent = document.getElementById('legend-content');

            let html = '';

            // Используем только VAD стили (режим VAD TriG)
            let nodeStylesSource, edgeStylesSource;
            nodeStylesSource = VADNodeStyles;
            edgeStylesSource = VADEdgeStyles;

            html += '<div class="legend-section">';
            html += '<h4>Стили узлов (Node Styles)</h4>';

            for (const [styleName, styleConfig] of Object.entries(nodeStylesSource)) {
                // Пропускаем стили, помеченные как скрытые из легенды
                // (промежуточные типы: Detailed, notDetailed)
                if (styleConfig.hideFromLegend) {
                    continue;
                }

                const fillColorMatch = styleConfig.dot.match(/fillcolor="([^"]+)"/);
                const borderColorMatch = styleConfig.dot.match(/color="([^"]+)"/);
                const shapeMatch = styleConfig.dot.match(/shape="([^"]+)"/);

                const fillColor = fillColorMatch ? fillColorMatch[1] : '#ffffff';
                const borderColor = borderColorMatch ? borderColorMatch[1] : '#000000';
                const shape = shapeMatch ? shapeMatch[1] : 'ellipse';

                let shapeStyle = '';
                if (shape === 'box' || shape === 'note') {
                    shapeStyle = 'border-radius: 0;';
                } else if (shape === 'octagon') {
                    shapeStyle = 'border-radius: 0; clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);';
                } else if (shape === 'cds') {
                    shapeStyle = 'border-radius: 0; clip-path: polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%, 15% 50%);';
                } else {
                    shapeStyle = 'border-radius: 50%;';
                }

                html += `<div class="legend-item">`;
                html += `<div class="legend-shape" style="background-color: ${fillColor}; border-color: ${borderColor}; ${shapeStyle}"></div>`;
                html += `<span class="legend-label">${styleConfig.label}</span>`;
                html += `</div>`;
            }

            html += '</div>';

            html += '<div class="legend-section">';
            html += '<h4>Стили ребер (Edge Styles)</h4>';

            for (const [styleName, styleConfig] of Object.entries(edgeStylesSource)) {
                const colorMatch = styleConfig.dot.match(/color="([^"]+)"/);
                const penwidthMatch = styleConfig.dot.match(/penwidth="([^"]+)"/);
                const lineStyleMatch = styleConfig.dot.match(/style="([^"]+)"/);

                const color = colorMatch ? colorMatch[1] : '#666666';
                const penwidth = penwidthMatch ? parseInt(penwidthMatch[1]) : 1;
                const lineStyle = lineStyleMatch ? lineStyleMatch[1] : 'solid';

                let borderStyle = 'solid';
                if (lineStyle === 'dashed') borderStyle = 'dashed';
                if (lineStyle === 'dotted') borderStyle = 'dotted';

                html += `<div class="legend-item">`;
                html += `<span class="legend-line" style="background-color: ${color}; height: ${penwidth + 1}px; border-bottom: ${penwidth}px ${borderStyle} ${color}; background: none;"></span>`;
                html += `<span class="legend-label">${styleConfig.label}</span>`;
                html += `</div>`;
            }

            html += '</div>';

            if (legendContent) legendContent.innerHTML = html;
            if (legendPanel) legendPanel.style.display = 'block';
        }

