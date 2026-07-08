import { User } from "../models/User.js";
import { AuthService } from "../services/AuthService.js";

const authService = new AuthService();
const student = authService.requireRole(User.Roles.STUDENT);

if (student) {
  initializeStudentDashboard(student);
}

function initializeStudentDashboard(currentStudent) {
  const studentNameElement = document.getElementById("studentName");
  const logoutButton = document.getElementById("logoutButton");

  studentNameElement.textContent = currentStudent.fullName;

  logoutButton.addEventListener("click", () => {
    authService.logout();
    window.location.href = "index.html";
  });
}
