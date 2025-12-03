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
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
