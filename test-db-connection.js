#!/usr/bin/env node

/**
 * Test Database Connection
 * 
 * Usage: node test-db-connection.js
 */

const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'smartfarming',
  password: 'smartfarming123',
  database: 'smartfarming',
});

async function testConnection() {
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Test query
    const result = await client.query('SELECT NOW(), version()');
    console.log('\n📊 Database Info:');
    console.log('   Time:', result.rows[0].now);
    console.log('   Version:', result.rows[0].version.split('\n')[0]);

    // Check tables
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    console.log('\n📋 Tables:');
    tables.rows.forEach(row => {
      console.log('   -', row.tablename);
    });

    // Check TimescaleDB extension (if installed)
    try {
      const extensions = await client.query(`
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname = 'timescaledb'
      `);
      if (extensions.rows.length > 0) {
        console.log('\n🚀 TimescaleDB:');
        console.log('   Version:', extensions.rows[0].extversion);
      } else {
        console.log('\n⚠️  TimescaleDB extension not installed (using plain PostgreSQL)');
      }
    } catch (err) {
      console.log('\n⚠️  TimescaleDB not available (using plain PostgreSQL)');
    }

    await client.end();
    console.log('\n✅ Connection test completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check if PostgreSQL is running:');
    console.error('      brew services list | grep postgresql');
    console.error('   2. Start PostgreSQL if needed:');
    console.error('      brew services start postgresql@16');
    console.error('   3. Verify database exists:');
    console.error('      psql -l | grep smartfarming');
    process.exit(1);
  }
}

testConnection();
