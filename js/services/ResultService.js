import { StorageService } from "./StorageService.js";

// Saves and retrieves completed exam attempts.
export class ResultService {
  constructor() {
    this.storageService = new StorageService();
  }

  addResult(result) {
    if (this.hasStudentCompletedExam(result.studentId, result.examId)) {
      return false;
    }

    const results = this.storageService.getResults();
    results.push(result);
    this.storageService.saveResults(results);
    return true;
  }

  // A student can only have one saved result for the same exam.
  hasStudentCompletedExam(studentId, examId) {
    return this.storageService.getResults().some(result =>
      result.studentId === studentId && result.examId === examId
    );
  }

  getResultsByStudentId(studentId) {
    return this.storageService.getResults().filter(result => result.studentId === studentId);
  }

  getResultsByExamId(examId) {
    return this.storageService.getResults().filter(result => result.examId === examId);
  }
}
