// src/assets/page/LatihanSpeechPage.tsx
import { useRef, useState, useEffect } from 'react';
import axios from 'axios';

const aksaraNgalagena = [
  { char: 'ᮊ', name: 'KA' }, { char: 'ᮋ', name: 'QA' }, { char: 'ᮠ', name: 'HA' },
  { char: 'ᮕ', name: 'PA' }, { char: 'ᮖ', name: 'FA' }, { char: 'ᮗ', name: 'VA' },
  { char: 'ᮔ', name: 'NA' }, { char: 'ᮌ', name: 'GA' }, { char: 'ᮍ', name: 'NGA' },
  { char: 'ᮎ', name: 'CA' }, { char: 'ᮝ', name: 'WA' }, { char: 'ᮜ', name: 'LA' },
  { char: 'ᮛ', name: 'RA' }, { char: 'ᮞ', name: 'SA' }, { char: 'ᮟ', name: 'XA' },
  { char: 'ᮚ', name: 'YA' }, { char: 'ᮒ', name: 'TA' }, { char: 'ᮙ', name: 'MA' },
  { char: 'ᮓ', name: 'DA' }, { char: 'ᮏ', name: 'JA' }, { char: 'ᮘ', name: 'BA' },
  { char: 'ᮑ', name: 'NYA' }, { char: 'ᮐ', name: 'ZA' },
];

const aksaraSwara = [
  { char: 'ᮃ', name: 'A' }, { char: 'ᮄ', name: 'I' }, { char: 'ᮅ', name: 'U' },
  { char: 'ᮆ', name: 'AE' }, { char: 'ᮇ', name: 'O' }, { char: 'ᮈ', name: 'E' },
  { char: 'ᮉ', name: 'EU' },
];

interface Aksara {
  char: string;
  name: string;
}

interface PredictionResult {
  transcription: string;
  wer: number;
  accuracy: number;
}

interface LatihanSpeechPageProps {
  onBack?: () => void;
}

const LatihanSpeechPage = ({ onBack }: LatihanSpeechPageProps) => {
  const [selectedAksara, setSelectedAksara] = useState<Aksara | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'ngalagena' | 'swara'>('ngalagena');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const API_URL = 'http://localhost:5000';
  const currentAksaraList = selectedCategory === 'ngalagena' ? aksaraNgalagena : aksaraSwara;

  useEffect(() => {
    if (currentAksaraList.length > 0 && !selectedAksara) {
      setSelectedAksara(currentAksaraList[0]);
    }
  }, [selectedCategory]);

  const playTTS = () => {
    if (!selectedAksara) return;
    try {
      setIsPlayingTTS(true);
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(selectedAksara.name.toLowerCase());
      utterance.lang = 'id-ID';
      utterance.rate = 0.75; // Slower rate for clear pronunciation
      
      // Get all available voices on the device
      const voices = window.speechSynthesis.getVoices();
      
      // Filter for Indonesian voices
      const idVoices = voices.filter(v => v.lang.startsWith('id') || v.lang.toLowerCase().includes('indonesia'));
      
      // Try to find a native male voice (e.g. Andika on Windows, or containing male keywords)
      let isMaleVoice = true;
      let selectedVoice = idVoices.find(v => 
        v.name.toLowerCase().includes('andika') || 
        v.name.toLowerCase().includes('male') || 
        v.name.toLowerCase().includes('pria') ||
        v.name.toLowerCase().includes('laki')
      );
      
      // Fallback: Avoid "Gadis" (female) if another Indonesian voice exists
      if (!selectedVoice && idVoices.length > 0) {
        selectedVoice = idVoices.find(v => !v.name.toLowerCase().includes('gadis'));
        if (!selectedVoice) {
          selectedVoice = idVoices[0]; // Fallback to Gadis if nothing else exists
          isMaleVoice = false;
        }
      } else if (!selectedVoice) {
        isMaleVoice = false; // No Indonesian voice found, browser default will be female-oriented usually
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        // Double check if name contains female keywords
        if (selectedVoice.name.toLowerCase().includes('gadis') || selectedVoice.name.toLowerCase().includes('female')) {
          isMaleVoice = false;
        }
      }
      
      // Pitch tuning:
      if (isMaleVoice) {
        // Native male voice: set slightly higher pitch to sound younger
        utterance.pitch = 1.15;
      } else {
        // Female voice fallback: lower the pitch to simulate a male voice
        utterance.pitch = 0.65;
      }
      
      utterance.onend = () => setIsPlayingTTS(false);
      utterance.onerror = (e) => {
        console.error("SpeechSynthesis error:", e);
        setIsPlayingTTS(false);
        alert("Gagal memutar contoh pelafalan.");
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error playing TTS:", error);
      setIsPlayingTTS(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendAudioToSTT(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setPrediction(null);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Gagal mengakses mikrofon. Pastikan Anda telah memberikan izin akses.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToSTT = async (blob: Blob) => {
    if (!selectedAksara) return;
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('audio', blob, 'recording.wav');
      formData.append('target', selectedAksara.name);

      const response = await axios.post(`${API_URL}/stt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setPrediction({
          transcription: response.data.transcription,
          wer: response.data.wer,
          accuracy: response.data.accuracy
        });
      } else {
        alert('Gagal memproses suara: ' + response.data.error);
      }
    } catch (error) {
      console.error("Error sending audio to STT:", error);
      alert("Gagal menghubungi server backend. Pastikan Flask server berjalan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAksaraClick = (aksara: Aksara) => {
    setSelectedAksara(aksara);
    setPrediction(null);
  };

  return (
    <div className="min-h-screen bg-background-light p-5">
      <header className="mb-8">
        <button 
          className="bg-white border border-gray-300 rounded-full px-5 py-2.5 text-base cursor-pointer mb-5 hover:bg-gray-50 transition-all"
          onClick={onBack}
        >
          ← Kembali
        </button>
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-red-500 text-5xl font-bold">Latihan Menulis</h1>
          <span className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
            🎙️ Mode: Pelafalan Suara
          </span>
        </div>
        <h2 className="text-gray-800 text-4xl font-semibold">Aksara Sunda</h2>
      </header>

      <div className="flex gap-8 max-w-[1400px] mx-auto flex-col lg:flex-row">
        {/* Left Side: Aksara List */}
        <div className="flex-1 max-w-full lg:max-w-[700px]">
          <p className="text-gray-600 text-base leading-relaxed mb-5">
            Pilih aksara di bawah ini, dengarkan contoh pengucapannya, kemudian rekam pelafalan Anda.
          </p>

          <div className="flex gap-2.5 mb-5">
            <button
              className={`px-6 py-3 rounded-full text-base cursor-pointer transition-all border-2 ${
                selectedCategory === 'ngalagena'
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white border-gray-300 hover:border-red-500 hover:text-red-500'
              }`}
              onClick={() => setSelectedCategory('ngalagena')}
            >
              Aksara Ngalagena
            </button>
            <button
              className={`px-6 py-3 rounded-full text-base cursor-pointer transition-all border-2 ${
                selectedCategory === 'swara'
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white border-gray-300 hover:border-red-500 hover:text-red-500'
              }`}
              onClick={() => setSelectedCategory('swara')}
            >
              Aksara Swara
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-5 max-h-[500px] overflow-y-auto pr-2">
            {currentAksaraList.map((aksara, index) => (
              <div
                key={index}
                className={`bg-white border-2 rounded-md p-5 text-center cursor-pointer transition-all relative hover:-translate-y-0.5 hover:shadow-lg ${
                  selectedAksara?.name === aksara.name
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-red-500'
                }`}
                onClick={() => handleAksaraClick(aksara)}
              >
                {selectedAksara?.name === aksara.name && (
                  <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
                <div className="text-7xl mb-2.5 font-sundanese leading-none font-medium">
                  {aksara.char}
                </div>
                <div className="text-sm font-semibold text-gray-800">{aksara.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: TTS and Recording Controls */}
        <div className="flex-1 flex flex-col items-center gap-6">
          {selectedAksara && (
            <div className="bg-white rounded-2xl p-8 shadow-xl w-full max-w-[500px] flex flex-col items-center border border-gray-200">
              <div className="text-9xl font-sundanese text-gray-950 mb-4 font-normal">
                {selectedAksara.char}
              </div>
              <div className="text-3xl font-black text-primary mb-6">{selectedAksara.name}</div>

              {/* TTS Play Button */}
              <button
                onClick={playTTS}
                disabled={isPlayingTTS || isLoading}
                className="w-full mb-4 flex items-center justify-center gap-3 bg-blue-500 text-white rounded-xl py-4 font-bold text-lg hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 disabled:bg-gray-300 disabled:shadow-none"
              >
                <span className="material-symbols-outlined text-2xl">
                  {isPlayingTTS ? 'volume_mute' : 'volume_up'}
                </span>
                {isPlayingTTS ? 'Memutar...' : 'Dengar Pelafalan (TTS)'}
              </button>

              {/* STT Record Button */}
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={isPlayingTTS || isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-red-500 text-white rounded-xl py-4 font-bold text-lg hover:bg-red-600 transition shadow-lg shadow-red-500/20 disabled:bg-gray-300 disabled:shadow-none"
                >
                  <span className="material-symbols-outlined text-2xl">mic</span>
                  Mulai Rekam Suara
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-full flex items-center justify-center gap-3 bg-red-700 text-white rounded-xl py-4 font-bold text-lg hover:bg-red-800 transition animate-pulse shadow-lg"
                >
                  <span className="material-symbols-outlined text-2xl">stop</span>
                  Berhenti & Kirim
                </button>
              )}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center gap-3 p-6 bg-white rounded-xl shadow border border-gray-200 w-full max-w-[500px]">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="font-semibold text-gray-700">Menganalisis pelafalan suara Anda...</span>
            </div>
          )}

          {prediction && (
            <div className={`bg-white rounded-2xl p-6 shadow-xl w-full max-w-[500px] border-2 ${
              prediction.accuracy >= 80 ? 'border-green-500' : 'border-red-500'
            }`}>
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Hasil Analisis Pelafalan</h3>
              
              <div className="flex flex-col items-center gap-4">
                <div className="text-sm text-gray-500">Hasil Deteksi Transkripsi:</div>
                <div className="text-3xl font-extrabold text-gray-800 capitalize">"{prediction.transcription || '-'}"</div>
                
                <div className="w-full bg-gray-100 rounded-full h-4 mt-2 overflow-hidden">
                  <div 
                    className={`h-4 rounded-full transition-all duration-500 ${
                      prediction.accuracy >= 80 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${prediction.accuracy}%` }}
                  ></div>
                </div>

                <div className="flex justify-between w-full text-sm font-semibold text-gray-600 px-1">
                  <span>Skor Akurasi: {prediction.accuracy.toFixed(1)}%</span>
                  <span>WER: {prediction.wer.toFixed(2)}</span>
                </div>

                <div className={`mt-4 p-4 rounded-xl w-full text-center font-bold text-lg border ${
                  prediction.accuracy >= 80 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {prediction.accuracy >= 80 ? (
                    <p className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">check_circle</span>
                      Pelafalan Anda Benar!
                    </p>
                  ) : (
                    <p className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">cancel</span>
                      Kurang Tepat, Coba Lagi!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LatihanSpeechPage;
