require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");

const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

const PORT = Number(process.env.PORT || 4000);

const COORDINATOR_CODE =
  process.env.COORDINATOR_CODE || "XYF26";

const SUPABASE_URL = process.env.SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    "WARNING: Supabase env vars are missing. Database persistence will fail."
  );
}

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false
        }
      })
    : null;


/* =========================================================
   QUIZ DATA
========================================================= */

const QUIZZES = {
  A: {
    title: "AI Prompt Challenge",
    duration: 5 * 60,
    marks: 5,

    questions: [
      {
        q: "Which prompt is most specific for generating a college event poster?",
        o: [
          "Make a poster",
          "Create a modern 9:16 college symposium poster for XYFRONIX '26 with a neon technology theme",
          "Poster please",
          "Make something cool"
        ],
        a: 1
      },

      {
        q: "What does a role instruction mainly help an AI model do?",
        o: [
          "Increase internet speed",
          "Set a perspective or expertise for the response",
          "Delete previous messages",
          "Change the device"
        ],
        a: 1
      },

      {
        q: "Which is the clearest instruction?",
        o: [
          "Explain AI",
          "Explain generative AI in 5 bullet points for a first-year IT student",
          "Tell me everything",
          "AI notes"
        ],
        a: 1
      },

      {
        q: "What is prompt iteration?",
        o: [
          "Repeating the same prompt forever",
          "Refining a prompt based on the output",
          "Closing the AI tool",
          "Changing your keyboard"
        ],
        a: 1
      },

      {
        q: "Which element gives the model useful background information?",
        o: [
          "Context",
          "Wallpaper",
          "Battery",
          "Browser history"
        ],
        a: 0
      },

      {
        q: "A prompt asks for output in JSON. What does that primarily control?",
        o: [
          "The model's training data",
          "The output format",
          "The Wi-Fi",
          "The model's name"
        ],
        a: 1
      },

      {
        q: "Which request is easiest for an AI to follow?",
        o: [
          "Do it nicely",
          "Make it better somehow",
          "Summarize this article in 80 words using 4 bullet points",
          "Give good content"
        ],
        a: 2
      },

      {
        q: "What is a constraint in prompting?",
        o: [
          "A rule limiting or shaping the requested output",
          "A password",
          "A GPU setting",
          "A browser extension"
        ],
        a: 0
      },

      {
        q: "Which prompt is most useful for a coding task?",
        o: [
          "Code",
          "Write Python code to validate an email using a regular expression and show 3 examples",
          "Make program",
          "Python pls"
        ],
        a: 1
      },

      {
        q: "Why can examples improve an AI response?",
        o: [
          "They demonstrate the desired pattern",
          "They increase RAM",
          "They install a plugin",
          "They remove all ambiguity automatically"
        ],
        a: 0
      },

      {
        q: "What is zero-shot prompting?",
        o: [
          "Giving no task",
          "Asking the model to perform a task without examples",
          "Using zero tokens",
          "Using a blank screen"
        ],
        a: 1
      },

      {
        q: "What is few-shot prompting?",
        o: [
          "Providing a small number of examples before the task",
          "Using a short password",
          "Asking a very easy question",
          "Using a small model"
        ],
        a: 0
      },

      {
        q: "Which is a good way to reduce ambiguity?",
        o: [
          "Add clear context and requirements",
          "Remove all details",
          "Use more emojis",
          "Write random keywords"
        ],
        a: 0
      },

      {
        q: "If you need a table, what should you specify?",
        o: [
          "Only the topic",
          "Columns or structure expected in the output",
          "Your device brand",
          "Nothing"
        ],
        a: 1
      },

      {
        q: "Which prompt asks for audience adaptation?",
        o: [
          "Explain photosynthesis",
          "Explain photosynthesis to a 10-year-old using a simple analogy",
          "Photosynthesis now",
          "Give facts"
        ],
        a: 1
      },

      {
        q: "What is a system instruction generally used for?",
        o: [
          "High-level behavior or rules for the assistant",
          "Changing screen brightness",
          "Deleting files",
          "Charging a phone"
        ],
        a: 0
      },

      {
        q: "Which is an example of an output constraint?",
        o: [
          "Use exactly 6 bullet points",
          "Think harder",
          "Be smart",
          "Do something"
        ],
        a: 0
      },

      {
        q: "Why should a long task be broken into steps?",
        o: [
          "It can improve clarity and make the workflow easier to verify",
          "It always makes the model faster",
          "It disables errors completely",
          "It changes the AI model"
        ],
        a: 0
      },

      {
        q: "Which request is most measurable?",
        o: [
          "Make a nice caption",
          "Write a 20-word Instagram caption for an AI event",
          "Make it catchy",
          "Caption please"
        ],
        a: 1
      },

      {
        q: "What is the main purpose of prompt engineering?",
        o: [
          "Designing instructions that help AI produce useful, controlled outputs",
          "Building computer hardware",
          "Increasing internet bandwidth",
          "Creating passwords"
        ],
        a: 0
      }
    ]
  },

  B: {
    title: "AI Scenario Challenge",
    duration: 10 * 60,
    marks: 4,

    questions: [
      {
        q: "You ask an AI to create a poster, but it keeps adding extra text. Which change is most useful?",
        o: [
          "Add 'include only the exact text provided; no extra words' as a constraint",
          "Ask it to be creative",
          "Remove the subject",
          "Use fewer words in the prompt"
        ],
        a: 0
      },

      {
        q: "A team wants 5 Instagram captions in different tones. Which prompt structure is best?",
        o: [
          "Give me captions",
          "Generate 5 captions and label them Professional, Funny, Gen-Z, Motivational, and Minimal",
          "Write something",
          "Caption ideas"
        ],
        a: 1
      },

      {
        q: "An AI gives inconsistent JSON that breaks your program. What should you add?",
        o: [
          "A precise JSON schema and 'return JSON only' instruction",
          "More emojis",
          "A longer greeting",
          "A random example"
        ],
        a: 0
      },

      {
        q: "You need a study plan for a student with 2 hours per day. Which missing detail matters most?",
        o: [
          "Phone brand",
          "Subjects, exam date and priority",
          "Favorite color",
          "Browser"
        ],
        a: 1
      },

      {
        q: "Your AI-generated code is correct but hard to understand. What prompt revision helps?",
        o: [
          "Ask for clean code with meaningful names and brief comments",
          "Ask for more code",
          "Remove the language name",
          "Say 'make it cool'"
        ],
        a: 0
      },

      {
        q: "A model keeps answering at an expert level when your audience is beginners. What should you specify?",
        o: [
          "Audience and assumed knowledge level",
          "A longer title",
          "More hashtags",
          "The model version"
        ],
        a: 0
      },

      {
        q: "You want an AI to rewrite a notice without changing facts. Which instruction is strongest?",
        o: [
          "Make it nicer",
          "Rewrite for clarity while preserving every factual detail and date",
          "Change the wording a lot",
          "Shorten it however you want"
        ],
        a: 1
      },

      {
        q: "You are comparing two laptops and want a decision table. What prompt detail is most useful?",
        o: [
          "Ask for a table with named criteria such as CPU, RAM, battery and price",
          "Say 'compare well'",
          "Ask for a long answer",
          "Use all caps"
        ],
        a: 0
      },

      {
        q: "An image prompt produces a fantasy scene instead of a realistic college lab. What should you change?",
        o: [
          "Specify realistic photography, college lab setting, natural lighting and real-world details",
          "Remove the setting",
          "Add fantasy keywords",
          "Use fewer constraints"
        ],
        a: 0
      },

      {
        q: "A chatbot keeps giving 500-word answers when you need short replies. What is the best constraint?",
        o: [
          "Answer in 50 words maximum unless more detail is requested",
          "Be concise maybe",
          "Do not talk much",
          "Short"
        ],
        a: 0
      },

      {
        q: "You have 3 sample customer emails and want the AI to classify new emails similarly. What approach fits?",
        o: [
          "Few-shot prompting with the examples and a clear output label",
          "Zero-shot only",
          "Ask for poetry",
          "Remove the examples"
        ],
        a: 0
      },

      {
        q: "A prompt asks an AI to summarize a document but the document is not supplied. What should the assistant do?",
        o: [
          "Invent the summary",
          "Ask for the document or its text",
          "Pretend it read it",
          "Return random bullet points"
        ],
        a: 1
      },

      {
        q: "You want consistent product descriptions for 20 items. Which approach is best?",
        o: [
          "Define a reusable template with fixed fields, tone and length",
          "Ask each time with different wording",
          "Avoid constraints",
          "Use only the product name"
        ],
        a: 0
      },

      {
        q: "Your AI answer contains unsupported claims. Which prompt addition helps reduce this risk?",
        o: [
          "Ask it to distinguish known information from uncertainty and not invent missing facts",
          "Tell it to sound confident",
          "Ask for a longer answer",
          "Use more adjectives"
        ],
        a: 0
      },

      {
        q: "You want code plus a short explanation, but the model returns a giant tutorial. What should you do?",
        o: [
          "Specify the exact sections and maximum explanation length",
          "Ask it to explain more",
          "Remove the task",
          "Use more technical jargon"
        ],
        a: 0
      },

      {
        q: "A team wants 10 ideas, but duplicates keep appearing. Which prompt can help?",
        o: [
          "Generate 10 distinct ideas and briefly state how each differs from the others",
          "Generate ideas quickly",
          "Give many ideas",
          "Be creative"
        ],
        a: 0
      },

      {
        q: "You are prompting an AI to create an event schedule. Which context is most important?",
        o: [
          "Available time, activities, durations and constraints",
          "The team's favorite color",
          "The keyboard type",
          "A random quote"
        ],
        a: 0
      },

      {
        q: "You need a formal email from informal notes. Which instruction is strongest?",
        o: [
          "Rewrite the notes as a polite professional email while preserving all requested facts and actions",
          "Make it formal",
          "Email this",
          "Improve it"
        ],
        a: 0
      },

      {
        q: "An AI creates a Python function but misses edge cases. Which prompt revision is useful?",
        o: [
          "Ask it to include and test edge cases such as empty input, invalid input and boundary values",
          "Ask for more lines",
          "Ask for a nicer function",
          "Remove tests"
        ],
        a: 0
      },

      {
        q: "You need an AI to critique a presentation slide. Which prompt is most actionable?",
        o: [
          "Review the slide for clarity, hierarchy, grammar and audience fit; list 3 specific fixes",
          "Is this good?",
          "Review",
          "Make it better"
        ],
        a: 0
      },

      {
        q: "A model follows one instruction but ignores another. What should you inspect first?",
        o: [
          "Whether the prompt contains conflicting or ambiguous instructions",
          "The monitor brightness",
          "The file name",
          "The Wi-Fi password"
        ],
        a: 0
      },

      {
        q: "You want the same style across multiple AI-generated images. What prompt strategy helps?",
        o: [
          "Keep a reusable style block describing visual characteristics and repeat it consistently",
          "Change style words every time",
          "Remove all style details",
          "Use only one noun"
        ],
        a: 0
      },

      {
        q: "A student wants an AI tutor to ask questions instead of immediately giving answers. Which role instruction helps?",
        o: [
          "Act as a Socratic tutor: ask one guiding question at a time and reveal the answer only after the student attempts it",
          "Give every answer immediately",
          "Be concise",
          "Use emojis"
        ],
        a: 0
      },

      {
        q: "You need a meeting summary with action owners and deadlines. Which output format is most useful?",
        o: [
          "A table with Action, Owner, Deadline and Status columns",
          "One paragraph",
          "Random bullets",
          "Only a title"
        ],
        a: 0
      },

      {
        q: "A prompt is producing vague business ideas. Which missing component is most likely to improve specificity?",
        o: [
          "Target customer, problem, constraints and desired output format",
          "More adjectives",
          "A longer greeting",
          "The model's logo"
        ],
        a: 0
      }
    ]
  }
};


/* =========================================================
   MEMORY
========================================================= */

let memory = {
  participants: new Map(),

  quiz: {
    activeStage: null,
    status: "waiting",
    startedAt: null,
    durationSeconds: 0
  },

  answersA: new Set(),
  answersB: new Set(),

  displayOrders: new Map()
};


/* =========================================================
   DATABASE HELPERS
========================================================= */

async function dbInsertParticipant(participant) {
  if (!supabase) return;

  const { error } = await supabase
    .from("participants")
    .insert(participant);

  if (error) {
    console.error("Supabase participant insert error:", error);
  }
}


async function dbUpdateParticipant(id, patch) {
  if (!supabase) return;

  const { error } = await supabase
    .from("participants")
    .update(patch)
    .eq("id", id);

  if (error) {
    console.error("Supabase participant update error:", error);
  }
}


async function dbInsertAnswer(row) {
  if (!supabase) return;

  const { error } = await supabase
    .from("answers")
    .upsert(row, {
      onConflict: "participant_id,stage,question_index"
    });

  if (error) {
    console.error("Supabase answer insert error:", error);
  }
}


async function dbDeleteParticipant(id) {
  if (!supabase) return;

  const answerResult = await supabase
    .from("answers")
    .delete()
    .eq("participant_id", id);

  if (answerResult.error) {
    console.error(
      "Supabase answer delete error:",
      answerResult.error
    );
  }

  const participantResult = await supabase
    .from("participants")
    .delete()
    .eq("id", id);

  if (participantResult.error) {
    console.error(
      "Supabase participant delete error:",
      participantResult.error
    );
  }
}


/* =========================================================
   QUESTION RANDOMIZATION
========================================================= */

function shuffleArray(array) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}


function getDisplayOrder(stage, questionIndex, participantId) {
  const key =
    `${participantId}:${stage}:${questionIndex}`;

  if (memory.displayOrders.has(key)) {
    return memory.displayOrders.get(key);
  }

  const question =
    QUIZZES[stage].questions[questionIndex];

  const order =
    shuffleArray(
      question.o.map((_, index) => index)
    );

  memory.displayOrders.set(key, order);

  return order;
}


/*
  Example:

  Original:
  A = correct
  B
  C
  D

  Participant 1 may see:
  C
  A
  D
  B

  Participant 2 may see:
  B
  D
  A
  C

  Backend still knows original correct answer.
*/


function publicQuestion(
  stage,
  index,
  participantId
) {
  const question =
    QUIZZES[stage].questions[index];

  if (!question) {
    return null;
  }

  const displayOrder =
    getDisplayOrder(
      stage,
      index,
      participantId
    );

  const shuffledOptions =
    displayOrder.map(
      originalIndex =>
        question.o[originalIndex]
    );

  return {
    index,

    total:
      QUIZZES[stage].questions.length,

    question:
      question.q,

    options:
      shuffledOptions,

    marks:
      QUIZZES[stage].marks,

    /*
      optionMap[displayIndex]
      = original question option index

      Frontend sends this value back.
    */
    optionMap:
      displayOrder
  };
}


/* =========================================================
   DASHBOARD
========================================================= */

function sanitizeParticipant(participant) {
  return {
    id: participant.id,
    team_name: participant.team_name,
    college_name: participant.college_name,

    status: participant.status,

    stage_a_score:
      participant.stage_a_score,

    stage_a_correct:
      participant.stage_a_correct,

    stage_a_used:
      participant.stage_a_used,

    stage_b_score:
      participant.stage_b_score,

    stage_b_correct:
      participant.stage_b_correct,

    stage_b_used:
      participant.stage_b_used,

    joined_at:
      participant.joined_at,

    completed_at:
      participant.completed_at
  };
}


function dashboardState() {
  return {
    quiz: memory.quiz,

    participants:
      [...memory.participants.values()]
        .map(sanitizeParticipant)
  };
}


function broadcastDashboard() {
  io
    .to("coordinators")
    .emit(
      "dashboard:update",
      dashboardState()
    );
}


/* =========================================================
   RANKING
========================================================= */

function rankFor(stage) {
  const rows =
    [...memory.participants.values()];

  rows.sort((a, b) => {
    const scoreA =
      stage === "B"
        ? a.stage_b_score
        : a.stage_a_score;

    const scoreB =
      stage === "B"
        ? b.stage_b_score
        : b.stage_a_score;

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    return (
      new Date(a.joined_at) -
      new Date(b.joined_at)
    );
  });

  return rows;
}


/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service:
      "XYFRONIX '26 AI Prompt Battle"
  });
});


/* =========================================================
   PARTICIPANT JOIN
========================================================= */

app.post(
  "/api/participant/join",
  async (req, res) => {
    const teamName =
      String(
        req.body.teamName || ""
      ).trim();

    const collegeName =
      String(
        req.body.collegeName || ""
      ).trim();

    if (!teamName || !collegeName) {
      return res.status(400).json({
        error:
          "Team name and college name are required."
      });
    }

    if (memory.quiz.status === "running") {
      return res.status(409).json({
        error:
          "A quiz is already running. Please wait for the next session."
      });
    }

    const id =
      crypto.randomUUID();

    const participant = {
      id,

      team_name:
        teamName,

      college_name:
        collegeName,

      status:
        "waiting",

      stage_a_score: 0,
      stage_a_correct: 0,
      stage_a_used: 0,

      stage_b_score: 0,
      stage_b_correct: 0,
      stage_b_used: 0,

      joined_at:
        new Date().toISOString(),

      completed_at:
        null
    };

    memory.participants.set(
      id,
      participant
    );

    await dbInsertParticipant(
      participant
    );

    broadcastDashboard();

    res.json({
      participant
    });
  }
);


/* =========================================================
   GET PARTICIPANT
========================================================= */

app.get(
  "/api/participant/:id",
  async (req, res) => {
    const participant =
      memory.participants.get(
        req.params.id
      );

    if (!participant) {
      return res.status(404).json({
        error:
          "Participant not found."
      });
    }

    res.json(participant);
  }
);


/* =========================================================
   GET QUESTION
========================================================= */

app.get(
  "/api/quiz/:stage/question/:index",
  (req, res) => {
    const stage =
      String(
        req.params.stage || ""
      ).toUpperCase();

    const index =
      Number(
        req.params.index
      );

    const participantId =
      String(
        req.query.participantId || ""
      );

    if (
      !QUIZZES[stage] ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >=
        QUIZZES[stage].questions.length
    ) {
      return res.status(404).json({
        error:
          "Question not found."
      });
    }

    if (!participantId) {
      return res.status(400).json({
        error:
          "Participant ID is required."
      });
    }

    const participant =
      memory.participants.get(
        participantId
      );

    if (!participant) {
      return res.status(404).json({
        error:
          "Participant not found."
      });
    }

    const question =
      publicQuestion(
        stage,
        index,
        participantId
      );

    res.json(question);
  }
);


/* =========================================================
   SUBMIT ANSWER
========================================================= */

app.post(
  "/api/quiz/answer",
  async (req, res) => {
    const {
      participantId,
      stage,
      questionIndex,
      selectedOption
    } = req.body;

    const p =
      memory.participants.get(
        participantId
      );

    if (!p) {
      return res.status(404).json({
        error:
          "Participant not found."
      });
    }

    if (
      memory.quiz.status !==
        "running" ||
      memory.quiz.activeStage !==
        stage
    ) {
      return res.status(409).json({
        error:
          "This quiz is not currently running."
      });
    }

    const idx =
      Number(questionIndex);

    const selectedDisplayIndex =
      Number(selectedOption);

    const q =
      stageQuestions(stage)[idx];

    if (
      !q ||
      !Number.isInteger(
        selectedDisplayIndex
      ) ||
      selectedDisplayIndex < 0 ||
      selectedDisplayIndex >=
        q.o.length
    ) {
      return res.status(400).json({
        error:
          "Invalid question or option."
      });
    }

    const answerSet =
      stage === "A"
        ? memory.answersA
        : memory.answersB;

    const answerKey =
      `${participantId}:${stage}:${idx}`;

    if (answerSet.has(answerKey)) {
      return res.status(409).json({
        error:
          "This question was already submitted."
      });
    }

    /*
      Convert displayed option position
      back to original answer position.
    */

    const displayOrder =
      getDisplayOrder(
        stage,
        idx,
        participantId
      );

    const originalOptionIndex =
      displayOrder[
        selectedDisplayIndex
      ];

    answerSet.add(answerKey);

    const correct =
      originalOptionIndex === q.a;

    const marksAwarded =
      correct
        ? QUIZZES[stage].marks
        : 0;

    const usedField =
      stage === "A"
        ? "stage_a_used"
        : "stage_b_used";

    const scoreField =
      stage === "A"
        ? "stage_a_score"
        : "stage_b_score";

    const correctField =
      stage === "A"
        ? "stage_a_correct"
        : "stage_b_correct";

    p[usedField] += 1;

    p[scoreField] +=
      marksAwarded;

    if (correct) {
      p[correctField] += 1;
    }

    p.status = "live";

    await dbUpdateParticipant(
      p.id,
      {
        [usedField]:
          p[usedField],

        [scoreField]:
          p[scoreField],

        [correctField]:
          p[correctField],

        status:
          "live"
      }
    );

    await dbInsertAnswer({
      participant_id:
        p.id,

      stage,

      question_index:
        idx,

      /*
        Save ORIGINAL option index.
      */
      selected_option:
        originalOptionIndex,

      is_correct:
        correct,

      marks:
        marksAwarded,

      submitted_at:
        new Date().toISOString()
    });

    const rows =
      rankFor(stage);

    const position =
      rows.findIndex(
        x => x.id === p.id
      ) + 1;

    io
      .to(
        `participant:${p.id}`
      )
      .emit(
        "participant:update",
        p
      );

    broadcastDashboard();

    res.json({
      correct,

      marksAwarded,

      /*
        Correct answer text.
      */
      correctAnswer:
        q.o[q.a],

      score:
        p[scoreField],

      position
    });
  }
);


/* =========================================================
   FINISH PARTICIPANT QUIZ
========================================================= */

app.post(
  "/api/quiz/finish",
  async (req, res) => {
    const {
      participantId,
      stage
    } = req.body;

    const p =
      memory.participants.get(
        participantId
      );

    if (!p) {
      return res.status(404).json({
        error:
          "Participant not found."
      });
    }

    /*
      After Quiz A:
      participant becomes waiting,
      so coordinator can start Quiz B.

      After Quiz B:
      participant becomes submitted.
    */

    p.status =
      stage === "A"
        ? "waiting"
        : "submitted";

    p.completed_at =
      stage === "B"
        ? new Date().toISOString()
        : null;

    await dbUpdateParticipant(
      p.id,
      {
        status:
          p.status,

        completed_at:
          p.completed_at
      }
    );

    broadcastDashboard();

    res.json({
      ok: true
    });
  }
);


/* =========================================================
   PARTICIPANT SUMMARY
========================================================= */

app.get(
  "/api/participant/:id/summary",
  async (req, res) => {
    const p =
      memory.participants.get(
        req.params.id
      );

    if (!p) {
      return res.status(404).json({
        error:
          "Participant not found."
      });
    }

    const rowsA =
      rankFor("A");

    const rowsB =
      rankFor("B");

    res.json({
      team:
        p.team_name,

      stageA: {
        score:
          p.stage_a_score,

        correct:
          p.stage_a_correct,

        position:
          rowsA.findIndex(
            x => x.id === p.id
          ) + 1
      },

      stageB: {
        score:
          p.stage_b_score,

        correct:
          p.stage_b_correct,

        position:
          rowsB.findIndex(
            x => x.id === p.id
          ) + 1
      },

      totalScore:
        p.stage_a_score +
        p.stage_b_score
    });
  }
);


/* =========================================================
   COORDINATOR AUTH
========================================================= */

const coordinatorTokens =
  new Set();


function coordinatorAuth(
  req,
  res,
  next
) {
  const token =
    req.headers[
      "x-coordinator-token"
    ];

  if (
    !token ||
    !coordinatorTokens.has(token)
  ) {
    return res.status(401).json({
      error:
        "Coordinator login required."
    });
  }

  next();
}


/* =========================================================
   COORDINATOR LOGIN
========================================================= */

app.post(
  "/api/coordinator/login",
  (req, res) => {
    if (
      String(
        req.body.code || ""
      ) !==
      COORDINATOR_CODE
    ) {
      return res.status(401).json({
        error:
          "Invalid coordinator code."
      });
    }

    const token =
      crypto.randomBytes(24)
        .toString("hex");

    coordinatorTokens.add(token);

    res.json({
      token
    });
  }
);


/* =========================================================
   COORDINATOR STATE
========================================================= */

app.get(
  "/api/coordinator/state",
  coordinatorAuth,
  (req, res) => {
    res.json(
      dashboardState()
    );
  }
);


/* =========================================================
   START QUIZ
========================================================= */

app.post(
  "/api/coordinator/start",
  coordinatorAuth,
  async (req, res) => {
    const stage =
      String(
        req.body.stage || ""
      ).toUpperCase();

    if (!QUIZZES[stage]) {
      return res.status(400).json({
        error:
          "Invalid quiz stage."
      });
    }

    if (
      memory.quiz.status ===
      "running"
    ) {
      return res.status(409).json({
        error:
          "A quiz is already running."
      });
    }

    /*
      Only participants who are not
      submitted can enter the next quiz.
    */

    const ids =
      [...memory.participants.values()]
        .filter(
          p =>
            p.status !==
            "submitted"
        )
        .map(
          p => p.id
        );

    if (!ids.length) {
      return res.status(400).json({
        error:
          "No waiting participants found."
      });
    }

    const startedAt =
      new Date().toISOString();

    memory.quiz = {
      activeStage:
        stage,

      status:
        "running",

      startedAt,

      durationSeconds:
        QUIZZES[stage].duration
    };

    for (
      const p
      of memory.participants.values()
    ) {
      if (
        ids.includes(p.id)
      ) {
        p.status =
          "live";

        await dbUpdateParticipant(
          p.id,
          {
            status:
              "live"
          }
        );
      }
    }

    /*
      Save quiz state to Supabase.
    */

    if (supabase) {
      const {
        error
      } =
        await supabase
          .from(
            "quiz_settings"
          )
          .upsert({
            id: 1,

            active_stage:
              stage,

            status:
              "running",

            started_at:
              startedAt,

            updated_at:
              new Date()
                .toISOString()
          });

      if (error) {
        console.error(
          "Quiz settings error:",
          error
        );
      }
    }

    /*
      Tell every participant browser
      that coordinator started quiz.
    */

    io
      .to("participants")
      .emit(
        "quiz:started",
        {
          stage,

          durationSeconds:
            QUIZZES[stage]
              .duration,

          participantIds:
            ids
        }
      );

    broadcastDashboard();

    res.json({
      ok: true,

      stage,

      participantIds:
        ids
    });
  }
);


/* =========================================================
   FINISH QUIZ FROM COORDINATOR
========================================================= */

app.post(
  "/api/coordinator/finish",
  coordinatorAuth,
  async (req, res) => {
    if (
      !memory.quiz.activeStage
    ) {
      return res.status(400).json({
        error:
          "No quiz is running."
      });
    }

    const stage =
      memory.quiz.activeStage;

    for (
      const p
      of memory.participants.values()
    ) {
      if (
        p.status ===
        "live"
      ) {
        p.status =
          stage === "A"
            ? "waiting"
            : "submitted";

        p.completed_at =
          stage === "B"
            ? new Date()
                .toISOString()
            : null;

        await dbUpdateParticipant(
          p.id,
          {
            status:
              p.status,

            completed_at:
              p.completed_at
          }
        );
      }
    }

    memory.quiz = {
      activeStage:
        stage,

      status:
        "finished",

      startedAt:
        memory.quiz.startedAt,

      durationSeconds:
        memory.quiz.durationSeconds
    };

    if (supabase) {
      const {
        error
      } =
        await supabase
          .from(
            "quiz_settings"
          )
          .update({
            status:
              "finished",

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            "id",
            1
          );

      if (error) {
        console.error(
          "Quiz finish DB error:",
          error
        );
      }
    }

    io
      .to("participants")
      .emit(
        "quiz:finished",
        {
          final:
            stage === "B"
        }
      );

    broadcastDashboard();

    res.json({
      ok: true
    });
  }
);


/* =========================================================
   DELETE PARTICIPANT
========================================================= */

app.delete(
  "/api/coordinator/participant/:id",
  coordinatorAuth,
  async (req, res) => {
    const id =
      req.params.id;

    const participant =
      memory.participants.get(
        id
      );

    if (!participant) {
      return res.status(404).json({
        error:
          "Participant not found."
      });
    }

    /*
      Delete database records.
    */

    await dbDeleteParticipant(
      id
    );

    /*
      Remove from memory.
    */

    memory.participants.delete(
      id
    );

    /*
      Remove answer locks.
    */

    memory.answersA.forEach(
      key => {
        if (
          key.startsWith(
            `${id}:`
          )
        ) {
          memory.answersA.delete(
            key
          );
        }
      }
    );

    memory.answersB.forEach(
      key => {
        if (
          key.startsWith(
            `${id}:`
          )
        ) {
          memory.answersB.delete(
            key
          );
        }
      }
    );

    /*
      Remove randomized question
      mappings for this participant.
    */

    for (
      const key
      of memory.displayOrders.keys()
    ) {
      if (
        key.startsWith(
          `${id}:`
        )
      ) {
        memory.displayOrders.delete(
          key
        );
      }
    }

    /*
      Tell that participant browser
      that it was removed.
    */

    io
      .to(
        `participant:${id}`
      )
      .emit(
        "participant:removed",
        {
          reason:
            "You have been removed by the coordinator."
        }
      );

    /*
      Update coordinator dashboard.
    */

    broadcastDashboard();

    res.json({
      ok: true,
      deletedParticipantId:
        id
    });
  }
);


/* =========================================================
   CSV EXPORT
========================================================= */

app.get(
  "/api/coordinator/export",
  coordinatorAuth,
  async (req, res) => {
    const rows =
      [...memory.participants.values()]
        .sort(
          (a, b) =>
            (
              b.stage_a_score +
              b.stage_b_score
            ) -
            (
              a.stage_a_score +
              a.stage_b_score
            )
        );

    const header = [
      "Team Name",
      "College Name",
      "Quiz A Score",
      "Quiz A Correct",
      "Quiz A Used",
      "Quiz B Score",
      "Quiz B Correct",
      "Quiz B Used",
      "Total Score",
      "Status",
      "Joined At",
      "Completed At"
    ];

    const csv = [
      header.join(",")
    ]
      .concat(
        rows.map(
          p =>
            [
              p.team_name,
              p.college_name,

              p.stage_a_score,
              p.stage_a_correct,
              p.stage_a_used,

              p.stage_b_score,
              p.stage_b_correct,
              p.stage_b_used,

              p.stage_a_score +
                p.stage_b_score,

              p.status,

              p.joined_at,

              p.completed_at ||
                ""
            ]
              .map(
                value =>
                  `"${String(
                    value
                  ).replace(
                    /"/g,
                    '""'
                  )}"`
              )
              .join(",")
        )
      )
      .join("\n");

    res.setHeader(
      "Content-Type",
      "text/csv;charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="xyfronix-ai-prompt-battle-results.csv"'
    );

    res.send(csv);
  }
);


/* =========================================================
   SOCKET.IO
========================================================= */

io.on(
  "connection",
  socket => {

    /*
      Participant joins realtime room.
    */

    socket.on(
      "participant:join-room",
      ({ participantId }) => {

        const participant =
          memory.participants.get(
            participantId
          );

        if (!participant) {
          return;
        }

        socket.join(
          "participants"
        );

        socket.join(
          `participant:${participantId}`
        );
      }
    );


    /*
      Coordinator joins dashboard room.
    */

    socket.on(
      "coordinator:join",
      () => {
        socket.join(
          "coordinators"
        );

        socket.emit(
          "dashboard:update",
          dashboardState()
        );
      }
    );
  }
);


/* =========================================================
   PERIODIC DASHBOARD SYNC
========================================================= */

setInterval(
  () => {
    broadcastDashboard();
  },
  3000
);


/* =========================================================
   EXPRESS 5 SPA FALLBACK
========================================================= */

app.get(
  "/{*splat}",
  (req, res, next) => {

    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return next();
    }

    if (
      req.path.startsWith(
        "/socket.io/"
      )
    ) {
      return next();
    }

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );
  }
);


/* =========================================================
   START SERVER
========================================================= */

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `XYFRONIX backend running on port ${PORT}`
    );
  }
);
