# Estrutura Geral do Frontend

## 1. Visão Geral

O frontend do Gerenciador Financeiro Pessoal foi construído visando alta performance, modularidade e uma experiência de usuário.

- **Tecnologia Principal:** React (Vite e StrictMode)
- **Estilização:** Tailwind CSS (com classes utilitárias e animações customizadas)
- **Visualização de Dados:** Recharts (Gráficos de área, linha, barras e rosca)
- **Ícones:** Lucide React

---

## 2. Árvore de Diretórios (`src/`)

```text
src/
├── assets/                  # Arquivos estáticos (imagens, SVGs, ícones)
├── components/              # Componentes genéricos, modais e layouts globais
│   ├── email/               # Interface e gerenciador de conexões IMAP e Chat flutuante
│   ├── layout/              # Barras de navegação (Navbar), menus e containers globais
│   └── ui/                  # Componentes reutilizáveis (ex: CsvMapperModal)
├── context/                 # Contextos globais da aplicação
├── features/                # Domínios e funcionalidades principais (Páginas)
│   ├── admin/               # Gestão administrativa e métricas de usuários do sistema
│   ├── auth/                # Login, registro e fluxos de entrada da aplicação
│   ├── calculator/          # Simuladores financeiros
│   ├── cashflow/            # Fluxos de caixa, importação e conciliação manual
│   ├── couple/              # Módulo de finanças para casais
│   ├── dashboard/           # Resumo global, gráficos de alocação de carteira e saldos
│   ├── emails/              # Automação de conciliação de faturas
│   ├── gamification/        # Conquistas, troféus e evolução do status de investidor
│   ├── help/                # Fórum, documentação, FAQ interno e glossário
│   ├── history/             # Linha do tempo interativa e evolução patrimonial
│   ├── investments/         # Cadastro, detalhes e simulação FIFO de saques de ativos
│   ├── passivos/            # Controle de dívidas, financiamentos e amortizações ativas
│   ├── reports/             # Geração e agendamento de demonstrativos e informes
│   └── settings/            # Configurações de perfil, IMAP, Telegram e Discord
├── services/                # Camada de requisições HTTP e comunicação com a API REST
├── App.jsx                  # Arquivo raiz de definição de rotas e injeção de contextos
├── index.css                # Estilos globais Tailwind, cores de scrollbar e etc
└── main.jsx                 # Ponto de inicialização do React
```

---

## 3. Topologia de Rotas e Acessos (`App.jsx`)

A aplicação utiliza um componente de guarda (`<PrivateRoute>`) para interceptar e validar o estado de autenticação antes do acesso a rotas restritas.

| Endpoint (URL)    | Módulo / Componente  | Restrição de Acesso | Propósito                                                                                     |
| :---------------- | :------------------- | :------------------ | :-------------------------------------------------------------------------------------------- |
| `/login`          | `LoginPage`          | **Público**         | Tela de entrada, autenticação e cadastro de novos usuários.                                   |
| `/`               | `DashboardPage`      | Privado             | Painel consolidado com a visão de Ativos vs Passivos (Patrimônio Líquido).                    |
| `/cashflow`       | `CashFlowPage`       | Privado             | Transações mensais, filtros, fluxo diário e módulo de importação (Upload).                    |
| `/history`        | `HistoryPage`        | Privado             | Gráficos de área do histórico temporal do acúmulo financeiro.                                 |
| `/calculator`     | `CalculatorPage`     | Privado             | Simulação dinâmica baseada na Taxa Selic e CDI reais.                                         |
| `/passivos`       | `PassivosPage`       | Privado             | Visão macro de empréstimos, cartões de crédito e financiamentos.                              |
| `/passivos/:id`   | `PassivoDetailsPage` | Privado             | Gestão granular, baixa e cancelamento de parcelas de uma dívida.                              |
| `/add-investment` | `AddAssetPage`       | Privado             | Inclusão de um novo ativo à carteira (Renda Fixa, Ações, FIIs ou Cripto).                     |
| `/asset/:id`      | `AssetDetailsPage`   | Privado             | Detalhamento com histórico de aportes, deduções e previsão de tributação (IR).                |
| `/couple`         | `CouplePage`         | Privado             | Conexão conjugal, divisão de gastos, metas globais e duelo do mês.                            |
| `/achievements`   | `AchievementsPage`   | Privado             | Recompensas por metas atingidas (ex: "Mestre da Alocação", "Clube dos 100k").                 |
| `/emails`         | `EmailsPage`         | Privado             | Inbox para reconciliar ou rejeitar recebimentos capturados automaticamente.                   |
| `/reports`        | `ReportsPage`        | Privado             | Dashboards de balanço anual, exportações brutas e agendador de disparo automático de e-mails. |
| `/settings`       | `SettingsPage`       | Privado             | Painel para link de Webhooks do Discord, Código de Pareamento do Telegram Bot e contas IMAP.  |
| `/help`           | `HelpPage`           | Privado             | Base de conhecimento interativa com fórmulas por trás dos cálculos.                           |
| `/admin`          | `AdminPage`          | Privado **(Admin)** | Painel exclusivo e protegido para gerenciar/auditar os usuários do sistema.                   |

---

## 4. Filosofia de Design e Estilização (`index.css`)

- **Tailwind como Motor:** O design system usa extensamente o Tailwind CSS para compor os cards e layouts fluidos, sem dependência pesada de arquivos `.css` externos.
- **Tema Global Escuro:** O fundo predominante é construído sobre a base `#0f172a` (Slate-900), promovendo descanso visual, destacando métricas com cores vivas e textos em branco gelo (`#f8fafc`).
- **Scrollbars Minimalistas:** Implementação via webkit com `width: 8px`, trilha em `#1e293b` e barra de rolagem em `#475569`.
- **Animações Nativas & Fluidas:** Adoção do padrão `animate-in`, `fade-in`, e keyframes autorais (`slideInRight` em `0.6s cubic-bezier(0.16, 1, 0.3, 1)`).
- **Staggering Dinâmico:** Uso de delays sequenciais no carregamento de itens (classes de `.delay-100` até `.delay-700`) garantindo que grids e tabelas carreguem com efeito "cascata".
