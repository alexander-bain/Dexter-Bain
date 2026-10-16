(() => {
  "use strict";

  const COLLECTIONS = [
    {
      id: "kids",
      label: "Ages 8–12",
      expected: 250,
      entries: `
s|Henry Danger
s|Bunk'd
s|The Thundermans
s|Nicky, Ricky, Dicky & Dawn
s|Game Shakers
s|Sam & Cat
s|Drake & Josh
s|Zoey 101
s|Ned's Declassified School Survival Guide
s|Big Time Rush
s|The Really Loud House
s|The Haunted Hathaways
s|Bella and the Bulldogs
s|Every Witch Way
s|The Bureau of Magical Things
s|Danger Force
s|Tyler Perry's Young Dylan
s|That Girl Lay Lay
s|Side Hustle
s|Erin & Aaron
s|Cousins for Life
s|Knight Squad
s|The Barbarian and the Troll
s|100 Things to Do Before High School
s|The Astronauts
s|Supah Ninjas
s|Marvin Marvin
s|The Troop
s|True Jackson, VP
s|Unfabulous
s|Romeo!
s|The Brothers Garcia
s|All That
s|Kenan & Kel
s|The Amanda Show
s|Clarissa Explains It All
s|The Secret World of Alex Mack
s|Are You Afraid of the Dark?
s|Legends of the Hidden Temple
s|The Adventures of Pete & Pete
s|K.C. Undercover
s|Jessie
s|Austin & Ally
s|Shake It Up
s|Good Luck Charlie
s|Liv and Maddie
s|Raven's Home
s|That's So Raven
s|Andi Mack
s|Girl Meets World
s|Stuck in the Middle
s|Coop & Cami Ask the World
s|Sydney to the Max
s|Gabby Duran & the Unsittables
s|Secrets of Sulphur Springs
s|Ultra Violet & Black Scorpion
s|The Villains of Valley View
s|Saturdays
s|Pretty Freekin Scary
a|Hailey's on It!
s|Mech-X4
s|Lab Rats
s|Lab Rats: Elite Force
s|Mighty Med
s|Pair of Kings
s|Kickin' It
s|Zeke and Luther
s|I'm in the Band
s|A.N.T. Farm
s|Dog with a Blog
s|Sonny with a Chance
s|Jonas
s|Phil of the Future
s|Even Stevens
s|Cory in the House
s|Life with Derek
s|My Babysitter's a Vampire
s|The Next Step
s|The Lodge
s|Just Add Magic
s|Just Add Magic: Mystery City
s|Alexa & Katie
s|Julie and the Phantoms
s|The Baby-Sitters Club
s|Malibu Rescue: The Series
s|The Expanding Universe of Ashley Garcia
s|No Good Nick
s|The Healing Powers of Dude
s|Family Reunion
s|Prince of Peoria
s|Mr. Iglesias
s|Project Mc2
s|Richie Rich
s|Greenhouse Academy
s|The Worst Witch
a|Lost in Oz
s|Odd Squad
s|Ghostwriter
s|The Mysterious Benedict Society
s|Percy Jackson and the Olympians
s|The Hardy Boys
s|Theodosia
s|The InBESTigators
s|Operation Ouch!
s|Horrible Histories
s|The Who Was? Show
s|Brainchild
s|Brain Games
s|MythBusters Jr.
s|Is It Cake?
a|The Loud House
a|The Casagrandes
a|Danny Phantom
a|The Fairly OddParents
a|The Adventures of Jimmy Neutron, Boy Genius
a|Invader Zim
a|Rocket Power
a|Rugrats
a|Hey Arnold!
a|Rocko's Modern Life
a|CatDog
a|Aaahh!!! Real Monsters
a|ChalkZone
a|My Life as a Teenage Robot
a|El Tigre: The Adventures of Manny Rivera
a|T.U.F.F. Puppy
a|Rise of the Teenage Mutant Ninja Turtles
a|Teenage Mutant Ninja Turtles (2012)
a|Kung Fu Panda: Legends of Awesomeness
a|The Penguins of Madagascar
a|Monsters vs. Aliens
a|Big Nate
a|Middlemost Post
a|It's Pony
a|Glitch Techs
a|The Legend of Korra
a|Amphibia
a|Star vs. the Forces of Evil
a|DuckTales (2017)
a|Big City Greens
a|The Ghost and Molly McGee
a|Moon Girl and Devil Dinosaur
a|Hamster & Gretel
a|Kiff
a|Primos
a|Rapunzel's Tangled Adventure
a|Big Hero 6: The Series
a|Baymax!
a|Monsters at Work
a|Cars on the Road
a|Iwájú
a|Dug Days
a|Forky Asks a Question
a|Mickey Mouse
a|The Wonderful World of Mickey Mouse
a|Elena of Avalor
a|Tangled: The Series
a|The 7D
a|Randy Cunningham: 9th Grade Ninja
a|Wander Over Yonder
a|Penn Zero: Part-Time Hero
a|Milo Murphy's Law
a|Kick Buttowski: Suburban Daredevil
a|American Dragon: Jake Long
a|Lilo & Stitch: The Series
a|Recess
a|The Proud Family
a|The Proud Family: Louder and Prouder
a|Fillmore!
a|Dave the Barbarian
a|Brandy & Mr. Whiskers
a|The Emperor's New School
a|Buzz Lightyear of Star Command
a|House of Mouse
a|The New Adventures of Winnie the Pooh
a|The Replacements
a|Fish Hooks
a|Pickle and Peanut
a|Clarence
a|We Bare Bears
a|Craig of the Creek
a|Summer Camp Island
a|Infinity Train
a|OK K.O.! Let's Be Heroes
a|Apple & Onion
a|Victor and Valentino
a|Mao Mao: Heroes of Pure Heart
a|Unikitty!
a|DC Super Hero Girls
a|Justice League Action
a|Ben 10
a|Generator Rex
a|The Powerpuff Girls
a|Dexter's Laboratory
a|Johnny Bravo
a|Ed, Edd n Eddy
a|Courage the Cowardly Dog
a|Codename: Kids Next Door
a|Foster's Home for Imaginary Friends
a|Chowder
a|The Marvelous Misadventures of Flapjack
a|Total Drama Island
a|6teen
a|Johnny Test
a|Wild Kratts
a|Cyberchase
a|Arthur
a|The Magic School Bus
a|The Magic School Bus Rides Again
a|Carmen Sandiego
a|Hilda
a|Kipo and the Age of Wonderbeasts
a|She-Ra and the Princesses of Power
a|The Dragon Prince
a|Trollhunters: Tales of Arcadia
a|3Below: Tales of Arcadia
a|Wizards: Tales of Arcadia
a|Jurassic World Camp Cretaceous
a|Sonic Prime
a|The Cuphead Show!
a|The Boss Baby: Back in Business
a|Dragons: Race to the Edge
a|The Epic Tales of Captain Underpants
a|The Last Kids on Earth
a|Oddballs
a|Kid Cosmic
a|Centaurworld
a|Dogs in Space
a|Pokémon Horizons
a|Beyblade Burst
a|Yu-Gi-Oh!
a|Digimon Adventure
a|Naruto
a|One Piece
a|Dragon Ball Z
a|My Hero Academia
a|Haikyu!!
a|Sailor Moon
a|Cardcaptor Sakura
a|Pokémon Concierge
m|The Mitchells vs. the Machines
m|Luca
m|Turning Red
m|Elemental
m|Wish
m|Raya and the Last Dragon
m|Wreck-It Ralph
m|Big Hero 6
m|Zootopia
m|Tangled
      `,
    },
    {
      id: "sitcoms",
      label: "50 Best Sitcoms",
      expected: 50,
      entries: `
s|I Love Lucy
s|All in the Family
s|The Mary Tyler Moore Show
s|Taxi
s|M*A*S*H
s|Veep
s|Curb Your Enthusiasm
s|It's Always Sunny in Philadelphia
s|Fleabag
s|Black Books
s|Fawlty Towers
s|The Dick Van Dyke Show
s|The Honeymooners
s|The Andy Griffith Show
s|The Jeffersons
s|Maude
s|Sanford and Son
s|Good Times
s|WKRP in Cincinnati
s|Barney Miller
s|Soap
s|Night Court
s|Murphy Brown
s|Designing Women
s|Living Single
s|NewsRadio
s|3rd Rock from the Sun
s|Will & Grace
s|The Larry Sanders Show
s|Spaced
s|Peep Show
s|The IT Crowd
s|Blackadder
s|Absolutely Fabulous
s|The Vicar of Dibley
s|Red Dwarf
s|Coupling
s|Extras
s|Flight of the Conchords
s|Party Down
s|Better Off Ted
s|Broad City
s|Insecure
s|Atlanta
s|What We Do in the Shadows
s|Silicon Valley
s|The Last Man on Earth
s|Kim's Convenience
s|One Day at a Time (2017)
s|Reservation Dogs
      `,
    },
    {
      id: "movies",
      label: "100 Movie-Night Greats",
      expected: 100,
      entries: `
m|The Dark Knight
m|Avengers: Endgame
m|Iron Man
m|Guardians of the Galaxy
m|Captain America: The Winter Soldier
m|Thor: Ragnarok
m|Black Panther
m|Spider-Man: No Way Home
m|Spider-Man 2
m|The Batman
m|Superman
m|Wonder Woman
m|Deadpool
m|X-Men: Days of Future Past
m|Logan
m|Mission: Impossible - Fallout
m|Top Gun: Maverick
m|Mad Max: Fury Road
m|Die Hard
m|Terminator 2: Judgment Day
m|Aliens
m|The Matrix
m|Inception
m|Interstellar
m|The Prestige
m|Oppenheimer
m|Dunkirk
m|Gladiator
m|Braveheart
m|The Last Samurai
m|Master and Commander: The Far Side of the World
m|The Bourne Identity
m|Casino Royale
m|Skyfall
m|Ocean's Eleven
m|The Italian Job (2003)
m|Baby Driver
m|Speed
m|Point Break
m|The Fugitive
m|Air Force One
m|The Rock
m|Con Air
m|Face/Off
m|National Treasure
m|The Mummy (1999)
m|Indiana Jones and the Last Crusade
m|Star Wars: The Empire Strikes Back
m|Star Wars: Return of the Jedi
m|Rogue One: A Star Wars Story
m|The Lord of the Rings: The Two Towers
m|The Lord of the Rings: The Return of the King
m|Harry Potter and the Prisoner of Azkaban
m|Pirates of the Caribbean: Dead Man's Chest
m|The Hobbit: An Unexpected Journey
m|Dungeons & Dragons: Honor Among Thieves
m|The Chronicles of Narnia: The Lion, the Witch and the Wardrobe
m|Hook
m|Stardust
m|The Mask of Zorro
m|The Count of Monte Cristo
m|The Adventures of Tintin
m|Ready Player One
m|Edge of Tomorrow
m|Minority Report
m|War of the Worlds
m|Planet of the Apes (1968)
m|Dawn of the Planet of the Apes
m|King Kong (2005)
m|Godzilla Minus One
m|Pacific Rim
m|Twister
m|Apollo 13
m|The Martian
m|Gravity
m|A Quiet Place
m|Get Out
m|Scream
m|Jaws
m|The Sixth Sense
m|The Silence of the Lambs
m|Se7en
m|The Departed
m|Heat
m|Goodfellas
m|Pulp Fiction
m|The Shawshank Redemption
m|Forrest Gump
m|Catch Me If You Can
m|The Social Network
m|Whiplash
m|The Grand Budapest Hotel
m|The Royal Tenenbaums
m|Groundhog Day
m|The Blues Brothers
m|Monty Python and the Holy Grail
m|Airplane!
m|The Naked Gun
m|Step Brothers
m|Elf
      `,
    },
    {
      id: "editors",
      label: "100 Staff Picks",
      expected: 100,
      entries: `
s|The Last of Us
s|Severance
s|The Expanse
s|Battlestar Galactica
s|Firefly
s|The Orville
s|Star Trek: Deep Space Nine
s|Star Trek: Voyager
s|Stargate SG-1
s|Dark
s|The OA
s|Russian Doll
s|Yellowjackets
s|The Leftovers
s|Mr. Robot
s|Killing Eve
s|Orphan Black
s|Veronica Mars
s|Friday Night Lights
s|Glee
s|The O.C.
s|One Tree Hill
s|Roswell
s|The 100
s|Shadow and Bone
s|His Dark Materials
s|The Wheel of Time
s|Outlander
s|Vikings
s|The Last Kingdom
s|Peaky Blinders
s|Boardwalk Empire
s|Mad Men
s|The Sopranos
s|The Wire
s|Ozark
s|Fargo
s|True Detective
s|Mindhunter
s|Luther
s|Broadchurch
s|Line of Duty
s|The Americans
s|Homeland
s|The Diplomat
s|The Queen's Gambit
s|Maid
s|Station Eleven
s|Poker Face
s|Shrinking
m|Everything Everywhere All at Once
m|Parasite
m|Spirited Away
m|Princess Mononoke
m|My Neighbor Totoro
m|Kiki's Delivery Service
m|Howl's Moving Castle
m|The Iron Giant
m|Coraline
m|Fantastic Mr. Fox
m|Kubo and the Two Strings
m|The Nightmare Before Christmas
m|WALL-E
m|Soul
m|The Wild Robot
m|Puss in Boots: The Last Wish
m|Nimona
m|Klaus
m|Wolfwalkers
m|Song of the Sea
m|Casablanca
m|Singin' in the Rain
m|Roman Holiday
m|12 Angry Men
m|Rear Window
m|North by Northwest
m|Some Like It Hot
m|The Apartment
m|Lawrence of Arabia
m|2001: A Space Odyssey
m|The Godfather
m|The Godfather Part II
m|One Flew Over the Cuckoo's Nest
m|Rocky
m|Raging Bull
m|Amadeus
m|Cinema Paradiso
m|Do the Right Thing
m|Thelma & Louise
m|Before Sunrise
m|The Big Lebowski
m|Eternal Sunshine of the Spotless Mind
m|Pan's Labyrinth
m|No Country for Old Men
m|There Will Be Blood
m|Moonlight
m|Lady Bird
m|Little Women (2019)
m|The Holdovers
m|Past Lives
      `,
    },
  ];

  const ROLE_BLUEPRINTS = {
    heart: {
      character: "The Loyal Heart",
      label: "The person everyone trusts",
      why: "You lead with empathy, protect your people, and make every group stronger by noticing who needs support.",
    },
    mind: {
      character: "The Clever Strategist",
      label: "The one with the plan",
      why: "You spot patterns quickly, stay level when things get complicated, and turn big problems into smart next steps.",
    },
    spark: {
      character: "The Fearless Spark",
      label: "The scene-stealing catalyst",
      why: "You bring confidence, momentum, and memorable energy. When everyone hesitates, you are ready to make something happen.",
    },
    wildcard: {
      character: "The Wild Card",
      label: "The unforgettable original",
      why: "You trust unusual instincts, surprise people in the best way, and make the story more interesting by refusing to be predictable.",
    },
  };

  const PALETTES = {
    kids: ["#6c4cff", "#ff4fa3", "#ffcf4a"],
    sitcoms: ["#ff633b", "#ffb13b", "#ffef9f"],
    movies: ["#1264ff", "#11c6a2", "#c8ff5e"],
    editors: ["#7a39d8", "#2462cf", "#72ddff"],
  };

  function normalizeTitle(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "and")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .toLowerCase();
  }

  function slugify(value) {
    return normalizeTitle(value).replace(/\s+/g, "-");
  }

  function hashTitle(value) {
    let hash = 2166136261;
    for (const character of value) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function escapeXml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function titleLines(title) {
    const words = title.split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > 20 && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    if (lines.length <= 3) return lines;
    const compact = [lines[0], lines[1], lines.slice(2).join(" ")];
    if (compact[2].length > 24) compact[2] = `${compact[2].slice(0, 23).trim()}…`;
    return compact;
  }

  function makeCover(title, type, collection) {
    const colors = PALETTES[collection.id];
    const hash = hashTitle(title);
    const turn = hash % 34 - 17;
    const lines = titleLines(title);
    const startY = 355 - (lines.length - 1) * 31;
    const text = lines
      .map(
        (line, index) =>
          `<tspan x="50" y="${startY + index * 63}">${escapeXml(line)}</tspan>`,
      )
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset=".56" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient></defs>
      <rect width="600" height="900" rx="28" fill="#10111a"/>
      <circle cx="${110 + (hash % 380)}" cy="170" r="265" fill="url(#g)" opacity=".96"/>
      <rect x="-90" y="555" width="780" height="245" rx="60" fill="url(#g)" opacity=".34" transform="rotate(${turn} 300 678)"/>
      <circle cx="300" cy="180" r="94" fill="#fff" opacity=".16"/>
      <text x="300" y="210" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="92" font-weight="800">${type === "movie" ? "▶" : "?"}</text>
      <text x="50" y="${startY}" fill="#fff" font-family="Arial,sans-serif" font-size="52" font-weight="800">${text}</text>
      <rect x="50" y="690" width="500" height="2" fill="#fff" opacity=".35"/>
      <text x="50" y="755" fill="#fff" font-family="Arial,sans-serif" font-size="23" font-weight="700" letter-spacing="3">${escapeXml(collection.label.toUpperCase())}</text>
      <text x="50" y="812" fill="#fff" opacity=".82" font-family="Arial,sans-serif" font-size="19" font-weight="700" letter-spacing="4">CHARACTER CHECK</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function parseCollection(collection) {
    return collection.entries
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("|");
        const kind = line.slice(0, separator);
        const title = line.slice(separator + 1).trim();
        if (!title || !["s", "a", "m"].includes(kind)) {
          throw new Error(`Malformed ${collection.id} entry: ${line}`);
        }
        return {
          title,
          type: kind === "m" ? "movie" : "show",
          animated: kind === "a",
          collection,
        };
      });
  }

  if (!window.MEDIA || !window.OUTCOMES || !Array.isArray(window.FALLBACK_QUESTIONS)) {
    throw new Error("The core Character Check catalog must load before its expanded collections.");
  }

  const baseIds = new Set(Object.keys(window.MEDIA));
  const baseTitles = new Set(Object.values(window.MEDIA).map((media) => normalizeTitle(media.officialTitle)));
  const entries = COLLECTIONS.flatMap((collection) => {
    const parsed = parseCollection(collection);
    if (parsed.length !== collection.expected) {
      throw new Error(`${collection.label} has ${parsed.length} entries; expected ${collection.expected}.`);
    }
    return parsed;
  });
  const ids = new Set();
  const normalizedTitles = new Set();

  for (const entry of entries) {
    const id = slugify(entry.title);
    const normalized = normalizeTitle(entry.title);
    if (baseIds.has(id) || baseTitles.has(normalized)) {
      throw new Error(`Expanded catalog repeats an existing title: ${entry.title}`);
    }
    if (ids.has(id) || normalizedTitles.has(normalized)) {
      throw new Error(`Expanded catalog contains a duplicate: ${entry.title}`);
    }
    ids.add(id);
    normalizedTitles.add(normalized);

    const image = makeCover(entry.title, entry.type, entry.collection);
    const sourceUrl = `https://dexterbain.com/charactercheck/?show=${encodeURIComponent(id)}`;
    const genres = entry.animated
      ? ["Animation", "Family"]
      : entry.collection.id === "kids"
        ? ["Family", entry.type === "movie" ? "Adventure" : "Comedy"]
        : entry.collection.id === "sitcoms"
          ? ["Comedy"]
          : entry.type === "movie"
            ? ["Drama", "Adventure"]
            : ["Drama"];

    window.MEDIA[id] = {
      type: entry.type,
      officialTitle: entry.title,
      genres,
      poster: image,
      hero: image,
      artworkFallback: image,
      sourceName: "Character Check original title card",
      sourceUrl,
      collection: entry.collection.id,
      collectionLabel: entry.collection.label,
      catalogGenerated: true,
      questionImages: window.FALLBACK_QUESTIONS.map((_, index) => ({
        url: image,
        alt: `${entry.title} Character Check artwork for question ${index + 1}`,
        sourceName: "Character Check",
        sourceUrl,
      })),
    };

    window.OUTCOMES[id] = Object.fromEntries(
      Object.entries(ROLE_BLUEPRINTS).map(([role, blueprint]) => [
        role,
        {
          character: blueprint.character,
          actor: "Character archetype",
          label: blueprint.label,
          why: `In the world of ${entry.title}, ${blueprint.why.charAt(0).toLowerCase()}${blueprint.why.slice(1)}`,
        },
      ]),
    );
  }

  if (entries.length !== 500 || ids.size !== 500) {
    throw new Error(`Expanded catalog has ${entries.length} unique entries; expected 500.`);
  }

  window.CHARACTER_CHECK_COLLECTIONS = Object.freeze(
    COLLECTIONS.map(({ id, label, expected }) => Object.freeze({ id, label, count: expected })),
  );
})();
