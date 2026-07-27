import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 90;

type ImageTextBlock = {
  originalText: string;
  translatedText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  estimatedBackgroundColor: string;
  textColor: string;
};

type ImageTranslationResult = {
  detectedLanguage: {
    code: string;
    label: string;
  };
  blocks: ImageTextBlock[];
};

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extractOutputText(data: unknown) {
  if (!data || typeof data !== "object") {
    return "";
  }

  const response = data as {
    output_text?: unknown;
    output?: unknown;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (!Array.isArray(response.output)) {
    return "";
  }

  for (const item of response.output) {
    if (!item || typeof item !== "object") continue;

    const content = (item as { content?: unknown }).content;

    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;

      const text = (part as { text?: unknown }).text;

      if (typeof text === "string" && text.trim()) {
        return text;
      }
    }
  }

  return "";
}

function clampNumber(value: unknown, minimum: number, maximum: number) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, number));
}

function normalizeColor(value: unknown, fallback: string) {
  const color = String(value ?? "").trim();

  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}


function containsJapanese(text: string) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
}

function normalizeComparableText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function looksLikeTechnicalToken(text: string) {
  const trimmed = text.trim();

  if (!trimmed) return true;

  if (
    /(?:https?:\/\/|www\.|@)/i.test(trimmed) ||
    /\.(?:svg|png|jpe?g|gif|webp|ts|tsx|js|jsx|json|md|mjs|cjs|css|html|env|lock)$/i.test(trimmed)
  ) {
    return true;
  }

  const tokens = trimmed.split(/\s+/);

  if (
    tokens.length >= 2 &&
    tokens.every((token) => /^[A-Za-z0-9_.\-\/\\]+$/.test(token))
  ) {
    return true;
  }

  return false;
}

function normalizeResult(value: unknown): ImageTranslationResult {
  const source =
    value && typeof value === "object"
      ? (value as {
          detectedLanguage?: unknown;
          blocks?: unknown;
        })
      : {};

  const language =
    source.detectedLanguage &&
    typeof source.detectedLanguage === "object"
      ? (source.detectedLanguage as {
          code?: unknown;
          label?: unknown;
        })
      : {};

  const blocks = Array.isArray(source.blocks)
    ? source.blocks
        .map((item): ImageTextBlock | null => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const block = item as Record<string, unknown>;
          const originalText = String(
            block.originalText ?? ""
          ).trim();
          const translatedText = String(
            block.translatedText ?? ""
          ).trim();

          if (!originalText || !translatedText) {
            return null;
          }

          if (
            normalizeComparableText(originalText) ===
            normalizeComparableText(translatedText)
          ) {
            return null;
          }

          if (!containsJapanese(translatedText)) {
            return null;
          }

          if (looksLikeTechnicalToken(originalText)) {
            return null;
          }

          const x = clampNumber(block.x, 0, 1);
          const y = clampNumber(block.y, 0, 1);
          const width = clampNumber(block.width, 0, 1 - x);
          const height = clampNumber(block.height, 0, 1 - y);

          if (width <= 0 || height <= 0) {
            return null;
          }

          const area = width * height;

          if (
            area > 0.28 ||
            (originalText.length > 90 && area > 0.12)
          ) {
            return null;
          }

          return {
            originalText,
            translatedText,
            x,
            y,
            width,
            height,
            rotation: clampNumber(block.rotation, -180, 180),
            estimatedBackgroundColor: normalizeColor(
              block.estimatedBackgroundColor,
              "#FFFFFF"
            ),
            textColor: normalizeColor(
              block.textColor,
              "#111111"
            ),
          };
        })
        .filter(
          (item): item is ImageTextBlock => item !== null
        )
    : [];

  return {
    detectedLanguage: {
      code: String(language.code ?? "unknown").trim() || "unknown",
      label:
        String(language.label ?? "不明な言語").trim() ||
        "不明な言語",
    },
    blocks,
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEYが設定されていません。",
        },
        {
          status: 500,
        }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        {
          error: "画像ファイルがありません。",
        },
        {
          status: 400,
        }
      );
    }

    if (!SUPPORTED_IMAGE_TYPES.has(image.type)) {
      return NextResponse.json(
        {
          error:
            "JPEG、PNG、WEBP、GIF形式の画像を選択してください。",
        },
        {
          status: 400,
        }
      );
    }

    if (image.size === 0) {
      return NextResponse.json(
        {
          error: "画像ファイルが空です。",
        },
        {
          status: 400,
        }
      );
    }

    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          error:
            "画像サイズは15MB以下にしてください。",
        },
        {
          status: 400,
        }
      );
    }

    const imageBuffer = Buffer.from(
      await image.arrayBuffer()
    );

    const imageDataUrl = `data:${
      image.type
    };base64,${imageBuffer.toString("base64")}`;

    const firstOpenAiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_IMAGE_MODEL ||
            "gpt-4.1-mini",
          temperature: 0,
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: [
                    "あなたは旅行写真専門のOCR・翻訳解析器です。",
                    "画像内の外国語を読み取り、日本語へ自然に翻訳してください。",
                    "画像を左上から右下まで順番に走査し、見える外国語をすべて確認してください。",
                    "小さい文字、薄い文字、途中で切れている行、近くに日本語がある外国語も省略しないでください。",
                    "見出し、本文、注釈、値段、短い案内文をすべて対象にしてください。",
                    "メニュー、看板、道路標識などの文字領域を、画像全体に対する0〜1の正規化座標で返してください。",
                    "xとyは文字領域の左上、widthとheightは領域の幅と高さです。",
                    "rotationは文字の傾きを度数で返してください。",
                    "背景色と文字色は必ず#RRGGBB形式で推定してください。",
                    "文字ブロックは必ず視覚上の1行ごとに分けてください。",
                    "離れた行、離れた看板、別々のメニュー項目を1つのblockへまとめてはいけません。",
                    "座標は文字の外周ぎりぎりにしてください。広い背景全体を囲まないでください。",
                    "値段、数字、通貨記号、商品番号は省略しないでください。",
                    "ファイル名、拡張子、URL、メールアドレス、プログラムコード、変数名、コマンド、製品型番は翻訳対象に含めないでください。",
                    "固有名詞だけで日本語訳が不自然になる文字も翻訳対象に含めないでください。",
                    "translatedTextは必ず自然な日本語にしてください。",
                    "originalTextとtranslatedTextが同じになるblockは返してはいけません。",
                    "translatedTextに日本語文字が1文字も含まれないblockは返してはいけません。",
                    "日本語の文字は翻訳対象に含めないでください。",
                    "返答前に画像上端、中央、下端を再確認し、外国語の読み取り漏れがないか確認してください。",
                    "画像に翻訳対象の外国語がなければblocksを空配列にしてください。",
                  ].join("\n"),
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: "この画像内の外国語を解析してください。",
                },
                {
                  type: "input_image",
                  image_url: imageDataUrl,
                  detail: "high",
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "image_translation_result",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  detectedLanguage: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      code: {
                        type: "string",
                      },
                      label: {
                        type: "string",
                      },
                    },
                    required: ["code", "label"],
                  },
                  blocks: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        originalText: {
                          type: "string",
                        },
                        translatedText: {
                          type: "string",
                        },
                        x: {
                          type: "number",
                        },
                        y: {
                          type: "number",
                        },
                        width: {
                          type: "number",
                        },
                        height: {
                          type: "number",
                        },
                        rotation: {
                          type: "number",
                        },
                        estimatedBackgroundColor: {
                          type: "string",
                        },
                        textColor: {
                          type: "string",
                        },
                      },
                      required: [
                        "originalText",
                        "translatedText",
                        "x",
                        "y",
                        "width",
                        "height",
                        "rotation",
                        "estimatedBackgroundColor",
                        "textColor",
                      ],
                    },
                  },
                },
                required: [
                  "detectedLanguage",
                  "blocks",
                ],
              },
            },
          },
        }),
      }
    );

    const firstOpenAiData = await firstOpenAiResponse.json();

    if (!firstOpenAiResponse.ok) {
      console.error(
        "OpenAI image translation error:",
        firstOpenAiData
      );

      const errorMessage =
        firstOpenAiData &&
        typeof firstOpenAiData === "object" &&
        "error" in firstOpenAiData &&
        firstOpenAiData.error &&
        typeof firstOpenAiData.error === "object" &&
        "message" in firstOpenAiData.error
          ? String(firstOpenAiData.error.message)
          : "画像の解析に失敗しました。";

      throw new Error(errorMessage);
    }

    const firstOutputText = extractOutputText(firstOpenAiData);

    if (!firstOutputText) {
      throw new Error(
        "画像解析結果を取得できませんでした。"
      );
    }

    let parsedResult: unknown;

    try {
      parsedResult = JSON.parse(firstOutputText);
    } catch {
      console.error(
        "Invalid image translation JSON:",
        firstOutputText
      );

      throw new Error(
        "画像解析結果の形式が正しくありません。"
      );
    }

    const firstResult = normalizeResult(parsedResult);

    const verificationResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_IMAGE_MODEL ||
            "gpt-4.1-mini",
          temperature: 0,
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: [
                    "あなたは画像OCR結果の検査担当です。",
                    "元画像と1回目の解析結果を比較してください。",
                    "画像を左上から右下まで再走査し、1回目で抜けた外国語を追加してください。",
                    "小さい文字、薄い文字、途中で切れている行、見出し、注釈、値段も確認してください。",
                    "既に正しく含まれているblockは維持してください。",
                    "重複blockは作らないでください。",
                    "日本語は翻訳対象に含めず、元画像のまま残してください。",
                    "文字ブロックは視覚上の1行ごとに分けてください。",
                    "座標は文字の外周ぎりぎりにしてください。",
                    "translatedTextは必ず自然な日本語にしてください。",
                    "originalTextとtranslatedTextが同じblockは返さないでください。",
                    "最終的な完全版だけを返してください。",
                  ].join("\n"),
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: [
                    "1回目の解析結果です。",
                    JSON.stringify(firstResult),
                    "元画像と照合し、読み取り漏れを補完した完全版を返してください。",
                  ].join("\n"),
                },
                {
                  type: "input_image",
                  image_url: imageDataUrl,
                  detail: "high",
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "verified_image_translation_result",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  detectedLanguage: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      code: {
                        type: "string",
                      },
                      label: {
                        type: "string",
                      },
                    },
                    required: ["code", "label"],
                  },
                  blocks: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        originalText: {
                          type: "string",
                        },
                        translatedText: {
                          type: "string",
                        },
                        x: {
                          type: "number",
                        },
                        y: {
                          type: "number",
                        },
                        width: {
                          type: "number",
                        },
                        height: {
                          type: "number",
                        },
                        rotation: {
                          type: "number",
                        },
                        estimatedBackgroundColor: {
                          type: "string",
                        },
                        textColor: {
                          type: "string",
                        },
                      },
                      required: [
                        "originalText",
                        "translatedText",
                        "x",
                        "y",
                        "width",
                        "height",
                        "rotation",
                        "estimatedBackgroundColor",
                        "textColor",
                      ],
                    },
                  },
                },
                required: [
                  "detectedLanguage",
                  "blocks",
                ],
              },
            },
          },
        }),
      }
    );

    if (!verificationResponse.ok) {
      console.error(
        "OpenAI verification error:",
        await verificationResponse.text()
      );

      return NextResponse.json(firstResult);
    }

    const verificationData =
      await verificationResponse.json();

    const verificationText =
      extractOutputText(verificationData);

    if (!verificationText) {
      return NextResponse.json(firstResult);
    }

    try {
      const verifiedResult = normalizeResult(
        JSON.parse(verificationText)
      );

      return NextResponse.json(verifiedResult);
    } catch {
      console.error(
        "Invalid verification JSON:",
        verificationText
      );

      return NextResponse.json(firstResult);
    }
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "画像の解析に失敗しました。",
      },
      {
        status: 500,
      }
    );
  }
}
