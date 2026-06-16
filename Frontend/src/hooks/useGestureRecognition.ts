import { useEffect, useRef, useState, useCallback } from 'react';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

export interface GestureResult {
  isWriting: boolean;
  landmarks: any[];
  handedness: string | null;
}

export const useGestureRecognition = () => {
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    const initializeGestureRecognizer = async () => {
      try {
        setIsLoading(true);
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        setGestureRecognizer(recognizer);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing gesture recognizer:', err);
        setError('Failed to initialize gesture recognition');
        setIsLoading(false);
      }
    };

    initializeGestureRecognizer();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const calculatePinchDistance = useCallback((landmarks: any[]): number => {
    if (!landmarks || landmarks.length === 0) return Infinity;
    
    const indexTip = landmarks[0][8];
    const thumbTip = landmarks[0][4];
    
    if (!indexTip || !thumbTip) return Infinity;
    
    const dx = indexTip.x - thumbTip.x;
    const dy = indexTip.y - thumbTip.y;
    const dz = indexTip.z - thumbTip.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, []);

  const getDrawingPosition = useCallback((landmarks: any[], videoElement: HTMLVideoElement): { x: number; y: number } | null => {
    if (!landmarks || landmarks.length === 0 || !videoElement) return null;
    
    const indexTip = landmarks[0][8];
    
    if (!indexTip) return null;
    
    return {
      x: indexTip.x * videoElement.videoWidth,
      y: indexTip.y * videoElement.videoHeight
    };
  }, []);

  const processFrame = useCallback((
    videoElement: HTMLVideoElement,
    onGestureUpdate: (result: GestureResult) => void
  ) => {
    if (!gestureRecognizer || !videoElement) return;

    const nowInMs = Date.now();
    
    if (videoElement.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = videoElement.currentTime;
        
        const results = gestureRecognizer.recognizeForVideo(videoElement, nowInMs);
        
        // Debug log
        if (results) {
        console.log('Results:', {
            landmarks: results.landmarks?.length || 0,
            gestures: results.gestures?.length || 0,
            handednesses: results.handednesses?.length || 0
        });
        }
        
        if (results && results.landmarks && results.landmarks.length > 0) {
        const pinchDistance = calculatePinchDistance(results.landmarks);
        const isWriting = pinchDistance < 0.05;
        
        const handedness = results.handednesses && results.handednesses.length > 0
            ? results.handednesses[0][0].displayName
            : null;
        
        onGestureUpdate({
            isWriting,
            landmarks: results.landmarks,
            handedness
        });
        } else {
        onGestureUpdate({
            isWriting: false,
            landmarks: [],
            handedness: null
        });
        }
    }
    }, [gestureRecognizer, calculatePinchDistance]);

  return {
    gestureRecognizer,
    isLoading,
    error,
    videoRef,
    processFrame,
    getDrawingPosition,
    calculatePinchDistance
  };
};