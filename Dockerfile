# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.9-alpine AS base
WORKDIR /app

COPY . .

RUN --mount=type=cache,target=/root/.bun bun install --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV BOS_ACCOUNT=dev.everything.near
ENV GATEWAY_DOMAIN=everything.dev

EXPOSE 3000

CMD ["bun", "run", "start"]
