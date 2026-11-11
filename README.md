# Relatório da Qualidade

Aplicativo web simples para montar relatórios de produção e qualidade. A primeira versão implementa o **Relatório de Início de Turno da Injetora (Fabricação de Plástico)**.

## Acessar o aplicativo

**[Clique aqui para abrir o Relatório da Qualidade](https://lsamuels0.github.io/Relatatorio-qualidade/)**

O aplicativo pode ser acessado diretamente pelo celular ou computador, sem precisar instalar nada.

## Como abrir localmente

1. Abra o arquivo `index.html` em um navegador.
2. Não é necessário instalar dependências ou executar um servidor para testar localmente.

## Funcionalidades da versão 2.0

- Visual simplificado, com botões grandes e uma ação por tela, pensado para quem tem pouco contato com computador.
- Fluxo: escolher a linha → tipo de relatório → preencher → relatório pronto.
- Relatórios da Injetora: **Início de turno** e **Troca de turno** (máscara Alinhamento PQC, com botão para puxar o último status de bloqueio).
- 19 máquinas fixas; cada uma começa como `MÁQUINA PARADA` e é alterada numa janela com as peças daquela máquina.
- Contadores de máquinas rodando, em setup e paradas.
- Data e horário registrados ao iniciar o relatório.
- Salvar relatório, Copiar e Enviar; lista **Meus relatórios** (por enquanto salvos no próprio aparelho).
- **Rascunhos** na tela inicial: tudo o que foi começado e não salvo, de qualquer tipo.
- Textos e caixas de texto crescem com o conteúdo, sem barra de rolagem.
- Funciona no celular e no computador.

## Arquivos

- `CLAUDE.md`: contexto completo do projeto (regras, cadastro, pendências). Leia antes de mudar algo.

- `index.html`: estrutura da interface.
- `styles.css`: aparência e adaptação para telas menores.
- `data.js`: cadastro inicial das 19 máquinas e peças.
- `app.js`: seleções, montagem do relatório, cópia e compartilhamento.

## Cadastro inicial e regras importantes

O `data.js` tem três partes:

1. **`parts`** — catálogo oficial copiado da tabela CTQ (BOM Injection Parts): código, nome e instrução de trabalho. Um código = uma peça física.
2. **`items`** — o texto que aparece na lista da máquina e no relatório, apontando para o(s) código(s) do catálogo.
3. **`machines`** — as 19 máquinas, na ordem fixa, com os itens que cada uma roda.

**Regra da vírgula e da barra**

- `580/601` = **uma** peça compartilhada pelos dois modelos (um código só). Ex.: Pulsador 580/601, Agitador 580/601.
- Modelos separados por vírgula = peças **diferentes**, cada uma com seu código. Ex.: Tub D 580, Tub D 601.
- A lista de cada máquina muda quando um molde vai para outra máquina: basta editar `machines` no `data.js`.
- O app confere isso ao abrir: um item com barra que aponte para mais de um código gera aviso no console.

**Outras regras**

- **Balancer** = Ring Up + Ring Down do mesmo modelo (por isso aponta para dois códigos).
- Tampa Superior / Moldura aparece como uma única peça por modelo.
- **Proteção do Motor** aparece por modelo (550, 580, 601 e 640); na CTQ, 550/580/601 usam o mesmo código.
- O modelo **640** está em desenvolvimento e não tem código na CTQ; aparece só onde foi confirmado (Cesto Externo das máquinas 1 e 2 e Proteção do Motor da máquina 6).
- Os códigos ainda não aparecem no relatório de início de turno; serão usados em Bloqueio, Scrap e Liberação de peças.

## Próximas etapas previstas

- Cadastro e edição de máquinas, peças, modelos e códigos.
- Relatórios de Bloqueio de máquina, Scrap e Liberação de peças.
- Área independente para Fabricação de Metal.
- Persistência de cadastros e histórico de relatórios.

> Esta versão é a primeira entrega funcional. Os relatórios ainda não implementados aparecem como opções em preparação, para não gerar registros incompletos.