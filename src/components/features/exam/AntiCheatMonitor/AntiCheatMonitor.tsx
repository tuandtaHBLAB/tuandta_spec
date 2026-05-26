"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import styles from "@/components/features/exam/Exam.module.css";
import { DevPartJump } from "@/components/features/exam/DevPartJump";
import { ExamAudioAssets } from "@/components/features/exam/ExamAudioAssets";
import { FloatingProctor } from "@/components/features/exam/FloatingProctor";
import { isFocusedExamStage } from "@/helpers";
import { HomeScreen } from "@/components/features/exam/HomeScreen";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ExamNoticeScreen } from "@/components/features/exam/ExamNoticeScreen";
import { MicTestScreen } from "@/components/features/exam/MicTestScreen";
import { PartInstructionScreen } from "@/components/features/exam/PartInstructionScreen";
import { PartIntroScreen } from "@/components/features/exam/PartIntroScreen";
import { QuestionScreen } from "@/components/features/exam/QuestionScreen";
import { CompletedExamScreen } from "@/components/features/exam/CompletedExamScreen";
import { StatusMessageScreen } from "@/components/features/exam/StatusMessageScreen";
import type { CountdownTimerVariant, ExamStage, FuriganaToken, Part, Question } from "@/types";
import { useCountdown } from "@/hooks";
import { getDictionary } from "@/i18n/dictionaries";
import { defaultLocale, type Locale } from "@/i18n/config";

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

type QuestionData = {
  parts: Part[];
};

type PartAnswerForScoring = {
  examSessionId: string;
  partId: string;
  partTitle: string;
  questionId: string;
  questionPrompt: string;
  referenceText: string | null;
  assessmentMode: "scripted" | "unscripted";
  startedAt: string;
  endedAt: string;
  audioBlob: Blob | null;
};

type PartScore = {
  provider: string;
  examSessionId: string;
  partId: string;
  partTitle: string;
  language: string;
  scoredAt: string;
  summary: {
    questionCount: number;
    pronunciationScore: number;
    accuracyScore: number;
    fluencyScore: number;
  };
  questions: Array<{
    questionId: string;
    questionPrompt: string;
    assessmentMode: "scripted" | "unscripted";
    mockTranscript: string | null;
    audio: {
      fileName: string;
      size: number;
    };
    azurePronunciation: {
      pronunciationScore: number;
      accuracyScore: number;
      fluencyScore: number;
      completenessScore: number | null;
      referenceText: string | null;
      languageNote: string;
    };
  }>;
};

const safePlay = async (media: HTMLMediaElement | null) => {
  if (!media) return;
  try {
    await media.play();
  } catch {
    // Ignore play interruptions caused by source reloads or rapid state changes.
  }
};

const LOOK_AWAY_DEG = 25;
const HEAD_DOWN_DEG = 20;
const MAX_HIGH_RISK = 3;
const MIC_TEST_SECONDS = 60;
const EXAM_NOTICE_SECONDS = 20;
const PART_INSTRUCTION_SECONDS = 10;

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

const MIC_TEST_QUESTION_START_MS = [0, 15_000, 31_000, 46_000];
const START_CAMERA_TEST_AUDIO_URL = "/sound/Start_camera_test.mp3";
const START_PRESS_NEXT_AUDIO_URL = "/sound/Start_Press_Next.mp3";
const START_MIC_TEST_AUDIO_URL = "/sound/Start_mic_test.mp3";
const START_LET_START_AUDIO_URL = "/sound/Start_Let_Start.mp3";
const END_AUDIO_URL = "/sound/End.mp3";
const PART1_START_AUDIO_URL = "/sound/Part1/Part1_start.mp3";
const PART1_INTRO_AUDIO_URL = "/sound/Part1/Part1_intro.mp3";
const PART1_PREP_AUDIO_URL = "/sound/Part1/Part1_15sec.mp3";
const PART1_PLEASE_READ_AUDIO_URL = "/sound/Part1/Part1_Please_Read.mp3";
const PART1_INSTRUCTION_SECONDS = 11;
const SPEECH_ASSESSMENT_LANGUAGE = "ja-JP";

export function AntiCheatMonitor({ locale, serverTime }: { locale: Locale; serverTime: string }) {
  const dictionary = getDictionary(locale ?? defaultLocale);
  const ui = dictionary.exam;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseExpiredRef = useRef(false);
  const partIntroExpiredRef = useRef(false);
  const startCameraTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const startPressNextAudioRef = useRef<HTMLAudioElement | null>(null);
  const startMicTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const startLetStartAudioRef = useRef<HTMLAudioElement | null>(null);
  const endAudioRef = useRef<HTMLAudioElement | null>(null);
  const part1StartAudioRef = useRef<HTMLAudioElement | null>(null);
  const part1IntroAudioRef = useRef<HTMLAudioElement | null>(null);
  const part1PrepAudioRef = useRef<HTMLAudioElement | null>(null);
  const part1PleaseReadAudioRef = useRef<HTMLAudioElement | null>(null);
  const partAudioRef = useRef<HTMLAudioElement | null>(null);
  const partInstructionAudioRef = useRef<HTMLAudioElement | null>(null);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const answerAudioRef = useRef<HTMLAudioElement | null>(null);
  const answerRecorderRef = useRef<MediaRecorder | null>(null);
  const answerChunksRef = useRef<BlobPart[]>([]);
  const examSessionIdRef = useRef(crypto.randomUUID());
  const partAnswersForScoringRef = useRef<Record<string, PartAnswerForScoring[]>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioMeterFrameRef = useRef<number | null>(null);
  const lastAudioMeterUpdateRef = useRef(0);
  const lastAudioLevelRef = useRef(0);
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
  const [, setIsCameraChecked] = useState(false);
  const [, setIsMicChecked] = useState(false);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [detectorStatus, setDetectorStatus] = useState(ui.detectorInitialStatus);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const [highRiskCount, setHighRiskCount] = useState(0);
  const [highRiskPopup, setHighRiskPopup] = useState<string | null>(null);
  const [persistStatus, setPersistStatus] = useState("");
  const [partScores, setPartScores] = useState<PartScore[]>([]);
  const [partTimeoutMessage, setPartTimeoutMessage] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [visibleMicTestQuestionCount, setVisibleMicTestQuestionCount] = useState(0);
  const [isHomePrecheckComplete, setIsHomePrecheckComplete] = useState(false);

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
        setLoadError(ui.loadError);
      }
    })();
  }, [ui.loadError]);

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
          setHighRiskPopup(ui.highRiskWarning(ui.violationLabels[type], next, MAX_HIGH_RISK));
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
      ui,
    ],
  );

  const initDetector = useCallback(async () => {
    if (faceLandmarkerRef.current) return;
    setDetectorStatus(ui.detectorLoading);

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
    setDetectorStatus(ui.detectorReady);
  }, [ui.detectorLoading, ui.detectorReady]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setDeviceCheckStatus(ui.openingDevices);
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
      setDeviceCheckStatus(ui.devicesReady);
      setIsCameraReady(true);
      return true;
    } catch {
      setIsCameraChecked(false);
      setIsMicChecked(false);
      setCameraError(ui.cameraStartError);
      setDetectorStatus(ui.detectorError);
      setIsCameraReady(false);
      return false;
    }
  }, [initDetector, ui.cameraStartError, ui.detectorError, ui.devicesReady, ui.openingDevices]);

  const checkMicAndCamera = useCallback(async () => {
    if (isCheckingDevices) return;
    setIsCheckingDevices(true);
    setCameraError("");
    setDeviceCheckStatus(ui.checkingDevices);
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
        setDeviceCheckStatus(ui.missingDevice);
        return;
      }

      setDeviceCheckStatus(ui.devicesCheckComplete);
    } catch {
      setDeviceCheckStatus(ui.devicesListError);
    }
    setIsCheckingDevices(false);
  }, [isCheckingDevices, startCamera, ui.checkingDevices, ui.devicesCheckComplete, ui.devicesListError, ui.missingDevice]);

  const ensureDevicesReady = useCallback(async () => {
    if (isCheckingDevices) return false;
    setIsCheckingDevices(true);

    if (streamRef.current && micStreamRef.current && isCameraReady) {
      setCameraError("");
      setIsCameraChecked(true);
      setIsMicChecked(true);
      setDeviceCheckStatus(ui.devicesReady);
      setIsCheckingDevices(false);
      return true;
    }

    const started = await startCamera();
    setIsCheckingDevices(false);
    return started;
  }, [isCameraReady, isCheckingDevices, startCamera, ui.devicesReady]);

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
      setDeviceCheckStatus(ui.cameraCheckComplete);
    } catch {
      setIsCameraChecked(false);
      setCameraError(ui.cameraAccessError);
    }
  }, [ui.cameraAccessError, ui.cameraCheckComplete]);

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
      setDeviceCheckStatus(ui.micCheckComplete);
    } catch {
      setIsMicChecked(false);
      setCameraError(ui.micAccessError);
    }
  }, [ui.micAccessError, ui.micCheckComplete]);

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
    if (startCameraTestAudioRef.current) {
      startCameraTestAudioRef.current.pause();
      startCameraTestAudioRef.current.currentTime = 0;
    }
    if (startPressNextAudioRef.current) {
      startPressNextAudioRef.current.pause();
      startPressNextAudioRef.current.currentTime = 0;
    }
    if (startMicTestAudioRef.current) {
      startMicTestAudioRef.current.pause();
      startMicTestAudioRef.current.currentTime = 0;
    }
    if (startLetStartAudioRef.current) {
      startLetStartAudioRef.current.pause();
      startLetStartAudioRef.current.currentTime = 0;
    }
    [
      part1StartAudioRef.current,
      part1IntroAudioRef.current,
      part1PrepAudioRef.current,
      part1PleaseReadAudioRef.current,
    ].forEach((audio) => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    });
    if (partAudioRef.current) {
      partAudioRef.current.pause();
      partAudioRef.current.currentTime = 0;
    }
    if (partInstructionAudioRef.current) {
      partInstructionAudioRef.current.pause();
      partInstructionAudioRef.current.currentTime = 0;
    }
    if (questionAudioRef.current) {
      questionAudioRef.current.pause();
      questionAudioRef.current.currentTime = 0;
    }
    if (answerAudioRef.current) {
      answerAudioRef.current.pause();
      answerAudioRef.current.currentTime = 0;
    }
    void stopAnswerRecording();
    setStage("home");
    setPartIndex(0);
    setQuestionIndex(0);
    setQuestionStartAt(null);
    setVisibleMicTestQuestionCount(0);
    setIsHomePrecheckComplete(false);
    setHighRiskCount(0);
    setPersistStatus("");
    setPartScores([]);
    examSessionIdRef.current = crypto.randomUUID();
    partAnswersForScoringRef.current = {};
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

  const scorePartAnswers = useCallback(async (part: Part) => {
    const answers = partAnswersForScoringRef.current[part.id] ?? [];
    if (answers.length === 0) return null;

    const formData = new FormData();
    const payload = {
      examSessionId: examSessionIdRef.current,
      partId: part.id,
      partTitle: part.title,
      language: SPEECH_ASSESSMENT_LANGUAGE,
      questions: answers.map((answer, index) => {
        const audioField = `audio_${answer.questionId}`;
        if (answer.audioBlob) {
          formData.append(
            audioField,
            new File([answer.audioBlob], `${answer.partId}_${answer.questionId}.webm`, {
              type: answer.audioBlob.type || "audio/webm",
            }),
          );
        }

        return {
          questionId: answer.questionId,
          questionPrompt: answer.questionPrompt,
          referenceText: answer.referenceText,
          assessmentMode: answer.assessmentMode,
          startedAt: answer.startedAt,
          endedAt: answer.endedAt,
          audioField,
          audioFileName: `${answer.partId}_${answer.questionId}.webm`,
          audioSize: answer.audioBlob?.size ?? 0,
          order: index + 1,
        };
      }),
    };

    formData.append("payload", JSON.stringify(payload));

    const response = await fetch("/api/exam/score-part", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Cannot score part");

    const score = (await response.json()) as PartScore;
    setPartScores((prev) => {
      const others = prev.filter((item) => item.partId !== score.partId);
      return [...others, score].sort((a, b) => a.partId.localeCompare(b.partId));
    });
    setPersistStatus(ui.scorePersisted(part.title, score.summary.pronunciationScore));
    return score;
  }, [ui]);

  const saveQuestionArtifacts = useCallback(
    async (endedAt: string, audioBlob: Blob | null) => {
      if (!currentPart || !currentQuestion || !questionStartAt) return null;

      const inRange = (timestamp: string) => {
        const value = new Date(timestamp).getTime();
        return value >= new Date(questionStartAt).getTime() && value <= new Date(endedAt).getTime();
      };

      const questionViolations = logs.filter((item) => inRange(item.timestamp));
      const questionSnapshots = snapshots.filter((item) => inRange(item.timestamp));
      const warnings = questionViolations.filter((item) => item.severity === "WARNING").length;

      const payload = {
        examSessionId: examSessionIdRef.current,
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
        setPersistStatus(ui.saveFailed);
        return null;
      }

      const data = (await response.json()) as { folderName: string };
      setPersistStatus(ui.savedFolder(data.folderName));

      const answerForScoring: PartAnswerForScoring = {
        examSessionId: examSessionIdRef.current,
        partId: currentPart.id,
        partTitle: currentPart.title,
        questionId: currentQuestion.id,
        questionPrompt: currentQuestion.prompt,
        referenceText: currentPart.id === "part1" ? currentQuestion.prompt : null,
        assessmentMode: currentPart.id === "part1" ? "scripted" : "unscripted",
        startedAt: questionStartAt,
        endedAt,
        audioBlob,
      };

      partAnswersForScoringRef.current[currentPart.id] = [
        ...(partAnswersForScoringRef.current[currentPart.id] ?? []).filter(
          (item) => item.questionId !== currentQuestion.id,
        ),
        answerForScoring,
      ];

      return answerForScoring;
    },
    [currentPart, currentQuestion, highRiskCount, logs, questionStartAt, snapshots, ui],
  );

  const gotoNextQuestion = useCallback(async () => {
    if (!questionData || !currentPart || !currentQuestion) return;

    pausePhaseCountdown();
    const isLastQuestionInPart = questionIndex >= currentPart.questions.length - 1;
    const isLastPart = partIndex >= questionData.parts.length - 1;

    if (isLastQuestionInPart) {
      setStage("saving");
    }

    try {
      const endedAt = new Date().toISOString();
      const audioBlob = await stopAnswerRecording();
      await saveQuestionArtifacts(endedAt, audioBlob);
      if (isLastQuestionInPart) {
        await scorePartAnswers(currentPart);
      }
    } catch {
      setPersistStatus(ui.saveOrScoreFailed);
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
    scorePartAnswers,
    startAnswerRecording,
    startPhaseCountdown,
    stopAnswerRecording,
    ui,
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
    startPartInstructionCountdown(
      currentPart?.instructionSeconds ??
        (currentPart?.id === "part1" ? PART1_INSTRUCTION_SECONDS : PART_INSTRUCTION_SECONDS),
    );
    return () => pausePartInstructionCountdown();
  }, [
    currentPart?.id,
    currentPart?.instructionSeconds,
    pausePartInstructionCountdown,
    stage,
    startPartInstructionCountdown,
  ]);

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
    micTestQuestionTimeoutsRef.current = MIC_TEST_QUESTION_START_MS.map((startMs, index) =>
      window.setTimeout(
        () => setVisibleMicTestQuestionCount(index + 1),
        startMs,
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
    const audio = startCameraTestAudioRef.current;
    if (!audio) return;

    if (stage !== "home") {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    audio.currentTime = 0;
    void safePlay(audio);

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [stage]);

  useEffect(() => {
    const audio = startMicTestAudioRef.current;
    if (!audio) return;

    if (stage !== "mic_test") {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    audio.currentTime = 0;
    void safePlay(audio);

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [stage]);

  useEffect(() => {
    const audio = startLetStartAudioRef.current;
    if (!audio) return;

    if (stage !== "exam_notice") {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    audio.currentTime = 0;
    void safePlay(audio);

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [stage]);

  useEffect(() => {
    const audio = endAudioRef.current;
    if (!audio) return;

    if (stage !== "completed") {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    audio.currentTime = 0;
    void safePlay(audio);

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== "part_intro") return;
    if (currentPart?.id === "part1") {
      if (!part1StartAudioRef.current) return;
      part1StartAudioRef.current.currentTime = 0;
      void safePlay(part1StartAudioRef.current);
      return;
    }
    if (!currentPart?.startAudioUrl || !partAudioRef.current) return;
    partAudioRef.current.currentTime = 0;
    void safePlay(partAudioRef.current);
  }, [currentPart?.id, currentPart?.startAudioUrl, stage]);

  useEffect(() => {
    if (stage !== "part_instruction") return;
    if (currentPart?.id === "part1") {
      if (!part1IntroAudioRef.current) return;
      part1IntroAudioRef.current.currentTime = 0;
      void safePlay(part1IntroAudioRef.current);
      return;
    }
    if (!currentPart?.introAudioUrl || !partInstructionAudioRef.current) return;
    partInstructionAudioRef.current.currentTime = 0;
    void safePlay(partInstructionAudioRef.current);
  }, [currentPart?.id, currentPart?.introAudioUrl, stage]);

  useEffect(() => {
    if (stage !== "prep") return;
    if (currentPart?.id === "part1") {
      if (!part1PrepAudioRef.current) return;
      part1PrepAudioRef.current.currentTime = 0;
      void safePlay(part1PrepAudioRef.current);
      return;
    }
    if (!currentQuestion?.questionAudioUrl || !questionAudioRef.current) return;
    questionAudioRef.current.currentTime = 0;
    void safePlay(questionAudioRef.current);
  }, [currentPart?.id, currentQuestion?.id, currentQuestion?.questionAudioUrl, stage]);

  useEffect(() => {
    if (stage !== "answer") return;
    if (currentPart?.id === "part1") {
      if (!part1PleaseReadAudioRef.current) return;
      part1PleaseReadAudioRef.current.currentTime = 0;
      void safePlay(part1PleaseReadAudioRef.current);
      return;
    }
    if (!currentQuestion?.answerAudioUrl || !answerAudioRef.current) return;
    answerAudioRef.current.currentTime = 0;
    void safePlay(answerAudioRef.current);
  }, [currentPart?.id, currentQuestion?.answerAudioUrl, currentQuestion?.id, stage]);

  const totalQuestions = useMemo(
    () => questionData?.parts.reduce((acc, part) => acc + part.questions.length, 0) ?? 0,
    [questionData],
  );

  const questionNumberInPart = questionIndex + 1;
  const isVisualQuestion = !!currentQuestion?.imageUrl;
  const isPart2VisualQuestion = currentPart?.id === "part2" && isVisualQuestion;
  const isPart3VisualQuestion = currentPart?.id === "part3" && isVisualQuestion;
  const isPart4VisualQuestion = currentPart?.id === "part4" && isVisualQuestion;
  const timerLabel = stage === "part_intro" ? ui.timer.startIn : stage === "prep" ? ui.timer.prep : ui.timer.answer;
  const timerValue = stage === "part_intro" ? partIntroRemainingSeconds : phaseRemainingSeconds;
  const timerVariant: CountdownTimerVariant = stage === "prep" ? "prep" : stage === "answer" ? "answer" : "default";
  const visibleMicTestQuestions = stage === "mic_test" ? visibleMicTestQuestionCount : 0;
  const isReadyToStart = !!questionData;
  const homeStartButtonText = isHomePrecheckComplete ? ui.home.next : ui.home.start;
  const startExamHint = isCheckingDevices
    ? ui.home.openingHint
    : !isReadyToStart
      ? ui.home.loadingQuestionsHint
      : "";
  const totalScoredQuestions = partScores.reduce((sum, score) => sum + score.summary.questionCount, 0);
  const finalPronunciationScore =
    partScores.length === 0
      ? 0
      : Math.round(
          partScores.reduce(
            (sum, score) => sum + score.summary.pronunciationScore * score.summary.questionCount,
            0,
          ) / Math.max(1, totalScoredQuestions),
        );

  const startExam = async () => {
    if (!questionData?.parts.length || !isReadyToStart || isCheckingDevices) return;
    if (!isHomePrecheckComplete) {
      if (startCameraTestAudioRef.current) {
        startCameraTestAudioRef.current.pause();
        startCameraTestAudioRef.current.currentTime = 0;
      }
      if (startPressNextAudioRef.current) {
        startPressNextAudioRef.current.currentTime = 0;
        void safePlay(startPressNextAudioRef.current);
      }
      const devicesReady = await ensureDevicesReady();
      if (!devicesReady) return;
      setIsHomePrecheckComplete(true);
      return;
    }

    setPartTimeoutMessage("");
    phaseExpiredRef.current = false;
    partIntroExpiredRef.current = false;
    examSessionIdRef.current = crypto.randomUUID();
    partAnswersForScoringRef.current = {};
    setPartScores([]);
    setPartIndex(0);
    setQuestionIndex(0);
    setVisibleMicTestQuestionCount(0);
    setStage("mic_test");
  };

  const startCurrentQuestion = () => {
    if (!currentQuestion) return;
    pausePartIntroCountdown();
    if (partAudioRef.current) {
      partAudioRef.current.pause();
      partAudioRef.current.currentTime = 0;
    }
    if (partInstructionAudioRef.current) {
      partInstructionAudioRef.current.pause();
      partInstructionAudioRef.current.currentTime = 0;
    }
    if (part1StartAudioRef.current) {
      part1StartAudioRef.current.pause();
      part1StartAudioRef.current.currentTime = 0;
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
      if (partInstructionAudioRef.current) {
        partInstructionAudioRef.current.pause();
        partInstructionAudioRef.current.currentTime = 0;
      }
      [
        part1StartAudioRef.current,
        part1IntroAudioRef.current,
        part1PrepAudioRef.current,
        part1PleaseReadAudioRef.current,
      ].forEach((audio) => {
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
      });
      if (questionAudioRef.current) {
        questionAudioRef.current.pause();
        questionAudioRef.current.currentTime = 0;
      }
      if (answerAudioRef.current) {
        answerAudioRef.current.pause();
        answerAudioRef.current.currentTime = 0;
      }
      void stopAnswerRecording();

      setPartTimeoutMessage("");
      setPersistStatus("");
      setQuestionStartAt(null);
      setVisibleMicTestQuestionCount(0);
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
  const isExamMode = isFocusedExamStage(stage);
  const timer = {
    label: timerLabel,
    seconds: timerValue,
    suffix: ui.timer.suffix,
    variant: timerVariant,
  };

  return (
    <main className={styles.main}>
      <LanguageSwitcher locale={locale} />
      <ExamAudioAssets
        endAudioRef={endAudioRef}
        part1IntroAudioRef={part1IntroAudioRef}
        part1PleaseReadAudioRef={part1PleaseReadAudioRef}
        part1PrepAudioRef={part1PrepAudioRef}
        part1StartAudioRef={part1StartAudioRef}
        startCameraTestAudioRef={startCameraTestAudioRef}
        startLetStartAudioRef={startLetStartAudioRef}
        startMicTestAudioRef={startMicTestAudioRef}
        startPressNextAudioRef={startPressNextAudioRef}
        urls={{
          end: END_AUDIO_URL,
          part1Intro: PART1_INTRO_AUDIO_URL,
          part1PleaseRead: PART1_PLEASE_READ_AUDIO_URL,
          part1Prep: PART1_PREP_AUDIO_URL,
          part1Start: PART1_START_AUDIO_URL,
          startCameraTest: START_CAMERA_TEST_AUDIO_URL,
          startLetStart: START_LET_START_AUDIO_URL,
          startMicTest: START_MIC_TEST_AUDIO_URL,
          startPressNext: START_PRESS_NEXT_AUDIO_URL,
        }}
      />
      {isDevPartJumpEnabled ? (
        <DevPartJump
          activePartIndex={partIndex}
          ariaLabel={ui.devPartJumpAriaLabel}
          label={ui.devLabel}
          onJump={jumpToPartForDev}
          partLabel={ui.devPartLabel}
          parts={questionData?.parts}
        />
      ) : null}

      {stage === "completed" ? (
        <CompletedExamScreen
          accuracyLabel={ui.completed.accuracy}
          finalPronunciationScore={finalPronunciationScore}
          finishLabel={ui.completed.finish}
          fluencyLabel={ui.completed.fluency}
          kicker={ui.completed.kicker}
          onFinish={backToHome}
          persistStatus={persistStatus}
          pronunciationLabel={ui.completed.pronunciation}
          scores={partScores}
          text={ui.completed.text}
        />
      ) : stage === "saving" ? (
        <StatusMessageScreen lines={ui.savingTokens} />
      ) : stage === "timeout" ? (
        <StatusMessageScreen className={styles.timeoutScreenText} lines={[ui.timeoutTokens]} />
      ) : isExamMode ? (
        <section className={styles.examFocusLayout}>
          {stage === "mic_test" ? (
            <MicTestScreen
              bodyTokens={ui.micTest.bodyTokens}
              questions={MIC_TEST_QUESTIONS}
              title={ui.micTest.title}
              visibleQuestionCount={visibleMicTestQuestions}
            />
          ) : stage === "exam_notice" ? (
            <ExamNoticeScreen items={ui.examNotice.items} titleTokens={ui.examNotice.titleTokens} />
          ) : stage === "part_instruction" && currentPart ? (
            <PartInstructionScreen audioRef={partInstructionAudioRef} part={currentPart} />
          ) : stage === "part_intro" && currentPart ? (
            <PartIntroScreen
              audioRef={partAudioRef}
              onStart={startCurrentQuestion}
              part={currentPart}
              timer={timer}
              ui={ui.partIntro}
            />
          ) : (
            <QuestionScreen
              answerAudioRef={answerAudioRef}
              currentPart={currentPart}
              currentQuestion={currentQuestion}
              isPart2VisualQuestion={isPart2VisualQuestion}
              isPart3VisualQuestion={isPart3VisualQuestion}
              isPart4VisualQuestion={isPart4VisualQuestion}
              isVisualQuestion={isVisualQuestion}
              onStartCurrentQuestion={startCurrentQuestion}
              partAudioRef={partAudioRef}
              partIndex={partIndex}
              questionAudioRef={questionAudioRef}
              questionNumberInPart={questionNumberInPart}
              stage={stage}
              timer={timer}
              ui={ui}
            />
          )}
        </section>
      ) : (
        <HomeScreen
          audioLevel={audioLevel}
          cameraError={cameraError}
          deviceCheckStatus={deviceCheckStatus}
          homeStartButtonText={homeStartButtonText}
          isCheckingDevices={isCheckingDevices}
          isDisqualified={stage === "disqualified"}
          isHomeStage={stage === "home"}
          isReadyToStart={isReadyToStart}
          loadError={loadError}
          mobileVideoRef={mobileVideoRef}
          onEnsureDevicesReady={() => void ensureDevicesReady()}
          onStartExam={() => void startExam()}
          partTimeoutMessage={partTimeoutMessage}
          serverTime={serverTime}
          startExamHint={startExamHint}
          totalQuestions={totalQuestions}
          ui={ui.home}
          videoRef={videoRef}
        />
      )}

      {highRiskPopup && (
        <div className={styles.highRiskPopup} role="alert">
          <p>{highRiskPopup}</p>
        </div>
      )}

      {isExamMode && (
        <FloatingProctor audioLevel={audioLevel} videoRef={videoRef} />
      )}
    </main>
  );
}

