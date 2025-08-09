# Use Node.js 22 (versão mais recente e compatível com seu ambiente local)
FROM node:22-slim

# Cria o diretório de trabalho
WORKDIR /app

# Habilita o pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copia os arquivos do projeto
COPY . .

# Instala as dependências
RUN pnpm install

# Expõe a porta da API
EXPOSE 3000

# Comando de inicialização
CMD ["pnpm", "run", "dev"]
