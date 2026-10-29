import React, { forwardRef, useId } from 'react';
import { Check, Minus } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   Form primitives.

   The app previously used raw <input type="checkbox"> and browser-default
   selects, which look inconsistent across platforms and give no hover or focus
   feedback. These components share one visual language: a soft surface, a 1px
   hairline that warms on hover, and a single accent ring on focus.

   Everything is keyboard-accessible: the checkbox is a real input (visually
   hidden, not display:none) so space/arrow keys and screen readers keep working.
   ──────────────────────────────────────────────────────────────────────────── */

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  hint?: string;
  disabled?: boolean;
  /** Shows a dash instead of a tick, for "partially selected". */
  indeterminate?: boolean;
  className?: string;
  name?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { checked, onChange, label, hint, disabled, indeterminate, className, name },
  ref
) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={[
        'ui-check',
        checked ? 'is-checked' : '',
        disabled ? 'is-disabled' : '',
        className ?? ''
      ].filter(Boolean).join(' ')}
    >
      <span className="ui-check-box" aria-hidden="true">
        {indeterminate && !checked ? <Minus size={12} strokeWidth={3.2} /> : null}
        {checked ? <Check size={12} strokeWidth={3.4} /> : null}
      </span>
      <input
        ref={ref}
        id={id}
        name={name}
        type="checkbox"
        className="ui-check-input"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
      {label || hint ? (
        <span className="ui-check-text">
          {label ? <span className="ui-check-label">{label}</span> : null}
          {hint ? <span className="ui-check-hint">{hint}</span> : null}
        </span>
      ) : null}
    </label>
  );
});

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  hint?: string;
  disabled?: boolean;
  className?: string;
};

/** A toggle for an immediate on/off setting. */
export function Switch({ checked, onChange, label, hint, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={['ui-switch', checked ? 'is-on' : '', disabled ? 'is-disabled' : '', className ?? '']
        .filter(Boolean).join(' ')}
    >
      <input
        id={id}
        type="checkbox"
        className="ui-check-input"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
      <span className="ui-switch-track" aria-hidden="true">
        <span className="ui-switch-thumb" />
      </span>
      {label || hint ? (
        <span className="ui-check-text">
          {label ? <span className="ui-check-label">{label}</span> : null}
          {hint ? <span className="ui-check-hint">{hint}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

export type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  /** Optional second line, kept short. */
  note?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

type SegmentedProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** `pill` is compact and inline; `card` is a two-line tile. */
  variant?: 'pill' | 'card';
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
  /** Stretch tiles to fill the row. */
  fill?: boolean;
};

/**
 * Segmented control for 2–5 mutually exclusive choices.
 *
 * Rendered as real radio inputs inside a fieldset so arrow keys move between
 * options and the group is announced correctly. The moving highlight is a
 * background layer, so no layout shift happens when selection changes.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  variant = 'pill',
  size = 'md',
  ariaLabel,
  className,
  fill
}: SegmentedProps<T>) {
  const group = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={[
        'ui-seg',
        `ui-seg-${variant}`,
        `ui-seg-${size}`,
        fill ? 'is-fill' : '',
        className ?? ''
      ].filter(Boolean).join(' ')}
    >
      {options.map(option => {
        const id = `${group}-${option.value}`;
        const active = option.value === value;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={[
              'ui-seg-item',
              active ? 'is-active' : '',
              option.disabled ? 'is-disabled' : ''
            ].filter(Boolean).join(' ')}
          >
            <input
              id={id}
              type="radio"
              name={group}
              className="ui-check-input"
              value={option.value}
              checked={active}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
            />
            {option.icon ? <span className="ui-seg-icon" aria-hidden="true">{option.icon}</span> : null}
            <span className="ui-seg-body">
              <span className="ui-seg-label">{option.label}</span>
              {option.note ? <span className="ui-seg-note">{option.note}</span> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

type FieldProps = {
  label?: React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Right-aligned helper, e.g. a counter or a link. */
  aside?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
};

/** Consistent label / hint / error wrapper for any control. */
export function Field({ label, hint, error, required, aside, htmlFor, children, className }: FieldProps) {
  return (
    <div className={['ui-field', error ? 'has-error' : '', className ?? ''].filter(Boolean).join(' ')}>
      {(label || aside) && (
        <div className="ui-field-head">
          {label ? (
            <label className="ui-field-label" htmlFor={htmlFor}>
              {label}
              {required ? <span className="ui-field-req" aria-hidden="true">*</span> : null}
            </label>
          ) : <span />}
          {aside ? <span className="ui-field-aside">{aside}</span> : null}
        </div>
      )}
      {children}
      {error ? (
        <p className="ui-field-error" role="alert">{error}</p>
      ) : hint ? (
        <p className="ui-field-hint">{hint}</p>
      ) : null}
    </div>
  );
}
