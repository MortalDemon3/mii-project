FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache nginx

# Copy built frontend
COPY --from=builder /app/dist /usr/share/nginx/html
# ⚠️ CORRECTION : On remplace la config principale
COPY nginx.conf /etc/nginx/nginx.conf

# Copy and install auth server
COPY server /app/server
WORKDIR /app/server
RUN npm install --production
# ⚠️ CORRECTION : On force l'installation des nouveaux paquets
RUN npm install resend dotenv

# Copy start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create data directory
RUN mkdir -p /data

EXPOSE 80
CMD ["/app/start.sh"]