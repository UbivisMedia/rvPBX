FROM node:22.8.2-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src
COPY .env.example ./

EXPOSE 3001
CMD ["node", "src/index.js"]
