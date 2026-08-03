📦 Changelog Geral Consolidadom — Personal Finance Manager

🚀 Versão Unificada [2.2.0] — Refatoração Core, Pipeline Canônico & Integrações

🏛️ 1. Arquitetura Core & Pipeline Canônico de Dados

Schema Canônico (CanonicalTransactionDTO): Criado um contrato universal em Pydantic V2 em app/modules/data_pipeline/schemas.py para padronizar a saída de dados de todas as fontes heterogêneas (CSV, Excel, OFX, PDF, OCR, E-mails e Open Finance) antes da persistência no banco.

Extratores Isolados (data_pipeline/extractors/document_parser.py): Lógica de parsing de arquivos brutos, limpeza de moedas e extratos totalmente desacoplada do fluxo de caixa.

Fila Assíncrona de Ingestão (tasks.py): Processamento em segundo plano para arquivos pesados e OCR com respostas 202 Accepted e rotas de acompanhamento de progresso (GET /api/v1/pipeline/tasks/{task_id}).

Centralização de Dados de Mercado (market_data.py): Serviço centralizado com cache em memória (24 horas) para taxas Selic, CDI e IPCA consumidas da API do Banco Central.

Otimização do Rebuild Histórico ($O(N)$): Refatoração da função de reconstrução de histórico para uma State Machine baseada em Deltas Diários, eliminando recalculados retroativos $O(N^3)$ e aplicando gravações em lote (db.bulk_save_objects).

Padronização de UUIDs: Utilitário global app/core/utils.py com a função generate_uuid(), unificando a identificação em todos os modelos ORM.

Concorrência e Banco de Dados: SQLite configurado em modo WAL (Write-Ahead Logging) com busy_timeout de 30s, e pool de conexões otimizado (pool_size=20, max_overflow=30) para bancos PostgreSQL. Migrações atualizadas via Alembic (f8c18389da66).

🔌 2. Integrações & Open Finance (Extensão / API Pluggy)

Sincronização via Pluggy Open Finance: Adicionado suporte à integração com a API da Pluggy para conexão nativa de contas bancárias, cartões de crédito e carteiras de investimento.

Mapeamento Canônico Automático: Extrator dedicado para converter os conectores e payloads de transações da Pluggy diretamente no CanonicalTransactionDTO.

Conciliação e De-duplicação Inteligente: Verificação prévia de hashes de transações bancárias vindas do Pluggy para evitar lançamentos duplicados em contas já monitoradas por e-mail ou extrato manual.

Gestão de Consentimento: Estrutura para gerenciamento e renovação de tokens de acesso e conectores financeiros cadastrados na plataforma.

🤖 3. Inteligência Artificial, LLMs & Vision OCR

Camada de Abstração Multi-Provedor (app/core/ai/):

OllamaClient: Orquestração dinâmica com fallback automático (Worker Remoto em GPU $\rightarrow$ Servidor Local em CPU) para chamadas de Chat e Tool-calling.

GeminiClient: Atualizado para o SDK moderno google-genai para análise visual de comprovantes (Vision OCR) e inferência de intenções.

Parsing Rígido de Respostas LLM: Normalização de retornos JSON do SLM com remoção automática de blocos Markdown (````json e `````) e tratamento flexível de tipos (str$\rightarrow$dict) para validação pelo Pydantic (ExtracaoSLM`).

Widget de Chat Flutuante: Componente flutuante na interface com pré-visualização no hover, indicador de status online/offline via health check dinâmico e chamadas a tools para consulta de saldo e ativos.

📧 4. Ingestão de E-mails & Conciliação Automatizada

Suporte Multi-Contas IMAP: Criação da tabela email_accounts vinculada ao username do usuário com criptografia de senhas de aplicativo e propriedade @property masked_email para proteção de dados sensíveis na interface (ex: ta......@gmail.com).

Inbound Webhook HTTP (email_engine.py): Recebimento em tempo real de webhooks de e-mail vindos de serviços como Resend, SendGrid e Cloudflare.

Varredura Dinâmica e Resiliência: Atualização das tarefas de fundo (BackgroundTasks) para iterar por todas as contas cadastradas do usuário, prevenindo exceções brutas e erros do tipo RuntimeError: Response already started.

Central de Conciliação (EmailsPage.jsx): Painel frontend para visualização de notas e recibos capturados, com opções para confirmar a conciliação bancária ou rejeitar/descartar pendências.

👩‍❤️‍👨 5. Módulo Isolado de Contas de Casal (app/modules/couple/)

Desacoplamento de Domínio: Algoritmo Splitwise simplificado (calculate_settlement), históricos patrimoniais conjuntos e metas compartilhadas movidos para o módulo autônomo couple.

Novos Endpoints Dedicados (/api/v1/couple):

GET /summary: Dashboard de saldo de acerto de contas e divisão justa (fair share).

GET /history: Evolução do patrimônio líquido combinado.

GET /goals: Progresso de metas financeiras compartilhadas e individuais vinculadas.

📊 6. Relatórios Multiformato, Análises Financeiras & PDF/Excel

Motor de Templates Jinja2 (app/templates/): Substituição completa de f-strings por templates HTML responsivos seguros e estruturados para e-mails e documentos.

Tipos de Relatórios e Fechamentos:

Check-up Diário: Resumo de lançamentos, alertas de teto de orçamento ($\ge 80\%$) e contas a vencer.

Semanal (Correção de Rota): Evolução diária de gastos, destaque para consumo no fim de semana e Top 3 categorias.

Fechamento Mensal: DRE simplificado (Receitas x Despesas x Saldo Livre), evolução patrimonial e balanço do casal.

Anual & Informe IRPF: Retrospectiva do ano, gráfico Jan-Dez e consolidação de bens e direitos em 31/12 para o Imposto de Renda.

Personalizado: Filtros de período livre, categorias, origens e flag de despesas compartilhadas.

Exportação Binária: Download nativo via frontend em PDF (WeasyPrint), Excel (openpyxl / pandas) e CSV.

🔔 7. Central de Notificações & Bots (Discord & Telegram)

Notificações Multimodais (app/modules/notifications): Disparo simultâneo na Web, E-mail, Telegram e Discord para faturas a vencer, metas 100% atingidas, anomalias de consumo (gastos $> 3\times$ a média) e lançamentos do casal.

Bot Bidirecional do Discord (app/modules/bots/discord/):

Suporte a Slash Commands (/vincular, /gasto, /resumo, /meta, /casal).

Processamento de linguagem natural no chat privado (DMs) para lançamentos rápidos (ex: 15.90 Almoço).

Interatividade com menus Select e botões para desfazer ações.

Sistema de pareamento por código temporário via entidade DiscordDevice.

Telegram: Migração de threads bloqueantes para suporte a Webhooks e Async Long Polling no ciclo de vida principal (lifespan).

💻 8. Frontend (React + Vite + TailwindCSS) & UI/UX

Configuração de Path Alias: Configurado alias @/ no Vite apontando para src/, eliminando caminhos relativos complexos.

Centralização da Camada de Serviços: Exportações unificadas em src/services/index.js cobrindo auth, cashflow, investments, couple, reports, notifications e emailAutomation.

Central de Notificações na Navbar: Ícone de sininho com badge numérico de não lidas (unreadCount), dropdown categorizado e redirecionamento dinâmico.

Página de Relatórios (/reports): Interface para configuração de agendamentos de e-mail, pré-visualizações interativas em iframe HTML e downloads em PDF/Excel via manipulação de Blob.

📡 Resumo de Endpoints da API

Módulo

Método

Endpoint

Descrição

Pipeline

POST

/api/v1/pipeline/upload/preview

Pré-visualização de extratos (PDF/OFX/Pluggy) em DTO Canônico.

Pipeline

POST

/api/v1/pipeline/upload/async-process

Ingestão assíncrona para arquivos grandes (202 Accepted).

E-mails

GET/POST

/api/v1/email-automation/accounts

Gestão e teste de conexões de contas IMAP.

Casal

GET

/api/v1/couple/summary

Dashboard e balanço de acerto de contas.

Relatórios

GET

/api/v1/reports/monthly-report/pdf

Geração e download do fechamento mensal em PDF.

Relatórios

GET

/api/v1/reports/annual-report/excel

Exportação de dados para IRPF em planilha Excel.

Notificações

GET

/api/v1/notifications/

Listagem das notificações recentes do usuário.

Auth

POST

/api/v1/auth/discord/generate-code

Gera código temporário para vinculo do bot do Discord.

🧪 9. Qualidade, Testes & Desempenho

Testes de Estresse (Locust): Suíte de testes criada cobrindo concorrência em rotas de fluxo de caixa, pipeline assíncrono, relatórios e dados de casal.

Desempenho: 0% de taxa de falhas sob carga contínua de mais de 15 usuários simultâneos.
