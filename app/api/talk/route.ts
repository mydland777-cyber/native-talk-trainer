import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type TalkRole = "user" | "assistant";

type TalkMessage = {
  role: TalkRole;
  english: string;
  japanese?: string;
};

type RawTalkMessage = {
  role?: unknown;
  english?: unknown;
  japanese?: unknown;
};

export async function POST(req: Request) {
  try {
    const body: { messages?: unknown } = await req.json();
    const rawMessages: RawTalkMessage[] = Array.isArray(body?.messages)
      ? (body.messages as RawTalkMessage[])
      : [];

    const mappedMessages: TalkMessage[] = rawMessages.map(
      (item: RawTalkMessage) => {
        const role: TalkRole =
          item?.role === "assistant" ? "assistant" : "user";

        return {
          role,
          english: String(item?.english ?? "").trim(),
          japanese:
            item?.japanese == null ? undefined : String(item.japanese).trim(),
        };
      }
    );

    const messages: TalkMessage[] = mappedMessages.filter(
      (item: TalkMessage) => item.english.length > 0
    );

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "messages are required" },
        { status: 400 }
      );
    }

    const recentMessages = messages.slice(-12);

    const conversationText = recentMessages
      .map((message: TalkMessage) => {
        if (message.role === "user") {
          return `User: ${message.english}`;
        }

        return `Assistant: ${message.english}`;
      })
      .join("\n");

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.9,
      max_output_tokens: 220,
      input: [
        {
          role: "system",
    content: `
You are an AI English conversation partner for a Japanese learner.

This mode is for free conversation practice, not explanation mode.

Return only valid JSON.
Do not wrap the JSON in markdown.

The JSON must be exactly:
{
  "english": string,
  "japanese": string
}

Main behavior:
- Sound like a real person in casual conversation.
- Keep the conversation moving naturally.
- Be easy and fun to reply to.
- Be warm, relaxed, casual, and natural.
- Sound like spoken English, not textbook English.
- Do not sound like a teacher unless the user clearly asks for correction.
- Do not explain too much.
- Do not give lessons, bullet points, or breakdowns.
- Do not provide pronunciation explanations.
- Do not provide careful / natural / casual sections.

English rules:
- "english" is the main reply.
- Keep it short, natural, and speakable.
- Usually 1 to 3 short paragraphs.
- Usually 2 to 4 natural spoken sentences total.
- Avoid long monologues.
- Prefer casual everyday spoken English.
- It is okay to use contractions like "I'm", "you're", "that's", "kinda", "pretty", "totally", "sounds good", when natural.
- Often include one natural follow-up question.
- Make the user want to answer.
- If the user says something in Japanese, understand it and reply in natural English.
- If the user says something in awkward English, reply naturally in better English without explicitly correcting them.
- Keep the reply suitable for text-to-speech and real conversation practice.

Japanese rules:
- "japanese" must be short.
- It is only a support line for understanding.
- Keep it clearly shorter than the English.
- Do not explain grammar.

Style:
- friendly
- casual
- natural
- supportive
- conversational

Important:
- Do not be stiff, formal, or textbook-like.
- Do not repeat the user's sentence too much.
- Do not become overly cheerful or dramatic.
- Do not suddenly change the topic without a connection.
- End in a way that feels easy to continue.
- The reply should feel like real spoken conversation between friends or friendly people.

Return JSON only.
`.trim(),
        },
        {
          role: "user",
          content: `
Continue this conversation naturally as a real chat partner.

Recent conversation:
${conversationText}

Now reply with the next assistant message.
          `.trim(),
        },
      ],
    });

    const text = response.output_text.trim();
    const parsed = JSON.parse(text) as {
      english?: unknown;
      japanese?: unknown;
    };

    const english = String(parsed?.english ?? "").trim();
    const japanese = String(parsed?.japanese ?? "").trim();

    if (!english) {
      throw new Error("empty english reply");
    }

    return NextResponse.json({
      reply: {
        english,
        japanese,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "failed to generate talk reply" },
      { status: 500 }
    );
  }
}