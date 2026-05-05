// Ссылка на issue: https://github.com/bpmbpm/rdf-grapher/issues/232
// 1_example_data_logic.js - Встроенные данные примеров RDF

/**
 * ==============================================================================
 * EXAMPLE DATA MODULE
 * ==============================================================================
 *
 * Embedded example RDF data for TriG VADv5 and VADv6 formats.
 * Contains demonstration data for Value Added Chain Diagrams with TriG hierarchy.
 *
 * @file example-data.js
 * @version 1.0
 * @date 2026-01-29
 */

const EXAMPLE_DATA = {
    // TriG VADv5 example with object hierarchy via hasParentObj
    'trig-vad-v5': `# Пример TriG VADv5 (Value Added Chain Diagram с иерархией TriG)
# Демонстрация иерархии TriG графов через hasParentObj
# Исполнители определены в vad:rtree (Дерево Исполнителей)
#

@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix vad: <http://example.org/vad#> .


vad:root {
    vad:root rdf:type vad:TechTree ;
    rdfs:label "Корень Дерева" .
}

# ============================================================================
# Дерево Процессов (ptree) - общий граф с метаданными всех процессов
# ============================================================================

vad:ptree {
    vad:ptree rdf:type vad:ObjectTree ;
        rdfs:label "Дерево Процессов (TriG)" ;
        vad:hasParentObj vad:root .

    vad:p1 rdf:type vad:TypeProcess ;
        rdfs:label "p1 Процесс 1" ;
        dcterms:description "p1 Процесс 1" ;
        vad:hasParentObj vad:ptree ;
        vad:hasTrig vad:t_p1 .

    vad:p1.1 rdf:type vad:TypeProcess ;
        rdfs:label "p1.1 Процесс 1.1" ;
        dcterms:description "Первый процесс в цепочке добавленной стоимости" ;
        vad:hasParentObj vad:p1 ;
        vad:hasTrig vad:t_p1.1 .

    vad:p1.2 rdf:type vad:TypeProcess ;
        rdfs:label "Процесс 1.2" ;
        dcterms:description "Второй процесс, выполняется после Процесса 1" ;
         vad:hasParentObj vad:p1 .

    # p1.1.1
    vad:p1.1.1 rdf:type vad:TypeProcess ;
        rdfs:label "p1.1.1 Процесс 1.1.1" ;
        dcterms:description "Первый процесс в цепочке добавленной стоимости" ;
        vad:hasParentObj vad:p1.1 .

    vad:p1.1.2 rdf:type vad:TypeProcess ;
        rdfs:label "p1.1.2 Процесс 1.1.2" ;
        dcterms:description "Второй процесс в цепочке добавленной стоимости" ;
        vad:hasParentObj vad:p1.1 .

    vad:p2 rdf:type vad:TypeProcess ;
        rdfs:label "p2 Процесс 2" ;
        dcterms:description "p2 Процесс 2" ;
        vad:hasParentObj vad:ptree ;
        vad:hasTrig vad:t_p2 .

    vad:p2.1 rdf:type vad:TypeProcess ;
        rdfs:label "p2.1 Процесс 2.1" ;
        dcterms:description "Первый процесс в цепочке добавленной стоимости" ;
        vad:hasParentObj vad:p2 .

    vad:p2.2 rdf:type vad:TypeProcess ;
        rdfs:label "p2.2 Процесс 2.2" ;
        dcterms:description "Второй процесс" ;
        vad:hasParentObj vad:p2 .

   vad:pх.х rdf:type vad:TypeProcess ;
        rdfs:label "pх.х Процесс х.х" ;
        dcterms:description "Какой-то процесс" ;
        vad:hasParentObj vad:pNotDefined .

   vad:pNotDefined rdf:type vad:TypeProcess ;
        rdfs:label "pNotDefined Процесс" ;
        dcterms:description "Какой-то процесс" ;
        vad:hasParentObj vad:ptree .

}

# ============================================================================
# Дерево Исполнителей (rtree) - общий граф с метаданными всех исполнителей
# Содержит rdf:type, rdfs:label для всех vad:Executor
# ============================================================================

vad:rtree {
    vad:rtree rdf:type vad:ObjectTree ;
        rdfs:label "Дерево Исполнителей (TriG)" ;
        vad:hasParentObj vad:root .

    vad:Org-structure rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель Org-structure" ;
        vad:hasParentObj vad:rtree .

    # Исполнители
    vad:Executor1 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 1" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor2 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 2" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor3 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 3" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor4 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 4" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor5 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 5" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor6 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 6" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor7 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 7" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor8 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 8" ;
        vad:hasParentObj vad:Org-structure .

    # Исполнители
    vad:Executor21 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 21" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor22 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 22" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor23 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 23" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor24 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 24" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor25 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 25" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor26 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 26" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor27 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 27" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor28 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 28" ;
        vad:hasParentObj vad:Org-structure .
}

# ============================================================================
# Корневой TriG граф: t_p1 (hasParentObj = p1)
# ============================================================================

vad:t_p1 {
    vad:t_p1 rdf:type vad:VADProcessDia ;
        rdfs:label "Схема t_p1 процесса p1" ;
        vad:hasParentObj vad:p1 .

    # Процесс p1.1 - DetailedChild (имеет дочернюю схему vad:t_p1.1)
    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:p1.1 vad:isSubprocessTrig vad:t_p1 ;
        vad:hasExecutor vad:ExecutorGroup_p1.1 ;
        vad:hasNext vad:p1.2 .

    # Процесс p1.2 - notDetailedChild
    vad:p1.2 vad:isSubprocessTrig vad:t_p1 ;
        vad:hasExecutor vad:ExecutorGroup_p1.2 .

    # Группы исполнителей (ID формируется как ExecutorGroup_ + ID процесса)
    vad:ExecutorGroup_p1.1 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.1" ;
        vad:includes vad:Executor1 .

    vad:ExecutorGroup_p1.2 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.2" ;
        vad:includes vad:Executor1, vad:Executor2 .

    # Примечание: Исполнители (vad:Executor1..8) определены в vad:rtree
}

# ============================================================================
# Дочерний TriG граф: t_p1.1 (hasParentObj = p1.1)
# Это детализация процесса p1.1 из родительского графа t_p1
# ============================================================================

vad:t_p1.1 {
    vad:t_p1.1 rdf:type vad:VADProcessDia ;
        rdfs:label "Схема t_p1.1 процесса p1.1" ;
        vad:hasParentObj vad:p1.1 .

    # Процесс p1.1.1 - notDetailedChild
    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:p1.1.1 vad:isSubprocessTrig vad:t_p1.1 ;
        vad:hasExecutor vad:ExecutorGroup_p1.1.1 ;
        vad:hasNext vad:p1.1.2 .

    # Процесс p1.1.2 - notDetailedExternal (hasParentProcess = p2, не совпадает с p1.1)
    vad:p1.1.2 vad:isSubprocessTrig vad:t_p1.1 ;
        vad:hasExecutor vad:ExecutorGroup_p1.1.2 .

    # Группы исполнителей (ID формируется как ExecutorGroup_ + ID процесса)
    vad:ExecutorGroup_p1.1.1 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.1.1" ;
        vad:includes vad:Executor21 .

    vad:ExecutorGroup_p1.1.2 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.1.2" ;
        vad:includes vad:Executor21, vad:Executor22 .
}

# ============================================================================
# Корневой TriG граф: t_p2 (hasParentObj = p2)
# ============================================================================

vad:t_p2 {
    vad:t_p2 rdf:type vad:VADProcessDia ;
        rdfs:label "Схема t_p2 процесса p2" ;
        vad:hasParentObj vad:p2 .

    # Процесс p2.1 - notDetailedChild
    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:p2.1 vad:isSubprocessTrig vad:t_p2 ;
        vad:hasExecutor vad:ExecutorGroup_p2.1 ;
        vad:hasNext vad:p2.2, vad:p1.1 .

    # Процесс p2.2
    vad:p2.2 vad:isSubprocessTrig vad:t_p2 ;
        vad:hasExecutor vad:ExecutorGroup_p2.2 .

    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:p1.1 vad:isSubprocessTrig vad:t_p2 ;
        vad:hasExecutor vad:ExecutorGroup_p1.1 ;
        vad:hasNext vad:p1.1.1 .

## vad:p1.1 в vad:t_p2 должен быть показан как детализируемый внешний
## vad:p1.1.1 в vad:t_p2 должен быть показан как НЕдетализируемый внешний
## vad:pх.х  в vad:t_p2 должен быть показан как pNotDefined

    # Процесс p1.1.1 - notDetailedChild
    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:p1.1.1 vad:isSubprocessTrig vad:t_p2 ;
        vad:hasExecutor vad:ExecutorGroup_p1.1.1 ;
        vad:hasNext vad:pх.х .

    # Процесс pх.х
    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:pх.х vad:isSubprocessTrig vad:t_p2 ;
        vad:hasExecutor vad:ExecutorGroup_pх.х .

    # Группы исполнителей (ID формируется как ExecutorGroup_ + ID процесса)

    vad:ExecutorGroup_p2.1 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p2.1" ;
        vad:includes vad:Executor1 .

    vad:ExecutorGroup_p2.2 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p2.2" ;
        vad:includes vad:Executor1, vad:Executor2 .

## vad:p1.1 в vad:t_p2
    vad:ExecutorGroup_p1.1 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.1" ;
        vad:includes vad:Executor1, vad:Executor2 .

## vad:p1.1.1 в vad:t_p2
    vad:ExecutorGroup_p1.1.1 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.1.1" ;
        vad:includes vad:Executor1, vad:Executor2 .

## pх.х в vad:t_p2
    vad:ExecutorGroup_pх.х rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса pх.х" ;
        vad:includes vad:Executor1, vad:Executor2 .

}

`,
    // Issue #219 Fix #5: TriG VADv6 example with additional pDel block for deletion testing
    'trig-vad-v6': `# Пример TriG VADv6 (Value Added Chain Diagram с иерархией TriG)
# Демонстрация иерархии TriG графов через hasParentObj
# Исполнители определены в vad:rtree (Дерево Исполнителей)
# Issue #219: Добавлен vad:pDel для тестирования удаления концепта
#

@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix vad: <http://example.org/vad#> .


vad:root {
    vad:root rdf:type vad:TechTree ;
    rdfs:label "Корень Дерева" .
}

# ============================================================================
# Дерево Процессов (ptree) - общий граф с метаданными всех процессов
# ============================================================================

vad:ptree {
    vad:ptree rdf:type vad:ObjectTree ;
        rdfs:label "Дерево Процессов (TriG)" ;
        vad:hasParentObj vad:root .

    vad:p1 rdf:type vad:TypeProcess ;
        rdfs:label "p1 Процесс 1" ;
        dcterms:description "p1 Процесс 1" ;
        vad:hasParentObj vad:ptree ;
        vad:hasTrig vad:t_p1 .

    vad:p1.1 rdf:type vad:TypeProcess ;
        rdfs:label "p1.1 Процесс 1.1" ;
        dcterms:description "Первый процесс в цепочке добавленной стоимости" ;
        vad:hasParentObj vad:p1 ;
        vad:hasTrig vad:t_p1.1 .

    vad:p1.2 rdf:type vad:TypeProcess ;
        rdfs:label "Процесс 1.2" ;
        dcterms:description "Второй процесс, выполняется после Процесса 1" ;
         vad:hasParentObj vad:p1 .

    # p1.1.1
    vad:p1.1.1 rdf:type vad:TypeProcess ;
        rdfs:label "p1.1.1 Процесс 1.1.1" ;
        dcterms:description "Первый процесс в цепочке добавленной стоимости" ;
        vad:hasParentObj vad:p1.1 .

    vad:p1.1.2 rdf:type vad:TypeProcess ;
        rdfs:label "p1.1.2 Процесс 1.1.2" ;
        dcterms:description "Второй процесс в цепочке добавленной стоимости" ;
        vad:hasParentObj vad:p1.1 .

    vad:p2 rdf:type vad:TypeProcess ;
        rdfs:label "p2 Процесс 2" ;
        dcterms:description "p2 Процесс 2" ;
        vad:hasParentObj vad:ptree ;
        vad:hasTrig vad:t_p2 .

    vad:p2.1 rdf:type vad:TypeProcess ;
        rdfs:label "p2.1 Процесс 2.1" ;
        dcterms:description "Первый процесс в цепочке добавленной стоимости" ;
        vad:hasParentObj vad:p2 .

    vad:p2.2 rdf:type vad:TypeProcess ;
        rdfs:label "p2.2 Процесс 2.2" ;
        dcterms:description "Второй процесс" ;
        vad:hasParentObj vad:p2 .

   vad:pх.х rdf:type vad:TypeProcess ;
        rdfs:label "pх.х Процесс х.х" ;
        dcterms:description "Какой-то процесс" ;
        vad:hasParentObj vad:pNotDefined .

   vad:pNotDefined rdf:type vad:TypeProcess ;
        rdfs:label "pNotDefined Процесс" ;
        dcterms:description "Какой-то процесс" ;
        vad:hasParentObj vad:ptree .

    # Issue #219: Концепт для тестирования удаления
    vad:pDel rdf:type vad:TypeProcess ;
        rdfs:label "Процесс pDel на удаление" ;
        dcterms:description "Какой-то процесс" ;
        vad:hasParentObj vad:ptree .

}

# ============================================================================
# Дерево Исполнителей (rtree) - общий граф с метаданными всех исполнителей
# Содержит rdf:type, rdfs:label для всех vad:Executor
# ============================================================================

vad:rtree {
    vad:rtree rdf:type vad:ObjectTree ;
        rdfs:label "Дерево Исполнителей (TriG)" ;
        vad:hasParentObj vad:root .

    vad:Org-structure rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель Org-structure" ;
        vad:hasParentObj vad:rtree .

    # Исполнители
    vad:Executor1 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 1" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor2 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 2" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor3 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 3" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor4 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 4" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor5 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 5" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor6 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 6" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor7 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 7" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor8 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 8" ;
        vad:hasParentObj vad:Org-structure .

    # Исполнители
    vad:Executor21 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 21" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor22 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 22" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor23 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 23" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor24 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 24" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor25 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 25" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor26 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 26" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor27 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 27" ;
        vad:hasParentObj vad:Org-structure .

    vad:Executor28 rdf:type vad:TypeExecutor ;
        rdfs:label "Исполнитель 28" ;
        vad:hasParentObj vad:Org-structure .
}

# ============================================================================
# Корневой TriG граф: t_p1 (hasParentObj = p1)
# ============================================================================

vad:t_p1 {
    vad:t_p1 rdf:type vad:VADProcessDia ;
        rdfs:label "Схема t_p1 процесса p1" ;
        vad:hasParentObj vad:p1 .

    # Процесс p1.1 - DetailedChild (имеет дочернюю схему vad:t_p1.1)
    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:p1.1 vad:isSubprocessTrig vad:t_p1 ;
        vad:hasExecutor vad:ExecutorGroup_p1.1 ;
        vad:hasNext vad:p1.2 .

    # Процесс p1.2 - notDetailedChild
    vad:p1.2 vad:isSubprocessTrig vad:t_p1 ;
        vad:hasExecutor vad:ExecutorGroup_p1.2 .

    # Группы исполнителей (ID формируется как ExecutorGroup_ + ID процесса)
    vad:ExecutorGroup_p1.1 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.1" ;
        vad:includes vad:Executor1 .

    vad:ExecutorGroup_p1.2 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.2" ;
        vad:includes vad:Executor1, vad:Executor2 .

    # Примечание: Исполнители (vad:Executor1..8) определены в vad:rtree
}

# ============================================================================
# Дочерний TriG граф: t_p1.1 (hasParentObj = p1.1)
# Это детализация процесса p1.1 из родительского графа t_p1
# ============================================================================

vad:t_p1.1 {
    vad:t_p1.1 rdf:type vad:VADProcessDia ;
        rdfs:label "Схема t_p1.1 процесса p1.1" ;
        vad:hasParentObj vad:p1.1 .

    # Процесс p1.1.1 - notDetailedChild
    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:p1.1.1 vad:isSubprocessTrig vad:t_p1.1 ;
        vad:hasExecutor vad:ExecutorGroup_p1.1.1 ;
        vad:hasNext vad:p1.1.2 .

    # Процесс p1.1.2 - notDetailedExternal (hasParentProcess = p2, не совпадает с p1.1)
    vad:p1.1.2 vad:isSubprocessTrig vad:t_p1.1 ;
        vad:hasExecutor vad:ExecutorGroup_p1.1.2 .

    # Группы исполнителей (ID формируется как ExecutorGroup_ + ID процесса)
    vad:ExecutorGroup_p1.1.1 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.1.1" ;
        vad:includes vad:Executor21 .

    vad:ExecutorGroup_p1.1.2 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.1.2" ;
        vad:includes vad:Executor21, vad:Executor22 .
}

# ============================================================================
# Корневой TriG граф: t_p2 (hasParentObj = p2)
# ============================================================================

vad:t_p2 {
    vad:t_p2 rdf:type vad:VADProcessDia ;
        rdfs:label "Схема t_p2 процесса p2" ;
        vad:hasParentObj vad:p2 .

    # Процесс p2.1 - notDetailedChild
    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:p2.1 vad:isSubprocessTrig vad:t_p2 ;
        vad:hasExecutor vad:ExecutorGroup_p2.1 ;
        vad:hasNext vad:p2.2, vad:p1.1 .

    # Процесс p2.2
    vad:p2.2 vad:isSubprocessTrig vad:t_p2 ;
        vad:hasExecutor vad:ExecutorGroup_p2.2 .

    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:p1.1 vad:isSubprocessTrig vad:t_p2 ;
        vad:hasExecutor vad:ExecutorGroup_p1.1 ;
        vad:hasNext vad:p1.1.1 .

## vad:p1.1 в vad:t_p2 должен быть показан как детализируемый внешний
## vad:p1.1.1 в vad:t_p2 должен быть показан как НЕдетализируемый внешний
## vad:pх.х  в vad:t_p2 должен быть показан как pNotDefined

    # Процесс p1.1.1 - notDetailedChild
    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:p1.1.1 vad:isSubprocessTrig vad:t_p2 ;
        vad:hasExecutor vad:ExecutorGroup_p1.1.1 ;
        vad:hasNext vad:pх.х .

    # Процесс pх.х
    # rdf:type находится в vad:ptree
    # isSubprocessTrig указывается первым для явной связи с TriG
    vad:pх.х vad:isSubprocessTrig vad:t_p2 ;
        vad:hasExecutor vad:ExecutorGroup_pх.х .

    # Группы исполнителей (ID формируется как ExecutorGroup_ + ID процесса)

    vad:ExecutorGroup_p2.1 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p2.1" ;
        vad:includes vad:Executor1 .

    vad:ExecutorGroup_p2.2 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p2.2" ;
        vad:includes vad:Executor1, vad:Executor2 .

## vad:p1.1 в vad:t_p2
    vad:ExecutorGroup_p1.1 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.1" ;
        vad:includes vad:Executor1, vad:Executor2 .

## vad:p1.1.1 в vad:t_p2
    vad:ExecutorGroup_p1.1.1 rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса p1.1.1" ;
        vad:includes vad:Executor1, vad:Executor2 .

## pх.х в vad:t_p2
    vad:ExecutorGroup_pх.х rdf:type vad:ExecutorGroup ;
        rdfs:label "Группа исполнителей процесса pх.х" ;
        vad:includes vad:Executor1, vad:Executor2 .

}

`
};

// Export for use in index.html
if (typeof window !== 'undefined') {
    window.EXAMPLE_DATA = EXAMPLE_DATA;
}

