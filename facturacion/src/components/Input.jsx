
export default function Input({
  label,
  error,
  id,
  type = 'text',
  className = '',
  required = false,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%', textAlign: 'left' }} className="ui-input-group">
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#334155',
          }}
        >
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`ui-input ${className}`}
        style={{
          width: '100%',
          padding: '0.625rem 0.85rem',
          fontSize: '0.9rem',
          borderRadius: '6px',
          border: error ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          color: '#1e293b',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.15rem' }}>
          {error}
        </span>
      )}
    </div>
  );
}
