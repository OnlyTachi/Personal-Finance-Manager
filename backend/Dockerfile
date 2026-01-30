# Usa uma imagem leve do Python
FROM python:3.12-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Instala dependências do sistema necessárias para compilar alguns pacotes Python (opcional, mas recomendado)
RUN apt-get update && apt-get install -y \
    gcc libpq-dev tesseract-ocr libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia o requirements.txt primeiro (para aproveitar o cache do Docker)
COPY requirements.txt .

# Instala as dependências (O Docker cria seu próprio ambiente aqui)
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o resto do código para dentro do container
COPY . .

# Expõe a porta 8000
EXPOSE 8000

# Comando para rodar o servidor
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]