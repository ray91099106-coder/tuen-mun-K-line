
import fetch from 'node-fetch';

async function testKMBForK51() {
  console.log(`\n--- Testing KMB for K51 ---`);
  try {
    const url = `https://data.etabus.gov.hk/v1/transport/kmb/route-eta/K51`;
    const resp = await fetch(url);
    const data = await resp.json();
    console.log('KMB Response for K51:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('KMB K51 Test Error:', err.message);
  }
}

async function testMTRBLowercase() {
  const route = 'k51';
  console.log(`\n--- Testing MTRB Lowercase Route: ${route} ---`);
  try {
    const url = `https://rt.data.gov.hk/v1/transport/mtr/bus/getETA?route=${route}`;
    const resp = await fetch(url);
    const data = await resp.json();
    console.log('MTRB Lowercase Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('MTRB Lowercase Test Error:', err.message);
  }
}

async function run() {
  await testKMBForK51();
  await testMTRBLowercase();
}

run();
