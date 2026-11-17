/* =====================================================================
   CORRETOR DE TEXTO (português do Brasil, funciona sem internet)
   ---------------------------------------------------------------------
   Encontra palavras sem acento ou escritas errado e sugere a forma certa.
   Nada é trocado sozinho: o app mostra as sugestões embaixo da caixa de
   texto e a pessoa toca para corrigir (uma por uma ou "Corrigir tudo").

   Três fontes de correção, nesta ordem:
   1. ERROS: palavras escritas errado (POBREMA → PROBLEMA).
   2. ACENTOS: palavras que só existem com acento (MAQUINA → MÁQUINA).
   3. REGRAS: terminações que sempre têm acento ou cedilha
      (-CAO → -ÇÃO, -AVEL → -ÁVEL, -ENCIA → -ÊNCIA, -ARIO → -ÁRIO...).
   Palavras que existem com e sem acento (ESTA/ESTÁ, E/É, PRATICA/PRÁTICA)
   ficam de fora de propósito: o corretor nunca troca o que pode estar certo.

   Para acrescentar palavras: ponha a forma CERTA em ACENTOS (o corretor tira
   o acento sozinho para achar a errada) ou o par ERRADO=CERTO em ERROS.
   Expõe window.Corretor = { suggest(texto), apply(texto, sugestões) }.
   ===================================================================== */
(() => {
  "use strict";

  const strip = word => word.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");

  /* Palavras que só existem com acento ou cedilha (forma certa). */
  const ACENTOS = `
    MÁQUINA MÁQUINAS PEÇA PEÇAS ÁREA ÁREAS ÚLTIMO ÚLTIMA ÚLTIMOS ÚLTIMAS PRÓXIMO PRÓXIMA
    PRÓXIMOS PRÓXIMAS JÁ SÓ HÁ TAMBÉM ATÉ APÓS ALÉM PORÉM ALGUÉM NINGUÉM PARABÉNS CONTÉM
    MANTÉM OBTÉM VOCÊ VOCÊS TRÊS MÊS MESES PORTUGUÊS CHINÊS INGLÊS ÍMÃ ÍMÃS IRMÃ MANHÃ AMANHÃ
    NÍVEL NÍVEIS VÁLVULA VÁLVULAS ÓLEO ÓLEOS ÁGUA TÉCNICO TÉCNICA TÉCNICOS TÉCNICAS
    ELÉTRICO ELÉTRICA ELÉTRICOS ELÉTRICAS ELETRÔNICA ELETRÔNICO ELETRÔNICOS MECÂNICO MECÂNICA
    MECÂNICOS HIDRÁULICO HIDRÁULICA PNEUMÁTICO PNEUMÁTICA AUTOMÁTICO AUTOMÁTICA AUTOMÁTICOS
    AUTOMÁTICAS PLÁSTICO PLÁSTICA PLÁSTICOS CRÍTICO CRÍTICOS ESPECÍFICOS
    ANÁLISE ANÁLISES PERÍODO PERÍODOS NÚMERO NÚMEROS CÓDIGO CÓDIGOS DEPÓSITO
    RÁPIDO RÁPIDA RÁPIDOS ÚNICO ÚNICA ÚNICOS VÍDEO MÉDIA MÉDIO MÍNIMO MÍNIMA MÁXIMO MÁXIMA
    PÁGINA FÁBRICA MÉTODO MÉTODOS CARACTERÍSTICA CARACTERÍSTICAS ESTÉTICO ESTÉTICA CÉLULA
    CÉLULAS ÍNDICE ÍNDICES ÂNGULO ÂNGULOS DIÂMETRO DIÂMETROS PARÂMETRO PARÂMETROS MATÉRIA
    VÁCUO RESÍDUO RESÍDUOS SÁBADO TERÇA ESPAÇO ESPAÇOS COMEÇO COMEÇOU COMEÇAR COMEÇANDO
    COMEÇA PREÇO SERVIÇO SERVIÇOS FORÇA BRAÇO BRAÇOS PEDAÇO PEDAÇOS ENDEREÇO CABEÇA CABEÇOTE
    CABEÇOTES CALÇO CALÇOS AVANÇO DIFERENÇA DIFERENÇAS PRESENÇA LICENÇA SEGURANÇA MUDANÇA
    MUDANÇAS LIDERANÇA BALANÇA AÇO AÇOS ALMOÇO FAÇO LÂMPADA LÂMPADAS ÓTIMO ÓTIMA PÉSSIMO
    PÉSSIMA FÁCIL DIFÍCIL ÚTIL INÚTIL SAÍDA SAÍDAS CAÍDA SUBSTITUÍDO SUBSTITUÍDA SUBSTITUÍDOS
    INCLUÍDO INCLUÍDA CONCLUÍDO CONCLUÍDA CONSTRUÍDO DISTRIBUÍDO PRÉDIO LOGÍSTICA POLÍTICA
    SÉRIE SÉRIES ESPÉCIE SUPERFÍCIE SUPERFÍCIES VÁRIOS VÁRIAS PRÓPRIO PRÓPRIA
    PRÓPRIOS PRÓPRIAS GRÁFICO GRÁFICOS FÓRMULA ÉPOCA LÍDER LÍDERES SÓLIDO LÍQUIDO QUÍMICO
    QUÍMICA TÓXICO ÚMIDO ÚMIDA ÊMBOLO ROBÔ ROBÔS ESTÁVEL INSTÁVEL CÍRCULO VEÍCULO VEÍCULOS
    TÍTULO ARTIGO ÚLTIMOS FÍSICO FÍSICA LÓGICA CÂMERA CÂMERAS CÂMARA HÍBRIDO ELÁSTICO
    ELÁSTICA BORRACHA CARTÃO MÓDULO MÓDULOS SÍMBOLO TRÂNSITO ÔNIBUS PÂNICO RÍGIDO RÍGIDA
    TRÁFEGO VERSÁTIL PRÉVIO PRÉVIA ALUMÍNIO CERÂMICA METÁLICO METÁLICA ACRÍLICO SILICONE
    TÉRMICO TÉRMICA ESTÁTICO ESTÁTICA DINÂMICO DINÂMICA PRÁTICOS ÁCIDO ÓCULOS LUVAS
    HÍDRICO ELÉTRICAS ÚLTIMAS EXTREMIDADE FUSÍVEIS ÓRGÃO ÓRGÃOS SÍTIO
    SEGUINTE TAMBÉM CRITÉRIO CRITÉRIOS MISTÉRIO HISTÓRICO HISTÓRICA HISTÓRIA
    MEMÓRIA VITÓRIA TRAJETÓRIA ESTRATÉGIA ESTRATÉGICO ACADÊMICO ECONÔMICO
    ECONÔMICA ATÔMICO ERGONÔMICO ERGONÔMICA AGRONÔMICO AUTÔNOMO PROGNÓSTICO DIAGNÓSTICO
    TRÂNSITO EMERGÊNCIA PRÉ-SÉRIE MATÉRIA-PRIMA RECÉM PÊNDULO TRÍPLICE MÚLTIPLO MÚLTIPLA
  `.split(/\s+/).filter(Boolean)
    // tira as que não têm acento (ficaram na lista só por engano) e as ambíguas
    .filter(word => strip(word) !== word);

  /* Palavras escritas errado → forma certa. */
  const ERROS = `
    POBREMA=PROBLEMA PROBREMA=PROBLEMA POBLEMA=PROBLEMA POBREMAS=PROBLEMAS PROBREMAS=PROBLEMAS
    CONCERTAR=CONSERTAR CONCERTADO=CONSERTADO CONCERTADA=CONSERTADA CONCERTO=CONSERTO
    CONCERTOU=CONSERTOU CONCERTANDO=CONSERTANDO MECHER=MEXER MECHEU=MEXEU MECHENDO=MEXENDO
    MECHIDO=MEXIDO ENCHERGAR=ENXERGAR PARALIZADO=PARALISADO PARALIZADA=PARALISADA
    PARALIZAR=PARALISAR PARALIZOU=PARALISOU PARALIZACAO=PARALISAÇÃO ANALIZE=ANÁLISE
    ANALIZES=ANÁLISES ANALIZAR=ANALISAR ANALIZADO=ANALISADO ANALIZADA=ANALISADA
    ANALIZANDO=ANALISANDO ANALIZOU=ANALISOU ATRAZ=ATRÁS ATRAZO=ATRASO ATRAZADO=ATRASADO
    ATRAZADA=ATRASADA ATRAZOU=ATRASOU EXCESSAO=EXCEÇÃO ESCESSO=EXCESSO ECESSO=EXCESSO
    EXESSO=EXCESSO EXCESO=EXCESSO ESESSO=EXCESSO MENAS=MENOS SEJE=SEJA ESTEJE=ESTEJA
    QUIZ=QUIS QUIZER=QUISER QUIZERAM=QUISERAM PUZ=PUS TRASER=TRAZER TROUCE=TROUXE
    TROUSE=TROUXE TROXE=TROUXE INDENTIFICAR=IDENTIFICAR INDENTIFICADO=IDENTIFICADO
    INDENTIFICADA=IDENTIFICADA INDENTIFICACAO=IDENTIFICAÇÃO PRESISA=PRECISA PRESISO=PRECISO
    PRECISSA=PRECISA PRESISOU=PRECISOU NESESSARIO=NECESSÁRIO NECESARIO=NECESSÁRIO
    NESCESSARIO=NECESSÁRIO NESESSARIA=NECESSÁRIA NECESARIA=NECESSÁRIA NESCESSARIA=NECESSÁRIA
    NESCESSIDADE=NECESSIDADE NECESIDADE=NECESSIDADE NESESSIDADE=NECESSIDADE
    CONCERTEZA=COM_CERTEZA CONSERTEZA=COM_CERTEZA DERREPENTE=DE_REPENTE APARTIR=A_PARTIR
    EMCIMA=EM_CIMA DENOVO=DE_NOVO MAIZ=MAIS TAMEM=TAMBÉM TAMBEN=TAMBÉM TAMBÉN=TAMBÉM
    OBSERVASAO=OBSERVAÇÃO OBSERVASSAO=OBSERVAÇÃO MANUTENSAO=MANUTENÇÃO MANUTENSSAO=MANUTENÇÃO
    MANUTENÇAO=MANUTENÇÃO INSPESSAO=INSPEÇÃO INSPESAO=INSPEÇÃO PRODUSSAO=PRODUÇÃO
    PRODUSAO=PRODUÇÃO SITUASAO=SITUAÇÃO SITUASSAO=SITUAÇÃO OPERASSAO=OPERAÇÃO
    OPERASAO=OPERAÇÃO LIBERASAO=LIBERAÇÃO LIBERASSAO=LIBERAÇÃO ATENSAO=ATENÇÃO
    SOLUSAO=SOLUÇÃO SOLUSSAO=SOLUÇÃO POSISSAO=POSIÇÃO POSISAO=POSIÇÃO CONDISSAO=CONDIÇÃO
    CONDISAO=CONDIÇÃO FUNSAO=FUNÇÃO VARIASAO=VARIAÇÃO VARIASSAO=VARIAÇÃO
    INJESSAO=INJEÇÃO INJESAO=INJEÇÃO REJEISSAO=REJEIÇÃO CORRESSAO=CORREÇÃO CORRESAO=CORREÇÃO
    PESSA=PEÇA PESSAS=PEÇAS MAQINA=MÁQUINA MAQINAS=MÁQUINAS MAQUNA=MÁQUINA
    ACONTESEU=ACONTECEU ACONTESE=ACONTECE ACONTESENDO=ACONTECENDO ACONTECEO=ACONTECEU
    FAUTA=FALTA FAUTANDO=FALTANDO FAUTOU=FALTOU CONSEGUIL=CONSEGUIU CONSEGIU=CONSEGUIU
    SEGIU=SEGUIU SEGUIL=SEGUIU RESOVIDO=RESOLVIDO RESOVIDA=RESOLVIDA PROSESSO=PROCESSO
    PROCESO=PROCESSO PROSSESSO=PROCESSO PROSESSOS=PROCESSOS SUSSESSO=SUCESSO ASIM=ASSIM
    XEGOU=CHEGOU ENCAICHE=ENCAIXE BAICHO=BAIXO EMBALAJEM=EMBALAGEM MONTAJEM=MONTAGEM
    ELETRISISTA=ELETRICISTA ELETRECISTA=ELETRICISTA SOUDA=SOLDA SOUDADO=SOLDADO
    SOUDADA=SOLDADA SOUDAS=SOLDAS QUEBADO=QUEBRADO QUEBADA=QUEBRADA TRINCADA=TRINCADA
    REBARVA=REBARBA REBARVAS=REBARBAS DEFEITUSO=DEFEITUOSO DEFEITUSA=DEFEITUOSA
    DEFORMASAO=DEFORMAÇÃO CONTAMINASAO=CONTAMINAÇÃO TEMPERATUA=TEMPERATURA
    TEMPERATRA=TEMPERATURA PRESAO=PRESSÃO EXPESSURA=ESPESSURA ESPESURA=ESPESSURA
    DIMENSAO=DIMENSÃO DIMENÇÃO=DIMENSÃO DIMENÇAO=DIMENSÃO DIMENSSAO=DIMENSÃO
    ENTAO=ENTÃO INTÃO=ENTÃO INTAO=ENTÃO ESTAVÃO=ESTAVAM
    FALTAVÃO=FALTAVAM RODAVÃO=RODAVAM OPERDOR=OPERADOR OPERARDOR=OPERADOR
    SUPERVISSOR=SUPERVISOR INSPETORA=INSPETORA QUALIDDE=QUALIDADE QUALIADE=QUALIDADE
    MANUTECAO=MANUTENÇÃO MANUNTENCAO=MANUTENÇÃO MANUNTENÇÃO=MANUTENÇÃO MANUTENÇAÕ=MANUTENÇÃO
    FERRAMETARIA=FERRAMENTARIA FERAMENTARIA=FERRAMENTARIA ENGENHARA=ENGENHARIA
    INGENHARIA=ENGENHARIA LOGISTCA=LOGÍSTICA BLOQEIO=BLOQUEIO BLOQUEO=BLOQUEIO
    BLOQUIADO=BLOQUEADO BLOQUIADA=BLOQUEADA BLOQUIAR=BLOQUEAR BLOQEADO=BLOQUEADO
    LIBERDO=LIBERADO ALINHAMETO=ALINHAMENTO ALINHAMNTO=ALINHAMENTO PENDENSIA=PENDÊNCIA
    PENDENSIAS=PENDÊNCIAS OCORENCIA=OCORRÊNCIA OCORENCIAS=OCORRÊNCIAS OCORRENSIA=OCORRÊNCIA
    EVIDENSIA=EVIDÊNCIA EVIDENSIAS=EVIDÊNCIAS
  `.split(/\s+/).filter(Boolean).map(pair => pair.split("="))
    .filter(([wrong, right]) => wrong && right && wrong !== right)
    .map(([wrong, right]) => [wrong, right.replace(/_/g, " ")]);

  const MAP = new Map();
  ACENTOS.forEach(word => { if (!MAP.has(strip(word))) MAP.set(strip(word), word); });
  ERROS.forEach(([wrong, right]) => { if (!wrong.includes("_")) MAP.set(wrong, right); });

  /* Palavras certas que as regras confundiriam. */
  const KEEP = new Set(["AO", "AOS", "CAOS", "VARIO", "VICIO", "AGENCIA"].map(strip));

  /* Terminações que sempre levam acento/cedilha. Recebe a palavra em maiúsculas sem acento. */
  function byRule(word) {
    if (word.length < 3 || KEEP.has(word)) return null;
    // -CAO → -ÇÃO (FUNCAO, MANUTENCAO), menos depois de L e S (BALCÃO, FALCÃO) e CÃO sozinho
    let match = word.match(/^(.*?)(C?)AO$/);
    if (match && word !== "AO") {
      const [, root, c] = match;
      if (c && root && !/[LS]$/.test(root)) return root + "ÇÃO";
      return root + c + "ÃO";
    }
    match = word.match(/^(.+?)(C?)OES$/);
    if (match && word.length >= 5) {
      const [, root, c] = match;
      if (c && !/[LS]$/.test(root)) return root + "ÇÕES";
      return root + c + "ÕES";
    }
    if (word.length >= 4 && /[^C]AOS$/.test(word)) return word.slice(0, -3) + "ÃOS";
    const rules = [
      [/^(.{2,})AVEL$/, "ÁVEL"], [/^(.{2,})IVEL$/, "ÍVEL"], [/^(.{2,})OVEL$/, "ÓVEL"],
      [/^(.{2,})AVEIS$/, "ÁVEIS"], [/^(.{2,})IVEIS$/, "ÍVEIS"], [/^(.{2,})OVEIS$/, "ÓVEIS"],
      [/^(.{2,})ENCIA$/, "ÊNCIA"], [/^(.{2,})ENCIAS$/, "ÊNCIAS"],
      [/^(.{2,})ANCIA$/, "ÂNCIA"], [/^(.{2,})ANCIAS$/, "ÂNCIAS"],
      [/^(.{2,})ARIO$/, "ÁRIO"], [/^(.{2,})ARIOS$/, "ÁRIOS"],
      [/^(.{2,})ORIO$/, "ÓRIO"], [/^(.{2,})ORIOS$/, "ÓRIOS"],
      [/^(.{2,})ERIO$/, "ÉRIO"], [/^(.{2,})ERIOS$/, "ÉRIOS"],
      [/^(.{2,})ICIO$/, "ÍCIO"], [/^(.{2,})ICIOS$/, "ÍCIOS"],
      [/^(.{3,})OMETRO$/, "ÔMETRO"], [/^(.{3,})OMETROS$/, "ÔMETROS"]
    ];
    for (const [pattern, ending] of rules) {
      const found = word.match(pattern);
      if (found) return found[1] + ending;
    }
    return null;
  }

  /* Mantém o jeito que a pessoa escreveu: MAIÚSCULAS, minúsculas ou Primeira maiúscula. */
  function sameCase(original, fixed) {
    if (original === original.toLocaleUpperCase("pt-BR")) return fixed.toLocaleUpperCase("pt-BR");
    const lower = fixed.toLocaleLowerCase("pt-BR");
    if (original[0] === original[0].toLocaleUpperCase("pt-BR")) return lower[0].toLocaleUpperCase("pt-BR") + lower.slice(1);
    return lower;
  }

  function fixWord(word) {
    const upper = word.toLocaleUpperCase("pt-BR");
    // palavra já com acento: só corrige se for um erro conhecido
    if (MAP.has(upper)) {
      const right = MAP.get(upper);
      return right === upper ? null : sameCase(word, right);
    }
    // sem acento ou com acento incompleto (MANUTENÇAO): procura a forma certa
    const bare = strip(upper);
    const right = MAP.get(bare) || byRule(bare);
    return right && right !== upper ? sameCase(word, right) : null;
  }

  /* Lista de sugestões: [{ index, from, to }]. skipAt = posição do cursor
     (a palavra que ainda está sendo digitada fica de fora). */
  function suggest(text, skipAt) {
    const found = [];
    const pattern = /[\p{L}]+(?:-[\p{L}]+)?/gu;
    let match;
    while ((match = pattern.exec(String(text || "")))) {
      const word = match[0];
      const index = match.index;
      const before = text[index - 1];
      const after = text[index + word.length];
      if (before === "@" || /[\d_]/.test(before || "") || /[\d_]/.test(after || "")) continue; // @nome, códigos
      if (typeof skipAt === "number" && skipAt >= index && skipAt <= index + word.length) continue;
      const to = fixWord(word);
      if (to) found.push({ index, from: word, to });
    }
    return found;
  }

  /* Aplica as sugestões (de trás para frente, para as posições não mudarem). */
  function apply(text, list) {
    let out = String(text || "");
    list.slice().sort((a, b) => b.index - a.index).forEach(item => {
      if (out.substr(item.index, item.from.length) === item.from) {
        out = out.slice(0, item.index) + item.to + out.slice(item.index + item.from.length);
      }
    });
    return out;
  }

  window.Corretor = { suggest, apply, fixWord };
})();
