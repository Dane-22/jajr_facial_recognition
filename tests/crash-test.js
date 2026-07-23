const http = require('http');

const API_BASE_URL = 'http://localhost:5000/api';
const CONCURRENT_REQUESTS = 100;
const TOTAL_REQUESTS = 1000;

console.log(`🚀 Starting Crash/Stress Test on ${API_BASE_URL}`);
console.log(`Concurrent Workers: ${CONCURRENT_REQUESTS}, Total Requests: ${TOTAL_REQUESTS}\n`);

let completed = 0;
let success = 0;
let errors = 0;
let start_time = Date.now();

// Function to make a single request
function makeRequest(index) {
  return new Promise((resolve) => {
    // Randomize endpoints and payloads to simulate chaotic traffic
    const endpoints = [
      { path: '/admin/login', method: 'POST', data: { username: 'admin', password: 'password123' } },
      { path: '/admin/login', method: 'POST', data: { username: 'admin', password: 'wrongpassword' } }, // Invalid auth
      { path: '/admin/login', method: 'POST', data: { garbage: true } }, // Malformed
      { path: '/non-existent-route', method: 'GET' }, // 404 spam
      { path: '/users/1', method: 'GET' } // Assuming this might be protected or exist
    ];

    const target = endpoints[index % endpoints.length];
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${target.path}`,
      method: target.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {}); // Consume data
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          success++;
        } else {
          errors++; // 400, 401, 404, 500
        }
        completed++;
        resolve();
      });
    });

    req.on('error', (e) => {
      errors++;
      completed++;
      resolve();
    });

    if (target.data) {
      req.write(JSON.stringify(target.data));
    }
    req.end();
  });
}

async function runCrashTest() {
  const workers = [];
  
  // Kick off concurrent requests
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    workers.push(makeRequest(i));
    
    // Throttle concurrency
    if (workers.length >= CONCURRENT_REQUESTS) {
      await Promise.race(workers); // Wait for at least one to finish before adding more
      workers.splice(workers.findIndex(p => p), 1); // Not exact, just rough throttling for simplicity
    }
  }

  // Wait for remaining
  await Promise.all(workers);

  const duration = (Date.now() - start_time) / 1000;
  console.log('--- 🛑 Crash Test Results ---');
  console.log(`Total Requests Sent: ${TOTAL_REQUESTS}`);
  console.log(`Successful Responses (2xx/3xx): ${success}`);
  console.log(`Error Responses (4xx/5xx/Failures): ${errors}`);
  console.log(`Time Taken: ${duration.toFixed(2)}s`);
  console.log(`Requests/Sec: ${(TOTAL_REQUESTS / duration).toFixed(2)} req/s`);
  
  if (errors > 0) {
    console.log('\nNote: Error responses are expected since we sent malformed data and accessed protected/missing routes.');
    console.log('Check your backend console (running npm run dev) to see if the server crashed or handled it gracefully.');
  }
}

runCrashTest();
