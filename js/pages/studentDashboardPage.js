import { User } from "../models/User.js";
import { AuthService } from "../services/AuthService.js";
import { ExamService } from "../services/ExamService.js";
import { ResultService } from "../services/ResultService.js";

const authService = new AuthService();
const examService = new ExamService();
const resultService = new ResultService();
const student = authService.requireRole(User.Roles.STUDENT);

// Stop page setup if the visitor is not an authenticated student.
if (student) {
  initializeStudentDashboard(student);
}

// Connect dashboard session controls and load this student's saved results.
function initializeStudentDashboard(currentStudent) {
  const studentNameElement = document.getElementById("studentName");
  const logoutButton = document.getElementById("logoutButton");

  studentNameElement.textContent = currentStudent.fullName;
  renderStudentResults(currentStudent.id);

  logoutButton.addEventListener("click", () => {
    authService.logout();
    window.location.href = "index.html";
  });
}

// Load only this student's saved exam results and show the newest submissions first.
function renderStudentResults(studentId) {
  // Load only this student, then sort for a newest-first history.
  const results = resultService
    .getResultsByStudentId(studentId)
    .slice()
    .sort((firstResult, secondResult) => {
      return new Date(secondResult.submittedAt) - new Date(firstResult.submittedAt);
    });

  // The same result list feeds both the summary and history sections.
  renderResultsSummary(results);
  renderResultsHistory(results);
}

// Calculate the summary numbers shown above the result history.
function renderResultsSummary(results) {
  const completedExamCount = document.getElementById("completedExamCount");
  const averageScore = document.getElementById("averageScore");
  const highestScore = document.getElementById("highestScore");
  const summaryMessage = document.getElementById("summaryMessage");

  completedExamCount.textContent = results.length;

  // Empty dashboard starts at zero until the student submits an exam.
  if (results.length === 0) {
    averageScore.textContent = "0%";
    highestScore.textContent = "0%";
    summaryMessage.textContent = "Completed exams and scores will appear here after you finish your first exam.";
    return;
  }

  // Calculate aggregate numbers from the saved percentage scores.
  const scores = results.map(result => Number(result.score) || 0);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const roundedAverage = Math.round(totalScore / scores.length);
  const highestResultScore = Math.max(...scores);

  averageScore.textContent = `${roundedAverage}%`;
  highestScore.textContent = `${highestResultScore}%`;
  summaryMessage.textContent = "";
}

// Render the completed-exam cards or the friendly empty state.
function renderResultsHistory(results) {
  const resultsHistory = document.getElementById("resultsHistory");
  const historyCount = document.getElementById("historyCount");

  // Refresh the section each time the dashboard loads.
  resultsHistory.replaceChildren();
  historyCount.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;

  // Friendly state before the first completed exam.
  if (results.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "text-secondary";
    emptyState.textContent = "No completed exams yet. Use Search Exams when you are ready to begin.";
    resultsHistory.append(emptyState);
    return;
  }

  results.forEach(result => {
    resultsHistory.append(createResultCard(result));
  });
}

// Build one completed-exam card from a saved result.
function createResultCard(result) {
  // The exam might have been deleted after the result was saved.
  const exam = examService.getExamById(result.examId);

  // Card shell
  const column = document.createElement("div");
  column.className = "col-md-6 col-lg-4";

  const card = document.createElement("article");
  card.className = "card h-100";

  const cardBody = document.createElement("div");
  cardBody.className = "card-body";

  // Exam details and score summary.
  const title = document.createElement("h3");
  title.className = "h5 card-title";
  title.textContent = exam?.title ?? "Deleted or unavailable exam";

  const details = document.createElement("p");
  details.className = "small text-secondary";
  details.textContent = exam
    ? `Category: ${exam.category} | Code: ${exam.code} | Duration: ${exam.duration} minutes`
    : "Exam details are no longer available.";

  const score = document.createElement("p");
  score.className = "h4";
  score.textContent = `Score: ${result.score}%`;

  const correctAnswers = document.createElement("p");
  correctAnswers.className = "mb-2";
  correctAnswers.textContent = `Correct answers: ${result.correctAnswers} / ${result.totalQuestions}`;

  const submittedAt = document.createElement("p");
  submittedAt.className = "small text-secondary mb-0";
  submittedAt.textContent = `Submitted: ${formatSubmissionDate(result.submittedAt)}`;

  cardBody.append(title, details, score, correctAnswers, submittedAt);
  card.append(cardBody);
  column.append(card);

  return column;
}

// Keep date formatting consistent across result history cards.
function formatSubmissionDate(submittedAt) {
  const date = new Date(submittedAt);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
