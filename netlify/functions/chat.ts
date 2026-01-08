import { GoogleGenerativeAI } from "@google/generative-ai";
import { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  // On récupère la clé API depuis les variables d'environnement de Netlify
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  
  // Utilisation de l'ID exact vu sur votre capture d'écran
  const model = genAI.getGenerativeModel({ 
    model: "gemini-3-flash-preview" 
  });

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, history, systemInstruction } = JSON.parse(event.body || "{}");

    // Démarrage du chat avec l'instruction système
    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: 0.7,
        // Optionnel : vous pouvez ajouter "thinking_level" si disponible sur votre compte
      }
    });

    // On inclut l'instruction système dans le premier message ou via le contexte
    const fullMessage = `${systemInstruction}\n\nUser Message: ${message}`;
    const result = await chat.sendMessage(fullMessage);
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