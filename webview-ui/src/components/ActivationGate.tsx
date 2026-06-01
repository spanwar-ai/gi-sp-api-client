import React, { useState, useEffect, useRef } from 'react';
import { messageService } from '../services/messageService';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';

type Phase = 'idle' | 'sending' | 'sent' | 'verifying';

export function ActivationGate() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg?.type) return;

      if (msg.type === 'activationCodeSent') {
        if (msg.payload.success) {
          setPhase('sent');
          setError('');
          setTimeout(() => inputRef.current?.focus(), 100);
        } else {
          setPhase('idle');
          setError(msg.payload.error || 'Failed to send code.');
        }
      }

      if (msg.type === 'activationVerified') {
        if (msg.payload.success) {
          setPhase('idle');
        } else if (msg.payload.attemptsLeft <= 0) {
          setPhase('idle');
          setCode('');
          setError('Code expired or too many attempts. Request a new code.');
        } else {
          setPhase('sent');
          setError(`Invalid code. ${msg.payload.attemptsLeft} attempt${msg.payload.attemptsLeft === 1 ? '' : 's'} left.`);
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleRequestCode = () => {
    setPhase('sending');
    setError('');
    messageService.requestActivationCode();
  };

  const handleVerify = () => {
    if (code.length !== 6) return;
    setPhase('verifying');
    setError('');
    messageService.verifyActivationCode(code);
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-vscode-bg text-vscode-fg">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center px-6">
        <div className="w-16 h-16 rounded-full bg-vscode-input-bg border-2 border-vscode-border flex items-center justify-center text-2xl">
          &#128274;
        </div>

        <div>
          <h1 className="text-lg font-semibold mb-1">GI-SP REST & SOAP Client</h1>
          <p className="text-xs text-vscode-fg opacity-50">
            This extension requires activation. A 6-digit security code will
            be sent to the extension owner for approval.
          </p>
        </div>

        {phase === 'idle' && (
          <Button onClick={handleRequestCode}>
            Request Activation Code
          </Button>
        )}

        {phase === 'sending' && (
          <div className="flex items-center gap-2 text-sm text-vscode-fg opacity-70">
            <Spinner size="sm" />
            Sending code to owner...
          </div>
        )}

        {(phase === 'sent' || phase === 'verifying') && (
          <div className="flex flex-col items-center gap-3 w-full">
            <p className="text-xs text-green-400">
              Code sent. Contact the extension owner to get your 6-digit code.
            </p>

            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
              placeholder="------"
              className="w-40 text-center text-2xl tracking-[0.5em] font-mono bg-vscode-input-bg border border-vscode-input-border rounded px-3 py-2 focus:outline-none focus:border-vscode-focus-border placeholder:opacity-20"
            />

            <Button onClick={handleVerify} disabled={code.length !== 6 || phase === 'verifying'}>
              {phase === 'verifying' ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner size="sm" /> Verifying...
                </span>
              ) : (
                'Activate'
              )}
            </Button>

            <button
              type="button"
              onClick={handleRequestCode}
              className="text-[10px] text-vscode-fg opacity-40 hover:opacity-70"
            >
              Resend code
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <p className="text-[10px] text-vscode-fg opacity-25 mt-4">
          Publisher: GI-SP (Sonu Panwar)
        </p>
      </div>
    </div>
  );
}
