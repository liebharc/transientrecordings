"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, PauseCircle, PlayCircle, Share, StopCircle } from "lucide-react";

export default function Home() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start or stop recording
  const handleRecord = async () => {
    if (isRecording) {
      // Pause recording
      mediaRecorderRef.current?.pause();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      // Start recording
      try {
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
          setRecordedBlob(blob);
          // Set the total duration of the recording
          const audio = new Audio(URL.createObjectURL(blob));
          audio.onloadedmetadata = () => {
            setTotalDuration(Math.floor(audio.duration));
          };
        };

        mediaRecorderRef.current.start();
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
      if (recordedBlob) {
        audioElementRef.current!.src = URL.createObjectURL(recordedBlob);
        audioElementRef.current!.play();
        setIsPlaying(true);

        audioElementRef.current!.ontimeupdate = () => {
          if (audioElementRef.current) {
            setDuration(Math.floor(audioElementRef.current.currentTime));
          }
        };
      }
    }
  };

  // Stop recording or playback
  const handleStop = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    if (isPlaying) {
      audioElementRef.current?.pause();
      setIsPlaying(false);
    }
    setDuration(0);
  };

  // Share recorded audio using the Web Share API
  const handleShare = async () => {
    if (recordedBlob) {
      const audioUrl = URL.createObjectURL(recordedBlob);
      try {
        if (
          navigator.canShare &&
          navigator.canShare({
            files: [
              new File([recordedBlob], "recording.wav", { type: "audio/wav" }),
            ],
          })
        ) {
          await navigator.share({
            files: [
              new File([recordedBlob], "recording.wav", { type: "audio/wav" }),
            ],
            title: "Recorded Audio",
            text: "Check out this recorded audio!",
          });
        } else {
          alert(
            "Web Share API is not supported or file sharing is not available."
          );
        }
      } catch (error) {
        console.error("Error sharing audio:", error);
        alert("Failed to share the audio.");
      }
    } else {
      alert("No recording to share.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <main className="flex flex-col gap-8 items-center">
        <div className="flex gap-4">
          <Button
            onClick={handleRecord}
            disabled={isPlaying}
            className="px-4 py-2 bg-blue-500"
          >
            {isRecording ? (
              <PauseCircle className="inline-block" />
            ) : (
              <Mic className="inline-block" />
            )}
          </Button>
          <Button
            onClick={handlePlay}
            disabled={!recordedBlob || isRecording}
            className="px-4 py-2 bg-green-500"
          >
            {isPlaying ? (
              <PauseCircle className="inline-block" />
            ) : (
              <PlayCircle className="inline-block" />
            )}
          </Button>
          <Button
            onClick={handleStop}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            <StopCircle className="inline-block" />
          </Button>
          <Button
            disabled={!recordedBlob}
            onClick={handleShare}
            className="px-4 py-2 bg-yellow-500 text-white rounded"
          >
            <Share className="inline-block" />
          </Button>
        </div>

        <div className="mt-4 text-xl">
          {isPlaying || isRecording ? (
            <>
              <span>Current: {duration} sec</span> /{" "}
              <span>Total: {totalDuration} sec</span>
            </>
          ) : (
            <span>Duration: {totalDuration} sec</span>
          )}
        </div>

        <audio ref={audioElementRef} />
      </main>
    </div>
  );
}
