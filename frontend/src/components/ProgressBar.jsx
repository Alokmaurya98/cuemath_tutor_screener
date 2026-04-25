export default function ProgressBar({ exchangeCount, isComplete }) {
  const getProgress = () => {
    if (isComplete) return { percent: 100, label: 'Interview complete', time: '' };
    switch (exchangeCount) {
      case 0: return { percent: 3, label: 'Starting...', time: '' };
      case 1: return { percent: 10, label: 'Getting started...', time: '~6 minutes remaining' };
      case 2: return { percent: 25, label: 'Getting started...', time: '~5 minutes remaining' };
      case 3: return { percent: 40, label: 'Warming up...', time: '~4 minutes remaining' };
      case 4: return { percent: 55, label: 'Going deeper...', time: '~3 minutes remaining' };
      case 5: return { percent: 70, label: 'Going deeper...', time: '~2 minutes remaining' };
      case 6: return { percent: 85, label: 'Almost there...', time: '~1 minutes remaining' };
      default: return { percent: 95, label: 'Wrapping up...', time: 'Almost done' };
    }
  };

  const { percent, label, time } = getProgress();

  return (
    <div className="w-56">
      {/* Stage label and time */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {time && (
          <span className="text-[10px] text-gray-400">{time}</span>
        )}
      </div>

      {/* Progress bar track */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            transition: 'width 0.8s ease',
            background: isComplete
              ? '#00B050'
              : 'linear-gradient(90deg, #34d399, #00B050)',
          }}
        />
      </div>
    </div>
  );
}
