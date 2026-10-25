import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'refresh' | 'endpoint';
}

export function Button({
  children,
  isLoading = false,
  variant = 'secondary',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'refresh':
        return 'refresh-btn';
      case 'endpoint':
        return 'endpoint-action-btn';
      default:
        return 'refresh-btn';
    }
  };

  return (
    <button
      className={`${getVariantClass()} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="refresh-icon spinning"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      )}
      {children}
    </button>
  );
}

export default Button;
