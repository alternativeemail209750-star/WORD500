// words.js
// The word bank for WORD500. Every entry has:
//   word     - the secret answer (lowercase, letters only)
//   category - shown to viewers as a topic clue
//   hint     - an extra fun-fact clue revealed partway through the round
//
// Feel free to add more entries to any list later - the game reads this
// file fresh every time it picks a new word, so you never have to touch
// server.js to grow the word bank.

export const WORD_BANK = {
  easy: [
    { word: "tiger", category: "Animals", hint: "Big cat with orange and black stripes" },
    { word: "pizza", category: "Food", hint: "Round Italian dish with cheese on top" },
    { word: "beach", category: "Places", hint: "Sandy spot next to the ocean" },
    { word: "robot", category: "Technology", hint: "A machine that can move and act on its own" },
    { word: "candy", category: "Food", hint: "Sweet treat kids love on Halloween" },
    { word: "ocean", category: "Nature", hint: "Huge body of salt water" },
    { word: "smile", category: "Everyday life", hint: "What your face does when you're happy" },
    { word: "guitar", category: "Music", hint: "Six-string instrument you strum" },
    { word: "planet", category: "Space", hint: "Earth is one of these" },
    { word: "coffee", category: "Food", hint: "Hot drink that helps you wake up" },
    { word: "dragon", category: "Fantasy", hint: "Mythical fire-breathing creature" },
    { word: "camera", category: "Technology", hint: "You use it to take photos" },
    { word: "forest", category: "Nature", hint: "A big area full of trees" },
    { word: "wizard", category: "Fantasy", hint: "Spell-casting character with a pointy hat" },
    { word: "puzzle", category: "Games", hint: "Jigsaw pieces that fit together" }
  ],
  medium: [
    { word: "volcano", category: "Nature", hint: "Mountain that can erupt with lava" },
    { word: "diamond", category: "Gems", hint: "Hardest natural gemstone" },
    { word: "captain", category: "Jobs", hint: "The person in charge of a ship or team" },
    { word: "rainbow", category: "Nature", hint: "Colorful arc that appears after rain" },
    { word: "trumpet", category: "Music", hint: "Brass instrument you blow into" },
    { word: "penguin", category: "Animals", hint: "Flightless bird that lives in cold places" },
    { word: "hurdle", category: "Sports", hint: "Track and field obstacle you jump over" },
    { word: "compass", category: "Tools", hint: "Points north to help you find your way" },
    { word: "glacier", category: "Nature", hint: "A giant slow-moving mass of ice" },
    { word: "octopus", category: "Animals", hint: "Sea creature with eight arms" },
    { word: "journey", category: "Everyday life", hint: "A trip from one place to another" },
    { word: "chimney", category: "Buildings", hint: "Smoke rises out of the top of it" },
    { word: "harvest", category: "Farming", hint: "Gathering crops when they're ripe" },
    { word: "voyage", category: "Everyday life", hint: "A long journey, often by sea" },
    { word: "canyon", category: "Places", hint: "A deep valley carved by a river" }
  ],
  hard: [
    { word: "labyrinth", category: "Fantasy", hint: "A maze designed to confuse you" },
    { word: "avalanche", category: "Nature", hint: "A sudden mass of snow rushing downhill" },
    { word: "telescope", category: "Science", hint: "Used to see faraway stars and planets" },
    { word: "quarantine", category: "Everyday life", hint: "A period of isolation to stop germs spreading" },
    { word: "symphony", category: "Music", hint: "A long piece written for a full orchestra" },
    { word: "chameleon", category: "Animals", hint: "A lizard famous for changing color" },
    { word: "hurricane", category: "Nature", hint: "A powerful spinning storm over the ocean" },
    { word: "gymnastics", category: "Sports", hint: "A sport with flips, beams and rings" },
    { word: "architect", category: "Jobs", hint: "Someone who designs buildings" },
    { word: "kaleidoscope", category: "Toys", hint: "A tube toy that makes colorful patterns" },
    { word: "photosynthesis", category: "Science", hint: "How plants turn sunlight into food" },
    { word: "constellation", category: "Space", hint: "A pattern of stars with a name, like Orion" },
    { word: "marshmallow", category: "Food", hint: "Soft, fluffy treat you can roast over a fire" },
    { word: "submarine", category: "Vehicles", hint: "A ship that travels underwater" },
    { word: "tournament", category: "Sports", hint: "A series of matches to find one winner" }
  ]
};

// Handy for the "mixed" difficulty mode.
export const ALL_WORDS = [
  ...WORD_BANK.easy.map(w => ({ ...w, difficulty: "easy" })),
  ...WORD_BANK.medium.map(w => ({ ...w, difficulty: "medium" })),
  ...WORD_BANK.hard.map(w => ({ ...w, difficulty: "hard" }))
];
