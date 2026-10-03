import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-deep focus:ring-offset-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-teal-deep text-white border border-teal-deep hover:bg-[#185860] active:bg-[#14474e]',
    secondary: 'bg-teal-light text-teal-deep border border-[#c4dcde] hover:bg-[#d8e9eb] active:bg-[#c9e1e3]',
    outline: 'bg-surface text-navy-ink border border-app-border hover:bg-app-bg active:bg-[#eeebe4]',
    danger: 'bg-severity-critical text-white border border-severity-critical hover:bg-[#991e14] active:bg-[#801911]',
    ghost: 'bg-transparent text-navy-ink hover:bg-teal-light hover:text-teal-deep border border-transparent',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1 gap-1.5 h-8',
    md: 'text-sm px-3.5 py-1.5 gap-2 h-9',
    lg: 'text-base px-4 py-2 gap-2.5 h-11',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 text-current" />
      ) : null}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
