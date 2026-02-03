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
 * Generate a personalized learning path based on student performance
 * @param {string} level - Student's current level (beginner, intermediate, advanced)
 * @param {Array} weakAreas - Array of topics where the student is weak
 * @returns {Promise<Object>} - Learning path in JSON format
 */
export async function generateLearningPath(level, weakAreas = []) {
  const prompt = `Create a personalized learning path for a "${level}" level student${weakAreas.length > 0 ? ` who is weak in: ${weakAreas.join(', ')}` : ''}.
  
  The path should consist of 5-7 lessons.
  
  Return ONLY a JSON object in this EXACT format with NO markdown:
  
  {
    "subject": "General Knowledge & Logic",
    "targetLevel": "${level}",
    "lessons": [
      {
        "lessonId": "unique_id_1",
        "title": "Lesson Title",
        "description": "Brief description of what will be learned",
        "difficulty": "easy|medium|hard",
        "topics": ["topic1", "topic2"],
        "estimatedDuration": "30 mins"
      }
    ]
  }
  
  Prioritize topics based on the student's weaknesses if provided. Ensure lessons build upon each other.`;

  return await generateWithGemini(prompt);
}

/**
 * Generate a specific test for a lesson
 * @param {string} lessonId - Lesson ID
 * @param {string} lessonTitle - Lesson Title
 * @param {string} level - Student Level
 * @returns {Promise<Object>} - Test questions
 */
export async function generateLessonTest(lessonId, lessonTitle, level) {
    const prompt = `Generate a short quiz (5 questions) for the lesson "${lessonTitle}" suitable for a "${level}" level student.
  
    Return ONLY a JSON object in this EXACT format with NO markdown:
  
    {
      "questions": [
        {
          "question": "question text",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "correct option text"
        }
      ]
    }`;
  
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
  "reasoning": "brief explanation of classification",
  "weakAreas": ["topic1", "topic2"]
}

Classification criteria:
- beginner: 0-40% score
- intermediate: 41-70% score
- advanced: 71-100% score

Also identify 2-3 weak areas based on incorrect answers.`;

  return await generateWithGemini(prompt);
}

/**
 * Generate level-based test questions
 * @param {string} level - Student level
 * @returns {Promise<Object>} - Test questions in JSON format
 */
export async function generateLevelBasedTest(level) {
    const prompt = `Generate a practice test with 10 multiple-choice questions suitable for a "${level}" level student.
  
    Return ONLY a JSON object in this EXACT format with NO markdown:
  
    {
      "questions": [
        {
          "question": "question text",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "correct option text"
        }
      ]
    }`;
  
    return await generateWithGemini(prompt);
  }

/**
 * Generate a comprehensive mock test with mixed difficulty
 * @returns {Promise<Object>} - Mock test questions
 */
export async function generateMockTest() {
    const prompt = `Generate a comprehensive mock test with 15 multiple-choice questions.
    
    Structure:
    - 5 Beginner level questions
    - 5 Intermediate level questions
    - 5 Advanced level questions
    
    Cover general knowledge, logic, and basic science.
    
    Return ONLY a JSON object in this EXACT format with NO markdown:
    
    {
      "questions": [
        {
          "question": "question text",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "correct option text",
          "level": "beginner|intermediate|advanced"
        }
      ]
    }`;
  
    return await generateWithGemini(prompt);
}
