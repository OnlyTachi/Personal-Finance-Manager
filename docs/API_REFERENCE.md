# 📡 Referência da API

O Backend do Personal Finance Manager expõe uma API RESTful completa, documentada automaticamente via padrões Swagger/OpenAPI.

## 📖 Acesso à Documentação Interativa

O sistema possui uma interface Swagger UI embutida, permitindo testar requisições sem necessidade de ferramentas externas (como Postman).

Com o backend rodando, acesse:

> **URL:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔑 Autenticação

**Base Path:** `/api/v1/auth`

- `POST` **/token**

  - Realiza o login do usuário.
  - **Retorno:** `access_token` (Bearer Token) para ser usado no header `Authorization`.

- `POST` **/register**

  - Cria um novo usuário no sistema.

- `GET` **/me**

  - Retorna os dados do usuário atualmente logado (perfil, settings).

---

## 💰 Investimentos

**Base Path:** `/api/v1/investments`

- `GET` **/assets**

  - Lista todos os ativos (Renda Fixa, Variável, Cripto) do usuário.

- `POST` **/transactions**

  - Registra um novo aporte ou saque em um ativo existente.

- `POST` **/assets/refresh**

  - Força uma atualização assíncrona de cotações (B3, CoinGecko) e índices (Selic/CDI).

---

## 🧮 Calculadora

**Base Path:** `/api/v1/calculator`

- `POST` **/simulate**

  - Realiza projeções de rentabilidade de Renda Fixa com base em indexadores e prazos.

- `GET` **/indices**

  - Retorna os indicadores econômicos atuais (Selic, CDI, IPCA).
  - **Fonte:** Banco Central do Brasil (BCB).

---

## 💸 Fluxo de Caixa

**Base Path:** `/api/v1/cashflow`

- `GET` **/**

  - Lista movimentações (receitas/despesas).
  - **Filtros suportados:** `month`, `year`, `category_id`.

- `POST` **/import/bulk**

  - Endpoint para processamento em lote. Recebe uma lista de transações (geralmente vinda do parser de OFX/PDF) para salvar de uma vez.

---

## ❤️ Casal

**Base Path:** `/api/v1/investments/couple`

- `GET` **/summary**

  - Retorna o objeto financeiro combinado (**User + Partner**).
  - Inclui o cálculo do "Acerto de Contas" (quem deve a quem no mês).

- `GET` **/history**

  - Retorna a série histórica do patrimônio somado do casal (evolução dia-a-dia).

---

## 🏆 Gamificação

**Base Path:** `/api/v1/gamification`

- `GET` **/status**

  - Retorna o nível atual, XP e medalhas desbloqueadas pelo usuário.

- `GET` **/battle**

  - Retorna as estatísticas comparativas do mês atual para a competição **Você vs Parceiro** (ex: % de economia sobre a receita).
