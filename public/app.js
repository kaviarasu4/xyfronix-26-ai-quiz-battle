const API = (
  window.XYF_CONFIG?.BACKEND_URL ||
  window.location.origin
).replace(/\/$/, "");


// =====================================================
// SOCKET.IO CONNECTION
// =====================================================

let socket = null;

function setConnection(online) {
  const el = document.getElementById("connection");

  if (!el) return;

  if (online) {
    el.textContent = "● LIVE";
    el.className = "connection live";
  } else {
    el.textContent = "● OFFLINE";
    el.className = "connection offline";
  }
}


try {

  if (typeof io === "function") {

    socket = io(API, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setConnection(true);

      // Rejoin participant room after reconnect
      if (state.participant) {
        socket.emit(
          "participant:join-room",
          {
            participantId: state.participant.id
          }
        );
      }

      // Rejoin coordinator room after reconnect
      if (
        sessionStorage.getItem("xyf_coord_token")
      ) {
        socket.emit("coordinator:join");
      }
    });


    socket.on("disconnect", () => {
      console.warn("Socket disconnected");
      setConnection(false);
    });


    socket.on("connect_error", (err) => {
      console.warn(
        "Socket connection error:",
        err.message
      );

      setConnection(false);
    });

  } else {

    console.warn(
      "Socket.IO client not available"
    );

    setConnection(false);
  }

} catch (err) {

  console.error(
    "Socket initialization error:",
    err
  );

  setConnection(false);
}



// =====================================================
// APP STATE
// =====================================================

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

  timeLeft: 0

};


// =====================================================
// HELPERS
// =====================================================

const $ = (id) =>
  document.getElementById(id);


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

    const element =
      $("screen-" + screen);

    if (element) {

      element.classList.toggle(
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

  const element = $("toast");

  if (!element) return;

  element.textContent = message;

  element.classList.add("show");

  setTimeout(() => {

    element.classList.remove("show");

  }, 2200);

}


function esc(value) {

  return String(value)
    .replace(
      /[&<>"']/g,
      (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char])
    );

}


function ordinal(number) {

  if (!number) return "—";

  const value = number % 100;

  if (
    value >= 11 &&
    value <= 13
  ) {

    return number + "th";

  }

  const last =
    number % 10;

  if (last === 1)
    return number + "st";

  if (last === 2)
    return number + "nd";

  if (last === 3)
    return number + "rd";

  return number + "th";

}



// =====================================================
// HOME BUTTONS
// =====================================================

const participantButton =
  $("go-participant");

if (participantButton) {

  participantButton.onclick = () => {

    show("join");

  };

}


const coordinatorButton =
  $("go-coordinator");

if (coordinatorButton) {

  coordinatorButton.onclick = () => {

    show("coordinator");

  };

}


const resultHome =
  $("result-home");

if (resultHome) {

  resultHome.onclick = () => {

    location.reload();

  };

}


document
  .querySelectorAll("[data-back]")
  .forEach((button) => {

    button.onclick = () => {

      show(button.dataset.back);

    };

  });



// =====================================================
// PARTICIPANT JOIN
// =====================================================

const joinForm =
  $("join-form");


if (joinForm) {

  joinForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      $("join-error").textContent = "";


      const teamName =
        $("team-name")
          .value
          .trim();


      const collegeName =
        $("college-name")
          .value
          .trim();


      if (!teamName || !collegeName) {

        $("join-error").textContent =
          "Please enter team and college name.";

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
          await response.json();


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


        sessionStorage.setItem(
          "xyf_participant_id",
          state.participant.id
        );


        $("waiting-team")
          .textContent =
          teamName.toUpperCase();


        $("waiting-college")
          .textContent =
          collegeName;


        $("waiting-status")
          .textContent =
          "Waiting for coordinator…";


        show("waiting");


        if (socket) {

          socket.emit(
            "participant:join-room",
            {
              participantId:
                state.participant.id
            }
          );

        }


        toast(
          "Joined successfully!"
        );


      } catch (error) {

        console.error(error);

        $("join-error")
          .textContent =
          error.message ||
          "Unable to join.";

      }

    }
  );

}



// =====================================================
// PARTICIPANT SOCKET EVENTS
// =====================================================

if (socket) {

  socket.on(
    "quiz:started",
    (payload) => {

      if (!state.participant)
        return;


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


  socket.on(
    "quiz:finished",
    (payload) => {

      if (!state.participant)
        return;


      finishParticipant(
        payload.final || false
      );

    }
  );


  socket.on(
    "participant:update",
    (participant) => {

      if (!state.participant)
        return;


      if (
        participant.id !==
        state.participant.id
      ) {

        return;

      }


      state.participant =
        participant;


      if (state.stage === "A") {

        state.score =
          participant.stage_a_score || 0;

      }


      if (state.stage === "B") {

        state.score =
          participant.stage_b_score || 0;

      }


      const scoreElement =
        $("quiz-score");

      if (scoreElement) {

        scoreElement.textContent =
          state.score;

      }

    }
  );

}



// =====================================================
// START QUIZ STAGE
// =====================================================

async function startStage(
  stage,
  durationSeconds
) {

  state.stage =
    stage;

  state.questionIndex = 0;

  state.selected = null;

  state.answered = false;


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
    durationSeconds;


  $("quiz-team")
    .textContent =
    state.participant.team_name;


  $("stage-chip")
    .textContent =
    stage === "A"
      ? "20 QUESTION QUIZ"
      : "25 SCENARIO QUIZ";


  $("quiz-title")
    .textContent =
    stage === "A"
      ? "AI Prompt Challenge"
      : "AI Scenario Challenge";


  $("quiz-score")
    .textContent =
    state.score;


  $("quiz-position")
    .textContent =
    "—";


  $("feedback")
    .className =
    "feedback hidden";


  $("next-question")
    .classList.add(
      "hidden"
    );


  $("submit-answer")
    .classList.remove(
      "hidden"
    );


  show("quiz");


  await loadQuestion();


  startTimer();

}



// =====================================================
// LOAD QUESTION
// =====================================================

async function loadQuestion() {

  state.selected = null;

  state.answered = false;


  $("submit-answer")
    .disabled = true;


  $("submit-answer")
    .classList.remove(
      "hidden"
    );


  $("feedback")
    .className =
    "feedback hidden";


  $("next-question")
    .classList.add(
      "hidden"
    );


  try {

    const response =
      await fetch(
        `${API}/api/quiz/${state.stage}/question/${state.questionIndex}`
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Question load failed"
      );

    }


    state.quiz =
      data;


    $("question-number")
      .textContent =
      `Question ${
        state.questionIndex + 1
      } / ${data.total}`;


    $("question-marks")
      .textContent =
      `${data.marks} marks`;


    $("question-text")
      .textContent =
      data.question;


    $("options")
      .innerHTML =
      data.options
        .map(
          (option, index) => `
            <label class="option">

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

            </label>
          `
        )
        .join("");


    document
      .querySelectorAll(".option")
      .forEach(
        (element, index) => {

          element.onclick =
            () => {

              if (
                state.answered
              ) return;


              state.selected =
                index;


              document
                .querySelectorAll(
                  ".option"
                )
                .forEach(
                  (item) => {

                    item.classList
                      .remove(
                        "selected"
                      );

                  }
                );


              element.classList.add(
                "selected"
              );


              $("submit-answer")
                .disabled =
                false;

            };

        }
      );


  } catch (error) {

    console.error(error);

    toast(
      error.message ||
      "Question loading failed."
    );

  }

}



// =====================================================
// SUBMIT ANSWER
// =====================================================

const submitAnswer =
  $("submit-answer");


if (submitAnswer) {

  submitAnswer.onclick =
    async () => {

      if (
        state.selected === null ||
        state.answered
      ) {

        return;

      }


      submitAnswer.disabled =
        true;


      try {

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
                  state.selected

              })
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Submission failed"
          );

        }


        state.answered =
          true;


        state.score =
          data.score;


        state.position =
          data.position;


        $("quiz-score")
          .textContent =
          data.score;


        $("quiz-position")
          .textContent =
          ordinal(
            data.position
          );


        showFeedback(data);


      } catch (error) {

        console.error(error);

        submitAnswer.disabled =
          false;


        toast(
          error.message ||
          "Answer submission failed."
        );

      }

    };

}



// =====================================================
// ANSWER FEEDBACK
// =====================================================

function showFeedback(data) {

  const feedback =
    $("feedback");


  feedback.className =
    "feedback " +
    (
      data.correct
        ? "correct"
        : "wrong"
    );


  feedback.innerHTML = `

    <b>
      ${
        data.correct
          ? "✓ CORRECT"
          : "✕ WRONG"
      }

      · +${data.marksAwarded}
      marks
    </b>

    ${
      data.correct
        ? ""
        : `
          <div>
            Correct answer:
            <strong>
              ${esc(
                data.correctAnswer
              )}
            </strong>
          </div>
        `
    }

    <small>
      Current score:
      ${data.score}
      · Current position:
      ${ordinal(data.position)}
    </small>

  `;


  $("next-question")
    .classList.remove(
      "hidden"
    );


  $("submit-answer")
    .classList.add(
      "hidden"
    );

}



// =====================================================
// NEXT QUESTION
// =====================================================

const nextQuestion =
  $("next-question");


if (nextQuestion) {

  nextQuestion.onclick =
    async () => {

      if (
        state.questionIndex >=
        state.quiz.total - 1
      ) {

        await finishParticipant(
          false
        );

        return;

      }


      state.questionIndex++;


      $("submit-answer")
        .classList.remove(
          "hidden"
        );


      await loadQuestion();

    };

}



// =====================================================
// TIMER
// =====================================================

function startTimer() {

  clearInterval(
    state.timer
  );


  renderTimer();


  state.timer =
    setInterval(
      () => {

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
    `${String(minutes)
      .padStart(2, "0")
    }:${
      String(seconds)
        .padStart(2, "0")
    }`;


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



// =====================================================
// AUTO FINISH
// =====================================================

async function autoFinish() {

  try {

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

  } catch (error) {

    console.warn(
      "Auto finish error:",
      error
    );

  }


  await finishParticipant(
    false
  );

}



// =====================================================
// PARTICIPANT RESULT
// =====================================================

async function finishParticipant(
  final
) {

  clearInterval(
    state.timer
  );


  try {

    const response =
      await fetch(
        `${API}/api/participant/${state.participant.id}/summary`
      );


    const data =
      await response.json();


    const summary =
      state.stage === "A"
        ? data.stageA
        : data.stageB;


    $("result-team")
      .textContent =
      state.participant.team_name;


    $("result-score")
      .textContent =
      summary.score;


    $("result-correct")
      .textContent =
      summary.correct;


    $("result-position")
      .textContent =
      ordinal(
        summary.position
      );


    $("result-note")
      .textContent =
      final
        ? "Event completed."
        : (
            state.stage === "A"
              ? "Waiting for the next quiz from the coordinator."
              : "Your submission has been recorded."
          );


    show("result");


  } catch (error) {

    console.error(error);

    show("result");

  }

}



// =====================================================
// COORDINATOR LOGIN
// =====================================================

const coordinatorForm =
  $("coord-form");


if (coordinatorForm) {

  coordinatorForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      $("coord-error")
        .textContent = "";


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
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Invalid code"
          );

        }


        sessionStorage.setItem(
          "xyf_coord_token",
          data.token
        );


        show("dashboard");


        await loadDashboard();


        if (socket) {

          socket.emit(
            "coordinator:join"
          );

        }


      } catch (error) {

        console.error(error);

        $("coord-error")
          .textContent =
          error.message ||
          "Login failed.";

      }

    }
  );

}



// =====================================================
// COORDINATOR API
// =====================================================

async function authFetch(
  url,
  options = {}
) {

  options.headers = {

    ...(options.headers || {}),

    "x-coordinator-token":
      sessionStorage.getItem(
        "xyf_coord_token"
      ) || ""

  };


  return fetch(
    API + url,
    options
  );

}



// =====================================================
// LOAD DASHBOARD
// =====================================================

async function loadDashboard() {

  try {

    const response =
      await authFetch(
        "/api/coordinator/state"
      );


    if (!response.ok) {

      show("coordinator");

      return;

    }


    const data =
      await response.json();


    renderDashboard(data);

  } catch (error) {

    console.error(
      "Dashboard error:",
      error
    );

    toast(
      "Unable to load dashboard."
    );

  }

}



// =====================================================
// DASHBOARD REALTIME
// =====================================================

if (socket) {

  socket.on(
    "dashboard:update",
    (data) => {

      renderDashboard(data);

    }
  );

}



// =====================================================
// RENDER DASHBOARD
// =====================================================

function renderDashboard(data) {

  const participants =
    data.participants || [];


  $("stat-total")
    .textContent =
    participants.length;


  $("stat-live")
    .textContent =
    participants.filter(
      (item) =>
        item.status === "live"
    ).length;


  $("stat-submitted")
    .textContent =
    participants.filter(
      (item) =>
        item.status ===
        "submitted"
    ).length;


  const quiz =
    data.quiz || {};


  $("stat-status")
    .textContent =
    (
      quiz.status ||
      "waiting"
    ).toUpperCase();


  $("dash-stage-title")
    .textContent =
    quiz.activeStage === "A"
      ? "20 Question Quiz"
      : quiz.activeStage === "B"
        ? "25 Scenario Quiz"
        : "Waiting to start";


  $("dash-stage-chip")
    .textContent =
    quiz.activeStage
      ? `STAGE ${quiz.activeStage}`
      : "IDLE";


  const stage =
    quiz.activeStage;


  const leaderboard =
    [...participants]
      .sort(
        (first, second) => {

          const firstScore =
            stage === "B"
              ? first.stage_b_score
              : first.stage_a_score;


          const secondScore =
            stage === "B"
              ? second.stage_b_score
              : second.stage_a_score;


          return (
            secondScore -
            firstScore
          );

        }
      );


  $("leaderboard-body")
    .innerHTML =
    leaderboard
      .map(
        (participant, index) => {

          const score =
            stage === "B"
              ? participant.stage_b_score
              : participant.stage_a_score;


          const correct =
            stage === "B"
              ? participant.stage_b_correct
              : participant.stage_a_correct;


          const used =
            stage === "B"
              ? participant.stage_b_used
              : participant.stage_a_used;


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
                class="status-${participant.status}"
              >
                ${participant.status
                  .toUpperCase()}
              </td>

              <td>
                ${
                  participant.completed_at
                    ? new Date(
                        participant.completed_at
                      ).toLocaleTimeString()
                    : "—"
                }
              </td>

            </tr>

          `;

        }
      )
      .join("");

}



// =====================================================
// START QUIZ - COORDINATOR
// =====================================================

const startA =
  $("start-a");


if (startA) {

  startA.onclick =
    () =>
      startQuizCoordinator(
        "A"
      );

}


const startB =
  $("start-b");


if (startB) {

  startB.onclick =
    () =>
      startQuizCoordinator(
        "B"
      );

}



// =====================================================
// FINISH QUIZ
// =====================================================

const finishLive =
  $("finish-live");


if (finishLive) {

  finishLive.onclick =
    async () => {

      if (
        !confirm(
          "Finish the current quiz for all participants?"
        )
      ) {

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
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Unable to finish quiz."
          );

        }


        toast(
          "Current quiz finished."
        );


      } catch (error) {

        console.error(error);

        toast(
          error.message
        );

      }

    };

}



// =====================================================
// START QUIZ API
// =====================================================

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
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Could not start quiz."
      );

    }


    toast(
      stage === "A"
        ? "20-question quiz started!"
        : "25-scenario quiz started!"
    );


  } catch (error) {

    console.error(error);

    toast(
      error.message ||
      "Could not start quiz."
    );

  }

}



// =====================================================
// CSV EXPORT
// =====================================================

const exportCsv =
  $("export-csv");


if (exportCsv) {

  exportCsv.onclick =
    async () => {

      try {

        const response =
          await authFetch(
            "/api/coordinator/export"
          );


        if (!response.ok) {

          throw new Error(
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


      } catch (error) {

        console.error(error);

        toast(
          error.message ||
          "Export failed."
        );

      }

    };

}



// =====================================================
// RESTORE PARTICIPANT SESSION
// =====================================================

(async function restoreParticipant() {

  const participantId =
    sessionStorage.getItem(
      "xyf_participant_id"
    );


  if (!participantId)
    return;


  try {

    const response =
      await fetch(
        `${API}/api/participant/${participantId}`
      );


    if (!response.ok)
      return;


    state.participant =
      await response.json();


    $("waiting-team")
      .textContent =
      state.participant
        .team_name
        .toUpperCase();


    $("waiting-college")
      .textContent =
      state.participant
        .college_name;


    if (socket) {

      socket.emit(
        "participant:join-room",
        {
          participantId
        }
      );

    }


  } catch (error) {

    console.warn(
      "Session restore failed:",
      error
    );

  }

})();


// =====================================================
// INITIAL STATUS
// =====================================================

if (socket && socket.connected) {

  setConnection(true);

} else {

  // Keep UI usable while Socket.IO connects.
  // Actual connection state will update automatically.
  setConnection(false);

}
