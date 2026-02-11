/**
 * Script untuk generate password hash
 * Usage: node generate-password-hash.js <password>
 */

const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Password harus diisi');
  console.log('Usage: node generate-password-hash.js <password>');
  process.exit(1);
}

async function generateHash() {
  try {
    const hash = await bcrypt.hash(password, 10);
    console.log('✅ Password Hash berhasil dibuat:\n');
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log('\nCopy hash di atas untuk digunakan di database atau testing');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

generateHash();
