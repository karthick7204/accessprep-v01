#!/usr/bin/env python3
"""
ACCESSPREP-X Real-Time ML Inference Service
Loads the serialized trained model artifact and executes subject prediction
with calibrated probability distributions on candidate question text.
"""

import sys
import json
import pickle
import os
import re

_script_dir = os.path.dirname(os.path.abspath(__file__))
_data_dir = next((p for p in [
    os.path.join(_script_dir, "../data"),
    os.path.join(os.getcwd(), "backend/data"),
    os.path.join(os.getcwd(), "src/data"),
    os.path.join(os.getcwd(), "data")
] if os.path.exists(p)), os.path.join(_script_dir, "../data"))

MODEL_PATH = os.path.join(_data_dir, "model_artifact.pkl")

def preprocess_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    return text.lower()

def predict(question_text: str):
    if not os.path.exists(MODEL_PATH):
        return {
            "error": "Model artifact not found. Please train model first.",
            "success": False
        }
        
    with open(MODEL_PATH, "rb") as f:
        artifact = pickle.load(f)
        
    pipeline = artifact["pipeline"]
    classes = artifact["classes"]
    version = artifact.get("version", "v1.0")
    
    clean_text = preprocess_text(question_text)
    if not clean_text:
        return {
            "error": "Question text is empty",
            "success": False
        }
        
    # Real model prediction
    predicted_subject = pipeline.predict([clean_text])[0]
    
    # Calibrated probabilities if available
    probabilities = {}
    if hasattr(pipeline, "predict_proba"):
        probs = pipeline.predict_proba([clean_text])[0]
        for cls_name, p in zip(classes, probs):
            probabilities[cls_name] = round(float(p), 4)
            
    confidence = probabilities.get(predicted_subject, 1.0)
    
    return {
        "success": True,
        "input_text": question_text,
        "predicted_subject": predicted_subject,
        "confidence": confidence,
        "class_probabilities": probabilities,
        "model_version": version,
        "metadata": artifact.get("metadata", {})
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = sys.stdin.read().strip()
        
    result = predict(query)
    print(json.dumps(result, indent=2))
