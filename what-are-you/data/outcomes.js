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
  }
};

const SHOW_IDS = [
  "friends", "modern-family", "arrested-development", "the-good-place",
  "how-i-met-your-mother", "the-simpsons", "the-office",
  "parks-and-recreation", "brooklyn-nine-nine", "new-girl", "community",
  "schitts-creek", "ted-lasso", "abbott-elementary", "superstore", "30-rock",
  "seinfeld", "the-big-bang-theory", "young-sheldon", "gilmore-girls",
  "gossip-girl", "sex-and-the-city", "the-golden-girls", "freaks-and-geeks",
  "the-fresh-prince-of-bel-air", "boy-meets-world", "that-70s-show",
  "malcolm-in-the-middle", "everybody-loves-raymond", "frasier", "cheers",
  "scrubs", "psych", "monk", "only-murders-in-the-building",
  "stranger-things", "wednesday", "avatar-the-last-airbender", "gravity-falls",
  "bobs-burgers", "futurama", "rick-and-morty", "bojack-horseman",
  "spongebob-squarepants", "adventure-time", "phineas-and-ferb", "the-bear",
  "succession", "the-white-lotus", "bridgerton", "greys-anatomy", "lost",
  "the-walking-dead", "game-of-thrones", "breaking-bad", "better-call-saul"
];

(function validateOutcomes() {
  const roles = ["heart", "mind", "spark", "wildcard"];
  const fields = ["character", "actor", "label", "why"];

  if (Object.keys(OUTCOMES).length !== SHOW_IDS.length) {
    throw new Error(`OUTCOMES has ${Object.keys(OUTCOMES).length} shows; expected ${SHOW_IDS.length}.`);
  }

  SHOW_IDS.forEach((showId) => {
    const show = OUTCOMES[showId];
    if (!show) throw new Error(`Missing outcomes for show: ${showId}`);
    if (Object.keys(show).length !== roles.length) {
      throw new Error(`Show ${showId} must have exactly four outcome roles.`);
    }

    roles.forEach((role) => {
      const result = show[role];
      if (!result) throw new Error(`Missing ${role} outcome for show: ${showId}`);
      if (Object.keys(result).length !== fields.length) {
        throw new Error(`Malformed ${role} outcome for show: ${showId}`);
      }
      fields.forEach((field) => {
        if (typeof result[field] !== "string" || !result[field].trim()) {
          throw new Error(`Invalid ${field} in ${role} outcome for show: ${showId}`);
        }
      });
      if (!result.why.startsWith("You ")) {
        throw new Error(`Outcome explanation must address the quiz taker for ${showId}/${role}.`);
      }
    });
  });
})();

window.OUTCOMES = OUTCOMES;
