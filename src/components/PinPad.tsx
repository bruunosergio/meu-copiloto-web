import { useEffect, useRef } from 'react';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'apagar'];
const PIN_MAX_PADRAO = 6;

interface PinPadProps {
  value: string;
  onChange: (pin: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  label?: string;
}

/**
 * PIN de 4-6 dígitos: teclado físico (input focado) e pad na tela.
 */
export function PinPad({
  value,
  onChange,
  onSubmit,
  disabled = false,
  maxLength = PIN_MAX_PADRAO,
  autoFocus = false,
  label,
}: PinPadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  function aplicar(tecla: string) {
    if (disabled || tecla === '') return;
    if (tecla === 'apagar') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= maxLength) return;
    onChange(value + tecla);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-3">
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}

      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{4,6}"
        maxLength={maxLength}
        value={value}
        disabled={disabled}
        aria-label={label ?? 'PIN'}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, maxLength);
          onChange(digits);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit?.();
          }
        }}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-center tracking-[0.4em] text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        placeholder="••••"
      />

      <div className="flex justify-center gap-2">
        {Array.from({ length: Math.max(value.length, 4) }).map((_, index) => (
          <span
            key={index}
            className={`h-3 w-3 rounded-full border border-slate-400 ${
              index < value.length ? 'bg-slate-700' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TECLAS.map((tecla, index) =>
          tecla === '' ? (
            <div key={`vazio-${index}`} />
          ) : (
            <button
              key={tecla}
              type="button"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => aplicar(tecla)}
              className="rounded-lg border border-slate-200 bg-white py-3 text-lg font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-60"
            >
              {tecla === 'apagar' ? '⌫' : tecla}
            </button>
          ),
        )}
      </div>
      <p className="text-center text-xs text-slate-400">Digite no teclado ou toque nos números</p>
    </div>
  );
}
