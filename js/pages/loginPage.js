import { AuthService } from "../services/AuthService.js";

const authService = new AuthService();

const loginForm = document.getElementById("loginForm");
const messageElement = document.getElementById("loginMessage");

const currentUser = authService.getCurrentUser();

if (currentUser) {
  authService.redirectByRole(currentUser);
}

loginForm.addEventListener("submit", event => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showMessage("Please enter your email and password.");
    return;
  }

  const user = authService.login(email, password);

  if (!user) {
    showMessage("Invalid email or password.");
    return;
  }

  authService.redirectByRole(user);
});

function showMessage(message) {
  messageElement.textContent = message;
  messageElement.className = "form-message error";
}
