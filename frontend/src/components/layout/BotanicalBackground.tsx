import React from 'react';

export const BotanicalBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#e8f6f6]"
      aria-hidden="true"
    >
      {/* Subtle soft gradient background overlay matching #D9F2F2 palette */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f2fbfb] via-[#e4f5f5] to-[#D9F2F2] opacity-90" />

      {/* Ambient Palette Glow Orbs to enhance Frosted Glassmorphism refraction */}
      <div className="absolute top-[12%] left-[18%] w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-[#A6D9D9]/45 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[15%] right-[15%] w-72 sm:w-[420px] h-72 sm:h-[420px] rounded-full bg-[#75BDBD]/30 blur-3xl pointer-events-none" />

      {/* Vector Botanical Background Layer — Visible behind frosted glass cards */}
      <div className="absolute inset-0 pointer-events-none opacity-55 md:opacity-80 transition-opacity duration-300">
        {/* ============================================================ */}
        {/* 1. LEFT BOTANICAL TREE (PINNED TO BOTTOM-LEFT)               */}
        {/* ============================================================ */}
        <div className="absolute left-0 bottom-0 w-[220px] sm:w-[340px] md:w-[420px] lg:w-[480px] h-[55vh] sm:h-[75vh] md:h-[82vh] max-h-[850px] min-h-[340px] pointer-events-none">
        <svg
          className="w-full h-full"
          viewBox="0 0 460 780"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMinYMax meet"
        >
          <defs>
            <radialGradient id="canopy-glow-left" cx="38%" cy="38%" r="62%">
              <stop offset="0%" stopColor="#D9F2F2" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#A6D9D9" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#75BDBD" stopOpacity="0.7" />
            </radialGradient>
          </defs>

          {/* Concentric ripple arcs radiating from tree base */}
          <ellipse
            cx="160"
            cy="780"
            rx="460"
            ry="290"
            stroke="#2D8686"
            strokeWidth="1.6"
            strokeDasharray="5 7"
            strokeOpacity="0.4"
          />
          <ellipse
            cx="160"
            cy="780"
            rx="320"
            ry="200"
            stroke="#2D8686"
            strokeWidth="1.6"
            strokeDasharray="5 7"
            strokeOpacity="0.45"
          />
          <ellipse
            cx="160"
            cy="780"
            rx="190"
            ry="120"
            stroke="#2D8686"
            strokeWidth="1.6"
            strokeDasharray="5 7"
            strokeOpacity="0.5"
          />

          {/* Leaf Canopy Circles with Palette Fills and Dotted Outlines */}
          {/* 1. Lower Left Canopy */}
          <circle
            cx="75"
            cy="470"
            r="48"
            fill="url(#canopy-glow-left)"
            stroke="#2D8686"
            strokeWidth="2.2"
            strokeDasharray="6 6"
          />

          {/* 2. Mid Left Canopy */}
          <circle
            cx="115"
            cy="325"
            r="58"
            fill="url(#canopy-glow-left)"
            stroke="#2D8686"
            strokeWidth="2.2"
            strokeDasharray="6 6"
          />

          {/* 3. Upper Left Canopy */}
          <circle
            cx="155"
            cy="235"
            r="68"
            fill="url(#canopy-glow-left)"
            stroke="#2D8686"
            strokeWidth="2.2"
            strokeDasharray="6 6"
          />

          {/* 4. Top Center Crown Canopy (Largest, Overlapping) */}
          <circle
            cx="215"
            cy="170"
            r="76"
            fill="url(#canopy-glow-left)"
            stroke="#2D8686"
            strokeWidth="2.2"
          />

          {/* 5. Top Right Crown Canopy */}
          <circle
            cx="285"
            cy="240"
            r="62"
            fill="url(#canopy-glow-left)"
            stroke="#2D8686"
            strokeWidth="2.2"
            strokeDasharray="6 6"
          />

          {/* 6. Mid Right Canopy */}
          <circle
            cx="325"
            cy="410"
            r="54"
            fill="url(#canopy-glow-left)"
            stroke="#2D8686"
            strokeWidth="2.2"
            strokeDasharray="6 6"
          />

          {/* Main Tree Trunk & Organic Branches */}
          {/* Main vertical trunk */}
          <path
            d="M 168 780 C 166 630, 164 470, 163 330 C 162 265, 172 200, 196 170"
            stroke="#0F5757"
            strokeWidth="3.6"
            strokeLinecap="round"
          />

          {/* Branch to Lower Left */}
          <path
            d="M 166 610 C 146 560, 115 510, 78 475"
            stroke="#2D8686"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* Branch to Mid Left */}
          <path
            d="M 164 475 C 148 420, 134 375, 118 335"
            stroke="#2D8686"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* Branch to Upper Left */}
          <path
            d="M 163 365 C 160 310, 158 270, 156 245"
            stroke="#2D8686"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Branch to Upper Right Crown */}
          <path
            d="M 172 270 C 205 250, 248 240, 280 238"
            stroke="#2D8686"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Branch to Mid Right */}
          <path
            d="M 165 520 C 206 480, 275 445, 320 415"
            stroke="#2D8686"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* Delicate leaf sprig at top left */}
          <path
            d="M 140 60 C 152 76, 178 86, 188 70 C 172 54, 150 50, 140 60 Z"
            fill="url(#canopy-glow-left)"
            stroke="#2D8686"
            strokeWidth="2.0"
          />
        </svg>
      </div>

      {/* ============================================================ */}
      {/* 2. TOP-RIGHT HANGING BOTANICAL SPRIG (PINNED TO TOP-RIGHT)   */}
      {/* ============================================================ */}
      <div className="absolute right-0 top-0 w-[140px] sm:w-[180px] md:w-[220px] h-[25vh] sm:h-[30vh] md:h-[36vh] max-h-[360px] min-h-[180px] pointer-events-none">
        <svg
          className="w-full h-full"
          viewBox="0 0 220 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMaxYMin meet"
        >
          <defs>
            <radialGradient id="canopy-glow-top" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#D9F2F2" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#A6D9D9" stopOpacity="0.75" />
            </radialGradient>
          </defs>

          {/* Curving vine stem */}
          <path
            d="M 210 0 C 180 80, 150 200, 135 310"
            stroke="#0F5757"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Leaf Pair 1 */}
          <path
            d="M 196 75 C 150 60, 115 75, 100 95 C 135 115, 175 105, 196 75 Z"
            fill="url(#canopy-glow-top)"
            stroke="#2D8686"
            strokeWidth="2.2"
          />
          <path
            d="M 188 90 C 225 90, 245 75, 255 60 C 235 98, 210 110, 188 90 Z"
            fill="url(#canopy-glow-top)"
            stroke="#2D8686"
            strokeWidth="2.2"
          />

          {/* Leaf Pair 2 */}
          <path
            d="M 172 165 C 120 155, 85 175, 70 200 C 110 220, 150 205, 172 165 Z"
            fill="url(#canopy-glow-top)"
            stroke="#2D8686"
            strokeWidth="2.2"
          />
          <path
            d="M 165 185 C 205 190, 230 180, 240 160 C 220 205, 190 215, 165 185 Z"
            fill="url(#canopy-glow-top)"
            stroke="#2D8686"
            strokeWidth="2.2"
          />

          {/* Leaf Pair 3 */}
          <path
            d="M 148 250 C 100 245, 65 265, 50 290 C 90 310, 130 290, 148 250 Z"
            fill="url(#canopy-glow-top)"
            stroke="#2D8686"
            strokeWidth="2.2"
          />
          <path
            d="M 142 268 C 178 275, 205 270, 215 250 C 195 295, 165 300, 142 268 Z"
            fill="url(#canopy-glow-top)"
            stroke="#2D8686"
            strokeWidth="2.2"
          />
        </svg>
      </div>

      {/* ============================================================ */}
      {/* 3. RIGHT ARCHITECTURAL PINE TREES (PINNED TO BOTTOM-RIGHT)   */}
      {/* ============================================================ */}
      <div className="hidden sm:block absolute right-0 bottom-0 w-[220px] sm:w-[280px] md:w-[350px] lg:w-[420px] h-[55vh] sm:h-[65vh] md:h-[72vh] max-h-[750px] min-h-[380px] pointer-events-none">
        <svg
          className="w-full h-full"
          viewBox="0 0 420 650"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMaxYMax meet"
        >
          <defs>
            <radialGradient id="canopy-glow-right" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#D9F2F2" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#A6D9D9" stopOpacity="0.78" />
            </radialGradient>
          </defs>

          {/* Terrain contour arcs */}
          <ellipse
            cx="320"
            cy="650"
            rx="480"
            ry="240"
            stroke="#2D8686"
            strokeWidth="1.6"
            strokeDasharray="5 7"
            strokeOpacity="0.4"
          />
          <ellipse
            cx="320"
            cy="650"
            rx="300"
            ry="150"
            stroke="#2D8686"
            strokeWidth="1.6"
            strokeDasharray="5 7"
            strokeOpacity="0.45"
          />

          {/* --- Smaller Pine Tree (Left of Pair) --- */}
          {/* Central Trunk */}
          <line
            x1="120"
            y1="190"
            x2="120"
            y2="650"
            stroke="#0F5757"
            strokeWidth="3.0"
            strokeLinecap="round"
          />

          {/* Tier 1 (Top) */}
          <polygon
            points="120,180 78,275 162,275"
            fill="url(#canopy-glow-right)"
            stroke="#2D8686"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Tier 2 (Middle) */}
          <polygon
            points="120,255 55,365 185,365"
            fill="url(#canopy-glow-right)"
            stroke="#2D8686"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Tier 3 (Bottom) */}
          <polygon
            points="120,340 25,480 215,480"
            fill="url(#canopy-glow-right)"
            stroke="#2D8686"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* --- Larger Pine Tree (Right of Pair) --- */}
          {/* Central Trunk */}
          <line
            x1="270"
            y1="40"
            x2="270"
            y2="650"
            stroke="#0F5757"
            strokeWidth="3.4"
            strokeLinecap="round"
          />

          {/* Tier 1 (Top) */}
          <polygon
            points="270,30 210,155 330,155"
            fill="url(#canopy-glow-right)"
            stroke="#2D8686"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Tier 2 */}
          <polygon
            points="270,135 180,275 360,275"
            fill="url(#canopy-glow-right)"
            stroke="#2D8686"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Tier 3 */}
          <polygon
            points="270,245 145,420 395,420"
            fill="url(#canopy-glow-right)"
            stroke="#2D8686"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Tier 4 (Bottom) */}
          <polygon
            points="270,370 100,570 440,570"
            fill="url(#canopy-glow-right)"
            stroke="#2D8686"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      </div>
    </div>
  );
};
