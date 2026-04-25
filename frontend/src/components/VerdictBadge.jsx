export default function VerdictBadge({ verdict }) {
  const config = {
    ADVANCE: {
      label: 'Recommended',
      icon: '✅',
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-300'
    },
    HOLD: {
      label: 'Further Review',
      icon: '⏸',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-300'
    },
    REJECT: {
      label: 'Not Recommended',
      icon: '❌',
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300'
    }
  };

  const c = config[verdict] || config.HOLD;

  return (
    <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      <span className="text-lg">{c.icon}</span>
      <span className="font-semibold text-sm">{c.label}</span>
    </div>
  );
}
