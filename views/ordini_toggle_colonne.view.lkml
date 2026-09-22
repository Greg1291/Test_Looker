#####################################################################
# VIEW: ordini_toggle_colonne
#
# Da usare con la Custom Visualization "tabella_colonne_dinamiche.js".
#
# Meccanismo:
# - "colonne_da_mostrare" è un filter-only field (multi-selezione).
# - Il suo valore NON può essere letto da applied_filters (Looker non
#   espone i filtri privi di sql alla visualizzazione) né referenziato
#   con _filters dentro il sql di una dimensione (non permesso).
# - Quindi lo si inietta come colonna costante DENTRO la derived table,
#   dove _filters è consentito, e la dimensione tecnica lo rilegge.
#####################################################################

view: ordini_toggle_colonne {

  derived_table: {
    sql:
      SELECT
        base.*,
        CAST(
          {% if _filters['ordini_toggle_colonne.colonne_da_mostrare'] %}
            {{ _filters['ordini_toggle_colonne.colonne_da_mostrare'] | sql_quote }}
          {% else %}
            ''
          {% endif %}
          AS STRING
        ) AS colonne_selezionate_raw
      FROM (
        SELECT 1  AS id_ordine, 'Italia'   AS paese, 'Lombardia'     AS regione, 'Milano'      AS citta, 'Elettronica'   AS categoria, 120.50 AS importo, DATE('2026-01-05') AS data_ordine UNION ALL
        SELECT 2  AS id_ordine, 'Italia'   AS paese, 'Lazio'         AS regione, 'Roma'        AS citta, 'Abbigliamento' AS categoria, 75.00  AS importo, DATE('2026-01-08') AS data_ordine UNION ALL
        SELECT 3  AS id_ordine, 'Francia'  AS paese, 'Île-de-France' AS regione, 'Parigi'      AS citta, 'Elettronica'   AS categoria, 230.00 AS importo, DATE('2026-01-10') AS data_ordine UNION ALL
        SELECT 4  AS id_ordine, 'Germania' AS paese, 'Baviera'       AS regione, 'Monaco'      AS citta, 'Casa'          AS categoria, 45.90  AS importo, DATE('2026-01-12') AS data_ordine UNION ALL
        SELECT 5  AS id_ordine, 'Italia'   AS paese, 'Veneto'        AS regione, 'Venezia'     AS citta, 'Abbigliamento' AS categoria, 99.99  AS importo, DATE('2026-01-15') AS data_ordine UNION ALL
        SELECT 6  AS id_ordine, 'Spagna'   AS paese, 'Catalogna'     AS regione, 'Barcellona'  AS citta, 'Elettronica'   AS categoria, 310.00 AS importo, DATE('2026-01-18') AS data_ordine UNION ALL
        SELECT 7  AS id_ordine, 'Italia'   AS paese, 'Lombardia'     AS regione, 'Bergamo'     AS citta, 'Casa'          AS categoria, 60.00  AS importo, DATE('2026-01-20') AS data_ordine UNION ALL
        SELECT 8  AS id_ordine, 'Francia'  AS paese, 'Provenza'      AS regione, 'Marsiglia'   AS citta, 'Abbigliamento' AS categoria, 88.50  AS importo, DATE('2026-01-22') AS data_ordine UNION ALL
        SELECT 9  AS id_ordine, 'Germania' AS paese, 'Assia'         AS regione, 'Francoforte' AS citta, 'Elettronica'   AS categoria, 150.00 AS importo, DATE('2026-01-25') AS data_ordine UNION ALL
        SELECT 10 AS id_ordine, 'Italia'   AS paese, 'Lazio'         AS regione, 'Latina'      AS citta, 'Casa'          AS categoria, 40.20  AS importo, DATE('2026-01-28') AS data_ordine
      ) AS base
    ;;
  }

  # ------------------------------------------------------------
  # FILTRO — selezione multipla ("is any of").
  # I valori devono combaciare con l'ultimo pezzo del nome tecnico
  # del campo: "ordini_toggle_colonne.paese" -> "paese".
  # ------------------------------------------------------------

  filter: colonne_da_mostrare {
    label: "Colonne da mostrare"
    type: string
    suggestions: ["paese", "regione", "citta", "categoria", "data_ordine", "importo_totale", "numero_ordini"]
  }

  # ------------------------------------------------------------
  # CAMPO TECNICO — va SEMPRE incluso nella query.
  # Contiene il valore del filtro come stringa costante su ogni riga.
  # La visualizzazione custom lo legge per sapere quali colonne
  # disegnare; non compare mai come colonna nella tabella.
  # ------------------------------------------------------------

  dimension: colonne_selezionate_raw {
    label: "[Tecnico] Colonne selezionate — non rimuovere dalla query"
    description: "Campo tecnico letto dalla visualizzazione 'Tabella con colonne dinamiche'. Va sempre incluso nella query."
    type: string
    sql: ${TABLE}.colonne_selezionate_raw ;;
  }

  # ------------------------------------------------------------
  # DIMENSIONI / MISURE
  # ------------------------------------------------------------

  dimension: id_ordine {
    label: "ID Ordine"
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
