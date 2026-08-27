"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Check, Undo2 } from "lucide-react";

interface PhotoAnnotateProps {
  imageFile: File;
  onSave: (annotatedBlob: Blob) => void;
  onCancel: () => void;
}

export function PhotoAnnotate({ imageFile, onSave, onCancel }: PhotoAnnotateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [paths, setPaths] = useState<Array<[number, number][]>>([]);
  const [currentPath, setCurrentPath] = useState<[number, number][]>([]);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = URL.createObjectURL(imageFile);
    return () => URL.revokeObjectURL(img.src);
  }, [imageFile]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = imgEl.width;
    canvas.height = imgEl.height;
    ctx.drawImage(imgEl, 0, 0);

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = Math.max(3, imgEl.width / 150);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const allPaths = [...paths, currentPath];
    for (const path of allPaths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i][0], path[i][1]);
      }
      ctx.stroke();
    }
  }, [imgEl, paths, currentPath]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function getPos(e: React.TouchEvent | React.MouseEvent): [number, number] {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return [
        (touch.clientX - rect.left) * scaleX,
        (touch.clientY - rect.top) * scaleY,
      ];
    }
    return [
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY,
    ];
  }

  function handleStart(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault();
    setDrawing(true);
    setCurrentPath([getPos(e)]);
  }

  function handleMove(e: React.TouchEvent | React.MouseEvent) {
    if (!drawing) return;
    e.preventDefault();
    setCurrentPath((prev) => [...prev, getPos(e)]);
  }

  function handleEnd() {
    if (!drawing) return;
    setDrawing(false);
    if (currentPath.length > 1) {
      setPaths((prev) => [...prev, currentPath]);
    }
    setCurrentPath([]);
  }

  function handleUndo() {
    setPaths((prev) => prev.slice(0, -1));
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/jpeg", 0.9);
  }

  if (!imgEl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between p-3">
        <Button variant="ghost" size="icon" onClick={onCancel} className="text-white">
          <X className="h-5 w-5" />
        </Button>
        <span className="text-white text-sm">Draw to annotate</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleUndo} className="text-white" disabled={paths.length === 0}>
            <Undo2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSave} className="text-green-400">
            <Check className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full touch-none"
          style={{ objectFit: "contain" }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>
    </div>
  );
}
