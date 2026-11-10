(() => {
  "use strict";

  const machines = window.QUALITY_REPORT_DATA.machines;
  const selections = new Map();
  let reportStartedAt = new Date();

  const machineList = document.getElementById("machine-list");
  const reportOutput = document.getElementById("report-output");
  const feedback = document.getElementById("feedback");

  const formatDate = date => new Intl.DateTimeFormat("pt-BR").format(date);
  const formatTime = date => new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(date);

  function optionLabel(part) {
    if (!part.models || part.models.length === 0) return part.name;
    return part.name + " — " + part.models.join(", ");
  }

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

      machine.parts.forEach(part => {
        const labelText = optionLabel(part);
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
    selections.clear();
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

  renderMachines();
  updateReport();
})();