**updated `README.md`** with Firestore logic and current minting behavior — while keeping your Docker-based deployment flow intact:

---

````md
# zsTB YouTube Validator 🪄

A slim Node.js oracle that:

1. Pulls **view & subscriber counts** from YouTube  
2. Calculates deltas since last run (stored in Firestore)  
3. Mints **zsTB** ERC-20 tokens on your chain  
4. Stores **mint history** in Firestore `/mints/` subcollection

Runs **once at boot** and **every hour** thereafter.

---

## ⚡ Quick Start (100% Docker)

```bash
# clone
git clone https://github.com/DiamondzShadow/zstb-validator.git
cd zstb-validator

# build image
docker build -t zstb-validator .

# copy env config and fill in values
cp .env.example .env
nano .env

# run in background and auto-restart
docker run -d --name zstb-validator \
  --env-file .env \
  -p 3000:3000 \
  --restart always \
  zstb-validator
````

| Check       | Command                             |
| ----------- | ----------------------------------- |
| Healthcheck | `curl http://localhost:3000` → `OK` |
| Live logs   | `docker logs -f zstb-validator`     |
| Restart     | `docker restart zstb-validator`     |

---

## 🔑 .env Configuration

```dotenv
# Blockchain
RPC_URL=https://your-rpc-url
PRIVATE_KEY=0x_your_oracle_wallet_private_key
CONTRACT_ADDRESS=0x_zstb_token_contract
RECIPIENT_ADDRESS=0x_where_to_mint_tokens

# YouTube API
YOUTUBE_API_KEY=AIzaSyEXAMPLE
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxx

# Optional
PORT=3000
```

---

## 🎬 YouTube API Setup

* Go to Google Cloud Console
* Enable `YouTube Data API v3`
* Create API Key and restrict it to:

  * Application: IP / referrer
  * API: `YouTube Data API v3`

---

## 🔥 Firestore Setup

This oracle now **uses Firestore** instead of local JSON files.

**Collection structure:**

```
/youtubeValidators/{channelId}
/youtubeValidators/{channelId}/mints/{timestamp}
```

**Requirements:**

* Firestore API enabled in Google Cloud
* Oracle running on a GCP VM (uses `applicationDefault()` auth)
* Firestore rules should allow read/write (see below)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if
        request.time < timestamp.date(2025, 8, 7);
    }
  }
}
```

---

## 🧠 Mint Logic

```txt
+100 zsTB per 10 new subscribers  
 +  5 zsTB per 20 new views

→ Stats are stored in Firestore  
→ Mint history is saved under `/mints/`  
→ Prevents duplicate mints
```

You can adjust the logic in:

```js
validator/youtube-validator.js → `calculateMintAmount()`
```

---

## 🗂 Project Layout

```
.
├── index.js                  # boot + cron(0 * * * *) → run()
├── validator/
│   ├── youtube-validator.js  # core logic with Firestore
│   └── abi.json              # contract ABI
├── firebase.js               # Firestore init (uses ADC)
├── Dockerfile
├── package*.json
└── .env.example
```

---

## 🛠 CI/CD (optional)

GitHub Actions: `.github/workflows/docker.yml`

```yaml
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

---

## 🌍 HTTPS with Nginx

Install Nginx + Certbot:

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

Example config:

```nginx
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
```

Then:

```bash
sudo ln -s /etc/nginx/sites-available/validator /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d validator.example.com
```

---

## 🧪 View Results

Use Firebase Hosting or Next.js to visualize:

```
/youtubeValidators/{channelId}
  → views, subscribers, latest deltas
/youtubeValidators/{channelId}/mints/
  → timestamped mint records
```

---

## 🔒 Best Practices

* Use hot wallet with minimal funds
* Lock API keys to IP or domain
* Do not expose anything except port 443
* Use Docker `--restart always` for resilience

---

## 🛠 Manual Dev Run

```bash
node index.js
```

---

Let me know if you want me to `git commit -am "docs: updated Firestore + mint tracking in README"` and push this to GitHub.
