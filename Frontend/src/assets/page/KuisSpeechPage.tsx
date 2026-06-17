// src/assets/page/KuisSpeechPage.tsx
import { useRef, useState } from 'react';
import axios from 'axios';

// Gabungkan semua aksara untuk kuis
const allAksara = [
  { char: 'ᮊ', name: 'KA', category: 'ngalagena' },
  { char: 'ᮋ', name: 'QA', category: 'ngalagena' },
  { char: 'ᮠ', name: 'HA', category: 'ngalagena' },
  { char: 'ᮕ', name: 'PA', category: 'ngalagena' },
  { char: 'ᮖ', name: 'FA', category: 'ngalagena' },
  { char: 'ᮗ', name: 'VA', category: 'ngalagena' },
  { char: 'ᮔ', name: 'NA', category: 'ngalagena' },
  { char: 'ᮌ', name: 'GA', category: 'ngalagena' },
  { char: 'ᮍ', name: 'NGA', category: 'ngalagena' },
  { char: 'ᮎ', name: 'CA', category: 'ngalagena' },
  { char: 'ᮝ', name: 'WA', category: 'ngalagena' },
  { char: 'ᮜ', name: 'LA', category: 'ngalagena' },
  { char: 'ᮛ', name: 'RA', category: 'ngalagena' },
  { char: 'ᮞ', name: 'SA', category: 'ngalagena' },
  { char: 'ᮟ', name: 'XA', category: 'ngalagena' },
  { char: 'ᮚ', name: 'YA', category: 'ngalagena' },
  { char: 'ᮒ', name: 'TA', category: 'ngalagena' },
  { char: 'ᮙ', name: 'MA', category: 'ngalagena' },
  { char: 'ᮓ', name: 'DA', category: 'ngalagena' },
  { char: 'ᮏ', name: 'JA', category: 'ngalagena' },
  { char: 'ᮘ', name: 'BA', category: 'ngalagena' },
  { char: 'ᮐ', name: 'ZA', category: 'ngalagena' },
  { char: 'ᮃ', name: 'A', category: 'swara' },
  { char: 'ᮄ', name: 'I', category: 'swara' },
  { char: 'ᮅ', name: 'U', category: 'swara' },
  { char: 'ᮆ', name: 'AE', category: 'swara' },
  { char: 'ᮇ', name: 'O', category: 'swara' },
  { char: 'ᮈ', name: 'E', category: 'swara' },
  { char: 'ᮉ', name: 'EU', category: 'swara' },
];

interface Aksara {
  char: string;
  name: string;
  category: string;
}

interface QuizResult {
  question: Aksara;
  userAnswer: string;
  isCorrect: boolean;
  accuracy: number;
}

interface KuisSpeechPageProps {
  onBack?: () => void;
}

const KuisSpeechPage = ({ onBack }: KuisSpeechPageProps) => {
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Aksara | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalQuestions] = useState(10);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [currentAccuracy, setCurrentAccuracy] = useState<number>(0);
  const [currentTranscription, setCurrentTranscription] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const API_URL = 'http://localhost:5000';

  // Generate random question
  const generateQuestion = () => {
    const randomIndex = Math.floor(Math.random() * allAksara.length);
    setCurrentQuestion(allAksara[randomIndex]);
    setShowResult(false);
    setCurrentAccuracy(0);
    setCurrentTranscription('');
  };

  // Start quiz
  const startQuiz = () => {
    setQuizStarted(true);
    setQuizFinished(false);
    setQuestionNumber(1);
    setScore(0);
    setStreak(0);
    setQuizHistory([]);
    generateQuestion();
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
        await evaluateVoice(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setShowResult(false);
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

  const evaluateVoice = async (blob: Blob) => {
    if (!currentQuestion) return;
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('audio', blob, 'recording.wav');
      formData.append('target', currentQuestion.name);

      const response = await axios.post(`${API_URL}/stt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const accuracy = response.data.accuracy;
        const transcription = response.data.transcription;
        const isCorrect = accuracy >= 80; // Correct threshold

        setCurrentAccuracy(accuracy);
        setCurrentTranscription(transcription);
        setShowResult(true);

        const result: QuizResult = {
          question: currentQuestion,
          userAnswer: transcription,
          isCorrect: isCorrect,
          accuracy: accuracy
        };

        setQuizHistory(prev => [...prev, result]);

        if (isCorrect) {
          setScore(prev => prev + 1);
          setStreak(prev => prev + 1);
        } else {
          setStreak(0);
        }
      } else {
        alert('Gagal evaluasi: ' + response.data.error);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      alert("Gagal memproses jawaban. Pastikan backend server running.");
    } finally {
      setIsLoading(false);
    }
  };

  const nextQuestion = () => {
    if (questionNumber >= totalQuestions) {
      setQuizFinished(true);
    } else {
      setQuestionNumber(prev => prev + 1);
      generateQuestion();
    }
  };

  const skipQuestion = () => {
    if (!currentQuestion) return;
    setStreak(0);
    const result: QuizResult = {
      question: currentQuestion,
      userAnswer: 'DILEWATI',
      isCorrect: false,
      accuracy: 0
    };
    setQuizHistory(prev => [...prev, result]);
    nextQuestion();
  };

  // Welcome Screen
  if (!quizStarted) {
    return (
      <div className="bg-background-light flex items-center justify-center p-5 min-h-screen">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-10 md:p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
              <span className="material-symbols-outlined text-primary text-5xl">mic</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">Kuis Pelafalan Aksara</h1>
            <p className="text-lg text-gray-600">Uji kemampuan pelafalan Aksara Sunda Anda!</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-md p-6 md:p-8 mb-8 border border-red-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              Peraturan Kuis Pelafalan
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">check_circle</span>
                <span>Total <strong>{totalQuestions} soal</strong> akan diujikan secara acak</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">mic</span>
                <span>Lafalkan karakter aksara Sunda yang muncul di layar dengan jelas</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">done_all</span>
                <span>Skor akurasi minimal **80%** untuk dianggap benar di setiap soal</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">emoji_events</span>
                <span>Hasil transkripsi dan skor akhir dihitung di akhir sesi kuis</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              className="px-8 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-bold hover:border-primary hover:text-primary transition-all"
              onClick={onBack}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">arrow_back</span>
                Kembali
              </span>
            </button>
            <button 
              className="px-10 py-3 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-red-600 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              onClick={startQuiz}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">play_arrow</span>
                Mulai Kuis
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Finished Screen
  if (quizFinished) {
    const percentage = (score / totalQuestions) * 100;
    const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'E';
    
    return (
      <div className="min-h-screen bg-background-light p-4 md:p-6 overflow-y-auto">
        <div className="max-w-[800px] mx-auto py-8 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#f3e7e7] p-8 md:p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1b0d0d] mb-2">Kuis Pelafalan Selesai!</h1>
            <div className="text-6xl md:text-7xl font-extrabold text-[#1b0d0d] mb-2">
              {score}/{totalQuestions}
            </div>
            <p className="text-gray-500 mb-6">Akurasi Rata-rata Soal Benar: {percentage.toFixed(1)}%</p>
            <div className={`text-2xl md:text-3xl font-bold py-2 px-8 rounded-full mb-8 inline-block ${
              grade === 'A' ? 'bg-green-100 text-green-600' :
              grade === 'B' ? 'bg-blue-100 text-blue-600' :
              grade === 'C' ? 'bg-yellow-100 text-yellow-600' :
              'bg-red-100 text-primary'
            }`}>
              Grade: {grade}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button 
                className="px-6 py-2.5 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                onClick={onBack}
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Kembali ke Home</span>
              </button>
              <button 
                className="px-6 py-2.5 rounded-full bg-primary hover:bg-red-600 text-white font-medium shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                onClick={startQuiz}
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Ulangi Kuis</span>
              </button>
            </div>
          </div>

          {/* Quiz History */}
          <div className="bg-white rounded-xl shadow-sm border border-[#f3e7e7] p-6 md:p-8">
            <h3 className="text-xl font-bold text-[#1b0d0d] flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">history</span>
              Detail Pelafalan Kuis
            </h3>
            <div className="flex flex-col gap-4">
              {quizHistory.map((result, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    result.isCorrect 
                      ? 'border-green-200 bg-green-50/30' 
                      : 'border-red-200 bg-red-50/30'
                  }`}
                >
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="size-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-500 shadow-sm">
                      #{index + 1}
                    </div>
                    <div className="font-sundanese text-4xl leading-none text-[#1b0d0d]">
                      {result.question.char}
                    </div>
                  </div>
                  <div className="text-center flex-1 px-4 hidden sm:block">
                    <p className="font-bold text-[#1b0d0d]">{result.question.name}</p>
                    <p className="text-xs text-gray-500">Skor: {result.accuracy.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-1 ${
                      result.isCorrect 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {result.isCorrect ? 'check' : 'close'}
                      </span>
                      {result.isCorrect ? 'Benar' : 'Salah'}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Lafal: "{result.userAnswer}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in Progress Screen
  return (
    <div className="h-screen bg-background-light flex flex-col overflow-hidden">
      {/* Progress Section */}
      <div className="flex-shrink-0 w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[#1b0d0d] text-base font-bold">Soal {questionNumber} dari {totalQuestions}</p>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500 text-lg">hotel_class</span>
              <p className="text-[#9a4c4c] text-sm font-medium">Streak: {streak}</p>
            </div>
          </div>
          <div className="h-3 w-full bg-[#e7cfcf] rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main content - Side by Side layout */}
      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-8 pb-6 flex gap-6 overflow-hidden">
        {/* Left Side: Question (Shows the Character) */}
        <div className="w-1/2 flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-[#f3e7e7] p-8">
          <h1 className="text-[#1b0d0d] text-2xl font-bold text-center mb-6">
            Lafalkan Karakter Aksara Sunda Berikut:
          </h1>
          <div className="text-[160px] font-sundanese text-gray-950 font-normal leading-none my-8">
            {currentQuestion?.char}
          </div>
          <div className="text-gray-400 text-sm mt-4">
            Ucapkan nama aksara di atas ke dalam mikrofon
          </div>
        </div>

        {/* Right Side: Recording Panel and Results */}
        <div className="w-1/2 bg-white rounded-xl shadow-sm border border-[#f3e7e7] p-8 flex flex-col justify-between overflow-y-auto">
          <div className="flex flex-col items-center justify-center flex-1 gap-6">
            <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center mb-2">
              <span className={`material-symbols-outlined text-orange-600 text-5xl ${isRecording ? 'animate-pulse' : ''}`}>
                {isRecording ? 'graphic_eq' : 'mic'}
              </span>
            </div>

            {/* Instruction / Status */}
            {!isRecording && !isLoading && !showResult && (
              <p className="text-gray-600 text-center font-medium">
                Klik tombol di bawah dan sebutkan lafal dari aksara Sunda di samping
              </p>
            )}

            {isRecording && (
              <p className="text-red-500 text-center font-bold animate-pulse">
                Sedang merekam... Ucapkan sekarang dengan jelas.
              </p>
            )}

            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="font-semibold text-gray-700">Menganalisis suara Anda...</span>
              </div>
            )}

            {/* Display result inside right panel */}
            {showResult && (
              <div className={`w-full rounded-xl border p-5 ${
                currentAccuracy >= 80 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className={`p-2 rounded-full ${currentAccuracy >= 80 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <span className="material-symbols-outlined text-2xl">
                      {currentAccuracy >= 80 ? 'check_circle' : 'cancel'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xl capitalize text-gray-800">
                      Pelafalan Anda: "{currentTranscription}"
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Target Pengucapan: <span className="font-bold text-gray-800">{currentQuestion?.name}</span>
                    </p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">
                      Skor Akurasi: {currentAccuracy.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons at bottom */}
          <div className="flex items-center justify-between border-t border-[#f3e7e7] pt-6 flex-shrink-0">
            <button 
              onClick={skipQuestion}
              disabled={isLoading || showResult}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Lewati Soal
            </button>

            <div className="flex gap-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={isLoading || showResult}
                  className="px-8 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">mic</span>
                  <span>Mulai Rekam</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-8 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">stop</span>
                  <span>Selesai & Kirim</span>
                </button>
              )}

              {showResult && (
                <button
                  onClick={nextQuestion}
                  className="px-8 py-3 rounded-lg bg-primary hover:bg-red-600 text-white font-bold shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2"
                >
                  <span>{questionNumber >= totalQuestions ? 'Selesai' : 'Lanjut Soal →'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KuisSpeechPage;
