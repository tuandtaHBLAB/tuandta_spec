import { defaultLocale, type Locale } from "./config";
import type { FuriganaToken } from "@/types";

type ExamDictionary = {
  metadata: {
    title: string;
    titleTemplate: string;
    description: string;
    openGraphLocale: string;
  };
  languageSwitcher: {
    ariaLabel: string;
  };
  exam: {
    checkpoints: string[];
    violationLabels: Record<string, string>;
    detectorInitialStatus: string;
    loadError: string;
    detectorLoading: string;
    detectorReady: string;
    detectorError: string;
    openingDevices: string;
    devicesReady: string;
    cameraStartError: string;
    checkingDevices: string;
    missingDevice: string;
    devicesCheckComplete: string;
    devicesListError: string;
    cameraCheckComplete: string;
    cameraAccessError: string;
    micCheckComplete: string;
    micAccessError: string;
    highRiskWarning: (label: string, count: number, max: number) => string;
    scorePersisted: (partTitle: string, score: number) => string;
    saveFailed: string;
    savedFolder: (folderName: string) => string;
    saveOrScoreFailed: string;
    timer: {
      startIn: string;
      prep: string;
      answer: string;
      suffix: string;
    };
    home: {
      kicker: string;
      title: string;
      lead: string;
      serverTime: string;
      examStartTitle: string;
      totalQuestions: (count: number) => string;
      start: string;
      next: string;
      openingHint: string;
      loadingQuestionsHint: string;
      cameraConfirm: string;
      retryDevices: string;
      disqualifiedTitle: string;
      disqualifiedDescription: string;
    };
    completed: {
      kicker: string;
      text: string;
      pronunciation: string;
      accuracy: string;
      fluency: string;
      finish: string;
    };
    savingTokens: FuriganaToken[][];
    timeoutTokens: FuriganaToken[];
    micTest: {
      title: string;
      bodyTokens: FuriganaToken[];
    };
    examNotice: {
      titleTokens: FuriganaToken[];
      items: FuriganaToken[][];
    };
    partIntro: {
      startPartTokens: (partTitle: string) => FuriganaToken[];
      pressStartTokens: FuriganaToken[];
      timeoutTokens: FuriganaToken[];
      startButton: string;
      fallbackStartButton: string;
    };
    answerPromptTokens: FuriganaToken[];
    part3AnswerPromptTokens: FuriganaToken[];
    visualQuestionNumber: (questionNumber: number) => string;
    genericQuestionLabel: string;
    devLabel: string;
    devPartJumpAriaLabel: string;
    devPartLabel: (partNumber: number) => string;
  };
};

const dictionaries: Record<Locale, ExamDictionary> = {
  ja: {
    metadata: {
      title: "S-JEP スピーキング模擬試験",
      titleTemplate: "%s | S-JEP スピーキング模擬試験",
      description: "カメラ認証と不正防止モニタリングを備えたスピーキング模擬試験画面です。",
      openGraphLocale: "ja_JP",
    },
    languageSwitcher: {
      ariaLabel: "表示言語を切り替え",
    },
    exam: {
      checkpoints: [
        "帽子・マスク・サングラスは外してください。",
        "顔が正面に映るよう、明るい場所で受験してください。",
        "試験中はタブ切り替えやブラウザ離脱をしないでください。",
        "マイク付きイヤホンと安定した通信環境を準備してください。",
      ],
      violationLabels: {
        FACE_MISSING: "顔の未検出",
        MULTIPLE_FACES: "複数人の映り込み",
        LOOK_AWAY: "視線逸脱",
        HEAD_DOWN: "下向き姿勢",
        TAB_SWITCH: "タブ切り替え",
        BROWSER_BLUR: "ブラウザ離脱",
      },
      detectorInitialStatus: "フェイス検出は未初期化です",
      loadError: "模擬問題データの読み込みに失敗しました。",
      detectorLoading: "フェイス検出モデルを読み込み中...",
      detectorReady: "フェイス検出の準備が完了しました",
      detectorError: "フェイス検出の初期化でエラーが発生しました",
      openingDevices: "カメラとマイクを起動しています...",
      devicesReady: "カメラとマイクの準備が完了しました。",
      cameraStartError: "カメラを起動できません。権限設定を確認して再試行してください。",
      checkingDevices: "マイクとカメラを確認しています...",
      missingDevice: "カメラまたはマイクが見つかりません。両方の接続を確認してください。",
      devicesCheckComplete: "チェック完了: カメラとマイクは利用可能です。",
      devicesListError: "カメラは起動しましたが、デバイス一覧を確認できませんでした。",
      cameraCheckComplete: "カメラチェック完了",
      cameraAccessError: "カメラにアクセスできません。権限を確認してください。",
      micCheckComplete: "マイクチェック完了",
      micAccessError: "マイクにアクセスできません。権限を確認してください。",
      highRiskWarning: (label, count, max) => `重大警告: ${label}（${count}/${max}）`,
      scorePersisted: (partTitle, score) => `${partTitle} 採点完了: ${score}/100`,
      saveFailed: "試験データの保存に失敗しました。サーバーログを確認してください。",
      savedFolder: (folderName) => `保存先フォルダ: ${folderName}`,
      saveOrScoreFailed: "保存または採点時にエラーが発生しましたが、試験は継続します。",
      timer: {
        startIn: "開始まで",
        prep: "準備",
        answer: "回答",
        suffix: "秒",
      },
      home: {
        kicker: "Kotoba Speaking Exam",
        title: "S-JEP スピーキング模擬試験",
        lead: "カメラ監視つきのスピーキング試験フローを体験できます。",
        serverTime: "サーバー時刻",
        examStartTitle: "試験開始",
        totalQuestions: (count) => `全 ${count} 問です。`,
        start: "模擬試験を開始",
        next: "次へ",
        openingHint: "カメラとマイクを起動しています。しばらくお待ちください。",
        loadingQuestionsHint: "問題の準備が完了するまでお待ちください。",
        cameraConfirm: "カメラ確認",
        retryDevices: "カメラとマイクを再試行",
        disqualifiedTitle: "試験は中断されました",
        disqualifiedDescription: "重大違反が3回検出されました。",
      },
      completed: {
        kicker: "Mock Azure Speech Result",
        text: "これですべての問題は終わりです。",
        pronunciation: "発音",
        accuracy: "正確性",
        fluency: "流暢さ",
        finish: "終了",
      },
      savingTokens: [
        [
          { text: "問題", reading: "もんだい" },
          { text: "は" },
          { text: "終", reading: "お" },
          { text: "わりですが、" },
        ],
        [
          { text: "もう" },
          { text: "少", reading: "すこ" },
          { text: "しお" },
          { text: "待", reading: "ま" },
          { text: "ちください。" },
        ],
      ],
      timeoutTokens: [
        { text: "タイムアウトにより、" },
        { text: "試験", reading: "しけん" },
        { text: "は" },
        { text: "失格", reading: "しっかく" },
        { text: "となります。" },
      ],
      micTest: {
        title: "マイクのテスト",
        bodyTokens: [
          { text: "ではマイクのテストをします。" },
          { text: "カメラを見て" },
          { text: "質問", reading: "しつもん" },
          { text: "に" },
          { text: "答", reading: "こた" },
          { text: "えてください。" },
        ],
      },
      examNotice: {
        titleTokens: [
          { text: "試験", reading: "しけん" },
          { text: "を" },
          { text: "始", reading: "はじ" },
          { text: "めます。" },
        ],
        items: [
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
        ],
      },
      partIntro: {
        startPartTokens: (partTitle) => [
          { text: `${partTitle} を` },
          { text: "始", reading: "はじ" },
          { text: "めます。" },
        ],
        pressStartTokens: [
          { text: "「スタート」を" },
          { text: "押", reading: "お" },
          { text: "してください。" },
        ],
        timeoutTokens: [
          { text: "60" },
          { text: "秒", reading: "びょう" },
          { text: "をすぎると、" },
          { text: "試験", reading: "しけん" },
          { text: "が" },
          { text: "受", reading: "う" },
          { text: "けられません。" },
        ],
        startButton: "スタート",
        fallbackStartButton: "このパートを開始",
      },
      answerPromptTokens: [
        { text: "答", reading: "こた" },
        { text: "えてください。" },
      ],
      part3AnswerPromptTokens: [{ text: "はなしてください。" }],
      visualQuestionNumber: (questionNumber) => `${questionNumber}番`,
      genericQuestionLabel: "Question",
      devLabel: "DEV",
      devPartJumpAriaLabel: "Development part jump",
      devPartLabel: (partNumber) => `Part ${partNumber}`,
    },
  },
  en: {
    metadata: {
      title: "S-JEP Speaking Mock Exam",
      titleTemplate: "%s | S-JEP Speaking Mock Exam",
      description: "A speaking mock exam screen with camera verification and anti-cheat monitoring.",
      openGraphLocale: "en_US",
    },
    languageSwitcher: {
      ariaLabel: "Switch display language",
    },
    exam: {
      checkpoints: [
        "Remove hats, masks, and sunglasses.",
        "Take the exam in a bright place with your face centered on camera.",
        "Do not switch tabs or leave the browser during the exam.",
        "Prepare a headset with a microphone and a stable internet connection.",
      ],
      violationLabels: {
        FACE_MISSING: "Face not detected",
        MULTIPLE_FACES: "Multiple people detected",
        LOOK_AWAY: "Looking away",
        HEAD_DOWN: "Head facing down",
        TAB_SWITCH: "Tab switch",
        BROWSER_BLUR: "Browser left focus",
      },
      detectorInitialStatus: "Face detection is not initialized",
      loadError: "Failed to load mock question data.",
      detectorLoading: "Loading face detection model...",
      detectorReady: "Face detection is ready",
      detectorError: "Face detection initialization failed",
      openingDevices: "Opening camera and mic...",
      devicesReady: "Camera and mic are ready.",
      cameraStartError: "Could not start the camera. Check permissions and try again.",
      checkingDevices: "Checking mic and camera...",
      missingDevice: "Camera or microphone was not found. Check both devices.",
      devicesCheckComplete: "Check complete: camera and microphone are available.",
      devicesListError: "Camera started, but the device list could not be verified.",
      cameraCheckComplete: "Camera check complete",
      cameraAccessError: "Cannot access the camera. Check your permissions.",
      micCheckComplete: "Microphone check complete",
      micAccessError: "Cannot access the microphone. Check your permissions.",
      highRiskWarning: (label, count, max) => `High-risk warning: ${label} (${count}/${max})`,
      scorePersisted: (partTitle, score) => `Scored ${partTitle}: ${score}/100`,
      saveFailed: "Failed to save exam data. Please check the server logs.",
      savedFolder: (folderName) => `Saved folder: ${folderName}`,
      saveOrScoreFailed: "Saving or scoring failed, but the exam will continue.",
      timer: {
        startIn: "Starts in",
        prep: "Prep",
        answer: "Answer",
        suffix: "s",
      },
      home: {
        kicker: "Kotoba Speaking Exam",
        title: "S-JEP Speaking Mock Exam",
        lead: "Experience a camera-monitored speaking exam flow.",
        serverTime: "Server time",
        examStartTitle: "Start exam",
        totalQuestions: (count) => `${count} questions total.`,
        start: "Start mock exam",
        next: "Next",
        openingHint: "Camera and mic are opening. Please wait.",
        loadingQuestionsHint: "Please wait until questions are ready.",
        cameraConfirm: "Camera check",
        retryDevices: "Retry camera and mic",
        disqualifiedTitle: "The exam has been stopped",
        disqualifiedDescription: "Three high-risk violations were detected.",
      },
      completed: {
        kicker: "Mock Azure Speech Result",
        text: "All questions are complete.",
        pronunciation: "Pronunciation",
        accuracy: "Accuracy",
        fluency: "Fluency",
        finish: "Finish",
      },
      savingTokens: [[{ text: "The question is complete," }], [{ text: "please wait a moment." }]],
      timeoutTokens: [{ text: "The exam is disqualified due to timeout." }],
      micTest: {
        title: "Microphone test",
        bodyTokens: [{ text: "We will test your microphone. Look at the camera and answer the questions." }],
      },
      examNotice: {
        titleTokens: [{ text: "The exam will start." }],
        items: [
          [{ text: "The exam takes about 15 minutes." }],
          [{ text: "There are 8 questions in total." }],
          [{ text: "After starting, you cannot go back or stop midway." }],
        ],
      },
      partIntro: {
        startPartTokens: (partTitle) => [{ text: `${partTitle} will start.` }],
        pressStartTokens: [{ text: "Press Start." }],
        timeoutTokens: [{ text: "If 60 seconds pass, you will not be able to take the exam." }],
        startButton: "Start",
        fallbackStartButton: "Start this part",
      },
      answerPromptTokens: [{ text: "Please answer." }],
      part3AnswerPromptTokens: [{ text: "Please speak." }],
      visualQuestionNumber: (questionNumber) => `Question ${questionNumber}`,
      genericQuestionLabel: "Question",
      devLabel: "DEV",
      devPartJumpAriaLabel: "Development part jump",
      devPartLabel: (partNumber) => `Part ${partNumber}`,
    },
  },
};

export type Dictionary = ExamDictionary;

export function getDictionary(locale: Locale): ExamDictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
