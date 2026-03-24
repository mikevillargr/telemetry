'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type DateRange = {
  from: Date | null;
  to: Date | null;
};

export type PresetRange = {
  label: string;
  getValue: () => DateRange;
};

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: PresetRange[];
}

const defaultPresets: PresetRange[] = [
  { label: 'Today', getValue: () => { const d = new Date(); return { from: d, to: d }; } },
  { label: 'Yesterday', getValue: () => { const d = new Date(); d.setDate(d.getDate() - 1); return { from: d, to: d }; } },
  { label: 'Last 7 Days', getValue: () => { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 6); return { from, to }; } },
  { label: 'Last 30 Days', getValue: () => { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 29); return { from, to }; } },
  { label: 'Last 90 Days', getValue: () => { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 89); return { from, to }; } },
  { label: 'Year to Date', getValue: () => { const to = new Date(); const from = new Date(to.getFullYear(), 0, 1); return { from, to }; } },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function DateRangePicker({ value, onChange, presets = defaultPresets }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value.from || new Date());
  const [tempRange, setTempRange] = useState<DateRange>(value);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTempRange(value);
      setCurrentMonth(value.from || new Date());
    }
  }, [isOpen, value]);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDisplayValue = () => {
    if (value.from && value.to) {
      const matchingPreset = presets.find((p) => {
        const pRange = p.getValue();
        return pRange.from?.toDateString() === value.from?.toDateString() && pRange.to?.toDateString() === value.to?.toDateString();
      });
      if (matchingPreset) return matchingPreset.label;
      if (value.from.toDateString() === value.to.toDateString()) return formatDate(value.from);
      return `${formatDate(value.from)} – ${formatDate(value.to)}`;
    }
    return 'Select date range';
  };

  const handleApply = () => {
    if (tempRange.from && tempRange.to) {
      if (tempRange.from > tempRange.to) {
        onChange({ from: tempRange.to, to: tempRange.from });
      } else {
        onChange(tempRange);
      }
      setIsOpen(false);
    }
  };

  const handlePresetClick = (preset: PresetRange) => {
    const range = preset.getValue();
    setTempRange(range);
    setCurrentMonth(range.from || new Date());
  };

  const handleDateClick = (date: Date) => {
    if (!tempRange.from || (tempRange.from && tempRange.to)) {
      setTempRange({ from: date, to: null });
    } else {
      if (date < tempRange.from) {
        setTempRange({ from: date, to: tempRange.from });
      } else {
        setTempRange({ from: tempRange.from, to: date });
      }
    }
  };

  const isInRange = (date: Date) => {
    if (!tempRange.from) return false;
    const end = tempRange.to || hoverDate;
    if (!end) return false;
    const start = tempRange.from < end ? tempRange.from : end;
    const finish = tempRange.from < end ? end : tempRange.from;
    return date >= start && date <= finish;
  };

  const isStart = (date: Date) => tempRange.from?.toDateString() === date.toDateString();
  const isEnd = (date: Date) => (tempRange.to || hoverDate)?.toDateString() === date.toDateString();

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: React.ReactNode[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const inRange = isInRange(date);
      const start = isStart(date);
      const end = isEnd(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(date)}
          onMouseEnter={() => setHoverDate(date)}
          className={cn(
            'h-8 w-8 text-sm rounded-md transition-colors relative',
            inRange && !start && !end && 'bg-primary/10',
            start && 'bg-primary text-primary-foreground',
            end && tempRange.to && 'bg-primary text-primary-foreground',
            !inRange && !start && !end && 'hover:bg-accent',
            isToday && !start && !end && 'font-bold text-primary',
          )}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  const prevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };

  const nextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 rounded-full px-4 text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="w-3.5 h-3.5" />
        {getDisplayValue()}
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 mt-2 z-50 p-0 shadow-lg border-border/60 w-auto">
          <div className="flex">
            {/* Presets */}
            <div className="w-36 border-r border-border p-2 space-y-0.5">
              {presets.map((preset) => {
                const pRange = preset.getValue();
                const isActive = pRange.from?.toDateString() === tempRange.from?.toDateString() && pRange.to?.toDateString() === tempRange.to?.toDateString();
                return (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors',
                      isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Calendar */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="p-1 rounded hover:bg-accent">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold">
                  {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button onClick={nextMonth} className="p-1 rounded hover:bg-accent">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                  <div key={d} className="text-[10px] font-medium text-muted-foreground h-6 flex items-center justify-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5" onMouseLeave={() => setHoverDate(null)}>
                {renderCalendar()}
              </div>
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleApply} disabled={!tempRange.from || !tempRange.to}>Apply</Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
