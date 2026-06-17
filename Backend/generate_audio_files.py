import os
import torch
import numpy as np
import scipy.io.wavfile
from transformers import VitsModel, AutoTokenizer

# Force HF cache to local workspace directory
os.environ["HF_HOME"] = r"d:\Src\PTU\Ngaksara\.hf_cache"

TTS_MODEL_PATH = r'd:\Src\PTU\Ngaksara\models\mms-tts-sun'
OUTPUT_DIR = r'd:\Src\PTU\Ngaksara\Frontend\public\audio'

print(f"Creating output directory: {OUTPUT_DIR}")
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("Loading TTS model...")
tts_tokenizer = AutoTokenizer.from_pretrained(TTS_MODEL_PATH)
tts_model = VitsModel.from_pretrained(TTS_MODEL_PATH)
print("[OK] TTS model loaded successfully")

# All 30 characters (Ngalagena + Swara)
characters = [
    # Swara
    "a", "i", "u", "ae", "o", "e", "eu",
    # Ngalagena
    "ka", "qa", "ha", "pa", "fa", "va", "na", "ga", "nga", "ca",
    "wa", "la", "ra", "sa", "xa", "ya", "ta", "ma", "da", "ja",
    "ba", "nya", "za"
]

print(f"Starting audio generation for {len(characters)} characters...")

for char in characters:
    try:
        text_processed = char.lower().strip()
        # Prepend "aksara " for short inputs to provide context to VITS duration predictor
        if len(text_processed) <= 3 and not text_processed.startswith("aksara"):
            text_processed = f"aksara {text_processed}"
            
        inputs = tts_tokenizer(text_processed, return_tensors="pt")
        with torch.no_grad():
            output = tts_model(**inputs).waveform
        
        sampling_rate = tts_model.config.sampling_rate
        waveform_np = output.squeeze().cpu().numpy()
        
        # Audio normalization to prevent clipping and low volume
        max_val = np.abs(waveform_np).max()
        if max_val > 0:
            waveform_np = waveform_np / max_val * 0.9
            
        # Convert to 16-bit PCM
        waveform_int16 = (waveform_np * 32767).astype(np.int16)
        
        # Save to output folder
        output_path = os.path.join(OUTPUT_DIR, f"{char.lower()}.wav")
        scipy.io.wavfile.write(output_path, rate=sampling_rate, data=waveform_int16)
        print(f"Generated: {output_path}")
        
    except Exception as e:
        print(f"Error generating {char}: {str(e)}")

print("Audio generation complete!")
