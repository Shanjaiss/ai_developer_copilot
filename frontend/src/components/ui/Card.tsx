import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  span?: 5 | 7 | 12;
  title?: string;
  icon?: string;
  headerAction?: ReactNode;
  className?: string;
}

export function Card({
  children,
  span = 12,
  title,
  icon,
  headerAction,
  className = '',
}: CardProps) {
  const spanClass = `card-span-${span}`;

  return (
    <section className={`card ${spanClass} ${className}`.trim()}>
      {(title || headerAction) && (
        <div className="card-header">
          {title && (
            <h3 className="card-title">
              {icon && <span className="card-icon">{icon}</span>}
              {title}
            </h3>
          )}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export default Card;
