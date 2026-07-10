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
  initializeSearchPage(student);
}

// Connect search controls and render the initial available exam list.
function initializeSearchPage(currentStudent) {
  const studentNameElement = document.getElementById("studentName");
  const logoutButton = document.getElementById("logoutButton");
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");

  studentNameElement.textContent = currentStudent.fullName;

  logoutButton.addEventListener("click", () => {
    authService.logout();
    window.location.href = "index.html";
  });

  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    renderSearchResults(searchInput.value, currentStudent);
  });

  searchInput.addEventListener("input", () => {
    renderSearchResults(searchInput.value, currentStudent);
  });

  renderSearchResults("", currentStudent);
}

// Search by title/code, then keep only exams that this student can still take.
function renderSearchResults(query, currentStudent) {
  const searchResults = document.getElementById("searchResults");
  const searchMessage = document.getElementById("searchMessage");
  const resultsCount = document.getElementById("resultsCount");

  // Start with title/code search, then remove exams this student cannot take.
  const exams = examService.searchExamsByTitleOrCode(query).filter(exam =>
    exam.getQuestionCount() > 0 &&
    !resultService.hasStudentCompletedExam(currentStudent.id, exam.id)
  );
  const normalizedQuery = query.trim();

  // Reset the previous message and cards before showing the new result set.
  searchResults.replaceChildren();
  searchMessage.textContent = "";
  searchMessage.className = "form-message mb-3";
  resultsCount.textContent = `${exams.length} result${exams.length === 1 ? "" : "s"}`;

  // Show a different empty message for browsing versus searching.
  if (exams.length === 0) {
    searchMessage.textContent = normalizedQuery
      ? "No exams match your search."
      : "No exams are available yet.";
    searchMessage.className = "form-message error mb-3";
    return;
  }

  // Every remaining exam is available to start.
  exams.forEach(exam => {
    searchResults.append(createExamResultCard(exam));
  });
}

// Build one available exam card with navigation to the exam-taking page.
function createExamResultCard(exam) {
  // Card shell
  const column = document.createElement("div");
  column.className = "col-md-6 col-lg-4";

  const card = document.createElement("article");
  card.className = "card h-100";

  const cardBody = document.createElement("div");
  cardBody.className = "card-body d-flex flex-column";

  // Available exam information.
  const title = document.createElement("h3");
  title.className = "h5 card-title";
  title.textContent = exam.title;

  const description = document.createElement("p");
  description.className = "card-text";
  description.textContent = exam.description;

  const details = document.createElement("p");
  details.className = "small text-secondary";
  details.textContent = `Category: ${exam.category} | Code: ${exam.code} | Duration: ${exam.duration} minutes`;

  const questionCount = document.createElement("p");
  questionCount.className = "small text-secondary";
  questionCount.textContent = `Questions: ${exam.getQuestionCount()}`;

  // Search results only include exams that can be started.
  const openLink = document.createElement("a");
  openLink.className = "btn btn-sm mt-auto btn-primary";
  openLink.textContent = "Start Exam";
  openLink.href = `take-exam.html?id=${encodeURIComponent(exam.id)}`;

  cardBody.append(title, description, details, questionCount, openLink);
  card.append(cardBody);
  column.append(card);

  return column;
}
