import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const DAILY_LIMIT = 10;

const GEMINI_MODEL =
  Deno.env.get('GEMINI_MODEL') ||
  'gemini-3.8-flash';

const jsonResponse = (
  body: unknown,
  status = 200
) =>
  new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type':
          'application/json; charset=utf-8',
      },
    }
  );

const cleanResponse = (
  text: string
): string => {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(
      /(?<!\*)(\*)(?!\s)(.*?)(?<!\s)\*(?!\*)/gs,
      '$2'
    )
    .replace(
      /(?<!\w)_(.*?)_(?!\w)/gs,
      '$1'
    )
    .replace(
      /`{1,3}([^`]+)`{1,3}/g,
      '$1'
    )
    .replace(
      /^\s*[-*+]\s+/gm,
      '• '
    )
    .replace(
      /^\s*\d+[.)]\s+/gm,
      ''
    )
    .replace(
      /\[([^\]]+)\]\([^)]*\)/g,
      '$1'
    )
    .replace(
      /^\s*>\s?/gm,
      ''
    )
    .replace(
      /^\s*[-_]{3,}\s*$/gm,
      ''
    )
    .replace(
      /\n{3,}/g,
      '\n\n'
    )
    .trim();
};

const getServiceRoleKey =
  (): string | null => {
    const secretKeys =
      Deno.env.get(
        'SUPABASE_SECRET_KEYS'
      );

    if (secretKeys) {
      try {
        const parsed =
          JSON.parse(secretKeys);

        if (parsed?.default) {
          return parsed.default;
        }
      } catch {
        // Fallback ci-dessous.
      }
    }

    return (
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      ) || null
    );
  };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(
      'ok',
      {
        headers: corsHeaders,
      }
    );
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      {
        error:
          'Method Not Allowed',
      },
      405
    );
  }

  const geminiApiKey =
    Deno.env.get(
      'GEMINI_API_KEY'
    );

  const supabaseUrl =
    Deno.env.get(
      'SUPABASE_URL'
    );

  const serviceRoleKey =
    getServiceRoleKey();

  if (!geminiApiKey) {
    console.error(
      'GEMINI_API_KEY is not configured.'
    );

    return jsonResponse(
      {
        error:
          'Le service IA n’est pas correctement configuré.',
      },
      500
    );
  }

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    console.error(
      'Supabase server credentials are not configured.'
    );

    return jsonResponse(
      {
        error:
          'Le service utilisateur n’est pas correctement configuré.',
      },
      500
    );
  }

  try {
    const authorization =
      req.headers.get(
        'Authorization'
      );

    if (
      !authorization?.startsWith(
        'Bearer '
      )
    ) {
      return jsonResponse(
        {
          error:
            'Session utilisateur manquante.',
        },
        401
      );
    }

    const accessToken =
      authorization
        .replace(
          'Bearer ',
          ''
        )
        .trim();

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        }
      );

    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData.user
    ) {
      return jsonResponse(
        {
          error:
            'Session utilisateur invalide ou expirée.',
        },
        401
      );
    }

    const userId =
      userData.user.id;

    let payload: {
      message?: string;
      history?: Array<{
        role?: string;
        content?: string;
      }>;
      language?: 'FR' | 'EN';
      department?: string;
    };

    try {
      payload =
        await req.json();
    } catch {
      return jsonResponse(
        {
          error:
            'Requête JSON invalide.',
        },
        400
      );
    }

    const message =
      payload.message?.trim();

    if (!message) {
      return jsonResponse(
        {
          error:
            'Le message ne peut pas être vide.',
        },
        400
      );
    }

    const language =
      payload.language === 'FR'
        ? 'FR'
        : 'EN';

    const department =
      payload.department?.trim() ||
      'General';

    const systemInstruction = `
You are Coach Good Pasta, an internal workplace support assistant for Good Pasta.

Your role:
- Help employees with practical workplace questions.
- Be useful, professional, concise and respectful.
- Adapt your answer to the selected department and language.
- Do not invent company policies, contacts, procedures or facts that were not provided.
- If information is unavailable, say so clearly and suggest contacting the appropriate supervisor.

STRICT OUTPUT FORMAT:

- Return plain text only.
- NEVER use Markdown.
- NEVER use headings beginning with #.
- NEVER use asterisks for bold or italic text.
- NEVER use Markdown bullet syntax such as -, * or + at the beginning of a line.
- NEVER use Markdown links.
- NEVER use code blocks.
- NEVER use Markdown tables.
- NEVER use horizontal rules.
- Use short paragraphs.
- Use numbered sentences only when numbering is genuinely useful.
- Do not add decorative symbols.

If you need to provide the application's special information card, use exactly this format at the end:

[INFO] Title: title | Details: details | Contact: email

Do not use Markdown anywhere around this format.

Context:
Department: ${department}

Language:
${language === 'FR'
  ? 'French'
  : 'English'}
`;

    const {
      data: usageRows,
      error: usageError,
    } =
      await supabaseAdmin.rpc(
        'consume_ai_usage',
        {
          p_user_id: userId,
          p_daily_limit:
            DAILY_LIMIT,
        }
      );

    if (usageError) {
      console.error(
        'Usage RPC error:',
        usageError
      );

      return jsonResponse(
        {
          error:
            'Impossible de vérifier votre quota quotidien.',
        },
        500
      );
    }

    const usage =
      Array.isArray(usageRows)
        ? usageRows[0]
        : usageRows;

    if (!usage?.allowed) {
      const limitMessage =
        language === 'FR'
          ? `Vous avez atteint votre limite de ${DAILY_LIMIT} demandes IA pour aujourd’hui. Revenez demain pour continuer.`
          : `You have reached your limit of ${DAILY_LIMIT} AI requests for today. Please come back tomorrow to continue.`;

      return jsonResponse(
        {
          error:
            limitMessage,
          remaining: 0,
          limit:
            DAILY_LIMIT,
        },
        429
      );
    }

    const cleanedHistory =
      Array.isArray(
        payload.history
      )
        ? payload.history
            .filter(
              (item) =>
                item?.content?.trim()
            )
            .slice(-10)
            .map((item) => ({
              role:
                item.role === 'model'
                  ? 'model'
                  : 'user',
              parts: [
                {
                  text:
                    item.content!.trim(),
                },
              ],
            }))
        : [];

    while (
      cleanedHistory.length >
        0 &&
      cleanedHistory[0].role !==
        'user'
    ) {
      cleanedHistory.shift();
    }

    const contents = [
      ...cleanedHistory,
      {
        role: 'user',
        parts: [
          {
            text: message,
          },
        ],
      },
    ];

    const response =
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          GEMINI_MODEL
        )}:generateContent?key=${encodeURIComponent(
          geminiApiKey
        )}`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    systemInstruction,
                },
              ],
            },

            contents,

            generationConfig: {
              temperature: 0.7,
            },
          }),
        }
      );

    const geminiData =
      await response.json();

    if (!response.ok) {
      console.error(
        'Gemini API error:',
        response.status,
        geminiData
      );

      return jsonResponse(
        {
          error:
            language === 'FR'
              ? 'Le service IA a temporairement refusé la demande. Veuillez réessayer plus tard.'
              : 'The AI service temporarily rejected the request. Please try again later.',
        },
        response.status ===
          429
          ? 429
          : 502
      );
    }

    const rawText =
      geminiData
        ?.candidates?.[0]
        ?.content?.parts
        ?.map(
          (
            part: {
              text?: string;
            }
          ) =>
            part.text || ''
        )
        .join('')
        .trim();

    if (!rawText) {
      console.error(
        'Gemini returned no text:',
        geminiData
      );

      return jsonResponse(
        {
          error:
            language === 'FR'
              ? 'Aucune réponse exploitable n’a été générée.'
              : 'No usable response was generated.',
        },
        502
      );
    }

    const text =
      cleanResponse(rawText);

    return jsonResponse({
      text,

      remaining: Number(
        usage.remaining ??
          Math.max(
            DAILY_LIMIT -
              Number(
                usage.used ?? 0
              ),
            0
          )
      ),

      limit:
        DAILY_LIMIT,
    });
  } catch (error) {
    console.error(
      'Chat Edge Function error:',
      error
    );

    return jsonResponse(
      {
        error:
          'Une erreur interne est survenue. Veuillez réessayer.',
      },
      500
    );
  }
});
