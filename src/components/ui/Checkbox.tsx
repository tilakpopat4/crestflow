import React, { forwardRef, useEffect, useRef } from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean;
}

/**
 * Custom accessible checkbox adhering to CrestFlow's restrained design language (GEMINI.md).
 * Uses CSS Grid stacking to render an accessible custom SVG checkmark and indeterminate state.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', checked, indeterminate = false, onChange, id, title, disabled, ...props }, forwardedRef) => {
    const internalRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      const el = internalRef.current;
      if (el) {
        el.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate]);

    const setRef = (el: HTMLInputElement | null) => {
      internalRef.current = el;
      if (typeof forwardedRef === 'function') {
        forwardedRef(el);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      }
    };

    const isMarkVisible = Boolean(checked || indeterminate);

    return (
      <span className="inline-flex h-5 shrink-0 items-center">
        <span className="group/box grid size-4 shrink-0 grid-cols-1">
          <input
            ref={setRef}
            type="checkbox"
            id={id}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            title={title}
            className={`col-start-1 row-start-1 size-4 cursor-pointer appearance-none rounded-sm border border-[#888888] bg-[#1a1a1a] checked:border-[#4870aa] checked:bg-[#4870aa] indeterminate:border-[#4870aa] indeterminate:bg-[#4870aa] hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors duration-120 ${className}`}
            {...props}
          />
          <svg
            className={`pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white transition-opacity duration-120 ${
              isMarkVisible ? 'opacity-100' : 'opacity-0 group-has-checked/box:opacity-100 group-has-indeterminate/box:opacity-100'
            }`}
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            {indeterminate ? (
              <line x1="3" y1="7" x2="11" y2="7" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M3 8L6 11L11 3.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </span>
      </span>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;

