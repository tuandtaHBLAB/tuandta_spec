import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type ScorePartQuestionPayload = {
  questionId: string;
  questionPrompt: string;
  referenceText: string | null;
  assessmentMode: "scripted" | "unscripted";
  startedAt: string;
  endedAt: string;
  audioField: string;
  audioFileName: string;
  audioSize: number;
};

type ScorePartPayload = {
  examSessionId?: string;
  partId: string;
  partTitle: string;
  language: string;
  questions: ScorePartQuestionPayload[];
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const safePathSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);

function mockQuestionScore(question: ScorePartQuestionPayload, index: number) {
  const lengthFactor = Math.min(18, Math.round(question.audioSize / 18_000));
  const modeBonus = question.assessmentMode === "scripted" ? 4 : 0;
  const base = 68 + lengthFactor + modeBonus - index * 2;

  const accuracyScore = clampScore(base + 3);
  const fluencyScore = clampScore(base - 2);
  const completenessScore =
    question.assessmentMode === "scripted" ? clampScore(base + 1) : null;
  const pronunciationScore = clampScore(
    question.assessmentMode === "scripted"
      ? accuracyScore * 0.45 + fluencyScore * 0.3 + (completenessScore ?? 0) * 0.25
      : accuracyScore * 0.58 + fluencyScore * 0.42,
  );

  return {
    questionId: question.questionId,
    questionPrompt: question.questionPrompt,
    assessmentMode: question.assessmentMode,
    mockTranscript:
      question.assessmentMode === "scripted"
        ? question.referenceText
        : `Mock transcript for ${question.questionId}. Replace this with Azure Speech recognized text.`,
    audio: {
      fileName: question.audioFileName,
      size: question.audioSize,
    },
    azurePronunciation: {
      pronunciationScore,
      accuracyScore,
      fluencyScore,
      completenessScore,
      referenceText: question.referenceText,
      languageNote:
        "Mocked response. Real Azure Speech Pronunciation Assessment should use the audio plus language/referenceText.",
    },
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const payloadRaw = formData.get("payload");

    if (typeof payloadRaw !== "string") {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    const payload = JSON.parse(payloadRaw) as ScorePartPayload;

    if (!payload.partId || !Array.isArray(payload.questions)) {
      return NextResponse.json({ error: "Missing partId or questions" }, { status: 400 });
    }

    const questions = payload.questions.map((question, index) => {
      const audio = formData.get(question.audioField);
      const audioSize = audio instanceof File ? audio.size : question.audioSize;

      return mockQuestionScore(
        {
          ...question,
          audioFileName: audio instanceof File ? audio.name : question.audioFileName,
          audioSize,
        },
        index,
      );
    });

    const averagePronunciationScore = clampScore(
      questions.reduce((sum, question) => sum + question.azurePronunciation.pronunciationScore, 0) /
        Math.max(1, questions.length),
    );
    const averageAccuracyScore = clampScore(
      questions.reduce((sum, question) => sum + question.azurePronunciation.accuracyScore, 0) /
        Math.max(1, questions.length),
    );
    const averageFluencyScore = clampScore(
      questions.reduce((sum, question) => sum + question.azurePronunciation.fluencyScore, 0) /
        Math.max(1, questions.length),
    );

    const result = {
      ok: true,
      provider: "mock-azure-speech",
      examSessionId: safePathSegment(payload.examSessionId || crypto.randomUUID()),
      partId: payload.partId,
      partTitle: payload.partTitle,
      language: payload.language,
      scoredAt: new Date().toISOString(),
      summary: {
        questionCount: questions.length,
        pronunciationScore: averagePronunciationScore,
        accuracyScore: averageAccuracyScore,
        fluencyScore: averageFluencyScore,
      },
      questions,
    };

    const sessionId = result.examSessionId;
    const partFolder = safePathSegment(payload.partId);
    const partPath = path.join(process.cwd(), "exam-artifacts", sessionId, partFolder);
    await mkdir(partPath, { recursive: true });
    await writeFile(path.join(partPath, "part-score.json"), JSON.stringify(result, null, 2), "utf-8");

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cannot score part",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
