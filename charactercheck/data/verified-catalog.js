// Public-quality gate and direct curation for the Nathan Fielder titles.
(() => {
  "use strict";

  const ROLE_ORDER = ["heart", "mind", "spark", "wildcard"];
  const NATHAN_IMAGE = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Nathan%20Fielder.jpg?width=1200";
  const LANCE_IMAGE = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lance%20Oppenheim%20at%20the%2083rd%20Venice%20International%20Film%20Festival.jpg?width=1200";
  const ELIZABETH_IMAGE = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Elizabeth%20Holmes%202014%20cropped.jpg?width=1200";

  const CURATED = {
    "you-can-see-everything": {
      poster: "https://upload.wikimedia.org/wikipedia/en/9/9d/You_Can_See_Everything_poster.jpeg",
      sourceName: "Wikipedia",
      sourceUrl: "https://en.wikipedia.org/wiki/You_Can_See_Everything",
      outcomes: {
        heart: {
          character: "Lance Oppenheim",
          actor: "Co-director and empathetic observer",
          label: "The compassionate witness",
          why: "You keep the people inside a complicated story in view, listening closely before deciding what the evidence means.",
          image: LANCE_IMAGE,
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Lance_Oppenheim_at_the_83rd_Venice_International_Film_Festival.jpg",
        },
        mind: {
          character: "Nathan Fielder",
          actor: "Co-director and on-camera investigator",
          label: "The careful investigator",
          why: "You test every assumption, stay composed around uncertainty, and keep following the evidence until the story changes shape.",
          image: NATHAN_IMAGE,
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Nathan_Fielder.jpg",
        },
        spark: {
          character: "Elizabeth Holmes",
          actor: "Central documentary subject",
          label: "The commanding center",
          why: "You can hold a room's attention and change the energy of a story the moment you enter it.",
          image: ELIZABETH_IMAGE,
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Elizabeth_Holmes_2014_cropped.jpg",
        },
        wildcard: {
          character: "Billy Evans",
          actor: "Featured documentary participant",
          label: "The unpredictable insider",
          why: "You see the situation from inside it, make surprising moves, and rarely fit the role other people expect.",
        },
      },
    },
    "nathan-for-you": {
      poster: "https://static.tvmaze.com/uploads/images/original_untouched/326/816434.jpg",
      sourceName: "TVmaze",
      sourceUrl: "https://www.tvmaze.com/shows/3136/nathan-for-you",
      outcomes: {
        heart: {
          character: "Bill Heath",
          actor: "Featured participant",
          label: "The sincere dreamer",
          why: "You lead with sincerity, hold onto the people and stories that matter, and give every strange plan a human center.",
        },
        mind: {
          character: "Nathan Fielder",
          actor: "Host and business strategist",
          label: "The elaborate planner",
          why: "You solve ordinary problems with extraordinary preparation, patient observation, and a plan nobody else would invent.",
          image: NATHAN_IMAGE,
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Nathan_Fielder.jpg",
        },
        spark: {
          character: "Anthony Napoli",
          actor: "Recurring host and participant",
          label: "The confident host",
          why: "You are comfortable at the center of the action and know how to make even an awkward moment feel like an event.",
        },
        wildcard: {
          character: "Brian Wolfe",
          actor: "Private investigator and recurring participant",
          label: "The skeptical original",
          why: "You trust your instincts, challenge the premise, and make the situation more memorable by refusing to play along quietly.",
        },
      },
    },
    "the-rehearsal": {
      poster: "https://static.tvmaze.com/uploads/images/original_untouched/564/1410775.jpg",
      sourceName: "TVmaze",
      sourceUrl: "https://www.tvmaze.com/shows/56116/the-rehearsal",
      outcomes: {
        heart: {
          character: "Kor Skeete",
          actor: "Featured participant",
          label: "The earnest truth-seeker",
          why: "You care deeply about getting an important conversation right and keep working until honesty feels possible.",
        },
        mind: {
          character: "Nathan Fielder",
          actor: "Creator and rehearsal designer",
          label: "The master planner",
          why: "You prepare for every branch of a situation, notice tiny variables, and build a system before taking the leap.",
          image: NATHAN_IMAGE,
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Nathan_Fielder.jpg",
        },
        spark: {
          character: "Angela Sankovich",
          actor: "Featured participant",
          label: "The committed lead",
          why: "You enter an experiment with a clear vision and make your convictions impossible for everyone else to ignore.",
        },
        wildcard: {
          character: "Robin Stone",
          actor: "Featured participant",
          label: "The unpredictable variable",
          why: "You bring the one possibility no rehearsal accounted for and can send the entire plan in a new direction.",
        },
      },
    },
  };

  for (const [id, curated] of Object.entries(CURATED)) {
    const media = window.MEDIA?.[id];
    if (!media || !window.OUTCOMES?.[id]) continue;
    media.poster = curated.poster;
    media.hero = curated.poster;
    media.artworkFallback = curated.poster;
    media.sourceName = curated.sourceName;
    media.sourceUrl = curated.sourceUrl;
    media.questionImages = window.FALLBACK_QUESTIONS.map((_, index) => ({
      url: curated.poster,
      alt: `${media.officialTitle} promotional artwork for question ${index + 1}`,
      sourceName: curated.sourceName,
      sourceUrl: curated.sourceUrl,
    }));
    window.OUTCOMES[id] = curated.outcomes;
  }

  const isRemoteImage = (value) => /^https?:\/\//i.test(String(value || ""));
  const hasNamedOutcomes = (id) =>
    ROLE_ORDER.every((role) => {
      const outcome = window.OUTCOMES?.[id]?.[role];
      const credit = String(outcome?.actor || outcome?.credit || "").trim();
      return (
        outcome &&
        String(outcome.character || "").trim().length > 0 &&
        credit.length > 0 &&
        !/archetype/i.test(credit)
      );
    });

  const allIds = Object.keys(window.MEDIA || {});
  const sourcedImageIds = allIds.filter((id) => isRemoteImage(window.MEDIA[id]?.poster));
  const namedOutcomeIds = allIds.filter((id) => hasNamedOutcomes(id));
  const fullyScreenedIds = allIds.filter(
    (id) => isRemoteImage(window.MEDIA[id]?.poster) && hasNamedOutcomes(id),
  );

  // Keep the complete catalog public. Sourcing progress is tracked separately
  // so an incomplete artwork record never removes a requested quiz again.
  window.CHARACTER_CHECK_PUBLISHED_IDS = Object.freeze(allIds);
  window.CHARACTER_CHECK_QUALITY = Object.freeze({
    candidates: allIds.length,
    published: allIds.length,
    hidden: 0,
    sourcedImages: sourcedImageIds.length,
    namedOutcomes: namedOutcomeIds.length,
    fullyScreened: fullyScreenedIds.length,
    namedOutcomesPerQuiz: ROLE_ORDER.length,
  });
})();
