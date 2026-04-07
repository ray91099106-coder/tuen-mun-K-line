
import fetch from 'node-fetch';

async function testMTRB() {
  // Try to fetch all MTR Bus ETAs to see what routes are available
  console.log(`\n--- Fetching all MTR Bus ETAs ---`);
  try {
    // Some APIs allow fetching all data if no parameter is provided, or have a list endpoint.
    // But for MTRB, let's try to guess if there's a different endpoint.
    // Actually, let's try to fetch K51 with a different case again, but maybe the parameter is different.
    
    const url = `https://rt.data.gov.hk/v1/transport/mtr/bus/getETA?routeName=K51`;
    const resp = await fetch(url);
    console.log('Status:', resp.status);
    const text = await resp.text();
    console.log('Raw Response:', text);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testMTRB();
