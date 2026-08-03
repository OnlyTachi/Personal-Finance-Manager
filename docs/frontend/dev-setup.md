# Guia de Configuração e Execução do Frontend

Este documento descreve os pré-requisitos, variáveis de ambiente, passos de instalação e execução do projeto frontend (React + Vite + Tailwind CSS).

---

## 1. Pré-requisitos Nativos

Antes de começar, certifique-se de ter as seguintes ferramentas instaladas no seu ambiente de desenvolvimento:

- **Node.js:** Versão 18.0.0 ou superior (recomendado 20.x LTS).
- **Gerenciador de Pacotes:** `npm` (incluso no Node), `yarn` ou `pnpm`.
- **Git:** Para clonagem e controle de versão do repositório.

---

## 2. Variáveis de Ambiente (`.env`)

Crie um arquivo `.env` na raiz da pasta do frontend (ou `.env.local`) para configurar a comunicação com a API Backend:

```env
# URL base da API REST FastAPI (Backend)
VITE_ALLOWED_HOST="http://localhost:8000"

# (Opcional) Ambiente de execução
VITE_ENV=development
```

> **Nota:** No Vite, as variáveis de ambiente expostas para o código cliente devem obrigatoriamente começar com o prefixo `VITE_`.

---

## 3. Passo a Passo de Instalação e Execução

### Passo 1: Instalar as Dependências

Abra o terminal na pasta raiz do projeto e execute:

```bash
npm install
# ou
yarn install
# ou
pnpm install
```

As principais dependências instaladas serão:

- `react` e `react-dom`: Biblioteca UI principal.
- `react-router-dom`: Roteamento dinâmico.
- `lucide-react`: Ícones da interface.
- `recharts`: Gráficos dinâmicos de investimentos e fluxo de caixa.
- `tailwindcss`, `postcss`, `autoprefixer`: Motor de estilização.

---

### Passo 2: Rodar o Servidor de Desenvolvimento

Para iniciar a aplicação localmente com suporte a _Hot Module Replacement_ (HMR):

```bash
npm run dev
# ou
yarn dev
```

O terminal exibirá a URL local (por padrão `http://localhost:5173`). Abra no seu navegador.

---

### Passo 3: Build para Produção

Para gerar os arquivos estáticos otimizados (minificados) para produção:

```bash
npm run build
```

Os arquivos prontos serão gerados na pasta `/dist`.

---

### Passo 4: Preview da Build de Produção

Para testar a versão de produção localmente antes do deploy:

```bash
npm run preview
```

---

## 4. Aliases de Caminho (Path Aliases)

O projeto está configurado para utilizar o alias `@` apontando para a pasta `src/`, facilitando as importações e evitando caminhos relativos longos (ex: `../../../components`):

```js
// Exemplo de importação no projeto:
import { investmentsService } from "@/services";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
```

### Configuração no `vite.config.js`:

```js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: [env.VITE_ALLOWED_HOST],
      host: true,
      port: 5173,
    },
  };
});
```

---

## 5. Resolução de Problemas Comuns

| Problema                            | Causa Provável                                                                             | Solução                                                                                                                            |
| :---------------------------------- | :----------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| **Erro de CORS** nas requisições    | Backend FastAPI não liberou o domínio `http://localhost:5173`.                             | Configure o middleware `CORSMiddleware` no backend FastAPI autorizando a origem do frontend.                                       |
| **Erro 404 ao recarregar página**   | Roteamento client-side em servidor estático sem fallback para `index.html`.                | Certifique-se de usar `BrowserRouter` ou configurar o webserver (Nginx/Vercel) para redirecionar todas as rotas para `index.html`. |
| **Estilos do Tailwind não aplicam** | Falta de importação no `index.css` ou padrão de caminho incorreto no `tailwind.config.js`. | Verifique se as diretivas `@tailwind base; @tailwind components; @tailwind utilities;` estão no topo do `index.css`.               |
