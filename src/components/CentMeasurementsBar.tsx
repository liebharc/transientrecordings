import React, { useCallback, useEffect, useMemo, useRef } from "react";

const CentMeasurementsBar = ({
  centMeasurements: rawCentMeasurements,
  totalDuration,
}: {
  centMeasurements: Map<number, number>;
  totalDuration: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const centMeasurements = useMemo(() => {
    return getSmoothedCentValues(rawCentMeasurements, 10);
  }, [rawCentMeasurements]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const getColor = (cents: number) => {
      const value = Math.min(Math.abs(cents), 50);
      const green = Math.max(255 - value * 5, 0);
      const red = Math.min(value * 5, 255);
      return `rgb(${red}, ${green}, 0)`;
    };

    // Ensure 0 and totalDuration keys are present
    const measurements = new Map(centMeasurements);
    measurements.set(0, 0);
    measurements.set(totalDuration, 0);

    const keys = Array.from(measurements.keys()).sort((a, b) => a - b);
    const values = keys.map((key) => measurements.get(key) || 0);

    for (let i = 0; i < keys.length - 1; i++) {
      const x1 = (keys[i] / totalDuration) * width;
      const x2 = (keys[i + 1] / totalDuration) * width;

      const gradient = ctx.createLinearGradient(x1, 0, x2, 0);
      gradient.addColorStop(0, getColor(values[i]));
      gradient.addColorStop(1, getColor(values[i + 1]));

      ctx.strokeStyle = gradient;
      ctx.lineWidth = height; // Make the line fill the complete height
      ctx.beginPath();
      ctx.moveTo(x1, height / 2);
      ctx.lineTo(x2, height / 2);
      ctx.stroke();
    }
  }, [centMeasurements, totalDuration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      draw();
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.unobserve(canvas);
    };
  }, [draw, centMeasurements, totalDuration]);

  useEffect(() => {
    draw();
  }, [draw, centMeasurements, totalDuration]);

  return (
    <div className="flex w-full h-20 mt-6">
      <canvas ref={canvasRef} className="flex-grow" />
    </div>
  );
};

export default CentMeasurementsBar;

const calculateMovingAverage = (data: number[], windowSize: number) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const end = i + 1;
    const window = data.slice(start, end);
    const average =
      window.reduce((sum, value) => sum + value, 0) / window.length;
    result.push(average);
  }
  return result;
};

const getSmoothedCentValues = (
  centMeasurements: Map<number, number>,
  windowSize: number,
) => {
  const timestamps = Array.from(centMeasurements.keys());
  const centValues = Array.from(centMeasurements.values());
  const smoothedCentValues = calculateMovingAverage(centValues, windowSize);
  const smoothedCentMeasurements = new Map<number, number>();
  timestamps.forEach((timestamp, index) => {
    smoothedCentMeasurements.set(timestamp, smoothedCentValues[index]);
  });
  return smoothedCentMeasurements;
};
