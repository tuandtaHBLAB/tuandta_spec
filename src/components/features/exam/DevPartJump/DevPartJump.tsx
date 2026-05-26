import styles from "@/components/features/exam/Exam.module.css";
import type { Part } from "@/types";

export type DevPartJumpProps = {
  activePartIndex: number;
  ariaLabel: string;
  label: string;
  onJump: (partIndex: number) => void;
  partLabel: (partNumber: number) => string;
  parts: Part[] | undefined;
  partCount?: number;
};

export function DevPartJump({
  activePartIndex,
  ariaLabel,
  label,
  onJump,
  partCount = 4,
  partLabel,
  parts,
}: DevPartJumpProps) {
  return (
    <nav className={styles.devPartJump} aria-label={ariaLabel}>
      <p className={styles.devPartJumpLabel}>{label}</p>
      {Array.from({ length: partCount }, (_, index) => {
        const part = parts?.[index];
        return (
          <button
            key={index}
            type="button"
            className={`${styles.devPartJumpButton} ${
              activePartIndex === index ? styles.devPartJumpButtonActive : ""
            }`}
            onClick={() => onJump(index)}
            disabled={!part}
          >
            {partLabel(index + 1)}
          </button>
        );
      })}
    </nav>
  );
}
