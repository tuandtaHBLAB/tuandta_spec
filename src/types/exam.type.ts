export type FuriganaToken = {
  text: string;
  reading?: string;
};

export type Question = {
  id: string;
  prompt: string;
  promptLines?: FuriganaToken[][];
  imageUrl?: string;
  imageAlt?: string;
  imageLabelTokens?: FuriganaToken[];
  questionLabelTokens?: FuriganaToken[];
  questionAudioUrl?: string;
  answerAudioUrl?: string;
  prepSeconds: number;
  answerSeconds: number;
  tips: string;
};

export type Part = {
  id: string;
  title: string;
  description: string;
  introCategoryTokens?: FuriganaToken[];
  introHeadlineTokens?: FuriganaToken[];
  introNoteLines?: FuriganaToken[][];
  startAudioUrl?: string;
  introAudioUrl?: string;
  instructionSeconds?: number;
  startWithinSeconds: number;
  questions: Question[];
};

export type ExamStage =
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

export type CountdownTimerVariant = "default" | "prep" | "answer";

export type ResultPartScore = {
  partId: string;
  partTitle: string;
  summary: {
    questionCount: number;
    pronunciationScore: number;
    accuracyScore: number;
    fluencyScore: number;
  };
  questions: Array<{
    questionId: string;
    azurePronunciation: {
      pronunciationScore: number;
    };
  }>;
};
