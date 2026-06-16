from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np
import io
from PIL import Image
import json
import os

app = Flask(__name__)
CORS(app)

MODEL_PATH = 'model/best.h5'
CLASS_LABELS_PATH = 'model/class_labels.json'

print("Loading model...")
model = load_model(MODEL_PATH)
print("✓ Model loaded successfully")

with open(CLASS_LABELS_PATH, 'r') as f:
    class_labels = json.load(f)
print("✓ Class labels loaded")

def preprocess_image(img):
    img = img.resize((224, 224))
    
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    img_array = image.img_to_array(img)

    img_array = img_array / 255.0
    
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image provided'
            }), 400
        
        file = request.files['image']
        
        img = Image.open(io.BytesIO(file.read()))
        
        processed_img = preprocess_image(img)
        
        predictions = model.predict(processed_img, verbose=0)
        
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_idx])
        
        predicted_class = class_labels.get(str(predicted_class_idx), f"Class {predicted_class_idx}")
        
        top_3_idx = np.argsort(predictions[0])[-3:][::-1]
        top_3_predictions = [
            {
                'class': class_labels.get(str(idx), f"Class {idx}"),
                'confidence': float(predictions[0][idx]) * 100
            }
            for idx in top_3_idx
        ]
        
        return jsonify({
            'success': True,
            'prediction': {
                'class': predicted_class,
                'confidence': confidence * 100
            },
            'top_predictions': top_3_predictions
        })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'num_classes': len(class_labels)
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)