'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText } from 'lucide-react';

interface KeyObservation {
  type: 'opportunity' | 'risk' | 'emerging';
  headline: string;
  description: string;
}

interface RecommendedAction {
  priority: 'urgent' | 'high' | 'medium';
  action: string;
}

interface StrategyAgentAnalysisProps {
  narrative: string[];
  keyObservations: KeyObservation[];
  recommendedActions: RecommendedAction[];
  onRefine?: () => void;
  onExport?: () => void;
}

export function StrategyAgentAnalysis({
  narrative = [],
  keyObservations = [],
  recommendedActions = [],
  onRefine,
  onExport,
}: StrategyAgentAnalysisProps) {
  const highlightText = (text: string) => {
    // Highlight positive keywords in emerald
    const positiveKeywords = ['growth', 'increase', 'improved', 'up', 'strong', 'momentum', 'performing well', 'success'];
    // Highlight risk keywords in amber
    const riskKeywords = ['decline', 'down', 'risk', 'decrease', 'trending down', 'concern', 'warning'];
    
    let highlighted = text;
    
    positiveKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword}[a-z]*)\\b`, 'gi');
      highlighted = highlighted.replace(regex, '<span class="text-emerald-600 dark:text-emerald-400 font-medium">$1</span>');
    });
    
    riskKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword}[a-z]*)\\b`, 'gi');
      highlighted = highlighted.replace(regex, '<span class="text-amber-600 dark:text-amber-400 font-medium">$1</span>');
    });
    
    return highlighted;
  };

  const getObservationColor = (type: KeyObservation['type']) => {
    switch (type) {
      case 'opportunity':
        return 'bg-emerald-500';
      case 'risk':
        return 'bg-amber-500';
      case 'emerging':
        return 'bg-blue-500';
    }
  };

  const getObservationLabel = (type: KeyObservation['type']) => {
    switch (type) {
      case 'opportunity':
        return 'Opportunity';
      case 'risk':
        return 'Risk';
      case 'emerging':
        return 'Emerging';
    }
  };

  const getPriorityColor = (priority: RecommendedAction['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
    }
  };

  const getPriorityLabel = (priority: RecommendedAction['priority']) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Narrative */}
      <div className="space-y-3">
        {narrative.map((paragraph, idx) => (
          <p
            key={idx}
            className="text-sm text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightText(paragraph) }}
          />
        ))}
      </div>

      {/* Key Observations */}
      {keyObservations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Key Observations</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {keyObservations.map((observation, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-border/50 bg-card/50 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getObservationColor(observation.type)}`} />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {getObservationLabel(observation.type)}
                  </span>
                </div>
                <h5 className="text-sm font-semibold text-foreground leading-snug">
                  {observation.headline}
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {observation.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Focus */}
      {recommendedActions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Recommended Focus This Period</h4>
          <div className="space-y-2">
            {recommendedActions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 flex items-start gap-2">
                  <p className="text-sm text-foreground leading-relaxed flex-1">
                    {action.action}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 px-1.5 font-medium shrink-0 ${getPriorityColor(action.priority)}`}
                  >
                    {getPriorityLabel(action.priority)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-2 shadow-sm"
          onClick={onRefine}
        >
          <Sparkles className="w-4 h-4" /> Refine Analysis
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full gap-2 text-muted-foreground hover:text-foreground"
          onClick={onExport}
        >
          <FileText className="w-4 h-4" /> Export to Report
        </Button>
      </div>
    </div>
  );
}
