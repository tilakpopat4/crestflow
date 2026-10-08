import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatYMDToDMY, parseDMYToYMD, formatLocalDateToYMD } from '../lib/dateUtils';

interface DateInputProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void; // emits YYYY-MM-DD
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  required = false,
  className = '',
  placeholder = 'DD/MM/YYYY',
  disabled = false,
  id,
  name
}) => {
  const [displayText, setDisplayText] = useState(() => formatYMDToDMY(value));
  const hiddenPickerRef = useRef<HTMLInputElement>(null);
  const isBackspacingRef = useRef(false);

  // Sync internal display text if external value changes (e.g. form reset, item loaded for edit)
  useEffect(() => {
    const formatted = formatYMDToDMY(value);
    setDisplayText(formatted);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    isBackspacingRef.current = e.key === 'Backspace' || e.key === 'Delete';

    // If backspacing and the previous character is a slash, delete both the slash and the number before it
    if (e.key === 'Backspace') {
      const target = e.currentTarget;
      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? 0;

      if (start === end && (start === 3 || start === 6)) {
        e.preventDefault();
        const before = displayText.slice(0, start - 2);
        const after = displayText.slice(start);
        const next = before + after;
        setDisplayText(next);
        const newCursor = Math.max(0, start - 2);
        setTimeout(() => {
          target.setSelectionRange(newCursor, newCursor);
        }, 0);
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (isBackspacingRef.current) {
      setDisplayText(raw);
      const parsed = parseDMYToYMD(raw);
      if (parsed) {
        onChange(parsed);
      }
      return;
    }

    // Auto-mask digits: format as DD/MM/YYYY as user types
    const digits = raw.replace(/\D/g, '');
    let formatted = raw;

    if (digits.length > 0) {
      if (digits.length <= 2) {
        // If user finished 2 digits of day, auto-append slash
        formatted = digits.length === 2 && !raw.includes('/') ? `${digits}/` : digits;
      } else if (digits.length <= 4) {
        const d = digits.slice(0, 2);
        const m = digits.slice(2);
        formatted = m.length === 2 && raw.split('/').length < 3 ? `${d}/${m}/` : `${d}/${m}`;
      } else {
        const d = digits.slice(0, 2);
        const m = digits.slice(2, 4);
        const y = digits.slice(4, 8);
        formatted = `${d}/${m}/${y}`;
      }
    }

    setDisplayText(formatted);

    // If valid date is completed, notify parent
    const parsed = parseDMYToYMD(formatted);
    if (parsed) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (!displayText.trim()) {
      if (required && value) {
        setDisplayText(formatYMDToDMY(value));
      } else {
        onChange('');
      }
      return;
    }

    // Attempt to parse what user typed
    const parsed = parseDMYToYMD(displayText);
    if (parsed) {
      setDisplayText(formatYMDToDMY(parsed));
      onChange(parsed);
    } else {
      // If user typed a single day number (e.g. "25"), auto-complete with current month & year
      const trimmed = displayText.trim();
      if (/^\d{1,2}$/.test(trimmed)) {
        const day = parseInt(trimmed, 10);
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const testYmd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const recheck = parseDMYToYMD(formatYMDToDMY(testYmd));
        if (recheck) {
          setDisplayText(formatYMDToDMY(recheck));
          onChange(recheck);
          return;
        }
      }

      // If invalid, revert back to previous valid value or today
      if (value) {
        setDisplayText(formatYMDToDMY(value));
      } else {
        const today = formatLocalDateToYMD(new Date());
        setDisplayText(formatYMDToDMY(today));
        onChange(today);
      }
    }
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedYmd = e.target.value;
    if (selectedYmd) {
      setDisplayText(formatYMDToDMY(selectedYmd));
      onChange(selectedYmd);
    }
  };

  const triggerPicker = () => {
    if (disabled) return;
    try {
      if (hiddenPickerRef.current && typeof hiddenPickerRef.current.showPicker === 'function') {
        hiddenPickerRef.current.showPicker();
      } else {
        hiddenPickerRef.current?.focus();
      }
    } catch {
      hiddenPickerRef.current?.focus();
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        value={displayText}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={10}
        autoComplete="off"
        className={`w-full pr-10 font-mono tracking-wide ${className}`}
      />

      {/* Calendar picker trigger button */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
        <button
          type="button"
          disabled={disabled}
          onClick={triggerPicker}
          tabIndex={-1}
          title="Open calendar picker"
          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <Calendar size={16} />
        </button>

        {/* Hidden native date picker overlay for guaranteed mobile & desktop picker support */}
        <input
          ref={hiddenPickerRef}
          type="date"
          tabIndex={-1}
          value={value || ''}
          onChange={handleNativePickerChange}
          className="sr-only"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
