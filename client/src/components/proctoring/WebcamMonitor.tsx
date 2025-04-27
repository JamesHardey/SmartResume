import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProctoring } from "@/hooks/useProctoring";
import { 
  AlertCircleIcon, 
  CheckCircleIcon, 
  VideoIcon, 
  VideoOffIcon 
} from "lucide-react";

interface WebcamMonitorProps {
  onApprove: () => void;
  setup?: boolean;
}

export function WebcamMonitor({ onApprove, setup = false }: WebcamMonitorProps) {
  const webcamRef = useRef<Webcam>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [setupCompleted, setSetupCompleted] = useState(false);
  
  const { 
    faceDetectionEnabled, 
    isFaceVisible, 
    multipleFacesDetected,
    initFaceDetection,
    stopFaceDetection,
    captureFlag
  } = useProctoring();

  // Enable/disable webcam
  const toggleWebcam = async () => {
    if (webcamEnabled) {
      stopFaceDetection();
      setWebcamEnabled(false);
      setSetupCompleted(false);
      return;
    }

    try {
      // Request webcam permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      
      // Clean up the stream to avoid permission issues
      stream.getTracks().forEach(track => track.stop());
      
      setWebcamEnabled(true);
      setWebcamError(null);
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setWebcamError("Could not access webcam. Please check permissions and try again.");
    }
  };

  // Initialize face detection when webcam is enabled
  useEffect(() => {
    if (webcamEnabled && !faceDetectionEnabled) {
      initFaceDetection();
    }
  }, [webcamEnabled, faceDetectionEnabled, initFaceDetection]);

  // Track face detection for setup progress
  useEffect(() => {
    if (!setup || !webcamEnabled || setupCompleted) return;
    
    if (isFaceVisible) {
      setFaceDetected(true);
      setDetectionProgress(prev => {
        const newProgress = Math.min(prev + 20, 100);
        if (newProgress === 10 && !setupCompleted) {
          setSetupCompleted(true);
          onApprove();
        }
        return newProgress;
      });
    } else {
      setFaceDetected(false);
    }
  }, [isFaceVisible, webcamEnabled, setup, setupCompleted, onApprove]);

  // Check for potential violations every second during monitoring (not setup)
  useEffect(() => {
    if (!webcamEnabled || setup) return;
    
    const checkInterval = setInterval(() => {
      // No face detected
      if (!isFaceVisible) {
        captureFlag('no_face', 'No face detected in webcam frame');
      }
      
      // Multiple faces detected
      if (multipleFacesDetected) {
        captureFlag('multiple_faces', 'Multiple faces detected in webcam frame');
      }
    }, 1000);
    
    return () => clearInterval(checkInterval);
  }, [webcamEnabled, setup, isFaceVisible, multipleFacesDetected, captureFlag]);

  return (
    <div className="space-y-3">
      {!webcamEnabled && (
        <div className="flex justify-center mb-4">
          <Button
            onClick={toggleWebcam}
            className="flex items-center"
          >
            <VideoIcon className="mr-2 h-4 w-4" />
            Enable Webcam
          </Button>
        </div>
      )}

      {webcamError && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>{webcamError}</AlertDescription>
        </Alert>
      )}

      <div className={`relative ${webcamEnabled ? 'bg-gray-800' : 'bg-gray-200'} rounded-md flex items-center justify-center`} style={{ height: setup ? '320px' : '240px' }}>
        {webcamEnabled ? (
          <>
            <Webcam
              ref={webcamRef}
              audio={false}
              mirrored={true}
              className="h-full w-full object-cover rounded-md"
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 320,
                height: 320,
                facingMode: "user"
              }}
            />
            <div className="absolute bottom-2 right-2">
              {setup ? (
                faceDetected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Face Detected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    <AlertCircleIcon className="h-3 w-3 mr-1" />
                    Position your face
                  </span>
                )
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircleIcon className="h-2 w-2 mr-1" />
                  Monitoring
                </span>
              )}
            </div>
            
            {setup && (
              <div className="absolute bottom-10 left-2 right-2">
                <Progress value={detectionProgress} className="h-1.5 bg-gray-200/50" />
              </div>
            )}
            
            {webcamEnabled && (
              <Button
                onClick={toggleWebcam}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 bg-black/20 hover:bg-black/40 text-white p-1.5 h-auto rounded-full"
              >
                <VideoOffIcon className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <div className="text-gray-500 text-sm">Webcam preview will appear here</div>
        )}
      </div>

      {setup && webcamEnabled && !setupCompleted && (
        <div className="text-center text-sm text-muted-foreground">
          {faceDetected ? (
            "Hold still while we verify your face..."
          ) : (
            "Please position your face in the center of the frame"
          )}
        </div>
      )}

      {setup && setupCompleted && (
        <div className="text-center text-sm flex items-center justify-center text-green-600">
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          Webcam setup completed
        </div>
      )}
    </div>
  );
}

export default WebcamMonitor;
