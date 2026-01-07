export const geminiService = {
  async chat(message: string, history: any[], department: any, language: string) {
    try {
      // Appel local à la fonction Netlify
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, department, language })
      });

      const data = await response.json();
      // Nettoyage des caractères comme demandé dans ton code initial
      return data.text.replace(/\*\*|#/g, '');
    } catch (error) {
      console.error("Erreur Coach:", error);
      throw error;
    }
  }
};