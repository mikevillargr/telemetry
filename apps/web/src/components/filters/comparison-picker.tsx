'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowRightLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ComparisonMode = 'previous_period' | 'previous_year' | 'custom' | 'none';

interface ComparisonPickerProps {
  value: ComparisonMode;
  onChange: (mode: ComparisonMode) => void;
}

const modes: { value: ComparisonMode; label: string; description: string }[] = [
  { value: 'none', label: 'No comparison', description: 'View data without historical comparison' },
  { value: 'previous_period', label: 'Previous period', description: 'Compare to the immediately preceding date range' },
  { value: 'previous_year', label: 'Previous year', description: 'Compare to the exact same dates last year' },
];

export function ComparisonPicker({ value, onChange }: ComparisonPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const getDisplayValue = () => {
    if (value === 'none') return 'Compare';
    return `Compare: ${modes.find((m) => m.value === value)?.label || 'Custom'}`;
  };

  return (
    <div className="relative" ref={popoverRef}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'gap-2 rounded-full px-4 transition-colors',
          value !== 'none' ? 'text-primary bg-primary/5 hover:bg-primary/10' : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
        {getDisplayValue()}
        <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-1" />
      </Button>

      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 z-50 w-64 p-2 shadow-lg border-border/60">
          <div className="flex flex-col gap-1">
            {modes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => { onChange(mode.value); setIsOpen(false); }}
                className={cn(
                  'text-left px-3 py-2.5 rounded-md transition-colors flex items-start gap-3 group',
                  value === mode.value ? 'bg-primary/10' : 'hover:bg-accent'
                )}
              >
                <div className={cn(
                  'mt-0.5 w-4 h-4 flex items-center justify-center rounded-full border',
                  value === mode.value ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 group-hover:border-primary/50'
                )}>
                  {value === mode.value && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>
                <div className="flex-1">
                  <div className={cn('text-sm font-medium', value === mode.value ? 'text-primary' : 'text-foreground')}>
                    {mode.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{mode.description}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
