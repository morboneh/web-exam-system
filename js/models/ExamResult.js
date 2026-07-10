// Represents one completed exam attempt saved for a specific student and exam.
export class ExamResult {
  constructor(examId, studentId, score, totalQuestions, correctAnswers, options = {}) {
    this.id = options.id ?? crypto.randomUUID();
    this.examId = examId;
    this.studentId = studentId;
    this.score = score;
    this.totalQuestions = totalQuestions;
    this.correctAnswers = correctAnswers;
    this.submittedAt = options.submittedAt ?? new Date().toISOString();
    this.status = options.status ?? "completed";
    this.wrongQuestionIndexes = options.wrongQuestionIndexes ?? [];
    this.unansweredQuestionIndexes = options.unansweredQuestionIndexes ?? [];
    this.selectedAnswerIndexes = options.selectedAnswerIndexes ?? [];
    this.submittedBy = options.submittedBy ?? "manual";
  }
}
