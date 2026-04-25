import { useEffect, useState } from 'react';
import { getScoreBgColor } from '../utils/scoreUtils';

export default function ScoreBar({ name, score, delay = 0 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(score);
    }, 100 + delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  return (
    <div className="flex items-center gap-4">
      <span className="w-24 text-sm font-medium text-gray-700 shrink-0">{name}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${getScoreBgColor(score)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-14 text-sm font-semibold text-gray-800 text-right">{score}/100</span>
    </div>
  );
}
