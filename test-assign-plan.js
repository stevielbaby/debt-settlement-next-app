#!/usr/bin/env node

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/webmaster/subscriptions/assign-plan',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Body:', data);
    try {
      const json = JSON.parse(data);
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Failed to parse JSON:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Send the request
req.write(JSON.stringify({
  organizationId: '92a080f0-2c3f-4293-a2f2-832969f11682',
  planId: '2349bfbe-9b80-4a67-84bc-c6d31d8e9c5a'
}));
req.end();
