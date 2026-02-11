#!/usr/bin/env node

/**
 * Authentication API Test Script
 * 
 * Script untuk testing semua endpoint authentication
 */

const BASE_URL = 'http://localhost:3001';

let accessToken = '';
let refreshToken = '';
let userId = '';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
}

async function testRegister() {
  log('\n=== Test 1: Register New User ===', 'blue');
  
  const result = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `test${Date.now()}@example.com`,
      password: 'Test123!',
      fullName: 'Test User',
      role: 'user',
    }),
  });

  if (result.ok) {
    logSuccess('Register berhasil');
    accessToken = result.data.tokens.accessToken;
    refreshToken = result.data.tokens.refreshToken;
    userId = result.data.user.id;
    logInfo(`User ID: ${userId}`);
    logInfo(`Email: ${result.data.user.email}`);
  } else {
    logError(`Register gagal: ${JSON.stringify(result.data)}`);
  }

  return result.ok;
}

async function testLoginAdmin() {
  log('\n=== Test 2: Login with Admin Account ===', 'blue');
  
  const result = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@smartfarming.com',
      password: 'Admin123!',
    }),
  });

  if (result.ok) {
    logSuccess('Login admin berhasil');
    accessToken = result.data.tokens.accessToken;
    refreshToken = result.data.tokens.refreshToken;
    userId = result.data.user.id;
    logInfo(`User: ${result.data.user.fullName}`);
    logInfo(`Role: ${result.data.user.role}`);
  } else {
    logError(`Login gagal: ${JSON.stringify(result.data)}`);
  }

  return result.ok;
}

async function testLoginInvalid() {
  log('\n=== Test 3: Login with Invalid Credentials ===', 'blue');
  
  const result = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'invalid@example.com',
      password: 'WrongPassword123!',
    }),
  });

  if (!result.ok && result.status === 401) {
    logSuccess('Login gagal dengan kredensial invalid (Expected)');
  } else {
    logError('Login seharusnya gagal dengan kredensial invalid');
  }

  return !result.ok;
}

async function testGetProfile() {
  log('\n=== Test 4: Get User Profile ===', 'blue');
  
  const result = await makeRequest('/auth/profile', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (result.ok) {
    logSuccess('Get profile berhasil');
    logInfo(`User ID: ${result.data.userId}`);
    logInfo(`Email: ${result.data.email}`);
    logInfo(`Role: ${result.data.role}`);
  } else {
    logError(`Get profile gagal: ${JSON.stringify(result.data)}`);
  }

  return result.ok;
}

async function testGetProfileWithoutToken() {
  log('\n=== Test 5: Get Profile without Token ===', 'blue');
  
  const result = await makeRequest('/auth/profile', {
    method: 'GET',
  });

  if (!result.ok && result.status === 401) {
    logSuccess('Access ditolak tanpa token (Expected)');
  } else {
    logError('Endpoint seharusnya memerlukan authentication');
  }

  return !result.ok;
}

async function testRefreshToken() {
  log('\n=== Test 6: Refresh Access Token ===', 'blue');
  
  const result = await makeRequest('/auth/refresh', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  });

  if (result.ok) {
    logSuccess('Refresh token berhasil');
    accessToken = result.data.accessToken;
    refreshToken = result.data.refreshToken;
    logInfo('Token baru telah di-generate');
  } else {
    logError(`Refresh token gagal: ${JSON.stringify(result.data)}`);
  }

  return result.ok;
}

async function testAdminOnly() {
  log('\n=== Test 7: Access Admin-Only Endpoint ===', 'blue');
  
  const result = await makeRequest('/auth/admin-only', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (result.ok) {
    logSuccess('Access admin endpoint berhasil');
    logInfo(`Response: ${result.data.message}`);
  } else {
    logWarning(`Access ditolak: ${JSON.stringify(result.data)}`);
  }

  return result.ok;
}

async function testChangePassword() {
  log('\n=== Test 8: Change Password ===', 'blue');
  
  const result = await makeRequest('/auth/change-password', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      oldPassword: 'Admin123!',
      newPassword: 'NewPassword123!',
    }),
  });

  if (result.ok) {
    logSuccess('Change password berhasil');
    
    // Change back to original password
    const revertResult = await makeRequest('/auth/change-password', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        oldPassword: 'NewPassword123!',
        newPassword: 'Admin123!',
      }),
    });

    if (revertResult.ok) {
      logSuccess('Password dikembalikan ke original');
    }
  } else {
    logWarning(`Change password: ${JSON.stringify(result.data)}`);
  }

  return result.ok;
}

async function testLogout() {
  log('\n=== Test 9: Logout ===', 'blue');
  
  const result = await makeRequest('/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (result.ok) {
    logSuccess('Logout berhasil');
    logInfo(`Response: ${result.data.message}`);
  } else {
    logError(`Logout gagal: ${JSON.stringify(result.data)}`);
  }

  return result.ok;
}

async function testValidation() {
  log('\n=== Test 10: Input Validation ===', 'blue');
  
  // Test weak password
  const result1 = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'weak',
      fullName: 'Test User',
    }),
  });

  if (!result1.ok && result1.status === 400) {
    logSuccess('Weak password ditolak (Expected)');
  } else {
    logError('Weak password seharusnya ditolak');
  }

  // Test invalid email
  const result2 = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: 'invalid-email',
      password: 'Test123!',
      fullName: 'Test User',
    }),
  });

  if (!result2.ok && result2.status === 400) {
    logSuccess('Invalid email ditolak (Expected)');
  } else {
    logError('Invalid email seharusnya ditolak');
  }

  return true;
}

async function runAllTests() {
  log('\n🧪 Starting Authentication API Tests', 'yellow');
  log('='.repeat(50), 'yellow');

  const tests = [
    testLoginAdmin,
    testGetProfile,
    testGetProfileWithoutToken,
    testRefreshToken,
    testAdminOnly,
    testChangePassword,
    testLoginInvalid,
    testValidation,
    testRegister,
    testLogout,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      logError(`Test error: ${error.message}`);
      failed++;
    }
    
    // Delay between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  log('\n' + '='.repeat(50), 'yellow');
  log('\n📊 Test Results:', 'yellow');
  logSuccess(`Passed: ${passed}`);
  if (failed > 0) {
    logError(`Failed: ${failed}`);
  }
  log(`Total: ${tests.length}`, 'cyan');
  
  if (failed === 0) {
    log('\n🎉 All tests passed!', 'green');
  }
}

// Run tests
runAllTests().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
