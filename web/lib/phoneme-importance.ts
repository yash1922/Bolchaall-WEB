// Hand-authored "why this sound matters" copy + tier mapping for the roadmap UI.
// Keyed by IPA. Falls back to category-based defaults for anything unmapped.

export type PhonemeTier = "beginner" | "intermediate" | "advanced";

interface PhonemeMeta {
  tier: PhonemeTier;
  importance: string;
}

const MAP: Record<string, PhonemeMeta> = {
  // ─── Beginner: high-frequency, easy to articulate ─────────────────────────
  "/m/": {
    tier: "beginner",
    importance:
      "The first sound most babies learn. Simple lip closure with voice — a great warm-up for the whole vocal system.",
  },
  "/n/": {
    tier: "beginner",
    importance:
      "Among the most frequent consonants in English. Sets up tongue-tip placement used in /t/, /d/, /l/, /s/ — many sounds at once.",
  },
  "/p/": {
    tier: "beginner",
    importance:
      "Voiceless stop with simple lip release. A clean way to learn breath control.",
  },
  "/b/": {
    tier: "beginner",
    importance:
      "Voiced version of /p/. Practising the pair teaches the voicing contrast that distinguishes pat/bat, time/dime, etc.",
  },
  "/t/": {
    tier: "beginner",
    importance:
      "Most common stop in English. Crisp tongue-tip release — also key for blends (st-, tr-, -nt).",
  },
  "/d/": {
    tier: "beginner",
    importance:
      "Voiced /t/. Frequent in past-tense endings (jumped → /t/, played → /d/).",
  },
  "/k/": {
    tier: "beginner",
    importance:
      "Back-of-tongue stop. Common in everyday words (cat, key, back) and clusters (cl-, cr-, sk-).",
  },
  "/g/": {
    tier: "beginner",
    importance: "Voiced /k/. Common in casual conversation: go, big, get, give.",
  },
  "/iː/": {
    tier: "beginner",
    importance:
      "The 'ee' vowel — high tongue, smiling lips. Carries clarity in see, tree, happy.",
  },
  "/æ/": {
    tier: "beginner",
    importance:
      "The wide open 'a' as in cat. Common in everyday words; helps build mouth opening.",
  },

  // ─── Intermediate: more articulation control ──────────────────────────────
  "/f/": {
    tier: "intermediate",
    importance:
      "Top teeth on lower lip with airflow. Practising it improves airflow control useful for many fricatives.",
  },
  "/v/": {
    tier: "intermediate",
    importance: "Voiced /f/. Buzz the airflow — very different from voiceless /f/.",
  },
  "/s/": {
    tier: "intermediate",
    importance:
      "High-frequency sound and a common articulation target. Tongue tip near the alveolar ridge with narrow airflow.",
  },
  "/z/": {
    tier: "intermediate",
    importance:
      "Voiced /s/. Practising the pair improves voicing awareness and is key for plurals and possessives.",
  },
  "/l/": {
    tier: "intermediate",
    importance:
      "Tongue tip on the ridge with air flowing past the sides. Often the first 'tricky' sound for English learners.",
  },
  "/h/": {
    tier: "intermediate",
    importance:
      "Pure exhalation with an open mouth. Useful for breath control and word-initial timing.",
  },
  "/w/": {
    tier: "intermediate",
    importance:
      "Round the lips tightly then open. Smooths the transition into vowels (water, we, away).",
  },
  "/j/": {
    tier: "intermediate",
    importance:
      "The 'y' glide — yes, you, yellow. Tongue body high and forward, then slides into the vowel.",
  },
  "/ʃ/": {
    tier: "intermediate",
    importance:
      "The 'sh' sound — round lips, push air gently. Very common (she, wash, fish) and easy to confuse with /s/.",
  },
  "/ʌ/": {
    tier: "intermediate",
    importance:
      "Mid-central vowel as in cup, love. Relaxed mouth — a base for many short words.",
  },
  "/ɛ/": {
    tier: "intermediate",
    importance: "Mid-front vowel as in red, bed. Common in beginner vocabulary.",
  },
  "/ɪ/": {
    tier: "intermediate",
    importance:
      "Lax 'ih' as in sit, bit. Often confused with long /iː/ — practising both improves vowel discrimination.",
  },
  "/ɑː/": {
    tier: "intermediate",
    importance:
      "Open back vowel as in father, calm. Builds vocal resonance.",
  },
  "/ɔː/": {
    tier: "intermediate",
    importance: "Mid-back rounded vowel as in thought, law, saw.",
  },
  "/oʊ/": {
    tier: "intermediate",
    importance: "The 'oh' diphthong — go, boat, snow. Glide from rounded back to higher.",
  },
  "/uː/": {
    tier: "intermediate",
    importance: "Tight rounded 'oo' as in food, blue, moon.",
  },
  "/ʊ/": {
    tier: "intermediate",
    importance: "Lax 'uu' as in book, put, good. Slightly relaxed version of /uː/.",
  },

  // ─── Advanced: tricky placement or contrast ───────────────────────────────
  "/θ/": {
    tier: "advanced",
    importance:
      "Voiceless 'th' (think, math). Tongue tip lightly between teeth — non-existent in many languages, often the last sound mastered.",
  },
  "/ð/": {
    tier: "advanced",
    importance:
      "Voiced 'th' (this, that, father). Same position as /θ/ but voiced — small change, big impact.",
  },
  "/ʒ/": {
    tier: "advanced",
    importance:
      "The 'zh' in measure, vision, garage. Rare and easy to substitute with /j/ or /ʃ/.",
  },
  "/r/": {
    tier: "advanced",
    importance:
      "Curled-back tongue with rounded lips. Highly variable across English accents and a common stroke-recovery target.",
  },
  "/tʃ/": {
    tier: "advanced",
    importance:
      "Affricate — quick stop then release as 'sh'. Found in chip, rich, teach.",
  },
  "/dʒ/": {
    tier: "advanced",
    importance:
      "Voiced affricate (jump, edge, judge). Voiced counterpart of /tʃ/.",
  },
  "/ŋ/": {
    tier: "advanced",
    importance:
      "Back nasal as in sing, long, thing. Soft palate down, back of tongue up.",
  },
  "/aɪ/": {
    tier: "advanced",
    importance:
      "Diphthong as in my, time, ride. Glide from open AH to high EE in one syllable.",
  },
  "/aʊ/": {
    tier: "advanced",
    importance: "Diphthong as in now, house, loud. Glide from AH to OO with rounding.",
  },
  "/ɔɪ/": {
    tier: "advanced",
    importance: "Diphthong as in boy, coin, joy. Glide from rounded AW to EE.",
  },

  // Hindi
  "/क/": { tier: "beginner", importance: "Common Hindi velar stop. Foundational for Hindi consonant practice." },
  "/ग/": { tier: "intermediate", importance: "Voiced velar — buzz at the back of the tongue." },
  "/स/": { tier: "intermediate", importance: "High-frequency Hindi sibilant. Same articulation as English /s/." },
  "/म/": { tier: "beginner", importance: "Hindi nasal — easy lip closure with voice." },
  "/र/": { tier: "advanced", importance: "Quick Hindi tongue-tap. Very different from English /r/." },
};

const TIER_BY_CATEGORY: Record<string, PhonemeTier> = {
  Plosives: "beginner",
  Nasals: "beginner",
  Vowels: "intermediate",
  Approximants: "intermediate",
  Fricatives: "intermediate",
  Diphthongs: "advanced",
  Affricates: "advanced",
};

export function getPhonemeMeta(ipa: string, category?: string): PhonemeMeta {
  if (MAP[ipa]) return MAP[ipa];
  return {
    tier: TIER_BY_CATEGORY[category ?? ""] ?? "intermediate",
    importance:
      "A phoneme of English. Practising it improves articulation precision and helps your speech sound clearer.",
  };
}

export const TIER_INFO: Record<PhonemeTier, { label: string; tagline: string; color: string }> = {
  beginner: {
    label: "Beginner",
    tagline: "Foundational sounds — start here for quick wins.",
    color: "emerald",
  },
  intermediate: {
    label: "Intermediate",
    tagline: "More articulation control — voicing pairs, vowel length.",
    color: "brand",
  },
  advanced: {
    label: "Advanced",
    tagline: "Tricky placements, diphthongs, and rare contrasts.",
    color: "coral",
  },
};
