export class Question {
  constructor(text, answers, correctAnswerIndex) {
    this.id = crypto.randomUUID();
    this.text = text;
    this.answers = answers;
    this.correctAnswerIndex = correctAnswerIndex;
  }

  isCorrect(userAnswerIndex) {
    return userAnswerIndex === this.correctAnswerIndex;
  }
}