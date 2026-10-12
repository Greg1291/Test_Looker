view: ordini_toggle_colonne {

  derived_table: {
    sql:
      {% assign sel = _filters['ordini_toggle_colonne.colonne_da_mostrare'] | downcase %}

            SELECT
              CAST({% if sel == "" %}''{% else %}{{ sel | sql_quote }}{% endif %} AS STRING) AS colonne_selezionate_raw,

      base.id_ordine,
      base.importo,

      {% if sel == "" or sel contains 'paese' %}base.paese{% else %}CAST(NULL AS STRING){% endif %} AS paese,
      {% if sel == "" or sel contains 'regione' %}base.regione{% else %}CAST(NULL AS STRING){% endif %} AS regione,
      {% if sel == "" or sel contains 'citta' %}base.citta{% else %}CAST(NULL AS STRING){% endif %} AS citta,
      {% if sel == "" or sel contains 'categoria' %}base.categoria{% else %}CAST(NULL AS STRING){% endif %} AS categoria,
      {% if sel == "" or sel contains 'data_ordine' %}base.data_ordine{% else %}CAST(NULL AS DATE){% endif %} AS data_ordine

      FROM (
      SELECT
      h.n AS id_ordine,
      d.ls[OFFSET(MOD(h.h_loc, ARRAY_LENGTH(d.ls)))].paese    AS paese,
      d.ls[OFFSET(MOD(h.h_loc, ARRAY_LENGTH(d.ls)))].regione  AS regione,
      d.ls[OFFSET(MOD(h.h_loc, ARRAY_LENGTH(d.ls)))].citta    AS citta,
      d.cs[OFFSET(MOD(h.h_cat, ARRAY_LENGTH(d.cs)))]          AS categoria,
      ROUND(10 + MOD(h.h_imp, 49000) / 100, 2)                AS importo,
      DATE_ADD(DATE '2026-01-01', INTERVAL MOD(h.h_dt, 365) DAY) AS data_ordine
      FROM (
      SELECT
      n,
      ABS(FARM_FINGERPRINT(CONCAT('loc', CAST(n AS STRING)))) AS h_loc,
      ABS(FARM_FINGERPRINT(CONCAT('cat', CAST(n AS STRING)))) AS h_cat,
      ABS(FARM_FINGERPRINT(CONCAT('imp', CAST(n AS STRING)))) AS h_imp,
      ABS(FARM_FINGERPRINT(CONCAT('dt',  CAST(n AS STRING)))) AS h_dt
      FROM UNNEST(GENERATE_ARRAY(1, 1000000)) AS n
      ) AS h
      CROSS JOIN (
      SELECT
      [
      STRUCT('Italia'   AS paese, 'Lombardia'     AS regione, 'Milano'      AS citta),
      STRUCT('Italia',            'Lombardia',                'Bergamo'),
      STRUCT('Italia',            'Lazio',                    'Roma'),
      STRUCT('Italia',            'Lazio',                    'Latina'),
      STRUCT('Italia',            'Veneto',                   'Venezia'),
      STRUCT('Francia',           'Île-de-France',            'Parigi'),
      STRUCT('Francia',           'Provenza',                 'Marsiglia'),
      STRUCT('Germania',          'Baviera',                  'Monaco'),
      STRUCT('Germania',          'Assia',                    'Francoforte'),
      STRUCT('Spagna',            'Catalogna',                'Barcellona'),
      STRUCT('Spagna',            'Madrid',                   'Madrid'),
      STRUCT('Spagna',            'Andalusia',                'Siviglia')
      ] AS ls,
      ['Elettronica', 'Abbigliamento', 'Casa', 'Sport', 'Giardino'] AS cs
      ) AS d
      ) AS base
      WHERE {% condition f_paese %} base.paese {% endcondition %}
      AND {% condition f_regione %} base.regione {% endcondition %}
      AND {% condition f_citta %} base.citta {% endcondition %}
      AND {% condition f_categoria %} base.categoria {% endcondition %}
      AND {% condition f_data_ordine %} base.data_ordine {% endcondition %}
      ;;
  }

  # ---- Filtro colonne da mostrare (valori in minuscolo) ----
  filter: colonne_da_mostrare {
    label: "Colonne da mostrare"
    type: string
    suggestions: ["paese", "regione", "citta", "categoria", "data_ordine", "importo_totale", "numero_ordini"]
  }

  # ---- Filtri reali sui dati (applicati prima dell'annullamento delle colonne) ----
  filter: f_paese {
    label: "Filtro Paese"
    type: string
    suggest_dimension: paese
  }

  filter: f_regione {
    label: "Filtro Regione"
    type: string
    suggest_dimension: regione
  }

  filter: f_citta {
    label: "Filtro Città"
    type: string
    suggest_dimension: citta
  }

  filter: f_categoria {
    label: "Filtro Categoria"
    type: string
    suggest_dimension: categoria
  }

  filter: f_data_ordine {
    label: "Filtro Data Ordine"
    type: date
  }

  # ---- Campo tecnico: sempre nella query, come campo normale ----
  dimension: colonne_selezionate_raw {
    label: "[Tecnico] Colonne selezionate — non rimuovere dalla query"
    description: "Letto dalla visualizzazione 'Tabella con colonne dinamiche'. Va sempre incluso nella query, come campo normale e non come pivot."
    type: string
    sql: ${TABLE}.colonne_selezionate_raw ;;
  }

  # ---- Dimensioni ----
  dimension: id_ordine {
    hidden: yes
    type: number
    sql: ${TABLE}.id_ordine ;;
    primary_key: yes
  }

  dimension: paese {
    label: "Paese"
    type: string
    sql: ${TABLE}.paese ;;
  }

  dimension: regione {
    label: "Regione"
    type: string
    sql: ${TABLE}.regione ;;
  }

  dimension: citta {
    label: "Città"
    type: string
    sql: ${TABLE}.citta ;;
  }

  dimension: categoria {
    label: "Categoria"
    type: string
    sql: ${TABLE}.categoria ;;
  }

  dimension: data_ordine {
    label: "Data Ordine"
    type: date
    datatype: date
    sql: ${TABLE}.data_ordine ;;
  }

  # ---- Misure ----
  measure: importo_totale {
    label: "Importo Totale"
    type: sum
    sql: ${TABLE}.importo ;;
    value_format_name: eur
  }

  measure: numero_ordini {
    label: "Numero Ordini"
    type: count
  }
}
