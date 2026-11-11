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
    return load(KEY_DRAFTS, []).filter(item => item && item.id && ["inicio", "troca", "bloqueio"].includes(item.type));
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

  /* Marcações automáticas: um relatório novo já vem com as pessoas marcadas no último
     relatório salvo do MESMO tipo (troca → marcações; bloqueio → help chain).
     A pessoa só acrescenta ou tira quem mudou. Hoje: relatórios deste aparelho;
     com o Firebase: os últimos salvos pela própria pessoa. */
  function lastTags(type, key) {
    const last = load(KEY_REPORTS, [])
      .filter(report => report.type === type && report.fields && (report.fields[key] || "").trim())
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0];
    return last ? last.fields[key] : "";
  }

  function newShift() {
    shift = { id: newId(), line: "injetora", type: "troca", startedAt: new Date().toISOString(), date: todayKey(), turno: null,
      fields: { relatorio: "", atencao: "", pendencias: "", bloqueio: "", marcacoes: lastTags("troca", "marcacoes") }, savedId: null };
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
      const value = standardize(report.fields[field.key] || "").split("\n")
        .filter(line => line.trim() !== "-").join("\n").replace(/\s+$/, "").replace(/^\s*\n/, "");
      if (value) lines.push(value);
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
  function lastBlockStatus() {
    return load(KEY_REPORTS, [])
      .filter(report => report.type === "troca" && report.line === "injetora" && report.fields && (report.fields.bloqueio || "").trim())
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0] || null;
  }

  $("pull-block").addEventListener("click", async () => {
    let last = lastBlockStatus();
    if (cloudOk()) {
      try {
        const shared = await Cloud.getLastBlock();
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
  const BLOCK_HEADER = "🔒BLOQUEIO INJETORA | 封锁警报 🔒";
  const BLOCK_FIELDS = [
    { key: "dataProducao", title: "DATA DA PRODUÇÃO 生产日期:" },
    { key: "codigo", title: "CÓDIGO DO MATERIAL 物料编码:" },
    { key: "motivo", title: "MOTIVO 问题描述:", multi: true },
    { key: "quantidade", title: "QUANTIDADE 数量:" },
    { key: "responsavel", title: "RESPONSÁVEL 责任部门:" },
    { key: "criticidade", title: "CRITICIDADE 关键性:" },
    { key: "scrap", title: "SCRAP 废料:" },
    { key: "posicao", title: "POSIÇÃO 物料所在位置:" },
    { key: "helpChain", title: "HELP CHAIN帮助链:" }
  ];
  const PHOTO_BLOCKS = [
    { key: "conforme", title: "CONFORME: ✅" },
    { key: "naoConforme", title: "NÃO CONFORME: ❌" },
    { key: "localizacao", title: "LOCALIZAÇÃO: 📍" }
  ];
  let block = null; // bloqueio em edição

  function newBlock() {
    const fields = {};
    BLOCK_FIELDS.forEach(field => { fields[field.key] = ""; });
    fields.dataProducao = todayKey();
    fields.helpChain = lastTags("bloqueio", "helpChain") || (DATA.helpChainDefault || []).join(" ").toLocaleUpperCase("pt-BR");
    block = { id: newId(), line: "injetora", type: "bloqueio", startedAt: new Date().toISOString(), fields,
      photos: { conforme: null, naoConforme: null, localizacao: [] }, savedId: null };
  }

  function cleanMulti(text) {
    return standardize(text || "").split("\n").filter(line => line.trim() !== "-").join("\n").replace(/\s+$/, "").replace(/^\s*\n/, "");
  }

  function buildBlockText(report) {
    const lines = [BLOCK_HEADER, ""];
    BLOCK_FIELDS.forEach((field, index) => {
      let value = report.fields[field.key] || "";
      if (field.key === "dataProducao") value = value ? formatDate(dateFromKey(value)) : "";
      if (field.multi) {
        const multi = cleanMulti(value);
        lines.push(field.title);
        if (multi) lines.push(multi);
      } else {
        value = value.toLocaleUpperCase("pt-BR").trim();
        lines.push(field.title + (value ? " " + value : " "));
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
  const PRODUCTS = DATA.parts.map(part => ({ code: part.code, name: part.name.toLocaleUpperCase("pt-BR"),
    label: part.code + " - " + part.name.toLocaleUpperCase("pt-BR") }));
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
    const found = PRODUCTS.filter(item => words.every(word => plain(item.label).includes(word)));
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
      title.textContent = item.title;
      const copyTitle = document.createElement("button");
      copyTitle.type = "button";
      copyTitle.className = "btn btn-outline btn-small";
      copyTitle.append(icon("i-copy"), document.createTextNode("Copiar título"));
      copyTitle.addEventListener("click", async () => toast((await copyText(item.title)) ? "Título copiado" : "Não deu para copiar"));
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
        img.alt = item.title + " " + (index + 1);
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
    if (!["machines", "shift", "block", "done"].includes(screenNow)) return;
    const item = screenNow === "machines" ? draft : screenNow === "shift" ? shift : screenNow === "block" ? block : current();
    if (!item || item.savedId || item.pristine) return; // salvo, ou limpo depois de salvar
    if (item.type === "troca" && isEmptyShift(item)) return; // nada escrito ainda
    if (item.type === "bloqueio" && isEmptyBlock(item)) return;
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
    const editing = ["machines", "shift", "block", "done"];
    if (editing.includes(screenNow) && !editing.includes(name)) persistOpen();
    if (name !== "done") justSaved = null;
    screenNow = name;
    if (name === "machines" && !draft) newDraft();
    if (name === "machines") active = "inicio";
    if (name === "shift" && !shift) newShift();
    if (name === "block" && !block) newBlock();
    if (name === "done" && !current()) { go("type"); return; }
    screens.forEach(screen => { screen.hidden = screen.dataset.screen !== name; });
    if (name === "home") renderHome();
    if (name === "machines") renderMachines();
    if (name === "shift") renderShift();
    if (name === "block") renderBlock();
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
    if (item.type === "bloqueio") {
      const code = (item.fields.codigo || "").split(" - ")[0] || "sem código";
      const photos = allIdsOf(item).length;
      return whenLabel(new Date(item.startedAt)) + " · " + code + " · " + photos + (photos === 1 ? " foto" : " fotos");
    }
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
        cleanPhotos();
        toast("Rascunho descartado");
      });

      row.append(open, discard);
      list.appendChild(row);
    });
  }

  function openDraft(item) {
    if (item.type === "bloqueio") {
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
  const current = () => (active === "troca" ? shift : active === "bloqueio" ? block : draft);
  const textOf = report => (report.type === "bloqueio" ? buildBlockText(report) : report.type === "troca" ? buildShiftText(report) : buildText(report));
  const TITLES = { inicio: "Início de turno", troca: "Troca de turno", bloqueio: "Bloqueio" };
  const titleOf = report => (TITLES[report.type] || "Relatório") + " · Injetora";
  const editScreen = () => (active === "troca" ? "shift" : active === "bloqueio" ? "block" : "machines");

  let justSaved = null; // relatório recém-salvo mostrado na tela "Relatório pronto"

  $("done-back").addEventListener("click", () => go(editScreen()));

  function renderDone() {
    const report = current();
    $("done-back-label").textContent = active === "inicio" ? "Corrigir máquinas" : "Corrigir relatório";
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
    } else {
      report.selections = { ...source.selections };
    }
    reports.unshift(report);
    if (!store(KEY_REPORTS, reports.slice(0, 200))) {
      toast("Não foi possível salvar neste aparelho");
      return;
    }
    queuePush("r", report.id);
    if (report.type === "troca" && (report.fields.bloqueio || "").trim() && cloudOk()) {
      Cloud.setLastBlock({ fields: { bloqueio: report.fields.bloqueio }, date: report.date, turno: report.turno, savedAt: report.savedAt })
        .catch(error => console.warn("[Nuvem] último bloqueio", error));
    }
    dropDraft(source.id);
    source.savedId = report.id;
    // Depois de salvar, o formulário fica limpo para o próximo relatório.
    justSaved = report;
    if (source.type === "troca") { newShift(); shift.pristine = true; }
    else if (source.type === "bloqueio") { newBlock(); block.pristine = true; }
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
      sub.textContent = report.type === "bloqueio"
        ? whenLabel(new Date(report.savedAt)) + " · " + ((report.fields.codigo || "").split(" - ")[0] || "sem código")
        : report.type === "troca"
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
    if (shown.type === "troca" || shown.type === "bloqueio") {
      $("view-sub").textContent = "Salvo " + whenLabel(new Date(shown.savedAt)).toLowerCase();
    } else {
      const total = counts(shown.selections);
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
  /* ---------- Nuvem (Firebase): login e sincronização ----------
     O aparelho guarda uma cópia (funciona sem internet) e tudo é enviado para o
     Firebase assim que possível. Ao entrar, o app baixa os relatórios, rascunhos
     e fotos da conta. Pendências de envio ficam em rq.pending.v1. */
  const KEY_PENDING = "rq.pending.v1";
  const KEY_OWNER = "rq.owner.v1";
  const KEY_UPLOADED = "rq.photosUp.v1";
  let user = null;
  const cloudOk = () => Boolean(window.Cloud && user);
  const KIND = { d: "rascunhos", r: "relatorios" };

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
    "unauthenticated": "A sessão expirou. Saia e entre de novo."
  };
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
            await Cloud.remove(KIND[parts[1]], parts[2]);
          } else {
            const list = parts[0] === "d" ? listDrafts() : load(KEY_REPORTS, []);
            const item = list.find(other => String(other.id) === parts[1]);
            if (item) {
              await uploadPhotosOf(item);
              await Cloud.put(KIND[parts[0]], item);
            }
          }
          setPending(key, false);
          if (syncError && !syncError.includes("unavailable")) reportSync(null);
        } catch (error) {
          reportSync(error);
          if (error && ["unavailable", "permission-denied", "not-found", "failed-precondition", "unauthenticated"].includes(error.code)) break;
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
    const [reports, drafts] = await Promise.all([Cloud.listMine("relatorios"), Cloud.listMine("rascunhos")]);
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
  });

  async function onLogin(account) {
    const owner = load(KEY_OWNER, null);
    if (owner && owner !== account.uid) {
      // outra pessoa entrou neste aparelho: limpa a cópia local da conta anterior
      [KEY_REPORTS, KEY_DRAFTS].forEach(key => store(key, []));
      store(KEY_PENDING, {});
      store(KEY_UPLOADED, {});
    } else if (!owner) {
      // o que foi feito antes do login vai para esta conta
      load(KEY_REPORTS, []).forEach(item => setPending("r:" + item.id, true));
      listDrafts().forEach(item => setPending("d:" + item.id, true));
    }
    store(KEY_OWNER, account.uid);
    user = account;
    draft = null; shift = null; block = null;
    $("user-name").textContent = account.admin ? "ADM" : account.login;
    $("user-chip").hidden = false;
    paintSync();
    go("home");
    try {
      await flush();
      await pull();
      startWatching();
    } catch (error) {
      reportSync(error);
      toast(navigator.onLine ? "Problema na nuvem: toque na bolinha ao lado do seu nome" : "Sem internet: mostrando o que está no aparelho");
    }
    if (screenNow === "home") renderHome();
    cleanPhotos();
  }

  function onLogout() {
    stopWatching();
    syncError = null;
    user = null;
    draft = null; shift = null; block = null;
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

  /* ---------- Começo ---------- */
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
