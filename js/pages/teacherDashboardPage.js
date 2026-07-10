import { Exam } from "../models/Exam.js";
import { Question } from "../models/Question.js";
import { User } from "../models/User.js";
import { AuthService } from "../services/AuthService.js";
import { ExamService } from "../services/ExamService.js";

const authService = new AuthService();
const examService = new ExamService();
const teacher = authService.requireRole(User.Roles.TEACHER);

// Stop page setup if the visitor is not an authenticated teacher.
if (teacher) {
  initializeDashboard(teacher);
}

// Connect dashboard controls, creation dialog, and the teacher's exam list.
function initializeDashboard(currentTeacher) {
  const teacherNameElement = document.getElementById("teacherName");
  const logoutButton = document.getElementById("logoutButton");
  const openCreateExamButton = document.getElementById("openCreateExamButton");
  const closeCreateExamButton = document.getElementById("closeCreateExamButton");
  const cancelCreateExamButton = document.getElementById("cancelCreateExamButton");
  const addQuestionButton = document.getElementById("addQuestionButton");
  const createExamDialog = document.getElementById("createExamDialog");
  const createExamForm = document.getElementById("createExamForm");

  teacherNameElement.textContent = currentTeacher.fullName;

  // Session actions
  logoutButton.addEventListener("click", () => {
    authService.logout();
    window.location.href = "index.html";
  });

  // Create-exam dialog controls
  openCreateExamButton.addEventListener("click", () => {
    createExamDialog.showModal();
  });

  closeCreateExamButton.addEventListener("click", closeAndResetCreateExamDialog);
  cancelCreateExamButton.addEventListener("click", closeAndResetCreateExamDialog);
  createExamDialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeAndResetCreateExamDialog();
  });

  addQuestionButton.addEventListener("click", addQuestionFields);

  // Validate and save the exam with the current teacher as owner.
  createExamForm.addEventListener("submit", event => {
    event.preventDefault();

    // Read the exam information from the dialog.
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const category = document.getElementById("category").value.trim();
    const duration = Number(document.getElementById("duration").value);

    // Basic exam fields are required before checking questions.
    if (!title || !description || !category || !Number.isFinite(duration) || duration <= 0) {
      showModalMessage("Please fill in the title, description, category, and a valid duration.");
      return;
    }

    // Optional initial questions still need to be complete if they were added.
    const questions = getQuestionsFromForm();

    if (!questions) {
      showModalMessage("Please complete every question and select its correct answer.");
      return;
    }

    const code = examService.generateUniqueExamCode();

    // Create the exam with ownership tied to the logged-in teacher.
    const exam = new Exam(title, {
      description,
      category,
      code,
      duration,
      teacherId: currentTeacher.id,
      questions
    });

    // Save, reset the dialog, and refresh the dashboard list.
    examService.saveExam(exam);
    closeAndResetCreateExamDialog();
    showMessage(`Exam created successfully. Code: ${code}`, "success");
    renderExams(currentTeacher.id);
  });

  renderExams(currentTeacher.id);
}

// Add one multiple-choice question block to the create-exam dialog.
function addQuestionFields() {
  const questionFields = document.getElementById("questionFields");
  const questionNumber = questionFields.children.length + 1;

  // Create the wrapper and heading for the new question.
  const questionBox = document.createElement("fieldset");
  questionBox.className = "question-box";
  questionBox.dataset.questionNumber = questionNumber;

  const legend = document.createElement("legend");
  legend.className = "h6";
  legend.textContent = `Question ${questionNumber}`;
  questionBox.append(legend);

  const questionLabel = document.createElement("label");
  questionLabel.className = "form-label";
  questionLabel.htmlFor = `questionText${questionNumber}`;
  questionLabel.textContent = "Question text";

  const questionInput = document.createElement("input");
  questionInput.id = `questionText${questionNumber}`;
  questionInput.className = "form-control mb-3 question-text";
  questionInput.type = "text";
  questionInput.required = true;

  questionBox.append(questionLabel, questionInput);

  // Each question always has four answer options and one correct answer radio.
  for (let answerIndex = 0; answerIndex < 4; answerIndex += 1) {
    const answerRow = document.createElement("div");
    answerRow.className = "input-group mb-2";

    const radioWrapper = document.createElement("span");
    radioWrapper.className = "input-group-text";

    const correctAnswerRadio = document.createElement("input");
    correctAnswerRadio.className = "form-check-input mt-0 correct-answer";
    correctAnswerRadio.type = "radio";
    correctAnswerRadio.name = `correctAnswer${questionNumber}`;
    correctAnswerRadio.value = answerIndex;
    correctAnswerRadio.required = true;
    correctAnswerRadio.setAttribute("aria-label", `Mark answer ${answerIndex + 1} as correct`);

    const answerInput = document.createElement("input");
    answerInput.className = "form-control answer-option";
    answerInput.type = "text";
    answerInput.placeholder = `Answer option ${answerIndex + 1}`;
    answerInput.setAttribute("aria-label", `Answer option ${answerIndex + 1}`);
    answerInput.required = true;

    radioWrapper.append(correctAnswerRadio);
    answerRow.append(radioWrapper, answerInput);
    questionBox.append(answerRow);
  }

  questionFields.append(questionBox);
  document.getElementById("noQuestionsMessage").hidden = true;
}

// Read all question fields from the creation form and convert them to Question objects.
function getQuestionsFromForm() {
  const questionBoxes = document.querySelectorAll("#questionFields .question-box");
  const questions = [];

  for (const questionBox of questionBoxes) {
    const text = questionBox.querySelector(".question-text").value.trim();
    const answers = Array.from(questionBox.querySelectorAll(".answer-option"), input => input.value.trim());
    const selectedAnswer = questionBox.querySelector(".correct-answer:checked");

    if (!text || answers.some(answer => !answer) || !selectedAnswer) {
      return null;
    }

    questions.push(new Question(text, answers, Number(selectedAnswer.value)));
  }

  return questions;
}

// Reset the dialog so every new exam starts with a clean form.
function closeAndResetCreateExamDialog() {
  const createExamDialog = document.getElementById("createExamDialog");

  document.getElementById("createExamForm").reset();
  document.getElementById("questionFields").replaceChildren();
  document.getElementById("noQuestionsMessage").hidden = false;
  showModalMessage("");

  if (createExamDialog.open) {
    createExamDialog.close();
  }
}

// Render only exams owned by the current teacher.
function renderExams(teacherId) {
  const examList = document.getElementById("examList");
  const exams = examService.getExamsByTeacherId(teacherId);

  examList.replaceChildren();

  if (exams.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "text-secondary";
    emptyMessage.textContent = "You have not created any exams yet.";
    examList.append(emptyMessage);
    return;
  }

  exams.forEach(exam => {
    examList.append(createExamCard(exam, teacherId));
  });
}

// Build a dashboard card with navigation to details and a delete action.
function createExamCard(exam, teacherId) {
  // Card shell
  const column = document.createElement("div");
  column.className = "col-md-6 col-lg-4";

  const card = document.createElement("article");
  card.className = "card h-100";

  const cardBody = document.createElement("div");
  cardBody.className = "card-body d-flex flex-column";

  // Exam information shown on the dashboard.
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
  questionCount.textContent = `Questions: ${exam.questions.length}`;

  const actions = document.createElement("div");
  actions.className = "d-flex gap-2 mt-auto";

  // Teacher actions for opening details or deleting this exam.
  const detailsLink = document.createElement("a");
  detailsLink.className = "btn btn-outline-primary btn-sm";
  detailsLink.href = `exam-details.html?id=${encodeURIComponent(exam.id)}`;
  detailsLink.textContent = "Exam Details";

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn btn-outline-danger btn-sm";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${exam.title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    examService.deleteExam(exam.id);
    showMessage("Exam deleted successfully.", "success");
    renderExams(teacherId);
  });

  actions.append(detailsLink, deleteButton);
  cardBody.append(title, description, details, questionCount, actions);
  card.append(cardBody);
  column.append(card);

  return column;
}

// Display feedback below the dashboard heading.
function showMessage(message, type) {
  const messageElement = document.getElementById("dashboardMessage");
  messageElement.textContent = message;
  messageElement.className = `form-message ${type} mb-3`;
}

function showModalMessage(message) {
  const messageElement = document.getElementById("modalMessage");
  messageElement.textContent = message;
  messageElement.className = message ? "form-message error" : "form-message";
}
