# Relatório da Qualidade — contexto do projeto

> Leia este arquivo antes de qualquer mudança. Ele resume o que o app faz hoje, as regras
> que precisam ser seguidas e o que está planejado. Atualize-o sempre que algo mudar.

## Regras do Firebase (pedido do dono, 12/11/2026)

Sempre que uma mudança precisar de regra nova ou diferente no Firebase (`firestore.rules`), **avisar o dono claramente** e passar o texto completo das regras para ele colar no console do Firebase (Firestore → Regras → Publicar). Se não precisar, dizer que não precisa.

## Para que serve

App web (HTML/CSS/JS puro, sem instalação) usado na **Midea**, setor de qualidade, para
montar os relatórios de produção de forma rápida e padronizada.

Fluxo desejado:
1. A pessoa preenche o relatório **no celular**, na linha de produção.
2. No **computador**, entra com a mesma conta, abre o relatório salvo e copia.
3. Cola o texto no **Meixin** (美信, Měixìn), o app interno onde os relatórios são lançados.

O app é um apoio para padronizar e agilizar; o lançamento oficial continua no Meixin.

Público: pessoas com muito e com pouco contato com computador. A interface precisa ser
**visual, limpa, direta, com botões grandes e pouco texto solto**.

## Onde está

- Repositório: `LSamuelS0/Relatatorio-qualidade` (público).
- Site: https://lsamuels0.github.io/Relatatorio-qualidade/ (GitHub Pages).
- Publicação: todo push na `main` publica sozinho (`.github/workflows/deploy-pages.yml`), em 1–2 min.
- **Combinado com o dono: todas as mudanças vão direto na `main`**, para testar e validar no site.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da tela |
| `styles.css` | Visual e adaptação ao celular |
| `data.js` | Cadastro: catálogo de peças, itens e máquinas da Injetora e da Estamparia (`estamparia`) |
| `app.js` | Navegação entre telas, rascunho, salvar no aparelho, sincronização com a nuvem, texto, copiar/enviar, validação do cadastro |
| `cloud.js` | Conexão com o Firebase (login, relatórios, rascunhos, fotos); expõe `window.Cloud` |
| `firestore.rules` | Regras de acesso do banco — colar no Firebase → Firestore → Regras |
| `README.md` | Apresentação do projeto |

Versão atual dos arquivos: `?v=5.97`. Ao mudar `styles.css`, `data.js` ou `app.js`, aumente o `?v=` nas linhas que os carregam no `index.html`; sem isso o celular pode continuar usando a versão antiga guardada em cache.

## Linhas de produção

- **Injetora (plástico)** — em uso. 19 máquinas fixas, sempre na ordem 1 a 19.
- **Estamparia (metal)** — em uso desde 12/11/2026. Cadastro próprio, independente da Injetora (seção "Estamparia" abaixo).

### Como o app separa as linhas (12/11/2026)
- **Rascunhos por área:** na tela inicial, "Rascunhos" tem dois botões, **Injetora** e **Estamparia**, com a quantidade de cada um. Cada botão abre a tela de rascunhos daquela linha (`draftsLine`, tela `drafts`), onde dá para abrir ou descartar.
- Tela inicial: os dois cartões (Injetora e Estamparia) escolhem a linha (`setLine()` no `app.js`; `LINE` = linha escolhida, `machines` = máquinas dela).
- Todo relatório, rascunho e ocorrência guarda `line` (`"injetora"` ou `"estamparia"`; sem `line` = injetora). O texto é montado com as máquinas e a máscara **da linha do relatório** (`lineOf`, `machinesOf`, `mk(tipo, linha)`).
- Máscaras: `inicio`, `troca`, `bloqueio` (Injetora) · `inicio_est`, `troca_est`, `bloqueio_est` (Estamparia) · `parada` (as duas). `MASK_LINE` diz de qual linha é cada uma.
- **Regras de formatação, caixas de texto e layout são as mesmas nas duas linhas** (pedido do dono): só mudam máquinas, peças e textos das máscaras.
- Marcações e help chain automáticos puxam do último relatório **da mesma linha**. "Puxar último bloqueio" também (na nuvem: `compartilhado/ultimoBloqueio`, Injetora no próprio documento e Estamparia no campo `estamparia`).
- Ocorrências: cada linha vê só as suas no "Ocorrências do dia". Guardam também `machineName`.

## O que já funciona (Injetora)

Telas (versão 2.0, visual simplificado):
1. **Em qual linha você está?** — Injetora (ativa) e Estamparia (em breve) + atalho "Meus relatórios" (só os salvos) + lista **Rascunhos**.
2. **O que você vai registrar?** — blocos grandes: Funcionamento de máquinas (antigo "Início de turno"), Troca de turno, Bloqueio, **Lançar ocorrência** (no lugar de Scrap) e **Ocorrências do dia** (no lugar de Liberação de peças).
3. **Máquinas** — turno (T1/T2/T3, obrigatório), contadores Rodando / Setup / Paradas e um cartão por máquina com número grande. Status por cor **e** texto.
4. **Janela da máquina** — botões grandes com as peças daquela máquina + Setup / Parada + Confirmar.
4b. **Troca de turno** — máscara "Alinhamento PQC Injetora" (detalhes abaixo).
4c. **Bloqueio** — máscara "Bloqueio Injetora" com 3 fotos (detalhes abaixo).
5. **Relatório pronto** — texto gerado, Salvar relatório, Copiar, Enviar e Novo relatório (após salvar).
6. **Meus relatórios** — lista dos salvos; ao abrir: Copiar para o Meixin, Enviar, Editar (vira rascunho), Apagar. No computador, lista e texto lado a lado.

Regras de funcionamento:
- **Toda máquina começa como `MÁQUINA PARADA`** em cada relatório novo.
- Data e horário ficam fixos a partir do início do relatório.
- **Rascunhos:** todo relatório começado e não salvo, de qualquer tipo, vai para a lista Rascunhos da tela inicial. É gravado a cada alteração e também automaticamente ao voltar para o início, sair do relatório, fechar o app ou atualizar a página (troca de turno totalmente vazia não vira rascunho). Tocar abre de onde parou; a lixeira descarta. Ao salvar, sai dos rascunhos e vai para Meus relatórios.
- **Depois de salvar:** o relatório vai para Meus relatórios e o formulário fica **limpo**. A tela "Relatório pronto" mostra o que foi salvo, sem botão de voltar; "Novo relatório" abre o formulário limpo. Um formulário limpo só vira rascunho depois de alterado.
- **Editar um salvo:** em Meus relatórios, "Editar (vira rascunho)" cria uma cópia em Rascunhos; o salvo original não muda. Ao salvar a cópia, ela vira um relatório novo.
- Tocar num bloco de relatório (Início de turno, Troca de turno) sempre começa um relatório **novo**; para continuar um anterior, usa-se Rascunhos. "Recomeçar"/"Limpar" descartam o rascunho atual.
- **Padrão de escrita (regra geral, toda caixa de texto):** tudo em **MAIÚSCULAS** (acentos mantidos, do jeito que a pessoa escreveu) e **toda linha com texto começa com traço e espaço** (`- `). Linhas em branco ficam em branco. Ex.:
  ```
  - MÁQUINA 17 ESTAVA COM VARIAÇÃO NO PESO OCASIONANDO QUEBRA E TRINCA NAS PEÇAS SOLDADAS
  - MÁQUINA 18 RODOU BEM
  ```
  Aplicado enquanto a pessoa digita (funções `standardize`/`applyStandard` no `app.js`), também no texto puxado e no relatório gerado. O teclado do celular abre em maiúsculas (`autocapitalize="characters"`).
- **Sem barra de rolagem (regra geral, todos os relatórios):** o texto do relatório aparece inteiro e toda caixa de texto cresce sozinha com o que é escrito. Máscaras novas devem seguir isso (o `app.js` aplica a qualquer `textarea`).
- **Login e nuvem (Firebase, projeto `relatorio-qualidade`)** — ver seção "Banco de dados" abaixo.

Formato do texto gerado (relatório de **Funcionamento de máquinas**, pedido do dono em 11/11/2026; as quantidades são os mesmos números dos contadores da tela):

```
RELATÓRIO DE FUNCIONAMENTO DE MÁQUINAS DA INJETORA
(FABRICAÇÃO DE PLÁSTICO)

Data: dd/mm/aaaa
Turno: T1 | T2 | T3

Máquinas rodando: <qtd>
Máquinas em setup: <qtd>
Máquinas paradas: <qtd>

MÁQUINAS QUE ESTÃO RODANDO NESTE MOMENTO:

Máquina 1: <peça ou situação>
...
Máquina 19: <peça ou situação>
```

## Máscara: Troca de turno (Alinhamento PQC Injetora)

Parte **fixa** (texto padrão abaixo; só o ADM muda, pelo editor de Máscaras — não alterar no código sem o dono pedir):

```
Ⓜ️ALINHAMENTO PQC INJETORA | PQC 冲压校准

DATA 日期: <data de hoje, dd/mm/aaaa>

TURNO 日期: <turno escolhido>

📌RELATÓRIO 报告:

- <texto livre>

⚠️PONTOS DE ATENÇÃO 注意事项:

- <texto livre ou N/A>

🚨PENDÊNCIAS 待处理问题:

- <texto livre ou N/A>

🛑STATUS DE BLOQUEIO 封锁状态:

- <texto livre>

<marcações @, se houver>
```

- Só data, **sem hora**. A data é sempre a de hoje.
- O turno a pessoa escolhe: **T1, T2 ou T3** (é assim que se escreve na empresa); o app não deixa seguir sem escolher.
- Campos editáveis: Relatório, Pontos de atenção, Pendências e Status de bloqueio. Relatório ou Status de bloqueio vazio = só o título. **Pontos de atenção ou Pendências vazio = `- N/A`** (definido pelo dono).
- **Linha em branco entre o título e o texto** de cada quadro (o texto nunca fica grudado no título).
- **Marcações** (último quadro, sem título na máscara): legenda "Marque o @ dos colaboradores envolvidos no processo", já vem preenchido **automaticamente** com as marcações da última troca de turno salva (a pessoa só acrescenta ou tira alguém). Sai no fim do texto, depois de uma linha em branco, só se tiver algo escrito. Fica em maiúsculas, mas **sem o traço** do padrão de escrita (o traço atrapalharia o @). Exceção marcada com `data-nodash` no `index.html`.
- **Puxar último bloqueio**: carrega o Status de bloqueio da troca de turno da Injetora salva mais recentemente, para a pessoa atualizar. Hoje busca nos relatórios do aparelho; com o Firebase, deve buscar o último salvo **por qualquer pessoa** (função `lastBlockStatus()` no `app.js`).
- Rascunhos da troca de turno seguem a regra geral de Rascunhos; a data é a do dia em que foi começado.
- Observação para o dono confirmar: na máscara, "TURNO" está com 日期 (rìqī, "data"); turno costuma ser 班次 (bāncì). E 冲压校准 (chōngyā jiàozhǔn) significa "alinhamento da estamparia"; injetora costuma ser 注塑 (zhùsù). Mantido como está até o dono decidir.

## Máscara: Bloqueio (Bloqueio Injetora)

Parte **fixa** (texto padrão abaixo; só o ADM muda, pelo editor de Máscaras):

```
🔒BLOQUEIO INJETORA | 封锁警报 🔒

DATA DA PRODUÇÃO 生产日期: <data escolhida, dd/mm/aaaa>

CÓDIGO DO MATERIAL 物料编码: <código>

MOTIVO 问题描述:
- <texto livre, padrão de escrita>

QUANTIDADE 数量: <texto>

RESPONSÁVEL 责任部门: <texto>

CRITICIDADE 关键性: <ALTA | MÉDIA | BAIXA>

SCRAP 废料: <SIM | NÃO | EM ANÁLISE>

POSIÇÃO 物料所在位置: <texto>

HELP CHAIN帮助链: <em branco ou nomes padrão>
```

Depois do texto vêm 3 blocos, cada um com **um título fixo e as fotos**:

1. `CONFORME: ✅` + foto do produto conforme
2. `NÃO CONFORME: ❌` + foto do produto não conforme
3. `LOCALIZAÇÃO: 📍` + fotos da localização — **sem limite** (vários paletes podem estar em lugares diferentes)

Conforme e Não conforme: 1 foto cada (a nova substitui a anterior). Localização: lista de fotos (`photos.localizacao` é um array; `idsOf()` também lê o formato antigo de 1 foto).

- Data da produção: escolhida pela pessoa (começa com a data de hoje).
- Código do material: botão **Escolher produto** que abre a lista do catálogo da CTQ; escrevendo, a lista filtra (código ou nome, sem precisar de acento). Grava `CÓDIGO - NOME`. Se não achar, a opção "Usar o que escrevi" grava o texto digitado.
- Motivo é caixa de texto (padrão "- TEXTO"); Quantidade, Responsável e Posição são de uma linha, sempre em maiúsculas, sem traço.
- Scrap: botões **Sim / Não / Em análise** (definido pelo dono).
- Help chain: sem texto de exemplo no campo; já vem preenchido **automaticamente** com o help chain do último bloqueio salvo (a pessoa ajusta se mudar). Se não houver bloqueio anterior, usa `helpChainDefault` do `data.js` (vazio por enquanto).
- Marcações automáticas (`lastTags()` no `app.js`): cada tipo puxa só do seu próprio tipo (troca → troca, bloqueio → bloqueio). Hoje vem dos relatórios do aparelho; com o Firebase, dos últimos salvos pela própria pessoa. Marcação puxada sozinha não faz o relatório virar rascunho. O botão "Puxar último bloqueio" da troca continua manual.
- Criticidade: botões Alta / Média / Baixa (opções definidas pelo Claude; confirmar com o dono).
- Fotos: reduzidas para no máx. 1600 px (JPEG) e guardadas no IndexedDB do aparelho; em Conforme/Não conforme a nova substitui a anterior; em Localização as fotos se somam (dá para escolher várias de uma vez na galeria) e cada uma tem Remover. Fotos que nenhum rascunho/relatório usa são apagadas (`cleanPhotos()`).
- **Formato no Meixin é rígido:** cada parte vai como mensagem separada, na ordem (texto, título, foto, título, foto, título, fotos). Não juntar título com foto nem escrever título dentro da foto. O app não consegue enviar sozinho várias mensagens no Meixin (o navegador não controla outro app); envio automático só com integração oficial do Meixin (robô de grupo 群机器人, qún jīqìrén) via TI. Proposto ao dono: modo "Enviar passo a passo" (ainda não feito).
- Relatório pronto e Meus relatórios mostram o texto e os 3 blocos. Cada bloco tem **Copiar título**, **Copiar foto** (área de transferência; onde o aparelho não deixa, baixa a foto) e **Enviar foto**. O botão Enviar geral manda o texto + as fotos pelo compartilhamento do celular.
- Rascunho: vale a regra geral; bloqueio sem nenhum campo e sem foto não vira rascunho.
- Com o Firebase, as fotos precisarão ir para o Firebase Storage para aparecer no computador.

## Estamparia (cadastro em `data.js` → `estamparia`, confirmado pelo dono em 12/11/2026)

Máquinas com nome (não número). Cada uma tem `id` fixo (não mudar: os relatórios guardam por ele), `name`, `badge` (quadradinho) e `group` (título do grupo na lista):

| Grupo | Máquina (`id`) | Peças |
|---|---|---|
| Balancer | Balancer 01–04 (`BAL01`–`BAL04`) | Balancer 580 · 601 |
| Balancer | Balancer 05–06 (`BAL05`, `BAL06`) | Balancer 550 · 580 · 601 · 640 |
| Linhas dos cestos | Linha do Cesto 01 (automática), 02 (manual), 03 (automática) (`CES01`–`CES03`) | **ainda não informadas** — o ADM adiciona |
| Prensas | Prensa Progressiva (`PROG`) | Chapa Inox 550 · 580 com Canaleta · 580 sem Canaleta · 601 com Canaleta · 601 sem Canaleta · 640 |
| Prensas | Prensa Transfer (`TRANS`) | Chapa do Gabinete 550 · 580 com/sem Canaleta · 601 com/sem Canaleta · 640 |
| Prensas | Linha do Gabinete (`GAB`) | Gabinete 550 Branco · 580 Branco · 580 Titânio · 601 Branco · 601 Titânio · 640 Branco |
| Prensas | Prensa 80/110 (`P80`) | Placa de Conexão Superior 640 · Placa de Conexão Inferior 640 |

- Regra da vírgula vale aqui também: cada modelo/variante é um item separado.
- Balancer: mesmos códigos da Injetora (Ring Up + Ring Down); Balancer 640 sem código. As outras peças da Estamparia ainda não têm código (`null`).
- No Bloqueio da Estamparia, "Escolher produto" lista as peças da Estamparia (com código quando houver).
- Relatório de funcionamento da Estamparia: igual ao da Injetora, mas cada linha começa com o nome da máquina (`Balancer 01: ...`, `Prensa Transfer: ...`).

Máscaras da Estamparia (texto padrão; o ADM muda pelo editor):

```
Ⓜ️ALINHAMENTO PQC ESTAMPARIA | PQC 冲压校准
DATA 日期: / TURNO 日期: / 📌RELATÓRIO 报告: / ⚠️PONTOS DE ATENÇÃO 注意事项: / 🚨PENDÊNCIAS 待处理问题: / 🛑STATUS DE BLOQUEIO 封锁状态:

🔒BLOQUEIO ESTAMPARIA | 封锁警报 🔒
DATA DA PRODUÇÃO 生产日期: / CÓDIGO DO MATERIAL 物料编码: / MOTIVO 问题描述: / QUANTIDADE 数量: / RESPONSÁVEL 责任部门: /
CRITICIDADE 关键性: / SCRAP 废料: / POSIÇÃO 物料所在位置: / HELP CHAIN帮助链:  (+ fotos Conforme, Não conforme, Localização)
```

Mesmos campos, regras e fotos da Injetora (N/A, linha em branco após título, marcações, help chain etc.).

## Parada de máquina (as duas linhas, 12/11/2026)

Máscara `parada`, **oficial (enviada pelo dono em 12/11/2026) e a mesma nas duas linhas**:

```
🚨ALERTA PARADA DE MÁQUINA PQC | 机器停止警报 PQC🚨

MÁQUINA 机器: <máquina> - <peça>

HORÁRIO 时间: <hh:mm>

MOTIVO 问题描述:
- <texto livre, padrão de escrita>

SOLICITANTE 请求者: DEPARTAMENTO DE QUALIDADE

HELP CHAIN帮助链: <nomes>
```

- Bloco "Parada de máquina" no "O que você vai registrar?" das duas linhas. Segue a regra geral de Rascunhos e Salvar.
- **Máquina:** botões com as máquinas **da linha** (caixa própria de cada linha) e depois as peças daquela máquina + "Nenhuma peça". No texto, a peça vai junto da máquina, separada por " - " (sem peça = só a máquina). Obrigatório escolher a máquina.
- **Horário:** hora atual do aparelho, editável. Enquanto a pessoa não mexe, acompanha o relógio (atualiza a cada 15 s, ao reabrir o rascunho e ao tocar em "Ver relatório pronto"); depois de editado, fica o que ela escreveu (`horarioManual`). Botão "Hora atual" volta a acompanhar o relógio. Cópia de relatório salvo mantém o horário original.
- **Motivo:** caixa de texto no padrão de escrita ("- TEXTO").
- **Solicitante:** escolha única numa lista (`SOLICITANTES` no `app.js`). Por enquanto só "DEPARTAMENTO DE QUALIDADE", que já vem marcado; tocar de novo desmarca. Para novas opções, acrescentar na lista (pedido do dono, 12/11/2026; antes foi botões Injetora/Estamparia e depois texto livre).
- **Help chain:** já vem com o da última parada salva da mesma linha (como no Bloqueio).
- Não tem turno nem data no texto (a data fica guardada no relatório para as listas).
- **Evidências (12/11/2026):** campo de fotos no fim da tela, **opcional e sem limite** (nem mínimo nem máximo). Fotos em `photos.evidencias` (lista de ids, mesmo armazenamento/sincronização das fotos do Bloqueio). **Não entram no texto da máscara**: no relatório pronto e em Meus relatórios aparecem depois do texto, só as fotos; "Evidências" é só um rótulo no app para identificar, sem "Copiar título". "Enviar" manda o texto junto com as fotos.

## Auditoria 6M

- Bloco "Auditoria 6M" nas duas linhas: por enquanto só um espaço reservado ("em construção"), pedido do dono em 12/11/2026. Aguardando o dono definir o conteúdo.

## Ocorrências (projeto do dono, iniciado em 11/11/2026)

Objetivo: registrar os problemas da linha ao longo do dia para acompanhar quais acontecem mais, quantas vezes foi preciso pedir ajuste de máquina, troca de molde ou manutenção da ferramentaria, e atacar a causa raiz.

- **Lançar ocorrência:** turno (T1/T2/T3; fica escolhido para a próxima), máquina (botões 1–19), peça (só as peças daquela máquina, + "Nenhuma peça (máquina parada)") e problema. Um toque em **Lançar ocorrência** salva na hora (não tem rascunho nem tela de relatório pronto) e limpa máquina/peça/problema para lançar a próxima.
- **Problemas:** `problemas` no `data.js`. **Vazio por enquanto** → o problema é escrito à mão (maiúsculas). O dono vai passar a lista; com itens, viram botões + campo "Outro problema".
- **Ocorrências do dia:** escolher a data (setas ou calendário); totais por turno; barras "Problemas que mais aconteceram" e "Por máquina" (quantidade e %); lista com hora, turno, peça e quem lançou. Mostra as ocorrências de **todas as pessoas**, em tempo real. Quem lançou (ou o ADM) pode apagar.
- **Solução, observações e fotos (12/11/2026):** no lançamento, além de turno/máquina/peça/problema: **Solução** (caixa de texto; vazia = "- EM ANÁLISE"), **Observações** (opcional; vazia = "- N/A") e **Fotos** (opcionais, sem limite).
- **Máscara `ocorrencia`** (a mesma nas duas linhas, editável pelo ADM em Máscaras):
  ```
  ⚠️OCORRÊNCIA DO DIA | 当日异常
  TURNO 班次: / MÁQUINA 机器: / PEÇA 零件: / MOTIVO DO PROBLEMA 问题描述: / SOLUÇÃO 解决方案: / OBSERVAÇÕES 备注:
  ```
  (linha em branco entre os campos; motivo, solução e observações com "- " embaixo do título). As fotos não entram no texto.
- **Detalhe:** no "Ocorrências do dia", tocar numa ocorrência abre a tela `occ-view` com a máscara pronta (Copiar / Enviar com as fotos), as fotos (Copiar / Enviar cada uma) e as observações. **Quem lançou** pode voltar e atualizar solução, observações e fotos ("Salvar alterações"); os outros só veem. A lista mostra "em análise" / "com solução" e 📷 com a quantidade de fotos.
- **Fotos das ocorrências na nuvem:** coleção própria `fotosOcorrencias/{id}` (todos logados leem, para quem abre a ocorrência ver a foto), diferente de `fotos` (só o dono). **Exigiu regra nova no Firebase (12/11/2026).** Apagar a ocorrência apaga as fotos dela na nuvem.
- **Peça ou situação (12/11/2026):** depois da máquina, a lista mostra as peças da máquina (rodando), "Nenhuma peça (máquina parada)" e mais três situações: **Setup**, **Manutenção** (abre "Quem está fazendo?": Engenharia, Manutenção, Eletrônica, Ferramentaria — `MAINT_WHO`) e **Troca de molde** (abre "Qual peça vai entrar?": primeiro as peças da máquina, "Mostrar outras peças" lista todas as da linha). O problema é obrigatório para peça e parada; opcional para setup, manutenção e troca. Guardado em `kind` (`peca`, `parada`, `setup`, `manutencao`, `troca`), `who`, `newPart`; `part` guarda o texto que vai na máscara (ex.: "MANUTENÇÃO (Ferramentaria)", "TROCA DE MOLDE → Tub D 601").
- **Mapa do dia (topo do "Ocorrências do dia"):** máquinas na vertical (da linha escolhida), horas na horizontal (00h–24h, arrasta para o lado; abre na hora atual). Cada máquina mantém a situação do último acontecimento até o próximo: barras verde (rodando, com o nome da peça), laranja (setup), cinza (parada), azul (manutenção), roxa (troca de molde). Ocorrências viram uma marca vermelha "!" na hora em que foram lançadas; tocar abre a ocorrência. Linha vermelha = agora (no dia de hoje).
- **Botão "Registrar"** (Funcionamento de máquinas, ao lado de "Ver relatório pronto"): grava a situação de **todas** as máquinas naquela hora no mapa (pede o turno). Vai para `ocorrencias` com `type: "registro"` e `selections` — por isso não precisou de regra nova. Registros não aparecem na lista nem nas contas de ocorrências, só no mapa.
- **Turnos (passados pelo dono em 12/11/2026)** — `SHIFTS` no `app.js`:
  - Segunda a quinta: T1 06:00–16:00 · T2 16:00–01:30
  - Sexta: T1 06:00–15:00 · T2 15:00–00:30
  - Terça a sexta: T3 00:00–07:00 · Sábado: T3 00:00–08:00
  - O mapa continua no dia do calendário (00h–24h, porque o T3 começa à meia-noite) com uma faixa de turnos por cima (T1/T2 numa linha, T3 noutra; o fim do T2 do dia anterior aparece de 00:00 até 01:30/00:30). Abre na hora atual (hoje) ou às 06h (outros dias).
- **Balões no mapa (12/11/2026):** tocar numa barra abre um balão com a máquina, a situação/peça completa e "HH:MM até HH:MM/agora". Tocar numa marca "!" abre um balão com o resumo da ocorrência e os botões **Abrir**, **Editar** (só quem lançou), **Copiar** (texto da máscara) e **Apagar** (quem lançou ou ADM). Fecha no ✕ ou tocando fora. A barra da situação atual (hoje) mostra o nome inteiro, passando da linha do agora, para não ficar cortada.
- **Lançar depois / no mapa (13/11/2026):** o "Lançar ocorrência" tem "Quando aconteceu?": **data** (padrão hoje), **Início** (padrão agora, botão "Início = agora") e **Fim** (opcional) — para quem esqueceu de lançar na hora; ficam em `date`, `startTime`, `endTime`. Embaixo do mapa, o botão **"Lançar no mapa (esqueceu de lançar?)"** abre o mesmo formulário no modo `mapOnly`: só turno, quando, máquina e peça/situação (sem problema, solução, observações e fotos); já vem com o dia que está aberto no mapa (06:00 em outro dia, agora no dia de hoje). Lançamento `mapOnly` muda só a barra do mapa: não tem marca "!", não entra na lista nem nas contas; tocar na barra mostra "Lançado no mapa por …" e **Apagar** (quem lançou ou ADM). Salvo em `ocorrencias` como as outras (sem regra nova).
- **Troca de garra (13/11/2026):** mais uma situação na lista do "Lançar ocorrência" (e do "Lançar no mapa"), `kind: "garra"`. Entra como um setup: **sem problema e sem solução, só observações** (igual à troca de molde — `occNoSolution`); na máscara a peça sai "TROCA DE GARRA" e não saem as linhas de motivo e solução; no mapa, barra laranja de setup com o texto "Troca de garra".
- **Observações na lista (13/11/2026):** quando a ocorrência tem observações, elas aparecem no cartão da lista ("Obs.: …") e no balão do mapa.
- **Troca de molde sem problema e sem solução (13/11/2026):** ao escolher Troca de molde, somem "Qual é o problema?" e "Solução" (no lançamento e no detalhe); o texto da máscara sai sem as linhas MOTIVO DO PROBLEMA e SOLUÇÃO, e a lista não mostra "em análise".
- **Mapa congelado (12/11/2026):** o mapa tem altura máxima (65% da tela) e rola dentro dele: a coluna das máquinas fica fixa ao arrastar para o lado e a linha das horas e dos turnos fica fixa ao rolar para baixo (como "congelar painéis" do Excel). Barra de máquina rodando mostra só o nome da peça (também no balão).
- **Horário de início e de fim (12/11/2026):** no detalhe da ocorrência (parte "Atualizar", só quem lançou), duas caixas lado a lado: **Início** (começa com a hora do lançamento, ajustável) e **Fim** (vazio até preencher; botão "Fim = agora"). Guardados em `startTime` / `endTime` ("HH:MM", no dia da ocorrência). No mapa, a situação da ocorrência vale do início ao fim; no fim a máquina volta à situação de antes (se nada mais novo tiver mudado a máquina). Sem fim = vale até o próximo acontecimento. Fim menor que o início = até o fim do dia. A lista e o detalhe mostram "início–fim". O horário não entra no texto da máscara.
- **Filtro de turno (12/11/2026):** no topo do "Ocorrências do dia", os quadrinhos **Todos · T1 · T2 · T3** (com a quantidade de cada) são o filtro. Com um turno escolhido: o mapa mostra só o horário daquele turno no dia (a parte que começa no dia: T1 06–16/15, T2 16/15–24, T3 00–07/08), só as marcas de ocorrência dele, e a lista e os gráficos só as ocorrências dele. As barras de situação continuam vindo de todos os acontecimentos (a situação passa de um turno para o outro).
- **Pendente com o dono:** confirmar as opções de quem faz a manutenção.
- **Dados:** `ocorrencias/{id}` no Firestore = `{ id, date (aaaa-mm-dd), at, turno, machine, machineName, part, problem, solution, obs, photos: { fotos: [ids] }, by (matrícula/ADM), owner, updatedAt? }`. Cópia no aparelho `rq.occ.v1`; envio pela fila de pendências (`o:id`). Regras: todos logados leem; cada um cria as suas; dono ou ADM apaga.
- **Próximos passos:** lista de problemas do dono; depois, relatório/painel por período (semana, mês), por tipo de problema e por máquina.

## Banco de dados (Firebase)

- **Login:** tela "Entrar" com matrícula (6 números) ou `ADM` + senha. O `cloud.js` converte para e-mail interno: `123456@relatorio-qualidade.app`, `adm@relatorio-qualidade.app`. Contas são criadas no Firebase → Authentication. **A senha do ADM nunca vai para o código nem para este arquivo.**
- **Administrador:** UID `Rxejtj0jgEUEGfTup3yK9ngMvtH3` (conta ADM). Está em `cloud.js` e em `firestore.rules`.
- **Firestore (plano grátis Spark):**
  - `relatorios/{id}` e `rascunhos/{id}`: o mesmo objeto do app + `owner` (uid de quem fez).
  - `fotosOcorrencias/{id}`: fotos das ocorrências, mesmo formato de `fotos`, mas todos logados leem.
  - `fotos/{id}`: foto em base64 (`data`), `type`, `owner`. Uma foto por documento; o app reduz cada foto para caber (< 700 KB). Escolhido pelo plano grátis: Cloud Storage exige o plano Blaze desde set/2024.
  - `compartilhado/ultimoBloqueio`: último Status de bloqueio salvo numa troca de turno, de qualquer pessoa (botão "Puxar último bloqueio").
- **Regras (`firestore.rules`):** cada pessoa lê/grava só o que é dela; o ADM lê/edita/apaga tudo; `compartilhado/ultimoBloqueio` qualquer pessoa logada.
- **Funcionamento (aparelho primeiro, nuvem em seguida):** o app continua guardando no aparelho (`rq.reports.v1`, `rq.drafts.v1`, fotos no IndexedDB `rq-photos`) e envia para a nuvem assim que possível. Pendências em `rq.pending.v1` (`d:id`, `r:id`, `x:d:id` para apagar). Ao entrar, o app envia o que está pendente e baixa relatórios, rascunhos e fotos da conta (`pull()`); depois fica **em tempo real** (`Cloud.watchMine` com `onSnapshot`): o que é salvo num aparelho aparece no outro sem recarregar. Também busca de novo ao voltar para o app. Sem internet, tudo continua funcionando e é enviado depois.
- **Bolinha ao lado do usuário:** verde = tudo na nuvem; laranja = enviando; cinza = sem internet; **vermelha = a nuvem recusou ou não respondeu** (tocar mostra o motivo, ex.: regras não publicadas `permission-denied`, banco não criado `not-found`, servidor mudo `timeout`). Ao entrar, o app faz um teste no servidor (`Cloud.ping()`), e envio e download rodam separados, com limite de tempo (`withTimeout`), para um não travar o outro. Tocar na bolinha vermelha refaz o teste e o download (`reconnect()`): se o erro já foi resolvido (ex.: regras publicadas depois), ela volta a ficar verde sem recarregar a página. Regras novas no Firebase levam até ~1 min para valer.
- **Troca de pessoa no mesmo aparelho:** `rq.owner.v1` guarda o dono da cópia local; se outra conta entrar, a cópia local da anterior é limpa. Na primeira entrada, o que foi feito antes do login vai para a conta que entrou.
- **Cadastro das linhas:** `cadastro/injetora` e `cadastro/estamparia` (máquinas, itens e `extraParts`), todos leem e só o ADM grava (a regra `cadastro/{doc}` já cobre os dois). O app aplica ao entrar e em tempo real (`watchCadastro` e `watchConfig("estamparia")` → `applyCadastro(cad, linha)`), com cópia no aparelho (`rq.cadastro.v1` e `rq.cadastro.est.v1`). Sem nada na nuvem, vale o `data.js`.
- **Ainda não feito:** tela do administrador para ver os relatórios de todos (hoje: pelo painel do Firebase), criar contas pelo app, e apagar da nuvem fotos que não são mais usadas (só são apagadas do aparelho). Redefinir senha de outra pessoa só pelo painel do Firebase (pelo app exigiria o plano Blaze).

## Regras obrigatórias

### Regra da vírgula e da barra (a mais importante)
- **Barra (`580/601`) = UMA peça**, um código só, que serve aos dois modelos. Ex.: Pulsador 580/601, Conjunto do Agitador 580/601.
- **Vírgula = peças DIFERENTES**, cada uma com seu código. "Tub D 580, 601" vira dois itens: Tub D 580 e Tub D 601.
- Na dúvida, vale a tabela CTQ: códigos diferentes nunca podem ser unidos por barra.
- O `app.js` confere isso ao abrir e avisa no console do navegador se um item com barra apontar para mais de um código.

### Modelos
- Modelos usados: **550, 580, 601 e 640**.
- O **640** está em desenvolvimento e não tem código na CTQ. Só aparece onde foi confirmado: Cesto Externo (máquinas 1 e 2) e Proteção do Motor (máquina 6). Nunca presumir compatibilidade do 640.

### Nomes padronizados
- **Balancer `<modelo>`** = par Ring Up + Ring Down do mesmo modelo (um item, dois códigos).
- **Tampa Superior / Moldura** = uma peça por modelo.
- **Conjunto do Agitador** = mesma família do Agitador da CTQ.
- **Dispenser Case A** é uma peça distinta.
- **Proteção do Motor** aparece por modelo (550, 580, 601, 640); na CTQ, 550/580/601 têm o mesmo código.

### Máquinas e moldes
- Os moldes mudam de máquina com o tempo. Para mudar, edita-se só a lista `machines` no `data.js`; catálogo e regras não mudam.
- O dono do projeto confirma qualquer mudança de máquina; não inventar compatibilidades.

## Cadastro (`data.js`)

Três partes:
1. **`parts`** — catálogo oficial copiado da tabela **CTQ (BOM Injection Parts)**: código, nome e instrução de trabalho (`MIDB(Y)-IT-FFC-PQCxxx`). Um código = uma peça física. São 44 peças.
2. **`items`** — o texto que aparece na lista e no relatório → código(s) do catálogo.
3. **`machines`** — as 19 máquinas e os itens de cada uma.

Máquinas confirmadas pelo dono (11/11/2026):

| Máq. | Itens |
|---|---|
| 1, 2 | Cesto Externo 550 · 580 · 601 · 640 |
| 3 | Conjunto do Agitador 580/601 |
| 4 | Balancer 550 · Body-B 550 · 580 · 601 |
| 5 | Body-B 550 · 580 · 601 |
| 6 | Proteção do Motor 550 · 580 · 601 · 640 |
| 7 | Balancer 580 · Dispenser Case A · Tub D 580 · Tub D 601 (*) |
| 8 | Pulsador 580/601 · Conjunto do Agitador 580/601 |
| 9 | Pulsador 580/601 |
| 10 | Tampa Traseira 550 · 580 · 601 |
| 11 | Body-B 550 · 580 · 601 · Base 550 · 580 · 601 |
| 12 | Gaveta do Dispenser |
| 13, 14 | Tampa Superior / Moldura 550 · 580 · 601 |
| 15, 17 | Balancer 580 · 601 |
| 16 | Base 550 · 580 · 601 |
| 18 | Capa do Cesto 580 · 601 |
| 19 | Tub D 580 · 601 |

(*) Na lista do dono a máquina 7 aparece como "Tub D 580/601", mas a CTQ tem dois códigos; ficou separado aguardando confirmação.

### Tolerância de peso (CTQ)
- Itens abaixo de 1000 g: **±3% do peso nominal**.
- Itens acima de 1000 g: regra ainda não registrada (texto cortado na foto).
- Em caso de dúvida, consultar o desenho técnico ou o aviso técnico.
- Pesos e materiais seguem a tabela BOM Injection Parts. Pesos por material ainda não estão no cadastro.

## Visual (aprovado pelo dono em 11/11/2026 e implementado)

Esboço das telas: login com matrícula de 6 números → escolher a linha (Injetora/Estamparia) →
tipo de relatório em blocos grandes → lista de máquinas com número grande e status por cor
**e** por texto (Rodando / Setup / Parada) → janela de escolha da peça com botões grandes →
relatório pronto (Salvar / Copiar / Enviar) → no computador, "Meus relatórios" e
"Copiar para o Meixin".

Princípios: botões com no mínimo 44 px de altura (preferir 60+), fonte grande, uma ação
principal por tela, status nunca só por cor, sem informação solta.

## Planejado / pendente

1. ~~Login e sincronização~~ — feito (11/11/2026). Falta o dono colar `firestore.rules` no Firebase e criar as contas dos operadores.
2. **Máscaras de produção** (Bloqueio, Scrap, Liberação etc.):
   - Cada máscara tem uma parte **fixa** (texto em português e chinês) que nunca muda, e campos que a pessoa preenche.
   - Algumas exigem **imagens**. Ex.: na de **Bloqueio**, primeiro o produto **conforme** com a imagem logo abaixo, depois o produto **não conforme** com a sua imagem.
   - Aguardando o dono enviar os modelos das máscaras.
3. **Menu de administrador** — **Peças das máquinas FEITO** (11/11/2026): na tela inicial, só para o ADM, o bloco "Administrador → Peças das máquinas" lista as 19 máquinas; em cada uma dá para tirar peças, adicionar peças já cadastradas (lista com filtro) e cadastrar peça nova (nome + modelos + barra/vírgula + código da CTQ opcional). As mudanças ficam numa cópia (`rq.adminDraft.v1`, máquinas alteradas em laranja) até tocar em **Publicar**, que confere as regras (`validateCadastro`) e grava `cadastro/injetora`; **Descartar** volta ao publicado. Também feito (11/11/2026):
   - **Escolha da área (12/11/2026):** ao tocar em "Painel do administrador", o app pergunta "Em qual área você quer fazer alterações?" — **Injetora** ou **Estamparia**. Tudo depois disso (peças das máquinas, peças cadastradas, máscaras, publicar/descartar) vale só para a área escolhida; "Trocar área" volta à pergunta. Rascunho do ADM por área: `rq.adminDraft.v1` (Injetora) e `rq.adminDraft.est.v1` (Estamparia). Máscaras: cada área mostra as suas + "Parada de máquina (Injetora e Estamparia)".
   - **Painel do administrador** (tela inicial → "Painel do administrador" → área): atalhos para Peças das máquinas, Peças cadastradas e Máscaras. O aviso laranja "não publicado" aparece em todas as telas do ADM.
   - **Peças cadastradas:** lista com busca (nome ou código) mostrando códigos e em quais máquinas cada peça roda. Tocar abre o editor: mudar o nome (muda em todas as máquinas), os códigos da CTQ (separados por vírgula; nome com barra só aceita 1 código) e **Apagar** (sai de todas as máquinas). "Cadastrar peça nova" daqui só cadastra (não põe em máquina). Tudo entra no mesmo rascunho do ADM e só vale depois de **Publicar**.
   - **Máscaras:** os textos fixos dos 3 relatórios ficam em `MASK_DEFAULTS` (padrão, no `app.js`) e o ADM pode publicar outros em `cadastro/mascaras` (só as diferenças). Editor com cada texto, "Padrão" para voltar um texto, prévia ao vivo e **Publicar máscara** (vale na hora para todos; cópia no aparelho `rq.mascaras.v1`). Só os textos mudam; a ordem dos campos, o padrão de escrita e as regras continuam no código. Relatórios já salvos guardam o texto da época.
   - Ainda falta: contas e usuários. Esboço original:
   - Só a conta de administrador (usuário `ADM`) acessa. **A senha nunca vai para o código nem para este arquivo**: o repositório é público e qualquer pessoa leria. Ela fica só no serviço de login (Firebase).
   - Telas: Painel (atalhos + aviso de mudanças não publicadas) → Peças das máquinas (escolher máquina, remover e adicionar itens do catálogo) → Catálogo (cadastrar peça nova, perguntando se é uma peça só para os modelos — barra — ou uma por modelo — vírgula — e o código da CTQ de cada uma) → Contas e usuários (criar com matrícula, nome, senha inicial e tipo Operador/Administrador; redefinir senha; desativar) → Revisar e publicar (lista do que entra e sai, valida a regra da barra, publica).
   - Publicar = gravar o cadastro e o app atualizar para todos. Opção prevista: guardar máquinas/peças no Firestore (o app lê de lá), em vez de editar `data.js` pelo navegador — publicar direto na `main` exigiria um token do GitHub dentro do app, o que não é seguro num site público.
4. Cadastrar as peças da CTQ ainda sem máquina: Agitador 550, Back Control 550, Capa do Cesto 550,
   Case do Ímã 550 e 580/601, Tub D 550, Body-B Titânio 580/601, Tub D MAL 120/140,
   Pulsador Impeller, Capa do Pulsador Impeller, Dispenser Case B e Dispenser Case Soldado.
5. Pesos por material (coluna PP C/TALCO cortada nas fotos) e regra de peso acima de 1 kg.
6. ~~Linha de Estamparia~~ — feito (12/11/2026). Falta: peças das Linhas dos cestos 01–03, códigos das peças da Estamparia, conteúdo da Auditoria 6M.
7. Avaliar se o repositório deve ficar privado (códigos internos da Midea estão públicos).

## Ao trabalhar neste projeto

- Escrever em português do Brasil. Ao usar chinês, colocar o pinyin entre parênteses.
- Não mexer na parte fixa das máscaras no código; o dono ajusta os textos pelo editor de Máscaras do ADM. Ao criar máscara nova, colocar os textos fixos em `MASK_DEFAULTS` e `MASK_LABELS`.
- Seguir a regra da vírgula e da barra em qualquer peça nova.
- Atualizar este arquivo e o `README.md` quando algo mudar.
