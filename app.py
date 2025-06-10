import os
import logging
import json
import wave
import ffmpeg
from flask import Flask, render_template, Response, jsonify, request
from vosk import Model, KaldiRecognizer

from flask_login import LoginManager
from .models import db, User
from .auth import auth
from .meetings import meetings

import cv2
import threading
import time
import queue
import ssl

from scripts.inference_classifier import GestureClassifier

app = Flask(__name__)
gesture_classifier = GestureClassifier()
camera = cv2.VideoCapture(0)

predicted_character = ""
streaming = False
initializing_camera = False
camera_lock = threading.Lock()

# Configure logging
logging.basicConfig(level=logging.INFO)

# Vosk setup
model = Model("static/vosk-model-en-us-0.22")
q = queue.Queue()

@app.route("/")
def welcome():
    return render_template("welcome.html")

@app.route("/index")
def index():
    global camera
    if not camera.isOpened():
        camera.open(0)
    return render_template("index.html")

def generate_frames():
    global predicted_character, streaming
    while True:
        if streaming:
            success, frame = camera.read()
            if not success:
                break

            # Flip the frame horizontally
            frame = cv2.flip(frame, 1)

            predicted_character, frame = gesture_classifier.predict(frame)
            ret, jpeg = cv2.imencode(".jpg", frame)
            frame_bytes = jpeg.tobytes()

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n\r\n"
            )
        else:
            time.sleep(0.1)
            
@app.route("/video_feed")
def video_feed():
    global streaming
    with camera_lock:
        streaming = True
    return Response(
        generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/stop_feed")
def stop_feed():
    global streaming
    with camera_lock:
        streaming = False
    return jsonify(status="stopped")

@app.route("/release_camera")
def release_camera():
    global camera, initializing_camera
    with camera_lock:
        if camera.isOpened():
            camera.release()
            initializing_camera = False
            return jsonify(status="released")
        else:
            return jsonify(status="already_released")

@app.route("/start_camera")
def start_camera():
    global camera, initializing_camera
    with camera_lock:
        if not camera.isOpened():
            initializing_camera = True
            camera.open(0)
            initializing_camera = False
            return jsonify(status="started")
        else:
            return jsonify(status="already_started")

@app.route("/check_camera_status")
def check_camera_status():
    global initializing_camera
    return jsonify(initializing=initializing_camera)

@app.route("/get_character")
def get_character():
    return jsonify(character=predicted_character)

def convert_to_wav(input_path, output_path):
    try:
        ffmpeg.input(input_path).output(output_path, ac=1, ar=16000, format='wav').run(overwrite_output=True)
        logging.info(f"Audio file converted to valid WAV format and saved to {output_path}")
    except Exception as e:
        logging.error(f"FFmpeg conversion error: {e}")
        raise

@app.route("/start_recording", methods=['POST'])
def start_recording():
    if 'audio' not in request.files:
        return jsonify(error="No audio file found in request"), 400

    audio_file = request.files['audio']
    audio_path = os.path.join('static', 'uploaded_audio.wav')
    corrected_audio_path = os.path.join('static', 'uploaded_audio_corrected.wav')

    try:
        # Save the uploaded audio file
        audio_file.save(audio_path)
        logging.info(f"Audio file saved to {audio_path}")

        # Convert audio to valid WAV format using FFmpeg
        convert_to_wav(audio_path, corrected_audio_path)

        # Initialize Vosk recognizer
        rec = KaldiRecognizer(model, 16000)
        result_text = ""

        # Process the audio file
        with wave.open(corrected_audio_path, "rb") as wf:
            while True:
                data = wf.readframes(4000)
                if not data:
                    break
                if rec.AcceptWaveform(data):
                    result_text += json.loads(rec.Result()).get('text', '') + " "
                else:
                    logging.debug(f"Partial Result: {json.loads(rec.PartialResult())}")

        # Add final result
        final_result = json.loads(rec.FinalResult())
        result_text += final_result.get('text', '')

        logging.info(f"Final Result: {result_text.strip()}")

        return jsonify(text=result_text.strip())

    except Exception as e:
        logging.error(f"Error processing audio file: {e}")
        return jsonify(error="Error processing audio file"), 500

    finally:
        # Cleanup temporary audio files
        for file_path in [audio_path, corrected_audio_path]:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    logging.info(f'Temporary file removed: {file_path}')
                except OSError as e:
                    logging.error(f'Error removing temporary file {file_path}: {str(e)}')

if __name__ == "__main__":
    # context = ssl.SSLContext(ssl.PROTOCOL_TLS)
    # context.load_cert_chain('cert.pem', 'key.pem')
    # app.run(host='0.0.0.0', port=443, debug=True, ssl_context=context)
    app.run(host='0.0.0.0', port=5000, debug=True)