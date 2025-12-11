
import React, { useState, useEffect } from 'react';
import { JournalEntry, CryptoData } from '../types';
import { InfoPopup } from './InfoPopup';

interface TradingJournalProps {
    selectedCoin: CryptoData | null;
}

export const TradingJournal: React.FC<TradingJournalProps> = ({ selectedCoin }) => {
    const [entries, setEntries] = useState<Record<string, JournalEntry[]>>(() => {
        const saved = localStorage.getItem('crypto_oracle_journal');
        return saved ? JSON.parse(saved) : {};
    });
    
    const [note, setNote] = useState("");
    const [sentiment, setSentiment] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');

    useEffect(() => {
        localStorage.setItem('crypto_oracle_journal', JSON.stringify(entries));
    }, [entries]);

    const handleSave = () => {
        if (!selectedCoin || !note.trim()) return;
        
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            coinId: selectedCoin.id,
            note: note,
            sentiment: sentiment,
            timestamp: Date.now()
        };

        setEntries(prev => ({
            ...prev,
            [selectedCoin.id]: [newEntry, ...(prev[selectedCoin.id] || [])]
        }));
        setNote("");
        setSentiment("neutral");
    };

    const handleDelete = (entryId: string) => {
        if (!selectedCoin) return;
        setEntries(prev => ({
            ...prev,
            [selectedCoin.id]: prev[selectedCoin.id].filter(e => e.id !== entryId)
        }));
    };

    const currentEntries = selectedCoin ? (entries[selectedCoin.id] || []) : [];

    return (
        <div className="bg-crypto-card border border-gray-800 rounded-xl overflow-hidden flex flex-col h-full animate-fade-in-up">
            <div className="p-4 border-b border-gray-800 bg-blue-900/10 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-crypto-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Trading Journal
                    <InfoPopup data={{
                        title: "Trading Journal",
                        content: "Document your trades and thoughts. Writing down *why* you are entering a trade is the best way to improve over time."
                    }}/>
                </h3>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
                {selectedCoin ? (
                    <>
                        <div className="mb-6 space-y-3">
                            <textarea 
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={`Write your thoughts on ${selectedCoin.name}... e.g. "Breaking resistance at $${selectedCoin.current_price}..."`}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-crypto-accent outline-none min-h-[100px]"
                            />
                            <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                    {(['bullish', 'neutral', 'bearish'] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setSentiment(s)}
                                            className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${
                                                sentiment === s 
                                                ? (s === 'bullish' ? 'bg-green-500 text-white' : s === 'bearish' ? 'bg-red-500 text-white' : 'bg-gray-600 text-white')
                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={handleSave}
                                    disabled={!note.trim()}
                                    className="bg-crypto-accent hover:bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save Note
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs text-gray-500 uppercase font-bold tracking-wider">Previous Entries</h4>
                            {currentEntries.length === 0 ? (
                                <p className="text-center text-gray-600 text-xs py-4">No notes for this asset yet.</p>
                            ) : (
                                currentEntries.map(entry => (
                                    <div key={entry.id} className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/50 group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                                entry.sentiment === 'bullish' ? 'bg-green-500/20 text-green-400' :
                                                entry.sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'
                                            }`}>
                                                {entry.sentiment}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                                                <button onClick={() => handleDelete(entry.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                                    &times;
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{entry.note}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center text-gray-500 text-sm mt-10">Select a coin to view or add notes.</div>
                )}
            </div>
        </div>
    );
};
