import React, { useEffect, useRef, useState } from 'react';

interface AudioWaveformVisualizationProps {
  audioUrl: string;
  width?: number;
  height?: number;
  color?: string;
  onTimeClick?: (time: number) => void;
}

export const AudioWaveformVisualization: React.FC<AudioWaveformVisualizationProps> = ({
  audioUrl,
  width = 800,
  height = 100,
  color = '#3b82f6',
  onTimeClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const loadAudio = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        setDuration(audioBuffer.duration);
        drawWaveform(audioBuffer);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading audio:', error);
        setIsLoading(false);
      }
    };

    if (audioUrl) {
      loadAudio();
    }
  }, [audioUrl]);

  const drawWaveform = (audioBuffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rawData = audioBuffer.getChannelData(0);
    const samples = Math.floor(rawData.length / (width / 2));
    const filteredData = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < rawData.length / samples; j++) {
        sum += Math.abs(rawData[Math.floor(i * rawData.length / samples + j)]);
      }
      filteredData[i] = sum / (rawData.length / samples);
    }

    const maxValue = Math.max(...filteredData);
    const scale = height / 2 / maxValue;

    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * width;
      const y = height / 2 - filteredData[i] * scale;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = '#d1d5db';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onTimeClick) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / width) * duration;
    onTimeClick(time);
  };

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-24 bg-gray-100 rounded">
          <p className="text-gray-500">Loading audio...</p>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          className="w-full border border-gray-300 rounded cursor-pointer"
        />
      )}
    </div>
  );
};
