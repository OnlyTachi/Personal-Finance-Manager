# 📘 Guia do Usuário

Bem-vindo ao **Personal Finance Manager**! Este guia explica como utilizar os principais recursos do sistema para organizar sua vida financeira.

## 🚀 Primeiros Passos

1.  **Criar Conta**: Na tela inicial, selecione **"Registrar"** e crie seu usuário.
2.  **Login**: Acesse com suas credenciais recém-criadas.
3.  **Dashboard**: Você verá uma tela vazia inicialmente. Comece adicionando seus dados seguindo os passos abaixo!

---

## 💰 Gerenciando Investimentos (Ativos)

Vá para **Dashboard > Novo Ativo**.

### Tipos de Ativos Suportados

- **Renda Fixa (CDB, LCI, LCA):**

  - O sistema projeta o crescimento diário automaticamente.
  - **Como cadastrar**: Informe a taxa contratada (ex: `110%` do CDI) e a data exata do aporte.

- **Renda Variável (Ações, FIIs, ETFs):**

  - O sistema atualiza o preço automaticamente 2x ao dia (fechamento e abertura/meio-dia).
  - **Como cadastrar**: Use o Ticker correto (ex: `PETR4.SA` para Brasil, `AAPL` para EUA).

- **Criptomoedas:**
  - Preços via CoinGecko.
  - **Como cadastrar**: Use o ID da moeda (ex: `bitcoin`, `ethereum`).

### Aportes e Saques

Ao clicar em um ativo existente no Dashboard, você entra nos detalhes dele. Use os botões **Aportar** ou **Sacar**.

> **Dica Importante:** O sistema usa lógica **FIFO** (First-In, First-Out). Ao realizar um saque parcial, ele calcula automaticamente o imposto sobre o lucro da parcela mais antiga investida.

---

## 💸 Fluxo de Caixa & Bot Telegram

Controle seus gastos diários e receitas na aba **Carteira**.

### Configurando o Bot do Telegram

O bot permite registrar gastos em tempo real sem abrir o site.

1.  Vá em **Configurações** (Ícone de Engrenagem ⚙️).
2.  Clique em **"Gerar Código de Vínculo"**.
3.  Abra o Bot no Telegram e envie o comando:
    `/start SEU_CODIGO`
4.  **Pronto!** Agora basta enviar mensagens no formato `valor descrição`:
    - `15.90 Padaria`
    - `50 Uber`

O bot registrará automaticamente a despesa no sistema.

### Importação Bancária

Para lançamentos em massa, vá na tela de **Carteira** e clique em **Importar Extrato**.

- **Formatos aceitos**: `.ofx`, `.csv`, `.pdf` (bancos selecionados).
- **Auto-Categorização**: O sistema tentará identificar a categoria automaticamente (ex: "McDonalds" → "Alimentação").

---

## ❤️ Finanças de Casal

Gerencie o patrimônio familiar na página **Casal** no menu lateral.

### Como Conectar

1.  **Conectar Parceiro**: Digite o `username` do seu parceiro(a) e clique em **Conectar**.
2.  **Confirmação Mútua**: A outra pessoa deve entrar na conta dela e realizar o mesmo processo, conectando o _seu_ username.

### Recursos de Casal

- **Visão Combinada**: Um dashboard que soma os patrimônios de ambos.
- **Gráficos de Contribuição**: Visualize quem investiu mais proporcionalmente.
- **Acerto de Contas (Estilo Splitwise)**:
  - Ao lançar uma despesa na **Carteira**, marque a opção **"Dividir com Casal"**.
  - O sistema calcula automaticamente quem deve a quem no final do mês, baseando-se no conceito de "Divisão Justa" (50/50).

---

## 🏆 Gamificação

Acompanhe seu progresso na página **Conquistas**.

- **Medalhas**: O sistema analisa sua saúde financeira (reserva de emergência, diversificação) e libera medalhas.
- **Níveis**: Evolua de "Novato Financeiro" até "Lenda dos Dividendos".
- **Batalha Mensal**: Uma competição saudável com seu parceiro(a) para ver quem poupou mais percentualmente no mês corrente.

---

## 🛠️ Ferramentas Administrativas

_Nota: Disponível apenas para administradores._

Se você for o **primeiro usuário** criado no sistema, você receberá permissões de Admin automaticamente.

1.  Acesse o ícone de **Escudo 🛡️** no menu superior.
2.  Neste painel, você pode:
    - Ver estatísticas gerais de uso.
    - Resetar senhas de usuários.
    - Gerenciar configurações globais do sistema.
