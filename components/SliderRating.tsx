import React from 'react';

interface SliderRatingProps {
  value: number;
  onChange: (val: number) => void;
  readonly?: boolean;
}

const getLabel = (val: number) => {
  if (val === 0) return 'Geser';
  if (val <= 25) return 'Kurang';
  if (val <= 50) return 'Sedang';
  if (val <= 75) return 'Baik';
  return 'Sangat Baik';
};

const getColorClass = (val: number) => {
    if (val === 0) return 'bg-slate-200';
    if (val <= 25) return 'bg-red-500';
    if (val <= 50) return 'bg-orange-500';
    if (val <= 75) return 'bg-blue-500';
    return 'bg-emerald-500';
}

const getTextClass = (val: number) => {
    if (val === 0) return 'text-slate-400';
    if (val <= 25) return 'text-red-500';
    if (val <= 50) return 'text-orange-500';
    if (val <= 75) return 'text-blue-500';
    return 'text-emerald-500';
}

export const SliderRating: React.FC<SliderRatingProps> = ({ value, onChange, readonly = false }) => {
  return (
    <div className="w-full pt-2 px-1 pb-6">
      {/* Header Value & Badge */}
      <div className="flex justify-between items-end mb-6">
        <div className={`text-4xl font-bold transition-colors ${value > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
            {value > 0 ? value : 0}
        </div>
        <div className={`px-4 py-1.5 rounded-full text-xs text-white font-bold uppercase tracking-wide shadow-sm transition-colors duration-300 ${getColorClass(value)}`}>
          {getLabel(value)}
        </div>
      </div>
      
      {/* Combined Slider Track Area */}
      <div className="relative w-full h-12 flex flex-col justify-center group select-none">
          
          {/* 1. Track Background (Colored Segments) */}
          <div className="absolute w-full h-3 rounded-full overflow-hidden flex">
             <div className="w-1/4 h-full bg-red-100"></div>
             <div className="w-1/4 h-full bg-orange-100"></div>
             <div className="w-1/4 h-full bg-blue-100"></div>
             <div className="w-1/4 h-full bg-emerald-100"></div>
             
             {/* Tick Marks (White lines inside track) */}
             <div className="absolute left-[25%] top-0 bottom-0 w-[2px] bg-white z-0"></div>
             <div className="absolute left-[50%] top-0 bottom-0 w-[2px] bg-white z-0"></div>
             <div className="absolute left-[75%] top-0 bottom-0 w-[2px] bg-white z-0"></div>
          </div>

          {/* 2. Active Fill (Colored) */}
          <div className="absolute top-1/2 -translate-y-1/2 h-3 left-0 rounded-full overflow-hidden pointer-events-none z-0" style={{ width: `${value}%` }}>
               <div className={`h-full transition-all duration-150 ease-out ${getColorClass(value)}`} />
          </div>
          
          {/* 3. Native Input (Invisible Interaction Layer) */}
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={value || 0}
            disabled={readonly}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer z-20"
          />

          {/* 4. Custom Thumb Visual */}
          <div 
             className="absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-white border border-slate-200 rounded-full shadow-lg pointer-events-none transition-all duration-150 ease-out flex items-center justify-center z-10"
             style={{ left: `calc(${value}% - 14px)` }}
          >
             <div className={`w-2.5 h-2.5 rounded-full ${getColorClass(value)}`}></div>
          </div>

          {/* 5. Integrated Labels & Ticks below track */}
          <div className="absolute top-8 w-full h-8 pointer-events-none">
             {/* Numbers */}
             <span className="absolute left-0 -translate-x-0 text-[10px] font-bold text-slate-300">0</span>
             <span className="absolute left-[25%] -translate-x-1/2 text-[10px] font-bold text-slate-300">25</span>
             <span className="absolute left-[50%] -translate-x-1/2 text-[10px] font-bold text-slate-300">50</span>
             <span className="absolute left-[75%] -translate-x-1/2 text-[10px] font-bold text-slate-300">75</span>
             <span className="absolute right-0 translate-x-0 text-[10px] font-bold text-slate-300">100</span>

             {/* Zone Text Labels (Centered in gaps) */}
             <span className={`absolute left-[12.5%] -translate-x-1/2 text-[9px] font-extrabold uppercase tracking-tight transition-colors ${value > 0 && value <= 25 ? 'text-red-500 opacity-100' : 'text-slate-300 opacity-60'}`}>Kurang</span>
             <span className={`absolute left-[37.5%] -translate-x-1/2 text-[9px] font-extrabold uppercase tracking-tight transition-colors ${value > 25 && value <= 50 ? 'text-orange-500 opacity-100' : 'text-slate-300 opacity-60'}`}>Sedang</span>
             <span className={`absolute left-[62.5%] -translate-x-1/2 text-[9px] font-extrabold uppercase tracking-tight transition-colors ${value > 50 && value <= 75 ? 'text-blue-500 opacity-100' : 'text-slate-300 opacity-60'}`}>Baik</span>
             <span className={`absolute left-[87.5%] -translate-x-1/2 text-[9px] font-extrabold uppercase tracking-tight transition-colors ${value > 75 ? 'text-emerald-500 opacity-100' : 'text-slate-300 opacity-60'}`}>Sgt Baik</span>
          </div>
      </div>
    </div>
  );
};