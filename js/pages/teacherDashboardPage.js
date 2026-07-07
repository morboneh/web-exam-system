import { Exam } from "../models/Exam.js";
import { User } from "../models/User.js";
import { AuthService } from "../services/AuthService.js";
import { ExamService } from "../services/ExamService.js";

const authService = new AuthService();
const examService = new ExamService();
const teacher = authService.requireRole(User.Roles.TEACHER);

if (teacher) {
  initializeDashboard(teacher);
}

function initializeDashboard(currentTeacher) {
  const teacherNameElement = document.getElementById("teacherName");
  const logoutButton = document.getElementById("logoutButton");
  const createExamForm = document.getElementById("createExamForm");

  teacherNameElement.textContent = currentTeacher.fullName;

  logoutButton.addEventListener("click", () => {
    authService.logout();
    window.location.href = "index.html";
  });

  createExamForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const category = document.getElementById("category").value.trim();
    const code = document.getElementById("examCode").value.trim();
    const duration = Number(document.getElementById("duration").value);

    if (!title || !description || !category || !code || !Number.isFinite(duration) || duration <= 0) {
      showMessage("Please fill in all fields with valid values.", "error");
      return;
    }

    const exam = new Exam(title, {
      description,
      category,
      code,
      duration,
      teacherId: currentTeacher.id
    });

    examService.saveExam(exam);
    createExamForm.reset();
    showMessage("Exam created successfully.", "success");
    renderExams(currentTeacher.id);
  });

  renderExams(currentTeacher.id);
}

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

function createExamCard(exam, teacherId) {
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

  const actions = document.createElement("div");
  actions.className = "d-flex gap-2 mt-auto";

  const detailsLink = document.createElement("a");
  detailsLink.className = "btn btn-outline-primary btn-sm";
  detailsLink.href = `exam-details.html?id=${encodeURIComponent(exam.id)}`;
  detailsLink.textContent = "Exam Details";

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn btn-outline-danger btn-sm";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => {
    examService.deleteExam(exam.id);
    showMessage("Exam deleted successfully.", "success");
    renderExams(teacherId);
  });

  actions.append(detailsLink, deleteButton);
  cardBody.append(title, description, details, actions);
  card.append(cardBody);
  column.append(card);

  return column;
}

function showMessage(message, type) {
  const messageElement = document.getElementById("dashboardMessage");
  messageElement.textContent = message;
  messageElement.className = `form-message ${type} mb-3`;
}
