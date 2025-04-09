require('dotenv').config();
const { ethers } = require('ethers');

async function testRpc(url, label) {
  const provider = new ethers.providers.JsonRpcProvider(url);
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(`${label} RPC connected. Current block: ${blockNumber}`);
  } catch (err) {
    console.error(`Error connecting to ${label} RPC at ${url}: ${err.message}`);
  }
}

async function testWebSocket(url, label) {
  try {
    const provider = new ethers.providers.WebSocketProvider(url);
    provider.on('block', (blockNumber) => {
      console.log(`${label} WS connected. Received block: ${blockNumber}`);
      // After receiving one block, you can close the connection.
      provider.destroy();
    });
    provider.on('error', (err) => {
      console.error(`Error on ${label} WS at ${url}: ${err.message}`);
    });
  } catch (err) {
    console.error(`Error initializing ${label} WS at ${url}: ${err.message}`);
  }
}

async function runTests() {
  console.log('Testing RPC Endpoints:');
  await testRpc(process.env.ETHEREUM_RPC_URL, 'Ethereum');
  await testRpc(process.env.BASE_RPC_URL, 'Base');

  console.log('\nTesting WebSocket Endpoints:');
  await testWebSocket(process.env.WS_ETHEREUM_RPC_URL, 'Ethereum');
  await testWebSocket(process.env.WS_BASE_RPC_URL, 'Base');
}

runTests();
