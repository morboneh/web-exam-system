import { Exam } from "../models/Exam.js";
import { Question } from "../models/Question.js";
import { StorageService } from "./StorageService.js";

export class ExamService {
  constructor() {
    this.storageService = new StorageService();
  }

  getAllExams() {
    const plainExams = this.storageService.getExams();

    // Stored JSON is plain data, so rebuild Exam and Question objects before using their methods.
    const allExamClones = plainExams.map(examData => {
      const exam = new Exam(examData.title, {
        id: examData.id,
        description: examData.description,
        category: examData.category,
        code: examData.code,
        duration: examData.duration,
        teacherId: examData.teacherId,
        createdAt: examData.createdAt
      });

      exam.questions = (examData.questions ?? []).map(questionData => {
        return new Question(
          questionData.text,
          questionData.answers,
          questionData.correctAnswerIndex,
          { id: questionData.id }
        );
      });

      return exam;
    });

    return allExamClones;
  }

  getExamsByTeacherId(teacherId) {
    return this.getAllExams().filter(exam => exam.teacherId === teacherId);
  }

  generateUniqueExamCode() {
    // Avoid confusing characters like I, O, 0, and 1 in student-facing codes.
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const existingCodes = new Set(
      this.getAllExams()
        .filter(exam => exam.code)
        .map(exam => exam.code.toUpperCase())
    );
    let code;

    do {
      code = Array.from({ length: 6 }, () => {
        const randomIndex = Math.floor(Math.random() * characters.length);
        return characters[randomIndex];
      }).join("");
    } while (existingCodes.has(code));

    return code;
  }

  saveExam(exam) {
    const exams = this.getAllExams();

    exams.push(exam);

    this.storageService.saveExams(exams);
  }

  updateExam(updatedExam) {
    const exams = this.getAllExams();
    const examIndex = exams.findIndex(exam => exam.id === updatedExam.id);

    if (examIndex === -1) {
      return false;
    }

    exams[examIndex] = updatedExam;
    this.storageService.saveExams(exams);
    return true;
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

  searchExamsByTitleOrCode(query) {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return this.getAllExams();
    }

    return this.getAllExams().filter(exam => {
      const title = exam.title.toLowerCase();
      const code = exam.code?.toLowerCase() ?? "";

      return title.includes(normalizedQuery) || code.includes(normalizedQuery);
    });
  }

  isExamCodeAvailable(code, currentExamId = null) {
    const normalizedCode = code.trim().toUpperCase();

    return !this.getAllExams().some(exam => {
      return exam.id !== currentExamId && exam.code?.toUpperCase() === normalizedCode;
    });
  }

  clearAllExams() {
    this.storageService.saveExams([]);
  }
}
