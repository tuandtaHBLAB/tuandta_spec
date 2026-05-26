import styles from "@/components/features/exam/Exam.module.css";

function BanOverlay() {
  return (
    <>
      <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="2.2" fill="none" />
      <path d="M13 35L35 13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

function NoHatIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden focusable="false">
      <BanOverlay />
      <path
        d="M14 26C14 21 18.5 18 24 18C29.5 18 34 21 34 26V27H14V26Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path d="M10 30H38" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function NoGlassesIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden focusable="false">
      <BanOverlay />
      <rect x="12" y="21" width="10" height="7" rx="2.2" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="26" y="21" width="10" height="7" rx="2.2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M22 24H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function NoMaskIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden focusable="false">
      <BanOverlay />
      <rect x="16" y="20" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M16 23C14 23 13 24 12 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 23C34 23 35 24 36 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 25H28M20 28H28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ProctoringReminderIcons() {
  return (
    <div className={styles.iconReminderRow} aria-hidden>
      <div className={styles.banIcon}>
        <NoHatIcon />
      </div>
      <div className={styles.banIcon}>
        <NoGlassesIcon />
      </div>
      <div className={styles.banIcon}>
        <NoMaskIcon />
      </div>
    </div>
  );
}
