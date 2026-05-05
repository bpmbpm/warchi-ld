### programming information
Это памятка к программированию по проекту warchi-ld. Папка проекта: https://github.com/bpmbpm/warchi-ld/tree/main/ver1   
Можно изменять только эту и вложенные в нее папку.  
Комментарии в коде и файлы md создавай на русском языке.  

#### js
- только браузерный js (node.js не используем)
- развертывание (запуск) как на https://bpmbpm.github.io (другом статическом web - server), так и локально. 
#### programming concept
- Максимальное использование в коде SPARQL-запросов, см. [SPARQL-driven Programming Guide](https://github.com/bpmbpm/warchi-ld/blob/main/ver1/requirements/sparql-driven-programming_min1.md). При необходимости создавай собственные функции на основе SPARQL-запросов. 
- Формирование наборов SPARQL-запросов в отдельных файлах *sparql.js
- периодически в promt добавлять: Напоминаю о приоритете SPARQL-driven Programming (Программирование на основе SPARQL).
  
### Ontology 
- [Basic VAD Ontology - Базовая онтология верхнеуровневых процессов](https://github.com/bpmbpm/warchi-ld/blob/main/ver1/ontology/vad-basic-ontology.trig) 
- Технологическая часть онтологии [Tech Appendix - Технологические классы и объекты](https://github.com/bpmbpm/warchi-ld/blob/main/ver1/ontology/vad-basic-ontology_tech_Appendix.trig) (ранее .ttl)
- [Терминологический словарь (Terminology Dictionary)](https://github.com/bpmbpm/warchi-ld/blob/main/ver1/ontology/term.md), например,  ptree - это хранилище концептов процесса, а индивиды процесса хранятся в TriG типа VADProcessDia.
#### Наименования obj & predicate
- имена классов / подклассов / типов : пишутся в формате UpperCamelCase (как в Java), а имена предикатов - в формате lowerCamelCase. 
 
### LD requirements 
- triple (requirements for the implementation of triplets)
  - Должны поддерживаться оба формата записи триплета - в Simple Triple (простая, полная) и в Shorthand Triple форме (сокращенная, составная).
  - Используй запись с префиксом (@prefix)
  - вместо "a" используй полную запись предиката rdf:type 
- используй quadstore in-memory для хранения TriG 

### File naming conventions
Используй Соглашение по именованию файлов https://github.com/bpmbpm/warchi-ld/blob/main/ver1/requirements/file_naming.md
