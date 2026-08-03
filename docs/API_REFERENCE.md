# Referência da API RESTful (`/api/v1`)

O Backend expõe uma API RESTful completa com validação rigorosa via **Pydantic v2** e documentação automática Swagger UI.

> **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)  
> **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🔑 Autenticação & Dispositivos (`/api/v1/auth`)

- `POST /token` - Realiza login e retorna o JWT Bearer Token.
- `POST /register` - Cadastra novo usuário (atribui Admin se for a 1ª conta do sistema).
- `GET /me` - Dados do usuário logado e configurações de perfil.
- `POST /partner/link` - Vincula conta ao parceiro para o Modo Casal.
- `POST /telegram/generate-code` - Gera código temporário para parear o Telegram Bot.
- `POST /discord/generate-code` - Gera código para parear o Bot do Discord.

---

## 📈 Investimentos, Dívidas & Metas (`/api/v1/investments`)

- `GET /assets` / `POST /assets` - Lista e cria ativos (Renda Fixa, Ações, FIIs, Cripto).
- `POST /assets/refresh` - Força atualização assíncrona de cotas (B3, CoinGecko, BCB).
- `POST /transactions` - Registra novos aportes ou saques em ativos.
- `POST /transactions/simulate-withdrawal` - Simula resgates calculando IR/IOF por lotes (**FIFO**).
- `GET /passivos` / `POST /passivos` - Lista e cadastra dívidas/financiamentos.
- `POST /passivos/{id}/parcelas/{parcela_id}/toggle` - Alterna parcela de dívida entre Pago / Pendente.
- `GET /goals` / `POST /goals` - Gestão de metas compartilhadas ou individuais.

---

## 💵 Fluxo de Caixa (`/api/v1/cashflow`)

- `GET /` - Lista lançamentos mensais com paginação e busca.
- `POST /movimentacoes` - Adiciona receitas ou despesas (com suporte a `shared=True` para Casal).
- `GET /summary` - Retorna totais de receitas, despesas e taxa de poupança no mês.
- `GET /limits` / `POST /limits` - Gestão de limites de orçamento por categoria.

---

## 🚀 Ingestão & Pipeline de Dados (`/api/v1/pipeline`)

- `POST /upload/analyze` - Analisa arquivo CSV/Excel e retorna colunas e amostragem.
- `POST /upload/map` - Aplica mapeamento de colunas e categorização por IA.
- `POST /import/bulk` - Persiste lista final de lançamentos importados.
- `POST /imap/sync-history` - Dispara varredura retroativa em contas de e-mail (30, 90 ou 180 dias).

---

## 📧 Automação de E-mails & Conciliação (`/api/v1/email-automation`)

- `GET /accounts` / `POST /accounts` - Lista e conecta contas de e-mail via IMAP (Porta 993 SSL).
- `POST /scan` - Força varredura imediata por faturas e recibos.
- `GET /reconciliations/pending` - Lista comprovantes capturados pela IA aguardando conciliação.
- `POST /reconciliations/confirm` / `POST /reconciliations/reject` - Confirma ou descarta vínculo de comprovante com extrato.

---

## 📊 Relatórios & Exportações (`/api/v1/reports`)

- `GET /monthly-report/pdf` - Retorna stream direto do PDF mensal formatado (WeasyPrint).
- `GET /annual-report/excel` - Transmite arquivo `.xlsx` estruturado para a declaração de IRPF.
- `GET /preview/*` - Gera previews HTML de relatórios (Diário, Semanal, Mensal, Anual).
- `POST /preferences` - Configura periodicidade, horários e webhook do Discord para disparos.

---

## 👩‍❤️‍👨 Modo Casal (`/api/v1/couple`)

- `GET /summary` - Resumo patrimonial consolidado (Você + Parceiro) e cálculo de acerto de contas (_Settlement_).
- `GET /history` - Série histórica da evolução do patrimônio somado.

---

## 🏆 Gamificação (`/api/v1/gamification`)

- `GET /status` - Retorna nível de investidor, XP e conquistas desbloqueadas.
- `GET /battle` - Estatísticas do confronto de taxa de economia do mês corrente com o parceiro.

---

## 🛠️ Painel Administrativo (`/api/v1/admin`)

- `GET /users` / `POST /users` - Listagem e cadastro de contas no sistema (Protegido `is_admin`).
- `POST /users/{username}/reset-password` - Reset forçado de senhas.
- `GET /users/{username}/stats` - Auditoria detalhada de uso de um usuário.
