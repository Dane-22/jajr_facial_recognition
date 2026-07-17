# Face-API.js Models

This directory should contain the face-api.js model files required for face recognition.

## Required Models

You need to download the following model files from the face-api.js repository:

1. **tiny_face_detector_model-weights_manifest.json**
2. **tiny_face_detector_model-shard1**
3. **face_landmark_68_model-weights_manifest.json**
4. **face_landmark_68_model-shard1**
5. **face_landmark_68_model-shard2**
6. **face_recognition_model-weights_manifest.json**
7. **face_recognition_model-shard1**
8. **face_recognition_model-shard2**
9. **face_recognition_model-shard3**
10. **face_recognition_model-shard4**
11. **face_recognition_model-shard5**
12. **face_recognition_model-shard6**
13. **face_recognition_model-shard7**
14. **face_recognition_model-shard8**
15. **face_recognition_model-shard9**
16. **face_recognition_model-shard10**
17. **face_recognition_model-shard11**
18. **face_recognition_model-shard12**
19. **face_recognition_model-shard13**
20. **face_recognition_model-shard14**
21. **face_recognition_model-shard15**
22. **face_recognition_model-shard16**

## Download Instructions

1. Visit: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
2. Download the model files listed above
3. Place them in this directory

Alternatively, you can download the models using:

```bash
# Create models directory if it doesn't exist
mkdir -p public/models

# Download models (example URLs - verify current paths)
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json -O public/models/
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1 -O public/models/
# ... download other model files
```

## Model Size

The total size of all required models is approximately 5-6 MB.
