import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type TargetLanguage =
  | "english"
  | "korean"
  | "chinese"
  | "german"
  | "french"
  | "italian";

type TranslationDirection =
  | "japanese-to-foreign"
  | "foreign-to-japanese";

type TranslationTone = "standard" | "polite" | "friendly";

const LANGUAGE_NAMES: Record<TargetLanguage, string> = {
  english: "English",
  korean: "Korean",
  chinese: "Mandarin Chinese",
  german: "German",
  french: "French",
  italian: "Italian",
};

function normalizeLanguage(value: string): TargetLanguage {
  switch (value) {
    case "english":
    case "korean":
    case "chinese":
    case "german":
    case "french":
    case "italian":
      return value;

    default:
      return "english";
  }
}

function normalizeDirection(value: string): TranslationDirection {
  return value === "foreign-to-japanese"
    ? "foreign-to-japanese"
    : "japanese-to-foreign";
}

function normalizeTone(value: string): TranslationTone {
  if (value === "polite") return "polite";
  if (value === "friendly") return "friendly";

  return "standard";
}

function getToneInstruction(tone: TranslationTone) {
  if (tone === "polite") {
    return `
Use polite, respectful, and natural spoken language.

The wording should be suitable for:
- hotels
- restaurants
- airports
- train stations
- shops
- taxis
- public services
- speaking with staff or strangers

Do not make it excessively formal, old-fashioned, stiff, or unnatural.
Use wording that a modern native speaker would naturally use when being polite.
    `.trim();
  }

  if (tone === "friendly") {
    return `
Use friendly, warm, and conversational spoken language.

The wording should feel:
- approachable
- relaxed
- kind
- natural in everyday conversation

Do not use rude expressions.
Do not use excessive slang.
Keep it appropriate for speaking with someone the traveler has just met.
    `.trim();
  }

  return `
Use standard and natural spoken language.

The sentence should sound like something a native speaker would normally say in this situation.

It should be:
- clear
- natural
- polite enough for ordinary travel situations
- neither excessively formal nor overly casual

This is the default speaking style.
  `.trim();
}

function getLanguageSpecificInstruction(language: TargetLanguage) {
  if (language === "korean") {
    return `
Use modern standard Korean that is natural in South Korea.
For ordinary travel conversations, use natural polite speech ending mainly in 요.
Avoid stiff textbook Korean unless the situation specifically requires formality.
    `.trim();
  }

  if (language === "chinese") {
    return `
Use modern standard Mandarin Chinese.
Return Simplified Chinese characters.
Use natural spoken expressions commonly understood in mainland China.
Avoid literary or overly formal written Chinese.
    `.trim();
  }

  if (language === "german") {
    return `
Use modern standard German.
Choose du or Sie appropriately from the selected tone and situation.
For staff, strangers, hotels, restaurants, stations, and public services, prefer Sie unless the friendly tone clearly makes du appropriate.
    `.trim();
  }

  if (language === "french") {
    return `
Use modern standard French.
Choose tu or vous appropriately from the selected tone and situation.
For staff, strangers, hotels, restaurants, stations, and public services, prefer vous unless the friendly tone clearly makes tu appropriate.
    `.trim();
  }

  if (language === "italian") {
    return `
Use modern standard Italian.
Choose informal or polite forms naturally for the situation.
For staff, strangers, hotels, restaurants, stations, and public services, use respectful wording without sounding excessively formal.
    `.trim();
  }

  return `
Use modern, natural spoken English.
Prefer wording that travelers can say easily and native speakers commonly use.
  `.trim();
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          error: "OPENAI_API_KEYが設定されていません。",
        },
        {
          status: 500,
        }
      );
    }

    const body = await req.json();

    const text = String(body?.text ?? "").trim();

    const language = normalizeLanguage(
      String(body?.language ?? "english").trim()
    );

    const direction = normalizeDirection(
      String(
        body?.direction ?? "japanese-to-foreign"
      ).trim()
    );

    const tone = normalizeTone(
      String(body?.tone ?? "standard").trim()
    );

    if (!text) {
      return Response.json(
        {
          error: "翻訳する文章がありません。",
        },
        {
          status: 400,
        }
      );
    }

    if (text.length > 4000) {
      return Response.json(
        {
          error: "翻訳する文章が長すぎます。",
        },
        {
          status: 400,
        }
      );
    }

    const foreignLanguage = LANGUAGE_NAMES[language];
    const toneInstruction = getToneInstruction(tone);
    const languageInstruction =
      getLanguageSpecificInstruction(language);

    const instructions =
      direction === "japanese-to-foreign"
        ? `
You are a professional travel conversation translator.

Translate the user's Japanese into natural spoken ${foreignLanguage}.

The translation will be used immediately during face-to-face travel conversation.

Speaking style:
${toneInstruction}

Language requirements:
${languageInstruction}

General requirements:
- Preserve the intended meaning accurately.
- Use practical wording that a traveler can actually say.
- Prefer short, clear, natural sentences.
- Consider the likely travel situation from the Japanese source.
- Use vocabulary commonly understood by native speakers.
- Do not translate names, hotel names, station names, addresses, or product names unnecessarily.
- Do not add information that is not present in the source.
- Do not add explanations.
- Do not add pronunciation guides.
- Do not include quotation marks.
- Do not include labels.
- Do not include the Japanese source text.
- Return only the translated ${foreignLanguage} sentence or sentences.
        `.trim()
        : `
You are a professional travel conversation translator.

Translate the user's spoken ${foreignLanguage} into clear and natural Japanese.

The translation will be used immediately during face-to-face travel conversation.

Requirements:
- Preserve the intended meaning accurately.
- Use Japanese that a traveler can understand immediately.
- Reflect the speaker's level of politeness and friendliness.
- Do not make the Japanese unnecessarily formal.
- Do not translate names, hotel names, station names, addresses, or product names unnecessarily.
- Do not add information that is not present in the source.
- Do not add explanations.
- Do not add pronunciation guides.
- Do not include quotation marks.
- Do not include labels.
- Do not include the original ${foreignLanguage} text.
- Return only the Japanese translation.
        `.trim();

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      store: false,
      instructions,
      input: text,
    });

    const translatedText = response.output_text.trim();

    if (!translatedText) {
      return Response.json(
        {
          error: "翻訳結果を取得できませんでした。",
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      translatedText,
      language,
      direction,
      tone,
    });
  } catch (error) {
    console.error("翻訳エラー:", error);

    const message =
      error instanceof Error
        ? error.message
        : "翻訳に失敗しました。";

    return Response.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}