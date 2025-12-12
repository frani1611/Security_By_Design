FROM node:20 AS builder

WORKDIR /app

# install deps
COPY package*.json ./
RUN npm install

# copy source and build
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Create entrypoint script to inject runtime config
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-generate-config.sh && \
    echo 'set -e' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo 'echo "window.ENV_CONFIG = {" > /usr/share/nginx/html/config.js' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo 'echo "  VITE_GOOGLE_CLIENT_ID: \"${VITE_GOOGLE_CLIENT_ID}\"," >> /usr/share/nginx/html/config.js' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo 'echo "  VITE_API_URL: \"${VITE_API_URL}\"" >> /usr/share/nginx/html/config.js' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo 'echo "};" >> /usr/share/nginx/html/config.js' >> /docker-entrypoint.d/40-generate-config.sh && \
    chmod +x /docker-entrypoint.d/40-generate-config.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
