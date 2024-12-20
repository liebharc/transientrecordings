import { RootState } from "@/lib/store";

export const selectTuning = (state: RootState): number => state.settings.tuning;

export const selectShowTunerRecording = (state: RootState): boolean =>
  state.settings.showTunerRecording;

export const selectShowTunerPlayback = (state: RootState): boolean =>
  state.settings.showTunerPlayback;
