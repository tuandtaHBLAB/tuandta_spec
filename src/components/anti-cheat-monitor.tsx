"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import styles from "@/app/page.module.css";
import { CountdownTimer } from "@/components/countdown-timer";
import { useCountdown } from "@/hooks/use-countdown";

type Severity = "INFO" | "WARNING" | "HIGH_RISK";
type ViolationType =
  | "FACE_MISSING"
  | "MULTIPLE_FACES"
  | "LOOK_AWAY"
  | "HEAD_DOWN"
  | "TAB_SWITCH"
  | "BROWSER_BLUR";

type ViolationLog = {
  id: string;
  type: ViolationType;
  severity: Severity;
  durationMs: number;
  timestamp: string;
};

type SnapshotLog = {
  id: string;
  reason: ViolationType;
  timestamp: string;
  image: string;
};

type Question = {
  id: string;
  prompt: string;
  promptLines?: FuriganaToken[][];
  imageUrl?: string;
  imageAlt?: string;
  imageLabelTokens?: FuriganaToken[];
  questionLabelTokens?: FuriganaToken[];
  questionAudioUrl?: string;
  prepSeconds: number;
  answerSeconds: number;
  tips: string;
};

type Part = {
  id: string;
  title: string;
  description: string;
  introCategoryTokens?: FuriganaToken[];
  introHeadlineTokens?: FuriganaToken[];
  introNoteLines?: FuriganaToken[][];
  introAudioUrl?: string;
  startWithinSeconds: number;
  questions: Question[];
};

type QuestionData = {
  parts: Part[];
};

type ExamStage =
  | "home"
  | "mic_test"
  | "exam_notice"
  | "part_intro"
  | "part_instruction"
  | "prep"
  | "answer"
  | "saving"
  | "timeout"
  | "completed"
  | "disqualified";

type FuriganaToken = {
  text: string;
  reading?: string;
};

const safePlay = async (media: HTMLMediaElement | null) => {
  if (!media) return;
  try {
    await media.play();
  } catch {
    // Ignore play interruptions caused by source reloads or rapid state changes.
  }
};

const CHECKPOINTS = [
  "帽子・マスク・サングラスは外してください。",
  "顔が正面に映るよう、明るい場所で受験してください。",
  "試験中はタブ切り替えやブラウザ離脱をしないでください。",
  "マイク付きイヤホンと安定した通信環境を準備してください。",
];

const LOOK_AWAY_DEG = 25;
const HEAD_DOWN_DEG = 20;
const MAX_HIGH_RISK = 3;
const MIC_TEST_QUESTION_HOLD_SECONDS = 10;
const EXAM_NOTICE_SECONDS = 15;
const PART_INSTRUCTION_SECONDS = 10;
const VIOLATION_LABELS: Record<ViolationType, string> = {
  FACE_MISSING: "顔の未検出",
  MULTIPLE_FACES: "複数人の映り込み",
  LOOK_AWAY: "視線逸脱",
  HEAD_DOWN: "下向き姿勢",
  TAB_SWITCH: "タブ切り替え",
  BROWSER_BLUR: "ブラウザ離脱",
};

const MIC_TEST_QUESTIONS: { id: number; tokens: FuriganaToken[] }[] = [
  {
    id: 1,
    tokens: [
      { text: "名前", reading: "なまえ" },
      { text: "を" },
      { text: "言", reading: "い" },
      { text: "ってください。" },
    ],
  },
  {
    id: 2,
    tokens: [
      { text: "今日", reading: "きょう" },
      { text: "は、" },
      { text: "何月何日", reading: "なんがつなんにち" },
      { text: "ですか。" },
    ],
  },
  {
    id: 3,
    tokens: [
      { text: "今", reading: "いま" },
      { text: "、" },
      { text: "何時", reading: "なんじ" },
      { text: "ですか。" },
    ],
  },
  {
    id: 4,
    tokens: [
      { text: "今", reading: "いま" },
      { text: "、どこに" },
      { text: "住", reading: "す" },
      { text: "んでいますか。" },
    ],
  },
];

const MIC_TEST_SECONDS = (MIC_TEST_QUESTIONS.length + 1) * MIC_TEST_QUESTION_HOLD_SECONDS;

const EXAM_NOTICE_ITEMS: FuriganaToken[][] = [
  [
    { text: "試験時間", reading: "しけんじかん" },
    { text: "は" },
    { text: "約", reading: "やく" },
    { text: "15" },
    { text: "分", reading: "ふん" },
    { text: "です。" },
  ],
  [
    { text: "問題", reading: "もんだい" },
    { text: "は" },
    { text: "全部", reading: "ぜんぶ" },
    { text: "で8" },
    { text: "問", reading: "もん" },
    { text: "です。" },
  ],
  [
    { text: "試験", reading: "しけん" },
    { text: "を" },
    { text: "始", reading: "はじ" },
    { text: "めたら、" },
    { text: "戻", reading: "もど" },
    { text: "ること、" },
    { text: "途中", reading: "とちゅう" },
    { text: "でやめることはできません。" },
  ],
];

function BanOverlay() {
  return (
    <>
      <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="2.2" fill="none" />
      <path d="M13 35L35 13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

function NoHatIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden focusable="false">
      <BanOverlay />
      <path
        d="M14 26C14 21 18.5 18 24 18C29.5 18 34 21 34 26V27H14V26Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path d="M10 30H38" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function NoGlassesIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden focusable="false">
      <BanOverlay />
      <rect x="12" y="21" width="10" height="7" rx="2.2" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="26" y="21" width="10" height="7" rx="2.2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M22 24H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function NoMaskIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden focusable="false">
      <BanOverlay />
      <rect x="16" y="20" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M16 23C14 23 13 24 12 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 23C34 23 35 24 36 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 25H28M20 28H28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function JapaneseText({
  tokens,
  className,
}: {
  tokens: FuriganaToken[];
  className?: string;
}) {
  return (
    <p className={className}>
      {tokens.map((token, index) =>
        token.reading ? (
          <ruby key={`${token.text}-${index}`}>
            {token.text}
            <rt>{token.reading}</rt>
          </ruby>
        ) : (
          <span key={`${token.text}-${index}`}>{token.text}</span>
        ),
      )}
    </p>
  );
}

export function AntiCheatMonitor({ serverTime }: { serverTime: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseExpiredRef = useRef(false);
  const partIntroExpiredRef = useRef(false);
  const partAudioRef = useRef<HTMLAudioElement | null>(null);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const answerRecorderRef = useRef<MediaRecorder | null>(null);
  const answerChunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioMeterFrameRef = useRef<number | null>(null);
  const lastAudioMeterUpdateRef = useRef(0);
  const lastAudioLevelRef = useRef(0);
  const attemptedHomeAutoOpenRef = useRef(false);
  const micTestQuestionTimeoutsRef = useRef<number[]>([]);

  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [stage, setStage] = useState<ExamStage>("home");
  const [partIndex, setPartIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [logs, setLogs] = useState<ViolationLog[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotLog[]>([]);
  const [questionStartAt, setQuestionStartAt] = useState<string | null>(null);

  const [cameraError, setCameraError] = useState("");
  const [deviceCheckStatus, setDeviceCheckStatus] = useState("");
  const [isCameraChecked, setIsCameraChecked] = useState(false);
  const [isMicChecked, setIsMicChecked] = useState(false);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [detectorStatus, setDetectorStatus] = useState("フェイス検出は未初期化です");
  const [isCameraReady, setIsCameraReady] = useState(false);

  const [highRiskCount, setHighRiskCount] = useState(0);
  const [highRiskPopup, setHighRiskPopup] = useState<string | null>(null);
  const [persistStatus, setPersistStatus] = useState("");
  const [partTimeoutMessage, setPartTimeoutMessage] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [visibleMicTestQuestionCount, setVisibleMicTestQuestionCount] = useState(0);
  const [micTestStartedAt, setMicTestStartedAt] = useState<number | null>(null);

  const cooldownMapRef = useRef<Record<ViolationType, number>>({
    FACE_MISSING: 0,
    MULTIPLE_FACES: 0,
    LOOK_AWAY: 0,
    HEAD_DOWN: 0,
    TAB_SWITCH: 0,
    BROWSER_BLUR: 0,
  });

  const faceMissingSinceRef = useRef<number | null>(null);
  const lookingAwaySinceRef = useRef<number | null>(null);
  const headDownSinceRef = useRef<number | null>(null);

  useEffect(() => {
    const noisyLog = "Created TensorFlow Lite XNNPACK delegate for CPU";
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const shouldIgnore = (args: unknown[]) =>
      args.some((arg) => typeof arg === "string" && arg.includes(noisyLog));

    console.error = (...args: unknown[]) => {
      if (shouldIgnore(args)) return;
      originalError(...args);
    };
    console.warn = (...args: unknown[]) => {
      if (shouldIgnore(args)) return;
      originalWarn(...args);
    };
    console.info = (...args: unknown[]) => {
      if (shouldIgnore(args)) return;
      originalInfo(...args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/mock-speaking-questions.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Cannot load mock question json");
        const data = (await response.json()) as QuestionData;
        setQuestionData(data);
      } catch {
        setLoadError("模擬問題データの読み込みに失敗しました。");
      }
    })();
  }, []);

  const currentPart = questionData?.parts[partIndex] ?? null;
  const currentQuestion = currentPart?.questions[questionIndex] ?? null;
  const stageRef = useRef<ExamStage>(stage);
  const currentQuestionRef = useRef<Question | null>(currentQuestion);
  const gotoNextQuestionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    stageRef.current = stage;
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion, stage]);

  const {
    remainingSeconds: phaseRemainingSeconds,
    pause: pausePhaseCountdown,
    start: startPhaseCountdown,
  } = useCountdown({
    tickMs: 100,
    onExpire: () => {
      if (phaseExpiredRef.current) return;
      phaseExpiredRef.current = true;

      if (stageRef.current === "prep" && currentQuestionRef.current) {
        const nextAnswerSeconds = currentQuestionRef.current.answerSeconds;
        setStage("answer");
        phaseExpiredRef.current = false;
        startPhaseCountdown(nextAnswerSeconds);
        startAnswerRecording();
        return;
      }

      if (stageRef.current === "answer") {
        gotoNextQuestionRef.current?.();
      }
    },
  });
  const {
    remainingMs: micTestRemainingMs,
    pause: pauseMicTestCountdown,
    start: startMicTestCountdown,
  } = useCountdown({
    tickMs: 100,
    onExpire: () => {
      if (stageRef.current === "mic_test") {
        setStage("exam_notice");
      }
    },
  });
  const {
    remainingSeconds: examNoticeRemainingSeconds,
    pause: pauseExamNoticeCountdown,
    start: startExamNoticeCountdown,
  } = useCountdown({
    tickMs: 100,
    onExpire: () => {
      if (stageRef.current === "exam_notice") {
        setStage("part_intro");
      }
    },
  });
  const {
    pause: pausePartInstructionCountdown,
    start: startPartInstructionCountdown,
  } = useCountdown({
    tickMs: 100,
    onExpire: () => {
      const nextQuestion = currentQuestionRef.current;
      if (stageRef.current !== "part_instruction" || !nextQuestion) return;

      setQuestionStartAt(new Date().toISOString());
      phaseExpiredRef.current = false;
      if (nextQuestion.prepSeconds <= 0) {
        setStage("answer");
        startPhaseCountdown(nextQuestion.answerSeconds);
        startAnswerRecording();
        return;
      }

      setStage("prep");
      startPhaseCountdown(nextQuestion.prepSeconds);
    },
  });
  const { remainingSeconds: partIntroRemainingSeconds, pause: pausePartIntroCountdown, start: startPartIntroCountdown } =
    useCountdown({
      tickMs: 100,
      onExpire: () => {
        if (partIntroExpiredRef.current) return;
        partIntroExpiredRef.current = true;
        setStage("timeout");
      },
    });

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const micStream = micStreamRef.current;
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (answerRecorderRef.current && answerRecorderRef.current.state !== "inactive") {
      answerRecorderRef.current.stop();
    }
    if (audioMeterFrameRef.current) {
      window.cancelAnimationFrame(audioMeterFrameRef.current);
      audioMeterFrameRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    lastAudioMeterUpdateRef.current = 0;
    lastAudioLevelRef.current = 0;
    setAudioLevel(0);
    setIsCameraReady(false);
  }, []);

  const clearMicTestQuestionTimeouts = useCallback(() => {
    micTestQuestionTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    micTestQuestionTimeoutsRef.current = [];
  }, []);

  const startAnswerRecording = useCallback(() => {
    const micStream = micStreamRef.current;
    if (!micStream) return;
    if (answerRecorderRef.current && answerRecorderRef.current.state !== "inactive") return;

    answerChunksRef.current = [];
    const recorder = new MediaRecorder(micStream, { mimeType: "audio/webm" });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        answerChunksRef.current.push(event.data);
      }
    };
    recorder.start();
    answerRecorderRef.current = recorder;
  }, []);

  const stopAnswerRecording = useCallback(async () => {
    const recorder = answerRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      if (answerChunksRef.current.length === 0) return null;
      return new Blob(answerChunksRef.current, { type: "audio/webm" });
    }

    return await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        if (answerChunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(answerChunksRef.current, { type: "audio/webm" });
        resolve(blob);
      };
      recorder.stop();
      answerRecorderRef.current = null;
    });
  }, []);

  const takeSnapshot = useCallback((reason: ViolationType) => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0);
    const image = canvas.toDataURL("image/jpeg", 0.6);

    setSnapshots((prev) => [
      {
        id: crypto.randomUUID(),
        reason,
        timestamp: new Date().toISOString(),
        image,
      },
      ...prev,
    ].slice(0, 20));
  }, []);

  const addViolation = useCallback(
    (type: ViolationType, severity: Severity, durationMs = 0) => {
      const now = Date.now();
      const last = cooldownMapRef.current[type];
      if (now - last < 3500) return;
      cooldownMapRef.current[type] = now;

      const entry: ViolationLog = {
        id: crypto.randomUUID(),
        type,
        severity,
        durationMs,
        timestamp: new Date().toISOString(),
      };

      setLogs((prev) => [entry, ...prev].slice(0, 60));

      if (severity === "HIGH_RISK") {
        setHighRiskCount((prev) => {
          const next = prev + 1;
          setHighRiskPopup(`é‡大警告: ${VIOLATION_LABELS[type]}（${next}/${MAX_HIGH_RISK}）`);
          if (next >= MAX_HIGH_RISK) {
            setStage("disqualified");
            pausePhaseCountdown();
            pauseMicTestCountdown();
            pauseExamNoticeCountdown();
            pausePartInstructionCountdown();
            pausePartIntroCountdown();
            clearMicTestQuestionTimeouts();
          }
          return next;
        });
      }
    },
    [
      pauseExamNoticeCountdown,
      clearMicTestQuestionTimeouts,
      pauseMicTestCountdown,
      pausePartInstructionCountdown,
      pausePartIntroCountdown,
      pausePhaseCountdown,
    ],
  );

  const initDetector = useCallback(async () => {
    if (faceLandmarkerRef.current) return;
    setDetectorStatus("フェイス検出モデルを読み込み中...");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
    );

    faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
      },
      runningMode: "VIDEO",
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
      numFaces: 2,
    });
    setDetectorStatus("フェイス検出の準備が完了しました");
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setDeviceCheckStatus("Opening camera and mic...");
    if (audioMeterFrameRef.current) {
      window.cancelAnimationFrame(audioMeterFrameRef.current);
      audioMeterFrameRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    micStreamRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const micStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });

      streamRef.current = stream;
      micStreamRef.current = micStream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await safePlay(videoRef.current);
      }
      if (mobileVideoRef.current) {
        mobileVideoRef.current.srcObject = stream;
        await safePlay(mobileVideoRef.current);
      }

      await initDetector();
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(micStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let idx = 0; idx < dataArray.length; idx += 1) {
          const normalized = (dataArray[idx] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const nextAudioLevel = Math.min(100, Math.round(rms * 280));
        const now = performance.now();
        if (
          now - lastAudioMeterUpdateRef.current >= 80 &&
          nextAudioLevel !== lastAudioLevelRef.current
        ) {
          lastAudioMeterUpdateRef.current = now;
          lastAudioLevelRef.current = nextAudioLevel;
          setAudioLevel(nextAudioLevel);
        }
        audioMeterFrameRef.current = window.requestAnimationFrame(tick);
      };
      audioMeterFrameRef.current = window.requestAnimationFrame(tick);

      setIsCameraChecked(true);
      setIsMicChecked(true);
      setDeviceCheckStatus("Camera and mic are ready.");
      setIsCameraReady(true);
      return true;
    } catch {
      setIsCameraChecked(false);
      setIsMicChecked(false);
      setCameraError("カメラを起動できません。権限設定を確認して再試行してください。");
      setDetectorStatus("フェイス検出の初期化でエラーが発生しました");
      setIsCameraReady(false);
      return false;
    }
  }, [initDetector]);

  const checkMicAndCamera = useCallback(async () => {
    if (isCheckingDevices) return;
    setIsCheckingDevices(true);
    setCameraError("");
    setDeviceCheckStatus("Checking mic and camera...");
    setIsCameraChecked(false);
    setIsMicChecked(false);

    const started = await startCamera();
    if (!started) {
      setDeviceCheckStatus("");
      setIsCheckingDevices(false);
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some((device) => device.kind === "videoinput");
      const hasMic = devices.some((device) => device.kind === "audioinput");
      setIsCameraChecked(hasCamera);
      setIsMicChecked(hasMic);

      if (!hasCamera || !hasMic) {
        setIsCheckingDevices(false);
        setDeviceCheckStatus("カメラまたはマイクが見つかりません。両方の接続を確認してください。");
        return;
      }

      setDeviceCheckStatus("チェック完了: カメラとマイクは利用可能です。");
    } catch {
      setDeviceCheckStatus("カメラは起動しましたが、デバイス一覧を確認できませんでした。");
    }
    setIsCheckingDevices(false);
  }, [isCheckingDevices, startCamera]);

  const ensureDevicesReady = useCallback(async () => {
    if (isCheckingDevices) return false;
    setIsCheckingDevices(true);

    if (streamRef.current && micStreamRef.current && isCameraReady) {
      setCameraError("");
      setIsCameraChecked(true);
      setIsMicChecked(true);
      setDeviceCheckStatus("Camera and mic are ready.");
      setIsCheckingDevices(false);
      return true;
    }

    const started = await startCamera();
    setIsCheckingDevices(false);
    return started;
  }, [isCameraReady, isCheckingDevices, startCamera]);

  const checkCameraOnly = useCallback(async () => {
    setCameraError("");
    setDeviceCheckStatus("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await safePlay(videoRef.current);
      }
      if (mobileVideoRef.current) {
        mobileVideoRef.current.srcObject = stream;
        await safePlay(mobileVideoRef.current);
      }
      setIsCameraChecked(true);
      setDeviceCheckStatus("カメラチェック完了");
    } catch {
      setIsCameraChecked(false);
      setCameraError("カメラにアクセスできません。権限を確認してください。");
    }
  }, []);

  const checkMicOnly = useCallback(async () => {
    setCameraError("");
    setDeviceCheckStatus("");
    try {
      const micProbe = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      micProbe.getTracks().forEach((track) => track.stop());
      setIsMicChecked(true);
      setDeviceCheckStatus("マイクチェック完了");
    } catch {
      setIsMicChecked(false);
      setCameraError("マイクにアクセスできません。権限を確認してください。");
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const mobileVideo = mobileVideoRef.current;
    const stream = streamRef.current;
    if (!stream) return;
    if (video && video.srcObject !== stream) {
      video.srcObject = stream;
    }
    if (mobileVideo && mobileVideo.srcObject !== stream) {
      mobileVideo.srcObject = stream;
    }
  }, [isCameraReady, stage]);

  useEffect(() => {
    if (stage !== "home") {
      attemptedHomeAutoOpenRef.current = false;
      return;
    }
    if (attemptedHomeAutoOpenRef.current) return;
    attemptedHomeAutoOpenRef.current = true;
    void ensureDevicesReady();
  }, [ensureDevicesReady, stage]);

  const detectLoop = useCallback(() => {
    const detector = faceLandmarkerRef.current;
    const video = videoRef.current;
    const isExamRunning =
      stage === "mic_test" ||
      stage === "exam_notice" ||
      stage === "part_instruction" ||
      stage === "prep" ||
      stage === "answer" ||
      stage === "part_intro";

    if (!detector || !video || !isExamRunning) return;

    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      animationFrameRef.current = window.requestAnimationFrame(detectLoop);
      return;
    }

    let result: ReturnType<FaceLandmarker["detectForVideo"]>;
    try {
      result = detector.detectForVideo(video, performance.now());
    } catch {
      animationFrameRef.current = window.requestAnimationFrame(detectLoop);
      return;
    }

    const faces = result.faceLandmarks?.length ?? 0;
    const matrix = result.facialTransformationMatrixes?.[0]?.data;
    const now = Date.now();

    if (faces === 0) {
      if (!faceMissingSinceRef.current) faceMissingSinceRef.current = now;
      const duration = now - faceMissingSinceRef.current;
      if (duration >= 3000) {
        const severity = duration >= 10000 ? "HIGH_RISK" : "WARNING";
        addViolation("FACE_MISSING", severity, duration);
        takeSnapshot("FACE_MISSING");
      }
    } else {
      faceMissingSinceRef.current = null;
    }

    if (faces > 1) {
      addViolation("MULTIPLE_FACES", "HIGH_RISK", 0);
      takeSnapshot("MULTIPLE_FACES");
    }

    if (matrix && faces > 0) {
      const yawRad = Math.atan2(matrix[8], matrix[10]);
      const pitchRad = Math.asin(-matrix[9]);
      const yawDeg = Math.abs((yawRad * 180) / Math.PI);
      const pitchDeg = (pitchRad * 180) / Math.PI;

      if (yawDeg > LOOK_AWAY_DEG) {
        if (!lookingAwaySinceRef.current) lookingAwaySinceRef.current = now;
        const duration = now - lookingAwaySinceRef.current;
        if (duration >= 5000) {
          addViolation("LOOK_AWAY", "WARNING", duration);
          takeSnapshot("LOOK_AWAY");
        }
      } else {
        lookingAwaySinceRef.current = null;
      }

      if (pitchDeg < -HEAD_DOWN_DEG) {
        if (!headDownSinceRef.current) headDownSinceRef.current = now;
        const duration = now - headDownSinceRef.current;
        if (duration >= 3000) {
          addViolation("HEAD_DOWN", "WARNING", duration);
          takeSnapshot("HEAD_DOWN");
        }
      } else {
        headDownSinceRef.current = null;
      }
    }

    animationFrameRef.current = window.requestAnimationFrame(detectLoop);
  }, [addViolation, stage, takeSnapshot]);

  useEffect(() => {
    const visibilityHandler = () => {
      if (document.hidden && stage !== "home" && stage !== "completed") {
        addViolation("TAB_SWITCH", "WARNING", 0);
        takeSnapshot("TAB_SWITCH");
      }
    };
    const blurHandler = () => {
      if (stage !== "home" && stage !== "completed") {
        addViolation("BROWSER_BLUR", "WARNING", 0);
        takeSnapshot("BROWSER_BLUR");
      }
    };

    document.addEventListener("visibilitychange", visibilityHandler);
    window.addEventListener("blur", blurHandler);

    return () => {
      document.removeEventListener("visibilitychange", visibilityHandler);
      window.removeEventListener("blur", blurHandler);
    };
  }, [addViolation, stage, takeSnapshot]);

  useEffect(() => {
    if (!isCameraReady) return;
    const isExamRunning =
      stage === "mic_test" ||
      stage === "exam_notice" ||
      stage === "part_instruction" ||
      stage === "prep" ||
      stage === "answer" ||
      stage === "part_intro";
    if (!isExamRunning) return;
    animationFrameRef.current = window.requestAnimationFrame(detectLoop);
    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [detectLoop, isCameraReady, stage]);

  useEffect(
    () => () => {
      stopCamera();
      faceLandmarkerRef.current?.close();
      faceLandmarkerRef.current = null;
    },
    [stopCamera],
  );

  const backToHome = useCallback((message?: string) => {
    pausePhaseCountdown();
    pauseMicTestCountdown();
    pauseExamNoticeCountdown();
    pausePartInstructionCountdown();
    pausePartIntroCountdown();
    clearMicTestQuestionTimeouts();
    phaseExpiredRef.current = false;
    partIntroExpiredRef.current = false;
    if (partAudioRef.current) {
      partAudioRef.current.pause();
      partAudioRef.current.currentTime = 0;
    }
    if (questionAudioRef.current) {
      questionAudioRef.current.pause();
      questionAudioRef.current.currentTime = 0;
    }
    void stopAnswerRecording();
    setStage("home");
    setPartIndex(0);
    setQuestionIndex(0);
    setQuestionStartAt(null);
    setMicTestStartedAt(null);
    setVisibleMicTestQuestionCount(0);
    setHighRiskCount(0);
    setPersistStatus("");
    if (message) setPartTimeoutMessage(message);
  }, [
    pauseExamNoticeCountdown,
    clearMicTestQuestionTimeouts,
    pauseMicTestCountdown,
    pausePartInstructionCountdown,
    pausePartIntroCountdown,
    pausePhaseCountdown,
    stopAnswerRecording,
  ]);

  const saveQuestionArtifacts = useCallback(
    async (endedAt: string, audioBlob: Blob | null) => {
      if (!currentPart || !currentQuestion || !questionStartAt) return;

      const inRange = (timestamp: string) => {
        const value = new Date(timestamp).getTime();
        return value >= new Date(questionStartAt).getTime() && value <= new Date(endedAt).getTime();
      };

      const questionViolations = logs.filter((item) => inRange(item.timestamp));
      const questionSnapshots = snapshots.filter((item) => inRange(item.timestamp));
      const warnings = questionViolations.filter((item) => item.severity === "WARNING").length;

      const payload = {
        partId: currentPart.id,
        questionId: currentQuestion.id,
        questionPrompt: currentQuestion.prompt,
        startedAt: questionStartAt,
        endedAt,
        highRiskCount,
        warnings,
        violations: questionViolations,
        snapshots: questionSnapshots,
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      if (audioBlob) {
        formData.append("audio", new File([audioBlob], "answer.webm", { type: "audio/webm" }));
      }

      const response = await fetch("/api/exam/save-question", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setPersistStatus("試験データの保存に失敗しました。サーバーログを確認してください。");
        return;
      }

      const data = (await response.json()) as { folderName: string };
      setPersistStatus(`保存先フォルダ: ${data.folderName}`);
    },
    [currentPart, currentQuestion, highRiskCount, logs, questionStartAt, snapshots],
  );

  const gotoNextQuestion = useCallback(async () => {
    if (!questionData || !currentPart || !currentQuestion) return;

    pausePhaseCountdown();
    const isLastQuestionInPart = questionIndex >= currentPart.questions.length - 1;
    const isLastPart = partIndex >= questionData.parts.length - 1;

    if (isLastQuestionInPart && isLastPart) {
      setStage("saving");
    }

    try {
      const endedAt = new Date().toISOString();
      const audioBlob = await stopAnswerRecording();
      await saveQuestionArtifacts(endedAt, audioBlob);
    } catch {
      setPersistStatus("保存時にエラーが発生しましたが、試験は完了として処理しました。");
    }

    if (isLastQuestionInPart && isLastPart) {
      setStage("completed");
      return;
    }

    if (isLastQuestionInPart) {
      const nextPartIndex = partIndex + 1;
      setPartIndex(nextPartIndex);
      setQuestionIndex(0);
      setStage("part_intro");
      setQuestionStartAt(null);
      return;
    }

    const nextQuestionIndex = questionIndex + 1;
    const nextQuestion = currentPart.questions[nextQuestionIndex];
    setQuestionIndex(nextQuestionIndex);
    phaseExpiredRef.current = false;
    setQuestionStartAt(new Date().toISOString());
    if (nextQuestion.prepSeconds <= 0) {
      setStage("answer");
      startPhaseCountdown(nextQuestion.answerSeconds);
      startAnswerRecording();
      return;
    }

    setStage("prep");
    startPhaseCountdown(nextQuestion.prepSeconds);
  }, [
    currentPart,
    currentQuestion,
    partIndex,
    pausePhaseCountdown,
    questionData,
    questionIndex,
    saveQuestionArtifacts,
    startAnswerRecording,
    startPhaseCountdown,
    stopAnswerRecording,
  ]);

  useEffect(() => {
    gotoNextQuestionRef.current = () => {
      void gotoNextQuestion();
    };
  }, [gotoNextQuestion]);

  useEffect(() => {
    if (stage === "prep" || stage === "answer") return;
    phaseExpiredRef.current = false;
    pausePhaseCountdown();
  }, [pausePhaseCountdown, stage]);

  useEffect(() => {
    if (stage !== "part_instruction") {
      pausePartInstructionCountdown();
      return;
    }
    startPartInstructionCountdown(PART_INSTRUCTION_SECONDS);
    return () => pausePartInstructionCountdown();
  }, [pausePartInstructionCountdown, stage, startPartInstructionCountdown]);

  useEffect(() => {
    if (!highRiskPopup) return;
    const timeout = window.setTimeout(() => setHighRiskPopup(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [highRiskPopup]);

  useEffect(() => {
    if (stage !== "disqualified") return;
    const timeout = window.setTimeout(() => {
      backToHome();
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [backToHome, stage]);

  useEffect(() => {
    if (stage !== "timeout") return;
    const timeout = window.setTimeout(() => {
      backToHome();
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [backToHome, stage]);

  useEffect(() => {
    if (stage !== "mic_test") {
      pauseMicTestCountdown();
      clearMicTestQuestionTimeouts();
      return;
    }

    startMicTestCountdown(MIC_TEST_SECONDS);

    clearMicTestQuestionTimeouts();
    micTestQuestionTimeoutsRef.current = MIC_TEST_QUESTIONS.map((_, index) =>
      window.setTimeout(
        () => setVisibleMicTestQuestionCount(index + 1),
        (index + 1) * MIC_TEST_QUESTION_HOLD_SECONDS * 1000,
      ),
    );

    return () => {
      clearMicTestQuestionTimeouts();
      pauseMicTestCountdown();
    };
  }, [
    clearMicTestQuestionTimeouts,
    pauseMicTestCountdown,
    stage,
    startMicTestCountdown,
  ]);

  useEffect(() => {
    if (stage !== "exam_notice") {
      pauseExamNoticeCountdown();
      return;
    }
    startExamNoticeCountdown(EXAM_NOTICE_SECONDS);
    return () => pauseExamNoticeCountdown();
  }, [pauseExamNoticeCountdown, stage, startExamNoticeCountdown]);

  useEffect(() => {
    if (stage !== "part_intro") {
      partIntroExpiredRef.current = false;
      pausePartIntroCountdown();
      return;
    }
    const introLimit = currentPart?.startWithinSeconds ?? 60;
    partIntroExpiredRef.current = false;
    startPartIntroCountdown(introLimit);
    return () => pausePartIntroCountdown(); /*
          backToHome("パート開始確認の制限時間（60秒）を超えたため、ホーム画面に戻りました。");
  */}, [currentPart?.startWithinSeconds, pausePartIntroCountdown, stage, startPartIntroCountdown]);

  useEffect(() => {
    if (stage !== "part_intro" || !currentPart?.introAudioUrl || !partAudioRef.current) return;
    partAudioRef.current.currentTime = 0;
    void safePlay(partAudioRef.current);
  }, [currentPart?.id, currentPart?.introAudioUrl, stage]);

  useEffect(() => {
    if (stage !== "prep" || !currentQuestion?.questionAudioUrl || !questionAudioRef.current) return;
    questionAudioRef.current.currentTime = 0;
    void safePlay(questionAudioRef.current);
  }, [currentQuestion?.id, currentQuestion?.questionAudioUrl, stage]);

  const totalQuestions = useMemo(
    () => questionData?.parts.reduce((acc, part) => acc + part.questions.length, 0) ?? 0,
    [questionData],
  );

  const questionNumberInPart = questionIndex + 1;
  const isVisualQuestion = !!currentQuestion?.imageUrl;
  const isPart3VisualQuestion = currentPart?.id === "part3" && isVisualQuestion;
  const isPart4VisualQuestion = currentPart?.id === "part4" && isVisualQuestion;
  const timerLabel = stage === "part_intro" ? "開始まで" : stage === "prep" ? "準備" : "回答";
  const timerValue = stage === "part_intro" ? partIntroRemainingSeconds : phaseRemainingSeconds;
  const timerVariant = stage === "prep" ? "prep" : stage === "answer" ? "answer" : "default";
  const visibleMicTestQuestions =
    stage === "mic_test" && micTestStartedAt !== null
      ? Date.now() - micTestStartedAt < MIC_TEST_QUESTION_HOLD_SECONDS * 1000
        ? 0
        : visibleMicTestQuestionCount
      : 0;
  const isReadyToStart = isCameraChecked && isMicChecked && !!questionData;
  const startExamHint = isCheckingDevices
    ? "Camera and mic are opening. The start button will unlock automatically."
    : !isReadyToStart
      ? "Please wait until camera and mic are ready."
      : "";

  const startExam = async () => {
    if (!questionData?.parts.length || !isReadyToStart) return;
    setPartTimeoutMessage("");
    phaseExpiredRef.current = false;
    partIntroExpiredRef.current = false;
    setPartIndex(0);
    setQuestionIndex(0);
    setVisibleMicTestQuestionCount(0);
    setMicTestStartedAt(Date.now());
    setStage("mic_test");
  };

  const startCurrentQuestion = () => {
    if (!currentQuestion) return;
    pausePartIntroCountdown();
    if (partAudioRef.current) {
      partAudioRef.current.pause();
      partAudioRef.current.currentTime = 0;
    }
    setStage("part_instruction");
  };

  const jumpToPartForDev = useCallback(
    (nextPartIndex: number) => {
      if (!questionData?.parts[nextPartIndex]) return;

      pausePhaseCountdown();
      pauseMicTestCountdown();
      pauseExamNoticeCountdown();
      pausePartInstructionCountdown();
      pausePartIntroCountdown();
      clearMicTestQuestionTimeouts();
      phaseExpiredRef.current = false;
      partIntroExpiredRef.current = false;

      if (partAudioRef.current) {
        partAudioRef.current.pause();
        partAudioRef.current.currentTime = 0;
      }
      if (questionAudioRef.current) {
        questionAudioRef.current.pause();
        questionAudioRef.current.currentTime = 0;
      }
      void stopAnswerRecording();

      setPartTimeoutMessage("");
      setPersistStatus("");
      setQuestionStartAt(null);
      setVisibleMicTestQuestionCount(0);
      setMicTestStartedAt(null);
      setPartIndex(nextPartIndex);
      setQuestionIndex(0);
      setStage("part_intro");
    },
    [
      clearMicTestQuestionTimeouts,
      pauseExamNoticeCountdown,
      pauseMicTestCountdown,
      pausePartInstructionCountdown,
      pausePartIntroCountdown,
      pausePhaseCountdown,
      questionData?.parts,
      stopAnswerRecording,
    ],
  );

  const isDevPartJumpEnabled = process.env.NODE_ENV !== "production";
  const isExamMode =
    stage === "mic_test" ||
    stage === "exam_notice" ||
    stage === "part_intro" ||
    stage === "part_instruction" ||
    stage === "prep" ||
    stage === "answer";

  return (
    <main className={styles.main}>
      {isDevPartJumpEnabled ? (
        <nav className={styles.devPartJump} aria-label="Development part jump">
          <p className={styles.devPartJumpLabel}>DEV</p>
          {Array.from({ length: 4 }, (_, index) => {
            const part = questionData?.parts[index];
            return (
              <button
                key={index}
                type="button"
                className={`${styles.devPartJumpButton} ${partIndex === index ? styles.devPartJumpButtonActive : ""}`}
                onClick={() => jumpToPartForDev(index)}
                disabled={!part}
              >
                Part {index + 1}
              </button>
            );
          })}
        </nav>
      ) : null}

      {stage === "completed" ? (
        <section className={styles.completedScreen}>
          <article className={styles.completedCard}>
            <p className={styles.completedText}>これですべての問題は終わりです。</p>
            <p className={styles.completedText}>ありがとうございました。</p>
            {!!persistStatus && <p className={styles.completedStatus}>{persistStatus}</p>}
            <button className={styles.completedBtn} onClick={() => backToHome()}>
              終了
            </button>
          </article>
        </section>
      ) : stage === "saving" ? (
        <section className={styles.statusScreen}>
          <JapaneseText
            className={styles.statusScreenText}
            tokens={[
              { text: "問題", reading: "もんだい" },
              { text: "は" },
              { text: "終", reading: "お" },
              { text: "わりですが、" },
            ]}
          />
          <JapaneseText
            className={styles.statusScreenText}
            tokens={[
              { text: "もう" },
              { text: "少", reading: "すこ" },
              { text: "しお" },
              { text: "待", reading: "ま" },
              { text: "ちください。" },
            ]}
          />
        </section>
      ) : stage === "timeout" ? (
        <section className={styles.statusScreen}>
          <JapaneseText
            className={styles.timeoutScreenText}
            tokens={[
              { text: "タイムアウトにより、" },
              { text: "試験", reading: "しけん" },
              { text: "は" },
              { text: "失格", reading: "しっかく" },
              { text: "となります。" },
            ]}
          />
        </section>
      ) : isExamMode ? (
        <section className={styles.examFocusLayout}>
          {stage === "mic_test" ? (
            <article className={styles.stageScreenCard}>
              <div className={styles.stageScreenInner}>
                <h2 className={styles.stageScreenTitle}>マイクのテスト</h2>
                <JapaneseText
                  className={styles.stageScreenBody}
                  tokens={[
                    { text: "ではマイクのテストをします。" },
                    { text: "カメラを見て" },
                    { text: "質問", reading: "しつもん" },
                    { text: "に" },
                    { text: "答", reading: "こた" },
                    { text: "えてください。" },
                  ]}
                />

                {visibleMicTestQuestions > 0 ? (
                  <ol className={styles.micTestList}>
                    {MIC_TEST_QUESTIONS.slice(0, visibleMicTestQuestions).map((question) => (
                      <li key={question.id} className={styles.micTestItem}>
                        <span className={styles.micTestNumber}>{question.id}.</span>
                        <JapaneseText className={styles.micTestQuestion} tokens={question.tokens} />
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </article>
          ) : stage === "exam_notice" ? (
            <article className={styles.stageScreenCard}>
              <div className={styles.stageScreenInner}>
                <JapaneseText
                  className={styles.stageScreenTitle}
                  tokens={[
                    { text: "試験", reading: "しけん" },
                    { text: "を" },
                    { text: "始", reading: "はじ" },
                    { text: "めます。" },
                  ]}
                />

                <ul className={styles.examNoticeList}>
                  {EXAM_NOTICE_ITEMS.map((item, index) => (
                    <li key={index} className={styles.examNoticeItem}>
                      <span className={styles.examNoticeBullet} aria-hidden />
                      <JapaneseText className={styles.examNoticeText} tokens={item} />
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ) : stage === "part_instruction" && currentPart ? (
            <article className={styles.partInstructionScreen}>
              <div className={styles.partInstructionHeader}>
                <p className={styles.partInstructionBadge}>{currentPart.title}</p>
                {currentPart.introCategoryTokens ? (
                  <JapaneseText className={styles.partInstructionCategory} tokens={currentPart.introCategoryTokens} />
                ) : null}
              </div>

              <div className={styles.partInstructionCenter}>
                {currentPart.introHeadlineTokens ? (
                  <div className={styles.partInstructionHeadlinePill}>
                    <JapaneseText className={styles.partInstructionHeadlineText} tokens={currentPart.introHeadlineTokens} />
                  </div>
                ) : (
                  <p className={styles.partInstructionHeadlineText}>{currentPart.description}</p>
                )}

                {currentPart.introNoteLines ? (
                  <div className={styles.partInstructionNotes}>
                    {currentPart.introNoteLines.map((line, index) => (
                      <JapaneseText key={index} className={styles.partInstructionNoteLine} tokens={line} />
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ) : stage === "part_intro" && currentPart ? (
            <article className={styles.partIntroScreen}>
              <div className={styles.partIntroHeader}>
                {currentPart.introCategoryTokens ? (
                  <div className={styles.partIntroLabelBlock}>
                    <p className={styles.partIntroBadge}>{currentPart.title}</p>
                    <JapaneseText className={styles.partIntroCategory} tokens={currentPart.introCategoryTokens} />
                  </div>
                ) : (
                  <p className={styles.partIntroBadge}>{currentPart.title}</p>
                )}
                <div className={styles.partIntroTimer}>
                  <CountdownTimer label={timerLabel} seconds={timerValue} variant={timerVariant} />
                </div>
              </div>

              <div className={styles.partIntroCenter}>
                <JapaneseText
                  className={styles.partIntroDescription}
                  tokens={[
                    { text: `${currentPart.title} を` },
                    { text: "始", reading: "はじ" },
                    { text: "めます。" },
                  ]}
                />
                <JapaneseText
                  className={styles.partIntroDescription}
                  tokens={[
                    { text: "「スタート」を" },
                    { text: "押", reading: "お" },
                    { text: "してください。" },
                  ]}
                />

                <button className={`${styles.primaryBtn} ${styles.partIntroStartBtn}`} onClick={startCurrentQuestion}>
                  スタート
                </button>
              </div>

              <div className={styles.partIntroFooter}>
                <JapaneseText
                  className={styles.partIntroMeta}
                  tokens={[
                    { text: "60" },
                    { text: "秒", reading: "びょう" },
                    { text: "をすぎると、" },
                    { text: "試験", reading: "しけん" },
                    { text: "が" },
                    { text: "受", reading: "う" },
                    { text: "けられません。" },
                  ]}
                />
                <JapaneseText
                  className={styles.partIntroMeta}
                  tokens={[
                    { text: "「スタート」を" },
                    { text: "押", reading: "お" },
                    { text: "してください。" },
                  ]}
                />
              </div>

              {currentPart.introAudioUrl && (
                <audio ref={partAudioRef} preload="metadata" src={currentPart.introAudioUrl} hidden />
              )}
            </article>
          ) : (
            <article
              className={`${styles.card} ${isVisualQuestion ? styles.visualQuestionScreen : ""} ${
                isPart4VisualQuestion ? styles.part4QuestionScreen : ""
              }`}
            >
              {!isPart4VisualQuestion ? (
                <div className={styles.questionTopRow}>
                {currentPart ? (
                  <div className={styles.questionPartHeading}>
                    <p className={styles.questionPartTitle}>{currentPart.title}</p>
                    {currentPart.introCategoryTokens ? (
                      <JapaneseText className={styles.questionPartCategory} tokens={currentPart.introCategoryTokens} />
                    ) : null}
                  </div>
                ) : (
                  <div />
                )}
                <div className={styles.partIntroTimer}>
                  <CountdownTimer label={timerLabel} seconds={timerValue} variant={timerVariant} />
                </div>
                </div>
              ) : null}

            {stage === "part_intro" && currentPart ? (
              <div className={styles.stack}>
                <p>{currentPart.description}</p>
                {currentPart.introAudioUrl && (
                  <audio ref={partAudioRef} preload="metadata" src={currentPart.introAudioUrl} hidden />
                )}
                <button className={styles.primaryBtn} onClick={startCurrentQuestion}>
                  このパートを開始
                </button>
              </div>
            ) : (
              currentQuestion && (
                <div className={styles.stack}>
                  {currentQuestion.questionAudioUrl && (
                    <audio ref={questionAudioRef} preload="metadata" src={currentQuestion.questionAudioUrl} hidden />
                  )}
                  {stage === "answer" && !isPart3VisualQuestion && !isPart4VisualQuestion ? (
                    <JapaneseText
                      className={styles.answerPrompt}
                      tokens={[
                        { text: "答", reading: "こた" },
                        { text: "えてください。" },
                      ]}
                    />
                  ) : null}
                  {currentQuestion.imageUrl ? (
                    isPart4VisualQuestion ? (
                      <div className={styles.part4QuestionStage}>
                        <div className={styles.part4QuestionTimer}>
                          <CountdownTimer label={timerLabel} seconds={timerValue} variant={timerVariant} />
                        </div>
                        {currentQuestion.promptLines ? (
                          <div className={styles.part4QuestionPromptCard}>
                            {currentQuestion.questionLabelTokens ? (
                              <JapaneseText
                                className={styles.part4QuestionPromptLabel}
                                tokens={currentQuestion.questionLabelTokens}
                              />
                            ) : null}
                            <div className={styles.part4QuestionPromptBody}>
                              {currentQuestion.promptLines.map((line, index) => (
                                <JapaneseText key={index} className={styles.part4QuestionPromptLine} tokens={line} />
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div className={styles.part4QuestionImageWrap}>
                          <img
                            className={`${styles.part4QuestionImage} ${
                              stage === "answer" ? styles.part4QuestionImageMuted : ""
                            }`}
                            src={currentQuestion.imageUrl}
                            alt={currentQuestion.imageAlt ?? `Part 4 question ${questionNumberInPart}`}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className={styles.visualQuestionStage}>
                        <div className={styles.visualQuestionBadge}>{questionNumberInPart}番</div>
                        <div className={styles.visualQuestionImageCard}>
                          <img
                            className={`${styles.visualQuestionImage} ${
                              isPart3VisualQuestion && stage === "answer" ? styles.visualQuestionImageMuted : ""
                            }`}
                            src={currentQuestion.imageUrl}
                            alt={currentQuestion.imageAlt ?? `Part ${partIndex + 1} question ${questionNumberInPart}`}
                          />
                          {currentQuestion.imageLabelTokens ? (
                            <JapaneseText className={styles.visualQuestionLabel} tokens={currentQuestion.imageLabelTokens} />
                          ) : null}
                          {isPart3VisualQuestion && stage === "answer" ? (
                            <JapaneseText
                              className={styles.part3AnswerPrompt}
                              tokens={[{ text: "はなしてください。" }]}
                            />
                          ) : null}
                        </div>
                      </div>
                    )
                  ) : currentQuestion.promptLines ? (
                    <div className={`${styles.questionPromptCard} ${styles.readingPromptCard}`}>
                      {currentQuestion.promptLines.map((line, index) => (
                        <JapaneseText key={index} className={styles.readingPromptLine} tokens={line} />
                      ))}
                    </div>
                  ) : (
                    <div className={styles.questionPromptCard}>
                      <p className={styles.questionPromptLabel}>Question</p>
                      <p className={styles.questionPromptText}>{currentQuestion.prompt}</p>
                    </div>
                  )}
                </div>
              )
            )}
          </article>
          )}
        </section>
      ) : (
        <>
          <section className={styles.hero}>
            <div>
              <p className={styles.kicker}>Kotoba Speaking Exam</p>
              <h1>S-JEP スピーキング模擬試験</h1>
              <p className={styles.lead}>カメラ監視つきのスピーキング試験フローを体験できます。</p>
            </div>
            <p className={styles.serverTime}>サーバー時刻: {serverTime}</p>
          </section>

          <section className={styles.examLayout}>
            <article className={`${styles.card} ${styles.desktopCameraCard}`}>
              <h2>試験開始</h2>
              {!!loadError && <p className={styles.errorText}>{loadError}</p>}
              {stage === "home" && (
                <div className={styles.stack}>
                  {!!partTimeoutMessage && <p className={styles.errorText}>{partTimeoutMessage}</p>}
                  <p>全 {totalQuestions} 問です。</p>
                  <div className={styles.precheckPanel}>
                    <div className={styles.iconReminderRow} aria-hidden>
                      <div className={styles.banIcon}>
                        <NoHatIcon />
                      </div>
                      <div className={styles.banIcon}>
                        <NoGlassesIcon />
                      </div>
                      <div className={styles.banIcon}>
                        <NoMaskIcon />
                      </div>
                    </div>
                    {!!cameraError && (
                      <div className={styles.precheckActions}>
                        <button
                          className={styles.secondaryBtn}
                          onClick={() => void ensureDevicesReady()}
                          disabled={isCheckingDevices}
                          aria-busy={isCheckingDevices}
                        >
                          Retry camera and mic
                        </button>
                      </div>
                    )}
                    {!!deviceCheckStatus && <p className={styles.precheckStatus}>{deviceCheckStatus}</p>}
                    {!!cameraError && <p className={styles.errorText}>{cameraError}</p>}
                    <div className={styles.mobileCameraSection}>
                      <div className={styles.iconReminderRow} aria-hidden>
                        <div className={styles.banIcon}>
                          <NoHatIcon />
                        </div>
                        <div className={styles.banIcon}>
                          <NoGlassesIcon />
                        </div>
                        <div className={styles.banIcon}>
                          <NoMaskIcon />
                        </div>
                      </div>
                      <h3>カメラ確認</h3>
                      <div className={styles.cameraShell}>
                        <video ref={mobileVideoRef} autoPlay muted playsInline className={styles.camera} />
                      </div>
                      <div className={styles.audioMeterTrack}>
                        <span className={styles.audioMeterMid} />
                        <span className={styles.audioMeterFill} style={{ width: `${audioLevel}%` }} />
                      </div>
                      {!!deviceCheckStatus && <p className={styles.precheckStatus}>{deviceCheckStatus}</p>}
                    </div>
                  </div>
                  <button
                    className={styles.primaryBtn}
                    onClick={() => void startExam()}
                    disabled={!isReadyToStart || isCheckingDevices}
                    aria-busy={isCheckingDevices}
                  >
                    模擬試験を開始
                  </button>
                  {!!startExamHint && <p className={styles.buttonHint}>{startExamHint}</p>}
                </div>
              )}


              {stage === "disqualified" && (
                <div className={styles.failBox}>
                  <h3>試験は中断されました</h3>
                  <p>重大違反が3回検出されました。</p>
                </div>
              )}
            </article>

            <article className={`${styles.card} ${styles.cameraCenterCard}`}>
              <div className={styles.iconReminderRow} aria-hidden>
                <div className={styles.banIcon}>
                  <NoHatIcon />
                </div>
                <div className={styles.banIcon}>
                  <NoGlassesIcon />
                </div>
                <div className={styles.banIcon}>
                  <NoMaskIcon />
                </div>
              </div>
              <h2>カメラ確認</h2>
              <div className={styles.cameraShell}>
                <video ref={videoRef} autoPlay muted playsInline className={styles.camera} />
              </div>
              <div className={styles.audioMeterTrack}>
                <span className={styles.audioMeterMid} />
                <span className={styles.audioMeterFill} style={{ width: `${audioLevel}%` }} />
              </div>
              {!!deviceCheckStatus && <p className={styles.precheckStatus}>{deviceCheckStatus}</p>}
              {!!cameraError && (
                <div className={styles.precheckActions}>
                  <button
                    className={styles.secondaryBtn}
                    onClick={() => void ensureDevicesReady()}
                    disabled={isCheckingDevices}
                    aria-busy={isCheckingDevices}
                  >
                    Retry camera and mic
                  </button>
                </div>
              )}
              <button
                className={styles.primaryBtn}
                onClick={() => void startExam()}
                disabled={!isReadyToStart || isCheckingDevices}
                aria-busy={isCheckingDevices}
              >
                模擬試験を開始
              </button>
              {!!startExamHint && <p className={styles.buttonHint}>{startExamHint}</p>}
            </article>
          </section>
        </>
      )}

      {highRiskPopup && (
        <div className={styles.highRiskPopup} role="alert">
          <p>{highRiskPopup}</p>
        </div>
      )}

      {isExamMode && (
        <>
          <div className={styles.cameraFloating}>
            <video ref={videoRef} autoPlay muted playsInline className={styles.camera} />
          </div>
          <div className={styles.audioMeterFloating}>
            <div className={styles.audioMeterTrack}>
              <span className={styles.audioMeterMid} />
              <span className={styles.audioMeterFill} style={{ width: `${audioLevel}%` }} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}

