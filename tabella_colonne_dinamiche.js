looker.plugins.visualizations.add({
  id: "tabella_colonne_dinamiche",
  label: "Tabella con colonne dinamiche",

  options: {
    campo_tecnico: {
      type: "string",
      label: "Nome tecnico del campo che espone il filtro (view.dimension)",
      default: "ordini_toggle_colonne.colonne_selezionate_raw",
      section: "Configurazione"
    },
    mostra_debug: {
      type: "boolean",
      label: "Mostra riquadro di debug",
      default: false,
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

    // Nome tecnico del campo che espone il valore del filtro (via Liquid _filters).
    const campoTecnico =
      config.campo_tecnico || "ordini_toggle_colonne.colonne_selezionate_raw";

    // Legge il valore del filtro dalla prima riga dei dati: il campo tecnico
    // contiene lo stesso valore costante su ogni riga.
    let rawValue = "";
    if (data && data.length > 0 && data[0][campoTecnico]) {
      rawValue = data[0][campoTecnico].value || "";
    }

    let selezionati = [];
    if (rawValue) {
      // Il valore arriva come stringa, es. "paese,regione,categoria".
      // Ripulisce eventuali apici/virgolette lasciate dal filtro Liquid.
      selezionati = String(rawValue)
        .replace(/['"]/g, "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter((v) => v.length > 0);
    }

    // Tutti i campi della query, escluso il campo tecnico (che non va mai mostrato).
    const tuttiICampi = queryResponse.fields.dimension_like
      .concat(queryResponse.fields.measure_like)
      .filter((field) => field.name !== campoTecnico);

    // Nessuna selezione => mostra tutte le colonne.
    // Con selezione => mostra solo quelle il cui "codice" combacia.
    const campiDaMostrare =
      selezionati.length === 0
        ? tuttiICampi
        : tuttiICampi.filter((field) => {
            const codice = field.name.split(".").pop().toLowerCase();
            return selezionati.includes(codice);
          });

    // Riquadro di debug opzionale (attivabile dalle opzioni della visualizzazione).
    if (config.mostra_debug) {
      const debugBox = document.createElement("pre");
      debugBox.style.background = "#fff3cd";
      debugBox.style.border = "1px solid #ffc107";
      debugBox.style.padding = "8px";
      debugBox.style.fontSize = "11px";
      debugBox.style.whiteSpace = "pre-wrap";
      debugBox.style.wordBreak = "break-all";
      debugBox.textContent =
        "DEBUG\n" +
        "campo tecnico cercato: " + campoTecnico + "\n" +
        "campi presenti nella query: " +
        JSON.stringify(
          queryResponse.fields.dimension_like
            .concat(queryResponse.fields.measure_like)
            .map((f) => f.name)
        ) + "\n" +
        "rawValue letto dal campo tecnico: " + JSON.stringify(rawValue) + "\n" +
        "codici selezionati: " + JSON.stringify(selezionati) + "\n" +
        "colonne da mostrare: " + JSON.stringify(campiDaMostrare.map((f) => f.name));
      container.appendChild(debugBox);
    }

    if (campiDaMostrare.length === 0) {
      this.addError({
        title: "Nessuna colonna selezionata",
        message:
          "Nessuna colonna corrisponde alla selezione. Verifica che i valori del filtro " +
          "coincidano con i nomi tecnici dei campi (es. 'paese', 'importo_totale')."
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
