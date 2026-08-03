# Arquitetura de Inteligência Artificial (AI Engine)

## 1. Visão Geral

O sistema conta com um motor de Inteligência Artificial híbrido e resiliente projetado para processamento de linguagem natural (NLP), leitura de comprovantes/notas fiscais (OCR) e agente financeiro com capacidade de **Function Calling / RAG (Retrieval-Augmented Generation)**.

A arquitetura opera em 3 camadas (Tiers) com suporte a _failover_ (fallback automático), garantindo que a aplicação continue funcionando de forma fluida mesmo que um dos provedores esteja indisponível.

---

## 2. Camadas do Motor de IA (Tier Pipeline)

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                      REQUISIÇÃO DE IA                       │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  Tier 1: Google Gemini 2.5 Flash (Nuvem / OCR Visão)        │
 └──────────────────────────────┬──────────────────────────────┘
                                │ (Se falhar / Sem API Key / Apenas Texto)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  Tier 2: Ollama Remoto (Worker dedicado com GPU)            │
 └──────────────────────────────┬──────────────────────────────┘
                                │ (Se desconectado / Timeout > 0.5s)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  Tier 3: Ollama Local (Fallback em CPU / Modelo Phi3.5)     │
 └─────────────────────────────────────────────────────────────┘
```

### Tier 1: Google Gemini 2.5 Flash (`app/core/ai/gemini/service.py`)

- **Propósito:** Processamento multimodal de imagens (OCR de notas fiscais, fotos de recibos, faturas em PDF transformadas em bitmap).
- **Vantagens:** Alta velocidade e precisão no reconhecimento visual de valores e estabelecimentos.
- **Fallback:** Se a variável `GEMINI_API_KEY` não for informada, o sistema pula o Tier 1 e utiliza os modelos de texto locais.

### Tier 2: Worker Remoto Ollama (`app/core/ai/llm/service.py`)

- **Propósito:** Processamento contínuo de tarefas pesadas de texto (classificação de extratos via SLM, conversas do chat e sumarização).
- **Modelo Preferencial:** `qwen2.5:3b` ou equivalente rodando em máquina dedicada na rede local/VPN.
- **Resiliência:** Timeout agressivo para conexão inicial (`0.5s`). Se a GPU remota estiver inacessível, o tráfego é redirecionado instantaneamente para o Tier 3.

### Tier 3: Ollama Local (`app/core/ai/llm/service.py`)

- **Propósito:** Provedor local de contingência para execução diretamente no servidor principal.
- **Modelo Padrão:** `phi3.5:latest` ou `qwen2.5:3b`.
- **Garantia:** Assegura que o sistema permaneça 100% autônomo mesmo em cenários _offline_ ou sem conexão de rede externa.

---

## 3. Estrutura dos Arquivos (`app/core/ai/`)

### 3.1. `app/core/ai/tools.py` (Function Calling & Context Assembly)

Contém o registro de ferramentas expostas aos modelos e funções para montagem do contexto financeiro (_RAG_):

- **`build_user_financial_snapshot(db, user_username)`:**
  - Constrói uma foto JSON sintética do patrimônio do usuário: Total em Ativos, Dívidas, Patrimônio Líquido, posições de destaque (FIIs, Cripto), receitas/despesas do mês atual e projeções de faturas.
- **`buscar_historico_estabelecimento(db, user_username, estabelecimento)`:**
  - _Tool para LLM:_ Realiza busca textual no histórico de compras do usuário em lojas específicas (ex: "Quanto gastei na Shopee ou no Uber?").
- **`detalhar_posicao_ativo(db, user_username, ticker)`:**
  - _Tool para LLM:_ Consulta o valor bruto e saldo estimado de um investimento por ticker (ex: "MXRF11", "BTC").
- **`AVAILABLE_TOOLS` e `TOOLS_SCHEMA`:**
  - Dicionário e schemas JSON Schema exportados para permitir que o LLM execute chamadas a funções do sistema.

### 3.2. `app/core/ai/llm/service.py` (`OllamaClient`)

Classe responsável por encapsular as chamadas para a API do Ollama:

- **`generate(prompt, temperature, num_predict, format="json")`:**
  - Força a saída estritamente formatada em JSON, removendo marcadores ` ```json ` automaticamente.
- **`chat(messages, tools)`:**
  - Mantém histórico de conversação com suporte à passagem do parâmetro `tools` para _Function Calling_.

### 3.3. `app/core/ai/gemini/service.py` (`GeminiClient`)

Cliente para integração com a API `google-generativeai`:

- **`is_available()`:** Valida se a chave de API está configurada.
- **`analyze_image(image_bytes, prompt)`:** Recebe um buffer de imagem e extrai os campos da nota fiscal/recibo diretamente em formato JSON.

---

## 4. Fluxo de Execução da Categorização Neural (Few-Shot)

A categorização automática de transações (seja no upload de extratos ou recebimento de e-mails) utiliza o aprendizado de poucos disparos (_Few-Shot Learning_):

1. **Amostragem do Histórico:** O sistema busca no banco as últimas categorizações manuais ajustadas pelo usuário.
2. **Construção do Prompt com Exemplos:** O histórico do usuário é injetado como exemplo no prompt, permitindo que a IA aprenda preferências individuais (ex: se o usuário prefere classificar "Steam" como "Lazer" e não "Tecnologia").
3. **Extração JSON:** A IA retorna a categoria prevista com grau de confiança.
4. **Aprendizado Contínuo:** Caso o usuário altere a categoria manualmente na interface do frontend, o próximo ciclo do Few-Shot considerará o novo padrão.
