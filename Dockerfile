FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["node", "src/app.js"]
