import { AuthService } from "../services/AuthService.js";

const authService = new AuthService();
const currentUser = authService.getCurrentUser();

// Logged-in users should not stay on the public home page.
if (currentUser) {
  authService.redirectByRole(currentUser);
}
