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
    max_righe: {
      type: "number",
      label: "Righe visualizzate",
      default: 500,
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
    this._ordine = [];
    this._sort = {};
    this._pivotDim = "";
    this._limite = 0;
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    this.clearErrors();

    const self = this;
    const container = this._container;
    container.innerHTML = "";

    const rerender = () =>
      self.updateAsync(data, element, config, queryResponse, details, () => {});

    const campoTecnico =
      config.campo_tecnico || "ordini_toggle_colonne.colonne_selezionate_raw";

    // ---------- campi e pivot nativo ----------
    let pivots = queryResponse.pivots || [];
    const pivotNativo = pivots.length > 0;
    let dati = data;
    const pivotFields = (queryResponse.fields.pivots || []).map((f) => f.name);

    if (pivotFields.includes(campoTecnico)) {
      this.addError({
        title: "Campo tecnico pivotato",
        message: "Non pivotare '" + campoTecnico + "': va incluso come campo normale."
      });
      done();
      return;
    }

    const dimFields = queryResponse.fields.dimension_like.filter(
      (f) => !pivotFields.includes(f.name)
    );
    const measureFields = queryResponse.fields.measure_like;

    if (!dimFields.some((f) => f.name === campoTecnico)) {
      this.addError({
        title: "Campo tecnico mancante",
        message: "Aggiungi '" + campoTecnico + "' alla query come dimensione normale."
      });
      done();
      return;
    }

    // ---------- valore del filtro colonne ----------
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

    let campiDaMostrare =
      selezionati.length === 0
        ? tuttiICampi
        : tuttiICampi.filter((field) => {
            if (config.misure_sempre_visibili && misure.has(field.name)) return true;
            const codice = field.name.split(".").pop().toLowerCase();
            return selezionati.includes(codice);
          });

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

    // ---------- pivot lato client (menu nella viz) ----------
    let pivotNome = null;
    if (!pivotNativo) {
      const dimOpzioni = campiDaMostrare.filter((f) => !misure.has(f.name));
      if (!dimOpzioni.some((f) => f.name === self._pivotDim)) self._pivotDim = "";

      const bar = document.createElement("div");
      bar.style.padding = "6px 10px";
      bar.style.fontSize = "12px";
      const lbl = document.createElement("span");
      lbl.textContent = "Pivot su: ";
      const sel = document.createElement("select");
      [["", "Nessuno"]]
        .concat(dimOpzioni.map((f) => [f.name, f.label_short || f.label || f.name]))
        .forEach((p) => {
          const o = document.createElement("option");
          o.value = p[0];
          o.textContent = p[1];
          if (p[0] === self._pivotDim) o.selected = true;
          sel.appendChild(o);
        });
      sel.onchange = () => {
        self._pivotDim = sel.value;
        rerender();
      };
      bar.appendChild(lbl);
      bar.appendChild(sel);
      container.appendChild(bar);

      pivotNome = self._pivotDim || null;
    }

    if (pivotNome) {
      const dimRighe = campiDaMostrare.filter(
        (f) => !misure.has(f.name) && f.name !== pivotNome
      );
      const misureVis = campiDaMostrare.filter((f) => misure.has(f.name));
      const valori = [];
      const visti = new Set();
      const gruppi = new Map();

      data.forEach((row) => {
        const pc = row[pivotNome];
        const pv =
          pc && pc.value !== null && pc.value !== undefined ? String(pc.value) : "(vuoto)";
        if (!visti.has(pv)) {
          visti.add(pv);
          valori.push(pv);
        }
        const chiave = JSON.stringify(
          dimRighe.map((f) => (row[f.name] ? row[f.name].value : null))
        );
        let g = gruppi.get(chiave);
        if (!g) {
          g = {};
          dimRighe.forEach((f) => (g[f.name] = row[f.name]));
          misureVis.forEach((f) => (g[f.name] = {}));
          gruppi.set(chiave, g);
        }
        misureVis.forEach((f) => {
          if (row[f.name]) g[f.name][pv] = row[f.name];
        });
      });

      valori.sort((a, b) => a.localeCompare(b));
      pivots = valori.map((pv) => {
        const d = {};
        d[pivotNome] = pv;
        return { key: pv, is_total: false, data: d };
      });
      dati = Array.from(gruppi.values());
      campiDaMostrare = campiDaMostrare.filter((f) => f.name !== pivotNome);
    }

    const inPivot = pivots.length > 0;

    // ---------- debug ----------
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
        "pivot nativo: " + pivotNativo + " | pivot client: " + JSON.stringify(pivotNome) + "\n" +
        "n. valori pivot: " + pivots.length + "\n" +
        "rawValue: " + JSON.stringify(rawValue) + "\n" +
        "codici selezionati: " + JSON.stringify(selezionati) + "\n" +
        "colonne mostrate: " + JSON.stringify(campiDaMostrare.map((f) => f.name));
      container.appendChild(debugBox);
    }

    // ---------- ordine colonne (persistente tra i refresh) ----------
    const nomi = campiDaMostrare.map((f) => f.name);
    const prec = this._ordine || [];
    this._ordine = prec
      .filter((n) => nomi.includes(n))
      .concat(nomi.filter((n) => !prec.includes(n)));
    const ordinati = this._ordine.map((n) => campiDaMostrare.find((f) => f.name === n));

    // ---------- colonne (con o senza pivot) ----------
    const dimsVis = ordinati.filter((f) => !misure.has(f.name));
    const misVis = ordinati.filter((f) => misure.has(f.name));

    let colonne = [];
    if (!inPivot) {
      colonne = ordinati.map((f) => ({ field: f, pivot: null }));
    } else {
      dimsVis.forEach((f) => colonne.push({ field: f, pivot: null }));
      pivots.forEach((p) => misVis.forEach((f) => colonne.push({ field: f, pivot: p })));
    }

    const getCell = (row, col) => {
      const c = row[col.field.name];
      if (!c) return null;
      return col.pivot ? c[col.pivot.key] || null : c;
    };

    const pivotLabel = (p) => {
      if (p.is_total) return "Totale";
      return Object.keys(p.data || {})
        .map((k) => (p.data[k] === null || p.data[k] === undefined ? "(vuoto)" : p.data[k]))
        .join(" - ");
    };

    // ---------- ordinamento righe ----------
    const s = this._sort || {};
    const colSort = s.nome
      ? colonne.find(
          (c) =>
            c.field.name === s.nome &&
            (c.pivot ? c.pivot.key : null) === (s.pivotKey || null)
        )
      : null;

    const righe = dati.slice();
    if (colSort) {
      righe.sort((r1, r2) => {
        const c1 = getCell(r1, colSort);
        const c2 = getCell(r2, colSort);
        const a = c1 ? c1.value : null;
        const b = c2 ? c2.value : null;
        if (a === null || a === undefined) return 1;
        if (b === null || b === undefined) return -1;
        const cmp =
          typeof a === "number" && typeof b === "number"
            ? a - b
            : String(a).localeCompare(String(b));
        return cmp * s.dir;
      });
    }

    // ---------- header cell con sort + drag&drop ----------
    const makeTh = (col) => {
      const field = col.field;
      const pKey = col.pivot ? col.pivot.key : null;
      const th = document.createElement("th");
      const attivo =
        colSort &&
        colSort.field.name === field.name &&
        (colSort.pivot ? colSort.pivot.key : null) === pKey;
      const freccia = attivo ? (s.dir === 1 ? " ▲" : " ▼") : "";
      th.textContent = (field.label_short || field.label || field.name) + freccia;
      th.style.textAlign = misure.has(field.name) ? "right" : "left";
      th.style.padding = "6px 10px";
      th.style.borderBottom = "2px solid #ddd";
      th.style.whiteSpace = "nowrap";
      th.style.cursor = "pointer";
      th.draggable = true;

      th.onclick = () => {
        self._sort = { nome: field.name, pivotKey: pKey, dir: attivo ? -s.dir : 1 };
        rerender();
      };
      th.ondragstart = (e) => e.dataTransfer.setData("text/plain", field.name);
      th.ondragover = (e) => e.preventDefault();
      th.ondrop = (e) => {
        e.preventDefault();
        const da = e.dataTransfer.getData("text/plain");
        if (!da || da === field.name) return;
        const o = self._ordine.filter((n) => n !== da);
        o.splice(o.indexOf(field.name), 0, da);
        self._ordine = o;
        rerender();
      };
      return th;
    };

    // ---------- tabella ----------
    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.style.fontFamily = "inherit";
    table.style.fontSize = "12px";

    const thead = document.createElement("thead");
    if (!inPivot) {
      const headerRow = document.createElement("tr");
      colonne.forEach((col) => headerRow.appendChild(makeTh(col)));
      thead.appendChild(headerRow);
    } else {
      const row1 = document.createElement("tr");
      const row2 = document.createElement("tr");
      dimsVis.forEach((f) => {
        const th = makeTh({ field: f, pivot: null });
        th.rowSpan = misVis.length > 0 ? 2 : 1;
        row1.appendChild(th);
      });
      if (misVis.length > 0) {
        pivots.forEach((p) => {
          const thP = document.createElement("th");
          thP.textContent = pivotLabel(p);
          thP.colSpan = misVis.length;
          thP.style.textAlign = "center";
          thP.style.padding = "6px 10px";
          thP.style.borderBottom = "1px solid #ddd";
          thP.style.whiteSpace = "nowrap";
          row1.appendChild(thP);
          misVis.forEach((f) => row2.appendChild(makeTh({ field: f, pivot: p })));
        });
      }
      thead.appendChild(row1);
      if (misVis.length > 0) thead.appendChild(row2);
    }
    table.appendChild(thead);

    // ---------- corpo (con limite righe) ----------
    const limite = self._limite || config.max_righe || 500;
    const tbody = document.createElement("tbody");
    const frag = document.createDocumentFragment();

    righe.slice(0, limite).forEach((row) => {
      const tr = document.createElement("tr");
      colonne.forEach((col) => {
        const td = document.createElement("td");
        const cell = getCell(row, col);
        td.textContent = cell
          ? (cell.rendered !== undefined && cell.rendered !== null
              ? cell.rendered
              : (cell.value === null || cell.value === undefined ? "" : cell.value))
          : "";
        td.style.padding = "6px 10px";
        td.style.borderBottom = "1px solid #eee";
        td.style.whiteSpace = "nowrap";
        td.style.textAlign = misure.has(col.field.name) ? "right" : "left";
        if (cell && cell.links && cell.links.length) {
          td.style.cursor = "pointer";
          td.onclick = (e) =>
            LookerCharts.Utils.openDrillMenu({ links: cell.links, event: e });
        }
        tr.appendChild(td);
      });
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
    table.appendChild(tbody);
    container.appendChild(table);

    if (righe.length > limite) {
      const btn = document.createElement("button");
      btn.textContent = "Mostra altre righe (" + limite + " di " + righe.length + ")";
      btn.style.margin = "8px";
      btn.onclick = () => {
        self._limite = limite + (config.max_righe || 500);
        rerender();
      };
      container.appendChild(btn);
    }

    done();
  }
});
