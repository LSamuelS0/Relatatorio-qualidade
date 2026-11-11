# Relatório da Qualidade

Aplicativo web simples para montar relatórios de produção e qualidade. A primeira versão implementa o **Relatório de Início de Turno da Injetora (Fabricação de Plástico)**.

## Acessar o aplicativo

**[Clique aqui para abrir o Relatório da Qualidade](https://lsamuels0.github.io/Relatatorio-qualidade/)**

O aplicativo pode ser acessado diretamente pelo celular ou computador, sem precisar instalar nada.

## Como abrir localmente

1. Abra o arquivo `index.html` em um navegador.
2. Não é necessário instalar dependências ou executar um servidor para testar localmente.

## Funcionalidades da versão 1.0

- 19 máquinas fixas, sempre na ordem de 1 a 19.
- Uma lista de seleção na frente de cada máquina.
- Opções iniciais: `SETUP`, `MÁQUINA PARADA` e peças cadastradas para aquela máquina.
- Data e horário preenchidos automaticamente quando o relatório é iniciado.
- Data e horário permanecem fixos durante o preenchimento. O botão **Novo relatório** inicia um novo registro e atualiza a data/hora.
- Texto do relatório atualizado automaticamente.
- Botões para copiar e compartilhar o relatório.
- Layout adaptável para celular e computador.

## Arquivos

- `index.html`: estrutura da interface.
- `styles.css`: aparência e adaptação para telas menores.
- `data.js`: cadastro inicial das 19 máquinas e peças.
- `app.js`: seleções, montagem do relatório, cópia e compartilhamento.

## Cadastro inicial e regras importantes

- O **Balancer** é apresentado como um único item, representando Ring Up + Ring Down.
- Tampa Superior / Moldura aparece como uma única peça.
- Dispenser Case A é uma peça distinta.
- Agitador / Conjunto do Agitador é a mesma família de peça.
- A notação `580/601` indica uma peça compartilhada entre os dois modelos; modelos separados por vírgula representam versões distintas.
- O modelo **640** continua em desenvolvimento e não recebe compatibilidades presumidas. Ele aparece apenas nas situações explicitamente confirmadas no cadastro inicial (Cesto Externo das máquinas 1 e 2 e Proteção do Motor).
- Códigos completos de peças ainda não são exibidos neste relatório de início de turno. Eles serão necessários nos módulos de Bloqueio de máquina, Scrap e Liberação de peças.

## Próximas etapas previstas

- Cadastro e edição de máquinas, peças, modelos e códigos.
- Relatórios de Bloqueio de máquina, Scrap e Liberação de peças.
- Área independente para Fabricação de Metal.
- Persistência de cadastros e histórico de relatórios.

> Esta versão é a primeira entrega funcional. Os relatórios ainda não implementados aparecem como opções em preparação, para não gerar registros incompletos.