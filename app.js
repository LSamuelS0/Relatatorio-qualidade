(() => {
  "use strict";

  const DATA = window.QUALITY_REPORT_DATA;
  const machines = DATA.machines;
  const partsByCode = new Map(DATA.parts.map(part => [part.code, part]));
  const STOPPED = "MÁQUINA PARADA";
  const SETUP = "SETUP";
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
  /* ---------- Rascunhos ----------
     Todo relatório começado e ainda não salvo fica em "Rascunhos" (chave rq.drafts.v1),
     seja qual for o tipo. Entra na lista na primeira alteração e sai quando é salvo. */
  const KEY_DRAFTS = "rq.drafts.v1";
  let draft = null; // início de turno em edição
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function listDrafts() {
    return load(KEY_DRAFTS, []).filter(item => item && item.id && (item.type === "inicio" || item.type === "troca"));
  }
  function keepDraft(item) {
    item.savedId = null;
    delete item.pristine;
    item.updatedAt = new Date().toISOString();
    const all = listDrafts().filter(other => other.id !== item.id);
    all.unshift(item);
    store(KEY_DRAFTS, all.slice(0, 50));
  }
  function dropDraft(id) {
    store(KEY_DRAFTS, listDrafts().filter(item => item.id !== id));
  }

  function newDraft() {
    const selections = {};
    machines.forEach(machine => { selections[machine.id] = STOPPED; });
    draft = { id: newId(), line: "injetora", type: "inicio", startedAt: new Date().toISOString(), selections, savedId: null };
  }

  function sanitizeDraft(item) {
    machines.forEach(machine => {
      const value = item.selections[machine.id];
      const valid = value === STOPPED || value === SETUP || machine.items.includes(value);
      if (!valid) item.selections[machine.id] = STOPPED; // peça saiu da máquina no cadastro
    });
    return item;
  }

  /* Versão anterior guardava um rascunho por tipo; passa para a lista de rascunhos. */
  function migrateOldDrafts() {
    const all = listDrafts();
    [load("rq.draft.v1", null), load("rq.shift.v1", null)].forEach(item => {
      if (!item || item.savedId) return;
      const touched = item.type === "troca"
        ? Boolean(item.turno) || Object.values(item.fields || {}).some(value => (value || "").trim())
        : Object.values(item.selections || {}).some(value => value !== STOPPED);
      if (!touched) return;
      item.id = item.id || newId();
      item.updatedAt = item.updatedAt || item.startedAt;
      all.push(item);
    });
    store(KEY_DRAFTS, all);
    forget("rq.draft.v1");
    forget("rq.shift.v1");
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

  /* ---------- Troca de turno (máscara: Alinhamento PQC Injetora) ----------
     A parte fixa da máscara (títulos em português e chinês) nunca muda.
     Só os campos abaixo são preenchidos. */
  const SHIFT_FIELDS = [
    { key: "relatorio", title: "📌RELATÓRIO 报告:" },
    { key: "atencao", title: "⚠️PONTOS DE ATENÇÃO 注意事项:" },
    { key: "pendencias", title: "🚨PENDÊNCIAS 待处理问题:" },
    { key: "bloqueio", title: "🛑STATUS DE BLOQUEIO 封锁状态:" }
  ];
  let shift = null; // rascunho da troca de turno

  const todayKey = () => {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  };
  const dateFromKey = key => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); };

  function newShift() {
    shift = { id: newId(), line: "injetora", type: "troca", startedAt: new Date().toISOString(), date: todayKey(), turno: null,
      fields: { relatorio: "", atencao: "", pendencias: "", bloqueio: "" }, savedId: null };
  }

  function buildShiftText(report) {
    const lines = [
      "Ⓜ️ALINHAMENTO PQC INJETORA | PQC 冲压校准",
      "",
      "DATA 日期: " + formatDate(dateFromKey(report.date)),
      "",
      "TURNO 日期: " + (report.turno || ""),
      ""
    ];
    SHIFT_FIELDS.forEach((field, index) => {
      lines.push(field.title);
      const value = standardize(report.fields[field.key] || "").replace(/\s+$/, "");
      if (value) lines.push(value);
      if (index < SHIFT_FIELDS.length - 1) lines.push("");
    });
    return lines.join("\n");
  }

  function renderShift() {
    $("shift-date").textContent = "Data: " + formatDate(dateFromKey(shift.date));
    document.querySelectorAll("[data-turno]").forEach(button => {
      button.setAttribute("aria-checked", String(button.dataset.turno === shift.turno));
    });
    document.querySelector(".turno-pick").classList.remove("need");
    document.querySelectorAll("[data-field]").forEach(area => { area.value = shift.fields[area.dataset.field] || ""; fit(area); });
    $("block-source").hidden = true;
  }

  $("start-troca").addEventListener("click", () => {
    newShift();
    go("shift");
  });

  document.querySelectorAll("[data-turno]").forEach(button => {
    button.addEventListener("click", () => {
      shift.turno = button.dataset.turno;
      keepDraft(shift);
      renderShift();
    });
  });

  document.querySelectorAll("[data-field]").forEach(area => {
    area.addEventListener("input", () => {
      fit(area);
      shift.fields[area.dataset.field] = area.value;
      keepDraft(shift);
    });
  });

  $("shift-restart").addEventListener("click", () => {
    if (confirm("Limpar todos os campos da troca de turno?")) { dropDraft(shift.id); newShift(); renderShift(); toast("Campos limpos"); }
  });

  /* Caixas de texto crescem com o texto (sem barra de rolagem). */
  function fit(area) {
    area.style.height = "auto";
    area.style.height = area.scrollHeight + 4 + "px";
  }
  // Vale para toda caixa de texto do app, inclusive de máscaras novas.
  /* Padrão de escrita (todas as caixas de texto):
     - tudo em MAIÚSCULAS;
     - toda linha com texto começa com traço "-".
     Roda antes dos outros "input" (captura), para o rascunho já guardar o texto padronizado. */
  function standardLine(line) {
    const upper = line.toLocaleUpperCase("pt-BR");
    return upper.trim() === "" || upper.trimStart().startsWith("-") ? upper : "-" + upper.trimStart();
  }
  function standardize(text) {
    return text.split("\n").map(standardLine).join("\n");
  }

  function applyStandard(area) {
    const before = area.value;
    const after = standardize(before);
    if (after === before) return;
    // recalcula a posição do cursor na linha em que a pessoa está escrevendo
    const caret = area.selectionStart;
    const lines = before.split("\n");
    const prefix = before.slice(0, caret).split("\n");
    const row = prefix.length - 1;
    let position = 0;
    for (let i = 0; i < row; i++) position += standardLine(lines[i]).length + 1;
    const line = lines[row];
    const column = prefix[row].length;
    const addsDash = standardLine(line).length !== line.length || (line.trim() !== "" && !line.trimStart().startsWith("-"));
    if (addsDash) {
      const leading = line.length - line.trimStart().length;
      position += 1 + Math.max(0, column - leading);
    } else {
      position += column;
    }
    area.value = after;
    area.setSelectionRange(position, position);
  }

  let composing = false; // teclado do celular ainda montando a palavra
  document.addEventListener("compositionstart", event => { if (event.target.matches("textarea")) composing = true; }, true);
  document.addEventListener("compositionend", event => {
    if (!event.target.matches("textarea")) return;
    composing = false;
    applyStandard(event.target);
    event.target.dispatchEvent(new Event("input", { bubbles: true }));
  }, true);
  document.addEventListener("input", event => {
    if (!event.target.matches("textarea")) return;
    if (!composing && !event.isComposing) applyStandard(event.target);
    fit(event.target);
  }, true);
  document.addEventListener("blur", event => {
    if (!event.target.matches || !event.target.matches("textarea")) return;
    const old = event.target.value;
    applyStandard(event.target);
    if (event.target.value !== old) event.target.dispatchEvent(new Event("input", { bubbles: true }));
  }, true);
  window.addEventListener("resize", () => document.querySelectorAll("textarea").forEach(fit));

  /* Último status de bloqueio salvo numa troca de turno da Injetora.
     Hoje: relatórios deste aparelho. Com o Firebase: o último salvo por qualquer pessoa. */
  function lastBlockStatus() {
    return load(KEY_REPORTS, [])
      .filter(report => report.type === "troca" && report.line === "injetora" && report.fields && (report.fields.bloqueio || "").trim())
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0] || null;
  }

  $("pull-block").addEventListener("click", () => {
    const last = lastBlockStatus();
    if (!last) { toast("Nenhum status de bloqueio salvo ainda"); return; }
    const area = $("f-bloqueio");
    if (area.value.trim() && area.value.trim() !== last.fields.bloqueio.trim() &&
        !confirm("Substituir o que já está escrito pelo último status de bloqueio?")) return;
    area.value = standardize(last.fields.bloqueio);
    fit(area);
    shift.fields.bloqueio = area.value;
    keepDraft(shift);
    const note = $("block-source");
    note.textContent = "Puxado da troca de turno de " + formatDate(dateFromKey(last.date)) + (last.turno ? " · " + last.turno : "") + ". Atualize o que mudou.";
    note.hidden = false;
    toast("Status de bloqueio carregado");
  });

  $("shift-done").addEventListener("click", () => {
    if (!shift.turno) {
      document.querySelector(".turno-pick").classList.add("need");
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast("Escolha o turno primeiro");
      return;
    }
    active = "troca";
    go("done");
  });

  /* ---------- Salvamento automático no rascunho ----------
     Ao voltar para o início, sair do relatório, fechar ou atualizar a página,
     o relatório aberto e não salvo vai para Rascunhos. */
  function isEmptyShift(item) {
    return !item.turno && !Object.values(item.fields || {}).some(value => (value || "").trim());
  }
  function persistOpen() {
    if (!["machines", "shift", "done"].includes(screenNow)) return;
    const item = screenNow === "machines" ? draft : screenNow === "shift" ? shift : current();
    if (!item || item.savedId || item.pristine) return; // salvo, ou limpo depois de salvar
    if (item.type === "troca" && isEmptyShift(item)) return; // nada escrito ainda
    keepDraft(item);
  }
  window.addEventListener("pagehide", persistOpen);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") persistOpen(); });

  /* ---------- Navegação ---------- */
  let active = "inicio"; // qual relatório a tela "Relatório pronto" mostra
  let screenNow = "home";
  const screens = Array.from(document.querySelectorAll("[data-screen]"));
  function go(name) {
    const editing = ["machines", "shift", "done"];
    if (editing.includes(screenNow) && !editing.includes(name)) persistOpen();
    if (name !== "done") justSaved = null;
    screenNow = name;
    if (name === "machines" && !draft) newDraft();
    if (name === "machines") active = "inicio";
    if (name === "shift" && !shift) newShift();
    if (name === "done" && !(active === "troca" ? shift : draft)) { go("type"); return; }
    screens.forEach(screen => { screen.hidden = screen.dataset.screen !== name; });
    if (name === "home") renderHome();
    if (name === "machines") renderMachines();
    if (name === "shift") renderShift();
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
    renderDrafts();
  }

  function draftSummary(item) {
    if (item.type === "troca") {
      return formatDate(dateFromKey(item.date)) + " · " + (item.turno || "turno não escolhido");
    }
    const total = counts(item.selections);
    return whenLabel(new Date(item.startedAt)) + " · " + total.run + " rodando · " + total.setup + " setup";
  }

  function renderDrafts() {
    const list = $("draft-list");
    const drafts = listDrafts();
    list.innerHTML = "";
    if (!drafts.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Nenhum rascunho. O que você começar e não salvar aparece aqui.";
      list.appendChild(empty);
      return;
    }
    drafts.forEach(item => {
      const row = document.createElement("div");
      row.className = "draft-row";

      const open = document.createElement("button");
      open.type = "button";
      open.className = "row-card draft-open";
      const text = document.createElement("span");
      text.className = "row-text";
      const title = document.createElement("strong");
      title.textContent = titleOf(item);
      const sub = document.createElement("small");
      sub.textContent = draftSummary(item);
      text.append(title, sub);
      open.append(icon("i-edit", "row-icon draft-icon"), text, icon("i-next", "chev"));
      open.addEventListener("click", () => openDraft(item));

      const discard = document.createElement("button");
      discard.type = "button";
      discard.className = "icon-btn discard";
      discard.setAttribute("aria-label", "Descartar rascunho: " + titleOf(item));
      discard.appendChild(icon("i-trash"));
      discard.addEventListener("click", () => {
        if (!confirm("Descartar este rascunho? Ele não poderá ser recuperado.")) return;
        dropDraft(item.id);
        renderDrafts();
        toast("Rascunho descartado");
      });

      row.append(open, discard);
      list.appendChild(row);
    });
  }

  function openDraft(item) {
    if (item.type === "troca") {
      shift = item;
      go("shift");
    } else {
      draft = sanitizeDraft(item);
      go("machines");
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
    newDraft();
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
      dropDraft(draft.id);
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
    if (draft.selections[sheetMachine.id] !== sheetChoice) {
      draft.selections[sheetMachine.id] = sheetChoice;
      keepDraft(draft);
    }
    renderMachines();
  });

  /* ---------- Relatório pronto ---------- */
  const current = () => (active === "troca" ? shift : draft);
  const textOf = report => (report.type === "troca" ? buildShiftText(report) : buildText(report));
  const titleOf = report => (report.type === "troca" ? "Troca de turno" : "Início de turno") + " · Injetora";

  let justSaved = null; // relatório recém-salvo mostrado na tela "Relatório pronto"

  $("done-back").addEventListener("click", () => go(active === "troca" ? "shift" : "machines"));

  function renderDone() {
    const report = current();
    $("done-back-label").textContent = active === "troca" ? "Corrigir relatório" : "Corrigir máquinas";
    $("done-back").hidden = Boolean(justSaved);
    $("done-text").textContent = justSaved ? justSaved.text : textOf(report);
    const saved = Boolean(justSaved);
    $("save-label").textContent = saved ? "Relatório salvo" : "Salvar relatório";
    $("save-report").disabled = saved;
    $("new-after-save").hidden = !saved;
  }

  $("save-report").addEventListener("click", () => {
    const source = current();
    const reports = load(KEY_REPORTS, []);
    const report = {
      id: String(Date.now()),
      line: source.line,
      type: source.type,
      startedAt: source.startedAt,
      savedAt: new Date().toISOString(),
      text: textOf(source)
    };
    if (source.type === "troca") {
      report.date = source.date;
      report.turno = source.turno;
      report.fields = { ...source.fields };
    } else {
      report.selections = { ...source.selections };
    }
    reports.unshift(report);
    if (!store(KEY_REPORTS, reports.slice(0, 200))) {
      toast("Não foi possível salvar neste aparelho");
      return;
    }
    dropDraft(source.id);
    source.savedId = report.id;
    // Depois de salvar, o formulário fica limpo para o próximo relatório.
    justSaved = report;
    if (source.type === "troca") { newShift(); shift.pristine = true; }
    else { newDraft(); draft.pristine = true; }
    renderDone();
    toast("Relatório salvo");
  });

  $("new-after-save").addEventListener("click", () => {
    go(active === "troca" ? "shift" : "machines");
  });

  /* Editar um relatório salvo: vira um rascunho novo; o salvo original não muda. */
  function editSaved(report) {
    const copy = { id: newId(), line: report.line, type: report.type, startedAt: report.startedAt, savedId: null, fromReport: report.id };
    if (report.type === "troca") {
      copy.date = report.date;
      copy.turno = report.turno || null;
      copy.fields = { relatorio: "", atencao: "", pendencias: "", bloqueio: "", ...(report.fields || {}) };
    } else {
      copy.selections = { ...(report.selections || {}) };
    }
    keepDraft(copy);
    toast("Cópia aberta como rascunho. O salvo não muda.");
    openDraft(copy);
  }

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
      title.textContent = titleOf(report);
      const sub = document.createElement("small");
      sub.textContent = report.type === "troca"
        ? formatDate(dateFromKey(report.date)) + (report.turno ? " · " + report.turno : "")
        : whenLabel(new Date(report.startedAt));
      text.append(title, sub);
      item.append(icon("i-file", "row-icon"), text);
      item.addEventListener("click", () => {
        viewing = report.id;
        renderReports();
        if (window.innerWidth < 900) $("report-view").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      list.appendChild(item);
    });
    const shown = reports.find(report => report.id === viewing);
    $("view-title").textContent = titleOf(shown);
    if (shown.type === "troca") {
      $("view-sub").textContent = "Salvo " + whenLabel(new Date(shown.savedAt)).toLowerCase();
    } else {
      const total = counts(shown.selections);
      $("view-sub").textContent = whenLabel(new Date(shown.startedAt)) + " · " + total.run + " rodando · " + total.setup + " setup · " + total.stop + " paradas";
    }
    $("view-text").textContent = shown.text;
    const editable = shown.type === "troca" ? Boolean(shown.fields) : Boolean(shown.selections);
    $("edit-report").hidden = !editable;
    $("report-view").hidden = false;
  }

  $("edit-report").addEventListener("click", () => {
    const shown = load(KEY_REPORTS, []).find(report => report.id === viewing);
    if (shown) editSaved(shown);
  });

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
  migrateOldDrafts();
  go("home");
})();
