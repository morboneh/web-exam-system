import { AuthService } from "../services/AuthService.js";

const authService = new AuthService();
const currentUser = authService.getCurrentUser();

if (currentUser) {
  authService.redirectByRole(currentUser);
}
