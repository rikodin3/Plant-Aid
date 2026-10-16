import React from 'react';

export const BotanicalBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-gradient-to-b from-[#ffffff] via-[#f0f9f9] to-[#D9F2F2]/70"
      aria-hidden="true"
    >
      {/* Soft directional light accent */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#D9F2F2]/50 via-transparent to-[#ffffff]/90 pointer-events-none" />
    </div>
  );
};
