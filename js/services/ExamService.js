import { Exam } from "../models/Exam.js";
import { Question } from "../models/Question.js";

export class ExamService {
  constructor() {
    this.storageKey = "exams";
  }

  getAllExams() {
    // Get data from localStorage by exams key
    const data = localStorage.getItem(this.storageKey);

    if (!data) {
      return [];
    }
    
    // continue if key exists and parse data to array of objects
    const plainExams = JSON.parse(data);

    // for each examData(Exam) return new Exam object with the same data
    // simply putting - creates a clone of each exam
    let allExamClones = plainExams.map(examData => {
      const exam = new Exam(examData.title);

      exam.id = examData.id;
      exam.createdAt = examData.createdAt;

      // inner clone for all the exam's questions
      exam.questions = examData.questions.map(questionData => {
        const question = new Question(
          questionData.text,
          questionData.answers,
          questionData.correctAnswerIndex
        );

        question.id = questionData.id;

        return question;
      });

      return exam;
    });

    return allExamClones;
  }

  // Save to localStorage
  saveExam(exam) {
    const exams = this.getAllExams();

    // here we can delete the exam by using this.deleteExam(exam.id); in case it's already there

    exams.push(exam);

    localStorage.setItem(this.storageKey, JSON.stringify(exams));
  }

  deleteExam(examId) {
    const exams = this.getAllExams();

    const filteredExams = exams.filter(exam => exam.id !== examId);

    localStorage.setItem(this.storageKey, JSON.stringify(filteredExams));
  }

  getExamById(examId) {
    const exams = this.getAllExams();

    return exams.find(exam => exam.id === examId);
  }

  clearAllExams() {
    localStorage.removeItem(this.storageKey);
  }
}