import { GoogleGenAI } from '@google/genai';
import { Client, WorkItem, UserProfile } from '../types';

/**
 * Prioritized list of Gemini models to support any Gemini API key across all tiers,
 * from the current 2026 default (gemini-3.8-flash) to versatile flash/pro fallbacks.
 */
export const GEMINI_CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-pro',
] as const;

export async function generateWorkSummary(
  clients: Client[],
  workItems: WorkItem[],
  upToDate: Date,
  profile: UserProfile | null | undefined
): Promise<string> {
  const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env)
    ? ((import.meta as any).env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY)
    : (typeof process !== 'undefined' && process.env ? (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) : undefined);
  const rawKey = profile?.geminiApiKey || envKey;
  const apiKey = typeof rawKey === 'string' ? rawKey.trim().replace(/^["']|["']$/g, '') : '';
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please add your API key in Profile Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Filter data up to the selected date
  const cutoffTime = upToDate.getTime();
  const filteredWork = workItems.filter(w => w.date <= cutoffTime);
  const filteredClients = clients.filter(c => c.createdAt <= cutoffTime);

  // Count subclients correctly
  let totalSubclients = 0;
  filteredClients.forEach(c => {
    if (c.subClients) {
      const validSubclients = c.subClients.filter(sc => (sc.createdAt || 0) <= cutoffTime);
      totalSubclients += validSubclients.length;
    }
  });

  const totalClients = filteredClients.length;
  const totalWorkItems = filteredWork.length;
  
  // Create a summary of achievements/work types
  const workDescriptions = Array.from(new Set(filteredWork.map(w => w.description))).slice(0, 15).join(', ');

  const professionalTitle = profile?.professionalTitle || "Freelancer";
  const name = profile?.name || "Professional";

  let earliestDate = cutoffTime;
  let hasClientFrom = false;

  filteredClients.forEach(c => {
    if (c.clientFrom) {
      const d = new Date(c.clientFrom).getTime();
      if (!isNaN(d) && d < earliestDate) earliestDate = d;
      hasClientFrom = true;
    }
    c.subClients?.forEach(sc => {
      if (sc.clientFrom) {
        const d = new Date(sc.clientFrom).getTime();
        if (!isNaN(d) && d < earliestDate) earliestDate = d;
        hasClientFrom = true;
      }
    });
  });

  let experienceText = "";
  if (hasClientFrom) {
    const diffTime = Math.abs(cutoffTime - earliestDate);
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    
    if (years > 0 && months > 0) {
      experienceText = `They have over ${years} year(s) and ${months} month(s) of professional experience.`;
    } else if (years > 0) {
      experienceText = `They have over ${years} year(s) of professional experience.`;
    } else if (months > 0) {
      experienceText = `They have over ${months} month(s) of professional experience.`;
    }
  }

  const prompt = `You are an expert career summarizing assistant. 
Please generate a single, professional, and engaging paragraph (about 3-4 sentences) summarizing the work experience and achievements of ${name}, a ${professionalTitle}.
${experienceText} They have completed ${totalWorkItems} work items/tasks, served ${totalClients} primary clients, and ${totalSubclients} sub-clients.
Some examples of their work include: ${workDescriptions || 'general freelancing work'}.
Do not mention specific dates or specific earnings unless provided. Focus on highlighting their capacity, their experience length, the breadth of their client base, and the volume of work they've delivered up to this point. Make it sound suitable for a LinkedIn summary or portfolio "About Me" section. Do not use markdown formatting like bolding or headers, just a plain text paragraph.`;

  // Dynamic Multi-Tier Model Cascade for maximum versatility across any Gemini API key
  const triedModels: string[] = [];
  const candidateModels: string[] = [...GEMINI_CANDIDATE_MODELS];

  for (const model of candidateModels) {
    try {
      triedModels.push(model);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      
      if (response && response.text) {
        return response.text;
      }
    } catch (error: any) {
      const rawError = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      
      // If the API key is completely invalid, expired or unauthorized, report immediately
      if (
        rawError.includes('API_KEY_INVALID') ||
        rawError.includes('API key not valid') ||
        rawError.includes('API_KEY_MISSING') ||
        (rawError.includes('PERMISSION_DENIED') && (rawError.includes('API key') || rawError.includes('Consumer')))
      ) {
        throw new Error("Your Gemini API key is invalid or has expired. Please verify your key at Google AI Studio (aistudio.google.com) and update it in your Profile Settings.");
      }

      // Check if model is not available for this key tier (404, deprecated, quota on model, etc.)
      const isUnavailable =
        rawError.includes('404') ||
        rawError.includes('NOT_FOUND') ||
        rawError.includes('no longer available') ||
        rawError.includes('not found') ||
        rawError.includes('unsupported') ||
        rawError.includes('ResourceExhausted');

      if (isUnavailable) {
        console.warn(`[Gemini AI] Model ${model} unavailable for this API key, falling back to next candidate...`);
        continue;
      }

      console.warn(`[Gemini AI] Error invoking ${model}:`, rawError);
    }
  }

  // Last-resort fallback: attempt dynamic discovery of any models supported by this key
  try {
    const listRes = await ai.models.list();
    if (listRes && Array.isArray(listRes.models) && listRes.models.length > 0) {
      const discovered = listRes.models
        .map(m => m.name ? m.name.replace(/^models\//, '') : '')
        .filter(name => Boolean(name) && !triedModels.includes(name));

      for (const model of discovered) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
          });
          if (response && response.text) {
            return response.text;
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Model listing not permitted or failed
  }

  throw new Error(
    "Unable to generate summary with your Gemini API key across available models. Please verify that your Gemini API key has model access enabled in Google AI Studio (aistudio.google.com)."
  );
}
