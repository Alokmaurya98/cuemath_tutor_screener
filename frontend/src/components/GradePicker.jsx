const GRADES = [
  { value: 'K-2', label: 'Kindergarten to Grade 2', short: 'K–2' },
  { value: '3-5', label: 'Grade 3 to Grade 5', short: '3–5' },
  { value: '6-8', label: 'Grade 6 to Grade 8', short: '6–8' },
  { value: '9-10', label: 'Grade 9 to Grade 10', short: '9–10' },
  { value: '11-12', label: 'Grade 11 to Grade 12', short: '11–12' },
];

export default function GradePicker({ selected, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {GRADES.map((grade) => {
        const isSelected = selected === grade.value;
        return (
          <button
            key={grade.value}
            type="button"
            onClick={() => onChange(grade.value)}
            className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
              isSelected
                ? 'border-[#00B050] bg-emerald-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-[#00B050] rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <span className="text-2xl font-bold text-gray-800">{grade.short}</span>
            <span className="text-xs text-gray-500 mt-1 text-center leading-tight">{grade.label}</span>
          </button>
        );
      })}
    </div>
  );
}
