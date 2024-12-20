import React, { useEffect, useRef } from "react";

const CentMeasurementsBar = ({
  centMeasurements,
  totalDuration,
}: {
  centMeasurements: Map<number, number>;
  totalDuration: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
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

  return <canvas ref={canvasRef} width={500} height={50} />;
};

export default CentMeasurementsBar;
