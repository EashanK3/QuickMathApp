import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { OperationKey, Profile } from "../types";
import { OPERATION_META, rungIndexForRating } from "../ladders";
import { T } from "../theme";
import { useFriendMatch } from "../multiplayer/useFriendMatch";

interface Props {
  profile: Profile;
  onBack: () => void;
}

const REGULAR_OPS: OperationKey[] = ["add", "sub", "mult", "div"];

export default function FriendModeScreen({ profile, onBack }: Props) {
  const { state, createRoom, joinRoom, submitAnswer, leaveMatch } = useFriendMatch();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [pickedOp, setPickedOp] = useState<OperationKey | null>(null);
  const [answer, setAnswer] = useState("");

  const me = state.players.find((p) => p.player_id === state.myPlayerId);
  const opponent = state.players.find((p) => p.player_id !== state.myPlayerId);

  function handleSubmit() {
    submitAnswer(answer);
  }

  function handleCreate(op: OperationKey) {
    setPickedOp(op);
    createRoom(op, rungIndexForRating(op, profile.ratings[op]), name);
  }

  function handleJoin() {
    if (!joinCode.trim()) return;
    // We don't know the operation until the room lookup returns it, so pass
    // a placeholder rung — joinRoom recomputes against the room's real
    // operation once it knows it. (add is just a safe default key to compute against)
    joinRoom(joinCode, rungIndexForRating("add", profile.ratings.add), name);
  }

  function backToMenu() {
    leaveMatch();
    setAnswer("");
    setJoinCode("");
  }

  // ---- match / roundResult / summary phases (in-race UI) -----------------
  if (state.phase === "match" || state.phase === "roundResult") {
    const q = state.currentQuestion;
    const myScore = state.scores[state.myPlayerId] ?? 0;
    const oppScore = opponent ? state.scores[opponent.player_id] ?? 0 : 0;
    const wonThisRound = state.phase === "roundResult" && state.lastWinnerId === state.myPlayerId;
    const lostThisRound = state.phase === "roundResult" && state.lastWinnerId && state.lastWinnerId !== state.myPlayerId;

    return (
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.topRow}>
          <Pressable onPress={backToMenu}>
            <Text style={{ color: T.textDim }}>← Leave</Text>
          </Pressable>
          <Text style={{ color: T.textDim, fontSize: 13 }}>
            {state.operationKey ? OPERATION_META[state.operationKey].name : ""}
          </Text>
          <Text style={{ color: T.purple, fontWeight: "600" }}>
            {myScore} – {oppScore}
          </Text>
        </View>

        <View style={s.center}>
          <View style={[s.timerCircle, { borderColor: state.timeLeft <= 5 ? T.red : T.border }]}>
            <Text style={{ color: state.timeLeft <= 5 ? T.red : T.text, fontSize: 20, fontWeight: "600" }}>
              {state.timeLeft}s
            </Text>
          </View>

          <Text style={s.prompt}>{q?.prompt}</Text>

          {state.phase === "match" ? (
            !state.mySubmitted ? (
              <>
                <TextInput
                  style={s.input}
                  value={answer}
                  onChangeText={setAnswer}
                  keyboardType="number-pad"
                  placeholder="Answer"
                  placeholderTextColor={T.textFaint}
                  autoFocus
                  onSubmitEditing={handleSubmit}
                />
                <Pressable style={s.submitBtn} onPress={handleSubmit}>
                  <Text style={{ color: T.bg, fontWeight: "600" }}>Submit</Text>
                </Pressable>
              </>
            ) : (
              <Text style={{ color: T.textDim, fontSize: 14, marginTop: 8 }}>
                Answer locked in — waiting on {opponent?.display_name ?? "your opponent"}…
              </Text>
            )
          ) : (
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  marginTop: 8,
                  color: wonThisRound ? T.green : lostThisRound ? T.red : T.textDim,
                }}
              >
                {wonThisRound
                  ? "Point to you!"
                  : lostThisRound
                  ? `Point to ${opponent?.display_name ?? "opponent"}`
                  : "Nobody got it — next question"}
              </Text>
              <Text style={{ color: T.textFaint, fontSize: 12, marginTop: 4 }}>Correct answer: {q?.correct_answer}</Text>
            </View>
          )}
        </View>

        <Text style={s.footer}>
          Question {(q?.question_index ?? 0) + 1} of 10 · you: {me?.display_name} · them: {opponent?.display_name ?? "…"}
        </Text>
      </KeyboardAvoidingView>
    );
  }

  if (state.phase === "summary") {
    const myScore = state.scores[state.myPlayerId] ?? 0;
    const oppScore = opponent ? state.scores[opponent.player_id] ?? 0 : 0;
    const outcome = myScore > oppScore ? "You won! 🏆" : myScore < oppScore ? "You lost this one" : "Tied game";
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={s.icon}>⚔</Text>
        <Text style={s.h1}>{outcome}</Text>
        <Text style={{ color: T.text, fontSize: 32, fontWeight: "700", marginVertical: 12 }}>
          {myScore} – {oppScore}
        </Text>
        <Text style={{ color: T.textFaint, fontSize: 12, marginBottom: 24 }}>Casual match — ranked rating unaffected</Text>
        <Pressable style={s.submitBtn} onPress={backToMenu}>
          <Text style={{ color: T.bg, fontWeight: "600" }}>Back to Friend mode</Text>
        </Pressable>
      </View>
    );
  }

  // ---- lobby (waiting for opponent) ---------------------------------------
  if (state.phase === "lobby") {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
        <Pressable onPress={backToMenu} style={s.back}>
          <Text style={{ color: T.textDim }}>← Cancel</Text>
        </Pressable>
        {state.players.length < 2 ? (
          <>
            <Text style={s.h1}>Share this code</Text>
            <Text style={s.roomCode}>{state.room?.code}</Text>
            <Text style={{ color: T.textDim, fontSize: 13, textAlign: "center" }}>
              Waiting for your friend to join on the same network…
            </Text>
          </>
        ) : (
          <Text style={{ color: T.textDim, fontSize: 14 }}>Both here — starting…</Text>
        )}
      </View>
    );
  }

  // ---- menu (create / join) -----------------------------------------------
  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <Pressable onPress={onBack}>
        <Text style={{ color: T.textDim, marginBottom: 8 }}>← Home</Text>
      </Pressable>
      <Text style={s.h1}>Friend mode</Text>
      <Text style={s.sub}>
        Race a friend on the same network. Same question, same moment — first correct answer takes the
        point. Casual only; doesn't touch ranked rating.
      </Text>

      {state.error && <Text style={s.errorText}>{state.error}</Text>}

      <TextInput
        style={s.nameInput}
        value={name}
        onChangeText={setName}
        placeholder="Your name (optional)"
        placeholderTextColor={T.textFaint}
        maxLength={20}
      />

      <Text style={s.sectionLabel}>Create a match</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {REGULAR_OPS.map((op) => (
          <Pressable
            key={op}
            style={[s.opChip, state.phase === "creating" && pickedOp === op && { opacity: 0.6 }]}
            onPress={() => handleCreate(op)}
            disabled={state.phase === "creating"}
          >
            <Text style={{ color: T.text, fontSize: 13, fontWeight: "600" }}>{OPERATION_META[op].name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.sectionLabel}>Join a match</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={s.codeInput}
          value={joinCode}
          onChangeText={(t) => setJoinCode(t.toUpperCase())}
          placeholder="ROOM CODE"
          placeholderTextColor={T.textFaint}
          autoCapitalize="characters"
          maxLength={6}
        />
        <Pressable style={s.joinBtn} onPress={handleJoin} disabled={state.phase === "joining"}>
          <Text style={{ color: T.bg, fontWeight: "600" }}>{state.phase === "joining" ? "Joining…" : "Join"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  back: { position: "absolute", top: 56, left: 20 },
  h1: { color: T.text, fontSize: 24, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  sub: { color: T.textDim, fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 20 },
  errorText: { color: T.red, fontSize: 13, marginBottom: 12 },
  nameInput: {
    backgroundColor: T.surface,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 10,
    color: T.text,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  sectionLabel: { color: T.textFaint, fontSize: 12, marginTop: 20, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
  opChip: {
    backgroundColor: T.surface,
    borderColor: T.purple + "55",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  codeInput: {
    flex: 1,
    backgroundColor: T.surface,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 10,
    color: T.text,
    fontSize: 16,
    letterSpacing: 2,
    textAlign: "center",
    paddingVertical: 10,
  },
  joinBtn: { backgroundColor: T.purple, borderRadius: 10, paddingHorizontal: 20, justifyContent: "center" },
  roomCode: { color: T.gold, fontSize: 42, fontWeight: "700", letterSpacing: 6, fontFamily: T.mono, marginVertical: 16 },
  icon: { fontSize: 40, marginBottom: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  timerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  prompt: { color: T.text, fontSize: 30, fontWeight: "600", fontFamily: T.mono, textAlign: "center", marginBottom: 24 },
  input: {
    backgroundColor: T.surface,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 12,
    color: T.text,
    fontSize: 20,
    textAlign: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 220,
  },
  submitBtn: { backgroundColor: T.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 40, marginTop: 12 },
  footer: { color: T.textFaint, fontSize: 12, textAlign: "center", paddingBottom: 24 },
});
