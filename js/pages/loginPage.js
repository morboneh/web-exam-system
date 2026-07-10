import { AuthService } from "../services/AuthService.js";

const authService = new AuthService();

const loginForm = document.getElementById("loginForm");
const messageElement = document.getElementById("loginMessage");

const currentUser = authService.getCurrentUser();

// If a user already has an active session, send them to the correct dashboard.
if (currentUser) {
  authService.redirectByRole(currentUser);
}

// Validate credentials and create the current session.
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

// Login only needs an error message because successful login redirects immediately.
function showMessage(message) {
  messageElement.textContent = message;
  messageElement.className = "form-message error";
}
