"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, PauseCircle, PlayCircle, Share, StopCircle } from "lucide-react";
import useAutoResetState from "../../hooks/useAutoResetState";

export default function Home() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [message, setMessage] = useAutoResetState<string | null>(null, 5000);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start or stop recording
  const handleRecord = async () => {
    if (isRecording) {
      // Pause recording
      mediaRecorderRef.current?.pause();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
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

          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunks, { type: "audio/wav" });
            audioElementRef.current!.src = URL.createObjectURL(blob);
            setRecordedBlob(blob);
          };

          setTotalDuration(0);
          setDuration(0);
          mediaRecorderRef.current.start();
        } else {
          mediaRecorderRef.current.resume();
        }

        setIsRecording(true);

        // Start timer for recording
        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      } catch (error) {
        console.error("Error accessing microphone:", error);
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
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (isRecording) {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsPlaying(false);
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
          setMessage(
            "Web Share API is not supported or file sharing is not available."
          );
        }
      } catch (error) {
        console.error("Error sharing audio:", error);
        setMessage("Failed to share the audio.");
      }
    } else {
      setMessage("No recording to share.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <main className="flex flex-col gap-8 items-center">
        <div className="flex gap-4">
          <Button
            onClick={handleRecord}
            disabled={isPlaying}
            className="px-4 py-2 bg-blue-500 h-20 w-20"
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
            className="px-4 py-2 bg-green-500 h-20 w-20"
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
            className="px-4 py-2 bg-red-500  h-20 w-20"
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
            className="px-4 py-2 bg-yellow-500  h-20 w-20"
          >
            <Share
              className="inline-block"
              style={{ width: "48px", height: "48px" }}
            />
          </Button>
        </div>

        <p>{message}</p>

        <div className="mt-4 text-xl">
          {!isRecording && totalDuration > 0 ? (
            <span>
              Position: {formatTime(duration)}/{formatTime(totalDuration)}
            </span>
          ) : (
            <span>Duration: {formatTime(duration)}</span>
          )}
        </div>

        <audio
          ref={audioElementRef}
          onEnded={handleStop}
          onLoadedData={(event) =>
            setTotalDuration(
              Math.floor((event.target as HTMLAudioElement).duration)
            )
          }
        />
      </main>
    </div>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}
