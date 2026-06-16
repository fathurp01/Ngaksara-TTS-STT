import { useRef, useState, useEffect } from 'react';
import axios from 'axios';

// Gabungkan semua aksara untuk kuis
const allAksara = [
  // Aksara Ngalagena
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
  // Aksara Swara  
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

interface PredictionResult {
  class: string;
  confidence: number;
}

interface QuizResult {
  question: Aksara;
  userAnswer: string;
  isCorrect: boolean;
  confidence: number;
}

interface KuisPageProps {
  onBack?: () => void;
}

const KuisPage = ({ onBack }: KuisPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Quiz states
  const [currentQuestion, setCurrentQuestion] = useState<Aksara | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalQuestions] = useState(10);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<PredictionResult | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const API_URL = 'http://localhost:5000';

  // Initialize canvas when quiz is started
  useEffect(() => {
    if (!quizStarted) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 8;
        setContext(ctx);
      }
    }
  }, [quizStarted]);

  // Generate random question
  const generateQuestion = () => {
    const randomIndex = Math.floor(Math.random() * allAksara.length);
    setCurrentQuestion(allAksara[randomIndex]);
    setShowResult(false);
    setCurrentAnswer(null);
    clearCanvas();
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

  //Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!context) return;
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    const canvas = canvasRef.current;
    if (rect && canvas) {
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      context.beginPath();
      context.moveTo(
        (e.clientX - rect.left) * scaleX, 
        (e.clientY - rect.top) * scaleY
      );
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    const canvas = canvasRef.current;
    if (rect && canvas) {
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      context.lineTo(
        (e.clientX - rect.left) * scaleX, 
        (e.clientY - rect.top) * scaleY
      );
      context.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas && context) {
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      setCurrentAnswer(null);
      setShowResult(false);
    }
  };

  const canvasToBlob = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (canvas && context) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          tempCtx.fillStyle = 'white';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(canvas, 0, 0);
          
          tempCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/jpeg', 0.95);
        }
      }
    });
  };

  // Check if canvas is empty
  const isCanvasEmpty = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas || !context) return true;

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      if (r < 250 || g < 250 || b < 250) {
        return false;
      }
    }
    return true;
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!currentQuestion) return;

    if (isCanvasEmpty()) {
      alert('Silakan gambar aksara terlebih dahulu!');
      return;
    }

    try {
      setIsLoading(true);

      const blob = await canvasToBlob();
      const formData = new FormData();
      formData.append('image', blob, 'drawing.jpg');

      const response = await axios.post(`${API_URL}/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const prediction: PredictionResult = {
          class: response.data.prediction.class,
          confidence: response.data.prediction.confidence
        };
        
        setCurrentAnswer(prediction);
        setShowResult(true);

        const isCorrect = prediction.class.toUpperCase() === currentQuestion.name.toUpperCase();
        
        // Add to history
        const result: QuizResult = {
          question: currentQuestion,
          userAnswer: prediction.class,
          isCorrect: isCorrect,
          confidence: prediction.confidence
        };
        
        setQuizHistory(prev => [...prev, result]);
        
        if (isCorrect) {
          setScore(prev => prev + 1);
          setStreak(prev => prev + 1);
        } else {
          setStreak(0);
        }
      } else {
        alert('Prediksi gagal: ' + response.data.error);
      }

    } catch (error) {
      console.error('Error during prediction:', error);
      alert('Gagal melakukan prediksi. Pastikan backend server sudah running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Next question
  const nextQuestion = () => {
    if (questionNumber >= totalQuestions) {
      setQuizFinished(true);
    } else {
      setQuestionNumber(prev => prev + 1);
      generateQuestion();
    }
  };

  // Skip question
  const skipQuestion = () => {
    setStreak(0);
    const result: QuizResult = {
      question: currentQuestion!,
      userAnswer: 'SKIPPED',
      isCorrect: false,
      confidence: 0
    };
    setQuizHistory(prev => [...prev, result]);
    nextQuestion();
  };

  // Quiz not started screen
  if (!quizStarted) {
    return (
      <div className="bg-background-light flex items-center justify-center p-5 overflow-hidden">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-10 md:p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
              <span className="material-symbols-outlined text-primary text-5xl">quiz</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">Kuis Aksara Sunda</h1>
            <p className="text-lg text-gray-600">Uji kemampuanmu menulis aksara Sunda!</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-md p-6 md:p-8 mb-8 border border-red-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              Peraturan Kuis
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">check_circle</span>
                <span>Total <strong>{totalQuestions} soal</strong> akan diberikan secara random</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">draw</span>
                <span>Gambar aksara yang diminta di canvas</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">schedule</span>
                <span>Tidak ada batas waktu, kerjakan dengan teliti</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">emoji_events</span>
                <span>Skor akan dihitung di akhir kuis</span>
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

  // Quiz finished screen  
  if (quizFinished) {
    const percentage = (score / totalQuestions) * 100;
    const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'E';
    
    return (
      <div className="min-h-screen bg-background-light p-4 md:p-6 overflow-y-auto">
        <div className="max-w-[800px] mx-auto py-8 flex flex-col gap-6">
          {/* Results Card */}
          <div className="bg-white rounded-xl shadow-sm border border-[#f3e7e7] p-8 md:p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1b0d0d] mb-2">Kuis Selesai!</h1>
            <div className="text-6xl md:text-7xl font-extrabold text-[#1b0d0d] mb-2">
              {score}/{totalQuestions}
            </div>
            <p className="text-gray-500 mb-6">Skor Anda: {percentage.toFixed(1)}%</p>
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

          {/* History */}
          <div className="bg-white rounded-xl shadow-sm border border-[#f3e7e7] p-6 md:p-8">
            <h3 className="text-xl font-bold text-[#1b0d0d] flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">history</span>
              Riwayat Jawaban
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
                    <p className="text-xs text-gray-500">Kategori: {result.question.category}</p>
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
                    <p className="text-[10px] text-gray-500 mt-1">Jawaban: {result.userAnswer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress - SIDE BY SIDE LAYOUT
  return (
    <div className="h-screen bg-background-light flex flex-col overflow-hidden">
      {/* Progress Section - stays at top */}
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
          <p className="text-[#9a4c4c] text-xs font-normal uppercase tracking-wide">Level: Pemula</p>
        </div>
      </div>

      {/* Main Content - Side by Side Layout */}
      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-8 pb-6 flex gap-6 overflow-hidden">
        {/* Left Side - Question */}
        <div className="w-1/3 flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-[#f3e7e7] p-8">
          <h1 className="text-[#1b0d0d] text-xl font-medium text-center mb-4">
            Gambar karakter Aksara Sunda berikut
          </h1>
          <div className="relative mb-6">
            <h2 className="text-[#1b0d0d] text-6xl font-bold tracking-tight text-center">
              '{currentQuestion?.name}'
            </h2>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full"></div>
          </div>
          
          {/* Character Display */}
          <div className="text-[120px] font-sundanese text-gray-300 my-8">
            {currentQuestion?.char}
          </div>

          {/* Feedback Area - in question panel */}
          {showResult && currentAnswer && currentQuestion && (
            <div className={`w-full rounded-lg border p-4 mt-6 ${
              currentAnswer.class.toUpperCase() === currentQuestion.name.toUpperCase()
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-1 rounded-full ${
                  currentAnswer.class.toUpperCase() === currentQuestion.name.toUpperCase()
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}>
                  <span className="material-symbols-outlined text-xl">
                    {currentAnswer.class.toUpperCase() === currentQuestion.name.toUpperCase() ? 'check' : 'close'}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className={`font-bold ${
                    currentAnswer.class.toUpperCase() === currentQuestion.name.toUpperCase()
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}>
                    {currentAnswer.class.toUpperCase() === currentQuestion.name.toUpperCase() ? 'Benar!' : 'Kurang Tepat'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    currentAnswer.class.toUpperCase() === currentQuestion.name.toUpperCase()
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}>
                    {currentAnswer.class.toUpperCase() === currentQuestion.name.toUpperCase()
                      ? `Bagus! Confidence: ${currentAnswer.confidence.toFixed(1)}%`
                      : `Jawaban: ${currentAnswer.class}. Seharusnya: ${currentQuestion.name}`
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={nextQuestion}
                className="w-full px-6 py-2 rounded-lg bg-primary text-white font-bold hover:bg-red-600 transition-colors"
              >
                {questionNumber >= totalQuestions ? 'Selesai' : 'Soal Berikutnya →'}
              </button>
            </div>
          )}
        </div>

        {/* Right Side - Canvas */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-[#f3e7e7] overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#f3e7e7] bg-[#fcf8f8] flex-shrink-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold mr-2 text-[#1b0d0d] hidden sm:block">Alat:</p>
              <button className="p-2 rounded hover:bg-gray-200 bg-primary/10 text-primary transition-colors" title="Pensil">
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
            </div>
            <button 
              onClick={clearCanvas}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-red-700 px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              <span>Hapus Canvas</span>
            </button>
          </div>

          {/* Canvas - takes remaining space */}
          <div className="relative flex-1 bg-white bg-dot-grid cursor-crosshair group">
            {isCanvasEmpty() && !showResult && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-40 group-hover:opacity-20 transition-opacity">
                <p className="text-gray-400 text-lg font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined">draw</span>
                  Gambar di sini...
                </p>
              </div>
            )}
            
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="absolute inset-0 w-full h-full"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between p-4 gap-4 bg-[#fcf8f8] border-t border-[#f3e7e7] flex-shrink-0">
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">info</span>
              <span className="hidden md:block">Gambar dengan rapi untuk pengenalan yang lebih baik</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={skipQuestion}
                className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Lewati
              </button>
              <button 
                onClick={submitAnswer}
                disabled={isLoading || showResult}
                className="px-8 py-2.5 rounded-lg bg-primary hover:bg-red-600 text-white font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isLoading ? 'Memproses...' : 'Submit Jawaban'}</span>
                <span className="material-symbols-outlined text-lg">check</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KuisPage;
