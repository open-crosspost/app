# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.9-alpine AS base
WORKDIR /app

RUN mkdir -p api ui host packages/every-plugin packages/everything-dev

COPY package.json bun.lock ./
COPY api/package.json ./api/package.json
COPY ui/package.json ./ui/package.json
COPY host/package.json ./host/package.json
COPY packages/every-plugin/package.json ./packages/every-plugin/package.json
COPY packages/everything-dev/package.json ./packages/everything-dev/package.json

RUN --mount=type=cache,target=/root/.bun bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV BOS_ACCOUNT=dev.everything.near
ENV GATEWAY_DOMAIN=everything.dev

EXPOSE 3000

CMD ["bun", "run", "start"]
