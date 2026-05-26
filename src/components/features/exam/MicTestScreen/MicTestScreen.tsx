import styles from "@/components/features/exam/Exam.module.css";
import { JapaneseText } from "@/components/common/JapaneseText";
import type { FuriganaToken } from "@/types";

type MicTestQuestion = {
  id: number;
  tokens: FuriganaToken[];
};

export type MicTestScreenProps = {
  questions: MicTestQuestion[];
  title: string;
  bodyTokens: FuriganaToken[];
  visibleQuestionCount: number;
};

export const MicTestScreen = ({ bodyTokens, questions, title, visibleQuestionCount }: MicTestScreenProps) => {
  return (
    <article className={styles.stageScreenCard}>
      <div className={styles.stageScreenInner}>
        <h2 className={styles.stageScreenTitle}>{title}</h2>
        <JapaneseText className={styles.stageScreenBody} tokens={bodyTokens} />

        <ol className={styles.micTestList}>
          {questions.map((question, index) => (
            <li key={question.id} className={styles.micTestItem}>
              <span className={styles.micTestNumber}>{question.id}.</span>
              {index < visibleQuestionCount ? (
                <JapaneseText className={styles.micTestQuestion} tokens={question.tokens} />
              ) : (
                <span className={styles.micTestQuestion} aria-hidden />
              )}
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
};
