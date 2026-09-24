FROM node:24-bookworm-slim
WORKDIR /app
COPY splitsmart-source.tar.gz /tmp/splitsmart-source.tar.gz
RUN tar -xzf /tmp/splitsmart-source.tar.gz -C /app && rm /tmp/splitsmart-source.tar.gz
RUN npm install --global pnpm@11.25.0 && pnpm install --prod --frozen-lockfile
RUN mkdir -p /app/data /app/uploads && chown -R node:node /app
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
