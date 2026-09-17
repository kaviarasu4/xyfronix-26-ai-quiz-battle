const API = window.XYF_CONFIG.BACKEND_URL.replace(/\/$/, "");
const socket = io(API, {
  transports: ["websocket", "polling"]
});

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
  screens.forEach((s) => {
    const el = $("screen-" + s);
    if (el) {
      el.classList.toggle("active", s === name);
    }
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function toast(msg) {
  const el = $("toast");

  if (!el) return;

  el.textContent = msg;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 2200);
}

function setConnection(online) {
  const el = $("connection");

  if (!el) return;

  el.textContent = online
    ? "● LIVE CONNECTED"
    : "● OFFLINE";

  el.className =
    "connection " +
    (online ? "online" : "offline");
}

function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[c]
  );
}

/* =========================
   SOCKET
========================= */

socket.on("connect", () => {
  setConnection(true);

  if (state.participant?.id) {
    socket.emit("participant:join-room", {
      participantId: state.participant.id
    });
  }
});

socket.on("disconnect", () => {
  setConnection(false);
});

/* =========================
   NAVIGATION
========================= */

if ($("go-participant")) {
  $("go-participant").onclick = () => {
    show("join");
  };
}

if ($("go-coordinator")) {
  $("go-coordinator").onclick = () => {
    show("coordinator");
  };
}

if ($("result-home")) {
  $("result-home").onclick = () => {
    location.reload();
  };
}

document.querySelectorAll("[data-back]").forEach((btn) => {
  btn.onclick = () => {
    show(btn.dataset.back);
  };
});

/* =========================
   PARTICIPANT JOIN
========================= */

$("join-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  $("join-error").textContent = "";

  const teamName =
    $("team-name").value.trim();

  const collegeName =
    $("college-name").value.trim();

  if (!teamName || !collegeName) {
    $("join-error").textContent =
      "Please enter Team Name and College Name.";

    return;
  }

  try {
    const response = await fetch(
      API + "/api/participant/join",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          teamName,
          collegeName
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Join failed"
      );
    }

    state.participant = data.participant;
    state.score = 0;
    state.position = null;

    sessionStorage.setItem(
      "xyf_participant_id",
      state.participant.id
    );

    $("waiting-team").textContent =
      teamName.toUpperCase();

    $("waiting-college").textContent =
      collegeName;

    show("waiting");

    socket.emit("participant:join-room", {
      participantId: state.participant.id
    });

    toast("Joined successfully!");
  } catch (error) {
    $("join-error").textContent =
      error.message;
  }
});

/* =========================
   QUIZ START
========================= */

socket.on("quiz:started", (payload) => {
  if (!state.participant) return;

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
});

socket.on("quiz:finished", (payload) => {
  if (!state.participant) return;

  finishParticipant(
    payload.final || false
  );
});

/* =========================
   PARTICIPANT REMOVED
========================= */

socket.on("participant:removed", () => {
  sessionStorage.removeItem(
    "xyf_participant_id"
  );

  state.participant = null;

  clearInterval(state.timer);

  alert(
    "Your team has been removed by the coordinator."
  );

  location.reload();
});

/* =========================
   PARTICIPANT LIVE UPDATE
========================= */

socket.on("participant:update", (p) => {
  if (!state.participant) return;

  if (p.id !== state.participant.id) return;

  state.participant = p;

  if (state.stage === "A") {
    state.score =
      p.stage_a_score || 0;
  }

  if (state.stage === "B") {
    state.score =
      p.stage_b_score || 0;
  }

  if ($("quiz-score")) {
    $("quiz-score").textContent =
      state.score;
  }
});

/* =========================
   START STAGE
========================= */

async function startStage(
  stage,
  durationSeconds
) {
  state.stage = stage;

  state.questionIndex = 0;
  state.selected = null;
  state.answered = false;

  state.score =
    stage === "A"
      ? state.participant.stage_a_score || 0
      : state.participant.stage_b_score || 0;

  state.timeLeft =
    durationSeconds;

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

  $("feedback").className =
    "feedback hidden";

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

/* =========================
   LOAD QUESTION
========================= */

async function loadQuestion() {
  state.selected = null;
  state.answered = false;

  $("submit-answer").disabled = true;

  $("submit-answer").classList.remove(
    "hidden"
  );

  $("feedback").className =
    "feedback hidden";

  $("next-question").classList.add(
    "hidden"
  );

  try {
    const response = await fetch(
      `${API}/api/quiz/${state.stage}/question/${state.questionIndex}?participantId=${encodeURIComponent(
        state.participant.id
      )}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Question load failed"
      );
    }

    state.quiz = data;

    $("question-number").textContent =
      `Question ${
        state.questionIndex + 1
      } / ${data.total}`;

    $("question-marks").textContent =
      `${data.marks} marks`;

    $("question-text").textContent =
      data.question;

    /*
      IMPORTANT:

      Backend sends a RANDOM option order.

      Example:

      Original:
      A = Wrong
      B = Correct
      C = Wrong
      D = Wrong

      Display may become:

      A = Wrong
      B = Wrong
      C = Correct
      D = Wrong

      optionMap keeps the original indexes.
    */

    $("options").innerHTML =
      data.options
        .map(
          (option, i) => `
          <label class="option">
            <input
              type="radio"
              name="answer"
              value="${i}"
            >

            <span class="letter">
              ${String.fromCharCode(
                65 + i
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
      .forEach((el, i) => {
        el.onclick = () => {
          if (state.answered) return;

          state.selected = i;

          document
            .querySelectorAll(".option")
            .forEach((x) =>
              x.classList.remove(
                "selected"
              )
            );

          el.classList.add("selected");

          $("submit-answer").disabled =
            false;
        };
      });
  } catch (error) {
    toast(error.message);
  }
}

/* =========================
   SUBMIT ANSWER
========================= */

$("submit-answer").onclick =
  async () => {
    if (
      state.selected === null ||
      state.answered
    ) {
      return;
    }

    $("submit-answer").disabled =
      true;

    try {
      /*
        Convert visible option position
        back to original question option.
      */

      const originalOption =
        state.quiz.optionMap[
          state.selected
        ];

      const response = await fetch(
        API + "/api/quiz/answer",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            participantId:
              state.participant.id,

            stage: state.stage,

            questionIndex:
              state.questionIndex,

            selectedOption:
              originalOption
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

      state.answered = true;

      state.score = data.score;

      state.position =
        data.position;

      $("quiz-score").textContent =
        data.score;

      $("quiz-position").textContent =
        ordinal(data.position);

      showFeedback(data);
    } catch (error) {
      $("submit-answer").disabled =
        false;

      toast(error.message);
    }
  };

/* =========================
   FEEDBACK
========================= */

function showFeedback(data) {
  const feedback =
    $("feedback");

  feedback.className =
    "feedback " +
    (data.correct
      ? "correct"
      : "wrong");

  feedback.innerHTML = `
    <b>
      ${
        data.correct
          ? "✓ CORRECT"
          : "✕ WRONG"
      }
      · +${data.marksAwarded} marks
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

  $("next-question").classList.remove(
    "hidden"
  );

  $("submit-answer").classList.add(
    "hidden"
  );
}

/* =========================
   NEXT QUESTION
========================= */

$("next-question").onclick =
  async () => {
    if (
      state.questionIndex >=
      state.quiz.total - 1
    ) {
      await finishParticipant(false);
      return;
    }

    state.questionIndex++;

    await loadQuestion();
  };

/* =========================
   TIMER
========================= */

function startTimer() {
  clearInterval(state.timer);

  renderTimer();

  state.timer =
    setInterval(() => {
      state.timeLeft--;

      renderTimer();

      if (state.timeLeft <= 0) {
        clearInterval(
          state.timer
        );

        autoFinish();
      }
    }, 1000);
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

/* =========================
   AUTO FINISH
========================= */

async function autoFinish() {
  try {
    await fetch(
      API + "/api/quiz/finish",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          participantId:
            state.participant.id,

          stage: state.stage
        })
      }
    );
  } catch (e) {}

  await finishParticipant(false);
}

/* =========================
   RESULT
========================= */

async function finishParticipant(
  final
) {
  clearInterval(state.timer);

  try {
    const response =
      await fetch(
        `${API}/api/participant/${state.participant.id}/summary`
      );

    const data =
      await response.json();

    const result =
      state.stage === "A"
        ? data.stageA
        : data.stageB;

    $("result-team").textContent =
      state.participant.team_name;

    $("result-score").textContent =
      result.score;

    $("result-correct").textContent =
      result.correct;

    $("result-position").textContent =
      ordinal(result.position);

    $("result-note").textContent =
      final
        ? "Event completed."
        : state.stage === "A"
        ? "Waiting for the next quiz from the coordinator."
        : "Your submission has been recorded.";

    show("result");
  } catch (error) {
    show("result");
  }
}

/* =========================
   ORDINAL
========================= */

function ordinal(n) {
  if (!n) return "—";

  const value = n % 100;

  if (
    value >= 11 &&
    value <= 13
  ) {
    return n + "th";
  }

  const last =
    n % 10;

  if (last === 1)
    return n + "st";

  if (last === 2)
    return n + "nd";

  if (last === 3)
    return n + "rd";

  return n + "th";
}

/* =========================
   COORDINATOR LOGIN
========================= */

$("coord-form").addEventListener(
  "submit",
  async (e) => {
    e.preventDefault();

    $("coord-error").textContent =
      "";

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
              code: $(
                "coord-code"
              ).value.trim()
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

      loadDashboard();

      socket.emit(
        "coordinator:join"
      );
    } catch (error) {
      $("coord-error").textContent =
        error.message;
    }
  }
);

/* =========================
   COORDINATOR AUTH
========================= */

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

/* =========================
   DASHBOARD
========================= */

async function loadDashboard() {
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
}

socket.on(
  "dashboard:update",
  (data) => {
    renderDashboard(data);
  }
);

/* =========================
   RENDER DASHBOARD
========================= */

function renderDashboard(data) {
  const participants =
    data.participants || [];

  $("stat-total").textContent =
    participants.length;

  $("stat-live").textContent =
    participants.filter(
      (p) =>
        p.status === "live"
    ).length;

  $("stat-waiting").textContent =
    participants.filter(
      (p) =>
        p.status === "waiting"
    ).length;

  $("stat-finished").textContent =
    participants.filter(
      (p) =>
        p.status === "submitted"
    ).length;

  renderParticipantTable(
    participants
  );

  renderLeaderboard(
    participants
  );

  if (data.quiz) {
    $("monitor-stage").textContent =
      data.quiz.activeStage ||
      "—";

    $("monitor-status").textContent =
      data.quiz.status ||
      "WAITING";
  }
}

/* =========================
   LIVE MONITOR
========================= */

function renderParticipantTable(
  participants
) {
  const tbody =
    $("participant-table-body");

  if (!tbody) return;

  if (!participants.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          No participants yet.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    participants
      .map(
        (p, index) => `
        <tr>

          <td>
            ${index + 1}
          </td>

          <td>
            <strong>
              ${esc(
                p.team_name
              )}
            </strong>
          </td>

          <td>
            ${esc(
              p.college_name
            )}
          </td>

          <td>
            ${p.stage_a_score || 0}
          </td>

          <td>
            ${p.stage_b_score || 0}
          </td>

          <td>
            ${
              (p.stage_a_score || 0) +
              (p.stage_b_score || 0)
            }
          </td>

          <td>
            <span class="status-badge ${p.status}">
              ${String(
                p.status || ""
              ).toUpperCase()}
            </span>
          </td>

          <td>
            ${formatUsed(
              p.stage_a_used
            )}
            /
            ${formatUsed(
              p.stage_b_used
            )}
          </td>

          <td>
            ${
              p.status === "live"
                ? `
                  <button
                    class="delete-btn"
                    disabled
                    title="Cannot delete while quiz is live"
                  >
                    LIVE
                  </button>
                `
                : `
                  <button
                    class="delete-btn"
                    onclick="deleteParticipant('${p.id}')"
                  >
                    DELETE
                  </button>
                `
            }
          </td>

        </tr>
      `
      )
      .join("");
}

function formatUsed(value) {
  return value || 0;
}

/* =========================
   DELETE PARTICIPANT
========================= */

async function deleteParticipant(
  participantId
) {
  const participant =
    prompt(
      "Type DELETE to remove this participant:"
    );

  if (participant !== "DELETE") {
    toast("Delete cancelled.");
    return;
  }

  try {
    const response =
      await authFetch(
        `/api/coordinator/participant/${participantId}`,
        {
          method: "DELETE"
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Delete failed"
      );
    }

    toast(
      "Participant deleted successfully."
    );

    loadDashboard();
  } catch (error) {
    toast(error.message);
  }
}

/* Make function available to HTML */
window.deleteParticipant =
  deleteParticipant;

/* =========================
   LEADERBOARD
========================= */

function renderLeaderboard(
  participants
) {
  const body =
    $("leaderboard-body");

  if (!body) return;

  const sorted =
    [...participants].sort(
      (a, b) => {
        const totalA =
          (a.stage_a_score || 0) +
          (a.stage_b_score || 0);

        const totalB =
          (b.stage_a_score || 0) +
          (b.stage_b_score || 0);

        return totalB - totalA;
      }
    );

  body.innerHTML =
    sorted
      .map(
        (p, index) => `
        <tr>

          <td class="rank">
            ${index + 1}
          </td>

          <td>
            ${esc(
              p.team_name
            )}
          </td>

          <td>
            ${esc(
              p.college_name
            )}
          </td>

          <td>
            ${
              (p.stage_a_score || 0) +
              (p.stage_b_score || 0)
            }
          </td>

          <td>
            ${String(
              p.status || ""
            ).toUpperCase()}
          </td>

        </tr>
      `
      )
      .join("");
}

/* =========================
   COORDINATOR START
========================= */

window.startStageFromCoordinator =
  async function (stage) {
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
            "Unable to start quiz"
        );
      }

      toast(
        `Quiz ${stage} started successfully.`
      );

      loadDashboard();
    } catch (error) {
      toast(error.message);
    }
  };

/* =========================
   COORDINATOR FINISH
========================= */

window.finishCurrentQuiz =
  async function () {
    if (
      !confirm(
        "Finish the current quiz?"
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
            "Unable to finish quiz"
        );
      }

      toast(
        "Quiz finished successfully."
      );

      loadDashboard();
    } catch (error) {
      toast(error.message);
    }
  };

/* =========================
   EXPORT CSV
========================= */

window.exportResults =
  async function () {
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

      const a =
        document.createElement(
          "a"
        );

      a.href = url;

      a.download =
        "xyfronix-ai-prompt-battle-results.csv";

      document.body.appendChild(a);

      a.click();

      a.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      toast(error.message);
    }
  };

/* =========================
   RESTORE PARTICIPANT
========================= */

async function restoreParticipant() {
  const id =
    sessionStorage.getItem(
      "xyf_participant_id"
    );

  if (!id) return;

  try {
    const response =
      await fetch(
        `${API}/api/participant/${id}`
      );

    if (!response.ok) return;

    const participant =
      await response.json();

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
    console.log(
      "Session restore failed"
    );
  }
}

restoreParticipant();
