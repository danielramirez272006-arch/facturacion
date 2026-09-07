
export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  ...props
}) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: '600',
    fontSize: '0.9rem',
    padding: '0.625rem 1.25rem',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s ease',
    border: 'none',
    textDecoration: 'none',
    boxSizing: 'border-box',
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
    },
    secondary: {
      background: '#f8fafc',
      color: '#334155',
      border: '1px solid #cbd5e1',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.25)',
    },
    outline: {
      background: 'transparent',
      color: '#4f46e5',
      border: '1.5px solid #4f46e5',
    },
    ghost: {
      background: 'transparent',
      color: '#64748b',
    },
  };

  const currentVariant = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`ui-button ${className}`}
      style={{ ...baseStyle, ...currentVariant }}
      {...props}
    >
      {children}
    </button>
  );
}
