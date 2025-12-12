
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AnalysisResult, CandleData, AIConfig, ChatMessage } from "../types";

// --- Prompts ---
const SYSTEM_INSTRUCTION = `You are a professional crypto market analyst. Return ONLY raw JSON. No markdown formatting.`;
const CHAT_SYSTEM_INSTRUCTION = `You are OpenCrypto, an expert AI trading assistant.
You are helpful, concise, and professional. 
You have access to the user's current screen context (selected coin, price, technical analysis) which is provided in hidden context blocks.
Always answer based on the provided context if available.
Do not give financial advice as absolute fact, but as technical probabilities.
Keep answers short and readable (under 100 words unless asked for details).`;

const generatePrompt = (coinName: string, recentData: any[]) => `
Analyze this OHLC market data for ${coinName}.
Data: ${JSON.stringify(recentData)}

Perform a professional technical analysis.
1. Identify the long-term trend (Bullish/Bearish).
2. Determine support/resistance levels (Action Zones).
3. Suggest a trading action (Buy/Sell/Hold).
4. Mention relevant market "Timezones" or sessions (e.g. "NY Open volatility") that might affect this specific trend pattern.

Output JSON Schema:
{
  "prediction": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": number (0-100),
  "reasoning": "string (max 50 words)",
  "actionZones": {
    "support": [number, number],
    "resistance": [number, number]
  },
  "recommendation": "BUY" | "SELL" | "HOLD",
  "keyTimezones": ["string", "string"]
}
`;

// --- Helpers ---

// Clean JSON from potential markdown code blocks commonly returned by LLMs
const cleanJSON = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const prepareData = (candles: CandleData[]) => {
  return candles.slice(-20).map(c => ({
    d: new Date(c.time).toISOString().split('T')[0],
    o: c.open.toFixed(2),
    h: c.high.toFixed(2),
    l: c.low.toFixed(2),
    c: c.close.toFixed(2)
  }));
};

// --- Providers ---

const callGemini = async (apiKey: string, model: string, coinName: string, candles: CandleData[]): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const recentData = prepareData(candles);
  
  const response = await ai.models.generateContent({
    model: model || "gemini-2.5-flash",
    contents: generatePrompt(coinName, recentData),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prediction: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "NEUTRAL"] },
          confidence: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
          actionZones: {
            type: Type.OBJECT,
            properties: {
              support: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              resistance: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            },
            required: ["support", "resistance"],
          },
          recommendation: { type: Type.STRING, enum: ["BUY", "SELL", "HOLD"] },
          keyTimezones: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["prediction", "confidence", "reasoning", "actionZones", "recommendation", "keyTimezones"],
      },
    },
  });

  if (response.text) {
    return JSON.parse(response.text) as AnalysisResult;
  }
  throw new Error("Empty response from Gemini");
};

const callOpenAI = async (apiKey: string, model: string, coinName: string, candles: CandleData[]): Promise<AnalysisResult> => {
  const recentData = prepareData(candles);
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: generatePrompt(coinName, recentData) }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) throw new Error(`OpenAI API Error: ${response.statusText}`);
  const data = await response.json();
  const text = data.choices[0].message.content;
  return JSON.parse(cleanJSON(text));
};

const callAnthropic = async (apiKey: string, model: string, coinName: string, candles: CandleData[]): Promise<AnalysisResult> => {
  const recentData = prepareData(candles);
  
  // Note: Anthropic often blocks direct browser calls via CORS. This requires a proxy or valid CORS headers from server.
  // We implement the standard fetch here assuming a proxy or permissive environment.
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "dangerously-allow-browser": "true" // Client-side specific flag
    },
    body: JSON.stringify({
      model: model || "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      system: SYSTEM_INSTRUCTION,
      messages: [
        { role: "user", content: generatePrompt(coinName, recentData) }
      ]
    })
  });

  if (!response.ok) throw new Error(`Anthropic API Error: ${response.statusText}`);
  const data = await response.json();
  const text = data.content[0].text;
  return JSON.parse(cleanJSON(text));
};

const callOllama = async (baseUrl: string, model: string, coinName: string, candles: CandleData[]): Promise<AnalysisResult> => {
  const recentData = prepareData(candles);
  // Ensure we respect the custom URL or default to localhost
  const urlBase = baseUrl ? baseUrl.replace(/\/$/, '') : "http://localhost:11434";
  const url = `${urlBase}/api/chat`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "llama3", // Fallback if empty, but UI should provide it
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: generatePrompt(coinName, recentData) }
      ],
      stream: false,
      format: "json"
    })
  });

  if (!response.ok) throw new Error(`Ollama API Error: ${response.statusText}`);
  const data = await response.json();
  return JSON.parse(cleanJSON(data.message.content));
};

// --- Main Orchestrator ---

export const analyzeCrypto = async (
  coinName: string, 
  candles: CandleData[],
  config: AIConfig
): Promise<AnalysisResult> => {
  
  try {
    switch (config.provider) {
      case 'openai':
        if (!config.apiKeys.openai) throw new Error("OpenAI API Key missing");
        return await callOpenAI(config.apiKeys.openai, config.models.openai, coinName, candles);
      
      case 'anthropic':
        if (!config.apiKeys.anthropic) throw new Error("Anthropic API Key missing");
        return await callAnthropic(config.apiKeys.anthropic, config.models.anthropic, coinName, candles);
      
      case 'ollama':
        // URL is stored in apiKey field for simplicity in this implementation
        return await callOllama(config.apiKeys.ollama, config.models.ollama, coinName, candles);
      
      case 'gemini':
      default:
        // Prioritize custom key, fall back to env
        const key = config.apiKeys.gemini || process.env.API_KEY || "";
        if (!key) throw new Error("Gemini API Key missing");
        return await callGemini(key, config.models.gemini, coinName, candles);
    }

  } catch (error) {
    console.warn(`Analysis failed using provider ${config.provider}. Using fallback simulation.`, error);
    
    // Fallback logic
    const lastCandle = candles[candles.length - 1];
    const firstCandle = candles[0];
    const trend = lastCandle.close > firstCandle.open ? 'BULLISH' : 'BEARISH';
    
    await new Promise(r => setTimeout(r, 1000));

    return {
      prediction: trend,
      confidence: 50,
      reasoning: `(FALLBACK MODE) Connection to ${config.provider} failed or timed out. Analysis based on simple linear trend. Error: ${(error as Error).message}`,
      actionZones: { 
          support: [lastCandle.low * 0.95, lastCandle.low * 0.92],
          resistance: [lastCandle.high * 1.05, lastCandle.high * 1.08]
      },
      recommendation: 'HOLD',
      keyTimezones: ["System Offline"]
    };
  }
};

// --- Chat Capabilities ---

export const createChatSession = (apiKey: string, model: string): Chat => {
  const ai = new GoogleGenAI({ apiKey });
  return ai.chats.create({
    model: model || 'gemini-2.5-flash',
    config: {
      systemInstruction: CHAT_SYSTEM_INSTRUCTION
    }
  });
};

export const buildContextMessage = (
  userMessage: string, 
  coin: any, 
  analysis: AnalysisResult | null,
  latestCandle: CandleData | null
): string => {
  if (!coin) return userMessage;

  const contextBlock = `
  [SYSTEM CONTEXT - CURRENT USER SCREEN]
  Asset: ${coin.name} (${coin.symbol.toUpperCase()})
  Price: $${coin.current_price} (${coin.price_change_percentage_24h.toFixed(2)}% 24h)
  Latest Close: ${latestCandle ? latestCandle.close : 'N/A'}
  Analysis Prediction: ${analysis ? analysis.prediction : 'Not available'}
  Analysis Reasoning: ${analysis ? analysis.reasoning : 'Not available'}
  Analysis Action: ${analysis ? analysis.recommendation : 'N/A'}
  [END CONTEXT]
  
  User Query: ${userMessage}
  `;
  return contextBlock;
};

// Generic Chat Handler for Non-Gemini Providers
export const sendChatRequest = async (config: AIConfig, history: ChatMessage[], currentPrompt: string): Promise<string> => {
    // Basic conversion of chat history for other providers
    const messages = history.filter(m => m.id !== 'init').map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text
    }));
    // Append the current prompt which already includes context
    messages.push({ role: 'user', content: currentPrompt });
    // Add System instruction
    const fullMessages: any[] = [{ role: 'system', content: CHAT_SYSTEM_INSTRUCTION }, ...messages];

    try {
        if (config.provider === 'openai') {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKeys.openai}` },
                body: JSON.stringify({ model: config.models.openai || "gpt-4o", messages: fullMessages })
            });
            const data = await res.json();
            return data.choices?.[0]?.message?.content || "No response";
        }
        
        if (config.provider === 'anthropic') {
             const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { 
                    "x-api-key": config.apiKeys.anthropic,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                    "dangerously-allow-browser": "true"
                },
                body: JSON.stringify({ 
                    model: config.models.anthropic || "claude-3-5-sonnet-20240620", 
                    max_tokens: 1024,
                    system: CHAT_SYSTEM_INSTRUCTION,
                    messages: messages // Anthropic handles system separately
                })
            });
            const data = await res.json();
            return data.content?.[0]?.text || "No response";
        }

        if (config.provider === 'ollama') {
            const urlBase = config.apiKeys.ollama ? config.apiKeys.ollama.replace(/\/$/, '') : "http://localhost:11434";
            const res = await fetch(`${urlBase}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    model: config.models.ollama || "llama3", 
                    messages: fullMessages,
                    stream: false 
                })
            });
            const data = await res.json();
            return data.message?.content || "No response";
        }

        return "Provider not supported for chat.";

    } catch (e) {
        throw new Error(`Chat API Failed: ${(e as Error).message}`);
    }
};
