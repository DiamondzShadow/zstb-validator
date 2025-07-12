Below is a **complete, Docker-centric README.md** you can drop straight into the repo.

````markdown
# zsTB YouTube Validator 🪄

A slim Node.js service that:

1. Pulls **view & subscriber counts** from YouTube,  
2. Calculates deltas since last run,  
3. Mints **zsTB** ERC-20 tokens on your chain.

Runs **once at boot** and **every hour** thereafter.

---

## ⚡ Quick Start (100 % Docker)

```bash
# clone
git clone https://github.com/DiamondzShadow/zstb-validator.git
cd zstb-validator

# build image
docker build -t zstb-validator .

# create .env (template below) and fill your values
cp .env.example .env
nano .env

# run detached, auto-restarts on crash / reboot
docker run -d --name zstb-validator \
  --env-file .env \
  -p 3000:3000 \
  --restart always \
  zstb-validator
````

| Check           | Command / URL                                                |
| --------------- | ------------------------------------------------------------ |
| Health endpoint | `curl http://localhost:3000` → `OK`                          |
| Live logs       | `docker logs -f zstb-validator`                              |
| Stop / start    | `docker stop zstb-validator` / `docker start zstb-validator` |

---

## 🔑 Environment Variables

Create `.env` (or secret store) with:

```dotenv
# Blockchain
RPC_URL=https://YOUR-RPC
PRIVATE_KEY=0xYOUR_ORACLE_PK
CONTRACT_ADDRESS=0xYOUR_ZSTB_TOKEN
RECIPIENT_ADDRESS=0xWHERE_MINT_GOES

# YouTube API
YOUTUBE_API_KEY=AIzaSyEXAMPLE
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxx

# Optional
PORT=3000          # health-check port
```

> **Never** commit the real `.env`. It’s in `.gitignore`.

---

## 🎬 Google API – YouTube Data v3

1. Open **Google Cloud Console**.
2. **Enable** ➜ *YouTube Data API v3*.
3. \**Credentials → Create API key*.
4. (Recommended) **Restrict** it:

   * *Application restriction*: your server IP **or** HTTP referrer.
   * *API restriction*: YouTube Data API v3 only.
5. Paste the key into `YOUTUBE_API_KEY` above.

---

## 📦 Runtime Dependencies (auto-installed)

| Package        | Why                             |
| -------------- | ------------------------------- |
| **ethers**     | Contract calls & wallet signing |
| **googleapis** | Official YouTube client         |
| **dotenv**     | Loads `.env` secrets            |
| **node-cron**  | Hourly scheduler                |

Docker and `npm ci` install these automatically—nothing extra to do.

---

## 🗂 Project Layout

```
.
├── index.js              # boot + cron(0 * * * *) ➜ run()
├── validator/
│   ├── youtube-validator.js  # core logic
│   └── abi.json              # **only** the .abi array
├── package*.json
├── Dockerfile
└── previous_stats.json   # auto-generated state
```

---

## 🔄 CI/CD (totally optional)

Push an image to GitHub Container Registry every commit:

```yaml
# .github/workflows/docker.yml
name: Build & Push
on: [push]
jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/<GH_USER>/zstb-validator:latest
```

Deploy that image anywhere (`docker run …`).

---

## 🌍 Production HTTPS (Nginx reverse-proxy)

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

# /etc/nginx/sites-available/validator
server {
    listen 80;
    server_name validator.example.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name validator.example.com;

    ssl_certificate     /etc/letsencrypt/live/validator.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/validator.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
# enable & reload
sudo ln -s /etc/nginx/sites-available/validator /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS cert
sudo certbot --nginx -d validator.example.com
```

---

## 🪙 Mint Logic

```
• +100 zsTB per 10 new subscribers
•  +5 zsTB per 20 new views
```

Adjust in `validator/youtube-validator.js` → `toMint` formula.
Cron expression in `index.js` if you want faster/slower cadence.

---

## 🔒 Best Practices

1. **Hot-wallet** only—fund with pocket change.
2. Lock `YOUTUBE_API_KEY` to your server IP / domain.
3. Expose **only** Nginx port (443) publicly.
4. Let Docker auto-restart (`--restart always`) for resilience.

---

May your subs moon and your gas stay cheap. 🚀

````

**How to use**

```bash
echo "<paste block above>" > README.md
git add README.md
git commit -m "Docs: cross-platform, Docker-first README"
git push
````

Now any dev—Linux, macOS, or Windows—can clone, fill `.env`, and run with two commands (`docker build` → `docker run`).
