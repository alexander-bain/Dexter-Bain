export const COURSE_YEAR = "2026–27";
export const COURSE_TIME_ZONE = "America/Los_Angeles";

const MR_D_BASE = "https://teachers.mpcsd.org/mdoroquez/pages/";

const units = [
  {
    id: "chapter-1",
    number: "1",
    title: "Basics of Geometry",
    start: "2026-08-20",
    testDate: "2026-09-04",
    topics: [
      "Points, lines, and planes",
      "Segments and distance",
      "Angle measurements",
      "Angle pairs",
      "Classifying polygons",
    ],
    goals: ["Use precise geometry vocabulary", "Measure and combine segments and angles", "Classify polygons from their properties"],
  },
  {
    id: "chapter-2",
    number: "2",
    title: "Reasoning and Proof",
    start: "2026-09-08",
    testDate: "2026-09-25",
    topics: [
      "Conditional statements",
      "Inductive reasoning",
      "Deductive reasoning",
      "Algebraic and congruence properties",
      "Proofs about angle pairs and segments",
    ],
    goals: ["Write converses, inverses, and contrapositives", "Separate examples from proofs", "Build a logical two-column argument"],
  },
  {
    id: "chapter-3",
    number: "3",
    title: "Parallel and Perpendicular Lines",
    start: "2026-09-28",
    testDate: "2026-10-23",
    topics: [
      "Lines and angles",
      "Properties of parallel lines",
      "Proving lines parallel",
      "Properties of perpendicular lines",
      "Midpoints and bisectors",
      "Slope and equations of lines",
      "Standard form of a line",
      "Graphing lines",
      "Parallel and perpendicular lines in the coordinate plane",
    ],
    goals: ["Use angle relationships made by a transversal", "Prove when lines are parallel or perpendicular", "Write and graph equations of lines"],
  },
  {
    id: "chapter-4",
    number: "4",
    title: "Congruent Triangles",
    start: "2026-10-26",
    testDate: "2026-11-20",
    topics: [
      "Triangle angle sums",
      "Congruent figures",
      "Triangle congruence with SSS and SAS",
      "Triangle congruence with ASA, AAS, and HL",
      "Triangle proofs",
      "Isosceles and equilateral triangles",
    ],
    goals: ["Find missing triangle measures", "Choose a valid congruence theorem", "Complete a triangle proof without assuming the diagram is to scale"],
  },
  {
    id: "chapter-5",
    number: "5",
    title: "Relationships Within Triangles",
    start: "2026-11-30",
    testDate: "2026-12-11",
    topics: [
      "Triangle midsegments",
      "Perpendicular bisectors in triangles",
      "Angle bisectors in triangles",
      "Medians and altitudes",
      "Triangle inequalities",
      "Indirect proofs",
    ],
    goals: ["Use special segments in triangles", "Locate centers of triangles", "Apply triangle inequalities and indirect reasoning"],
  },
  {
    id: "chapter-6",
    number: "6",
    title: "Quadrilaterals",
    start: "2026-12-14",
    testDate: "2027-01-22",
    topics: [
      "Angles in polygons",
      "Properties of parallelograms",
      "Proving a quadrilateral is a parallelogram",
      "Rectangles, rhombuses, and squares",
      "Trapezoids and kites",
      "Coordinate proofs with quadrilaterals",
    ],
    goals: ["Find interior and exterior angle sums", "Compare quadrilateral properties", "Prove a quadrilateral type from coordinates"],
  },
  {
    id: "semester-1",
    number: "Final 1",
    title: "Semester 1 Cumulative Review",
    start: "2027-01-25",
    testDate: "2027-01-29",
    topics: [
      "Chapters 1–2: foundations and proof",
      "Chapters 3–4: lines and congruent triangles",
      "Chapters 5–6: triangle relationships and quadrilaterals",
      "Mixed semester review",
    ],
    goals: ["Connect ideas across Chapters 1–6", "Explain why each step is valid", "Practice a mixed set under test timing"],
  },
  {
    id: "chapter-7",
    number: "7",
    title: "Similarity",
    start: "2027-02-01",
    testDate: "2027-02-12",
    topics: [
      "Ratios and proportions",
      "Similar polygons",
      "AA, SSS, and SAS similarity",
      "Indirect measurement with similar triangles",
      "Proportionality relationships",
    ],
    goals: ["Solve proportions accurately", "Prove triangles similar", "Use similarity to find missing real-world distances"],
  },
  {
    id: "chapter-8",
    number: "8",
    title: "Right Triangles and Trigonometry",
    start: "2027-02-22",
    testDate: "2027-03-19",
    topics: [
      "Simplifying square roots",
      "The Pythagorean Theorem and its converse",
      "Similar right triangles",
      "Special right triangles",
      "The distance formula",
      "Tangent, sine, and cosine",
      "Right-triangle applications",
      "The Law of Sines",
      "The Law of Cosines",
    ],
    goals: ["Choose the right right-triangle relationship", "Use trig ratios with correct rounding", "Solve non-right triangles with the Laws of Sines and Cosines"],
  },
  {
    id: "chapter-9",
    number: "9",
    title: "Transformations",
    start: "2027-03-22",
    testDate: "2027-04-09",
    topics: [
      "Symmetry and translations",
      "Reflections",
      "Rotations",
      "Compositions of transformations",
      "Dilations",
      "Tessellations",
    ],
    goals: ["Describe rigid motions with rules", "Compose multiple transformations", "Connect dilations to similarity"],
  },
  {
    id: "chapter-10",
    number: "10",
    title: "Area",
    start: "2027-04-19",
    testDate: "2027-05-03",
    topics: [
      "Area of triangles and parallelograms",
      "Areas of similar polygons",
      "Circumference and arc length",
      "Areas of circles and sectors",
      "Area and perimeter of regular polygons",
    ],
    goals: ["Select and apply area formulas", "Use scale factors for perimeter and area", "Find arc lengths and sector areas"],
  },
  {
    id: "chapter-11",
    number: "11",
    title: "Surface Area and Volume",
    start: "2027-05-04",
    testDate: "2027-05-14",
    topics: [
      "Exploring solids and nets",
      "Surface area of prisms, cylinders, and cones",
      "Volume of prisms and cylinders",
      "Volume of pyramids and cones",
      "Surface area and volume of spheres",
      "Similar solids",
    ],
    goals: ["Identify the dimensions a formula needs", "Compute surface area and volume with units", "Use scale factors with similar solids"],
  },
  {
    id: "chapter-12",
    number: "12",
    title: "Circles",
    start: "2027-05-17",
    testDate: "2027-05-28",
    topics: [
      "Parts of circles and tangent lines",
      "Properties of arcs",
      "Chords and inscribed angles",
      "Angles made by chords, secants, and tangents",
      "Segment relationships in circles",
      "Equations of circles",
    ],
    goals: ["Use circle vocabulary precisely", "Solve angle and segment relationships", "Write and interpret equations of circles"],
  },
  {
    id: "chapter-13",
    number: "13",
    title: "Algebra 2 Preview",
    start: "2027-06-01",
    testDate: "2027-06-04",
    topics: ["Graphing quadratic functions", "Solving quadratic equations", "Reference and coterminal angles", "The unit circle"],
    goals: ["Connect geometry to quadratic graphs", "Solve a quadratic accurately", "Use radians and the unit circle"],
  },
  {
    id: "semester-2",
    number: "Final 2",
    title: "Semester 2 Cumulative Review",
    start: "2027-06-07",
    testDate: "2027-06-10",
    topics: ["Similarity and right triangles", "Transformations and area", "Solids and circles", "Mixed full-year review"],
    goals: ["Choose a strategy before calculating", "Show enough work to catch mistakes", "Practice a mixed set under test timing"],
  },
].map((unit) => ({
  ...unit,
  sourceUrl: `${MR_D_BASE}Geo.htm`,
}));

export const COURSE_UNITS = Object.freeze(units.map((unit) => Object.freeze({
  ...unit,
  topics: Object.freeze([...unit.topics]),
  goals: Object.freeze([...unit.goals]),
})));

export const SCHOOL_CLOSURES = new Set([
  "2026-09-07",
  "2026-10-12",
  "2026-11-11",
  "2026-11-23",
  "2026-11-24",
  "2026-11-25",
  "2026-11-26",
  "2026-11-27",
  "2026-12-21",
  "2026-12-22",
  "2026-12-23",
  "2026-12-24",
  "2026-12-25",
  "2026-12-28",
  "2026-12-29",
  "2026-12-30",
  "2026-12-31",
  "2027-01-01",
  "2027-01-04",
  "2027-01-18",
  "2027-02-15",
  "2027-02-16",
  "2027-02-17",
  "2027-02-18",
  "2027-02-19",
  "2027-03-26",
  "2027-04-12",
  "2027-04-13",
  "2027-04-14",
  "2027-04-15",
  "2027-04-16",
  "2027-05-31",
]);

function parseIsoDate(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const value = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COURSE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const find = (type) => parts.find((part) => part.type === type)?.value;
  return `${find("year")}-${find("month")}-${find("day")}`;
}

function calendarDaysBetween(from, to) {
  return Math.round((parseIsoDate(to) - parseIsoDate(from)) / 86400000);
}

export function isInstructionalDay(dateInput) {
  const date = toIsoDate(dateInput);
  const day = parseIsoDate(date).getUTCDay();
  return day !== 0 && day !== 6 && !SCHOOL_CLOSURES.has(date);
}

function instructionalDaysBetween(start, end) {
  let cursor = parseIsoDate(start);
  const finish = parseIsoDate(end);
  let count = 0;

  while (cursor <= finish) {
    const iso = cursor.toISOString().slice(0, 10);
    if (isInstructionalDay(iso)) count += 1;
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return count;
}

export function getUnitById(id) {
  return COURSE_UNITS.find((unit) => unit.id === id) || null;
}

function lessonForDate(unit, date) {
  const teachingEnd = new Date(parseIsoDate(unit.testDate).getTime() - 86400000).toISOString().slice(0, 10);
  const totalDays = Math.max(1, instructionalDaysBetween(unit.start, teachingEnd));
  const elapsed = Math.max(1, instructionalDaysBetween(unit.start, date));
  const progress = Math.min(0.999, Math.max(0, (elapsed - 1) / totalDays));
  return unit.topics[Math.min(unit.topics.length - 1, Math.floor(progress * unit.topics.length))];
}

function breakPlan(date, previous, upcoming) {
  const baseUnit = previous || upcoming || COURSE_UNITS[0];
  const isSummer = date > COURSE_UNITS.at(-1).testDate;
  return {
    date,
    courseYear: COURSE_YEAR,
    mode: "break",
    unitId: baseUnit.id,
    unitNumber: baseUnit.number,
    unitTitle: isSummer ? "Summer Geometry Tune-Up" : "School Break",
    topic: isSummer ? "Keep your geometry reflexes sharp" : "Recharge + a quick mixed review",
    goals: previous
      ? [`Review one idea from ${previous.title}`, "Correct one old mistake", "Stop after 10–15 focused minutes"]
      : ["Preview geometry vocabulary", "Practice one careful diagram", "Keep the session short"],
    reviewTopics: previous?.topics || upcoming?.topics || baseUnit.topics,
    testDate: upcoming?.testDate || baseUnit.testDate,
    daysUntilTest: upcoming ? calendarDaysBetween(date, upcoming.testDate) : null,
    sourceUrl: baseUnit.sourceUrl,
    isInstructionalDay: false,
    badge: isSummer ? "Summer practice" : "No school today",
    message: upcoming
      ? `Next up: ${upcoming.title}. A short mixed set is plenty today.`
      : "There is no new lesson today. Use a mixed set to stay warm.",
  };
}
export function getDailyPlan(dateInput = new Date()) {
  const date = toIsoDate(dateInput);
  const unit = COURSE_UNITS.find((item) => date >= item.start && date <= item.testDate);

  if (!unit) {
    const previous = [...COURSE_UNITS].reverse().find((item) => item.testDate < date) || null;
    const upcoming = COURSE_UNITS.find((item) => item.start > date) || null;
    return breakPlan(date, previous, upcoming);
  }

  const daysUntilTest = calendarDaysBetween(date, unit.testDate);
  const schoolDay = isInstructionalDay(date);
  let mode = "lesson";
  if (daysUntilTest === 0) mode = "test-day";
  else if (daysUntilTest <= 3) mode = "review";
  else if (!schoolDay) mode = "weekend";

  const topic = mode === "review" || mode === "test-day"
    ? `Mixed ${unit.title} review`
    : lessonForDate(unit, date);

  const badge = mode === "test-day"
    ? "Test day"
    : mode === "review"
      ? `Test in ${daysUntilTest} day${daysUntilTest === 1 ? "" : "s"}`
      : mode === "weekend"
        ? "Weekend tune-up"
        : `Chapter ${unit.number}`;

  const message = mode === "review"
    ? "Review mode is on automatically. Questions will mix the whole chapter."
    : mode === "test-day"
      ? "Warm up briefly, then trust your work. Practice mode stays available."
      : mode === "weekend"
        ? "No new lesson today. Practice the current skill or take a short mixed test."
        : "This is today’s focus from the course pacing calendar—no unit selection needed.";

  return {
    date,
    courseYear: COURSE_YEAR,
    mode,
    unitId: unit.id,
    unitNumber: unit.number,
    unitTitle: unit.title,
    topic,
    goals: [...unit.goals],
    reviewTopics: [...unit.topics],
    testDate: unit.testDate,
    daysUntilTest,
    sourceUrl: unit.sourceUrl,
    isInstructionalDay: schoolDay,
    badge,
    message,
  };
}

export function publicPlan(plan) {
  return {
    date: plan.date,
    courseYear: plan.courseYear,
    mode: plan.mode,
    unitId: plan.unitId,
    unitNumber: plan.unitNumber,
    unitTitle: plan.unitTitle,
    topic: plan.topic,
    goals: [...plan.goals],
    reviewTopics: [...plan.reviewTopics],
    testDate: plan.testDate,
    daysUntilTest: plan.daysUntilTest,
    sourceUrl: plan.sourceUrl,
    isInstructionalDay: plan.isInstructionalDay,
    badge: plan.badge,
    message: plan.message,
  };
}
