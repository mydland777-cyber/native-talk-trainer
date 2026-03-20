export const runtime = "nodejs";

type SpeechStyle = "careful" | "natural" | "casual";
type TargetLanguage = "english" | "korean" | "chinese";

function normalizeStyle(value: string): SpeechStyle {
  if (value === "careful") return "careful";
  if (value === "casual") return "casual";
  return "natural";
}

function normalizeLanguage(value: string): TargetLanguage {
  if (value === "korean") return "korean";
  if (value === "chinese") return "chinese";
  return "english";
}

function getVoice(style: SpeechStyle) {
  if (style === "careful") return "cedar";
  if (style === "casual") return "marin";
  return "alloy";
}

function getInstruction(
  style: SpeechStyle,
  language: TargetLanguage
) {
  if (language === "korean") {
    if (style === "careful") {
      return "Speak in clear, careful, natural Korean for a Japanese learner. Slightly separate phrases, articulate clearly, and avoid sounding robotic or overly formal unless the text requires it.";
    }

    if (style === "casual") {
      return "Speak in casual, relaxed, natural everyday Korean. Keep it conversational and fluid, with natural rhythm. Do not sound like a teacher reading slowly.";
    }

    return "Speak in natural everyday Korean. Clear, smooth, conversational, and not too formal.";
  }

  if (language === "chinese") {
    if (style === "careful") {
      return "Speak in clear, careful, natural Mandarin Chinese for a Japanese learner. Articulate clearly and keep the pacing slightly slower, but still natural.";
    }

    if (style === "casual") {
      return "Speak in casual, relaxed, natural everyday Mandarin Chinese. Keep it conversational and fluid. Do not sound formal, stiff, or like a teacher reading.";
    }

    return "Speak in natural everyday Mandarin Chinese. Clear, smooth, conversational, and not too formal.";
  }

  if (style === "careful") {
    return "Speak slowly, clearly, and carefully for a Japanese English learner. Separate words slightly and pronounce them very clearly, but still sound natural.";
  }

  if (style === "casual") {
    return "Speak in a very casual, relaxed, fast American English conversation style. Use connected speech, reduced sounds, and an informal rhythm. Do not sound formal, careful, slow, or teacher-like.";
  }

  return "Speak in a natural everyday conversational English style. Clear, natural, and not too formal.";
}

function getSpeed(
  style: SpeechStyle,
  language: TargetLanguage
) {
  if (language === "korean") {
    if (style === "careful") return 0.92;
    if (style === "casual") return 1.12;
    return 1.0;
  }

  if (language === "chinese") {
    if (style === "careful") return 0.9;
    if (style === "casual") return 1.08;
    return 0.98;
  }

  if (style === "careful") return 0.9;
  if (style === "casual") return 1.35;
  return 1.05;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    const style = normalizeStyle(String(body?.style ?? "natural").trim());
    const language = normalizeLanguage(
      String(body?.language ?? "english").trim()
    );

    if (!text) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY is missing" },
        { status: 500 }
      );
    }

    const openaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: getVoice(style),
        input: text,
        format: "mp3",
        instructions: getInstruction(style, language),
        speed: getSpeed(style, language),
      }),
    });

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      return Response.json(
        { error: `OpenAI speech error: ${errorText}` },
        { status: openaiRes.status }
      );
    }

    const arrayBuffer = await openaiRes.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to generate speech";

    return Response.json({ error: message }, { status: 500 });
  }
}