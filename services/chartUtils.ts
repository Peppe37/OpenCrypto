
import { CandleData } from '../types';

/**
 * Calculates Heikin Ashi candles from standard OHLC data.
 * HA_Close = (Open + High + Low + Close) / 4
 * HA_Open = (PrevHA_Open + PrevHA_Close) / 2
 * HA_High = Max(High, HA_Open, HA_Close)
 * HA_Low = Min(Low, HA_Open, HA_Close)
 */
export const calculateHeikinAshi = (data: CandleData[]): CandleData[] => {
  if (data.length === 0) return [];

  const haData: CandleData[] = [];
  
  // First candle HA Open is just the actual Open
  let prevOpen = data[0].open;
  let prevClose = data[0].close;

  data.forEach((d, i) => {
    const haClose = (d.open + d.high + d.low + d.close) / 4;
    // For the first candle, use raw data, otherwise use previous HA
    const haOpen = i === 0 ? (d.open + d.close) / 2 : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(d.high, haOpen, haClose);
    const haLow = Math.min(d.low, haOpen, haClose);

    haData.push({
      time: d.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: d.volume
    });

    prevOpen = haOpen;
    prevClose = haClose;
  });

  return haData;
};

/**
 * Simulates Renko data by standardizing bricks based on Average True Range (ATR) or fixed size.
 */
export const calculateRenko = (data: CandleData[], brickSize?: number): CandleData[] => {
  if (data.length === 0) return [];

  // Auto-calculate brick size if not provided (approx 0.5% of price)
  const size = brickSize || data[data.length - 1].close * 0.005; 
  
  const renkoData: CandleData[] = [];
  let currentPrice = data[0].close; // Snap to close
  
  data.forEach((d) => {
    const diff = d.close - currentPrice;
    
    // If movement is larger than brick size
    if (Math.abs(diff) >= size) {
        const bricks = Math.floor(Math.abs(diff) / size);
        const direction = diff > 0 ? 1 : -1;
        
        // We create a "brick" candle
        const open = currentPrice;
        const close = currentPrice + (bricks * size * direction);
        
        renkoData.push({
            time: d.time,
            open: open,
            close: close,
            high: Math.max(open, close),
            low: Math.min(open, close),
            volume: d.volume
        });
        
        currentPrice = close;
    } else {
        // Flat candle (no change) to keep x-axis continuity
        renkoData.push({
            time: d.time,
            open: currentPrice,
            close: currentPrice,
            high: currentPrice,
            low: currentPrice,
            volume: 0
        });
    }
  });

  return renkoData;
};

/**
 * Calculates Three Line Break charts
 */
export const calculateLineBreak = (data: CandleData[], lookback: number = 3): CandleData[] => {
    if (data.length === 0) return [];
    
    const lines: {high: number, low: number, isUp: boolean}[] = [];
    const lbData: CandleData[] = [];
    
    let currentHigh = data[0].close;
    let currentLow = data[0].open;
    let isUp = data[0].close >= data[0].open;
    
    lines.push({ high: Math.max(currentHigh, currentLow), low: Math.min(currentHigh, currentLow), isUp });
    lbData.push(data[0]); 

    for(let i = 1; i < data.length; i++) {
        const price = data[i].close;
        const lastLine = lines[lines.length - 1];
        
        const recentLines = lines.slice(-lookback);
        const minLow = Math.min(...recentLines.map(l => l.low));
        const maxHigh = Math.max(...recentLines.map(l => l.high));
        
        let newLine = null;

        if (lastLine.isUp) {
            if (price > lastLine.high) {
                // Continuation Up
                newLine = { high: price, low: lastLine.high, isUp: true };
            } else if (price < minLow) {
                // Reversal Down
                newLine = { high: lastLine.low, low: price, isUp: false };
            }
        } else {
             if (price < lastLine.low) {
                 // Continuation Down
                 newLine = { high: lastLine.low, low: price, isUp: false };
             } else if (price > maxHigh) {
                 // Reversal Up
                 newLine = { high: price, low: lastLine.high, isUp: true };
             }
        }

        if (newLine) {
            lines.push(newLine);
            lbData.push({
                time: data[i].time,
                open: newLine.isUp ? newLine.low : newLine.high,
                close: newLine.isUp ? newLine.high : newLine.low,
                high: newLine.high,
                low: newLine.low,
                volume: data[i].volume
            });
        } else {
             lbData.push({
                time: data[i].time,
                open: lbData[lbData.length-1].close,
                close: lbData[lbData.length-1].close,
                high: lbData[lbData.length-1].close,
                low: lbData[lbData.length-1].close,
                volume: 0
             });
        }
    }
    return lbData;
}

/**
 * Calculates Kagi Chart (Simulated as Step Line with Trend)
 */
export const calculateKagi = (data: CandleData[], reversalAmount?: number): CandleData[] => {
    if (data.length === 0) return [];
    
    const amount = reversalAmount || data[data.length-1].close * 0.01;
    const kagiData: CandleData[] = [];
    
    let trend: 'up' | 'down' = data[1].close >= data[0].close ? 'up' : 'down';
    let referencePoint = data[0].close; 

    data.forEach(d => {
        const price = d.close;
        if (trend === 'up') {
            if (price > referencePoint) {
                referencePoint = price;
            } else if (price < referencePoint - amount) {
                trend = 'down';
                referencePoint = price;
            }
        } else {
            if (price < referencePoint) {
                referencePoint = price;
            } else if (price > referencePoint + amount) {
                trend = 'up';
                referencePoint = price;
            }
        }
        
        kagiData.push({
            time: d.time,
            open: price, 
            close: price,
            high: price,
            low: price,
            trend: trend,
            volume: d.volume
        });
    });

    return kagiData;
}

/**
 * Calculates Point & Figure
 */
export const calculatePointAndFigure = (data: CandleData[], boxSize?: number, reversalBoxCount: number = 3): CandleData[] => {
    if (data.length === 0) return [];
    const size = boxSize || data[data.length-1].close * 0.005; 
    
    const pfData: CandleData[] = [];
    let currentTrend: 'up' | 'down' = 'up'; 
    let currentLevel = Math.floor(data[0].close / size) * size;
    
    pfData.push({
        time: data[0].time,
        open: currentLevel,
        close: currentLevel,
        high: currentLevel,
        low: currentLevel,
        trend: 'up',
        boxSize: size
    });

    data.forEach(d => {
        const price = d.close;
        const dist = price - currentLevel;
        const boxes = Math.floor(Math.abs(dist) / size);
        
        if (boxes === 0) {
             pfData.push({ ...pfData[pfData.length-1], time: d.time });
             return;
        }

        if (currentTrend === 'up') {
            if (price > currentLevel + size) {
                currentLevel += (boxes * size);
                pfData.push({
                    time: d.time,
                    open: pfData[pfData.length-1].close,
                    close: currentLevel,
                    high: currentLevel,
                    low: pfData[pfData.length-1].close,
                    trend: 'up',
                    boxSize: size
                });
            } else if (price < currentLevel - (size * reversalBoxCount)) {
                currentTrend = 'down';
                const prevHigh = currentLevel;
                currentLevel -= (boxes * size);
                 pfData.push({
                    time: d.time,
                    open: prevHigh,
                    close: currentLevel,
                    high: prevHigh,
                    low: currentLevel,
                    trend: 'down',
                    boxSize: size
                });
            } else {
                 pfData.push({ ...pfData[pfData.length-1], time: d.time });
            }
        } else {
             if (price < currentLevel - size) {
                currentLevel -= (boxes * size);
                pfData.push({
                    time: d.time,
                    open: pfData[pfData.length-1].close,
                    close: currentLevel,
                    high: pfData[pfData.length-1].close,
                    low: currentLevel,
                    trend: 'down',
                    boxSize: size
                });
            } else if (price > currentLevel + (size * reversalBoxCount)) {
                currentTrend = 'up';
                const prevLow = currentLevel;
                currentLevel += (boxes * size);
                 pfData.push({
                    time: d.time,
                    open: prevLow,
                    close: currentLevel,
                    high: currentLevel,
                    low: prevLow,
                    trend: 'up',
                    boxSize: size
                });
            } else {
                 pfData.push({ ...pfData[pfData.length-1], time: d.time });
            }
        }
    });
    
    return pfData;
}

/**
 * Calculates Range Bars
 */
export const calculateRange = (data: CandleData[], rangeSize?: number): CandleData[] => {
     if (data.length === 0) return [];
     const range = rangeSize || data[data.length-1].close * 0.005;

     const rangeData: CandleData[] = [];
     let open = data[0].open;
     let high = data[0].high;
     let low = data[0].low;
     
     data.forEach(d => {
         high = Math.max(high, d.high);
         low = Math.min(low, d.low);
         
         if ((high - low) >= range) {
             rangeData.push({
                 time: d.time,
                 open: open,
                 close: d.close,
                 high: high,
                 low: low,
                 volume: d.volume
             });
             open = d.close;
             high = d.close;
             low = d.close;
         } else {
             if (rangeData.length > 0) {
                 rangeData.push({ ...rangeData[rangeData.length-1], time: d.time });
             } else {
                 rangeData.push(d); 
             }
         }
     });
     return rangeData;
}
