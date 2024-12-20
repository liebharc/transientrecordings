import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const setingsSlice = createSlice({
  name: "settings",
  initialState: {
    tuning: 440,
    showTunerRecording: true,
    showTunerPlayback: true,
  },
  reducers: {
    setTuning: (state, action: PayloadAction<number>) => {
      state.tuning = action.payload;
    },
    setShowTunerRecording: (state, action: PayloadAction<boolean>) => {
      state.showTunerRecording = action.payload;
    },
    setShowTunerPlayback: (state, action: PayloadAction<boolean>) => {
      state.showTunerPlayback = action.payload;
    },
  },
});

export const { setShowTunerPlayback, setShowTunerRecording, setTuning } =
  setingsSlice.actions;
