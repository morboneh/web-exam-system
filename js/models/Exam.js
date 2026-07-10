// Represents an exam created by a teacher, including its saved questions.
export class Exam {
  constructor(title, options = {}) {
    this.id = options.id ?? crypto.randomUUID();
    this.title = title;
    this.description = options.description ?? "";
    this.category = options.category ?? "";
    this.code = options.code ?? "";
    this.duration = options.duration ?? null;
    this.teacherId = options.teacherId ?? null;
    this.questions = options.questions ?? [];
    this.createdAt = options.createdAt ?? new Date().toISOString();
  }

  addQuestion(question) {
    this.questions.push(question);
  }

  // Used by dashboards and search cards without exposing the questions array directly.
  getQuestionCount() {
    return this.questions.length;
  }
}
