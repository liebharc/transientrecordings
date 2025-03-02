import { useCallback, useRef, useState } from "react";
import {
  createStartedStopWatch,
  createStoppedStopWatch,
  getStopWatchDuration,
  StopWatch,
  tickStopWatch,
} from "@/lib/stopWatch";
import useAutoResetState from "./useAutoResetState";
import { PitchDetector } from "pitchy";
import { useWakeLock } from "./useWakeLock";
import { getDifferenceInCents } from "@/lib/music";

const fftLength = 16 * 1024;

export function useRecorder(tuning: number, limitLength: number = -1) {
  const { request, release } = useWakeLock();
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
  const [isMusicDetected, setIsMusicDetected] = useState<boolean>(false);
  const isMusicDetectedWindow = useRef<boolean[]>([]);

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
      release();
    } else {
      // Start recording
      try {
        if (!mediaRecorderRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: 44100,
              channelCount: 1, // Mono assuming a single audio source
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          mediaRecorderRef.current = new MediaRecorder(stream, {
            audioBitsPerSecond: 128000,
          });
          const chunks: Blob[] = [];

          mediaRecorderRef.current.ondataavailable = (e) => {
            if (limitLength === 0) {
              return;
            }

            chunks.push(e.data);

            while (limitLength > 0 && chunks.length > limitLength) {
              chunks.unshift();
            }
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

        request();
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
      release();
    } else {
      audioElementRef.current!.play();
      setIsPlaying(true);
      request();

      audioElementRef.current!.ontimeupdate = () => {
        if (audioElementRef.current) {
          setDuration(Math.round(audioElementRef.current.currentTime));
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

    release();
  };

  // Seek to a specific time in the audio
  const handleSeek = (newTime: number) => {
    if (audioElementRef.current && !isNaN(newTime)) {
      audioElementRef.current.currentTime = newTime / 1000;
      setDuration(newTime / 1000);
    }
  };

  const handleBackBy5s = () => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = Math.max(
        0,
        audioElementRef.current.currentTime - 5,
      );
      setDuration(Math.round(audioElementRef.current.currentTime));
    }
  };

  const handleForwardBy5s = () => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = Math.min(
        totalDuration,
        audioElementRef.current.currentTime + 5,
      );
      setDuration(Math.round(audioElementRef.current.currentTime));
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
      const minFrequency = 32.7; // C1 with 440 Hz tuning
      const maxFrequency = 2093; // C7 with 440 Hz tuning
      if (
        clarity > minClarity &&
        pitch > minFrequency &&
        pitch < maxFrequency
      ) {
        const centResult = getDifferenceInCents(pitch, tuning);
        setCents(centResult);
        setStopWatch((currentWatch) => {
          const result = tickStopWatch(currentWatch);
          const duration = getStopWatchDuration(result);
          centMeasurements.current.set(duration, centResult);
          return result;
        });
        isMusicDetectedWindow.current.push(true);
      } else {
        setStopWatch(tickStopWatch);
        isMusicDetectedWindow.current.push(false);
      }

      while (isMusicDetectedWindow.current.length > 10) {
        isMusicDetectedWindow.current.shift();
      }

      setIsMusicDetected(!!isMusicDetectedWindow.current.find((c) => c));
    }

    // Call updatePitch again at the next animation frame
    requestAnimationFrame(updatePitch);
  }, [setCents, setStopWatch, tuning]);

  return {
    totalDuration,
    stopWatch,
    isRecording,
    isPlaying,
    recordedBlob,
    message,
    audioElementRef,
    cents,
    centMeasurements,
    isMusicDetected,
    handlePlay,
    handleRecord,
    handleStop,
    handleShare,
    handleBackBy5s,
    handleForwardBy5s,
    handleSeek,
    setTotalDuration,
  };
}
