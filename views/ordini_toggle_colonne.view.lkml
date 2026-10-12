#####################################################################
# VIEW: ordini_toggle_colonne
#
# Da usare con la Custom Visualization "tabella_colonne_dinamiche.js".
#
# Meccanismo a due livelli:
#
# 1) LIVELLO SQL (questa view)
#    Le dimensioni non selezionate nel filtro vengono emesse come NULL
#    dalla derived table. Raggruppando per una colonna costantemente
#    NULL, il database collassa le righe: si ottiene quindi il vero
#    aggregato (es. un'unica riga per Paese), non righe duplicate.
#
# 2) LIVELLO VISUALIZZAZIONE (il file .js)
#    La custom viz non disegna affatto le colonne non selezionate,
#    così sparisce anche l'header e non resta una colonna di NULL.
#
# Nota: _filters è consentito nel sql di una derived table, ma NON
# nel sql di una dimensione: per questo il valore del filtro viene
# iniettato qui e riletto dalla dimensione tecnica.
#####################################################################

view: ordini_toggle_colonne {

  derived_table: {
    sql:
      {% assign sel = _filters['ordini_toggle_colonne.colonne_da_mostrare'] %}

            SELECT
              CAST(
                {% if sel == nil or sel == "" %}''{% else %}{{ sel | sql_quote }}{% endif %}
                AS STRING
              ) AS colonne_selezionate_raw,

      base.id_ordine,
      base.importo,

      {% if sel == nil or sel == "" or sel contains 'paese' %}
      base.paese
      {% else %}
      CAST(NULL AS STRING)
      {% endif %} AS paese,

      {% if sel == nil or sel == "" or sel contains 'regione' %}
      base.regione
      {% else %}
      CAST(NULL AS STRING)
      {% endif %} AS regione,

      {% if sel == nil or sel == "" or sel contains 'citta' %}
      base.citta
      {% else %}
      CAST(NULL AS STRING)
      {% endif %} AS citta,

      {% if sel == nil or sel == "" or sel contains 'categoria' %}
      base.categoria
      {% else %}
      CAST(NULL AS STRING)
      {% endif %} AS categoria,

      {% if sel == nil or sel == "" or sel contains 'data_ordine' %}
      base.data_ordine
      {% else %}
      CAST(NULL AS DATE)
      {% endif %} AS data_ordine

            FROM (
        SELECT
          n AS id_ordine,
          d.ls[OFFSET(MOD(n * 7, ARRAY_LENGTH(d.ls)))].paese    AS paese,
          d.ls[OFFSET(MOD(n * 7, ARRAY_LENGTH(d.ls)))].regione  AS regione,
          d.ls[OFFSET(MOD(n * 7, ARRAY_LENGTH(d.ls)))].citta    AS citta,
          d.cs[OFFSET(MOD(n * 3, ARRAY_LENGTH(d.cs)))]          AS categoria,
          ROUND(10 + MOD(n * 7919, 49000) / 100, 2)             AS importo,
          DATE_ADD(DATE '2026-01-01', INTERVAL MOD(n * 31, 365) DAY) AS data_ordine
        FROM UNNEST(GENERATE_ARRAY(1, 100000)) AS n
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
      ;;
  }

  # ------------------------------------------------------------
  # FILTRO — selezione multipla ("is any of").
  # I valori devono combaciare con l'ultimo pezzo del nome tecnico
  # del campo: "ordini_toggle_colonne.paese" -> "paese".
  # Filtro vuoto = mostra tutte le colonne.
  # ------------------------------------------------------------

  filter: colonne_da_mostrare {
    label: "Colonne da mostrare"
    type: string
    suggestions: ["paese", "regione", "citta", "categoria", "data_ordine", "importo_totale", "numero_ordini"]
  }

  # ------------------------------------------------------------
  # CAMPO TECNICO — va SEMPRE incluso nella query (come campo
  # normale, NON come pivot). Contiene il valore del filtro su
  # ogni riga; la visualizzazione lo legge e non lo disegna mai.
  # ------------------------------------------------------------

  dimension: colonne_selezionate_raw {
    label: "[Tecnico] Colonne selezionate — non rimuovere dalla query"
    description: "Campo tecnico letto dalla visualizzazione 'Tabella con colonne dinamiche'. Va sempre incluso nella query, come campo normale e non come pivot."
    type: string
    sql: ${TABLE}.colonne_selezionate_raw ;;
  }

  # ------------------------------------------------------------
  # DIMENSIONI / MISURE
  # ------------------------------------------------------------

  dimension: id_ordine {
    label: "ID Ordine"
    description: "Granularità di riga: se incluso nella query impedisce l'aggregazione."
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

#####################################################################
# BLOCCO EXPLORE — nel file .model.lkml
#
# explore: ordini_toggle_colonne {
#   label: "Ordini (colonne attivabili)"
#   description: "Tabella con colonne dinamiche (header incluso)"
# }
#####################################################################
