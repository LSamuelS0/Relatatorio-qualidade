(() => {
  "use strict";

  const DATA = window.QUALITY_REPORT_DATA;
  const machines = DATA.machines;
  const partsByCode = new Map(DATA.parts.map(part => [part.code, part]));
  const STOPPED = "MÁQUINA PARADA";
  const SETUP = "SETUP";
  const KEY_DRAFT = "rq.draft.v1";
  const KEY_REPORTS = "rq.reports.v1";

  const $ = id => document.getElementById(id);
  const formatDate = date => new Intl.DateTimeFormat("pt-BR").format(date);
  const formatTime = date => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);

  /* ---------- Conferência do cadastro (avisos no console) ---------- */
  function validateData() {
    const problems = [];
    machines.forEach(machine => {
      machine.items.forEach(label => {
        if (!(label in DATA.items)) problems.push("Máquina " + machine.id + ": item sem cadastro → " + label);
      });
    });
    Object.entries(DATA.items).forEach(([label, codes]) => {
      codes.forEach(code => {
        if (code !== null && !partsByCode.has(code)) problems.push(label + ": código inexistente no catálogo → " + code);
      });
      // Regra da barra: "580/601" só vale para UMA peça física (um código).
      if (/\d\/\d/.test(label) && new Set(codes).size !== 1) {
        problems.push(label + ": usa barra, mas aponta para mais de um código (deveriam ser itens separados)");
      }
    });
    problems.forEach(problem => console.warn("[Cadastro] " + problem));
    return problems;
  }
  validateData();

  /* ---------- Armazenamento no aparelho ---------- */
  function load(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (error) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { return false; }
  }
  function forget(key) {
    try { localStorage.removeItem(key); } catch (error) { /* sem armazenamento */ }
  }

  /* ---------- Rascunho do relatório ---------- */
  let draft = null; // draft.savedId: id do relatório já salvo a partir deste rascunho
  const DRAFT_MAX_HOURS = 8; // rascunho mais velho que isso vira relatório novo

  function newDraft() {
    const selections = {};
    machines.forEach(machine => { selections[machine.id] = STOPPED; });
    draft = { line: "injetora", type: "inicio", startedAt: new Date().toISOString(), selections, savedId: null };
    store(KEY_DRAFT, draft);
  }

  function loadDraft() {
    const saved = load(KEY_DRAFT, null);
    if (saved && saved.selections) {
      draft = saved;
      machines.forEach(machine => {
        const value = draft.selections[machine.id];
        const valid = value === STOPPED || value === SETUP || machine.items.includes(value);
        if (!valid) draft.selections[machine.id] = STOPPED; // peça saiu da máquina no cadastro
      });
      return true;
    }
    return false;
  }

  function kindOf(status) {
    if (status === STOPPED) return "stop";
    if (status === SETUP) return "setup";
    return "run";
  }

  function buildText(report) {
    const started = new Date(report.startedAt);
    const lines = [
      "RELATÓRIO DE INÍCIO DE TURNO DA INJETORA",
      "(FABRICAÇÃO DE PLÁSTICO)",
      "",
      "Data: " + formatDate(started),
      "Horário de início: " + formatTime(started),
      "",
      "MÁQUINAS QUE ESTÃO RODANDO NESTE MOMENTO:",
      ""
    ];
    machines.forEach(machine => {
      lines.push("Máquina " + machine.id + ": " + (report.selections[machine.id] || STOPPED));
    });
    return lines.join("\n");
  }

  function counts(selections) {
    const result = { run: 0, setup: 0, stop: 0 };
    machines.forEach(machine => { result[kindOf(selections[machine.id] || STOPPED)] += 1; });
    return result;
  }

  /* ---------- Navegação ---------- */
  const screens = Array.from(document.querySelectorAll("[data-screen]"));
  function go(name) {
    if (name === "machines" && !draft) newDraft();
    if (name === "done" && !draft) { go("type"); return; }
    screens.forEach(screen => { screen.hidden = screen.dataset.screen !== name; });
    if (name === "home") renderHome();
    if (name === "machines") renderMachines();
    if (name === "done") renderDone();
    if (name === "reports") renderReports();
    window.scrollTo(0, 0);
  }
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-go]");
    if (target) go(target.dataset.go);
  });

  /* ---------- Início ---------- */
  function renderHome() {
    const reports = load(KEY_REPORTS, []);
    if (reports.length) {
      const last = reports[0];
      $("home-reports-title").textContent = reports.length === 1 ? "1 relatório salvo" : reports.length + " relatórios salvos";
      $("home-reports-sub").textContent = "Último: " + whenLabel(new Date(last.startedAt));
    } else {
      $("home-reports-title").textContent = "Nenhum relatório salvo";
      $("home-reports-sub").textContent = "Os relatórios salvos aparecem aqui";
    }
  }

  function whenLabel(date) {
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const same = (a, b) => a.toDateString() === b.toDateString();
    const day = same(date, today) ? "Hoje" : same(date, yesterday) ? "Ontem" : formatDate(date);
    return day + ", " + formatTime(date);
  }

  /* ---------- Tipo de relatório ---------- */
  $("start-turno").addEventListener("click", () => {
    const ageHours = draft ? (Date.now() - new Date(draft.startedAt).getTime()) / 36e5 : Infinity;
    if (!draft || draft.savedId || ageHours > DRAFT_MAX_HOURS) newDraft();
    go("machines");
  });

  /* ---------- Máquinas ---------- */
  function renderMachines() {
    const started = new Date(draft.startedAt);
    $("draft-when").textContent = formatDate(started) + " · " + formatTime(started);
    const total = counts(draft.selections);
    $("count-run").textContent = total.run;
    $("count-setup").textContent = total.setup;
    $("count-stop").textContent = total.stop;

    const list = $("machine-list");
    list.innerHTML = "";
    machines.forEach(machine => {
      const status = draft.selections[machine.id] || STOPPED;
      const kind = kindOf(status);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "machine " + kind;
      button.setAttribute("aria-label", "Máquina " + machine.id + ": " + status);

      const num = document.createElement("span");
      num.className = "machine-num";
      num.textContent = machine.id;

      const text = document.createElement("span");
      text.className = "machine-text";
      const title = document.createElement("strong");
      title.textContent = kind === "run" ? status : kind === "setup" ? "Setup" : "Máquina parada";
      const tag = document.createElement("small");
      tag.textContent = kind === "run" ? "Rodando" : kind === "setup" ? "Em setup" : "Parada";
      text.append(title, tag);

      button.append(num, text, icon("i-next", "chev"));
      button.addEventListener("click", () => openSheet(machine));
      list.appendChild(button);
    });
  }

  function icon(id, className) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    if (className) svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + id);
    svg.appendChild(use);
    return svg;
  }

  $("restart").addEventListener("click", () => {
    if (confirm("Recomeçar o relatório? Todas as máquinas voltam para PARADA e a data/hora é atualizada.")) {
      newDraft();
      renderMachines();
      toast("Relatório recomeçado");
    }
  });

  /* ---------- Janela da máquina ---------- */
  const sheet = $("machine-sheet");
  let sheetMachine = null;
  let sheetChoice = null;

  function openSheet(machine) {
    sheetMachine = machine;
    sheetChoice = draft.selections[machine.id] || STOPPED;
    $("sheet-num").textContent = machine.id;
    $("sheet-title").textContent = "Máquina " + machine.id;

    const parts = $("sheet-parts");
    parts.innerHTML = "";
    machine.items.forEach(label => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "choice";
      option.setAttribute("role", "radio");
      option.dataset.status = label;
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.appendChild(icon("i-check"));
      option.append(dot, document.createTextNode(label));
      parts.appendChild(option);
    });
    paintSheet();
    if (typeof sheet.showModal === "function") sheet.showModal();
    else sheet.setAttribute("open", "");
  }

  function paintSheet() {
    sheet.querySelectorAll("[data-status]").forEach(element => {
      element.setAttribute("aria-checked", String(element.dataset.status === sheetChoice));
    });
  }

  sheet.addEventListener("click", event => {
    const option = event.target.closest("[data-status]");
    if (option) { sheetChoice = option.dataset.status; paintSheet(); return; }
    if (event.target === sheet) sheet.close(); // toque fora da janela
  });

  $("sheet-form").addEventListener("submit", () => {
    if (!sheetMachine) return;
    if (draft.selections[sheetMachine.id] !== sheetChoice) draft.savedId = null;
    draft.selections[sheetMachine.id] = sheetChoice;
    store(KEY_DRAFT, draft);
    renderMachines();
  });

  /* ---------- Relatório pronto ---------- */
  function renderDone() {
    $("done-text").textContent = buildText(draft);
    const saved = Boolean(draft.savedId);
    $("save-label").textContent = saved ? "Relatório salvo" : "Salvar relatório";
    $("save-report").disabled = saved;
    $("new-after-save").hidden = !saved;
  }

  $("save-report").addEventListener("click", () => {
    const reports = load(KEY_REPORTS, []);
    const report = {
      id: String(Date.now()),
      line: draft.line,
      type: draft.type,
      startedAt: draft.startedAt,
      savedAt: new Date().toISOString(),
      selections: { ...draft.selections },
      text: buildText(draft)
    };
    reports.unshift(report);
    if (!store(KEY_REPORTS, reports.slice(0, 200))) {
      toast("Não foi possível salvar neste aparelho");
      return;
    }
    draft.savedId = report.id;
    store(KEY_DRAFT, draft);
    renderDone();
    toast("Relatório salvo");
  });

  $("new-after-save").addEventListener("click", () => {
    forget(KEY_DRAFT);
    draft = null;
    newDraft();
    go("machines");
  });

  /* ---------- Meus relatórios ---------- */
  let viewing = null;

  function renderReports() {
    const reports = load(KEY_REPORTS, []);
    const list = $("report-list");
    list.innerHTML = "";
    if (!reports.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Nenhum relatório salvo ainda. Depois de preencher, toque em “Salvar relatório”.";
      list.appendChild(empty);
      $("report-view").hidden = true;
      return;
    }
    if (!viewing || !reports.some(report => report.id === viewing)) viewing = reports[0].id;
    reports.forEach(report => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "report-item" + (report.id === viewing ? " active" : "");
      const text = document.createElement("span");
      text.className = "row-text";
      const title = document.createElement("strong");
      title.textContent = "Início de turno · Injetora";
      const sub = document.createElement("small");
      sub.textContent = whenLabel(new Date(report.startedAt));
      text.append(title, sub);
      item.append(icon("i-file", "row-icon"), text);
      item.addEventListener("click", () => {
        viewing = report.id;
        renderReports();
        if (window.innerWidth < 900) $("report-view").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      list.appendChild(item);
    });
    const current = reports.find(report => report.id === viewing);
    const total = counts(current.selections);
    $("view-sub").textContent = whenLabel(new Date(current.startedAt)) + " · " + total.run + " rodando · " + total.setup + " setup · " + total.stop + " paradas";
    $("view-text").textContent = current.text;
    $("report-view").hidden = false;
  }

  $("delete-report").addEventListener("click", () => {
    if (!viewing || !confirm("Apagar este relatório deste aparelho?")) return;
    store(KEY_REPORTS, load(KEY_REPORTS, []).filter(report => report.id !== viewing));
    viewing = null;
    renderReports();
    toast("Relatório apagado");
  });

  /* ---------- Copiar e enviar ---------- */
  function textFor(source) {
    return source === "view" ? $("view-text").textContent : $("done-text").textContent;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      return copied;
    }
  }

  document.addEventListener("click", async event => {
    const copy = event.target.closest("[data-copy]");
    if (copy) {
      const ok = await copyText(textFor(copy.dataset.copy));
      toast(ok ? "Copiado! Agora é só colar no Meixin" : "Não deu para copiar. Selecione o texto e copie.");
      return;
    }
    const share = event.target.closest("[data-share]");
    if (share) {
      const text = textFor(share.dataset.share);
      if (navigator.share) {
        try { await navigator.share({ title: "Relatório de Início de Turno da Injetora", text }); }
        catch (error) { if (error && error.name !== "AbortError") toast("Não deu para abrir o envio"); }
      } else {
        const ok = await copyText(text);
        toast(ok ? "Este aparelho não envia direto. O texto foi copiado." : "Não deu para enviar. Selecione o texto e copie.");
      }
    }
  });

  let toastTimer = null;
  function toast(message) {
    const element = $("toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("show"), 2600);
  }

  /* ---------- Começo ---------- */
  loadDraft();
  go("home");
})();
