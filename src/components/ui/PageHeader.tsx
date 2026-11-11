import React from 'react';

/**
 * The one page header every view uses: cyan eyebrow, serif title with the
 * page icon, muted subtitle, and an optional actions slot on the right.
 * Pages used to hand-roll this with inline styles, so some had an eyebrow and
 * icon and others did not — the pages no longer looked like one app.
 */
export const PageHeader: React.FC<{
  eyebrow?: React.ReactNode;
  icon?: React.ComponentType<{ size?: number }>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ eyebrow, icon: Icon, title, subtitle, actions, className, style }) => (
  <div className={`page-header-row ${className || ''}`} style={style}>
    <div className="page-header-text">
      {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
      <h2 className="page-title page-title-with-icon">
        {Icon && <span className="page-title-icon"><Icon size={28} /></span>}
        {title}
      </h2>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="page-header-actions">{actions}</div>}
  </div>
);
