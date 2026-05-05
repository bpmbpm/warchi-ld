# Custom нотация в warchi-ld

## Механизм добавления собственной нотации

warchi-ld поддерживает добавление custom нотаций через расширение онтологии VAD.

### Шаги добавления custom нотации

1. **Создать файл онтологии** в формате TriG, например `ontology/custom-mynotation.trig`:

```turtle
@prefix rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:   <http://www.w3.org/2002/07/owl#> .
@prefix vad:   <http://example.org/vad#> .
@prefix mynt:  <http://example.org/mynotation#> .

mynt:CustomOntology {
    mynt:CustomProcess
        rdf:type rdfs:Class, owl:Class ;
        rdfs:subClassOf vad:Process ;
        rdfs:label "Custom Process" .
    
    mynt:CustomShape
        rdf:type rdfs:Class, owl:Class ;
        rdfs:subClassOf vad:ColorVadShape ;
        rdfs:label "CustomShape" .
}
```

2. **Загрузить файл** через кнопку «Загрузить» в панели quadstore.

3. **Зарегистрировать визуальный стиль** (опционально) в `6_legend/6_legend_ui.js` в объекте `VADNodeStyles`.

4. **Добавить нотацию в меню** через пункт «Нотация → Custom нотация_».

### Новые элементы UI (Custom)

Согласно требованию issue #1 п.3: новые элементы UI, добавляемые в дополнение к warchi.ru, имеют символ `_` в конце названия кнопок/вкладок.

### Примеры custom нотаций

- Дополнительные типы процессов (например, автоматизированный, ручной)
- Новые типы исполнителей (система, внешняя организация)
- Специфические предикаты связи между процессами
