import React from 'react';
import { BoundingBox } from '../../types';

interface BoundingBoxOverlayProps {
  boundingBox?: BoundingBox | null;
  boundingBoxes?: BoundingBox[] | null;
  confidence?: number;
  isConfirmedInfection?: boolean;
  isHealthy?: boolean;
  camHeatmapB64?: string | null;
  showHeatmap?: boolean;
}

export const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  boundingBox,
  boundingBoxes,
  confidence = 0,
  isConfirmedInfection = false,
  isHealthy = false,
  camHeatmapB64,
  showHeatmap = false,
}) => {
  const heatmapDataUri = camHeatmapB64
    ? (camHeatmapB64.startsWith('data:') ? camHeatmapB64 : `data:image/jpeg;base64,${camHeatmapB64}`)
    : null;

  // Resolve boxes: prefer boundingBoxes array if populated, otherwise fallback to single boundingBox
  const resolvedBoxes: BoundingBox[] = React.useMemo(() => {
    if (boundingBoxes && boundingBoxes.length > 0) {
      return boundingBoxes;
    }
    return boundingBox ? [boundingBox] : [];
  }, [boundingBox, boundingBoxes]);

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

      {/* Layer 1: Two-Layer Lesion ROI Bounding Box(es) */}
      {resolvedBoxes.map((box, idx) => {
        const boxConfidence = typeof box.confidence === 'number' ? box.confidence : confidence;
        return (
          <div
            key={idx}
            className={`absolute pointer-events-none transition-all duration-150 rounded-lg border-2 z-20 ${
              isConfirmedInfection
                ? 'border-red-500 bg-red-500/15 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : isHealthy
                ? 'border-emerald-500 bg-emerald-500/15'
                : 'border-amber-500 bg-amber-500/15'
            }`}
            style={{
              left: `${Math.max(0, Math.min(100, box.x_min * 100))}%`,
              top: `${Math.max(0, Math.min(100, box.y_min * 100))}%`,
              width: `${Math.max(1, Math.min(100 - Math.max(0, box.x_min * 100), (box.x_max - box.x_min) * 100))}%`,
              height: `${Math.max(1, Math.min(100 - Math.max(0, box.y_min * 100), (box.y_max - box.y_min) * 100))}%`,
            }}
          >
            <div
              className={`absolute px-2 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-slate-900/95 text-white border border-slate-700 whitespace-nowrap shadow-sm z-30 ${
                box.y_min < 0.10 ? 'top-1' : '-top-7'
              } ${box.x_min > 0.70 ? 'right-1' : 'left-0'}`}
            >
              {isHealthy
                ? 'Healthy Canopy'
                : resolvedBoxes.length > 1
                ? `${(boxConfidence * 100).toFixed(1)}%`
                : `Lesion ROI: ${(boxConfidence * 100).toFixed(1)}%`}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default BoundingBoxOverlay;
