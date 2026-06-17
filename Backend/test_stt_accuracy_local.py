import os
import torch
import soundfile as sf
import scipy.signal as signal
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

# Import functions from app
from app import clean_speech_text, find_closest_aksara_name, calculate_wer

STT_MODEL_PATH = r'd:\Src\PTU\Ngaksara\models\wav2vec2-sundanese'
DOWNLOAD_DIR = r'd:\Src\PTU\Ngaksara\Backend\downloaded_tts'
TARGET_LETTERS = ["ka", "nga", "ga", "eu", "ae"]

print("Loading processor and model...")
stt_processor = Wav2Vec2Processor.from_pretrained(STT_MODEL_PATH)
stt_model = Wav2Vec2ForCTC.from_pretrained(STT_MODEL_PATH)

results = []

print("\nRunning STT inference with updated code on downloaded wav files:")
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
    
    clean_transcription = clean_speech_text(raw_transcription)
    clean_target = clean_speech_text(char)
    mapped_transcription = find_closest_aksara_name(clean_transcription)
    
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
    
    print(f"Target: '{char}' | Raw: '{raw_transcription}' | Cleaned: '{clean_transcription}' | Mapped: '{display_transcription}' | Acc: {accuracy}%")

# Print summary table
print("\n" + "="*70)
print("UPDATED TEST SUMMARY (LOCAL RUN)")
print("="*70)
print(f"{'Character':<10} | {'Raw STT':<15} | {'Cleaned':<10} | {'Mapped':<8} | {'Accuracy (%)':<12} | {'WER':<6}")
print("-" * 75)

total_acc = 0.0
total_wer = 0.0

for r in results:
    print(f"{r['character']:<10} | {r['raw']:<15} | {r['cleaned']:<10} | {r['transcription']:<8} | {r['accuracy']:<12} | {r['wer']:.2f}")
    total_acc += r['accuracy']
    total_wer += r['wer']
    
if results:
    avg_acc = total_acc / len(results)
    avg_wer = total_wer / len(results)
    print("-" * 75)
    print(f"{'Average':<10} | {'':<15} | {'':<10} | {'':<8} | {avg_acc:<12.2f} | {avg_wer:.2f}")
print("="*70)
