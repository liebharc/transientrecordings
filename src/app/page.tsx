"use client";

import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeClosed,
  Mic,
  Pause,
  PauseCircle,
  Play,
  PlayCircle,
  Settings,
  Share,
  SkipBack,
  SkipForward,
  StopCircle,
} from "lucide-react";
import { TunerBar } from "@/components/TunerBar";
import { getStopWatchDuration } from "@/lib/stopWatch";
import CentMeasurementsBar from "@/components/CentMeasurementsBar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  selectShowTunerPlayback,
  selectShowTunerRecording,
  selectTuning,
} from "@/lib/features/settings/settingsSelector";
import {
  setShowTunerPlayback,
  setShowTunerRecording,
  setTuning,
} from "@/lib/features/settings/settingsSlice";
import { useRecorder } from "../../hooks/useRecorder";

export default function Home() {
  const tuning = useAppSelector(selectTuning);
  const showTunerRecording = useAppSelector(selectShowTunerRecording);
  const showTunerPlayback = useAppSelector(selectShowTunerPlayback);
  const dispatch = useAppDispatch();

  const {
    totalDuration,
    stopWatch,
    isRecording,
    isPlaying,
    recordedBlob,
    message,
    audioElementRef,
    cents,
    centMeasurements,
    handlePlay,
    handleRecord,
    handleStop,
    handleShare,
    handleBackBy5s,
    handleForwardBy5s,
    handleSeek,
    setTotalDuration,
  } = useRecorder(tuning);

  return (
    <div className="flex justify-center">
      <main className="flex flex-col items-stretch gap-8 mx-2 w-full">
        <div className="flex justify-end gap-4 p-2">
          <Button
            onClick={() => {
              if (!isRecording && totalDuration > 0) {
                dispatch(setShowTunerPlayback(!showTunerPlayback));
              } else {
                dispatch(setShowTunerRecording(!showTunerRecording));
              }
            }}
          >
            {(!isRecording && totalDuration > 0 && showTunerPlayback) ||
            (!(!isRecording && totalDuration > 0) && showTunerRecording) ? (
              <Eye className="inline-block" />
            ) : (
              <EyeClosed className="inline-block" />
            )}
          </Button>
          <Popover>
            <PopoverTrigger>
              <Button>
                <Settings className="inline-block" />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="flex flex-col gap-4">
                <label className="text-center">Tuning {tuning} Hz</label>
                <input
                  type="number"
                  value={tuning}
                  min={430}
                  max={450}
                  onChange={(e) => dispatch(setTuning(Number(e.target.value)))}
                  placeholder="Tuning"
                />
                <Slider
                  value={[tuning]}
                  onValueChange={(value) => dispatch(setTuning(value[0]))}
                  min={430}
                  max={450}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex gap-4 justify-center pt-[20vh]">
          <Button
            onClick={handleRecord}
            disabled={isPlaying}
            className="px-4 py-2 h-20 w-20 bg-blue-500 hover:bg-blue-600"
          >
            {isRecording ? (
              <PauseCircle
                className="inline-block"
                style={{ width: "48px", height: "48px" }}
              />
            ) : (
              <Mic
                className="inline-block"
                style={{ width: "48px", height: "48px" }}
              />
            )}
          </Button>
          <Button
            onClick={handlePlay}
            disabled={!recordedBlob || isRecording || totalDuration === 0}
            size="lg"
            className="px-4 py-2  h-20 w-20 bg-green-500 hover:bg-green-600"
          >
            {isPlaying ? (
              <PauseCircle
                className="inline-block"
                style={{ width: "48px", height: "48px" }}
              />
            ) : (
              <PlayCircle
                className="inline-block"
                style={{ width: "48px", height: "48px" }}
              />
            )}
          </Button>
          <Button
            onClick={handleStop}
            size="lg"
            className="px-4 py-2 h-20 w-20 bg-red-500 hover:bg-red-600"
          >
            <StopCircle
              className="inline-block"
              style={{ width: "48px", height: "48px" }}
            />
          </Button>
          <Button
            disabled={!recordedBlob}
            onClick={handleShare}
            size="lg"
            className="px-4 py-2 h-20 w-20 bg-yellow-500 hover:bg-yellow-600"
          >
            <Share
              className="inline-block"
              style={{ width: "48px", height: "48px" }}
            />
          </Button>
        </div>

        <p>{message}</p>
        <div className="mt-4 text-xl items-stretch flex flex-col">
          {!isRecording && totalDuration > 0 ? (
            <>
              <div className="flex-1 flex flex-col items-center">
                <div className="flex items-center gap-4">
                  <Button onClick={handleBackBy5s}>
                    <SkipBack className="inline-block" />
                  </Button>
                  <span>
                    Position: {formatTime(getStopWatchDuration(stopWatch))}/
                    {formatTime(totalDuration)}
                  </span>

                  <Button onClick={handlePlay}>
                    {isPlaying ? (
                      <Pause className="inline-block" />
                    ) : (
                      <Play className="inline-block" />
                    )}
                  </Button>
                  <Button onClick={handleForwardBy5s}>
                    <SkipForward className="inline-block" />
                  </Button>
                </div>
                <Slider
                  min={0}
                  max={totalDuration}
                  value={[getStopWatchDuration(stopWatch)]}
                  onValueChange={(value) => handleSeek(value[0])}
                  className="w-full my-4"
                />
                {showTunerPlayback && (
                  <CentMeasurementsBar
                    centMeasurements={centMeasurements.current}
                    totalDuration={totalDuration}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              {showTunerRecording && <TunerBar pitchDeltaInCents={cents} />}
              <span className="self-center">
                Duration: {formatTime(getStopWatchDuration(stopWatch))}
              </span>
            </>
          )}
        </div>

        <audio
          ref={audioElementRef}
          onEnded={handleStop}
          onLoadedMetadata={() => {
            if (
              audioElementRef.current &&
              !isNaN(audioElementRef.current.duration) &&
              isFinite(audioElementRef.current.duration)
            ) {
              setTotalDuration(1000 * audioElementRef.current.duration);
            }
          }}
        />
      </main>
    </div>
  );
}

function formatTime(millis: number) {
  const seconds = Math.floor(millis / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}
