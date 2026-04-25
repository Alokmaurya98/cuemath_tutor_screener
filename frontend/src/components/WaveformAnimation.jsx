export default function WaveformAnimation({ isActive }) {
  return (
    <div className="flex items-end justify-center gap-1 h-10">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all duration-150 ${
            isActive ? 'bg-emerald-500' : 'bg-gray-300'
          }`}
          style={{
            height: isActive ? undefined : '8px',
            animation: isActive
              ? `waveform 0.8s ease-in-out ${i * 0.1}s infinite alternate`
              : 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes waveform {
          0% { height: 8px; }
          50% { height: 28px; }
          100% { height: 16px; }
        }
      `}</style>
    </div>
  );
}
