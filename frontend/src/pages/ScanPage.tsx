import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Camera,
  Upload,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import api from '../services/api';
import { InferenceResponse, CreateHistoryPayload } from '../types';
import { TreatmentPlanModal } from '../components/treatment/TreatmentPlanModal';
import { BoundingBoxOverlay } from '../components/scan/BoundingBoxOverlay';
import { Surface } from '../components/ui/Surface';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const ScanPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialMode = queryParams.get('mode') === 'upload' ? 'upload' : 'camera';

  const [mode, setMode] = useState<'camera' | 'upload'>(initialMode);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraAspect, setCameraAspect] = useState<string>('16 / 9');

  // Scanning & Shutter workflow states
  // Default to continuous 1.5s auto-sampling per SRS §3.1 F.2
  const [autoSample, setAutoSample] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [isInFlight, setIsInFlight] = useState<boolean>(false);
  const [lastInferenceTime, setLastInferenceTime] = useState<number | null>(null);

  // Results
  const [currentResult, setCurrentResult] = useState<InferenceResponse | null>(null);
  const [frozenFrameDataUrl, setFrozenFrameDataUrl] = useState<string | null>(null);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Video / Canvas / File Input References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const modeRef = useRef<'camera' | 'upload'>(initialMode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Start Camera Stream
  const startCameraStream = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (modeRef.current !== 'camera') {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const updateAspect = () => {
          const vw = videoRef.current?.videoWidth;
          const vh = videoRef.current?.videoHeight;
          if (vw && vh) {
            setCameraAspect(`${vw} / ${vh}`);
          }
        };
        // Check if metadata is already ready synchronously
        updateAspect();
        videoRef.current.onloadedmetadata = () => {
          updateAspect();
          videoRef.current?.play().catch(() => {});
          setCameraActive(true);
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please verify camera permissions.');
      setCameraActive(false);
    }
  }, [facingMode]);

  // Stop Camera Stream
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Lifecycle for Camera Mode
  useEffect(() => {
    if (mode === 'camera') {
      startCameraStream();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [mode, startCameraStream, stopCameraStream]);

  // Switch between front/back camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Frame Capture & API Inference Cycle
  const captureAndInferFrame = useCallback(
    async (freezeOnCapture: boolean = false) => {
      if (modeRef.current !== 'camera' || !videoRef.current || !canvasRef.current || isInFlight) {
        return;
      }

      const video = videoRef.current;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        return;
      }

      const canvas = canvasRef.current;
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;

      // Keep aspect ratio strictly proportional to video feed (no squashing)
      // Limit max dimension to 640px for fast inference latency
      const maxDim = 640;
      const scale = Math.min(1.0, maxDim / Math.max(vw, vh));
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      if (freezeOnCapture) {
        setIsFrozen(true);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }

      setFrozenFrameDataUrl(dataUrl);
      setIsInFlight(true);
      const startTime = Date.now();

      try {
        const res = await api.post<InferenceResponse>('/api/inference/frame', {
          mime_type: 'image/jpeg',
          encoding: 'base64',
          image_b64: dataUrl,
          capture_timestamp: new Date().toISOString(),
        });

        // Ignore response if user switched to Upload Photo mode while frame was in flight
        if (modeRef.current !== 'camera') {
          return;
        }

        setCurrentResult(res.data);
        setIsSaved(false);
        setSaveMessage(null);
        setLastInferenceTime(Date.now() - startTime);
      } catch (err: any) {
        console.warn('Frame inference cycle skipped or rate limited', err.response?.status);
      } finally {
        setIsInFlight(false);
      }
    },
    [isInFlight]
  );

  // Resume camera stream for a new specimen
  const handleRetake = () => {
    setIsFrozen(false);
    setCurrentResult(null);
    setFrozenFrameDataUrl(null);
    setIsSaved(false);
    setSaveMessage(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.play();
    }
  };

  // Switch to Upload Photo mode cleanly without capturing or showing camera frame
  const handleSwitchToUpload = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    stopCameraStream();
    modeRef.current = 'upload';
    setMode('upload');
    setIsFrozen(false);
    setFrozenFrameDataUrl(null);
    setUploadedImageDataUrl(null);
    setCurrentResult(null);
    setIsSaved(false);
    setSaveMessage(null);
    setCameraError(null);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  // Switch to Live Camera mode cleanly
  const handleSwitchToCamera = () => {
    modeRef.current = 'camera';
    setMode('camera');
    setIsFrozen(false);
    setUploadedImageDataUrl(null);
    setCurrentResult(null);
    setIsSaved(false);
    setSaveMessage(null);
  };

  // Auto-sampling loop when autoSample toggle is active
  useEffect(() => {
    if (mode === 'camera' && cameraActive && autoSample && !isFrozen) {
      scanIntervalRef.current = setInterval(() => {
        captureAndInferFrame(false);
      }, 1500);
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [mode, cameraActive, autoSample, isFrozen, captureAndInferFrame]);

  // Handle Manual File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|png)/)) {
      setCameraError('Only JPEG and PNG foliage images are supported.');
      return;
    }

    setCameraError(null);
    setIsInFlight(true);
    setIsSaved(false);
    setSaveMessage(null);
    setCurrentResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImageDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);

    const startTime = Date.now();
    try {
      const res = await api.post<InferenceResponse>('/api/inference/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCurrentResult(res.data);
      setLastInferenceTime(Date.now() - startTime);
    } catch (err: any) {
      setCameraError('Failed to analyze uploaded foliage image. ' + (err.response?.data?.detail || ''));
    } finally {
      setIsInFlight(false);
    }
  };

  // Save Diagnosis to History
  const handleSaveDiagnosis = async () => {
    if (!currentResult) return;

    const activeImageB64 = mode === 'upload' ? uploadedImageDataUrl : frozenFrameDataUrl;

    setIsSaving(true);
    try {
      const payload: CreateHistoryPayload = {
        disease_id: currentResult.disease_name.toLowerCase().includes('healthy')
          ? 'healthy_leaf'
          : String(currentResult.disease_id),
        disease_name: currentResult.disease_name,
        confidence_score: currentResult.confidence_score ?? currentResult.confidence ?? 0,
        s3_storage_uri: currentResult.s3_storage_uri || undefined,
        image_b64: activeImageB64 || undefined,
        bounding_box: currentResult.bounding_box || undefined,
      };

      await api.post('/api/history', payload);
      setIsSaved(true);
      setSaveMessage('Detection logged to farm history record.');
    } catch (err: any) {
      console.error('Failed to log diagnosis record', err);
      setSaveMessage('Failed to save to history. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isNoPlant = Boolean(
    currentResult &&
      (currentResult.disease_id === 0 ||
        currentResult.disease_id === 'no_plant' ||
        currentResult.disease_name?.toLowerCase().includes('no groundnut plant') ||
        currentResult.disease_name?.toLowerCase().includes('no plant'))
  );

  const isHealthy =
    !isNoPlant &&
    Boolean(
      currentResult?.is_healthy_or_uncertain &&
        (currentResult?.disease_name?.toLowerCase().includes('healthy') ||
          currentResult?.disease_id === 'healthy_leaf')
    );
  const isUncertain = Boolean(currentResult && !isNoPlant && currentResult?.is_healthy_or_uncertain && !isHealthy);
  const isConfirmedInfection = Boolean(
    currentResult && !isNoPlant && !currentResult.is_healthy_or_uncertain && !isHealthy
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen bg-transparent text-slate-900 pt-2.5 pb-20 sm:py-6 px-3.5 sm:px-6 lg:px-8 font-sans"
    >
      {/* Hidden Offscreen Canvas & File Input */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="max-w-6xl mx-auto space-y-3 sm:space-y-6 pb-8">
        {/* Top Header & Tactical Instrument Switcher — Compact single line on mobile */}
        <Surface className="p-2.5 sm:p-6 md:p-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <h1 className="text-base sm:text-3xl font-bold sm:font-normal text-slate-900 tracking-tight truncate pl-1 sm:pl-0">
              Live Foliage Scanner
            </h1>

            {/* Seamless Mode Switcher Pill */}
            <div className="inline-flex items-center bg-emerald-950/5 p-1 rounded-xl backdrop-blur-xs select-none shrink-0">
              <button
                type="button"
                onClick={handleSwitchToCamera}
                className={`flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all min-h-[38px] touch-target cursor-pointer ${
                  mode === 'camera'
                    ? 'bg-white text-agri-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-agri-700 shrink-0" />
                <span className="sm:hidden">Camera</span>
                <span className="hidden sm:inline">Live Camera</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchToUpload}
                className={`flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all min-h-[38px] touch-target cursor-pointer ${
                  mode === 'upload'
                    ? 'bg-white text-agri-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-agri-700 shrink-0" />
                <span className="sm:hidden">Upload</span>
                <span className="hidden sm:inline">Upload Photo</span>
              </button>
            </div>
          </div>
        </Surface>

        {/* Main Work Area: Unified Viewfinder Station (Left) + Integrated Diagnostic Panel (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6 items-start">
          {/* Left Viewfinder Station (7 Cols) - Unified Hardware Console */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-4">
            <div
              className={`relative rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col transition-colors duration-300 ${
                mode === 'camera'
                  ? 'bg-slate-950 border border-emerald-950/20 shadow-xl'
                  : 'bg-gradient-to-br from-[#edf4ed] via-[#f7faf7] to-white border border-emerald-950/10 shadow-[0_8px_30px_rgb(20,83,45,0.06)]'
              }`}
            >
              {mode === 'camera' ? (
                <>
                  {/* Dedicated Optical Stage — Matches camera stream aspect ratio 1:1 with zero letterboxing */}
                  <div
                    className="relative w-full overflow-hidden bg-slate-950 flex items-center justify-center transition-all duration-300"
                    style={{ aspectRatio: cameraAspect }}
                  >
                    {/* Active Video Stream */}
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      onLoadedMetadata={(e) => {
                        const video = e.currentTarget;
                        if (video.videoWidth && video.videoHeight) {
                          setCameraAspect(`${video.videoWidth} / ${video.videoHeight}`);
                        }
                      }}
                      className={`w-full h-full object-cover ${isFrozen ? 'hidden' : 'block'}`}
                    />

                    {/* Frozen Frame View */}
                    {isFrozen && frozenFrameDataUrl && (
                      <img
                        src={frozenFrameDataUrl}
                        alt="Frozen leaf specimen"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Tactical Corner Crosshairs for Leaf Framing */}
                    <div className="absolute inset-3.5 sm:inset-6 pointer-events-none border border-white/20 rounded-2xl">
                      <div className="absolute -top-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-l-2 border-agri-400" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-r-2 border-agri-400" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-l-2 border-agri-400" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-r-2 border-agri-400" />
                    </div>

                    {/* Bounding Box / Two-layer Localization Overlay */}
                    <BoundingBoxOverlay
                      boundingBox={isNoPlant ? null : currentResult?.bounding_box}
                      boundingBoxes={isNoPlant ? null : currentResult?.bounding_boxes}
                      confidence={currentResult?.confidence || currentResult?.confidence_score || 0}
                      isConfirmedInfection={Boolean(isConfirmedInfection)}
                      isHealthy={Boolean(isHealthy)}
                      camHeatmapB64={isNoPlant ? null : currentResult?.cam_heatmap_b64}
                      showHeatmap={showHeatmap && isFrozen && !isNoPlant}
                    />

                    {/* Top Status Pill Bar */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 pointer-events-none flex items-center space-x-1.5 sm:space-x-2 z-30">
                      <span
                        className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide backdrop-blur-md border flex items-center space-x-1.5 ${
                          isInFlight
                            ? 'bg-amber-950/85 text-amber-300 border-amber-600/60'
                            : isFrozen
                            ? 'bg-slate-900/90 text-slate-100 border-slate-700'
                            : autoSample
                            ? 'bg-emerald-950/85 text-emerald-300 border-emerald-600/60'
                            : 'bg-slate-900/85 text-slate-300 border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isInFlight
                              ? 'bg-amber-400 animate-ping'
                              : isFrozen
                              ? 'bg-blue-400'
                              : autoSample
                              ? 'bg-emerald-400 animate-pulse'
                              : 'bg-slate-500'
                          }`}
                        />
                        <span>
                          {isInFlight
                            ? 'Analyzing...'
                            : isFrozen
                            ? 'Frame Frozen'
                            : autoSample
                            ? 'Live 1.5s Active'
                            : 'Camera Ready'}
                        </span>
                      </span>

                      {lastInferenceTime && (
                        <span className="px-2 py-1 rounded-full text-[11px] sm:text-xs font-mono bg-slate-900/80 text-slate-300 border border-slate-700 backdrop-blur-md">
                          {lastInferenceTime}ms
                        </span>
                      )}
                    </div>

                    {/* Switch Camera Button (Top Right) — 44x44px touch target */}
                    <button
                      onClick={switchCamera}
                      className="absolute top-3 right-3 sm:top-4 sm:right-4 h-11 w-11 flex items-center justify-center rounded-full bg-slate-900/85 text-white border border-slate-700 hover:bg-slate-800 transition-colors backdrop-blur-md touch-target shadow-md z-30 cursor-pointer"
                      title="Switch camera"
                      aria-label="Switch camera"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tactical Shutter Dock — Positioned cleanly below optical stage so it never obscures live feed or bounding boxes */}
                  <div className="relative bg-slate-950/95 border-t border-white/10 p-2.5 sm:p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shadow-lg z-30">
                    <div className="flex items-center">
                      {isFrozen ? (
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={handleRetake}
                          className="w-full sm:w-auto min-h-[42px] sm:min-h-[38px] bg-white/95 text-slate-900 hover:bg-white font-bold"
                        >
                          <RotateCcw className="w-4 h-4 text-agri-700" />
                          <span>Resume Stream</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => captureAndInferFrame(true)}
                          disabled={isInFlight}
                          className="w-full sm:w-auto min-h-[42px] sm:min-h-[38px] bg-agri-600 hover:bg-agri-700 text-white font-bold"
                        >
                          <Camera className="w-4 h-4" />
                          <span>{isInFlight ? 'Processing...' : 'Freeze & Detect'}</span>
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:flex items-center gap-2 text-xs text-slate-300">
                      <button
                        type="button"
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className={`min-h-[38px] sm:min-h-[36px] px-3 py-1.5 rounded-xl font-bold border transition-colors text-center cursor-pointer ${
                          showHeatmap
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                        title="Toggle Layer 2 attention saliency map (active on freeze-frame or upload)"
                      >
                        Heatmap: {showHeatmap ? 'ON' : 'OFF'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isFrozen) setIsFrozen(false);
                          setAutoSample(!autoSample);
                        }}
                        className={`min-h-[38px] sm:min-h-[36px] px-3 py-1.5 rounded-xl font-bold border transition-colors text-center cursor-pointer ${
                          autoSample
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        1.5s Stream: {autoSample ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Upload Mode Viewport */
                <div className="flex-1 w-full flex flex-col items-center justify-center text-center relative">
                  {uploadedImageDataUrl ? (
                    <>
                      <div className="relative w-full flex items-center justify-center p-2.5 sm:p-6 sm:pb-16 min-h-[320px]">
                        <div className="relative inline-block max-w-full max-h-[65vh] rounded-2xl overflow-hidden shadow-md border border-emerald-950/10 bg-white/50">
                          <img
                            src={uploadedImageDataUrl}
                            alt="Uploaded leaf"
                            className="max-w-full max-h-[65vh] w-auto h-auto block object-contain"
                          />
                          <BoundingBoxOverlay
                            boundingBox={isNoPlant ? null : currentResult?.bounding_box}
                            boundingBoxes={isNoPlant ? null : currentResult?.bounding_boxes}
                            confidence={currentResult?.confidence || currentResult?.confidence_score || 0}
                            isConfirmedInfection={Boolean(isConfirmedInfection)}
                            isHealthy={Boolean(isHealthy)}
                            camHeatmapB64={isNoPlant ? null : currentResult?.cam_heatmap_b64}
                            showHeatmap={showHeatmap && !isNoPlant}
                          />
                        </div>
                      </div>

                      {/* Bottom Upload Control Dock */}
                      <div className="w-full sm:w-auto sm:absolute sm:bottom-3 sm:inset-x-3 bg-white/95 backdrop-blur-md border-t sm:border border-emerald-950/10 sm:rounded-2xl p-2.5 sm:p-3 flex flex-row items-center justify-between gap-2 sm:gap-3 shadow-md z-30">
                        <Button
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isInFlight}
                          className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-[38px] bg-agri-700 hover:bg-agri-800 text-white font-bold"
                        >
                          <Upload className="w-4 h-4" />
                          <span>{isInFlight ? 'Analyzing...' : 'Upload Another'}</span>
                        </Button>

                        <button
                          type="button"
                          onClick={() => setShowHeatmap(!showHeatmap)}
                          className={`min-h-[40px] sm:min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                            showHeatmap
                              ? 'bg-[#edf4ed] text-agri-800 border-agri-600/30'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          Heatmap: {showHeatmap ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full py-6 px-3.5 sm:aspect-[4/3] sm:min-h-[280px] flex items-center justify-center sm:p-8">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer flex flex-col items-center justify-center space-y-3 sm:space-y-4 p-5 sm:p-10 border-2 border-dashed border-agri-600/30 bg-white/90 rounded-2xl sm:rounded-3xl hover:border-agri-700 hover:bg-white transition-all shadow-sm max-w-md w-full group"
                      >
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#edf4ed] text-agri-800 flex items-center justify-center border border-emerald-950/10 group-hover:scale-105 transition-transform">
                          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-agri-700" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm sm:text-lg font-bold text-slate-900">
                            Upload Groundnut Foliage Photo
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            Select a clear leaf photo from your device (JPEG or PNG)
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 min-h-[42px] sm:min-h-[44px] rounded-xl bg-agri-700 group-hover:bg-agri-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>Browse Device Photos</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm flex items-start space-x-3">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Scanner Notice</div>
                  <div>{cameraError}</div>
                </div>
              </div>
            )}
          </div>

          {/* Unified Diagnosis Console Surface (5 Cols on Desktop, Compact Single Sheet on Mobile) */}
          <div className="lg:col-span-5">
            <Surface className="p-3.5 sm:p-6 md:p-8 space-y-3.5 sm:space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-950/10 pb-2.5 sm:pb-4">
                <div className="space-y-0.5">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Detection Reading</h2>
                  <p className="hidden sm:block text-xs text-slate-500">Real-time disease detection</p>
                </div>

                {currentResult && (
                  <Badge
                    variant={
                      isNoPlant
                        ? 'secondary'
                        : isHealthy
                        ? 'optimal'
                        : isConfirmedInfection
                        ? 'destructive'
                        : 'warning'
                    }
                  >
                    {isNoPlant
                      ? 'No Plant Detected'
                      : isHealthy
                      ? 'Healthy Leaf'
                      : isConfirmedInfection
                      ? 'Condition Detected'
                      : 'Low Confidence'}
                  </Badge>
                )}
              </div>

              {currentResult ? (
                <div className="space-y-3.5 sm:space-y-6">
                  {isNoPlant ? (
                    /* No Plant Detected State */
                    <div className="space-y-3 sm:space-y-4">
                      <div className="space-y-1">
                        <div className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                          No groundnut plant seen
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          Point your camera 15–30 cm from groundnut foliage in clear lighting so the leaf fills the center frame.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Primary Disease Title */}
                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                          {currentResult.disease_name}
                        </div>
                        {currentResult.scientific_name && (
                          <div className="text-xs italic text-agri-800 font-mono">
                            {currentResult.scientific_name}
                          </div>
                        )}
                      </div>

                      {/* Confidence Meter */}
                      <div className="space-y-1.5 sm:space-y-2 bg-white/75 sm:bg-white/60 p-3 sm:p-4 rounded-xl border border-emerald-950/10">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-700">Confidence</span>
                          <span className="font-mono text-agri-800 text-sm font-bold">
                            {(currentResult.confidence_score * 100).toFixed(1)}%
                          </span>
                        </div>

                        <div className="w-full h-2.5 sm:h-3 bg-slate-200/80 rounded-full overflow-hidden relative">
                          {/* Threshold Marker at 55% */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-600 z-10"
                            style={{ left: '55%' }}
                            title="Confidence Threshold (55%)"
                          />
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              currentResult.confidence_score >= 0.55 ? 'bg-agri-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, currentResult.confidence_score * 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 font-mono pt-0.5">
                          <span>0%</span>
                          <span className="text-slate-700 font-semibold">55% threshold</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Calibration Advice Notice */}
                      {isUncertain && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <div className="font-bold">Low-Confidence Reading (&lt; 55%)</div>
                            <p className="text-xs leading-relaxed text-amber-950">
                              Hold your device steady in bright light and center the leaf before deciding on treatment.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons: Side-by-side on mobile, stacked on desktop */}
                      <div className="space-y-2 pt-1 sm:pt-2">
                        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-3">
                          <Button
                            onClick={handleSaveDiagnosis}
                            disabled={isSaving || isSaved}
                            size="lg"
                            className={`w-full font-bold shadow-md min-h-[44px] sm:min-h-[48px] text-xs sm:text-sm px-3 sm:px-5 ${
                              isSaved ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-agri-700 hover:bg-agri-800'
                            }`}
                          >
                            {isSaving ? (
                              <span>Saving...</span>
                            ) : isSaved ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
                                <span className="sm:hidden">Saved</span>
                                <span className="hidden sm:inline">Detection Logged to History</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                <span className="sm:hidden">Save to History</span>
                                <span className="hidden sm:inline">Save Detection to History</span>
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => setModalOpen(true)}
                            variant="outline"
                            className="w-full text-xs sm:text-sm font-semibold min-h-[44px] px-3 sm:px-4"
                          >
                            <Layers className="w-4 h-4 text-agri-700 shrink-0" />
                            <span className="sm:hidden">Remedies</span>
                            <span className="hidden sm:inline">
                              {isHealthy ? 'View Foliage Maintenance Tips' : 'Inspect Organic & Chemical Remedies'}
                            </span>
                            <ExternalLink className="hidden sm:inline w-3.5 h-3.5 ml-1 text-slate-500 shrink-0" />
                          </Button>
                        </div>

                        {saveMessage && (
                          <p
                            className={`text-center text-xs sm:text-sm font-semibold ${
                              isSaved ? 'text-emerald-800' : 'text-rose-700'
                            }`}
                          >
                            {saveMessage}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Empty Waiting State */
                <div className="py-6 sm:py-16 text-center space-y-2.5 sm:space-y-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/80 text-agri-700 flex items-center justify-center mx-auto border border-emerald-950/10 shadow-xs">
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm sm:text-base font-bold text-slate-900">Awaiting Foliage Specimen</div>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
                      Frame groundnut leaves inside the crosshairs and tap &quot;Freeze &amp; Detect&quot; to inspect.
                    </p>
                  </div>
                </div>
              )}
            </Surface>
          </div>
        </div>
      </div>

      {/* Full Treatment Plan Modal */}
      {currentResult && (
        <TreatmentPlanModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          diseaseName={currentResult.disease_name}
          diseaseId={String(currentResult.disease_id)}
          scientificName={currentResult.scientific_name}
          confidenceScore={currentResult.confidence_score}
          remedies={currentResult.remedies || []}
        />
      )}
    </motion.div>
  );
};

export default ScanPage;
