import { verbs, vocabulary, grammar, speaking, writing } from "../data/curriculum.js";

const $ = (id) => document.getElementById(id);
const KEY = "yki-progress-v2";

let progress = JSON.parse(localStorage.getItem(KEY) || "{}");
let q = null;
let session = { done: 0, correct: 0, total: 10, recentKinds: [] };

const SKILL_LABELS = {
  vocab: "Vocabulary",
  verb: "Verbs",
  grammar: "Grammar",
  sentence: "Sentence building",
  speaking: "Speaking",
  writing: "Writing"
};

const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const norm = (s) => (s || "").trim().toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ");

const items = [
  ...vocabulary.map((data) => ({ kind: "vocab", data })),
  ...verbs.map((data) => ({ kind: "verb", data })),
  ...grammar.map((data) => ({ kind: "grammar", data })),
  ...grammar.map((data) => ({ kind: "sentence", data })),
  ...speaking.map((data) => ({ kind: "speaking", data })),
  ...writing.map((data) => ({ kind: "writing", data }))
];

function mastery(id) {
  const x = progress[id];
  return x?.attempts ? x.correct / x.attempts : 0;
}

function record(id, ok) {
  const x = progress[id] || { attempts: 0, correct: 0 };
  x.attempts += 1;
  if (ok) x.correct += 1;
  progress[id] = x;
  localStorage.setItem(KEY, JSON.stringify(progress));
}

function compatibleTopics() {
  const skill = $("skill").value;
  const level = $("level").value;

  const pool = items.filter((x) => {
    const skillOK = skill === "mixed" || SKILL_LABELS[x.kind] === SKILL_LABELS[skill];
    const levelOK = level === "all" || x.data.level === level;
    return skillOK && levelOK;
  });

  return [...new Set(pool.map((x) => x.data.topic))].sort();
}

function rebuildTopics() {
  const select = $("topic");
  const current = select.value;
  select.innerHTML = '<option value="all">All topics</option>';

  compatibleTopics().forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topic;
    select.appendChild(option);
  });

  if ([...select.options].some((o) => o.value === current)) {
    select.value = current;
  } else {
    select.value = "all";
  }
}

function filteredPool(filters) {
  return items.filter((x) => {
    const skillOK = filters.skill === "mixed" || x.kind === filters.skill;
    const levelOK = filters.level === "all" || x.data.level === filters.level;
    const topicOK = filters.topic === "all" || x.data.topic === filters.topic;
    return skillOK && levelOK && topicOK;
  });
}

function chooseItem(pool) {
  if (!pool.length) return null;

  // In Mixed mode, deliberately rotate skill/question families instead of
  // repeatedly selecting the same kind by chance.
  const recent = session.recentKinds;
  const kinds = [...new Set(pool.map((x) => x.kind))];

  let candidates = kinds.filter((kind) => !recent.slice(-2).includes(kind));
  if (!candidates.length) candidates = kinds;

  const kind = pick(candidates);
  const kindPool = pool.filter((x) => x.kind === kind);

  // Bias toward concepts the learner has not mastered.
  const weighted = kindPool.flatMap((x) =>
    Array(Math.max(1, Math.round((1 - mastery(x.data.id)) * 5))).fill(x)
  );

  return pick(weighted);
}

function makeQuestion(filters) {
  const pool = filteredPool(filters);

  if (!pool.length) {
    return {
      empty: true,
      skill: "No questions",
      level: filters.level === "all" ? "All levels" : filters.level,
      topic: filters.topic === "all" ? "No matching topic" : filters.topic,
      prompt: "No questions match these filters yet.",
      explain: "Choose another level, skill, or topic."
    };
  }

  const x = chooseItem(pool);
  const d = x.data;
  session.recentKinds.push(x.kind);
  session.recentKinds = session.recentKinds.slice(-4);

  if (x.kind === "vocab") {
    const variant = pick(["mcq", "translation", "context"]);

    if (variant === "mcq") {
      const options = shuffle([
        d.swedish,
        ...shuffle(vocabulary.filter((v) => v.id !== d.id))
          .slice(0, 3)
          .map((v) => v.swedish)
      ]);

      return {
        id: d.id,
        type: "choice",
        skill: "Vocabulary",
        level: d.level,
        topic: d.topic,
        prompt: `What is the Swedish for “${d.english}”?`,
        options,
        answer: d.swedish,
        explain: `${d.swedish} = ${d.english}`
      };
    }

    if (variant === "translation") {
      return {
        id: d.id,
        type: "text",
        skill: "Vocabulary",
        level: d.level,
        topic: d.topic,
        prompt: `Translate into English: “${d.swedish}”`,
        answer: d.english,
        explain: `${d.swedish} = ${d.english}`
      };
    }

    return {
      id: d.id,
      type: "choice",
      skill: "Vocabulary",
      level: d.level,
      topic: d.topic,
      prompt: `Which Swedish expression matches “${d.english}”?`,
      options: shuffle([
        d.swedish,
        ...shuffle(vocabulary.filter((v) => v.id !== d.id))
          .slice(0, 3)
          .map((v) => v.swedish)
      ]),
      answer: d.swedish,
      explain: `Use “${d.swedish}” for “${d.english}”.`
    };
  }

  if (x.kind === "verb") {
    const variant = pick(["conjugate", "choose", "identify"]);
    const tense = pick(["present", "past", "supine"]);
    const answer = d[tense];

    if (variant === "choose") {
      const options = shuffle([
        answer,
        d.present,
        d.past,
        d.supine
      ].filter((v, i, a) => a.indexOf(v) === i));

      return {
        id: d.id,
        type: "choice",
        skill: "Verbs",
        level: d.level,
        topic: d.topic,
        prompt: `Choose the correct ${tense} form of “${d.infinitive}”.`,
        options,
        answer,
        explain: `${d.infinitive}: present ${d.present}; past ${d.past}; supine ${d.supine}`
      };
    }

    if (variant === "identify") {
      return {
        id: d.id,
        type: "choice",
        skill: "Verbs",
        level: d.level,
        topic: d.topic,
        prompt: `Which form is the ${tense} form of “${d.infinitive}”?`,
        options: shuffle([d.present, d.past, d.supine]),
        answer,
        explain: `${d.infinitive}: present ${d.present}; past ${d.past}; supine ${d.supine}`
      };
    }

    const frame =
      tense === "present" ? "Jag ___ varje dag." :
      tense === "past" ? "Igår ___ jag." :
      "Jag har ___.";

    return {
      id: d.id,
      type: "text",
      skill: "Verbs",
      level: d.level,
      topic: d.topic,
      prompt: `Complete: “${frame}” — ${d.infinitive}`,
      answer,
      explain: `${d.infinitive}: present ${d.present}; past ${d.past}; supine ${d.supine}`
    };
  }

  if (x.kind === "grammar") {
    const sets = {
      v2: [
        "Choose the correct sentence:",
        ["Idag vill jag inte köpa cykeln.", "Idag jag vill inte köpa cykeln.", "Idag vill inte jag köpa cykeln."],
        "Idag vill jag inte köpa cykeln."
      ],
      biff: [
        "Choose the correct subordinate clause:",
        ["eftersom jag inte förstår frågan", "eftersom jag förstår inte frågan"],
        "eftersom jag inte förstår frågan"
      ],
      questions: [
        "Choose the correct open question:",
        ["Vad kostar den här varan?", "Vad den här varan kostar?", "Kostar vad den här varan?"],
        "Vad kostar den här varan?"
      ],
      indirect: [
        "Choose the correct indirect question:",
        ["Jag vill veta om kontoret är öppet.", "Jag vill veta om är kontoret öppet."],
        "Jag vill veta om kontoret är öppet."
      ],
      enett: [
        "Choose the definite form of “en bil”:",
        ["bilen", "bilet", "bilar"],
        "bilen"
      ],
      future: [
        "Choose the form used for a plan:",
        ["Jag ska resa imorgon.", "Jag kommer att resa imorgon."],
        "Jag ska resa imorgon."
      ],
      prep: [
        "Choose the correct phrase:",
        ["på måndag", "i måndag", "på måndags"],
        "på måndag"
      ]
    };

    const [prompt, options, answer] = sets[d.id] || sets.v2;
    return {
      id: d.id,
      type: "choice",
      skill: "Grammar",
      level: d.level,
      topic: d.topic,
      prompt,
      options: shuffle(options),
      answer,
      explain: d.explanation
    };
  }

  if (x.kind === "sentence") {
    const examples = [
      {
        words: ["idag", "ska", "vi", "handla"],
        answer: "Idag ska vi handla."
      },
      {
        words: ["därför", "måste", "vi", "lösa", "problemet"],
        answer: "Därför måste vi lösa problemet."
      },
      {
        words: ["i Finland", "brukar", "man", "bada bastu", "på lördagar"],
        answer: "I Finland brukar man bada bastu på lördagar."
      }
    ];

    const e = pick(examples);
    return {
      id: `sentence-${d.id}`,
      type: "order",
      skill: "Sentence building",
      level: d.level,
      topic: d.topic,
      prompt: "Build the sentence. Remember Swedish V2 word order.",
      words: shuffle(e.words),
      answer: e.answer,
      explain: d.explanation
    };
  }

  return {
    id: d.id,
    type: x.kind,
    skill: x.kind === "speaking" ? "Speaking" : "Writing",
    level: d.level,
    topic: d.topic,
    prompt: d.prompt,
    answer: null,
    explain: "Cover every requested part clearly."
  };
}

function render() {
  q = makeQuestion({
    skill: $("skill").value,
    level: $("level").value,
    topic: $("topic").value
  });

  $("skillBadge").textContent = q.skill;
  $("levelBadge").textContent = q.level;
  $("counter").textContent = `Question ${session.done + 1} / ${session.total}`;
  $("topicText").textContent = q.topic;
  $("prompt").textContent = q.prompt;
  $("feedback").innerHTML = "";
  $("feedback").className = "";
  $("check").hidden = !!q.empty;
  $("next").hidden = q.empty;
  const body = $("body");
  body.innerHTML = "";
  delete body.dataset.answer;

  if (q.empty) {
    const box = document.createElement("div");
    box.className = "preview";
    box.textContent = q.explain;
    body.append(box);
    return;
  }

  if (q.type === "choice") {
    const box = document.createElement("div");
    box.className = "options";

    q.options.forEach((option) => {
      const el = document.createElement("button");
      el.className = "option";
      el.type = "button";
      el.textContent = option;
      el.onclick = () => {
        box.querySelectorAll(".option").forEach((x) => x.classList.remove("selected"));
        el.classList.add("selected");
        body.dataset.answer = option;
      };
      box.append(el);
    });

    body.append(box);
  } else if (q.type === "text") {
    const input = document.createElement("input");
    input.className = "answer";
    input.id = "answer";
    input.placeholder = "Type your answer…";
    body.append(input);
    input.focus();
  } else if (q.type === "order") {
    const bank = document.createElement("div");
    bank.className = "words";
    const preview = document.createElement("div");
    preview.className = "preview";
    preview.textContent = "Click words in order…";
    const chosen = [];

    q.words.forEach((word) => {
      const el = document.createElement("button");
      el.className = "word";
      el.type = "button";
      el.textContent = word;
      el.onclick = () => {
        if (el.classList.contains("used")) return;
        el.classList.add("used");
        chosen.push(word);
        preview.textContent = chosen.join(" ");
        body.dataset.answer = chosen.join(" ");
      };
      bank.append(el);
    });

    body.append(bank, preview);
  } else {
    const box = document.createElement("div");
    box.className = "preview";
    box.textContent =
      q.skill === "Speaking"
        ? "Speak for 60–90 seconds. Use PREP if useful."
        : "Write your Swedish response and cover every task point.";

    const area = document.createElement("textarea");
    area.id = "answer";
    area.rows = 8;
    area.placeholder =
      q.skill === "Speaking" ? "Optional notes…" : "Write your Swedish response here…";

    body.append(box, area);
  }
}

function show(ok, title, msg) {
  $("feedback").className = "feedback " + (ok ? "good" : "bad");
  $("feedback").innerHTML = `<strong>${title}</strong><br>${msg}`;
}

function check() {
  if (q.empty) return;

  const answer = $("body").dataset.answer || $("answer")?.value || "";

  if (q.type === "speaking" || q.type === "writing") {
    if (answer.trim().length < 10) {
      show(false, "Add more", "Please provide a longer response.");
      return;
    }

    record(q.id, true);
    session.correct++;
    show(true, "Recorded", "Response captured. AI evaluation can be added in the next stage.");
  } else {
    const ok = norm(answer) === norm(q.answer);
    record(q.id, ok);

    if (ok) session.correct++;

    show(
      ok,
      ok ? "Correct!" : "Not quite",
      ok ? q.explain : `Correct answer: ${q.answer}. ${q.explain}`
    );
  }

  session.done++;
  $("check").hidden = true;
  $("next").hidden = false;
  update();
}

function update() {
  $("counter").textContent = `Question ${session.done} / ${session.total}`;
  $("totalCorrect").textContent =
    Object.values(progress).reduce((sum, x) => sum + x.correct, 0) + " correct";

  const weak = Object.entries(progress)
    .filter(([, x]) => x.attempts)
    .sort((a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts)
    .slice(0, 6);

  $("weakness").innerHTML = weak.length
    ? weak
        .map(
          ([id, x]) =>
            `<div><strong>${id}</strong><br><small>${Math.round(
              (x.correct / x.attempts) * 100
            )}% · ${x.attempts} attempts</small></div>`
        )
        .join("")
    : "<div>Start practicing and your weaker areas will appear here.</div>";
}

function resetSession() {
  session = { done: 0, correct: 0, total: 10, recentKinds: [] };
}

$("check").onclick = check;

$("next").onclick = () => {
  if (session.done >= session.total) resetSession();
  render();
};

["skill", "level"].forEach((id) => {
  $(id).onchange = () => {
    resetSession();
    rebuildTopics();
    render();
  };
});

$("topic").onchange = () => {
  resetSession();
  render();
};

$("reset").onclick = () => {
  if (confirm("Reset local progress?")) {
    progress = {};
    localStorage.removeItem(KEY);
    resetSession();
    update();
    rebuildTopics();
    render();
  }
};

rebuildTopics();
update();
render();
