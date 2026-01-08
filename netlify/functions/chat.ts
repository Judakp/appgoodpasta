import { GoogleGenerativeAI } from "@google/generative-ai";
import { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history, systemInstruction } = JSON.parse(event.body || "{}");

    // --- CORRECTION ICI ---
    // La 'systemInstruction' doit être dans getGenerativeModel, pas dans startChat
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: systemInstruction, // C'est ici qu'elle doit être !
    }, { apiVersion: 'v1beta' });

    // Nettoyage de l'historique (pour éviter l'erreur de rôle)
    let cleanedHistory = [];
    if (history && Array.isArray(history)) {
      cleanedHistory = history.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      while (cleanedHistory.length > 0 && cleanedHistory[0].role !== 'user') {
        cleanedHistory.shift();
      }
    }

    // Démarrage du chat (sans systemInstruction ici)
    const chat = model.startChat({
      history: cleanedHistory,
      generationConfig: {
        temperature: 0.7,
        // On ne met plus systemInstruction ici
      }
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    
    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text() }),
    };
  } catch (error: any) {
    console.error("Erreur Backend:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };