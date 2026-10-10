const QUESTIONS = [
  {
    prompt: "A friend has a rough day. What do you do first?",
    kicker: "Friendship check",
    options: [
      { role: "heart", text: "Listen closely and make sure they feel understood." },
      { role: "mind", text: "Help them sort out what happened and make a plan." },
      { role: "spark", text: "Cheer them up with a fun surprise." },
      { role: "wildcard", text: "Invite them on a random mini-adventure." }
    ]
  },
  {
    prompt: "Your group has a free afternoon. How do you make plans?",
    kicker: "Pick the path",
    options: [
      { role: "mind", text: "Compare the choices and build a schedule." },
      { role: "wildcard", text: "Choose a direction and see what you discover." },
      { role: "heart", text: "Ask what would make everyone happiest." },
      { role: "spark", text: "Pitch the most exciting idea right away." }
    ]
  },
  {
    prompt: "Two people in your group are arguing. What is your move?",
    kicker: "Conflict mode",
    options: [
      { role: "spark", text: "Break the tension with a well-timed joke." },
      { role: "heart", text: "Help each person explain how they feel." },
      { role: "wildcard", text: "Suggest a totally new solution nobody expected." },
      { role: "mind", text: "Separate the facts from the assumptions." }
    ]
  },
  {
    prompt: "A big deadline is suddenly moved to tomorrow. How do you react?",
    kicker: "Under pressure",
    options: [
      { role: "wildcard", text: "Improvise and trust yourself to make it work." },
      { role: "mind", text: "List the tasks and tackle them in order." },
      { role: "spark", text: "Turn up the energy and rally everyone." },
      { role: "heart", text: "Check that nobody feels overwhelmed or left behind." }
    ]
  },
  {
    prompt: "What kind of joke makes you laugh the hardest?",
    kicker: "Comedy style",
    options: [
      { role: "heart", text: "A warm joke everyone can enjoy together." },
      { role: "wildcard", text: "Something bizarre that comes out of nowhere." },
      { role: "mind", text: "A clever joke with a hidden meaning." },
      { role: "spark", text: "A bold story told with perfect energy." }
    ]
  },
  {
    prompt: "You get the chance to chase a huge goal. What drives you?",
    kicker: "Dream big",
    options: [
      { role: "spark", text: "The thrill of showing what I can do." },
      { role: "mind", text: "The challenge of mastering something difficult." },
      { role: "heart", text: "The chance to help people I care about." },
      { role: "wildcard", text: "The possibility of ending up somewhere surprising." }
    ]
  },
  {
    prompt: "Your ideal weekend has finally arrived. What are you doing?",
    kicker: "Weekend energy",
    options: [
      { role: "wildcard", text: "Trying something strange with no real plan." },
      { role: "spark", text: "Going somewhere lively with lots happening." },
      { role: "mind", text: "Working on a hobby or learning a new skill." },
      { role: "heart", text: "Spending relaxed time with favorite people." }
    ]
  },
  {
    prompt: "Which flaw gets you into trouble most often?",
    kicker: "Be honest",
    options: [
      { role: "mind", text: "I overthink things until choices feel impossible." },
      { role: "heart", text: "I care so much that I take problems personally." },
      { role: "wildcard", text: "I change course before anyone can keep up." },
      { role: "spark", text: "I leap before I have checked the landing." }
    ]
  },
  {
    prompt: "You are chosen to lead a team. What is your style?",
    kicker: "Take the lead",
    options: [
      { role: "heart", text: "Build trust and make sure every voice is heard." },
      { role: "spark", text: "Set an exciting goal and inspire people to move." },
      { role: "mind", text: "Give everyone a clear job and a smart plan." },
      { role: "wildcard", text: "Stay flexible and adjust when surprises appear." }
    ]
  },
  {
    prompt: "At the end of the day, what matters most to you?",
    kicker: "The big one",
    options: [
      { role: "spark", text: "Living boldly and leaving a memorable mark." },
      { role: "wildcard", text: "Staying free to grow, wander, and change." },
      { role: "heart", text: "Loving people and being loved in return." },
      { role: "mind", text: "Understanding the world and making wise choices." }
    ]
  }
];

(function validateQuestions(questions) {
  const expectedRoles = ["heart", "mind", "spark", "wildcard"];
  const isNonemptyString = (value) =>
    typeof value === "string" && value.trim().length > 0;

  if (!Array.isArray(questions) || questions.length !== 10) {
    throw new Error("QUESTIONS must contain exactly 10 questions.");
  }

  questions.forEach((question, questionIndex) => {
    if (!isNonemptyString(question.prompt) || !isNonemptyString(question.kicker)) {
      throw new Error(`Question ${questionIndex + 1} needs a prompt and kicker.`);
    }

    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new Error(`Question ${questionIndex + 1} must have exactly 4 options.`);
    }

    const roles = question.options.map((option) => option.role).sort();
    const hasEveryRole = expectedRoles.every((role, index) => role === roles[index]);
    const hasValidText = question.options.every((option) => isNonemptyString(option.text));

    if (!hasEveryRole || !hasValidText) {
      throw new Error(
        `Question ${questionIndex + 1} needs one nonempty option for each role.`
      );
    }
  });
})(QUESTIONS);

window.QUESTIONS = QUESTIONS;
