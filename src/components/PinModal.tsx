import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  defaultPin?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onSuccess,
  defaultPin = '1234'
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState<boolean>(false);
  const [currentExpectedPin] = useState<string>(() => {
    return localStorage.getItem('paddle_admin_pin') || defaultPin;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          handleDigit(e.key);
        }
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter' && pin.length === 4) {
        verifyPin(pin);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, currentExpectedPin]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    setError(null);
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setError(null);
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError(null);
    setPin('');
  };

  const verifyPin = (candidate: string) => {
    if (candidate === currentExpectedPin) {
      setError(null);
      onSuccess();
    } else {
      setError('Incorrect PIN. Default is 1234.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl shadow-lime-950/20 text-center">
        {/* Header Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center mb-4 text-lime-400">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white mb-1">Court-side Admin Access</h2>
        <p className="text-xs text-slate-400 mb-6">
          Enter 4-digit PIN to manage courts and queue.
          <span className="block text-lime-400/80 font-mono mt-0.5">(Default: 1234)</span>
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-mono transition-all duration-150 ${
                  isFilled
                    ? 'border-lime-500 bg-lime-500/15 text-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.3)]'
                    : 'border-slate-700 bg-slate-950 text-slate-500'
                }`}
              >
                {isFilled ? (showPin ? pin[idx] : '•') : ''}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 max-w-[280px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-lime-500/20 active:border-lime-500/50 border border-slate-700/50 text-xl font-semibold text-white transition-all duration-100 flex items-center justify-center shadow-sm"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 text-xs font-medium text-slate-400 active:bg-slate-700 transition flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-lime-500/20 border border-slate-700/50 text-xl font-semibold text-white transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 text-xs font-medium text-slate-400 active:bg-slate-700 transition flex items-center justify-center"
          >
            ⌫ Del
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 px-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="flex items-center gap-1 hover:text-slate-300 transition"
          >
            {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPin ? 'Hide' : 'Reveal'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPin('1234');
              verifyPin('1234');
            }}
            className="text-lime-400 hover:underline flex items-center gap-1"
          >
            <KeyRound className="w-3 h-3" /> Quick fill (1234)
          </button>
        </div>
      </div>
    </div>
  );
};
