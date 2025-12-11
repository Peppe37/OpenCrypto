
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ComposedChart,
  AreaChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  CartesianGrid,
  Legend
} from 'recharts';
import { CandleData, AdvancedChartType } from '../types';

interface ChartProps {
  data: any[]; 
  zones?: { support: number[]; resistance: number[] };
  markers?: { time: number; label: string; color: string }[];
  type: 'candle' | 'area' | AdvancedChartType;
  isFullscreen?: boolean;
  series?: { dataKey: string; name: string; color: string }[]; 
  isOverlay?: boolean;
  height?: number | string;
  error?: string | null; // New Error Prop
}

// --- Custom Shapes (Kept same as before) ---

const CandleStickShape = (props: any) => {
  const { x, y, width, height, payload, isHollow } = props;
  const { open, close, high, low } = payload;
  
  if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) return null;

  const isUp = close >= open;
  const color = isUp ? '#00C076' : '#FF5555';
  const fill = isHollow && isUp ? 'transparent' : color;
  const stroke = color;

  const totalRange = high - low;
  const ratio = totalRange === 0 ? 1 : height / totalRange;
  
  const maxVal = Math.max(open, close);
  const minVal = Math.min(open, close);
  
  const bodyTopOffset = (high - maxVal) * ratio;
  const bodyHeight = Math.max(1, (maxVal - minVal) * ratio);

  return (
    <g>
      <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + height} stroke={stroke} strokeWidth={1} />
      <rect x={x} y={y + bodyTopOffset} width={width} height={bodyHeight} fill={fill} stroke={stroke} strokeWidth={isHollow ? 1.5 : 0} />
    </g>
  );
};

const RenkoShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, close } = payload;
    const isUp = close >= open;
    const color = isUp ? '#00C076' : '#FF5555';
    return <rect x={x} y={y} width={width} height={height} fill={color} stroke={color} rx={1} />;
};

const LineBreakShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, close } = payload;
    const isUp = close >= open;
    const color = isUp ? '#00C076' : '#FF5555';
    return <rect x={x} y={y} width={width} height={height} fill={color} stroke={color} />;
};

const PointAndFigureShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { trend, high, low, boxSize } = payload;
    const size = boxSize || (high - low) / 5; 
    const count = Math.max(1, Math.floor((high - low) / size));
    const isUp = trend === 'up';
    const color = isUp ? '#00C076' : '#FF5555';
    
    const items = [];
    const stepY = height / count;
    
    for (let i = 0; i < count; i++) {
        const itemY = y + (height - ((i+1) * stepY));
        const cx = x + width / 2;
        const cy = itemY + stepY / 2;
        const r = Math.min(width, stepY) / 3;

        if (isUp) {
            items.push(
                <g key={i}>
                    <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} stroke={color} strokeWidth={1.5} />
                    <line x1={cx + r} y1={cy - r} x2={cx - r} y2={cy + r} stroke={color} strokeWidth={1.5} />
                </g>
            );
        } else {
            items.push(
                <circle key={i} cx={cx} cy={cy} r={r} stroke={color} strokeWidth={1.5} fill="transparent" />
            );
        }
    }
    return <g>{items}</g>;
};

const CustomTooltip = ({ active, payload, label, isOverlay, series }: any) => {
    if (active && payload && payload.length) {
      if (isOverlay) {
         return (
             <div className="bg-crypto-card border border-gray-700 p-3 rounded shadow-xl text-xs z-50">
                 <p className="text-gray-400 mb-2">{new Date(label).toLocaleString()}</p>
                 {payload.map((p: any, idx: number) => (
                     <div key={idx} className="flex items-center gap-2 mb-1">
                         <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
                         <span className="text-gray-300 w-16">{p.name}:</span>
                         <span className={`font-mono font-bold ${p.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                             {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}%
                         </span>
                     </div>
                 ))}
             </div>
         )
      }

      const data = payload[0].payload;
      return (
        <div className="bg-crypto-card border border-gray-700 p-3 rounded shadow-xl text-xs z-50">
          <p className="text-gray-400 mb-1">{new Date(label).toLocaleString()}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
             <span className="text-gray-500">O:</span> <span className="text-white font-mono">{data.open?.toLocaleString()}</span>
             <span className="text-gray-500">H:</span> <span className="text-white font-mono">{data.high?.toLocaleString()}</span>
             <span className="text-gray-500">L:</span> <span className="text-white font-mono">{data.low?.toLocaleString()}</span>
             <span className="text-gray-500">C:</span> <span className={`font-mono ${data.close >= data.open ? 'text-crypto-up' : 'text-crypto-down'}`}>{data.close?.toLocaleString()}</span>
             {data.trend && <><span className="text-gray-500">Trend:</span> <span className="text-white uppercase">{data.trend}</span></>}
             {data.volume && <><span className="text-gray-500">Vol:</span> <span className="text-gray-300 font-mono">{(data.volume).toLocaleString()}</span></>}
          </div>
        </div>
      );
    }
    return null;
  };

export const CryptoChart: React.FC<ChartProps> = React.memo(({ data, zones, markers, type = 'candle', isFullscreen = false, series, isOverlay = false, height, error }) => {
  const [yDomain, setYDomain] = useState<[number | 'auto', number | 'auto']>(['auto', 'auto']);
  const [crosshair, setCrosshair] = useState<{ x: number | null, y: number | null }>({ x: null, y: null });
  const [zoomState, setZoomState] = useState<{ startIndex: number; endIndex: number }>({ startIndex: 0, endIndex: 0 });
  const zoomStateRef = useRef(zoomState);
  const dataRef = useRef<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { zoomStateRef.current = zoomState; }, [zoomState]);

  const processedData = useMemo(() => {
     if (!data) return [];
     if (isOverlay) return data; 
     return data.map(d => ({ ...d, range: [d.low, d.high] }));
  }, [data, isOverlay]);

  useEffect(() => { dataRef.current = processedData; }, [processedData]);

  useEffect(() => {
    if (processedData.length > 0) {
        setZoomState({ startIndex: 0, endIndex: processedData.length - 1 });
    }
  }, [processedData]);

  const visibleDuration = useMemo(() => {
    if (processedData.length === 0) return 0;
    const startIdx = Math.max(0, zoomState.startIndex);
    const endIdx = Math.min(processedData.length - 1, zoomState.endIndex);
    if (startIdx >= processedData.length || endIdx < 0) return 0;
    return processedData[endIdx].time - processedData[startIdx].time;
  }, [processedData, zoomState]);

  const xAxisFormatter = (tick: number) => {
      const date = new Date(tick);
      const msPerDay = 24 * 60 * 60 * 1000;
      if (visibleDuration < 36 * 60 * 60 * 1000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      else if (visibleDuration > 365 * msPerDay) return date.toLocaleDateString(undefined, { month: 'numeric', year: '2-digit' });
      return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  };

  const gradientOffset = useMemo(() => {
    if (isOverlay || !data || data.length === 0) return 0;
    const max = Math.max(...data.map(d => d.high));
    const min = Math.min(...data.map(d => d.low));
    const avg = (max + min) / 2; 
    if (max <= min) return 0;
    return (max - avg) / (max - min);
  }, [data, isOverlay]);

  useEffect(() => {
    if (processedData.length === 0) return;
    const start = Math.max(0, zoomState.startIndex);
    const end = Math.min(processedData.length - 1, zoomState.endIndex);
    if (start > end) return;
    const visibleData = processedData.slice(start, end + 1);
    
    let min = Infinity;
    let max = -Infinity;

    visibleData.forEach(d => {
        if (isOverlay && series) {
            series.forEach(s => {
                const val = d[s.dataKey];
                if (val !== undefined && val !== null && !isNaN(val)) {
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            });
        } else {
            if (d.low !== undefined && d.low < min) min = d.low;
            if (d.high !== undefined && d.high > max) max = d.high;
            if (d.close !== undefined && d.close < min) min = d.close;
            if (d.close !== undefined && d.close > max) max = d.close;
        }
    });

    if (min === Infinity || max === -Infinity) { setYDomain(['auto', 'auto']); return; }
    const padding = Math.abs(max - min) * 0.05;
    const finalMin = max === min ? min - 1 : min - padding;
    const finalMax = max === min ? max + 1 : max + padding;
    setYDomain([finalMin, finalMax]);
  }, [processedData, zoomState, isOverlay, series]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
        if (dataRef.current.length === 0) return;
        e.preventDefault();
        const { startIndex, endIndex } = zoomStateRef.current;
        const totalItems = dataRef.current.length;
        const currentRange = endIndex - startIndex;
        const rect = container.getBoundingClientRect();
        const cursorRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const zoomSpeed = 0.1;
        let totalChange = Math.ceil(currentRange * zoomSpeed);
        if (totalChange < 1) totalChange = 1;

        let newStart = startIndex;
        let newEnd = endIndex;

        if (e.deltaY < 0) {
            const contractLeft = Math.floor(totalChange * cursorRatio);
            const contractRight = totalChange - contractLeft;
            newStart += contractLeft;
            newEnd -= contractRight;
        } else {
            const expandLeft = Math.floor(totalChange * cursorRatio);
            const expandRight = totalChange - expandLeft;
            newStart -= expandLeft;
            newEnd += expandRight;
        }

        if (newEnd - newStart < 5) return;
        if (newStart < 0) newStart = 0;
        if (newEnd >= totalItems) newEnd = totalItems - 1;

        if (newStart !== startIndex || newEnd !== endIndex) {
            if (newStart > newEnd) { newStart = startIndex; newEnd = endIndex; }
            setZoomState({ startIndex: newStart, endIndex: newEnd });
        }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseMove = (e: any) => {
    if (!isFullscreen || window.innerWidth < 1024) return;
    if (e.activePayload) setCrosshair({ x: e.activeLabel, y: e.activePayload[0].value });
  };

  const handleBrushChange = (props: any) => {
      if (props.startIndex !== undefined && props.endIndex !== undefined) {
          setZoomState({ startIndex: props.startIndex, endIndex: props.endIndex });
      }
  };

  const containerStyle = useMemo(() => {
     const h = height || (isFullscreen ? '100%' : '400px');
     return { height: h, minHeight: h, width: '100%' };
  }, [height, isFullscreen]);

  // --- Error State Rendering ---
  if (error) {
      return (
        <div className="w-full bg-crypto-card rounded-xl p-4 border border-gray-800 flex items-center justify-center relative overflow-hidden" style={containerStyle}>
             <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
             <div className="flex flex-col items-center gap-3 relative z-10 text-center max-w-sm">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500/50" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                 </svg>
                 <div>
                     <p className="font-bold text-gray-300">Data Unavailable</p>
                     <p className="text-xs text-gray-500 mt-1">{error}</p>
                 </div>
                 <p className="text-[10px] text-gray-600 border border-gray-700 rounded px-2 py-1 bg-black/20">
                     Tip: Add API Keys in Settings to avoid rate limits.
                 </p>
             </div>
        </div>
      );
  }

  // --- Loading State ---
  if (!processedData || processedData.length === 0) {
      return (
        <div className="w-full bg-crypto-card rounded-xl p-4 border border-gray-800 flex items-center justify-center" style={containerStyle}>
             <div className="flex flex-col items-center gap-2">
                 <div className="w-6 h-6 border-2 border-gray-600 border-t-crypto-accent rounded-full animate-spin"></div>
                 <span className="text-xs text-gray-500">Loading chart data...</span>
             </div>
        </div>
      );
  }

  const renderChartContent = () => {
      const commonAxes = (
        <>
            <defs>
                <linearGradient id="baselineSplit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={gradientOffset} stopColor="#00C076" stopOpacity={1} />
                    <stop offset={gradientOffset} stopColor="#FF5555" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <XAxis dataKey="time" tickFormatter={xAxisFormatter} stroke="#474D57" fontSize={11} minTickGap={50} axisLine={false} tickLine={false} dy={10} />
            <YAxis domain={yDomain} stroke="#474D57" fontSize={11} tickFormatter={(val) => isOverlay ? `${val.toFixed(2)}%` : (val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(2))} axisLine={false} tickLine={false} width={40} type="number" orientation="right" allowDataOverflow={true} />
            <Tooltip content={<CustomTooltip isOverlay={isOverlay} series={series} />} cursor={{ strokeOpacity: 0.2 }} />
            <CartesianGrid stroke="#2B3139" strokeDasharray="3 3" vertical={false} />
            {zones?.support.map((level, i) => (<ReferenceLine key={`sup-${i}`} y={level} stroke="#00C076" strokeOpacity={0.4} strokeDasharray="3 3" />))}
            {zones?.resistance.map((level, i) => (<ReferenceLine key={`res-${i}`} y={level} stroke="#FF5555" strokeOpacity={0.4} strokeDasharray="3 3" />))}
            {markers?.map((marker, i) => (<ReferenceLine key={`mk-${i}`} x={marker.time} stroke={marker.color} strokeDasharray="3 3" label={{ position: 'top', value: marker.label, fill: marker.color, fontSize: 10 }} />))}
            {isFullscreen && crosshair.x && crosshair.y && (<><ReferenceLine x={crosshair.x} stroke="#60A5FA" strokeWidth={1} strokeOpacity={0.8} /><ReferenceLine y={crosshair.y} stroke="#60A5FA" strokeWidth={1} strokeOpacity={0.8} label={{ position: 'left', value: crosshair.y.toFixed(2), fill: '#60A5FA', fontSize: 10, fillOpacity: 1, bg: '#000' }} /></>)}
        </>
      );
      
      const brushProps = { dataKey: "time", height: 30, stroke: "#4B5563", fill: "#151A21", tickFormatter: () => '', startIndex: zoomState.startIndex, endIndex: zoomState.endIndex, onChange: handleBrushChange };

      if (isOverlay && series) {
          return (
              <ComposedChart data={processedData}>
                  {commonAxes}
                  {series.map((s) => (<Line key={s.dataKey} type="monotone" dataKey={s.dataKey} stroke={s.color} strokeWidth={2} dot={false} name={s.name} connectNulls isAnimationActive={false} />))}
                  <Legend verticalAlign="top" height={36}/>
                  <Brush {...brushProps} />
              </ComposedChart>
          );
      }

      // Chart Type Switcher
      const commonProps = { data: processedData };
      if (type === 'area') return <AreaChart {...commonProps}>{commonAxes}<Area type="monotone" dataKey="close" stroke="#3B82F6" fill="url(#colorArea)" strokeWidth={2} /><Brush {...brushProps} /></AreaChart>;
      if (type === 'line') return <AreaChart {...commonProps}>{commonAxes}<Line type="monotone" dataKey="close" stroke="#3B82F6" strokeWidth={2} dot={false} /><Brush {...brushProps} /></AreaChart>;
      if (type === 'step_line') return <AreaChart {...commonProps}>{commonAxes}<Line type="step" dataKey="close" stroke="#F59E0B" strokeWidth={2} dot={false} /><Brush {...brushProps} /></AreaChart>;
      if (type === 'baseline') return <AreaChart {...commonProps}>{commonAxes}<Line type="monotone" dataKey="close" stroke="url(#baselineSplit)" strokeWidth={2} dot={false} /><ReferenceLine y={(data && data.length > 0) ? (Math.max(...data.map(d=>d.high)) + Math.min(...data.map(d=>d.low)))/2 : 0} stroke="#4B5563" strokeDasharray="3 3" /><Brush {...brushProps} /></AreaChart>;
      if (type === 'bar') return <ComposedChart {...commonProps} barGap={0}>{commonAxes}<Bar dataKey="close" fill="#3B82F6" /><Brush {...brushProps} /></ComposedChart>;
      if (type === 'column') return <ComposedChart {...commonProps}>{commonAxes}<Bar dataKey="volume" fill="#8b5cf6" opacity={0.6} /><Line type="monotone" dataKey="close" stroke="#fff" strokeWidth={1} dot={false} opacity={0.5} /><Brush {...brushProps} /></ComposedChart>;
      if (type === 'hollow_candle') return <ComposedChart {...commonProps}>{commonAxes}<Bar dataKey="range" shape={<CandleStickShape isHollow={true} />} isAnimationActive={false} /><Brush {...brushProps} /></ComposedChart>;
      if (type === 'renko') return <ComposedChart {...commonProps}>{commonAxes}<Bar dataKey="range" shape={<RenkoShape />} isAnimationActive={false} /><Brush {...brushProps} /></ComposedChart>;
      if (type === 'line_break') return <ComposedChart {...commonProps}>{commonAxes}<Bar dataKey="range" shape={<LineBreakShape />} isAnimationActive={false} /><Brush {...brushProps} /></ComposedChart>;
      if (type === 'point_figure') return <ComposedChart {...commonProps}>{commonAxes}<Bar dataKey="range" shape={<PointAndFigureShape />} isAnimationActive={false} /><Brush {...brushProps} /></ComposedChart>;
      if (type === 'kagi') return <AreaChart {...commonProps}>{commonAxes}<Line type="step" dataKey="close" stroke="#00C076" strokeWidth={2} dot={false} /><Brush {...brushProps} /></AreaChart>;
      if (type === 'range') return <ComposedChart {...commonProps}>{commonAxes}<Bar dataKey="range" shape={<RenkoShape />} isAnimationActive={false} /><Brush {...brushProps} /></ComposedChart>;
      if (type === 'hlc_area') return <AreaChart {...commonProps}>{commonAxes}<Area type="monotone" dataKey="high" stroke="none" fill="#3B82F6" fillOpacity={0.1} /><Area type="monotone" dataKey="low" stroke="none" fill="#151A21" fillOpacity={1} /><Line type="monotone" dataKey="close" stroke="#fff" strokeWidth={1} dot={false} /><Brush {...brushProps} /></AreaChart>;
      
      return <ComposedChart {...commonProps}>{commonAxes}<Bar dataKey="range" shape={<CandleStickShape isHollow={false} />} isAnimationActive={false} /><Brush {...brushProps} /></ComposedChart>;
  };

  return (
    <div ref={containerRef} className={`w-full bg-crypto-card rounded-xl p-4 border border-gray-800 flex flex-col cursor-crosshair relative min-w-0`} style={containerStyle} id="crypto-chart-container" onMouseMove={handleMouseMove} onMouseLeave={() => setCrosshair({x:null, y:null})}>
      <ResponsiveContainer width="100%" height="100%">{renderChartContent()!}</ResponsiveContainer>
    </div>
  );
});
