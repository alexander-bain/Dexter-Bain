const OUTCOMES = {
  "friends": {
    heart: { character: "Joey Tribbiani", actor: "Matt LeBlanc", label: "The Loyal Softie", why: "You lead with warmth, loyalty, and an honest enthusiasm that makes people feel instantly welcome. Your friends know that when it really matters, you will show up with your whole heart." },
    mind: { character: "Monica Geller", actor: "Courteney Cox", label: "The Capable Planner", why: "You feel best when there is a plan, a purpose, and room to make things excellent. You care fiercely, and your high standards are one of the ways you look after everyone around you." },
    spark: { character: "Rachel Green", actor: "Jennifer Aniston", label: "The Radiant Reinvention", why: "You bring style, a strong understanding of people, and an adventurous willingness to grow. You can walk into a new chapter, learn as you go, and make the journey look effortless." },
    wildcard: { character: "Phoebe Buffay", actor: "Lisa Kudrow", label: "The One-of-a-Kind Original", why: "You trust your own strange and wonderful point of view, even when nobody else sees things quite the same way. Your imagination and honesty keep your circle laughing and pleasantly surprised." }
  },
  "modern-family": {
    heart: { character: "Phil Dunphy", actor: "Ty Burrell", label: "The Earnest Cheerleader", why: "You bring wholehearted optimism to the people you love and are never too cool to be excited. Even when a plan goes sideways, your enthusiasm helps everyone find the fun again." },
    mind: { character: "Claire Dunphy", actor: "Julie Bowen", label: "The Family Strategist", why: "You spot the details, anticipate the problems, and quietly keep the whole operation moving. Your determination can be intense, but it comes from wanting the best for your people." },
    spark: { character: "Gloria Delgado-Pritchett", actor: "Sofía Vergara", label: "The Fearless Firecracker", why: "You are expressive, confident, and impossible to overlook. You love boldly, speak directly, and bring a bright charge of energy into every room." },
    wildcard: { character: "Cameron Tucker", actor: "Eric Stonestreet", label: "The Theatrical Surprise", why: "You turn ordinary moments into full-scale events and refuse to hide your dramatic side. Your big personality comes with a big heart, so even your wildest ideas feel inviting." }
  },
  "arrested-development": {
    heart: { character: "George Michael Bluth", actor: "Michael Cera", label: "The Earnest Loyalist", why: "You care sincerely about doing right by people and think hard about how your choices affect them. Your gentleness may come with nerves, but it gives your loyalty real depth." },
    mind: { character: "Michael Bluth", actor: "Jason Bateman", label: "The Reluctant Fixer", why: "You stay practical when the room becomes chaos and instinctively turn confusion into a plan. You may complain about being the responsible one, but people lean on your judgment." },
    spark: { character: "Lindsay Bluth Fünke", actor: "Portia de Rossi", label: "The Glamorous Idealist", why: "You mix natural charisma with a desire to stand for something meaningful. You may improvise the details, but your confidence makes people pay attention." },
    wildcard: { character: "Gob Bluth", actor: "Will Arnett", label: "The Magnificent Distraction", why: "You believe every entrance deserves drama and every idea deserves a grand reveal. Your confidence occasionally outruns the plan, but you are never, ever forgettable." }
  },
  "the-good-place": {
    heart: { character: "Jason Mendoza", actor: "Manny Jacinto", label: "The Pure-Hearted Optimist", why: "You meet life with openness, loyalty, and a refreshingly uncomplicated kindness. Your instincts may be unconventional, but your heart almost always points toward your friends." },
    mind: { character: "Chidi Anagonye", actor: "William Jackson Harper", label: "The Ethical Overthinker", why: "You care deeply about making the right choice and can see complexities other people miss. Decisions may take you a while, but your conscience and curiosity make you a trusted guide." },
    spark: { character: "Eleanor Shellstrop", actor: "Kristen Bell", label: "The Scrappy Improver", why: "You are quick, funny, and resourceful enough to find a path through almost anything. Beneath the sharp edges, you have a real capacity to grow and bring others with you." },
    wildcard: { character: "Janet", actor: "D'Arcy Carden", label: "The Infinite Surprise", why: "You are helpful, adaptable, and full of unexpected depths that reveal themselves at exactly the right moment. People may think they understand you, and then you delight them with a completely new side." }
  },
  "how-i-met-your-mother": {
    heart: { character: "Marshall Eriksen", actor: "Jason Segel", label: "The Big-Hearted Believer", why: "You are affectionate, loyal, and unafraid to believe in lasting love and ridiculous fun. Your sincerity makes people feel safe being fully themselves around you." },
    mind: { character: "Ted Mosby", actor: "Josh Radnor", label: "The Thoughtful Romantic", why: "You search for meaning in the details and imagine how today's choices fit into a larger story. You can overanalyze, but it is because you care about building a life that feels true." },
    spark: { character: "Barney Stinson", actor: "Neil Patrick Harris", label: "The Legendary Showman", why: "You turn social life into a performance and approach every challenge with astonishing commitment. Behind the spectacle, you are more sentimental and loyal than you first let on." },
    wildcard: { character: "Robin Scherbatsky", actor: "Cobie Smulders", label: "The Independent Adventurer", why: "You are capable, ambitious, and comfortable choosing your own route. Your cool confidence hides a loyal streak that the people closest to you value deeply." }
  },
  "the-simpsons": {
    heart: { character: "Marge Simpson", actor: "Julie Kavner", label: "The Steady Center", why: "You hold your people together with patience, practical care, and a quietly resilient spirit. You can tolerate plenty of chaos without losing sight of what really matters." },
    mind: { character: "Lisa Simpson", actor: "Yeardley Smith", label: "The Principled Prodigy", why: "You are curious, responsible, and willing to speak up when something does not feel right. Your intelligence matters to you most when it can make the world a little better." },
    spark: { character: "Bart Simpson", actor: "Nancy Cartwright", label: "The Mischief Maker", why: "You question rules, chase excitement, and can find comedy in almost any situation. Your rebellious streak keeps life lively, especially when things get too predictable." },
    wildcard: { character: "Homer Simpson", actor: "Dan Castellaneta", label: "The Lovable Chaos Agent", why: "You follow your appetites and emotions with spectacular honesty. Your choices can be unpredictable, but your affection for your favorite people always finds a way through." }
  },
  "the-office": {
    heart: { character: "Pam Beesly", actor: "Jenna Fischer", label: "The Quiet Encourager", why: "You notice what people need and offer warmth without demanding the spotlight. As your confidence grows, you become brave enough to choose the life and relationships that truly fit you." },
    mind: { character: "Oscar Martinez", actor: "Oscar Nuñez", label: "The Rational Realist", why: "You bring clarity, competence, and a healthy dose of skepticism to confusing situations. People count on you to notice when the numbers, or the logic, simply do not add up." },
    spark: { character: "Jim Halpert", actor: "John Krasinski", label: "The Charming Observer", why: "You read the room quickly and know exactly when humor can make a dull moment better. Your laid-back charm works because it is grounded in real attention to the people you love." },
    wildcard: { character: "Michael Scott", actor: "Steve Carell", label: "The Unfiltered Entertainer", why: "You crave connection and bring enormous, unpredictable energy to every gathering. Your execution may surprise people, but your desire to make everyone feel like family is genuine." }
  },
  "parks-and-recreation": {
    heart: { character: "Leslie Knope", actor: "Amy Poehler", label: "The Unstoppable Supporter", why: "You believe in people with contagious intensity and put real work behind your optimism. You remember the details that make friends feel valued, then rally everyone toward something bigger." },
    mind: { character: "Ben Wyatt", actor: "Adam Scott", label: "The Lovable Policy Nerd", why: "You are thoughtful, analytical, and genuinely delighted by the subjects you care about. Your planning skills keep ambitious dreams grounded without dimming anyone's excitement." },
    spark: { character: "Tom Haverford", actor: "Aziz Ansari", label: "The Trend-Setting Dreamer", why: "You are always imagining the next experience, idea, or glow-up. Your taste and confidence bring momentum, and even your boldest plans make life more colorful." },
    wildcard: { character: "Ron Swanson", actor: "Nick Offerman", label: "The Deadpan Original", why: "You know exactly what you like, value independence, and refuse to waste words. Beneath your no-nonsense exterior, you show deep loyalty through actions rather than speeches." }
  },
  "brooklyn-nine-nine": {
    heart: { character: "Terry Jeffords", actor: "Terry Crews", label: "The Protective Powerhouse", why: "You combine strength with tenderness and are never embarrassed to care out loud. You look after your team, celebrate their wins, and keep everyone steady under pressure." },
    mind: { character: "Raymond Holt", actor: "Andre Braugher", label: "The Composed Commander", why: "You value precision, integrity, and saying exactly what you mean. Your calm exterior makes the rare flashes of humor and affection even more meaningful." },
    spark: { character: "Jake Peralta", actor: "Andy Samberg", label: "The Playful Ace", why: "You think quickly, chase the interesting lead, and use humor to energize everyone around you. When the stakes rise, your loyalty and instincts reveal just how capable you are." },
    wildcard: { character: "Rosa Diaz", actor: "Stephanie Beatriz", label: "The Mysterious Maverick", why: "You protect your independence and reveal yourself only to people who have earned your trust. Your intensity is balanced by a surprising, fiercely loyal softness." }
  },
  "new-girl": {
    heart: { character: "Jess Day", actor: "Zooey Deschanel", label: "The Hopeful Helper", why: "You care openly, commit enthusiastically, and believe problems can be improved with creativity and conversation. Your optimism helps people risk being sincere." },
    mind: { character: "Schmidt", actor: "Max Greenfield", label: "The Meticulous Achiever", why: "You have exacting tastes, ambitious plans, and strong opinions about how things should be done. Beneath the polish, you want to build a life that makes your people proud." },
    spark: { character: "Cece Parekh", actor: "Hannah Simone", label: "The Magnetic Realist", why: "You carry yourself with confidence and see through nonsense quickly. Your grounded honesty and warm loyalty make you the person others want beside them when life gets messy." },
    wildcard: { character: "Nick Miller", actor: "Jake Johnson", label: "The Lovable Contrarian", why: "You distrust unnecessary rules and prefer your own delightfully improvised system. You may act unimpressed, but your care for your friends runs deep and shows up when it counts." }
  },
  "community": {
    heart: { character: "Annie Edison", actor: "Alison Brie", label: "The Earnest Achiever", why: "You care intensely, prepare thoroughly, and believe people can rise to a higher standard. Your enthusiasm keeps the group moving, while your loyalty reminds everyone why the effort matters." },
    mind: { character: "Abed Nadir", actor: "Danny Pudi", label: "The Pattern Reader", why: "You notice structures, references, and social patterns that other people miss. Your distinct perspective helps your friends understand both the moment they are in and each other." },
    spark: { character: "Jeff Winger", actor: "Joel McHale", label: "The Silver-Tongued Leader", why: "You can read an audience, find the persuasive angle, and turn uncertainty into momentum. Your confidence is strongest when you use it to bring very different people together." },
    wildcard: { character: "Troy Barnes", actor: "Donald Glover", label: "The Joyful Improv", why: "You are playful, emotionally open, and ready to make a routine day into an adventure. Your willingness to commit to the bit creates the kind of joy people remember." }
  },
  "schitts-creek": {
    heart: { character: "Johnny Rose", actor: "Eugene Levy", label: "The Steady Gentleman", why: "You meet upheaval with dignity, patience, and a sincere desire to care for your family. Even when you do not have the answer, your steadiness gives everyone somewhere to stand." },
    mind: { character: "Stevie Budd", actor: "Emily Hampshire", label: "The Dry-Eyed Realist", why: "You observe before you speak and use sharp humor to cut through performance. Your guarded style hides courage, competence, and a real willingness to grow." },
    spark: { character: "David Rose", actor: "Dan Levy", label: "The Expressive Curator", why: "You have strong taste, vivid feelings, and a gift for making ordinary things feel considered. You may be cautious with your heart, but once you choose someone, your loyalty is wholehearted." },
    wildcard: { character: "Moira Rose", actor: "Catherine O'Hara", label: "The Grand Original", why: "You refuse to shrink your vocabulary, wardrobe, or presence for anyone. Your theatrical confidence transforms every minor moment into something gloriously memorable." }
  },
  "ted-lasso": {
    heart: { character: "Ted Lasso", actor: "Jason Sudeikis", label: "The Radical Optimist", why: "You lead with curiosity, encouragement, and faith in people's ability to improve. Your warmth is not naïve; it is a deliberate strength that changes the atmosphere around you." },
    mind: { character: "Rebecca Welton", actor: "Hannah Waddingham", label: "The Commanding Strategist", why: "You are poised, perceptive, and capable of making difficult decisions. Your real power appears when ambition and vulnerability work together instead of competing." },
    spark: { character: "Keeley Jones", actor: "Juno Temple", label: "The Radiant Connector", why: "You combine bright confidence with an instinct for making other people feel seen. Your social energy opens doors, and your kindness makes people want to walk through them with you." },
    wildcard: { character: "Roy Kent", actor: "Brett Goldstein", label: "The Gruff Truth-Teller", why: "You have little patience for pretending and care much more deeply than your expression suggests. Your honesty can be fierce, but so is the loyalty underneath it." }
  },
  "abbott-elementary": {
    heart: { character: "Janine Teagues", actor: "Quinta Brunson", label: "The Determined Idealist", why: "You see possibility where others see limitations and keep working long after the easy enthusiasm fades. Your hope becomes practical because you are willing to do the work." },
    mind: { character: "Gregory Eddie", actor: "Tyler James Williams", label: "The Quiet Professional", why: "You are observant, disciplined, and thoughtful about every step forward. You may take time to open up, but your reliability says more than a loud speech ever could." },
    spark: { character: "Ava Coleman", actor: "Janelle James", label: "The Unbothered Showstopper", why: "You know how to command attention, land a line, and make confidence look effortless. Your methods can be surprising, but your instincts are sharper than people first assume." },
    wildcard: { character: "Melissa Schemmenti", actor: "Lisa Ann Walter", label: "The Resourceful Insider", why: "You know a person for every problem and prefer practical results to official procedure. Your tough humor and deep loyalty make you exactly who friends want in their corner." }
  },
  "superstore": {
    heart: { character: "Amy Sosa", actor: "America Ferrera", label: "The Resilient Protector", why: "You are practical, caring, and skilled at holding things together under ridiculous pressure. You advocate for your people even when you are still figuring out your own next move." },
    mind: { character: "Jonah Simms", actor: "Ben Feldman", label: "The Earnest Analyst", why: "You ask big questions, explain your reasoning, and want everyday choices to mean something. Your idealism occasionally gets ahead of you, but it comes from a sincere wish to help." },
    spark: { character: "Cheyenne Lee", actor: "Nichole Sakura", label: "The Sunny Scene-Stealer", why: "You bring bright energy, surprising insight, and a sense of fun to even the longest day. People may underestimate you until your perfectly timed observation lands." },
    wildcard: { character: "Dina Fox", actor: "Lauren Ash", label: "The Fierce Rulebook", why: "You commit completely, speak plainly, and take your responsibilities very seriously. Your intensity is uniquely yours, and the people you love benefit from your formidable loyalty." }
  },
  "30-rock": {
    heart: { character: "Kenneth Parcell", actor: "Jack McBrayer", label: "The Cheerful Devotee", why: "You approach work and friendship with sincere enthusiasm and almost supernatural resilience. Your optimism can survive any absurdity and often brings out the better side of everyone else." },
    mind: { character: "Liz Lemon", actor: "Tina Fey", label: "The Relatable Problem-Solver", why: "You juggle competing demands with intelligence, improvisation, and well-earned exasperation. You may not feel polished, but you are usually the person making the impossible day function." },
    spark: { character: "Jack Donaghy", actor: "Alec Baldwin", label: "The Executive Force", why: "You project certainty, think strategically, and enjoy turning ambition into measurable results. Your confidence becomes most useful when it helps someone else recognize their own potential." },
    wildcard: { character: "Tracy Jordan", actor: "Tracy Morgan", label: "The Unscripted Genius", why: "You reject predictability and turn every interaction into an event nobody could have planned. Your unusual logic often contains a flash of insight that catches everyone off guard." }
  },
  "seinfeld": {
    heart: { character: "Elaine Benes", actor: "Julia Louis-Dreyfus", label: "The Candid Confidante", why: "You are expressive, independent, and honest enough to say what everyone else is thinking. You care about your circle, even when affection arrives wrapped in a perfectly timed complaint." },
    mind: { character: "Jerry Seinfeld", actor: "Jerry Seinfeld", label: "The Amused Observer", why: "You step back, notice the tiny contradiction, and find the joke hiding inside it. Your composure makes you a natural sounding board when everyone else's problems get wonderfully strange." },
    spark: { character: "Cosmo Kramer", actor: "Michael Richards", label: "The Human Entrance", why: "You arrive with total commitment, an unusual idea, and enough energy to change the entire room. Conventional caution rarely slows you down when possibility is calling." },
    wildcard: { character: "George Costanza", actor: "Jason Alexander", label: "The Anxious Schemer", why: "You can turn a small concern into a complete strategic campaign. Your mind is inventive, your feelings are immediate, and your stories are never short on unexpected turns." }
  },
  "the-big-bang-theory": {
    heart: { character: "Leonard Hofstadter", actor: "Johnny Galecki", label: "The Patient Peacemaker", why: "You balance intelligence with empathy and work hard to keep very different people connected. Your patience is a real social superpower, even when it is thoroughly tested." },
    mind: { character: "Sheldon Cooper", actor: "Jim Parsons", label: "The Brilliant Original", why: "You trust evidence, love precision, and pursue your interests with extraordinary focus. Your directness is unmistakable, and so is the value of your unique perspective." },
    spark: { character: "Penny", actor: "Kaley Cuoco", label: "The Social Natural", why: "You read people quickly, bring relaxed confidence, and make intimidating rooms feel human. Your practical insight often solves problems that pure theory cannot touch." },
    wildcard: { character: "Howard Wolowitz", actor: "Simon Helberg", label: "The Flashy Inventor", why: "You mix technical talent with bold presentation and a willingness to take the joke farther. Your confidence can be oversized, but so is your capacity to mature and surprise people." }
  },
  "young-sheldon": {
    heart: { character: "Mary Cooper", actor: "Zoe Perry", label: "The Devoted Anchor", why: "You protect the people you love with persistence, faith, and remarkable stamina. Even when you do not understand every choice, you keep trying to create a safe place for everyone." },
    mind: { character: "Sheldon Cooper", actor: "Iain Armitage", label: "The Young Theorist", why: "You are intensely curious, exact, and eager to understand how the universe works. You may challenge the people around you, but your dedication to learning is undeniable." },
    spark: { character: "Georgie Cooper", actor: "Montana Jordan", label: "The Practical Hustler", why: "You spot real-world opportunities and are willing to learn by doing. Your charm and persistence help you build momentum even when the traditional route does not suit you." },
    wildcard: { character: "Missy Cooper", actor: "Raegan Revord", label: "The Sharp-Shooting Sibling", why: "You read emotions faster than many adults and deliver the truth with perfect timing. Your independence and wit ensure you are never lost in somebody else's spotlight." }
  },
  "gilmore-girls": {
    heart: { character: "Sookie St. James", actor: "Melissa McCarthy", label: "The Generous Enthusiast", why: "You pour creativity and affection into the people and projects you love. Your excitement is wonderfully contagious, even when it sends the plan in an unexpected direction." },
    mind: { character: "Rory Gilmore", actor: "Alexis Bledel", label: "The Bookish Observer", why: "You are curious, reflective, and happiest when you can understand the full story. Your quiet focus hides real ambition and a desire to find your place in a complicated world." },
    spark: { character: "Lorelai Gilmore", actor: "Lauren Graham", label: "The Fast-Talking Original", why: "You use wit, warmth, and independence to create a life on your own terms. Your energy makes people feel like even an ordinary conversation could become a favorite memory." },
    wildcard: { character: "Lane Kim", actor: "Keiko Agena", label: "The Secret Rocker", why: "You balance responsibility with a fiercely independent creative life. You adapt cleverly, build your own community, and refuse to let other people's expectations write your whole story." }
  },
  "gossip-girl": {
    heart: { character: "Nate Archibald", actor: "Chace Crawford", label: "The Loyal Diplomat", why: "You prefer sincerity to social games and try to see the person beneath the reputation. Your calm loyalty helps others feel safe enough to be honest." },
    mind: { character: "Blair Waldorf", actor: "Leighton Meester", label: "The Master Strategist", why: "You plan several moves ahead, notice every detail, and care deeply about excellence. Your ambition is strongest when it is paired with the loyalty you reserve for your inner circle." },
    spark: { character: "Serena van der Woodsen", actor: "Blake Lively", label: "The Effortless Magnet", why: "You carry an easy warmth that draws people toward you and makes reinvention feel possible. You follow your feelings boldly, even while learning what kind of life truly fits." },
    wildcard: { character: "Chuck Bass", actor: "Ed Westwick", label: "The Unreadable Power Player", why: "You project confidence, protect your vulnerabilities, and rarely reveal your entire plan. The people who earn your trust discover a far more complicated loyalty underneath." }
  },
  "sex-and-the-city": {
    heart: { character: "Charlotte York", actor: "Kristin Davis", label: "The Hopeful Traditionalist", why: "You believe in commitment, beauty, and giving your dreams a wholehearted chance. Your optimism is resilient because you are willing to keep choosing love after disappointment." },
    mind: { character: "Miranda Hobbes", actor: "Cynthia Nixon", label: "The Clear-Eyed Achiever", why: "You are direct, capable, and unwilling to pretend a problem is simpler than it is. Your practical intelligence is matched by a loyalty that shows up through real action." },
    spark: { character: "Carrie Bradshaw", actor: "Sarah Jessica Parker", label: "The Curious Storyteller", why: "You turn experiences into questions and questions into stories people recognize themselves in. Your style and openness encourage others to examine what they truly want." },
    wildcard: { character: "Samantha Jones", actor: "Kim Cattrall", label: "The Fearless Free Spirit", why: "You know your worth, speak your desires clearly, and refuse to organize your life around other people's judgment. Your confidence is generous because you want your friends to feel powerful too." }
  },
  "the-golden-girls": {
    heart: { character: "Rose Nylund", actor: "Betty White", label: "The Sunny Storyteller", why: "You lead with kindness, trust, and a story for nearly every occasion. Your sweetness is not weakness; it is a resilient choice that helps your friends feel loved." },
    mind: { character: "Dorothy Zbornak", actor: "Bea Arthur", label: "The Grounded Truth-Teller", why: "You are intelligent, skeptical, and able to end nonsense with one perfectly measured look. Your honesty comes with deep responsibility toward the people in your life." },
    spark: { character: "Blanche Devereaux", actor: "Rue McClanahan", label: "The Southern Charmer", why: "You bring glamour, confidence, and vivid storytelling wherever you go. Your flair for romance is matched by a genuine need for friendship and belonging." },
    wildcard: { character: "Sophia Petrillo", actor: "Estelle Getty", label: "The Pocket-Sized Firebrand", why: "You have no interest in softening a good punch line and can read a room instantly. Your bluntness is legendary, but so is the fierce affection behind it." }
  },
  "freaks-and-geeks": {
    heart: { character: "Sam Weir", actor: "John Francis Daley", label: "The Sincere Friend", why: "You are loyal, sensitive, and brave enough to care even when caring feels uncool. Your honesty helps other people lower their guard." },
    mind: { character: "Lindsay Weir", actor: "Linda Cardellini", label: "The Searching Idealist", why: "You question the path laid out for you and want your choices to match your values. Your intelligence drives you to explore, even when you are uncertain where you will land." },
    spark: { character: "Daniel Desario", actor: "James Franco", label: "The Restless Charmer", why: "You draw people in with relaxed confidence and an instinct for escaping stale expectations. Beneath your cool surface is someone still discovering what you are capable of." },
    wildcard: { character: "Kim Kelly", actor: "Busy Philipps", label: "The Fierce Outsider", why: "You meet the world head-on and refuse to be underestimated. Your defenses are strong, but people who earn your trust see how protective and perceptive you really are." }
  },
  "the-fresh-prince-of-bel-air": {
    heart: { character: "Philip Banks", actor: "James Avery", label: "The Principled Protector", why: "You combine high expectations with deep devotion and want the people you love to recognize their own potential. Your authority matters because it is grounded in responsibility." },
    mind: { character: "Carlton Banks", actor: "Alfonso Ribeiro", label: "The Prepared Achiever", why: "You value knowledge, structure, and doing things the proper way. Your confidence may be polished, but your persistence and genuine ambition are what carry you forward." },
    spark: { character: "Will Smith", actor: "Will Smith", label: "The Quick-Witted Charmer", why: "You adapt fast, make connections easily, and use humor to turn an unfamiliar room into your room. Beneath the swagger is real loyalty and emotional courage." },
    wildcard: { character: "Hilary Banks", actor: "Karyn Parsons", label: "The Fabulous Wildcard", why: "You move through life with style, certainty, and an impressive ability to make any topic about your latest idea. Your unconventional instincts can lead to surprisingly perfect opportunities." }
  },
  "boy-meets-world": {
    heart: { character: "Cory Matthews", actor: "Ben Savage", label: "The Loyal Learner", why: "You care deeply about doing right by the people who grow alongside you. You may learn through mistakes, but you keep returning with honesty, humor, and an open heart." },
    mind: { character: "Topanga Lawrence", actor: "Danielle Fishel", label: "The Centered Achiever", why: "You know your values, think independently, and bring focus to difficult decisions. Your confidence grows from trusting both your intelligence and your instincts." },
    spark: { character: "Shawn Hunter", actor: "Rider Strong", label: "The Soulful Rebel", why: "You have natural charisma, a restless spirit, and a gift for seeing beyond appearances. Your independence matters, but so does the chosen family you protect fiercely." },
    wildcard: { character: "Eric Matthews", actor: "Will Friedle", label: "The Beautifully Unpredictable", why: "You follow your own logic and turn simple moments into unforgettable comedy. Underneath the surprises is a generous person who often understands more than anyone expects." }
  },
  "that-70s-show": {
    heart: { character: "Donna Pinciotti", actor: "Laura Prepon", label: "The Grounded Independent", why: "You are loyal, capable, and comfortable challenging people you care about. Your strength comes from knowing you can love your circle without giving up your own direction." },
    mind: { character: "Eric Forman", actor: "Topher Grace", label: "The Wry Observer", why: "You notice the absurdity around you and use quick humor to navigate it. You may hesitate before a big leap, but your thoughtfulness makes your commitments meaningful." },
    spark: { character: "Jackie Burkhart", actor: "Mila Kunis", label: "The Confident Tastemaker", why: "You know what you like, say it plainly, and bring undeniable energy to your social world. Over time, your bold self-belief can become genuine strength and loyalty." },
    wildcard: { character: "Michael Kelso", actor: "Ashton Kutcher", label: "The Lovable Loose Cannon", why: "You chase fun with total confidence and rarely let a complicated plan slow you down. Your impulsiveness creates chaos, but your sunny affection makes it difficult to stay annoyed." }
  },
  "malcolm-in-the-middle": {
    heart: { character: "Lois", actor: "Jane Kaczmarek", label: "The Fierce Family Engine", why: "You love through action, persistence, and a refusal to let the people in your care give up on themselves. Your intensity may be legendary, but it is powered by commitment." },
    mind: { character: "Malcolm", actor: "Frankie Muniz", label: "The Restless Brain", why: "You see patterns quickly and are constantly calculating how you fit into the world around you. Your intelligence can complicate life, but it also gives you the tools to imagine more." },
    spark: { character: "Reese", actor: "Justin Berfield", label: "The Fearless Instigator", why: "You act decisively, embrace competition, and can turn boredom into an event within seconds. Your energy needs direction, but once it finds one, you commit completely." },
    wildcard: { character: "Dewey", actor: "Erik Per Sullivan", label: "The Secret Original", why: "You observe quietly, follow an unusual creative instinct, and surprise everyone who underestimates you. Your inner world is far richer and stranger than it first appears." }
  },
  "everybody-loves-raymond": {
    heart: { character: "Robert Barone", actor: "Brad Garrett", label: "The Tender Loyalist", why: "You may carry your worries visibly, but you also care deeply and show up when family needs you. Your sensitivity gives you an empathy that people sometimes overlook." },
    mind: { character: "Debra Barone", actor: "Patricia Heaton", label: "The Capable Realist", why: "You see the entire situation clearly and have the practical sense to keep a busy household moving. Your patience has limits, but your devotion does not." },
    spark: { character: "Ray Barone", actor: "Ray Romano", label: "The Everyday Entertainer", why: "You find humor in ordinary frustrations and can make familiar stories feel instantly relatable. Your easygoing charm works best when you pair it with the courage to be honest." },
    wildcard: { character: "Marie Barone", actor: "Doris Roberts", label: "The Supreme Meddler", why: "You have opinions, impeccable timing, and a remarkable ability to become part of any decision. Your involvement can be overwhelming, but it is inseparable from how intensely you love." }
  },
  "frasier": {
    heart: { character: "Martin Crane", actor: "John Mahoney", label: "The No-Nonsense Anchor", why: "You offer grounded wisdom, steady loyalty, and affection that rarely needs fancy language. Your practical view helps the people around you remember what truly matters." },
    mind: { character: "Niles Crane", actor: "David Hyde Pierce", label: "The Refined Analyst", why: "You notice every nuance, prepare meticulously, and have highly developed standards. Your intellect is formidable, but your deepest choices are often guided by a very earnest heart." },
    spark: { character: "Frasier Crane", actor: "Kelsey Grammer", label: "The Grand Conversationalist", why: "You love ideas, meaningful conversation, and the chance to help someone understand themselves. Your flair can be dramatic, but it comes with sincere curiosity and generosity." },
    wildcard: { character: "Roz Doyle", actor: "Peri Gilpin", label: "The Candid Maverick", why: "You are socially fearless, quick with a comeback, and refreshingly comfortable being yourself. Your independence and emotional intelligence make you an indispensable friend." }
  },
  "cheers": {
    heart: { character: "Norm Peterson", actor: "George Wendt", label: "The Beloved Regular", why: "You create belonging simply by showing up with warmth, wit, and familiar reliability. People relax around you because you make friendship feel easy and unforced." },
    mind: { character: "Diane Chambers", actor: "Shelley Long", label: "The Literary Idealist", why: "You search for the deeper meaning, choose your words carefully, and want life to meet your highest ideals. Your curiosity makes even everyday conversations feel intellectually alive." },
    spark: { character: "Sam Malone", actor: "Ted Danson", label: "The Effortless Host", why: "You read people well, bring easy confidence, and know how to make a room feel welcoming. Your charm has real staying power when it is paired with your loyalty to the community around you." },
    wildcard: { character: "Carla Tortelli", actor: "Rhea Perlman", label: "The Tiny Tornado", why: "You are quick, fearless, and always ready with the line nobody else would dare say. Your sharp edges protect a deeply loyal connection to your chosen family." }
  },
  "scrubs": {
    heart: { character: "J.D.", actor: "Zach Braff", label: "The Tender Daydreamer", why: "You process life through imagination, emotion, and a sincere desire to connect. You learn by caring deeply, and your openness encourages others to admit what they feel too." },
    mind: { character: "Carla Espinosa", actor: "Judy Reyes", label: "The Wise Reality Check", why: "You read people accurately and know when they need comfort, honesty, or both. Your practical intelligence keeps the team human when pressure threatens to take over." },
    spark: { character: "Christopher Turk", actor: "Donald Faison", label: "The Confident Best Friend", why: "You combine skill, playfulness, and the kind of energy that makes teamwork fun. You show affection freely and bring swagger without forgetting the people beside you." },
    wildcard: { character: "Perry Cox", actor: "John C. McGinley", label: "The Ranting Mentor", why: "You hold people to demanding standards and deliver truth with unmistakable force. Beneath the sarcasm is a serious commitment to competence and to the people worth teaching." }
  },
  "psych": {
    heart: { character: "Burton Guster", actor: "Dulé Hill", label: "The Loyal Co-Pilot", why: "You bring knowledge, caution, and unwavering friendship to every strange adventure. You may question the plan loudly, but you still show up with snacks and your whole heart." },
    mind: { character: "Juliet O'Hara", actor: "Maggie Lawson", label: "The Empathetic Investigator", why: "You combine careful observation with an ability to understand what people are feeling. Your competence never requires you to give up kindness." },
    spark: { character: "Shawn Spencer", actor: "James Roday Rodriguez", label: "The Brilliant Improviser", why: "You spot tiny details, make bold leaps, and turn problem-solving into a performance. Your playful style works because a genuinely sharp mind is steering it." },
    wildcard: { character: "Carlton Lassiter", actor: "Timothy Omundson", label: "The Intense Traditionalist", why: "You believe in discipline, directness, and doing the job properly. Your seriousness can be spectacular, but the people close to you know how much loyalty sits behind it." }
  },
  "monk": {
    heart: { character: "Natalie Teeger", actor: "Traylor Howard", label: "The Patient Champion", why: "You offer practical care without treating anyone like they are incapable. Your encouragement is steady, honest, and strong enough to help people face what frightens them." },
    mind: { character: "Adrian Monk", actor: "Tony Shalhoub", label: "The Extraordinary Observer", why: "You notice what everyone else passes over and feel compelled to make the pieces fit. Your precision is inseparable from a deep sensitivity to disorder, loss, and truth." },
    spark: { character: "Sharona Fleming", actor: "Bitty Schram", label: "The Fearless Advocate", why: "You bring directness, energy, and a refusal to let fear make every decision. Your tough encouragement helps people move when they would otherwise stay stuck." },
    wildcard: { character: "Randy Disher", actor: "Jason Gray-Stanford", label: "The Left-Field Detective", why: "You leap toward unusual theories with complete conviction and bring a creative angle nobody else considered. Your instincts may take the scenic route, but your optimism keeps the team moving." }
  },
  "only-murders-in-the-building": {
    heart: { character: "Charles-Haden Savage", actor: "Steve Martin", label: "The Gentle Traditionalist", why: "You may begin cautiously, but your loyalty deepens into something steady and sincere. Your dry humor and attention to detail make people feel safe once you let them in." },
    mind: { character: "Mabel Mora", actor: "Selena Gomez", label: "The Cool-Eyed Investigator", why: "You observe quietly, question easy answers, and protect more emotion than you reveal. Your calm independence lets you follow the truth even when it becomes uncomfortable." },
    spark: { character: "Oliver Putnam", actor: "Martin Short", label: "The Born Director", why: "You see every moment as a possible production and bring unstoppable momentum to the group. Your grand style works because you truly believe people can create something special together." },
    wildcard: { character: "Howard Morris", actor: "Michael Cyril Creighton", label: "The Scene-Stealing Neighbor", why: "You are observant, specific, and delightfully ready to become part of the action. Your quirks are not decoration; they are exactly what make your contributions memorable." }
  },
  "stranger-things": {
    heart: { character: "Mike Wheeler", actor: "Finn Wolfhard", label: "The Loyal Believer", why: "You take friendship seriously and refuse to abandon people when things become frightening or strange. Your faith in your circle helps everyone act braver." },
    mind: { character: "Dustin Henderson", actor: "Gaten Matarazzo", label: "The Curious Problem-Solver", why: "You meet mysteries with scientific curiosity, quick explanations, and irrepressible enthusiasm. Your intelligence works best because you are eager to share it with the team." },
    spark: { character: "Eleven", actor: "Millie Bobby Brown", label: "The Quiet Force", why: "You have tremendous inner strength and a powerful instinct to protect the people who give you belonging. You speak with actions, and your courage changes everyone around you." },
    wildcard: { character: "Steve Harrington", actor: "Joe Keery", label: "The Unexpected Hero", why: "You can surprise people by growing far beyond their first impression of you. Your confidence becomes something better when it turns into humor, bravery, and dependable care." }
  },
  "wednesday": {
    heart: { character: "Enid Sinclair", actor: "Emma Myers", label: "The Colorful Loyalist", why: "You lead with warmth, emotional courage, and a willingness to celebrate what makes people different. Your brightness has real strength behind it when a friend needs you." },
    mind: { character: "Wednesday Addams", actor: "Jenna Ortega", label: "The Unflinching Sleuth", why: "You are independent, observant, and willing to investigate what everyone else avoids. Your dry honesty protects a deeper loyalty that you reveal on your own terms." },
    spark: { character: "Bianca Barclay", actor: "Joy Sunday", label: "The Magnetic Competitor", why: "You carry confidence naturally and are not afraid of an equal challenge. Beneath your polished presence is someone determined to be valued for who you truly are." },
    wildcard: { character: "Thing", actor: "Victor Dorobantu", label: "The Handy Accomplice", why: "You communicate with flair, appear exactly where needed, and prove that personality never depends on saying a word. Your resourcefulness makes you an unforgettable ally." }
  },
  "avatar-the-last-airbender": {
    heart: { character: "Katara", actor: "Mae Whitman", label: "The Compassionate Protector", why: "You nurture hope, stand up to injustice, and refuse to stop caring when things become difficult. Your empathy is powerful because it arrives with action." },
    mind: { character: "Sokka", actor: "Jack De Sena", label: "The Inventive Strategist", why: "You use observation, planning, and humor to contribute even when others have flashier abilities. Your best ideas come from staying curious and being willing to adjust." },
    spark: { character: "Aang", actor: "Zach Tyler Eisen", label: "The Joyful Peacemaker", why: "You bring playfulness to serious responsibilities and look for solutions that honor your values. Your lightness is not avoidance; it is part of the hope you give people." },
    wildcard: { character: "Toph Beifong", actor: "Jessie Flower", label: "The Unstoppable Original", why: "You trust your own abilities, reject limiting assumptions, and speak with fearless directness. Your independence is formidable, but your loyalty makes it even stronger." }
  },
  "gravity-falls": {
    heart: { character: "Mabel Pines", actor: "Kristen Schaal", label: "The Glitter-Powered Heart", why: "You love enthusiastically, create joy on purpose, and treat self-expression like a superpower. Your optimism helps people remember that wonder is worth protecting." },
    mind: { character: "Dipper Pines", actor: "Jason Ritter", label: "The Mystery Mapper", why: "You are curious, persistent, and determined to understand what hides beneath the obvious answer. Your preparation gives you courage when the mystery becomes personal." },
    spark: { character: "Wendy Corduroy", actor: "Linda Cardellini", label: "The Cool Adventurer", why: "You stay calm, adapt quickly, and bring an easy confidence to unusual situations. People trust you because your relaxed style is backed by genuine bravery." },
    wildcard: { character: "Grunkle Stan", actor: "Alex Hirsch", label: "The Lovable Schemer", why: "You are resourceful, theatrical, and always ready to turn a strange opportunity into a business model. Beneath the hustle is a family loyalty powerful enough to reshape every plan." }
  },
  "bobs-burgers": {
    heart: { character: "Linda Belcher", actor: "John Roberts", label: "The All-In Mom", why: "You celebrate loudly, love completely, and can turn a family crisis into a song before dinner. Your enthusiasm tells people they never have to earn a place in your corner." },
    mind: { character: "Bob Belcher", actor: "H. Jon Benjamin", label: "The Grounded Craftsman", why: "You care about doing honest work well and approach chaos with dry patience. You may sound tired, but your steady devotion keeps the whole family anchored." },
    spark: { character: "Tina Belcher", actor: "Dan Mintz", label: "The Awkward Visionary", why: "You are sincere about what you want and brave enough to keep imagining it in vivid detail. Your unique confidence grows precisely because you do not hide your wonderfully specific inner world." },
    wildcard: { character: "Louise Belcher", actor: "Kristen Schaal", label: "The Bunny-Eared Mastermind", why: "You think fast, challenge limits, and can turn any quiet afternoon into an elaborate operation. Your mischief protects a very real, very loyal heart." }
  },
  "futurama": {
    heart: { character: "Philip J. Fry", actor: "Billy West", label: "The Hopeful Everyman", why: "You meet a bewildering world with openness, loyalty, and the courage to try again. Your simplicity often cuts through complications and reminds people what matters emotionally." },
    mind: { character: "Turanga Leela", actor: "Katey Sagal", label: "The Capable Captain", why: "You are decisive, principled, and prepared to take responsibility when everyone else loses focus. Your strength includes knowing when compassion is the smartest course." },
    spark: { character: "Amy Wong", actor: "Lauren Tom", label: "The Brilliant Socialite", why: "You combine technical intelligence with bright, easygoing energy. Your adaptability lets you move between serious problem-solving and joyful fun without losing yourself." },
    wildcard: { character: "Bender", actor: "John DiMaggio", label: "The Rule-Bending Robot", why: "You are bold, shameless, and committed to doing things your own highly questionable way. Your bravado is enormous, but your rare moments of loyalty reveal why the crew keeps you close." }
  },
  "rick-and-morty": {
    heart: { character: "Morty Smith", actor: "Harry Belden", label: "The Anxious Conscience", why: "You feel the moral weight of choices even when everyone else wants to move on. Your uncertainty is not weakness; it reflects how seriously you take other people's lives." },
    mind: { character: "Rick Sanchez", actor: "Ian Cardoni", label: "The Impossible Genius", why: "You question every assumption, solve problems at astonishing speed, and resist anyone trying to define your limits. Your greatest challenge is letting connection matter as much as being right." },
    spark: { character: "Summer Smith", actor: "Spencer Grammer", label: "The Fearless Adapter", why: "You learn quickly, demand a real role in the adventure, and bring social nerve to impossible situations. Your confidence grows each time you prove you can handle more than expected." },
    wildcard: { character: "Beth Smith", actor: "Sarah Chalke", label: "The Restless Realist", why: "You are fiercely capable, independent, and unwilling to settle for easy answers about who you are. Your adventurous side emerges when ordinary life starts to feel too small." }
  },
  "bojack-horseman": {
    heart: { character: "Todd Chavez", actor: "Aaron Paul", label: "The Openhearted Inventor", why: "You welcome unlikely possibilities and tend to accept people before they have accepted themselves. Your ideas may wander, but your kindness gives them a surprisingly sturdy center." },
    mind: { character: "Diane Nguyen", actor: "Alison Brie", label: "The Searching Writer", why: "You examine your choices honestly and want your work to say something true about the world. Your insight can be heavy to carry, but it also drives real empathy and growth." },
    spark: { character: "Princess Carolyn", actor: "Amy Sedaris", label: "The Tireless Producer", why: "You are resourceful, ambitious, and astonishingly good at keeping ten spinning problems in motion. Your drive is matched by a deep desire to build a life that feels whole." },
    wildcard: { character: "BoJack Horseman", actor: "Will Arnett", label: "The Complicated Headliner", why: "You are perceptive, funny, and more vulnerable than your defenses suggest. You long to be understood, and your path forward begins when insight becomes honest action." }
  },
  "spongebob-squarepants": {
    heart: { character: "SpongeBob SquarePants", actor: "Tom Kenny", label: "The Relentless Optimist", why: "You find sincere joy in work, friendship, and the smallest adventures. Your enthusiasm is powerful enough to brighten a room even when other people insist on being grumpy." },
    mind: { character: "Squidward Tentacles", actor: "Rodger Bumpass", label: "The Artistic Analyst", why: "You have cultivated tastes, strong boundaries, and a mind that notices every irritating detail. Your dry commentary gives the chaos around you its perfect counterpoint." },
    spark: { character: "Sandy Cheeks", actor: "Carolyn Lawrence", label: "The Fearless Scientist", why: "You are inventive, ambitious, and always ready to test yourself in a new environment. Your confidence and love of discovery push everyone toward the next big challenge." },
    wildcard: { character: "Patrick Star", actor: "Bill Fagerbakke", label: "The Carefree Original", why: "You follow joy, value friendship, and bring an unpredictable simplicity to complicated moments. Your unusual perspective can be exactly what breaks everyone out of overthinking." }
  },
  "adventure-time": {
    heart: { character: "Finn the Human", actor: "Jeremy Shada", label: "The Growing Hero", why: "You want to help, act courageously, and become wiser through every adventure. Your strength comes from staying emotionally open as your understanding of the world grows." },
    mind: { character: "Princess Bubblegum", actor: "Hynden Walch", label: "The Candy Scientist", why: "You plan carefully, love solving complex problems, and feel responsible for the world you have built. Your intellect is strongest when balanced with trust and humility." },
    spark: { character: "Jake the Dog", actor: "John DiMaggio", label: "The Laid-Back Shapeshifter", why: "You bring flexible thinking, playful confidence, and reassuring wisdom to every quest. Your ability to stay loose helps everyone else find a way forward." },
    wildcard: { character: "Marceline", actor: "Olivia Olson", label: "The Midnight Creative", why: "You are creative, independent, and willing to turn complicated feelings into something powerful. Your cool exterior protects a deep capacity for memory, growth, and love." }
  },
  "phineas-and-ferb": {
    heart: { character: "Candace Flynn", actor: "Ashley Tisdale", label: "The Determined Big Sister", why: "You care intensely, commit fully, and refuse to let important details go unnoticed. Your urgency comes from wanting your world to make sense and your efforts to be seen." },
    mind: { character: "Ferb Fletcher", actor: "Thomas Brodie-Sangster", label: "The Quiet Engineer", why: "You listen closely, build brilliantly, and let excellent work speak for itself. Your calm focus makes ambitious ideas feel surprisingly achievable." },
    spark: { character: "Phineas Flynn", actor: "Vincent Martella", label: "The Summer Visionary", why: "You greet possibility with confidence and see no reason a huge idea cannot begin today. Your inventive optimism draws everyone into creating something memorable." },
    wildcard: { character: "Perry the Platypus", actor: "Dee Bradley Baker", label: "The Secret Professional", why: "You may seem relaxed, but you are always ready to reveal a remarkably capable hidden side. Your cool competence lets you handle the wildest mission without needing applause." }
  },
  "the-bear": {
    heart: { character: "Sydney Adamu", actor: "Ayo Edebiri", label: "The Ambitious Builder", why: "You care about excellence, collaboration, and turning potential into something real. Your standards are high because the work matters to you, and so do the people doing it." },
    mind: { character: "Carmen Berzatto", actor: "Jeremy Allen White", label: "The Driven Perfectionist", why: "You notice every detail and push yourself to transform skill into something meaningful. Your intensity is powerful, especially when you let trust share the weight." },
    spark: { character: "Richie Jerimovich", actor: "Ebon Moss-Bachrach", label: "The Reborn Showman", why: "You bring volume, instinct, and a surprising talent for making people feel personally welcomed. Once you find purpose, your restless energy becomes real leadership." },
    wildcard: { character: "Tina Marrero", actor: "Liza Colón-Zayas", label: "The Tough Transformer", why: "You protect your pride, learn through doing, and become fiercely committed when someone recognizes your potential. Your growth has grit because you earn it one shift at a time." }
  },
  "succession": {
    heart: { character: "Kendall Roy", actor: "Jeremy Strong", label: "The Wounded Striver", why: "You feel things deeply and keep reaching for a version of yourself that can finally get it right. Your ambition is strongest when it connects with honesty instead of approval." },
    mind: { character: "Siobhan Roy", actor: "Sarah Snook", label: "The Cool Strategist", why: "You read power dynamics quickly, protect your independence, and rarely enter a room without analyzing it. Your challenge is trusting your own values as much as your tactical instincts." },
    spark: { character: "Roman Roy", actor: "Kieran Culkin", label: "The Volatile Charmer", why: "You use quick humor and bold energy to keep everyone slightly off balance. Behind your fearless performance is a perceptive person who notices much more than you admit." },
    wildcard: { character: "Tom Wambsgans", actor: "Matthew Macfadyen", label: "The Polished Survivor", why: "You understand that social ladders have rules and adapt with remarkable determination. Your mix of ambition, awkwardness, and careful reading of people makes your next move difficult to predict." }
  },
  "the-white-lotus": {
    heart: { character: "Belinda Lindsey", actor: "Natasha Rothwell", label: "The Compassionate Healer", why: "You listen carefully, offer genuine care, and help people imagine a more peaceful version of themselves. Your generosity deserves the same respect and protection you give everyone else." },
    mind: { character: "Harper Spiller", actor: "Aubrey Plaza", label: "The Watchful Skeptic", why: "You notice contradictions, question polished appearances, and prefer uncomfortable truth to easy performance. Your intelligence keeps you alert, even when relaxing would be simpler." },
    spark: { character: "Tanya McQuoid", actor: "Jennifer Coolidge", label: "The Operatic Wanderer", why: "You experience emotion at full volume and bring unforgettable energy to every setting. Your search for connection is messy, sincere, and entirely your own." },
    wildcard: { character: "Armond", actor: "Murray Bartlett", label: "The Spiraling Showman", why: "You can manage demanding personalities with polished skill until your rebellious side insists on entering the conversation. Your charisma turns even a loss of control into something nobody can ignore." }
  },
  "bridgerton": {
    heart: { character: "Penelope Featherington", actor: "Nicola Coughlan", label: "The Observant Romantic", why: "You notice what others overlook and carry a rich inner world beneath a quiet exterior. Your deepest growth comes from letting your own voice be known as clearly as your love." },
    mind: { character: "Lady Danbury", actor: "Adjoa Andoh", label: "The Society Strategist", why: "You understand people, timing, and the influence of a perfectly chosen word. Your guidance is formidable because you pair clear judgment with genuine investment in others." },
    spark: { character: "Daphne Bridgerton", actor: "Phoebe Dynevor", label: "The Graceful Trailblazer", why: "You move through expectations with poise while learning to speak honestly about what you want. Your strength appears in the balance between tradition and choosing your own path." },
    wildcard: { character: "Eloise Bridgerton", actor: "Claudia Jessie", label: "The Restless Questioner", why: "You challenge assumptions, value intellectual freedom, and are never satisfied with an answer merely because it is customary. Your curiosity pushes every room toward a wider possibility." }
  },
  "greys-anatomy": {
    heart: { character: "George O'Malley", actor: "T. R. Knight", label: "The Gentle Protector", why: "You care deeply, work earnestly, and retain your compassion in highly competitive spaces. Your courage is clearest when someone else needs you to step forward." },
    mind: { character: "Miranda Bailey", actor: "Chandra Wilson", label: "The Formidable Teacher", why: "You expect competence, communicate clearly, and bring order to even the most demanding room. Your authority has heart because you use it to help others become stronger." },
    spark: { character: "Cristina Yang", actor: "Sandra Oh", label: "The Surgical Force", why: "You are fiercely focused, intellectually fearless, and unwilling to apologize for wanting excellence. Your ambition energizes everyone who is ready to rise to your level." },
    wildcard: { character: "Meredith Grey", actor: "Ellen Pompeo", label: "The Resilient Center", why: "You move through uncertainty with dark humor, adaptability, and a growing trust in your own voice. Your resilience helps you create family and meaning even after difficult beginnings." }
  },
  "lost": {
    heart: { character: "Hugo 'Hurley' Reyes", actor: "Jorge Garcia", label: "The Island's Heart", why: "You bring kindness, humor, and a sense of community to stressful situations. People trust you because your compassion stays visible even when fear takes over." },
    mind: { character: "Jack Shephard", actor: "Matthew Fox", label: "The Driven Fixer", why: "You take responsibility quickly and feel compelled to solve the problem in front of you. Your leadership is strongest when you remember that not everything important can be controlled." },
    spark: { character: "Kate Austen", actor: "Evangeline Lilly", label: "The Resourceful Runner", why: "You think on your feet, protect your freedom, and adapt when the map disappears. Your instincts are sharp, especially when they are serving someone you care about." },
    wildcard: { character: "James 'Sawyer' Ford", actor: "Josh Holloway", label: "The Sharp-Tongued Survivor", why: "You use wit, nerve, and a carefully guarded persona to navigate uncertain territory. The people who look past the nicknames discover a fiercely loyal heart." }
  },
  "the-walking-dead": {
    heart: { character: "Glenn Rhee", actor: "Steven Yeun", label: "The Courageous Optimist", why: "You protect hope without ignoring danger and remember that survival should still include humanity. Your bravery grows from love, loyalty, and belief in a future worth reaching." },
    mind: { character: "Michonne", actor: "Danai Gurira", label: "The Watchful Warrior", why: "You observe carefully, act decisively, and offer trust only when it has been earned. Your formidable independence is matched by a deep capacity to protect and belong." },
    spark: { character: "Rick Grimes", actor: "Andrew Lincoln", label: "The Relentless Leader", why: "You step forward under pressure and carry responsibility even when no option feels easy. Your determination can move an entire group, especially when it remains connected to compassion." },
    wildcard: { character: "Daryl Dixon", actor: "Norman Reedus", label: "The Lone-Wolf Loyalist", why: "You rely on instinct, practical skill, and a strong independent streak. Once someone becomes part of your chosen family, your loyalty is quiet and nearly unbreakable." }
  },
  "game-of-thrones": {
    heart: { character: "Samwell Tarly", actor: "John Bradley", label: "The Brave Scholar", why: "You lead with empathy, curiosity, and a kind of courage that grows each time it is needed. Your knowledge becomes powerful because you use it to protect people, not impress them." },
    mind: { character: "Tyrion Lannister", actor: "Peter Dinklage", label: "The Witty Strategist", why: "You survive by observing carefully, speaking memorably, and understanding what motivates people. Your intelligence shines brightest when it serves fairness and human connection." },
    spark: { character: "Daenerys Targaryen", actor: "Emilia Clarke", label: "The Visionary Force", why: "You inspire people with conviction, carry a powerful sense of purpose, and refuse to accept the world exactly as it is. Your fire is most powerful when guided by empathy." },
    wildcard: { character: "Arya Stark", actor: "Maisie Williams", label: "The Unstoppable Outsider", why: "You reject narrow roles, learn quickly, and keep moving through circumstances that would stop most people. Your independence never erases the fierce loyalty at your core." }
  },
  "breaking-bad": {
    heart: { character: "Jesse Pinkman", actor: "Aaron Paul", label: "The Bruised Conscience", why: "You feel empathy deeply and cannot fully silence your sense of right and wrong. Your sensitivity is a strength that keeps calling you toward a more honest version of yourself." },
    mind: { character: "Walter White", actor: "Bryan Cranston", label: "The Calculating Chemist", why: "You are patient, technically brilliant, and capable of turning limited materials into an intricate plan. Your greatest test is knowing when intelligence is serving your values and when it is serving your pride." },
    spark: { character: "Hank Schrader", actor: "Dean Norris", label: "The Headlong Hero", why: "You charge toward challenges with blunt confidence and an instinct to take action. Your larger-than-life energy protects a serious dedication to the people and work you value." },
    wildcard: { character: "Saul Goodman", actor: "Bob Odenkirk", label: "The Fast-Talking Fixer", why: "You read an audience, improvise under pressure, and can turn a dead end into three questionable exits. Your charisma and adaptability make your next move nearly impossible to predict." }
  },
  "better-call-saul": {
    heart: { character: "Kim Wexler", actor: "Rhea Seehorn", label: "The Principled Powerhouse", why: "You are disciplined, self-reliant, and capable of showing extraordinary care without making a display of it. Your sharpest conflict appears when loyalty and your own moral compass pull apart." },
    mind: { character: "Mike Ehrmantraut", actor: "Jonathan Banks", label: "The Methodical Fixer", why: "You assess risk, plan carefully, and prefer competence to noise. Your restraint hides deep loyalty and a personal code that shapes every decision." },
    spark: { character: "Jimmy McGill", actor: "Bob Odenkirk", label: "The Relentless Showman", why: "You improvise brilliantly, connect with almost anyone, and refuse to let a closed door end the conversation. Your gifts are strongest when your ingenuity and conscience move in the same direction." },
    wildcard: { character: "Nacho Varga", actor: "Michael Mando", label: "The Controlled Survivor", why: "You stay alert, think several steps ahead, and keep your true concerns protected. Your composure comes from determination, especially when the people you love are at stake." }
  },
  "the-marvelous-mrs-maisel": {
    "heart": {
      "character": "Susie Myerson",
      "actor": "Alex Borstein",
      "label": "The Fierce Believer",
      "why": "You show care by fighting hard for people whose talent you believe in. Your loyalty is blunt, practical, and stronger than any setback."
    },
    "mind": {
      "character": "Abe Weissman",
      "actor": "Tony Shalhoub",
      "label": "The Exacting Thinker",
      "why": "You want ideas to make sense and standards to stay high. Even when life turns strange, you study the problem until you find your footing."
    },
    "spark": {
      "character": "Miriam 'Midge' Maisel",
      "actor": "Rachel Brosnahan",
      "label": "The Spotlight Natural",
      "why": "You turn sharp observations into energy that fills a room. You are bold enough to rebuild your life in front of an audience."
    },
    "wildcard": {
      "character": "Joel Maisel",
      "actor": "Michael Zegen",
      "label": "The Restless Reinventor",
      "why": "You learn through detours and refuse to let one failed plan define you. Your next move may surprise everyone, including you."
    }
  },
  "black-ish": {
    "heart": {
      "character": "Rainbow Johnson",
      "actor": "Tracee Ellis Ross",
      "label": "The Warm High-Achiever",
      "why": "You bring skill, patience, and humor to the people counting on you. You make room for both big goals and honest feelings."
    },
    "mind": {
      "character": "Andre 'Dre' Johnson",
      "actor": "Anthony Anderson",
      "label": "The Meaning Maker",
      "why": "You think hard about what everyday choices say about identity and family. You can turn one small issue into a full lesson because it matters to you."
    },
    "spark": {
      "character": "Zoey Johnson",
      "actor": "Yara Shahidi",
      "label": "The Effortless Trendsetter",
      "why": "You read the room, trust your style, and step toward new experiences with confidence. Your calm presence makes independence look natural."
    },
    "wildcard": {
      "character": "Diane Johnson",
      "actor": "Marsai Martin",
      "label": "The Tiny Powerhouse",
      "why": "You are fearless, extremely observant, and always ready with a surprising plan. Being underestimated only gives you an advantage."
    }
  },
  "full-house": {
    "heart": {
      "character": "Danny Tanner",
      "actor": "Bob Saget",
      "label": "The Devoted Organizer",
      "why": "You take care of people through steady attention and a home that feels safe. Your plans may be detailed, but the love behind them is simple."
    },
    "mind": {
      "character": "Rebecca Donaldson-Katsopolis",
      "actor": "Lori Loughlin",
      "label": "The Grounded Guide",
      "why": "You stay calm, see several sides, and give advice people can actually use. You balance a busy life without losing your sense of self."
    },
    "spark": {
      "character": "Jesse Katsopolis",
      "actor": "John Stamos",
      "label": "The Rock-and-Roll Charmer",
      "why": "You bring confidence, creativity, and a little showmanship to ordinary days. Beneath the cool style, you care deeply about your family."
    },
    "wildcard": {
      "character": "Joey Gladstone",
      "actor": "Dave Coulier",
      "label": "The Playful Impressionist",
      "why": "You can turn any tense moment into a silly voice or unexpected bit. Your humor works because you genuinely want people to feel better."
    }
  },
  "family-matters": {
    "heart": {
      "character": "Harriette Winslow",
      "actor": "Jo Marie Payton",
      "label": "The Family Foundation",
      "why": "You combine warmth with clear expectations and make people feel protected. When chaos arrives, you remember what the family truly needs."
    },
    "mind": {
      "character": "Carl Winslow",
      "actor": "Reginald VelJohnson",
      "label": "The Responsible Protector",
      "why": "You believe in rules, responsibility, and doing the job correctly. Your frustration never hides how deeply you care about your people."
    },
    "spark": {
      "character": "Laura Winslow",
      "actor": "Kellie Shanygne Williams",
      "label": "The Confident Realist",
      "why": "You know your mind and refuse to let someone else choose your path. Your independence and honesty keep even the wildest situation grounded."
    },
    "wildcard": {
      "character": "Steve Urkel",
      "actor": "Jaleel White",
      "label": "The Unstoppable Inventor",
      "why": "You follow your curiosity at full speed, even when the experiment shakes the house. Your strange ideas come with a loyal and hopeful heart."
    }
  },
  "saved-by-the-bell": {
    "heart": {
      "character": "Kelly Kapowski",
      "actor": "Tiffani Thiessen",
      "label": "The Kind Team Captain",
      "why": "You make people feel included and bring a steady kindness to busy social spaces. Your popularity never matters more than treating friends well."
    },
    "mind": {
      "character": "Jessie Spano",
      "actor": "Elizabeth Berkley",
      "label": "The Driven Advocate",
      "why": "You prepare carefully, speak up for what is fair, and expect your effort to count. Your determination can turn a school problem into a cause."
    },
    "spark": {
      "character": "Zack Morris",
      "actor": "Mark-Paul Gosselaar",
      "label": "The Hallway Schemer",
      "why": "You see a shortcut, sell the idea, and pull everyone into the adventure. Your charm works best when you finally take responsibility for the plan."
    },
    "wildcard": {
      "character": "Samuel 'Screech' Powers",
      "actor": "Dustin Diamond",
      "label": "The Loyal Oddball",
      "why": "You bring unusual knowledge and total commitment to every friendship. Your methods are unpredictable, but your support is sincere."
    }
  },
  "the-nanny": {
    "heart": {
      "character": "Niles",
      "actor": "Daniel Davis",
      "label": "The Loyal Observer",
      "why": "You notice what everyone needs and quietly keep the household running. Your dry comments never cancel out your deep loyalty."
    },
    "mind": {
      "character": "Maxwell Sheffield",
      "actor": "Charles Shaughnessy",
      "label": "The Proper Producer",
      "why": "You value order, responsibility, and a well-planned production. Life keeps challenging your rules, and you slowly learn to listen to your heart."
    },
    "spark": {
      "character": "Fran Fine",
      "actor": "Fran Drescher",
      "label": "The Fabulous Fixer",
      "why": "You solve problems with warmth, bold style, and fearless honesty. You may ignore the formal plan, but you understand people better than any rulebook."
    },
    "wildcard": {
      "character": "C.C. Babcock",
      "actor": "Lauren Lane",
      "label": "The Sharp-Tongued Operator",
      "why": "You enter with a goal, a polished look, and a comeback ready. Competition gives you energy, especially when the room underestimates you."
    }
  },
  "home-improvement": {
    "heart": {
      "character": "Jill Taylor",
      "actor": "Patricia Richardson",
      "label": "The Patient Center",
      "why": "You listen, challenge people to grow, and keep a noisy household connected. Your support includes honesty, even when it is not what someone hoped to hear."
    },
    "mind": {
      "character": "Al Borland",
      "actor": "Richard Karn",
      "label": "The Careful Craftsman",
      "why": "You measure twice, know the facts, and prefer a job done safely. Your steady competence is the perfect balance to someone else's giant idea."
    },
    "spark": {
      "character": "Tim Taylor",
      "actor": "Tim Allen",
      "label": "The More-Power Showman",
      "why": "You believe every tool and every entrance could use extra energy. Your experiments may backfire, but your enthusiasm keeps everyone watching."
    },
    "wildcard": {
      "character": "Wilson Wilson Jr.",
      "actor": "Earl Hindman",
      "label": "The Fence-Line Philosopher",
      "why": "You offer surprising wisdom from just beyond the obvious view. Your stories take the long route, yet somehow lead exactly where they need to go."
    }
  },
  "the-wonder-years": {
    "heart": {
      "character": "Norma Arnold",
      "actor": "Alley Mills",
      "label": "The Quiet Encourager",
      "why": "You create warmth during uncertain years and help people feel safe enough to change. Your strength often appears in small, thoughtful choices."
    },
    "mind": {
      "character": "Paul Pfeiffer",
      "actor": "Josh Saviano",
      "label": "The Thoughtful Best Friend",
      "why": "You think before acting, value loyalty, and help a friend see beyond the moment. Your careful nature keeps many growing pains from becoming disasters."
    },
    "spark": {
      "character": "Kevin Arnold",
      "actor": "Fred Savage",
      "label": "The Curious Storyteller",
      "why": "You experience ordinary moments as big turning points and want to understand what they mean. You make mistakes, reflect, and keep growing."
    },
    "wildcard": {
      "character": "Wayne Arnold",
      "actor": "Jason Hervey",
      "label": "The Relentless Big Brother",
      "why": "You enjoy testing limits and keeping everyone slightly off balance. Under the teasing, family loyalty is always closer than it looks."
    }
  },
  "derry-girls": {
    "heart": {
      "character": "James Maguire",
      "actor": "Dylan Llewellyn",
      "label": "The Patient Outsider",
      "why": "You keep showing up for your friends even when they complain that you do not belong. Your gentleness gives the group a needed center."
    },
    "mind": {
      "character": "Clare Devlin",
      "actor": "Nicola Coughlan",
      "label": "The Prepared Worrier",
      "why": "You think through every possible consequence and truly want to do the right thing. Panic may arrive early, but so does your loyalty."
    },
    "spark": {
      "character": "Michelle Mallon",
      "actor": "Jamie-Lee O'Donnell",
      "label": "The Fearless Instigator",
      "why": "You chase excitement, speak without a filter, and can turn a school day into an adventure. Your confidence pulls the whole group forward."
    },
    "wildcard": {
      "character": "Orla McCool",
      "actor": "Louisa Harland",
      "label": "The Delightful Original",
      "why": "You move through the world with your own cheerful logic. Your unexpected observations make even a crisis feel strangely wonderful."
    }
  },
  "never-have-i-ever": {
    "heart": {
      "character": "Kamala Nandiwadal",
      "actor": "Richa Moorjani",
      "label": "The Caring Trailblazer",
      "why": "You care about family while working out what you want for yourself. Your kindness does not stop you from quietly challenging expectations."
    },
    "mind": {
      "character": "Ben Gross",
      "actor": "Jaren Lewison",
      "label": "The Competitive Brain",
      "why": "You prepare hard, argue quickly, and want your effort to be noticed. Beneath the rivalry is a real desire to connect and be understood."
    },
    "spark": {
      "character": "Devi Vishwakumar",
      "actor": "Maitreyi Ramakrishnan",
      "label": "The Bold Overachiever",
      "why": "You feel everything strongly and race toward the life you imagine. Your messy choices come from courage, ambition, and a huge heart."
    },
    "wildcard": {
      "character": "Eleanor Wong",
      "actor": "Ramona Young",
      "label": "The Theatrical Best Friend",
      "why": "You bring drama, style, and total commitment to your friendships. You can turn a hallway update into a full performance."
    }
  },
  "heartstopper": {
    "heart": {
      "character": "Charlie Spring",
      "actor": "Joe Locke",
      "label": "The Gentle Truth-Teller",
      "why": "You care deeply, notice how others feel, and want relationships to be honest. Your quiet courage helps people feel safe being themselves."
    },
    "mind": {
      "character": "Tao Xu",
      "actor": "William Gao",
      "label": "The Protective Planner",
      "why": "You watch for danger to your friends and think carefully before trusting change. Your strong reactions come from strong loyalty."
    },
    "spark": {
      "character": "Nick Nelson",
      "actor": "Kit Connor",
      "label": "The Open-Hearted Teammate",
      "why": "You make people comfortable, bring friendly energy, and are brave enough to learn new things about yourself. Kindness is your strongest form of confidence."
    },
    "wildcard": {
      "character": "Elle Argent",
      "actor": "Yasmin Finney",
      "label": "The Creative Pathfinder",
      "why": "You handle change with grace and build a life that feels true to you. Your artistic eye and calm confidence help friends imagine new possibilities."
    }
  },
  "cobra-kai": {
    "heart": {
      "character": "Miguel Diaz",
      "actor": "Xolo Maridueña",
      "label": "The Resilient Student",
      "why": "You work hard, care about your team, and keep trying after difficult setbacks. You want strength to help you belong, not push people away."
    },
    "mind": {
      "character": "Daniel LaRusso",
      "actor": "Ralph Macchio",
      "label": "The Balanced Mentor",
      "why": "You believe discipline should come with patience and purpose. You look to experience for answers, even when old rivalries cloud the lesson."
    },
    "spark": {
      "character": "Johnny Lawrence",
      "actor": "William Zabka",
      "label": "The Rough-Edged Coach",
      "why": "You attack a problem with direct energy and refuse to give up on your students. Your methods are old-school, but your desire to improve is real."
    },
    "wildcard": {
      "character": "Tory Nichols",
      "actor": "Peyton List",
      "label": "The Relentless Fighter",
      "why": "You meet pressure with fierce determination and refuse to be counted out. Trust is hard-earned, but your loyalty is powerful once given."
    }
  },
  "the-umbrella-academy": {
    "heart": {
      "character": "Viktor Hargreeves",
      "actor": "Elliot Page",
      "label": "The Quiet Power",
      "why": "You feel deeply and want to be accepted as your full self. Your strength grows when you stop shrinking to fit other people's expectations."
    },
    "mind": {
      "character": "Five Hargreeves",
      "actor": "Aidan Gallagher",
      "label": "The Time-Jumping Strategist",
      "why": "You think several moves ahead and keep working while everyone else argues. Your sharp plan is usually powered by a hidden wish to save your family."
    },
    "spark": {
      "character": "Allison Hargreeves",
      "actor": "Emmy Raver-Lampman",
      "label": "The Magnetic Persuader",
      "why": "You know how words can change a room and take responsibility for using that power well. Your confidence is strongest when it protects people."
    },
    "wildcard": {
      "character": "Klaus Hargreeves",
      "actor": "Robert Sheehan",
      "label": "The Chaotic Medium",
      "why": "You meet dark situations with style, humor, and a completely unexpected idea. Beneath the wild energy is unusual sensitivity and courage."
    }
  },
  "the-mandalorian": {
    "heart": {
      "character": "Din Djarin",
      "actor": "Pedro Pascal",
      "label": "The Armored Protector",
      "why": "You show love through actions, promises, and standing between danger and someone smaller. Your quiet loyalty becomes your clearest code."
    },
    "mind": {
      "character": "Bo-Katan Kryze",
      "actor": "Katee Sackhoff",
      "label": "The Tactical Leader",
      "why": "You understand power, history, and the cost of leading a divided group. You act decisively when the mission needs direction."
    },
    "spark": {
      "character": "Ahsoka Tano",
      "actor": "Rosario Dawson",
      "label": "The Centered Warrior",
      "why": "You bring calm confidence to tense situations and trust lessons earned through experience. Your strength never depends on showing off."
    },
    "wildcard": {
      "character": "Greef Karga",
      "actor": "Carl Weathers",
      "label": "The Resourceful Deal-Maker",
      "why": "You know how to read an opportunity and adapt when the rules change. Charm and practical judgment help you survive uncertain alliances."
    }
  },
  "loki": {
    "heart": {
      "character": "Mobius M. Mobius",
      "actor": "Owen Wilson",
      "label": "The Patient Interviewer",
      "why": "You listen for the person beneath the performance and give people room to change. Your calm curiosity can disarm even a god of mischief."
    },
    "mind": {
      "character": "Sylvie",
      "actor": "Sophia Di Martino",
      "label": "The Focused Survivor",
      "why": "You question the system, plan your escape, and refuse to let someone else write your story. Your independence was earned through persistence."
    },
    "spark": {
      "character": "Loki",
      "actor": "Tom Hiddleston",
      "label": "The Glorious Improviser",
      "why": "You love a dramatic entrance, a clever speech, and a plan with several secret layers. Growth begins when you use that brilliance for more than applause."
    },
    "wildcard": {
      "character": "Miss Minutes",
      "actor": "Tara Strong",
      "label": "The Cheerful Enigma",
      "why": "You look friendly, know far more than you reveal, and can appear exactly when least expected. No one should mistake a bright smile for a simple plan."
    }
  },
  "wandavision": {
    "heart": {
      "character": "Monica Rambeau",
      "actor": "Teyonah Parris",
      "label": "The Compassionate Investigator",
      "why": "You look beyond the strange surface and remember the person hurting underneath. Empathy makes you braver, not less practical."
    },
    "mind": {
      "character": "Vision",
      "actor": "Paul Bettany",
      "label": "The Gentle Logician",
      "why": "You ask careful questions and want truth to fit with kindness. Even a mystery feels manageable when you can examine it honestly."
    },
    "spark": {
      "character": "Wanda Maximoff",
      "actor": "Elizabeth Olsen",
      "label": "The Reality-Shaping Dreamer",
      "why": "Your imagination and emotions can transform an entire room. Your greatest strength comes from facing the truth behind what you create."
    },
    "wildcard": {
      "character": "Agatha Harkness",
      "actor": "Kathryn Hahn",
      "label": "The Scene-Stealing Neighbor",
      "why": "You enter with perfect timing, endless confidence, and more knowledge than you first admit. Every ordinary visit could hide a larger plan."
    }
  },
  "doctor-who": {
    "heart": {
      "character": "The Doctor",
      "actor": "David Tennant",
      "label": "The Hopeful Time Traveler",
      "why": "You race toward danger because every life matters and every puzzle might have a kinder answer. Curiosity and compassion are your real superpowers."
    },
    "mind": {
      "character": "Martha Jones",
      "actor": "Freema Agyeman",
      "label": "The Clear-Headed Doctor",
      "why": "You stay observant, use your training, and keep moving when the impossible appears. Your courage does not need anyone else's approval."
    },
    "spark": {
      "character": "Rose Tyler",
      "actor": "Billie Piper",
      "label": "The Fearless Companion",
      "why": "You step beyond ordinary life with warmth, bravery, and wonder. You make strange new worlds feel personal because you care about the people in them."
    },
    "wildcard": {
      "character": "Donna Noble",
      "actor": "Catherine Tate",
      "label": "The Brilliant Truth-Teller",
      "why": "You meet aliens and time machines with direct questions and perfect comic timing. Your ordinary point of view often reveals the most important truth."
    }
  },
  "sherlock": {
    "heart": {
      "character": "John Watson",
      "actor": "Martin Freeman",
      "label": "The Steady Partner",
      "why": "You bring courage, loyalty, and needed humanity to a brilliant but difficult team. You do not need to solve every clue to understand what matters."
    },
    "mind": {
      "character": "Sherlock Holmes",
      "actor": "Benedict Cumberbatch",
      "label": "The Lightning Deduction",
      "why": "You spot tiny details, connect them rapidly, and need a difficult problem to feel fully awake. Learning to value people makes the answer more complete."
    },
    "spark": {
      "character": "Irene Adler",
      "actor": "Lara Pulver",
      "label": "The Unreadable Equal",
      "why": "You command attention, stay several moves ahead, and reveal only what serves your purpose. Confidence is part of your strategy."
    },
    "wildcard": {
      "character": "Mycroft Holmes",
      "actor": "Mark Gatiss",
      "label": "The Quiet Power Broker",
      "why": "You prefer influence from the edge of the room and know far more than you say. Your concern often arrives disguised as control."
    }
  },
  "downton-abbey": {
    "heart": {
      "character": "Anna Bates",
      "actor": "Joanne Froggatt",
      "label": "The Loyal Confidante",
      "why": "You offer steady kindness, notice private worries, and remain loyal through uncertainty. Your quiet strength holds more than people realize."
    },
    "mind": {
      "character": "Lady Mary Crawley",
      "actor": "Michelle Dockery",
      "label": "The Poised Strategist",
      "why": "You understand responsibility, read a room quickly, and protect your future with careful choices. Your cool surface hides deep feeling."
    },
    "spark": {
      "character": "Violet Crawley",
      "actor": "Maggie Smith",
      "label": "The Grand Wit",
      "why": "You defend tradition with perfect timing and an unforgettable line. Your sharp judgment is often matched by surprising wisdom."
    },
    "wildcard": {
      "character": "Thomas Barrow",
      "actor": "Robert James-Collier",
      "label": "The Guarded Survivor",
      "why": "You watch the room, protect your position, and adapt when old rules leave little space for you. Trust reveals a softer side beneath the strategy."
    }
  },
  "the-crown": {
    "heart": {
      "character": "Queen Elizabeth II",
      "actor": "Claire Foy",
      "label": "The Steady Center",
      "why": "You put duty first and try to keep a complicated group stable. Your feelings run deep even when your role asks you to hide them."
    },
    "mind": {
      "character": "Princess Anne",
      "actor": "Erin Doherty",
      "label": "The Practical Royal",
      "why": "You see through ceremony, speak directly, and focus on the work in front of you. Your confidence comes from competence rather than attention."
    },
    "spark": {
      "character": "Princess Margaret",
      "actor": "Vanessa Kirby",
      "label": "The Restless Star",
      "why": "You crave a life with color, freedom, and room for your own identity. You refuse to become invisible inside someone else's rules."
    },
    "wildcard": {
      "character": "Prince Philip",
      "actor": "Matt Smith",
      "label": "The Impatient Modernizer",
      "why": "You question old systems and search for a useful place inside them. Your boldness can cause friction, but it also pushes change."
    }
  },
  "house": {
    "heart": {
      "character": "James Wilson",
      "actor": "Robert Sean Leonard",
      "label": "The Patient Friend",
      "why": "You listen with compassion and stay close when a friend becomes difficult. Your kindness is strongest because it includes honest limits."
    },
    "mind": {
      "character": "Gregory House",
      "actor": "Hugh Laurie",
      "label": "The Relentless Diagnostician",
      "why": "You question every easy answer and chase the detail that does not fit. Your sharp mind works best when curiosity matters more than being right."
    },
    "spark": {
      "character": "Lisa Cuddy",
      "actor": "Lisa Edelstein",
      "label": "The Commanding Balancer",
      "why": "You make hard calls, manage huge personalities, and keep the whole system moving. Confidence and care work together in your leadership."
    },
    "wildcard": {
      "character": "Remy 'Thirteen' Hadley",
      "actor": "Olivia Wilde",
      "label": "The Guarded Risk-Taker",
      "why": "You protect your independence and stay calm when the situation gets messy. Mystery is part of your strength, not the whole story."
    }
  },
  "bones": {
    "heart": {
      "character": "Seeley Booth",
      "actor": "David Boreanaz",
      "label": "The Protective Partner",
      "why": "You trust people, read emotions, and stand beside your team when facts alone are not enough. Loyalty guides your strongest decisions."
    },
    "mind": {
      "character": "Temperance Brennan",
      "actor": "Emily Deschanel",
      "label": "The Evidence Expert",
      "why": "You observe precisely, value truth, and refuse to guess when evidence can answer. Caring becomes easier when others respect your directness."
    },
    "spark": {
      "character": "Angela Montenegro",
      "actor": "Michaela Conlin",
      "label": "The Creative Connector",
      "why": "You bring art, empathy, and social insight into a highly technical room. You remind everyone that every case belongs to a person."
    },
    "wildcard": {
      "character": "Jack Hodgins",
      "actor": "T. J. Thyne",
      "label": "The Enthusiastic Experimenter",
      "why": "You love a strange clue, a bold experiment, and a theory no one else considered. Your excitement can turn dirt or insects into the key detail."
    }
  },
  "criminal-minds": {
    "heart": {
      "character": "Jennifer 'JJ' Jareau",
      "actor": "A. J. Cook",
      "label": "The Calm Communicator",
      "why": "You help worried people feel heard while keeping the team focused. Your steady compassion is a real form of strength."
    },
    "mind": {
      "character": "Spencer Reid",
      "actor": "Matthew Gray Gubler",
      "label": "The Pattern Genius",
      "why": "You absorb information quickly and connect facts others miss. Your thoughtfulness matters as much as your remarkable memory."
    },
    "spark": {
      "character": "Derek Morgan",
      "actor": "Shemar Moore",
      "label": "The Fearless Teammate",
      "why": "You move quickly, protect your people, and bring confidence when tension rises. Your playful energy keeps a serious team connected."
    },
    "wildcard": {
      "character": "Penelope Garcia",
      "actor": "Kirsten Vangsness",
      "label": "The Colorful Tech Wizard",
      "why": "You solve hard problems with skill, heart, and a style that makes the gray office brighter. Your unique voice helps the team stay human."
    }
  },
  "law-and-order-svu": {
    "heart": {
      "character": "Olivia Benson",
      "actor": "Mariska Hargitay",
      "label": "The Compassionate Captain",
      "why": "You listen without judgment and stay determined when someone needs an advocate. Empathy guides both your leadership and your courage."
    },
    "mind": {
      "character": "Rafael Barba",
      "actor": "Raúl Esparza",
      "label": "The Precise Advocate",
      "why": "You prepare carefully, question weak arguments, and speak with purpose. Your sharp reasoning serves a strong sense of justice."
    },
    "spark": {
      "character": "Elliot Stabler",
      "actor": "Christopher Meloni",
      "label": "The Intense Protector",
      "why": "You act with urgency when people are in danger and never treat a case like a number. Your passion is strongest when balanced by your team."
    },
    "wildcard": {
      "character": "Odafin 'Fin' Tutuola",
      "actor": "Ice-T",
      "label": "The Streetwise Truth-Teller",
      "why": "You read people quickly, skip unnecessary drama, and say exactly what the room needs to hear. Experience makes your instincts difficult to fool."
    }
  },
  "ncis": {
    "heart": {
      "character": "Donald 'Ducky' Mallard",
      "actor": "David McCallum",
      "label": "The Gentle Storykeeper",
      "why": "You treat every person with dignity and use stories to help others see the larger picture. Patience makes your wisdom easy to trust."
    },
    "mind": {
      "character": "Leroy Jethro Gibbs",
      "actor": "Mark Harmon",
      "label": "The Instinctive Leader",
      "why": "You set clear rules, notice what others avoid, and protect your team through action. Few words are needed when your standards are consistent."
    },
    "spark": {
      "character": "Ziva David",
      "actor": "Cote de Pablo",
      "label": "The Fearless Specialist",
      "why": "You are capable, focused, and ready when a plan becomes dangerous. Your strength includes learning when to trust the people beside you."
    },
    "wildcard": {
      "character": "Abby Sciuto",
      "actor": "Pauley Perrette",
      "label": "The Gothic Lab Genius",
      "why": "You combine cheerful warmth, bold style, and serious scientific skill. Your lab feels unique because you refuse to separate competence from personality."
    }
  },
  "the-x-files": {
    "heart": {
      "character": "Fox Mulder",
      "actor": "David Duchovny",
      "label": "The Hopeful Believer",
      "why": "You keep searching because the truth feels personal and possibility matters. Even doubt cannot erase your hope that answers exist."
    },
    "mind": {
      "character": "Dana Scully",
      "actor": "Gillian Anderson",
      "label": "The Scientific Skeptic",
      "why": "You test claims, look for evidence, and stay calm when a case becomes impossible. Your open mind is strongest because it is disciplined."
    },
    "spark": {
      "character": "John Doggett",
      "actor": "Robert Patrick",
      "label": "The Determined Investigator",
      "why": "You trust hard work, direct questions, and following the trail in front of you. Strange answers do not stop you from doing the job."
    },
    "wildcard": {
      "character": "Alex Krycek",
      "actor": "Nicholas Lea",
      "label": "The Unreadable Operator",
      "why": "You adapt quickly and rarely show your entire plan. Other people may never be sure which side of the mystery you occupy."
    }
  },
  "buffy-the-vampire-slayer": {
    "heart": {
      "character": "Willow Rosenberg",
      "actor": "Alyson Hannigan",
      "label": "The Loyal Learner",
      "why": "You care deeply, love learning, and grow braver when friends need you. Your quiet talents can become remarkable strengths."
    },
    "mind": {
      "character": "Rupert Giles",
      "actor": "Anthony Stewart Head",
      "label": "The Prepared Watcher",
      "why": "You research the danger, respect old knowledge, and guide others with steady judgment. Your formal style hides a fiercely protective heart."
    },
    "spark": {
      "character": "Buffy Summers",
      "actor": "Sarah Michelle Gellar",
      "label": "The Quippy Hero",
      "why": "You face frightening problems with courage, style, and a perfectly timed comeback. You protect normal life even when yours is anything but normal."
    },
    "wildcard": {
      "character": "Spike",
      "actor": "James Marsters",
      "label": "The Punk-Rock Outsider",
      "why": "You reject polite expectations and follow strong feelings wherever they lead. Surprise loyalty can emerge beneath your rebellious surface."
    }
  },
  "charmed": {
    "heart": {
      "character": "Piper Halliwell",
      "actor": "Holly Marie Combs",
      "label": "The Family Anchor",
      "why": "You want a peaceful home, but you will become fearlessly protective when family is threatened. Practical care is at the center of your power."
    },
    "mind": {
      "character": "Prue Halliwell",
      "actor": "Shannen Doherty",
      "label": "The Responsible Protector",
      "why": "You take charge, prepare for danger, and expect yourself to be strong for everyone. Responsibility shapes nearly every choice you make."
    },
    "spark": {
      "character": "Phoebe Halliwell",
      "actor": "Alyssa Milano",
      "label": "The Intuitive Free Spirit",
      "why": "You trust your feelings, embrace change, and bring energy to the family team. Your openness helps you understand people beyond the obvious."
    },
    "wildcard": {
      "character": "Paige Matthews",
      "actor": "Rose McGowan",
      "label": "The Independent Newcomer",
      "why": "You learn quickly, question old habits, and bring a fresh approach to family magic. Independence and belonging can both be yours."
    }
  },
  "smallville": {
    "heart": {
      "character": "Clark Kent",
      "actor": "Tom Welling",
      "label": "The Humble Protector",
      "why": "You want to help without asking for attention and care deeply about using strength responsibly. Your values are rooted in home and family."
    },
    "mind": {
      "character": "Lex Luthor",
      "actor": "Michael Rosenbaum",
      "label": "The Brilliant Questioner",
      "why": "You study every mystery and refuse to accept a surface answer. Ambition can open doors, but trust determines where they lead."
    },
    "spark": {
      "character": "Lois Lane",
      "actor": "Erica Durance",
      "label": "The Fearless Reporter",
      "why": "You ask direct questions, chase the story, and bring lively confidence into tense rooms. Curiosity makes you difficult to discourage."
    },
    "wildcard": {
      "character": "Oliver Queen",
      "actor": "Justin Hartley",
      "label": "The Daring Ally",
      "why": "You mix charm with action and prefer doing something over waiting for permission. Your independent streak still makes room for a team."
    }
  },
  "once-upon-a-time": {
    "heart": {
      "character": "Snow White",
      "actor": "Ginnifer Goodwin",
      "label": "The Hopeful Leader",
      "why": "You believe goodness is an active choice and keep hope alive when others lose it. Your strength grows through community."
    },
    "mind": {
      "character": "Regina Mills",
      "actor": "Lana Parrilla",
      "label": "The Formidable Strategist",
      "why": "You understand power, plan carefully, and refuse to be defined by one chapter of your story. Change takes courage as well as control."
    },
    "spark": {
      "character": "Emma Swan",
      "actor": "Jennifer Morrison",
      "label": "The Skeptical Savior",
      "why": "You trust your instincts, protect people fiercely, and face impossible truths one step at a time. Belonging becomes a strength you choose."
    },
    "wildcard": {
      "character": "Rumplestiltskin",
      "actor": "Robert Carlyle",
      "label": "The Deal-Making Enigma",
      "why": "You know that every choice has a price and keep several plans in motion. Your cleverness is powerful, especially when paired with honesty."
    }
  },
  "anne-with-an-e": {
    "heart": {
      "character": "Anne Shirley-Cuthbert",
      "actor": "Amybeth McNulty",
      "label": "The Imaginative Optimist",
      "why": "You feel deeply, speak vividly, and look for beauty even after hardship. Your hope helps you create the belonging you deserve."
    },
    "mind": {
      "character": "Marilla Cuthbert",
      "actor": "Geraldine James",
      "label": "The Practical Guardian",
      "why": "You value responsibility and show love through consistent care. Your rules become wiser when you let compassion shape them."
    },
    "spark": {
      "character": "Gilbert Blythe",
      "actor": "Lucas Jade Zumann",
      "label": "The Curious Challenger",
      "why": "You work hard, welcome new ideas, and enjoy a worthy rival. Your confidence leaves room for respect and growth."
    },
    "wildcard": {
      "character": "Diana Barry",
      "actor": "Dalila Bela",
      "label": "The Loyal Kindred Spirit",
      "why": "You bring warmth and adventure to a friendship while learning to choose your own path. Quiet bravery appears when expectations feel too small."
    }
  },
  "a-series-of-unfortunate-events": {
    "heart": {
      "character": "Violet Baudelaire",
      "actor": "Malina Weissman",
      "label": "The Protective Inventor",
      "why": "You turn care for your family into clever action. When trouble closes in, you tie back your hair and build a way forward."
    },
    "mind": {
      "character": "Klaus Baudelaire",
      "actor": "Louis Hynes",
      "label": "The Bookish Solver",
      "why": "You remember what you read and search for the fact that can unlock a problem. Knowledge gives your family a fighting chance."
    },
    "spark": {
      "character": "Quigley Quagmire",
      "actor": "Dylan Kingwell",
      "label": "The Brave Explorer",
      "why": "You stay curious under pressure and are willing to cross difficult ground for friends. Resourcefulness makes you a welcome ally."
    },
    "wildcard": {
      "character": "Sunny Baudelaire",
      "actor": "Presley Smith",
      "label": "The Tiny Secret Weapon",
      "why": "You may be the smallest person in the room, but your surprising skills can solve the biggest obstacle. People underestimate you only once."
    }
  },
  "icarly": {
    "heart": {
      "character": "Freddie Benson",
      "actor": "Nathan Kress",
      "label": "The Loyal Tech Producer",
      "why": "You show up prepared, solve technical problems, and stick with your friends through strange broadcasts. Reliability is your quiet superpower."
    },
    "mind": {
      "character": "Carly Shay",
      "actor": "Miranda Cosgrove",
      "label": "The Level-Headed Host",
      "why": "You keep the group connected and make sensible choices when a fun idea becomes chaos. Your warmth makes people want to join in."
    },
    "spark": {
      "character": "Sam Puckett",
      "actor": "Jennette McCurdy",
      "label": "The Fearless Co-Host",
      "why": "You speak boldly, chase the funniest possibility, and protect friends with fierce energy. Rules rarely survive your best ideas."
    },
    "wildcard": {
      "character": "Spencer Shay",
      "actor": "Jerry Trainor",
      "label": "The Unpredictable Artist",
      "why": "You turn random materials into art and ordinary problems into comic adventures. Your creativity makes home feel like anything could happen."
    }
  },
  "victorious": {
    "heart": {
      "character": "Andre Harris",
      "actor": "Leon Thomas III",
      "label": "The Supportive Musician",
      "why": "You bring talent without needing all the attention and help friends find their best idea. Your calm loyalty keeps creative chaos moving."
    },
    "mind": {
      "character": "Tori Vega",
      "actor": "Victoria Justice",
      "label": "The Adaptable Performer",
      "why": "You learn quickly, work through nerves, and try to treat a competitive group fairly. New challenges bring out your determination."
    },
    "spark": {
      "character": "Cat Valentine",
      "actor": "Ariana Grande",
      "label": "The Bubbly Scene-Stealer",
      "why": "You bring bright energy, unusual stories, and total sincerity to every room. Your imagination refuses to be predictable."
    },
    "wildcard": {
      "character": "Jade West",
      "actor": "Elizabeth Gillies",
      "label": "The Fearless Original",
      "why": "You have strong taste, sharp humor, and no interest in making your art harmless. Your confidence protects a more caring side."
    }
  },
  "hannah-montana": {
    "heart": {
      "character": "Lilly Truscott",
      "actor": "Emily Osment",
      "label": "The Ride-or-Die Best Friend",
      "why": "You accept the whole person behind the image and keep their secrets safe. Your goofy energy comes with serious loyalty."
    },
    "mind": {
      "character": "Robby Ray Stewart",
      "actor": "Billy Ray Cyrus",
      "label": "The Grounded Guide",
      "why": "You use patience, humor, and firm advice to keep a complicated family life steady. You remember the person beneath the performance."
    },
    "spark": {
      "character": "Miley Stewart",
      "actor": "Miley Cyrus",
      "label": "The Double-Life Star",
      "why": "You can light up a stage and still want an ordinary day with friends. Your adaptability helps two very different worlds fit together."
    },
    "wildcard": {
      "character": "Jackson Stewart",
      "actor": "Jason Earles",
      "label": "The Comic Schemer",
      "why": "You spot a quick opportunity and usually take it before considering the cleanup. Your wild plans keep family life entertaining."
    }
  },
  "wizards-of-waverly-place": {
    "heart": {
      "character": "Harper Finkle",
      "actor": "Jennifer Stone",
      "label": "The Loyal Style Original",
      "why": "You support your best friend through secrets and magical trouble without losing your own creative identity. Your loyalty is colorful and complete."
    },
    "mind": {
      "character": "Justin Russo",
      "actor": "David Henrie",
      "label": "The Prepared Wizard",
      "why": "You study every rule, practice carefully, and want magic used responsibly. Being correct matters, but helping family matters more."
    },
    "spark": {
      "character": "Alex Russo",
      "actor": "Selena Gomez",
      "label": "The Clever Rule-Bender",
      "why": "You improvise quickly, question boring rules, and find magical shortcuts no one else sees. Your heart usually catches up with your mischief."
    },
    "wildcard": {
      "character": "Max Russo",
      "actor": "Jake T. Austin",
      "label": "The Happy Experiment",
      "why": "You try surprising ideas with complete confidence and rarely worry about looking unusual. Sometimes your strange approach is exactly what works."
    }
  },
  "the-suite-life-of-zack-and-cody": {
    "heart": {
      "character": "Maddie Fitzpatrick",
      "actor": "Ashley Tisdale",
      "label": "The Hardworking Friend",
      "why": "You stay practical, support your friends, and know the value of earning what you have. Kindness keeps you grounded around hotel luxury."
    },
    "mind": {
      "character": "Cody Martin",
      "actor": "Cole Sprouse",
      "label": "The Careful Twin",
      "why": "You research first, follow the plan, and think about consequences. Your preparation often rescues everyone from a much less careful idea."
    },
    "spark": {
      "character": "London Tipton",
      "actor": "Brenda Song",
      "label": "The Hotel Heiress",
      "why": "You bring confidence, style, and an unexpected point of view to every situation. You may be sheltered, but you are never dull."
    },
    "wildcard": {
      "character": "Zack Martin",
      "actor": "Dylan Sprouse",
      "label": "The Lobby Schemer",
      "why": "You see the entire hotel as a place for adventure and rarely wait for permission. Charm helps you recover when the plan falls apart."
    }
  },
  "lizzie-mcguire": {
    "heart": {
      "character": "David 'Gordo' Gordon",
      "actor": "Adam Lamberg",
      "label": "The Thoughtful Best Friend",
      "why": "You listen, notice what others miss, and care more about truth than popularity. Your steady support helps friends be themselves."
    },
    "mind": {
      "character": "Lizzie McGuire",
      "actor": "Hilary Duff",
      "label": "The Relatable Dreamer",
      "why": "You think through every awkward possibility and still keep trying. Your honest inner voice helps you learn from ordinary mistakes."
    },
    "spark": {
      "character": "Miranda Sanchez",
      "actor": "Lalaine",
      "label": "The Bold Bestie",
      "why": "You bring strong opinions, creative style, and brave energy to the group. You encourage friends to stop hiding."
    },
    "wildcard": {
      "character": "Matt McGuire",
      "actor": "Jake Thomas",
      "label": "The Little Troublemaker",
      "why": "You turn boredom into a scheme and approach every prank like a serious project. Your family never knows what you will try next."
    }
  },
  "kim-possible": {
    "heart": {
      "character": "Ron Stoppable",
      "actor": "Will Friedle",
      "label": "The Loyal Sidekick",
      "why": "You face danger with humor and stay beside your best friend even when confidence wobbles. Your unusual instincts save the day more often than expected."
    },
    "mind": {
      "character": "Wade Load",
      "actor": "Tahj Mowry",
      "label": "The Mission Control Genius",
      "why": "You find the information, design the gadget, and guide the team from behind the screen. Preparation makes impossible missions possible."
    },
    "spark": {
      "character": "Kim Possible",
      "actor": "Christy Carlson Romano",
      "label": "The Can-Do Hero",
      "why": "You balance school, friends, and world-saving with confident energy. When someone needs help, your answer is that you can do it."
    },
    "wildcard": {
      "character": "Shego",
      "actor": "Nicole Sullivan",
      "label": "The Sarcastic Powerhouse",
      "why": "You bring fierce skill, dry humor, and little patience for foolish plans. Your independence makes you impossible to control."
    }
  },
  "the-owl-house": {
    "heart": {
      "character": "Luz Noceda",
      "actor": "Sarah-Nicole Robles",
      "label": "The Hopeful Human",
      "why": "You meet a strange world with kindness, curiosity, and a wish to belong without hiding who you are. Your creativity becomes real magic."
    },
    "mind": {
      "character": "Amity Blight",
      "actor": "Mae Whitman",
      "label": "The Focused Spell Student",
      "why": "You work hard, question expectations, and grow braver about choosing your own values. Excellence means more when it is truly yours."
    },
    "spark": {
      "character": "Eda Clawthorne",
      "actor": "Wendie Malick",
      "label": "The Rebel Witch",
      "why": "You reject needless rules, trust experience, and teach through unforgettable adventures. Freedom matters, but so does protecting your strange little family."
    },
    "wildcard": {
      "character": "King",
      "actor": "Alex Hirsch",
      "label": "The Tiny Ruler",
      "why": "You enter every room with grand claims and unstoppable personality. Beneath the royal speeches is a loyal friend looking for where he belongs."
    }
  },
  "steven-universe": {
    "heart": {
      "character": "Steven Universe",
      "actor": "Zach Callison",
      "label": "The Empathy Hero",
      "why": "You believe understanding can solve problems that force cannot. Your open heart helps very different people find common ground."
    },
    "mind": {
      "character": "Pearl",
      "actor": "Deedee Magno Hall",
      "label": "The Precise Protector",
      "why": "You plan carefully, value skill, and want everyone ready before danger arrives. Your high standards grow from deep devotion."
    },
    "spark": {
      "character": "Garnet",
      "actor": "Estelle",
      "label": "The Cool Leader",
      "why": "You stay calm, act with confidence, and see strength in trusting the people you love. Your few words carry real weight."
    },
    "wildcard": {
      "character": "Amethyst",
      "actor": "Michaela Dietz",
      "label": "The Free-Spirited Gem",
      "why": "You bring humor, boldness, and a willingness to try the messy approach. Being fully yourself is one of your greatest powers."
    }
  },
  "regular-show": {
    "heart": {
      "character": "Pops",
      "actor": "Sam Marin",
      "label": "The Gentle Optimist",
      "why": "You meet odd situations with kindness, wonder, and old-fashioned courtesy. Your gentle spirit can calm even unbelievable chaos."
    },
    "mind": {
      "character": "Benson",
      "actor": "Sam Marin",
      "label": "The Responsible Manager",
      "why": "You need the work finished and the park kept under control. Your frustration comes from caring about the team and the job."
    },
    "spark": {
      "character": "Mordecai",
      "actor": "J. G. Quintel",
      "label": "The Laid-Back Dreamer",
      "why": "You want life to be interesting and friendships to stay strong. You may delay the chore, but you step up when the strange adventure becomes real."
    },
    "wildcard": {
      "character": "Rigby",
      "actor": "William Salyers",
      "label": "The Chaos Starter",
      "why": "You act on the funniest idea first and let the plan form later. Your energy causes trouble, but it also keeps every day from becoming ordinary."
    }
  },
  "the-amazing-world-of-gumball": {
    "heart": {
      "character": "Darwin Watterson",
      "actor": "Kwesi Boakye",
      "label": "The Loyal Optimist",
      "why": "You look for the good in people and stay beside your best friend through every bad plan. Your kindness often becomes the smartest answer."
    },
    "mind": {
      "character": "Anais Watterson",
      "actor": "Kyla Rae Kowalewski",
      "label": "The Tiny Mastermind",
      "why": "You think ahead, solve complex problems, and are rarely fooled by the chaos around you. Your age does not limit your authority."
    },
    "spark": {
      "character": "Gumball Watterson",
      "actor": "Logan Parker Grove",
      "label": "The Dramatic Schemer",
      "why": "You turn ordinary school problems into huge adventures through confidence and imagination. Even failed plans become memorable stories."
    },
    "wildcard": {
      "character": "Richard Watterson",
      "actor": "Dan Russell",
      "label": "The Lovable Wild Card",
      "why": "You follow joy, snacks, and surprising logic wherever they lead. Responsibility may move slowly, but affection comes easily."
    }
  },
  "teen-titans": {
    "heart": {
      "character": "Starfire",
      "actor": "Hynden Walch",
      "label": "The Joyful Teammate",
      "why": "You approach new experiences with warmth, honesty, and delight. Your open affection helps a very different group feel like family."
    },
    "mind": {
      "character": "Robin",
      "actor": "Scott Menville",
      "label": "The Focused Leader",
      "why": "You train hard, build the plan, and refuse to quit when the mission becomes difficult. Leadership works best when you trust your team."
    },
    "spark": {
      "character": "Cyborg",
      "actor": "Khary Payton",
      "label": "The High-Energy Hero",
      "why": "You bring technical skill, big enthusiasm, and a love of friendly competition. You know how to power up both the machine and the team."
    },
    "wildcard": {
      "character": "Beast Boy",
      "actor": "Greg Cipes",
      "label": "The Shape-Shifting Jokester",
      "why": "You use humor, creativity, and an animal form for nearly every problem. The fun hides real courage when friends need you."
    }
  },
  "pokemon": {
    "heart": {
      "character": "Brock",
      "actor": "Eric Stuart",
      "label": "The Caring Teammate",
      "why": "You look after the group, understand creatures' needs, and keep everyone fed on a long journey. Dependability is your strongest skill."
    },
    "mind": {
      "character": "Misty",
      "actor": "Rachael Lillis",
      "label": "The Sharp Gym Leader",
      "why": "You speak honestly, know your specialty, and push friends to take responsibility. Your confidence grows from real experience."
    },
    "spark": {
      "character": "Ash Ketchum",
      "actor": "Veronica Taylor",
      "label": "The Determined Trainer",
      "why": "You meet every new challenge with excitement and believe in your partners completely. A loss only makes you more eager to learn."
    },
    "wildcard": {
      "character": "Meowth",
      "actor": "Maddie Blaustein",
      "label": "The Talking Schemer",
      "why": "You stand out, think quickly, and can turn any simple task into an elaborate plan. Your surprising skills make you unforgettable."
    }
  },
  "the-west-wing": {
    "heart": {
      "character": "C. J. Cregg",
      "actor": "Allison Janney",
      "label": "The Clear-Voiced Connector",
      "why": "You communicate difficult ideas with humor, empathy, and confidence. You remember that every policy question affects real people."
    },
    "mind": {
      "character": "Toby Ziegler",
      "actor": "Richard Schiff",
      "label": "The Principled Writer",
      "why": "You care about exact words, honest purpose, and whether an idea deserves defending. Your seriousness comes from high hopes for public service."
    },
    "spark": {
      "character": "Josh Lyman",
      "actor": "Bradley Whitford",
      "label": "The Fast-Talking Strategist",
      "why": "You thrive under pressure, argue with energy, and move quickly toward a win. Loyalty makes the long hours worth it."
    },
    "wildcard": {
      "character": "President Josiah Bartlet",
      "actor": "Martin Sheen",
      "label": "The Brilliant Commander",
      "why": "You combine deep knowledge, moral questions, and a flair for the unexpected lesson. The room changes when you decide what matters."
    }
  },
  "bluey": {
    "heart": {
      "character": "Chilli Heeler",
      "actor": "Melanie Zanetti",
      "label": "The Calm Comforter",
      "why": "You listen, set gentle limits, and know when a family needs patience. Your steady care helps everyone learn through play."
    },
    "mind": {
      "character": "Calypso",
      "actor": "Megan Washington",
      "label": "The Wise Guide",
      "why": "You create space for others to discover answers instead of giving every solution. Your calm attention makes learning feel natural."
    },
    "spark": {
      "character": "Bandit Heeler",
      "actor": "David McCormack",
      "label": "The All-In Playmate",
      "why": "You commit fully to the game and turn an ordinary task into an adventure. Humor helps you teach without making the lesson feel heavy."
    },
    "wildcard": {
      "character": "Uncle Stripe",
      "actor": "Dan Brumm",
      "label": "The Competitive Uncle",
      "why": "You join the fun quickly and sometimes discover the rules as you go. Your playful spirit keeps family gatherings lively."
    }
  },
  "the-muppet-show": {
    "heart": {
      "character": "Kermit the Frog",
      "actor": "Jim Henson",
      "label": "The Patient Showrunner",
      "why": "You care about the whole team and keep the show moving through impossible chaos. Your calm voice holds a wonderfully strange family together."
    },
    "mind": {
      "character": "Scooter",
      "actor": "Richard Hunt",
      "label": "The Backstage Organizer",
      "why": "You know the schedule, deliver the message, and solve problems before curtain time. Reliability makes everyone else's creativity possible."
    },
    "spark": {
      "character": "Miss Piggy",
      "actor": "Frank Oz",
      "label": "The Unstoppable Star",
      "why": "You believe in your talent, demand a proper entrance, and refuse to fade into the background. Confidence is both your style and your strategy."
    },
    "wildcard": {
      "character": "Gonzo",
      "actor": "Dave Goelz",
      "label": "The Great Daredevil",
      "why": "You make art from the idea nobody else would attempt. Being unusual is not a problem; it is the entire point."
    }
  },
  "star-trek-the-next-generation": {
    "heart": {
      "character": "Deanna Troi",
      "actor": "Marina Sirtis",
      "label": "The Empathic Counselor",
      "why": "You notice feelings beneath formal words and help people speak honestly. Emotional insight is a key part of your leadership."
    },
    "mind": {
      "character": "Data",
      "actor": "Brent Spiner",
      "label": "The Curious Android",
      "why": "You examine every detail and approach human behavior with sincere curiosity. Your search to understand others makes you deeply thoughtful."
    },
    "spark": {
      "character": "Jean-Luc Picard",
      "actor": "Patrick Stewart",
      "label": "The Principled Captain",
      "why": "You lead through knowledge, calm authority, and faith in peaceful discovery. Your strongest command is guided by clear values."
    },
    "wildcard": {
      "character": "Worf",
      "actor": "Michael Dorn",
      "label": "The Honorable Warrior",
      "why": "You meet danger directly and take duty very seriously. Your unique background brings needed strength and a memorable point of view."
    }
  },
  "star-trek-strange-new-worlds": {
    "heart": {
      "character": "Christopher Pike",
      "actor": "Anson Mount",
      "label": "The Welcoming Captain",
      "why": "You lead with courage, honesty, and a belief that a team works best when people feel valued. Even uncertainty does not erase your hope."
    },
    "mind": {
      "character": "Spock",
      "actor": "Ethan Peck",
      "label": "The Logical Explorer",
      "why": "You examine evidence, control your reactions, and stay curious about perspectives unlike your own. Balance is a lifelong practice."
    },
    "spark": {
      "character": "La'an Noonien-Singh",
      "actor": "Christina Chong",
      "label": "The Fearless Security Chief",
      "why": "You prepare for danger, speak directly, and protect others with total focus. Trust comes slowly, which makes it meaningful."
    },
    "wildcard": {
      "character": "Erica Ortegas",
      "actor": "Melissa Navia",
      "label": "The Bold Pilot",
      "why": "You stay cool at the controls, enjoy a daring route, and bring humor to tense missions. Confidence helps the ship go where few would try."
    }
  }
};

const TITLE_IDS = [
  "friends",
  "modern-family",
  "arrested-development",
  "the-good-place",
  "how-i-met-your-mother",
  "the-simpsons",
  "the-office",
  "parks-and-recreation",
  "brooklyn-nine-nine",
  "new-girl",
  "community",
  "schitts-creek",
  "ted-lasso",
  "abbott-elementary",
  "superstore",
  "30-rock",
  "seinfeld",
  "the-big-bang-theory",
  "young-sheldon",
  "gilmore-girls",
  "gossip-girl",
  "sex-and-the-city",
  "the-golden-girls",
  "freaks-and-geeks",
  "the-fresh-prince-of-bel-air",
  "boy-meets-world",
  "that-70s-show",
  "malcolm-in-the-middle",
  "everybody-loves-raymond",
  "frasier",
  "cheers",
  "scrubs",
  "psych",
  "monk",
  "only-murders-in-the-building",
  "stranger-things",
  "wednesday",
  "avatar-the-last-airbender",
  "gravity-falls",
  "bobs-burgers",
  "futurama",
  "rick-and-morty",
  "bojack-horseman",
  "spongebob-squarepants",
  "adventure-time",
  "phineas-and-ferb",
  "the-bear",
  "succession",
  "the-white-lotus",
  "bridgerton",
  "greys-anatomy",
  "lost",
  "the-walking-dead",
  "game-of-thrones",
  "breaking-bad",
  "better-call-saul",
  "the-marvelous-mrs-maisel",
  "black-ish",
  "full-house",
  "family-matters",
  "saved-by-the-bell",
  "the-nanny",
  "home-improvement",
  "the-wonder-years",
  "derry-girls",
  "never-have-i-ever",
  "heartstopper",
  "cobra-kai",
  "the-umbrella-academy",
  "the-mandalorian",
  "loki",
  "wandavision",
  "doctor-who",
  "sherlock",
  "downton-abbey",
  "the-crown",
  "house",
  "bones",
  "criminal-minds",
  "law-and-order-svu",
  "ncis",
  "the-x-files",
  "buffy-the-vampire-slayer",
  "charmed",
  "smallville",
  "once-upon-a-time",
  "anne-with-an-e",
  "a-series-of-unfortunate-events",
  "icarly",
  "victorious",
  "hannah-montana",
  "wizards-of-waverly-place",
  "the-suite-life-of-zack-and-cody",
  "lizzie-mcguire",
  "kim-possible",
  "the-owl-house",
  "steven-universe",
  "regular-show",
  "the-amazing-world-of-gumball",
  "teen-titans",
  "pokemon",
  "the-west-wing",
  "bluey",
  "the-muppet-show",
  "star-trek-the-next-generation",
  "star-trek-strange-new-worlds"
];

(function validateOutcomes() {
  const roles = ["heart","mind","spark","wildcard"];
  const fields = ["character","actor","label","why"];

  if (new Set(TITLE_IDS).size !== TITLE_IDS.length) {
    throw new Error("TITLE_IDS contains a duplicate ID.");
  }
  if (Object.keys(OUTCOMES).length !== TITLE_IDS.length) {
    throw new Error(`OUTCOMES has ${Object.keys(OUTCOMES).length} titles; expected ${TITLE_IDS.length}.`);
  }

  TITLE_IDS.forEach((titleId) => {
    const title = OUTCOMES[titleId];
    if (!title) throw new Error(`Missing outcomes for title: ${titleId}`);
    if (Object.keys(title).length !== roles.length) {
      throw new Error(`Title ${titleId} must have exactly four outcome roles.`);
    }

    roles.forEach((role) => {
      const result = title[role];
      if (!result) throw new Error(`Missing ${role} outcome for title: ${titleId}`);
      if (Object.keys(result).length !== fields.length) {
        throw new Error(`Malformed ${role} outcome for title: ${titleId}`);
      }
      fields.forEach((field) => {
        if (typeof result[field] !== "string" || !result[field].trim()) {
          throw new Error(`Invalid ${field} in ${role} outcome for title: ${titleId}`);
        }
      });
    });
  });
})();

window.OUTCOMES = OUTCOMES;
