"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type TargetLanguage = "english" | "german" | "french" | "italian";
type TranslationTone = "standard" | "polite" | "friendly";

type LanguageItem = {
  key: TargetLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
  placeholder: string;
};

type ToneItem = {
  key: TranslationTone;
  label: string;
  description: string;
};

const LANGUAGES: LanguageItem[] = [
  {
    key: "english",
    label: "英語",
    nativeLabel: "English",
    flag: "🇬🇧",
    placeholder: "例：駅はどこですか？",
  },
  {
    key: "german",
    label: "ドイツ語",
    nativeLabel: "Deutsch",
    flag: "🇩🇪",
    placeholder: "例：この電車はベルリンへ行きますか？",
  },
  {
    key: "french",
    label: "フランス語",
    nativeLabel: "Français",
    flag: "🇫🇷",
    placeholder: "例：おすすめの料理はどれですか？",
  },
  {
    key: "italian",
    label: "イタリア語",
    nativeLabel: "Italiano",
    flag: "🇮🇹",
    placeholder: "例：ホテルまでタクシーでお願いします。",
  },
];

const TONES: ToneItem[] = [
  {
    key: "standard",
    label: "標準・自然",
    description: "現地の人が普通に使う自然な話し方",
  },
  {
    key: "polite",
    label: "丁寧",
    description: "ホテル・空港・お店などで使いやすい丁寧な話し方",
  },
  {
    key: "friendly",
    label: "フレンドリー",
    description: "親しみやすく柔らかい会話的な話し方",
  },
];

export default function HomePage() {
  const [language, setLanguage] =
    useState<TargetLanguage>("english");

  const [tone, setTone] =
    useState<TranslationTone>("standard");

  const [input, setInput] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const currentLanguage = useMemo(() => {
    return (
      LANGUAGES.find((item) => item.key === language) ??
      LANGUAGES[0]
    );
  }, [language]);

  const currentTone = useMemo(() => {
    return (
      TONES.find((item) => item.key === tone) ??
      TONES[0]
    );
  }, [tone]);

  useEffect(() => {
    const text = input.trim();

    abortControllerRef.current?.abort();

    if (!text) {
      setTranslatedText("");
      setLoading(false);
      setErrorMessage("");
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            text,
            language,
            tone,
            direction: "japanese-to-foreign",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "翻訳に失敗しました。"
          );
        }

        setTranslatedText(
          String(data?.translatedText ?? "").trim()
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "翻訳に失敗しました。"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 800);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [input, language, tone]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      stopAudio();
    };
  }, []);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setSpeaking(false);
  }

  async function playTranslation() {
    if (!translatedText || speaking) return;

    stopAudio();
    setErrorMessage("");

    try {
      setSpeaking(true);

      const response = await fetch("/api/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: translatedText,
          style:
            tone === "polite"
              ? "careful"
              : tone === "friendly"
              ? "casual"
              : "natural",
          language,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          errorText || "音声を生成できませんでした。"
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audioRef.current = audio;
      audioUrlRef.current = url;

      audio.onended = () => {
        stopAudio();
      };

      audio.onerror = () => {
        stopAudio();
        setErrorMessage("音声を再生できませんでした。");
      };

      await audio.play();
    } catch (error) {
      console.error(error);
      stopAudio();

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "音声を再生できませんでした。"
      );
    }
  }

  function clearText() {
    abortControllerRef.current?.abort();
    stopAudio();

    setInput("");
    setTranslatedText("");
    setErrorMessage("");
    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(33,62,110,0.24), transparent 28%), #05070d",
        color: "#f5f7ff",
        padding: "18px 14px 40px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "18px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "#8fa7cc",
              letterSpacing: "0.14em",
              fontWeight: 800,
            }}
          >
            ことばパスポート
          </p>

          <h1
            style={{
              margin: "8px 0 8px",
              fontSize: "34px",
              lineHeight: 1.2,
              fontWeight: 900,
              color: "#ffffff",
            }}
          >
            世界と話せる旅行翻訳
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: 1.7,
              color: "#aab8cf",
            }}
          >
            日本語を入力すると、自動で旅行先の言葉へ翻訳します。
          </p>
        </header>

        <section
          style={{
            background: "rgba(13,17,26,0.94)",
            border: "1px solid #1c2538",
            borderRadius: "22px",
            padding: "16px",
            marginBottom: "14px",
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "15px",
              color: "#ffffff",
            }}
          >
            翻訳する言語
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            {LANGUAGES.map((item) => {
              const active = item.key === language;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    stopAudio();
                    setLanguage(item.key);
                  }}
                  style={{
                    minHeight: "68px",
                    background: active
                      ? "#7db3ff"
                      : "#0b111d",
                    color: active
                      ? "#07101d"
                      : "#e4ebf7",
                    border: active
                      ? "1px solid #7db3ff"
                      : "1px solid #22304a",
                    borderRadius: "15px",
                    padding: "10px 8px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "22px",
                    }}
                  >
                    {item.flag}
                  </span>

                  <span
                    style={{
                      display: "block",
                      marginTop: "3px",
                      fontSize: "14px",
                      fontWeight: 900,
                    }}
                  >
                    {item.label}
                  </span>

                  <span
                    style={{
                      display: "block",
                      marginTop: "2px",
                      fontSize: "11px",
                      opacity: 0.78,
                    }}
                  >
                    {item.nativeLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          style={{
            background: "rgba(13,17,26,0.94)",
            border: "1px solid #1c2538",
            borderRadius: "22px",
            padding: "16px",
            marginBottom: "14px",
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "15px",
              color: "#ffffff",
            }}
          >
            話し方
          </h2>

          <div
            style={{
              display: "grid",
              gap: "9px",
            }}
          >
            {TONES.map((item) => {
              const active = item.key === tone;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    stopAudio();
                    setTone(item.key);
                  }}
                  style={{
                    width: "100%",
                    background: active
                      ? "#172b47"
                      : "#0b111d",
                    color: "#f5f7ff",
                    border: active
                      ? "1px solid #7db3ff"
                      : "1px solid #22304a",
                    borderRadius: "14px",
                    padding: "13px 14px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: 900,
                      color: active
                        ? "#9cc8ff"
                        : "#ffffff",
                    }}
                  >
                    {item.label}
                  </span>

                  <span
                    style={{
                      display: "block",
                      marginTop: "4px",
                      fontSize: "12px",
                      color: "#aab8cf",
                      lineHeight: 1.6,
                    }}
                  >
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          style={{
            background: "rgba(13,17,26,0.94)",
            border: "1px solid #1c2538",
            borderRadius: "22px",
            padding: "16px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "15px",
                color: "#ffffff",
              }}
            >
              日本語を入力
            </h2>

            {input && (
              <button
                type="button"
                onClick={clearText}
                style={{
                  background: "transparent",
                  color: "#9eb2d0",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                全部消す
              </button>
            )}
          </div>

          <textarea
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            placeholder={currentLanguage.placeholder}
            rows={5}
            style={{
              width: "100%",
              minHeight: "130px",
              resize: "vertical",
              boxSizing: "border-box",
              background: "#070b14",
              color: "#f5f7ff",
              border: "1px solid #24304a",
              borderRadius: "16px",
              padding: "15px",
              outline: "none",
              fontSize: "17px",
              lineHeight: 1.7,
              fontFamily: "inherit",
            }}
          />

          <p
            style={{
              margin: "10px 0 0",
              color: "#7f8da5",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            入力が止まってから約0.8秒後に自動翻訳します。
          </p>
        </section>

        {errorMessage && (
          <div
            style={{
              marginBottom: "14px",
              padding: "13px 15px",
              borderRadius: "15px",
              border: "1px solid #7f3244",
              background: "rgba(102,25,45,0.3)",
              color: "#ffdbe3",
              fontSize: "14px",
              lineHeight: 1.7,
            }}
          >
            {errorMessage}
          </div>
        )}

        <section
          style={{
            background: "rgba(13,17,26,0.94)",
            border: "1px solid #1c2538",
            borderRadius: "22px",
            padding: "16px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "15px",
                color: "#ffffff",
              }}
            >
              {currentLanguage.flag} {currentLanguage.label}の翻訳
            </h2>

            <span
              style={{
                fontSize: "12px",
                color: "#8fa7cc",
              }}
            >
              {currentTone.label}
            </span>
          </div>

          <div
            style={{
              minHeight: "138px",
              background: "#0b111d",
              border: "1px solid #22304a",
              borderRadius: "16px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
            }}
          >
            {loading ? (
              <p
                style={{
                  margin: 0,
                  color: "#91a1bb",
                  fontSize: "15px",
                }}
              >
                翻訳しています...
              </p>
            ) : translatedText ? (
              <p
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: "26px",
                  fontWeight: 800,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {translatedText}
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  color: "#66758d",
                  fontSize: "15px",
                  lineHeight: 1.7,
                }}
              >
                翻訳結果がここに表示されます。
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={!translatedText || loading}
            onClick={() => void playTranslation()}
            style={{
              width: "100%",
              marginTop: "12px",
              minHeight: "58px",
              background:
                translatedText && !loading
                  ? "#7db3ff"
                  : "#334155",
              color:
                translatedText && !loading
                  ? "#07101d"
                  : "#8794a8",
              border: "none",
              borderRadius: "15px",
              padding: "14px 16px",
              cursor:
                translatedText && !loading
                  ? "pointer"
                  : "default",
              fontFamily: "inherit",
              fontSize: "16px",
              fontWeight: 900,
            }}
          >
            {speaking
              ? "再生中..."
              : `▶ ${currentLanguage.label}で相手に聞かせる`}
          </button>
        </section>

        <Link
          href="/translate"
          style={{
            width: "100%",
            minHeight: "70px",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(180deg, #a8dfbd, #76b893)",
            color: "#06120c",
            borderRadius: "18px",
            padding: "16px",
            textDecoration: "none",
            textAlign: "center",
            fontSize: "18px",
            fontWeight: 900,
            boxShadow: "0 14px 30px rgba(0,0,0,0.3)",
          }}
        >
          🎤 音声で対面通訳をする
        </Link>
      </div>
    </main>
  );
}