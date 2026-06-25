export class Exam {
  constructor(title) {
    this.id = crypto.randomUUID();
    this.title = title;
    this.questions = [];
    this.createdAt = new Date().toISOString();
  }

  addQuestion(question) {
    this.questions.push(question);
  }

  getQuestionCount() {
    return this.questions.length;
  }
}