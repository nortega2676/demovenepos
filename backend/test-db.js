const { testConnection } = require('./db/database');

async function test() {
  console.log('Testing database connection...');
  const isConnected = await testConnection();
  if (isConnected) {
    console.log('✅ Database connection successful!');
  } else {
    console.error('❌ Failed to connect to the database');
  }
  process.exit();
}

test();
