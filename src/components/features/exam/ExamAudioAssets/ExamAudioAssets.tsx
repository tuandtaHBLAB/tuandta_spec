import type { RefObject } from "react";

export type ExamAudioAssetsProps = {
  endAudioRef: RefObject<HTMLAudioElement | null>;
  part1IntroAudioRef: RefObject<HTMLAudioElement | null>;
  part1PleaseReadAudioRef: RefObject<HTMLAudioElement | null>;
  part1PrepAudioRef: RefObject<HTMLAudioElement | null>;
  part1StartAudioRef: RefObject<HTMLAudioElement | null>;
  startCameraTestAudioRef: RefObject<HTMLAudioElement | null>;
  startLetStartAudioRef: RefObject<HTMLAudioElement | null>;
  startMicTestAudioRef: RefObject<HTMLAudioElement | null>;
  startPressNextAudioRef: RefObject<HTMLAudioElement | null>;
  urls: {
    end: string;
    part1Intro: string;
    part1PleaseRead: string;
    part1Prep: string;
    part1Start: string;
    startCameraTest: string;
    startLetStart: string;
    startMicTest: string;
    startPressNext: string;
  };
};

export function ExamAudioAssets({
  endAudioRef,
  part1IntroAudioRef,
  part1PleaseReadAudioRef,
  part1PrepAudioRef,
  part1StartAudioRef,
  startCameraTestAudioRef,
  startLetStartAudioRef,
  startMicTestAudioRef,
  startPressNextAudioRef,
  urls,
}: ExamAudioAssetsProps) {
  return (
    <>
      <audio ref={startCameraTestAudioRef} preload="auto" src={urls.startCameraTest} hidden />
      <audio ref={startPressNextAudioRef} preload="auto" src={urls.startPressNext} hidden />
      <audio ref={startMicTestAudioRef} preload="auto" src={urls.startMicTest} hidden />
      <audio ref={startLetStartAudioRef} preload="auto" src={urls.startLetStart} hidden />
      <audio ref={endAudioRef} preload="auto" src={urls.end} hidden />
      <audio ref={part1StartAudioRef} preload="auto" src={urls.part1Start} hidden />
      <audio ref={part1IntroAudioRef} preload="auto" src={urls.part1Intro} hidden />
      <audio ref={part1PrepAudioRef} preload="auto" src={urls.part1Prep} hidden />
      <audio ref={part1PleaseReadAudioRef} preload="auto" src={urls.part1PleaseRead} hidden />
    </>
  );
}
