import { User } from "../models/User.js";
import { StorageService } from "../services/StorageService.js";

const storageService = new StorageService();

const loginForm = document.getElementById("loginForm");
const messageElement = document.getElementById("loginMessage");

loginForm.addEventListener("submit", event => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showMessage("Please enter your email and password.");
    return;
  }

  const user = storageService.findUserByCredentials(email, password);

  if (!user) {
    showMessage("Invalid email or password.");
    return;
  }

  storageService.setCurrentUser(user);
  redirectByRole(user.role);
});

function redirectByRole(role) {
  if (role === User.Roles.TEACHER) {
    window.location.href = "teacher-dashboard.html";
    return;
  }

  if (role === User.Roles.STUDENT) {
    window.location.href = "student-dashboard.html";
    return;
  }

  showMessage("This user has an invalid role.");
}

function showMessage(message) {
  messageElement.textContent = message;
  messageElement.className = "form-message error";
}
