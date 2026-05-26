import styles from "@/components/features/exam/Exam.module.css";
import { JapaneseText } from "@/components/common/JapaneseText";
import type { FuriganaToken } from "@/types";

export type ExamNoticeScreenProps = {
  items: FuriganaToken[][];
  titleTokens: FuriganaToken[];
};

export const ExamNoticeScreen = ({ items, titleTokens }: ExamNoticeScreenProps) => {
  return (
    <article className={styles.stageScreenCard}>
      <div className={styles.stageScreenInner}>
        <JapaneseText className={styles.stageScreenTitle} tokens={titleTokens} />

        <ul className={styles.examNoticeList}>
          {items.map((item, index) => (
            <li key={index} className={styles.examNoticeItem}>
              <span className={styles.examNoticeBullet} aria-hidden />
              <JapaneseText className={styles.examNoticeText} tokens={item} />
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
};
