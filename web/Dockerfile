# ---- Build ----
# Contexto de build: raiz do repo. Copiar apenas pasta web/.
FROM node:20-alpine AS builder

WORKDIR /app

COPY web/package.json web/package-lock.json* ./
# npm install: lock pode ficar atrás do package.json entre deploys (ex.: deps removidas/ajustadas)
RUN npm install

COPY web/ .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Serve ----
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
