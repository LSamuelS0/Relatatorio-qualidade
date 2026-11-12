(() => {
  "use strict";

  const DATA = window.QUALITY_REPORT_DATA;
  const partsByCode = new Map(DATA.parts.map(part => [part.code, part]));

  /* ---------- Linhas de produção ----------
     Cada linha tem o seu cadastro (máquinas e peças) e as suas máscaras.
     Injetora: máquinas numeradas 1–19. Estamparia: máquinas com nome (Balancer 01,
     Prensa Transfer…), definidas em DATA.estamparia. O relatório guarda a linha em "line". */
  const LINES = {
    injetora: { name: "Injetora", sub: "Plástico", machines: DATA.machines, items: DATA.items },
    estamparia: { name: "Estamparia", sub: "Metal", machines: DATA.estamparia.machines, items: DATA.estamparia.items }
  };
  let LINE = "injetora";               // linha escolhida na tela inicial
  let machines = LINES.injetora.machines; // máquinas da linha escolhida
  const lineOf = item => (item && LINES[item.line] ? item.line : "injetora");
  const machinesOf = line => LINES[line && LINES[line] ? line : "injetora"].machines;
  const itemsOf = line => LINES[line && LINES[line] ? line : "injetora"].items;
  const mName = machine => machine.name || "Máquina " + machine.id;
  const mBadge = machine => machine.badge || String(machine.id);
  function setLine(line) {
    LINE = LINES[line] ? line : "injetora";
    machines = LINES[LINE].machines;
    document.querySelectorAll("[data-line-name]").forEach(element => { element.textContent = LINES[LINE].name; });
    document.querySelectorAll("[data-line-upper]").forEach(element => { element.textContent = LINES[LINE].name.toLocaleUpperCase("pt-BR"); });
  }

  /* ---------- Cadastro de cada linha ----------
     Base: data.js. O administrador pode publicar outra versão na nuvem
     (cadastro/injetora e cadastro/estamparia), que substitui máquinas e itens para todos
     e pode acrescentar peças novas ao catálogo (extraParts).
     Cópia no aparelho: rq.cadastro.v1 (Injetora) e rq.cadastro.est.v1 (Estamparia). */
  const KEY_CADASTRO = { injetora: "rq.cadastro.v1", estamparia: "rq.cadastro.est.v1" };
  const clone = value => JSON.parse(JSON.stringify(value));
  const BASE = {
    parts: clone(DATA.parts),
    injetora: { machines: clone(LINES.injetora.machines), items: clone(LINES.injetora.items) },
    estamparia: { machines: clone(LINES.estamparia.machines), items: clone(LINES.estamparia.items) }
  };
  const EXTRA = { injetora: [], estamparia: [] }; // peças novas publicadas pelo ADM em cada linha

  function currentCadastro(line) {
    return clone({ machines: machinesOf(line), items: itemsOf(line), extraParts: EXTRA[line] || [] });
  }

  function applyCadastro(cad, line) {
    line = LINES[line] ? line : "injetora";
    const target = LINES[line];
    const source = cad && Array.isArray(cad.machines) && cad.items ? cad : { machines: BASE[line].machines, items: BASE[line].items, extraParts: [] };
    target.machines.splice(0, target.machines.length, ...clone(source.machines));
    Object.keys(target.items).forEach(key => delete target.items[key]);
    Object.assign(target.items, clone(source.items));
    EXTRA[line] = clone(source.extraParts || []).filter(part => part && part.code);
    DATA.parts.splice(0, DATA.parts.length, ...clone(BASE.parts));
    EXTRA.injetora.concat(EXTRA.estamparia).forEach(part => {
      if (!DATA.parts.some(other => other.code === part.code)) DATA.parts.push(part);
    });
    partsByCode.clear();
    DATA.parts.forEach(part => partsByCode.set(part.code, part));
    if (typeof refreshProducts === "function") refreshProducts();
  }

  /* ---------- Máscaras (textos fixos dos relatórios) ----------
     Padrão abaixo; o ADM pode publicar outra versão (cadastro/mascaras). Só os
     textos mudam: a ordem, os campos e as regras de formatação continuam no código.
     Cópia no aparelho: rq.mascaras.v1. */
  const KEY_MASKS = "rq.mascaras.v1";
  const MASK_DEFAULTS = {
    inicio: {
      titulo: "RELATÓRIO DE FUNCIONAMENTO DE MÁQUINAS DA INJETORA",
      subtitulo: "(FABRICAÇÃO DE PLÁSTICO)",
      data: "Data:",
      turno: "Turno:",
      rodando: "Máquinas rodando:",
      setup: "Máquinas em setup:",
      paradas: "Máquinas paradas:",
      lista: "MÁQUINAS QUE ESTÃO RODANDO NESTE MOMENTO:",
      maquina: "Máquina"
    },
    troca: {
      cabecalho: "Ⓜ️ALINHAMENTO PQC INJETORA | PQC 冲压校准",
      data: "DATA 日期:",
      turno: "TURNO 日期:",
      relatorio: "📌RELATÓRIO 报告:",
      atencao: "⚠️PONTOS DE ATENÇÃO 注意事项:",
      pendencias: "🚨PENDÊNCIAS 待处理问题:",
      bloqueio: "🛑STATUS DE BLOQUEIO 封锁状态:",
      vazio: "- N/A"
    },
    bloqueio: {
      cabecalho: "🔒BLOQUEIO INJETORA | 封锁警报 🔒",
      dataProducao: "DATA DA PRODUÇÃO 生产日期:",
      codigo: "CÓDIGO DO MATERIAL 物料编码:",
      motivo: "MOTIVO 问题描述:",
      quantidade: "QUANTIDADE 数量:",
      responsavel: "RESPONSÁVEL 责任部门:",
      criticidade: "CRITICIDADE 关键性:",
      scrap: "SCRAP 废料:",
      posicao: "POSIÇÃO 物料所在位置:",
      helpChain: "HELP CHAIN帮助链:",
      conforme: "CONFORME: ✅",
      naoConforme: "NÃO CONFORME: ❌",
      localizacao: "LOCALIZAÇÃO: 📍"
    },
    /* ---- Estamparia: mesmos formatos da Injetora, textos próprios ---- */
    inicio_est: {
      titulo: "RELATÓRIO DE FUNCIONAMENTO DE MÁQUINAS DA ESTAMPARIA",
      subtitulo: "(FABRICAÇÃO DE METAL)",
      data: "Data:",
      turno: "Turno:",
      rodando: "Máquinas rodando:",
      setup: "Máquinas em setup:",
      paradas: "Máquinas paradas:",
      lista: "MÁQUINAS QUE ESTÃO RODANDO NESTE MOMENTO:"
    },
    troca_est: {
      cabecalho: "Ⓜ️ALINHAMENTO PQC ESTAMPARIA | PQC 冲压校准",
      data: "DATA 日期:",
      turno: "TURNO 日期:",
      relatorio: "📌RELATÓRIO 报告:",
      atencao: "⚠️PONTOS DE ATENÇÃO 注意事项:",
      pendencias: "🚨PENDÊNCIAS 待处理问题:",
      bloqueio: "🛑STATUS DE BLOQUEIO 封锁状态:",
      vazio: "- N/A"
    },
    bloqueio_est: {
      cabecalho: "🔒BLOQUEIO ESTAMPARIA | 封锁警报 🔒",
      dataProducao: "DATA DA PRODUÇÃO 生产日期:",
      codigo: "CÓDIGO DO MATERIAL 物料编码:",
      motivo: "MOTIVO 问题描述:",
      quantidade: "QUANTIDADE 数量:",
      responsavel: "RESPONSÁVEL 责任部门:",
      criticidade: "CRITICIDADE 关键性:",
      scrap: "SCRAP 废料:",
      posicao: "POSIÇÃO 物料所在位置:",
      helpChain: "HELP CHAIN帮助链:",
      conforme: "CONFORME: ✅",
      naoConforme: "NÃO CONFORME: ❌",
      localizacao: "LOCALIZAÇÃO: 📍"
    },
    /* ---- Parada de máquina: a mesma máscara para as duas linhas (oficial, enviada pelo dono em 12/11/2026) ---- */
    parada: {
      cabecalho: "🚨ALERTA PARADA DE MÁQUINA PQC | 机器停止警报 PQC🚨",
      maquina: "MÁQUINA 机器:",
      horario: "HORÁRIO 时间:",
      motivo: "MOTIVO 问题描述:",
      solicitante: "SOLICITANTE 请求者:",
      helpChain: "HELP CHAIN帮助链:"
    }
  };
  // Em qual linha cada máscara vale (o editor do ADM mostra só as da área escolhida)
  const MASK_LINE = { inicio: "injetora", troca: "injetora", bloqueio: "injetora",
    inicio_est: "estamparia", troca_est: "estamparia", bloqueio_est: "estamparia", parada: "ambas" };
  // Chave da máscara de um tipo de relatório numa linha: troca + estamparia → troca_est
  const mk = (type, line) => (type === "parada" ? "parada" : line === "estamparia" ? type + "_est" : type);
  // Nome de cada texto no editor do administrador
  const MASK_LABELS = {
    inicio: { name: "Funcionamento de máquinas", titulo: "Título", subtitulo: "Linha abaixo do título", data: "Data", turno: "Turno",
      rodando: "Quantidade rodando", setup: "Quantidade em setup", paradas: "Quantidade paradas", lista: "Título da lista de máquinas", maquina: "Palavra antes do número da máquina" },
    troca: { name: "Troca de turno", cabecalho: "Cabeçalho", data: "Data", turno: "Turno", relatorio: "Título: Relatório", atencao: "Título: Pontos de atenção",
      pendencias: "Título: Pendências", bloqueio: "Título: Status de bloqueio", vazio: "Texto quando Pontos de atenção/Pendências ficam vazios" },
    bloqueio: { name: "Bloqueio", cabecalho: "Cabeçalho", dataProducao: "Data da produção", codigo: "Código do material", motivo: "Motivo", quantidade: "Quantidade",
      responsavel: "Responsável", criticidade: "Criticidade", scrap: "Scrap", posicao: "Posição", helpChain: "Help chain",
      conforme: "Título da foto: Conforme", naoConforme: "Título da foto: Não conforme", localizacao: "Título das fotos: Localização" },
    parada: { name: "Parada de máquina", cabecalho: "Cabeçalho", maquina: "Máquina", horario: "Horário", motivo: "Motivo", solicitante: "Solicitante", helpChain: "Help chain" }
  };
  // Estamparia usa os mesmos nomes de campo da Injetora
  MASK_LABELS.inicio_est = { ...MASK_LABELS.inicio };
  delete MASK_LABELS.inicio_est.maquina;
  MASK_LABELS.troca_est = { ...MASK_LABELS.troca };
  MASK_LABELS.bloqueio_est = { ...MASK_LABELS.bloqueio };
  const MASK = clone(MASK_DEFAULTS);
  function applyMasks(published) {
    Object.keys(MASK_DEFAULTS).forEach(type => {
      MASK[type] = { ...MASK_DEFAULTS[type], ...((published && published[type]) || {}) };
    });
  }

  /* Confere um cadastro antes de publicar (mesmas regras do validateData). */
  function validateCadastro(cad) {
    const problems = [];
    const codes = new Set(BASE.parts.map(part => part.code).concat((cad.extraParts || []).map(part => part.code)));
    EXTRA.injetora.concat(EXTRA.estamparia).forEach(part => codes.add(part.code));
    cad.machines.forEach(machine => machine.items.forEach(label => {
      if (!(label in cad.items)) problems.push(mName(machine) + ": peça sem cadastro → " + label);
    }));
    Object.entries(cad.items).forEach(([label, list]) => {
      list.forEach(code => { if (code !== null && !codes.has(code)) problems.push(label + ": código sem cadastro → " + code); });
      if (/\d\/\d/.test(label) && new Set(list).size !== 1) problems.push(label + ": usa barra, mas tem mais de um código");
    });
    return problems;
  }
  const STOPPED = "MÁQUINA PARADA";
  const SETUP = "SETUP";
  const KEY_REPORTS = "rq.reports.v1";

  const $ = id => document.getElementById(id);
  const formatDate = date => new Intl.DateTimeFormat("pt-BR").format(date);
  const formatTime = date => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);

  /* ---------- Conferência do cadastro (avisos no console) ---------- */
  function validateData() {
    const problems = [];
    Object.entries(LINES).forEach(([line, info]) => {
      info.machines.forEach(machine => {
        machine.items.forEach(label => {
          if (!(label in info.items)) problems.push(info.name + " · " + mName(machine) + ": item sem cadastro → " + label);
        });
      });
      Object.entries(info.items).forEach(([label, codes]) => {
        codes.forEach(code => {
          if (code !== null && !partsByCode.has(code)) problems.push(info.name + " · " + label + ": código inexistente no catálogo → " + code);
        });
        // Regra da barra: "580/601" só vale para UMA peça física (um código).
        if (/\d\/\d/.test(label) && new Set(codes).size !== 1) {
          problems.push(info.name + " · " + label + ": usa barra, mas aponta para mais de um código (deveriam ser itens separados)");
        }
      });
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
    return load(KEY_DRAFTS, []).filter(item => item && item.id && ["inicio", "troca", "bloqueio", "parada"].includes(item.type));
  }
  function keepDraft(item) {
    item.savedId = null;
    delete item.pristine;
    item.updatedAt = new Date().toISOString();
    const all = listDrafts().filter(other => other.id !== item.id);
    all.unshift(item);
    store(KEY_DRAFTS, all.slice(0, 50));
    queuePush("d", item.id);
  }
  function dropDraft(id) {
    store(KEY_DRAFTS, listDrafts().filter(item => item.id !== id));
    queueDelete("d", id);
  }

  function newDraft() {
    const selections = {};
    machines.forEach(machine => { selections[machine.id] = STOPPED; });
    draft = { id: newId(), line: LINE, type: "inicio", startedAt: new Date().toISOString(), turno: null, selections, savedId: null };
  }

  function sanitizeDraft(item) {
    machinesOf(lineOf(item)).forEach(machine => {
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
    const line = lineOf(report);
    const M = MASK[mk("inicio", line)];
    const total = counts(report.selections, line);
    const lines = [
      M.titulo,
      M.subtitulo,
      "",
      M.data + " " + formatDate(started),
      M.turno + " " + (report.turno || ""),
      "",
      M.rodando + " " + total.run,
      M.setup + " " + total.setup,
      M.paradas + " " + total.stop,
      "",
      M.lista,
      ""
    ].filter((text, index) => !(index === 1 && !text.trim()));
    machinesOf(line).forEach(machine => {
      // Injetora: "Máquina 7: ..." · Estamparia: o nome da máquina ("Balancer 01: ...")
      const name = machine.name || M.maquina + " " + machine.id;
      lines.push(name + ": " + (report.selections[machine.id] || STOPPED));
    });
    return lines.join("\n");
  }

  function counts(selections, line) {
    const result = { run: 0, setup: 0, stop: 0 };
    machinesOf(line || LINE).forEach(machine => { result[kindOf(selections[machine.id] || STOPPED)] += 1; });
    return result;
  }

  /* ---------- Troca de turno (máscara: Alinhamento PQC Injetora) ----------
     A parte fixa da máscara (títulos em português e chinês) nunca muda.
     Só os campos abaixo são preenchidos. */
  const SHIFT_FIELDS = [
    { key: "relatorio" },
    { key: "atencao" },
    { key: "pendencias" },
    { key: "bloqueio" }
  ];
  let shift = null; // rascunho da troca de turno

  const todayKey = () => {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  };
  const dateFromKey = key => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); };

  /* Marcações automáticas: um relatório novo já vem com as pessoas marcadas no último
     relatório salvo do MESMO tipo (troca → marcações; bloqueio → help chain).
     A pessoa só acrescenta ou tira quem mudou. Hoje: relatórios deste aparelho;
     com o Firebase: os últimos salvos pela própria pessoa. */
  function lastTags(type, key, line) {
    const last = load(KEY_REPORTS, [])
      .filter(report => report.type === type && lineOf(report) === (line || LINE) && report.fields && (report.fields[key] || "").trim())
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0];
    return last ? last.fields[key] : "";
  }

  function newShift() {
    shift = { id: newId(), line: LINE, type: "troca", startedAt: new Date().toISOString(), date: todayKey(), turno: null,
      fields: { relatorio: "", atencao: "", pendencias: "", bloqueio: "", marcacoes: lastTags("troca", "marcacoes", LINE) }, savedId: null };
  }

  function buildShiftText(report) {
    const T = MASK[mk("troca", lineOf(report))];
    const lines = [
      T.cabecalho,
      "",
      T.data + " " + formatDate(dateFromKey(report.date)),
      "",
      T.turno + " " + (report.turno || ""),
      ""
    ];
    SHIFT_FIELDS.forEach((field, index) => {
      lines.push(T[field.key]);
      let value = standardize(report.fields[field.key] || "").split("\n")
        .filter(line => line.trim() !== "-").join("\n").replace(/\s+$/, "").replace(/^\s*\n/, "");
      // Pontos de atenção e Pendências vazios saem como "- N/A"
      if (!value && (field.key === "atencao" || field.key === "pendencias")) value = T.vazio;
      // linha em branco entre o título e o texto (o texto não fica grudado no título)
      if (value) lines.push("", value);
      if (index < SHIFT_FIELDS.length - 1) lines.push("");
    });
    // Marcações (@ dos colaboradores): no final, sem título, do jeito que foi escrito
    const tags = (report.fields.marcacoes || "").toLocaleUpperCase("pt-BR").trim();
    if (tags) lines.push("", tags);
    return lines.join("\n");
  }

  const OLD_TURNO = { "1º TURNO": "T1", "2º TURNO": "T2", "3º TURNO": "T3" }; // nomes da versão anterior

  function renderShift() {
    if (OLD_TURNO[shift.turno]) shift.turno = OLD_TURNO[shift.turno];
    setLine(lineOf(shift));
    $("shift-date").textContent = LINES[LINE].name + " · " + formatDate(dateFromKey(shift.date));
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
  // Padrão: "- TEXTO EM MAIÚSCULAS" (traço, espaço, texto). Acentos mantidos.
  const contentStart = line => { const m = line.match(/^\s*(-\s*)?/); return m ? m[0].length : 0; };
  function standardLine(line) {
    const upper = line.toLocaleUpperCase("pt-BR");
    const content = upper.slice(contentStart(upper));
    if (content.trim() === "") return upper; // linha vazia ou só o traço: deixa como está
    return "- " + content;
  }
  function standardize(text) {
    return text.split("\n").map(standardLine).join("\n");
  }

  function applyStandard(area) {
    if (area.dataset.nodash) {
      const caret = area.selectionStart;
      const upper = area.value.toLocaleUpperCase("pt-BR");
      if (upper !== area.value) { area.value = upper; area.setSelectionRange(caret, caret); }
      return;
    }
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
    const fixed = standardLine(line);
    const column = prefix[row].length;
    if (fixed === line.toLocaleUpperCase("pt-BR")) {
      position += column;
    } else {
      const oldStart = contentStart(line);
      position += 2 + Math.max(0, column - oldStart);
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
  function lastBlockStatus(line) {
    return load(KEY_REPORTS, [])
      .filter(report => report.type === "troca" && lineOf(report) === line && report.fields && (report.fields.bloqueio || "").trim())
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0] || null;
  }

  $("pull-block").addEventListener("click", async () => {
    const line = lineOf(shift);
    let last = lastBlockStatus(line);
    if (cloudOk()) {
      try {
        const shared = await Cloud.getLastBlock(line);
        if (shared && shared.fields && (!last || String(shared.savedAt) > String(last.savedAt))) last = shared;
      } catch (error) { /* sem internet: usa o do aparelho */ }
    }
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

  /* ---------- Fotos (guardadas no aparelho, IndexedDB) ----------
     Cada foto é reduzida (máx. 1600 px, JPEG) e guardada com um id.
     Rascunhos e relatórios guardam só o id. */
  const PHOTO_DB = "rq-photos";
  let photoDb = null;
  const photoUrls = new Map();

  function openPhotoDb() {
    if (photoDb) return photoDb;
    photoDb = new Promise((resolve, reject) => {
      const request = indexedDB.open(PHOTO_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("photos");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return photoDb;
  }
  async function photoTx(mode, work) {
    const db = await openPhotoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("photos", mode);
      const result = work(tx.objectStore("photos"));
      tx.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
      tx.onerror = () => reject(tx.error);
    });
  }
  const putPhoto = (id, blob) => photoTx("readwrite", store => store.put(blob, id));
  const getPhoto = id => photoTx("readonly", store => store.get(id));
  const deletePhoto = id => photoTx("readwrite", store => store.delete(id));
  const allPhotoIds = () => photoTx("readonly", store => store.getAllKeys());

  async function photoUrl(id) {
    if (!id) return null;
    if (photoUrls.has(id)) return photoUrls.get(id);
    const blob = await getPhoto(id).catch(() => null);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    photoUrls.set(id, url);
    return url;
  }

  async function shrinkPhoto(file) {
    const max = 1600;
    let source;
    try { source = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (error) {
      source = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
    }
    const width = source.width, height = source.height;
    const scale = Math.min(1, max / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
    const encode = quality => new Promise(resolve => canvas.toBlob(blob => resolve(blob), "image/jpeg", quality));
    // cada foto precisa caber num documento do banco: abaixo de ~700 KB
    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
      const blob = await encode(quality);
      if (blob && blob.size <= 700000) return blob;
    }
    const small = document.createElement("canvas");
    small.width = Math.round(canvas.width * 0.6);
    small.height = Math.round(canvas.height * 0.6);
    small.getContext("2d").drawImage(canvas, 0, 0, small.width, small.height);
    return new Promise(resolve => small.toBlob(blob => resolve(blob || file), "image/jpeg", 0.6));
  }

  /* Localização aceita várias fotos (lista); Conforme e Não conforme, uma só. */
  const MULTI_PHOTO = new Set(["localizacao"]);
  function idsOf(report, key) {
    const value = report && report.photos ? report.photos[key] : null;
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  }
  const allIdsOf = report => (report && report.photos ? Object.keys(report.photos).flatMap(key => idsOf(report, key)) : []);

  /* Apaga fotos que nenhum rascunho ou relatório usa mais. */
  async function cleanPhotos() {
    try {
      const used = new Set();
      const collect = item => allIdsOf(item).forEach(id => used.add(id));
      listDrafts().forEach(collect);
      load(KEY_REPORTS, []).forEach(collect);
      collect(block);
      const ids = await allPhotoIds();
      await Promise.all((ids || []).filter(id => !used.has(id)).map(id => deletePhoto(id)));
    } catch (error) { /* sem IndexedDB: nada a limpar */ }
  }

  /* ---------- Bloqueio (máscara: Bloqueio Injetora) ----------
     A parte fixa (títulos em português e chinês) nunca muda; só os campos são preenchidos. */
  const BLOCK_FIELDS = [
    { key: "dataProducao" },
    { key: "codigo" },
    { key: "motivo", multi: true },
    { key: "quantidade" },
    { key: "responsavel" },
    { key: "criticidade" },
    { key: "scrap" },
    { key: "posicao" },
    { key: "helpChain" }
  ];
  const PHOTO_BLOCKS = [
    { key: "conforme" },
    { key: "naoConforme" },
    { key: "localizacao" }
  ];
  let block = null; // bloqueio em edição

  function newBlock() {
    const fields = {};
    BLOCK_FIELDS.forEach(field => { fields[field.key] = ""; });
    fields.dataProducao = todayKey();
    fields.helpChain = lastTags("bloqueio", "helpChain", LINE) || (DATA.helpChainDefault || []).join(" ").toLocaleUpperCase("pt-BR");
    block = { id: newId(), line: LINE, type: "bloqueio", startedAt: new Date().toISOString(), fields,
      photos: { conforme: null, naoConforme: null, localizacao: [] }, savedId: null };
  }

  function cleanMulti(text) {
    return standardize(text || "").split("\n").filter(line => line.trim() !== "-").join("\n").replace(/\s+$/, "").replace(/^\s*\n/, "");
  }

  function buildBlockText(report) {
    const B = MASK[mk("bloqueio", lineOf(report))];
    const lines = [B.cabecalho, ""];
    BLOCK_FIELDS.forEach((field, index) => {
      let value = report.fields[field.key] || "";
      if (field.key === "dataProducao") value = value ? formatDate(dateFromKey(value)) : "";
      if (field.multi) {
        const multi = cleanMulti(value);
        lines.push(B[field.key]);
        if (multi) lines.push(multi);
      } else {
        value = value.toLocaleUpperCase("pt-BR").trim();
        lines.push(B[field.key] + (value ? " " + value : " "));
      }
      if (index < BLOCK_FIELDS.length - 1) lines.push("");
    });
    return lines.join("\n");
  }

  function isEmptyBlock(item) {
    // data e help chain vêm preenchidos sozinhos: não contam como "começou a preencher"
    const fields = Object.entries(item.fields || {}).some(([key, value]) =>
      key !== "dataProducao" && key !== "helpChain" && (value || "").trim());
    const photos = allIdsOf(item).length > 0;
    return !fields && !photos;
  }

  /* Escolher produto: lista do catálogo da CTQ que filtra enquanto a pessoa escreve.
     Valor gravado: "CÓDIGO - NOME" (ou o texto que a pessoa escreveu). */
  /* Injetora: catálogo da CTQ. Estamparia: as peças cadastradas na Estamparia
     (com o código, quando houver). */
  const PRODUCTS = [];
  function refreshProducts() {
    PRODUCTS.splice(0, PRODUCTS.length, ...DATA.parts.map(part => ({ code: part.code, name: part.name.toLocaleUpperCase("pt-BR"),
      label: part.code + " - " + part.name.toLocaleUpperCase("pt-BR") })));
  }
  function productsFor(line) {
    if (line !== "estamparia") return PRODUCTS;
    return Object.keys(itemsOf("estamparia")).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })).map(label => {
      const codes = itemsOf("estamparia")[label].filter(Boolean);
      const name = label.toLocaleUpperCase("pt-BR");
      return { code: codes.join(" / ") || "sem código", name, label: codes.length ? codes.join(" / ") + " - " + name : name };
    });
  }
  refreshProducts();
  const plain = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const productSheet = $("product-sheet");

  function renderProductPick() {
    const label = $("pick-product-label");
    label.textContent = block.fields.codigo || "Escolher produto";
    label.classList.toggle("pick-empty", !block.fields.codigo);
  }

  function setProduct(value) {
    block.fields.codigo = value;
    keepDraft(block);
    renderProductPick();
    productSheet.close();
  }

  function renderProductList() {
    const query = plain($("product-search").value.trim());
    const words = query.split(/\s+/).filter(Boolean);
    const list = $("product-list");
    list.innerHTML = "";
    const found = productsFor(lineOf(block)).filter(item => words.every(word => plain(item.label).includes(word)));
    found.forEach(item => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "product-option";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(block.fields.codigo === item.label));
      const name = document.createElement("strong");
      name.textContent = item.name;
      const code = document.createElement("small");
      code.textContent = item.code;
      option.append(name, code);
      option.addEventListener("click", () => setProduct(item.label));
      list.appendChild(option);
    });
    const typed = $("product-search").value.trim().toLocaleUpperCase("pt-BR");
    if (typed && !found.some(item => item.label === typed)) {
      const custom = document.createElement("button");
      custom.type = "button";
      custom.className = "product-option custom";
      const title = document.createElement("strong");
      title.textContent = "Usar o que escrevi: " + typed;
      const hint = document.createElement("small");
      hint.textContent = found.length ? "Se o produto não está na lista" : "Nenhum produto encontrado na lista";
      custom.append(title, hint);
      custom.addEventListener("click", () => setProduct(typed));
      list.appendChild(custom);
    }
  }

  $("pick-product").addEventListener("click", () => {
    $("product-search").value = "";
    renderProductList();
    if (typeof productSheet.showModal === "function") productSheet.showModal();
    else productSheet.setAttribute("open", "");
    $("product-search").focus();
  });
  $("product-search").addEventListener("input", renderProductList);
  $("product-close").addEventListener("click", () => productSheet.close());
  productSheet.addEventListener("click", event => { if (event.target === productSheet) productSheet.close(); });

  async function renderBlock() {
    setLine(lineOf(block));
    document.querySelectorAll("[data-bfield]").forEach(input => {
      input.value = block.fields[input.dataset.bfield] || "";
      if (input.tagName === "TEXTAREA") fit(input);
    });
    paintChoices();
    renderProductPick();
    for (const slot of PHOTO_BLOCKS) await renderPhotoSlot(slot.key);
  }

  async function renderPhotoSlot(key) {
    if (MULTI_PHOTO.has(key)) return renderGallery(key);
    const slot = document.querySelector('[data-photo="' + key + '"]');
    const url = await photoUrl(block.photos[key]);
    slot.querySelector(".photo-add").hidden = Boolean(url);
    const preview = slot.querySelector(".photo-preview");
    preview.hidden = !url;
    if (url) preview.querySelector("img").src = url;
  }

  async function renderGallery(key) {
    const ids = idsOf(block, key);
    const gallery = $("location-gallery");
    gallery.innerHTML = "";
    for (const [index, id] of ids.entries()) {
      const url = await photoUrl(id);
      if (!url) continue;
      const figure = document.createElement("figure");
      figure.className = "gallery-item";
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Localização, foto " + (index + 1);
      const caption = document.createElement("figcaption");
      const label = document.createElement("span");
      label.textContent = "Foto " + (index + 1) + " de " + ids.length;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn-quiet danger btn-small";
      remove.append(icon("i-trash"), document.createTextNode("Remover"));
      remove.addEventListener("click", async () => {
        block.photos[key] = idsOf(block, key).filter(other => other !== id);
        keepDraft(block);
        await renderGallery(key);
        cleanPhotos();
      });
      caption.append(label, remove);
      figure.append(img, caption);
      gallery.appendChild(figure);
    }
    $("location-add-label").textContent = ids.length ? "Adicionar mais fotos" : "Adicionar foto";
  }

  $("start-bloqueio").addEventListener("click", () => {
    newBlock();
    go("block");
  });

  document.querySelectorAll("[data-bfield]").forEach(input => {
    input.addEventListener("input", () => {
      if (input.tagName === "INPUT" && input.type !== "date") {
        const caret = input.selectionStart;
        const upper = input.value.toLocaleUpperCase("pt-BR");
        if (upper !== input.value) { input.value = upper; input.setSelectionRange(caret, caret); }
      }
      block.fields[input.dataset.bfield] = input.value;
      keepDraft(block);
    });
  });

  /* Botões de escolha (Criticidade, Scrap): tocar de novo desmarca. */
  function paintChoices() {
    document.querySelectorAll("[data-choice]").forEach(button => {
      button.setAttribute("aria-checked", String(block.fields[button.dataset.choice] === button.dataset.value));
    });
  }
  document.querySelectorAll("[data-choice]").forEach(button => {
    button.addEventListener("click", () => {
      const key = button.dataset.choice;
      block.fields[key] = block.fields[key] === button.dataset.value ? "" : button.dataset.value;
      keepDraft(block);
      paintChoices();
    });
  });

  document.querySelectorAll("[data-photo-input]").forEach(input => {
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      input.value = "";
      if (!files.length) return;
      const key = input.dataset.photoInput;
      const multi = MULTI_PHOTO.has(key);
      toast(files.length > 1 ? "Guardando as fotos…" : "Guardando a foto…");
      try {
        const added = [];
        for (const file of (multi ? files : files.slice(0, 1))) {
          const blob = await shrinkPhoto(file);
          const id = newId();
          await putPhoto(id, blob);
          added.push(id);
        }
        // Localização: soma as fotos. Conforme / Não conforme: a nova substitui a anterior.
        block.photos[key] = multi ? idsOf(block, key).concat(added) : added[0];
        keepDraft(block);
        await renderPhotoSlot(key);
        cleanPhotos();
        toast(added.length > 1 ? added.length + " fotos adicionadas" : "Foto adicionada");
      } catch (error) {
        toast("Não deu para guardar a foto neste aparelho");
      }
    });
  });

  document.querySelectorAll("[data-photo-change]").forEach(button => {
    button.addEventListener("click", () => document.querySelector('[data-photo-input="' + button.dataset.photoChange + '"]').click());
  });
  document.querySelectorAll("[data-photo-remove]").forEach(button => {
    button.addEventListener("click", async () => {
      const key = button.dataset.photoRemove;
      block.photos[key] = null;
      keepDraft(block);
      await renderPhotoSlot(key);
      cleanPhotos();
    });
  });

  $("block-restart").addEventListener("click", () => {
    if (!confirm("Limpar todos os campos e fotos do bloqueio?")) return;
    dropDraft(block.id);
    newBlock();
    renderBlock();
    cleanPhotos();
    toast("Campos limpos");
  });

  $("block-done").addEventListener("click", () => {
    active = "bloqueio";
    go("done");
  });

  /* ---------- Máquinas em botões (Parada de máquina e Ocorrências) ----------
     Injetora: números 1–19. Estamparia: nome da máquina, em grupos. */
  const machineLabel = (line, id) => {
    const machine = machinesOf(line).find(other => String(other.id) === String(id));
    return machine ? mName(machine) : id ? "Máquina " + id : "—";
  };
  function fillMachineGrid(grid, line, selected, onPick) {
    grid.innerHTML = "";
    const list = machinesOf(line);
    const named = list.some(machine => machine.name);
    grid.classList.toggle("named", named);
    let group = null;
    list.forEach(machine => {
      if (named && machine.group && machine.group !== group) {
        group = machine.group;
        const head = document.createElement("span");
        head.className = "occ-group";
        head.textContent = group;
        grid.appendChild(head);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "occ-machine";
      button.textContent = machine.name || machine.id;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-label", mName(machine));
      button.setAttribute("aria-checked", String(String(selected) === String(machine.id)));
      button.addEventListener("click", () => onPick(machine));
      grid.appendChild(button);
    });
  }
  function fillPartChoices(container, machine, selected, onPick, noneLabel) {
    container.innerHTML = "";
    if (!machine) return;
    machine.items.concat([noneLabel]).forEach(label => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "choice";
      option.setAttribute("role", "radio");
      option.setAttribute("aria-checked", String(selected === label));
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.appendChild(icon("i-check"));
      option.append(dot, document.createTextNode(label));
      option.addEventListener("click", () => onPick(label));
      container.appendChild(option);
    });
  }

  /* ---------- Parada de máquina ----------
     Mesma máscara (MASK.parada) para Injetora e Estamparia; as caixas de máquina e de
     peça mostram o cadastro da linha do relatório. No texto, a peça vai junto da máquina:
     "MÁQUINA 机器: PRENSA TRANSFER - CHAPA DO GABINETE 580 COM CANALETA".
     Horário começa com a hora atual; help chain vem da última parada salva da mesma linha. */
  const NO_PART = "Nenhuma peça";
  let parada = null;
  const nowTime = () => formatTime(new Date());

  function newParada() {
    parada = { id: newId(), line: LINE, type: "parada", startedAt: new Date().toISOString(), date: todayKey(),
      machine: null, part: null,
      fields: { horario: nowTime(), motivo: "", solicitante: "", helpChain: lastTags("parada", "helpChain", LINE) }, savedId: null };
  }

  function isEmptyParada(item) {
    const fields = item.fields || {};
    return !item.machine && !["motivo", "solicitante"].some(key => (fields[key] || "").trim());
  }

  function buildParadaText(report) {
    const P = MASK.parada;
    const line = lineOf(report);
    const fields = report.fields || {};
    const up = text => String(text || "").toLocaleUpperCase("pt-BR").trim();
    let machine = report.machine ? up(machineLabel(line, report.machine)) : "";
    if (machine && report.part && report.part !== NO_PART) machine += " - " + up(report.part);
    const single = (title, value) => title + (value ? " " + value : " ");
    const lines = [P.cabecalho, "", single(P.maquina, machine), "", single(P.horario, up(fields.horario)), "", P.motivo];
    const motivo = cleanMulti(fields.motivo);
    if (motivo) lines.push(motivo);
    lines.push("", single(P.solicitante, up(fields.solicitante)), "", single(P.helpChain, up(fields.helpChain)));
    return lines.join("\n");
  }

  function renderParada() {
    setLine(lineOf(parada));
    $("stop-date").textContent = LINES[LINE].name + " · " + formatDate(dateFromKey(parada.date));
    fillMachineGrid($("stop-machines"), lineOf(parada), parada.machine, machine => {
      if (String(parada.machine) !== String(machine.id)) { parada.machine = machine.id; parada.part = null; }
      $("stop-machines").classList.remove("need");
      keepDraft(parada);
      renderParada();
    });
    const machine = machinesOf(lineOf(parada)).find(other => String(other.id) === String(parada.machine));
    $("stop-part-field").hidden = !machine;
    fillPartChoices($("stop-parts"), machine, parada.part, label => { parada.part = label; keepDraft(parada); renderParada(); }, NO_PART);
    document.querySelectorAll("[data-pchoice]").forEach(button => {
      button.setAttribute("aria-checked", String(parada.fields[button.dataset.pchoice] === button.dataset.value));
    });
    document.querySelectorAll("[data-pfield]").forEach(input => {
      const value = parada.fields[input.dataset.pfield] || "";
      if (input.value !== value) input.value = value;
      if (input.tagName === "TEXTAREA") fit(input);
    });
  }

  document.querySelectorAll("[data-pfield]").forEach(input => input.addEventListener("input", () => {
    if (input.tagName === "INPUT" && input.type !== "time") {
      const caret = input.selectionStart;
      const upper = input.value.toLocaleUpperCase("pt-BR");
      if (upper !== input.value) { input.value = upper; input.setSelectionRange(caret, caret); }
    }
    parada.fields[input.dataset.pfield] = input.value;
    keepDraft(parada);
  }));
  /* Solicitante: Injetora ou Estamparia (tocar de novo desmarca) */
  document.querySelectorAll("[data-pchoice]").forEach(button => button.addEventListener("click", () => {
    const key = button.dataset.pchoice;
    parada.fields[key] = parada.fields[key] === button.dataset.value ? "" : button.dataset.value;
    keepDraft(parada);
    renderParada();
  }));
  $("stop-now").addEventListener("click", () => {
    parada.fields.horario = nowTime();
    keepDraft(parada);
    renderParada();
  });
  $("start-parada").addEventListener("click", () => { newParada(); go("stop"); });
  $("stop-restart").addEventListener("click", () => {
    if (!confirm("Limpar todos os campos da parada de máquina?")) return;
    dropDraft(parada.id);
    newParada();
    renderParada();
    toast("Campos limpos");
  });
  $("stop-done").addEventListener("click", () => {
    if (!parada.machine) { $("stop-machines").classList.add("need"); window.scrollTo({ top: 0, behavior: "smooth" }); toast("Escolha a máquina"); return; }
    active = "parada";
    go("done");
  });

  /* Blocos de foto do relatório pronto / Meus relatórios: título + foto + copiar/enviar. */
  async function renderPhotoBlocks(container, report) {
    container.innerHTML = "";
    container.hidden = report.type !== "bloqueio";
    if (report.type !== "bloqueio") return;
    for (const item of PHOTO_BLOCKS) {
      const card = document.createElement("div");
      card.className = "photo-block";
      const head = document.createElement("div");
      head.className = "photo-block-head";
      const title = document.createElement("strong");
      const titleText = MASK[mk("bloqueio", lineOf(report))][item.key];
      title.textContent = titleText;
      const copyTitle = document.createElement("button");
      copyTitle.type = "button";
      copyTitle.className = "btn btn-outline btn-small";
      copyTitle.append(icon("i-copy"), document.createTextNode("Copiar título"));
      copyTitle.addEventListener("click", async () => toast((await copyText(titleText)) ? "Título copiado" : "Não deu para copiar"));
      head.append(title, copyTitle);
      card.appendChild(head);

      const ids = idsOf(report, item.key);
      let shown = 0;
      for (const [index, id] of ids.entries()) {
        const url = await photoUrl(id);
        if (!url) continue;
        shown += 1;
        if (ids.length > 1) {
          const sub = document.createElement("span");
          sub.className = "photo-block-sub";
          sub.textContent = "Foto " + (index + 1) + " de " + ids.length;
          card.appendChild(sub);
        }
        const img = document.createElement("img");
        img.src = url;
        img.alt = titleText + " " + (index + 1);
        const row = document.createElement("div");
        row.className = "actions-row";
        const copyPhoto = document.createElement("button");
        copyPhoto.type = "button";
        copyPhoto.className = "btn btn-outline btn-small";
        copyPhoto.append(icon("i-copy"), document.createTextNode("Copiar foto"));
        copyPhoto.addEventListener("click", () => copyImage(id, item.key + "-" + (index + 1)));
        const sendPhoto = document.createElement("button");
        sendPhoto.type = "button";
        sendPhoto.className = "btn btn-outline btn-small";
        sendPhoto.append(icon("i-share"), document.createTextNode("Enviar foto"));
        sendPhoto.addEventListener("click", () => sharePhotos([id], null, [item.key + "-" + (index + 1)]));
        row.append(copyPhoto, sendPhoto);
        card.append(img, row);
      }
      if (!shown) {
        const missing = document.createElement("p");
        missing.className = "photo-missing";
        missing.textContent = "Sem foto";
        card.appendChild(missing);
      }
      container.appendChild(card);
    }
  }

  async function photoFile(id, name) {
    const blob = await getPhoto(id);
    return blob ? new File([blob], name + ".jpg", { type: blob.type || "image/jpeg" }) : null;
  }

  function downloadFile(file) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function sharePhotos(ids, text, names) {
    const files = (await Promise.all(ids.map((id, i) => (id ? photoFile(id, "bloqueio-" + names[i]) : null)))).filter(Boolean);
    if (files.length && navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share(text ? { files, text } : { files }); }
      catch (error) { if (error && error.name !== "AbortError") toast("Não deu para abrir o envio"); }
      return;
    }
    files.forEach(downloadFile);
    toast(files.length ? "Este aparelho não envia fotos direto. As fotos foram baixadas." : "Sem fotos para enviar");
  }

  async function copyImage(id, name) {
    try {
      if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) throw new Error("sem suporte");
      const png = getPhoto(id).then(blob => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          canvas.toBlob(out => (out ? resolve(out) : reject(new Error("png"))), "image/png");
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      }));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      toast("Foto copiada! Cole no Meixin");
    } catch (error) {
      const file = await photoFile(id, "bloqueio-" + name);
      if (file) downloadFile(file);
      toast("Este aparelho não copia foto. Ela foi baixada para você enviar.");
    }
  }

  /* ---------- Salvamento automático no rascunho ----------
     Ao voltar para o início, sair do relatório, fechar ou atualizar a página,
     o relatório aberto e não salvo vai para Rascunhos. */
  function isEmptyShift(item) {
    // marcações vêm preenchidas sozinhas: não contam como "começou a preencher"
    return !item.turno && !Object.entries(item.fields || {}).some(([key, value]) => key !== "marcacoes" && (value || "").trim());
  }
  function persistOpen() {
    if (!["machines", "shift", "block", "stop", "done"].includes(screenNow)) return;
    const item = screenNow === "machines" ? draft : screenNow === "shift" ? shift : screenNow === "block" ? block : screenNow === "stop" ? parada : current();
    if (!item || item.savedId || item.pristine) return; // salvo, ou limpo depois de salvar
    if (item.type === "troca" && isEmptyShift(item)) return; // nada escrito ainda
    if (item.type === "bloqueio" && isEmptyBlock(item)) return;
    if (item.type === "parada" && isEmptyParada(item)) return;
    keepDraft(item);
  }
  window.addEventListener("pagehide", persistOpen);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") persistOpen(); });

  /* ---------- Navegação ---------- */
  let active = "inicio"; // qual relatório a tela "Relatório pronto" mostra
  let screenNow = "login";
  const screens = Array.from(document.querySelectorAll("[data-screen]"));
  function go(name) {
    if (!user) name = "login";
    const editing = ["machines", "shift", "block", "stop", "done"];
    if (editing.includes(screenNow) && !editing.includes(name)) persistOpen();
    if (name !== "done") justSaved = null;
    screenNow = name;
    if (name === "machines" && !draft) newDraft();
    if (name === "machines") active = "inicio";
    if (name === "shift" && !shift) newShift();
    if (name === "block" && !block) newBlock();
    if (name === "stop" && !parada) newParada();
    if (name === "done" && !current()) { go("type"); return; }
    if (name.startsWith("admin") && !(user && user.admin)) { go("home"); return; }
    if (name === "admin-machine" && !adminMachineId) { go("admin"); return; }
    if (["admin-home", "admin", "admin-parts", "admin-masks", "admin-mask", "admin-machine"].includes(name) && !adminLine) { go("admin-line"); return; }
    screens.forEach(screen => { screen.hidden = screen.dataset.screen !== name; });
    if (name === "home") renderHome();
    if (name === "type" || name === "audit") setLine(LINE);
    if (name === "admin-line") adminLine = null;
    if (name === "machines") renderMachines();
    if (name === "shift") renderShift();
    if (name === "block") renderBlock();
    if (name === "stop") renderParada();
    if (name === "done") renderDone();
    if (name === "reports") renderReports();
    if (name === "admin") renderAdmin();
    if (name === "admin-home") renderPending();
    if (name === "admin-line") renderAdminLine();
    if (name === "admin-parts") { $("ap-search").value = ""; renderAdminParts(); }
    if (name === "admin-masks") renderMasksList();
    if (name === "occ-new") renderOccNew();
    if (name === "occ-list") renderOccList();
    if (name !== "occ-list") stopOccWatch();
    if (name === "admin-mask") { if (!maskType) { go("admin-masks"); return; } renderMaskEditor(); }
    if (name === "admin-machine") renderAdminMachine();
    window.scrollTo(0, 0);
  }
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-go]");
    if (target) go(target.dataset.go);
  });

  /* ---------- Início ---------- */
  function renderHome() {
    Object.entries(LINES).forEach(([line, info]) => {
      const sub = document.querySelector('[data-line-sub="' + line + '"]');
      if (sub) sub.textContent = info.sub + " · " + info.machines.length + " máquinas";
    });
    $("home-admin").hidden = !(user && user.admin);
    if (user && user.admin) $("home-admin-sub").textContent = adminDirty("injetora") || adminDirty("estamparia") ? "Há mudanças ainda não publicadas" : "Máquinas, peças e máscaras";
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
    if (item.type === "parada") {
      const machine = machinesOf(lineOf(item)).find(other => other.id === item.machine);
      return whenLabel(new Date(item.startedAt)) + " · " + (machine ? mName(machine) : "máquina não escolhida");
    }
    if (item.type === "bloqueio") {
      const code = (item.fields.codigo || "").split(" - ")[0] || "sem código";
      const photos = allIdsOf(item).length;
      return whenLabel(new Date(item.startedAt)) + " · " + code + " · " + photos + (photos === 1 ? " foto" : " fotos");
    }
    if (item.type === "troca") {
      return formatDate(dateFromKey(item.date)) + " · " + (item.turno || "turno não escolhido");
    }
    const total = counts(item.selections, lineOf(item));
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
        cleanPhotos();
        toast("Rascunho descartado");
      });

      row.append(open, discard);
      list.appendChild(row);
    });
  }

  function openDraft(item) {
    setLine(lineOf(item));
    if (item.type === "parada") {
      parada = item;
      go("stop");
    } else if (item.type === "bloqueio") {
      block = item;
      go("block");
    } else if (item.type === "troca") {
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

  /* ---------- Escolher a linha (Injetora / Estamparia) ---------- */
  document.querySelectorAll("[data-line-start]").forEach(button => button.addEventListener("click", () => {
    setLine(button.dataset.lineStart);
    occ = { turno: null, machine: null, part: null, problem: "" };
    go("type");
  }));

  /* ---------- Tipo de relatório ---------- */
  $("start-turno").addEventListener("click", () => {
    newDraft();
    go("machines");
  });

  /* ---------- Máquinas ---------- */
  function renderMachines() {
    setLine(lineOf(draft));
    const started = new Date(draft.startedAt);
    $("draft-when").textContent = LINES[LINE].name + " · " + formatDate(started) + " · " + formatTime(started);
    const total = counts(draft.selections, lineOf(draft));
    $("count-run").textContent = total.run;
    $("count-setup").textContent = total.setup;
    $("count-stop").textContent = total.stop;
    document.querySelectorAll("[data-mturno]").forEach(button => button.setAttribute("aria-checked", String(button.dataset.mturno === draft.turno)));
    document.querySelector(".turno-pick-machines").classList.remove("need");

    const list = $("machine-list");
    list.innerHTML = "";
    let group = null;
    machines.forEach(machine => {
      // Estamparia: título de grupo (Balancer, Linhas dos cestos, Prensas)
      if (machine.group && machine.group !== group) {
        group = machine.group;
        const head = document.createElement("h2");
        head.className = "machine-group";
        head.textContent = group;
        list.appendChild(head);
      }
      const status = draft.selections[machine.id] || STOPPED;
      const kind = kindOf(status);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "machine " + kind;
      button.setAttribute("aria-label", mName(machine) + ": " + status);

      const num = document.createElement("span");
      num.className = "machine-num" + (mBadge(machine).length > 2 ? " long" : "");
      num.textContent = mBadge(machine);

      const text = document.createElement("span");
      text.className = "machine-text";
      const title = document.createElement("strong");
      title.textContent = kind === "run" ? status : kind === "setup" ? "Setup" : "Máquina parada";
      const tag = document.createElement("small");
      tag.textContent = (machine.name ? machine.name + " · " : "") + (kind === "run" ? "Rodando" : kind === "setup" ? "Em setup" : "Parada");
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

  /* Turno do relatório de funcionamento de máquinas (obrigatório) */
  document.querySelectorAll("[data-mturno]").forEach(button => button.addEventListener("click", () => {
    if (draft.turno === button.dataset.mturno) return;
    draft.turno = button.dataset.mturno;
    keepDraft(draft);
    renderMachines();
  }));
  $("machines-done").addEventListener("click", () => {
    if (!draft.turno) {
      document.querySelector(".turno-pick-machines").classList.add("need");
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast("Escolha o turno primeiro");
      return;
    }
    go("done");
  });

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
    $("sheet-num").textContent = mBadge(machine);
    $("sheet-num").classList.toggle("long", mBadge(machine).length > 2);
    $("sheet-title").textContent = mName(machine);

    const parts = $("sheet-parts");
    parts.innerHTML = "";
    if (!machine.items.length) {
      const empty = document.createElement("p");
      empty.className = "muted small";
      empty.textContent = "Nenhuma peça cadastrada nesta máquina ainda. O administrador pode adicionar.";
      parts.appendChild(empty);
    }
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
  const current = () => (active === "troca" ? shift : active === "bloqueio" ? block : active === "parada" ? parada : draft);
  const textOf = report => (report.type === "bloqueio" ? buildBlockText(report) : report.type === "troca" ? buildShiftText(report)
    : report.type === "parada" ? buildParadaText(report) : buildText(report));
  const TITLES = { inicio: "Funcionamento de máquinas", troca: "Troca de turno", bloqueio: "Bloqueio", parada: "Parada de máquina" };
  const titleOf = report => (TITLES[report.type] || "Relatório") + " · " + LINES[lineOf(report)].name;
  const editScreen = () => (active === "troca" ? "shift" : active === "bloqueio" ? "block" : active === "parada" ? "stop" : "machines");

  let justSaved = null; // relatório recém-salvo mostrado na tela "Relatório pronto"

  $("done-back").addEventListener("click", () => go(editScreen()));

  function renderDone() {
    const report = current();
    $("done-back-label").textContent = active === "inicio" ? "Corrigir máquinas" : "Corrigir relatório";
    if (current()) setLine(lineOf(justSaved || current()));
    $("done-back").hidden = Boolean(justSaved);
    $("done-text").textContent = justSaved ? justSaved.text : textOf(report);
    const saved = Boolean(justSaved);
    $("save-label").textContent = saved ? "Relatório salvo" : "Salvar relatório";
    $("save-report").disabled = saved;
    $("new-after-save").hidden = !saved;
    renderPhotoBlocks($("done-photos"), justSaved || report);
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
    if (source.type === "bloqueio") {
      report.fields = { ...source.fields };
      report.photos = { ...source.photos, localizacao: idsOf(source, "localizacao") };
    } else if (source.type === "troca") {
      report.date = source.date;
      report.turno = source.turno;
      report.fields = { ...source.fields };
    } else if (source.type === "parada") {
      report.date = source.date;
      report.machine = source.machine;
      report.part = source.part;
      report.fields = { ...source.fields };
    } else {
      report.turno = source.turno || null;
      report.selections = { ...source.selections };
    }
    reports.unshift(report);
    if (!store(KEY_REPORTS, reports.slice(0, 200))) {
      toast("Não foi possível salvar neste aparelho");
      return;
    }
    queuePush("r", report.id);
    if (report.type === "troca" && (report.fields.bloqueio || "").trim() && cloudOk()) {
      Cloud.setLastBlock({ fields: { bloqueio: report.fields.bloqueio }, date: report.date, turno: report.turno, savedAt: report.savedAt }, lineOf(report))
        .catch(error => console.warn("[Nuvem] último bloqueio", error));
    }
    dropDraft(source.id);
    source.savedId = report.id;
    // Depois de salvar, o formulário fica limpo para o próximo relatório.
    justSaved = report;
    if (source.type === "troca") { newShift(); shift.pristine = true; }
    else if (source.type === "bloqueio") { newBlock(); block.pristine = true; }
    else if (source.type === "parada") { newParada(); parada.pristine = true; }
    else { newDraft(); draft.pristine = true; }
    renderDone();
    toast("Relatório salvo");
  });

  $("new-after-save").addEventListener("click", () => {
    go(editScreen());
  });

  /* Editar um relatório salvo: vira um rascunho novo; o salvo original não muda. */
  function editSaved(report) {
    const copy = { id: newId(), line: report.line, type: report.type, startedAt: report.startedAt, savedId: null, fromReport: report.id };
    if (report.type === "bloqueio") {
      copy.fields = { ...(report.fields || {}) };
      copy.photos = { conforme: null, naoConforme: null, ...(report.photos || {}), localizacao: idsOf(report, "localizacao") };
    } else if (report.type === "troca") {
      copy.date = report.date;
      copy.turno = report.turno || null;
      copy.fields = { relatorio: "", atencao: "", pendencias: "", bloqueio: "", marcacoes: "", ...(report.fields || {}) };
    } else if (report.type === "parada") {
      copy.date = report.date;
      copy.machine = report.machine || null;
      copy.part = report.part || null;
      copy.fields = { horario: "", motivo: "", solicitante: "", helpChain: "", ...(report.fields || {}) };
    } else {
      copy.selections = { ...(report.selections || {}) };
      copy.turno = report.turno || null;
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
      sub.textContent = report.type === "bloqueio"
        ? whenLabel(new Date(report.savedAt)) + " · " + ((report.fields.codigo || "").split(" - ")[0] || "sem código")
        : report.type === "troca"
        ? formatDate(dateFromKey(report.date)) + (report.turno ? " · " + report.turno : "")
        : report.type === "parada"
        ? whenLabel(new Date(report.savedAt)) + " · " + machineLabel(lineOf(report), report.machine)
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
    if (shown.type === "troca" || shown.type === "bloqueio" || shown.type === "parada") {
      $("view-sub").textContent = "Salvo " + whenLabel(new Date(shown.savedAt)).toLowerCase();
    } else {
      const total = counts(shown.selections, lineOf(shown));
      $("view-sub").textContent = whenLabel(new Date(shown.startedAt)) + " · " + total.run + " rodando · " + total.setup + " setup · " + total.stop + " paradas";
    }
    $("view-text").textContent = shown.text;
    renderPhotoBlocks($("view-photos"), shown);
    const editable = shown.type === "inicio" ? Boolean(shown.selections) : Boolean(shown.fields);
    $("edit-report").hidden = !editable;
    $("report-view").hidden = false;
  }

  $("edit-report").addEventListener("click", () => {
    const shown = load(KEY_REPORTS, []).find(report => report.id === viewing);
    if (shown) editSaved(shown);
  });

  $("delete-report").addEventListener("click", () => {
    if (!viewing || !confirm("Apagar este relatório? Ele some de todos os aparelhos.")) return;
    store(KEY_REPORTS, load(KEY_REPORTS, []).filter(report => report.id !== viewing));
    queueDelete("r", viewing);
    viewing = null;
    renderReports();
    cleanPhotos();
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
      const report = share.dataset.share === "view"
        ? load(KEY_REPORTS, []).find(item => item.id === viewing)
        : justSaved || current();
      if (report && report.type === "bloqueio" && allIdsOf(report).length) {
        const ids = [], names = [];
        PHOTO_BLOCKS.forEach(item => idsOf(report, item.key).forEach((id, i) => { ids.push(id); names.push(item.key + "-" + (i + 1)); }));
        await sharePhotos(ids, text, names);
        return;
      }
      if (navigator.share) {
        try { await navigator.share({ title: "Relatório da Qualidade", text }); }
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

  /* ---------- Nuvem (Firebase): login e sincronização ----------
     O aparelho guarda uma cópia (funciona sem internet) e tudo é enviado para o
     Firebase assim que possível. Ao entrar, o app baixa os relatórios, rascunhos
     e fotos da conta. Pendências de envio ficam em rq.pending.v1. */
  const KEY_PENDING = "rq.pending.v1";
  const KEY_OWNER = "rq.owner.v1";
  const KEY_UPLOADED = "rq.photosUp.v1";
  let user = null;
  const cloudOk = () => Boolean(window.Cloud && user);
  const KIND = { d: "rascunhos", r: "relatorios", o: "ocorrencias" };

  function setPending(key, on) {
    const pending = load(KEY_PENDING, {});
    if (on) pending[key] = true; else delete pending[key];
    store(KEY_PENDING, pending);
    paintSync();
  }
  const pushTimers = new Map();
  function queuePush(kind, id) {
    setPending(kind + ":" + id, true);
    clearTimeout(pushTimers.get(kind + id));
    pushTimers.set(kind + id, setTimeout(flush, 1200));
  }
  function queueDelete(kind, id) {
    setPending(kind + ":" + id, false);
    setPending("x:" + kind + ":" + id, true);
    setTimeout(flush, 300);
  }

  async function uploadPhotosOf(item) {
    const uploaded = load(KEY_UPLOADED, {});
    for (const id of allIdsOf(item)) {
      if (uploaded[id]) continue;
      const blob = await getPhoto(id);
      if (!blob) continue;
      await Cloud.putPhoto(id, blob);
      uploaded[id] = true;
      store(KEY_UPLOADED, uploaded);
    }
  }

  /* Último erro da nuvem: aparece na bolinha (vermelha) e ao tocar nela. */
  let syncError = null;
  const SYNC_ERRORS = {
    "permission-denied": "O banco recusou o acesso. Confira se as regras (firestore.rules) foram publicadas no Firebase.",
    "not-found": "Banco de dados não encontrado. Confira se o Firestore foi criado com o ID (default).",
    "failed-precondition": "Banco de dados não está pronto. Confira se o Firestore foi criado no Firebase.",
    "unavailable": "Sem conexão com o servidor. Vai tentar de novo sozinho.",
    "unauthenticated": "A sessão expirou. Saia e entre de novo.",
    "timeout": "O servidor do Firebase não respondeu. Confira se o Firestore Database foi criado (Firebase → Firestore Database → Criar banco de dados)."
  };
  /* O Firebase às vezes fica esperando para sempre (ex.: banco não criado): limita o tempo. */
  function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "timeout" })), ms || 20000))]);
  }
  function reportSync(error) {
    if (!error) { syncError = null; paintSync(); return; }
    const code = String(error.code || "").replace("firestore/", "");
    syncError = (SYNC_ERRORS[code] || "Erro ao sincronizar.") + (code ? " (" + code + ")" : "");
    console.warn("[Nuvem]", error);
    paintSync();
  }

  let flushing = false, flushAgain = false;
  async function flush() {
    if (!cloudOk() || !navigator.onLine) { paintSync(); return; }
    if (flushing) { flushAgain = true; return; }
    flushing = true;
    try {
      for (const key of Object.keys(load(KEY_PENDING, {}))) {
        const parts = key.split(":");
        try {
          if (parts[0] === "x") {
            await withTimeout(Cloud.remove(KIND[parts[1]], parts[2]));
          } else {
            const list = parts[0] === "d" ? listDrafts() : parts[0] === "o" ? load(KEY_OCC, []) : load(KEY_REPORTS, []);
            const item = list.find(other => String(other.id) === parts[1]);
            if (item) {
              await withTimeout(uploadPhotosOf(item), 60000);
              await withTimeout(Cloud.put(KIND[parts[0]], item));
            }
          }
          setPending(key, false);
          if (syncError && !syncError.includes("unavailable")) reportSync(null);
        } catch (error) {
          reportSync(error);
          if (error && ["unavailable", "permission-denied", "not-found", "failed-precondition", "unauthenticated", "timeout"].includes(error.code)) break;
        }
      }
    } finally {
      flushing = false;
      paintSync();
      if (flushAgain) { flushAgain = false; flush(); }
    }
  }

  /* Baixa os relatórios e rascunhos da conta. O que ainda não foi enviado
     (pendente) continua valendo a versão do aparelho. */
  function mergeRemote(kind, remote) {
    const pending = load(KEY_PENDING, {});
    const local = kind === "r" ? load(KEY_REPORTS, []) : listDrafts();
    const keep = local.filter(item => pending[kind + ":" + item.id]);
    const ids = new Set(keep.map(item => String(item.id)));
    remote.forEach(item => {
      if (!ids.has(String(item.id)) && !pending["x:" + kind + ":" + item.id]) { delete item.owner; keep.push(item); }
    });
    const dateKey = kind === "r" ? "savedAt" : "updatedAt";
    keep.sort((a, b) => String(b[dateKey] || "").localeCompare(String(a[dateKey] || "")));
    store(kind === "r" ? KEY_REPORTS : KEY_DRAFTS, keep);
  }

  async function pull() {
    if (!cloudOk()) return;
    const [reports, drafts] = await withTimeout(Promise.all([Cloud.listMine("relatorios"), Cloud.listMine("rascunhos")]));
    mergeRemote("r", reports);
    mergeRemote("d", drafts);
    await fetchMissingPhotos();
  }

  /* Tempo real: o que for salvo em outro aparelho aparece aqui sem recarregar. */
  let unwatch = [];
  function startWatching() {
    stopWatching();
    [["r", "relatorios"], ["d", "rascunhos"]].forEach(([kind, name]) => {
      unwatch.push(Cloud.watchMine(name, async remote => {
        mergeRemote(kind, remote);
        if (screenNow === "home") renderHome();
        if (screenNow === "reports") renderReports();
        await fetchMissingPhotos();
        if (screenNow === "reports") renderReports();
      }, reportSync));
    });
  }
  function stopWatching() {
    unwatch.forEach(stop => { try { stop(); } catch (error) { /* já parado */ } });
    unwatch = [];
  }

  let fetchingPhotos = false;
  async function fetchMissingPhotos() {
    if (fetchingPhotos) return;
    fetchingPhotos = true;
    try {
    // fotos que este aparelho ainda não tem
    const uploaded = load(KEY_UPLOADED, {});
    const needed = new Set();
    load(KEY_REPORTS, []).concat(listDrafts()).forEach(item => allIdsOf(item).forEach(id => needed.add(id)));
    for (const id of needed) {
      const local = await getPhoto(id).catch(() => null);
      if (local) continue;
      try {
        const blob = await Cloud.getPhoto(id);
        if (blob) { await putPhoto(id, blob); uploaded[id] = true; }
      } catch (error) { console.warn("[Nuvem] foto", id, error); }
    }
    store(KEY_UPLOADED, uploaded);
    } finally { fetchingPhotos = false; }
  }

  function paintSync() {
    const dot = $("sync-dot");
    if (!dot) return;
    const count = Object.keys(load(KEY_PENDING, {})).length;
    const failed = syncError && navigator.onLine;
    dot.className = "sync-dot" + (!navigator.onLine ? " offline" : failed ? " error" : count ? " pending" : "");
    dot.title = !navigator.onLine ? "Sem internet: salvo no aparelho" : failed ? syncError : count ? "Enviando " + count + "…" : "Tudo salvo na nuvem";
  }
  window.addEventListener("online", () => { paintSync(); flush(); });
  window.addEventListener("offline", paintSync);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !cloudOk()) return;
    flush();
    pull().then(() => { if (screenNow === "home") renderHome(); if (screenNow === "reports") renderReports(); }).catch(reportSync);
  });
  $("sync-dot").addEventListener("click", () => {
    const count = Object.keys(load(KEY_PENDING, {})).length;
    alert(!navigator.onLine ? "Sem internet. O que você salvar fica no aparelho e é enviado quando a conexão voltar."
      : syncError ? "Problema na nuvem:\n\n" + syncError + (count ? "\n\nItens esperando envio: " + count : "")
      : count ? "Enviando " + count + " item(ns) para a nuvem…" : "Tudo salvo na nuvem.");
    flush();
    if (syncError) reconnect(); // tenta de novo (ex.: regras publicadas depois do erro)
  });

  /* Teste no servidor + baixar + tempo real. Usado ao entrar e ao tocar na bolinha vermelha. */
  async function reconnect() {
    if (!cloudOk()) return;
    try {
      await withTimeout(Cloud.ping(), 15000);
      reportSync(null);
    } catch (error) {
      reportSync(error);
      return false;
    }
    try {
      await pull();
      startWatching();
      watchCadastro();
      watchMasks();
    } catch (error) {
      reportSync(error);
      return false;
    }
    if (screenNow === "home") renderHome();
    if (screenNow === "reports") renderReports();
    return true;
  }

  async function onLogin(account) {
    const owner = load(KEY_OWNER, null);
    if (owner && owner !== account.uid) {
      // outra pessoa entrou neste aparelho: limpa a cópia local da conta anterior
      [KEY_REPORTS, KEY_DRAFTS, KEY_OCC].forEach(key => store(key, []));
      store(KEY_PENDING, {});
      store(KEY_UPLOADED, {});
    } else if (!owner) {
      // o que foi feito antes do login vai para esta conta
      load(KEY_REPORTS, []).forEach(item => setPending("r:" + item.id, true));
      listDrafts().forEach(item => setPending("d:" + item.id, true));
    }
    store(KEY_OWNER, account.uid);
    user = account;
    draft = null; shift = null; block = null; parada = null; adminLine = null;
    $("user-name").textContent = account.admin ? "ADM" : account.login;
    $("user-chip").hidden = false;
    paintSync();
    go("home");
    // 1) teste rápido no servidor; 2) enviar e baixar em paralelo (um não trava o outro)
    flush();
    const ok = await reconnect();
    if (!ok) toast(navigator.onLine ? "Problema na nuvem: toque na bolinha ao lado do seu nome" : "Sem internet: mostrando o que está no aparelho");
    cleanPhotos();
  }

  function onLogout() {
    stopOccWatch();
    stopWatching();
    if (unwatchCadastro) { try { unwatchCadastro(); } catch (error) { /* já parado */ } unwatchCadastro = null; }
    if (unwatchCadastroEst) { try { unwatchCadastroEst(); } catch (error) { /* já parado */ } unwatchCadastroEst = null; }
    if (unwatchMasks) { try { unwatchMasks(); } catch (error) { /* já parado */ } unwatchMasks = null; }
    syncError = null;
    user = null;
    draft = null; shift = null; block = null; parada = null; adminLine = null;
    $("user-chip").hidden = true;
    $("login-pass").value = "";
    go("login");
  }

  /* Tela de entrar */
  const LOGIN_ERRORS = {
    "login-invalido": "Digite os 6 números da matrícula.",
    "auth/invalid-credential": "Matrícula ou senha incorretas.",
    "auth/invalid-login-credentials": "Matrícula ou senha incorretas.",
    "auth/wrong-password": "Matrícula ou senha incorretas.",
    "auth/user-not-found": "Matrícula ou senha incorretas.",
    "auth/user-disabled": "Este acesso foi desativado. Fale com o responsável da qualidade.",
    "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
    "auth/network-request-failed": "Sem internet. Verifique a conexão e tente de novo."
  };
  function loginState(text, busy) {
    $("login-btn").disabled = busy;
    $("login-btn").firstChild.textContent = text;
  }
  function loginError(message) {
    $("login-error").textContent = message || "";
    $("login-error").hidden = !message;
  }
  $("login-user").addEventListener("input", event => {
    const input = event.target;
    const caret = input.selectionStart;
    const upper = input.value.toUpperCase();
    if (upper !== input.value) { input.value = upper; input.setSelectionRange(caret, caret); }
  });
  $("login-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (!window.Cloud) { loginError("Ainda conectando ao servidor. Tente de novo em instantes."); return; }
    loginError("");
    loginState("Entrando…", true);
    try {
      await Cloud.signIn($("login-user").value, $("login-pass").value);
    } catch (error) {
      loginError(LOGIN_ERRORS[error.code] || "Não deu para entrar. Tente de novo.");
      loginState("Entrar", false);
    }
  });
  $("logout").addEventListener("click", async () => {
    const count = Object.keys(load(KEY_PENDING, {})).length;
    if (count && !confirm("Ainda há " + count + " item(ns) sem enviar para a nuvem. Sair mesmo assim? Eles continuam guardados neste aparelho.")) return;
    if (window.Cloud) await Cloud.signOut();
  });

  function startCloud() {
    loginState("Entrar", false);
    Cloud.onUser(account => (account ? onLogin(account) : (onLogout(), loginState("Entrar", false))));
  }

  /* ---------- Cadastro das linhas vindo da nuvem (todos) ----------
     Injetora: cadastro/injetora. Estamparia: cadastro/estamparia. */
  let unwatchCadastro = null;
  let unwatchCadastroEst = null;
  function onCadastro(line, cad) {
    if (cad) store(KEY_CADASTRO[line], cad); else forget(KEY_CADASTRO[line]);
    applyCadastro(cad, line);
    if (screenNow === "home") renderHome();
    if (screenNow === "machines" && draft && lineOf(draft) === line) { sanitizeDraft(draft); renderMachines(); }
    if (screenNow === "admin" && adminLine === line) renderAdmin();
  }
  function watchCadastro() {
    if (!unwatchCadastro && window.Cloud.watchCadastro) unwatchCadastro = Cloud.watchCadastro(cad => onCadastro("injetora", cad), reportSync);
    if (!unwatchCadastroEst && window.Cloud.watchConfig) unwatchCadastroEst = Cloud.watchConfig("estamparia", cad => onCadastro("estamparia", cad), reportSync);
  }

  /* ---------- Administrador: peças das máquinas ----------
     O ADM edita uma cópia (adminDrafts[linha]). Nada muda
     para os outros até tocar em "Publicar", que grava cadastro/injetora ou cadastro/estamparia. */
  /* Ao entrar na área do administrador, o ADM escolhe a área: Injetora ou Estamparia.
     Cada área tem o seu rascunho (rq.adminDraft.v1 e rq.adminDraft.est.v1). */
  const KEY_ADMIN_DRAFT = { injetora: "rq.adminDraft.v1", estamparia: "rq.adminDraft.est.v1" };
  const adminDrafts = { injetora: load(KEY_ADMIN_DRAFT.injetora, null), estamparia: load(KEY_ADMIN_DRAFT.estamparia, null) };
  let adminLine = null;
  let adminMachineId = null;

  function adminWork() {
    if (!adminDrafts[adminLine]) adminDrafts[adminLine] = currentCadastro(adminLine);
    return adminDrafts[adminLine];
  }
  function saveAdminDraft() { store(KEY_ADMIN_DRAFT[adminLine], adminDrafts[adminLine]); }
  function adminDirty(line) {
    line = line || adminLine;
    if (!line) return adminDirty("injetora") || adminDirty("estamparia");
    return Boolean(adminDrafts[line]) && JSON.stringify(adminDrafts[line]) !== JSON.stringify(currentCadastro(line));
  }
  function changedMachines() {
    const work = adminDrafts[adminLine];
    if (!work) return new Set();
    const now = new Map(machinesOf(adminLine).map(machine => [machine.id, JSON.stringify(machine.items)]));
    return new Set(work.machines.filter(machine => now.get(machine.id) !== JSON.stringify(machine.items)).map(machine => machine.id));
  }

  /* Tela de escolha da área */
  function renderAdminLine() {
    Object.keys(LINES).forEach(line => {
      const sub = document.querySelector('[data-admin-line-sub="' + line + '"]');
      if (sub) sub.textContent = adminDirty(line) ? "Há mudanças ainda não publicadas" : LINES[line].sub + " · " + machinesOf(line).length + " máquinas";
    });
  }
  document.querySelectorAll("[data-admin-line]").forEach(button => button.addEventListener("click", () => {
    adminLine = button.dataset.adminLine;
    document.querySelectorAll("[data-admin-line-name]").forEach(element => { element.textContent = LINES[adminLine].name; });
    go("admin-home");
  }));

  function renderPending() {
    const changed = changedMachines();
    const dirty = adminDirty();
    const text = changed.size
      ? (changed.size === 1 ? "1 máquina alterada" : changed.size + " máquinas alteradas") + " · ainda não publicado"
      : "Peças alteradas · ainda não publicado";
    document.querySelectorAll("[data-pending]").forEach(box => {
      box.hidden = !dirty;
      box.querySelector("[data-pending-text]").textContent = text;
    });
  }

  function renderAdmin() {
    const work = adminWork();
    const changed = changedMachines();
    renderPending();
    const grid = $("admin-machines");
    grid.innerHTML = "";
    work.machines.forEach(machine => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "admin-machine" + (changed.has(machine.id) ? " changed" : "");
      const title = document.createElement("strong");
      title.textContent = mName(machine);
      const list = document.createElement("small");
      list.textContent = machine.items.length ? machine.items.join(" · ") : "Nenhuma peça";
      button.append(title, list);
      if (changed.has(machine.id)) {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = "ALTERADA";
        button.appendChild(tag);
      }
      button.addEventListener("click", () => { adminMachineId = machine.id; go("admin-machine"); });
      grid.appendChild(button);
    });
  }

  function adminMachine() {
    return adminWork().machines.find(machine => machine.id === adminMachineId);
  }

  function renderAdminMachine() {
    const machine = adminMachine();
    $("am-title").textContent = mName(machine);
    const list = $("am-items");
    list.innerHTML = "";
    if (!machine.items.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "Nenhuma peça. Toque em Adicionar peça.";
      list.appendChild(empty);
    }
    machine.items.forEach(label => {
      const row = document.createElement("div");
      row.className = "admin-item";
      const name = document.createElement("span");
      name.textContent = label;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.setAttribute("aria-label", "Tirar " + label + " de " + mName(machine));
      remove.appendChild(icon("i-trash"));
      remove.addEventListener("click", () => {
        machine.items = machine.items.filter(other => other !== label);
        saveAdminDraft();
        renderAdminMachine();
        toast(label + " saiu de " + mName(machine));
      });
      row.append(name, remove);
      list.appendChild(row);
    });
  }

  function addToMachine(label) {
    const machine = adminMachine();
    if (!machine.items.includes(label)) machine.items.push(label);
    saveAdminDraft();
    renderAdminMachine();
  }

  /* Adicionar peça já cadastrada */
  const itemSheet = $("item-sheet");
  function renderItemList() {
    const machine = adminMachine();
    const words = plain($("item-search").value.trim()).split(/\s+/).filter(Boolean);
    const list = $("item-list");
    list.innerHTML = "";
    const labels = Object.keys(adminWork().items)
      .filter(label => !machine.items.includes(label))
      .filter(label => words.every(word => plain(label).includes(word)))
      .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
    labels.forEach(label => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "product-option";
      const name = document.createElement("strong");
      name.textContent = label;
      const codes = document.createElement("small");
      codes.textContent = adminWork().items[label].filter(Boolean).join(" · ") || "sem código";
      option.append(name, codes);
      option.addEventListener("click", () => { addToMachine(label); itemSheet.close(); toast(label + " entrou em " + mName(machine)); });
      list.appendChild(option);
    });
    if (!labels.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "Nenhuma peça encontrada. Use \"Cadastrar peça nova\".";
      list.appendChild(empty);
    }
  }
  $("am-add").addEventListener("click", () => {
    $("item-search").value = "";
    renderItemList();
    if (typeof itemSheet.showModal === "function") itemSheet.showModal(); else itemSheet.setAttribute("open", "");
  });
  $("item-search").addEventListener("input", renderItemList);
  $("item-close").addEventListener("click", () => itemSheet.close());
  itemSheet.addEventListener("click", event => { if (event.target === itemSheet) itemSheet.close(); });

  /* Cadastrar peça nova (regra da vírgula e da barra) */
  const newSheet = $("newpart-sheet");
  let npModels = [];
  let npKind = "split";
  function npLabels() {
    const name = $("np-name").value.trim().toLocaleUpperCase("pt-BR").replace(/\s+/g, " ");
    if (!name) return [];
    // "CASE DO ÍMÃ" → "Case do Ímã" (palavras curtas como do/da/de/e ficam minúsculas, como no cadastro)
    const small = new Set(["do", "da", "de", "dos", "das", "e", "com", "para"]);
    const toTitle = text => text.toLocaleLowerCase("pt-BR").split(" ").map((word, index) =>
      index > 0 && small.has(word) ? word : word.replace(/(^|[/-])(\p{L})/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase("pt-BR"))).join(" ");
    const base = toTitle(name);
    const models = npModels.slice().sort();
    if (!models.length) return [base];
    return npKind === "shared" && models.length > 1 ? [base + " " + models.join("/")] : models.map(model => base + " " + model);
  }
  function renderNewPart() {
    document.querySelectorAll("[data-model]").forEach(button => button.setAttribute("aria-pressed", String(npModels.includes(button.dataset.model))));
    $("np-kind-field").hidden = npModels.length < 2;
    document.querySelectorAll("[data-kind]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.kind === npKind)));
    const preview = $("np-preview");
    const typed = {};
    preview.querySelectorAll("input").forEach(input => { typed[input.dataset.label] = input.value; });
    preview.innerHTML = "";
    const labels = npLabels();
    if (!labels.length) {
      const empty = document.createElement("p");
      empty.className = "muted small";
      empty.textContent = "Escreva o nome da peça.";
      preview.appendChild(empty);
    }
    labels.forEach(label => {
      const row = document.createElement("div");
      row.className = "np-row";
      const name = document.createElement("strong");
      name.textContent = label;
      const code = document.createElement("input");
      code.className = "text-input";
      code.dataset.label = label;
      code.placeholder = "CÓDIGO";
      code.autocomplete = "off";
      code.setAttribute("aria-label", "Código da CTQ de " + label);
      const known = (adminWork().items[label] || [])[0];
      code.value = typed[label] || known || "";
      row.append(name, code);
      preview.appendChild(row);
    });
    $("np-error").hidden = true;
  }
  let npTarget = "machine";
  function openNewPart(target) {
    npTarget = target;
    $("np-save").textContent = target === "machine" ? "Adicionar à máquina" : "Cadastrar";
    $("np-name").value = "";
    npModels = [];
    npKind = "split";
    renderNewPart();
    if (typeof newSheet.showModal === "function") newSheet.showModal(); else newSheet.setAttribute("open", "");
    $("np-name").focus();
  }
  $("am-new").addEventListener("click", () => openNewPart("machine"));
  $("np-name").addEventListener("input", () => {
    const input = $("np-name");
    const caret = input.selectionStart;
    const upper = input.value.toLocaleUpperCase("pt-BR");
    if (upper !== input.value) { input.value = upper; input.setSelectionRange(caret, caret); }
    renderNewPart();
  });
  document.querySelectorAll("[data-model]").forEach(button => button.addEventListener("click", () => {
    const model = button.dataset.model;
    npModels = npModels.includes(model) ? npModels.filter(other => other !== model) : npModels.concat(model);
    renderNewPart();
  }));
  document.querySelectorAll("[data-kind]").forEach(button => button.addEventListener("click", () => { npKind = button.dataset.kind; renderNewPart(); }));
  $("np-cancel").addEventListener("click", () => newSheet.close());
  $("np-save").addEventListener("click", () => {
    const labels = npLabels();
    const error = message => { $("np-error").textContent = message; $("np-error").hidden = false; };
    if (!labels.length) return error("Escreva o nome da peça.");
    const work = adminWork();
    const codes = {};
    for (const input of $("np-preview").querySelectorAll("input")) {
      const code = input.value.trim().toUpperCase();
      codes[input.dataset.label] = code || null;
    }
    const filled = Object.values(codes).filter(Boolean);
    if (new Set(filled).size !== filled.length) return error("Peças diferentes não podem ter o mesmo código. Se é a mesma peça, escolha \"uma peça só (barra)\".");
    labels.forEach(label => {
      const code = codes[label];
      if (!work.items[label]) work.items[label] = [code];
      else if (code) work.items[label] = [code];
      if (code && !BASE.parts.some(part => part.code === code) && !work.extraParts.some(part => part.code === code)) {
        work.extraParts.push({ code, name: label, it: null });
      }
      if (npTarget === "machine") addToMachine(label);
    });
    if (npTarget === "catalog") renderAdminParts();
    saveAdminDraft();
    newSheet.close();
    toast(labels.length > 1 ? labels.length + " peças cadastradas" : "Peça cadastrada");
  });
  newSheet.addEventListener("click", event => { if (event.target === newSheet) newSheet.close(); });

  /* Publicar / descartar */
  async function publishCadastro(button) {
    const work = adminWork();
    const problems = validateCadastro(work);
    if (problems.length) { alert("Corrija antes de publicar:\n\n- " + problems.join("\n- ")); return; }
    const changed = changedMachines();
    if (!confirm("Publicar " + LINES[adminLine].name + " para todos? " + (changed.size ? changed.size + " máquina(s) alterada(s)." : "") + "\nQuem estiver usando o app recebe a mudança na hora.")) return;
    button.disabled = true;
    try {
      const line = adminLine;
      await withTimeout(line === "estamparia" ? Cloud.saveConfig("estamparia", work) : Cloud.saveCadastro(work));
      store(KEY_CADASTRO[line], work);
      applyCadastro(work, line);
      adminDrafts[line] = null;
      forget(KEY_ADMIN_DRAFT[line]);
      refreshAdminScreen();
      toast("Publicado! Já vale para todos.");
    } catch (error) {
      reportSync(error);
      alert(error && error.code === "permission-denied"
        ? "O Firebase não deixou publicar. Confira se as regras novas (firestore.rules, com a parte \"cadastro\") foram publicadas."
        : "Não deu para publicar agora. Verifique a internet e tente de novo.");
    } finally {
      button.disabled = false;
    }
  }
  function refreshAdminScreen() {
    renderPending();
    if (screenNow === "admin") renderAdmin();
    if (screenNow === "admin-parts") renderAdminParts();
  }
  document.querySelectorAll("[data-publish]").forEach(button => button.addEventListener("click", () => publishCadastro(button)));
  document.querySelectorAll("[data-discard]").forEach(button => button.addEventListener("click", () => {
    if (!confirm("Descartar todas as mudanças não publicadas da " + LINES[adminLine].name + "?")) return;
    adminDrafts[adminLine] = null;
    forget(KEY_ADMIN_DRAFT[adminLine]);
    refreshAdminScreen();
    toast("Mudanças descartadas");
  }));

  /* ---------- ADM: peças cadastradas (editar nome/código, apagar, cadastrar) ---------- */
  function machinesWith(label) {
    return adminWork().machines.filter(machine => machine.items.includes(label)).map(machine => (machine.name ? machine.name : machine.id));
  }
  function renderAdminParts() {
    renderPending();
    const work = adminWork();
    const words = plain($("ap-search").value.trim()).split(/\s+/).filter(Boolean);
    const labels = Object.keys(work.items).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
    $("ap-count").textContent = labels.length + " peças";
    const list = $("ap-list");
    list.innerHTML = "";
    labels.filter(label => words.every(word => plain(label + " " + work.items[label].join(" ")).includes(word))).forEach(label => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "admin-item clickable";
      const text = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = label;
      const info = document.createElement("small");
      const inMachines = machinesWith(label);
      info.textContent = (work.items[label].filter(Boolean).join(" · ") || "sem código") + " · " +
        (inMachines.length ? "máq. " + inMachines.join(", ") : "em nenhuma máquina");
      text.append(name, info);
      row.append(text, icon("i-edit"));
      row.addEventListener("click", () => openPartEditor(label));
      list.appendChild(row);
    });
  }
  $("ap-search").addEventListener("input", renderAdminParts);

  const partSheet = $("part-sheet");
  let editingLabel = null;
  function openPartEditor(label) {
    editingLabel = label;
    $("pe-name").value = label;
    $("pe-codes").value = adminWork().items[label].filter(Boolean).join(", ");
    const inMachines = machinesWith(label);
    $("pe-machines").textContent = inMachines.length ? "Roda nas máquinas: " + inMachines.join(", ") + ". O nome muda nelas também." : "Não está em nenhuma máquina.";
    $("pe-error").hidden = true;
    if (typeof partSheet.showModal === "function") partSheet.showModal(); else partSheet.setAttribute("open", "");
  }
  $("pe-cancel").addEventListener("click", () => partSheet.close());
  partSheet.addEventListener("click", event => { if (event.target === partSheet) partSheet.close(); });
  $("pe-codes").addEventListener("input", event => {
    const input = event.target;
    const caret = input.selectionStart;
    const upper = input.value.toUpperCase();
    if (upper !== input.value) { input.value = upper; input.setSelectionRange(caret, caret); }
  });
  $("pe-save").addEventListener("click", () => {
    const work = adminWork();
    const error = message => { $("pe-error").textContent = message; $("pe-error").hidden = false; };
    const name = $("pe-name").value.trim().replace(/\s+/g, " ");
    if (!name) return error("Escreva o nome da peça.");
    if (name !== editingLabel && work.items[name]) return error("Já existe uma peça com esse nome.");
    const codes = $("pe-codes").value.split(/[,;\s]+/).map(code => code.trim().toUpperCase()).filter(Boolean);
    const list = codes.length ? codes : [null];
    if (/\d\/\d/.test(name) && new Set(list).size !== 1) return error("Nome com barra (ex.: 580/601) é UMA peça só: use um código. Se são peças diferentes, cadastre uma por modelo.");
    // renomeia em todas as máquinas, mantendo a posição na lista
    if (name !== editingLabel) {
      work.machines.forEach(machine => { machine.items = machine.items.map(item => (item === editingLabel ? name : item)); });
      delete work.items[editingLabel];
    }
    work.items[name] = list;
    codes.forEach(code => {
      if (!BASE.parts.some(part => part.code === code) && !work.extraParts.some(part => part.code === code)) {
        work.extraParts.push({ code, name, it: null });
      }
    });
    saveAdminDraft();
    partSheet.close();
    renderAdminParts();
    toast("Peça atualizada · falta publicar");
  });
  $("pe-delete").addEventListener("click", () => {
    const inMachines = machinesWith(editingLabel);
    if (!confirm("Apagar \"" + editingLabel + "\"?" + (inMachines.length ? "\nEla sai das máquinas " + inMachines.join(", ") + "." : ""))) return;
    const work = adminWork();
    work.machines.forEach(machine => { machine.items = machine.items.filter(item => item !== editingLabel); });
    delete work.items[editingLabel];
    saveAdminDraft();
    partSheet.close();
    renderAdminParts();
    toast("Peça apagada · falta publicar");
  });
  $("ap-new").addEventListener("click", () => openNewPart("catalog"));

  /* ---------- ADM: máscaras ---------- */
  let unwatchMasks = null;
  function watchMasks() {
    if (unwatchMasks || !window.Cloud.watchConfig) return;
    unwatchMasks = Cloud.watchConfig("mascaras", published => {
      if (published) store(KEY_MASKS, published); else { try { localStorage.removeItem(KEY_MASKS); } catch (error) { /* ok */ } }
      applyMasks(published);
      if (screenNow === "admin-masks") renderMasksList();
    }, reportSync);
  }

  let maskType = null;
  let maskDraft = null;
  function renderMasksList() {
    const list = $("masks-list");
    list.innerHTML = "";
    Object.keys(MASK_DEFAULTS).filter(type => MASK_LINE[type] === adminLine || MASK_LINE[type] === "ambas").forEach(type => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "admin-item clickable";
      const text = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = MASK_LABELS[type].name + (MASK_LINE[type] === "ambas" ? " (Injetora e Estamparia)" : "");
      const info = document.createElement("small");
      const changed = Object.keys(MASK_DEFAULTS[type]).filter(key => MASK[type][key] !== MASK_DEFAULTS[type][key]).length;
      info.textContent = changed ? changed + " texto(s) diferente(s) do padrão" : "Igual ao padrão";
      text.append(name, info);
      row.append(text, icon("i-edit"));
      row.addEventListener("click", () => { maskType = type; maskDraft = clone(MASK[type]); go("admin-mask"); });
      list.appendChild(row);
    });
  }

  function maskSample(key) {
    const line = MASK_LINE[key] === "estamparia" ? "estamparia" : MASK_LINE[key] === "ambas" ? adminLine || "injetora" : "injetora";
    const type = key.replace(/_est$/, "");
    if (type === "inicio") {
      const selections = {};
      machinesOf(line).forEach((machine, index) => { selections[machine.id] = index === 0 && machine.items[0] ? machine.items[0] : index === 1 ? SETUP : STOPPED; });
      return { type, line, startedAt: new Date().toISOString(), turno: "T1", selections };
    }
    if (type === "troca") {
      return { type, line, date: todayKey(), turno: "T1", fields: { relatorio: "- EXEMPLO DE TEXTO", atencao: "", pendencias: "", bloqueio: "- EXEMPLO DE TEXTO", marcacoes: "" } };
    }
    if (type === "parada") {
      const machine = machinesOf(line)[0];
      return { type, line, date: todayKey(), machine: machine.id, part: machine.items[0] || NO_PART,
        fields: { horario: "05:30", motivo: "- EXEMPLO DE TEXTO", solicitante: "ESTAMPARIA", helpChain: "" } };
    }
    const fields = {};
    BLOCK_FIELDS.forEach(field => { fields[field.key] = field.key === "motivo" ? "- EXEMPLO DE TEXTO" : ""; });
    fields.dataProducao = todayKey();
    fields.criticidade = "ALTA";
    fields.scrap = "NÃO";
    return { type, line, fields, photos: {} };
  }
  function maskPreview() {
    const saved = MASK[maskType];
    MASK[maskType] = { ...MASK_DEFAULTS[maskType], ...maskDraft };
    let text;
    try {
      text = textOf(maskSample(maskType));
      if (maskType === "bloqueio" || maskType === "bloqueio_est") {
        text += "\n\n" + PHOTO_BLOCKS.map(item => MASK[maskType][item.key] + "\n[foto]").join("\n\n");
      }
    } finally {
      MASK[maskType] = saved;
    }
    return text;
  }

  function renderMaskEditor() {
    $("mk-title").textContent = MASK_LABELS[maskType].name;
    const box = $("mk-fields");
    box.innerHTML = "";
    Object.keys(MASK_DEFAULTS[maskType]).forEach(key => {
      const wrap = document.createElement("label");
      wrap.className = "mask-field" + (maskDraft[key] !== MASK_DEFAULTS[maskType][key] ? " changed" : "");
      const head = document.createElement("div");
      head.className = "mask-field-head";
      const name = document.createElement("span");
      name.textContent = MASK_LABELS[maskType][key] || key;
      head.appendChild(name);
      if (maskDraft[key] !== MASK_DEFAULTS[maskType][key]) {
        const reset = document.createElement("button");
        reset.type = "button";
        reset.className = "text-btn";
        reset.textContent = "Padrão";
        reset.addEventListener("click", event => { event.preventDefault(); maskDraft[key] = MASK_DEFAULTS[maskType][key]; renderMaskEditor(); });
        head.appendChild(reset);
      }
      const input = document.createElement("input");
      input.className = "text-input mask-input";
      input.value = maskDraft[key];
      input.autocomplete = "off";
      input.spellcheck = false;
      input.addEventListener("input", () => {
        maskDraft[key] = input.value;
        wrap.classList.toggle("changed", input.value !== MASK_DEFAULTS[maskType][key]);
        $("mk-preview").textContent = maskPreview();
      });
      const hint = document.createElement("span");
      hint.className = "mask-default";
      hint.textContent = "Padrão: " + MASK_DEFAULTS[maskType][key];
      wrap.append(head, input, hint);
      box.appendChild(wrap);
    });
    $("mk-preview").textContent = maskPreview();
  }

  $("mk-reset").addEventListener("click", () => {
    if (!confirm("Voltar todos os textos desta máscara ao padrão? (Ainda precisa publicar.)")) return;
    maskDraft = clone(MASK_DEFAULTS[maskType]);
    renderMaskEditor();
  });
  $("mk-publish").addEventListener("click", async () => {
    if (Object.values(maskDraft).some(value => !String(value).trim()) && !confirm("Algum texto está vazio. Publicar mesmo assim?")) return;
    if (!confirm("Publicar a máscara \"" + MASK_LABELS[maskType].name + "\" para todos?\nOs relatórios novos já saem com os textos novos.")) return;
    const published = {};
    Object.keys(MASK_DEFAULTS).forEach(type => {
      const source = type === maskType ? maskDraft : MASK[type];
      const diff = {};
      Object.keys(MASK_DEFAULTS[type]).forEach(key => { if (source[key] !== MASK_DEFAULTS[type][key]) diff[key] = source[key]; });
      published[type] = diff;
    });
    const button = $("mk-publish");
    button.disabled = true;
    try {
      await withTimeout(Cloud.saveConfig("mascaras", published));
      store(KEY_MASKS, published);
      applyMasks(published);
      toast("Máscara publicada! Já vale para todos.");
      go("admin-masks");
    } catch (error) {
      reportSync(error);
      alert(error && error.code === "permission-denied"
        ? "O Firebase não deixou publicar. Confira se as regras (firestore.rules, com a parte \"cadastro\") foram publicadas."
        : "Não deu para publicar agora. Verifique a internet e tente de novo.");
    } finally {
      button.disabled = false;
    }
  });

  /* ---------- Ocorrências ----------
     Lançar: turno, máquina, peça (da máquina) e problema. Cada ocorrência vai para
     ocorrencias/{id} (todos leem) com cópia no aparelho (rq.occ.v1) até ser enviada.
     Problemas: DATA.problemas (botões) ou texto livre enquanto a lista estiver vazia. */
  const KEY_OCC = "rq.occ.v1";
  let occ = { turno: null, machine: null, part: null, problem: "" };

  function occTurnoGuess() {
    const last = load(KEY_OCC, [])[0];
    return last && last.date === todayKey() ? last.turno : null;
  }

  function renderOccNew() {
    if (!occ.turno) occ.turno = occTurnoGuess();
    setLine(LINE);
    document.querySelectorAll("[data-oturno]").forEach(button => button.setAttribute("aria-checked", String(button.dataset.oturno === occ.turno)));
    fillMachineGrid($("occ-machines"), LINE, occ.machine, machine => {
      if (occ.machine !== machine.id) { occ.machine = machine.id; occ.part = null; }
      renderOccNew();
    });
    const machine = machines.find(item => item.id === occ.machine);
    $("occ-part-field").hidden = !machine;
    fillPartChoices($("occ-parts"), machine, occ.part, label => { occ.part = label; renderOccNew(); }, "Nenhuma peça (máquina parada)");
    $("occ-problem-field").hidden = !occ.part;
    const problems = $("occ-problems");
    problems.innerHTML = "";
    const list = DATA.problemas || [];
    problems.hidden = !list.length;
    list.forEach(label => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "choice";
      option.setAttribute("role", "radio");
      option.setAttribute("aria-checked", String(occ.problem === label));
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.appendChild(icon("i-check"));
      option.append(dot, document.createTextNode(label));
      option.addEventListener("click", () => { occ.problem = label; $("occ-problem-text").value = ""; renderOccNew(); });
      problems.appendChild(option);
    });
    $("occ-problem-text").placeholder = list.length ? "OUTRO PROBLEMA (ESCREVA)" : "DESCREVA O PROBLEMA";
    if (!list.includes(occ.problem)) $("occ-problem-text").value = occ.problem;
  }

  document.querySelectorAll("[data-oturno]").forEach(button => button.addEventListener("click", () => {
    occ.turno = button.dataset.oturno;
    document.querySelector(".occ-turno").classList.remove("need");
    renderOccNew();
  }));
  $("occ-problem-text").addEventListener("input", event => {
    const input = event.target;
    const caret = input.selectionStart;
    const upper = input.value.toLocaleUpperCase("pt-BR");
    if (upper !== input.value) { input.value = upper; input.setSelectionRange(caret, caret); }
    occ.problem = input.value.trim();
    document.querySelectorAll("#occ-problems .choice").forEach(option => option.setAttribute("aria-checked", "false"));
  });
  $("start-ocorrencia").addEventListener("click", () => {
    occ = { turno: occ.turno, machine: null, part: null, problem: "" };
    go("occ-new");
  });
  $("occ-new-btn").addEventListener("click", () => { occ = { turno: occ.turno, machine: null, part: null, problem: "" }; go("occ-new"); });

  $("occ-save").addEventListener("click", () => {
    if (!occ.turno) { document.querySelector(".occ-turno").classList.add("need"); window.scrollTo({ top: 0, behavior: "smooth" }); toast("Escolha o turno"); return; }
    if (!occ.machine) { toast("Escolha a máquina"); return; }
    if (!occ.part) { toast("Escolha a peça"); return; }
    if (!occ.problem) { $("occ-problem-text").focus(); toast("Diga qual é o problema"); return; }
    const now = new Date();
    const item = {
      id: newId(), line: LINE, type: "ocorrencia", at: now.toISOString(), date: todayKey(),
      turno: occ.turno, machine: occ.machine, machineName: machineLabel(LINE, occ.machine), part: occ.part, problem: occ.problem, by: user ? user.login : ""
    };
    const all = load(KEY_OCC, []);
    all.unshift(item);
    store(KEY_OCC, all.slice(0, 500));
    queuePush("o", item.id);
    toast("Ocorrência lançada: " + item.machineName);
    // pronto para a próxima: mantém o turno
    occ = { turno: occ.turno, machine: null, part: null, problem: "" };
    $("occ-problem-text").value = "";
    renderOccNew();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* Ocorrências do dia: todas as pessoas (nuvem) + as deste aparelho ainda não enviadas */
  let occDate = null;
  let occRemote = [];
  let occUnwatch = null;
  function stopOccWatch() {
    if (occUnwatch) { try { occUnwatch(); } catch (error) { /* já parado */ } occUnwatch = null; }
  }
  function startOccWatch() {
    stopOccWatch();
    occRemote = [];
    if (!cloudOk() || !Cloud.watchDay) return;
    occUnwatch = Cloud.watchDay("ocorrencias", occDate, items => { occRemote = items; paintOccList(); }, reportSync);
  }
  function shiftDay(key, delta) {
    const date = dateFromKey(key);
    date.setDate(date.getDate() + delta);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }
  function renderOccList() {
    setLine(LINE);
    if (!occDate) occDate = todayKey();
    $("occ-date").value = occDate;
    $("occ-next").disabled = occDate >= todayKey();
    paintOccList();
    startOccWatch();
  }
  $("occ-date").addEventListener("change", event => { if (event.target.value) { occDate = event.target.value; renderOccList(); } });
  $("occ-prev").addEventListener("click", () => { occDate = shiftDay(occDate, -1); renderOccList(); });
  $("occ-next").addEventListener("click", () => { if (occDate < todayKey()) { occDate = shiftDay(occDate, 1); renderOccList(); } });

  function occOfDay() {
    const pending = load(KEY_PENDING, {});
    const byId = new Map(occRemote.map(item => [String(item.id), item]));
    load(KEY_OCC, []).filter(item => item.date === occDate && (pending["o:" + item.id] || !cloudOk()))
      .forEach(item => { if (!byId.has(String(item.id))) byId.set(String(item.id), { ...item, pending: true }); });
    return Array.from(byId.values()).filter(item => !pending["x:o:" + item.id] && lineOf(item) === LINE)
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }

  function bars(container, entries, total) {
    container.innerHTML = "";
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "muted small";
      empty.textContent = "Nada neste dia.";
      container.appendChild(empty);
      return;
    }
    const max = entries[0][1];
    entries.forEach(([label, count]) => {
      const row = document.createElement("div");
      row.className = "occ-bar";
      const name = document.createElement("span");
      name.textContent = label;
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = count + (total ? " (" + Math.round((count / total) * 100) + "%)" : "");
      const track = document.createElement("div");
      track.className = "track";
      const fill = document.createElement("div");
      fill.className = "fill";
      fill.style.width = Math.max(4, (count / max) * 100) + "%";
      track.appendChild(fill);
      row.append(name, num, track);
      container.appendChild(row);
    });
  }

  function paintOccList() {
    if (screenNow !== "occ-list") return;
    const items = occOfDay();
    const count = key => {
      const map = new Map();
      items.forEach(item => map.set(key(item), (map.get(key(item)) || 0) + 1));
      return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "pt-BR", { numeric: true }));
    };
    const turnos = $("occ-turnos");
    turnos.innerHTML = "";
    [["Total", items.length, " total"], ["T1", items.filter(i => i.turno === "T1").length, ""], ["T2", items.filter(i => i.turno === "T2").length, ""], ["T3", items.filter(i => i.turno === "T3").length, ""]]
      .forEach(([label, value, extra]) => {
        const box = document.createElement("div");
        box.className = "counter" + extra;
        const num = document.createElement("strong");
        num.textContent = value;
        const name = document.createElement("span");
        name.textContent = label;
        box.append(num, name);
        turnos.appendChild(box);
      });
    turnos.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
    bars($("occ-by-problem"), count(item => item.problem), items.length);
    bars($("occ-by-machine"), count(item => item.machineName || machineLabel(lineOf(item), item.machine)), items.length);

    const list = $("occ-items");
    list.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "Nenhuma ocorrência neste dia.";
      list.appendChild(empty);
    }
    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "occ-item" + (item.pending ? " pending" : "");
      const top = document.createElement("div");
      top.className = "occ-item-top";
      const title = document.createElement("strong");
      title.textContent = (item.machineName || machineLabel(lineOf(item), item.machine)) + " · " + item.problem;
      top.appendChild(title);
      const mine = user && (item.owner === user.uid || item.pending || item.by === user.login);
      if (mine || (user && user.admin)) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove";
        remove.setAttribute("aria-label", "Apagar ocorrência");
        remove.appendChild(icon("i-trash"));
        remove.addEventListener("click", () => {
          if (!confirm("Apagar esta ocorrência?")) return;
          store(KEY_OCC, load(KEY_OCC, []).filter(other => String(other.id) !== String(item.id)));
          occRemote = occRemote.filter(other => String(other.id) !== String(item.id));
          queueDelete("o", item.id);
          paintOccList();
          toast("Ocorrência apagada");
        });
        top.appendChild(remove);
      }
      const info = document.createElement("small");
      info.textContent = formatTime(new Date(item.at)) + " · " + item.turno + " · " + item.part + (item.by ? " · " + item.by : "") + (item.pending ? " · enviando…" : "");
      card.append(top, info);
      list.appendChild(card);
    });
  }

  /* ---------- Começo ---------- */
  applyCadastro(load(KEY_CADASTRO.injetora, null), "injetora");
  applyCadastro(load(KEY_CADASTRO.estamparia, null), "estamparia");
  applyMasks(load(KEY_MASKS, null));
  migrateOldDrafts();
  go("login");
  loginState("Conectando…", true);
  if (window.Cloud) startCloud();
  else window.addEventListener("cloud-ready", startCloud, { once: true });
  setTimeout(() => {
    if (!window.Cloud) {
      loginState("Entrar", false);
      loginError("Não foi possível conectar ao servidor. Verifique a internet e recarregue a página.");
    }
  }, 12000);
})();
