export class StorageService {
  constructor() {
    this.keys = {
      users: "users",
      exams: "exams",
      results: "results",
      currentUser: "currentUser"
    };
  }

  // Read JSON from localStorage and return a safe default when the key is empty.
  getJson(key, defaultValue) {
    const data = localStorage.getItem(key);

    if (!data) {
      return defaultValue;
    }

    return JSON.parse(data);
  }

  saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

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

  getExams() {
    return this.getJson(this.keys.exams, []);
  }

  saveExams(exams) {
    this.saveJson(this.keys.exams, exams);
  }

  getResults() {
    return this.getJson(this.keys.results, []);
  }

  saveResults(results) {
    this.saveJson(this.keys.results, results);
  }

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
