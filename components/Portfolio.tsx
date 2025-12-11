
import React, { useState, useEffect } from 'react';
import { CryptoData, PortfolioState, PortfolioPosition } from '../types';
import { InfoPopup } from './InfoPopup';

interface PortfolioProps {
  selectedCoin: CryptoData | null;
  currentPrice: number;
  marketData: CryptoData[]; // To calculate total value
  onNotify: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

const INITIAL_BALANCE = 10000; // $10k Paper Money

export const Portfolio: React.FC<PortfolioProps> = ({ selectedCoin, currentPrice, marketData, onNotify }) => {
  const [portfolio, setPortfolio] = useState<PortfolioState>(() => {
    const saved = localStorage.getItem('crypto_oracle_portfolio');
    return saved ? JSON.parse(saved) : { cashBalance: INITIAL_BALANCE, positions: [], transactions: [] };
  });

  const [tradeAmountUSD, setTradeAmountUSD] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'trade' | 'positions'>('trade');

  useEffect(() => {
    localStorage.setItem('crypto_oracle_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  // Calculate preview quantity based on USD input
  const cleanAmount = tradeAmountUSD.replace(',', '.');
  const amountValue = parseFloat(cleanAmount);
  const previewQty = (selectedCoin && currentPrice > 0 && !isNaN(amountValue)) 
    ? amountValue / currentPrice 
    : 0;

  const handleTransaction = (type: 'BUY' | 'SELL') => {
    if (!selectedCoin) {
        onNotify("Action Failed", "Please select a coin from the list first.", "warning");
        return;
    }
    
    if (isNaN(amountValue) || amountValue <= 0) {
        onNotify("Invalid Amount", "Please enter a valid positive dollar amount.", "warning");
        return;
    }

    const qty = previewQty; // Calculated quantity derived from USD amount
    const totalCost = amountValue; // The input IS the cost in USD

    if (type === 'BUY') {
      if (totalCost > portfolio.cashBalance) {
        onNotify("Insufficient Funds", `You want to buy $${totalCost.toFixed(2)} but have $${portfolio.cashBalance.toFixed(2)} paper money.`, "warning");
        return;
      }

      setPortfolio(prev => {
        const existingPosIndex = prev.positions.findIndex(p => p.coinId === selectedCoin.id);
        let newPositions = [...prev.positions];

        if (existingPosIndex >= 0) {
          // Average Up/Down
          const pos = newPositions[existingPosIndex];
          const totalValueOld = pos.amount * pos.averageBuyPrice;
          const totalValueNew = totalCost;
          const newAvg = (totalValueOld + totalValueNew) / (pos.amount + qty);
          
          newPositions[existingPosIndex] = {
            ...pos,
            amount: pos.amount + qty,
            averageBuyPrice: newAvg
          };
        } else {
          newPositions.push({
            coinId: selectedCoin.id,
            symbol: selectedCoin.symbol,
            amount: qty,
            averageBuyPrice: currentPrice
          });
        }

        return {
          ...prev,
          cashBalance: prev.cashBalance - totalCost,
          positions: newPositions,
          transactions: [...prev.transactions, {
            id: Date.now().toString(),
            type: 'BUY',
            coinId: selectedCoin.id,
            amount: qty,
            price: currentPrice,
            timestamp: Date.now()
          }]
        };
      });
      onNotify("Trade Executed", `Bought $${totalCost.toFixed(2)} of ${selectedCoin.symbol.toUpperCase()}`, "success");

    } else {
      // SELL
      const existingPos = portfolio.positions.find(p => p.coinId === selectedCoin.id);
      
      // Check if we have enough crypto to cover this USD value sell
      if (!existingPos || existingPos.amount < qty) {
        const maxSellUSD = existingPos ? existingPos.amount * currentPrice : 0;
        onNotify("Insufficient Holdings", `You are trying to sell $${totalCost.toFixed(2)} but only own $${maxSellUSD.toFixed(2)} worth.`, "warning");
        return;
      }

      setPortfolio(prev => {
        let newPositions = prev.positions.map(p => {
          if (p.coinId === selectedCoin.id) {
            return { ...p, amount: p.amount - qty };
          }
          return p;
        }).filter(p => p.amount > 0.000001); // Remove dust

        return {
          ...prev,
          cashBalance: prev.cashBalance + totalCost,
          positions: newPositions,
          transactions: [...prev.transactions, {
             id: Date.now().toString(),
             type: 'SELL',
             coinId: selectedCoin.id,
             amount: qty,
             price: currentPrice,
             timestamp: Date.now()
           }]
        };
      });
      onNotify("Trade Executed", `Sold $${totalCost.toFixed(2)} of ${selectedCoin.symbol.toUpperCase()}`, "success");
    }
    setTradeAmountUSD('');
  };

  const resetPortfolio = () => {
    // Direct forced reset without confirm for better UX responsiveness if user is frustrated
    if(confirm("Are you sure? This will reset your balance to $10,000 and clear all history.")) {
        const newState = { cashBalance: INITIAL_BALANCE, positions: [], transactions: [] };
        setPortfolio(newState);
        // Force manual localstorage set in case useEffect is too slow
        localStorage.setItem('crypto_oracle_portfolio', JSON.stringify(newState));
        onNotify("Portfolio Reset", "Account reset to $10,000.", "info");
    }
  };

  // Calculations
  const totalPortfolioValue = portfolio.positions.reduce((acc, pos) => {
    const currentCoin = marketData.find(c => c.id === pos.coinId);
    const price = currentCoin ? currentCoin.current_price : pos.averageBuyPrice;
    return acc + (pos.amount * price);
  }, 0);

  const totalEquity = portfolio.cashBalance + totalPortfolioValue;
  const totalPnL = totalEquity - INITIAL_BALANCE;
  const totalPnLPct = (totalPnL / INITIAL_BALANCE) * 100;
  
  // Logic to show reset button: If balance has changed OR we have positions OR we have history
  const showReset = portfolio.cashBalance !== INITIAL_BALANCE || portfolio.positions.length > 0 || portfolio.transactions.length > 0;

  return (
    <div className="bg-crypto-card border border-gray-800 rounded-xl overflow-hidden animate-fade-in-up flex flex-col h-full">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-blue-900/10">
        <div>
           <h3 className="font-bold text-white flex items-center gap-2">
             <svg className="w-5 h-5 text-crypto-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
             Paper Sim
             <InfoPopup data={{
                title: "Paper Trading Simulator",
                content: "A risk-free environment to practice. Enter a USD amount to Buy or Sell. The system calculates the crypto quantity based on the real-time price."
             }} />
           </h3>
           <p className="text-[10px] text-gray-400">Practice without risk</p>
        </div>
        <div className="text-right">
           <div className="text-sm font-mono text-white">${totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
           <div className={`text-xs font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
             {totalPnL >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%
           </div>
        </div>
      </div>

      <div className="flex border-b border-gray-800">
         <button onClick={() => setActiveTab('trade')} className={`flex-1 py-2 text-xs font-bold ${activeTab === 'trade' ? 'text-crypto-accent border-b-2 border-crypto-accent' : 'text-gray-500 hover:text-white'}`}>Trade</button>
         <button onClick={() => setActiveTab('positions')} className={`flex-1 py-2 text-xs font-bold ${activeTab === 'positions' ? 'text-crypto-accent border-b-2 border-crypto-accent' : 'text-gray-500 hover:text-white'}`}>Positions ({portfolio.positions.length})</button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === 'trade' ? (
          <div className="space-y-4">
             {selectedCoin ? (
               <>
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{selectedCoin.name}</span>
                    <span className="text-sm font-mono text-gray-400">${currentPrice.toLocaleString()}</span>
                 </div>
                 
                 <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 focus-within:border-crypto-accent transition-colors">
                    <label className="text-xs text-gray-500 block mb-1">Value (USD)</label>
                    <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 font-mono pl-2">$</span>
                        <input 
                        type="number" 
                        value={tradeAmountUSD}
                        onChange={(e) => setTradeAmountUSD(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-transparent text-white font-mono text-lg outline-none pl-6"
                        />
                    </div>
                 </div>
                 
                 {/* Conversion Preview */}
                 <div className="flex justify-end text-xs">
                     <span className="text-gray-500">
                         ≈ <span className="font-mono text-white">{previewQty.toFixed(6)}</span> {selectedCoin.symbol.toUpperCase()}
                     </span>
                 </div>

                 <div className="grid grid-cols-2 gap-3 mt-4">
                    <button 
                      onClick={() => handleTransaction('BUY')}
                      className="bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/50 hover:border-green-500 py-3 rounded-lg font-bold transition-all shadow-lg shadow-green-900/20 active:scale-95"
                    >
                      BUY
                    </button>
                    <button 
                      onClick={() => handleTransaction('SELL')}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 hover:border-red-500 py-3 rounded-lg font-bold transition-all shadow-lg shadow-red-900/20 active:scale-95"
                    >
                      SELL
                    </button>
                 </div>
                 <div className="text-center mt-2 text-xs text-gray-500">
                    Cash Available: <span className="text-white font-mono">${portfolio.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                 </div>
               </>
             ) : (
               <div className="text-center text-gray-500 text-sm mt-10 p-4 border border-dashed border-gray-700 rounded-lg">
                   Select a coin from the list to start trading.
               </div>
             )}
          </div>
        ) : (
          <div className="space-y-3">
             {portfolio.positions.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-8">
                  No open positions. Start trading to see your portfolio grow (or shrink)!
                </div>
             ) : (
               portfolio.positions.map(pos => {
                  const coin = marketData.find(c => c.id === pos.coinId);
                  const currPrice = coin ? coin.current_price : pos.averageBuyPrice;
                  const value = pos.amount * currPrice;
                  const pnl = value - (pos.amount * pos.averageBuyPrice);
                  const pnlPct = (pnl / (pos.amount * pos.averageBuyPrice)) * 100;

                  return (
                    <div key={pos.coinId} className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors">
                       <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm text-white">{pos.symbol.toUpperCase()}</span>
                          <span className="font-mono text-xs text-white">${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">{pos.amount.toFixed(4)} @ ${pos.averageBuyPrice.toFixed(2)}</span>
                          <span className={`font-mono ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                          </span>
                       </div>
                    </div>
                  )
               })
             )}
             
             {/* Always show Reset if account is not pristine */}
             {showReset && (
                <div className="pt-4 mt-4 border-t border-gray-800">
                    <button 
                        type="button"
                        onClick={resetPortfolio} 
                        className="w-full text-center text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 py-2 rounded transition-colors"
                    >
                        Reset Portfolio Account
                    </button>
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
