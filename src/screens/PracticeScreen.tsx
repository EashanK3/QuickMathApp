import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Animated, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Profile, OperationKey, QuestionResult, SessionSummary, Technique } from "../types";
import { LADDERS, rungIndexForRating, clampRung, OPERATION_META } from "../ladders";
import { generateQuestion, classifyError, GeneratedQuestion } from "../questions";
import { deltaForAnswer, applyDelta } from "../rating";
import { suggestionForMiss, suggestionForNewRung } from "../techniques";
import { TIERS, tierFor, tierIndexFor } from "../tiers";
import { T } from "../theme";
import ShieldStrip from "../components/ShieldStrip";
import { usePulse } from "../hooks/usePulse";
import { useAICall } from "../hooks/useAICall";
import { AISettings, DEFAULT_AI_SETTINGS, loadAISettings } from "../aiSettings";
import { explainMistake } from "../ai/mistakeSummary";

const QUESTIONS_PER_SESSION = 10;

interface Props {
  profile: Profile;
  operationKey: OperationKey;
  isVedic?: boolean;
  vedicRungIndex?: number; // when drilling a technique from Learn
  onProfileChange: (updatedProfile: Profile) => void; // incremental save, per question
  onFinish: (summary: SessionSummary, updatedProfile: Profile) => void;
  onOpenTechnique: (t: Technique) => void;
  onQuit: (updatedProfile: Profile) => void;
}

export default function PracticeScreen(props: Props) {
  const { profile, operationKey, isVedic } = props;
  const ratingKey = isVedic ? "vedic" : operationKey;
  const startRating = isVedic ? profile.vedicRating : profile.ratings[operationKey];

  const [rating, setRating] = useState(startRating);
  // Pinned at mount: the profile prop now changes mid-session (we save after every
  // question), so reading `startRating` live would make the results delta read 0.
  const startRatingRef = useRef(startRating);
  const startRungRef = useRef(
    clampRung(operationKey, props.vedicRungIndex ?? rungIndexForRating(operationKey, startRating))
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
  const lastResultRef = useRef<QuestionResult | null>(null);

  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  useEffect(() => {
    loadAISettings().then(setAiSettings);
  }, []);
  const aiExplain = useAICall(() => {
    if (!lastResultRef.current) return Promise.reject(new Error("No mistake to explain."));
    return explainMistake(
      { host: aiSettings.ollamaHost, model: aiSettings.model },
      operationKey,
      rung,
      lastResultRef.current
    );
  });

  // Guards against a question being scored twice (timer firing alongside a manual
  // submit). applyDelta mutates shield state in place, so a double call would
  // double-apply the rating delta and burn two shield attempts.
  const scoredRef = useRef(false);

  useEffect(() => {
    if (feedback) return; // paused between questions
    const t = setInterval(() => {
      // Keep the updater pure — scoring happens in the effect below, not here.
      setTimeLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [qIndex, feedback]);

  useEffect(() => {
    if (timeLeft === 0 && !feedback) submit(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, feedback]);

  // Working copy + the live rating folded back in. profileRef already carries the
  // shield mutations applyDelta writes in place.
  function buildProfile(ratingValue: number): Profile {
    const updated: Profile = { ...profileRef.current, shields: { ...profileRef.current.shields } };
    if (isVedic) updated.vedicRating = ratingValue;
    else updated.ratings = { ...updated.ratings, [operationKey]: ratingValue };
    return updated;
  }

  function submit(raw: string | null, timedOut = false) {
    if (feedback || scoredRef.current) return;
    scoredRef.current = true;
    const timeTakenMs = Date.now() - questionStart.current;
    const userAnswer = raw !== null && raw.trim() !== "" ? Number(raw.trim()) : null;
    const isCorrect = !timedOut && userAnswer === question.answer;
    const errorType = isCorrect ? "none" : classifyError(userAnswer, question.answer, timedOut);

    const delta = deltaForAnswer(isCorrect, timeTakenMs, rung.parTimeSec);
    const outcome = applyDelta(profileRef.current, ratingKey, rating, delta);
    setRating(outcome.newRating);
    // Save immediately: previously nothing reached storage until all 10 questions
    // were answered, so quitting mid-session discarded the whole session.
    props.onProfileChange(buildProfile(outcome.newRating));
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
    lastResultRef.current = result;

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
      const updated = buildProfile(rating);

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
          ratingBefore: startRatingRef.current,
          ratingAfter: rating,
          promoted: tierFor(rating).floor > tierFor(startRatingRef.current).floor,
          demoted: tierFor(rating).floor < tierFor(startRatingRef.current).floor,
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
    scoredRef.current = false;
    aiExplain.reset();
  }

  const shield = profileRef.current.shields[ratingKey];
  const correctCount = results.filter((r) => r.isCorrect).length;

  // The most tense moment in the app: one wrong answer away from a real
  // demotion, with the clock about to run out. The expanding-ring pulse on
  // the timer is deliberately faster (1.4s) than the shield strip's own
  // pulse (2.2-2.6s) so it reads as more urgent.
  const urgent = !!shield && shield.remaining === 1 && timeLeft <= 5 && !feedback;
  const urgentPulse = usePulse(urgent, 700, true);
  const ringScale = urgentPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = urgentPulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.topRow}>
        <Pressable onPress={() => props.onQuit(buildProfile(rating))}>
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
        <ShieldStrip
          remaining={shield.remaining}
          label={shield.remaining === 1 ? "Shield — last chance" : "Promotion shield"}
          caption={
            shield.remaining === 1
              ? `1 attempt left — one more miss demotes to ${TIERS[Math.max(0, tierIndexFor(shield.tierFloor) - 1)].name}`
              : `${shield.remaining} attempts left to land a correct answer`
          }
        />
      )}

      <View style={s.center}>
        <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
          {urgent && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                width: 68,
                height: 68,
                borderRadius: 34,
                borderWidth: 2,
                borderColor: T.red,
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              }}
            />
          )}
          <View style={[s.timerCircle, { marginBottom: 0 }]}>
            <Text style={{ color: timeLeft <= 5 ? T.red : T.text, fontSize: 20, fontWeight: "600" }}>{timeLeft}s</Text>
          </View>
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
            {!feedback.correct && (
              <View style={{ marginTop: 10, alignItems: "center", maxWidth: 300 }}>
                {!aiExplain.result && !aiExplain.error && (
                  <Pressable onPress={aiExplain.run} disabled={aiExplain.loading}>
                    <Text style={{ color: T.accent, fontSize: 13 }}>
                      {aiExplain.loading ? "Asking your AI coach…" : "Why did I get this wrong? (AI) →"}
                    </Text>
                  </Pressable>
                )}
                {aiExplain.error && <Text style={s.aiError}>{aiExplain.error}</Text>}
                {aiExplain.result && (
                  <View style={s.aiCard}>
                    <Text style={s.aiCardText}>{aiExplain.result}</Text>
                  </View>
                )}
              </View>
            )}
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
  aiCard: {
    marginTop: 8,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.accent + "44",
    borderRadius: 12,
    padding: 14,
  },
  aiCardText: { color: T.text, fontSize: 13, lineHeight: 19 },
  aiError: { color: T.textFaint, fontSize: 12, textAlign: "center" },
});
