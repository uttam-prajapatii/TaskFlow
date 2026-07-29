import React from 'react';

const BrandPanel: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-flame-1 via-flame-2 to-flame-3 text-white p-14 flex flex-col justify-between min-h-[500px] md:min-h-full select-none">
      {/* Decorative Grain overlay */}
      <div className="absolute inset-0 z-2 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_55%)] pointer-events-none" />

      {/* Animated Node Graph */}
      <div className="absolute inset-0 z-1 opacity-55 pointer-events-none" aria-hidden="true">
        <svg className="w-full h-full" viewBox="0 0 500 700" preserveAspectRatio="xMidYMid slice">
          <line x1="120" y1="580" x2="260" y2="470" className="node draw" />
          <line x1="260" y1="470" x2="400" y2="470" className="node draw d2" />
          <line x1="400" y1="470" x2="330" y2="150" className="node draw d3" />
          <line x1="330" y1="150" x2="150" y2="230" className="node draw" />
          <circle cx="120" cy="580" r="9" className="node-dot animate-pulse-slow" />
          <circle cx="260" cy="470" r="11" className="node-dot filled animate-pulse-slow delay-2" />
          <circle cx="400" cy="470" r="9" className="node-dot animate-pulse-slow delay-3" />
          <circle cx="330" cy="150" r="13" className="node-dot filled animate-pulse-slow delay-4" />
          <circle cx="150" cy="230" r="7" className="node-dot animate-pulse-slow" />
        </svg>
      </div>

      {/* Brand Top (Logo & Name) */}
      <div className="flex items-center gap-3 relative z-10">
        <img src="/logo.png" alt="TaskFlow logo" className="w-[38px] h-[38px] rounded-lg block shadow-md" />
        <span className="font-display font-bold text-xl tracking-tight">TaskFlow</span>
      </div>

      {/* Brand Mid (Value Prop) */}
      <div className="relative z-10 max-w-[420px] my-auto">
        <p className="font-display text-[12.5px] font-semibold uppercase tracking-[0.16em] opacity-85 mb-4">
          Where work connects
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-5">
          Every task, every teammate, one clear thread.
        </h1>
        <p className="text-[15.5px] leading-relaxed opacity-90 max-w-[360px]">
          TaskFlow maps how your team's work actually links together — so nothing falls through the cracks between projects.
        </p>
      </div>
    </div>
  );
};

export default BrandPanel;
