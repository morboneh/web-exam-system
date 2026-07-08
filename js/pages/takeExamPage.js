import { ExamResult } from "../models/ExamResult.js";
import { User } from "../models/User.js";
import { AuthService } from "../services/AuthService.js";
import { ExamService } from "../services/ExamService.js";
import { ResultService } from "../services/ResultService.js";

const authService = new AuthService();
const examService = new ExamService();
const resultService = new ResultService();
const student = authService.requireRole(User.Roles.STUDENT);

let currentExam = null;
let savedResult = null;
let timerInterval = null;
let pendingNavigation = null;
let examActive = false;

if (student) {
  initializeTakeExamPage(student);
}

function initializeTakeExamPage(currentStudent) {
  const examId = new URLSearchParams(window.location.search).get("id");
  registerExamEvents(currentStudent);

  if (!examId) {
    showBlockedContent("Missing exam", "No exam ID was provided in the page URL.");
    return;
  }

  currentExam = examService.getExamById(examId);

  if (!currentExam) {
    showBlockedContent("Exam not found", "The requested exam does not exist or may have been deleted.");
    return;
  }

  // A saved result permanently closes this exam for this student.
  if (resultService.hasStudentCompletedExam(currentStudent.id, currentExam.id)) {
    showBlockedContent("Exam already completed", "You have already completed this exam.");
    return;
  }

  renderExam();
  examActive = true;
  startTimer(currentStudent);
}

function renderExam() {
  document.getElementById("examContent").hidden = false;
  document.getElementById("examTitle").textContent = currentExam.title;
  document.getElementById("examDescription").textContent = currentExam.description;
  document.getElementById("examDetails").textContent =
    `Category: ${currentExam.category} | Duration: ${currentExam.duration} minutes | Questions: ${currentExam.questions.length}`;

  const questionsList = document.getElementById("questionsList");
  questionsList.replaceChildren();

  currentExam.questions.forEach((question, questionIndex) => {
    questionsList.append(createQuestionFieldset(question, questionIndex));
  });
}

function createQuestionFieldset(question, questionIndex) {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "question-box exam-question";

  const legend = document.createElement("legend");
  legend.className = "h5 mb-3";
  legend.textContent = `${questionIndex + 1}. ${question.text}`;
  fieldset.append(legend);

  question.answers.forEach((answer, answerIndex) => {
    const option = document.createElement("label");
    option.className = "answer-label form-check border rounded p-3";

    const radio = document.createElement("input");
    radio.className = "form-check-input me-2";
    radio.type = "radio";
    radio.name = `question-${questionIndex}`;
    radio.value = answerIndex;

    const text = document.createElement("span");
    text.textContent = answer;
    option.append(radio, text);
    fieldset.append(option);
  });

  return fieldset;
}

function registerExamEvents(currentStudent) {
  document.getElementById("examForm").addEventListener("submit", event => {
    event.preventDefault();
    const result = saveCurrentResult(currentStudent, "manual");

    if (result) {
      showResult(result, "Your exam was submitted successfully.");
    }
  });

  document.querySelectorAll(".exam-exit-link").forEach(link => {
    link.addEventListener("click", event => {
      if (!examActive) {
        return;
      }

      event.preventDefault();
      pendingNavigation = { type: "navigate", url: link.href };
      document.getElementById("leaveDialog").showModal();
    });
  });

  document.getElementById("logoutButton").addEventListener("click", () => {
    if (!examActive) {
      authService.logout();
      window.location.href = "index.html";
      return;
    }

    pendingNavigation = { type: "logout" };
    document.getElementById("leaveDialog").showModal();
  });

  document.getElementById("cancelLeaveButton").addEventListener("click", () => {
    pendingNavigation = null;
    document.getElementById("leaveDialog").close();
  });

  document.getElementById("confirmLeaveButton").addEventListener("click", () => {
    saveCurrentResult(currentStudent, "navigation-exit");
    continuePendingNavigation();
  });

  document.getElementById("viewTimedResultButton").addEventListener("click", () => {
    document.getElementById("timeUpDialog").close();
    showResult(savedResult, "Time expired. Your current answers were submitted automatically.");
  });

  document.getElementById("timeUpDialog").addEventListener("cancel", event => {
    event.preventDefault();
  });

  // Browser refresh, close, and back cannot use a custom dialog; save synchronously first.
  window.addEventListener("beforeunload", event => {
    if (!examActive) {
      return;
    }

    saveCurrentResult(currentStudent, "navigation-exit");
    event.preventDefault();
    event.returnValue = "";
  });
}

function startTimer(currentStudent) {
  const durationMinutes = Number(currentExam.duration);
  const durationMilliseconds = Math.max(0, durationMinutes * 60 * 1000);
  const endTime = Date.now() + durationMilliseconds;

  if (updateTimer(endTime) <= 0) {
    savedResult = saveCurrentResult(currentStudent, "time-expired");
    document.getElementById("timeUpDialog").showModal();
    return;
  }

  timerInterval = window.setInterval(() => {
    if (updateTimer(endTime) <= 0) {
      window.clearInterval(timerInterval);
      savedResult = saveCurrentResult(currentStudent, "time-expired");
      document.getElementById("timeUpDialog").showModal();
    }
  }, 1000);
}

function updateTimer(endTime) {
  const remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timer = document.getElementById("timer");

  document.getElementById("timerValue").textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  timer.classList.toggle("warning", remainingSeconds <= 5 * 60);
  return remainingSeconds;
}

function saveCurrentResult(currentStudent, submittedBy) {
  if (savedResult) {
    return savedResult;
  }

  const evaluation = evaluateAnswers();
  const totalQuestions = currentExam.questions.length;
  const score = totalQuestions === 0
    ? 0
    : Math.round((evaluation.correctAnswers / totalQuestions) * 100);

  const result = new ExamResult(
    currentExam.id,
    currentStudent.id,
    score,
    totalQuestions,
    evaluation.correctAnswers,
    {
      wrongQuestionIndexes: evaluation.wrongQuestionIndexes,
      unansweredQuestionIndexes: evaluation.unansweredQuestionIndexes,
      submittedBy
    }
  );

  if (!resultService.addResult(result)) {
    examActive = false;
    return null;
  }

  savedResult = result;
  examActive = false;
  lockExam();
  return result;
}

function evaluateAnswers() {
  const wrongQuestionIndexes = [];
  const unansweredQuestionIndexes = [];
  let correctAnswers = 0;

  currentExam.questions.forEach((question, questionIndex) => {
    const selectedAnswer = document.querySelector(`input[name="question-${questionIndex}"]:checked`);

    if (!selectedAnswer) {
      unansweredQuestionIndexes.push(questionIndex);
      return;
    }

    if (question.isCorrect(Number(selectedAnswer.value))) {
      correctAnswers += 1;
    } else {
      wrongQuestionIndexes.push(questionIndex);
    }
  });

  return { correctAnswers, wrongQuestionIndexes, unansweredQuestionIndexes };
}

function lockExam() {
  window.clearInterval(timerInterval);
  document.querySelectorAll("#examForm input, #submitButton").forEach(control => {
    control.disabled = true;
  });
}

function showResult(result, reason) {
  if (!result) {
    showBlockedContent("Exam already submitted", "A result already exists for this exam.");
    return;
  }

  document.getElementById("examContent").hidden = true;
  document.getElementById("resultContent").hidden = false;
  document.getElementById("resultReason").textContent = reason;
  document.getElementById("scoreValue").textContent = result.score;
  document.getElementById("correctAnswersSummary").textContent =
    `${result.correctAnswers} correct out of ${result.totalQuestions}`;

  const answerSummary = document.getElementById("answerSummary");
  answerSummary.replaceChildren();

  if (result.wrongQuestionIndexes.length === 0 && result.unansweredQuestionIndexes.length === 0) {
    answerSummary.append(createSummaryMessage("All questions were answered correctly.", "success"));
    return;
  }

  if (result.wrongQuestionIndexes.length > 0) {
    answerSummary.append(createSummaryMessage(
      `Incorrect question numbers: ${formatQuestionNumbers(result.wrongQuestionIndexes)}`,
      "error"
    ));
  }

  if (result.unansweredQuestionIndexes.length > 0) {
    answerSummary.append(createSummaryMessage(
      `Unanswered question numbers: ${formatQuestionNumbers(result.unansweredQuestionIndexes)}`,
      "error"
    ));
  }
}

function createSummaryMessage(message, type) {
  const paragraph = document.createElement("p");
  paragraph.className = `form-message ${type}`;
  paragraph.textContent = message;
  return paragraph;
}

function formatQuestionNumbers(indexes) {
  return indexes.map(index => `#${index + 1}`).join(", ");
}

function continuePendingNavigation() {
  if (!pendingNavigation) {
    return;
  }

  if (pendingNavigation.type === "logout") {
    authService.logout();
    window.location.href = "index.html";
    return;
  }

  window.location.href = pendingNavigation.url;
}

function showBlockedContent(title, message) {
  examActive = false;
  document.getElementById("examContent").hidden = true;
  document.getElementById("resultContent").hidden = true;
  document.getElementById("blockedContent").hidden = false;
  document.getElementById("blockedTitle").textContent = title;
  document.getElementById("blockedMessage").textContent = message;
}
