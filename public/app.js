/* =========================================================
   XYFRONIX '26 — AI PROMPT BATTLE
   FULL FRONTEND APPLICATION
========================================================= */

const API = (
  window.XYF_CONFIG?.BACKEND_URL ||
  window.location.origin
).replace(/\/$/, "");


/* =========================================================
   SOCKET CONNECTION
========================================================= */

const socket = io(API, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});


/* =========================================================
   GLOBAL STATE
========================================================= */

let state = {
  participant: null,

  stage: null,

  quiz: null,

  questionIndex: 0,

  selected: null,

  answered: false,

  score: 0,

  position: null,

  timer: null,

  timeLeft: 0,

  // Prevent duplicate finish requests
  quizClosing: false,

  // True when quiz was closed because
  // participant left the page
  quizClosedByVisibility: false,

  // Prevent repeated visibility handling
  visibilityProcessing: false
};


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);

const screens = [
  "home",
  "join",
  "waiting",
  "quiz",
  "result",
  "coordinator",
  "dashboard"
];


function show(name) {

  screens.forEach((screen) => {

    const el = $("screen-" + screen);

    if (el) {

      el.classList.toggle(
        "active",
        screen === name
      );

    }

  });


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


function toast(message) {

  const el = $("toast");

  if (!el) return;

  el.textContent = message;

  el.classList.add("show");


  setTimeout(() => {

    el.classList.remove("show");

  }, 2500);

}


function setConnection(online) {

  const el = $("connection");

  if (!el) return;


  if (online) {

    el.textContent =
      "● LIVE CONNECTED";

    el.className =
      "connection online";

  } else {

    el.textContent =
      "● OFFLINE";

    el.className =
      "connection offline";

  }

}


function esc(value) {

  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      (char) => {

        const map = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        };

        return map[char];

      }
    );

}


function ordinal(number) {

  if (!number) return "—";

  const n = Number(number);

  const lastTwo =
    n % 100;


  if (
    lastTwo >= 11 &&
    lastTwo <= 13
  ) {

    return n + "th";

  }


  const last =
    n % 10;


  if (last === 1) return n + "st";

  if (last === 2) return n + "nd";

  if (last === 3) return n + "rd";


  return n + "th";

}


/* =========================================================
   SAFE JSON FETCH
========================================================= */

async function readResponse(response) {

  const text =
    await response.text();


  if (!text) {

    return {};

  }


  try {

    return JSON.parse(text);

  } catch (error) {

    console.error(
      "Server returned non-JSON:",
      text.substring(0, 500)
    );


    throw new Error(
      "Server API error. Please check the Render server/API route."
    );

  }

}


/* =========================================================
   SOCKET EVENTS
========================================================= */

socket.on(
  "connect",
  () => {

    console.log(
      "Socket connected:",
      socket.id
    );


    setConnection(true);


    if (
      state.participant?.id
    ) {

      socket.emit(
        "participant:join-room",
        {
          participantId:
            state.participant.id
        }
      );

    }

  }
);


socket.on(
  "disconnect",
  () => {

    console.warn(
      "Socket disconnected"
    );

    setConnection(false);

  }
);


socket.on(
  "connect_error",
  (error) => {

    console.error(
      "Socket connection error:",
      error
    );

    setConnection(false);

  }
);


/* =========================================================
   HOME BUTTONS
========================================================= */

if ($("go-participant")) {

  $("go-participant").onclick =
    () => {

      show("join");

    };

}


if ($("go-coordinator")) {

  $("go-coordinator").onclick =
    () => {

      show("coordinator");

    };

}


if ($("result-home")) {

  $("result-home").onclick =
    () => {

      sessionStorage.removeItem(
        "xyf_participant_id"
      );

      location.reload();

    };

}


document
  .querySelectorAll("[data-back]")
  .forEach(
    (button) => {

      button.onclick =
        () => {

          show(
            button.dataset.back
          );

        };

    }
  );


/* =========================================================
   PARTICIPANT JOIN
========================================================= */

if ($("join-form")) {

  $("join-form").addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      $("join-error").textContent =
        "";


      const teamName =
        $("team-name")
          .value
          .trim();


      const collegeName =
        $("college-name")
          .value
          .trim();


      if (
        !teamName ||
        !collegeName
      ) {

        $("join-error").textContent =
          "Please enter team name and college name.";

        return;

      }


      try {

        const response =
          await fetch(
            API +
            "/api/participant/join",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                teamName,
                collegeName
              })
            }
          );


        const data =
          await readResponse(
            response
          );


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Join failed"
          );

        }


        state.participant =
          data.participant;


        state.score = 0;

        state.position = null;

        state.stage = null;

        state.quizClosing = false;

        state.quizClosedByVisibility =
          false;


        sessionStorage.setItem(
          "xyf_participant_id",
          state.participant.id
        );


        $("waiting-team").textContent =
          teamName.toUpperCase();


        $("waiting-college").textContent =
          collegeName;


        $("waiting-status").textContent =
          "Waiting for coordinator…";


        show("waiting");


        socket.emit(
          "participant:join-room",
          {
            participantId:
              state.participant.id
          }
        );


        toast(
          "Joined successfully"
        );


      } catch (error) {

        console.error(
          "Join error:",
          error
        );


        $("join-error").textContent =
          error.message;

      }

    }
  );

}


/* =========================================================
   QUIZ STARTED
========================================================= */

socket.on(
  "quiz:started",
  (payload) => {

    console.log(
      "Quiz started:",
      payload
    );


    if (
      !state.participant
    ) {

      return;

    }


    if (
      payload.participantIds &&
      !payload.participantIds.includes(
        state.participant.id
      )
    ) {

      return;

    }


    startStage(
      payload.stage,
      payload.durationSeconds
    );

  }
);


/* =========================================================
   QUIZ FINISHED
========================================================= */

socket.on(
  "quiz:finished",
  (payload) => {

    console.log(
      "Quiz finished:",
      payload
    );


    if (
      !state.participant
    ) {

      return;

    }


    if (state.stage) {

      /*
        If participant already closed the quiz
        because of visibility, don't create
        duplicate result handling.
      */

      if (
        state.quizClosing &&
        state.quizClosedByVisibility
      ) {

        return;

      }


      finishParticipant(
        payload?.final || false
      );

    }

  }
);


/* =========================================================
   PARTICIPANT LIVE UPDATE
========================================================= */

socket.on(
  "participant:update",
  (participant) => {

    if (
      !state.participant
    ) {

      return;

    }


    if (
      participant.id !==
      state.participant.id
    ) {

      return;

    }


    state.participant =
      participant;


    if (
      state.stage === "A"
    ) {

      state.score =
        participant.stage_a_score || 0;

    }


    if (
      state.stage === "B"
    ) {

      state.score =
        participant.stage_b_score || 0;

    }


    if ($("quiz-score")) {

      $("quiz-score").textContent =
        state.score;

    }

  }
);


/* =========================================================
   START STAGE
========================================================= */

async function startStage(
  stage,
  durationSeconds
) {

  clearInterval(
    state.timer
  );


  state.stage =
    stage;


  state.questionIndex = 0;

  state.selected = null;

  state.answered = false;

  state.quizClosing = false;

  state.quizClosedByVisibility =
    false;

  state.visibilityProcessing =
    false;


  state.score =
    stage === "A"
      ? (
          state.participant
            .stage_a_score || 0
        )
      : (
          state.participant
            .stage_b_score || 0
        );


  state.timeLeft =
    Number(
      durationSeconds ||
      (
        stage === "A"
          ? 300
          : 600
      )
    );


  $("quiz-team").textContent =
    state.participant.team_name;


  $("stage-chip").textContent =
    stage === "A"
      ? "20 QUESTION QUIZ"
      : "25 SCENARIO QUIZ";


  $("quiz-title").textContent =
    stage === "A"
      ? "AI Prompt Challenge"
      : "AI Scenario Challenge";


  $("quiz-score").textContent =
    state.score;


  $("quiz-position").textContent =
    "—";


  $("feedback").className =
    "feedback hidden";


  $("feedback").innerHTML =
    "";


  $("next-question").classList.add(
    "hidden"
  );


  $("submit-answer").classList.remove(
    "hidden"
  );


  show("quiz");


  await loadQuestion();


  startTimer();

}


/* =========================================================
   LOAD QUESTION
========================================================= */

async function loadQuestion() {

  state.selected = null;

  state.answered = false;


  const submitButton =
    $("submit-answer");


  const nextButton =
    $("next-question");


  const feedback =
    $("feedback");


  submitButton.disabled =
    true;


  submitButton.textContent =
    "SUBMIT ANSWER";


  submitButton.classList.remove(
    "hidden"
  );


  nextButton.classList.add(
    "hidden"
  );


  nextButton.disabled =
    true;


  nextButton.textContent =
    "NEXT QUESTION →";


  feedback.className =
    "feedback hidden";


  feedback.innerHTML =
    "";


  try {

    const response =
      await fetch(
        `${API}/api/quiz/${state.stage}/question/${state.questionIndex}?participantId=${encodeURIComponent(
          state.participant.id
        )}`
      );


    const data =
      await readResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Question loading failed"
      );

    }


    console.log(
      "Question:",
      data
    );


    state.quiz =
      data;


    /*
      Stage A = 20
      Stage B = 25

      If backend sends total,
      use backend value.
    */

    const total =
      data.total ??
      data.totalQuestions ??
      (
        state.stage === "A"
          ? 20
          : 25
      );


    $("question-number").textContent =
      `Question ${
        state.questionIndex + 1
      } / ${total}`;


    $("question-marks").textContent =
      `${data.marks} marks`;


    $("question-text").textContent =
      data.question;


    renderOptions(
      data.options || []
    );


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });


  } catch (error) {

    console.error(
      "Question load error:",
      error
    );


    toast(
      error.message
    );

  }

}


/* =========================================================
   RENDER OPTIONS
========================================================= */

function renderOptions(
  options
) {

  const container =
    $("options");


  container.innerHTML =
    "";


  options.forEach(
    (option, index) => {

      const label =
        document.createElement(
          "label"
        );


      label.className =
        "option";


      label.innerHTML = `
        <input
          type="radio"
          name="answer"
          value="${index}"
        >

        <span class="letter">
          ${String.fromCharCode(
            65 + index
          )}
        </span>

        <span class="option-text">
          ${esc(option)}
        </span>
      `;


      label.addEventListener(
        "click",
        () => {

          if (
            state.answered ||
            state.quizClosing
          ) {

            return;

          }


          state.selected =
            index;


          document
            .querySelectorAll(
              ".option"
            )
            .forEach(
              (item) => {

                item.classList.remove(
                  "selected"
                );

              }
            );


          label.classList.add(
            "selected"
          );


          const radio =
            label.querySelector(
              'input[type="radio"]'
            );


          if (radio) {

            radio.checked =
              true;

          }


          $("submit-answer").disabled =
            false;

        }
      );


      container.appendChild(
        label
      );

    }
  );

}


/* =========================================================
   SUBMIT ANSWER
========================================================= */

if ($("submit-answer")) {

  $("submit-answer").onclick =
    async () => {

      if (
        state.selected === null ||
        state.answered ||
        state.quizClosing
      ) {

        return;

      }


      const submitButton =
        $("submit-answer");


      submitButton.disabled =
        true;


      submitButton.textContent =
        "SUBMITTING...";


      try {

        /*
          Randomized option position
          -> original A/B/C/D answer
        */

        const originalAnswer =
          state.quiz?.optionMap?.[
            state.selected
          ];


        /*
          Fallback for old backend
        */

        const selectedOption =
          originalAnswer ??
          String.fromCharCode(
            65 + state.selected
          );


        console.log(
          "Submitting:",
          {
            questionIndex:
              state.questionIndex,

            displayedIndex:
              state.selected,

            selectedOption
          }
        );


        const response =
          await fetch(
            API +
            "/api/quiz/answer",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({

                participantId:
                  state.participant.id,

                stage:
                  state.stage,

                questionIndex:
                  state.questionIndex,

                selectedOption:
                  selectedOption

              })
            }
          );


        const data =
          await readResponse(
            response
          );


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Answer submission failed"
          );

        }


        state.answered =
          true;


        state.score =
          Number(
            data.score ??
            state.score
          );


        state.position =
          data.position ??
          state.position;


        $("quiz-score").textContent =
          state.score;


        $("quiz-position").textContent =
          ordinal(
            state.position
          );


        /*
          Disable all options
        */

        document
          .querySelectorAll(
            ".option"
          )
          .forEach(
            (option) => {

              option.classList.add(
                "disabled"
              );

              option.style.pointerEvents =
                "none";

            }
          );


        showFeedback(
          data
        );


      } catch (error) {

        console.error(
          "Answer submission error:",
          error
        );


        submitButton.disabled =
          false;


        submitButton.textContent =
          "SUBMIT ANSWER";


        toast(
          error.message
        );

      }

    };

}


/* =========================================================
   SHOW FEEDBACK
========================================================= */

function showFeedback(
  data
) {

  const feedback =
    $("feedback");


  const correct =
    Boolean(
      data.correct
    );


  const marks =
    Number(
      data.marksAwarded ??
      data.marks ??
      0
    );


  const score =
    Number(
      data.score ??
      state.score
    );


  const position =
    data.position ??
    state.position;


  if (correct) {

    feedback.className =
      "feedback correct";


    feedback.innerHTML = `
      <b>
        ✓ CORRECT · +${marks} marks
      </b>

      <small>
        Current score: ${score}
        · Current position:
        ${ordinal(position)}
      </small>
    `;

  } else {

    const answer =
      data.correctAnswer ??
      "See coordinator";


    feedback.className =
      "feedback wrong";


    feedback.innerHTML = `
      <b>
        ✕ WRONG · +0 marks
      </b>

      <div>
        Correct answer:
        <strong>
          ${esc(answer)}
        </strong>
      </div>

      <small>
        Current score: ${score}
        · Current position:
        ${ordinal(position)}
      </small>
    `;

  }


  $("submit-answer").classList.add(
    "hidden"
  );


  const nextButton =
    $("next-question");


  const total =
    state.quiz?.total ??
    state.quiz?.totalQuestions ??
    (
      state.stage === "A"
        ? 20
        : 25
    );


  if (
    state.questionIndex <
    total - 1
  ) {

    nextButton.textContent =
      "NEXT QUESTION →";

  } else {

    nextButton.textContent =
      "FINISH QUIZ →";

  }


  nextButton.disabled =
    false;


  nextButton.classList.remove(
    "hidden"
  );


  setTimeout(
    () => {

      nextButton.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

    },
    150
  );

}


/* =========================================================
   NEXT QUESTION
========================================================= */

if ($("next-question")) {

  $("next-question").onclick =
    async () => {

      if (
        !state.answered ||
        state.quizClosing
      ) {

        return;

      }


      const nextButton =
        $("next-question");


      const total =
        state.quiz?.total ??
        state.quiz?.totalQuestions ??
        (
          state.stage === "A"
            ? 20
            : 25
        );


      /*
        LAST QUESTION
      */

      if (
        state.questionIndex >=
        total - 1
      ) {

        nextButton.disabled =
          true;


        nextButton.textContent =
          "FINISHING...";


        await finishQuiz();


        return;

      }


      /*
        NEXT QUESTION
      */

      nextButton.disabled =
        true;


      nextButton.textContent =
        "LOADING...";


      state.questionIndex++;

      state.selected = null;

      state.answered = false;


      await loadQuestion();


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    };

}


/* =========================================================
   FINISH QUIZ
========================================================= */

async function finishQuiz() {

  /*
    Prevent duplicate finish
  */

  if (
    state.quizClosing
  ) {

    return;

  }


  state.quizClosing =
    true;


  clearInterval(
    state.timer
  );


  try {

    const response =
      await fetch(
        API +
        "/api/quiz/finish",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            participantId:
              state.participant.id,

            stage:
              state.stage

          })
        }
      );


    const data =
      await readResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Quiz finish failed"
      );

    }


  } catch (error) {

    console.error(
      "Finish error:",
      error
    );

  }


  await finishParticipant(
    false
  );

}


/* =========================================================
   TIMER
========================================================= */

function startTimer() {

  clearInterval(
    state.timer
  );


  renderTimer();


  state.timer =
    setInterval(
      () => {

        if (
          state.quizClosing
        ) {

          clearInterval(
            state.timer
          );

          return;

        }


        state.timeLeft--;


        renderTimer();


        if (
          state.timeLeft <= 0
        ) {

          clearInterval(
            state.timer
          );


          autoFinish();

        }

      },
      1000
    );

}


function renderTimer() {

  const minutes =
    Math.floor(
      state.timeLeft / 60
    );


  const seconds =
    state.timeLeft % 60;


  const timer =
    $("timer");


  if (!timer) return;


  timer.textContent =
    `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;


  timer.classList.toggle(
    "warning",
    state.timeLeft <= 60 &&
    state.timeLeft > 20
  );


  timer.classList.toggle(
    "danger",
    state.timeLeft <= 20
  );

}


/* =========================================================
   AUTO FINISH — TIME UP
========================================================= */

async function autoFinish() {

  if (
    state.quizClosing
  ) {

    return;

  }


  state.quizClosing =
    true;


  toast(
    "Time up! Quiz is being submitted..."
  );


  clearInterval(
    state.timer
  );


  try {

    const response =
      await fetch(
        API +
        "/api/quiz/finish",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            participantId:
              state.participant.id,

            stage:
              state.stage

          })
        }
      );


    await readResponse(
      response
    );


  } catch (error) {

    console.error(
      "Auto finish error:",
      error
    );

  }


  await finishParticipant(
    false
  );

}


/* =========================================================
   TAB / WINDOW LEAVE PROTECTION
========================================================= */

/*
  IMPORTANT:

  visibilitychange is the main detection method.

  If participant:
  - switches to another tab
  - opens another tab
  - minimizes browser
  - moves away from the quiz page

  the browser normally changes visibility
  to "hidden".

  We then finish the active quiz.
*/


document.addEventListener(
  "visibilitychange",
  async () => {

    /*
      Only handle when page becomes hidden.
    */

    if (
      document.visibilityState !==
      "hidden"
    ) {

      return;

    }


    /*
      Must be an active participant quiz.
    */

    if (
      !state.participant ||
      !state.stage
    ) {

      return;

    }


    const quizScreen =
      $("screen-quiz");


    if (
      !quizScreen ||
      !quizScreen.classList.contains(
        "active"
      )
    ) {

      return;

    }


    /*
      Prevent duplicate processing.
    */

    if (
      state.quizClosing ||
      state.visibilityProcessing
    ) {

      return;

    }


    state.visibilityProcessing =
      true;


    state.quizClosing =
      true;


    state.quizClosedByVisibility =
      true;


    console.warn(
      "Participant left quiz page. Auto-finishing quiz."
    );


    /*
      Stop timer immediately.
    */

    clearInterval(
      state.timer
    );


    /*
      Disable quiz controls.
    */

    if (
      $("submit-answer")
    ) {

      $("submit-answer").disabled =
        true;

    }


    if (
      $("next-question")
    ) {

      $("next-question").disabled =
        true;

    }


    /*
      Disable option clicks.
    */

    document
      .querySelectorAll(
        ".option"
      )
      .forEach(
        (option) => {

          option.classList.add(
            "disabled"
          );

          option.style.pointerEvents =
            "none";

        }
      );


    /*
      Finish on server.

      keepalive is important because
      the page is becoming hidden.
    */

    try {

      const response =
        await fetch(
          API +
          "/api/quiz/finish",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              participantId:
                state.participant.id,

              stage:
                state.stage

            }),

            keepalive: true
          }
        );


      console.log(
        "Visibility finish status:",
        response.status
      );


    } catch (error) {

      /*
        Browser may cancel normal async
        requests during page hide.
      */

      console.warn(
        "Visibility finish request:",
        error
      );

    }

  }
);


/* =========================================================
   RETURN AFTER LEAVING QUIZ
========================================================= */

document.addEventListener(
  "visibilitychange",
  async () => {

    /*
      Only execute when page becomes visible.
    */

    if (
      document.visibilityState !==
      "visible"
    ) {

      return;

    }


    /*
      Nothing happened previously.
    */

    if (
      !state.quizClosedByVisibility
    ) {

      return;

    }


    console.log(
      "Participant returned after leaving quiz."
    );


    state.quizClosedByVisibility =
      false;


    state.visibilityProcessing =
      false;


    clearInterval(
      state.timer
    );


    /*
      Show result.
    */

    if (
      state.participant &&
      state.stage
    ) {

      await finishParticipant(
        false
      );

    }

  }
);


/* =========================================================
   PARTICIPANT RESULT
========================================================= */

async function finishParticipant(
  final
) {

  clearInterval(
    state.timer
  );


  try {

    const response =
      await fetch(
        `${API}/api/participant/${encodeURIComponent(
          state.participant.id
        )}/summary`
      );


    const data =
      await readResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Result loading failed"
      );

    }


    const summary =
      state.stage === "A"
        ? data.stageA
        : data.stageB;


    $("result-team").textContent =
      state.participant.team_name;


    $("result-score").textContent =
      summary.score ?? 0;


    $("result-correct").textContent =
      summary.correct ?? 0;


    $("result-position").textContent =
      ordinal(
        summary.position
      );


    /*
      Special message when participant
      left the quiz page.
    */

    if (
      state.quizClosedByVisibility
    ) {

      $("result-note").textContent =
        "Quiz ended because you left the quiz window.";

    } else if (final) {

      $("result-note").textContent =
        "Event completed.";

    } else if (
      state.stage === "A"
    ) {

      $("result-note").textContent =
        "Waiting for the next quiz from the coordinator.";

    } else {

      $("result-note").textContent =
        "Your submission has been recorded.";

    }


    show("result");


  } catch (error) {

    console.error(
      "Result error:",
      error
    );


    $("result-team").textContent =
      state.participant.team_name;


    $("result-note").textContent =
      state.quizClosedByVisibility
        ? "Quiz ended because you left the quiz window."
        : "Your quiz has been submitted.";


    show("result");

  }

}


/* =========================================================
   COORDINATOR LOGIN
========================================================= */

if ($("coord-form")) {

  $("coord-form").addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      $("coord-error").textContent =
        "";


      const code =
        $("coord-code")
          .value
          .trim();


      try {

        const response =
          await fetch(
            API +
            "/api/coordinator/login",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                code
              })
            }
          );


        const data =
          await readResponse(
            response
          );


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Invalid coordinator code"
          );

        }


        sessionStorage.setItem(
          "xyf_coord_token",
          data.token
        );


        show("dashboard");


        await loadDashboard();


        socket.emit(
          "coordinator:join"
        );


      } catch (error) {

        console.error(
          "Coordinator login:",
          error
        );


        $("coord-error").textContent =
          error.message;

      }

    }
  );

}


/* =========================================================
   COORDINATOR AUTH FETCH
========================================================= */

async function authFetch(
  url,
  options = {}
) {

  const token =
    sessionStorage.getItem(
      "xyf_coord_token"
    ) || "";


  options.headers = {

    ...(options.headers || {}),

    "x-coordinator-token":
      token

  };


  return fetch(
    API + url,
    options
  );

}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

  try {

    const response =
      await authFetch(
        "/api/coordinator/state"
      );


    const data =
      await readResponse(
        response
      );


    if (!response.ok) {

      show("coordinator");

      return;

    }


    renderDashboard(
      data
    );


  } catch (error) {

    console.error(
      "Dashboard error:",
      error
    );


    toast(
      "Could not load dashboard"
    );

  }

}


/* =========================================================
   LIVE DASHBOARD UPDATE
========================================================= */

socket.on(
  "dashboard:update",
  (data) => {

    try {

      renderDashboard(
        data
      );

    } catch (error) {

      console.error(
        "Dashboard render error:",
        error
      );

    }

  }
);


/* =========================================================
   RENDER COORDINATOR DASHBOARD
========================================================= */

function renderDashboard(
  data
) {

  const participants =
    data.participants || [];


  const quiz =
    data.quiz || {};


  /*
    Stats
  */

  $("stat-total").textContent =
    participants.length;


  $("stat-live").textContent =
    participants.filter(
      p =>
        p.status === "live"
    ).length;


  $("stat-submitted").textContent =
    participants.filter(
      p =>
        p.status === "submitted"
    ).length;


  $("stat-status").textContent =
    (
      quiz.status ||
      "waiting"
    ).toUpperCase();


  /*
    Stage title
  */

  if (
    quiz.activeStage === "A"
  ) {

    $("dash-stage-title").textContent =
      "20 Question Quiz";

  } else if (
    quiz.activeStage === "B"
  ) {

    $("dash-stage-title").textContent =
      "25 Scenario Quiz";

  } else {

    $("dash-stage-title").textContent =
      "Waiting to start";

  }


  $("dash-stage-chip").textContent =
    quiz.activeStage
      ? `STAGE ${quiz.activeStage}`
      : "IDLE";


  /*
    Leaderboard stage
  */

  const stage =
    quiz.activeStage ||
    "A";


  const list =
    [...participants].sort(
      (a, b) => {

        const scoreA =
          stage === "B"
            ? Number(
                a.stage_b_score || 0
              )
            : Number(
                a.stage_a_score || 0
              );


        const scoreB =
          stage === "B"
            ? Number(
                b.stage_b_score || 0
              )
            : Number(
                b.stage_a_score || 0
              );


        if (
          scoreB !== scoreA
        ) {

          return (
            scoreB -
            scoreA
          );

        }


        return (
          new Date(
            a.joined_at || 0
          ) -
          new Date(
            b.joined_at || 0
          )
        );

      }
    );


  /*
    Table
  */

  $("leaderboard-body").innerHTML =
    list.map(
      (participant, index) => {

        const score =
          stage === "B"
            ? Number(
                participant.stage_b_score || 0
              )
            : Number(
                participant.stage_a_score || 0
              );


        const correct =
          stage === "B"
            ? Number(
                participant.stage_b_correct || 0
              )
            : Number(
                participant.stage_a_correct || 0
              );


        const used =
          stage === "B"
            ? Number(
                participant.stage_b_used || 0
              )
            : Number(
                participant.stage_a_used || 0
              );


        const completed =
          participant.completed_at
            ? new Date(
                participant.completed_at
              ).toLocaleTimeString()
            : "—";


        return `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${esc(
                participant.team_name
              )}
            </td>

            <td>
              ${esc(
                participant.college_name
              )}
            </td>

            <td>
              ${score}
            </td>

            <td>
              ${correct}/${used}
            </td>

            <td
              class="status-${esc(
                participant.status
              )}"
            >
              ${esc(
                String(
                  participant.status || ""
                ).toUpperCase()
              )}
            </td>

            <td>
              ${completed}
            </td>

            <td>

              <button
                class="btn danger btn-delete"
                data-delete-id="${esc(
                  participant.id
                )}"
                type="button"
              >
                DELETE
              </button>

            </td>

          </tr>
        `;

      }
    ).join("");


  /*
    Attach DELETE events
  */

  document
    .querySelectorAll(
      "[data-delete-id]"
    )
    .forEach(
      (button) => {

        button.onclick =
          () => {

            deleteParticipant(
              button.dataset.deleteId
            );

          };

      }
    );

}


/* =========================================================
   DELETE PARTICIPANT
========================================================= */

async function deleteParticipant(
  id
) {

  const confirmed =
    confirm(
      "Delete this participant?\n\nThis will remove their stored answers and results too."
    );


  if (!confirmed) {

    return;

  }


  try {

    const response =
      await authFetch(
        `/api/coordinator/participant/${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE"
        }
      );


    const data =
      await readResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Delete failed"
      );

    }


    toast(
      "Participant deleted"
    );


    await loadDashboard();


  } catch (error) {

    console.error(
      "Delete error:",
      error
    );


    toast(
      error.message
    );

  }

}


/* =========================================================
   START QUIZ — COORDINATOR
========================================================= */

if ($("start-a")) {

  $("start-a").onclick =
    () => {

      startQuizCoordinator(
        "A"
      );

    };

}


if ($("start-b")) {

  $("start-b").onclick =
    () => {

      startQuizCoordinator(
        "B"
      );

    };

}


async function startQuizCoordinator(
  stage
) {

  try {

    const response =
      await authFetch(
        "/api/coordinator/start",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            stage
          })
        }
      );


    const data =
      await readResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Could not start quiz"
      );

    }


    toast(
      stage === "A"
        ? "20-question quiz started"
        : "25-scenario quiz started"
    );


    await loadDashboard();


  } catch (error) {

    console.error(
      "Start quiz error:",
      error
    );


    toast(
      error.message
    );

  }

}


/* =========================================================
   FINISH CURRENT QUIZ — COORDINATOR
========================================================= */

if ($("finish-live")) {

  $("finish-live").onclick =
    async () => {

      const confirmed =
        confirm(
          "Finish the current quiz for all participants?"
        );


      if (!confirmed) {

        return;

      }


      try {

        const response =
          await authFetch(
            "/api/coordinator/finish",
            {
              method: "POST"
            }
          );


        const data =
          await readResponse(
            response
          );


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Could not finish quiz"
          );

        }


        toast(
          "Current quiz finished"
        );


        await loadDashboard();


      } catch (error) {

        console.error(
          "Finish current quiz:",
          error
        );


        toast(
          error.message
        );

      }

    };

}


/* =========================================================
   CSV EXPORT
========================================================= */

if ($("export-csv")) {

  $("export-csv").onclick =
    async () => {

      try {

        const response =
          await authFetch(
            "/api/coordinator/export"
          );


        if (!response.ok) {

          const data =
            await readResponse(
              response
            );


          throw new Error(
            data.error ||
            "Export failed"
          );

        }


        const blob =
          await response.blob();


        const url =
          URL.createObjectURL(
            blob
          );


        const link =
          document.createElement(
            "a"
          );


        link.href =
          url;


        link.download =
          "xyfronix-ai-prompt-battle-results.csv";


        document.body.appendChild(
          link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
          url
        );


        toast(
          "CSV exported"
        );


      } catch (error) {

        console.error(
          "CSV error:",
          error
        );


        toast(
          error.message
        );

      }

    };

}


/* =========================================================
   RESTORE PARTICIPANT SESSION
========================================================= */

(async function restoreParticipant() {

  const id =
    sessionStorage.getItem(
      "xyf_participant_id"
    );


  if (!id) {

    return;

  }


  try {

    const response =
      await fetch(
        `${API}/api/participant/${encodeURIComponent(
          id
        )}`
      );


    if (!response.ok) {

      sessionStorage.removeItem(
        "xyf_participant_id"
      );

      return;

    }


    const participant =
      await readResponse(
        response
      );


    state.participant =
      participant;


    $("waiting-team").textContent =
      participant.team_name.toUpperCase();


    $("waiting-college").textContent =
      participant.college_name;


    socket.emit(
      "participant:join-room",
      {
        participantId: id
      }
    );


  } catch (error) {

    console.error(
      "Session restore error:",
      error
    );

  }

})();


/* =========================================================
   INITIAL CONNECTION STATUS
========================================================= */

if (
  socket.connected
) {

  setConnection(
    true
  );

} else {

  setConnection(
    false
  );

}


console.log(
  "XYFRONIX '26 AI Prompt Battle loaded."
);


console.log(
  "Backend API:",
  API
);
