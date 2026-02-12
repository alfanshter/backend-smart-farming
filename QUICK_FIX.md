# 🚨 QUICK FIX GUIDE - CORS Error di VPS

## ❌ Error yang Anda Alami

```
AxiosError: Network Error
POST http://agrogonta.ptpws.id:3001/auth/login net::ERR_FAILED
```

**Postman bisa ✅, Browser tidak ❌** = **CORS Problem**

---

## ⚡ QUICK FIX (3 Steps)

### 1️⃣ Upload File yang Sudah Diperbaiki

File `src/main.ts` sudah saya perbaiki untuk include domain VPS Anda.

**Di VPS:**

```bash
cd /path/to/backend-smart-farming

# Pull latest changes (jika pakai Git)
git pull origin main

# ATAU upload manual file src/main.ts yang sudah diperbaiki
```

---

### 2️⃣ Rebuild & Deploy

**Gunakan script otomatis:**

```bash
chmod +x fix-cors-and-deploy.sh
./fix-cors-and-deploy.sh
```

**ATAU manual:**

```bash
# Stop containers
docker-compose -f docker-compose.prod.yml down

# Rebuild
docker-compose -f docker-compose.prod.yml build --no-cache backend

# Start
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

### 3️⃣ Buka Port 3001 di Firewall

```bash
# Cek firewall
sudo ufw status

# Buka port 3001
sudo ufw allow 3001/tcp

# Reload
sudo ufw reload

# Verify
sudo netstat -tulpn | grep 3001
```

---

## 🧪 Test Apakah Sudah Fix

**Test dari terminal VPS:**

```bash
chmod +x test-cors-api.sh
./test-cors-api.sh agrogonta.ptpws.id
```

**Test dari browser:**

```javascript
// Paste di Browser Console
fetch('http://agrogonta.ptpws.id:3001/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@smartfarming.com',
    password: 'Admin123!'
  })
})
.then(r => r.json())
.then(d => console.log('✅ SUCCESS:', d))
.catch(e => console.error('❌ ERROR:', e));
```

---

## 🔍 Troubleshooting Checklist

- [ ] ✅ File `src/main.ts` sudah updated
- [ ] ✅ Backend rebuilt dengan `--no-cache`
- [ ] ✅ Container running (`docker ps | grep backend`)
- [ ] ✅ Port 3001 terbuka di firewall
- [ ] ✅ Browser cache di-clear (Ctrl+Shift+R)
- [ ] ✅ Frontend URL sesuai dengan `allowedOrigins` di `main.ts`

---

## 📝 Yang Sudah Diubah di `src/main.ts`

**BEFORE:**
```typescript
app.enableCors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  // ...
});
```

**AFTER:**
```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://agrogonta.ptpws.id',      // ✅ ADDED
  'https://agrogonta.ptpws.id',     // ✅ ADDED
];

app.enableCors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  // ...
});
```

---

## 🎯 Expected Result

**Browser DevTools → Network → Response Headers:**

```
Access-Control-Allow-Origin: http://agrogonta.ptpws.id
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Credentials: true
```

**Login berhasil → Status: 200 OK** ✅

---

## 📞 Jika Masih Error

**Cek logs backend:**

```bash
docker-compose -f docker-compose.prod.yml logs -f backend
```

**Cek apakah domain/port benar:**

```bash
curl -I http://agrogonta.ptpws.id:3001/auth/login
```

**Pastikan tidak ada typo di frontend:**

- ✅ `http://agrogonta.ptpws.id:3001` (BENAR)
- ❌ `http://agrogonta.ptpws.id/3001` (SALAH - tidak ada colon)
- ❌ `https://agrogonta.ptpws.id:3001` (SALAH - pakai HTTPS tapi backend HTTP)

---

## 📚 Dokumentasi Lengkap

Lihat file `VPS_CORS_FIX.md` untuk troubleshooting detail.

---

**Updated:** February 12, 2026  
**Status:** ✅ Fixed - Ready to deploy
