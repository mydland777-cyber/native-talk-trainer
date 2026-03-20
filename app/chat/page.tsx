"use client";

import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type UserMessage = {
  role: "user";
  text: string;
};

type AssistantMessage = {
  role: "assistant";
  english: string;
  japanese: string;
  careful: string;
  natural: string;
  casual: string;
  carefulKana: string;
  naturalKana: string;
  casualKana: string;
  explanation: string[];
};

type Message = UserMessage | AssistantMessage;
type SpeechStyle = "careful" | "natural" | "casual";
type ScenarioKey = "cafe" | "airport" | "hotel" | "friends" | "business";

const SCENARIOS: {
  key: ScenarioKey;
  label: string;
  title: string;
  description: string;
  placeholder: string;
}[] = [
  {
    key: "cafe",
    label: "カフェ",
    title: "Cafe Conversation",
    description: "注文・聞き返し・おすすめの確認などを練習",
    placeholder: "例: アイスラテを注文したい、サイズを聞きたい",
  },
  {
    key: "airport",
    label: "空港",
    title: "Airport Conversation",
    description: "チェックイン・搭乗口・手荷物などを練習",
    placeholder: "例: 搭乗口はどこですか？ 荷物を預けたい",
  },
  {
    key: "hotel",
    label: "ホテル",
    title: "Hotel Conversation",
    description: "チェックイン・設備確認・トラブル対応を練習",
    placeholder: "例: 予約しています、Wi-Fiは使えますか？",
  },
  {
    key: "friends",
    label: "友達",
    title: "Friends / Casual Talk",
    description: "日常会話・誘い方・軽い雑談を練習",
    placeholder: "例: 今夜ひま？ 一緒にご飯行かない？",
  },
  {
    key: "business",
    label: "仕事",
    title: "Business Conversation",
    description: "会議・依頼・確認・丁寧な言い回しを練習",
    placeholder: "例: この件を確認してもらえますか？",
  },
];

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [scenario, setScenario] = useState<ScenarioKey>("cafe");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "user",
      text: "カフェで『アイスラテください』って自然に言いたい",
    },
    {
      role: "assistant",
      english: "Can I get an iced latte?",
      japanese: "アイスラテください。",
      careful: "Can I get an iced latte?",
      natural: "Can I get an iced latte?",
      casual: "Can I get an iced latte?",
      carefulKana: "キャン アイ ゲット アン アイスド ラテ",
      naturalKana: "キャナイ ゲッタン アイスド ラテ",
      casualKana: "キャナイ ゲッラン アイスラテ",
      explanation: [
        "please を付けてもよいが、注文では Can I get ...? がかなり自然",
        "iced latte は会話ではつながって聞こえやすい",
        "まず English をそのまま言えるようにしてから、natural / casual の聞こえ方に慣れるのがおすすめ",
      ],
    },
  ]);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  const currentScenario = useMemo(() => {
    return SCENARIOS.find((item) => item.key === scenario) ?? SCENARIOS[0];
  }, [scenario]);

  async function submitMessage() {
    const value = input.trim();
    if (!value || loading) return;

    const userMessage: UserMessage = {
      role: "user",
      text: value,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: value,
          scenario,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "request failed");
      }

      const assistantMessage: AssistantMessage = {
        role: "assistant",
        english: data.reply.english,
        japanese: data.reply.japanese,
        careful: data.reply.careful,
        natural: data.reply.natural,
        casual: data.reply.casual,
        carefulKana: data.reply.carefulKana ?? "",
        naturalKana: data.reply.naturalKana ?? "",
        casualKana: data.reply.casualKana ?? "",
        explanation: Array.isArray(data.reply.explanation)
          ? data.reply.explanation
          : [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown error";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          english: "Sorry, something went wrong.",
          japanese: "エラーが発生しました。",
          careful: "Sorry, something went wrong.",
          natural: "Sorry, something went wrong.",
          casual: "Sorry, somethin' went wrong.",
          carefulKana: "ソーリー、サムシング ウェント ロング",
          naturalKana: "ソーリー、サムシング ウェント ロング",
          casualKana: "ソーリー、サムシン ウェント ロング",
          explanation: [`error: ${message}`],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitMessage();
  }

  async function handleKeyDown(
    e: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await submitMessage();
    }
  }

  async function handleSpeak(
    text: string,
    style: SpeechStyle,
    index: number
  ) {
    const key = `${index}-${style}`;

    try {
      setSpeakingKey(key);

      const res = await fetch("/api/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, style }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "speech request failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setSpeakingKey(null);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setSpeakingKey(null);
      };

      await audio.play();
    } catch (error) {
      console.error(error);
      setSpeakingKey(null);

      const message =
        error instanceof Error ? error.message : "音声の再生に失敗しました。";

      alert(message);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(33,62,110,0.22), transparent 28%), #05070d",
        color: "#f5f7ff",
        padding: "24px 16px 40px",
      }}
    >
      <div
        style={{
          maxWidth: "920px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#8fa7cc",
                letterSpacing: "0.14em",
                fontWeight: 700,
              }}
            >
              NATIVE TALK TRAINER
            </p>
            <h1
              style={{
                margin: "10px 0 0 0",
                fontSize: "32px",
                lineHeight: 1.2,
                color: "#f8fbff",
              }}
            >
              Conversation Practice
            </h1>
            <p
              style={{
                margin: "10px 0 0 0",
                fontSize: "14px",
                color: "#94a3b8",
                lineHeight: 1.7,
              }}
            >
              場面ごとに、自然な言い換えと崩れた発音をまとめて練習できます。
            </p>
          </div>

          <Link
            href="/"
            style={{
              color: "#a9c9ff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            ← ホームへ戻る
          </Link>
        </div>

        <section
          style={{
            marginBottom: "20px",
            background: "rgba(13,17,26,0.94)",
            border: "1px solid #1c2538",
            borderRadius: "22px",
            padding: "18px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
          }}
        >
          <p
            style={{
              margin: "0 0 12px 0",
              fontSize: "12px",
              color: "#8fa7cc",
              letterSpacing: "0.12em",
              fontWeight: 700,
            }}
          >
            SCENARIO
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            {SCENARIOS.map((item) => {
              const active = item.key === scenario;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setScenario(item.key)}
                  style={{
                    background: active ? "#7db3ff" : "#0b111d",
                    color: active ? "#07101d" : "#dbe4f3",
                    border: active ? "1px solid #7db3ff" : "1px solid #22304a",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    fontWeight: 800,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              background: "#0b111d",
              border: "1px solid #22304a",
              borderRadius: "16px",
              padding: "16px 18px",
            }}
          >
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "18px",
                color: "#ffffff",
              }}
            >
              {currentScenario.title}
            </h2>
            <p
              style={{
                margin: "0 0 6px 0",
                fontSize: "14px",
                lineHeight: 1.7,
                color: "#dbe4f3",
              }}
            >
              {currentScenario.description}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: 1.7,
                color: "#8fa7cc",
              }}
            >
              入力例: {currentScenario.placeholder}
            </p>
          </div>
        </section>

        <div
          style={{
            background: "rgba(13,17,26,0.92)",
            border: "1px solid #1c2538",
            borderRadius: "24px",
            padding: "20px",
            minHeight: "420px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {messages.map((message, index) => {
              if (message.role === "user") {
                return (
                  <div
                    key={index}
                    style={{
                      alignSelf: "flex-end",
                      width: "min(100%, 680px)",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "78%",
                        background:
                          "linear-gradient(180deg, #172133 0%, #111827 100%)",
                        border: "1px solid #25314a",
                        borderRadius: "18px",
                        padding: "14px 16px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 6px 0",
                          fontSize: "12px",
                          color: "#8eb8ff",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                        }}
                      >
                        YOU
                      </p>
                      <p
                        style={{
                          margin: 0,
                          lineHeight: 1.8,
                          fontSize: "15px",
                          color: "#f4f7ff",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {message.text}
                      </p>
                    </div>
                  </div>
                );
              }

              const carefulKey = `${index}-careful`;
              const naturalKey = `${index}-natural`;
              const casualKey = `${index}-casual`;

              return (
                <div
                  key={index}
                  style={{
                    alignSelf: "flex-start",
                    width: "100%",
                    background:
                      "linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(12,18,30,0.98) 100%)",
                    border: "1px solid #22304a",
                    borderRadius: "22px",
                    padding: "20px",
                    boxShadow: "0 16px 50px rgba(0,0,0,0.28)",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "12px",
                      color: "#8fa7cc",
                      letterSpacing: "0.12em",
                      fontWeight: 700,
                    }}
                  >
                    AI RESPONSE
                  </p>

                  <section
                    style={{
                      marginBottom: "18px",
                      padding: "18px",
                      background: "#0c1320",
                      border: "1px solid #1f2a40",
                      borderRadius: "18px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "13px",
                        margin: "0 0 10px 0",
                        color: "#8eb8ff",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      English
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        lineHeight: 1.8,
                        fontSize: "28px",
                        fontWeight: 800,
                        color: "#ffffff",
                        letterSpacing: "0.01em",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {message.english}
                    </p>
                  </section>

                  <section
                    style={{
                      marginBottom: "18px",
                      padding: "16px 18px",
                      background: "#0b111d",
                      border: "1px solid #1b273c",
                      borderRadius: "16px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "14px",
                        margin: "0 0 8px 0",
                        color: "#d7e6ff",
                      }}
                    >
                      日本語補助
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        lineHeight: 1.8,
                        fontSize: "15px",
                        color: "#dbe4f3",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {message.japanese}
                    </p>
                  </section>

                  <section
                    style={{
                      marginBottom: "18px",
                      padding: "16px 18px",
                      background: "#0b111d",
                      border: "1px solid #1b273c",
                      borderRadius: "16px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "14px",
                        margin: "0 0 12px 0",
                        color: "#d7e6ff",
                      }}
                    >
                      Pronunciation
                    </h2>

                    <div
                      style={{
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px 14px",
                          background: "#101828",
                          border: "1px solid #22304a",
                          borderRadius: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#8eb8ff",
                            marginBottom: "4px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          careful
                        </div>
                        <div
                          style={{
                            fontSize: "15px",
                            lineHeight: 1.8,
                            color: "#f5f7ff",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {message.careful}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "12px 14px",
                          background: "#101828",
                          border: "1px solid #22304a",
                          borderRadius: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#8eb8ff",
                            marginBottom: "4px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          natural
                        </div>
                        <div
                          style={{
                            fontSize: "15px",
                            lineHeight: 1.8,
                            color: "#f5f7ff",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {message.natural}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "12px 14px",
                          background: "#101828",
                          border: "1px solid #22304a",
                          borderRadius: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#8eb8ff",
                            marginBottom: "4px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          casual
                        </div>
                        <div
                          style={{
                            fontSize: "15px",
                            lineHeight: 1.8,
                            color: "#f5f7ff",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {message.casual}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section
                    style={{
                      marginBottom: "18px",
                      padding: "16px 18px",
                      background: "#0b111d",
                      border: "1px solid #1b273c",
                      borderRadius: "16px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "14px",
                        margin: "0 0 12px 0",
                        color: "#d7e6ff",
                      }}
                    >
                      カタカナ目安
                    </h2>

                    <div
                      style={{
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px 14px",
                          background: "#101828",
                          border: "1px solid #22304a",
                          borderRadius: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#7f96ba",
                            marginBottom: "4px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          careful
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            lineHeight: 1.8,
                            color: "#cfd9ea",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {message.carefulKana}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "12px 14px",
                          background: "#101828",
                          border: "1px solid #22304a",
                          borderRadius: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#7f96ba",
                            marginBottom: "4px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          natural
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            lineHeight: 1.8,
                            color: "#cfd9ea",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {message.naturalKana}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "12px 14px",
                          background: "#101828",
                          border: "1px solid #22304a",
                          borderRadius: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#7f96ba",
                            marginBottom: "4px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          casual
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            lineHeight: 1.8,
                            color: "#cfd9ea",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {message.casualKana}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section
                    style={{
                      marginBottom: "18px",
                      padding: "16px 18px",
                      background: "#0b111d",
                      border: "1px solid #1b273c",
                      borderRadius: "16px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "14px",
                        margin: "0 0 10px 0",
                        color: "#d7e6ff",
                      }}
                    >
                      Why it sounds like that
                    </h2>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "20px",
                        lineHeight: 1.85,
                        color: "#dbe4f3",
                        fontSize: "14px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {message.explanation.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <section
                    style={{
                      padding: "16px 18px",
                      background: "#0b111d",
                      border: "1px solid #1b273c",
                      borderRadius: "16px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "14px",
                        margin: "0 0 12px 0",
                        color: "#d7e6ff",
                      }}
                    >
                      Audio
                    </h2>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleSpeak(message.careful, "careful", index)
                        }
                        disabled={speakingKey === carefulKey}
                        style={{
                          background:
                            speakingKey === carefulKey ? "#5d88c7" : "#7db3ff",
                          color: "#07101d",
                          border: "none",
                          borderRadius: "14px",
                          padding: "13px 16px",
                          fontWeight: 800,
                          fontSize: "14px",
                          cursor:
                            speakingKey === carefulKey ? "default" : "pointer",
                          opacity: speakingKey === carefulKey ? 0.78 : 1,
                        }}
                      >
                        {speakingKey === carefulKey ? "再生中..." : "▶ careful"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleSpeak(message.natural, "natural", index)
                        }
                        disabled={speakingKey === naturalKey}
                        style={{
                          background:
                            speakingKey === naturalKey ? "#5d88c7" : "#7db3ff",
                          color: "#07101d",
                          border: "none",
                          borderRadius: "14px",
                          padding: "13px 16px",
                          fontWeight: 800,
                          fontSize: "14px",
                          cursor:
                            speakingKey === naturalKey ? "default" : "pointer",
                          opacity: speakingKey === naturalKey ? 0.78 : 1,
                        }}
                      >
                        {speakingKey === naturalKey ? "再生中..." : "▶ natural"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleSpeak(message.casual, "casual", index)
                        }
                        disabled={speakingKey === casualKey}
                        style={{
                          background:
                            speakingKey === casualKey ? "#5d88c7" : "#7db3ff",
                          color: "#07101d",
                          border: "none",
                          borderRadius: "14px",
                          padding: "13px 16px",
                          fontWeight: 800,
                          fontSize: "14px",
                          cursor:
                            speakingKey === casualKey ? "default" : "pointer",
                          opacity: speakingKey === casualKey ? 0.78 : 1,
                        }}
                      >
                        {speakingKey === casualKey ? "再生中..." : "▶ casual"}
                      </button>
                    </div>
                  </section>
                </div>
              );
            })}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "#111827",
                  border: "1px solid #22304a",
                  borderRadius: "18px",
                  padding: "16px 20px",
                  color: "#94a3b8",
                }}
              >
                AIが返答を作成中...
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: "20px",
            background: "rgba(13,17,26,0.94)",
            border: "1px solid #1c2538",
            borderRadius: "22px",
            padding: "16px",
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
            boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentScenario.placeholder}
            rows={3}
            style={{
              flex: 1,
              resize: "vertical",
              minHeight: "56px",
              background: "#070b14",
              color: "#f5f7ff",
              border: "1px solid #24304a",
              borderRadius: "14px",
              padding: "14px 16px",
              outline: "none",
              fontSize: "15px",
              lineHeight: 1.7,
              fontFamily: "inherit",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#7db3ff",
              color: "#07101d",
              border: "none",
              borderRadius: "14px",
              padding: "14px 18px",
              fontWeight: 800,
              cursor: loading ? "default" : "pointer",
              whiteSpace: "nowrap",
              opacity: loading ? 0.7 : 1,
              fontSize: "14px",
              height: "fit-content",
            }}
          >
            {loading ? "送信中..." : "送信"}
          </button>
        </form>
      </div>
    </main>
  );
}