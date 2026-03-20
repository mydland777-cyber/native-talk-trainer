import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ScenarioKey = "cafe" | "airport" | "hotel" | "friends" | "business";
type TargetLanguage = "english" | "korean" | "chinese";

function normalizeScenario(value: string): ScenarioKey {
  switch (value) {
    case "cafe":
    case "airport":
    case "hotel":
    case "friends":
    case "business":
      return value;
    default:
      return "cafe";
  }
}

function normalizeLanguage(value: string): TargetLanguage {
  switch (value) {
    case "english":
    case "korean":
    case "chinese":
      return value;
    default:
      return "english";
  }
}

function getScenarioInstruction(scenario: ScenarioKey) {
  switch (scenario) {
    case "cafe":
      return `
Scenario: Cafe conversation.

Assume the learner wants language they can use in a cafe with staff.
Prefer short, natural phrases for ordering, asking follow-up questions, checking options, and responding casually but politely.
When appropriate, make the recommended wording sound like something a customer would actually say to staff.
      `.trim();

    case "airport":
      return `
Scenario: Airport conversation.

Assume the learner wants language they can use at an airport with staff.
Prefer practical phrases for check-in, boarding gates, baggage, delays, immigration-related simple questions, and asking for help.
When appropriate, make the recommended wording sound like something a traveler would naturally say to airport staff.
      `.trim();

    case "hotel":
      return `
Scenario: Hotel conversation.

Assume the learner wants language they can use at a hotel with front desk staff.
Prefer practical phrases for check-in, reservations, room issues, Wi-Fi, breakfast, requests, and polite questions.
When appropriate, make the recommended wording sound like something a guest would naturally say at a hotel.
      `.trim();

    case "friends":
      return `
Scenario: Friends / casual talk.

Assume the learner wants language they can use with friends in casual daily conversation.
Prefer relaxed, natural, modern spoken language.
It is okay for the casual version to sound more conversational and a little faster, but still keep it realistic and widely usable.
      `.trim();

    case "business":
      return `
Scenario: Business conversation.

Assume the learner wants language they can use at work with coworkers, clients, or in meetings.
Prefer natural business language that sounds polite and usable in real work situations.
Avoid stiff textbook phrasing. Keep it practical, clear, and professional.
      `.trim();

    default:
      return `
Scenario: General spoken conversation.

Prefer practical phrases the learner can actually say in real conversation.
      `.trim();
  }
}

function getLanguageInstruction(language: TargetLanguage) {
  switch (language) {
    case "english":
      return `
Target language: English.

The learner is studying spoken English.
The recommended phrase and all three versions must be in English.

Field rules:
- "english" must be the best recommended English phrase to actually say.
- "japanese" must be a short natural Japanese support line.
- "careful", "natural", and "casual" must all be English.
- "carefulKana", "naturalKana", and "casualKana" must be katakana guides based on how the English may sound to a Japanese learner.
      `.trim();

    case "korean":
      return `
Target language: Korean.

The learner is studying spoken Korean.
The recommended phrase and all three versions must be in Korean Hangul.

Field rules:
- "english" must contain the best recommended Korean phrase to actually say.
- "japanese" must be a short natural Japanese support line explaining the meaning.
- "careful", "natural", and "casual" must all be Korean Hangul.
- "carefulKana", "naturalKana", and "casualKana" must be katakana guides based on how the Korean may sound to a Japanese learner.
- Do not output romanization.
- Make the Korean practical and actually speakable.
      `.trim();

    case "chinese":
      return `
Target language: Chinese.

The learner is studying spoken Mandarin Chinese.
Use Simplified Chinese characters.
The recommended phrase and all three versions must be in Simplified Chinese.

Field rules:
- "english" must contain the best recommended Chinese phrase to actually say.
- "japanese" must be a short natural Japanese support line explaining the meaning.
- "careful", "natural", and "casual" must all be Simplified Chinese.
- "carefulKana", "naturalKana", and "casualKana" must be katakana guides based on how the Mandarin may sound to a Japanese learner.
- Do not output pinyin.
- Make the Chinese practical and actually speakable.
      `.trim();

    default:
      return `
Target language: English.
      `.trim();
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = String(body?.message ?? "").trim();
    const scenario = normalizeScenario(String(body?.scenario ?? "cafe").trim());
    const language = normalizeLanguage(
      String(body?.language ?? "english").trim()
    );

    if (!input) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const scenarioInstruction = getScenarioInstruction(scenario);
    const languageInstruction = getLanguageInstruction(language);

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are a spoken-language rewriter and conversation coach for a Japanese learner.

Your top priority is to rewrite the user's input into something they can actually say in real conversation.
Do not act like a dictionary.
Do not explain the original sentence word by word.
Do not preserve the original wording unless it is already the best spoken version.

You must also respect the current scenario and make the output fit that situation naturally.

${scenarioInstruction}

${languageInstruction}

Return only valid JSON.
Do not wrap the JSON in markdown.

The JSON must be exactly:
{
  "english": string,
  "japanese": string,
  "careful": string,
  "natural": string,
  "casual": string,
  "carefulKana": string,
  "naturalKana": string,
  "casualKana": string,
  "explanation": string[]
}

Behavior:
- If the input is Japanese, turn it into natural spoken language in the target language for the scenario.
- If the input is already in the target language, rewrite it into more natural spoken language for the scenario.
- "english" is the main recommended phrase field for the UI, even when the target language is Korean or Chinese.
- "japanese" must be a short natural Japanese meaning/support line.
- "careful" must be a clear careful version in the target language.
- "natural" must be a natural spoken version in the target language.
- "casual" must be a more casual spoken version in the target language.
- "carefulKana", "naturalKana", and "casualKana" must be katakana guides for how it may sound to a Japanese learner.
- Katakana guides are only approximate listening aids, not exact pronunciation.
- Avoid overly stiff katakana. Make it practical and easy to imagine.
- "explanation" must be 2 to 4 short Japanese strings.
- The explanation must focus on wording choice, scenario fit, and spoken connection/reduction.
- Never use dictionary-style explanation.
- Never explain each word separately.
- At least one explanation line should mention that the katakana is only a rough guide when appropriate.
- Keep it practical, short, and usable.
- Prefer phrases a learner can immediately repeat out loud.
- Avoid making the target-language text longer than necessary.
- In "business", keep the recommendation polite and professional.
- In "friends", allow more relaxed spoken language.
- In service situations like "cafe", "airport", and "hotel", prefer wording that sounds natural toward staff.
- For Korean, output Hangul only in the target-language fields.
- For Chinese, output Simplified Chinese only in the target-language fields.
- Do not output romanization or pinyin.

Examples for English mode:

User:
How do native speakers say this casually?

Good output idea:
{
  "english": "How would you say this more casually?",
  "japanese": "これ、もっとカジュアルに言うとどうなる？",
  "careful": "How would you say this more casually?",
  "natural": "How would you say this more casually?",
  "casual": "How d'you say this more casually?",
  "carefulKana": "ハウ ウッド ユー セイ ディス モア カジュアリー",
  "naturalKana": "ハウ ウッジュー セイ ディス モア カジュアリー",
  "casualKana": "ハウジュ セイ ディス モア カジュアリー",
  "explanation": [
    "native speakers を省いて、そのまま会話で使いやすい形にした",
    "How would you say... のほうが自然に聞こえやすい",
    "casual では How d'you が ハウジュ のようにつながって聞こえることがある"
  ]
}

User:
それって普通にどう言うの？

Good output idea:
{
  "english": "How would you normally say that?",
  "japanese": "それって普通はどう言うの？",
  "careful": "How would you normally say that?",
  "natural": "How would you normally say that?",
  "casual": "How would you normally say that?",
  "carefulKana": "ハウ ウッド ユー ノーマリー セイ ザット",
  "naturalKana": "ハウ ウッジュー ノーマリー セイ ザッ",
  "casualKana": "ハウ ウッジュー ノーマリー セイ ザッ",
  "explanation": [
    "普通に は normally で自然に表した",
    "How would you say that? は会話でよく使う形",
    "カタカナは実際の聞こえ方の目安として見れば十分"
  ]
}

Return JSON only.
          `.trim(),
        },
        {
          role: "user",
          content: input,
        },
      ],
    });

    const text = response.output_text.trim();
    const parsed = JSON.parse(text);

    return NextResponse.json({
      reply: parsed,
      language,
      scenario,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "failed to generate reply" },
      { status: 500 }
    );
  }
}