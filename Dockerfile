FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npm install -g @openai/codex@latest
COPY . .
CMD node -e "const fs=require('fs'),os=require('os'),path=require('path');const d=path.join(os.homedir(),'.codex');fs.mkdirSync(d,{recursive:true});if(process.env.CODEX_AUTH_B64)fs.writeFileSync(path.join(d,'auth.json'),Buffer.from(process.env.CODEX_AUTH_B64,'base64').toString());" && npm run worker
