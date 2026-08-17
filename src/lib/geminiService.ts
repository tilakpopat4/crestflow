import { GoogleGenAI } from '@google/genai';
import { Client, SubClient, WorkItem, UserProfile } from '../types';

export async function generateWorkSummary(
  clients: Client[],
  workItems: WorkItem[],
  upToDate: Date,
  profile: UserProfile | null | undefined
): Promise<string> {
  const apiKey = profile?.geminiApiKey || import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please add it in your Profile Settings.");
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

  const prompt = `You are an expert career summarizing assistant. 
Please generate a single, professional, and engaging paragraph (about 3-4 sentences) summarizing the work experience and achievements of ${name}, a ${professionalTitle}.
They have completed ${totalWorkItems} work items/tasks, served ${totalClients} primary clients, and ${totalSubclients} sub-clients.
Some examples of their work include: ${workDescriptions || 'general freelancing work'}.
Do not mention specific dates or specific earnings unless provided. Focus on highlighting their capacity, the breadth of their client base, and the volume of work they've delivered up to this point. Make it sound suitable for a LinkedIn summary or portfolio "About Me" section. Do not use markdown formatting like bolding or headers, just a plain text paragraph.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });
    
    return response.text || "Summary could not be generated.";
  } catch (error: any) {
    console.error("Error generating summary with Gemini:", error);
    throw new Error(error.message || "Failed to generate summary.");
  }
}
