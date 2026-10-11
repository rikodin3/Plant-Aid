import React from 'react';
import { BoundingBox } from '../../types';

interface BoundingBoxOverlayProps {
  boundingBox?: BoundingBox | null;
  confidence?: number;
  isConfirmedInfection?: boolean;
  isHealthy?: boolean;
  camHeatmapB64?: string | null;
  showHeatmap?: boolean;
}

export const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  boundingBox,
  confidence = 0,
  isConfirmedInfection = false,
  isHealthy = false,
  camHeatmapB64,
  showHeatmap = false,
}) => {
  const heatmapDataUri = camHeatmapB64
    ? (camHeatmapB64.startsWith('data:') ? camHeatmapB64 : `data:image/jpeg;base64,${camHeatmapB64}`)
    : null;

  return (
    <>
      {/* Layer 2: Attention Heatmap (Grad-CAM / Hue-Distance Saliency Overlay) */}
      {showHeatmap && heatmapDataUri && (
        <img
          src={heatmapDataUri}
          alt="Lesion Attention Saliency Map"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80 mix-blend-screen transition-opacity duration-200 z-10"
        />
      )}

      {/* Layer 1: Two-Layer Lesion ROI Bounding Box */}
      {boundingBox && (
        <div
          className={`absolute pointer-events-none transition-all duration-150 rounded-lg border-2 z-20 ${
            isConfirmedInfection
              ? 'border-red-500 bg-red-500/15 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              : isHealthy
              ? 'border-emerald-500 bg-emerald-500/15'
              : 'border-amber-500 bg-amber-500/15'
          }`}
          style={{
            left: `${boundingBox.x_min * 100}%`,
            top: `${boundingBox.y_min * 100}%`,
            width: `${Math.max(1, (boundingBox.x_max - boundingBox.x_min) * 100)}%`,
            height: `${Math.max(1, (boundingBox.y_max - boundingBox.y_min) * 100)}%`,
          }}
        >
          <div
            className={`absolute left-0 px-2 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-slate-900/95 text-white border border-slate-700 whitespace-nowrap shadow-sm ${
              boundingBox.y_min < 0.14 ? 'top-1.5 ml-1.5' : '-top-7'
            }`}
          >
            {isHealthy ? 'Healthy Canopy' : `Lesion ROI: ${(confidence * 100).toFixed(0)}%`}
          </div>
        </div>
      )}
    </>
  );
};

export default BoundingBoxOverlay;
