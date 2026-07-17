// Fixed, colorblind-safe palette (Okabe-Ito style) for distinguishing people
// on the calendar. Deliberately separate from the brand palette (globals.css) —
// brand colors are too close together to tell 10-20 people apart at a glance.
export const PERSON_PALETTE = [
  "#E69F00", // orange
  "#56B4E9", // sky blue
  "#009E73", // bluish green
  "#F0E442", // yellow
  "#0072B2", // blue
  "#D55E00", // vermillion
  "#CC79A7", // reddish purple
  "#999999", // grey
  "#66C2A5", // teal
  "#FC8D62", // coral
  "#8DA0CB", // periwinkle
  "#E78AC3", // pink
] as const;

/** Returns the next unused palette color, cycling if everyone's assigned. */
export function getNextPersonColor(usedColors: string[]): string {
  const unused = PERSON_PALETTE.find((c) => !usedColors.includes(c));
  if (unused) return unused;
  return PERSON_PALETTE[usedColors.length % PERSON_PALETTE.length];
}
