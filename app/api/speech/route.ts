export const runtime = "nodejs";

type SpeechStyle = "careful" | "natural" | "casual";

function getVoice(style: SpeechStyle) {
  if (style === "careful") return "cedar";
  if (style === "casual") return "marin";
  return "alloy";
}

function getInstruction(style: SpeechStyle) {
  if (style === "careful") {
    return "Speak slowly, clearly, and carefully for a Japanese English learner. Separate words slightly and pronounce them very clearly, but still sound natural.";
  }

  if (style === "casual") {
    return "Speak in a very casual, relaxed, fast American English conversation style. Use connected speech, reduced sounds, and an informal rhythm. Do not sound formal, careful, slow, or teacher-like.";
  }

  return "Speak in a natural everyday conversational English style. Clear, natural, and not too formal.";
}

function getSpeed(style: SpeechStyle) {
  if (style === "careful") return 0.9;
  if (style === "casual") return 1.35;
  return 1.05;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    const rawStyle = String(body?.style ?? "natural").trim();

    const style: SpeechStyle =
      rawStyle === "careful" || rawStyle === "casual" ? rawStyle : "natural";

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
        instructions: getInstruction(style),
        speed: getSpeed(style),
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