import { Department, Message } from '../types';
import { supabase } from './supabaseClient';

export interface ChatResponse {
  text: string;
  remaining: number;
  limit: number;
}

/**
 * Vérifie qu'une session Supabase existe.
 *
 * Si aucune session n'existe, crée automatiquement un utilisateur anonyme.
 *
 * Les détails de l'erreur Supabase sont conservés afin de pouvoir
 * identifier la véritable cause du problème.
 */
const ensureAnonymousUser = async (): Promise<void> => {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error(
      'Supabase getSession error:',
      sessionError
    );

    throw new Error(
      `Erreur Supabase lors de la récupération de la session : ${sessionError.message}`
    );
  }

  // Une session existe déjà.
  if (sessionData.session?.user) {
    console.log(
      'Session Supabase existante :',
      sessionData.session.user.id
    );

    return;
  }

  console.log(
    'Aucune session Supabase trouvée. Création d’un utilisateur anonyme...'
  );

  const {
    data,
    error,
  } = await supabase.auth.signInAnonymously();

  if (error) {
    console.error(
      'Supabase Anonymous Sign-In error:',
      {
        message: error.message,
        name: error.name,
        status: (error as any).status,
        code: (error as any).code,
      }
    );

    const errorCode = (error as any).code;
    const errorStatus = (error as any).status;

    throw new Error(
      `Erreur Supabase Auth : ${error.message}${
        errorCode
          ? ` (code: ${errorCode})`
          : ''
      }${
        errorStatus
          ? ` (HTTP ${errorStatus})`
          : ''
      }`
    );
  }

  if (!data.session?.user) {
    console.error(
      'Supabase a accepté la connexion anonyme mais aucune session utilisateur n’a été créée.',
      data
    );

    throw new Error(
      'Supabase a accepté la connexion anonyme mais aucune session utilisateur n’a été créée.'
    );
  }

  console.log(
    'Utilisateur anonyme Supabase créé avec succès :',
    data.user?.id
  );
};

/**
 * Nettoie une réponse contenant éventuellement du Markdown.
 *
 * L'objectif est de conserver du texte simple dans l'interface.
 */
const cleanText = (text: string): string => {
  return text
    // Blocs de code
    .replace(/```[\s\S]*?```/g, '')

    // Titres Markdown
    .replace(/^#{1,6}\s+/gm, '')

    // Gras / italique
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')

    // Liens Markdown [texte](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

    // Puces Markdown
    .replace(/^\s*[-*+]\s+/gm, '')

    // Lignes horizontales
    .replace(/^\s*([-*_]){3,}\s*$/gm, '')

    // Espaces excessifs
    .replace(/\n{3,}/g, '\n\n')

    .trim();
};

/**
 * Service Gemini / Supabase.
 *
 * IMPORTANT :
 * L'objet est exporté sous le nom "geminiService" car App.tsx
 * l'utilise avec :
 *
 * geminiService.chat(...)
 */
export const geminiService = {
  /**
   * Envoie un message à l'assistant IA.
   *
   * Ordre des paramètres conservé exactement comme dans App.tsx :
   *
   * chat(message, history, department, language)
   */
  async chat(
    message: string,
    history: Message[],
    department?: Department,
    language?: 'EN' | 'FR' | string | null
  ): Promise<ChatResponse> {
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      throw new Error(
        'Le message ne peut pas être vide.'
      );
    }

    /**
     * 1. Vérification / création de la session Supabase.
     */
    await ensureAnonymousUser();

    /**
     * 2. Récupération de la session actuelle.
     *
     * Cela permet de vérifier que le JWT est bien présent
     * avant d'appeler la Edge Function.
     */
    const {
      data: sessionData,
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error(
        'Erreur lors de la récupération de la session avant appel Edge Function:',
        sessionError
      );

      throw new Error(
        `Impossible de récupérer votre session Supabase : ${sessionError.message}`
      );
    }

    if (!sessionData.session) {
      console.error(
        'Aucune session Supabase disponible avant l’appel à la Edge Function.'
      );

      throw new Error(
        'Aucune session utilisateur Supabase disponible.'
      );
    }

    console.log(
      'Appel de la Edge Function "chat" avec la session utilisateur :',
      sessionData.session.user.id
    );

    /**
     * 3. Préparation de l'historique.
     *
     * On limite l'historique aux 10 derniers messages.
     */
    const cleanedHistory = history
      .filter((item) => item.content?.trim())
      .slice(-10)
      .map((item) => ({
        role: item.role,
        content: item.content.trim(),
      }));

    /**
     * 4. Appel de la Supabase Edge Function.
     *
     * La clé Gemini reste côté serveur.
     */
    const {
      data,
      error,
    } = await supabase.functions.invoke('chat', {
      body: {
        message: cleanMessage,
        history: cleanedHistory,
        language: language || 'FR',
        department: department || 'General',
      },
    });

    if (error) {
      console.error(
        'Supabase Edge Function error:',
        {
          message: error.message,
          name: error.name,
          context: (error as any).context,
          status: (error as any).status,
        }
      );

      /**
       * Certaines erreurs de Functions contiennent une réponse HTTP
       * dans "context". On essaie d'en extraire le véritable message.
       */
      let detailedMessage = error.message;

      try {
        const context = (error as any).context;

        if (context?.json) {
          const contextData = await context.json();

          if (contextData?.error) {
            detailedMessage = contextData.error;
          } else if (contextData?.message) {
            detailedMessage = contextData.message;
          }
        }
      } catch (parseError) {
        console.warn(
          'Impossible de lire le détail de la réponse de la Edge Function:',
          parseError
        );
      }

      throw new Error(
        `Erreur de l’assistant IA : ${detailedMessage}`
      );
    }

    /**
     * 5. Vérification de la réponse.
     */
    if (!data) {
      console.error(
        'La Edge Function "chat" n’a retourné aucune donnée.'
      );

      throw new Error(
        'Le serveur IA n’a retourné aucune réponse.'
      );
    }

    if (typeof data.text !== 'string') {
      console.error(
        'Réponse inattendue de la Edge Function:',
        data
      );

      throw new Error(
        'La réponse du serveur IA est invalide.'
      );
    }

    /**
     * 6. Nettoyage final du texte.
     */
    const cleanedText = cleanText(data.text);

    if (!cleanedText) {
      throw new Error(
        'Le serveur IA a retourné une réponse vide.'
      );
    }

    /**
     * 7. Retour au composant React.
     *
     * remaining et limit viennent de la Edge Function.
     */
    return {
      text: cleanedText,

      remaining:
        typeof data.remaining === 'number'
          ? data.remaining
          : 0,

      limit:
        typeof data.limit === 'number'
          ? data.limit
          : 10,
    };
  },
};
