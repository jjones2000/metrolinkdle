// 1. Define your PNG paths (Update these URLs to your actual hosted images)
const EMOJI = {
  GREEN: './large-green-circle_1f7e2.png',
  YELLOW: './large-yellow-circle_1f7e1.png',
  RED: './large-red-circle_1f534.png'
};

// 2. Small helper component to keep the list clean
const StatusIcon = ({ src }) => (
  <img
    src={src}
    alt="status"
    style={{ width: 18, height: 18, verticalAlign: 'middle', margin: '0 4px' }}
  />
);

export function HowToModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '12px 16px', backdropFilter: 'blur(3px)'
    }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{
        background: '#1E1E1E', border: '2px solid #383838', borderRadius: 20,
        padding: 'clamp(14px, 3vw, 24px)', maxWidth: 440, width: '100%', position: 'relative',
        animation: 'popIn .3s cubic-bezier(.34,1.56,.64,1)',
        maxHeight: 'calc(100vh - 24px)', boxSizing: 'border-box'
      }}>

        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12, background: '#2A2A2A',
          border: '1px solid #383838', color: '#888', width: 28, height: 28, borderRadius: '50%',
          cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>✕</button>

        <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 'clamp(20px, 5vw, 26px)',
          letterSpacing: 2, color: '#FFCC00', marginBottom: 'clamp(8px, 2vw, 12px)', marginTop: 0 }}>
          How to Play Metrolinkdle
        </h2>

        <p style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: '#888', lineHeight: 1.5,
          marginBottom: 'clamp(8px, 2vw, 12px)', marginTop: 0 }}>
          A new secret Metrolink stop is chosen every day.
          You have <strong style={{ color: '#F5F5F5' }}>8 guesses</strong> to find it.
        </p>

        {/* 3. Updated list using the StatusIcon helper */}
        <ul style={{ listStyle: 'none', paddingLeft: 0, fontSize: 'clamp(12px, 3vw, 14px)',
          color: '#888', lineHeight: 'clamp(1.8, 3vw, 2.2)', marginBottom: 'clamp(8px, 2vw, 12px)', marginTop: 0 }}>
          <li>
            <strong style={{ color: '#F5F5F5' }}>Line</strong> —
            <StatusIcon src={EMOJI.GREEN} /> shares a line,
            <StatusIcon src={EMOJI.RED} /> doesn't
          </li>
          <li>
            <strong style={{ color: '#F5F5F5' }}>Stops Away</strong> —
            <StatusIcon src={EMOJI.GREEN} /> 0–2,
            <StatusIcon src={EMOJI.YELLOW} /> 3–6,
            <StatusIcon src={EMOJI.RED} /> 7+
          </li>
          <li>
            <strong style={{ color: '#F5F5F5' }}>Direction</strong> — Compass arrow pointing toward the target
          </li>
          <li>
            <strong style={{ color: '#F5F5F5' }}>Zone</strong> —
            <StatusIcon src={EMOJI.GREEN} /> same,
            <StatusIcon src={EMOJI.YELLOW} /> 1 off,
            <StatusIcon src={EMOJI.RED} /> 2+ off
          </li>
        </ul>

        <p style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: '#666', lineHeight: 1.5, margin: 0 }}>
          Guessed stops light up on the network map. City-centre stops like Piccadilly
          Gardens serve many lines — use them early to triangulate!
        </p>
      </div>
    </div>
  );
}