import { Department, Message } from '../types';
import { supabase } from './supabaseClient';

export interface ChatResponse {
  text: string;
  remaining: number;
  limit: number;
}

const ensureAnonymousUser = async (): Promise<void> => {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw new Error('Impossible de récupérer la session utilisateur.');
  }

  if (sessionData.session?.user) {
    return;
  }

  const { error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw new Error(
      'Impossible de créer votre session utilisateur. Activez les connexions anonymes dans Supabase Auth.'
    );
  }
};

const cleanResponse = (text: string): string => {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(/(?<!\*)\*(?!\s)(.*?)(?<!\s)\*(?!\*)/gs, '$1')
    .replace(/(?<!\w)_(.*?)_(?!\w)/gs, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-_]{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export class GeminiService {
  async chat(
    message: string,
    history: Message[] = [],
    department?: Department,
    language: 'FR' | 'EN' = 'EN'
  ): Promise<ChatResponse> {
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      throw new Error(
        language === 'FR'
          ? 'Le message ne peut pas être vide.'
          : 'The message cannot be empty.'
      );
    }

    await ensureAnonymousUser();



    const { data, error } = await supabase.functions.invoke('chat', {
      body: {
        message: cleanMessage,
        history: history
          .filter((item) => item.content?.trim())
          .slice(-10)
          .map((item) => ({
            role: item.role,
            content: item.content.trim(),
          })),
        language,
        department: department || 'General',
      },
    });

    if (error) {
      let messageText = error.message;

      try {
        const context = (error as any).context;
        if (context instanceof Response) {
          const body = await context.json();
          if (body?.error) {
            messageText = body.error;
          }
        }
      } catch {
        // On conserve le message Supabase si la réponse n'est pas JSON.
      }

      throw new Error(messageText);
    }

    if (!data?.text) {
      throw new Error(
        language === 'FR'
          ? 'Aucune réponse n’a été générée.'
          : 'No response was generated.'
      );
    }

    return {
      text: cleanResponse(data.text),
      remaining: Number(data.remaining ?? 0),
      limit: Number(data.limit ?? 10),
    };
  }
}

export const geminiService = new GeminiService();
