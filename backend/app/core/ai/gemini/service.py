# app/core/AI/gemini/client.py
import json
import logging
import io
import google.generativeai as genai
from PIL import Image
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiClient:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def is_available(self) -> bool:
        return bool(self.api_key)

    def analyze_image(
        self, image_bytes: bytes, prompt: str, model_name: str = "gemini-2.5-flash"
    ) -> dict:
        if not self.is_available():
            return None

        try:
            model = genai.GenerativeModel(model_name)
            image = Image.open(io.BytesIO(image_bytes))
            response = model.generate_content([prompt, image])
            text_response = (
                response.text.replace("```json", "").replace("```", "").strip()
            )
            return json.loads(text_response)
        except Exception as e:
            logger.error(f"[GeminiClient] Erro na análise de imagem: {e}")
            return None

    def generate_text_json(
        self, prompt: str, model_name: str = "gemini-2.5-flash"
    ) -> dict:
        if not self.is_available():
            return None

        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            text = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"[GeminiClient] Erro na geração de texto: {e}")
            return None
