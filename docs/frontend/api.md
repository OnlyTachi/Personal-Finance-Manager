# Camada de Serviços e Integração com API

## 1. Visão Geral

A camada de serviços do frontend é responsável por centralizar toda a comunicação via requisições HTTP entre os componentes React e os endpoints REST do Backend.

A arquitetura abstrai as requisições através de um cliente HTTP (Axios/Fetch) configurado com cabeçalhos padrão, tratamento de autenticação e manipulação dos formatos de dados (JSON e formulários multipart/binary).

---

## 2. Estrutura dos Serviços

A camada de comunicação fica concentrada na pasta `src/services/` e engloba as seguintes divisões lógicas:

### 2.1. `investmentsService`

Agrupa endpoints relacionados à gestão patrimonial, operações de mercado, simuladores e configurações administrativas.

- **Ativos & Investimentos:**
  - `getAssets()` / `getAssetById(id)` / `createAsset(payload)` / `updateAsset(id, payload)` / `deleteAsset(id)`: CRUD completo dos ativos financeiros.
  - `refreshPrices()`: Dispara a atualização manual de cotações em tempo real (B3 via Yahoo Finance, Cripto via CoinGecko e Renda Fixa via Banco Central).
- **Transações & Algoritmo FIFO:**
  - `createTransaction(payload)`: Registra aportes ou saques associados a um ativo.
  - `simulateWithdrawal(payload)`: Faz o cálculo prévio de imposto de renda regressivo e IOF por lotes (First-In, First-Out) no saque.
  - `updateTransaction(id, payload)` / `deleteTransaction(id)`: Edita ou reverte transações registradas.
- **Passivos & Dívidas:**
  - `getPassivos()` / `getPassivoById(id)` / `createPassivo(payload)` / `deletePassivo(id)`: Gestão do saldo devedor e financiamentos.
  - `toggleParcela(passivoId, parcelaId)`: Alterna o status de pagamento de uma parcela (Pago / Pendente).
- **Simuladores & Indicadores:**
  - `getIndices()`: Obtém taxas oficiais vigentes (Selic, CDI, IPCA 12m).
  - `simulateFixedIncome(params)`: Projeção de acúmulo em Renda Fixa com aportes recorrentes.
  - `simulateEmergencyFund(payload)`: Cálculo da meta da reserva de emergência baseada em despesas mensais.
- **Modo Casal & Gamificação:**
  - `getCoupleSummary()` / `getCoupleHistory()` / `linkPartner(username)` / `unlinkPartner()`: Módulo conjugal, histórico e divisão de despesas.
  - `getGoals()` / `createGoal(payload)` / `updateGoal(id, payload)` / `deleteGoal(id)`: Gestão de metas compartilhadas.
  - `getGamificationStatus()` / `getGamificationBattle()`: Status de medalhas, troféus e duelo de economia mensal.
- **Dispositivos & Integrações Externas:**
  - `getTelegramDevices()` / `generateTelegramCode()` / `unlinkTelegramDevice(id)`: Pareamento do bot do Telegram.
  - `getDiscordDevices()` / `generateDiscordCode()` / `unlinkDiscordDevice(id)` / `testDiscordWebhook(url)`: Pareamento e alertas via Discord.
  - `changePassword(newPassword)`: Alteração da senha da conta logada.
- **Painel Administrativo (`admin*`):**
  - `adminListUsers()` / `adminCreateUser(payload)` / `adminUpdateUser(username, payload)` / `adminDeleteUser(username)` / `adminGetUserStats(username)`: Ações protegidas exclusivas para conta `is_admin`.

---

### 2.2. `reportService`

Responsável pela geração de relatórios consolidados, simulações de IRPF, exportações e agendamentos de e-mails.

- **Preferências & Agendamentos:**
  - `getReportPreferences()`: Recupera configurações de disparos automáticos (frequência diária, semanal, mensal) e destino de e-mail/webhook.
  - `updateReportPreferences(payload)`: Atualiza periodicidade, horários e webhook do Discord.
- **Previews & Dashboards de Relatórios:**
  - `previewDailyCheckup()` / `previewWeeklyReport()` / `previewMonthlyReport(month, year)` / `previewAnnualReport(year)` / `previewCustomReport(filters)`: Gera visualização dinâmica contendo cartões, fluxo de caixa e tabelas de IRPF.
- **Disparos Manuais:**
  - `sendDailyCheckupNow()` / `sendWeeklyReportNow()` / `sendMonthlyReportNow(...)` / `sendAnnualReportNow(...)` / `sendCustomReportNow(...)`: Solicita o envio imediato do relatório para o e-mail cadastrado.
- **Exportação de Arquivos (Blobs Binários):**
  - `exportMonthlyPdf(month, year)`: Baixa o relatório mensal formatado em PDF.
  - `exportAnnualPdf(year)` / `exportAnnualExcel(year)`: Baixa o informe do IRPF em PDF ou planilha `.xlsx`.
  - `exportCustomPdf(filters)` / `exportCustomExcel(filters)`: Baixa dados com filtros dinâmicos de período e categoria.

---

### 2.3. Mapeador de Transações & Importação em Massa

Serviços dedicados à leitura e importação de planilhas e extratos:

- `analyzeFile(formData)`: Envia o arquivo CSV/Excel para análise prévia, retornando o `file_token`, nomes das colunas e amostragem de dados (`sample_rows`).
- `uploadLegacyPreview(formData)`: Processa arquivos nos formatos legados PDF e OFX gerando transações estruturadas.
- `mapFile(apiPayload)`: Conecta o mapeamento configurado pelo usuário ao `file_token`, enviando a indicação de qual coluna a IA deve ler para categorização.
- `importBulk(previewData)`: Persiste no banco de dados a lista final de transações após a validação e ajuste do usuário no preview.

---

### 2.4. `emailAutomationService`

Gerencia a caixa de conciliação inteligente e a sincronização IMAP:

- `getEmailAccounts()` / `linkEmailAccount(payload)` / `unlinkEmailAccount(id)`: Conecta e valida contas de e-mail via servidor IMAP/porta/senha de aplicativo.
- `triggerEmailScan()`: Força a varredura por novas notas fiscais e comprovantes na caixa de entrada.
- `getPendingReconciliations()`: Traz a lista de correspondências sugeridas pela IA entre recibos de e-mail e lançamentos no extrato bancário.
- `confirmReconciliation(payload)` / `rejectReconciliation(matchId)`: Confirma o vínculo do comprovante com a transação ou descarta a sugestão.
- Requisição direta no pipeline para busca retroativa: `POST /pipeline/imap/sync-history` com `days_back` (30, 90 ou 180 dias).

---

## 3. Tratamento de Erros e Padrões de Resposta

A camada de serviço trata os erros HTTP padronizados vindos da API FastAPI:

1. **Formatos de Erro HTTP 400/422:**
   - O backend responde com erros contendo a estrutura `{ detail: string | { code: string, message: string } }`.
   - **Exemplo de Trativa:** No carregamento de e-mails (`EmailsPage`), o código verifica especificamente se `err.response?.status === 400` e `detail?.code === "EMAIL_NOT_CONFIGURED"` para direcionar o usuário à tela de vincular conta.

2. **Download de Arquivos (Blobs):**
   - As chamadas de exportação usam `responseType: 'blob'`. No frontend, a resposta é convertida em um URL temporário (`window.URL.createObjectURL`) associado a um elemento `<a>` dinâmico para acionar o download nativo no navegador com o nome do arquivo configurado.
