
export function LoadingOverlay() {
  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '4px'
          }}>
            Finding similar questions…
          </div>
          <div style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)'
          }}>
            This may take a few seconds
          </div>
        </div>
      </div>
    </div>
  );
}
