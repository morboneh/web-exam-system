export class User {
  static Roles = {
    TEACHER: "teacher",
    STUDENT: "student"
  };

  constructor(fullName, email, password, role, options = {}) {
    this.id = options.id ?? crypto.randomUUID();
    this.fullName = fullName;
    this.email = email;
    this.password = password;
    this.role = role;
  }
}
