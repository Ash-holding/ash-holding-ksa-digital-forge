FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Dependencies
COPY package.json ./
RUN npm install --no-audit --no-fund

# Source
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build

# Runtime
ENV NODE_ENV=production
ENV PORT=4000
ENV UPLOAD_DIR=/data/uploads

RUN mkdir -p /data/uploads
VOLUME ["/data/uploads"]

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
