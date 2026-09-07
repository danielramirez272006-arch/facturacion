
export default function Card({ children, className = '', style = {}, ...props }) {
  return (
    <div
      className={`ui-card ${className}`}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0',
        padding: '1.75rem',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
