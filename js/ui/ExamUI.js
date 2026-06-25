export class ExamUI {
  constructor(examService) {
    // Get service for CRUD Opertions on Exams (js/services/ExamService)
    this.examService = examService;

    // Get references to UI elements
    this.examListElement = document.getElementById("examList");
    this.examRunnerElement = document.getElementById("examRunner");
    this.builderMessageElement = document.getElementById("builderMessage");
  }

  showBuilderMessage(message, type = "success") {
    this.builderMessageElement.innerHTML = `
      <div class="alert alert-${type}">
        ${message}
      </div>
    `;
  }

  clearBuilderMessage() {
    this.builderMessageElement.innerHTML = "";
  }

  // Render Exam List (JS object) and display in the UI
  renderExamList() {
    const exams = this.examService.getAllExams();

    this.examListElement.innerHTML = "";

    if (exams.length === 0) {
      this.examListElement.innerHTML = `
        <p class="text-muted">No exams saved yet.</p>
      `;
      return;
    }

    // for each exam we are bulding html exam card and inserting to the html the data of this exam
    exams.forEach(exam => {
      const div = document.createElement("div");
      div.className = "exam-card";

      div.innerHTML = `
        <h5>${exam.title}</h5>

        <p class="small-muted">
          Questions: ${exam.getQuestionCount()}
        </p>

        <p class="small-muted">
          Created: ${new Date(exam.createdAt).toLocaleString()}
        </p>

        <button
          class="btn btn-sm btn-success run-btn"
          data-id="${exam.id}">
          Run Exam
        </button>

        <button
          class="btn btn-sm btn-danger delete-btn"
          data-id="${exam.id}">
          Delete
        </button>
      `;

      this.examListElement.appendChild(div);
    });
  }

  renderExamRunner(exam) {
    if (!exam) {
      this.examRunnerElement.innerHTML = `
        <div class="alert alert-danger">
          Exam not found.
        </div>
      `;
      return;
    }

    if (exam.questions.length === 0) {
      this.examRunnerElement.innerHTML = `
        <div class="alert alert-warning">
          This exam has no questions.
        </div>
      `;
      return;
    }

    this.examRunnerElement.innerHTML = `
      <h4>${exam.title}</h4>
      <p class="text-muted">
        Answer all questions and submit the exam.
      </p>
    `;

    exam.questions.forEach((question, questionIndex) => {
      const questionDiv = document.createElement("div");
      questionDiv.className = "question-box";

      questionDiv.innerHTML = `
        <h5>${questionIndex + 1}. ${question.text}</h5>

        ${question.answers.map((answer, answerIndex) => `
          <label class="answer-label">
            <input
              type="radio"
              name="question-${questionIndex}"
              value="${answerIndex}">
            ${answer}
          </label>
        `).join("")}
      `;

      this.examRunnerElement.appendChild(questionDiv);
    });

    const submitButton = document.createElement("button");
    submitButton.className = "btn btn-primary";
    submitButton.textContent = "Submit Exam";

    submitButton.addEventListener("click", () => {
      this.checkExam(exam);
    });

    this.examRunnerElement.appendChild(submitButton);
  }

  checkExam(exam) {
    let score = 0;

    exam.questions.forEach((question, questionIndex) => {
      const selectedAnswer = document.querySelector(
        `input[name="question-${questionIndex}"]:checked`
      );

      if (!selectedAnswer) {
        return;
      }

      const userAnswerIndex = Number(selectedAnswer.value);

      if (question.isCorrect(userAnswerIndex)) {
        score++;
      }
    });

    const resultDiv = document.createElement("div");
    resultDiv.className = "alert alert-info mt-3";

    resultDiv.innerHTML = `
      <h5>Exam Result</h5>
      <p>Score: ${score} / ${exam.questions.length}</p>
      <p>Percent: ${Math.round((score / exam.questions.length) * 100)}%</p>
    `;

    this.examRunnerElement.appendChild(resultDiv);
  }
}