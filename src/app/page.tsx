"use client";

import { useState, useRef } from "react";

export default function Home() {
  // State for managing recording status, playback status, and duration
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Refs for MediaRecorder, audio element, and timer
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start or stop recording
  const handleRecord = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
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
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);

        // Start timer
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
          navigator.canShare({ files: [recordedBlob] })
        ) {
          // Web Share API available and supports file sharing
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
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="flex gap-4">
          <button
            onClick={handleRecord}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </button>
          <button
            onClick={handlePlay}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Stop
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-yellow-500 text-white rounded"
          >
            Share
          </button>
        </div>
        <div className="mt-4 text-xl">Duration: {duration} seconds</div>
        <audio ref={audioElementRef} />
      </main>
    </div>
  );
}
