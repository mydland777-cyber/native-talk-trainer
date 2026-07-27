import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

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

          const x = clampNumber(block.x, 0, 1);
          const y = clampNumber(block.y, 0, 1);
          const width = clampNumber(block.width, 0, 1 - x);
          const height = clampNumber(block.height, 0, 1 - y);

          if (width <= 0 || height <= 0) {
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

    const openAiResponse = await fetch(
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
                    "メニュー、看板、道路標識などの文字領域を、画像全体に対する0〜1の正規化座標で返してください。",
                    "xとyは文字領域の左上、widthとheightは領域の幅と高さです。",
                    "rotationは文字の傾きを度数で返してください。",
                    "背景色と文字色は必ず#RRGGBB形式で推定してください。",
                    "同じ行や同じ看板内で意味がつながる文字は、できるだけ1つのblockにまとめてください。",
                    "値段、数字、通貨記号、商品番号は省略しないでください。",
                    "日本語の文字は翻訳対象に含めないでください。",
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

    const openAiData = await openAiResponse.json();

    if (!openAiResponse.ok) {
      console.error(
        "OpenAI image translation error:",
        openAiData
      );

      const errorMessage =
        openAiData &&
        typeof openAiData === "object" &&
        "error" in openAiData &&
        openAiData.error &&
        typeof openAiData.error === "object" &&
        "message" in openAiData.error
          ? String(openAiData.error.message)
          : "画像の解析に失敗しました。";

      throw new Error(errorMessage);
    }

    const outputText = extractOutputText(openAiData);

    if (!outputText) {
      throw new Error(
        "画像解析結果を取得できませんでした。"
      );
    }

    let parsedResult: unknown;

    try {
      parsedResult = JSON.parse(outputText);
    } catch {
      console.error(
        "Invalid image translation JSON:",
        outputText
      );

      throw new Error(
        "画像解析結果の形式が正しくありません。"
      );
    }

    const result = normalizeResult(parsedResult);

    return NextResponse.json(result);
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
