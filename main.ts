// Have You Tried Turning It Off? — entry program (turning-it-off-entry1).
//
// A local tournament picks the single tech-support line this program writes
// to /output/entry.txt. Nine original candidates play a round robin; every
// pair meets once, and the line with the higher weighted score takes the
// game. The champion is the line with the most game wins, with total score,
// shorter text, and earlier seeding order settling any tie. The program also
// prints the champion's score margin over the runner-up.
//
// Scoring mirrors the published judge brief, most important first:
//   subject — a funny single line from a hopeless tech support agent to a
//             desperate customer, on the subject, weight 3
//   twist   — the twist is unexpected and the agent's cheerful uselessness
//             is where the humour comes from, weight 3
//   voice   — sounds like one line a real support agent would actually say,
//             with the customer's desperation felt, not explained, weight 2
//   tight   — every word earns its place, the joke clear on a first read,
//             weight 2
//   fresh   — feels fresh rather than a stock line, and a lean on the
//             classic restart is twisted, weight 2
//
// Each candidate carries a short note recording why its marks sit where they
// sit, so the scores are auditable from the file alone. Every candidate is
// gate-checked (1 to 199 characters, not only white space) before the
// tournament starts, and the champion is checked again before it is written
// out. After the round robin, the program verifies the win tally adds up to
// exactly one win per game played, so a broken duel loop cannot silently
// crown the wrong line.
//
// The run is fully deterministic: fixed candidates, fixed scores, fixed
// seeding order, no clock, no randomness, no network, no environment input.
// The same input always yields the same champion and the same bytes.

import { mkdirSync, writeFileSync } from "node:fs";

const GATE_MIN_CHARS = 1;
const GATE_MAX_CHARS = 199;
const OUTPUT_DIR = "/output";
const OUTPUT_PATH = "/output/entry.txt";

const SUBJECT_WEIGHT = 3;
const TWIST_WEIGHT = 3;
const VOICE_WEIGHT = 2;
const TIGHT_WEIGHT = 2;
const FRESH_WEIGHT = 2;

interface SupportLineCard {
  seed: string;
  text: string;
  note: string;
  subject: number;
  twist: number;
  voice: number;
  tight: number;
  fresh: number;
}

interface ScoredCard {
  card: SupportLineCard;
  order: number;
  total: number;
  wins: number;
}

const CANDIDATES: SupportLineCard[] = [
  {
    seed: "ticket-restart",
    text: "Great news: I've restarted the ticket. The computer? Oh, that part's still up to you.",
    note:
      "The agent did restart something, just the wrong thing. Cheerful " +
      "uselessness in two beats, the customer left holding the real problem.",
    subject: 10,
    twist: 9,
    voice: 9,
    tight: 10,
    fresh: 9,
  },
  {
    seed: "deadline-divorce",
    text: "Have you tried turning it off and on again? No rush — I'll just hold while your deadline quietly files for divorce.",
    note:
      "The classic restart opens it, then the deadline filing for divorce " +
      "lands the twist. The desperation lives in the deadline itself.",
    subject: 10,
    twist: 9,
    voice: 8,
    tight: 8,
    fresh: 8,
  },
  {
    seed: "manager-me",
    text: "Let's start by turning it off and on again — and if that doesn't work, I'll transfer you to my manager, who is also me, on hold.",
    note:
      "Escalation as a dead end: the manager is the same agent, on hold. " +
      "Strong cheerful uselessness, but the punchline needs a second beat.",
    subject: 10,
    twist: 8,
    voice: 8,
    tight: 7,
    fresh: 8,
  },
  {
    seed: "google-first-result",
    text: "I'm going to put you on hold while I Google your exact problem and read you the first result out loud.",
    note:
      "Painfully plausible support behaviour, cheerfully admitted. The " +
      "twist is real but familiar ground, carried only by the hold.",
    subject: 10,
    twist: 7,
    voice: 9,
    tight: 8,
    fresh: 6,
  },
  {
    seed: "never-happened",
    text: "Have you tried turning it off, turning it on, and then pretending this call never happened?",
    note:
      "The classic restart with a third step that erases the whole call. " +
      "Tight and quotable, but the punchline leans on the agent giving up.",
    subject: 10,
    twist: 8,
    voice: 8,
    tight: 9,
    fresh: 7,
  },
  {
    seed: "emotionally-ready",
    text: "Before we begin, please confirm your computer is plugged in, turned on, and emotionally ready for disappointment.",
    note:
      "Reads like a scripted opening checklist, then the checklist turns " +
      "on the computer's feelings. Warm voice, but the joke sprawls.",
    subject: 10,
    twist: 8,
    voice: 9,
    tight: 7,
    fresh: 8,
  },
  {
    seed: "hold-music",
    text: "Have you tried turning it off and on again? That's the whole job, honestly — I'm just the hold music with a headset.",
    note:
      "The agent confesses the job is one script plus hold music. Honest " +
      "and self-deprecating, but the second half over-explains the joke.",
    subject: 10,
    twist: 8,
    voice: 8,
    tight: 7,
    fresh: 7,
  },
  {
    seed: "ticket-march",
    text: "Good news: I found your ticket from March. Bad news: I found your ticket from March.",
    note:
      "Good news and bad news are the same news, and the ticket has sat " +
      "since March. Very tight, but the desperation is only in the date.",
    subject: 9,
    twist: 8,
    voice: 8,
    tight: 10,
    fresh: 7,
  },
  {
    seed: "sixty-percent",
    text: "Have you tried turning it off and on again? It works sixty percent of the time, which is sixty percent more than my training covered.",
    note:
      "A made-up success rate that confesses the training gap. Deadpan " +
      "rhythm, but the twist is a shrug and the classic barely twists.",
    subject: 10,
    twist: 7,
    voice: 8,
    tight: 7,
    fresh: 6,
  },
];

function charCount(text: string): number {
  return [...text].length;
}

function gatePasses(text: string): boolean {
  const trimmed = text.trim();
  const size = charCount(text);
  const withinBounds = size >= GATE_MIN_CHARS && size <= GATE_MAX_CHARS;
  return withinBounds && trimmed.length > 0;
}

function validateAllCandidates(cards: SupportLineCard[]): void {
  for (const card of cards) {
    const passes = gatePasses(card.text);
    if (passes === false) {
      throw new Error("Candidate fails the gate: " + card.seed);
    }
  }
}

function weightedTotal(card: SupportLineCard): number {
  return (
    card.subject * SUBJECT_WEIGHT +
    card.twist * TWIST_WEIGHT +
    card.voice * VOICE_WEIGHT +
    card.tight * TIGHT_WEIGHT +
    card.fresh * FRESH_WEIGHT
  );
}

function duelWinner(home: ScoredCard, away: ScoredCard): ScoredCard {
  const homeLeadsOnTotal = home.total > away.total;
  const awayLeadsOnTotal = away.total > home.total;
  if (homeLeadsOnTotal) {
    return home;
  }
  if (awayLeadsOnTotal) {
    return away;
  }
  const homeShorter = charCount(home.card.text) < charCount(away.card.text);
  const awayShorter = charCount(away.card.text) < charCount(home.card.text);
  if (homeShorter) {
    return home;
  }
  if (awayShorter) {
    return away;
  }
  const homeEarlier = home.order < away.order;
  if (homeEarlier) {
    return home;
  }
  return away;
}

function runRoundRobin(scored: ScoredCard[]): void {
  for (let first = 0; first < scored.length; first += 1) {
    for (let second = first + 1; second < scored.length; second += 1) {
      const home = scored[first];
      const away = scored[second];
      const winner = duelWinner(home, away);
      winner.wins += 1;
    }
  }
}

function verifyGameCount(scored: ScoredCard[]): void {
  const entrants = scored.length;
  const expectedGames = (entrants * (entrants - 1)) / 2;
  let countedWins = 0;
  for (const row of scored) {
    countedWins += row.wins;
  }
  const tallyMatches = countedWins === expectedGames;
  if (tallyMatches === false) {
    throw new Error(
      "Win tally mismatch: counted " + countedWins + ", expected " + expectedGames,
    );
  }
}

function compareStandings(a: ScoredCard, b: ScoredCard): number {
  if (a.wins !== b.wins) {
    return b.wins - a.wins;
  }
  if (a.total !== b.total) {
    return b.total - a.total;
  }
  const aChars = charCount(a.card.text);
  const bChars = charCount(b.card.text);
  if (aChars !== bChars) {
    return aChars - bChars;
  }
  return a.order - b.order;
}

function reportStandings(scored: ScoredCard[]): void {
  const ordered = [...scored].sort(compareStandings);
  for (const row of ordered) {
    console.log(
      row.card.seed + ": wins " + row.wins + ", score " + row.total +
        ", chars " + charCount(row.card.text),
    );
  }
}

function pickChampion(scored: ScoredCard[]): ScoredCard {
  let champion = scored[0];
  for (const contender of scored) {
    const leadsOnWins = contender.wins > champion.wins;
    const tiesOnWins = contender.wins === champion.wins;
    const leadsOnTotal = contender.total > champion.total;
    const tiesOnTotal = contender.total === champion.total;
    const shorterText =
      charCount(contender.card.text) < charCount(champion.card.text);
    const takesLead =
      leadsOnWins ||
      (tiesOnWins && leadsOnTotal) ||
      (tiesOnWins && tiesOnTotal && shorterText);
    if (takesLead) {
      champion = contender;
    }
  }
  return champion;
}

function main(): void {
  validateAllCandidates(CANDIDATES);
  const scored: ScoredCard[] = CANDIDATES.map((card, index) => {
    const entry: ScoredCard = {
      card: card,
      order: index,
      total: weightedTotal(card),
      wins: 0,
    };
    return entry;
  });
  runRoundRobin(scored);
  verifyGameCount(scored);
  reportStandings(scored);
  const champion = pickChampion(scored);
  const ordered = [...scored].sort(compareStandings);
  const runnerUp = ordered[1];
  const championPasses = gatePasses(champion.card.text);
  if (championPasses === false) {
    throw new Error("Champion line fails the gate: " + champion.card.seed);
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, champion.card.text, "utf8");
  console.log("champion: " + champion.card.seed);
  console.log(
    "wins: " + champion.wins + " of " + (CANDIDATES.length - 1) + " games",
  );
  console.log("score: " + champion.total);
  console.log(
    "runner-up: " + runnerUp.card.seed + " (" + runnerUp.total + ")",
  );
  console.log("margin: " + (champion.total - runnerUp.total) + " points");
  console.log("chars: " + charCount(champion.card.text));
  console.log("note: " + champion.card.note);
  console.log("line: " + champion.card.text);
}

main();
