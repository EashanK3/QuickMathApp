// Excludes visually ambiguous characters (0/O, 1/I/L) since this gets read
// aloud or typed by hand between two people in the same room.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateRoomCode(length = 5): string {
  return Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}
