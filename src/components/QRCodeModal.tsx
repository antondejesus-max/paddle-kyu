import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ExternalLink, QrCode, Smartphone } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetupId: string;
  meetupName: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  meetupId,
  meetupName
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const liveUrl = `${window.location.origin}/live/${meetupId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2 text-lime-400">
          <QrCode className="w-6 h-6" />
          <h2 className="text-lg font-bold text-white">Spectator Live View</h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Scan with a smartphone camera to view live court scores, timers, and queue positions.
        </p>

        {/* QR Code Container */}
        <div className="bg-white p-5 rounded-2xl shadow-inner flex flex-col items-center justify-center mx-auto mb-5 w-fit border-4 border-slate-800">
          <QRCodeSVG
            value={liveUrl}
            size={200}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: '/paddle-ball.svg',
              x: undefined,
              y: undefined,
              height: 40,
              width: 40,
              excavate: true,
            }}
          />
          <div className="mt-2 text-center text-[11px] font-semibold text-slate-700">
            {meetupName}
          </div>
        </div>

        {/* Live URL box with Copy Button */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2 mb-4">
          <div className="truncate text-xs font-mono text-slate-300">
            {liveUrl}
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
              copied
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-lime-500 hover:bg-lime-400 text-slate-950'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={`/live/${meetupId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition border border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in New Tab</span>
          </a>
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
