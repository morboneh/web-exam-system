import { Exam } from "../models/Exam.js";
import { Question } from "../models/Question.js";
import { StorageService } from "./StorageService.js";

export class ExamService {
  constructor() {
    this.storageService = new StorageService();
  }

  getAllExams() {
    const plainExams = this.storageService.getExams();

    // for each examData(Exam) return new Exam object with the same data
    // simply putting - creates a clone of each exam
    let allExamClones = plainExams.map(examData => {
      const exam = new Exam(examData.title, {
        id: examData.id,
        description: examData.description,
        category: examData.category,
        code: examData.code,
        duration: examData.duration,
        teacherId: examData.teacherId,
        createdAt: examData.createdAt
      });

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

    this.storageService.saveExams(exams);
  }

  deleteExam(examId) {
    const exams = this.getAllExams();

    const filteredExams = exams.filter(exam => exam.id !== examId);

    this.storageService.saveExams(filteredExams);
  }

  getExamById(examId) {
    const exams = this.getAllExams();

    return exams.find(exam => exam.id === examId);
  }

  clearAllExams() {
    this.storageService.saveExams([]);
  }
}
