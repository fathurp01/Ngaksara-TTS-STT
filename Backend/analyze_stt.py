import os
import torch
import soundfile as sf
import scipy.signal as signal
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

STT_MODEL_PATH = r'd:\Src\PTU\Ngaksara\models\wav2vec2-sundanese'
DOWNLOAD_DIR = r'd:\Src\PTU\Ngaksara\Backend\downloaded_tts'
TARGET_LETTERS = ["ka", "nga", "ga", "eu", "ae"]

print("Loading processor and model...")
stt_processor = Wav2Vec2Processor.from_pretrained(STT_MODEL_PATH)
stt_model = Wav2Vec2ForCTC.from_pretrained(STT_MODEL_PATH)

def clean_speech_text(t):
    t = t.lower().strip()
    prefixes = ["aksara ", "aksara", "sara ", "sala ", "saral ", "dehlarala "]
    for p in prefixes:
        if t.startswith(p):
            t = t[len(p):].strip()
            break
    return t

print("\nRunning analysis on downloaded wav files:")
for char in TARGET_LETTERS:
    audio_path = os.path.join(DOWNLOAD_DIR, f"{char}.wav")
    if not os.path.exists(audio_path):
        print(f"File {audio_path} not found.")
        continue
        
    speech, sample_rate = sf.read(audio_path)
    if len(speech.shape) > 1:
        speech = speech.mean(axis=1)
    if sample_rate != 16000:
        num_samples = round(len(speech) * 16000 / sample_rate)
        speech = signal.resample(speech, num_samples)
        
    input_values = stt_processor(speech, sampling_rate=16000, return_tensors="pt").input_values
    with torch.no_grad():
        logits = stt_model(input_values).logits
    predicted_ids = torch.argmax(logits, dim=-1)
    raw_transcription = stt_processor.batch_decode(predicted_ids)[0]
    cleaned = clean_speech_text(raw_transcription)
    
    print(f"Target: '{char}'")
    print(f"  Raw Transcription:     '{raw_transcription}'")
    print(f"  Cleaned Transcription: '{cleaned}'")
