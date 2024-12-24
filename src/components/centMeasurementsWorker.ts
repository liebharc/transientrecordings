export interface WorkerData {
  measurements: Map<number, number>;
  totalDuration: number;
  width: number;
  height: number;
}

self.onmessage = function (e: MessageEvent<WorkerData>) {
  const { measurements, totalDuration, width, height } = e.data;
  const result = draw(measurements, totalDuration, width, height);
  self.postMessage(result);
};

function draw(
  rawMeasurements: Map<number, number>,
  totalDuration: number,
  width: number,
  height: number,
): ImageBitmap {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }

  const measurements = getSmoothedCentValues(rawMeasurements, 11);

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

  return canvas.transferToImageBitmap();
}

function getColor(cents: number): string {
  const value = Math.min(Math.abs(cents), 50);
  const green = Math.max(255 - value * 5, 0);
  const red = Math.min(value * 5, 255);
  return `rgb(${red}, ${green}, 0)`;
}

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
