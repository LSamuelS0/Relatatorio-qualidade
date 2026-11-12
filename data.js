/* =====================================================================
   CADASTRO DA INJETORA
   ---------------------------------------------------------------------
   1) parts      → catálogo oficial, copiado da tabela CTQ (BOM Injection
                   Parts). Uma linha = um código = uma peça física.
   2) items      → o que aparece na lista da máquina e no relatório.
                   Cada item aponta para um ou mais códigos do catálogo.
   3) machines   → as 19 máquinas, na ordem fixa, com os itens que rodam.

   REGRA DA VÍRGULA E DA BARRA
   - "580/601" no nome do item = UMA peça (um código só, serve aos dois
     modelos). Ex.: "Pulsador 580/601".
   - Modelos que seriam escritos com vírgula ("Tub D 580, 601") são itens
     SEPARADOS, cada um com seu próprio código. Ex.: "Tub D 580" e "Tub D 601".
   Por isso um item com barra precisa apontar para UM código, e itens com
   códigos diferentes nunca podem ser unidos por barra. O app confere isso
   ao abrir (veja o console do navegador).

   Exceção combinada: "Balancer <modelo>" representa o par Ring Up + Ring
   Down do mesmo modelo, por isso aponta para dois códigos.

   Modelo 640: em desenvolvimento, sem código na CTQ. Aparece só onde foi
   confirmado (code: null).
   ===================================================================== */
window.QUALITY_REPORT_DATA = {
  parts: [
    // ---- Modelo 550 ----
    { code: "L2138000000343", name: "Agitador 550", it: null },
    { code: "L2138000000325", name: "Back Control (Painel) 550", it: null },
    { code: "L2138000000321", name: "Balancer Ring Down 550", it: null },
    { code: "L2138000000301", name: "Balancer Ring Up 550", it: null },
    { code: "L2138000000304", name: "Base 550", it: null },
    { code: "L2138000000323", name: "Body-B 550", it: null },
    { code: "L2138000000303", name: "Capa do Cesto 550", it: null },
    { code: "L2138000000305", name: "Cesto Externo 550", it: null },
    { code: "L2138000000328", name: "Tampa Superior 550", it: null },
    { code: "L2138000000327", name: "Case do Ímã 550", it: null },
    { code: "L2138000000322", name: "Tampa Traseira 550", it: null },
    { code: "L2138000000302", name: "Tub D 550", it: null },

    // ---- Modelo 580 ----
    { code: "L2138000A00033", name: "Balancer Ring Down 580", it: "MIDB(Y)-IT-FFC-PQC012" },
    { code: "L2138000A00011", name: "Balancer Ring Up 580", it: "MIDB(Y)-IT-FFC-PQC011" },
    { code: "L2138000000443", name: "Base A 580 4 Pés Ajustáveis", it: "MIDB(Y)-IT-FFC-PQC035" },
    { code: "L2138000A00024", name: "Body-B 580", it: "MIDB(Y)-IT-FFC-PQC008" },
    { code: "L2138000000384", name: "Body-B 580 Titânio", it: "MIDB(Y)-IT-FFC-PQC008" },
    { code: "L2138000A00025", name: "Capa do Cesto 580", it: "MIDB(Y)-IT-FFC-PQC020" },
    { code: "L2138000A00026", name: "Cesto Externo 580", it: "MIDB(Y)-IT-FFC-PQC007" },
    { code: "L2138000A00005", name: "Tampa Superior 580", it: "MIDB(Y)-IT-FFC-PQC019" },
    { code: "L2138000000021", name: "Tampa Traseira 580", it: "MIDB(Y)-IT-FFC-PQC013" },
    { code: "L2138000000184", name: "Tub D MAL 120", it: "MIDB(Y)-IT-FFC-PQC021" },
    { code: "L2138000A00032", name: "Tub D 580", it: "MIDB(Y)-IT-FFC-PQC017" },

    // ---- Modelo 601 ----
    { code: "L2138000A00038", name: "Balancer Ring Down 601", it: "MIDB(Y)-IT-FFC-PQC012" },
    { code: "L2138000A00037", name: "Balancer Ring Up 601", it: "MIDB(Y)-IT-FFC-PQC011" },
    { code: "L2138000000563", name: "Base A 601", it: "MIDB(Y)-IT-FFC-PQC009" },
    { code: "L2138000A00009", name: "Body-B 601", it: "MIDB(Y)-IT-FFC-PQC008" },
    { code: "L2138000000364", name: "Body-B 601 Titânio", it: "MIDB(Y)-IT-FFC-PQC008" },
    { code: "L2138000A00036", name: "Capa do Cesto 601", it: "MIDB(Y)-IT-FFC-PQC020" },
    { code: "L2138000A00035", name: "Cesto Externo 601", it: "MIDB(Y)-IT-FFC-PQC007" },
    { code: "L2138000A00031", name: "Tampa Superior 601", it: "MIDB(Y)-IT-FFC-PQC019" },
    { code: "L2138000000001", name: "Tampa Traseira 601", it: "MIDB(Y)-IT-FFC-PQC013" },
    { code: "L2138000000201", name: "Tub D MAL 140", it: "MIDB(Y)-IT-FFC-PQC021" },
    { code: "L2138000A00039", name: "Tub D 601", it: "MIDB(Y)-IT-FFC-PQC017" },

    // ---- Peças compartilhadas / sem modelo ----
    { code: "L2138000A00021", name: "Agitador 580/601", it: "MIDB(Y)-IT-FFC-PQC010" },
    { code: "L2138000000182", name: "Capa do Pulsador Impeller", it: "MIDB(Y)-IT-FFC-PQC022" },
    { code: "L2138000000281", name: "Dispenser Case A (Tampa)", it: "MIDB(Y)-IT-FFC-PQC014" },
    { code: "L2138000000262", name: "Dispenser Case B (Caixa)", it: "MIDB(Y)-IT-FFC-PQC015" },
    { code: "L2138000000261", name: "Dispenser Case Soldado", it: "MIDB(Y)-IT-FFC-PQC016" },
    { code: "L2138000000263", name: "Gaveta Dispenser", it: "MIDB(Y)-IT-FFC-PQC029" },
    { code: "L2138000A00002", name: "Pulsador 580/601", it: "MIDB(Y)-IT-FFC-PQC018" },
    { code: "L2138000000183", name: "Pulsador Impeller", it: "MIDB(Y)-IT-FFC-PQC023" },
    { code: "L2138000A00004", name: "Case do Ímã 580/601", it: "MIDB(Y)-IT-FFC-PQC034" },
    { code: "L2138000A00029", name: "Proteção do Motor", it: "MIDB(Y)-IT-FFC-PQC006" }
  ],

  /* Texto do item (como sai no relatório) → código(s) do catálogo. */
  items: {
    "Cesto Externo 550": ["L2138000000305"],
    "Cesto Externo 580": ["L2138000A00026"],
    "Cesto Externo 601": ["L2138000A00035"],
    "Cesto Externo 640": [null],

    "Conjunto do Agitador 580/601": ["L2138000A00021"],

    "Balancer 550": ["L2138000000301", "L2138000000321"],
    "Balancer 580": ["L2138000A00011", "L2138000A00033"],
    "Balancer 601": ["L2138000A00037", "L2138000A00038"],

    "Body-B 550": ["L2138000000323"],
    "Body-B 580": ["L2138000A00024"],
    "Body-B 601": ["L2138000A00009"],

    // Mesmo código na CTQ para 550/580/601; 640 ainda sem código.
    "Proteção do Motor 550": ["L2138000A00029"],
    "Proteção do Motor 580": ["L2138000A00029"],
    "Proteção do Motor 601": ["L2138000A00029"],
    "Proteção do Motor 640": [null],

    "Dispenser Case A": ["L2138000000281"],
    "Gaveta do Dispenser": ["L2138000000263"],

    "Tub D 580": ["L2138000A00032"],
    "Tub D 601": ["L2138000A00039"],

    "Pulsador 580/601": ["L2138000A00002"],

    "Tampa Traseira 550": ["L2138000000322"],
    "Tampa Traseira 580": ["L2138000000021"],
    "Tampa Traseira 601": ["L2138000000001"],

    "Base 550": ["L2138000000304"],
    "Base 580": ["L2138000000443"],
    "Base 601": ["L2138000000563"],

    "Tampa Superior / Moldura 550": ["L2138000000328"],
    "Tampa Superior / Moldura 580": ["L2138000A00005"],
    "Tampa Superior / Moldura 601": ["L2138000A00031"],

    "Capa do Cesto 580": ["L2138000A00025"],
    "Capa do Cesto 601": ["L2138000A00036"]
  },

  /* Help chain: nomes que já vêm preenchidos em todo bloqueio novo (a pessoa marca no Meixin).
     Deixe vazio ([]) para o campo começar em branco. */
  helpChainDefault: [],

  /* Ocorrências: lista de problemas (o dono vai passar). Enquanto estiver vazia,
     o problema é escrito à mão. Com itens, viram botões + "Outro". */
  problemas: [],

  machines: [
    { id: 1,  items: ["Cesto Externo 550", "Cesto Externo 580", "Cesto Externo 601", "Cesto Externo 640"] },
    { id: 2,  items: ["Cesto Externo 550", "Cesto Externo 580", "Cesto Externo 601", "Cesto Externo 640"] },
    { id: 3,  items: ["Conjunto do Agitador 580/601"] },
    { id: 4,  items: ["Balancer 550", "Body-B 550", "Body-B 580", "Body-B 601"] },
    { id: 5,  items: ["Body-B 550", "Body-B 580", "Body-B 601"] },
    { id: 6,  items: ["Proteção do Motor 550", "Proteção do Motor 580", "Proteção do Motor 601", "Proteção do Motor 640"] },
    { id: 7,  items: ["Balancer 580", "Dispenser Case A", "Tub D 580", "Tub D 601"] },
    { id: 8,  items: ["Pulsador 580/601", "Conjunto do Agitador 580/601"] },
    { id: 9,  items: ["Pulsador 580/601"] },
    { id: 10, items: ["Tampa Traseira 550", "Tampa Traseira 580", "Tampa Traseira 601"] },
    { id: 11, items: ["Body-B 550", "Body-B 580", "Body-B 601", "Base 550", "Base 580", "Base 601"] },
    { id: 12, items: ["Gaveta do Dispenser"] },
    { id: 13, items: ["Tampa Superior / Moldura 550", "Tampa Superior / Moldura 580", "Tampa Superior / Moldura 601"] },
    { id: 14, items: ["Tampa Superior / Moldura 550", "Tampa Superior / Moldura 580", "Tampa Superior / Moldura 601"] },
    { id: 15, items: ["Balancer 580", "Balancer 601"] },
    { id: 16, items: ["Base 550", "Base 580", "Base 601"] },
    { id: 17, items: ["Balancer 580", "Balancer 601"] },
    { id: 18, items: ["Capa do Cesto 580", "Capa do Cesto 601"] },
    { id: 19, items: ["Tub D 580", "Tub D 601"] }
  ]
};
