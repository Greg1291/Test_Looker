#####################################################################
# VIEW: ordini_toggle_colonne
#
# Versione pensata per essere usata con la Custom Visualization
# "tabella_colonne_dinamiche.js" (vedi file a parte).
#
# A differenza della versione precedente (che usava "html" + Liquid
# per nascondere solo il CONTENUTO delle celle), qui le colonne
# vengono disegnate da zero dalla visualizzazione custom, quindi
# quando l'utente deseleziona una colonna, sparisce anche l'HEADER,
# non solo il valore.
#
# Come usarla:
# 1. Salva questo file nel progetto LookML come
#    "ordini_toggle_colonne.view.lkml"
# 2. Aggiungi l'explore nel tuo .model.lkml (blocco in fondo al file)
# 3. Segui anche i passi del file "tabella_colonne_dinamiche.js"
#    (caricamento come Visualization custom + manifest.lkml)
#####################################################################

view: ordini_toggle_colonne {

  # ------------------------------------------------------------
  # Derived table con dati di esempio (10 righe fittizie)
  # Sintassi compatibile con BigQuery — dimmi se il tuo warehouse
  # è diverso (Snowflake/Redshift/Postgres) e la adatto.
  # ------------------------------------------------------------
  derived_table: {
    sql:
      SELECT 1  AS id_ordine, 'Italia'   AS paese, 'Lombardia'   AS regione, 'Milano'   AS citta, 'Elettronica' AS categoria, 120.50 AS importo, DATE('2026-01-05') AS data_ordine UNION ALL
      SELECT 2  AS id_ordine, 'Italia'   AS paese, 'Lazio'       AS regione, 'Roma'     AS citta, 'Abbigliamento' AS categoria, 75.00  AS importo, DATE('2026-01-08') AS data_ordine UNION ALL
      SELECT 3  AS id_ordine, 'Francia'  AS paese, 'Île-de-France' AS regione, 'Parigi' AS citta, 'Elettronica' AS categoria, 230.00 AS importo, DATE('2026-01-10') AS data_ordine UNION ALL
      SELECT 4  AS id_ordine, 'Germania' AS paese, 'Baviera'     AS regione, 'Monaco'   AS citta, 'Casa'        AS categoria, 45.90  AS importo, DATE('2026-01-12') AS data_ordine UNION ALL
      SELECT 5  AS id_ordine, 'Italia'   AS paese, 'Veneto'      AS regione, 'Venezia'  AS citta, 'Abbigliamento' AS categoria, 99.99  AS importo, DATE('2026-01-15') AS data_ordine UNION ALL
      SELECT 6  AS id_ordine, 'Spagna'   AS paese, 'Catalogna'   AS regione, 'Barcellona' AS citta, 'Elettronica' AS categoria, 310.00 AS importo, DATE('2026-01-18') AS data_ordine UNION ALL
      SELECT 7  AS id_ordine, 'Italia'   AS paese, 'Lombardia'   AS regione, 'Bergamo'  AS citta, 'Casa'        AS categoria, 60.00  AS importo, DATE('2026-01-20') AS data_ordine UNION ALL
      SELECT 8  AS id_ordine, 'Francia'  AS paese, 'Provenza'    AS regione, 'Marsiglia' AS citta, 'Abbigliamento' AS categoria, 88.50  AS importo, DATE('2026-01-22') AS data_ordine UNION ALL
      SELECT 9  AS id_ordine, 'Germania' AS paese, 'Assia'       AS regione, 'Francoforte' AS citta, 'Elettronica' AS categoria, 150.00 AS importo, DATE('2026-01-25') AS data_ordine UNION ALL
      SELECT 10 AS id_ordine, 'Italia'   AS paese, 'Lazio'       AS regione, 'Latina'   AS citta, 'Casa'        AS categoria, 40.20  AS importo, DATE('2026-01-28') AS data_ordine
    ;;
  }

  # ------------------------------------------------------------
  # UNICO PARAMETRO — selezione multipla a checkbox.
  # Il "value" di ogni allowed_value è il codice che la
  # visualizzazione custom userà per capire quale campo mostrare
  # (deve combaciare con l'ultimo pezzo del nome tecnico del
  # campo, es. "ordini_toggle_colonne.paese" -> "paese").
  # ------------------------------------------------------------

  filter: colonne_da_mostrare {

    type: string
    suggestions: ["paese", "regione", "citta", "categoria", "data_ordine", "importo_totale", "numero_ordini"]
  }

  # ------------------------------------------------------------
  # CAMPO TECNICO — NON rimuoverlo dalla query.
  # Espone il valore del parametro come stringa, così la
  # visualizzazione JS può leggerlo dai dati della query
  # (i parametri non selezionati come campo non sono visibili
  # al codice della custom viz).
  # ------------------------------------------------------------



  # ------------------------------------------------------------
  # DIMENSIONI / MISURE — normali, nessun trucco Liquid: la
  # visibilità è decisa interamente dalla visualizzazione custom.
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
# BLOCCO EXPLORE — copia questo nel tuo file .model.lkml
#####################################################################
#
# explore: ordini_toggle_colonne {
#   label: "Ordini (colonne attivabili)"
#   description: "Tabella con colonne dinamiche (header incluso)"
# }
#
#####################################################################
