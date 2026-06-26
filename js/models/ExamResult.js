export class ExamResult {
  constructor(examId, studentId, score, totalQuestions, correctAnswers, options = {}) {
    this.id = options.id ?? crypto.randomUUID();
    this.examId = examId;
    this.studentId = studentId;
    this.score = score;
    this.totalQuestions = totalQuestions;
    this.correctAnswers = correctAnswers;
    this.submittedAt = options.submittedAt ?? new Date().toISOString();
  }
}
