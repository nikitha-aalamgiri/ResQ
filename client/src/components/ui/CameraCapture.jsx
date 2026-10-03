import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, X, AlertCircle, Upload, Check } from 'lucide-react';
import { Button } from './Button';
import { useLang } from '../../context/LangContext';

/**
 * Compresses an image source (video frame or image) to JPEG max 1280px dimension at 0.8 quality
 */
export function compressFrameToJpeg(source, maxDimension = 1280, quality = 0.8) {
  const canvas = document.createElement('canvas');
  let width = source.videoWidth || source.naturalWidth || source.width || 640;
  let height = source.videoHeight || source.naturalHeight || source.height || 480;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve({ dataUrl, blob, width, height });
      },
      'image/jpeg',
      quality
    );
  });
}

export const CameraCapture = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Take Photo',
}) => {
  const { t } = useLang?.() || { t: (k) => k };
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fallbackInputRef = useRef(null);

  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [capturedData, setCapturedData] = useState(null);

  // Stop camera stream safely
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Check if multiple camera devices exist
  const checkMultipleCameras = async () => {
    try {
      if (navigator?.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }
    } catch (e) {
      setHasMultipleCameras(false);
    }
  };

  // Start video stream
  const startCamera = async (mode = facingMode) => {
    stopStream();
    setCameraError(null);
    setIsLoading(true);

    // Check secure context and mediaDevices availability
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setIsLoading(false);
      setCameraError(
        t('camera.insecureContext') ||
          'Camera access requires a secure connection (HTTPS) or is not supported in this browser. Please upload a photo instead.'
      );
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setIsLoading(false);
      checkMultipleCameras();
    } catch (err) {
      console.warn('getUserMedia error:', err);
      setIsLoading(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          t('camera.permissionDenied') ||
            'Camera permission was denied. Please allow camera permissions in your browser or use the file upload option.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError(
          t('camera.noDeviceFound') ||
            'No camera found on this device. Please upload an image file instead.'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError(
          t('camera.cameraInUse') ||
            'Camera is in use by another application. Please close other camera apps and retry, or upload a photo.'
        );
      } else {
        setCameraError(
          err.message ||
            t('camera.genericError') ||
            'Unable to start camera. Please upload a photo directly.'
        );
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      setCapturedData(null);
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedPreview(null);
      setCapturedData(null);
      setCameraError(null);
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Switch camera front/back
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture current video frame
  const handleCapture = async () => {
    if (!videoRef.current) return;
    try {
      const result = await compressFrameToJpeg(videoRef.current, 1280, 0.8);
      setCapturedPreview(result.dataUrl);
      setCapturedData(result);
    } catch (err) {
      console.error('Frame capture failed:', err);
    }
  };

  // Confirm capture
  const handleConfirm = () => {
    if (capturedData && onCapture) {
      onCapture(capturedData.dataUrl, capturedData.blob);
      onClose();
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPreview(null);
    setCapturedData(null);
  };

  // Fallback file input handler (e.g. if camera denied or insecure context)
  const handleFallbackFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(t('camera.invalidFile') || 'Please select a valid image file (PNG/JPG)');
      return;
    }

    try {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (re) => {
        img.onload = async () => {
          const result = await compressFrameToJpeg(img, 1280, 0.8);
          if (onCapture) {
            onCapture(result.dataUrl, result.blob);
          }
          onClose();
        };
        img.src = re.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Fallback compression failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-surface max-w-lg w-full rounded-xl border border-app-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#FAF9F6] border-b border-app-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-deep" />
            <h3 className="font-bold text-navy-ink text-sm sm:text-base">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera"
            className="p-1 rounded-md text-muted-text hover:text-navy-ink hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative bg-black flex items-center justify-center min-h-[300px] sm:min-h-[360px] overflow-hidden select-none">
          {cameraError ? (
            <div className="p-6 text-center text-white space-y-3 max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-xs text-white/90 leading-relaxed font-sans">
                {cameraError}
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={Upload}
                  onClick={() => fallbackInputRef.current?.click()}
                  className="w-full bg-teal-deep hover:bg-teal-light text-white"
                >
                  {t('camera.uploadFallback') || 'Select Image From Device'}
                </Button>
                <input
                  ref={fallbackInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFallbackFile}
                  className="hidden"
                />
              </div>
            </div>
          ) : capturedPreview ? (
            <div className="w-full h-full relative">
              <img
                src={capturedPreview}
                alt="Captured scene"
                className="w-full h-[320px] sm:h-[380px] object-contain bg-black"
              />
              <div className="absolute top-3 left-3 bg-black/60 px-2.5 py-1 rounded text-[11px] font-mono text-white flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('camera.previewReady') || 'Photo Captured (Compressed 1280px)'}</span>
              </div>
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-[320px] sm:h-[380px] object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {isLoading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
                  <RefreshCw className="w-6 h-6 animate-spin text-teal-light" />
                  <span className="text-xs font-mono">{t('camera.initializing') || 'Starting camera sensor...'}</span>
                </div>
              )}

              {/* Camera Switcher (If multiple cameras present) */}
              {hasMultipleCameras && !isLoading && (
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  aria-label="Switch front and back camera"
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors shadow-md"
                  title="Switch Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              {/* Mode indicator */}
              <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded text-[11px] font-mono text-white/90">
                {facingMode === 'environment'
                  ? t('camera.backLens') || 'Back Lens (Field)'
                  : t('camera.frontLens') || 'Front Lens (Self)'}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-3 sm:p-4 bg-surface border-t border-app-border flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            {t('common.cancel') || 'Cancel'}
          </Button>

          <div className="flex items-center gap-2">
            {capturedPreview ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetake}
                >
                  {t('camera.retake') || 'Retake'}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={Check}
                  onClick={handleConfirm}
                >
                  {t('camera.usePhoto') || 'Use Photo'}
                </Button>
              </>
            ) : !cameraError ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                icon={Camera}
                disabled={isLoading}
                onClick={handleCapture}
                className="font-bold px-5"
              >
                {t('camera.capture') || 'Capture Photo'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
