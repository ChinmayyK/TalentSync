# SSL/TLS Handling in Software Deployment

## Section 1: Conceptual Overview

**TLS** (Transport Layer Security) encrypts client-server communication. Always use **TLS 1.2 or 1.3** only—SSL is deprecated.

| Term | Description |
|------|-------------|
| **Certificate** | Cryptographic credential proving server identity |
| **Private Key** | Secret key (never expose) |
| **TLS Termination** | Point where encrypted traffic is decrypted |
| **HSTS** | Header forcing browsers to use HTTPS |

### TLS Termination Points:
```
Internet → [CDN/Load Balancer] → [Reverse Proxy] → [Application]
              ↑ TLS terminates      ↑ Optional        ↑ HTTP only
              (recommended)
```

---

## Section 2: Development vs Deployment

| Aspect | Development | Deployment |
|--------|-------------|------------|
| **HTTPS in app** | ❌ Not needed | ❌ Handled externally |
| **Certificates** | None or mkcert | Let's Encrypt / ACM |
| **URL** | `http://localhost` | `https://api.company.com` |

---

## Section 3: Architecture

### Production (Nginx):
```
Browser → [Nginx:443] → [Backend:3001]
              ↑              ↑
         TLS termination    HTTP only
```

### AWS:
```
Browser → [ALB:443] → [ECS:3001]
              ↑
         ACM Certificate (auto-renews)
```

---

## Section 4: Implementation

### Option A: Nginx + Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.talentsync.com
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name api.talentsync.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.talentsync.com;

    ssl_certificate /etc/letsencrypt/live/api.talentsync.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.talentsync.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option B: AWS ALB + ACM
```bash
# Request cert
aws acm request-certificate --domain-name api.talentsync.com --validation-method DNS

# Attach to ALB listener on port 443
```

### Option C: Docker + Traefik
```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--certificatesresolvers.le.acme.tlschallenge=true"
      - "--certificatesresolvers.le.acme.email=devops@talentsync.com"
    labels:
      - "traefik.http.routers.api.tls.certresolver=le"
```

---

## Section 5: Common Mistakes

| Mistake | Solution |
|---------|----------|
| TLS in app code | Use reverse proxy instead |
| Self-signed in prod | Use Let's Encrypt |
| Using TLS 1.0/1.1 | Only TLS 1.2+ |
| No HSTS header | Add `Strict-Transport-Security` |
| No HTTP→HTTPS redirect | Force 301 redirect |
| Exposing private key | Store in secrets manager |

---

## TalentSync Recommendation

| Environment | Solution |
|-------------|----------|
| Local dev | No TLS (`http://localhost:3001`) |
| Docker staging | Traefik + Let's Encrypt |
| AWS production | ALB + ACM certificates |

**Application code should NOT handle TLS**—listen on HTTP, let the proxy terminate HTTPS.

