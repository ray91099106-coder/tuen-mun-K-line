import fetch from 'node-fetch';

async function testMTRB() {
  const url = `https://rt.data.gov.hk/v1/transport/mtr/bus/getRouteList`;
  
  console.log(`Fetching: ${url}`);
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testMTRB();
