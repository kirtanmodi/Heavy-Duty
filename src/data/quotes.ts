export const mentzerQuotes = [
  "The key to building massive, powerful muscles is to doggedly increase the intensity of work done within a given time.",
  "Training should be brief, intense, and infrequent.",
  "You don't need more exercise — you need harder exercise.",
  "The less frequently you train, the more time you allow for recovery and growth.",
  "One set to failure is the most efficient way to stimulate growth.",
  "If you can do more than one set of an exercise, you didn't train hard enough on the first set.",
  "Intensity is the single most important factor in exercise.",
  "The body has a limited capacity for recovery — respect it.",
  "Train harder, not longer. The workout is just the stimulus.",
  "Progressive overload is the only way to keep growing.",
]

export function getRandomQuote(): string {
  return mentzerQuotes[Math.floor(Math.random() * mentzerQuotes.length)]
}
