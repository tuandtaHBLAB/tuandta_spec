import type { RefObject } from "react";
import styles from "@/components/features/exam/Exam.module.css";
import { JapaneseText } from "@/components/common/JapaneseText";
import type { Part } from "@/types";

export type PartInstructionScreenProps = {
  audioRef: RefObject<HTMLAudioElement | null>;
  part: Part;
};

export const PartInstructionScreen = ({ audioRef, part }: PartInstructionScreenProps) => {
  return (
    <article className={styles.partInstructionScreen}>
      <div className={styles.partInstructionHeader}>
        <p className={styles.partInstructionBadge}>{part.title}</p>
        {part.introCategoryTokens ? (
          <JapaneseText className={styles.partInstructionCategory} tokens={part.introCategoryTokens} />
        ) : null}
      </div>

      <div className={styles.partInstructionCenter}>
        {part.introHeadlineTokens ? (
          <div className={styles.partInstructionHeadlinePill}>
            <JapaneseText className={styles.partInstructionHeadlineText} tokens={part.introHeadlineTokens} />
          </div>
        ) : (
          <p className={styles.partInstructionHeadlineText}>{part.description}</p>
        )}

        {part.introNoteLines ? (
          <div className={styles.partInstructionNotes}>
            {part.introNoteLines.map((line, index) => (
              <JapaneseText key={index} className={styles.partInstructionNoteLine} tokens={line} />
            ))}
          </div>
        ) : null}
      </div>

      {part.introAudioUrl && part.id !== "part1" ? (
        <audio ref={audioRef} preload="metadata" src={part.introAudioUrl} hidden />
      ) : null}
    </article>
  );
};
