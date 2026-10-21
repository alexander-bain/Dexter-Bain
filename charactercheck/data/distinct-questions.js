(() => {
  "use strict";

  const ROLE_ORDER = ["heart", "mind", "spark", "wildcard"];
  const TYPE_LABELS = {
    scripted: "Story-world choice",
    kids: "Kids' adventure",
    documentary: "Documentary lens",
    "game-show": "Game-show pressure",
    reality: "Unscripted moment",
    other: "Short-form story",
  };

  const SCENES = {
    scripted: [
      "A risky secret changes the whole group's plan. How do you respond?",
      "The person everyone doubts asks you for help. What comes first?",
      "A celebration goes wrong just as the stakes get serious. What do you do?",
      "Two people you trust want completely different things. Whose lead do you follow?",
      "The obvious solution fails in front of everyone. What is your next move?",
      "You learn that the confident leader has been hiding a mistake. How do you react?",
      "A new arrival changes every relationship in the room. How do you welcome them?",
      "The group gets one quiet hour before a major challenge. How do you use it?",
      "A rival offers useful information for a suspicious reason. What do you do?",
      "Someone turns a small misunderstanding into a huge scene. How do you step in?",
      "The safest path would disappoint the person counting on you. What wins?",
      "An old promise suddenly clashes with a better opportunity. Which do you protect?",
      "The team needs a leader, but nobody agrees who it should be. What is your role?",
      "A plan depends on one person facing their biggest fear. How do you help?",
      "You get one chance to change how the story remembers this day. What do you choose?",
      "Everyone is stuck in a serious mood when a strange opportunity appears. What now?",
      "A friend asks for the truth even though it may hurt. How honest are you?",
      "The group must leave something important behind to move forward. How do you decide?",
      "A {genre} situation suddenly calls for a completely different kind of courage. What do you show?",
      "The final choice will reveal what the group really values. What matters most?",
    ],
    kids: [
      "A new kid feels left out before the biggest team challenge. What do you do?",
      "The grown-ups make a rule that ruins everyone's adventure. How do you respond?",
      "Your clubhouse needs one brilliant idea before sunset. What do you add?",
      "A friend accidentally breaks something special and panics. How do you help?",
      "The map points somewhere nobody expected. Who should choose the next step?",
      "Two teams both want the same prize. How do you keep the game fun?",
      "A strange creature appears and seems more scared than dangerous. What now?",
      "Everyone gets a different job for the day. Which role feels most like you?",
      "The plan can only work if the shyest teammate speaks up. How do you support them?",
      "A silly contest starts becoming too competitive. How do you reset the mood?",
      "Your invention works, but not in the way anyone planned. What do you do next?",
      "A friend wants to quit after one bad try. What do you say?",
      "The group discovers a shortcut with one mysterious catch. Do you take it?",
      "Someone new has a totally different way of playing. How do you include it?",
      "You can save the day only by admitting your own mistake. What happens?",
      "The team wins, but another group looks crushed. How do you celebrate?",
      "A magical surprise gives everyone one unusual ability. How do you use yours?",
      "The biggest adventure begins during an ordinary afternoon. What pulls you in?",
      "A {genre} challenge needs kindness and courage at the same time. Which leads?",
      "At the end of the adventure, what makes the day worth remembering?",
    ],
    documentary: [
      "A key interview contradicts the story everyone expected. What matters most?",
      "The camera captures a private moment that changes the entire film. What should happen?",
      "Two reliable witnesses remember the same event differently. How do you weigh it?",
      "New evidence makes the easiest explanation impossible. What do you examine next?",
      "The subject asks the crew to stop filming during the hardest moment. What is fair?",
      "A powerful institution offers access with strict conditions. Do you accept?",
      "One overlooked person holds the clearest piece of the story. How do you center them?",
      "The facts are correct, but the edit could still create the wrong impression. What guides you?",
      "A shocking reveal would draw attention but hurt someone vulnerable. What do you choose?",
      "The crew discovers its original question was too simple. How should the film change?",
      "An expert sounds certain while the evidence stays incomplete. Who do you trust?",
      "A quiet detail explains more than the dramatic footage. How much space does it get?",
      "The subject tells a story that keeps changing. How do you keep listening without losing rigor?",
      "The film can end with an answer or an honest uncertainty. Which is stronger?",
      "People affected by the story disagree about what viewers need to see. How do you decide?",
      "A rare archive clip challenges years of public memory. What do you verify first?",
      "The crew becomes part of the events it is documenting. How transparent should it be?",
      "One statistic is powerful but hides the human experience behind it. What leads the scene?",
      "A {genre} lens reveals a side of the subject that headlines missed. What do you explore?",
      "When the credits roll, what responsibility does the film still have to its subjects?",
    ],
    "game-show": [
      "The final clue lands in your weakest category. How do you play it?",
      "Your teammate freezes with seconds left on the clock. What do you do?",
      "A risky bonus could double the prize or erase the lead. Do you take it?",
      "The host offers a hint, but it may send you the wrong way. What do you trust?",
      "Another contestant gives an answer you know is almost right. What is your move?",
      "The rules change for a surprise lightning round. How do you adjust?",
      "Your team can choose an easy category or a crowd favorite. Which one wins?",
      "A competitor makes a bold wager that puts pressure on everyone. How do you answer?",
      "The audience is loud enough to break your concentration. How do you reset?",
      "You spot a pattern in the board that nobody else sees. When do you reveal it?",
      "A teammate wants the spotlight while you know the answer. Who takes the turn?",
      "You are one point behind with one question remaining. What strategy feels right?",
      "The funniest possible response is not the safest one. What do you say?",
      "A challenge rewards speed, but one careful check could prevent a mistake. Which matters?",
      "You win control of the game after an unlucky start. How do you use the momentum?",
      "The prize matters less to you than it does to another contestant. Does that change your play?",
      "A hidden rule is revealed halfway through the round. What is your first reaction?",
      "The team must choose one person for the toughest task. How should it decide?",
      "A {genre} question gives you one chance to make the comeback memorable. What do you do?",
      "The game ends in a tie and you choose the tiebreaker style. What tests people best?",
    ],
    reality: [
      "A private plan suddenly becomes part of the episode. What do you do next?",
      "Someone you trust forms a second alliance without telling you. How do you respond?",
      "The group must vote after a day full of mixed signals. What guides your choice?",
      "A producer asks the question everyone has been avoiding. How honestly do you answer?",
      "Two castmates want you to take sides in a public argument. What is your move?",
      "A challenge pairs you with the person least like you. How do you make it work?",
      "The cameras catch a mistake before you can explain it. What comes first?",
      "A surprising newcomer changes the balance of the whole group. How do you adapt?",
      "You can protect an ally or secure your own place. Which promise matters?",
      "A joke lands badly and the mood changes instantly. How do you repair it?",
      "Everyone expects a dramatic reaction from you. What do you actually give them?",
      "The group gets an anonymous message that could be true or strategic. How do you test it?",
      "A carefully planned moment becomes completely awkward. Do you reset or lean in?",
      "Someone shares a vulnerable story just before a competition. How do you hold both moments?",
      "A twist sends the strongest player to the bottom. How do you use the shake-up?",
      "You are offered a secret advantage that may hurt the group later. Do you take it?",
      "A reunion brings back a conflict everyone remembers differently. What should be said?",
      "Your closest ally asks you to make a move that feels wrong. How do you answer?",
      "A {genre} setup starts feeling more real than anyone expected. What keeps you grounded?",
      "When the season ends, what do you most want the audience to understand about you?",
    ],
    other: [
      "The short runtime leaves one chance to change the ending. What do you choose?",
      "A single image must explain what dialogue cannot. What should it reveal?",
      "The audience enters the story halfway through a turning point. What anchors them?",
      "An ordinary object becomes the center of the whole piece. What meaning does it carry?",
      "The format breaks its own rule at exactly one moment. When is it worth doing?",
      "A performer has seconds to make the central feeling clear. What should lead?",
      "The final shot can answer the mystery or deepen it. Which ending stays with you?",
      "The story must cross years in less than a minute. What detail connects the time?",
      "A silent reaction says more than the planned scene. Do you keep it?",
      "The piece changes style at its emotional midpoint. What should stay constant?",
      "One character never appears on screen but shapes everything. How do you show their effect?",
      "The first image promises one kind of story, then reality changes it. How do you pivot?",
      "The audience must understand a whole relationship through one exchange. What matters most?",
      "A familiar genre is being used in a completely new way. What should feel surprising?",
      "The smallest moment carries the biggest idea. How much do you trust the viewer?",
      "A visual joke and a serious feeling happen at once. Which tone takes the lead?",
      "The piece can explain its unusual format or let people discover it. Which is stronger?",
      "One cut changes who the audience believes. How carefully do you use it?",
      "A {genre} idea has to become unforgettable in only a few scenes. What do you emphasize?",
      "The last few seconds decide whether the story feels complete. What belongs there?",
    ],
  };

  const ACTIONS = {
    heart: [
      "Listen closely before deciding what anyone needs.",
      "Protect the person who has the least support.",
      "Bring everyone together and rebuild trust.",
      "Ask the quietest person what they think.",
      "Keep the promise that matters most to someone.",
      "Make room for feelings before solving the problem.",
      "Choose the path that nobody has to face alone.",
      "Own your part and offer a sincere repair.",
      "Remember what the group cares about together.",
      "Turn the win into something everyone can share.",
    ],
    mind: [
      "Separate the facts, then build a clear plan.",
      "Study the pattern before making the next move.",
      "Check the rules and use the fairest strategy.",
      "Ask one precise question that reveals the gap.",
      "Compare the risks instead of following the noise.",
      "Break the challenge into calm, workable steps.",
      "Verify the strongest clue before acting on it.",
      "Give each person a role that fits their strength.",
      "Look for the consequence everyone else missed.",
      "Save the boldest option until the timing is right.",
    ],
    spark: [
      "Step forward confidently and change the energy.",
      "Say the honest thing nobody else will say.",
      "Turn the pressure into a moment people remember.",
      "Rally the group around one exciting direction.",
      "Take responsibility and move first.",
      "Use humor to release the tension, then act.",
      "Back the brave idea and give it real momentum.",
      "Challenge everyone to rise to the occasion.",
      "Make the choice that feels most alive.",
      "Lead from the front when hesitation takes over.",
    ],
    wildcard: [
      "Try the surprising option that changes the frame.",
      "Follow the strange clue everyone else ignored.",
      "Invent a third choice instead of accepting two.",
      "Turn the mistake into a completely new plan.",
      "Trust the odd instinct that keeps proving useful.",
      "Break the pattern before it traps the whole group.",
      "Take the scenic route and watch what appears.",
      "Use imagination where the normal answer fails.",
      "Make one daring move nobody can predict.",
      "Let curiosity lead before certainty closes in.",
    ],
  };

  function hashText(value) {
    let result = 2166136261;
    for (const character of String(value)) {
      result ^= character.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function questionType(media) {
    if (SCENES[media.type]) return media.type;
    return "scripted";
  }

  function createQuestions(media, id) {
    const title = media.officialTitle;
    const type = questionType(media);
    const scenes = SCENES[type];
    const seed = hashText(`${id}:${title}:${media.collection || type}`);
    const genre = media.genres?.[(seed >>> 5) % Math.max(media.genres.length, 1)] || TYPE_LABELS[type];
    const sceneStart = seed % scenes.length;
    const actionStart = (seed >>> 7) % ACTIONS.heart.length;

    return Array.from({ length: 10 }, (_, questionIndex) => {
      const scene = scenes[(sceneStart + questionIndex * 7) % scenes.length]
        .replace("{genre}", String(genre).toLowerCase());
      const actionIndex = (actionStart + questionIndex * 3) % ACTIONS.heart.length;
      const roleOffset = seed % ROLE_ORDER.length;
      const orderedRoles = ROLE_ORDER.map(
        (_, roleIndex) => ROLE_ORDER[(roleIndex + roleOffset + questionIndex) % ROLE_ORDER.length],
      );
      return {
        prompt: `${title}: ${scene}`,
        kicker: `${TYPE_LABELS[type]} · ${questionIndex + 1} of 10`,
        options: orderedRoles.map((role) => ({ role, text: ACTIONS[role][actionIndex] })),
      };
    });
  }

  window.CHARACTER_CHECK_DISTINCT_QUESTIONS = createQuestions;
})();
