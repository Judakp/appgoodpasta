import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler: Handler = async (event) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  try {
    const { message, department, language } = JSON.parse(event.body || "{}");

    // 1. Définir l'instruction système
    const systemInstruction = `Tu es le Coach Good Pasta... (votre prompt ici)`;

    // 2. INITIALISATION CORRECTE : On passe l'instruction ICI
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction, // Déplacé ici
    });

    // 3. START CHAT : On garde uniquement les options de génération ici
    const chat = model.startChat({
      history: [],
      generationConfig: { 
          temperature: 0.7 
      }
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text() }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: "Erreur serveur" }) };
  }
};

export { handler };