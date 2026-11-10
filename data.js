/* Cadastro inicial das máquinas da Injetora.
   A ordem e a quantidade das máquinas do relatório são fixas.
   Compatibilidades do modelo 640 não são presumidas: ele permanece em desenvolvimento,
   exceto nos casos explicitamente confirmados no cadastro abaixo. */
window.QUALITY_REPORT_DATA = {
  machines: [
    { id: 1, parts: [
      { name: "Cesto Externo", models: ["550", "580", "601", "640"] }
    ]},
    { id: 2, parts: [
      { name: "Cesto Externo", models: ["550", "580", "601", "640"] }
    ]},
    { id: 3, parts: [
      { name: "Conjunto do Agitador", models: ["580/601"] }
    ]},
    { id: 4, parts: [
      { name: "Balancer (Ring Up + Ring Down)", models: ["550"] },
      { name: "Body-B", models: ["550", "580", "601"] }
    ]},
    { id: 5, parts: [
      { name: "Body-B", models: ["550", "580", "601"] }
    ]},
    { id: 6, parts: [
      { name: "Proteção do Motor", models: ["550", "580", "601", "640"] }
    ]},
    { id: 7, parts: [
      { name: "Balancer (Ring Up + Ring Down)", models: ["580"] },
      { name: "Dispenser Case A", models: [] },
      { name: "Tub D", models: ["580/601"] }
    ]},
    { id: 8, parts: [
      { name: "Pulsador", models: ["580/601"] }
    ]},
    { id: 9, parts: [
      { name: "Pulsador", models: ["580/601"] }
    ]},
    { id: 10, parts: [
      { name: "Tampa Traseira", models: ["550", "580", "601"] }
    ]},
    { id: 11, parts: [
      { name: "Body-B", models: ["550", "580", "601"] },
      { name: "Base", models: ["550", "580", "601"] }
    ]},
    { id: 12, parts: [
      { name: "Gaveta do Dispenser", models: [] }
    ]},
    { id: 13, parts: [
      { name: "Tampa Superior / Moldura", models: ["550", "580", "601"] }
    ]},
    { id: 14, parts: [
      { name: "Tampa Superior / Moldura", models: ["550", "580", "601"] }
    ]},
    { id: 15, parts: [
      { name: "Balancer (Ring Up + Ring Down)", models: ["580", "601"] }
    ]},
    { id: 16, parts: [
      { name: "Base", models: ["550", "580", "601"] }
    ]},
    { id: 17, parts: [
      { name: "Balancer (Ring Up + Ring Down)", models: ["580", "601"] }
    ]},
    { id: 18, parts: [
      { name: "Capa do Cesto", models: ["580/601"] }
    ]},
    { id: 19, parts: [
      { name: "Tub D", models: ["580/601"] }
    ]}
  ]
};