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
