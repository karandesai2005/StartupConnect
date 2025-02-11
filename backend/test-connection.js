// test-connection.js
const { testConnection } = require('./config/db');

async function runTest() {
  console.log('Starting connection test...');
  const result = await testConnection();
  if (result) {
    console.log('Connection test successful!');
  } else {
    console.log('Connection test failed!');
  }
  process.exit();
}

runTest();