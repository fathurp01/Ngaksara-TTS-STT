import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

// --- DATA & INTERFACES (Sama seperti sebelumnya) ---
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

interface KuisGesturePageProps {
  onBack?: () => void;
}

const KuisGesturePage = ({ onBack }: KuisGesturePageProps) => {
  // --- REFS & STATE (Logika Inti Tetap Sama) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const runningRef = useRef(false);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  const smoothedPointRef = useRef<{x: number, y: number} | null>(null); 
  const lastVideoTimeRef = useRef(-1);
  const animationFrameRef = useRef<number | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);

  const visualPathsRef = useRef<Array<Array<{x: number, y: number}>>>([]); 
  const currentPathRef = useRef<Array<{x: number, y: number}>>([]); 
  const lastInteractionTimeRef = useRef<number>(0); 
  const wasPinchingRef = useRef<boolean>(false);

  const [isLoading, setIsLoading] = useState(false);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  
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

  const PINCH_THRESHOLD = 0.05; 
  const AUTO_CLEAR_DELAY_MS = 1500; 
  const SMOOTHING_FACTOR = 0.5;

  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  };

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
      }
    }
  }, [quizStarted]);

  useEffect(() => {
    const createGestureRecognizer = async () => {
      try {
        setIsLoadingModel(true);
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO"
        });
        
        gestureRecognizerRef.current = recognizer;
        setIsLoadingModel(false);
      } catch (err) {
        console.error('Error init model:', err);
        setIsLoadingModel(false);
      }
    };

    createGestureRecognizer();

    return () => {
      runningRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const generateQuestion = () => {
    const randomIndex = Math.floor(Math.random() * allAksara.length);
    setCurrentQuestion(allAksara[randomIndex]);
    setShowResult(false);
    setCurrentAnswer(null);
    clearCanvas();
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setQuizFinished(false);
    setQuestionNumber(1);
    setScore(0);
    setStreak(0);
    setQuizHistory([]);
    generateQuestion();
  };

  const enableCam = async () => {
    if (!gestureRecognizerRef.current) {
      alert("Tunggu model selesai dimuat...");
      return;
    }

    if (webcamRunning) {
      setWebcamRunning(false);
      runningRef.current = false;
      
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      
      const overlayCtx = overlayCanvasRef.current?.getContext('2d');
      if (overlayCtx && overlayCanvasRef.current) {
          overlayCtx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
      
      visualPathsRef.current = [];
      currentPathRef.current = [];
      smoothedPointRef.current = null;

    } else {
      setWebcamRunning(true);
      runningRef.current = true;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predictWebcam);
        }
      } catch (err) {
        console.error(err);
        setWebcamRunning(false);
        runningRef.current = false;
        alert("Gagal akses kamera");
      }
    }
  };

  const predictWebcam = async () => {
    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const drawingCanvas = canvasRef.current;
    const recognizer = gestureRecognizerRef.current;

    if (!runningRef.current || !video || !overlayCanvas || !drawingCanvas || !recognizer) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(predictWebcam);
        return;
    }

    if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;

        const startTimeMs = performance.now();
        const results = recognizer.recognizeForVideo(video, startTimeMs);

        const overlayCtx = overlayCanvas.getContext('2d');
        if (overlayCtx) {
            overlayCtx.save();
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            
            overlayCtx.translate(overlayCanvas.width, 0);
            overlayCtx.scale(-1, 1);

            if (performance.now() - lastInteractionTimeRef.current > AUTO_CLEAR_DELAY_MS) {
                visualPathsRef.current = [];
                currentPathRef.current = [];
            }

            overlayCtx.lineCap = "round";
            overlayCtx.lineJoin = "round";
            overlayCtx.strokeStyle = "rgba(0, 255, 255, 0.8)"; 
            overlayCtx.lineWidth = 12; 
            overlayCtx.shadowColor = "#00FFFF";
            overlayCtx.shadowBlur = 15;

            const drawSmoothPath = (points: {x: number, y: number}[]) => {
                if (points.length < 2) return;
                overlayCtx.beginPath();
                
                let p0 = points[0];
                overlayCtx.moveTo(p0.x * overlayCanvas.width, p0.y * overlayCanvas.height);
            
                for (let i = 1; i < points.length; i++) {
                    overlayCtx.lineTo(points[i].x * overlayCanvas.width, points[i].y * overlayCanvas.height);
                }
                overlayCtx.stroke();
            }

            visualPathsRef.current.forEach(path => drawSmoothPath(path));
            if (currentPathRef.current.length > 0) {
                drawSmoothPath(currentPathRef.current);
            }
            
            overlayCtx.shadowBlur = 0;

            const drawingUtils = new DrawingUtils(overlayCtx);

            if (results.landmarks && results.landmarks.length > 0) {
                const landmarks = results.landmarks[0];
                
                const indexTip = landmarks[8]; 
                const thumbTip = landmarks[4]; 
                
                const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
                const isPinching = distance < PINCH_THRESHOLD; 

                const connectorColor = isPinching ? "#00BFFF" : "#00FF00"; 
                const landmarkColor = isPinching ? "#FFFF00" : "#FF0000";  
                const skeletonWidth = isPinching ? 5 : 2; 

                drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { 
                    color: connectorColor, 
                    lineWidth: skeletonWidth 
                });
                drawingUtils.drawLandmarks(landmarks, { 
                    color: landmarkColor, 
                    lineWidth: 2 
                });

                if (isPinching) {
                    lastInteractionTimeRef.current = performance.now();

                    let currentX = indexTip.x;
                    let currentY = indexTip.y;

                    if (smoothedPointRef.current) {
                        currentX = lerp(smoothedPointRef.current.x, currentX, SMOOTHING_FACTOR);
                        currentY = lerp(smoothedPointRef.current.y, currentY, SMOOTHING_FACTOR);
                    }
                    smoothedPointRef.current = { x: currentX, y: currentY };

                    const drawingCtx = drawingCanvas.getContext('2d');
                    if (drawingCtx) {
                        const x = drawingCanvas.width - (currentX * drawingCanvas.width); 
                        const y = currentY * drawingCanvas.height;

                        if (lastPointRef.current) {
                            drawingCtx.beginPath();
                            drawingCtx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                            drawingCtx.lineTo(x, y);
                            drawingCtx.stroke();
                        }
                        lastPointRef.current = { x, y };
                    }

                    if (!wasPinchingRef.current) {
                         currentPathRef.current = [];
                    }
                    currentPathRef.current.push({ x: currentX, y: currentY });
                    
                    wasPinchingRef.current = true;

                } else {
                    if (wasPinchingRef.current) {
                        if (currentPathRef.current.length > 0) {
                            visualPathsRef.current.push([...currentPathRef.current]);
                        }
                        currentPathRef.current = [];
                    }

                    lastPointRef.current = null;
                    smoothedPointRef.current = null;
                    wasPinchingRef.current = false;
                }
            }
            overlayCtx.restore();
        }
    }

    if (runningRef.current) {
        animationFrameRef.current = requestAnimationFrame(predictWebcam);
    }
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setCurrentAnswer(null);
      setShowResult(false);
      lastPointRef.current = null;
      smoothedPointRef.current = null;
      visualPathsRef.current = [];
      currentPathRef.current = [];
    }
  };

  const isCanvasEmpty = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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

  const canvasToBlob = (): Promise<Blob> => {
    return new Promise((resolve) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                tempCtx.fillStyle = 'white';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(canvas, 0, 0);
                tempCanvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/jpeg', 0.95);
            }
        }
    });
  };

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

  const nextQuestion = () => {
    if (questionNumber >= totalQuestions) {
      setQuizFinished(true);
    } else {
      setQuestionNumber(prev => prev + 1);
      generateQuestion();
    }
  };

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

  // --- HALAMAN LANDING PAGE ---
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-6">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-red-50 rounded-full mb-6 animate-pulse">
              <span className="material-symbols-outlined text-primary text-6xl">gesture</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Kuis Aksara Sunda</h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Mode Gesture Recognition: Tulis aksara di udara menggunakan jari Anda.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">info</span>
                Cara Bermain
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5">1</span>
                  <span>Aktifkan kamera & izinkan akses.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5">2</span>
                  <span>Angkat tangan, lihat skeleton tangan muncul.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5">3</span>
                  <span><strong>Cubit telunjuk & jempol</strong> untuk mulai menulis.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5">4</span>
                  <span>Lepas cubitan untuk berhenti menggores.</span>
                </li>
              </ul>
            </div>
            
             <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100 flex flex-col justify-center">
                 <div className="text-center">
                     <span className="text-4xl font-bold text-orange-600 block mb-2">{totalQuestions}</span>
                     <span className="text-gray-600 font-medium">Total Soal</span>
                 </div>
                 <div className="mt-6 text-center text-sm text-gray-500">
                     Pastikan pencahayaan cukup terang agar kamera bisa mendeteksi tangan dengan baik.
                 </div>
             </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              className="px-8 py-4 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:border-gray-400 hover:text-gray-800 transition-all"
              onClick={onBack}
            >
              Kembali
            </button>
            <button 
              className="px-12 py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 hover:bg-red-700 hover:scale-105 transition-all flex items-center justify-center gap-2"
              onClick={startQuiz}
            >
              <span className="material-symbols-outlined">play_arrow</span>
              Mulai Sekarang
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- HALAMAN HASIL (RESULT) ---
  if (quizFinished) {
    const percentage = (score / totalQuestions) * 100;
    const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'E';
    
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Score Card */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>
                
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-green-600 text-5xl">emoji_events</span>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Kuis Selesai!</h1>
                <p className="text-gray-500 mb-8">Kamu telah menyelesaikan semua soal.</p>
                
                <div className="flex justify-center items-end gap-2 mb-4">
                    <span className="text-7xl font-black text-gray-900">{score}</span>
                    <span className="text-2xl font-bold text-gray-400 mb-4">/{totalQuestions}</span>
                </div>
                
                <div className={`inline-block px-6 py-2 rounded-full font-bold text-lg mb-8 ${
                    grade === 'A' ? 'bg-green-100 text-green-700' :
                    grade === 'B' ? 'bg-blue-100 text-blue-700' :
                    grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                }`}>
                    Grade: {grade} ({percentage}%)
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={onBack} className="px-6 py-3 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                        Kembali ke Home
                    </button>
                    <button onClick={startQuiz} className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200">
                        Ulangi Kuis
                    </button>
                </div>
            </div>

            {/* History List */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 ml-2">Riwayat Jawaban</h3>
                {quizHistory.map((result, index) => (
                    <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4 hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white ${result.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                            {index + 1}
                        </div>
                        
                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex items-center justify-center sm:justify-start gap-4">
                                <span className="text-4xl font-sundanese">{result.question.char}</span>
                                <div className="text-sm">
                                    <p className="text-gray-500">Soal</p>
                                    <p className="font-bold text-lg">{result.question.name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 text-center sm:text-right border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 w-full sm:w-auto">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Jawaban Kamu</p>
                            <p className={`font-bold text-lg ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                {result.userAnswer}
                            </p>
                            <p className="text-xs text-gray-400">Conf: {result.confidence.toFixed(1)}%</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  // --- HALAMAN UTAMA KUIS (Responsive Layout) ---
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans text-gray-900">
      
      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Soal {questionNumber} <span className="text-gray-400 font-normal">/ {totalQuestions}</span></h2>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                    <span className="material-symbols-outlined text-orange-500 text-xl">local_fire_department</span>
                    <span className="font-bold text-orange-700">{streak}</span>
                </div>
            </div>
            {/* Progress Bar */}
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-primary transition-all duration-700 ease-out rounded-full" 
                    style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                ></div>
            </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 h-full">
            
            {/* Kolom Kiri: Pertanyaan & Feedback (Desktop: 4/12 width) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-primary to-orange-400"></div>
                    
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-4">Gambar Aksara</p>
                    
                    <div className="mb-2">
                        <h1 className="text-5xl font-black text-gray-800 tracking-tight">{currentQuestion?.name}</h1>
                    </div>
                    
                    <div className="my-6 w-40 h-40 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                        <span className="text-[80px] font-sundanese text-gray-400 select-none">
                            {currentQuestion?.char}
                        </span>
                    </div>

                    {showResult && currentAnswer ? (
                        <div className={`w-full rounded-2xl p-4 animate-fade-in ${
                            currentAnswer.class.toUpperCase() === currentQuestion?.name.toUpperCase()
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                        }`}>
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`material-symbols-outlined text-3xl ${
                                     currentAnswer.class.toUpperCase() === currentQuestion?.name.toUpperCase() ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {currentAnswer.class.toUpperCase() === currentQuestion?.name.toUpperCase() ? 'check_circle' : 'cancel'}
                                </span>
                                <div className="text-left">
                                    <p className="font-bold text-gray-800 text-lg">
                                        {currentAnswer.class.toUpperCase() === currentQuestion?.name.toUpperCase() ? 'Benar!' : 'Salah!'}
                                    </p>
                                    <p className="text-xs text-gray-600">Terdeteksi: <b>{currentAnswer.class}</b> ({currentAnswer.confidence.toFixed(0)}%)</p>
                                </div>
                            </div>
                            <button 
                                onClick={nextQuestion}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-700 transition-colors shadow-lg"
                            >
                                Lanjut <span className="ml-2">→</span>
                            </button>
                        </div>
                    ) : (
                        <div className="w-full bg-blue-50 p-3 rounded-xl border border-blue-100 text-sm text-blue-700 flex gap-2 text-left">
                            <span className="material-symbols-outlined text-lg flex-shrink-0">info</span>
                            <p>Cubit jari (telunjuk & jempol) di depan kamera untuk menggambar.</p>
                        </div>
                    )}
                </div>

                {/* Kontrol Tombol Mobile (Visible only on small screens if needed, but here kept in flow) */}
                <div className="grid grid-cols-2 gap-3 lg:hidden">
                     <button onClick={skipQuestion} className="py-3 rounded-xl border border-gray-300 font-bold text-gray-600">Lewati</button>
                     <button 
                        onClick={submitAnswer} 
                        disabled={isLoading || showResult}
                        className="py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
                     >
                        {isLoading ? '...' : 'Cek'}
                     </button>
                </div>
            </div>

            {/* Kolom Kanan: Area Interaksi (Camera & Canvas) (Desktop: 8/12 width) */}
            <div className="lg:col-span-8 space-y-6">
                
                {/* Container Video & Canvas */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    
                    {/* VIDEO FEED CARD */}
                    <div className="bg-black rounded-3xl overflow-hidden shadow-lg relative aspect-[4/3] w-full border-4 border-gray-900">
                        <video 
                            ref={videoRef} 
                            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" 
                            autoPlay 
                            playsInline 
                            muted
                        />
                        <canvas 
                            ref={overlayCanvasRef} 
                            width={640} 
                            height={480} 
                            className="absolute inset-0 w-full h-full pointer-events-none transform" 
                        />
                        
                        {/* Status Overlay */}
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm animate-pulse">
                                <span className="w-2 h-2 bg-white rounded-full"></span> LIVE
                            </span>
                            {isLoadingModel && (
                                <span className="bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md">
                                    Memuat Model AI...
                                </span>
                            )}
                        </div>

                        {/* Camera Control Overlay */}
                        {!webcamRunning && (
                            <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm z-10">
                                <span className="material-symbols-outlined text-gray-500 text-6xl mb-4">videocam_off</span>
                                <h3 className="text-white font-bold text-xl mb-2">Kamera Belum Aktif</h3>
                                <p className="text-gray-400 mb-6 text-sm">Aktifkan kamera untuk mulai menggambar gesture.</p>
                                <button 
                                    onClick={enableCam}
                                    disabled={isLoadingModel}
                                    className="bg-primary hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoadingModel ? 'Tunggu Sebentar...' : 'Mulai Kamera'}
                                </button>
                            </div>
                        )}
                        
                        {webcamRunning && (
                             <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                                 <div className="bg-black/50 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full border border-white/10">
                                     Tulis di udara (Pinch to Draw)
                                 </div>
                             </div>
                        )}
                    </div>

                    {/* CANVAS RESULT CARD */}
                    <div className="bg-white rounded-3xl overflow-hidden shadow-lg border-4 border-gray-100 relative aspect-[4/3] w-full flex flex-col">
                        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur border border-gray-200 px-3 py-1 rounded-full text-xs font-bold text-gray-500 shadow-sm">
                            Hasil Goresan
                        </div>
                        
                        <div className="relative flex-1 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] bg-white">
                            <canvas 
                                ref={canvasRef} 
                                width={640} 
                                height={480} 
                                className="w-full h-full object-contain" 
                            />
                        </div>

                        {/* Canvas Tools */}
                        <div className="absolute bottom-4 right-4 flex gap-2">
                             <button 
                                onClick={clearCanvas} 
                                className="w-10 h-10 bg-white rounded-full shadow-md border border-gray-200 text-gray-600 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-all"
                                title="Hapus Canvas"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </div>

                </div>

                {/* Control Bar Desktop */}
                <div className="hidden lg:flex bg-white p-4 rounded-2xl shadow-sm border border-gray-100 items-center justify-between">
                     <div className="flex items-center gap-4">
                        <button 
                             onClick={() => setWebcamRunning(prev => !prev)}
                             className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                                 webcamRunning ? 'border-red-100 text-red-600 hover:bg-red-50' : 'border-green-100 text-green-600 hover:bg-green-50'
                             }`}
                        >
                            {webcamRunning ? 'Stop Kamera' : 'Start Kamera'}
                        </button>
                        <button onClick={clearCanvas} className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-lg">refresh</span> Reset Canvas
                        </button>
                     </div>

                     <div className="flex gap-3">
                        <button 
                            onClick={skipQuestion}
                            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all"
                        >
                            Lewati
                        </button>
                        <button 
                            onClick={submitAnswer}
                            disabled={isLoading || showResult}
                            className="px-8 py-2.5 rounded-xl bg-primary text-white font-bold shadow-md shadow-red-100 hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none"
                        >
                            {isLoading ? 'Mengecek...' : 'Cek Jawaban'}
                        </button>
                     </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default KuisGesturePage;