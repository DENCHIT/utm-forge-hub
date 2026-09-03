import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QrPanelProps {
  url: string;
  joinCode: string;
  /** Rendered pixel size. Kept generous - it has to scan from row 30. */
  size?: number;
}

export function QrPanel({ url, joinCode, size = 640 }: QrPanelProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((result) => {
        if (!cancelled) setDataUrl(result);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  return (
    <div className="flex flex-col items-center gap-[0.6em]">
      <div className="rounded-card bg-white p-[0.6em]">
        {dataUrl ? (
          <img src={dataUrl} alt={`QR code to join with code ${joinCode}`} className="w-[9em]" />
        ) : (
          <div className="h-[9em] w-[9em] animate-pulse rounded bg-neutral-200" />
        )}
      </div>
      <div className="text-center">
        <p className="text-[0.7em] uppercase tracking-[0.28em] text-muted">or go to</p>
        <p className="font-display text-[1.1em] font-bold">
          {url.replace(/^https?:\/\//, "")}
        </p>
        <p className="mt-[0.3em] font-display text-[1.6em] font-black tracking-[0.16em] text-brand">
          {joinCode}
        </p>
      </div>
    </div>
  );
}
