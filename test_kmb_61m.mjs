import fetch from 'node-fetch';

async function testKMB() {
  const stopId = 'F626C47C1F73E1AE';
  const route = '61M';
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${stopId}`;
  
  console.log(`Fetching: ${url}`);
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    if (data.data) {
      const filtered = data.data.filter(item => item.route === route);
      console.log(`Filtered for ${route}:`, JSON.stringify(filtered, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testKMB();
