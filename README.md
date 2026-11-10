# GeoSPT — Manual de Utilização

> Aplicação web para **análise de sondagens SPT** e **cálculo de capacidade de carga de estacas** pelos métodos de **Décourt-Quaresma** e **Aoki-Velloso**, conforme a **NBR 6122:2022**.

O GeoSPT organiza o fluxo de um projeto geotécnico em sete abas sequenciais — da identificação da obra até a exportação dos memoriais — compatibilizando múltiplos furos de sondagem, estimando a capacidade de carga das estacas em quatro modos de cálculo e gerando um corte esquemático interpretado do subsolo.

> ⚠️ **Aviso técnico.** O GeoSPT realiza estimativas semiempíricas de capacidade de carga. Os resultados são uma **ferramenta de apoio** e **não substituem a análise nem a responsabilidade técnica do projetista**. Todo dimensionamento deve ser conferido por engenheiro habilitado.

---

## Índice

- [Visão geral](#visão-geral)
- [Instalação e execução](#instalação-e-execução)
- [Conceitos básicos](#conceitos-básicos)
- [Manual das abas](#manual-das-abas)
  - [Aba 1 — Obra](#aba-1--obra)
  - [Aba 2 — Sondagens](#aba-2--sondagens)
  - [Aba 3 — Compatibilização](#aba-3--compatibilização)
  - [Aba 4 — Análise](#aba-4--análise)
  - [Aba 5 — Estacas](#aba-5--estacas)
  - [Aba 6 — Capacidade](#aba-6--capacidade)
  - [Aba 7 — Saídas](#aba-7--saídas)
- [O Corte Esquemático](#o-corte-esquemático)
- [Salvar e abrir uma obra](#salvar-e-abrir-uma-obra)
- [Perguntas frequentes](#perguntas-frequentes)
- [Stack e estrutura do projeto](#stack-e-estrutura-do-projeto)
- [Testes](#testes)
- [Licença](#licença)

---

## Visão geral

O fluxo de trabalho segue a ordem das abas, mas você pode navegar livremente entre elas:

| # | Aba | O que faz |
|---|-----|-----------|
| 1 | **Obra** | Identificação do projeto (nome, local, responsável técnico) que alimenta os memoriais. |
| 2 | **Sondagens** | Cadastro dos furos SPT (NSPT por metro, cota de topo, nível d'água). |
| 3 | **Compatibilização** | Alinhamento dos furos por cota absoluta, gerando um perfil consolidado. |
| 4 | **Análise** | Alertas críticos automáticos e sugestão de agrupamento em domínios geotécnicos. |
| 5 | **Estacas** | Cadastro das estacas e configurações globais de cálculo. |
| 6 | **Capacidade** | Cálculo da capacidade de carga em 4 modos + comparativo, com diagrama de transferência de carga estaca-solo (AOKI 1979) por método. |
| 7 | **Saídas** | Exportação dos resultados em XLSX, PDF e JSON. |

O **Corte Esquemático** (perfil geológico interpretado) é acessível a partir da Aba 5.

---

## Instalação e execução

**Pré-requisito:** [Node.js](https://nodejs.org) versão 22.12 ou superior.

```bash
# 1. Instalar as dependências (cria a pasta node_modules)
npm install

# 2. Rodar em modo desenvolvimento — abre em http://localhost:5173
npm run dev

# 3. Gerar a versão de produção (saída na pasta dist/)
npm run build

# 4. Pré-visualizar a versão de produção localmente
npm run preview
```

> 💡 **Dica.** Evite espaços no caminho da pasta do projeto (ex.: use `geospt-vite` em vez de `geospt vite`). Espaços podem causar erros de resolução de módulos no Windows.

### Aplicativo desktop (Windows e Linux)

O GeoSPT também pode ser empacotado com **Tauri 2**, seguindo a estrutura desktop do ArmaduraStruct. A aplicação React, a engine, os coeficientes, as telas, os formatos de projeto e os relatórios permanecem os mesmos. Os comandos web acima continuam disponíveis.

Além do Node, instale Rust e os [pré-requisitos nativos do Tauri](https://v2.tauri.app/start/prerequisites/) para o seu sistema operacional.

```bash
npm ci
npm run desktop:dev

# No Windows: instalador NSIS por usuário
npm run desktop:build -- --locked --bundles nsis

# No Linux: AppImage e pacote Debian
npm run desktop:build -- --locked --bundles deb,appimage
```

Os instaladores são gerados em `src-tauri/target/release/bundle/`. O CI prepara esses arquivos como artefatos para conferência; a publicação no catálogo assinado do OpenStruct será feita pelo publicador central após o cadastro do produto. Veja [docs/DESKTOP.md](docs/DESKTOP.md) para arquitetura, validação e preparação das releases.

---

## Conceitos básicos

Antes de usar, vale entender três termos que aparecem em todo o app:

- **NSPT** — número de golpes do ensaio SPT por metro de profundidade. É o dado bruto de cada sondagem.
- **Cota absoluta** — a altura de cada ponto em relação a um referencial (ex.: nível do mar). Como cada furo tem uma cota de topo diferente, a compatibilização alinha tudo pela cota, não pela profundidade.
- **Família de solo** — classificação simplificada em três grupos: **Coesivo** (argilas), **Granular** (areias) e **Intermediário** (siltes). O corte esquemático usa a família para decidir quais camadas se conectam entre furos vizinhos.

---

## Manual das abas

### Aba 1 — Obra

Formulário de cabeçalho do projeto. Os campos preenchidos aqui aparecem nos memoriais exportados (Aba 7).

**Campos:**
- **Nome da obra** — identificação principal (aparece no topo do app).
- **Localização** — Município/UF.
- **Data de cadastro**.
- **Sistema de coordenadas** — referencial usado nas coordenadas dos furos/estacas.
- **Responsável técnico** — nome e CREA.
- **Observações** — notas livres sobre a obra, sondagens ou restrições do terreno.

### Aba 2 — Sondagens

Cadastro dos furos de sondagem SPT.

**Como usar:**
1. Clique em **"+ Adicionar"** na barra lateral para criar uma sondagem.
2. Selecione uma sondagem na lista para editá-la no painel principal.
3. Preencha, para cada furo: nome, cota de topo, profundidade final, critério de paralisação (ex.: impenetrável), nível d'água e as leituras de NSPT metro a metro.
4. Na coluna **Cor** (ao lado de Solo), digite a coloração do solo como está no laudo (texto livre, opcional, fora do cálculo) — serve para a obra conferir em campo se o solo escavado corresponde ao da sondagem. A extração por PDF (`FORMATO_EXTRACAO_NSPT.md`) já traz a cor.
5. O botão **⇊ uniformizar abaixo** repete o solo e a cor da leitura em todas as leituras abaixo dela.
6. Para remover, use o botão de exclusão (com confirmação).

**Trecho impenetrável / NSPT alto:** quando o NSPT ultrapassa o limite do ensaio, o app preserva o valor real medido e marca o trecho como impenetrável — informação usada nos cálculos e no corte.

> É necessário **pelo menos 2 sondagens** para compatibilizar e gerar o corte.

### Aba 3 — Compatibilização

Alinha os furos cadastrados por cota absoluta, produzindo um perfil consolidado do subsolo.

**Recursos:**
- **Janela de compatibilização** — um controle deslizante define a tolerância de agrupamento das cotas. A alteração fica em rascunho até você confirmar.
- **Seletor de domínio** — filtra os furos por domínio geotécnico (ver Aba 4).
- **Botão "Recalcular"** — aplica os ajustes e refaz a compatibilização.
- **Layout em duas colunas** (em telas largas): tabela densa de valores à esquerda e perfil em SVG à direita.
- **Cores** (informativas; a compatibilização não muda): a envoltória mostra a cor da mesma leitura do mesmo furo que deu o NSPT mínimo; **Cor (média)** mostra a cor mais frequente entre os furos da família predominante (heterogênea: uma por família, "C: … | G: …"). Derivadas em `src/domain/cores.js`, fora da engine.

### Aba 4 — Análise

Análise crítica automática do conjunto de sondagens.

**O que mostra:**
1. **Contagem por severidade** — número de alertas críticos, moderados e informativos.
2. **Lista de alertas (A1–A11)** — cada alerta é um card que aponta uma possível inconsistência ou ponto de atenção (ex.: divergência entre furos, cota de arrasamento acima do topo das sondagens).
3. **Sugestão de agrupamento em domínios** — uma análise (k-means simplificado) que propõe agrupar furos semelhantes em domínios geotécnicos.

> A sugestão de domínio **não roda sozinha** — clique em **"Calcular"**. Ao aplicar, o domínio sugerido é gravado em cada sondagem, permitindo filtrar cálculos por região do terreno.

### Aba 5 — Estacas

Cadastro das estacas e das configurações globais de cálculo.

**Layout em duas colunas (telas largas):**
- **Esquerda:** tabela de estacas + painel de configurações globais.
- **Direita:** mini-mapa com a posição de furos e estacas.

**Operações com estacas:**
- **Adicionar** — gera o próximo nome livre (E-01, E-02...) e abre o formulário.
- **Editar** — ícone de lápis (✎) abre o formulário com os dados da estaca.
- **Remover** — ícone (✕), com confirmação.

Para cada estaca define-se: tipo (hélice contínua, pré-moldada, raiz, etc.), diâmetro, cota de arrasamento, carga prevista e coordenadas.

**Configurações globais de cálculo:**
- **Desprezar atrito do último metro (bulbo)** — prática usual; ativado por padrão.
- **Aplicar fator redutor de ponta** (Tabela 1.9).
- **Limitar R_p ≤ R_l** (regra adicional de Décourt).
- **Tratamento de ponta** (exclusivo, três opções):
  - `R_p = calculado` (padrão);
  - `R_p = 0 e P_adm = R_l/2` (NBR 6122 — sem contato garantido);
  - `R_p = min(R_p, R_l)` (NBR 6122 — contato com ressalva).
- **Editor de coeficientes** — permite ajustar os coeficientes dos métodos, com presets.

A partir desta aba abre-se também o **Corte Esquemático** (botão "📐 Corte esquemático").

#### Carga estrutural admissível (CP-16)

A carga estrutural admissível é **σₑ × área da seção**, com σₑ da **Tabela 1.10** (editável): hélice 6, escavada a seco 5, escavada com fluido 6, pré-moldada 11, raiz 12 MPa. O valor efetivo segue a hierarquia **override → catálogo comercial → cálculo σₑ×A** e é o limite estrutural em todos os cálculos. Quando o valor em uso (catálogo/override) supera σₑ×A, o alerta **A11** sinaliza a diferença (sem bloquear). No diagrama de transferência, uma linha-limite marca σₑ (ou σₑ×FS) e o trecho de σ(z) acima dela fica em vermelho.

### Aba 6 — Capacidade

Cálculo da capacidade de carga da estaca selecionada, com Décourt-Quaresma e Aoki-Velloso.

**Como usar:**
1. Selecione a estaca ativa.
2. Escolha o **modo de cálculo** (abas internas).

**Os quatro modos:**

| Modo | Descrição |
|------|-----------|
| **Envoltória** | Usa a envoltória inferior (mais conservadora) dos furos. |
| **Perfil médio** | Usa um perfil médio das sondagens, com submodos (ex.: conservador). |
| **Por furo** | Calcula a capacidade furo a furo, individualmente (com as mesmas opções de cálculo da estaca: coeficientes, flags de ponta/atrito, formato e carga estrutural). |
| **Interpolação** | Interpola entre furos conforme a posição da estaca, com pesos por cota. |

Há ainda uma aba **Comparativo**, que coloca os modos lado a lado para análise.

Cada modo apresenta o resumo (Q_adm, carga prevista, margem com cor por sinal), o detalhamento por camada e o memorial de cálculo. Quando há divergência entre Décourt-Quaresma e Aoki-Velloso, ela é sinalizada.

#### Diagrama de transferência de carga (AOKI 1979)

No resumo de cada método há o botão **📉 Transferência de carga**, que abre em tela cheia o diagrama de transferência axial da estaca: desenho da estaca, curva de **esforço normal N(z)** e curva de **tensão axial σ(z) = N(z)/Aₚ**, com eixo de profundidade em cota dupla (absoluta e relativa) e valores metro a metro.

- **Três cenários de carga no topo:** *Ruptura geotécnica* (R_rup do método), *Carga prevista* (a cadastrada na estaca) e *Prevista × FS* (carga prevista × fator de segurança global).
- **Dois modelos de AOKI** nos cenários de trabalho: *Modelo A* (resistência local; trava em zero abaixo do ponto B quando P < P_L) e *Modelo B* (redistribuição proporcional). Quando P ≥ P_L os dois coincidem.
- **Fuste em aterro:** se o arrasamento está acima das sondagens, N e σ permanecem constantes até o "topo do solo" e só então decaem.
- **Carga estrutural** entra apenas como referência, comparada no mesmo estado-limite (admissível no cenário de serviço; admissível × FS nos cenários de estado-limite último). Nunca altera o traçado.
- O diagrama é uma estimativa simplificada; não substitui prova de carga (NBR 16903) nem análise por curvas de transferência (t-z).

### Salvamento automático (autosave)

A obra é salva **automaticamente no navegador** (localStorage), com debounce após cada alteração — travamento, recarregar ou fechar a aba não fazem mais perder o trabalho: ao reabrir, o app pergunta se deseja recuperar. Um indicador no topo mostra "✓ salvo". O botão **🆕 Novo** limpa estado e autosave. **Limitações:** é local ao navegador/máquina, não sobrevive à limpeza de cache, pode ficar indisponível em janela anônima — por isso o **export JSON continua sendo o backup forte e portável**. Implementação robusta (try/catch; degrada graciosamente) e versionada (recusa schema antigo ao atualizar o app).

### Aba 7 — Saídas

Exportação dos resultados.

| Formato | Conteúdo |
|---------|----------|
| **XLSX** | Planilha com memoriais (uma aba por modo de cálculo + uma comparativa) e colunas de auditoria. Leituras e compatibilização trazem a **cor** do solo (envoltória, média e todas as cores da cota). Abre no Excel/LibreOffice. |
| **PDF** | Documento formatado, gerado pela função de impressão do navegador (botão "Imprimir / Salvar como PDF"). Versões compacta e completa. O completo traz a cor nas leituras e na compatibilização; o compacto, uma tabela de camadas com solo e cor (para conferência em campo). |
| **JSON (obra)** | Todos os dados de entrada, com hashes de integridade. É a "obra salva": reabre no app (botão Importar). |
| **JSON de auditoria** | Registro datado dos resultados (os 4 modos por estaca + comparativo, com a cota sugerida). Para rastreabilidade — não reabre no app. |
| **Detalhamento de estacas (JSON)** | Arquivo para o app de detalhamento de estacas do TQS (`geospt_detalhamento_<obra>_<data>.json`, esquema `geospt-detalhamento-estacas` 1.1.0). Não reabre no app. Veja abaixo. |

#### Exportação para detalhamento de estacas

Gerada por `src/abas/AbaSaidas/gerarDetalhamentoJSON.js` (botão na Aba 7). O app consumidor (`TQS-PYTHON\_apps\EstacaEscavada`, função `estaca_geospt.ler_exportacao`) **não calcula geotecnia**: tudo vem pronto do GeoSPT, pelas mesmas funções das Abas 3 e 6 (`prepararPerfilCalculo`, `engine.compatibilizar`, `engine.montarPerfilMedio`, filtro por domínio e `calcularModosDaEstaca` da auditoria); a engine não é alterada. Cotas e profundidades em metros (profundidade da boca do furo, positiva para baixo); campos sem valor saem `null`, listas vazias `[]`.

- `sondagens[]` — dado bruto de todas as sondagens (`nspt_real` preservado, `nspt_calculo` limitado a 50, `cota_m = cotaBoca_m − profundidade_m`, NA em profundidade e cota, coordenadas, `dominioId`, `cor` de cada leitura).
- `dominios[]` — `id`, `nome`, `furos`.
- `estacas[]` — dados da estaca; `furosConsiderados` (domínio da estaca, ou todos); `sondagensPorDistancia` (distância 2D crescente) e `sondagemMaisProxima`; `cotaPontaSugerida_m` por modo (`envoltoria`, `perfil_medio` = 2.2, `por_furo` = furo crítico, `interpolacao`); `avisos`; `perfis.envoltoria` (com `furo`, `nFuros` e `cor` da leitura de origem), `perfis.media` (submodo selecionado em `ui.submodoPerfilMedio`, padrão `2.2_conservador`; camadas com `cor` e `corDetalhe`) e `perfis.mediaPorSubmodo` (2.1, 2.2 e 2.3).
- Estaca sem coordenadas, sem cota de arrasamento, sem carga prevista ou com domínio vazio **não impede a exportação**: os campos dependentes saem `null` e o motivo vai em `avisos` da estaca. Sem carga prevista, a cota "neutra" mostrada na Aba 6 **não** é exportada como sugestão.
- Formato completo (contrato com o app de detalhamento): seção 5.7.2 do manual. O prompt que originou o formato (`PROMPT_GEOSPT_exportacao.md`) e o da atualização 1.1.0 (`PROMPT_TQS_detalhamento_1.1.0.md`) ficam fora do repositório.

---

## O Corte Esquemático

Acessível pela Aba 5, o corte é um **perfil geológico interpretado** entre os furos selecionados.

**Como montar:**
1. Clique em **"📐 Corte esquemático"**.
2. No mini-mapa ou na lista, selecione os furos e estacas que comporão o corte, **na ordem** desejada (cada item recebe um número de ordem). Mínimo: 1 estaca + 2 sondagens; máximo: 10 itens.
3. Clique em **"Ver corte (tela cheia)"**.

**Camadas (toggles disponíveis):**
- **Perfil interpretado** — preenche as camadas entre furos, conectando blocos da mesma família de solo por trapézios; camadas que terminam lateralmente são representadas por cunhas que se estendem até a face do furo vizinho.
- **Mostrar NSPTs** — exibe os valores de golpe ao lado de cada furo.
- **Ligar camadas / Ligar hachuras** — modos alternativos de representar as conexões (linhas tracejadas ou hachuras diagonais).
- **Preservar mergulho real** — desenha as conexões nas cotas reais (camadas inclinadas) em vez de horizontalizadas.
- **Superfície do terreno, nível d'água, média dos topos** — sobreposições de contexto.
- **Trecho sem SPT** — quando a cota de arrasamento de uma estaca está acima do topo investigado, esse trecho é marcado com uma hachura âmbar distinta (zona não investigada).

> ⚠️ O perfil entre furos é **inferência por similaridade de famílias de solo**, não dado medido. Revise sempre com julgamento técnico e geológico.

O corte pode ser **exportado em SVG** (botão "Exportar SVG").

---

## Salvar e abrir uma obra

> ⚠️ **O GeoSPT não salva dados no navegador.** Se você fechar a aba sem exportar, **perde o trabalho**.

- **Salvar:** use **Exportar → JSON** (botão no topo). O arquivo `geospt_<obra>_<data>.json` contém tudo.
- **Abrir:** use **Importar** e selecione um JSON exportado anteriormente. O app valida o arquivo e restaura todo o estado.

Mantenha o JSON em local seguro; ele é a sua "obra salva".

---

## Perguntas frequentes

**O app envia meus dados para algum servidor?**
Não. Todo o processamento é feito no seu navegador. Os dados só saem da máquina se você exportar os arquivos.

**Por que preciso de pelo menos 2 sondagens?**
A compatibilização e o corte comparam furos entre si; com um único furo não há o que compatibilizar.

**Aparece "nenhuma cota atende a carga prevista" numa estaca. O que é?**
Significa que, com os parâmetros atuais, nenhuma profundidade de ponta atinge a carga prevista para aquela estaca. Reveja carga, tipo/diâmetro da estaca ou as configurações de cálculo.

**O cálculo substitui o projeto de fundações?**
Não. É uma estimativa de apoio; o dimensionamento final é responsabilidade do engenheiro.

---

## Stack e estrutura do projeto

**Tecnologias:** React 18 · Vite 7 · Tailwind CSS 3 · SheetJS (xlsx). JavaScript (sem TypeScript).

```
src/
├── abas/                     # As 7 abas
│   ├── AbaIdentificacao.jsx
│   ├── AbaSondagens/
│   ├── AbaCompatibilizacao/
│   ├── AbaAnalise/
│   ├── AbaEstacas/
│   ├── AbaCapacidade/         # Os 4 modos de cálculo
│   ├── AbaCorteEsquematico/   # Corte geológico interpretado
│   └── AbaSaidas/             # XLSX, PDF, JSON
├── components/               # UI, inputs, visualizações
├── domain/                   # Regras de domínio (solos, estacas)
├── engine/                   # Núcleo de cálculo (CONGELADO) + dataset Balsas
├── layout/                   # Cabeçalho, abas, navegação
└── state/                    # Estado global da obra (Context)
```

A engine de cálculo (`src/engine/geospt-engine.js`) é **congelada e validada**; alterações na interface não a modificam.

---

## Testes

A engine é validada por testes determinísticos em Node:

```bash
node test-esm.mjs              # Regressão canônica (caso Balsas → 32,84 tf)
node test-casamento.mjs        # Casamento de camadas do corte
node test-geometria-corte.mjs  # Geometria do corte
node test-transferencia.mjs    # Transferência de carga (AOKI 1979): N(z), σ(z), modelos A/B
node test-persistencia.mjs     # Autosave (localStorage)
node test-detalhamento.mjs     # Exportação para detalhamento de estacas (inclui cor, esquema 1.1.0)
node test-saidas-cor.mjs       # Cor do solo no XLSX e nos PDFs
node test-saidas-calculo.mjs   # XLSX e PDFs calculam igual à Aba 6 (janela, domínio, por furo)
```

> `test-casamento.mjs` e `test-geometria-corte.mjs` gravam um arquivo temporário em `/tmp/`
> (caminho fixo) e só rodam assim em Linux/macOS. No Windows, rode uma cópia trocando `/tmp/`
> por uma pasta existente (e, no `import()`, por uma URL `file:///…`).

O **caso Balsas** é a regressão canônica: qualquer mudança que altere o resultado de **32,84 tf** indica quebra.

Para o histórico detalhado de desenvolvimento, veja **[HISTORICO_DESENVOLVIMENTO.md](HISTORICO_DESENVOLVIMENTO.md)** e **[NOTAS_TECNICAS.md](NOTAS_TECNICAS.md)**.

---

## Licença

Defina aqui a licença aplicável ao projeto (ex.: uso restrito institucional, MIT, etc.).
