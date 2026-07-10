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

// Stop page setup if the visitor is not an authenticated student.
if (student) {
  initializeTakeExamPage(student);
}

// Load the requested exam, block invalid access, and start the exam timer.
function initializeTakeExamPage(currentStudent) {
  // Register events first so blocked states still have working navigation controls.
  const examId = new URLSearchParams(window.location.search).get("id");
  registerExamEvents(currentStudent);

  // Validate the URL and load the exam.
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

  // Start the exam only after all access checks pass.
  renderExam();
  examActive = true;
  startTimer(currentStudent);
}

// Render the exam header and all multiple-choice questions.
function renderExam() {
  // Fill the exam header.
  document.getElementById("examContent").hidden = false;
  document.getElementById("examTitle").textContent = currentExam.title;
  document.getElementById("examDescription").textContent = currentExam.description;
  document.getElementById("examDetails").textContent =
    `Category: ${currentExam.category} | Duration: ${currentExam.duration} minutes | Questions: ${currentExam.questions.length}`;

  const questionsList = document.getElementById("questionsList");
  questionsList.replaceChildren();

  // Render each multiple-choice question into the form.
  currentExam.questions.forEach((question, questionIndex) => {
    questionsList.append(createQuestionFieldset(question, questionIndex));
  });
}

// Build one radio-button group for a single exam question.
function createQuestionFieldset(question, questionIndex) {
  // Fieldset keeps one question and its answers grouped together.
  const fieldset = document.createElement("fieldset");
  fieldset.className = "question-box exam-question";

  const legend = document.createElement("legend");
  legend.className = "h5 mb-3";
  legend.textContent = `${questionIndex + 1}. ${question.text}`;
  fieldset.append(legend);

  // Each answer is a radio option sharing the same question name.
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

// Connect submit, navigation, logout, and browser-exit events for the exam session.
function registerExamEvents(currentStudent) {
  // Manual submit saves the result and immediately shows the score.
  document.getElementById("examForm").addEventListener("submit", event => {
    event.preventDefault();
    const result = saveCurrentResult(currentStudent, "manual");

    if (result) {
      showResult(result, "Your exam was submitted successfully.");
    }
  });

  // Internal navigation while the exam is active requires confirmation.
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

  // Logout follows the same rule: submit first if the exam is active.
  document.getElementById("logoutButton").addEventListener("click", () => {
    if (!examActive) {
      authService.logout();
      window.location.href = "index.html";
      return;
    }

    pendingNavigation = { type: "logout" };
    document.getElementById("leaveDialog").showModal();
  });

  // Dialog controls either cancel leaving or continue after saving.
  document.getElementById("cancelLeaveButton").addEventListener("click", () => {
    pendingNavigation = null;
    document.getElementById("leaveDialog").close();
  });

  document.getElementById("confirmLeaveButton").addEventListener("click", () => {
    saveCurrentResult(currentStudent, "navigation-exit");
    continuePendingNavigation();
  });

  // Time-up dialog only reveals the result that was already saved.
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

// Start the countdown and automatically save the current answers when time expires.
function startTimer(currentStudent) {
  // Convert the saved duration to an absolute end time.
  const durationMinutes = Number(currentExam.duration);
  const durationMilliseconds = Math.max(0, durationMinutes * 60 * 1000);
  const endTime = Date.now() + durationMilliseconds;

  // Handle extremely short or invalid durations immediately.
  if (updateTimer(endTime) <= 0) {
    savedResult = saveCurrentResult(currentStudent, "time-expired");
    document.getElementById("timeUpDialog").showModal();
    return;
  }

  // Check once per second until time runs out.
  timerInterval = window.setInterval(() => {
    if (updateTimer(endTime) <= 0) {
      window.clearInterval(timerInterval);
      savedResult = saveCurrentResult(currentStudent, "time-expired");
      document.getElementById("timeUpDialog").showModal();
    }
  }, 1000);
}

// Update the visible timer and return the remaining seconds.
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

// Grade the current answers, save the first result, and lock the exam.
function saveCurrentResult(currentStudent, submittedBy) {
  // Several events can try to submit at once, so keep only the first saved result.
  if (savedResult) {
    return savedResult;
  }

  // Evaluate answers and calculate a percentage score.
  const evaluation = evaluateAnswers();
  const totalQuestions = currentExam.questions.length;
  const score = totalQuestions === 0
    ? 0
    : Math.round((evaluation.correctAnswers / totalQuestions) * 100);

  // Build the result record with enough detail for student and teacher views.
  const result = new ExamResult(
    currentExam.id,
    currentStudent.id,
    score,
    totalQuestions,
    evaluation.correctAnswers,
    {
      wrongQuestionIndexes: evaluation.wrongQuestionIndexes,
      unansweredQuestionIndexes: evaluation.unansweredQuestionIndexes,
      selectedAnswerIndexes: evaluation.selectedAnswerIndexes,
      submittedBy
    }
  );

  // If a result already exists in storage, do not save a second one.
  if (!resultService.addResult(result)) {
    examActive = false;
    return null;
  }

  // Keep the saved result in memory and close the active exam session.
  savedResult = result;
  examActive = false;
  lockExam();
  return result;
}

// Compare selected answers with each question's correct answer.
function evaluateAnswers() {
  // Track the full answer state for grading and later result review.
  const wrongQuestionIndexes = [];
  const unansweredQuestionIndexes = [];
  const selectedAnswerIndexes = [];
  let correctAnswers = 0;

  // Each question contributes to correct, wrong, or unanswered counts.
  currentExam.questions.forEach((question, questionIndex) => {
    const selectedAnswer = document.querySelector(`input[name="question-${questionIndex}"]:checked`);

    if (!selectedAnswer) {
      selectedAnswerIndexes[questionIndex] = null;
      unansweredQuestionIndexes.push(questionIndex);
      return;
    }

    const selectedAnswerIndex = Number(selectedAnswer.value);
    selectedAnswerIndexes[questionIndex] = selectedAnswerIndex;

    if (question.isCorrect(selectedAnswerIndex)) {
      correctAnswers += 1;
    } else {
      wrongQuestionIndexes.push(questionIndex);
    }
  });

  return { correctAnswers, wrongQuestionIndexes, unansweredQuestionIndexes, selectedAnswerIndexes };
}

// Disable the form after a result is saved so answers cannot be changed.
function lockExam() {
  window.clearInterval(timerInterval);
  document.querySelectorAll("#examForm input, #submitButton").forEach(control => {
    control.disabled = true;
  });
}

// Replace the exam form with the submitted result summary.
function showResult(result, reason) {
  // Duplicate submissions can reach here if storage already has a result.
  if (!result) {
    showBlockedContent("Exam already submitted", "A result already exists for this exam.");
    return;
  }

  // Hide the form and fill the main score summary.
  document.getElementById("examContent").hidden = true;
  document.getElementById("resultContent").hidden = false;
  document.getElementById("resultReason").textContent = reason;
  document.getElementById("scoreValue").textContent = result.score;
  document.getElementById("correctAnswersSummary").textContent =
    `${result.correctAnswers} correct out of ${result.totalQuestions}`;

  const answerSummary = document.getElementById("answerSummary");
  answerSummary.replaceChildren();

  // Perfect submissions do not need separate wrong/unanswered details.
  if (result.wrongQuestionIndexes.length === 0 && result.unansweredQuestionIndexes.length === 0) {
    answerSummary.append(createSummaryMessage("All questions were answered correctly.", "success"));
    return;
  }

  // Show only the sections that apply to this result.
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

// Create a styled feedback message inside the result summary.
function createSummaryMessage(message, type) {
  const paragraph = document.createElement("p");
  paragraph.className = `form-message ${type}`;
  paragraph.textContent = message;
  return paragraph;
}

// Convert zero-based question indexes into display numbers.
function formatQuestionNumbers(indexes) {
  return indexes.map(index => `#${index + 1}`).join(", ");
}

// Continue the navigation action that was confirmed by the leave dialog.
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

// Show a safe blocked state for missing, deleted, or already completed exams.
function showBlockedContent(title, message) {
  examActive = false;
  document.getElementById("examContent").hidden = true;
  document.getElementById("resultContent").hidden = true;
  document.getElementById("blockedContent").hidden = false;
  document.getElementById("blockedTitle").textContent = title;
  document.getElementById("blockedMessage").textContent = message;
}
