
import fetch from 'node-fetch';

async function testMTRBRouteName() {
  const route = 'K51';
  console.log(`\n--- Testing MTRB with routeName=${route} ---`);
  try {
    const url = `https://rt.data.gov.hk/v1/transport/mtr/bus/getETA?routeName=${route}`;
    const resp = await fetch(url);
    const data = await resp.json();
    console.log('MTRB Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('MTRB Test Error:', err.message);
  }
}

testMTRBRouteName();
