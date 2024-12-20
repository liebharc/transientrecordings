"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Pause,
  PauseCircle,
  Play,
  PlayCircle,
  Share,
  SkipBack,
  SkipForward,
  StopCircle,
} from "lucide-react";
import useAutoResetState from "../../hooks/useAutoResetState";
import { PitchDetector } from "pitchy";
import { TunerBar } from "@/components/TunerBar";
import {
  createStartedStopWatch,
  createStoppedStopWatch,
  getStopWatchDuration,
  StopWatch,
  tickStopWatch,
} from "@/lib/stopWatch";
import { getDifferenceInCents } from "@/lib/music";
import CentMeasurementsBar from "@/components/CentMeasurementsBar";

const fftLength = 1024;

export default function Home() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const isRecordingRef = useRef<boolean>(isRecording);
  isRecordingRef.current = isRecording;
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stopWatch, setStopWatch] = useState<StopWatch>(
    createStoppedStopWatch(),
  );
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [message, setMessage] = useAutoResetState<string | null>(null, 5000);
  const centMeasurements = useRef<Map<number, number>>(new Map());
  const [cents, setCents] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const pitchDetectorRef = useRef<PitchDetector<Float32Array>>(
    PitchDetector.forFloat32Array(fftLength / 2),
  );

  const setDuration = useCallback(
    (newTime: number) => {
      setStopWatch(createStoppedStopWatch(newTime * 1000));
    },
    [setStopWatch],
  );

  const handleRecord = async () => {
    if (isRecording) {
      // Pause recording
      mediaRecorderRef.current?.pause();
      setIsRecording(false);
    } else {
      // Start recording
      try {
        if (!mediaRecorderRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          mediaRecorderRef.current = new MediaRecorder(stream);
          const chunks: Blob[] = [];

          mediaRecorderRef.current.ondataavailable = (e) => {
            chunks.push(e.data);
          };

          mediaRecorderRef.current.onstop = async () => {
            const blob = new Blob(chunks, { type: "audio/wav" });
            audioElementRef.current!.src = URL.createObjectURL(blob);
            setRecordedBlob(blob);

            stream.getTracks().forEach((track) => {
              track.stop();
            });

            // Close the audio context
            if (audioContextRef.current) {
              await audioContextRef.current.close();
              audioContextRef.current = null;
            }
          };

          // Real-time processing setup
          audioContextRef.current = new AudioContext();
          const source =
            audioContextRef.current.createMediaStreamSource(stream);

          analyserNodeRef.current = audioContextRef.current.createAnalyser();
          analyserNodeRef.current.fftSize = fftLength;

          source.connect(analyserNodeRef.current);

          setTotalDuration(0);
          centMeasurements.current.clear();
          setStopWatch(createStartedStopWatch());
          mediaRecorderRef.current.start();

          // Start the pitch detection loop
          updatePitch();
        } else {
          mediaRecorderRef.current.resume();
        }

        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
      }
    }
  };

  // Play or stop playback
  const handlePlay = () => {
    if (isPlaying) {
      audioElementRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current!.play();
      setIsPlaying(true);

      audioElementRef.current!.ontimeupdate = () => {
        if (audioElementRef.current) {
          setDuration(Math.floor(audioElementRef.current.currentTime));
        }
      };
    }
  };

  // Stop recording or playback
  const handleStop = () => {
    if (mediaRecorderRef.current) {
      setTotalDuration(getStopWatchDuration(stopWatch));
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (isRecording) {
      setIsRecording(false);
    }

    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // Seek to a specific time in the audio
  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(event.target.value);
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = newTime;
      setDuration(newTime);
    }
  };

  const handleBackBy5s = () => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = Math.max(
        0,
        audioElementRef.current.currentTime - 5,
      );
      setDuration(Math.floor(audioElementRef.current.currentTime));
    }
  };

  const handleForwardBy5s = () => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = Math.min(
        totalDuration,
        audioElementRef.current.currentTime + 5,
      );
      setDuration(Math.floor(audioElementRef.current.currentTime));
    }
  };

  // Share recorded audio using the Web Share API
  const handleShare = async () => {
    if (recordedBlob) {
      try {
        const file = new File([recordedBlob], "recording.wav", {
          type: "audio/wav",
        });

        if (
          navigator.canShare &&
          navigator.canShare({
            files: [file],
          })
        ) {
          await navigator.share({
            files: [file],
            title: "Recorded Audio",
            text: "Check out this recorded audio!",
          });
        } else {
          // Create a download link if sharing is not supported
          const downloadUrl = URL.createObjectURL(file);
          const downloadLink = document.createElement("a");
          downloadLink.href = downloadUrl;
          downloadLink.download = "recording.wav";
          downloadLink.textContent = "Download the recording";

          // Append the link to the DOM and click it to trigger the download
          document.body.appendChild(downloadLink);
          downloadLink.click();

          // Remove the link from the DOM
          document.body.removeChild(downloadLink);
        }
      } catch (error) {
        console.error("Error sharing audio:", error);
        setMessage("Failed to share the audio.");
      }
    } else {
      setMessage("No recording to share.");
    }
  };

  const updatePitch = useCallback(() => {
    if (
      analyserNodeRef.current &&
      audioContextRef.current &&
      isRecordingRef.current
    ) {
      const dataArray = new Float32Array(
        analyserNodeRef.current.frequencyBinCount,
      );
      analyserNodeRef.current.getFloatTimeDomainData(dataArray);

      const [pitch, clarity] = pitchDetectorRef.current.findPitch(
        dataArray,
        audioContextRef.current.sampleRate,
      );

      const minClarity = 0.9;
      if (clarity > minClarity) {
        const centResult = getDifferenceInCents(pitch);
        setCents(centResult);
        setStopWatch((currentWatch) => {
          const result = tickStopWatch(currentWatch);
          const duration = getStopWatchDuration(result);
          centMeasurements.current.set(duration, centResult);
          return result;
        });
      } else {
        setStopWatch(tickStopWatch);
      }
    }

    // Call updatePitch again at the next animation frame
    requestAnimationFrame(updatePitch);
  }, [setCents, setStopWatch]);

  return (
    <div className="flex justify-center">
      <main className="flex flex-col items-stretch gap-8 pt-[33vh] px-2 w-full">
        <div className="flex gap-4 justify-center">
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
              <div className="flex items-start gap-4 align-top">
                <Button onClick={handleBackBy5s} className="mt-6">
                  <SkipBack className="inline-block" />
                </Button>
                <div className="flex-1 flex flex-col items-center">
                  <span>
                    Position: {formatTime(getStopWatchDuration(stopWatch))}/
                    {formatTime(totalDuration)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={totalDuration}
                    value={getStopWatchDuration(stopWatch)}
                    onChange={handleSeek}
                    className="w-full"
                  />
                  <CentMeasurementsBar
                    centMeasurements={centMeasurements.current}
                    totalDuration={totalDuration}
                  />
                </div>

                <Button onClick={handlePlay} className="mt-6">
                  {isPlaying ? (
                    <Pause className="inline-block" />
                  ) : (
                    <Play className="inline-block" />
                  )}
                </Button>
                <Button onClick={handleForwardBy5s} className="mt-6">
                  <SkipForward className="inline-block" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <TunerBar pitchDeltaInCents={cents} />
              <span>
                Duration: {formatTime(getStopWatchDuration(stopWatch))}
              </span>
            </>
          )}
        </div>

        <audio ref={audioElementRef} onEnded={handleStop} />
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
