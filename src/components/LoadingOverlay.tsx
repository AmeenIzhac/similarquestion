
export function LoadingOverlay() {
  return (
    <div
      className="animate-fade-in"
      data-testid="loading-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 245, 247, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '2.5px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-heading)',
            marginBottom: '4px',
          }}>
            Finding similar questions
          </div>
          <div style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}>
            This may take a few seconds
          </div>
        </div>
      </div>
    </div>
  );
}
