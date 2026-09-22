looker.plugins.visualizations.add({
  id: "tabella_colonne_dinamiche",
  label: "Tabella con colonne dinamiche",

  options: {
    filter_name: {
      type: "string",
      label: "Nome tecnico del filtro colonne (view.filter)",
      default: "ordini_toggle_colonne.colonne_da_mostrare",
      section: "Configurazione"
    }
  },

  create: function (element, config) {
    element.innerHTML = "";
    const container = document.createElement("div");
    container.className = "tabella-colonne-dinamiche-container";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.overflow = "auto";
    element.appendChild(container);
    this._container = container;
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    this.clearErrors();

    const container = this._container;
    container.innerHTML = "";

    // Nome tecnico del filtro (view.filter), configurabile dalle opzioni della viz
    const filterName = config.filter_name || "ordini_toggle_colonne.colonne_da_mostrare";

    // Legge i valori selezionati direttamente dai filtri applicati alla query,
    // senza bisogno di includere il filtro come campo nella query.
    const appliedFilters = queryResponse.applied_filters || {};
    const rawValue = appliedFilters[filterName];

    // --- DEBUG TEMPORANEO ---
    // Apri la Console del browser (F12) per vedere esattamente cosa arriva.
    // Rimuovi queste righe una volta risolto il problema.
    console.log("[tabella_colonne_dinamiche] filterName cercato:", filterName);
    console.log("[tabella_colonne_dinamiche] chiavi disponibili in applied_filters:", Object.keys(appliedFilters));
    console.log("[tabella_colonne_dinamiche] applied_filters completo:", appliedFilters);
    console.log("[tabella_colonne_dinamiche] rawValue trovato:", rawValue);
    // --- FINE DEBUG ---

    let selezionati = [];
    if (rawValue) {
      // I filtri "is any of" arrivano come stringa separata da virgole,
      // es. "paese,regione,categoria"
      selezionati = String(rawValue)
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter((v) => v.length > 0);
    }

    // Tutti i campi disponibili nella query (dimensioni + misure), nell'ordine scelto dall'utente
    const tuttiICampi = queryResponse.fields.dimension_like.concat(
      queryResponse.fields.measure_like
    );

    // Se non è selezionato nulla, mostra tutte le colonne (comportamento di default);
    // se sono selezionate colonne, mostra solo quelle il cui "codice" combacia.
    const campiDaMostrare =
      selezionati.length === 0
        ? tuttiICampi
        : tuttiICampi.filter((field) => {
            const codice = field.name.split(".").pop().toLowerCase();
            return selezionati.includes(codice);
          });

    if (campiDaMostrare.length === 0) {
      this.addError({
        title: "Nessuna colonna selezionata",
        message: "Seleziona almeno una colonna dal filtro per visualizzare la tabella."
      });
      done();
      return;
    }

    // Costruzione tabella HTML: solo le colonne selezionate, header incluso
    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.style.fontFamily = "inherit";
    table.style.fontSize = "12px";

    // Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    campiDaMostrare.forEach((field) => {
      const th = document.createElement("th");
      th.textContent = field.label_short || field.label || field.name;
      th.style.textAlign = "left";
      th.style.padding = "6px 10px";
      th.style.borderBottom = "2px solid #ddd";
      th.style.whiteSpace = "nowrap";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");
    data.forEach((row) => {
      const tr = document.createElement("tr");
      campiDaMostrare.forEach((field) => {
        const td = document.createElement("td");
        const cell = row[field.name];
        td.textContent = cell ? cell.value : "";
        td.style.padding = "6px 10px";
        td.style.borderBottom = "1px solid #eee";
        td.style.whiteSpace = "nowrap";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);
    done();
  }
});
