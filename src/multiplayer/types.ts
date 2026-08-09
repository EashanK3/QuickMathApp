export interface Room {
  id: string;
  code: string;
  operation_key: string;
  created_at: string;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  player_id: string;
  display_name: string;
  rung_index: number;
  is_host: boolean;
  joined_at: string;
}

export interface RoomQuestion {
  id: string;
  room_id: string;
  question_index: number;
  prompt: string;
  correct_answer: number;
  rung_index: number;
  created_at: string;
}

export interface RoomAnswer {
  id: string;
  room_id: string;
  question_index: number;
  player_id: string;
  answer: number | null;
  is_correct: boolean;
  submitted_at: string;
}

export const QUESTIONS_PER_MATCH = 10;
