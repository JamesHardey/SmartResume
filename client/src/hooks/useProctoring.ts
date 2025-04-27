import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import * as tf from "@tensorflow/tfjs";

type ProctoringFlag = {
  timestamp: number;
  type: 'no_face' | 'multiple_faces' | 'looking_away' | 'tab_switch';
  details?: string;
};

type DetectionState = {
  faceDetected: boolean;
  multipleFaces: boolean;
  lookingAway: boolean;
};

export function useProctoring() {
  const [faceDetectionEnabled, setFaceDetectionEnabled] = useState(false);
  const [isFaceVisible, setIsFaceVisible] = useState(false);
  const [multipleFacesDetected, setMultipleFacesDetected] = useState(false);
  const [isLookingAway, setIsLookingAway] = useState(false);
  const [flags, setFlags] = useState<ProctoringFlag[]>([]);
  
  const detectionRef = useRef<DetectionState>({
    faceDetected: false,
    multipleFaces: false,
    lookingAway: false
  });
  
  const modelRef = useRef<tf.GraphModel | null>(null);
  const checkingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize face detection
  const initFaceDetection = useCallback(async () => {
    try {
      if (!modelRef.current) {
        // Load the face detection model from TF.js hosted models
        modelRef.current = await tf.loadGraphModel(
          'https://tfhub.dev/tensorflow/tfjs-model/blazeface/1/default/1',
          { fromTFHub: true }
        );
      }
      
      setFaceDetectionEnabled(true);
    } catch (error) {
      console.error("Error initializing face detection:", error);
    }
  }, []);

  // Stop face detection
  const stopFaceDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setFaceDetectionEnabled(false);
    setIsFaceVisible(false);
    setMultipleFacesDetected(false);
    setIsLookingAway(false);
  }, []);

  // Capture a proctoring flag
  const captureFlag = useCallback((type: ProctoringFlag['type'], details?: string) => {
    setFlags(prev => {
      // Check if we already have a similar flag in the last 5 seconds to avoid duplicates
      const now = Date.now();
      const recentSimilarFlag = prev.find(
        flag => flag.type === type && now - flag.timestamp < 5000
      );
      
      if (recentSimilarFlag) {
        return prev;
      }
      
      const newFlag: ProctoringFlag = {
        timestamp: now,
        type,
        details
      };
      
      // Log flag to server (optional)
      apiRequest("POST", "/api/proctor/log-event", {
        event: newFlag
      }).catch(err => console.error("Error logging proctoring event:", err));
      
      return [...prev, newFlag];
    });
  }, []);

  // Detect faces in a video element
  const detectFaces = useCallback(async (videoEl: HTMLVideoElement | null) => {
    if (!videoEl || !modelRef.current || checkingRef.current || !faceDetectionEnabled) {
      return;
    }
    
    try {
      checkingRef.current = true;
      
      // Convert the video frame to a tensor
      const videoWidth = videoEl.videoWidth;
      const videoHeight = videoEl.videoHeight;
      
      if (videoWidth === 0 || videoHeight === 0) {
        checkingRef.current = false;
        return;
      }
      
      const video = tf.browser.fromPixels(videoEl);
      const resizedVideo = tf.image.resizeBilinear(video, [128, 128]);
      const normalizedVideo = resizedVideo.div(255).expandDims(0);
      
      // Run face detection
      const predictions = await modelRef.current.predict(normalizedVideo);
      const faces = await predictions.array();
      
      // Cleanup tensors to prevent memory leaks
      video.dispose();
      resizedVideo.dispose();
      normalizedVideo.dispose();
      
      // Update face detection state
      const faceDetected = faces && faces[0] && faces[0].length > 0;
      const multipleFaces = faces && faces[0] && faces[0].length > 1;
      
      // Set state
      setIsFaceVisible(faceDetected);
      setMultipleFacesDetected(multipleFaces);
      
      // Update ref for other parts of the app to access
      detectionRef.current = {
        faceDetected,
        multipleFaces,
        lookingAway: isLookingAway // We don't have reliable way to detect this without more advanced models
      };
      
      checkingRef.current = false;
    } catch (error) {
      console.error("Error in face detection:", error);
      checkingRef.current = false;
    }
  }, [faceDetectionEnabled, isLookingAway]);

  // Monitor tab/window visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && faceDetectionEnabled) {
        captureFlag("tab_switch", "User switched tabs or minimized window");
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [faceDetectionEnabled, captureFlag]);

  // Start monitoring once enabled
  useEffect(() => {
    if (faceDetectionEnabled && !intervalRef.current) {
      // Run face detection every second
      intervalRef.current = setInterval(() => {
        const videoEl = document.querySelector("video");
        detectFaces(videoEl);
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [faceDetectionEnabled, detectFaces]);

  return {
    faceDetectionEnabled,
    isFaceVisible,
    multipleFacesDetected,
    isLookingAway,
    flags,
    captureFlag,
    initFaceDetection,
    stopFaceDetection,
    startMonitoring: initFaceDetection,
  };
}
