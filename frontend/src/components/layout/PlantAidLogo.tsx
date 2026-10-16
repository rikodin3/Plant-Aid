import React from 'react';

interface PlantAidIconProps {
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 48,
};

export const PlantAidIcon: React.FC<PlantAidIconProps> = ({
  size = 'md',
  className = '',
}) => {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];

  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={pixelSize}
      height={pixelSize}
      aria-hidden="true"
    >
      {/* Squircle base in #0F5757 */}
      <rect width="44" height="44" rx="12" fill="#0F5757" />
      <rect
        x="1.5"
        y="1.5"
        width="41"
        height="41"
        rx="10.5"
        stroke="rgba(217,242,242,0.22)"
        strokeWidth="1"
        fill="none"
      />

      {/* First-Aid Cross in soft ivory */}
      <rect x="7" y="16" width="30" height="12" rx="3.5" fill="#fcfdfa" />
      <rect x="16" y="7" width="12" height="30" rx="3.5" fill="#fcfdfa" />

      {/* Living Plant Sprout in the center of the cross */}
      {/* Slender stem rooted in lower cross arm */}
      <path
        d="M22 22V30"
        stroke="#0F5757"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Left leaf in #2D8686 */}
      <path
        d="M22 24C18 24 14.5 21 15 17C17 17 21 19.5 22 24Z"
        fill="#2D8686"
      />
      {/* Right leaf in #75BDBD */}
      <path
        d="M22 25C22 20 25.5 16.5 28 17C28 20 25 24 22 25Z"
        fill="#75BDBD"
      />
      {/* Vitality / Sprout dot in #A6D9D9 */}
      <circle cx="28.5" cy="14.5" r="2.2" fill="#A6D9D9" />
    </svg>
  );
};

interface PlantAidLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const PlantAidLogo: React.FC<PlantAidLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <PlantAidIcon size={size} className="shrink-0 transition-transform group-hover:scale-105" />
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline leading-none tracking-tight">
          <span className="font-bold text-xl text-[#0F5757] font-gilroy">GroundNut</span>
          <span className="text-[#75BDBD] font-bold text-lg mx-0.5">·</span>
          <span className="font-cursive font-bold text-2xl text-[#2D8686] tracking-normal ml-0.5 select-none">Aid</span>
        </div>
        {showSubtitle && (
          <span className="hidden sm:inline text-xs uppercase tracking-wider font-semibold text-[#0F5757]/75 mt-0.5">
            Real-Time Groundnut-Plant Health
          </span>
        )}
      </div>
    </div>
  );
};

export default PlantAidLogo;
