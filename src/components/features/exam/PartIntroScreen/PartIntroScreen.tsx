import type { RefObject } from "react";
import styles from "@/components/features/exam/Exam.module.css";
import { CountdownTimer } from "@/components/common/CountdownTimer";
import { JapaneseText } from "@/components/common/JapaneseText";
import type { CountdownTimerVariant, Part } from "@/types";
import type { Dictionary } from "@/i18n/dictionaries";

type TimerProps = {
  label: string;
  seconds: number;
  suffix: string;
  variant: CountdownTimerVariant;
};

export type PartIntroScreenProps = {
  audioRef: RefObject<HTMLAudioElement | null>;
  onStart: () => void;
  part: Part;
  timer: TimerProps;
  ui: Dictionary["exam"]["partIntro"];
};

export const PartIntroScreen = ({ audioRef, onStart, part, timer, ui }: PartIntroScreenProps) => {
  return (
    <article className={styles.partIntroScreen}>
      <div className={styles.partIntroHeader}>
        {part.introCategoryTokens ? (
          <div className={styles.partIntroLabelBlock}>
            <p className={styles.partIntroBadge}>{part.title}</p>
            <JapaneseText className={styles.partIntroCategory} tokens={part.introCategoryTokens} />
          </div>
        ) : (
          <p className={styles.partIntroBadge}>{part.title}</p>
        )}
        <div className={styles.partIntroTimer}>
          <CountdownTimer label={timer.label} seconds={timer.seconds} suffix={timer.suffix} variant={timer.variant} />
        </div>
      </div>

      <div className={styles.partIntroCenter}>
        <JapaneseText className={styles.partIntroDescription} tokens={ui.startPartTokens(part.title)} />
        <JapaneseText className={styles.partIntroDescription} tokens={ui.pressStartTokens} />

        <button className={`${styles.primaryBtn} ${styles.partIntroStartBtn}`} onClick={onStart}>
          {ui.startButton}
        </button>
      </div>

      <div className={styles.partIntroFooter}>
        <JapaneseText className={styles.partIntroMeta} tokens={ui.timeoutTokens} />
        <JapaneseText className={styles.partIntroMeta} tokens={ui.pressStartTokens} />
      </div>

      {part.startAudioUrl ? <audio ref={audioRef} preload="metadata" src={part.startAudioUrl} hidden /> : null}
    </article>
  );
};
