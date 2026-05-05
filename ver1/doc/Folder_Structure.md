# Folder_Structure.md — Структура папок и файлов warchi-ld ver1

Обновлено: PR #2, 2026-05-05

```
ver1/
├── index.html                                          (~600 строк)
├── warchi_ld.css                                       (~500 строк)
├── warchi_ld_ui.js                                     (~400 строк)
├── warchi_ld_convert.js                                (~400 строк)
├── styles.css                                          (~3500 строк)
├── config.json                                         (10 строк)
│
├── 1_example_data/
│   ├── 1_example_data.css                             (32 строки)
│   └── 1_example_data_logic.js                        (~700 строк)
│
├── 2_triplestore/
│   ├── 2_triplestore.css                              (16 строк)
│   ├── 2_triplestore_logic.js                         (~1000 строк)
│   └── 2_triplestore_ui.js                            (~600 строк)
│
├── 3_sd/
│   ├── 3_sd.css                                       (6 строк)
│   ├── 3_sd_logic.js                                  (~600 строк)
│   ├── 3_sd_sparql.js                                 (~200 строк)
│   ├── 3_sd_ui.js                                     (~1300 строк)
│   ├── 3_sd_create_new_concept/
│   │   ├── 3_sd_create_new_concept_logic.js           (~600 строк)
│   │   ├── 3_sd_create_new_concept_sparql.js          (~200 строк)
│   │   └── 3_sd_create_new_concept_ui.js              (~800 строк)
│   ├── 3_sd_create_new_individ/
│   │   ├── 3_sd_create_new_individ_logic.js           (~400 строк)
│   │   ├── 3_sd_create_new_individ_sparql.js          (~300 строк)
│   │   └── 3_sd_create_new_individ_ui.js              (~1000 строк)
│   ├── 3_sd_create_new_trig/
│   │   ├── 3_sd_create_new_trig_logic.js              (~200 строк)
│   │   └── 3_sd_create_new_trig_ui.js                 (~600 строк)
│   └── 3_sd_del_concept_individ/
│       ├── 3_sd_del_concept_individ_logic.js          (~1200 строк)
│       ├── 3_sd_del_concept_individ_sparql.js         (~500 строк)
│       └── 3_sd_del_concept_individ_ui.js             (~1200 строк)
│
├── 4_resSPARQL/
│   ├── 4_resSPARQL.css                                (6 строк)
│   └── 4_resSPARQL_ui.js                              (5 строк)
│
├── 5_publisher/
│   ├── 5_publisher.css                                (38 строк)
│   ├── 5_publisher_logic.js                           (~2000 строк)
│   ├── 5_publisher_sparql.js                          (40 строк)
│   ├── 5_publisher_ui.js                              (~800 строк)
│   └── 5_publisher_treeview/
│       ├── 5_publisher_treeview_search.css            (~200 строк)
│       ├── 5_publisher_treeview_search.js             (~400 строк)
│       └── 5_publisher_treeview_ui.js                 (~1000 строк)
│
├── 6_legend/
│   ├── 6_legend.css                                   (6 строк)
│   └── 6_legend_ui.js                                 (~400 строк)
│
├── 7_info/
│   ├── 7_info.css                                     (6 строк)
│   └── 7_info_ui.js                                   (27 строк)
│
├── 8_infoSPARQL/
│   ├── 8_infoSPARQL.css                               (6 строк)
│   ├── 8_infoSPARQL_sparql.js                         (5 строк)
│   └── 8_infoSPARQL_ui.js                             (~300 строк)
│
├── 9_vadlib/
│   ├── vadlib_logic.js                                (~1200 строк)
│   ├── vadlib_sparql.js                               (~900 строк)
│   ├── vadlib_sparql_v2.js                            (~400 строк)
│   └── vadlib_ui.js                                   (~200 строк)
│
├── 10_virtualTriG/
│   ├── 10_virtualTriG.css                             (72 строки)
│   ├── 10_virtualTriG_logic.js                        (~800 строк)
│   ├── 10_virtualTriG_sparql.js                       (~300 строк)
│   └── 10_virtualTriG_ui.js                           (~300 строк)
│
├── 11_reasoning/
│   ├── 11_reasoning.css                               (6 строк)
│   ├── 11_reasoning_logic.js                          (~1000 строк)
│   └── 11_reasoning_sparql.js                         (~400 строк)
│
├── 12_method/
│   ├── 12_method.css                                  (5 строк)
│   ├── 12_method_logic.js                             (~1200 строк)
│   ├── 12_method_sparql.js                            (50 строк)
│   └── 12_method_ui.js                                (65 строк)
│
├── dia/
│   ├── Trig_VADv8.ttl                                 (~300 строк)
│   ├── Trig_VADv8_warchi.warchi                       (~200 строк)
│   └── file.md                                        (1 строка)
│
├── ontology/
│   ├── vad-basic-ontology.trig                        (~500 строк)
│   ├── vad-basic-ontology_tech_Appendix.trig          (~1100 строк)
│   ├── term.md                                        (~400 строк)
│   ├── term_tech.md                                   (8 строк)
│   ├── readme.md                                      (1 строка)
│   └── OLD/                                           (резервные копии)
│
├── requirements/
│   ├── file_naming.md                                 (60 строк)
│   ├── programming_information.md                     (29 строк)
│   ├── sparql-driven-programming_min2.md              (86 строк)
│   └── readme.md                                      (1 строка)
│
└── doc/
    ├── readme.md                                      (55 строк)
    ├── start.md                                       (68 строк)
    ├── spec.md                                        (~200 строк)
    ├── autodoc.md                                     (10 строк)
    ├── problems_v1.md                                 (51 строка)
    ├── improvements_v1.md                             (67 строк)
    ├── Folder_Structure.md                            (этот файл)
    └── Custom/
        └── readme.md                                  (45 строк)
```
