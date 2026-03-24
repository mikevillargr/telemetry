FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm install --workspace=@gr-bi/shared --workspace=@gr-bi/web

COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace=@gr-bi/shared
RUN npm run build --workspace=@gr-bi/web

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=@gr-bi/web"]
