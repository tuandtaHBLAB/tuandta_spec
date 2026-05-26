import type { ExamStage } from "@/types";

export function isFocusedExamStage(stage: ExamStage) {
  return (
    stage === "mic_test" ||
    stage === "exam_notice" ||
    stage === "part_intro" ||
    stage === "part_instruction" ||
    stage === "prep" ||
    stage === "answer"
  );
}
