# 🔐 Smart Farming Backend - Authentication System

Sistem autentikasi lengkap dan aman untuk Smart Farming Backend dengan JWT, BCrypt, RBAC, Rate Limiting, dan Security Headers.

## ✨ Features

### Security
- ✅ **JWT Authentication** - Access Token (15 menit) & Refresh Token (7 hari)
- ✅ **Password Hashing** - BCrypt dengan salt rounds 10
- ✅ **Role-Based Access Control** - Admin, User, Farmer
- ✅ **Rate Limiting** - Proteksi brute force (10 req/min)
- ✅ **Security Headers** - Helmet.js untuk XSS protection
- ✅ **CORS Protection** - Whitelist domain
- ✅ **Input Validation** - Strong password policy

### Architecture
- ✅ **Clean Architecture** - Domain, Application, Infrastructure, Presentation
- ✅ **Dependency Injection** - NestJS DI Container
- ✅ **Repository Pattern** - Abstraksi database
- ✅ **Use Case Pattern** - Business logic terpisah
- ✅ **TypeORM** - SQL injection protection

## 📦 Installation

```bash
# Install dependencies
pnpm install

# Run database migration
PGPASSWORD=smartfarming123 psql -h localhost -U smartfarming -d smartfarming -f migrations/002_create_users_table.sql

# Build project
pnpm run build

# Start development server
pnpm run start:dev
```

## 🔧 Environment Variables

Update file `.env`:

```env
# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this-in-production-2024
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-2024
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

⚠️ **IMPORTANT:** Ganti JWT secrets di production!

## 🚀 Quick Start

### 1. Login dengan Admin Default

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@smartfarming.com",
    "password": "Admin123!"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@smartfarming.com",
    "fullName": "Super Admin",
    "role": "admin"
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### 2. Access Protected Endpoint

```bash
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Register New User

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "fullName": "John Doe"
  }'
```

## 🧪 Testing

Run automated tests:

```bash
# Make sure server is running first
pnpm run start:dev

# In another terminal, run tests
node test-auth-api.js
```

Test coverage:
- ✅ Register new user
- ✅ Login with valid credentials
- ✅ Login with invalid credentials (should fail)
- ✅ Get user profile
- ✅ Access without token (should fail)
- ✅ Refresh token
- ✅ Admin-only endpoint
- ✅ Change password
- ✅ Logout
- ✅ Input validation

## 📚 API Documentation

Lihat [AUTH_API_DOCUMENTATION.md](./AUTH_API_DOCUMENTATION.md) untuk dokumentasi lengkap semua endpoints.

## 🛡️ How to Protect Your Endpoints

### Basic Protection (JWT)

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../infrastructure/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../infrastructure/auth/decorators/current-user.decorator';

@Controller('devices')
export class DeviceController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getAllDevices(@CurrentUser() user) {
    // user contains: { userId, email, role }
    return this.deviceService.findAll();
  }
}
```

### Role-Based Protection

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../infrastructure/auth/guards/roles.guard';
import { Roles } from '../infrastructure/auth/decorators/roles.decorator';
import { UserRole } from '../domain/entities/User';

@Controller('admin')
export class AdminController {
  @Post('device')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createDevice() {
    // Only admin can access
    return this.deviceService.create();
  }

  @Post('schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  createSchedule() {
    // Admin and Farmer can access
    return this.scheduleService.create();
  }
}
```

## 👥 User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | Super Administrator | Full access to all resources |
| `user` | Standard User | Read access, limited write |
| `farmer` | Farmer | Device & sensor management |

## 🔑 Default Account

**Email:** `admin@smartfarming.com`  
**Password:** `Admin123!`

⚠️ **Segera ganti password setelah login pertama kali!**

```bash
curl -X PATCH http://localhost:3001/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "Admin123!",
    "newPassword": "YourNewSecurePassword123!"
  }'
```

## 📁 File Structure

```
src/
├── application/
│   └── dtos/
│       └── AuthDto.ts          # DTOs untuk auth (Register, Login, dll)
├── domain/
│   ├── entities/
│   │   └── User.ts             # User domain entity
│   ├── interfaces/
│   │   └── IUserRepository.ts  # User repository interface
│   └── use-cases/
│       └── AuthUseCase.ts      # Business logic auth
├── infrastructure/
│   ├── auth/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── jwt-refresh.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── strategies/
│   │       ├── jwt.strategy.ts
│   │       └── jwt-refresh.strategy.ts
│   ├── database/
│   │   └── entities/
│   │       └── UserEntity.ts   # TypeORM entity
│   └── repositories/
│       └── TimescaleUserRepository.ts
├── modules/
│   └── AuthModule.ts           # Auth module configuration
├── presentation/
│   └── controllers/
│       └── AuthController.ts   # Auth endpoints
└── main.ts                     # App bootstrap dengan CORS & Security
```

## 🔒 Security Checklist

- [x] Password hashing dengan bcrypt (salt rounds: 10)
- [x] JWT dengan expiration time
- [x] Refresh token rotation
- [x] Input validation (email, password strength)
- [x] SQL injection protection (TypeORM parameterized queries)
- [x] XSS protection (Helmet.js)
- [x] CORS configuration
- [x] Rate limiting (10 req/min)
- [x] Role-based access control
- [ ] 2FA (Future)
- [ ] Token blacklist (Future)
- [ ] Audit logging (Future)
- [ ] Email verification (Future)
- [ ] Password reset (Future)

## 📊 Token Lifetime

| Token Type | Lifetime | Purpose |
|------------|----------|---------|
| Access Token | 7 days | API access - User tetap login 1 minggu |
| Refresh Token | 30 days | Get new access token - Bisa refresh selama 1 bulan |

**Note:** Token lifetime sudah diperpanjang untuk kemudahan penggunaan. User tidak akan tiba-tiba logout dan bisa menggunakan aplikasi dengan nyaman selama 1 minggu penuh. Setelah 7 hari, refresh token masih valid selama 30 hari untuk mendapatkan access token baru.

## 🎯 Best Practices

1. **Always use HTTPS in production**
2. **Store tokens securely** (HTTP-only cookies for web, secure storage for mobile)
3. **Rotate JWT secrets regularly**
4. **Implement token blacklist** untuk logout yang lebih aman
5. **Enable 2FA** untuk admin accounts
6. **Monitor failed login attempts**
7. **Log all security events**
8. **Use environment-specific secrets**
9. **Never commit secrets to git**
10. **Implement password reset via email**

## 🚨 Troubleshooting

### Error: "JWT_ACCESS_SECRET must be defined"

Pastikan file `.env` sudah memiliki JWT secrets:
```env
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
```

### Error: "Email sudah terdaftar"

Email harus unique. Gunakan email lain atau hapus user yang ada.

### Error: "Password harus mengandung huruf besar, huruf kecil, dan angka/simbol"

Password requirements:
- Minimal 8 karakter
- Huruf besar (A-Z)
- Huruf kecil (a-z)
- Angka atau simbol

Contoh valid: `Password123!`, `MySecure@Pass1`

### Error: "Too Many Requests"

Rate limit exceeded. Tunggu 1 menit sebelum retry.

## 🤝 Contributing

Untuk menambahkan fitur security baru:

1. Buat branch baru
2. Implementasi fitur
3. Update documentation
4. Add tests
5. Create pull request

## 📝 License

Private - Smart Farming Project

---

**Built with ❤️ using NestJS, TypeORM, JWT, and BCrypt**
