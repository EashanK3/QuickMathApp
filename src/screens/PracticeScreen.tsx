import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Profile, OperationKey, QuestionResult, SessionSummary, Technique } from "../types";
import { LADDERS, rungIndexForRating, OPERATION_META } from "../ladders";
import { generateQuestion, classifyError, GeneratedQuestion } from "../questions";
import { deltaForAnswer, applyDelta } from "../rating";
import { suggestionForMiss, suggestionForNewRung } from "../techniques";
import { tierFor } from "../tiers";
import { T } from "../theme";

const QUESTIONS_PER_SESSION = 10;

interface Props {
  profile: Profile;
  operationKey: OperationKey;
  isVedic?: boolean;
  vedicRungIndex?: number; // when drilling a technique from Learn
  onFinish: (summary: SessionSummary, updatedProfile: Profile) => void;
  onOpenTechnique: (t: Technique) => void;
  onQuit: () => void;
}

export default function PracticeScreen(props: Props) {
  const { profile, operationKey, isVedic } = props;
  const ratingKey = isVedic ? "vedic" : operationKey;
  const startRating = isVedic ? profile.vedicRating : profile.ratings[operationKey];

  const [rating, setRating] = useState(startRating);
  const startRungRef = useRef(
    props.vedicRungIndex ?? rungIndexForRating(operationKey, startRating)
  );
  const rung = LADDERS[operationKey][startRungRef.current];

  const [qIndex, setQIndex] = useState(0);
  const [question, setQuestion] = useState<GeneratedQuestion>(() => generateQuestion(operationKey, rung));
  const [input, setInput] = useState("");
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(rung.parTimeSec * 2);
  const [feedback, setFeedback] = useState<null | { correct: boolean; text: string }>(null);
  const [nudge, setNudge] = useState<Technique | null>(null);
  const [promotedFlash, setPromotedFlash] = useState(false);
  const questionStart = useRef(Date.now());
  const profileRef = useRef<Profile>({ ...profile, shields: { ...profile.shields } });

  useEffect(() => {
    if (feedback) return; // paused between questions
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          submit(null, true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, feedback]);

  function submit(raw: string | null, timedOut = false) {
    if (feedback) return;
    const timeTakenMs = Date.now() - questionStart.current;
    const userAnswer = raw !== null && raw.trim() !== "" ? Number(raw.trim()) : null;
    const isCorrect = !timedOut && userAnswer === question.answer;
    const errorType = isCorrect ? "none" : classifyError(userAnswer, question.answer, timedOut);

    const delta = deltaForAnswer(isCorrect, timeTakenMs, rung.parTimeSec);
    const outcome = applyDelta(profileRef.current, ratingKey, rating, delta);
    setRating(outcome.newRating);
    if (outcome.promoted) {
      setPromotedFlash(true);
      setTimeout(() => setPromotedFlash(false), 2500);
    }

    const result: QuestionResult = {
      prompt: question.prompt,
      correctAnswer: question.answer,
      userAnswer,
      timeTakenMs,
      isCorrect,
      errorType,
    };
    setResults((r) => [...r, result]);

    // Persistent nudge: fires on EVERY relevant miss until the lesson is completed
    if (!isCorrect && !isVedic) {
      const t = suggestionForMiss(operationKey, startRungRef.current, profileRef.current);
      setNudge(t);
    } else {
      setNudge(null);
    }

    setFeedback({
      correct: isCorrect,
      text: isCorrect
        ? `Correct  (+${delta})`
        : timedOut
        ? `Time's up — answer was ${question.answer}  (${delta})`
        : `Answer was ${question.answer}  (${delta})`,
    });
  }

  function nextQuestion() {
    const done = qIndex + 1 >= QUESTIONS_PER_SESSION;
    if (done) {
      const updated: Profile = { ...profileRef.current };
      if (isVedic) updated.vedicRating = rating;
      else updated.ratings = { ...updated.ratings, [operationKey]: rating };

      const prevRung = startRungRef.current;
      const newRung = rungIndexForRating(operationKey, rating);
      const climbSuggestion = !isVedic
        ? suggestionForNewRung(operationKey, prevRung, newRung, updated)
        : null;

      props.onFinish(
        {
          operationKey,
          rungIndex: prevRung,
          results,
          ratingBefore: startRating,
          ratingAfter: rating,
          promoted: tierFor(rating).floor > tierFor(startRating).floor,
          demoted: tierFor(rating).floor < tierFor(startRating).floor,
          isVedic: !!isVedic,
          suggestedTechniqueId: climbSuggestion?.id ?? null,
        },
        updated
      );
      return;
    }
    const q = generateQuestion(operationKey, rung);
    setQuestion(q);
    setInput("");
    setFeedback(null);
    setQIndex((i) => i + 1);
    setTimeLeft(rung.parTimeSec * 2);
    questionStart.current = Date.now();
  }

  const shield = profileRef.current.shields[ratingKey];
  const correctCount = results.filter((r) => r.isCorrect).length;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.topRow}>
        <Pressable onPress={props.onQuit}>
          <Text style={{ color: T.textDim }}>← Quit</Text>
        </Pressable>
        <Text style={{ color: T.textDim, fontSize: 13 }}>
          {isVedic ? "Vedic drill" : OPERATION_META[operationKey].name} · {rung.label}
        </Text>
        <Text style={{ color: isVedic ? T.purple : T.accent, fontWeight: "600" }}>{rating}</Text>
      </View>

      {promotedFlash && (
        <View style={s.promoBanner}>
          <Text style={{ color: T.gold, fontWeight: "600" }}>
            {tierFor(rating).icon} Promoted to {tierFor(rating).name} — shield active (3 attempts)
          </Text>
        </View>
      )}
      {shield && !promotedFlash && (
        <Text style={{ color: T.goldDim, fontSize: 11, textAlign: "center", marginTop: 6 }}>
          Shield: {shield.remaining} attempt{shield.remaining !== 1 ? "s" : ""} left to land a correct answer
        </Text>
      )}

      <View style={s.center}>
        <View style={s.timerCircle}>
          <Text style={{ color: timeLeft <= 5 ? T.red : T.text, fontSize: 20, fontWeight: "600" }}>{timeLeft}s</Text>
        </View>

        <Text style={s.prompt}>{question.prompt}</Text>

        {!feedback ? (
          <>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              keyboardType="number-pad"
              placeholder="Answer"
              placeholderTextColor={T.textFaint}
              autoFocus
              onSubmitEditing={() => submit(input)}
            />
            <Pressable style={s.submitBtn} onPress={() => submit(input)}>
              <Text style={{ color: T.bg, fontWeight: "600" }}>Submit</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ color: feedback.correct ? T.green : T.red, fontSize: 16, marginTop: 8 }}>
              {feedback.text}
            </Text>
            {nudge && (
              <Pressable style={s.nudge} onPress={() => props.onOpenTechnique(nudge)}>
                <Text style={{ color: T.purple, fontSize: 13 }}>
                  Struggling? Learn “{nudge.name}” →
                </Text>
              </Pressable>
            )}
            <Pressable style={[s.submitBtn, { marginTop: 16 }]} onPress={nextQuestion}>
              <Text style={{ color: T.bg, fontWeight: "600" }}>
                {qIndex + 1 >= QUESTIONS_PER_SESSION ? "See results" : "Next"}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={s.footer}>
        Question {qIndex + 1} of {QUESTIONS_PER_SESSION} · {correctCount} correct
      </Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg, paddingTop: 56, paddingHorizontal: 20 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  promoBanner: {
    backgroundColor: T.gold + "1A",
    borderColor: T.goldDim,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    alignItems: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  timerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: T.border,
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
  submitBtn: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginTop: 12,
  },
  nudge: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: T.purple + "55",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  footer: { color: T.textFaint, fontSize: 12, textAlign: "center", paddingBottom: 24 },
});
