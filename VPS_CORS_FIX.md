# 🔧 VPS CORS & Network Error Fix Guide

## 📋 Error yang Terjadi

```javascript
AxiosError: Network Error
POST http://agrogonta.ptpws.id:3001/auth/login net::ERR_FAILED
```

**Kenapa Postman bisa, tapi browser tidak?**
- ✅ **Postman**: Tidak tunduk pada kebijakan CORS browser
- ❌ **Browser**: Memerlukan CORS headers yang benar dari server

---

## ✅ Solusi yang Sudah Diterapkan

### 1. **Update CORS Configuration** ✅ DONE

File: `src/main.ts` sudah diupdate untuk mengizinkan domain VPS Anda.

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://agrogonta.ptpws.id',      // ✅ VPS domain (HTTP)
  'https://agrogonta.ptpws.id',     // ✅ VPS domain (HTTPS)
];
```

---

## 🚀 Langkah Deploy ke VPS

### Step 1: Rebuild dan Deploy

```bash
# Di VPS, masuk ke folder project
cd /path/to/backend-smart-farming

# Pull latest changes
git pull origin main

# Rebuild container
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Cek logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Step 2: Verifikasi CORS Headers

Test dengan curl:

```bash
# Test dari terminal VPS
curl -I http://agrogonta.ptpws.id:3001/auth/login \
  -H "Origin: http://agrogonta.ptpws.id" \
  -H "Access-Control-Request-Method: POST"
```

**Expected Response Headers:**
```
Access-Control-Allow-Origin: http://agrogonta.ptpws.id
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Credentials: true
```

---

## 🔥 Masalah Umum & Solusi

### Problem 1: Firewall Blocking Port 3001

**Cek apakah port 3001 terbuka:**

```bash
# Di VPS
sudo netstat -tulpn | grep 3001
sudo ss -tulpn | grep 3001

# Cek firewall
sudo ufw status
```

**Buka port jika tertutup:**

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 3001/tcp
sudo ufw reload

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
sudo service iptables save
```

---

### Problem 2: Nginx Reverse Proxy Blocking

Jika menggunakan Nginx, pastikan CORS headers diforward:

**File: `/etc/nginx/sites-available/agrogonta`**

```nginx
server {
    listen 80;
    server_name agrogonta.ptpws.id;

    location /api {
        # Proxy ke backend
        proxy_pass http://localhost:3001;
        
        # CORS Headers - PENTING!
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Allow preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' $http_origin;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, Accept';
            add_header 'Access-Control-Allow-Credentials' 'true';
            add_header 'Access-Control-Max-Age' 3600;
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            return 204;
        }
    }
}
```

**Reload Nginx:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### Problem 3: SSL/HTTPS Mixed Content

Jika frontend menggunakan HTTPS tapi backend HTTP, browser akan block:

**Solusi 1: Setup SSL untuk Backend**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate SSL
sudo certbot --nginx -d agrogonta.ptpws.id

# Auto-renew
sudo certbot renew --dry-run
```

**Solusi 2: Update Nginx untuk SSL**

```nginx
server {
    listen 443 ssl http2;
    server_name agrogonta.ptpws.id;
    
    ssl_certificate /etc/letsencrypt/live/agrogonta.ptpws.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agrogonta.ptpws.id/privkey.pem;
    
    location /api {
        proxy_pass http://localhost:3001;
        # ... (rest of config)
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name agrogonta.ptpws.id;
    return 301 https://$server_name$request_uri;
}
```

---

### Problem 4: Docker Network Issues

**Cek apakah container berjalan:**

```bash
docker ps | grep smartfarming
docker-compose -f docker-compose.prod.yml ps
```

**Cek logs untuk errors:**

```bash
# Backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Database logs
docker-compose -f docker-compose.prod.yml logs timescaledb
```

**Restart containers:**

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

---

## 🧪 Testing dari Frontend

### JavaScript Fetch Test

```javascript
// Test di browser console
fetch('http://agrogonta.ptpws.id:3001/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'admin@smartfarming.com',
    password: 'Admin123!'
  })
})
.then(res => res.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err));
```

### Axios Test

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://agrogonta.ptpws.id:3001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

api.post('/auth/login', {
  email: 'admin@smartfarming.com',
  password: 'Admin123!'
})
.then(res => console.log('✅ Success:', res.data))
.catch(err => console.error('❌ Error:', err));
```

---

## 🔍 Debugging Checklist

- [ ] **CORS origins sudah include domain VPS** (`src/main.ts`)
- [ ] **Backend container running** (`docker ps`)
- [ ] **Port 3001 terbuka di firewall** (`sudo ufw status`)
- [ ] **Nginx config sudah benar** (jika pakai reverse proxy)
- [ ] **SSL/HTTPS matching** (frontend & backend sama-sama HTTP atau HTTPS)
- [ ] **No browser cache** (Ctrl+Shift+R / Cmd+Shift+R)
- [ ] **CORS headers visible** (Network tab di DevTools)
- [ ] **Environment variables loaded** (`.env` file exists)

---

## 📞 Quick Diagnostic Commands

```bash
# 1. Cek port listening
sudo netstat -tulpn | grep :3001

# 2. Test dari dalam VPS
curl http://localhost:3001/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartfarming.com","password":"Admin123!"}'

# 3. Test dari luar VPS (ganti YOUR_IP)
curl http://agrogonta.ptpws.id:3001/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartfarming.com","password":"Admin123!"}'

# 4. Cek Docker logs realtime
docker-compose -f docker-compose.prod.yml logs -f backend

# 5. Inspect CORS headers
curl -I http://agrogonta.ptpws.id:3001/auth/login \
  -H "Origin: http://agrogonta.ptpws.id" \
  -H "Access-Control-Request-Method: POST"
```

---

## 🎯 Expected Result

Setelah fix, di **Browser DevTools → Network tab**, response headers harus show:

```
Access-Control-Allow-Origin: http://agrogonta.ptpws.id
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Content-Type, Authorization, Accept
```

Dan login harus **SUCCESS** ✅

---

## 📚 Additional Resources

- [NestJS CORS Documentation](https://docs.nestjs.com/security/cors)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Docker Network Troubleshooting](https://docs.docker.com/network/)

---

**Updated:** February 12, 2026  
**Status:** ✅ CORS Fix Applied
