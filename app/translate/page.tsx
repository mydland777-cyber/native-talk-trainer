"use client";

import Link from "next/link";
import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type TargetLanguage =
  | "english"
  | "korean"
  | "chinese"
  | "german"
  | "french"
  | "italian";

type TranslationTone = "standard" | "polite" | "friendly";
type SpeakerSide = "japanese" | "foreign";

type DetectedLanguage = {
  code: string;
  key: string;
  label: string;
};

type TranslationResult = {
  originalText: string;
  translatedText: string;
  detectedLanguage?: DetectedLanguage;
};

const LANGUAGES: {
  key: TargetLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
}[] = [
  {
    key: "english",
    label: "英語",
    nativeLabel: "English",
    flag: "🇬🇧",
  },
  {
    key: "korean",
    label: "韓国語",
    nativeLabel: "한국어",
    flag: "🇰🇷",
  },
  {
    key: "chinese",
    label: "中国語",
    nativeLabel: "中文",
    flag: "🇨🇳",
  },
  {
    key: "german",
    label: "ドイツ語",
    nativeLabel: "Deutsch",
    flag: "🇩🇪",
  },
  {
    key: "french",
    label: "フランス語",
    nativeLabel: "Français",
    flag: "🇫🇷",
  },
  {
    key: "italian",
    label: "イタリア語",
    nativeLabel: "Italiano",
    flag: "🇮🇹",
  },
];

const TONES: {
  key: TranslationTone;
  label: string;
  description: string;
}[] = [
  {
    key: "standard",
    label: "標準・自然",
    description: "現地の人が普通に使う、自然で失礼のない話し方",
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

function isTargetLanguage(value: string): value is TargetLanguage {
  return LANGUAGES.some((item) => item.key === value);
}

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function getFileExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export default function TranslatePage() {
  const [language, setLanguage] =
    useState<TargetLanguage>("english");

  const [tone, setTone] =
    useState<TranslationTone>("standard");

  const [recordingSide, setRecordingSide] =
    useState<SpeakerSide | null>(null);

  const [processingSide, setProcessingSide] =
    useState<SpeakerSide | null>(null);

  const [japaneseResult, setJapaneseResult] =
    useState<TranslationResult | null>(null);

  const [foreignResult, setForeignResult] =
    useState<TranslationResult | null>(null);

  const [speaking, setSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoChangedMessage, setAutoChangedMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingSideRef = useRef<SpeakerSide | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const currentLanguage =
    LANGUAGES.find((item) => item.key === language) ?? LANGUAGES[0];

  const currentTone =
    TONES.find((item) => item.key === tone) ?? TONES[0];

  useEffect(() => {
    return () => {
      stopMediaStream();
      stopAudio();
    };
  }, []);

  function stopMediaStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

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

  async function startRecording(side: SpeakerSide) {
    if (recordingSide || processingSide) return;

    setErrorMessage("");
    setAutoChangedMessage("");
    stopAudio();

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setErrorMessage("このブラウザでは音声録音を利用できません。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = getSupportedMimeType();

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordingSideRef.current = side;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setErrorMessage("録音中にエラーが発生しました。");
        setRecordingSide(null);
        recordingSideRef.current = null;
        stopMediaStream();
      };

      recorder.onstop = async () => {
        const recordedSide = recordingSideRef.current;
        const chunks = [...audioChunksRef.current];

        audioChunksRef.current = [];
        recordingSideRef.current = null;
        mediaRecorderRef.current = null;
        setRecordingSide(null);
        stopMediaStream();

        if (!recordedSide || chunks.length === 0) {
          return;
        }

        const recordedMimeType =
          recorder.mimeType || mimeType || "audio/webm";

        const audioBlob = new Blob(chunks, {
          type: recordedMimeType,
        });

        await processRecording(
          recordedSide,
          audioBlob,
          recordedMimeType
        );
      };

      recorder.start();
      setRecordingSide(side);
    } catch (error) {
      console.error(error);
      stopMediaStream();

      const message =
        error instanceof DOMException &&
        error.name === "NotAllowedError"
          ? "マイクの使用が許可されていません。iPhoneのSafari設定を確認してください。"
          : "録音を開始できませんでした。";

      setErrorMessage(message);
    }
  }

  function stopRecording(side: SpeakerSide) {
    if (recordingSide !== side) return;

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }

    setRecordingSide(null);
    recordingSideRef.current = null;
    stopMediaStream();
  }

  function cancelRecording() {
    const recorder = mediaRecorderRef.current;

    audioChunksRef.current = [];
    recordingSideRef.current = null;

    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        setRecordingSide(null);
        stopMediaStream();
      };

      recorder.stop();
      return;
    }

    setRecordingSide(null);
    stopMediaStream();
  }

  async function processRecording(
    side: SpeakerSide,
    audioBlob: Blob,
    mimeType: string
  ) {
    setProcessingSide(side);
    setErrorMessage("");
    setAutoChangedMessage("");

    try {
      const formData = new FormData();
      const extension = getFileExtension(mimeType);

      formData.append(
        "audio",
        audioBlob,
        `recording.${extension}`
      );

      formData.append(
        "language",
        side === "japanese" ? "japanese" : "auto"
      );

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const transcribeData = await transcribeResponse.json();

      if (!transcribeResponse.ok) {
        throw new Error(
          transcribeData?.error || "音声を読み取れませんでした。"
        );
      }

      const originalText = String(
        transcribeData?.text ?? ""
      ).trim();

      if (!originalText) {
        throw new Error("音声を聞き取れませんでした。");
      }

      if (side === "japanese") {
        const translateResponse = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: originalText,
            direction: "japanese-to-foreign",
            language,
            tone,
          }),
        });

        const translateData = await translateResponse.json();

        if (!translateResponse.ok) {
          throw new Error(
            translateData?.error || "翻訳に失敗しました。"
          );
        }

        const translatedText = String(
          translateData?.translatedText ?? ""
        ).trim();

        if (!translatedText) {
          throw new Error("翻訳結果を取得できませんでした。");
        }

        setJapaneseResult({
          originalText,
          translatedText,
        });

        return;
      }

      const detectedLanguage: DetectedLanguage = {
        code: String(
          transcribeData?.detectedLanguage?.code ?? "unknown"
        ),
        key: String(
          transcribeData?.detectedLanguage?.key ?? "unknown"
        ),
        label: String(
          transcribeData?.detectedLanguage?.label ?? "不明な言語"
        ),
      };

      let translationLanguage = language;

      if (isTargetLanguage(detectedLanguage.key)) {
        translationLanguage = detectedLanguage.key;

        if (detectedLanguage.key !== language) {
          setLanguage(detectedLanguage.key);

          setAutoChangedMessage(
            `相手の言葉を${detectedLanguage.label}と判定し、翻訳先を自動で変更しました。`
          );
        }
      }

      const translateResponse = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: originalText,
          direction: "foreign-to-japanese",
          language: translationLanguage,
          tone: "standard",
        }),
      });

      const translateData = await translateResponse.json();

      if (!translateResponse.ok) {
        throw new Error(
          translateData?.error || "翻訳に失敗しました。"
        );
      }

      const translatedText = String(
        translateData?.translatedText ?? ""
      ).trim();

      if (!translatedText) {
        throw new Error("翻訳結果を取得できませんでした。");
      }

      setForeignResult({
        originalText,
        translatedText,
        detectedLanguage,
      });
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "音声の処理に失敗しました。"
      );
    } finally {
      setProcessingSide(null);
    }
  }

  async function playJapaneseTranslation() {
    if (!japaneseResult?.translatedText || speaking) return;

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
          text: japaneseResult.translatedText,
          language,
          style:
            tone === "polite"
              ? "careful"
              : tone === "friendly"
              ? "casual"
              : "natural",
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

  function handlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    side: SpeakerSide
  ) {
    event.preventDefault();

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 非対応ブラウザでは何もしない
    }

    void startRecording(side);
  }

  function handlePointerUp(
    event: ReactPointerEvent<HTMLButtonElement>,
    side: SpeakerSide
  ) {
    event.preventDefault();

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // 解除済みの場合は何もしない
    }

    stopRecording(side);
  }

  function handlePointerCancel(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    cancelRecording();
  }

  const busy = recordingSide !== null || processingSide !== null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(33,62,110,0.24), transparent 28%), #05070d",
        color: "#f5f7ff",
        padding: "16px 12px 40px",
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#8fa7cc",
                fontWeight: 800,
                letterSpacing: "0.12em",
              }}
            >
              ことばパスポート
            </p>

            <h1
              style={{
                margin: "7px 0 4px",
                fontSize: "30px",
                color: "#ffffff",
              }}
            >
              音声で対面通訳
            </h1>

            <p
              style={{
                margin: 0,
                color: "#aab8cf",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              大きなボタンを押して話し、離すと自動で翻訳します。
            </p>
          </div>

          <Link
            href="/"
            style={{
              color: "#a9c9ff",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            ← 文字翻訳
          </Link>
        </header>

        <section
          style={{
            background: "rgba(13,17,26,0.94)",
            border: "1px solid #1c2538",
            borderRadius: "20px",
            padding: "14px",
            marginBottom: "12px",
          }}
        >
          <h2
            style={{
              margin: "0 0 10px",
              fontSize: "14px",
              color: "#ffffff",
            }}
          >
            こちらから話す言語
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "7px",
            }}
          >
            {LANGUAGES.map((item) => {
              const active = item.key === language;

              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    stopAudio();
                    setLanguage(item.key);
                    setJapaneseResult(null);
                    setAutoChangedMessage("");
                  }}
                  style={{
                    minHeight: "64px",
                    padding: "8px 4px",
                    background: active ? "#7db3ff" : "#0b111d",
                    color: active ? "#07101d" : "#e4ebf7",
                    border: active
                      ? "1px solid #7db3ff"
                      : "1px solid #22304a",
                    borderRadius: "13px",
                    fontFamily: "inherit",
                    cursor: busy ? "default" : "pointer",
                    opacity: busy && !active ? 0.55 : 1,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "20px",
                    }}
                  >
                    {item.flag}
                  </span>

                  <span
                    style={{
                      display: "block",
                      marginTop: "3px",
                      fontSize: "12px",
                      fontWeight: 900,
                    }}
                  >
                    {item.label}
                  </span>

                  <span
                    style={{
                      display: "block",
                      marginTop: "2px",
                      fontSize: "10px",
                      opacity: 0.75,
                    }}
                  >
                    {item.nativeLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <p
            style={{
              margin: "10px 0 0",
              color: "#8fa7cc",
              fontSize: "11px",
              lineHeight: 1.6,
            }}
          >
            相手の言語を検知すると、この選択も自動で切り替わります。
          </p>
        </section>

        <section
          style={{
            background: "rgba(13,17,26,0.94)",
            border: "1px solid #1c2538",
            borderRadius: "20px",
            padding: "14px",
            marginBottom: "12px",
          }}
        >
          <h2
            style={{
              margin: "0 0 10px",
              fontSize: "14px",
              color: "#ffffff",
            }}
          >
            こちらから話すときの話し方
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "7px",
            }}
          >
            {TONES.map((item) => {
              const active = item.key === tone;

              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    stopAudio();
                    setTone(item.key);
                    setJapaneseResult(null);
                  }}
                  style={{
                    minHeight: "50px",
                    padding: "8px 5px",
                    background: active ? "#172b47" : "#0b111d",
                    color: active ? "#a9d0ff" : "#e4ebf7",
                    border: active
                      ? "1px solid #7db3ff"
                      : "1px solid #22304a",
                    borderRadius: "12px",
                    fontFamily: "inherit",
                    fontSize: "12px",
                    fontWeight: 900,
                    cursor: busy ? "default" : "pointer",
                    opacity: busy && !active ? 0.55 : 1,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <p
            style={{
              margin: "9px 0 0",
              color: "#8fa7cc",
              fontSize: "11px",
              lineHeight: 1.5,
            }}
          >
            {currentTone.description}
          </p>
        </section>

        {autoChangedMessage && (
          <div
            style={{
              marginBottom: "12px",
              padding: "12px 14px",
              borderRadius: "14px",
              border: "1px solid #356847",
              background: "rgba(47,110,70,0.24)",
              color: "#c8f3d6",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            {autoChangedMessage}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              marginBottom: "12px",
              padding: "12px 14px",
              borderRadius: "14px",
              border: "1px solid #7f3244",
              background: "rgba(102,25,45,0.3)",
              color: "#ffdbe3",
              fontSize: "13px",
              lineHeight: 1.6,
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
          <h2
            style={{
              margin: "0 0 5px",
              fontSize: "21px",
              color: "#ffffff",
            }}
          >
            🇯🇵 こちらが日本語で話す
          </h2>

          <p
            style={{
              margin: "0 0 14px",
              color: "#aab8cf",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            日本語を{currentLanguage.label}へ翻訳します。
          </p>

          <button
            type="button"
            disabled={busy && recordingSide !== "japanese"}
            onPointerDown={(event) =>
              handlePointerDown(event, "japanese")
            }
            onPointerUp={(event) =>
              handlePointerUp(event, "japanese")
            }
            onPointerCancel={handlePointerCancel}
            onContextMenu={(event) => event.preventDefault()}
            style={{
              width: "100%",
              minHeight: "142px",
              border:
                recordingSide === "japanese"
                  ? "2px solid #ff839b"
                  : "2px solid #7db3ff",
              borderRadius: "24px",
              background:
                recordingSide === "japanese"
                  ? "linear-gradient(180deg, #b43b59, #7d263e)"
                  : processingSide === "japanese"
                  ? "#31476b"
                  : "linear-gradient(180deg, #8bc0ff, #679ee8)",
              color: "#06101d",
              fontFamily: "inherit",
              fontSize: "20px",
              fontWeight: 900,
              cursor: busy ? "default" : "pointer",
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
              whiteSpace: "pre-line",
              opacity:
                busy &&
                recordingSide !== "japanese" &&
                processingSide !== "japanese"
                  ? 0.55
                  : 1,
            }}
          >
            {recordingSide === "japanese"
              ? "🔴 録音中\n離すと翻訳"
              : processingSide === "japanese"
              ? "読み取り・翻訳中..."
              : "🎤 押して日本語で話す"}
          </button>

          <div
            style={{
              display: "grid",
              gap: "10px",
              marginTop: "14px",
            }}
          >
            <div
              style={{
                background: "#0b111d",
                border: "1px solid #22304a",
                borderRadius: "15px",
                padding: "14px",
                minHeight: "70px",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#8fa7cc",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                読み取った日本語
              </p>

              <p
                style={{
                  margin: 0,
                  color: japaneseResult ? "#f5f7ff" : "#66758d",
                  fontSize: "16px",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {japaneseResult?.originalText ??
                  "読み取った文章がここに表示されます。"}
              </p>
            </div>

            <div
              style={{
                background: "#0b111d",
                border: "1px solid #22304a",
                borderRadius: "15px",
                padding: "14px",
                minHeight: "100px",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#8fa7cc",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                {currentLanguage.flag} {currentLanguage.label}への翻訳
              </p>

              <p
                style={{
                  margin: 0,
                  color: japaneseResult ? "#ffffff" : "#66758d",
                  fontSize: "24px",
                  fontWeight: 800,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {japaneseResult?.translatedText ??
                  "翻訳結果がここに表示されます。"}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!japaneseResult?.translatedText || busy}
            onClick={() => void playJapaneseTranslation()}
            style={{
              width: "100%",
              minHeight: "62px",
              marginTop: "12px",
              background:
                japaneseResult?.translatedText && !busy
                  ? "#7db3ff"
                  : "#334155",
              color:
                japaneseResult?.translatedText && !busy
                  ? "#07101d"
                  : "#8794a8",
              border: "none",
              borderRadius: "16px",
              padding: "14px",
              fontFamily: "inherit",
              fontSize: "16px",
              fontWeight: 900,
              cursor:
                japaneseResult?.translatedText && !busy
                  ? "pointer"
                  : "default",
            }}
          >
            {speaking
              ? "再生中..."
              : `▶ ${currentLanguage.label}で相手に聞かせる`}
          </button>
        </section>

        <section
          style={{
            background: "rgba(13,17,26,0.94)",
            border: "1px solid #1c2538",
            borderRadius: "22px",
            padding: "16px",
          }}
        >
          <h2
            style={{
              margin: "0 0 5px",
              fontSize: "21px",
              color: "#ffffff",
            }}
          >
            🌍 相手に話してもらう
          </h2>

          <p
            style={{
              margin: "0 0 14px",
              color: "#aab8cf",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            相手の言語を自動で判定し、日本語へ翻訳します。
          </p>

          <button
            type="button"
            disabled={busy && recordingSide !== "foreign"}
            onPointerDown={(event) =>
              handlePointerDown(event, "foreign")
            }
            onPointerUp={(event) =>
              handlePointerUp(event, "foreign")
            }
            onPointerCancel={handlePointerCancel}
            onContextMenu={(event) => event.preventDefault()}
            style={{
              width: "100%",
              minHeight: "142px",
              border:
                recordingSide === "foreign"
                  ? "2px solid #ff839b"
                  : "2px solid #8fcaaa",
              borderRadius: "24px",
              background:
                recordingSide === "foreign"
                  ? "linear-gradient(180deg, #b43b59, #7d263e)"
                  : processingSide === "foreign"
                  ? "#365644"
                  : "linear-gradient(180deg, #a8dfbd, #76b893)",
              color: "#06120c",
              fontFamily: "inherit",
              fontSize: "20px",
              fontWeight: 900,
              cursor: busy ? "default" : "pointer",
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
              whiteSpace: "pre-line",
              opacity:
                busy &&
                recordingSide !== "foreign" &&
                processingSide !== "foreign"
                  ? 0.55
                  : 1,
            }}
          >
            {recordingSide === "foreign"
              ? "🔴 録音中\n離すと翻訳"
              : processingSide === "foreign"
              ? "言語判定・翻訳中..."
              : "🎤 押して相手に話してもらう"}
          </button>

          <div
            style={{
              display: "grid",
              gap: "10px",
              marginTop: "14px",
            }}
          >
            <div
              style={{
                background: "#0b111d",
                border: "1px solid #22304a",
                borderRadius: "15px",
                padding: "14px",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#8fa7cc",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                検知した言語
              </p>

              <p
                style={{
                  margin: 0,
                  color: foreignResult ? "#ffffff" : "#66758d",
                  fontSize: "18px",
                  fontWeight: 800,
                  lineHeight: 1.5,
                }}
              >
                {foreignResult?.detectedLanguage?.label ??
                  "相手が話すと言語を自動で判定します。"}
              </p>
            </div>

            <div
              style={{
                background: "#0b111d",
                border: "1px solid #22304a",
                borderRadius: "15px",
                padding: "14px",
                minHeight: "70px",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#8fa7cc",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                読み取った相手の言葉
              </p>

              <p
                style={{
                  margin: 0,
                  color: foreignResult ? "#f5f7ff" : "#66758d",
                  fontSize: "16px",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {foreignResult?.originalText ??
                  "読み取った文章がここに表示されます。"}
              </p>
            </div>

            <div
              style={{
                background: "#0b111d",
                border: "1px solid #22304a",
                borderRadius: "15px",
                padding: "14px",
                minHeight: "100px",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#8fa7cc",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                🇯🇵 日本語への翻訳
              </p>

              <p
                style={{
                  margin: 0,
                  color: foreignResult ? "#ffffff" : "#66758d",
                  fontSize: "24px",
                  fontWeight: 800,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {foreignResult?.translatedText ??
                  "日本語の翻訳結果がここに表示されます。"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}