// answers.js
// The curated list of possible SECRET words for WORD500, grouped by
// word length (this is the "difficulty" control). This list is
// intentionally small and hand-picked — every word here is a common,
// recognizable English word.
//
// One deliberate rule: we never pick a word here that's just a shorter
// word in this same list with a lazy "s" tacked on (e.g. we use FOOD,
// not FOODS; MINERAL, not MINERALS). Answers should each feel like a
// distinct, worthwhile word to guess — not a cheap plural of another
// answer.
//
// This is separate from the guess dictionary (see dictionary.js), which
// is enormous (370,000+ words) and used only to check whether a viewer's
// comment is a real, guessable word. Real Wordle works the same way:
// a small curated answer list, and a much bigger list of acceptable
// guesses. Add more words to any list below whenever you like — the
// game always re-reads this file when it picks a new word.

export const ANSWER_WORDS = {
  4: [
    "gold", "moon", "fire", "rain", "snow", "wolf", "lake", "hero", "gift", "king",
    "ship", "desk", "lamp", "book", "cake", "fish", "bird", "tree", "leaf", "seed",
    "corn", "rice", "milk", "salt", "soup", "meat", "beef", "pork", "crab", "clam",
    "duck", "bear", "lion", "frog", "toad", "deer", "goat", "mule", "colt", "foal",
    "calf", "lamb", "chef", "cook", "maid", "star", "club", "game", "team", "race",
    "jump", "swim", "hike", "camp", "tent", "rope", "knot", "flag", "drum", "horn",
    "bell", "gong", "harp", "veil", "cape", "robe", "vest", "boot", "shoe", "sock",
    "belt", "ring", "crow", "hawk", "puma", "lynx", "seal", "fawn"
  ],
  5: [
    "today", "opine", "chaos", "basil", "laser", "graph", "siege", "intro", "scrub", "sauna",
    "empty", "slept", "lurch", "hence", "apple", "beach", "candy", "dance", "eagle", "flame",
    "grape", "honey", "ivory", "joker", "knife", "lemon", "mango", "noble", "ocean", "piano",
    "queen", "robot", "storm", "tiger", "unity", "vivid", "witch", "youth", "zebra", "bread",
    "crown", "dress", "frost", "glide", "heart", "igloo", "juice", "karma", "lemur", "magic",
    "north", "orbit", "plant", "quilt", "river", "shark", "train", "ultra", "voice", "watch",
    "yield", "zesty", "blaze", "cable", "drift", "earth", "fable", "ghost", "hotel", "image",
    "jolly", "knock", "lodge", "medal", "niche", "oasis"
  ],
  6: [
    "planet", "guitar", "window", "garden", "island", "jungle", "marble", "nature", "orange", "purple",
    "quartz", "rabbit", "silver", "temple", "unique", "voyage", "wizard", "yellow", "zenith", "anchor",
    "bridge", "castle", "dragon", "emblem", "falcon", "galaxy", "harbor", "insect", "jacket", "kettle",
    "lagoon", "master", "notion", "output", "pickle", "quiver", "ribbon", "spirit", "turtle", "velvet",
    "walnut", "yogurt", "zodiac", "almond", "basket", "canyon", "doodle", "engine", "forest", "global",
    "hammer", "icicle", "jigsaw"
  ]
};
