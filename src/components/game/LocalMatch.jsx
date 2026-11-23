import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Undo2, RotateCcw, Bot, Eye, Swords, ArrowLeft } from 'lucide-react'
import { ENGINES } from '../../lib/engines.js'
import { usePref } from '../../lib/prefs.js'
import ReversiBoard, { BOARD_THEMES } from '../boards/ReversiBoard.jsx'
import TicTacToeBoard from '../boards/TicTacToeBoard.jsx'
import LudoBoard, { Dice } from '../boards/LudoBoard.jsx'
import SnakesBoard from '../boards/SnakesBoard.jsx'
import MatchReview from './MatchReview.jsx'
import { Button, Modal } from '../UI.jsx'

const clone = (st) => structuredClone(st)
export const DIFFICULTIES = {
  easy: { label: 'Easy', sub: 'Casual — makes human mistakes' },
  normal: { label: 'Medium', sub: 'Strategist — positional play' },
  best: { label: 'Hard', sub: 'Master — deep search & endgame solver' },
}

export default function LocalMatch({ gameId, mode, config, onExit }) {
  const eng = ENGINES[gameId]
  const [theme, setTheme] = usePref(`gh:board-theme-${gameId}`, gameId === 'reversi' ? 'emerald' : 'default')
  const [state, setState] = useState(() => eng.create(['Player 1', 'Player 2']))
  const [history, setHistory] = useState([])
  const [moves, setMoves] = useState([])
  const [lastFlips, setLastFlips] = useState(null)
  const [lastEvent, setLastEvent] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [result, setResult] = useState(null)
  const [review, setReview] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const movesRef = useRef(moves)
  movesRef.current = moves

  const isAi = mode === 'ai'
  const aiSeat = isAi ? (config.humanSeat === 0 ? 1 : 0) : -1
  const mySeat = isAi ? config.humanSeat : state.turn
  const names = config.names || ['Player 1', 'Player 2']
  const seatLabel = (i) => (isAi && i === aiSeat ? `${names[i]} · ${DIFFICULTIES[config.difficulty]?.label || 'Hard'} AI` : names[i])

  const saveLocalHistory = useCallback((res) => {
    try {
      const log = JSON.parse(localStorage.getItem('gh:local-matches') || '[]')
      log.unshift({
        gameId, mode, at: Date.now(),
        names, scores: res.scores || null,
        winner: res.draw ? -1 : (res.winnerIdx ?? res.winnerSeat ?? -1),
      })
      localStorage.setItem('gh:local-matches', JSON.stringify(log.slice(0, 20)))
    } catch { /* storage unavailable */ }
  }, [gameId, mode, names])

  const finish = useCallback((res, movesList) => {
    const scores = [0, 1].map((i) => (res.scores?.[i] ?? (eng.scoreOf ? eng.scoreOf(stateRef.current, i) : 0)))
    setResult({ winnerSeat: res.winnerIdx ?? res.winnerSeat ?? null, draw: !!res.draw, scores, moves: movesList.length })
    saveLocalHistory(res)
  }, [eng, saveLocalHistory])
  const finishRef = useRef(finish)
  finishRef.current = finish

  const commit = useCallback((entry, producer) => {
    const st = stateRef.current
    const res = producer(st)
    if (res?.error) return res
    setHistory((h) => [...h.slice(-80), clone(st)])
    setState(clone(st))
    setMoves((m) => {
      const next = [...m, entry]
      if (res?.finished) setTimeout(() => finishRef.current(res, next), 0)
      return next
    })
    return res
  }, [])

  const onMove = useCallback((mv) => {
    if (result) return
    setLastFlips(null)
    const seat = stateRef.current.turn
    const res = commit({ seat, action: 'move', move: mv }, (st) => eng.apply(st, seat, mv))
    if (res?.error) return
    if (gameId === 'reversi') setLastFlips(res.flips || [])
  }, [result, eng, commit, gameId])

  const onPass = useCallback(() => {
    if (result) return
    setLastFlips(null)
    const seat = stateRef.current.turn
    commit({ seat, action: 'pass', move: null }, (st) => eng.pass(st, seat))
  }, [result, eng, commit])

  const onRoll = useCallback(() => {
    if (result) return
    setLastEvent({ type: 'roll' })
    setTimeout(() => setLastEvent(null), 700)
    const seat = stateRef.current.turn
    const res = commit({ seat, action: 'roll', roll: null }, (st) => eng.roll(st, seat))
    if (res?.roll != null) {
      setMoves((m) => m.map((e, idx) => (idx === m.length - 1 && e.action === 'roll' ? { ...e, roll: res.roll } : e)))
      setLastEvent({ type: 'roll', roll: res.roll })
    }
  }, [result, eng, commit])

  const undo = useCallback(() => {
    if (!history.length || result) return
    let steps = 1
    if (isAi && history[history.length - 1]?.turn === aiSeat) steps = Math.min(2, history.length)
    const prev = history[history.length - steps]
    setHistory(history.slice(0, history.length - steps))
    setState(clone(prev))
    setMoves(movesRef.current.slice(0, Math.max(0, movesRef.current.length - steps)))
    setLastFlips(null)
    setThinking(false)
  }, [history, result, isAi, aiSeat])

  const rematch = useCallback(() => {
    setState(eng.create(['Player 1', 'Player 2']))
    setHistory([]); setMoves([]); setLastFlips(null); setLastEvent(null)
    setResult(null); setThinking(false)
  }, [eng])

  useEffect(() => {
    if (!isAi || result || state.turn !== aiSeat) return
    setThinking(true)
    const t = setTimeout(() => {
      const st = stateRef.current
      const snapshot = clone(st)
      setHistory((h) => [...h.slice(-80), snapshot])
      let entry = null
      let reversed = false
      if (eng.ludo) {
        const decision = eng.bot(st, aiSeat, config.difficulty)
        if (decision.action === 'roll') {
          const res = eng.roll(st, aiSeat)
          entry = { seat: aiSeat, action: 'roll', roll: res?.roll ?? null }
          if (res?.roll != null) setLastEvent({ type: 'roll', roll: res.roll })
        } else {
          const res = eng.apply(st, aiSeat, { token: decision.token })
          entry = { seat: aiSeat, action: 'move', move: { token: decision.token } }
          if (res?.finished) setTimeout(() => finishRef.current(res, [...movesRef.current, entry]), 0)
        }
      } else if (eng.dice) {
        const res = eng.roll(st, aiSeat)
        entry = { seat: aiSeat, action: 'roll', roll: res?.roll ?? null }
        if (res?.roll != null) setLastEvent({ type: 'roll', roll: res.roll })
      } else {
        const mv = eng.bot(st, aiSeat, config.difficulty)
        if (mv == null) {
          const res = eng.pass?.(st, aiSeat)
          entry = { seat: aiSeat, action: 'pass', move: null }
          if (res?.finished) setTimeout(() => finishRef.current(res, [...movesRef.current, entry]), 0)
        } else {
          const move = typeof mv === 'number' ? { i: mv } : mv
          const res = eng.apply(st, aiSeat, move)
          entry = { seat: aiSeat, action: 'move', move }
          if (gameId === 'reversi' && res?.flips) setLastFlips(res.flips)
          if (res?.finished) setTimeout(() => finishRef.current(res, [...movesRef.current, entry]), 0)
        }
      }
      setState(clone(st))
      if (entry && !reversed) setMoves((m) => m.map((e, idx) => (idx === m.length - 1 && e.action === 'roll' && entry.action === 'roll' ? { ...e, roll: entry.roll } : e)))
      if (entry && entry.action !== 'roll') setMoves((m) => [...m, entry])
      setThinking(false)
    }, 600 + Math.random() * 500)
    return () => clearTimeout(t)
  }, [isAi, result, state.turn, aiSeat, eng, config.difficulty, gameId])

  const renderBoard = () => {
    if (gameId === 'reversi') {
      return (
        <ReversiBoard
          state={state} mySeat={mySeat}
          playing={!result && (isAi ? state.turn === config.humanSeat : true)}
          onMove={onMove} onPass={onPass}
          theme={theme === 'default' ? 'emerald' : theme}
          lastFlips={lastFlips} showHints={config.hints !== false}
        />
      )
    }
    if (gameId === 'tictactoe') {
      return <TicTacToeBoard state={state} mySeat={mySeat} playing={!result && !thinking} onMove={onMove} lastEvent={lastEvent} />
    }
    if (gameId === 'ludo') {
      return <LudoBoard state={state} mySeat={mySeat} playing={!result} onMove={onMove} onRoll={onRoll} />
    }
    return <SnakesBoard state={state} mySeat={mySeat} playing={!result} onRoll={onRoll} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onExit} className="cursor-pointer rounded-xl border border-line p-2.5 text-ink-dim transition hover:border-emerald-neon/40 hover:text-ink" aria-label="Back to lobby">
          <ArrowLeft size={17} />
        </button>
        <div>
          <h2 className="text-lg font-extrabold leading-tight">{isAi ? 'Offline — vs AI' : 'Pass & Play'}</h2>
          <p className="text-xs text-ink-faint">{isAi ? DIFFICULTIES[config.difficulty]?.sub : 'Two players, one device'}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isAi && thinking && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-royal/40 bg-royal/10 px-3 py-1 text-[11px] font-semibold text-[#c4b5fd]">
              <Bot size={13} className="animate-pulse" /> AI thinking<span className="animate-pulse">…</span>
            </span>
          )}
          <BoardThemePicker theme={theme} setTheme={setTheme} gameId={gameId} />
          {config.allowUndo !== false && (
            <Button variant="outline" size="sm" onClick={undo} disabled={!history.length || !!result}><Undo2 size={14} /> Undo</Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${state.turn === i && !result ? 'border-emerald-neon/50 bg-emerald-neon/[.06]' : 'border-line bg-white/[.02]'}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${i === 0 ? 'bg-[#132b1f] text-emerald-300' : 'bg-[#d8e2dc] text-[#0a0f0d]'}`}>
              {i === 0 ? 'D' : 'L'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{seatLabel(i)}</p>
              <p className="text-[10px] text-ink-faint">
                {eng.scoreOf ? `${eng.scoreOf(state, i)} pts` : ''}
                {isAi && i === aiSeat ? ' · CPU' : ''}{isAi && i === aiSeat && thinking ? ' · deciding…' : ''}
              </p>
            </div>
            {state.turn === i && !result && <span className="h-2 w-2 animate-pulse-glow rounded-full bg-emerald-neon" />}
          </div>
        ))}
      </div>

      {renderBoard()}

      {gameId === 'ludo' && (
        <div className="flex justify-center">
          <Dice roll={state.roll} canRoll={false} rolling={lastEvent?.type === 'roll'} />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={rematch}><RotateCcw size={15} /> Restart match</Button>
        {moves.length > 0 && (
          <Button variant="ghost" onClick={() => setReview(true)}><Eye size={15} /> Review match</Button>
        )}
      </div>

      <Modal open={!!result} onClose={() => {}} title="Match complete" width={480}>
        {result && (
          <div className="space-y-4 text-center">
            <p className="mb-2 text-6xl">{result.draw ? '🤝' : '🏆'}</p>
            <h3 className="text-2xl font-extrabold text-gold">
              {result.draw ? 'Dead heat!' : `${seatLabel(result.winnerSeat)} wins!`}
            </h3>
            <div className="flex justify-center gap-5 text-sm text-ink-dim">
              <span className="inline-flex items-center gap-1"><Swords size={13} /> {result.moves} moves</span>
              {eng.scoreOf && <span>{result.scores[0]} – {result.scores[1]}</span>}
            </div>
            <p className="text-[11px] text-ink-faint">Offline matches are stored on this device only — sign in and play online to earn XP and rating.</p>
            <div className="flex flex-wrap gap-2">
              <Button className="flex-1" onClick={rematch}><RotateCcw size={15} /> Rematch</Button>
              <Button variant="outline" className="flex-1" onClick={() => { setResult(null); setReview(true) }}><Eye size={15} /> Review</Button>
              <Button variant="ghost" onClick={onExit}>Lobby</Button>
            </div>
          </div>
        )}
      </Modal>

      {review && (
        <MatchReview
          gameId={gameId}
          moves={moves}
          seats={[0, 1].map((i) => ({ displayName: seatLabel(i), isBot: isAi && i === aiSeat, username: '', avatar: '', avatarColor: 0 }))}
          theme={theme === 'default' ? 'emerald' : theme}
          onClose={() => setReview(false)}
        />
      )}
    </div>
  )
}

export function BoardThemePicker({ theme, setTheme, gameId }) {
  const themes = gameId === 'reversi' ? Object.values(BOARD_THEMES) : null
  if (!themes || themes.length <= 1) return null
  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      aria-label="Board theme"
      className="cursor-pointer rounded-lg border border-line bg-panel-2 px-2.5 py-2 text-xs font-semibold text-ink-dim outline-none transition focus:border-emerald-neon/50"
    >
      {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  )
}
