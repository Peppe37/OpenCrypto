
export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
  last_updated: string;
}

export interface CandleData {
  time: number; // Timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  // Optional extras for advanced charts
  trend?: 'up' | 'down'; 
  boxSize?: number;
}

export interface AnalysisResult {
  prediction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  reasoning: string;
  actionZones: {
    support: number[];
    resistance: number[];
  };
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  keyTimezones: string[]; // e.g., "London Open", "NY Close" relevant to the trend
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  timestamp: number;
}

export interface InfoPopupData {
  title: string;
  content: string;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  published_on: number;
  imageurl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isStreaming?: boolean;
}

// Portfolio Types
export interface PortfolioPosition {
  coinId: string;
  symbol: string;
  amount: number; // Quantity of coins
  averageBuyPrice: number;
}

export interface PortfolioState {
  cashBalance: number; // USD Available
  positions: PortfolioPosition[];
  transactions: {
    id: string;
    type: 'BUY' | 'SELL';
    coinId: string;
    amount: number;
    price: number;
    timestamp: number;
  }[];
}

export interface JournalEntry {
    id: string;
    coinId: string;
    note: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    timestamp: number;
}

// Standardized response wrapper for all services
export interface ServiceResponse<T> {
  data: T | null;
  isFallback: boolean;
  isError?: boolean;
  message?: string; // Optional user-facing message (e.g. "Rate limit hit")
}

// AI Configuration Types
export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  apiKeys: {
    gemini: string;
    openai: string;
    anthropic: string;
    ollama: string; // Base URL for Ollama usually
  };
  models: {
    gemini: string;
    openai: string;
    anthropic: string;
    ollama: string;
  };
}

export interface DataConfig {
  coingeckoKey: string;
  cryptoCompareKey: string;
}

// New Types for TradingView-like features
export type AdvancedChartType = 
  | 'candle'        // Standard
  | 'hollow_candle' // Hollow Candles
  | 'heikin_ashi'   // Averaged Candles
  | 'line'          // Standard Line
  | 'step_line'     // Step Line
  | 'area'          // Standard Area
  | 'baseline'      // Baseline (Green above avg, Red below)
  | 'hlc_area'      // HLC Area (High-Low-Close)
  | 'bar'           // Standard Bar
  | 'column'        // Just Volume/Metric Columns
  | 'renko'         // Renko Bricks
  | 'line_break'    // Three Line Break
  | 'kagi'          // Kagi
  | 'point_figure'  // Point & Figure
  | 'range';        // Range Bars