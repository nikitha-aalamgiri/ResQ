import React from 'react';

export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  className = '',
  id,
  type = 'text',
  ...props
}, ref) => {
  const inputId = id || props.name;

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-navy-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={`w-full px-3 py-2 text-xs text-navy-ink bg-surface border rounded-md transition-colors placeholder:text-muted-text/60 focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-transparent ${
          error ? 'border-[#B42318] focus:ring-[#B42318]' : 'border-app-border'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-[11px] text-[#B42318]">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted-text">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
