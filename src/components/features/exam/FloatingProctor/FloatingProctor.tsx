import type { RefObject } from "react";
import styles from "@/components/features/exam/Exam.module.css";
import { AudioMeter } from "@/components/common/AudioMeter";

export type FloatingProctorProps = {
  audioLevel: number;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function FloatingProctor({ audioLevel, videoRef }: FloatingProctorProps) {
  return (
    <>
      <div className={styles.cameraFloating}>
        <video ref={videoRef} autoPlay muted playsInline className={styles.camera} />
      </div>
      <div className={styles.audioMeterFloating}>
        <AudioMeter level={audioLevel} />
      </div>
    </>
  );
}
