import { Question } from "../models/Question.js";
import { User } from "../models/User.js";
import { AuthService } from "../services/AuthService.js";
import { ExamService } from "../services/ExamService.js";
import { ResultService } from "../services/ResultService.js";
import { StorageService } from "../services/StorageService.js";

const authService = new AuthService();
const examService = new ExamService();
const resultService = new ResultService();
const storageService = new StorageService();
const teacher = authService.requireRole(User.Roles.TEACHER);

let currentExam = null;

if (teacher) {
  initializeExamDetailsPage(teacher);
}

function initializeExamDetailsPage(currentTeacher) {
  const logoutButton = document.getElementById("logoutButton");
  const examInfoForm = document.getElementById("examInfoForm");
  const addQuestionForm = document.getElementById("addQuestionForm");
  const toggleExamInfoFormButton = document.getElementById("toggleExamInfoFormButton");
  const toggleQuestionsButton = document.getElementById("toggleQuestionsButton");
  const toggleResultsButton = document.getElementById("toggleResultsButton");
  const deleteExamButton = document.getElementById("deleteExamButton");

  logoutButton.addEventListener("click", () => {
    authService.logout();
    window.location.href = "index.html";
  });

  const examId = new URLSearchParams(window.location.search).get("id");

  // Validate the URL and exam ownership before showing editable content.
  if (!examId) {
    showBlockedContent("Missing exam", "No exam ID was provided in the page URL.");
    return;
  }

  currentExam = examService.getExamById(examId);

  if (!currentExam) {
    showBlockedContent("Exam not found", "The requested exam does not exist or may have been deleted.");
    return;
  }

  // Teachers may only edit exams that belong to their own account.
  if (currentExam.teacherId !== currentTeacher.id) {
    showBlockedContent("Access denied", "This exam belongs to another teacher.");
    return;
  }

  document.getElementById("examDetailsContent").hidden = false;
  fillExamInformationForm();
  renderExamInformationSummary();
  renderNewQuestionAnswerFields();
  renderQuestions();

  toggleExamInfoFormButton.addEventListener("click", () => {
    examInfoForm.hidden = !examInfoForm.hidden;
  });

  toggleQuestionsButton.addEventListener("click", () => {
    const questionManagementArea = document.getElementById("questionManagementArea");
    questionManagementArea.hidden = !questionManagementArea.hidden;
  });

  toggleResultsButton.addEventListener("click", () => {
    const studentResultsSection = document.getElementById("studentResultsSection");
    studentResultsSection.hidden = !studentResultsSection.hidden;

    if (!studentResultsSection.hidden) {
      renderStudentResults();
    }
  });

  deleteExamButton.addEventListener("click", deleteCurrentExam);

  examInfoForm.addEventListener("submit", event => {
    event.preventDefault();
    saveExamInformation();
  });

  addQuestionForm.addEventListener("submit", event => {
    event.preventDefault();
    addQuestion();
  });
}

function fillExamInformationForm() {
  document.getElementById("examId").value = currentExam.id;
  document.getElementById("title").value = currentExam.title;
  document.getElementById("description").value = currentExam.description;
  document.getElementById("category").value = currentExam.category;
  document.getElementById("examCode").value = currentExam.code;
  document.getElementById("duration").value = currentExam.duration;
}

function renderExamInformationSummary() {
  const summary = document.getElementById("examInfoSummary");
  const rows = [
    ["ID", currentExam.id],
    ["Title", currentExam.title],
    ["Description", currentExam.description],
    ["Category", currentExam.category],
    ["Exam code", currentExam.code],
    ["Duration", `${currentExam.duration} minutes`],
    ["Questions", currentExam.questions.length]
  ];

  summary.replaceChildren();

  rows.forEach(([label, value]) => {
    const term = document.createElement("dt");
    term.className = "col-sm-3 col-lg-2 text-secondary";
    term.textContent = label;

    const description = document.createElement("dd");
    description.className = "col-sm-9 col-lg-10";
    description.textContent = value || "Not set";

    summary.append(term, description);
  });
}

function saveExamInformation() {
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const category = document.getElementById("category").value.trim();
  const code = document.getElementById("examCode").value.trim().toUpperCase();
  const duration = Number(document.getElementById("duration").value);

  if (!title || !description || !category || !code || !Number.isFinite(duration) || duration <= 0) {
    showMessage("Please fill in all exam fields with valid values.", "error");
    return;
  }

  if (!examService.isExamCodeAvailable(code, currentExam.id)) {
    showMessage("This exam code is already used by another exam.", "error");
    return;
  }

  currentExam.title = title;
  currentExam.description = description;
  currentExam.category = category;
  currentExam.code = code;
  currentExam.duration = duration;

  if (!examService.updateExam(currentExam)) {
    showMessage("Could not save the exam because it no longer exists.", "error");
    return;
  }

  document.getElementById("examCode").value = code;
  renderExamInformationSummary();
  document.getElementById("examInfoForm").hidden = true;
  showMessage("Exam information saved successfully.", "success");
}

function deleteCurrentExam() {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${currentExam.title}"? This action cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  examService.deleteExam(currentExam.id);
  window.location.href = "teacher-dashboard.html";
}

function renderStudentResults() {
  const studentResultsList = document.getElementById("studentResultsList");
  const results = resultService
    .getResultsByExamId(currentExam.id)
    .slice()
    .sort((firstResult, secondResult) => {
      return new Date(secondResult.submittedAt) - new Date(firstResult.submittedAt);
    });

  studentResultsList.replaceChildren();

  if (results.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "text-secondary mb-0";
    emptyMessage.textContent = "No student results yet for this exam.";
    studentResultsList.append(emptyMessage);
    return;
  }

  results.forEach(result => {
    studentResultsList.append(createStudentResultCard(result));
  });
}

function createStudentResultCard(result) {
  const student = findStudentById(result.studentId);
  const article = document.createElement("article");
  article.className = "border rounded p-3 mb-3 bg-white";

  const header = document.createElement("div");
  header.className = "d-flex flex-column flex-md-row justify-content-between gap-2 mb-2";

  const studentInfo = document.createElement("div");
  const studentName = document.createElement("h3");
  studentName.className = "h5 mb-1";
  studentName.textContent = student?.fullName || "Unknown student";

  const studentEmail = document.createElement("p");
  studentEmail.className = "small text-secondary mb-0";
  studentEmail.textContent = student?.email || "Username/email unavailable";

  studentInfo.append(studentName, studentEmail);

  const score = document.createElement("div");
  score.className = "text-md-end";

  const scoreValue = document.createElement("p");
  scoreValue.className = "h5 mb-1";
  scoreValue.textContent = `${Number(result.score) || 0}%`;

  const scoreDetails = document.createElement("p");
  scoreDetails.className = "small text-secondary mb-0";
  scoreDetails.textContent =
    `${Number(result.correctAnswers) || 0} correct out of ${Number(result.totalQuestions) || 0}`;

  score.append(scoreValue, scoreDetails);

  header.append(studentInfo, score);

  const submittedAt = document.createElement("p");
  submittedAt.className = "small text-secondary mb-2";
  submittedAt.textContent = `Submitted: ${formatSubmissionDate(result.submittedAt)}`;

  const unanswered = document.createElement("p");
  unanswered.className = "mb-1";
  unanswered.textContent = `Unanswered questions: ${formatQuestionNumbers(result.unansweredQuestionIndexes)}`;

  const wrong = document.createElement("p");
  wrong.className = "mb-2";
  wrong.textContent = `Wrong questions: ${formatQuestionNumbers(result.wrongQuestionIndexes)}`;

  article.append(header, submittedAt, unanswered, wrong);

  const wrongAnswerList = createWrongAnswerList(result);
  if (wrongAnswerList) {
    article.append(wrongAnswerList);
  }

  return article;
}

function createWrongAnswerList(result) {
  const wrongQuestionIndexes = result.wrongQuestionIndexes ?? [];

  if (wrongQuestionIndexes.length === 0) {
    return null;
  }

  const list = document.createElement("div");
  list.className = "small border-top pt-2 mt-2";

  wrongQuestionIndexes.forEach(questionIndex => {
    const question = currentExam.questions[questionIndex];
    const selectedAnswerIndex = result.selectedAnswerIndexes?.[questionIndex];
    const item = document.createElement("p");
    item.className = "mb-1";

    const selectedAnswer = getAnswerText(question, selectedAnswerIndex);
    const correctAnswer = getAnswerText(question, question?.correctAnswerIndex);

    item.textContent =
      `Question #${questionIndex + 1}: selected ${selectedAnswer}; correct answer ${correctAnswer}`;
    list.append(item);
  });

  return list;
}

function getAnswerText(question, answerIndex) {
  if (!question || answerIndex === null || answerIndex === undefined || answerIndex === "") {
    return "not saved";
  }

  return question.answers?.[Number(answerIndex)] ?? "not saved";
}

function findStudentById(studentId) {
  return storageService.getUsers().find(user => user.id === studentId) ?? null;
}

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

function formatQuestionNumbers(indexes = []) {
  if (indexes.length === 0) {
    return "None";
  }

  return indexes.map(index => `#${index + 1}`).join(", ");
}

// Render each saved question as an editable form.
function renderQuestions() {
  const questionsList = document.getElementById("questionsList");
  const questionCount = document.getElementById("questionCount");

  questionsList.replaceChildren();
  questionCount.textContent = `${currentExam.questions.length} question${currentExam.questions.length === 1 ? "" : "s"}`;

  if (currentExam.questions.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "text-secondary mb-0";
    emptyMessage.textContent = "This exam does not have questions yet.";
    questionsList.append(emptyMessage);
    return;
  }

  currentExam.questions.forEach((question, questionIndex) => {
    questionsList.append(createQuestionEditor(question, questionIndex));
  });
}

function createQuestionEditor(question, questionIndex) {
  const form = document.createElement("form");
  form.className = "question-box";
  form.dataset.questionId = question.id;

  const title = document.createElement("h3");
  title.className = "h5";
  title.textContent = `Question ${questionIndex + 1}`;

  const questionLabel = document.createElement("label");
  questionLabel.className = "form-label";
  questionLabel.textContent = "Question text";

  const questionInput = document.createElement("input");
  questionInput.className = "form-control mb-3 question-text";
  questionInput.type = "text";
  questionInput.value = question.text;
  questionInput.required = true;

  form.append(title, questionLabel, questionInput);

  question.answers.forEach((answer, answerIndex) => {
    form.append(createAnswerRow(answer, answerIndex, `correctAnswer-${question.id}`, question.correctAnswerIndex));
  });

  const actions = document.createElement("div");
  actions.className = "d-flex gap-2 mt-3";

  const saveButton = document.createElement("button");
  saveButton.className = "btn btn-outline-primary btn-sm";
  saveButton.type = "submit";
  saveButton.textContent = "Save Question";

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn btn-outline-danger btn-sm";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete Question";
  deleteButton.addEventListener("click", () => deleteQuestion(question.id));

  actions.append(saveButton, deleteButton);
  form.append(actions);

  form.addEventListener("submit", event => {
    event.preventDefault();
    saveQuestion(question.id, form);
  });

  return form;
}

function renderNewQuestionAnswerFields() {
  const answersContainer = document.getElementById("newQuestionAnswers");

  answersContainer.replaceChildren();

  for (let answerIndex = 0; answerIndex < 4; answerIndex += 1) {
    answersContainer.append(createAnswerRow("", answerIndex, "newCorrectAnswer", null));
  }
}

function createAnswerRow(answer, answerIndex, radioName, correctAnswerIndex) {
  const answerRow = document.createElement("div");
  answerRow.className = "input-group mb-2";

  const radioWrapper = document.createElement("span");
  radioWrapper.className = "input-group-text";

  const correctAnswerRadio = document.createElement("input");
  correctAnswerRadio.className = "form-check-input mt-0 correct-answer";
  correctAnswerRadio.type = "radio";
  correctAnswerRadio.name = radioName;
  correctAnswerRadio.value = answerIndex;
  correctAnswerRadio.required = true;
  correctAnswerRadio.checked = answerIndex === correctAnswerIndex;
  correctAnswerRadio.setAttribute("aria-label", `Mark answer ${answerIndex + 1} as correct`);

  const answerInput = document.createElement("input");
  answerInput.className = "form-control answer-option";
  answerInput.type = "text";
  answerInput.value = answer;
  answerInput.placeholder = `Answer option ${answerIndex + 1}`;
  answerInput.setAttribute("aria-label", `Answer option ${answerIndex + 1}`);
  answerInput.required = true;

  radioWrapper.append(correctAnswerRadio);
  answerRow.append(radioWrapper, answerInput);

  return answerRow;
}

function addQuestion() {
  const addQuestionForm = document.getElementById("addQuestionForm");
  const questionText = document.getElementById("newQuestionText").value.trim();
  const questionData = getQuestionDataFromContainer(addQuestionForm, questionText);

  if (!questionData) {
    showMessage("Please complete the question and select its correct answer.", "error");
    return;
  }

  currentExam.questions.push(new Question(questionData.text, questionData.answers, questionData.correctAnswerIndex));
  examService.updateExam(currentExam);

  addQuestionForm.reset();
  renderNewQuestionAnswerFields();
  renderQuestions();
  renderExamInformationSummary();
  showMessage("Question added successfully.", "success");
}

// Update one existing question while preserving its ID.
function saveQuestion(questionId, questionForm) {
  const questionIndex = currentExam.questions.findIndex(question => question.id === questionId);

  if (questionIndex === -1) {
    showMessage("This question could not be found.", "error");
    return;
  }

  const questionText = questionForm.querySelector(".question-text").value.trim();
  const questionData = getQuestionDataFromContainer(questionForm, questionText);

  if (!questionData) {
    showMessage("Please complete the question and select its correct answer.", "error");
    return;
  }

  currentExam.questions[questionIndex] = new Question(
    questionData.text,
    questionData.answers,
    questionData.correctAnswerIndex,
    { id: questionId }
  );

  examService.updateExam(currentExam);
  renderQuestions();
  showMessage("Question saved successfully.", "success");
}

function deleteQuestion(questionId) {
  const confirmed = window.confirm("Are you sure you want to delete this question?");

  if (!confirmed) {
    return;
  }

  currentExam.questions = currentExam.questions.filter(question => question.id !== questionId);
  examService.updateExam(currentExam);
  renderQuestions();
  renderExamInformationSummary();
  showMessage("Question deleted successfully.", "success");
}

// All question saves use the same validation rules for add and edit flows.
function getQuestionDataFromContainer(container, questionText) {
  const answers = Array.from(container.querySelectorAll(".answer-option"), input => input.value.trim());
  const selectedAnswer = container.querySelector(".correct-answer:checked");

  if (!questionText || answers.length !== 4 || answers.some(answer => !answer) || !selectedAnswer) {
    return null;
  }

  return {
    text: questionText,
    answers,
    correctAnswerIndex: Number(selectedAnswer.value)
  };
}

function showBlockedContent(title, message) {
  document.getElementById("examDetailsContent").hidden = true;
  document.getElementById("blockedContent").hidden = false;
  document.getElementById("blockedTitle").textContent = title;
  document.getElementById("blockedMessage").textContent = message;
}

function showMessage(message, type) {
  const messageElement = document.getElementById("pageMessage");
  messageElement.textContent = message;
  messageElement.className = `form-message ${type} mb-3`;
}
