ARG COOLIFY_URL
ARG COOLIFY_FQDN
ARG RUNNINGHUB_API_KEY
ARG RUNNINGHUB_BASE_URL
ARG RUNNINGHUB_ENDPOINT
ARG RUNNINGHUB_WORKFLOW_ID

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tzdata

COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]
