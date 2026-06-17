import os
import requests
import json

# Configuration
TTS_URL = "http://localhost:5000/tts"
STT_URL = "http://localhost:5000/stt"
DOWNLOAD_DIR = r"d:\Src\PTU\Ngaksara\Backend\downloaded_tts"
TARGET_LETTERS = ["ka", "nga", "ga", "eu", "ae"]

def main():
    print("=== STARTING STT ACCURACY TEST ===")
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    
    results = []
    
    for char in TARGET_LETTERS:
        print(f"\nProcessing character: '{char}'")
        
        # 1. Download TTS
        print(f"  Downloading TTS audio from {TTS_URL}...")
        try:
            tts_res = requests.get(TTS_URL, params={"text": char}, timeout=30)
            if tts_res.status_code != 200:
                print(f"  [ERROR] TTS Request failed with status code {tts_res.status_code}")
                continue
            
            audio_path = os.path.join(DOWNLOAD_DIR, f"{char}.wav")
            with open(audio_path, "wb") as f:
                f.write(tts_res.content)
            print(f"  [OK] Saved TTS audio to {audio_path}")
            
        except Exception as e:
            print(f"  [ERROR] Failed to download TTS: {str(e)}")
            continue
            
        # 2. Test STT
        print(f"  Sending audio to STT at {STT_URL}...")
        try:
            with open(audio_path, "rb") as audio_file:
                files = {"audio": (f"{char}.wav", audio_file, "audio/wav")}
                data = {"target": char}
                
                stt_res = requests.post(STT_URL, files=files, data=data, timeout=30)
                
            if stt_res.status_code != 200:
                print(f"  [ERROR] STT Request failed with status code {stt_res.status_code}")
                continue
                
            response_data = stt_res.json()
            if not response_data.get("success"):
                print(f"  [ERROR] STT API error: {response_data.get('error')}")
                continue
                
            transcription = response_data.get("transcription")
            wer = response_data.get("wer")
            accuracy = response_data.get("accuracy")
            
            results.append({
                "character": char,
                "transcription": transcription,
                "wer": wer,
                "accuracy": accuracy
            })
            
            print(f"  [OK] STT Result: Transcribed: '{transcription}', Accuracy: {accuracy}%, WER: {wer}")
            
        except Exception as e:
            print(f"  [ERROR] Failed to call STT: {str(e)}")
            continue
            
    # Print summary table
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"{'Character':<10} | {'Transcription':<15} | {'Accuracy (%)':<12} | {'WER':<6}")
    print("-" * 60)
    
    total_acc = 0.0
    total_wer = 0.0
    
    for r in results:
        print(f"{r['character']:<10} | {r['transcription']:<15} | {r['accuracy']:<12} | {r['wer']:.2f}")
        total_acc += r['accuracy']
        total_wer += r['wer']
        
    if results:
        avg_acc = total_acc / len(results)
        avg_wer = total_wer / len(results)
        print("-" * 60)
        print(f"{'Average':<10} | {'':<15} | {avg_acc:<12.2f} | {avg_wer:.2f}")
    print("="*60)

if __name__ == "__main__":
    main()
