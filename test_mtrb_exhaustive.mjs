
import fetch from 'node-fetch';

async function testMTRB() {
  const route = 'K51';
  console.log(`\n--- Testing MTRB with routeName=${route} ---`);
  
  // Try different parameter names and cases
  const params = [
    `routeName=${route}`,
    `route=${route}`,
    `routeName=${route.toLowerCase()}`,
    `route=${route.toLowerCase()}`
  ];

  for (const p of params) {
    try {
      const url = `https://rt.data.gov.hk/v1/transport/mtr/bus/getETA?${p}`;
      console.log(`Testing URL: ${url}`);
      const resp = await fetch(url);
      const data = await resp.json();
      console.log(`Response for ${p}:`, JSON.stringify(data).substring(0, 200));
      if (data.data) {
        console.log(`SUCCESS with ${p}!`);
        break;
      }
    } catch (err) {
      console.error(`Error for ${p}:`, err.message);
    }
  }
}

testMTRB();
