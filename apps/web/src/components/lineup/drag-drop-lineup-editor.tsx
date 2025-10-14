'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GripVertical,
  ArrowRightLeft,
  Zap,
  Undo2,
  Redo2,
  Save,
  RefreshCcw,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Player {
  id: string
  name: string
  position: string
  team: string
  fantasyPoints: number
  projectedPoints: number
  status?: string
  isStarter: boolean
}

interface LineupChange {
  type: 'move' | 'swap'
  from: { playerId: string; position: string; isStarter: boolean }
  to: { position: string; isStarter: boolean }
  timestamp: number
}

interface DragDropLineupEditorProps {
  roster: Player[]
  onSave: (roster: Player[]) => Promise<void>
  rosterSettings?: {
    positions: string[]
    benchSize: number
  }
}

function DraggablePlayerSlot({ player, position, isStarter }: {
  player: Player | null
  position: string
  isStarter: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: player?.id || `empty-${position}`,
    data: { player, position, isStarter }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getPositionColor = (pos: string) => {
    const colors: Record<string, string> = {
      QB: 'from-red-500/20 to-red-600/10',
      RB: 'from-green-500/20 to-green-600/10',
      WR: 'from-blue-500/20 to-blue-600/10',
      TE: 'from-yellow-500/20 to-yellow-600/10',
      K: 'from-purple-500/20 to-purple-600/10',
      DEF: 'from-orange-500/20 to-orange-600/10',
      DST: 'from-orange-500/20 to-orange-600/10',
      FLEX: 'from-indigo-500/20 to-indigo-600/10'
    }
    return colors[pos] || 'from-slate-500/20 to-slate-600/10'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'opacity-50'
      )}
    >
      {player ? (
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-lg',
          'bg-gradient-to-r',
          getPositionColor(player.position),
          'border-2 border-slate-700/50',
          'hover:border-blue-500/50',
          'transition-all duration-200',
          'cursor-move'
        )}>
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5 text-slate-400" />
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white truncate">{player.name}</span>
              {player.status && player.status !== 'ACTIVE' && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  {player.status}
                </span>
              )}
            </div>
            <div className="text-sm text-slate-400">
              {player.position} • {player.team}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-col items-end">
            <div className="text-lg font-bold text-white tabular-nums">
              {player.projectedPoints.toFixed(1)}
            </div>
            <div className="text-xs text-slate-400">projected</div>
          </div>
        </div>
      ) : (
        <div className={cn(
          'flex items-center justify-center p-8 rounded-lg',
          'border-2 border-dashed border-slate-700',
          'bg-slate-900/30',
          'hover:border-slate-600 hover:bg-slate-800/30',
          'transition-all duration-200'
        )}>
          <div className="text-center">
            <div className="text-slate-500 text-sm">Empty {position} Slot</div>
            <div className="text-xs text-slate-600 mt-1">Drag a player here</div>
          </div>
        </div>
      )}

      {/* Position Indicator */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2">
        <div className={cn(
          'px-2 py-1 rounded-md text-xs font-bold',
          'bg-slate-800 border border-slate-700',
          'text-slate-300'
        )}>
          {position}
        </div>
      </div>
    </div>
  )
}

export function DragDropLineupEditor({
  roster: initialRoster,
  onSave,
  rosterSettings = {
    positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
    benchSize: 6
  }
}: DragDropLineupEditorProps) {
  const [roster, setRoster] = useState(initialRoster)
  const [history, setHistory] = useState<LineupChange[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const starters = roster.filter(p => p.isStarter)
  const bench = roster.filter(p => !p.isStarter)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const activePlayer = roster.find(p => p.id === active.id)
    const overData = over.data.current

    if (activePlayer && overData) {
      const newRoster = [...roster]
      const activeIndex = newRoster.findIndex(p => p.id === activePlayer.id)
      
      // Toggle starter status
      newRoster[activeIndex] = {
        ...activePlayer,
        isStarter: overData.isStarter
      }

      setRoster(newRoster)
      setHasChanges(true)
      
      // Add to history
      const change: LineupChange = {
        type: 'move',
        from: {
          playerId: activePlayer.id,
          position: activePlayer.position,
          isStarter: activePlayer.isStarter
        },
        to: {
          position: overData.position,
          isStarter: overData.isStarter
        },
        timestamp: Date.now()
      }
      
      setHistory([...history.slice(0, historyIndex + 1), change])
      setHistoryIndex(historyIndex + 1)

      toast.success(`Moved ${activePlayer.name} to ${overData.isStarter ? 'Starting Lineup' : 'Bench'}`)
    }

    setActiveId(null)
  }

  const handleUndo = () => {
    if (historyIndex < 0) return
    
    const change = history[historyIndex]
    const newRoster = [...roster]
    const playerIndex = newRoster.findIndex(p => p.id === change.from.playerId)
    
    newRoster[playerIndex] = {
      ...newRoster[playerIndex],
      isStarter: change.from.isStarter
    }
    
    setRoster(newRoster)
    setHistoryIndex(historyIndex - 1)
    toast.info('Undid last change')
  }

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return
    
    const change = history[historyIndex + 1]
    const newRoster = [...roster]
    const playerIndex = newRoster.findIndex(p => p.id === change.from.playerId)
    
    newRoster[playerIndex] = {
      ...newRoster[playerIndex],
      isStarter: change.to.isStarter
    }
    
    setRoster(newRoster)
    setHistoryIndex(historyIndex + 1)
    toast.info('Redid change')
  }

  const handleOptimize = () => {
    // Sort by projected points and assign best players to starting slots
    const sortedRoster = [...roster].sort((a, b) => b.projectedPoints - a.projectedPoints)
    const newRoster = sortedRoster.map((player, index) => ({
      ...player,
      isStarter: index < rosterSettings.positions.length
    }))
    
    setRoster(newRoster)
    setHasChanges(true)
    toast.success('Optimized lineup based on projections!')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(roster)
      setHasChanges(false)
      toast.success('Lineup saved successfully!')
    } catch (error) {
      toast.error('Failed to save lineup')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setRoster(initialRoster)
    setHistory([])
    setHistoryIndex(-1)
    setHasChanges(false)
    toast.info('Reset to original lineup')
  }

  const projectedTotal = starters.reduce((sum, p) => sum + p.projectedPoints, 0)

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="text-sm text-slate-400">Projected</div>
            <div className="text-2xl font-bold text-blue-400 tabular-nums">
              {projectedTotal.toFixed(1)}
            </div>
          </div>

          {hasChanges && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
            >
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Unsaved Changes</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex < 0}
            className={cn(
              'p-2 rounded-lg',
              'bg-slate-800 hover:bg-slate-700',
              'border border-slate-700',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Undo"
          >
            <Undo2 className="w-5 h-5 text-slate-400" />
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className={cn(
              'p-2 rounded-lg',
              'bg-slate-800 hover:bg-slate-700',
              'border border-slate-700',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Redo"
          >
            <Redo2 className="w-5 h-5 text-slate-400" />
          </button>

          <button
            onClick={handleOptimize}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-purple-500/10 hover:bg-purple-500/20',
              'border border-purple-500/20 hover:border-purple-500/30',
              'text-purple-400 hover:text-purple-300',
              'transition-all'
            )}
          >
            <Zap className="w-5 h-5" />
            <span className="font-medium">Auto-Optimize</span>
          </button>

          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-slate-800 hover:bg-slate-700',
              'border border-slate-700',
              'text-slate-400',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCcw className="w-5 h-5" />
            <span className="font-medium">Reset</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={cn(
              'flex items-center gap-2 px-6 py-2 rounded-lg',
              'bg-emerald-500 hover:bg-emerald-600',
              'text-white font-semibold',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Lineup'}</span>
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Starting Lineup */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Starting Lineup</h2>
              <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                {starters.length} / {rosterSettings.positions.length}
              </div>
            </div>

            <SortableContext
              items={starters.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {rosterSettings.positions.map((position, index) => {
                  const player = starters.find(p => 
                    p.position === position || 
                    (position === 'FLEX' && ['RB', 'WR', 'TE'].includes(p.position))
                  ) || null

                  return (
                    <DraggablePlayerSlot
                      key={`starter-${position}-${index}`}
                      player={player}
                      position={position}
                      isStarter={true}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </div>

          {/* Bench */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="w-5 h-5" />
              <h2 className="text-xl font-bold text-white">Bench</h2>
              <div className="px-2 py-1 rounded bg-slate-700/50 text-slate-400 text-sm">
                {bench.length}
              </div>
            </div>

            <SortableContext
              items={bench.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {bench.map((player) => (
                  <DraggablePlayerSlot
                    key={player.id}
                    player={player}
                    position="BENCH"
                    isStarter={false}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="p-3 rounded-lg bg-blue-500/20 border-2 border-blue-500 shadow-2xl">
              <div className="text-white font-semibold">
                {roster.find(p => p.id === activeId)?.name}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

