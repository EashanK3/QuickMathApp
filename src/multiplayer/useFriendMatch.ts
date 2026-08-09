import { useCallback, useEffect, useRef, useState } from "react";
import { OperationKey, Rung } from "../types";
import { LADDERS, clampRung } from "../ladders";
import { generateQuestion } from "../questions";
import { supabase } from "../supabaseConfig";
import { generateRoomCode } from "./roomCode";
import { getPlayerId } from "./playerId";
import { QUESTIONS_PER_MATCH, Room, RoomAnswer, RoomPlayer, RoomQuestion } from "./types";

export type MatchPhase = "menu" | "creating" | "joining" | "lobby" | "match" | "roundResult" | "summary";

export interface FriendMatchState {
  phase: MatchPhase;
  error: string | null;
  room: Room | null;
  players: RoomPlayer[];
  myPlayerId: string;
  operationKey: OperationKey | null;
  rung: Rung | null;
  currentQuestion: RoomQuestion | null;
  timeLeft: number;
  mySubmitted: boolean;
  roundAnswers: RoomAnswer[];
  lastWinnerId: string | null; // only meaningful during "roundResult"
  scores: Record<string, number>;
}

const INITIAL: FriendMatchState = {
  phase: "menu",
  error: null,
  room: null,
  players: [],
  myPlayerId: "",
  operationKey: null,
  rung: null,
  currentQuestion: null,
  timeLeft: 0,
  mySubmitted: false,
  roundAnswers: [],
  lastWinnerId: null,
  scores: {},
};

export function useFriendMatch() {
  const [state, setState] = useState<FriendMatchState>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // question_indexes already resolved locally — guards against resolving twice
  // (e.g. the timeout-driven check and the "all players answered" check both firing).
  const resolvedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    getPlayerId().then((id) => setState((s) => ({ ...s, myPlayerId: id })));
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const teardown = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  function startQuestionTimer(rung: Rung) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setState((s) => {
        if (s.timeLeft <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return { ...s, timeLeft: 0 };
        }
        return { ...s, timeLeft: s.timeLeft - 1 };
      });
    }, 1000);
    setState((s) => ({ ...s, timeLeft: rung.parTimeSec * 2 }));
  }

  const onNewQuestion = useCallback((q: RoomQuestion, operationKey: OperationKey) => {
    resolvedRef.current.delete(q.question_index);
    const rung = LADDERS[operationKey][clampRung(operationKey, q.rung_index)];
    setState((s) => ({
      ...s,
      phase: "match",
      currentQuestion: q,
      roundAnswers: [],
      mySubmitted: false,
      lastWinnerId: null,
      rung,
    }));
    startQuestionTimer(rung);
  }, []);

  async function advanceMatch(roomId: string, justFinishedIndex: number, operationKey: OperationKey, players: RoomPlayer[]) {
    const nextIndex = justFinishedIndex + 1;
    if (nextIndex >= QUESTIONS_PER_MATCH) {
      setState((s) => ({ ...s, phase: "summary" }));
      return;
    }
    const avgRung = clampRung(
      operationKey,
      Math.round(players.reduce((a, p) => a + p.rung_index, 0) / players.length)
    );
    const rung = LADDERS[operationKey][avgRung];
    const q = generateQuestion(operationKey, rung);
    await supabase.from("room_questions").insert({
      room_id: roomId,
      question_index: nextIndex,
      prompt: q.prompt,
      correct_answer: q.answer,
      rung_index: avgRung,
    });
    // No local state change here on purpose — the insert comes back through
    // the realtime subscription (onNewQuestion) via the exact same path for
    // both host and guest, so there's only one place that logic lives.
  }

  const resolveIfReady = useCallback(
    (questionIndex: number) => {
      if (resolvedRef.current.has(questionIndex)) return;
      const s = stateRef.current;
      if (!s.currentQuestion || s.currentQuestion.question_index !== questionIndex || !s.room) return;

      const answers = s.roundAnswers.filter((a) => a.question_index === questionIndex);
      const haveAll = s.players.length > 0 && answers.length >= s.players.length;
      if (!haveAll && s.timeLeft > 0) return; // still waiting, still time on the clock

      resolvedRef.current.add(questionIndex);
      if (timerRef.current) clearInterval(timerRef.current);

      const sorted = [...answers].sort(
        (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      );
      const winner = sorted.find((a) => a.is_correct) ?? null;

      setState((prev) => {
        const scores = { ...prev.scores };
        if (winner) scores[winner.player_id] = (scores[winner.player_id] ?? 0) + 1;
        return { ...prev, phase: "roundResult", lastWinnerId: winner?.player_id ?? null, scores };
      });

      // Every client derives "match over" locally from the question index it
      // just resolved and moves itself to "summary" after the same beat the
      // host uses to advance a normal round — the guest has no other signal
      // that the match ended, since only the host inserts room_questions rows
      // and there's no (index 10) row to trigger it via realtime.
      const isLastQuestion = questionIndex + 1 >= QUESTIONS_PER_MATCH;
      if (isLastQuestion) {
        setTimeout(() => setState((prev) => ({ ...prev, phase: "summary" })), 2200);
        return;
      }

      // Only the host advances — otherwise both clients would race to insert
      // the same next question (harmless thanks to the unique constraint, but
      // wasteful and confusing to reason about).
      const me = s.players.find((p) => p.player_id === s.myPlayerId);
      if (me?.is_host) {
        setTimeout(() => advanceMatch(s.room!.id, questionIndex, s.operationKey!, s.players), 2200);
      }
    },
    []
  );

  // Timeout-driven resolution check — fires once per second alongside the
  // countdown, since "everyone answered" isn't the only way a round ends.
  useEffect(() => {
    if (state.phase !== "match") return;
    if (state.timeLeft === 0 && state.currentQuestion) {
      resolveIfReady(state.currentQuestion.question_index);
    }
  }, [state.timeLeft, state.phase, state.currentQuestion, resolveIfReady]);

  // Re-check whenever a new answer arrives too — lets a round resolve the
  // instant both players have answered, without waiting for the clock.
  useEffect(() => {
    if (state.phase !== "match" || !state.currentQuestion) return;
    resolveIfReady(state.currentQuestion.question_index);
  }, [state.roundAnswers, state.phase, state.currentQuestion, resolveIfReady]);

  const subscribeToRoom = useCallback(
    (roomId: string, operationKey: OperationKey) => {
      teardown();
      const channel = supabase
        .channel(`room:${roomId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
          (payload) => {
            const player = payload.new as RoomPlayer;
            setState((s) => {
              if (s.players.some((p) => p.player_id === player.player_id)) return s;
              return { ...s, players: [...s.players, player] };
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "room_questions", filter: `room_id=eq.${roomId}` },
          (payload) => onNewQuestion(payload.new as RoomQuestion, operationKey)
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "room_answers", filter: `room_id=eq.${roomId}` },
          (payload) => {
            const a = payload.new as RoomAnswer;
            setState((s) => ({ ...s, roundAnswers: [...s.roundAnswers, a] }));
          }
        )
        .subscribe();
      channelRef.current = channel;
    },
    [onNewQuestion, teardown]
  );

  const createRoom = useCallback(
    async (operationKey: OperationKey, myRungIndex: number, myName: string) => {
      setState((s) => ({ ...s, phase: "creating", error: null, operationKey }));
      try {
        const playerId = await getPlayerId();
        const code = generateRoomCode();
        const { data: room, error: roomErr } = await supabase
          .from("rooms")
          .insert({ code, operation_key: operationKey })
          .select()
          .single();
        if (roomErr || !room) throw roomErr ?? new Error("Couldn't create room.");

        const me: Partial<RoomPlayer> = {
          room_id: room.id,
          player_id: playerId,
          display_name: myName || "Player 1",
          rung_index: myRungIndex,
          is_host: true,
        };
        const { error: joinErr } = await supabase.from("room_players").insert(me);
        if (joinErr) throw joinErr;

        subscribeToRoom(room.id, operationKey);
        setState((s) => ({
          ...s,
          phase: "lobby",
          room,
          players: [{ ...me, id: "", joined_at: new Date().toISOString() } as RoomPlayer],
        }));
      } catch (e) {
        setState((s) => ({ ...s, phase: "menu", error: friendlyError(e) }));
      }
    },
    [subscribeToRoom]
  );

  const joinRoom = useCallback(
    async (code: string, myRungIndex: number, myName: string) => {
      setState((s) => ({ ...s, phase: "joining", error: null }));
      try {
        const playerId = await getPlayerId();
        const { data: room, error: roomErr } = await supabase
          .from("rooms")
          .select()
          .eq("code", code.trim().toUpperCase())
          .single();
        if (roomErr || !room) throw new Error("No room with that code — check it and try again.");

        const me: Partial<RoomPlayer> = {
          room_id: room.id,
          player_id: playerId,
          display_name: myName || "Player 2",
          rung_index: myRungIndex,
          is_host: false,
        };
        const { error: joinErr } = await supabase.from("room_players").insert(me);
        if (joinErr) throw joinErr;

        const { data: existingPlayers } = await supabase
          .from("room_players")
          .select()
          .eq("room_id", room.id);

        subscribeToRoom(room.id, room.operation_key as OperationKey);
        setState((s) => ({
          ...s,
          phase: "lobby",
          room,
          operationKey: room.operation_key as OperationKey,
          players: existingPlayers ?? [],
        }));
        // Question 0 is triggered solely by the HOST's own lobby effect below,
        // once its realtime subscription sees this insert land. Only one path
        // ever calls advanceMatch — simpler than reasoning about two clients
        // racing on the unique constraint.
      } catch (e) {
        setState((s) => ({ ...s, phase: "menu", error: friendlyError(e) }));
      }
    },
    [subscribeToRoom]
  );

  // The host also needs to kick off question 0 once a second player shows up
  // in its own lobby (mirrors the guest-triggered path in joinRoom above).
  useEffect(() => {
    if (state.phase !== "lobby") return;
    const me = state.players.find((p) => p.player_id === state.myPlayerId);
    if (me?.is_host && state.players.length >= 2 && state.room && state.operationKey) {
      advanceMatch(state.room.id, -1, state.operationKey, state.players);
    }
  }, [state.phase, state.players, state.myPlayerId, state.room, state.operationKey]);

  const submitAnswer = useCallback(async (raw: string) => {
    const s = stateRef.current;
    if (!s.room || !s.currentQuestion || s.mySubmitted) return;
    setState((prev) => ({ ...prev, mySubmitted: true }));
    const value = raw.trim() === "" ? null : Number(raw.trim());
    const isCorrect = value !== null && value === s.currentQuestion.correct_answer;
    await supabase.from("room_answers").insert({
      room_id: s.room.id,
      question_index: s.currentQuestion.question_index,
      player_id: s.myPlayerId,
      answer: value,
      is_correct: isCorrect,
    });
  }, []);

  const leaveMatch = useCallback(() => {
    teardown();
    resolvedRef.current.clear();
    setState((s) => ({ ...INITIAL, myPlayerId: s.myPlayerId }));
  }, [teardown]);

  return { state, createRoom, joinRoom, submitAnswer, leaveMatch };
}

function friendlyError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Something went wrong — check your connection and try again.";
}
