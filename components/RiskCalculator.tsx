
import React, { useState, useEffect } from 'react';
import { InfoPopup } from './InfoPopup';

interface RiskCalculatorProps {
  currentPrice: number;
  coinId: string; // Used to detect coin switch
}

export const RiskCalculator: React.FC<RiskCalculatorProps> = ({ currentPrice, coinId }) => {
  const [accountSize, setAccountSize] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1); // 1%
  const [entryPrice, setEntryPrice] = useState<number>(currentPrice);
  const [stopLoss, setStopLoss] = useState<number>(currentPrice * 0.95); // Default 5% below
  const [takeProfit, setTakeProfit] = useState<number>(currentPrice * 1.10); // Default 10% above
  
  // Only reset defaults when the COIN changes, not when price ticks
  useEffect(() => {
    setEntryPrice(currentPrice);
    setStopLoss(currentPrice * 0.95);
    setTakeProfit(currentPrice * 1.10);
  }, [coinId]); 

  // Sync handler for manual update
  const handleSyncPrice = () => {
      setEntryPrice(currentPrice);
      // Optional: adjust SL/TP relatively or keep them absolute? 
      // Keeping absolute lets user just fix entry.
  };

  const riskAmount = (accountSize * riskPercent) / 100;
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  
  // Guard against divide by zero
  const positionSize = riskPerShare > 0 ? riskAmount / riskPerShare : 0;
  
  const totalInvestment = positionSize * entryPrice;
  const rewardPerShare = Math.abs(takeProfit - entryPrice);
  const rrRatio = riskPerShare > 0 ? rewardPerShare / riskPerShare : 0;
  const potentialProfit = positionSize * rewardPerShare;

  // Validation colors
  const rrColor = rrRatio >= 2 ? 'text-green-400' : rrRatio >= 1 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-crypto-card border border-gray-800 rounded-xl p-4 animate-fade-in-up">
       <div className="flex items-center justify-between mb-4">
           <h3 className="font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              Risk Calculator
              <InfoPopup data={{
                  title: "Position Size Calculator",
                  content: "Calculates exactly how much crypto to buy so that if your Stop Loss is hit, you only lose your predefined Risk % (e.g., 1% of account). This is key to professional trading."
              }} />
           </h3>
           <button onClick={handleSyncPrice} className="text-[10px] text-crypto-accent hover:underline bg-blue-900/20 px-2 py-1 rounded">
               Sync Price
           </button>
       </div>

       <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                Account Balance
                <InfoPopup data={{
                    title: "Account Balance",
                    content: "The total amount of money in your trading account. Position size is calculated relative to this."
                }} />
            </label>
            <input 
              type="number" 
              value={accountSize} 
              onChange={(e) => setAccountSize(parseFloat(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                Risk %
                <InfoPopup data={{
                    title: "Risk Percentage",
                    content: "The max % of your total account you are willing to lose on this SINGLE trade. Professional traders usually risk 1% or 2%."
                }} />
            </label>
            <input 
              type="number" 
              value={riskPercent} 
              onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-purple-500 outline-none"
            />
          </div>
       </div>

       <div className="space-y-3 mb-4 border-t border-gray-800 pt-3">
          <div className="flex items-center gap-2">
             <div className="w-20 text-xs text-gray-400 flex items-center gap-1">
                 Entry
                 <InfoPopup data={{
                    title: "Entry Price",
                    content: "The price at which you plan to buy the asset."
                 }} />
             </div>
             <input type="number" value={entryPrice} onChange={(e) => setEntryPrice(parseFloat(e.target.value))} className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white font-mono" />
          </div>
          <div className="flex items-center gap-2">
             <div className="w-20 text-xs text-gray-400 flex items-center gap-1">
                 Stop Loss
                 <InfoPopup data={{
                    title: "Stop Loss",
                    content: "The price where you will SELL to exit the trade if it goes against you, accepting a small loss to prevent a big one."
                 }} />
             </div>
             <input type="number" value={stopLoss} onChange={(e) => setStopLoss(parseFloat(e.target.value))} className="flex-1 bg-gray-900 border border-red-900/50 rounded px-2 py-1 text-sm text-white font-mono" />
          </div>
          <div className="flex items-center gap-2">
             <div className="w-20 text-xs text-gray-400 flex items-center gap-1">
                 Target
                 <InfoPopup data={{
                    title: "Target / Take Profit",
                    content: "The price where you plan to SELL to secure your profit."
                 }} />
             </div>
             <input type="number" value={takeProfit} onChange={(e) => setTakeProfit(parseFloat(e.target.value))} className="flex-1 bg-gray-900 border border-green-900/50 rounded px-2 py-1 text-sm text-white font-mono" />
          </div>
       </div>

       <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700">
           <div className="flex justify-between text-xs">
              <span className="text-gray-400">Position Size:</span>
              <span className="text-white font-bold">{positionSize.toFixed(4)} units</span>
           </div>
           <div className="flex justify-between text-xs">
              <span className="text-gray-400">Investment:</span>
              <span className="text-white font-mono">${totalInvestment.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
           </div>
           <div className="flex justify-between text-xs border-t border-gray-700 pt-2 mt-2">
              <span className="text-gray-400">Risk Amount:</span>
              <span className="text-red-400 font-mono">-${riskAmount.toFixed(2)}</span>
           </div>
           <div className="flex justify-between text-xs">
              <span className="text-gray-400">Reward Amount:</span>
              <span className="text-green-400 font-mono">+${potentialProfit.toFixed(2)}</span>
           </div>
           <div className="flex justify-between text-xs font-bold bg-black/20 p-1 rounded mt-1">
              <span className="text-gray-400">R:R Ratio:</span>
              <span className={rrColor}>1 : {rrRatio.toFixed(2)}</span>
           </div>
       </div>
    </div>
  );
};
