export const runtime = "nodejs";

type InputLanguage =
  | "japanese"
  | "english"
  | "korean"
  | "chinese"
  | "german"
  | "french"
  | "italian"
  | "auto";

type DetectedLanguage = {
  code: string;
  key: string;
  label: string;
};

const LANGUAGE_CODES: Record<
  Exclude<InputLanguage, "auto">,
  string
> = {
  japanese: "ja",
  english: "en",
  korean: "ko",
  chinese: "zh",
  german: "de",
  french: "fr",
  italian: "it",
};

function normalizeLanguage(value: string): InputLanguage {
  switch (value) {
    case "japanese":
    case "english":
    case "korean":
    case "chinese":
    case "german":
    case "french":
    case "italian":
    case "auto":
      return value;
    default:
      return "auto";
  }
}

function isSupportedAudioType(type: string) {
  return (
    type.includes("webm") ||
    type.includes("mp4") ||
    type.includes("mpeg") ||
    type.includes("mp3") ||
    type.includes("wav") ||
    type.includes("ogg") ||
    type.includes("m4a")
  );
}

function getKnownLanguage(
  language: Exclude<InputLanguage, "auto">
): DetectedLanguage {
  switch (language) {
    case "japanese":
      return {
        code: "ja",
        key: "japanese",
        label: "日本語",
      };

    case "korean":
      return {
        code: "ko",
        key: "korean",
        label: "韓国語",
      };

    case "chinese":
      return {
        code: "zh",
        key: "chinese",
        label: "中国語",
      };

    case "german":
      return {
        code: "de",
        key: "german",
        label: "ドイツ語",
      };

    case "french":
      return {
        code: "fr",
        key: "french",
        label: "フランス語",
      };

    case "italian":
      return {
        code: "it",
        key: "italian",
        label: "イタリア語",
      };

    default:
      return {
        code: "en",
        key: "english",
        label: "英語",
      };
  }
}

function normalizeDetectedLanguage(
  value: unknown
): DetectedLanguage {
  if (typeof value !== "object" || value === null) {
    return {
      code: "unknown",
      key: "unknown",
      label: "不明な言語",
    };
  }

  const item = value as Record<string, unknown>;

  const code =
    typeof item.code === "string"
      ? item.code.trim().toLowerCase()
      : "unknown";

  const key =
    typeof item.key === "string"
      ? item.key.trim().toLowerCase()
      : "unknown";

  const label =
    typeof item.label === "string"
      ? item.label.trim()
      : "不明な言語";

  return {
    code: code || "unknown",
    key: key || "unknown",
    label: label || "不明な言語",
  };
}

async function detectLanguage(
  apiKey: string,
  text: string
): Promise<DetectedLanguage> {
  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        store: false,
        instructions: `
Detect the primary language of the supplied text.

Return only valid JSON in this exact format:

{
  "code": "ISO 639-1 language code",
  "key": "english | korean | chinese | german | french | italian | japanese | other",
  "label": "Japanese language name"
}

Use these exact values:

- English:
  code "en"
  key "english"
  label "英語"

- Korean:
  code "ko"
  key "korean"
  label "韓国語"

- Mandarin Chinese:
  code "zh"
  key "chinese"
  label "中国語"

- German:
  code "de"
  key "german"
  label "ドイツ語"

- French:
  code "fr"
  key "french"
  label "フランス語"

- Italian:
  code "it"
  key "italian"
  label "イタリア語"

- Japanese:
  code "ja"
  key "japanese"
  label "日本語"

Rules:
- Detect the language from grammar, vocabulary, spelling, and writing system.
- Traditional and Simplified Chinese must both use key "chinese".
- For another language, use key "other".
- For another language, return its ISO 639-1 code when possible.
- For another language, return its common Japanese name in label.
- Do not translate the text.
- Do not add markdown.
- Do not add explanations.
        `.trim(),
        input: text,
      }),
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    console.error("言語判定エラー:", responseText);

    return {
      code: "unknown",
      key: "unknown",
      label: "言語を判定できませんでした",
    };
  }

  let data: unknown;

  try {
    data = JSON.parse(responseText);
  } catch {
    return {
      code: "unknown",
      key: "unknown",
      label: "言語を判定できませんでした",
    };
  }

  let outputText = "";

  if (
    typeof data === "object" &&
    data !== null &&
    "output" in data &&
    Array.isArray(data.output)
  ) {
    for (const outputItem of data.output) {
      if (
        typeof outputItem !== "object" ||
        outputItem === null ||
        !("content" in outputItem) ||
        !Array.isArray(outputItem.content)
      ) {
        continue;
      }

      for (const contentItem of outputItem.content) {
        if (
          typeof contentItem === "object" &&
          contentItem !== null &&
          "text" in contentItem &&
          typeof contentItem.text === "string"
        ) {
          outputText += contentItem.text;
        }
      }
    }
  }

  if (!outputText.trim()) {
    return {
      code: "unknown",
      key: "unknown",
      label: "言語を判定できませんでした",
    };
  }

  try {
    return normalizeDetectedLanguage(
      JSON.parse(outputText.trim())
    );
  } catch {
    console.error(
      "言語判定JSON解析エラー:",
      outputText
    );

    return {
      code: "unknown",
      key: "unknown",
      label: "言語を判定できませんでした",
    };
  }
}

export async function POST(req: Request) {
  try {
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

    const formData = await req.formData();

    const audio = formData.get("audio");

    const rawLanguage = String(
      formData.get("language") ?? "auto"
    ).trim();

    const language = normalizeLanguage(rawLanguage);

    if (!(audio instanceof File)) {
      return Response.json(
        {
          error: "録音データがありません。",
        },
        {
          status: 400,
        }
      );
    }

    if (audio.size === 0) {
      return Response.json(
        {
          error: "録音データが空です。",
        },
        {
          status: 400,
        }
      );
    }

    if (audio.size > 20 * 1024 * 1024) {
      return Response.json(
        {
          error: "録音データが大きすぎます。",
        },
        {
          status: 413,
        }
      );
    }

    if (
      audio.type &&
      !isSupportedAudioType(audio.type)
    ) {
      return Response.json(
        {
          error: `対応していない音声形式です: ${audio.type}`,
        },
        {
          status: 400,
        }
      );
    }

    const openaiFormData = new FormData();

    openaiFormData.append(
      "file",
      audio,
      audio.name || "recording.webm"
    );

    openaiFormData.append(
      "model",
      "gpt-4o-mini-transcribe"
    );

    openaiFormData.append(
      "response_format",
      "json"
    );

    /*
      日本語側は日本語を明示する。
      相手側のautoでは言語指定を送らず、
      音声から自動認識させる。
    */
    if (language !== "auto") {
      openaiFormData.append(
        "language",
        LANGUAGE_CODES[language]
      );
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: openaiFormData,
      }
    );

    const responseText = await openaiResponse.text();

    if (!openaiResponse.ok) {
      console.error(
        "文字起こしエラー:",
        responseText
      );

      return Response.json(
        {
          error: "音声を読み取れませんでした。",
        },
        {
          status: openaiResponse.status,
        }
      );
    }

    let data: unknown;

    try {
      data = JSON.parse(responseText);
    } catch {
      return Response.json(
        {
          error: "文字起こし結果を読み取れませんでした。",
        },
        {
          status: 500,
        }
      );
    }

    const text =
      typeof data === "object" &&
      data !== null &&
      "text" in data &&
      typeof data.text === "string"
        ? data.text.trim()
        : "";

    if (!text) {
      return Response.json(
        {
          error: "音声を聞き取れませんでした。",
        },
        {
          status: 422,
        }
      );
    }

    const detectedLanguage =
      language === "auto"
        ? await detectLanguage(apiKey, text)
        : getKnownLanguage(language);

    return Response.json({
      text,
      requestedLanguage: language,
      detectedLanguage: {
        code: detectedLanguage.code,
        key: detectedLanguage.key,
        label: detectedLanguage.label,
      },
    });
  } catch (error) {
    console.error(
      "音声読み取りエラー:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "音声を読み取れませんでした。";

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