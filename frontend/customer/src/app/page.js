
export default function Home() {
  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
      color: '#0f172a',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ea580c', margin: '0 0 1rem 0' }}>Welcome to RESTUVEXO Ordering</h1>
      <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '500px', margin: '0' }}>
        Please scan the QR code located on your dining table to explore our digital menu and place your order instantly!
      </p>
    </div>
  );
}
