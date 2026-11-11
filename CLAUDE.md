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
| `app.js` | Seleções, montagem do texto, copiar/compartilhar, validação do cadastro |
| `README.md` | Apresentação do projeto |

## Linhas de produção

- **Injetora (plástico)** — em uso. 19 máquinas fixas, sempre na ordem 1 a 19.
- **Estamparia (metal)** — ainda não implementada; terá cadastro próprio, independente da Injetora.

## O que já funciona (Injetora)

- Relatório de **Início de Turno**: uma lista por máquina com `SETUP`, `MÁQUINA PARADA` e as peças daquela máquina.
- **Toda máquina começa como `MÁQUINA PARADA`** ao abrir o app e a cada **Novo relatório**.
- Data e horário são registrados ao iniciar e ficam fixos durante o preenchimento.
- Texto do relatório gerado na hora, com botões **Copiar** e **Compartilhar**.
- Bloqueio de máquina, Scrap e Liberação de peças aparecem como "em preparação".

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

## Visual (esboço aprovado para discussão)

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
3. Cadastrar as peças da CTQ ainda sem máquina: Agitador 550, Back Control 550, Capa do Cesto 550,
   Case do Ímã 550 e 580/601, Tub D 550, Body-B Titânio 580/601, Tub D MAL 120/140,
   Pulsador Impeller, Capa do Pulsador Impeller, Dispenser Case B e Dispenser Case Soldado.
4. Pesos por material (coluna PP C/TALCO cortada nas fotos) e regra de peso acima de 1 kg.
5. Linha de Estamparia.
6. Avaliar se o repositório deve ficar privado (códigos internos da Midea estão públicos).

## Ao trabalhar neste projeto

- Escrever em português do Brasil. Ao usar chinês, colocar o pinyin entre parênteses.
- Não mexer na parte fixa das máscaras; só nos campos de preenchimento.
- Seguir a regra da vírgula e da barra em qualquer peça nova.
- Atualizar este arquivo e o `README.md` quando algo mudar.
