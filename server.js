// server.js
// Simple Node/Express backend for Hillview Middle School Teacher Simulator
// Uses OpenAI for fully generative scenarios, scoring, and images.

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// IMPORTANT: set this in your environment on Render, don't hardcode it in code
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility: clamp a number
function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

// Utility: small randomness so AI deltas don't feel too linear
function addNoise(n, spread = 2) {
  const wiggle = Math.floor(Math.random() * (spread * 2 + 1)) - spread; // -spread..+spread
  return n + wiggle;
}

/**
 * POST /api/hillview-sim/scenario
 *
 * Body:
 * {
 *   month: "August" | ... | "June",
 *   round: number,
 *   stats: { learningScore, likabilityScore, studentsRemaining, classSize },
 *   usedScenarioIds: string[]
 * }
 *
 * Returns:
 * {
 *   id: string,
 *   title: string,
 *   prompt: string,
 *   options: [{ id, text }],
 *   imageUrl: string | null
 * }
 */
app.post("/api/hillview-sim/scenario", async (req, res) => {
  const { month, round, stats, usedScenarioIds } = req.body || {};
  const {
    learningScore = 50,
    likabilityScore = 50,
    studentsRemaining = stats?.classSize || 22,
    classSize = 22,
  } = stats || {};

  try {
    // 1) Ask GPT to invent a brand-new scenario + 4 options as JSON
    const scenarioCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are designing a highly replayable middle-school teaching game set at Hillview Middle School in Menlo Park.",
            "Every call you must invent a brand new, specific classroom situation for one calendar month of the school year.",
            "DO NOT reuse any previous scenario IDs passed in.",
            "Scenarios must be short, vivid, and always involve real tradeoffs.",
            "Return concise text that works well inside a small card on a game UI."
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            month,
            round,
            context: {
              learningScore,
              likabilityScore,
              studentsRemaining,
              classSize,
            },
            usedScenarioIds: usedScenarioIds || [],
          }),
        },
        {
          role: "user",
          content: [
            "Return STRICT JSON with this shape:",
            "{",
            '  "id": string,                  // unique id, new each time',
            '  "title": string,               // short label like \"Lab Disaster\" or \"Phone Chaos\"',
            '  "prompt": string,              // 2–4 sentence description, plain text, no markdown',
            '  "options": [',
            '    { "id": string, "text": string }, // exactly four distinct choices',
            "    ...",
            "  ]",
            "}",
            "",
            "Constraints:",
            "- id must NOT match any id in usedScenarioIds.",
            "- prompt should mention you are a teacher at Hillview Middle School and involve this month of the year.",
            "- options must clearly reflect tradeoffs (learning vs likability vs control vs sanity).",
            "- Keep text tight; avoid long speeches.",
          ].join("\n"),
        },
      ],
    });

    const rawScenario = scenarioCompletion.choices[0].message.content;
    let scenarioJson;
    try {
      scenarioJson = JSON.parse(rawScenario);
    } catch (e) {
      console.error("Failed to parse scenario JSON:", rawScenario);
      throw new Error("Scenario JSON parse error");
    }

    const scenario = {
      id:
        scenarioJson.id ||
        `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: scenarioJson.title || `${month} Situation`,
      prompt: scenarioJson.prompt || "A situation at Hillview Middle School.",
      options: Array.isArray(scenarioJson.options)
        ? scenarioJson.options.slice(0, 4).map((opt, index) => ({
            id: opt.id || `opt-${index + 1}`,
            text: opt.text || `Option ${index + 1}`,
          }))
        : [],
    };

    // 2) Generate a cartoon scenario image using gpt-image-1
    let imageUrl = null;
    try {
      const imgPrompt = [
        "Cartoon-style illustration, middle school classroom at Hillview Middle School in Menlo Park, California.",
        `Month: ${month}.`,
        "Show the situation described here, but do not include any text in the image:",
        scenario.prompt,
        "",
        "Colorful, clean lines, flat colors, slightly exaggerated expressions, friendly but chaotic vibe.",
        "No text, no logos, no brand names."
      ].join(" ");

      const imageResult = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imgPrompt,
        size: "1024x576",
        n: 1,
      });

      imageUrl = imageResult.data?.[0]?.url || null;
    } catch (imgErr) {
      console.error("Image generation error for scenario:", imgErr);
    }

    res.json({
      id: scenario.id,
      title: scenario.title,
      prompt: scenario.prompt,
      options: scenario.options,
      imageUrl,
    });
  } catch (err) {
    console.error("Scenario endpoint error:", err);
    res.status(500).json({ error: "Failed to generate scenario" });
  }
});

/**
 * POST /api/hillview-sim/evaluate
 *
 * Body:
 * {
 *   scenarioId: string,
 *   month: string,
 *   round: number,
 *   classSize: number,
 *   stats: { learningScore, likabilityScore, studentsRemaining },
 *   choice: { type: "option" | "custom", optionId?: string, customText?: string }
 * }
 *
 * Returns:
 * {
 *   learningDelta: number,
 *   likabilityDelta: number,
 *   studentsDelta: number,
 *   commentary: string,
 *   logHeadline: string,
 *   decisionImageUrl?: string
 * }
 */
app.post("/api/hillview-sim/evaluate", async (req, res) => {
  const { scenarioId, month, round, classSize, stats, choice } = req.body || {};
  const {
    learningScore = 50,
    likabilityScore = 50,
    studentsRemaining = classSize || 22,
  } = stats || {};

  // Hard filter on clearly violent/harmful answers before involving GPT
  const rawText = choice?.type === "custom" ? choice.customText || "" : "";
  const lower = rawText.toLowerCase();
  const violentPatterns = [
    /run (them|the students|the kids|my class|students|kids) over/,
    /run.*over.*(student|students|kid|kids|class)/,
    /kill/,
    /murder/,
    /shoot/,
    /stab/,
    /burn/,
    /set.*on fire/,
    /light.*on fire/,
    /hit/,
    /punch/,
    /beat up/,
    /hurt.*(student|students|kid|kids|child|children)/,
  ];
  const isCatastrophic = violentPatterns.some((re) => re.test(lower));

  try {
    let learningDelta = 0;
    let likabilityDelta = 0;
    let studentsDelta = 0;
    let commentary = "";
    let logHeadline = "";
    let decisionImageUrl = null;

    if (isCatastrophic) {
      // Skip GPT for scoring; just nuke the scores ourselves
      learningDelta = -25;
      likabilityDelta = -35;

      const baseStudentsLoss = Math.max(5, Math.round(classSize * 0.4));
      studentsDelta = -baseStudentsLoss;

      commentary =
        "This response would be completely unacceptable in a real school. Anything involving harm or threats to students is an immediate, catastrophic failure that would trigger serious intervention from administration and families.";
      logHeadline =
        "Catastrophic choice: safety and professionalism collapsed this month.";

      // Make a recap image that clearly shows consequences without being graphic
      try {
        const imgPrompt = [
          "Cartoon-style illustration, middle school classroom at Hillview Middle School.",
          "Teacher looks horrified as administrators and families point to a giant red 'NOT OK' sign.",
          "No actual violence, no blood. Focus on consequences and seriousness, not harm.",
          "Flat colors, clean lines, exaggerated shocked expressions, but still school-appropriate.",
          "No text in the image."
        ].join(" ");

        const imgRes = await openai.images.generate({
          model: "gpt-image-1",
          prompt: imgPrompt,
          size: "1024x576",
          n: 1,
        });
        decisionImageUrl = imgRes.data?.[0]?.url || null;
      } catch (imgErr) {
        console.error("Image generation error (catastrophic):", imgErr);
      }
    } else {
      // Use GPT to compute deltas + commentary, then add a bit of noise
      const evalCompletion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are evaluating a teacher's decision in a Hillview Middle School teaching simulator.",
              "The teacher is scored on three things: student learning (0-100), likability & respect (0-100), and students remaining in their class.",
              "Your job is to estimate how this decision would change learning and likability THIS month, not forever.",
              "You must also estimate how many students leave or join the class this month (studentsDelta).",
              "Return small-ish integer deltas (roughly in range -18 to +18) and clear, concise commentary.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              month,
              round,
              classSize,
              currentScores: {
                learningScore,
                likabilityScore,
                studentsRemaining,
              },
              scenarioId,
              choice,
            }),
          },
          {
            role: "user",
            content: [
              "Return STRICT JSON like this:",
              "{",
              '  "learningDelta": integer,',
              '  "likabilityDelta": integer,',
              '  "studentsDelta": integer,',
              '  "commentary": string,',
              '  "logHeadline": string,',
              '  "imagePrompt": string',
              "}",
              "",
              "Constraints:",
              "- learningDelta and likabilityDelta should almost always be between -18 and +18.",
              "- studentsDelta is usually between -4 and +4, but can reach -6 for truly awful social choices or +6 for legendary ones.",
              "- Commentary should be friendly but honest, and avoid jargon.",
              "- The imagePrompt should describe the scene and teacher's behavior in a safe, school-appropriate way, no self-harm, no gore, no graphic violence, no text.",
            ].join("\n"),
          },
        ],
      });

      const rawEval = evalCompletion.choices[0].message.content;
      let evalJson;
      try {
        evalJson = JSON.parse(rawEval);
      } catch (e) {
        console.error("Failed to parse evaluation JSON:", rawEval);
        throw new Error("Evaluation JSON parse error");
      }

      learningDelta = clamp(addNoise(evalJson.learningDelta ?? 0, 2), -20, 20);
      likabilityDelta = clamp(
        addNoise(evalJson.likabilityDelta ?? 0, 2),
        -20,
        20
      );
      studentsDelta = clamp(evalJson.studentsDelta ?? 0, -10, 10);
      commentary =
        evalJson.commentary || "The AI forgot to explain this decision.";
      logHeadline =
        evalJson.logHeadline ||
        `Learning ${learningDelta >= 0 ? "+" : ""}${learningDelta}, ` +
          `Likability ${likabilityDelta >= 0 ? "+" : ""}${likabilityDelta}, ` +
          `Students ${studentsDelta >= 0 ? "+" : ""}${studentsDelta}.`;

      // Recap image based on imagePrompt + a quick summary of the choice
      if (evalJson.imagePrompt) {
        try {
          // Build a choice summary for the image model
          let choiceSummary = "";
          if (choice?.type === "custom") {
            choiceSummary = `Teacher chose a custom response: "${(choice.customText || "").slice(
              0,
              200
            )}"`;
          } else if (choice?.type === "option" && choice.optionId) {
            choiceSummary = `Teacher chose option id "${choice.optionId}".`;
          }

          const imgPrompt = [
            "Cartoon-style illustration, middle school classroom at Hillview Middle School.",
            evalJson.imagePrompt,
            choiceSummary,
            "Flat colors, clean lines, slightly exaggerated expressions. No text in the image."
          ].join(" ");

          const imgRes = await openai.images.generate({
            model: "gpt-image-1",
            prompt: imgPrompt,
            size: "1024x576",
            n: 1,
          });
          decisionImageUrl = imgRes.data?.[0]?.url || null;
        } catch (imgErr) {
          console.error("Image generation error for decision:", imgErr);
        }
      }
    }

    res.json({
      learningDelta,
      likabilityDelta,
      studentsDelta,
      commentary,
      logHeadline,
      decisionImageUrl,
    });
  } catch (err) {
    console.error("Evaluate endpoint error:", err);
    res.status(500).json({ error: "Failed to evaluate decision" });
  }
});

// Basic health check
app.get("/", (req, res) => {
  res.send("Hillview Middle School Teacher Simulator API is running.");
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Hillview sim backend listening on port ${PORT}`);
});
