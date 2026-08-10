const crypto = require('crypto');

const KIOSK_API_KEY = 'kiosk_dev_secret_key_2026';

function generateSignature(userContext, events, done) {
  // Generate random user ID (1-10)
  const userId = Math.floor(Math.random() * 10) + 1;
  const status = Math.random() > 0.5 ? 'IN' : 'OUT';
  const timestamp = new Date().toISOString();

  const payload = `${userId}:${status}:${timestamp}`;
  const signature = crypto.createHmac('sha256', KIOSK_API_KEY).update(payload).digest('hex');

  userContext.vars.userId = userId;
  userContext.vars.status = status;
  userContext.vars.timestamp = timestamp;
  userContext.vars.signature = signature;

  return done();
}

function generateBatch(userContext, events, done) {
  const records = [];
  // Generate 50 records per batch
  for (let i = 0; i < 50; i++) {
    const userId = Math.floor(Math.random() * 10) + 1;
    const status = Math.random() > 0.5 ? 'IN' : 'OUT';
    // Random offline time within the last 2 hours
    const timestamp = new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000).toISOString();
    
    const payload = `${userId}:${status}:${timestamp}`;
    const signature = crypto.createHmac('sha256', KIOSK_API_KEY).update(payload).digest('hex');
    
    records.push({
      userId,
      status,
      timestamp,
      signature
    });
  }

  userContext.vars.batchRecords = records;
  return done();
}

module.exports = {
  generateSignature,
  generateBatch
};
