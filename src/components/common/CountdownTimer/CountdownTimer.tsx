import { memo } from "react";
import styles from "./CountdownTimer.module.css";

type CountdownTimerVariant = "default" | "prep" | "answer";

type CountdownTimerProps = {
  label: string;
  seconds: number;
  variant?: CountdownTimerVariant;
  suffix?: string;
};

const variantClassName: Record<CountdownTimerVariant, string> = {
  default: "",
  prep: styles.prep,
  answer: styles.answer,
};

export const CountdownTimer = memo(function CountdownTimer({
  label,
  seconds,
  variant = "default",
  suffix = "s",
}: CountdownTimerProps) {
  const className = [styles.root, variantClassName[variant]].filter(Boolean).join(" ");

  return (
    <div className={className} role="status" aria-live="polite">
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {seconds}
        {suffix}
      </span>
    </div>
  );
});

CountdownTimer.displayName = "CountdownTimer";
