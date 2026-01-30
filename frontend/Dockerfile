# Usa imagem do Node
FROM node:20-slim

WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o resto do código
COPY . .

# Expõe a porta do Vite
EXPOSE 5173

# O "--host" é essencial para acessar o Vite de fora do Docker
CMD ["npm", "run", "dev", "--", "--host"]