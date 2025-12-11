
import { CandleData, CryptoData, NewsItem, ServiceResponse, DataConfig } from '../types';

// --- Cache System ---
const CACHE_PREFIX = 'crypto_oracle_real_';
// Cache valid for 30 minutes 
const CACHE_TTL = 30 * 60 * 1000; 

const getFromCache = <T>(key: string): T | null => {
    try {
        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (Date.now() - parsed.timestamp > CACHE_TTL) {
            // Keep cache but mark as stale? For now, strict TTL
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return parsed.data;
    } catch { 
        return null; 
    }
};

const saveToCache = <T>(key: string, data: T) => {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    } catch (e) {
        console.warn("Cache save failed (Storage Full?)", e);
    }
};

// --- API Providers ---

// 1. CoinGecko Provider
const fetchCoinGeckoOHLC = async (coinId: string, days: number | 'max', apiKey?: string): Promise<CandleData[]> => {
    let url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
    
    // If user has a Pro Key, use the pro domain and header
    const headers: HeadersInit = {};
    if (apiKey) {
        // Simple heuristic: if key is present, assume we might be using pro or just authenticated free
        // Note: CoinGecko Pro uses 'pro-api.coingecko.com' usually, but 'x-cg-demo-api-key' works on public too
        headers['x-cg-demo-api-key'] = apiKey; 
    }

    const response = await fetch(url, { headers });
    
    if (response.status === 429) throw new Error("CoinGecko Rate Limit");
    if (!response.ok) throw new Error(`CoinGecko HTTP ${response.status}`);

    const data = await response.json();
    return data.map((d: number[]) => ({
        time: d[0],
        open: d[1],
        high: d[2],
        low: d[3],
        close: d[4],
        volume: 0 // CoinGecko OHLC endpoint sadly doesn't return volume
    }));
};

// 2. CryptoCompare Provider (Fallback)
const fetchCryptoCompareOHLC = async (symbol: string, days: number | 'max', apiKey?: string): Promise<CandleData[]> => {
    // Determine limit based on days (approximate candle count)
    let limit = 168; // Default 7 days (hourly)
    let aggregate = 1;
    let endpoint = 'histohour';

    if (days === 1) { endpoint = 'histominute'; limit = 1440; aggregate = 10; } // 10 min candles
    else if (days === 30) { endpoint = 'histohour'; limit = 720; }
    else if (days === 180 || days === 365 || days === 'max') { endpoint = 'histoday'; limit = days === 'max' ? 2000 : days as number; }

    let url = `https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${symbol.toUpperCase()}&tsym=USD&limit=${limit}&aggregate=${aggregate}`;
    if (apiKey) url += `&api_key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`CryptoCompare HTTP ${response.status}`);
    
    const json = await response.json();
    if (json.Response === 'Error') throw new Error(json.Message);

    return json.Data.Data.map((d: any) => ({
        time: d.time * 1000,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volumeto // Use volume in USD
    }));
};

// --- Main Service Functions ---

export const fetchMarketData = async (config?: DataConfig): Promise<ServiceResponse<CryptoData[]>> => {
    const cacheKey = 'market_data_global';
    
    // 1. Try CoinGecko
    try {
        let url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false';
        const headers: HeadersInit = {};
        if (config?.coingeckoKey) headers['x-cg-demo-api-key'] = config.coingeckoKey;

        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        saveToCache(cacheKey, data);
        return { data, isFallback: false };
    } catch (e) {
        console.warn("CoinGecko Market Data failed, checking cache...", e);
        
        // 2. Fallback to Cache
        const cached = getFromCache<CryptoData[]>(cacheKey);
        if (cached) {
            return { data: cached, isFallback: true, message: "Live data unavailable. Showing cached market data." };
        }

        // 3. Absolute Failure
        return { 
            data: [], 
            isFallback: false, 
            isError: true, 
            message: "Unable to fetch market data. Please check your internet connection or API limits." 
        };
    }
};

export const fetchCandleData = async (
    coinId: string, 
    symbol: string, 
    days: number | 'max' = 30, 
    config?: DataConfig
): Promise<ServiceResponse<CandleData[]>> => {
    const cacheKey = `candles_${coinId}_${days}`;
    
    // Strategy: CoinGecko -> CryptoCompare -> Cache -> Error
    
    // 1. Try CoinGecko
    try {
        const data = await fetchCoinGeckoOHLC(coinId, days, config?.coingeckoKey);
        if(data && data.length > 0) {
            saveToCache(cacheKey, data);
            return { data, isFallback: false };
        }
    } catch (e) {
        console.warn(`Primary provider (Gecko) failed for ${coinId}:`, e);
    }

    // 2. Try CryptoCompare
    try {
        const data = await fetchCryptoCompareOHLC(symbol, days, config?.cryptoCompareKey);
        if(data && data.length > 0) {
            // Don't overwrite CoinGecko cache preference unless strictly necessary, 
            // but here we just save what we got.
            saveToCache(cacheKey, data); 
            return { data, isFallback: false };
        }
    } catch (e) {
        console.warn(`Secondary provider (CryptoCompare) failed for ${symbol}:`, e);
    }

    // 3. Try Cache (Last Resort)
    const cached = getFromCache<CandleData[]>(cacheKey);
    if (cached && cached.length > 0) {
        return { 
            data: cached, 
            isFallback: true, 
            message: "Showing cached data. Live updates currently unavailable." 
        };
    }

    // 4. Failure
    return {
        data: null,
        isFallback: false,
        isError: true,
        message: "Data unavailable. API limits reached or connection error."
    };
};

export const fetchCryptoNews = async (apiKey?: string): Promise<ServiceResponse<NewsItem[]>> => {
  // News logic remains mostly the same, as CryptoCompare is the primary source here.
  const cacheKey = 'news_feed';
  
  try {
      let url = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
      if (apiKey) url += `&api_key=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("News API Error");
      
      const json = await response.json();
      const data = json.Data.map((item: any) => ({
          id: item.id,
          title: item.title,
          url: item.url,
          source: item.source_info.name,
          published_on: item.published_on,
          imageurl: item.imageurl
      })).slice(0, 5);

      saveToCache(cacheKey, data);
      return { data, isFallback: false };

  } catch (e) {
      const cached = getFromCache<NewsItem[]>(cacheKey);
      if (cached) return { data: cached, isFallback: true };
      
      return { data: [], isFallback: false, isError: true, message: "News unavailable." };
  }
};
