"use client";

import {
  ChangeEvent as ReactChangeEvent,
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

type ImageTranslationBlock = {
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
  blocks: ImageTranslationBlock[];
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


function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    image.src = url;
  });
}

function splitTextToLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const characters = Array.from(text);
  const lines: string[] = [];
  let currentLine = "";

  for (const character of characters) {
    if (character === "\n") {
      if (currentLine) lines.push(currentLine);
      currentLine = "";
      continue;
    }

    const nextLine = `${currentLine}${character}`;

    if (
      currentLine &&
      context.measureText(nextLine).width > maxWidth
    ) {
      lines.push(currentLine);
      currentLine = character;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

async function prepareImageForUpload(
  sourceUrl: string,
  originalName: string
) {
  const image = await loadImage(sourceUrl);
  const maxDimension = 2048;
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
  );

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("画像を変換できませんでした。");
  }

  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.88);
  });

  if (!blob) {
    throw new Error("画像をJPEGへ変換できませんでした。");
  }

  const baseName =
    originalName.replace(/\.[^/.]+$/, "").trim() || "photo";

  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
  });
}

function drawTranslatedBlock(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  block: ImageTranslationBlock
) {
  const x = block.x * canvasWidth;
  const y = block.y * canvasHeight;
  const width = block.width * canvasWidth;
  const height = block.height * canvasHeight;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const padding = Math.max(3, Math.min(width, height) * 0.06);
  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);

  context.save();
  context.translate(centerX, centerY);
  context.rotate((block.rotation * Math.PI) / 180);

  context.fillStyle = block.estimatedBackgroundColor || "#FFFFFF";
  context.fillRect(-width / 2, -height / 2, width, height);

  let fontSize = Math.max(10, Math.min(height * 0.72, width * 0.28));
  let lines: string[] = [];
  let lineHeight = 0;

  while (fontSize >= 8) {
    context.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif`;
    lines = splitTextToLines(
      context,
      block.translatedText,
      innerWidth
    );
    lineHeight = fontSize * 1.16;

    if (lines.length * lineHeight <= innerHeight) {
      break;
    }

    fontSize -= 1;
  }

  context.fillStyle = block.textColor || "#111111";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const firstLineY =
    -((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    context.fillText(
      line,
      0,
      firstLineY + index * lineHeight,
      innerWidth
    );
  });

  context.restore();
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

  const [pressedSide, setPressedSide] =
    useState<SpeakerSide | null>(null);

  const [processingSide, setProcessingSide] =
    useState<SpeakerSide | null>(null);

  const [translatingJapanese, setTranslatingJapanese] =
    useState(false);

  const [speaking, setSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoChangedMessage, setAutoChangedMessage] = useState("");

  const [selectedImageName, setSelectedImageName] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [selectedImageFile, setSelectedImageFile] =
    useState<File | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageTranslationResult, setImageTranslationResult] =
    useState<ImageTranslationResult | null>(null);
  const [translatedImageUrl, setTranslatedImageUrl] = useState("");
  const [imageView, setImageView] =
    useState<"original" | "translated">("original");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingSideRef = useRef<SpeakerSide | null>(null);
  const holdingSideRef = useRef<SpeakerSide | null>(null);

  const translateAbortRef = useRef<AbortController | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const selectedImageUrlRef = useRef<string | null>(null);
  const translatedImageUrlRef = useRef<string | null>(null);

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
    /*
      iPhoneのSafari／ホーム画面アプリでは、ボタン外で指を離すと
      onPointerUpが届かない場合があるため、画面全体でも終了を監視する。
    */
    const release = () => {
      if (
        holdingSideRef.current ||
        recordingSideRef.current
      ) {
        finishPress();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        release();
      }
    };

    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("touchend", release);
    window.addEventListener("touchcancel", release);
    window.addEventListener("blur", release);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("touchend", release);
      window.removeEventListener("touchcancel", release);
      window.removeEventListener("blur", release);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      translateAbortRef.current?.abort();
      stopMediaStream();
      stopAudio();

      if (selectedImageUrlRef.current) {
        URL.revokeObjectURL(selectedImageUrlRef.current);
      }

      if (translatedImageUrlRef.current) {
        URL.revokeObjectURL(translatedImageUrlRef.current);
      }
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

  function openImagePicker() {
    imageInputRef.current?.click();
  }

  function handleImageChange(
    event: ReactChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("画像ファイルを選択してください。");
      event.target.value = "";
      return;
    }

    if (selectedImageUrlRef.current) {
      URL.revokeObjectURL(selectedImageUrlRef.current);
    }

    const nextImageUrl = URL.createObjectURL(file);

    selectedImageUrlRef.current = nextImageUrl;
    setSelectedImageUrl(nextImageUrl);
    setSelectedImageName(file.name);
    setSelectedImageFile(file);
    setImageTranslationResult(null);
    setImageView("original");

    if (translatedImageUrlRef.current) {
      URL.revokeObjectURL(translatedImageUrlRef.current);
      translatedImageUrlRef.current = null;
    }

    setTranslatedImageUrl("");
    setErrorMessage("");

    event.target.value = "";
  }

  async function createTranslatedImage(
    sourceUrl: string,
    blocks: ImageTranslationBlock[]
  ) {
    const image = await loadImage(sourceUrl);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("画像編集を開始できませんでした。");
    }

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const block of blocks) {
      drawTranslatedBlock(
        context,
        canvas.width,
        canvas.height,
        block
      );
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.94);
    });

    if (!blob) {
      throw new Error("日本語化画像を作成できませんでした。");
    }

    if (translatedImageUrlRef.current) {
      URL.revokeObjectURL(translatedImageUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(blob);
    translatedImageUrlRef.current = nextUrl;
    setTranslatedImageUrl(nextUrl);
    setImageView("translated");
  }

  async function saveTranslatedImage() {
    if (!translatedImageUrl) return;

    setErrorMessage("");

    try {
      const response = await fetch(translatedImageUrl);

      if (!response.ok) {
        throw new Error("保存用画像を準備できませんでした。");
      }

      const blob = await response.blob();
      const baseName =
        selectedImageName.replace(/\.[^/.]+$/, "").trim() ||
        "translated-image";
      const fileName = `${baseName}-日本語化.jpg`;
      const file = new File([blob], fileName, {
        type: "image/jpeg",
      });

      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: "日本語化画像",
        });
        return;
      }

      const link = document.createElement("a");
      link.href = translatedImageUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
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
          : "画像を保存できませんでした。"
      );
    }
  }

  async function analyzeSelectedImage() {
    if (!selectedImageFile || analyzingImage) return;

    setAnalyzingImage(true);
    setImageTranslationResult(null);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("image", selectedImageFile);

      const response = await fetch("/api/image-translate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "画像の解析に失敗しました。"
        );
      }

      const blocks = Array.isArray(data?.blocks)
        ? data.blocks
        : [];

      const result: ImageTranslationResult = {
        detectedLanguage: {
          code: String(
            data?.detectedLanguage?.code ?? "unknown"
          ),
          label: String(
            data?.detectedLanguage?.label ?? "不明な言語"
          ),
        },
        blocks,
      };

      setImageTranslationResult(result);

      if (blocks.length > 0 && selectedImageUrl) {
        await createTranslatedImage(selectedImageUrl, blocks);
      } else {
        setImageView("original");
      }
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "画像の解析に失敗しました。"
      );
    } finally {
      setAnalyzingImage(false);
    }
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

      if (holdingSideRef.current !== side) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

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

      setPressedSide(null);
      holdingSideRef.current = null;
      setErrorMessage(message);
    }
  }

  function stopRecording(side: SpeakerSide) {
    /*
      ボタン側とwindow側のpointerupが連続して発火する場合がある。
      recorder.stop()後、onstop完了前にrefを消すと録音データを
      読み取れなくなるため、停止処理は一度だけ実行する。
    */
    if (recordingSideRef.current !== side) return;

    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      setRecordingSide(null);
      recordingSideRef.current = null;
      stopMediaStream();
      return;
    }

    if (recorder.state === "inactive") {
      /*
        すでにstop()済み。onstopが録音データを処理するため、
        ここではrefや音声ストリームを消さない。
      */
      return;
    }

    recorder.stop();
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

  function finishPress(side?: SpeakerSide) {
    const activeSide =
      side ??
      holdingSideRef.current ??
      recordingSideRef.current;

    setPressedSide(null);
    holdingSideRef.current = null;

    if (activeSide) {
      stopRecording(activeSide);
    }
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    side: SpeakerSide
  ) {
    event.preventDefault();

    if (holdingSideRef.current || recordingSideRef.current) {
      return;
    }

    setPressedSide(side);
    holdingSideRef.current = side;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 非対応ブラウザではwindow側の監視で停止する
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

    finishPress(side);
  }

  function handlePointerCancel(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    finishPress();
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
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              border:
                (pressedSide === "japanese" || recordingSide === "japanese")
                  ? "2px solid #ff839b"
                  : "2px solid #7db3ff",
              borderRadius: "24px",
              background:
                (pressedSide === "japanese" || recordingSide === "japanese")
                  ? "linear-gradient(180deg, #d63f62, #8f203e)"
                  : processingSide === "japanese"
                  ? "#31476b"
                  : "linear-gradient(180deg, #8bc0ff, #679ee8)",
              color: "#06101d",
              fontFamily: "inherit",
              fontSize: "20px",
              fontWeight: 900,
              cursor: busy ? "default" : "pointer",
              WebkitTouchCallout: "none",
              whiteSpace: "pre-line",
              opacity:
                busy &&
                recordingSide !== "japanese" &&
                processingSide !== "japanese"
                  ? 0.55
                  : 1,
              boxShadow:
                (pressedSide === "japanese" || recordingSide === "japanese")
                  ? "0 0 0 5px rgba(255,94,126,0.32), 0 0 36px rgba(255,50,96,0.95)"
                  : "none",
            }}
          >
            {pressedSide === "japanese" || recordingSide === "japanese"
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
              : "▶ 翻訳を再生する"}
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
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              border:
                (pressedSide === "foreign" || recordingSide === "foreign")
                  ? "2px solid #ff839b"
                  : "2px solid #8fcaaa",
              borderRadius: "24px",
              background:
                (pressedSide === "foreign" || recordingSide === "foreign")
                  ? "linear-gradient(180deg, #d63f62, #8f203e)"
                  : processingSide === "foreign"
                  ? "#365644"
                  : "linear-gradient(180deg, #a8dfbd, #76b893)",
              color: "#06120c",
              fontFamily: "inherit",
              fontSize: "20px",
              fontWeight: 900,
              cursor: busy ? "default" : "pointer",
              WebkitTouchCallout: "none",
              whiteSpace: "pre-line",
              opacity:
                busy &&
                recordingSide !== "foreign" &&
                processingSide !== "foreign"
                  ? 0.55
                  : 1,
              boxShadow:
                (pressedSide === "foreign" || recordingSide === "foreign")
                  ? "0 0 0 5px rgba(255,94,126,0.32), 0 0 36px rgba(255,50,96,0.95)"
                  : "none",
            }}
          >
            {pressedSide === "foreign" || recordingSide === "foreign"
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

        <section
          style={{
            marginTop: "14px",
            background: "rgba(13,17,26,0.94)",
            border: "1px solid #1c2538",
            borderRadius: "22px",
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={openImagePicker}
              style={{
                flexShrink: 0,
                minHeight: "58px",
                padding: "12px 16px",
                background:
                  "linear-gradient(180deg, #9d8dff, #6f62df)",
                color: "#100b2c",
                border: "1px solid #b9aeff",
                borderRadius: "15px",
                fontFamily: "inherit",
                fontSize: "16px",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow:
                  "0 8px 20px rgba(111,98,223,0.24)",
              }}
            >
              ＋ 写真を翻訳
            </button>

            <p
              style={{
                margin: 0,
                color: "#aab8cf",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              お店のメニュー、看板、道路標識などをスクショして日本語に変換します。
            </p>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            style={{ display: "none" }}
          />

          {selectedImageUrl && (
            <>
              {translatedImageUrl && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setImageView("original")}
                    style={{
                      minHeight: "48px",
                      background:
                        imageView === "original"
                          ? "#7db3ff"
                          : "#0d1421",
                      color:
                        imageView === "original"
                          ? "#07101d"
                          : "#e4ebf7",
                      border:
                        imageView === "original"
                          ? "1px solid #9ac8ff"
                          : "1px solid #263550",
                      borderRadius: "12px",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    元画像
                  </button>

                  <button
                    type="button"
                    onClick={() => setImageView("translated")}
                    style={{
                      minHeight: "48px",
                      background:
                        imageView === "translated"
                          ? "#8fe0b1"
                          : "#0d1421",
                      color:
                        imageView === "translated"
                          ? "#061b0e"
                          : "#e4ebf7",
                      border:
                        imageView === "translated"
                          ? "1px solid #a8ebc4"
                          : "1px solid #263550",
                      borderRadius: "12px",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    日本語化画像
                  </button>
                </div>
              )}

              <div
                style={{
                  marginTop: "14px",
                  overflow: "hidden",
                  background: "#070b14",
                  border: "1px solid #24304a",
                  borderRadius: "16px",
                }}
              >
                <img
                  src={
                    imageView === "translated" && translatedImageUrl
                      ? translatedImageUrl
                      : selectedImageUrl
                  }
                  alt={
                    imageView === "translated"
                      ? "日本語化した画像"
                      : "選択した翻訳対象"
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    maxHeight: "520px",
                    objectFit: "contain",
                  }}
                />

                <p
                  style={{
                    margin: 0,
                    padding: "10px 12px",
                    color: "#8fa7cc",
                    fontSize: "11px",
                    lineHeight: 1.5,
                    wordBreak: "break-all",
                  }}
                >
                  選択した画像：{selectedImageName}
                </p>
              </div>

              {translatedImageUrl && (
                <button
                  type="button"
                  onClick={() => void saveTranslatedImage()}
                  style={{
                    width: "100%",
                    minHeight: "58px",
                    marginTop: "12px",
                    padding: "13px",
                    background:
                      "linear-gradient(180deg, #ffd66f, #e7aa35)",
                    color: "#241600",
                    border: "1px solid #ffe39a",
                    borderRadius: "16px",
                    fontFamily: "inherit",
                    fontSize: "16px",
                    fontWeight: 900,
                    cursor: "pointer",
                    boxShadow:
                      "0 8px 20px rgba(231,170,53,0.24)",
                  }}
                >
                  ↓ 日本語化画像を保存
                </button>
              )}

              <button
                type="button"
                disabled={analyzingImage}
                onClick={() => void analyzeSelectedImage()}
                style={{
                  width: "100%",
                  minHeight: "60px",
                  marginTop: "12px",
                  padding: "13px",
                  background: analyzingImage
                    ? "#334155"
                    : "linear-gradient(180deg, #8fe0b1, #58b77d)",
                  color: analyzingImage ? "#8794a8" : "#061b0e",
                  border: analyzingImage
                    ? "1px solid #475569"
                    : "1px solid #a8ebc4",
                  borderRadius: "16px",
                  fontFamily: "inherit",
                  fontSize: "17px",
                  fontWeight: 900,
                  cursor: analyzingImage ? "default" : "pointer",
                  boxShadow: analyzingImage
                    ? "none"
                    : "0 8px 20px rgba(88,183,125,0.24)",
                }}
              >
                {analyzingImage
                  ? "画像内の文字を解析中..."
                  : "画像内の文字を日本語へ翻訳"}
              </button>
            </>
          )}

          {imageTranslationResult && (
            <div
              style={{
                marginTop: "12px",
                padding: "14px",
                background: "#080d17",
                border: "1px solid #263550",
                borderRadius: "16px",
              }}
            >
              <p
                style={{
                  margin: "0 0 10px",
                  color: "#dbe5f4",
                  fontSize: "14px",
                  fontWeight: 900,
                }}
              >
                検知した言語：
                {imageTranslationResult.detectedLanguage.label}
              </p>

              {imageTranslationResult.blocks.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    color: "#91a1bb",
                    fontSize: "13px",
                    lineHeight: 1.6,
                  }}
                >
                  翻訳できる外国語が見つかりませんでした。
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                  }}
                >
                  {imageTranslationResult.blocks.map(
                    (block, index) => (
                      <div
                        key={`${block.originalText}-${index}`}
                        style={{
                          padding: "11px",
                          background: "#0b111d",
                          border: "1px solid #22304a",
                          borderRadius: "12px",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 5px",
                            color: "#8fa7cc",
                            fontSize: "11px",
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                          }}
                        >
                          {block.originalText}
                        </p>

                        <p
                          style={{
                            margin: 0,
                            color: "#ffffff",
                            fontSize: "17px",
                            fontWeight: 800,
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                          }}
                        >
                          {block.translatedText}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      </main>
    </>
  );
}