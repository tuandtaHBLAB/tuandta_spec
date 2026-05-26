import styles from "@/components/features/exam/Exam.module.css";
import type { ResultPartScore } from "@/types";

export type CompletedExamScreenProps = {
  accuracyLabel: string;
  finishLabel: string;
  finalPronunciationScore: number;
  fluencyLabel: string;
  kicker: string;
  onFinish: () => void;
  persistStatus: string;
  pronunciationLabel: string;
  scores: ResultPartScore[];
  text: string;
};

export const CompletedExamScreen = ({
  accuracyLabel,
  finishLabel,
  finalPronunciationScore,
  fluencyLabel,
  kicker,
  onFinish,
  persistStatus,
  pronunciationLabel,
  scores,
  text,
}: CompletedExamScreenProps) => {
  return (
    <section className={styles.completedScreen}>
      <article className={styles.completedCard}>
        <p className={styles.completedKicker}>{kicker}</p>
        <p className={styles.completedText}>{text}</p>
        <div className={styles.resultScorePanel}>
          <span className={styles.resultScoreLabel}>{pronunciationLabel}</span>
          <strong className={styles.resultScoreValue}>{finalPronunciationScore}</strong>
          <span className={styles.resultScoreMax}>/100</span>
        </div>
        <div className={styles.resultPartGrid}>
          {scores.map((score) => (
            <section key={score.partId} className={styles.resultPartCard}>
              <div className={styles.resultPartHeader}>
                <span className={styles.resultPartTitle}>{score.partTitle}</span>
                <strong className={styles.resultPartScore}>{score.summary.pronunciationScore}</strong>
              </div>
              <div className={styles.resultMetricRow}>
                <span>{accuracyLabel}</span>
                <strong>{score.summary.accuracyScore}</strong>
              </div>
              <div className={styles.resultMetricRow}>
                <span>{fluencyLabel}</span>
                <strong>{score.summary.fluencyScore}</strong>
              </div>
              <div className={styles.resultQuestionList}>
                {score.questions.map((question) => (
                  <div key={question.questionId} className={styles.resultQuestionItem}>
                    <span>{question.questionId.toUpperCase()}</span>
                    <strong>{question.azurePronunciation.pronunciationScore}</strong>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        {!!persistStatus && <p className={styles.completedStatus}>{persistStatus}</p>}
        <button className={styles.completedBtn} onClick={onFinish}>
          {finishLabel}
        </button>
      </article>
    </section>
  );
};
