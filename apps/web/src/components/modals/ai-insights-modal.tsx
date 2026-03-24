'use client';

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Sparkles,
  Search,
  Copy,
  RefreshCw,
  Send,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useClient } from '@/lib/client-context'
import { apiFetch } from '@/lib/api'
import { SuluMarkdown } from '@/components/sulu/sulu-markdown'

interface AIInsightsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface AgentResult {
  agentType: string
  response: string
  ragContext: Array<{ id: string; content: string; contentType: string; similarity: number }>
  model: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  agents?: AgentResult[]
}

const AGENT_COLORS: Record<string, string> = {
  data: 'text-[#E8450A] bg-[#E8450A]/10 border-[#E8450A]/30',
  visualization: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/30',
  strategy: 'text-emerald-600 bg-emerald-50 border-emerald-500/30',
  trends: 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/30',
}

const AGENT_LABELS: Record<string, string> = {
  data: 'Data Agent',
  visualization: 'Viz Agent',
  strategy: 'Strategy Agent',
  trends: 'Trends Agent',
}

export function AIInsightsModal({ isOpen, onClose }: AIInsightsModalProps) {
  const { selectedClient } = useClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen])

  const sendQuery = useCallback(async (queryText: string) => {
    if (!selectedClient || !queryText.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: queryText.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.role === 'assistant' && m.agents
          ? m.agents.map((a) => `[${a.agentType}] ${a.response}`).join('\n\n')
          : m.content,
      }))

      const result = await apiFetch<{
        agents: AgentResult[]
        query: string
        clientId: string
      }>(`/api/sulu/${selectedClient.id}/query`, {
        method: 'POST',
        body: {
          query: queryText.trim(),
          conversationHistory,
        },
      })

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.agents.map((a) => a.response).join('\n\n'),
        agents: result.agents,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}`,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }, [selectedClient, loading, messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendQuery(input)
  }

  const handleChip = (text: string) => {
    sendQuery(text)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl bg-card rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-medium text-base text-foreground">Sulu</h2>
            {selectedClient && (
              <Badge variant="secondary" className="ml-2 font-medium bg-secondary/50">
                {selectedClient.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                className="text-muted-foreground hover:text-foreground rounded-full hover:bg-accent/50 gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> New chat
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground rounded-full hover:bg-accent/50"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-background p-6 min-h-[400px]">
          {messages.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="p-4 bg-primary/5 rounded-2xl mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Ask Sulu anything
              </h3>
              <p className="text-muted-foreground max-w-md mb-8">
                Sulu analyzes your client data using specialized agents — Data, Strategy, Trends, and Visualization.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button onClick={() => handleChip('Summarize our organic traffic performance')} className="px-4 py-2 rounded-full border border-border/60 bg-card hover:bg-accent/50 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Summarize organic traffic
                </button>
                <button onClick={() => handleChip('What strategy should we prioritize this month?')} className="px-4 py-2 rounded-full border border-border/60 bg-card hover:bg-accent/50 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Strategy recommendations
                </button>
                <button onClick={() => handleChip('Find any anomalies or spikes in our data')} className="px-4 py-2 rounded-full border border-border/60 bg-card hover:bg-accent/50 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors flex items-center gap-2">
                  <Search className="w-3.5 h-3.5" /> Find anomalies
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end mb-2">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-5 py-3 max-w-lg text-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {msg.agents ? (
                        msg.agents.map((agent, agentIdx) => (
                          <div key={agentIdx} className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
                            <div className="border-b border-border/50 px-5 py-3 flex items-center justify-between">
                              <Badge variant="outline" className={`shadow-none gap-1.5 font-medium ${AGENT_COLORS[agent.agentType] || ''}`}>
                                <Sparkles className="w-3.5 h-3.5" /> {AGENT_LABELS[agent.agentType] || agent.agentType}
                              </Badge>
                              <div className="flex items-center gap-2">
                                {agent.ragContext.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {agent.ragContext.length} sources
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleCopy(agent.response)}
                                  title="Copy response"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="p-5">
                              <SuluMarkdown content={agent.response} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 rounded-xl p-4 text-sm text-red-600 dark:text-red-400">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-3 p-4 border border-border/50 rounded-xl bg-card">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Sulu is thinking...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Input Area */}
        <form onSubmit={handleSubmit} className="p-6 border-t border-border/50 bg-background shrink-0 flex flex-col items-center">
          <div className="relative flex items-center w-full max-w-3xl mx-auto">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedClient ? `Ask about ${selectedClient.name}...` : 'Select a client first...'}
              disabled={!selectedClient || loading}
              className="pr-14 h-14 rounded-2xl bg-accent/30 border-border/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background shadow-sm text-base"
            />
            <div className="absolute right-3 flex items-center gap-1">
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || !selectedClient || loading}
                className="rounded-xl w-10 h-10 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-transform hover:scale-105 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
