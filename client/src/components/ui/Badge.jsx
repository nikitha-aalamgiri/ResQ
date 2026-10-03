import React from 'react';

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  mono = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium border rounded select-none';

  const variants = {
    // Severity Variants (Muted per DESIGN.md)
    critical: 'bg-[#FDF2F2] text-[#B42318] border-[#F8D2D0]',
    high: 'bg-[#FEF6EE] text-[#B54708] border-[#FADCC3]',
    medium: 'bg-[#FEF9EE] text-[#A16207] border-[#F8E8B9]',
    low: 'bg-[#EDF6F1] text-[#3B7A57] border-[#C3E4D1]',
    safe: 'bg-[#EDF6F1] text-[#3B7A57] border-[#C3E4D1]',

    // Platform Neutral / Informational Variants
    default: 'bg-app-bg text-navy-ink border-app-border',
    teal: 'bg-teal-light text-teal-deep border-[#c4dcde]',
    outline: 'bg-transparent text-navy-ink border-app-border',
    subtle: 'bg-surface text-muted-text border-app-border',
  };

  const sizes = {
    sm: 'text-[11px] px-1.5 py-0.5 leading-none',
    md: 'text-xs px-2 py-0.5 leading-normal',
    lg: 'text-sm px-2.5 py-1 leading-normal',
  };

  const fontStyle = mono ? 'font-mono' : 'font-sans';

  return (
    <span
      className={`${baseStyles} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${fontStyle} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
