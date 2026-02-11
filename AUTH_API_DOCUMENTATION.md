# Authentication API Documentation

## 🔐 Sistem Authentication Backend Smart Farming

Backend ini menggunakan **JWT Authentication** dengan **Access Token** dan **Refresh Token** untuk keamanan maksimal.

---

## 📋 Features

### Security Features
- ✅ **JWT Authentication** (Access & Refresh Token)
- ✅ **Password Hashing** dengan bcrypt (salt rounds: 10)
- ✅ **Role-Based Access Control (RBAC)**
- ✅ **Rate Limiting** (10 requests per minute)
- ✅ **Security Headers** dengan Helmet
- ✅ **CORS Protection**
- ✅ **Input Validation** dengan class-validator
- ✅ **SQL Injection Protection** dengan TypeORM
- ✅ **XSS Protection**

### Authentication Features
- ✅ Register User
- ✅ Login
- ✅ Refresh Token
- ✅ Logout
- ✅ Get Profile
- ✅ Change Password
- ✅ Role-based endpoint protection

---

## 🚀 API Endpoints

### Base URL
```
http://localhost:3001
```

---

### 1. Register User

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "role": "user" // Optional: "admin", "user", "farmer" (default: "user")
}
```

**Response:** (201 Created)
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "user"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Validasi:**
- Email harus valid
- Password minimal 8 karakter
- Password harus mengandung huruf besar, huruf kecil, dan angka/simbol
- Nama lengkap harus diisi

---

### 2. Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** (200 OK)
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "user"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. Refresh Token

**Endpoint:** `POST /auth/refresh`

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response:** (200 OK)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 4. Logout

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** (200 OK)
```json
{
  "message": "Logout berhasil"
}
```

---

### 5. Get Profile

**Endpoint:** `GET /auth/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** (200 OK)
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "user"
}
```

---

### 6. Change Password

**Endpoint:** `PATCH /auth/change-password`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "oldPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response:** (200 OK)
```json
{
  "message": "Password berhasil diubah"
}
```

**Note:** Setelah change password, semua refresh token akan di-invalidate dan user harus login ulang.

---

### 7. Admin Only Example

**Endpoint:** `GET /auth/admin-only`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** (200 OK)
```json
{
  "message": "Hanya admin yang bisa mengakses endpoint ini"
}
```

**Note:** Endpoint ini hanya bisa diakses oleh user dengan role `admin`.

---

## 🔑 Token Information

### Access Token
- **Expiration:** 15 minutes
- **Usage:** Untuk mengakses protected endpoints
- **Storage:** Simpan di memory (state) atau sessionStorage (jangan di localStorage untuk keamanan)

### Refresh Token
- **Expiration:** 7 days
- **Usage:** Untuk mendapatkan access token baru tanpa login ulang
- **Storage:** Simpan di httpOnly cookie (recommended) atau secure storage

---

## 👥 User Roles

1. **admin** - Full access ke semua endpoint
2. **user** - Standard user access
3. **farmer** - Farmer-specific access

---

## 🛡️ Security Best Practices

### Password Requirements
- Minimal 8 karakter
- Harus mengandung huruf besar (A-Z)
- Harus mengandung huruf kecil (a-z)
- Harus mengandung angka (0-9) atau simbol

### Token Management
1. **Access Token** - Simpan di memory atau sessionStorage
2. **Refresh Token** - Simpan di httpOnly cookie atau secure storage
3. Jangan simpan token di localStorage untuk keamanan
4. Logout akan menghapus refresh token dari database

### Rate Limiting
- 10 requests per minute per IP
- Berlaku untuk semua endpoints

---

## 📝 Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["Password minimal 8 karakter", "Email tidak valid"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Email atau password salah",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Email sudah terdaftar",
  "error": "Conflict"
}
```

### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

---

## 🧪 Testing

### Default Admin Account
```
Email: admin@smartfarming.com
Password: Admin123!
Role: admin
```

### Generate Password Hash
```bash
node generate-password-hash.js "YourPassword123!"
```

---

## 🔧 Environment Variables

Required in `.env` file:

```env
# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this-in-production-2024
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-2024
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

⚠️ **IMPORTANT:** Ganti secret keys di production dengan nilai yang random dan aman!

---

## 🎯 Frontend Integration Example

### Login Flow
```typescript
// 1. Login
const loginResponse = await fetch('http://localhost:3001/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});

const { user, tokens } = await loginResponse.json();

// 2. Save tokens
sessionStorage.setItem('accessToken', tokens.accessToken);
// Save refresh token securely (httpOnly cookie recommended)

// 3. Use access token for protected requests
const profileResponse = await fetch('http://localhost:3001/auth/profile', {
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`
  }
});
```

### Auto Refresh Token
```typescript
// When access token expires (401), automatically refresh
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('http://localhost:3001/auth/refresh', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${refreshToken}`
    }
  });
  
  const { accessToken, refreshToken: newRefreshToken } = await response.json();
  
  sessionStorage.setItem('accessToken', accessToken);
  return accessToken;
}
```

---

## 📚 Additional Notes

1. **CORS** sudah dikonfigurasi untuk `http://localhost:3000` (Next.js default)
2. Semua input divalidasi menggunakan **class-validator**
3. Password di-hash menggunakan **bcrypt** dengan salt rounds 10
4. Refresh token di-hash sebelum disimpan di database
5. TypeORM melindungi dari SQL injection
6. Helmet menambahkan security headers
7. Rate limiting untuk mencegah brute force attacks

---

## 🚨 Production Checklist

- [ ] Ganti `JWT_ACCESS_SECRET` dengan nilai random yang aman
- [ ] Ganti `JWT_REFRESH_SECRET` dengan nilai random yang aman
- [ ] Set `NODE_ENV=production`
- [ ] Gunakan HTTPS
- [ ] Implement proper logging
- [ ] Setup monitoring
- [ ] Backup database regularly
- [ ] Review CORS settings
- [ ] Adjust rate limiting if needed
- [ ] Remove default admin account atau ganti passwordnya

---

Made with ❤️ for Smart Farming Project
