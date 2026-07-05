FROM node:20-alpine

WORKDIR /usr/src/app

# Copia e instala as dependências primeiro (otimiza o cache do Docker)
COPY package*.json ./
RUN npm install

# Copia todo o código fonte
COPY . .

# Realiza o build do NestJS (TypeScript para JavaScript)
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]