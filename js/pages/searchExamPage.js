import { User } from "../models/User.js";
import { AuthService } from "../services/AuthService.js";
import { ExamService } from "../services/ExamService.js";
import { ResultService } from "../services/ResultService.js";

const authService = new AuthService();
const examService = new ExamService();
const resultService = new ResultService();
const student = authService.requireRole(User.Roles.STUDENT);

if (student) {
  initializeSearchPage(student);
}

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

function renderSearchResults(query, currentStudent) {
  const searchResults = document.getElementById("searchResults");
  const searchMessage = document.getElementById("searchMessage");
  const resultsCount = document.getElementById("resultsCount");
  const exams = examService.searchExamsByTitleOrCode(query);
  const normalizedQuery = query.trim();

  searchResults.replaceChildren();
  searchMessage.textContent = "";
  searchMessage.className = "form-message mb-3";
  resultsCount.textContent = `${exams.length} result${exams.length === 1 ? "" : "s"}`;

  if (exams.length === 0) {
    searchMessage.textContent = normalizedQuery
      ? "No exams match your search."
      : "No exams are available yet.";
    searchMessage.className = "form-message error mb-3";
    return;
  }

  exams.forEach(exam => {
    searchResults.append(createExamResultCard(exam, currentStudent));
  });
}

function createExamResultCard(exam, currentStudent) {
  const column = document.createElement("div");
  column.className = "col-md-6 col-lg-4";

  const card = document.createElement("article");
  card.className = "card h-100";

  const cardBody = document.createElement("div");
  cardBody.className = "card-body d-flex flex-column";

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

  const isCompleted = resultService.hasStudentCompletedExam(currentStudent.id, exam.id);
  const hasQuestions = exam.getQuestionCount() > 0;
  // Keep empty exams visible, but do not let students start an exam that has nothing to answer.
  const openLink = isCompleted || !hasQuestions
    ? document.createElement("button")
    : document.createElement("a");
  openLink.className = `btn btn-sm mt-auto ${isCompleted || !hasQuestions ? "btn-secondary" : "btn-primary"}`;

  if (isCompleted) {
    openLink.type = "button";
    openLink.disabled = true;
    openLink.textContent = "Completed";
  } else if (!hasQuestions) {
    openLink.type = "button";
    openLink.disabled = true;
    openLink.textContent = "Not Available Yet";
  } else {
    openLink.textContent = "Start Exam";
    openLink.href = `take-exam.html?id=${encodeURIComponent(exam.id)}`;
  }

  const cardElements = [title, description, details, questionCount];

  if (!hasQuestions) {
    const availabilityMessage = document.createElement("p");
    availabilityMessage.className = "small text-secondary";
    availabilityMessage.textContent = "This exam is not available yet because it has no questions.";
    cardElements.push(availabilityMessage);
  }

  cardBody.append(...cardElements, openLink);
  card.append(cardBody);
  column.append(card);

  return column;
}
