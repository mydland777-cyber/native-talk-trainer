export const runtime = "nodejs";

type SpeechStyle = "careful" | "natural" | "casual";
type VoiceGender = "female" | "male";

type SpeechLanguage =
  | "japanese"
  | "english"
  | "korean"
  | "chinese"
  | "german"
  | "french"
  | "italian";

function normalizeStyle(value: string): SpeechStyle {
  if (value === "careful") return "careful";
  if (value === "casual") return "casual";

  return "natural";
}

function normalizeVoiceGender(value: string): VoiceGender {
  return value === "male" ? "male" : "female";
}

function normalizeLanguage(value: string): SpeechLanguage {
  switch (value) {
    case "japanese":
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

function getVoice(
  language: SpeechLanguage,
  voiceGender: VoiceGender
) {
  /*
    男性音声
  */
  if (voiceGender === "male") {
    return "cedar";
  }

  /*
    女性音声
    言語によって自然に聞こえやすい声を振り分ける。
  */
  switch (language) {
    case "korean":
    case "chinese":
    case "french":
    case "italian":
      return "marin";

    case "japanese":
    case "english":
    case "german":
    default:
      return "alloy";
  }
}

function getLanguageName(language: SpeechLanguage) {
  switch (language) {
    case "japanese":
      return "Japanese";

    case "korean":
      return "Korean";

    case "chinese":
      return "Mandarin Chinese";

    case "german":
      return "German";

    case "french":
      return "French";

    case "italian":
      return "Italian";

    default:
      return "English";
  }
}

function getInstruction(
  style: SpeechStyle,
  language: SpeechLanguage,
  voiceGender: VoiceGender
) {
  const languageName = getLanguageName(language);

  const voiceInstruction =
    voiceGender === "male"
      ? "Use a natural adult male-sounding voice."
      : "Use a natural adult female-sounding voice.";

  if (style === "careful") {
    return `
Speak entirely in ${languageName}.
${voiceInstruction}
Speak clearly, politely, and slightly slowly.
Pronounce every word distinctly while keeping the delivery natural.
The speech will be played directly to a person during travel.
Do not sound robotic, theatrical, or like a language teacher.
Do not translate, explain, or add any words.
Read only the supplied text.
    `.trim();
  }

  if (style === "casual") {
    return `
Speak entirely in ${languageName}.
${voiceInstruction}
Use a friendly, warm, relaxed, everyday conversational style.
Use realistic rhythm and natural connected speech appropriate for ${languageName}.
Do not sound rude, excessively informal, robotic, or teacher-like.
The speech will be played directly to a person during travel.
Do not translate, explain, or add any words.
Read only the supplied text.
    `.trim();
  }

  return `
Speak entirely in ${languageName}.
${voiceInstruction}
Use a clear, natural, everyday conversational style.
Keep the pace realistic and easy to understand.
Sound polite enough for an ordinary travel conversation without sounding overly formal.
The speech will be played directly to a person during travel.
Do not sound robotic, theatrical, or teacher-like.
Do not translate, explain, or add any words.
Read only the supplied text.
  `.trim();
}

function getSpeed(
  style: SpeechStyle,
  language: SpeechLanguage
) {
  if (style === "careful") {
    if (language === "chinese") return 0.88;
    if (language === "french") return 0.9;

    return 0.92;
  }

  if (style === "casual") {
    if (language === "english") return 1.15;
    if (language === "korean") return 1.08;
    if (language === "chinese") return 1.05;
    if (language === "french") return 1.06;
    if (language === "italian") return 1.08;
    if (language === "german") return 1.05;

    return 1.05;
  }

  if (language === "chinese") return 0.98;

  return 1;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const text = String(body?.text ?? "").trim();

    const style = normalizeStyle(
      String(body?.style ?? "natural").trim()
    );

    const language = normalizeLanguage(
      String(body?.language ?? "english").trim()
    );

    const voiceGender = normalizeVoiceGender(
      String(body?.voiceGender ?? "female").trim()
    );

    if (!text) {
      return Response.json(
        {
          error: "読み上げる文章がありません。",
        },
        {
          status: 400,
        }
      );
    }

    if (text.length > 4096) {
      return Response.json(
        {
          error: "読み上げる文章が長すぎます。",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error: "OPENAI_API_KEYが設定されていません。",
        },
        {
          status: 500,
        }
      );
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: getVoice(language, voiceGender),
          input: text,
          response_format: "mp3",
          instructions: getInstruction(
            style,
            language,
            voiceGender
          ),
          speed: getSpeed(style, language),
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();

      console.error(
        "OpenAI音声生成エラー:",
        errorText
      );

      return Response.json(
        {
          error: `音声を生成できませんでした: ${errorText}`,
        },
        {
          status: openaiResponse.status,
        }
      );
    }

    const arrayBuffer =
      await openaiResponse.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(
          arrayBuffer.byteLength
        ),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "音声生成エラー:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "音声を生成できませんでした。";

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