import { GoogleGenerativeAI } from "@google/generative-ai";
import { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history, systemInstruction } = JSON.parse(event.body || "{}");

    // 1. On utilise Gemini 1.5 Flash (stable et rapide)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction 
    });

    // 2. NETTOYAGE RIGOUREUX DE L'HISTORIQUE
    // On s'assure que l'historique ne commence QUE par un rôle 'user'
    let cleanedHistory = [];
    if (history && Array.isArray(history)) {
      // On transforme vos messages pour le format Gemini
      cleanedHistory = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // RÈGLE D'OR : On supprime les messages au début tant que ce n'est pas un 'user'
      while (cleanedHistory.length > 0 && cleanedHistory[0].role !== 'user') {
        cleanedHistory.shift(); 
      }
    }

    // 3. Démarrage du chat
    const chat = model.startChat({
      history: cleanedHistory,
      generationConfig: { temperature: 0.7 }
    });

    // 4. Envoi du message
    const result = await chat.sendMessage(message);
    const response = await result.response;
    
    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text() }),
    };

  } catch (error: any) {
    console.error("Erreur Backend détaillée:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };