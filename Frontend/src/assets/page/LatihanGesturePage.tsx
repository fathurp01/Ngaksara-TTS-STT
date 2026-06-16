import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

const aksaraNgalagena = [
  { char: 'ᮊ', name: 'KA' }, { char: 'ᮋ', name: 'QA' }, { char: 'ᮠ', name: 'HA' },
  { char: 'ᮕ', name: 'PA' }, { char: 'ᮖ', name: 'FA' }, { char: 'ᮗ', name: 'VA' },
  { char: 'ᮔ', name: 'NA' }, { char: 'ᮌ', name: 'GA' }, { char: 'ᮍ', name: 'NGA' },
  { char: 'ᮎ', name: 'CA' }, { char: 'ᮝ', name: 'WA' }, { char: 'ᮜ', name: 'LA' },
  { char: 'ᮛ', name: 'RA' }, { char: 'ᮞ', name: 'SA' }, { char: 'ᮟ', name: 'XA' },
  { char: 'ᮚ', name: 'YA' }, { char: 'ᮒ', name: 'TA' }, { char: 'ᮙ', name: 'MA' },
  { char: 'ᮓ', name: 'DA' }, { char: 'ᮏ', name: 'JA' }, { char: 'ᮘ', name: 'BA' },
  { char: 'ᮑ', name: 'NGA' }, { char: 'ᮐ', name: 'ZA' },
];

const aksaraSwara = [
  { char: 'ᮃ', name: 'A' }, { char: 'ᮄ', name: 'I' }, { char: 'ᮅ', name: 'U' },
  { char: 'ᮆ', name: 'AE' }, { char: 'ᮇ', name: 'O' }, { char: 'ᮈ', name: 'E' },
  { char: 'ᮉ', name: 'EU' },
];

interface Aksara { char: string; name: string; }
interface PredictionResult { class: string; confidence: number; }
interface LatihanGesturePageProps { onBack?: () => void; }

const LatihanGesturePage = ({ onBack }: LatihanGesturePageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const runningRef = useRef(false);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  const smoothedPointRef = useRef<{x: number, y: number} | null>(null); 
  const runningModeRef = useRef<'IMAGE' | 'VIDEO'>('IMAGE');
  const lastVideoTimeRef = useRef(-1);
  const animationFrameRef = useRef<number | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);

  const visualPathsRef = useRef<Array<Array<{x: number, y: number}>>>([]); 
  const currentPathRef = useRef<Array<{x: number, y: number}>>([]); 
  const lastInteractionTimeRef = useRef<number>(0); 
  const wasPinchingRef = useRef<boolean>(false); 

  const [selectedAksara, setSelectedAksara] = useState<Aksara | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'ngalagena' | 'swara'>('ngalagena');
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(true);

  const API_URL = 'http://localhost:5000';
  const currentAksaraList = selectedCategory === 'ngalagena' ? aksaraNgalagena : aksaraSwara;

  const PINCH_THRESHOLD = 0.05; 
  const AUTO_CLEAR_DELAY_MS = 1500; 
  const SMOOTHING_FACTOR = 0.5;

  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  };

  useEffect(() => {
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
    checkBackendHealth();
  }, []);

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

  const checkBackendHealth = async () => {
    try { await axios.get(`${API_URL}/health`); } catch (error) { console.error('Backend offline'); }
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

        if (runningModeRef.current === "IMAGE") {
            runningModeRef.current = "VIDEO";
            await recognizer.setOptions({ runningMode: "VIDEO" });
        }

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

            const drawPath = (points: {x: number, y: number}[]) => {
                if (points.length < 2) return;
                overlayCtx.beginPath();
                overlayCtx.moveTo(points[0].x * overlayCanvas.width, points[0].y * overlayCanvas.height);
                
                for (let i = 1; i < points.length; i++) {
                    const p1 = points[i - 1];
                    const p2 = points[i];
                    
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;
                    
                    if (i === 1) {
                         overlayCtx.lineTo(p1.x * overlayCanvas.width, p1.y * overlayCanvas.height);
                    } else {
                         const prevP = points[i-1];
                         overlayCtx.lineTo(prevP.x * overlayCanvas.width, prevP.y * overlayCanvas.height);
                    }
                }
                
                for (let i = 1; i < points.length; i++) {
                     overlayCtx.lineTo(points[i].x * overlayCanvas.width, points[i].y * overlayCanvas.height);
                }
                overlayCtx.stroke();
            };
            
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
      setPrediction(null);
      lastPointRef.current = null;
      smoothedPointRef.current = null;
      visualPathsRef.current = [];
      currentPathRef.current = [];
    }
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

  const predictDrawing = async () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if(!ctx) return;
    const data = ctx.getImageData(0,0, canvasRef.current.width, canvasRef.current.height).data;
    if (!data.some(c => c < 255)) { alert("Canvas kosong!"); return; }

    try {
      setIsLoading(true);
      const blob = await canvasToBlob();
      const formData = new FormData();
      formData.append('image', blob, 'drawing.jpg');
      const response = await axios.post(`${API_URL}/predict`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (response.data.success) {
        setPrediction({ class: response.data.prediction.class, confidence: response.data.prediction.confidence });
      } else {
        alert('Gagal: ' + response.data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Gagal prediksi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light p-5">
      <header className="mb-8">
        <button onClick={onBack} className="bg-white border border-gray-300 rounded-full px-5 py-2.5 mb-5 hover:bg-gray-50 transition-all">← Kembali</button>
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-red-500 text-5xl font-bold">Latihan menulis</h1>
          <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">✋ Mode: Gesture</span>
        </div>
        <h2 className="text-gray-800 text-4xl font-semibold">Aksara Sunda</h2>
      </header>

      <div className="flex gap-8 max-w-[1600px] mx-auto flex-col lg:flex-row">
        <div className="flex-1 max-w-full lg:max-w-[500px]">
            <div className="flex gap-2.5 mb-5">
                <button onClick={() => setSelectedCategory('ngalagena')} className={`px-6 py-3 rounded-full border-2 ${selectedCategory === 'ngalagena' ? 'bg-red-500 text-white border-red-500' : 'bg-white'}`}>Ngalagena</button>
                <button onClick={() => setSelectedCategory('swara')} className={`px-6 py-3 rounded-full border-2 ${selectedCategory === 'swara' ? 'bg-red-500 text-white border-red-500' : 'bg-white'}`}>Swara</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5 max-h-[600px] overflow-y-auto">
                {currentAksaraList.map((aksara, idx) => (
                    <div key={idx} onClick={() => setSelectedAksara(aksara)} className={`bg-white border-2 rounded-md p-5 text-center cursor-pointer hover:border-red-500 ${selectedAksara?.name === aksara.name ? 'border-red-500 bg-red-50' : ''}`}>
                        <div className="text-6xl font-sundanese mb-2">{aksara.char}</div>
                        <div className="font-bold">{aksara.name}</div>
                    </div>
                ))}
            </div>
        </div>

        <div className="flex-1 flex flex-col gap-5">
            <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg mx-auto" style={{ width: 640, height: 480 }}>
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} autoPlay playsInline muted />
                <canvas ref={overlayCanvasRef} width={640} height={480} className="absolute inset-0 w-full h-full pointer-events-none" />
                
                {isLoadingModel && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white">Loading Model...</div>}
                
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 p-4 rounded-xl backdrop-blur-sm">
                    <p className="text-white text-sm mb-2 text-center">👌 Cubit jari (telunjuk & jempol) untuk menulis</p>
                    <button onClick={enableCam} disabled={isLoadingModel} className={`w-full py-3 rounded-lg font-bold text-white transition ${webcamRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                        {webcamRunning ? 'MATIKAN KAMERA' : 'MULAI KAMERA'}
                    </button>
                </div>
            </div>

            <div className="relative bg-white rounded-2xl p-2 border-2 border-gray-200 shadow-sm mx-auto" style={{ width: 640, height: 480 }}>
                 <button onClick={clearCanvas} className="absolute top-4 right-4 bg-gray-100 hover:bg-red-100 p-2 rounded-full z-10">🗑️</button>
                 <canvas ref={canvasRef} width={640} height={480} className="w-full h-full bg-white rounded-xl" />
            </div>

            <button onClick={predictDrawing} disabled={isLoading} className="bg-red-600 text-white py-4 rounded-xl font-bold text-xl hover:bg-red-700 transition shadow-lg">
                {isLoading ? 'Menganalisis...' : 'CEK TULISAN'}
            </button>

            {prediction && (
                <div className="bg-white p-6 rounded-xl border-2 border-green-500 shadow-lg text-center">
                    <h3 className="text-gray-500 font-bold mb-2">HASIL PREDIKSI</h3>
                    <div className="text-4xl font-bold text-gray-800">{prediction.class}</div>
                    <div className="text-green-600 font-mono mt-1">Confidence: {prediction.confidence.toFixed(1)}%</div>
                    {selectedAksara && (
                        <div className={`mt-3 font-bold ${prediction.class.toUpperCase() === selectedAksara.name.toUpperCase() ? 'text-green-600' : 'text-red-500'}`}>
                            {prediction.class.toUpperCase() === selectedAksara.name.toUpperCase() ? "✅ Benar!" : `❌ Salah, target: ${selectedAksara.name.toUpperCase()}`}
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LatihanGesturePage;