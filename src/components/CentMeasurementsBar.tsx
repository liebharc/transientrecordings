import React, { useEffect, useRef, useState } from "react";
import { WorkerData } from "./centMeasurementsWorker";

interface CentMeasurementsBarProps {
  centMeasurements: Map<number, number>;
  totalDuration: number;
}

const CentMeasurementsBar: React.FC<CentMeasurementsBarProps> = ({
  centMeasurements,
  totalDuration,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const newWorker = new Worker(
      new URL("./centMeasurementsWorker.ts", import.meta.url),
    );
    setWorker(newWorker);

    return () => {
      newWorker.terminate();
    };
  }, []);

  useEffect(() => {
    if (!worker) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const handleResize = () => {
      const data: WorkerData = {
        measurements: centMeasurements,
        totalDuration,
        width: canvas.width,
        height: canvas.height,
      };
      worker.postMessage(data);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    worker.onmessage = (e: MessageEvent<ImageBitmap>) => {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(e.data, 0, 0);
      }
    };

    handleResize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [worker, centMeasurements, totalDuration]);

  return (
    <div className="flex w-full h-20 px-[4px]">
      <canvas ref={canvasRef} className="flex-grow" />
    </div>
  );
};

export default CentMeasurementsBar;
