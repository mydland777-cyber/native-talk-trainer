"use client";

import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type TalkMessage = {
  role: "user" | "assistant";
  english: string;
  japanese?: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = EventTarget & {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function formatTalkText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/([.!?])\s+/g, "$1\n")
    .replace(/([。！？])\s*/g, "$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function TalkPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [messages, setMessages] = useState<TalkMessage[]>([
    {
      role: "assistant",
      english:
        "Hi! We can just talk in English here. If you want, you can also type in Japanese, and I’ll help you keep the conversation going naturally.",
      japanese:
        "こんにちは。ここでは普通に英会話できます。日本語で入力しても、自然に会話が続くように手伝います。",
    },
  ]);

  const endRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  useEffect(() => {
    const SpeechRecognitionApi =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript ?? "";

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const nextText = (finalTranscript || interimTranscript).trim();
      if (!nextText) return;

      setInput(nextText);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function playSpeech(text: string, index: number) {
    if (!text.trim()) return;

    try {
      setSpeakingIndex(index);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const res = await fetch("/api/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          style: "natural",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "speech request failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setSpeakingIndex(null);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setSpeakingIndex(null);
      };

      await audio.play();
    } catch (error) {
      console.error(error);
      setSpeakingIndex(null);

      const message =
        error instanceof Error ? error.message : "音声の再生に失敗しました。";

      alert(message);
    }
  }

  async function handleSpeak(text: string, index: number) {
    await playSpeech(text, index);
  }

  function handleMicClick() {
    if (!speechSupported || !recognitionRef.current || loading) return;

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error(error);
    }
  }

  async function submitMessage() {
    const value = input.trim();
    if (!value || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const userMessage: TalkMessage = {
      role: "user",
      english: value,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/talk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "request failed");
      }

      const assistantMessage: TalkMessage = {
        role: "assistant",
        english: String(data.reply?.english ?? ""),
        japanese: String(data.reply?.japanese ?? ""),
      };

      const nextIndex = nextMessages.length;

      setMessages((prev) => [...prev, assistantMessage]);

      if (assistantMessage.english.trim()) {
        setTimeout(() => {
          void playSpeech(assistantMessage.english, nextIndex);
        }, 120);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown error";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          english: "Sorry, something went wrong. Please try again.",
          japanese: `エラーが発生しました。 ${message}`,
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

  async function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await submitMessage();
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
              Free Talk
            </h1>
            <p
              style={{
                margin: "10px 0 0 0",
                fontSize: "14px",
                color: "#94a3b8",
                lineHeight: 1.7,
              }}
            >
              AIと自然に会話を続けるためのモードです。調べるより、実際に話す練習向けです。
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/chat"
              style={{
                color: "#a9c9ff",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              学習チャットへ
            </Link>

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
              margin: "0 0 10px 0",
              fontSize: "12px",
              color: "#8fa7cc",
              letterSpacing: "0.12em",
              fontWeight: 700,
            }}
          >
            MODE
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: 1.8,
              color: "#dbe4f3",
              whiteSpace: "pre-wrap",
            }}
          >
            ここでは毎回発音解説を出さず、まず会話を続けることを優先します。
            {"\n"}
            英語でも日本語でも入力できます。
          </p>
        </section>

        <div
          style={{
            background: "rgba(13,17,26,0.92)",
            border: "1px solid #1c2538",
            borderRadius: "24px",
            padding: "20px",
            minHeight: "480px",
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
                        {formatTalkText(message.english)}
                      </p>
                    </div>
                  </div>
                );
              }

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
                      margin: "0 0 14px 0",
                      fontSize: "12px",
                      color: "#8fa7cc",
                      letterSpacing: "0.12em",
                      fontWeight: 700,
                    }}
                  >
                    AI PARTNER
                  </p>

                  <section
                    style={{
                      marginBottom: message.japanese ? "14px" : "0",
                      padding: "18px",
                      background: "#0c1320",
                      border: "1px solid #1f2a40",
                      borderRadius: "18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <h2
                        style={{
                          fontSize: "13px",
                          margin: 0,
                          color: "#8eb8ff",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        English
                      </h2>

                      <button
                        type="button"
                        onClick={() => handleSpeak(message.english, index)}
                        disabled={speakingIndex === index}
                        style={{
                          background:
                            speakingIndex === index ? "#5d88c7" : "#7db3ff",
                          color: "#07101d",
                          border: "none",
                          borderRadius: "12px",
                          padding: "10px 14px",
                          fontWeight: 800,
                          fontSize: "13px",
                          cursor:
                            speakingIndex === index ? "default" : "pointer",
                          opacity: speakingIndex === index ? 0.78 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {speakingIndex === index ? "再生中..." : "▶ Play"}
                      </button>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        lineHeight: 1.85,
                        fontSize: "24px",
                        fontWeight: 800,
                        color: "#ffffff",
                        letterSpacing: "0.01em",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {formatTalkText(message.english)}
                    </p>
                  </section>

                  {message.japanese && (
                    <section
                      style={{
                        padding: "14px 16px",
                        background: "#0b111d",
                        border: "1px solid #1b273c",
                        borderRadius: "16px",
                      }}
                    >
                      <h2
                        style={{
                          fontSize: "13px",
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
                          fontSize: "14px",
                          color: "#dbe4f3",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {formatTalkText(message.japanese)}
                      </p>
                    </section>
                  )}
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
            placeholder="英語でも日本語でも入力"
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
            type="button"
            onClick={handleMicClick}
            disabled={!speechSupported || loading}
            style={{
              background: isListening ? "#f59e0b" : "#1b2a41",
              color: isListening ? "#07101d" : "#dbe4f3",
              border: "1px solid #2d3d5c",
              borderRadius: "14px",
              padding: "14px 16px",
              fontWeight: 800,
              cursor: !speechSupported || loading ? "default" : "pointer",
              whiteSpace: "nowrap",
              opacity: !speechSupported || loading ? 0.5 : 1,
              fontSize: "14px",
              height: "fit-content",
            }}
          >
            {!speechSupported
              ? "マイク未対応"
              : isListening
                ? "停止"
                : "🎤 マイク"}
          </button>

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