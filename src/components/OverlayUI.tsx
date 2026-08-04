import React, { useEffect, useState } from 'react';
import { eventBus } from '../core/eventBus';

export const OverlayUI: React.FC = () => {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    eventBus.on('TICK', (l: string) => setLabel(l));
  }, []);

  if (!label) return null;

  const isNumber = /^\d+$/.test(label);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none select-none">
      <div
        key={label}
        className={`text-[170px] sm:text-[210px] md:text-[260px] font-extralight leading-none tracking-tighter animate-pop-fade ${
          isNumber
            ? 'text-white/35 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]'
            : 'text-white/95 drop-shadow-[0_0_50px_rgba(255,255,255,0.4)]'
        }`}
      >
        {label}
      </div>
    </div>
  );
};

