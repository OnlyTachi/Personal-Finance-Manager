# app/core/AI/llm/client.py
import requests
import json
import logging
from typing import Optional, Dict, Any, List
from app.core.config import settings

logger = logging.getLogger(__name__)


class OllamaClient:
    @staticmethod
    def _get_endpoints():
        """Retorna uma lista de tuplas (url_base, model, timeout) priorizando o Worker Remoto."""
        return [
            (settings.OLLAMA_WORKER_URL, settings.OLLAMA_WORKER_MODEL, (0.5, 10.0)),
            (settings.OLLAMA_LOCAL_URL, settings.OLLAMA_LOCAL_MODEL, (None, 60.0)),
            ("http://localhost:11434", "qwen2.5:3b", 35.0),  # Fallback padrao
        ]

    @staticmethod
    def _format_url(base_url: str, endpoint: str) -> str:
        """Garante a formatação correta da URL (evita duplicação de /api/...)."""
        if "api" in base_url:
            base_url = base_url.split("/api")[0]
        return f"{base_url.rstrip('/')}/api/{endpoint}"

    @staticmethod
    def generate(
        prompt: str,
        temperature: float = 0.1,
        num_predict: int = 256,
        format: str = "json",
    ) -> dict:
        """Gera uma resposta simples focada em extração estruturada (JSON)."""
        endpoints = OllamaClient._get_endpoints()

        for base_url, model, timeout in endpoints:
            if not base_url or not model:
                continue

            url = OllamaClient._format_url(base_url, "generate")

            try:
                payload = {
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "format": format,
                    "options": {
                        "temperature": temperature,
                        "num_predict": num_predict,
                    },
                }

                response = requests.post(url, json=payload, timeout=timeout)
                response.raise_for_status()
                content = response.json().get("response", "").strip()

                if format == "json":
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0].strip()
                    return json.loads(content)

                return {"response": content}

            except Exception as e:
                logger.warning(f"[OllamaClient] Falha em {url} ({model}): {e}")
                continue

        raise ConnectionError("Nenhum endpoint do Ollama respondeu com sucesso.")

    @staticmethod
    def chat(
        messages: List[Dict[str, Any]], tools: Optional[List[Dict[str, Any]]] = None
    ) -> dict:
        """Gerencia o contexto de chat com suporte a tool calls (Function Calling)."""
        endpoints = OllamaClient._get_endpoints()

        for base_url, model, _ in endpoints:
            if not base_url or not model:
                continue

            url = OllamaClient._format_url(base_url, "chat")

            try:
                payload = {
                    "model": model,
                    "messages": messages,
                    "stream": False,
                }
                if tools:
                    payload["tools"] = tools

                # Timeout para chat costuma ser maior devido ao RAG e chamadas de ferramentas
                response = requests.post(url, json=payload, timeout=30.0)
                response.raise_for_status()
                return response.json()

            except Exception as e:
                logger.warning(f"[OllamaClient Chat] Falha em {url} ({model}): {e}")
                continue

        raise ConnectionError("Nenhum endpoint do Ollama disponível para chat.")
