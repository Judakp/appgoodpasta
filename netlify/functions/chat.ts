import { GoogleGenerativeAI } from "@google/generative-ai";
import { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history, systemInstruction, department, language } = JSON.parse(event.body || "{}");

    // 1. On configure le modèle avec l'instruction système DIRECTEMENT
    // Cela évite de la répéter dans chaque message
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", // Utilisation de la version stable
      systemInstruction: systemInstruction 
    });

    // 2. NETTOYAGE DE L'HISTORIQUE (La correction cruciale)
    // On s'assure que l'historique ne commence JAMAIS par un message 'model'
    let safeHistory = history || [];
    if (safeHistory.length > 0 && safeHistory[0].role === 'model') {
      safeHistory = safeHistory.slice(1); // On retire le message de bienvenue initial
    }

    // 3. Démarrage du chat avec l'historique sécurisé
    const chat = model.startChat({
      history: safeHistory,
      generationConfig: {
        temperature: 0.7,
      }
    });

    // 4. Envoi du message simple (plus besoin de concaténer l'instruction système ici)
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