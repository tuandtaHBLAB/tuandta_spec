import type { RefObject } from "react";
import styles from "@/components/features/exam/Exam.module.css";
import { CountdownTimer } from "@/components/common/CountdownTimer";
import { JapaneseText } from "@/components/common/JapaneseText";
import type { CountdownTimerVariant, ExamStage, Part, Question } from "@/types";
import type { Dictionary } from "@/i18n/dictionaries";

type TimerProps = {
  label: string;
  seconds: number;
  suffix: string;
  variant: CountdownTimerVariant;
};

export type QuestionScreenProps = {
  answerAudioRef: RefObject<HTMLAudioElement | null>;
  currentPart: Part | null;
  currentQuestion: Question | null;
  isPart2VisualQuestion: boolean;
  isPart3VisualQuestion: boolean;
  isPart4VisualQuestion: boolean;
  isVisualQuestion: boolean;
  onStartCurrentQuestion: () => void;
  partAudioRef: RefObject<HTMLAudioElement | null>;
  partIndex: number;
  questionAudioRef: RefObject<HTMLAudioElement | null>;
  questionNumberInPart: number;
  stage: ExamStage;
  timer: TimerProps;
  ui: Dictionary["exam"];
};

export function QuestionScreen({
  answerAudioRef,
  currentPart,
  currentQuestion,
  isPart2VisualQuestion,
  isPart3VisualQuestion,
  isPart4VisualQuestion,
  isVisualQuestion,
  onStartCurrentQuestion,
  partAudioRef,
  partIndex,
  questionAudioRef,
  questionNumberInPart,
  stage,
  timer,
  ui,
}: QuestionScreenProps) {
  return (
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
            <CountdownTimer
              label={timer.label}
              seconds={timer.seconds}
              suffix={timer.suffix}
              variant={timer.variant}
            />
          </div>
        </div>
      ) : null}

      {stage === "part_intro" && currentPart ? (
        <div className={styles.stack}>
          <p>{currentPart.description}</p>
          {currentPart.introAudioUrl ? (
            <audio ref={partAudioRef} preload="metadata" src={currentPart.introAudioUrl} hidden />
          ) : null}
          <button className={styles.primaryBtn} onClick={onStartCurrentQuestion}>
            {ui.partIntro.fallbackStartButton}
          </button>
        </div>
      ) : (
        currentQuestion && (
          <div className={styles.stack}>
            {currentQuestion.questionAudioUrl ? (
              <audio ref={questionAudioRef} preload="metadata" src={currentQuestion.questionAudioUrl} hidden />
            ) : null}
            {currentQuestion.answerAudioUrl ? (
              <audio ref={answerAudioRef} preload="metadata" src={currentQuestion.answerAudioUrl} hidden />
            ) : null}
            {stage === "answer" && !isVisualQuestion ? (
              <JapaneseText className={styles.answerPrompt} tokens={ui.answerPromptTokens} />
            ) : null}
            {currentQuestion.imageUrl ? (
              isPart4VisualQuestion ? (
                <Part4VisualQuestion
                  currentQuestion={currentQuestion}
                  questionNumberInPart={questionNumberInPart}
                  stage={stage}
                  timer={timer}
                />
              ) : (
                <VisualQuestion
                  currentQuestion={currentQuestion}
                  isPart2VisualQuestion={isPart2VisualQuestion}
                  isPart3VisualQuestion={isPart3VisualQuestion}
                  partIndex={partIndex}
                  questionNumberInPart={questionNumberInPart}
                  stage={stage}
                  ui={ui}
                />
              )
            ) : currentQuestion.promptLines ? (
              <div className={`${styles.questionPromptCard} ${styles.readingPromptCard}`}>
                {currentQuestion.promptLines.map((line, index) => (
                  <JapaneseText key={index} className={styles.readingPromptLine} tokens={line} />
                ))}
              </div>
            ) : (
              <div className={styles.questionPromptCard}>
                <p className={styles.questionPromptLabel}>{ui.genericQuestionLabel}</p>
                <p className={styles.questionPromptText}>{currentQuestion.prompt}</p>
              </div>
            )}
          </div>
        )
      )}
    </article>
  );
}

type Part4VisualQuestionProps = {
  currentQuestion: Question;
  questionNumberInPart: number;
  stage: ExamStage;
  timer: TimerProps;
};

function Part4VisualQuestion({ currentQuestion, questionNumberInPart, stage, timer }: Part4VisualQuestionProps) {
  return (
    <div className={styles.part4QuestionStage}>
      <div className={styles.part4QuestionTimer}>
        <CountdownTimer label={timer.label} seconds={timer.seconds} suffix={timer.suffix} variant={timer.variant} />
      </div>
      {currentQuestion.promptLines ? (
        <div className={styles.part4QuestionPromptCard}>
          {currentQuestion.questionLabelTokens ? (
            <JapaneseText className={styles.part4QuestionPromptLabel} tokens={currentQuestion.questionLabelTokens} />
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
          className={`${styles.part4QuestionImage} ${stage === "answer" ? styles.part4QuestionImageMuted : ""}`}
          src={currentQuestion.imageUrl}
          alt={currentQuestion.imageAlt ?? `Part 4 question ${questionNumberInPart}`}
        />
      </div>
    </div>
  );
}

type VisualQuestionProps = {
  currentQuestion: Question;
  isPart2VisualQuestion: boolean;
  isPart3VisualQuestion: boolean;
  partIndex: number;
  questionNumberInPart: number;
  stage: ExamStage;
  ui: Dictionary["exam"];
};

function VisualQuestion({
  currentQuestion,
  isPart2VisualQuestion,
  isPart3VisualQuestion,
  partIndex,
  questionNumberInPart,
  stage,
  ui,
}: VisualQuestionProps) {
  return (
    <div className={styles.visualQuestionStage}>
      <div className={styles.visualQuestionBadge}>{ui.visualQuestionNumber(questionNumberInPart)}</div>
      <div className={styles.visualQuestionImageCard}>
        <img
          className={`${styles.visualQuestionImage} ${
            (isPart2VisualQuestion || isPart3VisualQuestion) && stage === "answer"
              ? styles.visualQuestionImageMuted
              : ""
          }`}
          src={currentQuestion.imageUrl}
          alt={currentQuestion.imageAlt ?? `Part ${partIndex + 1} question ${questionNumberInPart}`}
        />
        {currentQuestion.imageLabelTokens ? (
          <JapaneseText className={styles.visualQuestionLabel} tokens={currentQuestion.imageLabelTokens} />
        ) : null}
        {isPart3VisualQuestion && stage === "answer" ? (
          <JapaneseText className={styles.part3AnswerPrompt} tokens={ui.part3AnswerPromptTokens} />
        ) : null}
        {isPart2VisualQuestion && stage === "answer" ? (
          <JapaneseText className={styles.visualAnswerPrompt} tokens={ui.answerPromptTokens} />
        ) : null}
      </div>
    </div>
  );
}
