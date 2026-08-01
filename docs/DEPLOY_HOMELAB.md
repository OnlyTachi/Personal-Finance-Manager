# 🏠 Guia de Deploy HomeLab

Este documento detalha a infraestrutura personalizada para rodar o **Personal Finance Manager** no meu servidor doméstico (Acer Aspire ES1-573).

## 🛠️ Especificações do Host

- **Hardware:** Intel i3-6006U | 8GB RAM
- **SO:** Ubuntu Server 24.04 LTS
- **Rede:** Tailscale para acesso remoto seguro e gestão de certificados SSL.

_Para saber mais do meu hardware, aperte [aqui](https://github.com/OnlyTachi/OnlyTachi/blob/main/SETUP.md)_

---

## 🏗️ Topologia da Rede

Para evitar conflitos com outros serviços do HomeLab (como Jellyfin), o sistema de finanças utiliza portas alternativas no Docker, enquanto o Tailscale faz o mapeamento para as portas padrão (80/443).

### Mapeamento de Portas

| Serviço           | Porta Interna (Docker) | Porta Host (Acer) | Acesso Tailnet           |
| ----------------- | ---------------------- | ----------------- | ------------------------ |
| **Caddy (HTTP)**  | 80                     | 8080              | Automático via Proxy     |
| **Caddy (HTTPS)** | 443                    | 8443              | `https://dominio:443`    |
| **Backend**       | 8000                   | 8000              | `/api/*`                 |
| **Frontend**      | 5173                   | 5173              | Redirecionado pelo Caddy |

---

## 🔐 Passo a Passo da Configuração

### 1. Gestão de Certificados (Tailscale)

O Caddy utiliza certificados gerados pelo Tailscale para garantir HTTPS real.

```bash
# No diretório do projeto
mkdir -p ./tailscale/certs

# Gerar certificados
sudo tailscale cert --cert-file ./tailscale/certs/dominio.crt --key-file ./tailscale/certs/dominio.key tachi-server.example.bol.ts.net

# Ajuste crítico de permissões para o Docker
sudo chown -R 1000:1000 ./tailscale/certs
sudo chmod 644 ./tailscale/certs/*

```

### 2. Configuração do Vite (Segurança de Host)

Para evitar o erro `Blocked request`, o Vite deve aceitar o domínio da Tailnet via `.env`.

**Arquivo `frontend/.env`:**

```env
VITE_ALLOWED_HOST=tachi-server.example.bol.ts.net

```

**Arquivo `vite.config.js`:**

```javascript
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      allowedHosts: [env.VITE_ALLOWED_HOST],
      host: true,
      port: 5173,
    },
  };
});
```

### 3. O "Pulo do Gato": Tailscale Serve (TCP Mode)

Para que o Caddy gerencie o SSL de ponta a ponta sem o Tailscale "atropelar" a conexão, usamos o modo **TCP Pass-through** em segundo plano:

```bash
# Limpa configurações anteriores
sudo tailscale serve reset

# Cria a ponte persistente
sudo tailscale serve --bg --tcp=443 8443

```

---

## 📜 Caddyfile de Produção (HomeLab)

Configuração otimizada para o domínio privado:

```caddy
tachi-server.example.bol.ts.net:443 {
    tls /tailscale/certs/tachi-server.example.bol.ts.net.crt /tailscale/certs/tachi-server.example.bol.ts.net.key

    handle /api/* {
        reverse_proxy backend:8000
    }

    handle {
        reverse_proxy frontend:5173
    }
}

```

---

## 🚦 Comandos de Manutenção

| Ação                 | Comando                                       |
| -------------------- | --------------------------------------------- |
| **Status da Ponte**  | `tailscale serve status`                      |
| **Logs do Gateway**  | `docker logs -f Financias_Gateway`            |
| **Reiniciar Stack**  | `docker compose down && docker compose up -d` |
| **Liberar Firewall** | `sudo ufw allow 8443/tcp`                     |

> [!IMPORTANT]
> Se o acesso externo falhar, verifique se o processo `tailscale serve` não foi encerrado. O uso da flag `--bg` é obrigatório para persistência.

---

\*Documentação feita para o projeto Finanças - **Fevereiro 2026\***
