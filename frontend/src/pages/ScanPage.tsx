import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Upload,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Layers,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Eye,
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
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
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
      canvas.width = 640;
      canvas.height = 480;
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
      alert('Only JPEG and PNG foliage images are supported.');
      return;
    }

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
      alert('Failed to analyze uploaded foliage image. ' + (err.response?.data?.detail || ''));
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
      setSaveMessage('Diagnosis logged to farm history record.');
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
      className="min-h-screen bg-transparent text-slate-900 py-6 px-4 sm:px-6 lg:px-8 font-sans"
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

      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-16 sm:pb-8">
        {/* Top Header & Tactical Instrument Switcher */}
        <Surface className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-agri-800 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-agri-600 shrink-0" />
                <span>Groundnut Health Scanner</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-normal text-slate-900 tracking-tight">
                Live Foliage Scanner
              </h1>
            </div>

            {/* Seamless Mode Switcher Pill — Full-width 2-col on mobile */}
            <div className="grid grid-cols-2 sm:inline-flex items-center bg-emerald-950/5 p-1 rounded-xl backdrop-blur-xs select-none w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSwitchToCamera}
                className={`flex items-center justify-center space-x-2 px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] sm:min-h-[38px] touch-target cursor-pointer ${
                  mode === 'camera'
                    ? 'bg-white text-agri-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4 text-agri-700 shrink-0" />
                <span>Live Camera</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchToUpload}
                className={`flex items-center justify-center space-x-2 px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] sm:min-h-[38px] touch-target cursor-pointer ${
                  mode === 'upload'
                    ? 'bg-white text-agri-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-4 h-4 text-agri-700 shrink-0" />
                <span>Upload Photo</span>
              </button>
            </div>
          </div>
        </Surface>

        {/* Main Work Area: Unified Viewfinder Station (Left) + Integrated Diagnostic Panel (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Left Viewfinder Station (7 Cols) - Unified Hardware Console */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
            <div
              className={`relative rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col transition-colors duration-300 ${
                mode === 'camera'
                  ? 'bg-slate-950 border border-emerald-950/20 shadow-xl'
                  : 'bg-gradient-to-br from-[#edf4ed] via-[#f7faf7] to-white border border-emerald-950/10 shadow-[0_8px_30px_rgb(20,83,45,0.06)]'
              }`}
            >
              {mode === 'camera' ? (
                <>
                  {/* Dedicated 4:3 Optical Stage — 100% unobstructed on mobile */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-950">
                    {/* Active Video Stream */}
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className={`w-full h-full object-contain ${isFrozen ? 'hidden' : 'block'}`}
                    />

                    {/* Frozen Frame View */}
                    {isFrozen && frozenFrameDataUrl && (
                      <img
                        src={frozenFrameDataUrl}
                        alt="Frozen leaf specimen"
                        className="w-full h-full object-contain"
                      />
                    )}

                    {/* Tactical Corner Crosshairs for Leaf Framing */}
                    <div className="absolute inset-4 sm:inset-6 pointer-events-none border border-white/20 rounded-2xl">
                      <div className="absolute -top-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-l-2 border-agri-400" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-r-2 border-agri-400" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-l-2 border-agri-400" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-r-2 border-agri-400" />
                    </div>

                    {/* Bounding Box / Two-layer Localization Overlay */}
                    <BoundingBoxOverlay
                      boundingBox={isNoPlant ? null : currentResult?.bounding_box}
                      confidence={currentResult?.confidence || currentResult?.confidence_score || 0}
                      isConfirmedInfection={Boolean(isConfirmedInfection)}
                      isHealthy={Boolean(isHealthy)}
                      camHeatmapB64={isNoPlant ? null : currentResult?.cam_heatmap_b64}
                      showHeatmap={showHeatmap && isFrozen && !isNoPlant}
                    />

                    {/* Top Status Pill Bar */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 pointer-events-none flex items-center space-x-2 z-30">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide backdrop-blur-md border flex items-center space-x-1.5 ${
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
                        <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-xs font-mono bg-slate-900/80 text-slate-300 border border-slate-700 backdrop-blur-md">
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

                  {/* Tactical Shutter Dock — Stacked cleanly below video on mobile, floating overlay on sm+ */}
                  <div className="sm:absolute sm:bottom-3 sm:inset-x-3 bg-slate-950/95 sm:bg-slate-950/85 backdrop-blur-md border-t sm:border border-white/10 sm:rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shadow-lg z-30">
                    <div className="flex items-center">
                      {isFrozen ? (
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={handleRetake}
                          className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] bg-white/95 text-slate-900 hover:bg-white font-bold"
                        >
                          <RotateCcw className="w-4 h-4 text-agri-700" />
                          <span>Resume Stream</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => captureAndInferFrame(true)}
                          disabled={isInFlight}
                          className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] bg-agri-600 hover:bg-agri-700 text-white font-bold"
                        >
                          <Camera className="w-4 h-4" />
                          <span>{isInFlight ? 'Processing...' : 'Freeze & Diagnose'}</span>
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:flex items-center gap-2 text-xs text-slate-300">
                      <button
                        type="button"
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className={`min-h-[40px] sm:min-h-[36px] px-3 py-1.5 rounded-xl font-bold border transition-colors text-center cursor-pointer ${
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
                        className={`min-h-[40px] sm:min-h-[36px] px-3 py-1.5 rounded-xl font-bold border transition-colors text-center cursor-pointer ${
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
                /* Upload Mode Viewport — Botanical Frosted-Glass Theme */
                <div className="flex-1 w-full flex flex-col items-center justify-center text-center relative">
                  {uploadedImageDataUrl ? (
                    <>
                      <div className="relative w-full aspect-[4/3] flex items-center justify-center p-3 sm:p-6 sm:pb-16">
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={uploadedImageDataUrl}
                            alt="Uploaded leaf"
                            className="w-full h-full object-contain rounded-2xl shadow-md border border-emerald-950/10 bg-white/50"
                          />
                          <BoundingBoxOverlay
                            boundingBox={isNoPlant ? null : currentResult?.bounding_box}
                            confidence={currentResult?.confidence || currentResult?.confidence_score || 0}
                            isConfirmedInfection={Boolean(isConfirmedInfection)}
                            isHealthy={Boolean(isHealthy)}
                            camHeatmapB64={isNoPlant ? null : currentResult?.cam_heatmap_b64}
                            showHeatmap={showHeatmap && !isNoPlant}
                          />
                        </div>
                      </div>

                      {/* Bottom Upload Control Dock — Attached on mobile, floating bar on sm+ */}
                      <div className="w-full sm:w-auto sm:absolute sm:bottom-3 sm:inset-x-3 bg-white/95 backdrop-blur-md border-t sm:border border-emerald-950/10 sm:rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shadow-md z-30">
                        <Button
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isInFlight}
                          className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] bg-agri-700 hover:bg-agri-800 text-white font-bold"
                        >
                          <Upload className="w-4 h-4" />
                          <span>{isInFlight ? 'Analyzing...' : 'Upload Another Photo'}</span>
                        </Button>

                        <button
                          type="button"
                          onClick={() => setShowHeatmap(!showHeatmap)}
                          className={`min-h-[40px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
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
                    <div className="w-full aspect-[4/3] min-h-[280px] flex items-center justify-center p-4 sm:p-8">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer flex flex-col items-center justify-center space-y-3.5 sm:space-y-4 p-6 sm:p-10 border-2 border-dashed border-agri-600/30 bg-white/90 rounded-2xl sm:rounded-3xl hover:border-agri-700 hover:bg-white transition-all shadow-sm max-w-md w-full group"
                      >
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#edf4ed] text-agri-800 flex items-center justify-center border border-emerald-950/10 group-hover:scale-105 transition-transform">
                          <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-agri-700" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-base sm:text-lg font-bold text-slate-900">
                            Upload Groundnut Foliage Photo
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            Select a clear leaf photo from your device (JPEG or PNG)
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-agri-700 group-hover:bg-agri-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>Browse Device Photos</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Live Telemetry Quick-Strip — Visible above the fold on mobile (<lg) when a result is present */}
            {currentResult && (
              <div className="lg:hidden rounded-2xl bg-white/90 backdrop-blur-md border border-emerald-950/10 p-3.5 shadow-sm flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isNoPlant
                          ? 'bg-slate-400'
                          : isHealthy
                          ? 'bg-emerald-500'
                          : isConfirmedInfection
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {isNoPlant ? 'No groundnut plant seen' : currentResult.disease_name}
                    </span>
                  </div>
                  {!isNoPlant && (
                    <div className="text-xs text-slate-600 font-mono pl-4.5">
                      {(currentResult.confidence_score * 100).toFixed(1)}% confidence
                    </div>
                  )}
                </div>
                {!isNoPlant && (
                  <Button
                    size="sm"
                    onClick={() => setModalOpen(true)}
                    className="shrink-0 min-h-[40px] bg-agri-700 hover:bg-agri-800 text-white text-xs font-bold px-3.5"
                  >
                    <span>Remedies</span>
                  </Button>
                )}
              </div>
            )}

            {cameraError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm flex items-start space-x-3">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Camera Connection Issue</div>
                  <div>{cameraError}</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Diagnosis Console Surface (5 Cols) */}
          <div className="lg:col-span-5">
            <Surface className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-950/10 pb-4">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold text-slate-900">Diagnostic Reading</h2>
                  <p className="text-xs text-slate-500">Real-time disease detection</p>
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
                <div className="space-y-5 sm:space-y-6">
                  {isNoPlant ? (
                    /* No Plant Detected State */
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                          Detection Status
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                          No groundnut plant seen
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed pt-1">
                          No groundnut leaf foliage was detected in the frame. Point your camera directly at groundnut leaves with clear lighting to analyze health.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs sm:text-sm flex items-start space-x-3">
                        <Camera className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800">Framing Advice</div>
                          <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                            Hold the camera 15–30 cm from the foliage and ensure the groundnut leaf fills the center of the camera view.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Primary Disease Title */}
                      <div className="space-y-1">
                        <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                          Identified Condition
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                          {currentResult.disease_name}
                        </div>
                        {currentResult.scientific_name && (
                          <div className="text-xs italic text-agri-800 font-mono">
                            {currentResult.scientific_name}
                          </div>
                        )}
                      </div>

                      {/* Confidence Meter */}
                      <div className="space-y-2 bg-white/60 p-4 rounded-xl border border-emerald-950/5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-700">Confidence</span>
                          <span className="font-mono text-agri-800 text-sm font-bold">
                            {(currentResult.confidence_score * 100).toFixed(1)}%
                          </span>
                        </div>

                        <div className="w-full h-3 bg-slate-200/80 rounded-full overflow-hidden relative">
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

                        <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1">
                          <span>0%</span>
                          <span className="text-slate-700 font-semibold">55% threshold</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Calibration Advice Notice */}
                      {isUncertain && (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm flex items-start space-x-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-bold">Low-Confidence Reading (&lt; 55%)</div>
                            <p className="text-xs sm:text-sm leading-relaxed text-amber-950">
                              Hold your device steady, verify bright outdoor illumination, and frame the leaf in the center before deciding on treatment.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons: Save & View Remedies */}
                      <div className="space-y-3 pt-2">
                        <Button
                          onClick={handleSaveDiagnosis}
                          disabled={isSaving || isSaved}
                          size="lg"
                          className={`w-full font-bold shadow-md min-h-[48px] ${
                            isSaved ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-agri-700 hover:bg-agri-800'
                          }`}
                        >
                          {isSaving ? (
                            <span>Logging Record...</span>
                          ) : isSaved ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-white" />
                              <span>Diagnosis Logged to History</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-5 h-5" />
                              <span>Save Diagnosis to History</span>
                            </>
                          )}
                        </Button>

                        {saveMessage && (
                          <p
                            className={`text-center text-xs sm:text-sm font-semibold ${
                              isSaved ? 'text-emerald-800' : 'text-rose-700'
                            }`}
                          >
                            {saveMessage}
                          </p>
                        )}

                        <Button
                          onClick={() => setModalOpen(true)}
                          variant="outline"
                          className="w-full text-xs sm:text-sm font-semibold min-h-[44px]"
                        >
                          <Layers className="w-4 h-4 text-agri-700 shrink-0" />
                          <span>
                            {isHealthy ? 'View Foliage Maintenance Tips' : 'Inspect Organic & Chemical Remedies'}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 ml-1 text-slate-500 shrink-0" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Empty Waiting State */
                <div className="py-12 sm:py-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/60 text-agri-700 flex items-center justify-center mx-auto border border-emerald-950/10 shadow-xs">
                    <Camera className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm sm:text-base font-bold text-slate-900">Awaiting Foliage Specimen</div>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
                      Frame groundnut leaves inside the corner crosshairs and tap &quot;Freeze &amp; Diagnose&quot; to inspect.
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
