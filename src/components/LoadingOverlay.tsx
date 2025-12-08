
export function LoadingOverlay() {
  return (
    <div style={{ 
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 2,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '10px',
      padding: '40px'
    }}>
      <div style={{ 
        textAlign: 'center',
        fontSize: '18px',
        color: '#10a37f',
        fontWeight: 'bold'
      }}>
        Processing...
        <br />
        <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
          Finding similar questions...
        </span>
      </div>
    </div>
  );
}
