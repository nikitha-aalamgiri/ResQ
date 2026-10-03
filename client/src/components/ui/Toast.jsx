import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export const Toast = ({
  title,
  message,
  type = 'info', // 'critical', 'high', 'medium', 'low', 'info', 'success'
  onClose,
  className = '',
  ...props
}) => {
  const configs = {
    critical: {
      icon: AlertCircle,
      borderColor: 'border-[#F8D2D0]',
      iconColor: 'text-severity-critical',
      bgTag: 'bg-[#FDF2F2]',
    },
    high: {
      icon: AlertTriangle,
      borderColor: 'border-[#FADCC3]',
      iconColor: 'text-severity-high',
      bgTag: 'bg-[#FEF6EE]',
    },
    medium: {
      icon: AlertTriangle,
      borderColor: 'border-[#F8E8B9]',
      iconColor: 'text-severity-medium',
      bgTag: 'bg-[#FEF9EE]',
    },
    low: {
      icon: CheckCircle2,
      borderColor: 'border-[#C3E4D1]',
      iconColor: 'text-severity-low',
      bgTag: 'bg-[#EDF6F1]',
    },
    success: {
      icon: CheckCircle2,
      borderColor: 'border-[#C3E4D1]',
      iconColor: 'text-severity-low',
      bgTag: 'bg-[#EDF6F1]',
    },
    info: {
      icon: Info,
      borderColor: 'border-[#c4dcde]',
      iconColor: 'text-teal-deep',
      bgTag: 'bg-teal-light',
    }
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`bg-surface border ${config.borderColor} rounded-md p-3 max-w-md w-full flex items-start gap-3 select-none ${className}`}
      {...props}
    >
      <div className={`p-1 rounded ${config.bgTag} shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="text-sm font-semibold text-navy-ink leading-tight">
            {title}
          </h4>
        )}
        {message && (
          <p className="text-xs text-muted-text mt-0.5 leading-normal">
            {message}
          </p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-muted-text hover:text-navy-ink p-1 rounded hover:bg-app-bg transition-colors shrink-0"
          aria-label="Close notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default Toast;
