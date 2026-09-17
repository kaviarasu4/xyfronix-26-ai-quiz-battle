require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
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

const PORT = Number(process.env.PORT || 4000);
const COORDINATOR_CODE = process.env.COORDINATOR_CODE || "XYF26";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const PUBLIC_DIR = path.join(__dirname, "public");

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());
app.use(express.json({ limit: "1mb" }));

/*
  Static files:
  /index.html
  /app.js
  /config.js
  /style.css
  /logo.png
*/
app.use(express.static(PUBLIC_DIR));

/* =========================================================
   SUPABASE
========================================================= */

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    "WARNING: Supabase env vars are missing. Database persistence will not work."
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

const memory = {
  participants: new Map(),

  quiz: {
    activeStage: null,
    status: "waiting",
    startedAt: null,
    durationSeconds: 0
  },

  /*
    participantId:stage:index
    -> randomized option order
  */
  displayOrders: new Map(),

  /*
    Prevent duplicate answer submissions.
  */
  answersA: new Set(),
  answersB: new Set()
};

/* =========================================================
   HELPERS
========================================================= */

function stageQuestions(stage) {
  return QUIZZES[stage].questions;
}

function sanitizeParticipant(p) {
  return p;
}

function randomOrder(length) {
  const order = Array.from({ length }, (_, i) => i);

  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [order[i], order[j]] = [order[j], order[i]];
  }

  return order;
}

/* =========================================================
   SUPABASE HELPERS
========================================================= */

async function dbInsertParticipant(participant) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("participants")
      .insert(participant);

    if (error) {
      console.error("Supabase participant insert error:", error);
    }
  } catch (error) {
    console.error("Supabase insert exception:", error);
  }
}

async function dbUpdateParticipant(id, patch) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("participants")
      .update(patch)
      .eq("id", id);

    if (error) {
      console.error("Supabase participant update error:", error);
    }
  } catch (error) {
    console.error("Supabase update exception:", error);
  }
}

async function dbInsertAnswer(row) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("answers")
      .upsert(row, {
        onConflict: "participant_id,stage,question_index"
      });

    if (error) {
      console.error("Supabase answer insert error:", error);
    }
  } catch (error) {
    console.error("Supabase answer exception:", error);
  }
}

/* =========================================================
   DASHBOARD
========================================================= */

function dashboardState() {
  return {
    quiz: memory.quiz,

    participants: [
      ...memory.participants.values()
    ].map(sanitizeParticipant)
  };
}

function broadcastDashboard() {
  io.to("coordinators").emit(
    "dashboard:update",
    dashboardState()
  );
}

/* =========================================================
   RANKING
========================================================= */

async function rankFor(stage) {
  const rows = [
    ...memory.participants.values()
  ].sort((a, b) => {
    const scoreA =
      stage === "B"
        ? a.stage_b_score
        : a.stage_a_score;

    const scoreB =
      stage === "B"
        ? b.stage_b_score
        : b.stage_a_score;

    return (
      scoreB - scoreA ||
      new Date(a.joined_at) -
        new Date(b.joined_at)
    );
  });

  return rows;
}

/* =========================================================
   PUBLIC QUESTION
   RANDOM OPTION ORDER
========================================================= */

function publicQuestion(
  stage,
  index,
  participantId
) {
  const q = stageQuestions(stage)[index];

  if (!q) return null;

  const key =
    `${participantId || "anon"}:${stage}:${index}`;

  let order =
    memory.displayOrders.get(key);

  if (!order) {
    order = randomOrder(q.o.length);

    memory.displayOrders.set(
      key,
      order
    );
  }

  return {
    index,

    total: stageQuestions(stage).length,

    question: q.q,

    /*
      These are shuffled options.
    */
    options: order.map(
      (originalIndex) =>
        q.o[originalIndex]
    ),

    /*
      Example:
      [2,0,3,1]

      means displayed A = original C,
      displayed B = original A,
      displayed C = original D,
      displayed D = original B.
    */
    optionMap: order,

    marks: QUIZZES[stage].marks
  };
}

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      ok: true,
      service:
        "XYFRONIX '26 AI Prompt Battle"
    });
  }
);

/* =========================================================
   PARTICIPANT JOIN
========================================================= */

app.post(
  "/api/participant/join",
  async (req, res) => {
    try {
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

      if (
        memory.quiz.status ===
        "running"
      ) {
        return res.status(409).json({
          error:
            "A quiz is already running. Please wait for the next session."
        });
      }

      const id =
        crypto.randomUUID();

      const participant = {
        id,

        team_name: teamName,

        college_name: collegeName,

        status: "waiting",

        stage_a_score: 0,
        stage_a_correct: 0,
        stage_a_used: 0,

        stage_b_score: 0,
        stage_b_correct: 0,
        stage_b_used: 0,

        joined_at:
          new Date().toISOString(),

        completed_at: null
      };

      memory.participants.set(
        id,
        participant
      );

      await dbInsertParticipant(
        participant
      );

      broadcastDashboard();

      return res.json({
        participant
      });
    } catch (error) {
      console.error(
        "Participant join error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to join participant."
      });
    }
  }
);

/* =========================================================
   PARTICIPANT STATE
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

    return res.json(
      participant
    );
  }
);

/* =========================================================
   LOAD QUESTION
========================================================= */

app.get(
  "/api/quiz/:stage/question/:index",
  (req, res) => {
    try {
      const stage =
        String(
          req.params.stage || ""
        ).toUpperCase();

      const index =
        Number(req.params.index);

      if (
        !QUIZZES[stage] ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >=
          stageQuestions(stage).length
      ) {
        return res.status(404).json({
          error:
            "Question not found."
        });
      }

      const question =
        publicQuestion(
          stage,
          index,
          req.query.participantId
        );

      return res.json(
        question
      );
    } catch (error) {
      console.error(
        "Question error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load question."
      });
    }
  }
);

/* =========================================================
   SUBMIT ANSWER
========================================================= */

app.post(
  "/api/quiz/answer",
  async (req, res) => {
    try {
      const participantId =
        String(
          req.body.participantId || ""
        );

      const stage =
        String(
          req.body.stage || ""
        ).toUpperCase();

      const questionIndex =
        Number(
          req.body.questionIndex
        );

      const selectedOption =
        Number(
          req.body.selectedOption
        );

      /*
        Validate participant.
      */
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

      /*
        Validate stage.
      */
      if (!QUIZZES[stage]) {
        return res.status(400).json({
          error:
            "Invalid quiz stage."
        });
      }

      /*
        Quiz must be running.
      */
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

      /*
        Validate question.
      */
      const question =
        stageQuestions(stage)[
          questionIndex
        ];

      if (
        !question ||
        !Number.isInteger(
          selectedOption
        ) ||
        selectedOption < 0 ||
        selectedOption >=
          question.o.length
      ) {
        return res.status(400).json({
          error:
            "Invalid question or option."
        });
      }

      /*
        IMPORTANT:

        selectedOption coming from frontend
        is the ORIGINAL question option index.

        app.js converts shuffled displayed
        position -> original index using optionMap.
      */

      const answerSet =
        stage === "A"
          ? memory.answersA
          : memory.answersB;

      const answerKey =
        `${participantId}:${stage}:${questionIndex}`;

      /*
        Prevent double submit.
      */
      if (
        answerSet.has(answerKey)
      ) {
        return res.status(409).json({
          error:
            "This question was already submitted."
        });
      }

      answerSet.add(answerKey);

      /*
        Fields.
      */
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

      /*
        Check answer.
      */
      const correct =
        selectedOption ===
        question.a;

      const marksAwarded =
        correct
          ? QUIZZES[stage].marks
          : 0;

      /*
        Update participant.
      */
      participant[usedField] += 1;

      participant[scoreField] +=
        marksAwarded;

      if (correct) {
        participant[correctField] +=
          1;
      }

      participant.status = "live";

      await dbUpdateParticipant(
        participant.id,
        {
          [usedField]:
            participant[usedField],

          [scoreField]:
            participant[scoreField],

          [correctField]:
            participant[correctField],

          status: "live"
        }
      );

      /*
        Save answer.
      */
      await dbInsertAnswer({
        participant_id:
          participant.id,

        stage,

        question_index:
          questionIndex,

        selected_option:
          selectedOption,

        is_correct:
          correct,

        marks:
          marksAwarded,

        submitted_at:
          new Date().toISOString()
      });

      /*
        Calculate current position.
      */
      const rows =
        await rankFor(stage);

      const position =
        rows.findIndex(
          (p) =>
            p.id ===
            participant.id
        ) + 1;

      /*
        Update participant browser.
      */
      io.to(
        `participant:${participant.id}`
      ).emit(
        "participant:update",
        participant
      );

      /*
        Update coordinator dashboard.
      */
      broadcastDashboard();

      /*
        ALWAYS RETURN JSON.
      */
      return res.status(200).json({
        ok: true,

        correct,

        marksAwarded,

        correctAnswer:
          question.o[question.a],

        score:
          participant[scoreField],

        position
      });
    } catch (error) {
      console.error(
        "ANSWER API ERROR:",
        error
      );

      /*
        VERY IMPORTANT:
        Even if backend crashes, return JSON,
        NOT index.html.
      */
      return res.status(500).json({
        error:
          "Server error while submitting answer."
      });
    }
  }
);

/* =========================================================
   FINISH PARTICIPANT QUIZ
========================================================= */

app.post(
  "/api/quiz/finish",
  async (req, res) => {
    try {
      const participantId =
        String(
          req.body.participantId || ""
        );

      const stage =
        String(
          req.body.stage || ""
        ).toUpperCase();

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

      if (!QUIZZES[stage]) {
        return res.status(400).json({
          error:
            "Invalid quiz stage."
        });
      }

      /*
        After Quiz A:
        participant waits for Quiz B.

        After Quiz B:
        participant is submitted.
      */
      participant.status =
        stage === "A"
          ? "waiting"
          : "submitted";

      participant.completed_at =
        stage === "B"
          ? new Date().toISOString()
          : null;

      await dbUpdateParticipant(
        participant.id,
        {
          status:
            participant.status,

          completed_at:
            participant.completed_at
        }
      );

      broadcastDashboard();

      return res.json({
        ok: true
      });
    } catch (error) {
      console.error(
        "Finish error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to finish quiz."
      });
    }
  }
);

/* =========================================================
   PARTICIPANT SUMMARY
========================================================= */

app.get(
  "/api/participant/:id/summary",
  async (req, res) => {
    try {
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

      const rowsA =
        await rankFor("A");

      const rowsB =
        await rankFor("B");

      return res.json({
        team:
          participant.team_name,

        stageA: {
          score:
            participant.stage_a_score,

          correct:
            participant.stage_a_correct,

          position:
            rowsA.findIndex(
              (p) =>
                p.id ===
                participant.id
            ) + 1
        },

        stageB: {
          score:
            participant.stage_b_score,

          correct:
            participant.stage_b_correct,

          position:
            rowsB.findIndex(
              (p) =>
                p.id ===
                participant.id
            ) + 1
        }
      });
    } catch (error) {
      console.error(
        "Summary error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to load summary."
      });
    }
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

app.post(
  "/api/coordinator/login",
  (req, res) => {
    const code =
      String(
        req.body.code || ""
      ).trim();

    if (
      code !==
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

    coordinatorTokens.add(
      token
    );

    return res.json({
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
    return res.json(
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
    try {
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

      /*
        Only participants who have not completed
        the current overall flow are included.

        After Quiz A:
        status = waiting

        After Quiz B:
        status = submitted
      */
      const participants =
        [
          ...memory.participants.values()
        ].filter(
          (p) =>
            p.status !==
            "submitted"
        );

      if (!participants.length) {
        return res.status(400).json({
          error:
            "No waiting participants found."
        });
      }

      const ids =
        participants.map(
          (p) => p.id
        );

      /*
        Clear duplicate-answer protection
        for the stage being started.
      */
      if (stage === "A") {
        memory.answersA.clear();
      } else {
        memory.answersB.clear();
      }

      /*
        New quiz state.
      */
      memory.quiz = {
        activeStage: stage,

        status: "running",

        startedAt:
          new Date().toISOString(),

        durationSeconds:
          QUIZZES[stage].duration
      };

      /*
        Set participants live.
      */
      for (
        const participant of participants
      ) {
        participant.status =
          "live";

        await dbUpdateParticipant(
          participant.id,
          {
            status: "live"
          }
        );
      }

      /*
        Save quiz state to Supabase.
      */
      if (supabase) {
        const { error } =
          await supabase
            .from("quiz_settings")
            .upsert({
              id: 1,

              active_stage:
                stage,

              status:
                "running",

              started_at:
                memory.quiz.startedAt,

              updated_at:
                new Date().toISOString()
            });

        if (error) {
          console.error(
            "Quiz settings error:",
            error
          );
        }
      }

      /*
        Tell only selected participants
        to start.
      */
      io.to("participants").emit(
        "quiz:started",
        {
          stage,

          durationSeconds:
            QUIZZES[stage].duration,

          participantIds:
            ids
        }
      );

      broadcastDashboard();

      return res.json({
        ok: true,

        stage,

        participantIds:
          ids
      });
    } catch (error) {
      console.error(
        "Start quiz error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to start quiz."
      });
    }
  }
);

/* =========================================================
   FINISH CURRENT QUIZ
========================================================= */

app.post(
  "/api/coordinator/finish",
  coordinatorAuth,
  async (req, res) => {
    try {
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
        const participant of
        memory.participants.values()
      ) {
        if (
          participant.status ===
          "live"
        ) {
          participant.status =
            stage === "A"
              ? "waiting"
              : "submitted";

          participant.completed_at =
            stage === "B"
              ? new Date().toISOString()
              : null;

          await dbUpdateParticipant(
            participant.id,
            {
              status:
                participant.status,

              completed_at:
                participant.completed_at
            }
          );
        }
      }

      memory.quiz = {
        activeStage: stage,

        status: "finished",

        startedAt:
          memory.quiz.startedAt,

        durationSeconds:
          memory.quiz
            .durationSeconds
      };

      if (supabase) {
        const { error } =
          await supabase
            .from("quiz_settings")
            .update({
              status:
                "finished",

              updated_at:
                new Date().toISOString()
            })
            .eq("id", 1);

        if (error) {
          console.error(
            "Quiz finish DB error:",
            error
          );
        }
      }

      io.to("participants").emit(
        "quiz:finished",
        {
          final:
            stage === "B"
        }
      );

      broadcastDashboard();

      return res.json({
        ok: true
      });
    } catch (error) {
      console.error(
        "Coordinator finish error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to finish quiz."
      });
    }
  }
);

/* =========================================================
   DELETE PARTICIPANT
========================================================= */

app.delete(
  "/api/coordinator/participant/:id",
  coordinatorAuth,
  async (req, res) => {
    try {
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
        Delete answers first.
      */
      if (supabase) {
        const {
          error: answerError
        } = await supabase
          .from("answers")
          .delete()
          .eq(
            "participant_id",
            id
          );

        if (answerError) {
          console.error(
            "Delete answers error:",
            answerError
          );
        }

        /*
          Delete participant.
        */
        const {
          error: participantError
        } = await supabase
          .from("participants")
          .delete()
          .eq("id", id);

        if (participantError) {
          console.error(
            "Delete participant error:",
            participantError
          );
        }
      }

      /*
        Remove from memory.
      */
      memory.participants.delete(
        id
      );

      /*
        Remove randomized question mappings.
      */
      for (
        const key of
        memory.displayOrders.keys()
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
        Remove duplicate-answer locks.
      */
      for (
        const set of [
          memory.answersA,
          memory.answersB
        ]
      ) {
        for (
          const key of set
        ) {
          if (
            key.startsWith(
              `${id}:`
            )
          ) {
            set.delete(key);
          }
        }
      }

      /*
        Tell participant browser
        that it has been removed.
      */
      io.to(
        `participant:${id}`
      ).emit(
        "participant:removed"
      );

      broadcastDashboard();

      return res.json({
        ok: true,
        id
      });
    } catch (error) {
      console.error(
        "Delete participant error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to delete participant."
      });
    }
  }
);

/* =========================================================
   CSV EXPORT
========================================================= */

app.get(
  "/api/coordinator/export",
  coordinatorAuth,
  (req, res) => {
    try {
      const rows = [
        ...memory.participants.values()
      ].sort(
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

      const csvRows =
        rows.map(
          (p) => [
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
            p.completed_at || ""
          ]
            .map(
              (value) =>
                `"${String(
                  value
                ).replace(
                  /"/g,
                  '""'
                )}"`
            )
            .join(",")
        );

      const csv = [
        header.join(","),
        ...csvRows
      ].join("\n");

      res.setHeader(
        "Content-Type",
        "text/csv;charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="xyfronix-ai-prompt-battle-results.csv"'
      );

      return res.send(csv);
    } catch (error) {
      console.error(
        "CSV export error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to export CSV."
      });
    }
  }
);

/* =========================================================
   SOCKET.IO
========================================================= */

io.on(
  "connection",
  (socket) => {
    console.log(
      "Socket connected:",
      socket.id
    );

    /*
      Participant joins:
      - global participant room
      - personal participant room
    */
    socket.on(
      "participant:join-room",
      ({ participantId }) => {
        if (!participantId) {
          return;
        }

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
      Coordinator room.
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

    socket.on(
      "disconnect",
      () => {
        console.log(
          "Socket disconnected:",
          socket.id
        );
      }
    );
  }
);

/* =========================================================
   DASHBOARD LIVE REFRESH
========================================================= */

setInterval(
  () => {
    broadcastDashboard();
  },
  3000
);

/* =========================================================
   SPA FALLBACK
   IMPORTANT:
   API ROUTES NEVER GET index.html
========================================================= */

app.use(
  (req, res, next) => {
    /*
      If an API route wasn't found,
      return JSON instead of index.html.
    */
    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return res.status(404).json({
        error:
          "API route not found.",
        method:
          req.method,
        path:
          req.path
      });
    }

    /*
      Socket.IO is handled by Socket.IO.
    */
    if (
      req.path.startsWith(
        "/socket.io/"
      )
    ) {
      return next();
    }

    /*
      SPA pages are GET only.
    */
    if (
      req.method !== "GET"
    ) {
      return res.status(405).json({
        error:
          "Method not allowed."
      });
    }

    return res.sendFile(
      path.join(
        PUBLIC_DIR,
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

    console.log(
      `Public directory: ${PUBLIC_DIR}`
    );
  }
);
