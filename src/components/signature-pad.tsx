"use client";

import { useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";

export interface SignaturePadHandle {
  getSignatureData(): string;
}

interface SignaturePadProps {
  onChange?: (isEmpty: boolean) => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ onChange }, ref) {
    const canvasRef = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      getSignatureData() {
        if (!canvasRef.current || canvasRef.current.isEmpty()) return "";
        return canvasRef.current.getTrimmedCanvas().toDataURL("image/png");
      },
    }));

    const handleEnd = useCallback(() => {
      onChange?.(canvasRef.current?.isEmpty() ?? true);
    }, [onChange]);

    function handleClear() {
      canvasRef.current?.clear();
      onChange?.(true);
    }

    return (
      <div className="space-y-2">
        <div className="relative rounded-lg border border-border bg-white overflow-hidden">
          <SignatureCanvas
            ref={canvasRef}
            canvasProps={{
              className: "w-full",
              style: { width: "100%", height: 200 },
            }}
            penColor="black"
            onEnd={handleEnd}
          />
          <div className="absolute bottom-8 left-6 right-6 border-b border-gray-300 pointer-events-none" />
          <span className="absolute bottom-2 left-6 text-xs text-gray-400 pointer-events-none">
            Sign here
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[48px] px-6"
          onClick={handleClear}
        >
          Clear
        </Button>
      </div>
    );
  }
);
