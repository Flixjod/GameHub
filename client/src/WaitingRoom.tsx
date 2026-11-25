import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { GAME_META, Icon } from "./ui";

export function WaitingRoom({ queueId, gameId, onMatched, onExit }: {
  queueId: number;
  gameId: string;
  onMatched: (matchId: number, opponent: string | null) => void;
  onExit: () => void;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const pollQ = useQuery({
    queryKey: ["queue", queueId],
    queryFn: () => api.pollQueue({ queueId }),
    refetchInterval: 1500,
  });
  const poll = pollQ.data;

  useEffect(() => {
    if (poll?.status === "matched" && poll.matchId) onMatched(poll.matchId, poll.opponent);
  }, [poll, onMatched]);

  const cancel = useMutation({
    mutationFn: async () => api.leaveQueue({ queueId }),
    onSuccess: onExit,
    onError: onExit,
  });

  const meta = GAME_META[gameId];
  const elapsed = poll ? Math.max(0, Math.floor(poll.waitedMs / 1000)) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="gh-fadein max-w-lg mx-auto">
      <button type="button" onClick={() => cancel.mutate()} className="inline-flex items-center gap-2 text-sm text-[var(--dim)] hover:text-[var(--accent)] mb-4 min-h-9">
        {Icon.back(18)} Back
      </button>

      <div className="gh-card p-8 text-center" style={{ borderColor: "rgba(46,232,154,0.35)" }}>
        {meta && (
          <div className="flex items-center justify-center gap-3 mb-5">
            <img src={meta.img} alt="" className="w-14 h-14 rounded-2xl object-cover" />
            <div className="text-left">
              <h1 className="font-display font-extrabold text-xl leading-tight">Waiting Room</h1>
              <p className="text-xs text-[var(--dim)]">{meta.name} · Ranked online match</p>
            </div>
          </div>
        )}

        <div className="relative inline-flex items-center justify-center my-4" aria-label="Searching for a match">
          <span className="absolute w-28 h-28 rounded-full gh-pulse-ring" style={{ border: "2px solid rgba(46,232,154,0.4)" }} />
          <span className="absolute w-20 h-20 rounded-full gh-pulse-ring" style={{ border: "2px solid rgba(46,232,154,0.55)", animationDelay: "0.6s" }} />
          <span className="w-14 h-14 rounded-full flex items-center justify-center text-[var(--accent)]" style={{ background: "rgba(46,232,154,0.1)", border: "1px solid var(--border-strong)" }}>
            {Icon.users(26)}
          </span>
        </div>

        <p className="font-display font-bold text-lg">Looking for an opponent…</p>
        <p className="text-sm text-[var(--dim)] mt-1">
          1 / 2 players seated · <span className="inline-flex items-center gap-1">{Icon.clock(13)} {mm}:{ss}</span>
        </p>

        <div className="flex justify-center gap-2 mt-4" role="status" aria-live="polite">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] gh-live-dot" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] gh-live-dot" style={{ animationDelay: "0.3s" }} />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] gh-live-dot" style={{ animationDelay: "0.6s" }} />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6 text-left">
          <div className="rounded-2xl p-3.5" style={{ background: "rgba(46,232,154,0.07)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-bold text-[var(--accent)]">SEAT 1 · YOU</p>
            <p className="font-semibold text-sm mt-1">Ready</p>
          </div>
          <div className="rounded-2xl p-3.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-bold text-[var(--dim)]">SEAT 2</p>
            <p className="font-semibold text-sm mt-1 text-[var(--dim)]">{poll?.status === "waiting" ? "Searching…" : "…"}</p>
          </div>
        </div>

        <p className="text-xs text-[var(--dim)] mt-5">
          You'll be paired with the next queued player. If nobody joins shortly, an online rival sits down across from you.
        </p>

        <button type="button" className="gh-btn-ghost px-6 py-2.5 mt-5 text-sm" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
          {cancel.isPending ? "Leaving…" : "Leave the waiting room"}
        </button>
      </div>
    </div>
  );
}
