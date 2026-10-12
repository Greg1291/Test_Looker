looker.plugins.visualizations.add({
  id: "tabella_colonne_dinamiche_DAVE",
  label: "Tabella con colonne dinamiche_DAVE",

  options: {
    campo_tecnico: {
      type: "string",
      label: "Nome tecnico del campo che espone il filtro (view.dimension)",
      default: "ordini_toggle_colonne.colonne_selezionate_raw",
      section: "Configurazione"
    },
    misure_sempre_visibili: {
      type: "boolean",
      label: "Mostra sempre le misure",
      default: false,
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

    const campoTecnico =
      config.campo_tecnico || "ordini_toggle_colonne.colonne_selezionate_raw";

    const dimFields = queryResponse.fields.dimension_like;
    const measureFields = queryResponse.fields.measure_like;

    // Il campo tecnico deve essere nella query
    if (!dimFields.some((f) => f.name === campoTecnico)) {
      this.addError({
        title: "Campo tecnico mancante",
        message: "Aggiungi '" + campoTecnico + "' alla query come dimensione normale."
      });
      done();
      return;
    }

    // Valore del filtro letto dalla prima riga
    let rawValue = "";
    if (data && data.length > 0 && data[0][campoTecnico]) {
      rawValue = data[0][campoTecnico].value || "";
    }

    const selezionati = String(rawValue)
      .replace(/['"%]/g, "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v.length > 0);

    const misure = new Set(measureFields.map((f) => f.name));

    const tuttiICampi = dimFields
      .concat(measureFields)
      .filter((field) => field.name !== campoTecnico);

    const campiDaMostrare =
      selezionati.length === 0
        ? tuttiICampi
        : tuttiICampi.filter((field) => {
            if (config.misure_sempre_visibili && misure.has(field.name)) return true;
            const codice = field.name.split(".").pop().toLowerCase();
            return selezionati.includes(codice);
          });

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
        "campo tecnico: " + campoTecnico + "\n" +
        "campi in query: " + JSON.stringify(dimFields.concat(measureFields).map((f) => f.name)) + "\n" +
        "rawValue: " + JSON.stringify(rawValue) + "\n" +
        "codici selezionati: " + JSON.stringify(selezionati) + "\n" +
        "colonne mostrate: " + JSON.stringify(campiDaMostrare.map((f) => f.name));
      container.appendChild(debugBox);
    }

    if (campiDaMostrare.length === 0) {
      this.addError({
        title: "Nessuna colonna selezionata",
        message:
          "Nessuna colonna corrisponde alla selezione. I valori del filtro devono coincidere " +
          "con i nomi tecnici dei campi (es. 'paese', 'importo_totale')."
      });
      done();
      return;
    }

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.style.fontFamily = "inherit";
    table.style.fontSize = "12px";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    campiDaMostrare.forEach((field) => {
      const th = document.createElement("th");
      th.textContent = field.label_short || field.label || field.name;
      th.style.textAlign = misure.has(field.name) ? "right" : "left";
      th.style.padding = "6px 10px";
      th.style.borderBottom = "2px solid #ddd";
      th.style.whiteSpace = "nowrap";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    data.forEach((row) => {
      const tr = document.createElement("tr");
      campiDaMostrare.forEach((field) => {
        const td = document.createElement("td");
        const cell = row[field.name];
        td.textContent = cell ? (cell.rendered || cell.value) : "";
        td.style.padding = "6px 10px";
        td.style.borderBottom = "1px solid #eee";
        td.style.whiteSpace = "nowrap";
        td.style.textAlign = misure.has(field.name) ? "right" : "left";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);
    done();
  }
});
