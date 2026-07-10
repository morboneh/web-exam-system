import { User } from "../models/User.js";
import { StorageService } from "./StorageService.js";

// Handles login state, logout, and role-based page protection.
export class AuthService {
  constructor() {
    this.storageService = new StorageService();
  }

  login(email, password) {
    const user = this.storageService.findUserByCredentials(email, password);

    if (!user) {
      return null;
    }

    this.storageService.setCurrentUser(user);
    return user;
  }

  logout() {
    this.storageService.clearCurrentUser();
  }

  getCurrentUser() {
    return this.storageService.getCurrentUser();
  }

  isLoggedIn() {
    return this.getCurrentUser() !== null;
  }

  // Decide which dashboard belongs to the logged-in user's role.
  redirectByRole(user) {
    if (user.role === User.Roles.TEACHER) {
      window.location.href = "teacher-dashboard.html";
      return;
    }

    if (user.role === User.Roles.STUDENT) {
      window.location.href = "student-dashboard.html";
    }
  }

  requireAuth() {
    const user = this.getCurrentUser();

    if (!user) {
      window.location.href = "login.html";
      return null;
    }

    return user;
  }

  // Used at the top of protected page scripts before initializing page behavior.
  requireRole(role) {
    const user = this.requireAuth();

    if (!user) {
      return null;
    }

    if (user.role !== role) {
      this.redirectByRole(user);
      return null;
    }

    return user;
  }
}
