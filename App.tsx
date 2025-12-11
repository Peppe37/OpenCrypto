
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchMarketData, fetchCandleData, fetchCryptoNews } from './services/cryptoService';
import { analyzeCrypto } from './services/geminiService';
import { calculateHeikinAshi, calculateRenko, calculateLineBreak, calculateKagi, calculatePointAndFigure, calculateRange } from './services/chartUtils';
import { CryptoData, CandleData, AnalysisResult, Notification, NewsItem, ServiceResponse, AdvancedChartType, AIConfig, AIProvider, DataConfig } from './types';
import { CryptoChart } from './components/Chart';
import { InfoPopup } from './components/InfoPopup';
import { CircularProgress } from './components/CircularProgress';
import { ChatWidget } from './components/ChatWidget';
import { Portfolio } from './components/Portfolio';
import { RiskCalculator } from './components/RiskCalculator';
import { TradingJournal } from './components/TradingJournal';

// Icons
const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${filled ? 'text-yellow-400 fill-current' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const MinusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
);

const ViewGridIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

const ViewOverlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ThumbUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
  </svg>
);

const ThumbDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
  </svg>
);

const CogIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ExpandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const AreaChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CandleChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
);

const AdjustmentsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);


// Distinct colors for comparison charts
const COMPARISON_COLORS = ['#3B82F6', '#00C076', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366f1'];

interface SettingsPageProps {
  aiConfig: AIConfig;
  setAiConfig: React.Dispatch<React.SetStateAction<AIConfig>>;
  dataConfig: DataConfig;
  setDataConfig: React.Dispatch<React.SetStateAction<DataConfig>>;
  onSave: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ aiConfig, setAiConfig, dataConfig, setDataConfig, onSave }) => {
    const activeProvider = aiConfig.provider;

    const updateConfig = (field: 'apiKeys' | 'models', value: string) => {
        setAiConfig(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                [activeProvider]: value
            }
        }));
    };

    return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-3xl font-bold mb-2 text-white">Application Settings</h2>
                <p className="text-gray-400">Configure AI providers and external data sources.</p>
            </div>
            <button 
              onClick={onSave}
              className="bg-crypto-accent hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20"
            >
                Save & Return
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Data Sources Settings */}
            <div className="bg-crypto-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    Data Sources (API Keys)
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">CoinGecko Demo Key (Optional)</label>
                        <input 
                            type="password" 
                            value={dataConfig.coingeckoKey} 
                            onChange={(e) => setDataConfig({...dataConfig, coingeckoKey: e.target.value})}
                            placeholder="CG-xxxxxxxxxxx"
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-crypto-accent outline-none transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">Increases rate limits for market data.</p>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">CryptoCompare API Key</label>
                        <input 
                            type="password" 
                            value={dataConfig.cryptoCompareKey} 
                            onChange={(e) => setDataConfig({...dataConfig, cryptoCompareKey: e.target.value})}
                            placeholder="Enter API Key..."
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-crypto-accent outline-none transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">Required for News and fallback candle data.</p>
                    </div>
                </div>
            </div>

            {/* AI Provider Settings */}
            <div className="bg-crypto-card p-6 rounded-xl border border-gray-800 md:col-span-2">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    AI Model Configuration
                </h3>

                <div className="mb-6">
                    <label className="block text-sm text-gray-300 mb-2 font-semibold">Active Provider</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(['gemini', 'openai', 'anthropic', 'ollama'] as AIProvider[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setAiConfig(prev => ({ ...prev, provider: p }))}
                                className={`p-3 rounded-lg border text-sm font-bold capitalize transition-all ${
                                    aiConfig.provider === p 
                                    ? 'bg-crypto-accent border-crypto-accent text-white shadow-lg shadow-blue-900/20' 
                                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1 font-medium">
                            {activeProvider === 'ollama' ? 'Server URL' : 'API Key'}
                        </label>
                        <input 
                            type={activeProvider === 'ollama' ? "text" : "password"}
                            value={aiConfig.apiKeys[activeProvider]} 
                            onChange={(e) => updateConfig('apiKeys', e.target.value)}
                            placeholder={activeProvider === 'ollama' ? "http://localhost:11434" : "sk-..."}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-crypto-accent outline-none transition-colors font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {activeProvider === 'ollama' ? 'Default: http://localhost:11434' : 'Your secret API key.'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1 font-medium">Model Name</label>
                        <input 
                            type="text" 
                            value={aiConfig.models[activeProvider]} 
                            onChange={(e) => updateConfig('models', e.target.value)}
                            placeholder={activeProvider === 'ollama' ? "llama3" : "gpt-4o"}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-crypto-accent outline-none transition-colors font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {activeProvider === 'ollama' 
                             ? 'Must match a model installed via `ollama pull`.' 
                             : 'Specify exact model ID (e.g. gemini-2.5-flash, gpt-4o).'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
  const [sidebarTab, setSidebarTab] = useState<'market' | 'watchlist' | 'portfolio' | 'journal'>('market');

  const [marketData, setMarketData] = useState<CryptoData[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CryptoData | null>(null);
  
  // Comparison State
  const [comparisonIds, setComparisonIds] = useState<Set<string>>(new Set());
  const [comparisonMode, setComparisonMode] = useState<'grid' | 'overlay'>('overlay');

  const [candlesMap, setCandlesMap] = useState<Record<string, CandleData[]>>({});
  const [candlesError, setCandlesError] = useState<Record<string, string>>({}); 
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isNewsLive, setIsNewsLive] = useState(false);
  
  // Settings & Config State
  const [dataConfig, setDataConfig] = useState<DataConfig>(() => {
      const saved = localStorage.getItem('data_config');
      return saved ? JSON.parse(saved) : { coingeckoKey: '', cryptoCompareKey: '' };
  });

  const DEFAULT_AI_CONFIG: AIConfig = {
    provider: 'gemini',
    apiKeys: { gemini: '', openai: '', anthropic: '', ollama: 'http://localhost:11434' },
    models: { 
      gemini: 'gemini-2.5-flash', 
      openai: 'gpt-4o', 
      anthropic: 'claude-3-5-sonnet-20240620', 
      ollama: 'llama3' 
    }
  };

  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    const saved = localStorage.getItem('ai_config');
    return saved ? JSON.parse(saved) : DEFAULT_AI_CONFIG;
  });

  const [timeframe, setTimeframe] = useState<number | 'max'>(30); 
  const [aiFeedback, setAiFeedback] = useState<'up' | 'down' | null>(null);

  // Chart Controls
  const [chartType, setChartType] = useState<AdvancedChartType>('candle');
  const [advancedChartType, setAdvancedChartType] = useState<AdvancedChartType>('candle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Chart Visual Settings
  const [isChartSettingsOpen, setIsChartSettingsOpen] = useState(false);
  const [chartSettings, setChartSettings] = useState({
    showZones: true,
    showMarkers: true,
  });

  // Timeframe Options
  const timeframeOptions: { label: string; val: number | 'max' }[] = [
      { label: '1D', val: 1 },
      { label: '1W', val: 7 },
      { label: '1M', val: 30 },
      { label: '6M', val: 180 },
      { label: '1Y', val: 365 },
      { label: 'MAX', val: 'max' }
  ];

  // Notifications Logic
  const addNotification = useCallback((title: string, message: string, type: 'success' | 'warning' | 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => {
        const exists = prev.some(n => n.title === title && n.message === message);
        if (exists) return prev;
        return [...prev, { id, title, message, type, timestamp: Date.now() }];
    });
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const handleServiceResponse = useCallback(<T,>(
    response: ServiceResponse<T>, 
    onSuccess: (data: T) => void,
    suppressWarning: boolean = false
  ) => {
    if (response.isFallback && !suppressWarning && response.message) {
       addNotification("Data Alert", response.message, "warning");
    }
    if (response.isError && response.message) {
       addNotification("Error", response.message, "warning");
    }
    if (response.data) {
        onSuccess(response.data);
    }
  }, [addNotification]);


  // Initial Load & News
  useEffect(() => {
    const loadData = async () => {
      const marketRes = await fetchMarketData(dataConfig);
      handleServiceResponse(marketRes, (data) => {
          setMarketData(data);
          if (data.length > 0 && !selectedCoin) {
              setSelectedCoin(data[0]);
              // Trigger initial fetch
              fetchCandleData(data[0].id, data[0].symbol, timeframe, dataConfig).then(res => {
                   if (res.data) setCandlesMap({ [data[0].id]: res.data });
                   else if (res.isError) setCandlesError({ [data[0].id]: res.message || "Error" });
              });
          }
      });

      const newsRes = await fetchCryptoNews(dataConfig.cryptoCompareKey);
      setIsNewsLive(!newsRes.isFallback);
      if (newsRes.data) setNews(newsRes.data);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling Market Data
  useEffect(() => {
    const intervalId = setInterval(async () => {
        const marketRes = await fetchMarketData(dataConfig);
        handleServiceResponse(marketRes, (updatedMarketData) => {
            setMarketData(updatedMarketData);
            if (selectedCoin) {
                const updatedCoin = updatedMarketData.find(c => c.id === selectedCoin.id);
                if (updatedCoin) setSelectedCoin(updatedCoin);
            }
        }, true);
    }, 60000); 
    return () => clearInterval(intervalId);
  }, [selectedCoin?.id, handleServiceResponse, dataConfig]); 

  // Fetch Candles Logic (Handles Primary + Comparisons)
  useEffect(() => {
      const fetchAllNeededCandles = async () => {
          if (!selectedCoin) return;
          
          const idsToFetch = new Set<string>(comparisonIds);
          idsToFetch.add(selectedCoin.id);

          const newCandlesMap: Record<string, CandleData[]> = { ...candlesMap };
          const newErrors: Record<string, string> = {};
          
          const promises = Array.from(idsToFetch).map(async (id) => {
              // Skip if we already have data for this timeframe unless forced refresh needed
              // For simplicity, we fetch again when timeframe changes
              const coin = marketData.find(c => c.id === id) || selectedCoin;
              const res = await fetchCandleData(id, coin.symbol, timeframe, dataConfig);
              return { id, res };
          });

          const results = await Promise.all(promises);
          results.forEach(r => {
              if (r.res.data) {
                  newCandlesMap[r.id] = r.res.data;
              } else if (r.res.isError) {
                  newErrors[r.id] = r.res.message || "Data Unavailable";
                  delete newCandlesMap[r.id]; // Remove stale data if error
              }
          });

          setCandlesMap(newCandlesMap);
          setCandlesError(newErrors);
          setLastUpdated(new Date());
      };

      fetchAllNeededCandles();
  }, [selectedCoin, comparisonIds, timeframe, dataConfig]); 

  // Analysis Logic Function (Isolated)
  const runAiAnalysis = useCallback(async () => {
      if (!selectedCoin) return;
      const currentCandles = candlesMap[selectedCoin.id];

      if (currentCandles && currentCandles.length > 0) {
          setIsAnalyzing(true);
          setAnalysis(null);
          setAiFeedback(null);
          
          const aiResult = await analyzeCrypto(selectedCoin.name, currentCandles, aiConfig);
          
          setAnalysis(aiResult);
          setIsAnalyzing(false);
      } else {
          addNotification("Analysis Failed", "No chart data available to analyze.", "warning");
      }
  }, [selectedCoin, candlesMap, aiConfig, addNotification]);

  // Clear Analysis when coin changes so we can manually trigger new one
  useEffect(() => {
     setAnalysis(null);
     setIsAnalyzing(false);
  }, [selectedCoin?.id]);

  // Derived Data for Chart
  const primaryCandles = useMemo(() => {
      return selectedCoin ? (candlesMap[selectedCoin.id] || []) : [];
  }, [candlesMap, selectedCoin]);
  
  const primaryError = useMemo(() => {
      return selectedCoin ? candlesError[selectedCoin.id] : null;
  }, [candlesError, selectedCoin]);

  const comparisonOverlayData = useMemo(() => {
      if (comparisonIds.size === 0 || !selectedCoin) return [];

      const ids = [selectedCoin.id, ...Array.from(comparisonIds)];
      // We need to merge candles by time.
      const allTimestamps = new Set<number>();
      ids.forEach(id => {
          const c = candlesMap[id];
          if(c) c.forEach(d => allTimestamps.add(d.time));
      });
      
      const sortedTimes = Array.from(allTimestamps).sort((a,b) => a - b);
      const basePrices: Record<string, number> = {};
      
      return sortedTimes.map(time => {
          const point: any = { time };
          ids.forEach(id => {
              const candle = candlesMap[id]?.find(c => c.time === time);
              if (candle) {
                  if (!basePrices[id]) basePrices[id] = candle.close;
                  const pctChange = ((candle.close - basePrices[id]) / basePrices[id]) * 100;
                  point[id] = pctChange;
              }
          });
          return point;
      });

  }, [candlesMap, comparisonIds, selectedCoin]);

  const comparisonSeries = useMemo(() => {
      if (!selectedCoin) return [];
      const ids = [selectedCoin.id, ...Array.from(comparisonIds)];
      return ids.map((id, index) => {
          const coin = marketData.find(c => c.id === id);
          return {
              dataKey: id,
              name: coin ? coin.symbol.toUpperCase() : id,
              color: COMPARISON_COLORS[index % COMPARISON_COLORS.length]
          };
      });
  }, [comparisonIds, selectedCoin, marketData]);

  // Transform Data Logic for Fullscreen Advanced Charts
  const fullscreenData = useMemo(() => {
      if (!isFullscreen) return primaryCandles;
      switch (advancedChartType) {
          case 'heikin_ashi': return calculateHeikinAshi(primaryCandles);
          case 'renko': return calculateRenko(primaryCandles);
          case 'line_break': return calculateLineBreak(primaryCandles);
          case 'kagi': return calculateKagi(primaryCandles);
          case 'point_figure': return calculatePointAndFigure(primaryCandles);
          case 'range': return calculateRange(primaryCandles);
          default: return primaryCandles;
      }
  }, [primaryCandles, advancedChartType, isFullscreen]);


  const handleSelectCoin = (coin: CryptoData) => {
    if (selectedCoin?.id !== coin.id) {
        setSelectedCoin(coin);
        setMobileMenuOpen(false);
        setCurrentView('dashboard');
        // Reset sidebar tab if needed, but keeping it can be annoying, let's just close mobile menu
        if (comparisonIds.has(coin.id)) {
            const next = new Set(comparisonIds);
            next.delete(coin.id);
            setComparisonIds(next);
        }
    }
  };

  const toggleCompare = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectedCoin?.id === id) return; 

      const next = new Set(comparisonIds);
      if (next.has(id)) {
          next.delete(id);
      } else {
          if (next.size >= 3) {
              addNotification("Limit Reached", "Max 4 coins in comparison.", "info");
              return;
          }
          next.add(id);
      }
      setComparisonIds(next);
  };

  const toggleWatchlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(watchlist);
    if (newSet.has(id)) newSet.delete(id);
    else {
      newSet.add(id);
      addNotification('Watchlist Updated', `Added ${id} to watchlist.`, 'info');
    }
    setWatchlist(newSet);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setAiFeedback(type);
    addNotification('Feedback Received', 'Thank you for rating.', 'info');
  };

  // --- Settings Handlers ---
  
  const handleSaveSettings = () => {
    localStorage.setItem('data_config', JSON.stringify(dataConfig));
    localStorage.setItem('ai_config', JSON.stringify(aiConfig));
    addNotification("Settings Saved", "Configuration updated successfully. Reloading data...", "success");
    setMobileMenuOpen(false);
    
    // Trigger reloads
    fetchCryptoNews(dataConfig.cryptoCompareKey).then(res => {
         setIsNewsLive(!res.isFallback);
         if(res.data) setNews(res.data);
    });
    
    // Clear candle cache to force new fetch with new keys
    setCandlesMap({});
    if(selectedCoin) {
        fetchCandleData(selectedCoin.id, selectedCoin.symbol, timeframe, dataConfig).then(res => {
            if(res.data) setCandlesMap(prev => ({...prev, [selectedCoin.id]: res.data!}));
        });
    }
    setCurrentView('dashboard');
  };
  
  const handleSnapshot = () => {
     const svg = document.querySelector('#crypto-chart-container svg');
     if (!svg) return;
     const serializer = new XMLSerializer();
     const source = serializer.serializeToString(svg);
     const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
     const url = URL.createObjectURL(blob);
     const link = document.createElement("a");
     link.href = url;
     link.download = `${selectedCoin?.symbol}_chart_${Date.now()}.svg`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     addNotification("Snapshot Saved", "Chart downloaded.", "success");
  };

  const generateSessionMarkers = () => {
     if (!analysis || !analysis.keyTimezones) return [];
     if (!primaryCandles || primaryCandles.length === 0) return [];
     
     const mapping: Record<string, number> = {
         "London Open": 8, "NY Open": 13, "NY Close": 21, "Tokyo Open": 0, "Sydney Open": 22
     };

     const markers: any[] = [];
     const recentCandles = primaryCandles.slice(-120); 
     analysis.keyTimezones.forEach(tz => {
         const mapKey = Object.keys(mapping).find(k => tz.includes(k.split(' ')[0]));
         if (mapKey) {
             const targetHour = mapping[mapKey];
             recentCandles.forEach(c => {
                 const date = new Date(c.time);
                 if (date.getUTCHours() === targetHour) {
                     markers.push({
                         time: c.time,
                         label: mapKey.split(' ')[0],
                         color: '#8b5cf6' 
                     });
                 }
             });
         }
     });
     
     const uniqueMarkers = markers.filter((v,i,a)=>a.findIndex(t=>(t.time === v.time))===i);
     return uniqueMarkers.slice(-5);
  };

  const chartMarkers = generateSessionMarkers();
  
  // Filter logic for sidebar
  const displayedCoins = sidebarTab === 'watchlist' 
    ? marketData.filter(c => watchlist.has(c.id))
    : marketData;

  // --- Components ---

  const FullscreenModal = () => (
      <div className="fixed inset-0 z-[9999] bg-crypto-dark flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-crypto-card overflow-x-auto no-scrollbar">
               <div className="flex items-center gap-3 shrink-0">
                  <h2 className="text-xl font-bold">{selectedCoin?.name} Analysis</h2>
                  <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400 font-mono">Pro Mode</span>
               </div>
               
               <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 hidden sm:inline">Chart Type:</span>
                        <select 
                            value={advancedChartType}
                            onChange={(e) => setAdvancedChartType(e.target.value as AdvancedChartType)}
                            className="bg-gray-800 text-xs text-white border border-gray-700 rounded px-2 py-1 outline-none focus:border-crypto-accent"
                        >
                            <optgroup label="Standard">
                                <option value="candle">Candles</option>
                                <option value="hollow_candle">Hollow Candles</option>
                                <option value="bar">Bars</option>
                                <option value="line">Line</option>
                                <option value="area">Area</option>
                                <option value="column">Columns (Volume)</option>
                            </optgroup>
                            <optgroup label="Advanced">
                                <option value="heikin_ashi">Heikin Ashi</option>
                                <option value="renko">Renko</option>
                                <option value="line_break">Line Break</option>
                                <option value="kagi">Kagi</option>
                                <option value="point_figure">Point & Figure</option>
                                <option value="range">Range</option>
                            </optgroup>
                        </select>
                    </div>

                    <div className="flex bg-gray-800 rounded p-1 gap-1 overflow-x-auto">
                        {timeframeOptions.map(tf => (
                            <button
                                key={tf.label}
                                onClick={() => setTimeframe(tf.val)}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                                    timeframe === tf.val 
                                    ? 'bg-crypto-accent text-white' 
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>
                   <button onClick={() => setIsFullscreen(false)} className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white">Close</button>
               </div>
          </div>
          <div className="flex-1 p-6 overflow-hidden">
               <CryptoChart 
                  key={`fs-${timeframe}-${advancedChartType}-${selectedCoin?.id}`}
                  data={fullscreenData} 
                  zones={chartSettings.showZones ? analysis?.actionZones : undefined} 
                  type={advancedChartType}
                  markers={chartSettings.showMarkers ? chartMarkers : undefined}
                  isFullscreen={true}
                  error={primaryError}
                />
          </div>
      </div>
  );

  return (
    <div className="flex h-screen bg-crypto-dark text-white overflow-hidden font-sans">
      
      {isFullscreen && <FullscreenModal />}

      {isChartSettingsOpen && (
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsChartSettingsOpen(false)} />
      )}

      {mobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-[100] w-80 
        bg-crypto-card border-r border-gray-800 flex flex-col 
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 shadow-2xl lg:shadow-none
      `}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tighter text-crypto-accent">
                CRYPTO<span className="text-white">ORACLE</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">AI-Powered Market Intelligence</p>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Sidebar Tabs */}
        <div className="flex border-b border-gray-800">
           <button 
             className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${sidebarTab === 'market' ? 'text-crypto-accent border-b-2 border-crypto-accent bg-blue-900/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
             onClick={() => setSidebarTab('market')}
           >
             Market
           </button>
           <button 
             className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${sidebarTab === 'watchlist' ? 'text-crypto-accent border-b-2 border-crypto-accent bg-blue-900/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
             onClick={() => setSidebarTab('watchlist')}
           >
             Watch <span className="ml-1 text-[10px] bg-gray-800 px-1.5 py-0.5 rounded-full text-gray-400">{watchlist.size}</span>
           </button>
           <button 
             className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${(sidebarTab === 'portfolio' || sidebarTab === 'journal') ? 'text-crypto-accent border-b-2 border-crypto-accent bg-blue-900/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
             onClick={() => setSidebarTab('portfolio')}
           >
             Tools
           </button>
        </div>
        
        {/* Sub-tabs for Tools if selected */}
        {(sidebarTab === 'portfolio' || sidebarTab === 'journal') && (
            <div className="flex bg-gray-900 border-b border-gray-800">
                <button 
                    onClick={() => setSidebarTab('portfolio')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase ${sidebarTab === 'portfolio' ? 'text-white bg-gray-800' : 'text-gray-500'}`}
                >
                    Simulator
                </button>
                <button 
                    onClick={() => setSidebarTab('journal')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase ${sidebarTab === 'journal' ? 'text-white bg-gray-800' : 'text-gray-500'}`}
                >
                    Journal
                </button>
            </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            {sidebarTab === 'portfolio' ? (
                <div className="h-full">
                    <Portfolio 
                        selectedCoin={selectedCoin} 
                        currentPrice={selectedCoin?.current_price || 0}
                        marketData={marketData}
                        onNotify={addNotification}
                    />
                </div>
            ) : sidebarTab === 'journal' ? (
                <div className="h-full">
                    <TradingJournal selectedCoin={selectedCoin} />
                </div>
            ) : (
                displayedCoins.map(coin => {
                    const isSelected = selectedCoin?.id === coin.id;
                    const isComparing = comparisonIds.has(coin.id);
                    return (
                    <div 
                    key={coin.id}
                    onClick={() => handleSelectCoin(coin)}
                    className={`group flex items-center p-3 mb-2 rounded-lg cursor-pointer transition-all ${isSelected && currentView === 'dashboard' ? 'bg-blue-900/30 border border-blue-500/50' : 'hover:bg-gray-800 border border-transparent'}`}
                    >
                    <button onClick={(e) => toggleWatchlist(coin.id, e)} className="mr-3 hover:scale-110 transition-transform">
                        <StarIcon filled={watchlist.has(coin.id)} />
                    </button>
                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full mr-3" />
                    <div className="flex-1">
                        <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">{coin.symbol.toUpperCase()}</span>
                        <span className="font-mono text-sm transition-colors duration-300">${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">{coin.name}</span>
                        <span className={`text-xs ${coin.price_change_percentage_24h >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
                            {coin.price_change_percentage_24h.toFixed(2)}%
                        </span>
                        </div>
                    </div>
                    
                    {/* Compare Button (Visible on hover or if active) */}
                    <button 
                        onClick={(e) => toggleCompare(coin.id, e)}
                        className={`ml-2 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 ${isComparing ? 'opacity-100 bg-crypto-accent text-white' : 'hover:bg-gray-700 text-gray-500'}`}
                        title={isComparing ? "Remove from comparison" : "Add to comparison"}
                    >
                        {isComparing ? <MinusIcon /> : <PlusIcon />}
                    </button>
                    </div>
                )})
            )}
        </div>
        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-black/20 text-[10px] text-gray-500 space-y-1 relative">
            <div className="flex justify-between">
                <span>AI Provider:</span>
                <span className="text-crypto-accent uppercase font-bold">{aiConfig.provider}</span>
            </div>
            <div className="flex justify-between">
                <span>Market Data:</span>
                <span className="text-green-400">CoinGecko / CC</span>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-700/30">
                <button 
                  onClick={() => {
                      setCurrentView('settings');
                      setMobileMenuOpen(false);
                  }} 
                  className={`w-full text-left flex items-center gap-2 p-2 rounded transition-colors ${currentView === 'settings' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                    <CogIcon /> Settings & Keys
                </button>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto relative bg-crypto-dark">
        
        {currentView === 'settings' ? (
           <SettingsPage 
             aiConfig={aiConfig} 
             setAiConfig={setAiConfig} 
             dataConfig={dataConfig} 
             setDataConfig={setDataConfig} 
             onSave={handleSaveSettings} 
           />
        ) : (
          <>
            <header className="h-16 border-b border-gray-800 flex items-center justify-between px-4 lg:px-6 bg-crypto-dark/95 backdrop-blur sticky top-0 z-20">
                {/* Header content same as before but added comparison indicator */}
                <div className="flex items-center gap-4">
                   <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-1 rounded-md hover:bg-gray-800 transition-colors">
                      <MenuIcon />
                   </button>
                   {selectedCoin && (
                     <div className="flex items-center gap-3">
                       <img src={selectedCoin.image} className="w-8 h-8" alt="logo"/>
                       <div>
                           <div className="flex items-center gap-2">
                               <h2 className="text-lg lg:text-xl font-bold leading-tight">{selectedCoin.name}</h2>
                               {comparisonIds.size > 0 && (
                                   <span className="text-xs bg-crypto-accent/20 text-crypto-accent px-2 py-0.5 rounded-full font-bold">
                                       + {comparisonIds.size} Compared
                                   </span>
                               )}
                           </div>
                           <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-400 bg-gray-800 px-1.5 rounded">
                                    {selectedCoin.symbol.toUpperCase()}/USD
                                </span>
                           </div>
                       </div>
                     </div>
                   )}
                </div>
            </header>

            <div className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                    <h3 className="text-lg font-semibold flex items-center">
                        {comparisonIds.size > 0 ? (comparisonMode === 'grid' ? 'Comparison Grid' : 'Performance Comparison') : 'Price Action & Zones'}
                        <InfoPopup data={{
                            title: "Interactive Chart",
                            content: "View historical price data. Use the overlay buttons to compare multiple assets. Zoom with the mouse wheel."
                        }}/>
                    </h3>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                         {/* Comparison Toggle */}
                         {comparisonIds.size > 0 && (
                            <div className="flex bg-gray-800 rounded-lg p-1 gap-1 mr-2 border border-gray-700 shrink-0">
                                <button 
                                    onClick={() => setComparisonMode('overlay')}
                                    className={`p-1.5 rounded transition-colors ${comparisonMode === 'overlay' ? 'bg-crypto-accent text-white' : 'text-gray-400 hover:text-white'}`}
                                    title="Overlay Mode"
                                >
                                    <ViewOverlayIcon />
                                </button>
                                <button 
                                    onClick={() => setComparisonMode('grid')}
                                    className={`p-1.5 rounded transition-colors ${comparisonMode === 'grid' ? 'bg-crypto-accent text-white' : 'text-gray-400 hover:text-white'}`}
                                    title="Grid Mode"
                                >
                                    <ViewGridIcon />
                                </button>
                            </div>
                        )}

                        <div className="flex bg-gray-800 rounded-lg p-1 gap-1 overflow-x-auto no-scrollbar shrink-0 max-w-[200px] sm:max-w-none">
                            {timeframeOptions.map(tf => (
                                <button
                                    key={tf.label}
                                    onClick={() => setTimeframe(tf.val)}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                                        timeframe === tf.val 
                                        ? 'bg-crypto-accent text-white' 
                                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative z-50 shrink-0">
                            <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
                                {comparisonIds.size === 0 && (
                                    <>
                                        <button onClick={() => setChartType('area')} className={`p-1.5 rounded transition-colors ${chartType === 'area' ? 'bg-crypto-accent text-white' : 'text-gray-400 hover:text-white'}`} title="Area Chart"><AreaChartIcon /></button>
                                        <button onClick={() => setChartType('candle')} className={`p-1.5 rounded transition-colors ${chartType === 'candle' ? 'bg-crypto-accent text-white' : 'text-gray-400 hover:text-white'}`} title="Candle Chart"><CandleChartIcon /></button>
                                    </>
                                )}
                                <button onClick={handleSnapshot} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700" title="Snapshot"><CameraIcon /></button>
                                
                                {comparisonIds.size === 0 && (
                                    <>
                                        <button onClick={() => setIsFullscreen(true)} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700" title="Fullscreen"><ExpandIcon /></button>
                                        <div className="w-[1px] bg-gray-700 mx-1"></div>
                                        <button 
                                            onClick={() => setIsChartSettingsOpen(!isChartSettingsOpen)}
                                            className={`p-1.5 rounded transition-colors ${isChartSettingsOpen ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                                            title="Chart Settings"
                                        >
                                            <AdjustmentsIcon />
                                        </button>
                                    </>
                                )}
                            </div>
                            
                            {/* Settings Dropdown */}
                            {isChartSettingsOpen && comparisonIds.size === 0 && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-crypto-card border border-gray-700 rounded-lg shadow-2xl p-4 flex flex-col gap-3">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase">Overlays</h4>
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-sm text-gray-300 group-hover:text-white">Support & Resistance</span>
                                        <input 
                                            type="checkbox" 
                                            checked={chartSettings.showZones} 
                                            onChange={() => setChartSettings(s => ({...s, showZones: !s.showZones}))}
                                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-crypto-accent focus:ring-crypto-accent/50"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-sm text-gray-300 group-hover:text-white">Session Markers</span>
                                        <input 
                                            type="checkbox" 
                                            checked={chartSettings.showMarkers} 
                                            onChange={() => setChartSettings(s => ({...s, showMarkers: !s.showMarkers}))}
                                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-crypto-accent focus:ring-crypto-accent/50"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {comparisonIds.size > 0 && comparisonMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[500px]">
                         <div className="bg-crypto-card p-2 rounded-xl border border-gray-800 relative h-[300px]">
                             <div className="absolute top-2 left-2 z-10 text-xs font-bold bg-black/50 px-2 py-1 rounded text-white">{selectedCoin?.symbol.toUpperCase()}</div>
                             <CryptoChart data={primaryCandles} type="area" height="100%" error={primaryError} />
                         </div>
                         {Array.from(comparisonIds).map(id => {
                             const coin = marketData.find(c => c.id === id);
                             const data = candlesMap[id] || [];
                             return (
                                <div key={id} className="bg-crypto-card p-2 rounded-xl border border-gray-800 relative h-[300px]">
                                    <div className="absolute top-2 left-2 z-10 text-xs font-bold bg-black/50 px-2 py-1 rounded text-white">{coin?.symbol.toUpperCase() || id}</div>
                                    <CryptoChart data={data} type="area" height="100%" error={candlesError[id]} />
                                </div>
                             )
                         })}
                    </div>
                ) : (
                    <CryptoChart 
                        key={`${timeframe}-${selectedCoin?.id}-${comparisonIds.size}-overlay`}
                        data={comparisonIds.size > 0 ? comparisonOverlayData || [] : primaryCandles}
                        type={chartType}
                        isOverlay={comparisonIds.size > 0}
                        series={comparisonIds.size > 0 ? comparisonSeries : undefined}
                        zones={comparisonIds.size === 0 && chartSettings.showZones ? analysis?.actionZones : undefined} 
                        markers={comparisonIds.size === 0 && chartSettings.showMarkers ? chartMarkers : undefined}
                        height={500}
                        error={primaryError}
                    />
                )}
                
                {analysis && comparisonIds.size === 0 && (
                  <div className="bg-crypto-card p-5 rounded-xl border border-gray-800 animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <h3 className="font-bold">Timezone Impact Analysis</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {analysis.keyTimezones.map((tz, idx) => (
                            <span key={idx} className="px-3 py-1 bg-purple-900/30 text-purple-300 border border-purple-500/30 rounded-full text-sm">
                                {tz}
                            </span>
                        ))}
                        <p className="text-sm text-gray-400 mt-2 w-full">
                            AI suggests paying attention to these sessions for maximum liquidity and trend confirmation. Markers on the chart indicate these times.
                        </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar - Analysis & News */}
              <div className="space-y-6">
                {isAnalyzing ? (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-crypto-card rounded-xl border border-gray-800 animate-pulse">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-blue-400 font-mono text-sm">AI ({aiConfig.provider}) is analyzing...</p>
                  </div>
                ) : analysis ? (
                    <>
                    <div className="bg-crypto-card p-6 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden group animate-fade-in-up">
                      <div className={`absolute top-0 left-0 w-1 h-full ${analysis.prediction === 'BULLISH' ? 'bg-green-500' : analysis.prediction === 'BEARISH' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                      
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2 flex items-center">
                                  Long Term Outlook ({selectedCoin?.symbol.toUpperCase()})
                                  <InfoPopup data={{
                                      title: "Trend Prediction",
                                      content: "AI Analysis of current market structure, momentum, and technical indicators to predict the likely trend over the coming days."
                                  }}/>
                              </h3>
                              <div className={`text-3xl font-bold flex items-center gap-3 ${analysis.prediction === 'BULLISH' ? 'text-white' : analysis.prediction === 'BEARISH' ? 'text-white' : 'text-gray-200'}`}>
                                    {analysis.prediction}
                              </div>
                          </div>
                          <div className="flex flex-col items-center pl-4">
                              <CircularProgress value={analysis.confidence} size={60} strokeWidth={5} />
                              <span className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">Confidence</span>
                          </div>
                      </div>

                      <p className="text-sm text-gray-300 leading-relaxed border-t border-gray-700 pt-4">
                          {analysis.reasoning}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700 animate-fade-in-up delay-100">
                        <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4 flex items-center">
                            AI Strategy
                            <InfoPopup data={{
                                title: "Action Signal",
                                content: "A specific trading recommendation (Buy, Sell, or Hold) based on the calculated Support/Resistance zones and overall sentiment."
                            }}/>
                        </h3>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500">Signal</span>
                                <span className={`text-2xl font-bold ${
                                    analysis.recommendation === 'BUY' ? 'text-green-400' : 
                                    analysis.recommendation === 'SELL' ? 'text-red-400' : 'text-yellow-400'
                                }`}>
                                    {analysis.recommendation}
                                </span>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold
                                ${analysis.recommendation === 'BUY' ? 'bg-green-500/20 text-green-500' : 
                                  analysis.recommendation === 'SELL' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}
                            `}>
                                {analysis.recommendation[0]}
                            </div>
                        </div>
                        <div className="mt-5 pt-4 border-t border-gray-700/50 flex items-center justify-between">
                            <span className="text-[11px] text-gray-500">Is this analysis helpful?</span>
                            <div className="flex gap-2">
                                <button onClick={() => handleFeedback('up')} disabled={!!aiFeedback} className={`p-1.5 rounded-md hover:bg-gray-700/50 transition-colors ${aiFeedback === 'up' ? 'text-green-400 bg-green-500/20 ring-1 ring-green-500/50' : 'text-gray-400'}`}><ThumbUpIcon /></button>
                                <button onClick={() => handleFeedback('down')} disabled={!!aiFeedback} className={`p-1.5 rounded-md hover:bg-gray-700/50 transition-colors ${aiFeedback === 'down' ? 'text-red-400 bg-red-500/20 ring-1 ring-red-500/50' : 'text-gray-400'}`}><ThumbDownIcon /></button>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Risk Calculator */}
                    <RiskCalculator 
                        currentPrice={selectedCoin?.current_price || 0} 
                        coinId={selectedCoin?.id || ""} 
                    />

                    <div className="bg-crypto-card rounded-xl border border-gray-800 p-4">
                        <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                            Latest Market News
                            <span className={`w-1.5 h-1.5 rounded-full ${isNewsLive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                            <span className="text-[10px] text-gray-600 font-mono">{isNewsLive ? '(LIVE)' : '(ARCHIVE)'}</span>
                            <InfoPopup data={{
                                title: "Real-time Feed",
                                content: "Latest headlines sourced from major crypto news outlets. Keeping abreast of news is crucial for fundamental analysis."
                            }}/>
                        </h3>
                        <div className="space-y-4">
                            {news.map((item) => (
                                <div key={item.id} className="group border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="text-sm font-medium text-gray-200 group-hover:text-crypto-accent transition-colors line-clamp-2">{item.title}</h4>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center text-[10px] text-gray-500 gap-2"><span className="font-semibold text-gray-400">{item.source}</span><span>•</span><span>{formatTimeAgo(item.published_on)}</span></div>
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-crypto-accent hover:text-white flex items-center gap-0.5 bg-blue-900/20 px-2 py-0.5 rounded transition-colors">Read <ExternalLinkIcon /></a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    </>
                ) : (
                    <div className="bg-crypto-card p-6 rounded-xl border border-gray-800 flex flex-col items-center justify-center text-center animate-fade-in-up shadow-xl h-[400px]">
                        <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                            <SparklesIcon />
                        </div>
                        <h3 className="text-white font-bold mb-2">AI Market Analysis</h3>
                        <p className="text-sm text-gray-400 mb-6 max-w-xs">
                            Generate a real-time technical analysis for {selectedCoin?.name} using {aiConfig.provider}.
                        </p>
                        <button 
                            onClick={runAiAnalysis}
                            className="bg-crypto-accent hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold w-full max-w-[200px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                        >
                            <SparklesIcon /> Run Analysis
                        </button>
                    </div>
                )}
              </div>
            </div>
            
            <ChatWidget 
              selectedCoin={selectedCoin} 
              analysis={analysis}
              candles={primaryCandles}
              aiConfig={aiConfig}
              news={news}
            />

          </>
        )}

        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {notifications.map(n => (
            <div key={n.id} className="pointer-events-auto bg-gray-800 border border-gray-600 text-white p-4 rounded shadow-2xl animate-fade-in-up flex items-start gap-3 w-80">
              <div className={`mt-1 w-2 h-2 rounded-full ${n.type === 'success' ? 'bg-green-400' : n.type === 'warning' ? 'bg-red-400' : 'bg-blue-400'}`}></div>
              <div><h4 className="font-bold text-sm">{n.title}</h4><p className="text-xs text-gray-300 mt-1">{n.message}</p></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;
