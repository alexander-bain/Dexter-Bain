function makeRng(seed) {
  let state = (Number(seed) || 1) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function int(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick(rng, values) {
  return values[int(rng, 0, values.length - 1)];
}

function shuffled(rng, values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = int(rng, 0, index);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function mc(rng, { prompt, answers, correct, skill, hint, explanation }) {
  const options = shuffled(
    rng,
    answers.map((text, index) => ({
      text: String(text),
      correct: index === correct,
    })),
  );
  const choices = options.map((option, index) => ({
    id: String.fromCharCode(65 + index),
    text: option.text,
  }));
  return {
    type: "multiple-choice",
    prompt,
    skill,
    hint,
    choices,
    correctAnswer: choices[options.findIndex((option) => option.correct)].id,
    explanation,
  };
}

function numberQuestion({
  prompt,
  answer,
  skill,
  hint,
  explanation,
  tolerance = 0,
  label = "",
}) {
  return {
    type: "number",
    prompt,
    skill,
    hint,
    correctAnswer: Number(answer),
    tolerance,
    answerLabel: label || String(answer),
    explanation,
  };
}

function basicsPack() {
  return [
    (rng, level, variant) => {
      const ab = 4 + variant + int(rng, 0, 5);
      const bc = 6 + int(rng, 0, 8);
      if (level >= 3) {
        const total = 2 * (ab + bc);
        return numberQuestion({
          prompt: `B is between A and C. AB = ${ab}, BC = ${bc}, and M is the midpoint of AC. What is AM + MC?`,
          answer: total / 2,
          skill: "Segment addition and midpoint",
          hint: "First find AC. Then use what midpoint means.",
          explanation: `AC = ${ab} + ${bc} = ${ab + bc}. Because M is the midpoint, AM + MC is the whole segment AC, so the answer is ${ab + bc}.`,
        });
      }
      return numberQuestion({
        prompt: `B is between A and C. If AB = ${ab} units and BC = ${bc} units, what is AC?`,
        answer: ab + bc,
        skill: "Segment addition",
        hint: "Add the two smaller pieces.",
        explanation: `By segment addition, AC = AB + BC = ${ab} + ${bc} = ${ab + bc}.`,
      });
    },
    (rng, level, variant) => {
      const x = 8 + variant + int(rng, 0, 5);
      const first = 2 * x + 4;
      const second = 180 - first;
      if (level >= 3) {
        return numberQuestion({
          prompt: `A linear pair measures (2x + 4)° and ${second}°. After solving for x, what is the larger angle?`,
          answer: Math.max(first, second),
          skill: "Linear pairs and algebra",
          hint: "A linear pair sums to 180°. Solve for x before choosing the larger angle.",
          explanation: `2x + 4 + ${second} = 180, so 2x = ${176 - second} and x = ${x}. The angles are ${first}° and ${second}°, so the larger is ${Math.max(first, second)}°.`,
        });
      }
      return numberQuestion({
        prompt: `One angle in a linear pair measures ${first}°. What is the other angle?`,
        answer: second,
        skill: "Linear pairs",
        hint: "Linear-pair angles add to 180°.",
        explanation: `The angles are supplementary, so 180 - ${first} = ${second}°.`,
      });
    },
    (rng, level, variant) => {
      const sides = 5 + ((variant + int(rng, 0, 4)) % 7);
      const sum = (sides - 2) * 180;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A polygon's interior-angle sum is ${sum}°. How many diagonals can be drawn from one vertex?`
            : `What is the sum of the interior angles of a ${sides}-gon?`,
        answer: level >= 3 ? sides - 3 : sum,
        skill: "Polygon classification",
        hint:
          level >= 3
            ? "Use the interior-sum formula to find n, then think about adjacent vertices."
            : "Use (n − 2) × 180°.",
        explanation:
          level >= 3
            ? `${sum} = (n - 2)180 gives n = ${sides}. One vertex connects by diagonals to n - 3 = ${sides - 3} nonadjacent vertices.`
            : `(${sides} - 2) × 180 = ${sum}°.`,
      });
    },
    (rng, level, variant) => {
      const divisor = pick(rng, [3, 4, 5, 6, 8, 9, 10, 12]);
      const exterior = 360 / divisor;
      return numberQuestion({
        prompt:
          level >= 3
            ? `Each exterior angle of a regular polygon is ${exterior}°. How many diagonals does the polygon have in total?`
            : `Each exterior angle of a regular polygon is ${exterior}°. How many sides does it have?`,
        answer: level >= 3 ? (divisor * (divisor - 3)) / 2 : divisor,
        skill: "Regular polygons",
        hint: "Exterior angles total 360°.",
        explanation:
          level >= 3
            ? `360 ÷ ${exterior} = ${divisor} sides. Then n(n - 3)/2 = ${divisor}(${divisor - 3})/2 = ${(divisor * (divisor - 3)) / 2} diagonals.`
            : `360 ÷ ${exterior} = ${divisor} sides.`,
      });
    },
    (rng, level, variant) => {
      const x1 = int(rng, -8, -1);
      const x2 = int(rng, 2, 9);
      const y1 = int(rng, -6, 1);
      const y2 = int(rng, 2, 8);
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      return numberQuestion({
        prompt:
          level >= 3
            ? `The midpoint of A(${x1}, ${y1}) and B(${x2}, ${y2}) is M. What is the value of M's x-coordinate plus its y-coordinate?`
            : `What is the x-coordinate of the midpoint of A(${x1}, ${y1}) and B(${x2}, ${y2})?`,
        answer: level >= 3 ? mx + my : mx,
        skill: "Midpoint",
        hint: "Average the matching coordinates.",
        explanation: `M = ((${x1} + ${x2})/2, (${y1} + ${y2})/2) = (${mx}, ${my})${level >= 3 ? `, and ${mx} + ${my} = ${mx + my}` : "."}`,
      });
    },
  ];
}

function reasoningPack() {
  return [
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 3
            ? "If an angle is a right angle, then it measures 90°. Angle A does not measure 90°. Which conclusion follows by the Law of Contraposition?"
            : "What is the converse of: If an angle is a right angle, then it measures 90°?",
        answers:
          level >= 3
            ? [
                "Angle A is not a right angle.",
                "Angle A is acute.",
                "Angle A is obtuse.",
                "No conclusion follows.",
              ]
            : [
                "If an angle measures 90°, then it is a right angle.",
                "If an angle is not right, it is not 90°.",
                "All angles measure 90°.",
                "A right angle is acute.",
              ],
        correct: 0,
        skill: "Conditional statements",
        hint:
          level >= 3
            ? "Use not-q implies not-p."
            : "Switch the hypothesis and conclusion.",
        explanation:
          level >= 3
            ? "The contrapositive of p → q is not-q → not-p, so a non-90° angle is not a right angle."
            : "The converse switches the hypothesis and conclusion.",
      }),
    (rng, level, variant) => {
      const start = 2 + variant;
      const difference = 3 + int(rng, 0, 4);
      const fifth = start + 4 * difference;
      return numberQuestion({
        prompt: `A pattern begins ${start}, ${start + difference}, ${start + 2 * difference}, ${start + 3 * difference}, … . Using inductive reasoning, what is the fifth term?`,
        answer: fifth,
        skill: "Inductive reasoning",
        hint: "Find the repeated change.",
        explanation: `The pattern adds ${difference} each time, so the fifth term is ${start + 3 * difference} + ${difference} = ${fifth}.`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 3
            ? "Given: If two lines are perpendicular, they form right angles. If two angles are right angles, they are congruent. Lines ℓ and m are perpendicular. What follows?"
            : "If AB = CD and CD = EF, which property proves AB = EF?",
        answers:
          level >= 3
            ? [
                "The right angles formed by ℓ and m are congruent.",
                "ℓ is parallel to m.",
                "All four angles are acute.",
                "No angle relationship follows.",
              ]
            : [
                "Transitive Property",
                "Reflexive Property",
                "Symmetric Property",
                "Addition Property",
              ],
        correct: 0,
        skill: level >= 3 ? "Deductive reasoning" : "Equality properties",
        hint:
          level >= 3
            ? "Chain the two true conditional statements."
            : "A equals B and B equals C.",
        explanation:
          level >= 3
            ? "Perpendicular lines form right angles, and all right angles are congruent, so the formed right angles are congruent."
            : "The Transitive Property says quantities equal to the same quantity are equal to each other.",
      }),
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 4
            ? "A student claims: ‘All rectangles are squares because both have four right angles.’ Which counterexample disproves the claim?"
            : "Two lines intersect. Which theorem proves a pair of opposite angles are congruent?",
        answers:
          level >= 4
            ? [
                "A 3-by-5 rectangle",
                "A 4-by-4 square",
                "An equilateral triangle",
                "A circle",
              ]
            : [
                "Vertical Angles Theorem",
                "Linear Pair Theorem",
                "Midpoint Theorem",
                "Triangle Sum Theorem",
              ],
        correct: 0,
        skill: level >= 4 ? "Counterexamples" : "Angle proofs",
        hint:
          level >= 4
            ? "Find one rectangle whose adjacent sides are unequal."
            : "Opposite angles at an intersection are vertical.",
        explanation:
          level >= 4
            ? "A 3-by-5 rectangle has four right angles but not four congruent sides, so it is not a square."
            : "Opposite angles formed by intersecting lines are vertical angles, and vertical angles are congruent.",
      }),
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 3
            ? "In a proof, ∠1 and ∠2 form a linear pair and ∠2 and ∠3 form a linear pair. Which two facts prove ∠1 ≅ ∠3?"
            : "Which statement is always true by the Reflexive Property?",
        answers:
          level >= 3
            ? [
                "Both pairs are supplementary, so their nonshared angles are congruent.",
                "Vertical angles are always supplementary.",
                "All linear-pair angles are congruent.",
                "The angles are alternate interior angles.",
              ]
            : ["AB = AB", "AB = CD", "∠A = 90°", "A, B, and C are collinear"],
        correct: 0,
        skill: "Proof reasons",
        hint:
          level >= 3
            ? "Angles supplementary to the same angle are congruent."
            : "A quantity always equals itself.",
        explanation:
          level >= 3
            ? "Each nonshared angle is supplementary to ∠2, so the Congruent Supplements Theorem gives ∠1 ≅ ∠3."
            : "The Reflexive Property states that every quantity is equal to itself.",
      }),
  ];
}

function linesPack() {
  return [
    (rng, level, variant) => {
      const slope = pick(rng, [-3, -2, 2, 3, 4]);
      const run = 2 + (variant % 3);
      const x1 = int(rng, -5, 2);
      const y1 = int(rng, -4, 4);
      const x2 = x1 + run;
      const y2 = y1 + slope * run;
      if (level >= 3) {
        const intercept = y1 - slope * x1;
        return numberQuestion({
          prompt: `A line passes through (${x1}, ${y1}) and (${x2}, ${y2}). What is its y-intercept?`,
          answer: intercept,
          skill: "Slope and line equations",
          hint: "Find the slope, then substitute into y = mx + b.",
          explanation: `m = (${y2} - ${y1})/(${x2} - ${x1}) = ${slope}. Using (${x1}, ${y1}), ${y1} = ${slope}(${x1}) + b, so b = ${intercept}.`,
        });
      }
      return numberQuestion({
        prompt: `What is the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2})?`,
        answer: slope,
        skill: "Slope",
        hint: "Use rise over run.",
        explanation: `m = (${y2} - ${y1})/(${x2} - ${x1}) = ${slope * run}/${run} = ${slope}.`,
      });
    },
    (rng, level) => {
      const slope = pick(rng, [2, 3, 4, -2, -3]);
      return mc(rng, {
        prompt:
          level >= 3
            ? `Line a has equation y = ${slope}x + 5. Which equation is perpendicular to line a and passes through the origin?`
            : `Line a has slope ${slope}. Which slope belongs to a line perpendicular to a?`,
        answers:
          level >= 3
            ? [
                `y = ${-1 / slope}x`,
                `y = ${slope}x`,
                `y = ${-slope}x`,
                `y = ${1 / slope}x`,
              ]
            : [
                String(-1 / slope),
                String(slope),
                String(-slope),
                String(1 / slope),
              ],
        correct: 0,
        skill: "Perpendicular lines",
        hint: "Perpendicular slopes are negative reciprocals.",
        explanation: `The negative reciprocal of ${slope} is ${-1 / slope}, so the perpendicular line through the origin is y = ${-1 / slope}x.`,
      });
    },
    (rng, level, variant) => {
      const x = 10 + variant;
      const angle = 3 * x + 7;
      return numberQuestion({
        prompt:
          level >= 3
            ? `Two parallel lines are cut by a transversal. Corresponding angles measure (3x + 7)° and ${angle}°. What is the supplement of either angle?`
            : `Two parallel lines are cut by a transversal. Corresponding angles measure (3x + 7)° and ${angle}°. What is x?`,
        answer: level >= 3 ? 180 - angle : x,
        skill: "Parallel-line angle relationships",
        hint: "Corresponding angles are congruent; a supplement totals 180°.",
        explanation: `3x + 7 = ${angle}, so x = ${x}. The angle is ${angle}°${level >= 3 ? `, and its supplement is ${180 - angle}°` : ""}.`,
      });
    },
    (rng, level, variant) => {
      const m = pick(rng, [-4, -2, 2, 3]);
      const b = 3 + variant;
      const x = 2 + variant;
      const y = m * x + b;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A line is parallel to y = ${m}x - 6 and passes through (${x}, ${y}). What is the y-intercept of the parallel line?`
            : `For y = ${m}x + ${b}, what is y when x = ${x}?`,
        answer: level >= 3 ? b : y,
        skill: "Equations of parallel lines",
        hint:
          level >= 3
            ? "Parallel lines share a slope. Substitute the point into y = mx + b."
            : "Substitute the x-value.",
        explanation:
          level >= 3
            ? `The slope is ${m}. Substituting (${x}, ${y}) gives ${y} = ${m}(${x}) + b, so b = ${b}.`
            : `y = ${m}(${x}) + ${b} = ${y}.`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 4
            ? "A transversal cuts lines ℓ and m. A pair of alternate interior angles are congruent. Which conclusion and theorem complete the proof?"
            : "When two parallel lines are cut by a transversal, which angle pair is always congruent?",
        answers:
          level >= 4
            ? [
                "ℓ ∥ m, Converse of the Alternate Interior Angles Theorem",
                "ℓ ⟂ m, Linear Pair Theorem",
                "ℓ ∥ m, Vertical Angles Theorem",
                "ℓ ⟂ m, Corresponding Angles Theorem",
              ]
            : [
                "Alternate interior angles",
                "Same-side interior angles",
                "A linear pair",
                "Adjacent angles",
              ],
        correct: 0,
        skill: "Proving lines parallel",
        hint:
          level >= 4
            ? "Use the converse of the relationship you are given."
            : "Look on opposite sides of the transversal and inside the lines.",
        explanation:
          level >= 4
            ? "Congruent alternate interior angles imply the two lines are parallel by the converse theorem."
            : "Alternate interior angles are congruent when the lines are parallel.",
      }),
  ];
}

function congruencePack() {
  return [
    (rng, level, variant) => {
      if (level <= 1) {
        return mc(rng, {
          prompt:
            "Which set of facts is enough to prove two triangles congruent by SAS?",
          answers: [
            "Two sides and the included angle",
            "Three angles",
            "Two sides and a non-included angle",
            "One side and one angle",
          ],
          correct: 0,
          skill: "Congruence shortcuts",
          hint: "The A in SAS sits between the two S facts.",
          explanation:
            "SAS requires two corresponding sides and their included angle.",
        });
      }
      const x = 12 + variant;
      const offset = x - 4;
      const a = 2 * x + 4;
      const b = 3 * x - offset;
      return numberQuestion({
        prompt:
          level >= 3
            ? `In isosceles △ABC, AB = AC and m∠B = (2x + 4)° while m∠C = (3x − ${offset})°. After solving for x, what is m∠A?`
            : `In isosceles △ABC, AB = AC and m∠B = (2x + 4)° while m∠C = (3x − ${offset})°. What is x?`,
        answer: level >= 3 ? 180 - a - b : x,
        skill: "Isosceles triangles and algebra",
        hint: "Base angles opposite congruent sides are congruent.",
        explanation: `Set 2x + 4 = 3x - ${offset}, so x = ${x}. The base angles are ${a}° each, so angle A is 180 - 2(${a}) = ${180 - a - b}°.`,
      });
    },
    (rng, level, variant) => {
      const angleA = 38 + variant * 2;
      const angleB = 67 - variant;
      const angleC = 180 - angleA - angleB;
      if (level >= 3) {
        return mc(rng, {
          prompt: `△ABC ≅ △DEF in that order. If m∠A = ${angleA}° and m∠B = ${angleB}°, what is m∠F, and which idea justifies it?`,
          answers: [
            `${angleC}°, Triangle Sum then CPCTC`,
            `${angleB}°, CPCTC only`,
            `${angleA}°, Triangle Sum only`,
            `${180 - angleC}°, Linear Pair then CPCTC`,
          ],
          correct: 0,
          skill: "Triangle sum and CPCTC",
          hint: "Find angle C first, then use the order of the congruence statement.",
          explanation: `Angle C = 180 - ${angleA} - ${angleB} = ${angleC}°. C corresponds to F, so CPCTC gives m∠F = ${angleC}°.`,
        });
      }
      return numberQuestion({
        prompt: `A triangle has angles ${angleA}° and ${angleB}°. What is its third angle?`,
        answer: angleC,
        skill: "Triangle angle sum",
        hint: "Triangle angles total 180°.",
        explanation: `180 - ${angleA} - ${angleB} = ${angleC}°.`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 3
            ? "In △ABC and △DEF, AB ≅ DE, ∠A ≅ ∠D, and ∠B ≅ ∠E. Which theorem proves congruence, and which side pair follows by CPCTC?"
            : "In △ABC and △DEF, AB ≅ DE, ∠A ≅ ∠D, and ∠B ≅ ∠E. Which theorem proves the triangles congruent?",
        answers:
          level >= 3
            ? ["ASA; AC ≅ DF", "SAS; BC ≅ EF", "AAS; AB ≅ DE", "AAA; AC ≅ DF"]
            : ["ASA", "SAS", "SSS", "HL"],
        correct: 0,
        skill: "ASA and CPCTC",
        hint: "AB lies between angles A and B.",
        explanation:
          level >= 3
            ? "Two angles and their included side prove ASA congruence. Vertex order pairs A↔D, B↔E, C↔F, so AC ≅ DF by CPCTC."
            : "The known side is included between the two known angles, so ASA applies.",
      }),
    (rng, level, variant) => {
      const x = 5 + variant;
      const side = 4 * x + 3;
      if (level >= 4) {
        return mc(rng, {
          prompt: `To prove △ABC ≅ △ADC, you know AB ≅ AD and ∠BAC ≅ ∠DAC. Which additional fact and reason completes an SAS proof?`,
          answers: [
            "AC ≅ AC by the Reflexive Property",
            "BC ≅ DC because the diagram looks symmetric",
            "∠BCA ≅ ∠DCA by CPCTC",
            "∠ABC ≅ ∠ADC by the Vertical Angles Theorem",
          ],
          correct: 0,
          skill: "Triangle proof structure",
          hint: "The triangles share a side.",
          explanation:
            "AC is congruent to itself by the Reflexive Property. With AB ≅ AD and the included angles, SAS proves the triangles congruent.",
        });
      }
      return numberQuestion({
        prompt: `△ABC ≅ △DEF. Corresponding sides AC and DF measure (4x + 3) cm and ${side} cm. What is x?`,
        answer: x,
        skill: "Congruent corresponding parts",
        hint: "Corresponding sides of congruent triangles are equal.",
        explanation: `4x + 3 = ${side}, so 4x = ${side - 3} and x = ${x}.`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 4
            ? "A student says SSA always proves triangle congruence. Which fact best explains why the claim is false?"
            : "Which information does NOT always prove two triangles congruent?",
        answers:
          level >= 4
            ? [
                "The same SSA data can sometimes create two different triangles.",
                "SSA is another name for SAS.",
                "Any two sides determine every triangle.",
                "Angles never help prove congruence.",
              ]
            : ["SSA", "SSS", "SAS", "ASA"],
        correct: 0,
        skill: "Valid congruence reasoning",
        hint: "Think about the ambiguous case.",
        explanation:
          "SSA has an ambiguous case and can produce two noncongruent triangles, so it is not a general congruence theorem.",
      }),
  ];
}

function triangleRelationsPack() {
  return [
    (rng, level, variant) => {
      const base = 16 + 2 * variant + 2 * int(rng, 0, 5);
      return numberQuestion({
        prompt:
          level >= 3
            ? `A triangle midsegment is ${base / 2} cm. A second triangle is similar with scale factor 1.5. What is the length of the side parallel to the corresponding midsegment in the second triangle?`
            : `A triangle has a side of ${base} cm. What is the length of the midsegment parallel to that side?`,
        answer: level >= 3 ? base * 1.5 : base / 2,
        skill: "Triangle midsegments",
        hint: "A midsegment is half its parallel side.",
        explanation:
          level >= 3
            ? `The original parallel side is 2(${base / 2}) = ${base} cm, then ${base} × 1.5 = ${base * 1.5} cm.`
            : `The midsegment is half the parallel side: ${base} ÷ 2 = ${base / 2} cm.`,
      });
    },
    (rng, level, variant) => {
      const short = 4 + variant;
      const whole = 3 * short;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A centroid divides a median into a 2:1 ratio. The shorter piece is ${short} cm. What is the distance from the vertex to the centroid?`
            : `A median is ${whole} cm long. How far is the centroid from the vertex along that median?`,
        answer: level >= 3 ? 2 * short : (2 * whole) / 3,
        skill: "Centroids and medians",
        hint: "The vertex-to-centroid piece is twice the shorter piece.",
        explanation:
          level >= 3
            ? `The 2:1 ratio makes the longer piece 2(${short}) = ${2 * short} cm.`
            : `The centroid is two-thirds of the way from the vertex: (2/3)(${whole}) = ${(2 * whole) / 3} cm.`,
      });
    },
    (rng, level, variant) => {
      const a = 7 + variant;
      const b = 10 + variant;
      return mc(rng, {
        prompt:
          level >= 3
            ? `Two sides of a triangle are ${a} and ${b}. Which integer value could be the third side and also make it the longest side?`
            : `Two sides of a triangle are ${a} and ${b}. Which value could be the third side?`,
        answers:
          level >= 3
            ? [String(b + 2), String(a + b), String(b - a), String(a + b + 1)]
            : [String(b), String(a + b), String(b - a), String(a + b + 4)],
        correct: 0,
        skill: "Triangle inequality",
        hint: "The third side must be greater than the difference and less than the sum.",
        explanation: `${Math.abs(b - a)} < third side < ${a + b}. The listed valid choice also satisfies the extra condition.`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 3
            ? "Point P is equidistant from vertices A, B, and C of a triangle. Which construction lines meet at P, and what is P called?"
            : "Which triangle center is equidistant from all three vertices?",
        answers:
          level >= 3
            ? [
                "Perpendicular bisectors; circumcenter",
                "Angle bisectors; incenter",
                "Medians; centroid",
                "Altitudes; orthocenter",
              ]
            : ["Circumcenter", "Incenter", "Centroid", "Orthocenter"],
        correct: 0,
        skill: "Triangle centers",
        hint: "Think about the center of a circumscribed circle.",
        explanation:
          "Perpendicular bisectors meet at the circumcenter, which is equidistant from the triangle's vertices.",
      }),
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 4
            ? "To prove indirectly that no triangle has sides 4, 6, and 11, what contradiction should the proof reach?"
            : "Which side set cannot form a triangle?",
        answers:
          level >= 4
            ? [
                "4 + 6 is not greater than 11",
                "4 + 11 is greater than 6",
                "6 + 11 is greater than 4",
                "The sides are all different",
              ]
            : ["4, 6, 11", "4, 6, 8", "5, 5, 7", "7, 8, 9"],
        correct: 0,
        skill: "Indirect proof and triangle inequality",
        hint: "The two shorter sides must sum to more than the longest.",
        explanation:
          "A triangle requires 4 + 6 > 11, but 10 is not greater than 11, which is the contradiction.",
      }),
  ];
}

function quadrilateralsPack() {
  return [
    (rng, level, variant) => {
      const sides = 5 + (variant % 5);
      const sum = (sides - 2) * 180;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A regular ${sides}-gon has interior-angle sum ${sum}°. What is one exterior angle?`
            : `What is the interior-angle sum of a ${sides}-gon?`,
        answer: level >= 3 ? 360 / sides : sum,
        skill: "Polygon angles",
        hint:
          level >= 3
            ? "Regular exterior angles share 360° equally."
            : "Use (n − 2) × 180°.",
        explanation:
          level >= 3
            ? `360 ÷ ${sides} = ${360 / sides}°.`
            : `(${sides} - 2)180 = ${sum}°.`,
      });
    },
    (rng, level, variant) => {
      const x = 6 + variant;
      const side = 3 * x + 2;
      return numberQuestion({
        prompt:
          level >= 3
            ? `In parallelogram ABCD, AB = (3x + 2) cm and CD = ${side} cm. After finding x, what is AB + CD?`
            : `In parallelogram ABCD, AB = (3x + 2) cm and CD = ${side} cm. What is x?`,
        answer: level >= 3 ? 2 * side : x,
        skill: "Parallelogram properties",
        hint: "Opposite sides of a parallelogram are congruent.",
        explanation: `3x + 2 = ${side}, so x = ${x} and each side is ${side} cm${level >= 3 ? `; their sum is ${2 * side} cm` : ""}.`,
      });
    },
    (rng, level, variant) => {
      const base1 = 8 + 2 * variant;
      const base2 = 18 + 2 * variant;
      const mid = (base1 + base2) / 2;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A trapezoid has bases ${base1} cm and ${base2} cm. A similar trapezoid has scale factor 2. What is the similar trapezoid's midsegment length?`
            : `A trapezoid has bases ${base1} cm and ${base2} cm. What is its midsegment length?`,
        answer: level >= 3 ? 2 * mid : mid,
        skill: "Trapezoid midsegments",
        hint: "Average the bases, then apply any scale factor.",
        explanation: `The original midsegment is (${base1} + ${base2})/2 = ${mid} cm${level >= 3 ? `, and scaling by 2 gives ${2 * mid} cm` : ""}.`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 4
            ? "A quadrilateral's diagonals bisect each other and are congruent. Which most specific classification is guaranteed?"
            : "Which property is always true of a rhombus?",
        answers:
          level >= 4
            ? ["Rectangle", "Rhombus", "Kite", "Trapezoid"]
            : [
                "All four sides are congruent",
                "All four angles are right",
                "Diagonals are congruent",
                "Exactly one pair of sides is parallel",
              ],
        correct: 0,
        skill: "Classifying quadrilaterals",
        hint:
          level >= 4
            ? "Bisecting diagonals give a parallelogram; congruent diagonals narrow it further."
            : "Use the defining side property.",
        explanation:
          level >= 4
            ? "Diagonals that bisect each other make a parallelogram; congruent diagonals make that parallelogram a rectangle."
            : "A rhombus is defined as a quadrilateral with four congruent sides.",
      }),
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 3
            ? "A quadrilateral has vertices (0,0), (4,0), (5,3), and (1,3). Which calculation best proves it is a parallelogram?"
            : "Which quadrilateral has exactly one pair of parallel sides in its basic definition?",
        answers:
          level >= 3
            ? [
                "Both pairs of opposite sides have equal slopes.",
                "Its diagonals have different lengths.",
                "All four sides have different slopes.",
                "It has one right angle.",
              ]
            : ["Trapezoid", "Parallelogram", "Rectangle", "Square"],
        correct: 0,
        skill: "Coordinate proofs",
        hint:
          level >= 3
            ? "Parallel segments have equal slopes."
            : "Think of the one-pair definition.",
        explanation:
          level >= 3
            ? "AB and CD both have slope 0; BC and DA both have slope 3/1. Both opposite pairs are parallel."
            : "A trapezoid is defined here as having exactly one pair of parallel sides.",
      }),
  ];
}

function similarityPack() {
  return [
    (rng, level, variant) => {
      const scale = 2 + (variant % 3);
      const original = 4 + variant;
      const image = original * scale;
      return numberQuestion({
        prompt:
          level >= 3
            ? `Two similar polygons have corresponding sides ${original} and ${image}. If the smaller area is ${original * 3} square units, what is the larger area?`
            : `A figure is dilated by scale factor ${scale}. A side is ${original} units. What is its image length?`,
        answer: level >= 3 ? original * 3 * scale * scale : image,
        skill: "Similarity scale factors",
        hint:
          level >= 3
            ? "Area uses the square of the side scale factor."
            : "Multiply by the scale factor.",
        explanation:
          level >= 3
            ? `The side scale is ${image}/${original} = ${scale}; area scales by ${scale}² = ${scale * scale}, so ${original * 3} × ${scale * scale} = ${original * 3 * scale * scale}.`
            : `${original} × ${scale} = ${image} units.`,
      });
    },
    (rng, level, variant) => {
      const smallA = 3 + variant;
      const smallB = 5 + variant;
      const factor = 2 + (variant % 2);
      return numberQuestion({
        prompt:
          level >= 3
            ? `Two triangles are similar. The smaller has sides ${smallA}, ${smallB}, and ${smallA + 3}; the larger side corresponding to ${smallA} is ${smallA * factor}. What is the larger triangle's perimeter?`
            : `Two triangles are similar. A side of ${smallA} corresponds to ${smallA * factor}. What is the scale factor from smaller to larger?`,
        answer: level >= 3 ? factor * (smallA + smallB + smallA + 3) : factor,
        skill: "Similar triangles",
        hint: "Find the common multiplier between corresponding sides.",
        explanation:
          level >= 3
            ? `The scale factor is ${factor}; the smaller perimeter is ${smallA + smallB + smallA + 3}, so the larger perimeter is ${factor * (smallA + smallB + smallA + 3)}.`
            : `${smallA * factor}/${smallA} = ${factor}.`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 3
            ? "Two triangles have one pair of vertical angles and one pair of congruent alternate interior angles. Which reasoning proves them similar?"
            : "Which condition is enough to prove two triangles similar?",
        answers:
          level >= 3
            ? [
                "AA similarity",
                "SSS congruence",
                "HL congruence",
                "SSA similarity",
              ]
            : ["AA", "SSA", "One equal side", "Equal perimeters"],
        correct: 0,
        skill: "Similarity proofs",
        hint: "Two angle pairs determine triangle similarity.",
        explanation:
          "Two pairs of congruent corresponding angles prove triangles similar by AA.",
      }),
    (rng, level, variant) => {
      const person = 5 + variant;
      const shadow = 3 + variant;
      const treeShadow = 12 + 2 * variant;
      const height = (person * treeShadow) / shadow;
      return numberQuestion({
        prompt: `A ${person}-ft person casts a ${shadow}-ft shadow. At the same time, a tree casts a ${treeShadow}-ft shadow. How tall is the tree?`,
        answer: height,
        skill: "Indirect measurement",
        hint: "Set up equal height-to-shadow ratios.",
        explanation: `${person}/${shadow} = h/${treeShadow}; h = ${person}(${treeShadow})/${shadow} = ${height} ft.`,
        tolerance: 0.01,
        label: `${height} ft`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 4
            ? "△ABC ∼ △DEF with scale factor 3 from ABC to DEF. Which statement about their areas and perimeters is true?"
            : "If two polygons are similar, which statement must be true?",
        answers:
          level >= 4
            ? [
                "Perimeter factor 3; area factor 9",
                "Perimeter factor 9; area factor 3",
                "Both factors 3",
                "Both factors 9",
              ]
            : [
                "Corresponding angles are congruent.",
                "Corresponding sides are congruent.",
                "Their areas are equal.",
                "Their perimeters are equal.",
              ],
        correct: 0,
        skill: "Similarity consequences",
        hint:
          level >= 4
            ? "Lengths scale by k; areas by k²."
            : "Similarity preserves shape, not necessarily size.",
        explanation:
          level >= 4
            ? "Perimeter is a length, so it scales by 3; area scales by 3² = 9."
            : "Similar polygons have congruent corresponding angles and proportional corresponding sides.",
      }),
  ];
}

function rightTrianglePack() {
  const triples = [
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
    [7, 24, 25],
  ];
  return [
    (rng, level, variant) => {
      const [a, b, c] = pick(rng, triples);
      const scale = 1 + (variant % 3);
      if (level >= 3) {
        const perimeter = (a + b + c) * scale;
        return numberQuestion({
          prompt: `A right triangle has legs ${a * scale} and ${b * scale}. What is its perimeter?`,
          answer: perimeter,
          skill: "Pythagorean Theorem",
          hint: "Find the hypotenuse, then add all three sides.",
          explanation: `The hypotenuse is ${c * scale} because ${a}-${b}-${c} is a Pythagorean triple. Perimeter = ${a * scale} + ${b * scale} + ${c * scale} = ${perimeter}.`,
        });
      }
      return numberQuestion({
        prompt: `A right triangle has legs ${a * scale} and ${b * scale}. What is the hypotenuse?`,
        answer: c * scale,
        skill: "Pythagorean Theorem",
        hint: "Use a² + b² = c².",
        explanation: `√(${a * scale}² + ${b * scale}²) = ${c * scale}.`,
      });
    },
    (rng, level, variant) => {
      const short = 4 + variant;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A 30-60-90 triangle has short leg ${short}. What is the sum of the short leg and hypotenuse?`
            : `A 30-60-90 triangle has short leg ${short}. What is its hypotenuse?`,
        answer: level >= 3 ? 3 * short : 2 * short,
        skill: "Special right triangles",
        hint: "The side ratio is 1 : √3 : 2.",
        explanation: `The hypotenuse is 2(${short}) = ${2 * short}${level >= 3 ? `, so the requested sum is ${short} + ${2 * short} = ${3 * short}` : ""}.`,
      });
    },
    (rng, level, variant) => {
      const opposite = 3 + variant;
      const adjacent = 4 + variant;
      const angle = (Math.atan(opposite / adjacent) * 180) / Math.PI;
      return numberQuestion({
        prompt: `In a right triangle, relative to angle θ, the opposite leg is ${opposite} and the adjacent leg is ${adjacent}. What is θ to the nearest tenth of a degree?`,
        answer: Number(angle.toFixed(1)),
        skill: "Tangent ratio",
        hint: "Use tan θ = opposite/adjacent, then inverse tangent.",
        explanation: `θ = tan⁻¹(${opposite}/${adjacent}) ≈ ${angle.toFixed(1)}°.`,
        tolerance: 0.1,
        label: `${angle.toFixed(1)}°`,
      });
    },
    (rng, level, variant) => {
      const x1 = -2 - variant;
      const y1 = 1;
      const dx = 3 * (1 + (variant % 2));
      const dy = 4 * (1 + (variant % 2));
      return numberQuestion({
        prompt:
          level >= 3
            ? `Points A(${x1}, ${y1}) and B(${x1 + dx}, ${y1 + dy}) are endpoints of a segment. What is the perimeter of the right triangle whose legs are the horizontal and vertical changes and whose hypotenuse is AB?`
            : `What is the distance between A(${x1}, ${y1}) and B(${x1 + dx}, ${y1 + dy})?`,
        answer: level >= 3 ? dx + dy + Math.hypot(dx, dy) : Math.hypot(dx, dy),
        skill: "Distance formula",
        hint: "The coordinate changes form the legs of a right triangle.",
        explanation: `The changes are ${dx} and ${dy}, so AB = √(${dx}² + ${dy}²) = ${Math.hypot(dx, dy)}${level >= 3 ? ` and the perimeter is ${dx + dy + Math.hypot(dx, dy)}` : ""}.`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 4
            ? "A triangle has side lengths 7, 9, and 12. Which law should be used first to find the angle opposite the side of length 12?"
            : "Which ratio equals sin θ in a right triangle?",
        answers:
          level >= 4
            ? [
                "Law of Cosines",
                "Law of Sines",
                "Pythagorean Theorem only",
                "Tangent ratio only",
              ]
            : [
                "opposite/hypotenuse",
                "adjacent/hypotenuse",
                "opposite/adjacent",
                "hypotenuse/opposite",
              ],
        correct: 0,
        skill: level >= 4 ? "Law of Cosines" : "Trig ratios",
        hint:
          level >= 4
            ? "You know all three sides and need an angle."
            : "Remember SOH.",
        explanation:
          level >= 4
            ? "With SSS information and an unknown angle, begin with the Law of Cosines."
            : "Sine is opposite over hypotenuse.",
      }),
  ];
}

function transformationsPack() {
  return [
    (rng, level, variant) => {
      const x = -4 + variant;
      const y = 2 + variant;
      const dx = 5;
      const dy = -3;
      return numberQuestion({
        prompt:
          level >= 3
            ? `Point P(${x}, ${y}) is translated by ⟨${dx}, ${dy}⟩, then reflected across the y-axis. What is the final x-coordinate?`
            : `Point P(${x}, ${y}) is translated by ⟨${dx}, ${dy}⟩. What is the new x-coordinate?`,
        answer: level >= 3 ? -(x + dx) : x + dx,
        skill: "Translations and reflections",
        hint: "Apply transformations in the order given.",
        explanation:
          level >= 3
            ? `Translation gives (${x + dx}, ${y + dy}); reflection across the y-axis gives (${-(x + dx)}, ${y + dy}).`
            : `Add ${dx} to the x-coordinate: ${x} + ${dx} = ${x + dx}.`,
      });
    },
    (rng, level, variant) => {
      const x = 2 + variant;
      const y = 5 + variant;
      return mc(rng, {
        prompt:
          level >= 3
            ? `Point (${x}, ${y}) is rotated 90° counterclockwise about the origin, then reflected across the x-axis. What is the result?`
            : `What is the image of (${x}, ${y}) after a 90° counterclockwise rotation about the origin?`,
        answers:
          level >= 3
            ? [
                `(${-y}, ${-x})`,
                `(${y}, ${x})`,
                `(${-y}, ${x})`,
                `(${y}, ${-x})`,
              ]
            : [
                `(${-y}, ${x})`,
                `(${y}, ${-x})`,
                `(${-x}, ${-y})`,
                `(${x}, ${-y})`,
              ],
        correct: 0,
        skill: "Rotations",
        hint: "For 90° CCW, (x,y) → (−y,x).",
        explanation:
          level >= 3
            ? `Rotate to (${-y}, ${x}), then reflect over the x-axis to (${-y}, ${-x}).`
            : `The 90° counterclockwise rule gives (${-y}, ${x}).`,
      });
    },
    (rng, level, variant) => {
      const factor = 2 + (variant % 3);
      const x = 3 + variant;
      const y = -2 - variant;
      return numberQuestion({
        prompt:
          level >= 3
            ? `Point A(${x}, ${y}) is dilated by factor ${factor} about the origin, then translated 4 units right. What is the final x-coordinate?`
            : `Point A(${x}, ${y}) is dilated by factor ${factor} about the origin. What is the image's x-coordinate?`,
        answer: level >= 3 ? factor * x + 4 : factor * x,
        skill: "Dilations",
        hint: "Multiply coordinates by the scale factor before translating.",
        explanation: `Dilation gives x = ${factor}(${x}) = ${factor * x}${level >= 3 ? `, then translation gives ${factor * x} + 4 = ${factor * x + 4}` : ""}.`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 4
            ? "Which composition is always equivalent to a 180° rotation about the intersection of two perpendicular lines?"
            : "Which transformation preserves distances and angle measures?",
        answers:
          level >= 4
            ? [
                "Reflections across the two perpendicular lines",
                "A dilation followed by a translation",
                "Two reflections across parallel lines",
                "A nonuniform stretch",
              ]
            : [
                "Rotation",
                "Dilation with factor 2",
                "Horizontal stretch",
                "Vertical stretch",
              ],
        correct: 0,
        skill: "Transformation composition",
        hint:
          level >= 4
            ? "Two intersecting reflections make a rotation twice the angle between the lines."
            : "Rigid motions preserve size and shape.",
        explanation:
          level >= 4
            ? "Two reflections across intersecting lines make a rotation by twice their angle; twice 90° is 180°."
            : "A rotation is a rigid motion, so it preserves lengths and angles.",
      }),
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 3
            ? "A regular hexagon is rotated about its center. What is the smallest positive rotation that maps it onto itself, followed by a reflection that reverses orientation?"
            : "What is the smallest positive rotational symmetry angle of a regular hexagon?",
        answers:
          level >= 3
            ? [
                "60°, then any line of symmetry",
                "45°, then a translation",
                "90°, then a dilation",
                "120°, with no reflection possible",
              ]
            : ["60°", "45°", "90°", "120°"],
        correct: 0,
        skill: "Symmetry",
        hint: "Divide 360° by the number of equal positions.",
        explanation:
          "A regular hexagon has six rotational positions, so 360/6 = 60°. A reflection across a symmetry line reverses orientation.",
      }),
  ];
}

function areaPack() {
  return [
    (rng, level, variant) => {
      const base = 8 + 2 * variant;
      const height = 5 + variant;
      const area = (base * height) / 2;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A triangle has area ${area} square units and base ${base}. A similar triangle has scale factor 2. What is the similar triangle's area?`
            : `What is the area of a triangle with base ${base} and height ${height}?`,
        answer: level >= 3 ? area * 4 : area,
        skill: "Triangle area",
        hint:
          level >= 3
            ? "Area scales by the square of the length factor."
            : "Use one half times base times height.",
        explanation:
          level >= 3
            ? `Scale factor 2 gives area factor 4, so ${area} × 4 = ${area * 4}.`
            : `A = 1/2(${base})(${height}) = ${area}.`,
      });
    },
    (rng, level, variant) => {
      const radius = 3 + variant;
      const angle = pick(rng, [60, 90, 120, 180]);
      const coefficient = (angle / 360) * radius * radius;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A circle has radius ${radius}. A ${angle}° sector is removed. What is the remaining area, as a coefficient of π?`
            : `A circle has radius ${radius}. What is its area as a coefficient of π?`,
        answer: level >= 3 ? radius * radius - coefficient : radius * radius,
        skill: "Circle and sector area",
        hint:
          level >= 3
            ? "Find the sector fraction, then subtract from the whole circle."
            : "Use πr² and enter only the coefficient of π.",
        explanation:
          level >= 3
            ? `Whole area is ${radius * radius}π; sector area is (${angle}/360)(${radius * radius})π = ${coefficient}π, leaving ${radius * radius - coefficient}π.`
            : `π(${radius})² = ${radius * radius}π, so the coefficient is ${radius * radius}.`,
        tolerance: 0.01,
        label: `${level >= 3 ? radius * radius - coefficient : radius * radius}π square units`,
      });
    },
    (rng, level, variant) => {
      const radius = 4 + variant;
      const angle = pick(rng, [45, 60, 90, 120]);
      const coefficient = (angle / 360) * 2 * radius;
      return numberQuestion({
        prompt: `A circle has radius ${radius}. What is the length of a ${angle}° arc, as a coefficient of π?`,
        answer: coefficient,
        skill: "Arc length",
        hint: "Multiply the circumference by angle/360.",
        explanation: `Arc length = (${angle}/360)(2π·${radius}) = ${coefficient}π, so the coefficient is ${coefficient}.`,
        tolerance: 0.01,
        label: `${coefficient}π units`,
      });
    },
    (rng, level, variant) => {
      const sides = pick(rng, [4, 6, 8, 10]);
      const side = 4 + variant;
      const apothem = 3 + variant;
      const area = (sides * side * apothem) / 2;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A regular ${sides}-gon has side length ${side} and apothem ${apothem}. What is its area?`
            : `A regular ${sides}-gon has side length ${side}. What is its perimeter?`,
        answer: level >= 3 ? area : sides * side,
        skill: "Regular polygons",
        hint:
          level >= 3
            ? "Use A = 1/2(apothem)(perimeter)."
            : "Multiply side length by number of sides.",
        explanation:
          level >= 3
            ? `P = ${sides}(${side}) = ${sides * side}; A = 1/2(${apothem})(${sides * side}) = ${area}.`
            : `P = ${sides}(${side}) = ${sides * side}.`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 4
            ? "Two similar polygons have perimeter ratio 3:5. What is their area ratio, smaller to larger?"
            : "If a polygon's side lengths are doubled, what happens to its area?",
        answers:
          level >= 4
            ? ["9:25", "3:5", "6:10", "27:125"]
            : [
                "It becomes 4 times as large.",
                "It doubles.",
                "It stays the same.",
                "It becomes 8 times as large.",
              ],
        correct: 0,
        skill: "Area scale factors",
        hint: "Square the length ratio.",
        explanation:
          level >= 4
            ? "Area ratio is the square of the side ratio: 3²:5² = 9:25."
            : "Area scales by the square of the side factor: 2² = 4.",
      }),
  ];
}

function solidsPack() {
  return [
    (rng, level, variant) => {
      const r = 3 + variant;
      const h = 5 + variant;
      const coeff = r * r * h;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A cylinder has radius ${r} and height ${h}. A cone has the same base and height. What is cylinder volume minus cone volume, as a coefficient of π?`
            : `A cylinder has radius ${r} and height ${h}. What is its volume as a coefficient of π?`,
        answer: level >= 3 ? (2 * coeff) / 3 : coeff,
        skill: "Cylinder and cone volume",
        hint: "Cylinder: πr²h. Cone: one third of that.",
        explanation:
          level >= 3
            ? `Cylinder is ${coeff}π; cone is ${coeff / 3}π; difference is ${(2 * coeff) / 3}π.`
            : `V = π(${r})²(${h}) = ${coeff}π.`,
        tolerance: 0.01,
      });
    },
    (rng, level, variant) => {
      const l = 4 + variant;
      const w = 3 + variant;
      const h = 6 + variant;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A rectangular prism measures ${l} by ${w} by ${h}. If every dimension is doubled, what is the new volume?`
            : `What is the volume of a rectangular prism measuring ${l} by ${w} by ${h}?`,
        answer: level >= 3 ? 8 * l * w * h : l * w * h,
        skill: "Prism volume",
        hint:
          level >= 3
            ? "Doubling all lengths multiplies volume by 2³."
            : "Multiply length, width, and height.",
        explanation:
          level >= 3
            ? `Original volume is ${l * w * h}; doubled dimensions multiply volume by 8, giving ${8 * l * w * h}.`
            : `${l} × ${w} × ${h} = ${l * w * h}.`,
      });
    },
    (rng, level, variant) => {
      const r = 3 + variant;
      const coeff = 4 * r * r;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A sphere has radius ${r}. What is its surface area as a coefficient of π?`
            : `A sphere has radius ${r}. What is its diameter?`,
        answer: level >= 3 ? coeff : 2 * r,
        skill: "Spheres",
        hint:
          level >= 3
            ? "Surface area is 4πr²."
            : "Diameter is twice the radius.",
        explanation:
          level >= 3 ? `4π(${r})² = ${coeff}π.` : `2(${r}) = ${2 * r}.`,
      });
    },
    (rng, level, variant) => {
      const side = 4 + variant;
      const height = 6 + variant;
      const base = side * side;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A square pyramid has base side ${side} and height ${height}. A prism has the same base and height. What is prism volume minus pyramid volume?`
            : `A square pyramid has base side ${side} and height ${height}. What is its volume?`,
        answer: level >= 3 ? (2 * base * height) / 3 : (base * height) / 3,
        skill: "Pyramid volume",
        hint: "A pyramid is one third of a prism with the same base and height.",
        explanation:
          level >= 3
            ? `Prism volume is ${base * height}; pyramid volume is ${(base * height) / 3}; difference is ${(2 * base * height) / 3}.`
            : `V = (1/3)(${base})(${height}) = ${(base * height) / 3}.`,
        tolerance: 0.01,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 4
            ? "Two similar solids have volume ratio 27:64. What is their corresponding length ratio?"
            : "If all dimensions of a solid are multiplied by 3, by what factor does volume change?",
        answers:
          level >= 4
            ? ["3:4", "9:16", "27:64", "√27:√64"]
            : ["27", "9", "3", "6"],
        correct: 0,
        skill: "Similar solids",
        hint: "Volume uses the cube of the length scale.",
        explanation:
          level >= 4
            ? "Take cube roots: ∛27:∛64 = 3:4."
            : "Volume factor is 3³ = 27.",
      }),
  ];
}

function circlesPack() {
  return [
    (rng, level, variant) => {
      const arc = 80 + 10 * variant;
      return numberQuestion({
        prompt:
          level >= 3
            ? `An inscribed angle intercepts an arc of ${arc}°. A second inscribed angle intercepts the remaining major arc. What is the sum of the two inscribed angles?`
            : `An inscribed angle intercepts an arc of ${arc}°. What is the angle's measure?`,
        answer: level >= 3 ? 180 : arc / 2,
        skill: "Inscribed angles",
        hint: "An inscribed angle is half its intercepted arc.",
        explanation:
          level >= 3
            ? `The arcs total 360°, so the two inscribed angles total half of 360°, which is 180°.`
            : `${arc}/2 = ${arc / 2}°.`,
      });
    },
    (rng, level, variant) => {
      const tangent = 8 + variant;
      return mc(rng, {
        prompt:
          level >= 3
            ? `A radius to a point of tangency is perpendicular to a tangent segment of length ${tangent}. Which theorem lets you form a right triangle to find the distance from the center to the tangent's other endpoint?`
            : "What angle does a radius form with a tangent at the point of tangency?",
        answers:
          level >= 3
            ? [
                "Radius-Tangent Theorem",
                "Inscribed Angle Theorem",
                "Chord-Chord Product Theorem",
                "Arc Addition Postulate",
              ]
            : ["90°", "45°", "60°", "180°"],
        correct: 0,
        skill: "Tangents",
        hint: "A tangent is perpendicular to the radius at contact.",
        explanation:
          level >= 3
            ? "The Radius-Tangent Theorem supplies the right angle needed for a Pythagorean calculation."
            : "A radius is perpendicular to a tangent at the point of tangency, so the angle is 90°.",
      });
    },
    (rng, level, variant) => {
      const a = 3 + variant;
      const b = 8 + variant;
      const c = 4;
      const d = (a * b) / c;
      return numberQuestion({
        prompt: `Two chords intersect inside a circle. One chord is split into lengths ${a} and ${b}; the other into ${c} and x. What is x?`,
        answer: d,
        skill: "Intersecting chords",
        hint: "Multiply the two pieces of each chord.",
        explanation: `${a}(${b}) = ${c}x, so x = ${a * b}/${c} = ${d}.`,
        tolerance: 0.01,
      });
    },
    (rng, level, variant) => {
      const cx = 2 + variant;
      const cy = -3 - variant;
      const r = 5 + variant;
      return numberQuestion({
        prompt:
          level >= 3
            ? `A circle has equation (x − ${cx})² + (y + ${Math.abs(cy)})² = ${r * r}. What is the sum of its center coordinates and radius?`
            : `A circle has equation (x − ${cx})² + (y + ${Math.abs(cy)})² = ${r * r}. What is its radius?`,
        answer: level >= 3 ? cx + cy + r : r,
        skill: "Equations of circles",
        hint: "Use (x − h)² + (y − k)² = r²; watch the sign inside the y-parenthesis.",
        explanation: `The center is (${cx}, ${cy}) and radius is ${r}${level >= 3 ? `, so ${cx} + (${cy}) + ${r} = ${cx + cy + r}` : ""}.`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 4
            ? "Two secants meet outside a circle. The first has external part 3 and whole length 12. The second has external part 4 and whole length x. Which equation and value are correct?"
            : "Which relationship is used for two chords intersecting inside a circle?",
        answers:
          level >= 4
            ? [
                "3(12) = 4x, so x = 9",
                "3 + 12 = 4 + x, so x = 11",
                "3(9) = 4x, so x = 6.75",
                "12/3 = x/4, so x = 16",
              ]
            : [
                "part × part = part × part",
                "part + part = part + part",
                "arc ÷ 2 = chord",
                "radius × radius = chord",
              ],
        correct: 0,
        skill: "Secant and chord products",
        hint:
          level >= 4
            ? "External × whole equals external × whole."
            : "Use the product of the two pieces on each chord.",
        explanation:
          level >= 4
            ? "For two secants, external × whole is equal: 3·12 = 4x, so x = 9."
            : "Intersecting chords satisfy (one part)(other part) = (one part)(other part).",
      }),
  ];
}

function algebraPreviewPack() {
  return [
    (rng, level, variant) => {
      const r1 = 2 + variant;
      const r2 = -3 - variant;
      const sum = r1 + r2;
      const product = r1 * r2;
      return mc(rng, {
        prompt:
          level >= 3
            ? `Which quadratic has roots ${r1} and ${r2}?`
            : `What is the sum of the roots of x² − (${sum})x + (${product}) = 0?`,
        answers:
          level >= 3
            ? [
                `x² − (${sum})x + (${product}) = 0`,
                `x² + (${sum})x + (${product}) = 0`,
                `x² − (${product})x + (${sum}) = 0`,
                `x² + (${product})x − (${sum}) = 0`,
              ]
            : [String(sum), String(product), String(-sum), String(-product)],
        correct: 0,
        skill: "Quadratic equations",
        hint:
          level >= 3
            ? "Expand (x − r₁)(x − r₂)."
            : "For x² − sx + p, the root sum is s.",
        explanation:
          level >= 3
            ? `(x - ${r1})(x - (${r2})) expands to x² - (${sum})x + (${product}).`
            : `The sum of roots is ${sum}.`,
      });
    },
    (rng, level, variant) => {
      const h = 2 + variant;
      const k = -3 + variant;
      return mc(rng, {
        prompt: `What is the vertex of y = (x − ${h})² ${k >= 0 ? "+" : "−"} ${Math.abs(k)}?`,
        answers: [
          `(${h}, ${k})`,
          `(${-h}, ${k})`,
          `(${h}, ${-k})`,
          `(${-h}, ${-k})`,
        ],
        correct: 0,
        skill: "Quadratic vertex form",
        hint: "Vertex form is y = (x − h)² + k.",
        explanation: `The vertex is (h,k) = (${h}, ${k}).`,
      });
    },
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 3
            ? "Which angle is coterminal with 5π/3 and lies between 2π and 4π?"
            : "Convert 150° to radians.",
        answers:
          level >= 3
            ? ["11π/3", "7π/3", "5π/6", "−π/3"]
            : ["5π/6", "3π/5", "5π/3", "6π/5"],
        correct: 0,
        skill: "Radians and coterminal angles",
        hint: level >= 3 ? "Add 2π." : "Multiply degrees by π/180.",
        explanation:
          level >= 3
            ? "5π/3 + 2π = 5π/3 + 6π/3 = 11π/3."
            : "150(π/180) simplifies to 5π/6.",
      }),
    (rng, level) =>
      mc(rng, {
        prompt:
          level >= 3
            ? "On the unit circle, what are the coordinates at angle 7π/6?"
            : "On the unit circle, which coordinate equals cos θ?",
        answers:
          level >= 3
            ? ["(−√3/2, −1/2)", "(√3/2, 1/2)", "(−1/2, −√3/2)", "(√3/2, −1/2)"]
            : ["x-coordinate", "y-coordinate", "radius", "slope only"],
        correct: 0,
        skill: "Unit circle",
        hint:
          level >= 3
            ? "7π/6 is 210°, with reference angle 30° in Quadrant III."
            : "A unit-circle point is (cos θ, sin θ).",
        explanation:
          level >= 3
            ? "At 210°, both coordinates are negative, with 30° reference values √3/2 and 1/2."
            : "The unit-circle point is (cos θ, sin θ), so cosine is the x-coordinate.",
      }),
    (rng, level, variant) => {
      const n = 3 + variant;
      return numberQuestion({
        prompt:
          level >= 4
            ? `A quadratic has vertex (${n}, -4) and passes through (${n + 2}, 8). In y = a(x − ${n})² − 4, what is a?`
            : `Solve x² = ${n * n}. Enter the positive solution.`,
        answer: level >= 4 ? 3 : n,
        skill: "Quadratic reasoning",
        hint:
          level >= 4
            ? "Substitute the point and solve for a."
            : "Take the positive square root.",
        explanation:
          level >= 4
            ? `8 = a(2)² - 4, so 12 = 4a and a = 3.`
            : `The positive square root of ${n * n} is ${n}.`,
      });
    },
  ];
}

const packByUnit = {
  "chapter-1": basicsPack,
  "chapter-2": reasoningPack,
  "chapter-3": linesPack,
  "chapter-4": congruencePack,
  "chapter-5": triangleRelationsPack,
  "chapter-6": quadrilateralsPack,
  "chapter-7": similarityPack,
  "chapter-8": rightTrianglePack,
  "chapter-9": transformationsPack,
  "chapter-10": areaPack,
  "chapter-11": solidsPack,
  "chapter-12": circlesPack,
  "chapter-13": algebraPreviewPack,
};

function generatorsForUnit(unitId) {
  if (unitId === "semester-1") {
    return [
      basicsPack,
      reasoningPack,
      linesPack,
      congruencePack,
      triangleRelationsPack,
      quadrilateralsPack,
    ].flatMap((factory) => factory());
  }
  if (unitId === "semester-2") {
    return [
      similarityPack,
      rightTrianglePack,
      transformationsPack,
      areaPack,
      solidsPack,
      circlesPack,
      algebraPreviewPack,
    ].flatMap((factory) => factory());
  }
  return (packByUnit[unitId] || congruencePack)();
}

export function buildControlledQuestionSet(plan, level, count, seed) {
  const rng = makeRng(seed);
  const generators = shuffled(rng, generatorsForUnit(plan.unitId));
  const questions = [];
  const prompts = new Set();
  let attempt = 0;
  while (questions.length < count && attempt < 250) {
    const generator = generators[attempt % generators.length];
    const variant =
      questions.length + 1 + Math.floor(attempt / generators.length);
    const question = generator(rng, level, variant);
    const key = question.prompt.replace(/\s+/g, " ").trim().toLowerCase();
    if (!prompts.has(key)) {
      prompts.add(key);
      questions.push(question);
    }
    attempt += 1;
  }
  if (questions.length !== count)
    throw new Error(
      "The curated generator could not make enough distinct questions.",
    );
  return questions;
}
