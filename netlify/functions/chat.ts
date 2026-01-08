import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler: Handler = async (event) => {
  // Récupération sécurisée de la clé
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  try {
    const { message, department, language } = JSON.parse(event.body || "{}");

    // Votre instruction système pour le Coach
    const systemInstruction = `Tu es le Coach Good Pasta... (votre prompt ici)`;

    // CONFIGURATION GEMINI 3.0
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.0-flash", // On passe officiellement à la version 3.0
      systemInstruction: systemInstruction, // On garde l'instruction ici
    });

    const chat = model.startChat({
      history: [],
      generationConfig: { 
          temperature: 0.6, // On baisse légèrement pour plus de précision en 3.0
          maxOutputTokens: 2000,
      }
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text() }),
    };
  } catch (error) {
    console.error("Erreur Backend Gemini 3.0:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "Le moteur Gemini 3.0 a rencontré une erreur." }) 
    };
  }
};

export { handler };