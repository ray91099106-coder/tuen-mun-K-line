import fetch from 'node-fetch';

async function test() {
  const variations = [
    'https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule?routeName=K51',
    'https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule?route=K51',
    'https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule?route_name=K51',
    'https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule?routeName=k51',
    'https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule?route=k51',
    'https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule?routeName=K51&language=zh',
    'https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule?routeName=K51&language=en',
  ];

  for (const url of variations) {
    console.log(`Testing: ${url}`);
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log(`Status: ${response.status}, Data:`, JSON.stringify(data).substring(0, 100));
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

test();
