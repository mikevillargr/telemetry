'use client';

import { useState } from 'react';
import { DateRangePicker, DateRange } from './date-range-picker';
import { ComparisonPicker, ComparisonMode } from './comparison-picker';

interface DateFilterBarProps {
  initialDateRange?: DateRange;
  initialComparison?: ComparisonMode;
  onDateRangeChange?: (range: DateRange) => void;
  onComparisonChange?: (mode: ComparisonMode) => void;
}

export function DateFilterBar({
  initialDateRange,
  initialComparison = 'previous_period',
  onDateRangeChange,
  onComparisonChange,
}: DateFilterBarProps) {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (initialDateRange) return initialDateRange;
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    return { from, to };
  });
  const [comparison, setComparison] = useState<ComparisonMode>(initialComparison);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    onDateRangeChange?.(range);
  };

  const handleComparisonChange = (mode: ComparisonMode) => {
    setComparison(mode);
    onComparisonChange?.(mode);
  };

  return (
    <div className="flex items-center gap-2">
      <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
      <ComparisonPicker value={comparison} onChange={handleComparisonChange} />
    </div>
  );
}
