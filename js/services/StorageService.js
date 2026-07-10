// Centralizes all localStorage access so page files do not read or write storage directly.
export class StorageService {
  constructor() {
    this.keys = {
      users: "users",
      exams: "exams",
      results: "results",
      currentUser: "currentUser"
    };
  }

  // Return the default if the key is empty or the stored JSON is damaged.
  getJson(key, defaultValue) {
    const data = localStorage.getItem(key);

    if (!data) {
      return defaultValue;
    }

    try {
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }

  saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // User data helpers
  getUsers() {
    return this.getJson(this.keys.users, []);
  }

  saveUsers(users) {
    this.saveJson(this.keys.users, users);
  }

  addUser(user) {
    const users = this.getUsers();

    users.push(user);
    this.saveUsers(users);
  }

  findUserByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();

    return this.getUsers().find(user => user.email?.toLowerCase() === normalizedEmail);
  }

  findUserByCredentials(email, password) {
    const user = this.findUserByEmail(email);

    if (!user || user.password !== password) {
      return null;
    }

    return user;
  }

  // Exam data helpers
  getExams() {
    return this.getJson(this.keys.exams, []);
  }

  saveExams(exams) {
    this.saveJson(this.keys.exams, exams);
  }

  // Result data helpers
  getResults() {
    return this.getJson(this.keys.results, []);
  }

  saveResults(results) {
    this.saveJson(this.keys.results, results);
  }

  // Current session helpers
  getCurrentUser() {
    return this.getJson(this.keys.currentUser, null);
  }

  setCurrentUser(user) {
    this.saveJson(this.keys.currentUser, user);
  }

  clearCurrentUser() {
    localStorage.removeItem(this.keys.currentUser);
  }
}
