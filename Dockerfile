# Build
FROM node:20-alpine AS builder

WORKDIR /app

# Usa npm install para que o deploy instale sempre o que está em package.json
# (evita depender de package-lock.json atualizado localmente)
COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
RUN npm run build

# Run
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY drizzle ./drizzle

EXPOSE 3000

CMD ["node", "dist/index.js"]
