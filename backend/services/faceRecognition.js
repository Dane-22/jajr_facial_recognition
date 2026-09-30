const path = require('path');
const faceapi = require('face-api.js');
const canvas = require('@napi-rs/canvas');
const pool = require('../config/db');
const { decrypt } = require('../utils/crypto');

// face-api.js expects a canvas constructor that accepts no arguments.
class FaceCanvas extends canvas.Canvas {
  constructor(width = 0, height = 0) {
    super(width, height);
  }
}
faceapi.env.monkeyPatch({ Canvas: FaceCanvas, Image: canvas.Image, ImageData: canvas.ImageData });

const MODEL_DIR = process.env.FACE_MODEL_DIR || path.resolve(__dirname, '../../frontend/public/models');
const MATCH_DISTANCE = 0.4;
const MIN_MARGIN = 0.05;
let modelsPromise;

function loadModels() {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_DIR),
      faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_DIR),
      faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_DIR)
    ]).catch(error => {
      modelsPromise = null;
      throw error;
    });
  }
  return modelsPromise;
}

function parseDescriptors(value) {
  const parsed = JSON.parse(decrypt(value));
  const samples = Array.isArray(parsed?.[0]) ? parsed : [parsed];
  if (!samples.length || samples.some(sample => !Array.isArray(sample) || sample.length !== 128 || sample.some(n => !Number.isFinite(n)))) return null;
  return samples.map(sample => new Float32Array(sample));
}

async function identifyFace(buffer) {
  await loadModels();
  const image = await canvas.loadImage(buffer);
  if (image.width < 240 || image.height < 240) {
    return { reason: 'image_too_small' };
  }
  if (image.width * image.height > 5_000_000) return { reason: 'image_too_large' };

  const detections = await faceapi
    .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions({ inputSize: 416 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (detections.length === 0) return { reason: 'no_face' };
  if (detections.length !== 1) return { reason: 'multiple_faces' };
  if (detections[0].detection.box.width < 80) return { reason: 'face_too_small' };

  const [users] = await pool.query('SELECT id, name, face_descriptor FROM users');
  const distances = [];
  for (const user of users) {
    try {
      const enrolled = parseDescriptors(user.face_descriptor);
      if (enrolled) {
        const distance = enrolled.reduce((sum, sample) => sum + faceapi.euclideanDistance(detections[0].descriptor, sample), 0) / enrolled.length;
        distances.push({ id: user.id, name: user.name, distance });
      }
    } catch (error) {
      // A corrupt enrollment must never become a match.
      console.warn(`[FaceRecognition] Skipping invalid descriptor for user ${user.id}`);
    }
  }
  distances.sort((a, b) => a.distance - b.distance);
  const best = distances[0];
  if (!best || best.distance >= MATCH_DISTANCE || (distances[1] && distances[1].distance - best.distance < MIN_MARGIN)) {
    return { reason: 'unknown' };
  }
  return { user: best };
}

module.exports = { identifyFace, loadModels };
