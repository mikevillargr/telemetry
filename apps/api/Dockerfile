FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm install --workspace=@gr-bi/shared --workspace=@gr-bi/api

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace=@gr-bi/shared
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=@gr-bi/api

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
