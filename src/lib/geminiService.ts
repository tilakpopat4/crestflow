import { GoogleGenAI } from '@google/genai';
import { Client, SubClient, WorkItem, UserProfile } from '../types';

export async function generateWorkSummary(
  clients: Client[],
  workItems: WorkItem[],
  upToDate: Date,
  profile: UserProfile | null | undefined
): Promise<string> {
  const rawKey = profile?.geminiApiKey || import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
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
  // Just listing the unique descriptions or an aggregate
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Summary could not be generated.";
  } catch (error: any) {
    console.error("Error generating summary with Gemini:", error);
    const rawError = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    if (rawError.includes('API_KEY_INVALID') || rawError.includes('API key not valid')) {
      throw new Error("Your Gemini API key is invalid or has expired. Please verify your key at Google AI Studio (aistudio.google.com) and update it in your Profile Settings.");
    }
    // Attempt fallback to gemini-1.5-flash if 2.5 is unavailable
    if (rawError.includes('not found') || rawError.includes('404')) {
      try {
        const fallback = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
        return fallback.text || "Summary could not be generated.";
      } catch (fallbackErr: any) {
        console.error("Fallback error:", fallbackErr);
      }
    }
    throw new Error(rawError || "Failed to generate summary.");
  }
}
