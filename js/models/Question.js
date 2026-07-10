// Represents one multiple-choice question and its correct answer.
export class Question {
  constructor(text, answers, correctAnswerIndex, options = {}) {
    this.id = options.id ?? crypto.randomUUID();
    this.text = text;
    this.answers = answers;
    this.correctAnswerIndex = correctAnswerIndex;
  }

  isCorrect(userAnswerIndex) {
    return userAnswerIndex === this.correctAnswerIndex;
  }
}
