import { produce } from "immer";

export interface StopWatch {
  start: number;
  accumulated: number;
}

export function createStartedStopWatch(startDuration?: number): StopWatch {
  return {
    start: nowUtcInMillis(),
    accumulated: startDuration ?? 0,
  };
}

export function createStoppedStopWatch(duration?: number): StopWatch {
  return {
    start: -1,
    accumulated: duration ?? 0,
  };
}

export function startStopWatch(stopWatch: StopWatch): StopWatch {
  if (stopWatch.start > 0) {
    return stopWatch;
  }

  return produce(stopWatch, (draft) => {
    draft.start = nowUtcInMillis();
  });
}

export function stopStopWatch(stopWatch: StopWatch): StopWatch {
  if (stopWatch.start < 0) {
    return stopWatch;
  }

  return produce(stopWatch, (draft) => {
    draft.accumulated += nowUtcInMillis() - draft.start;
    draft.start = -1;
  });
}

export function tickStopWatch(stopWatch: StopWatch): StopWatch {
  if (stopWatch.start < 0) {
    return stopWatch;
  }

  const now = nowUtcInMillis();

  return produce(stopWatch, (draft) => {
    draft.accumulated += now - draft.start;
    draft.start = now;
  });
}

export function isStopWatchRunning(stopWatch: StopWatch): boolean {
  return stopWatch.start > 0;
}

export function getStopWatchDuration(stopWatch: StopWatch | undefined): number {
  if (!stopWatch) {
    return 0;
  }

  if (stopWatch.start < 0) {
    return stopWatch.accumulated;
  }

  return stopWatch.accumulated + nowUtcInMillis() - stopWatch.start;
}

export function nowUtcInMillis(): number {
  return new Date().getTime();
}
