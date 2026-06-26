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

  getQuestionCount() {
    return this.questions.length;
  }
}
