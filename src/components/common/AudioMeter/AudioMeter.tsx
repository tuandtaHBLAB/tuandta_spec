import styles from "@/components/features/exam/Exam.module.css";

type AudioMeterProps = {
  level: number;
};

export function AudioMeter({ level }: AudioMeterProps) {
  return (
    <div className={styles.audioMeterTrack}>
      <span className={styles.audioMeterMid} />
      <span className={styles.audioMeterFill} style={{ width: `${level}%` }} />
    </div>
  );
}
