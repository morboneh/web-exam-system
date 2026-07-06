import { User } from "../models/User.js";
import { StorageService } from "./StorageService.js";

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
