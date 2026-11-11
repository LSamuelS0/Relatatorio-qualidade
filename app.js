(() => {
  "use strict";

  const DATA = window.QUALITY_REPORT_DATA;
  const machines = DATA.machines;
  const partsByCode = new Map(DATA.parts.map(part => [part.code, part]));
  const selections = new Map();
  const DEFAULT_STATUS = "MÁQUINA PARADA";

  /* Todo relatório começa com as 19 máquinas como paradas. */
  function resetSelections() {
    selections.clear();
    machines.forEach(machine => selections.set(machine.id, DEFAULT_STATUS));
  }

  /* Confere o cadastro ao abrir o app. Problemas aparecem no console. */
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
  let reportStartedAt = new Date();

  const machineList = document.getElementById("machine-list");
  const reportOutput = document.getElementById("report-output");
  const feedback = document.getElementById("feedback");

  const formatDate = date => new Intl.DateTimeFormat("pt-BR").format(date);
  const formatTime = date => new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(date);

  function renderMachines() {
    machineList.innerHTML = "";
    machines.forEach(machine => {
      const row = document.createElement("div");
      row.className = "machine-row";

      const label = document.createElement("label");
      label.className = "machine-label";
      label.htmlFor = "machine-" + machine.id;
      label.innerHTML = "Máquina " + machine.id + "<small>Injetora</small>";

      const select = document.createElement("select");
      select.id = "machine-" + machine.id;
      select.dataset.machineId = String(machine.id);
      select.setAttribute("aria-label", "Seleção da Máquina " + machine.id);

      const placeholder = new Option("Selecione a situação ou peça…", "");
      select.add(placeholder);
      select.add(new Option("SETUP", "SETUP"));
      select.add(new Option("MÁQUINA PARADA", "MÁQUINA PARADA"));

      machine.items.forEach(labelText => {
        select.add(new Option(labelText, labelText));
      });

      select.value = selections.get(machine.id) || "";
      select.addEventListener("change", () => {
        selections.set(machine.id, select.value);
        select.classList.toggle("has-value", Boolean(select.value));
        updateReport();
      });
      select.classList.toggle("has-value", Boolean(select.value));

      row.append(label, select);
      machineList.appendChild(row);
    });
  }

  function buildReport() {
    const lines = [
      "RELATÓRIO DE INÍCIO DE TURNO DA INJETORA",
      "(FABRICAÇÃO DE PLÁSTICO)",
      "",
      "Data: " + formatDate(reportStartedAt),
      "Horário de início: " + formatTime(reportStartedAt),
      "",
      "MÁQUINAS QUE ESTÃO RODANDO NESTE MOMENTO:",
      ""
    ];

    machines.forEach(machine => {
      const status = selections.get(machine.id) || "NÃO INFORMADO";
      lines.push("Máquina " + machine.id + ": " + status);
    });

    return lines.join("\n");
  }

  function updateReport() {
    reportOutput.textContent = buildReport();
    document.getElementById("report-date").textContent = formatDate(reportStartedAt);
    document.getElementById("report-time").textContent = formatTime(reportStartedAt);
  }

  function startNewReport() {
    reportStartedAt = new Date();
    resetSelections();
    renderMachines();
    updateReport();
    feedback.textContent = "Novo relatório iniciado. Data e horário atualizados.";
  }

  async function copyReport() {
    const text = buildReport();
    try {
      await navigator.clipboard.writeText(text);
      feedback.textContent = "Relatório copiado. Você já pode colar onde desejar.";
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      feedback.textContent = copied
        ? "Relatório copiado. Você já pode colar onde desejar."
        : "Não foi possível copiar automaticamente. Selecione o texto do relatório para copiar.";
    }
  }

  async function shareReport() {
    const text = buildReport();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Relatório de Início de Turno da Injetora", text });
        feedback.textContent = "Compartilhamento concluído.";
      } catch (error) {
        if (error && error.name !== "AbortError") {
          feedback.textContent = "Não foi possível abrir o compartilhamento neste dispositivo.";
        }
      }
    } else {
      await copyReport();
      feedback.textContent = "Este navegador não oferece compartilhamento direto. O relatório foi copiado para você colar no aplicativo desejado.";
    }
  }

  document.getElementById("copy-report").addEventListener("click", copyReport);
  document.getElementById("share-report").addEventListener("click", shareReport);
  document.getElementById("new-report").addEventListener("click", startNewReport);

  document.querySelectorAll(".area-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const isInjetora = tab.dataset.area === "injetora";
      document.querySelectorAll(".area-tab").forEach(item => item.classList.toggle("active", item === tab));
      document.getElementById("injetora-panel").hidden = !isInjetora;
      document.getElementById("metal-panel").hidden = isInjetora;
    });
  });
  document.getElementById("back-injetora").addEventListener("click", () => {
    document.querySelector('[data-area="injetora"]').click();
  });

  resetSelections();
  renderMachines();
  updateReport();
})();