FROM node:22-alpine AS base
WORKDIR /usr/src/app

FROM base AS dependencies
COPY package*.json ./
RUN npm ci
RUN npm prune --production

FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm test
RUN npm run build

FROM base AS production
ENV NODE_ENV=production

COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY prisma ./prisma
COPY --from=builder /usr/src/app/dist ./dist
COPY entrypoint.sh .


COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
RUN chmod +x ./entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]

CMD ["node", "dist/main"]