import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type SaveQuestionPayload = {
  partId: string;
  questionId: string;
  questionPrompt: string;
  startedAt: string;
  endedAt: string;
  highRiskCount: number;
  warnings: number;
  violations: Array<{
    id: string;
    type: string;
    severity: string;
    durationMs: number;
    timestamp: string;
  }>;
  snapshots: Array<{
    id: string;
    reason: string;
    timestamp: string;
    image: string;
  }>;
};

export async function POST(request: Request) {
  try {
    let payload: SaveQuestionPayload;
    let audioFile: File | null = null;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const payloadRaw = formData.get("payload");
      if (typeof payloadRaw !== "string") {
        return NextResponse.json({ error: "Missing payload" }, { status: 400 });
      }
      payload = JSON.parse(payloadRaw) as SaveQuestionPayload;
      const file = formData.get("audio");
      if (file instanceof File) audioFile = file;
    } else {
      payload = (await request.json()) as SaveQuestionPayload;
    }

    if (!payload?.partId || !payload?.questionId) {
      return NextResponse.json({ error: "Missing partId or questionId" }, { status: 400 });
    }

    const folderName = `${payload.partId}_${payload.questionId}`;
    const root = path.join(process.cwd(), "exam-artifacts");
    const folderPath = path.join(root, folderName);

    await mkdir(folderPath, { recursive: true });

    const summary = {
      partId: payload.partId,
      questionId: payload.questionId,
      questionPrompt: payload.questionPrompt,
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
      highRiskCount: payload.highRiskCount,
      warnings: payload.warnings,
      snapshotCount: payload.snapshots.length,
      nextStep: "Send artifacts to Azure AI scoring pipeline",
    };

    await writeFile(path.join(folderPath, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
    await writeFile(path.join(folderPath, "violations.json"), JSON.stringify(payload.violations, null, 2), "utf-8");
    await writeFile(path.join(folderPath, "snapshots.json"), JSON.stringify(payload.snapshots, null, 2), "utf-8");
    if (audioFile && audioFile.size > 0) {
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      await writeFile(path.join(folderPath, "answer.webm"), audioBuffer);
    }

    return NextResponse.json({ ok: true, folderName, folderPath });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cannot save question artifacts",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
