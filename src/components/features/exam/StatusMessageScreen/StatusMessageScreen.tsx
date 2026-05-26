import styles from "@/components/features/exam/Exam.module.css";
import { JapaneseText } from "@/components/common/JapaneseText";
import type { FuriganaToken } from "@/types";

export type StatusMessageScreenProps = {
  className?: string;
  lines: FuriganaToken[][];
};

export const StatusMessageScreen = ({ className = styles.statusScreenText, lines }: StatusMessageScreenProps) => {
  return (
    <section className={styles.statusScreen}>
      {lines.map((tokens, index) => (
        <JapaneseText key={index} className={className} tokens={tokens} />
      ))}
    </section>
  );
};
