ARG COOLIFY_URL
ARG COOLIFY_FQDN

FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/vite.config.ts tsconfig*.json ./
COPY frontend/index.html ./
COPY frontend/src ./src

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
