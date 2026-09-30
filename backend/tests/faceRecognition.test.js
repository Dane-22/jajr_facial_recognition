const test = require('node:test');
const assert = require('node:assert/strict');
const { createCanvas } = require('@napi-rs/canvas');
const { identifyFace } = require('../services/faceRecognition');

test('a blank camera frame is rejected before attendance or employee lookup', async () => {
  const canvas = createCanvas(320, 320);
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 320, 320);
  const result = await identifyFace(canvas.toBuffer('image/jpeg'));
  assert.deepEqual(result, { reason: 'no_face' });
});
