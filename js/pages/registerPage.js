import { User } from "../models/User.js";
import { StorageService } from "../services/StorageService.js";

const storageService = new StorageService();

const registerForm = document.getElementById("registerForm");
const messageElement = document.getElementById("registerMessage");

registerForm.addEventListener("submit", event => {
  event.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  if (!fullName || !email || !password || !role) {
    showMessage("Please fill in all fields.", "error");
    return;
  }

  if (!isValidRole(role)) {
    showMessage("Please choose a valid role.", "error");
    return;
  }

  if (storageService.findUserByEmail(email)) {
    showMessage("A user with this email already exists.", "error");
    return;
  }

  const user = new User(fullName, email, password, role);

  storageService.addUser(user);
  showMessage("Registration successful. Redirecting to login...", "success");

  registerForm.reset();

  setTimeout(() => {
    window.location.href = "login.html";
  }, 800);
});

function isValidRole(role) {
  return role === User.Roles.TEACHER || role === User.Roles.STUDENT;
}

function showMessage(message, type) {
  messageElement.textContent = message;
  messageElement.className = `form-message ${type}`;
}
