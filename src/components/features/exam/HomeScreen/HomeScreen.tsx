import type { RefObject } from "react";
import styles from "@/components/features/exam/Exam.module.css";
import { AudioMeter } from "@/components/common/AudioMeter";
import { ProctoringReminderIcons } from "@/components/features/exam/ProctoringReminderIcons";
import type { Dictionary } from "@/i18n/dictionaries";

export type HomeScreenProps = {
  audioLevel: number;
  cameraError: string;
  deviceCheckStatus: string;
  homeStartButtonText: string;
  isDisqualified: boolean;
  isCheckingDevices: boolean;
  isHomeStage: boolean;
  isReadyToStart: boolean;
  loadError: string;
  mobileVideoRef: RefObject<HTMLVideoElement | null>;
  onEnsureDevicesReady: () => void;
  onStartExam: () => void;
  partTimeoutMessage: string;
  serverTime: string;
  startExamHint: string;
  totalQuestions: number;
  ui: Dictionary["exam"]["home"];
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function HomeScreen({
  audioLevel,
  cameraError,
  deviceCheckStatus,
  homeStartButtonText,
  isDisqualified,
  isCheckingDevices,
  isHomeStage,
  isReadyToStart,
  loadError,
  mobileVideoRef,
  onEnsureDevicesReady,
  onStartExam,
  partTimeoutMessage,
  serverTime,
  startExamHint,
  totalQuestions,
  ui,
  videoRef,
}: HomeScreenProps) {
  return (
    <>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>{ui.kicker}</p>
          <h1>{ui.title}</h1>
          <p className={styles.lead}>{ui.lead}</p>
        </div>
        <p className={styles.serverTime}>
          {ui.serverTime}: {serverTime}
        </p>
      </section>

      <section className={styles.examLayout}>
        <article className={`${styles.card} ${styles.desktopCameraCard}`}>
          <h2>{ui.examStartTitle}</h2>
          {!!loadError && <p className={styles.errorText}>{loadError}</p>}
          {isHomeStage ? (
          <div className={styles.stack}>
            {!!partTimeoutMessage && <p className={styles.errorText}>{partTimeoutMessage}</p>}
            <p>{ui.totalQuestions(totalQuestions)}</p>
            <div className={styles.precheckPanel}>
              <ProctoringReminderIcons />
              <RetryDeviceButton
                cameraError={cameraError}
                isCheckingDevices={isCheckingDevices}
                label={ui.retryDevices}
                onEnsureDevicesReady={onEnsureDevicesReady}
              />
              {!!deviceCheckStatus && <p className={styles.precheckStatus}>{deviceCheckStatus}</p>}
              {!!cameraError && <p className={styles.errorText}>{cameraError}</p>}
              <MobileCameraPreview
                audioLevel={audioLevel}
                deviceCheckStatus={deviceCheckStatus}
                title={ui.cameraConfirm}
                videoRef={mobileVideoRef}
              />
            </div>
            <StartExamButton
              disabled={!isReadyToStart || isCheckingDevices}
              isCheckingDevices={isCheckingDevices}
              label={homeStartButtonText}
              onStartExam={onStartExam}
            />
            {!!startExamHint && <p className={styles.buttonHint}>{startExamHint}</p>}
          </div>
          ) : null}
          {isDisqualified ? (
            <DisqualifiedPanel description={ui.disqualifiedDescription} title={ui.disqualifiedTitle} />
          ) : null}
        </article>

        <article className={`${styles.card} ${styles.cameraCenterCard}`}>
          <ProctoringReminderIcons />
          <h2>{ui.cameraConfirm}</h2>
          <div className={styles.cameraShell}>
            <video ref={videoRef} autoPlay muted playsInline className={styles.camera} />
          </div>
          <AudioMeter level={audioLevel} />
          {!!deviceCheckStatus && <p className={styles.precheckStatus}>{deviceCheckStatus}</p>}
          <RetryDeviceButton
            cameraError={cameraError}
            isCheckingDevices={isCheckingDevices}
            label={ui.retryDevices}
            onEnsureDevicesReady={onEnsureDevicesReady}
          />
          <StartExamButton
            disabled={!isReadyToStart || isCheckingDevices}
            isCheckingDevices={isCheckingDevices}
            label={homeStartButtonText}
            onStartExam={onStartExam}
          />
          {!!startExamHint && <p className={styles.buttonHint}>{startExamHint}</p>}
        </article>
      </section>
    </>
  );
}

export type DisqualifiedPanelProps = {
  description: string;
  title: string;
};

export function DisqualifiedPanel({ description, title }: DisqualifiedPanelProps) {
  return (
    <div className={styles.failBox}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

type MobileCameraPreviewProps = {
  audioLevel: number;
  deviceCheckStatus: string;
  title: string;
  videoRef: RefObject<HTMLVideoElement | null>;
};

function MobileCameraPreview({ audioLevel, deviceCheckStatus, title, videoRef }: MobileCameraPreviewProps) {
  return (
    <div className={styles.mobileCameraSection}>
      <ProctoringReminderIcons />
      <h3>{title}</h3>
      <div className={styles.cameraShell}>
        <video ref={videoRef} autoPlay muted playsInline className={styles.camera} />
      </div>
      <AudioMeter level={audioLevel} />
      {!!deviceCheckStatus && <p className={styles.precheckStatus}>{deviceCheckStatus}</p>}
    </div>
  );
}

type RetryDeviceButtonProps = {
  cameraError: string;
  isCheckingDevices: boolean;
  label: string;
  onEnsureDevicesReady: () => void;
};

function RetryDeviceButton({ cameraError, isCheckingDevices, label, onEnsureDevicesReady }: RetryDeviceButtonProps) {
  if (!cameraError) return null;

  return (
    <div className={styles.precheckActions}>
      <button
        className={styles.secondaryBtn}
        onClick={onEnsureDevicesReady}
        disabled={isCheckingDevices}
        aria-busy={isCheckingDevices}
      >
        {label}
      </button>
    </div>
  );
}

type StartExamButtonProps = {
  disabled: boolean;
  isCheckingDevices: boolean;
  label: string;
  onStartExam: () => void;
};

function StartExamButton({ disabled, isCheckingDevices, label, onStartExam }: StartExamButtonProps) {
  return (
    <button className={styles.primaryBtn} onClick={onStartExam} disabled={disabled} aria-busy={isCheckingDevices}>
      {label}
    </button>
  );
}
