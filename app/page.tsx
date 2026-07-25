"use client";

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
type VoiceGender = "female" | "male";
type SpeakerSide = "japanese" | "foreign";

type DetectedLanguage = {
  code: string;
  key: string;
  label: string;
};

type ForeignResult = {
  originalText: string;
  translatedText: string;
  detectedLanguage: DetectedLanguage;
};

const LANGUAGES: {
  key: TargetLanguage;
  label: string;
}[] = [
  {
    key: "english",
    label: "英語",
  },
  {
    key: "korean",
    label: "韓国語",
  },
  {
    key: "chinese",
    label: "中国語",
  },
  {
    key: "german",
    label: "ドイツ語",
  },
  {
    key: "french",
    label: "フランス語",
  },
  {
    key: "italian",
    label: "イタリア語",
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

function getLanguageColors(language: TargetLanguage) {
  switch (language) {
    case "english":
      return {
        background: "linear-gradient(180deg, #78b7ff, #4f8fe8)",
        border: "#8fc4ff",
        color: "#07111f",
        shadow: "0 8px 20px rgba(79,143,232,0.24)",
      };

    case "korean":
      return {
        background: "linear-gradient(180deg, #ff91bc, #e85d93)",
        border: "#ffafd0",
        color: "#260713",
        shadow: "0 8px 20px rgba(232,93,147,0.24)",
      };

    case "chinese":
      return {
        background: "linear-gradient(180deg, #ff9b73, #e76545)",
        border: "#ffb092",
        color: "#270a04",
        shadow: "0 8px 20px rgba(231,101,69,0.24)",
      };

    case "german":
      return {
        background: "linear-gradient(180deg, #ffd66f, #e7aa35)",
        border: "#ffe39a",
        color: "#241600",
        shadow: "0 8px 20px rgba(231,170,53,0.24)",
      };

    case "french":
      return {
        background: "linear-gradient(180deg, #9d8dff, #6f62df)",
        border: "#b9aeff",
        color: "#100b2c",
        shadow: "0 8px 20px rgba(111,98,223,0.24)",
      };

    case "italian":
      return {
        background: "linear-gradient(180deg, #8fe0b1, #58b77d)",
        border: "#a8ebc4",
        color: "#061b0e",
        shadow: "0 8px 20px rgba(88,183,125,0.24)",
      };
  }
}

function getToneColors(tone: TranslationTone) {
  switch (tone) {
    case "standard":
      return {
        background: "linear-gradient(180deg, #7fb8ff, #5b91de)",
        border: "#9ac8ff",
        color: "#07111f",
      };

    case "polite":
      return {
        background: "linear-gradient(180deg, #b39bff, #806bdd)",
        border: "#c9bbff",
        color: "#130b2d",
      };

    case "friendly":
      return {
        background: "linear-gradient(180deg, #ffad7b, #e77b4c)",
        border: "#ffc29d",
        color: "#281006",
      };
  }
}

function getVoiceColors(voiceGender: VoiceGender) {
  if (voiceGender === "female") {
    return {
      background: "linear-gradient(180deg, #ff9fc5, #df6598)",
      border: "#ffb8d5",
      color: "#270814",
    };
  }

  return {
    background: "linear-gradient(180deg, #79c7d8, #4297ad)",
    border: "#9bdae6",
    color: "#05191f",
  };
}

export default function HomePage() {
  const [language, setLanguage] =
    useState<TargetLanguage>("english");

  const [tone, setTone] =
    useState<TranslationTone>("standard");

  const [voiceGender, setVoiceGender] =
    useState<VoiceGender>("female");

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [japaneseText, setJapaneseText] = useState("");
  const [translatedText, setTranslatedText] = useState("");

  const [foreignResult, setForeignResult] =
    useState<ForeignResult | null>(null);

  const [recordingSide, setRecordingSide] =
    useState<SpeakerSide | null>(null);

  const [processingSide, setProcessingSide] =
    useState<SpeakerSide | null>(null);

  const [translatingJapanese, setTranslatingJapanese] =
    useState(false);

  const [speaking, setSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoChangedMessage, setAutoChangedMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingSideRef = useRef<SpeakerSide | null>(null);

  const translateAbortRef = useRef<AbortController | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const currentLanguage =
    LANGUAGES.find((item) => item.key === language) ?? LANGUAGES[0];

  const currentTone =
    TONES.find((item) => item.key === tone) ?? TONES[0];

  const busy =
    recordingSide !== null ||
    processingSide !== null ||
    translatingJapanese;

  useEffect(() => {
    const text = japaneseText.trim();

    translateAbortRef.current?.abort();

    if (!text) {
      setTranslatedText("");
      setTranslatingJapanese(false);
      return;
    }

    const controller = new AbortController();
    translateAbortRef.current = controller;

    const timer = window.setTimeout(async () => {
      setTranslatingJapanese(true);
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

        const nextTranslatedText = String(
          data?.translatedText ?? ""
        ).trim();

        if (!nextTranslatedText) {
          throw new Error("翻訳結果を取得できませんでした。");
        }

        setTranslatedText(nextTranslatedText);
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
          setTranslatingJapanese(false);
        }
      }
    }, 800);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [japaneseText, language, tone]);

  useEffect(() => {
    return () => {
      translateAbortRef.current?.abort();
      stopMediaStream();
      stopAudio();
    };
  }, []);

  function stopMediaStream() {
    mediaStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    mediaStreamRef.current = null;
  }

  function stopAudio() {
    const audio = audioRef.current;

    if (audio) {
      /*
        srcを空にした際の不要なerrorイベントを防ぐため、
        先にイベントを解除する。
      */
      audio.onended = null;
      audio.onerror = null;

      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setSpeaking(false);
  }

  function clearJapaneseText() {
    translateAbortRef.current?.abort();
    stopAudio();

    setJapaneseText("");
    setTranslatedText("");
    setErrorMessage("");
    setTranslatingJapanese(false);
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
      setErrorMessage(
        "このブラウザでは音声録音を利用できません。"
      );
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
          transcribeData?.error ||
            "音声を読み取れませんでした。"
        );
      }

      const originalText = String(
        transcribeData?.text ?? ""
      ).trim();

      if (!originalText) {
        throw new Error("音声を聞き取れませんでした。");
      }

      if (side === "japanese") {
        setJapaneseText(originalText);
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
          transcribeData?.detectedLanguage?.label ??
            "不明な言語"
        ),
      };

      let translationLanguage = language;

      if (isTargetLanguage(detectedLanguage.key)) {
        translationLanguage = detectedLanguage.key;

        if (detectedLanguage.key !== language) {
          setLanguage(detectedLanguage.key);

          setAutoChangedMessage(
            `相手の言葉を${detectedLanguage.label}と判定し、こちらから話す言語も自動で変更しました。`
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

      const nextTranslatedText = String(
        translateData?.translatedText ?? ""
      ).trim();

      if (!nextTranslatedText) {
        throw new Error("翻訳結果を取得できませんでした。");
      }

      setForeignResult({
        originalText,
        translatedText: nextTranslatedText,
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
          language,
          voiceGender,
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
      // 非対応ブラウザではそのまま続行
    }

    void startRecording(side);
  }

  function handlePointerUp(
    event: ReactPointerEvent<HTMLButtonElement>,
    side: SpeakerSide
  ) {
    event.preventDefault();

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
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

  return (
    <>
      <style jsx global>{`
        button {
          -webkit-tap-highlight-color: transparent;
          transition:
            transform 90ms ease,
            filter 90ms ease,
            box-shadow 140ms ease,
            background 140ms ease,
            border-color 140ms ease;
        }

        button:not(:disabled):active {
          transform: translateY(2px) scale(0.97);
          filter: brightness(0.88);
        }

        button:disabled {
          cursor: default;
        }
      `}</style>

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
            marginBottom: "16px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "#8fa7cc",
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            ことばパスポート
          </p>

          <h1
            style={{
              margin: "7px 0 5px",
              fontSize: "30px",
              color: "#ffffff",
            }}
          >
            世界旅行の翻訳
          </h1>

          <p
            style={{
              margin: 0,
              color: "#aab8cf",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            日本語を話すか入力すると、相手の言葉へ翻訳します。
          </p>
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
              fontSize: "15px",
              color: "#ffffff",
            }}
          >
            翻訳する言語
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {LANGUAGES.map((item) => {
              const active = item.key === language;
              const activeColors = getLanguageColors(item.key);

              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={recordingSide !== null}
                  onClick={() => {
                    stopAudio();
                    setLanguage(item.key);
                    setAutoChangedMessage("");
                  }}
                  style={{
                    minHeight: "62px",
                    padding: "8px 4px",
                    background: active
                      ? activeColors.background
                      : "#0b111d",
                    color: active
                      ? activeColors.color
                      : "#e4ebf7",
                    border: active
                      ? `1px solid ${activeColors.border}`
                      : "1px solid #22304a",
                    borderRadius: "13px",
                    boxShadow: active
                      ? activeColors.shadow
                      : "none",
                    fontFamily: "inherit",
                    cursor:
                      recordingSide !== null
                        ? "default"
                        : "pointer",
                    fontSize: "17px",
                    fontWeight: 900,
                    opacity:
                      recordingSide !== null && !active
                        ? 0.55
                        : 1,
                  }}
                >
                  {item.label}
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
            相手の言語を検知すると、自動で切り替わります。
          </p>

          <button
            type="button"
            aria-expanded={settingsOpen}
            disabled={recordingSide !== null}
            onClick={() => setSettingsOpen((current) => !current)}
            style={{
              width: "100%",
              minHeight: "54px",
              marginTop: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "10px 13px",
              background: settingsOpen
                ? "rgba(37,51,77,0.9)"
                : "#0b111d",
              color: "#f2f5fb",
              border: settingsOpen
                ? "1px solid #556b91"
                : "1px solid #25334d",
              borderRadius: "14px",
              fontFamily: "inherit",
              cursor:
                recordingSide !== null
                  ? "default"
                  : "pointer",
              textAlign: "left",
            }}
          >
            <span>
              <span
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "#8fa7cc",
                  fontWeight: 800,
                }}
              >
                音声設定
              </span>

              <span
                style={{
                  display: "block",
                  marginTop: "3px",
                  fontSize: "14px",
                  fontWeight: 900,
                }}
              >
                {currentTone.label} ・{" "}
                {voiceGender === "female" ? "女性" : "男性"}
              </span>
            </span>

            <span
              aria-hidden="true"
              style={{
                fontSize: "18px",
                color: "#a9bad4",
                transform: settingsOpen
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 160ms ease",
              }}
            >
              ▼
            </span>
          </button>

          {settingsOpen && (
            <div
              style={{
                marginTop: "10px",
                padding: "12px",
                background: "#080d17",
                border: "1px solid #202d44",
                borderRadius: "15px",
              }}
            >
              <p
                style={{
                  margin: "0 0 8px",
                  color: "#dbe5f4",
                  fontSize: "13px",
                  fontWeight: 900,
                }}
              >
                話し方
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "8px",
                }}
              >
                {TONES.map((item) => {
                  const active = item.key === tone;
                  const activeColors = getToneColors(item.key);

                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={recordingSide !== null}
                      onClick={() => {
                        stopAudio();
                        setTone(item.key);
                      }}
                      style={{
                        minHeight: "52px",
                        padding: "8px 5px",
                        background: active
                          ? activeColors.background
                          : "#0d1421",
                        color: active
                          ? activeColors.color
                          : "#e4ebf7",
                        border: active
                          ? `1px solid ${activeColors.border}`
                          : "1px solid #263550",
                        borderRadius: "12px",
                        fontFamily: "inherit",
                        fontSize: "13px",
                        fontWeight: 900,
                        cursor:
                          recordingSide !== null
                            ? "default"
                            : "pointer",
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <p
                style={{
                  margin: "8px 0 14px",
                  color: "#8fa7cc",
                  fontSize: "11px",
                  lineHeight: 1.5,
                }}
              >
                {currentTone.description}
              </p>

              <p
                style={{
                  margin: "0 0 8px",
                  color: "#dbe5f4",
                  fontSize: "13px",
                  fontWeight: 900,
                }}
              >
                再生する音声
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                {(["female", "male"] as VoiceGender[]).map(
                  (item) => {
                    const active = item === voiceGender;
                    const activeColors = getVoiceColors(item);

                    return (
                      <button
                        key={item}
                        type="button"
                        disabled={recordingSide !== null}
                        onClick={() => {
                          stopAudio();
                          setVoiceGender(item);
                        }}
                        style={{
                          minHeight: "54px",
                          padding: "9px",
                          background: active
                            ? activeColors.background
                            : "#0d1421",
                          color: active
                            ? activeColors.color
                            : "#e4ebf7",
                          border: active
                            ? `1px solid ${activeColors.border}`
                            : "1px solid #263550",
                          borderRadius: "12px",
                          fontFamily: "inherit",
                          fontSize: "15px",
                          fontWeight: 900,
                          cursor:
                            recordingSide !== null
                              ? "default"
                              : "pointer",
                        }}
                      >
                        {item === "female" ? "女性" : "男性"}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}
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
              fontSize: "22px",
              color: "#ffffff",
            }}
          >
            こちらから伝える
          </h2>

          <p
            style={{
              margin: "0 0 14px",
              color: "#aab8cf",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            日本語で話すか、文字を入力してください。
          </p>

          <button
            type="button"
            disabled={
              busy && recordingSide !== "japanese"
            }
            onPointerDown={(event) =>
              handlePointerDown(event, "japanese")
            }
            onPointerUp={(event) =>
              handlePointerUp(event, "japanese")
            }
            onPointerCancel={handlePointerCancel}
            onContextMenu={(event) =>
              event.preventDefault()
            }
            style={{
              width: "100%",
              minHeight: "132px",
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
              boxShadow:
                recordingSide === "japanese"
                  ? "0 0 0 4px rgba(255,94,126,0.24), 0 0 28px rgba(255,72,112,0.78)"
                  : "none",
            }}
          >
            {recordingSide === "japanese"
              ? "🔴 録音中\n離すと読み取ります"
              : processingSide === "japanese"
              ? "日本語を読み取り中..."
              : "🎤 押して日本語で話す"}
          </button>

          <div
            style={{
              marginTop: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <label
                htmlFor="japanese-input"
                style={{
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 800,
                }}
              >
                日本語を入力・修正
              </label>

              {japaneseText && (
                <button
                  type="button"
                  onClick={clearJapaneseText}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#9eb2d0",
                    padding: "4px",
                    fontFamily: "inherit",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  全部消す
                </button>
              )}
            </div>

            <textarea
              id="japanese-input"
              value={japaneseText}
              onChange={(event) =>
                setJapaneseText(event.target.value)
              }
              placeholder="例：中央駅までお願いします。"
              rows={4}
              style={{
                width: "100%",
                minHeight: "112px",
                boxSizing: "border-box",
                resize: "vertical",
                background: "#070b14",
                color: "#f5f7ff",
                border: "1px solid #24304a",
                borderRadius: "15px",
                padding: "14px",
                outline: "none",
                fontFamily: "inherit",
                fontSize: "17px",
                lineHeight: 1.7,
              }}
            />

            <p
              style={{
                margin: "8px 0 0",
                color: "#7f8da5",
                fontSize: "11px",
                lineHeight: 1.6,
              }}
            >
              入力や修正が止まってから約0.8秒後に自動翻訳します。
            </p>
          </div>

          <div
            style={{
              marginTop: "12px",
              background: "#0b111d",
              border: "1px solid #22304a",
              borderRadius: "15px",
              padding: "14px",
              minHeight: "110px",
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
              {currentLanguage.label}への翻訳
            </p>

            {translatingJapanese ? (
              <p
                style={{
                  margin: 0,
                  color: "#91a1bb",
                  fontSize: "15px",
                  lineHeight: 1.6,
                }}
              >
                翻訳しています...
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  color: translatedText
                    ? "#ffffff"
                    : "#66758d",
                  fontSize: "24px",
                  fontWeight: 800,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {translatedText ||
                  "翻訳結果がここに表示されます。"}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={
              !translatedText ||
              translatingJapanese ||
              recordingSide !== null ||
              processingSide !== null
            }
            onClick={() => void playTranslation()}
            style={{
              width: "100%",
              minHeight: "62px",
              marginTop: "12px",
              background:
                translatedText &&
                !translatingJapanese &&
                recordingSide === null &&
                processingSide === null
                  ? "#7db3ff"
                  : "#334155",
              color:
                translatedText &&
                !translatingJapanese &&
                recordingSide === null &&
                processingSide === null
                  ? "#07101d"
                  : "#8794a8",
              border: "none",
              borderRadius: "16px",
              padding: "14px",
              fontFamily: "inherit",
              fontSize: "17px",
              fontWeight: 900,
              cursor:
                translatedText &&
                !translatingJapanese &&
                recordingSide === null &&
                processingSide === null
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
              fontSize: "22px",
              color: "#ffffff",
            }}
          >
            相手の言葉を聞く
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
            disabled={
              busy && recordingSide !== "foreign"
            }
            onPointerDown={(event) =>
              handlePointerDown(event, "foreign")
            }
            onPointerUp={(event) =>
              handlePointerUp(event, "foreign")
            }
            onPointerCancel={handlePointerCancel}
            onContextMenu={(event) =>
              event.preventDefault()
            }
            style={{
              width: "100%",
              minHeight: "132px",
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
              boxShadow:
                recordingSide === "foreign"
                  ? "0 0 0 4px rgba(255,94,126,0.24), 0 0 28px rgba(255,72,112,0.78)"
                  : "none",
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
                  color: foreignResult
                    ? "#ffffff"
                    : "#66758d",
                  fontSize: "20px",
                  fontWeight: 800,
                  lineHeight: 1.5,
                }}
              >
                {foreignResult?.detectedLanguage.label ??
                  "相手が話すと言語を自動で判定します。"}
              </p>
            </div>

            <div
              style={{
                background: "#0b111d",
                border: "1px solid #22304a",
                borderRadius: "15px",
                padding: "14px",
                minHeight: "76px",
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
                  color: foreignResult
                    ? "#f5f7ff"
                    : "#66758d",
                  fontSize: "17px",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
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
                minHeight: "110px",
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
                日本語への翻訳
              </p>

              <p
                style={{
                  margin: 0,
                  color: foreignResult
                    ? "#ffffff"
                    : "#66758d",
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
    </>
  );
}