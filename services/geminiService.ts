import { Department } from "../types";

export class GeminiService {
  async chat(message: string, history: any[] = [], department?: Department, language: 'FR' | 'EN' = 'EN') {
    
    const systemInstruction = `You are Coach Good Pasta... (votre prompt actuel)`;

    try {
      const response = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          systemInstruction: systemInstruction + `\nContext: Department ${department || 'General'}. Language: ${language}`
        }),
      });

      if (!response.ok) throw new Error("Erreur réseau");

      const data = await response.json();
      
      // Sécurité : on vérifie si data.text existe avant de faire le .replace()
      if (data.text) {
        return data.text.replace(/\*\*|#/g, '');
      }
      
      return language === 'FR' ? "Désolé, je n'ai pas pu générer de réponse." : "Sorry, I couldn't generate a response.";
      
    } catch (error) {
      console.error("Erreur Coach:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();