import { Message, Department } from '../types';

export class GeminiService {
  // On peut supprimer la variable 'model' ici car c'est la fonction Netlify qui décide
  
  async chat(message: string, history: Message[] = [], department?: Department, language: 'FR' | 'EN' = 'EN') {
    try {
      // On envoie simplement les données nécessaires au backend
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          department, 
          language 
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur : ${response.status}`);
      }

      const data = await response.json();

      // On vérifie que le texte existe avant d'appliquer le nettoyage (replace)
      if (data && data.text) {
        // Nettoyage des symboles interdits (**) et (#) comme demandé
        return data.text.replace(/\*\*|#/g, '');
      }

      return language === 'FR' 
        ? "Désolé, je n'ai pas pu obtenir de réponse du Coach." 
        : "Sorry, I couldn't get a response from the Coach.";

    } catch (error) {
      console.error("Erreur de communication avec le backend :", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();