import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error('Gemini API key is missing. Please set VITE_GEMINI_API_KEY in .env file');
}

const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Generate content using Gemini API and parse JSON response
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function generateWithGemini(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    // Parse JSON
    const jsonResponse = JSON.parse(cleanedText);
    return jsonResponse;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate content with Gemini: ' + error.message);
  }
}

/**
 * Generate diagnostic test questions
 * @returns {Promise<Object>} - Test questions in JSON format
 */
export async function generateDiagnosticTest() {
  const prompt = `Generate a diagnostic test with 10 multiple-choice questions to assess a student's general knowledge and logical reasoning level. Mix easy, medium, and hard questions.

Return ONLY a JSON object in this EXACT format with NO markdown, NO explanations:

{
  "questions": [
    {
      "question": "question text here",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "exact text of correct option"
    }
  ]
}

Include questions on:
- Basic math
- Logical reasoning
- General knowledge
- Problem-solving

Make sure the JSON is valid and parseable.`;

  return await generateWithGemini(prompt);
}

/**
 * Evaluate student level based on test results
 * @param {Array} questions - Array of question objects with studentAnswer
 * @param {number} score - Student's score percentage
 * @returns {Promise<Object>} - Level evaluation
 */
export async function evaluateStudentLevel(questions, score) {
  const prompt = `Based on the following test results, classify the student's knowledge level as "beginner", "intermediate", or "advanced".

Score: ${score}%
Total Questions: ${questions.length}

Questions and Answers:
${questions.map((q, i) => `
${i + 1}. ${q.question}
Correct Answer: ${q.correctAnswer}
Student Answer: ${q.studentAnswer || 'Not answered'}
Correct: ${q.isCorrect ? 'Yes' : 'No'}
`).join('\n')}

Return ONLY a JSON object in this EXACT format with NO markdown, NO explanations:

{
  "level": "beginner" | "intermediate" | "advanced",
  "reasoning": "brief explanation of classification"
}

Classification criteria:
- beginner: 0-40% score
- intermediate: 41-70% score
- advanced: 71-100% score

Also consider the types of questions they got correct/wrong.`;

  return await generateWithGemini(prompt);
}

/**
 * Generate level-based test
 * @param {string} level - Student's current level (beginner/intermediate/advanced)
 * @returns {Promise<Object>} - Test questions
 */
export async function generateLevelBasedTest(level) {
  const difficultyMap = {
    beginner: 'easy',
    intermediate: 'moderate',
    advanced: 'hard'
  };

  const difficulty = difficultyMap[level] || 'moderate';

  const prompt = `Generate a ${difficulty} level test with 10 multiple-choice questions for a ${level} student.

Return ONLY a JSON object in this EXACT format with NO markdown, NO explanations:

{
  "questions": [
    {
      "question": "question text here",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "exact text of correct option"
    }
  ]
}

The questions should be appropriate for ${level} level students.
Include varied topics: math, reasoning, general knowledge, problem-solving.

Make sure the JSON is valid and parseable.`;

  return await generateWithGemini(prompt);
}

/**
 * Generate adaptive mock test with 15 questions (5 easy, 5 medium, 5 advanced)
 * Subject: Python
 * @returns {Promise<Object>} - Mock test questions with levels
 */
export async function generateMockTest() {
  const prompt = `Generate a Python programming mock test with EXACTLY 15 unique multiple-choice questions.

The questions MUST be distributed as follows:
- 5 EASY level questions (Python basics, syntax, variables, basic control flow)
- 5 MEDIUM level questions (OOP basics, data structures, modules, file handling)
- 5 ADVANCED level questions (decorators, generators, async/await, performance optimization)

Return ONLY a JSON object in this EXACT format with NO markdown, NO explanations:

{
  "questions": [
    {
      "question": "question text here",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "exact text of correct option",
      "level": "easy"
    },
    {
      "question": "question text here",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "exact text of correct option",
      "level": "medium"
    },
    {
      "question": "question text here",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "exact text of correct option",
      "level": "advanced"
    }
  ]
}

IMPORTANT:
- Generate UNIQUE questions every time
- Each question must have EXACTLY 4 options
- The correctAnswer must EXACTLY match one of the options
- Include the "level" field for each question
- Make the questions practical and relevant to Python programming
- Total questions = 15 (5 easy + 5 medium + 5 advanced)`;

  return await generateWithGemini(prompt);
}

/**
 * Generate learning path based on student level for Python
 * @param {string} level - Current student level (easy/medium/advanced)
 * @returns {Promise<Object>} - Learning path with lessons
 */
export async function generateLearningPath(level) {
  const curriculumGuide = {
    easy: 'Python basics: variables, data types, operators, control flow (if/else, loops), functions, basic string operations',
    medium: 'Object-Oriented Programming (classes, objects, inheritance), data structures (lists, dictionaries, sets, tuples), modules and packages, file I/O, exception handling',
    advanced: 'Advanced concepts: decorators, generators, context managers, asyncio and async/await, metaclasses, performance optimization, design patterns'
  };

  const curriculum = curriculumGuide[level] || curriculumGuide.medium;

  const prompt = `Generate a structured learning path for a ${level} level Python programming student.

Focus on: ${curriculum}

Return ONLY a JSON object in this EXACT format with NO markdown, NO explanations:

{
  "level": "${level}",
  "lessons": [
    {
      "lessonId": "unique-lesson-id-1",
      "title": "Lesson title",
      "description": "Brief description of what this lesson covers",
      "content": "Detailed lesson content with examples and explanations",
      "completed": false
    }
  ]
}

IMPORTANT:
- Generate 6-8 lessons appropriate for ${level} level
- Each lessonId should be unique and kebab-case (e.g., "python-variables-basics")
- Lessons should build on each other progressively
- Include practical Python code examples in the content
- Make descriptions concise but informative
- Content should be comprehensive enough to learn the topic`;

  return await generateWithGemini(prompt);
}

/**
 * Generate lesson-specific test
 * @param {string} lessonId - Lesson identifier
 * @param {string} lessonTitle - Lesson title
 * @param {string} level - Student level (easy/medium/advanced)
 * @returns {Promise<Object>} - Lesson test questions
 */
export async function generateLessonTest(lessonId, lessonTitle, level) {
  const prompt = `Generate a test for the Python lesson: "${lessonTitle}" (Level: ${level})

The test should have 5 multiple-choice questions specifically about this lesson topic.

Return ONLY a JSON object in this EXACT format with NO markdown, NO explanations:

{
  "lessonId": "${lessonId}",
  "questions": [
    {
      "question": "question text here",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "exact text of correct option"
    }
  ]
}

IMPORTANT:
- Generate EXACTLY 5 questions
- Questions should be focused on the lesson topic
- Difficulty should match the ${level} level
- Each question must have EXACTLY 4 options
- The correctAnswer must EXACTLY match one of the options`;

  return await generateWithGemini(prompt);
}
