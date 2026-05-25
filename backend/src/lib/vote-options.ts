// Hardcoded theme + activity options for the mixer voting feature.
// IDs are stable strings stored in MixerVote.optionId — do not rename.

export type VoteOption = {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
};

export const THEME_OPTIONS: VoteOption[] = [
  { id: "disco-inferno",   name: "Disco Inferno",     subtitle: "Silver · sequins · strobes",  emoji: "🪩" },
  { id: "indie-sleaze",    name: "Indie Sleaze",      subtitle: "2008 vibes · flash photos",   emoji: "📸" },
  { id: "desert-slow",     name: "Desert Slow",       subtitle: "Linen · sand · slow burn",    emoji: "🌵" },
  { id: "jersey-night",    name: "Jersey Night",      subtitle: "Wear your team",              emoji: "🏈" },
  { id: "white-lie",       name: "White Lie",         subtitle: "Tee with your white lie",     emoji: "🤥" },
  { id: "anything-but-cup",name: "Anything But a Cup",subtitle: "BYO weird vessel",            emoji: "🥣" },
  { id: "beach",           name: "Beach",             subtitle: "Florals · linen · sunset",    emoji: "🌅" },
  { id: "y2k",             name: "Y2K",               subtitle: "Low-rise · frosted tips",     emoji: "💿" },
];

export const ACTIVITY_OPTIONS: VoteOption[] = [
  { id: "karaoke-battle", name: "Karaoke Battle",   subtitle: "Teams of 4 · 90 min",     emoji: "🎤" },
  { id: "werewolf",       name: "Werewolf",         subtitle: "Moderated rounds",        emoji: "🐺" },
  { id: "board-games",    name: "Board Games",      subtitle: "Catan · Codenames",       emoji: "🎲" },
  { id: "pong-tourney",   name: "Pong Tournament",  subtitle: "Bracket · winner stays",  emoji: "🏓" },
  { id: "bar-crawl",      name: "Bar Crawl",        subtitle: "3 stops · 1 hour each",   emoji: "🍻" },
  { id: "movie-night",    name: "Movie Night",      subtitle: "Vote on the film",        emoji: "🎬" },
  { id: "casual",         name: "Casual Hangout",   subtitle: "Vibe and chat",           emoji: "💬" },
];

export type VoteKind = "theme" | "activity";

export const OPTIONS_BY_KIND: Record<VoteKind, VoteOption[]> = {
  theme: THEME_OPTIONS,
  activity: ACTIVITY_OPTIONS,
};

export function isValidOption(kind: VoteKind, optionId: string): boolean {
  return OPTIONS_BY_KIND[kind].some((o) => o.id === optionId);
}
