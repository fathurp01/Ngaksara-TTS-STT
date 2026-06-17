import os
import torch
import numpy as np
import soundfile as sf
import scipy.io.wavfile
import scipy.signal as signal
from transformers import VitsModel, AutoTokenizer, Wav2Vec2ForCTC, Wav2Vec2Processor

# Import functions from app
from app import clean_speech_text, find_closest_aksara_name, calculate_wer

TTS_MODEL_PATH = r'd:\Src\PTU\Ngaksara\models\mms-tts-sun'
STT_MODEL_PATH = r'd:\Src\PTU\Ngaksara\models\wav2vec2-sundanese'
DOWNLOAD_DIR = r'd:\Src\PTU\Ngaksara\Backend\downloaded_tts'

ALL_CHARACTERS = [
    # Swara
    "a", "i", "u", "ae", "o", "e", "eu",
    # Ngalagena
    "ka", "qa", "ha", "pa", "fa", "va", "na", "ga", "nga", "ca",
    "wa", "la", "ra", "sa", "xa", "ya", "ta", "ma", "da", "ja",
    "ba", "nya", "za"
]

def generate_deterministic_tts():
    print("=== GENERATING DETERMINISTIC TTS AUDIOS LOCALLY ===")
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    
    print("Loading TTS model...")
    tts_tokenizer = AutoTokenizer.from_pretrained(TTS_MODEL_PATH)
    tts_model = VitsModel.from_pretrained(TTS_MODEL_PATH)
    
    for char in ALL_CHARACTERS:
        audio_path = os.path.join(DOWNLOAD_DIR, f"{char}.wav")
        print(f"Generating deterministic TTS for '{char}'...")
        try:
            text_processed = char.lower().strip()
            if len(text_processed) <= 3 and not text_processed.startswith("aksara"):
                text_processed = f"aksara {text_processed}"
                
            # Deterministic seed
            torch.manual_seed(42)
            inputs = tts_tokenizer(text_processed, return_tensors="pt")
            with torch.no_grad():
                output = tts_model(**inputs).waveform
            
            sampling_rate = tts_model.config.sampling_rate
            waveform_np = output.squeeze().cpu().numpy()
            
            # Normalization
            max_val = np.abs(waveform_np).max()
            if max_val > 0:
                waveform_np = waveform_np / max_val * 0.9
                
            waveform_int16 = (waveform_np * 32767).astype(np.int16)
            scipy.io.wavfile.write(audio_path, rate=sampling_rate, data=waveform_int16)
            print(f"  [OK] Saved to {audio_path}")
        except Exception as e:
            print(f"  [ERROR] Failed to generate: {str(e)}")

def test_stt_accuracy():
    print("\n=== RUNNING LOCAL STT ACCURACY TEST ===")
    print("Loading STT model...")
    stt_processor = Wav2Vec2Processor.from_pretrained(STT_MODEL_PATH)
    stt_model = Wav2Vec2ForCTC.from_pretrained(STT_MODEL_PATH)
    
    results = []
    
    for char in ALL_CHARACTERS:
        audio_path = os.path.join(DOWNLOAD_DIR, f"{char}.wav")
        if not os.path.exists(audio_path):
            print(f"File {audio_path} not found. Skipping.")
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
        
        clean_transcription = clean_speech_text(raw_transcription)
        clean_target = clean_speech_text(char)
        mapped_transcription = find_closest_aksara_name(clean_transcription, clean_target)
        
        # Calculate accuracy based on mapped vs target
        if not mapped_transcription:
            accuracy = 0.0
        elif mapped_transcription == clean_target:
            accuracy = 100.0
        else:
            def edit_distance(s1, s2):
                if len(s1) > len(s2):
                    s1, s2 = s2, s1
                distances = range(len(s1) + 1)
                for i2, c2 in enumerate(s2):
                    distances_ = [i2+1]
                    for i1, c1 in enumerate(s1):
                        if c1 == c2:
                            distances_.append(distances[i1])
                        else:
                            distances_.append(1 + min((distances[i1], distances[i1 + 1], distances_[-1])))
                    distances = distances_
                return distances[-1]
                
            dist = edit_distance(clean_target, mapped_transcription)
            sim = 1.0 - (dist / max(1, len(clean_target), len(mapped_transcription)))
            accuracy = max(0.0, round(sim * 100, 1))
            
        wer = calculate_wer(clean_target, clean_transcription)
        display_transcription = mapped_transcription.upper() if mapped_transcription else "-"
        
        results.append({
            "character": char,
            "raw": raw_transcription,
            "cleaned": clean_transcription,
            "transcription": display_transcription,
            "wer": wer,
            "accuracy": accuracy
        })
        print(f"Target: '{char:<3}' | Raw: '{raw_transcription:<15}' | Cleaned: '{clean_transcription:<10}' | Mapped: '{display_transcription:<5}' | Acc: {accuracy}%")

    # Print summary table
    print("\n" + "="*85)
    print("ALL CHARACTERS TEST SUMMARY")
    print("="*85)
    print(f"{'Character':<10} | {'Raw STT':<20} | {'Cleaned':<12} | {'Mapped':<8} | {'Accuracy (%)':<12} | {'WER':<6}")
    print("-" * 85)
    
    total_acc = 0.0
    total_wer = 0.0
    errors = []
    
    for r in results:
        print(f"{r['character']:<10} | {r['raw']:<20} | {r['cleaned']:<12} | {r['transcription']:<8} | {r['accuracy']:<12} | {r['wer']:.2f}")
        total_acc += r['accuracy']
        total_wer += r['wer']
        if r['accuracy'] < 100.0:
            errors.append(r)
            
    if results:
        avg_acc = total_acc / len(results)
        avg_wer = total_wer / len(results)
        print("-" * 85)
        print(f"{'Average':<10} | {'':<20} | {'':<12} | {'':<8} | {avg_acc:<12.2f} | {avg_wer:.2f}")
    print("="*85)
    
    print("\n=== ERRORS / MIS-TRANSCRIPTIONS TO FIX ===")
    if not errors:
        print("None! All characters are 100% accurate!")
    else:
        for err in errors:
            print(f"Target: '{err['character']}' -> Raw: '{err['raw']}' -> Cleaned: '{err['cleaned']}' -> Mapped: '{err['transcription']}'")

if __name__ == "__main__":
    generate_deterministic_tts()
    test_stt_accuracy()
