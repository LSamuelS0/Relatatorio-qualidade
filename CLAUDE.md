# Relatório da Qualidade — contexto do projeto

> Leia este arquivo antes de qualquer mudança. Ele resume o que o app faz hoje, as regras
> que precisam ser seguidas e o que está planejado. Atualize-o sempre que algo mudar.

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
| `data.js` | Cadastro: catálogo de peças, itens e máquinas |
| `app.js` | Navegação entre telas, rascunho, salvar no aparelho, texto, copiar/enviar, validação do cadastro |
| `README.md` | Apresentação do projeto |

Ao mudar `styles.css`, `data.js` ou `app.js`, aumente o `?v=` nas linhas que os carregam no `index.html`; sem isso o celular pode continuar usando a versão antiga guardada em cache.

## Linhas de produção

- **Injetora (plástico)** — em uso. 19 máquinas fixas, sempre na ordem 1 a 19.
- **Estamparia (metal)** — ainda não implementada; terá cadastro próprio, independente da Injetora.

## O que já funciona (Injetora)

Telas (versão 2.0, visual simplificado):
1. **Em qual linha você está?** — Injetora (ativa) e Estamparia (em breve) + atalho "Meus relatórios" (só os salvos) + lista **Rascunhos**.
2. **O que você vai registrar?** — blocos grandes: Início de turno, Troca de turno e Bloqueio (ativos); Scrap e Liberação (em breve).
3. **Máquinas** — contadores Rodando / Setup / Paradas e um cartão por máquina com número grande. Status por cor **e** texto.
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
- **Por enquanto os relatórios salvos ficam só no aparelho** (`localStorage`, chaves `rq.drafts.v1` e `rq.reports.v1`; fotos no IndexedDB `rq-photos`). A sincronização celular → computador entra com o Firebase.
- Não há tela de login ainda; ela entra junto com o Firebase.

Formato do texto gerado:

```
RELATÓRIO DE INÍCIO DE TURNO DA INJETORA
(FABRICAÇÃO DE PLÁSTICO)

Data: dd/mm/aaaa
Horário de início: hh:mm

MÁQUINAS QUE ESTÃO RODANDO NESTE MOMENTO:

Máquina 1: <peça ou situação>
...
Máquina 19: <peça ou situação>
```

## Máscara: Troca de turno (Alinhamento PQC Injetora)

Parte **fixa** (não alterar, nem corrigir o chinês sem o dono pedir):

```
Ⓜ️ALINHAMENTO PQC INJETORA | PQC 冲压校准

DATA 日期: <data de hoje, dd/mm/aaaa>

TURNO 日期: <turno escolhido>

📌RELATÓRIO 报告:
<texto livre>

⚠️PONTOS DE ATENÇÃO 注意事项:
<texto livre>

🚨PENDÊNCIAS 待处理问题:
<texto livre>

🛑STATUS DE BLOQUEIO 封锁状态:
<texto livre>

<marcações @, se houver>
```

- Só data, **sem hora**. A data é sempre a de hoje.
- O turno a pessoa escolhe: **T1, T2 ou T3** (é assim que se escreve na empresa); o app não deixa seguir sem escolher.
- Campos editáveis: Relatório, Pontos de atenção, Pendências e Status de bloqueio. Campo vazio = só o título.
- **Marcações** (último quadro, sem título na máscara): legenda "Marque o @ dos colaboradores envolvidos no processo", começa vazio. Sai no fim do texto, depois de uma linha em branco, só se tiver algo escrito. Fica em maiúsculas, mas **sem o traço** do padrão de escrita (o traço atrapalharia o @). Exceção marcada com `data-nodash` no `index.html`.
- **Puxar último bloqueio**: carrega o Status de bloqueio da troca de turno da Injetora salva mais recentemente, para a pessoa atualizar. Hoje busca nos relatórios do aparelho; com o Firebase, deve buscar o último salvo **por qualquer pessoa** (função `lastBlockStatus()` no `app.js`).
- Rascunhos da troca de turno seguem a regra geral de Rascunhos; a data é a do dia em que foi começado.
- Observação para o dono confirmar: na máscara, "TURNO" está com 日期 (rìqī, "data"); turno costuma ser 班次 (bāncì). E 冲压校准 (chōngyā jiàozhǔn) significa "alinhamento da estamparia"; injetora costuma ser 注塑 (zhùsù). Mantido como está até o dono decidir.

## Máscara: Bloqueio (Bloqueio Injetora)

Parte **fixa** (não alterar):

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
- Help chain: começa **em branco**, sem texto de exemplo no campo; as pessoas são marcadas manualmente no Meixin. Nomes padrão (o dono vai passar) entram em `helpChainDefault` no `data.js` e já vêm preenchidos em todo bloqueio novo.
- Criticidade: botões Alta / Média / Baixa (opções definidas pelo Claude; confirmar com o dono).
- Fotos: reduzidas para no máx. 1600 px (JPEG) e guardadas no IndexedDB do aparelho; em Conforme/Não conforme a nova substitui a anterior; em Localização as fotos se somam (dá para escolher várias de uma vez na galeria) e cada uma tem Remover. Fotos que nenhum rascunho/relatório usa são apagadas (`cleanPhotos()`).
- **Formato no Meixin é rígido:** cada parte vai como mensagem separada, na ordem (texto, título, foto, título, foto, título, fotos). Não juntar título com foto nem escrever título dentro da foto. O app não consegue enviar sozinho várias mensagens no Meixin (o navegador não controla outro app); envio automático só com integração oficial do Meixin (robô de grupo 群机器人, qún jīqìrén) via TI. Proposto ao dono: modo "Enviar passo a passo" (ainda não feito).
- Relatório pronto e Meus relatórios mostram o texto e os 3 blocos. Cada bloco tem **Copiar título**, **Copiar foto** (área de transferência; onde o aparelho não deixa, baixa a foto) e **Enviar foto**. O botão Enviar geral manda o texto + as fotos pelo compartilhamento do celular.
- Rascunho: vale a regra geral; bloqueio sem nenhum campo e sem foto não vira rascunho.
- Com o Firebase, as fotos precisarão ir para o Firebase Storage para aparecer no computador.

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

1. **Login e sincronização celular → computador** com Firebase: matrícula de 6 dígitos +
   senha (o app converte a matrícula num e-mail interno), relatórios no Firestore, cada
   pessoa vê só os seus. Aguardando o dono criar o projeto Firebase e enviar o `firebaseConfig`.
2. **Máscaras de produção** (Bloqueio, Scrap, Liberação etc.):
   - Cada máscara tem uma parte **fixa** (texto em português e chinês) que nunca muda, e campos que a pessoa preenche.
   - Algumas exigem **imagens**. Ex.: na de **Bloqueio**, primeiro o produto **conforme** com a imagem logo abaixo, depois o produto **não conforme** com a sua imagem.
   - Aguardando o dono enviar os modelos das máscaras.
3. **Menu de administrador** (esboço aprovado para discussão em 11/11/2026; ainda não implementado):
   - Só a conta de administrador (usuário `ADM`) acessa. **A senha nunca vai para o código nem para este arquivo**: o repositório é público e qualquer pessoa leria. Ela fica só no serviço de login (Firebase).
   - Telas: Painel (atalhos + aviso de mudanças não publicadas) → Peças das máquinas (escolher máquina, remover e adicionar itens do catálogo) → Catálogo (cadastrar peça nova, perguntando se é uma peça só para os modelos — barra — ou uma por modelo — vírgula — e o código da CTQ de cada uma) → Contas e usuários (criar com matrícula, nome, senha inicial e tipo Operador/Administrador; redefinir senha; desativar) → Revisar e publicar (lista do que entra e sai, valida a regra da barra, publica).
   - Publicar = gravar o cadastro e o app atualizar para todos. Opção prevista: guardar máquinas/peças no Firestore (o app lê de lá), em vez de editar `data.js` pelo navegador — publicar direto na `main` exigiria um token do GitHub dentro do app, o que não é seguro num site público.
4. Cadastrar as peças da CTQ ainda sem máquina: Agitador 550, Back Control 550, Capa do Cesto 550,
   Case do Ímã 550 e 580/601, Tub D 550, Body-B Titânio 580/601, Tub D MAL 120/140,
   Pulsador Impeller, Capa do Pulsador Impeller, Dispenser Case B e Dispenser Case Soldado.
5. Pesos por material (coluna PP C/TALCO cortada nas fotos) e regra de peso acima de 1 kg.
6. Linha de Estamparia.
7. Avaliar se o repositório deve ficar privado (códigos internos da Midea estão públicos).

## Ao trabalhar neste projeto

- Escrever em português do Brasil. Ao usar chinês, colocar o pinyin entre parênteses.
- Não mexer na parte fixa das máscaras; só nos campos de preenchimento.
- Seguir a regra da vírgula e da barra em qualquer peça nova.
- Atualizar este arquivo e o `README.md` quando algo mudar.
