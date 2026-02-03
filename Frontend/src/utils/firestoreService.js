import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * STUDENT PROGRESS OPERATIONS
 */

/**
 * Get student progress for a specific subject
 * @param {string} userId - Student user ID
 * @param {string} subject - Subject name (default: "Python")
 * @returns {Promise<Object|null>} - Student progress data or null
 */
export async function getStudentProgress(userId, subject = "Python") {
    try {
        const progressRef = doc(db, 'users', userId, 'student_progress', 'main');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            // Return data for the specific subject
            if (data.subject === subject) {
                return data;
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching student progress:', error);
        throw error;
    }
}

/**
 * Initialize student progress
 * @param {string} userId - Student user ID
 * @param {string} level - Initial level (easy/medium/advanced)
 * @param {Array} lessons - Initial lessons array
 * @returns {Promise<void>}
 */
export async function initializeStudentProgress(userId, level, lessons = []) {
    try {
        const progressRef = doc(db, 'users', userId, 'student_progress', 'main');
        await setDoc(progressRef, {
            subject: "Python",
            currentLevel: level,
            lessons: lessons,
            progressPercentage: 0,
            lastUpdated: serverTimestamp()
        });
    } catch (error) {
        console.error('Error initializing student progress:', error);
        throw error;
    }
}

/**
 * Update student progress
 * @param {string} userId - Student user ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateStudentProgress(userId, updates) {
    try {
        const progressRef = doc(db, 'users', userId, 'student_progress', 'main');
        await updateDoc(progressRef, {
            ...updates,
            lastUpdated: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating student progress:', error);
        throw error;
    }
}

/**
 * Update lesson completion status
 * @param {string} userId - Student user ID
 * @param {string} lessonId - Lesson identifier
 * @param {Object} lessonUpdates - Lesson fields to update
 * @returns {Promise<void>}
 */
export async function updateLessonStatus(userId, lessonId, lessonUpdates) {
    try {
        const progressData = await getStudentProgress(userId);
        if (!progressData) {
            throw new Error('Student progress not found');
        }

        const updatedLessons = progressData.lessons.map(lesson =>
            lesson.lessonId === lessonId
                ? { ...lesson, ...lessonUpdates }
                : lesson
        );

        // Calculate progress percentage
        const completedCount = updatedLessons.filter(l => l.completed).length;
        const progressPercentage = Math.round((completedCount / updatedLessons.length) * 100);

        await updateStudentProgress(userId, {
            lessons: updatedLessons,
            progressPercentage
        });
    } catch (error) {
        console.error('Error updating lesson status:', error);
        throw error;
    }
}

/**
 * TEST ATTEMPTS OPERATIONS
 */

/**
 * Save test attempt
 * @param {Object} testData - Test attempt data
 * @returns {Promise<string>} - Document ID
 */
export async function saveTestAttempt(testData) {
    try {
        const testRef = await addDoc(collection(db, 'testAttempts'), {
            ...testData,
            createdAt: serverTimestamp()
        });
        return testRef.id;
    } catch (error) {
        console.error('Error saving test attempt:', error);
        throw error;
    }
}

/**
 * Get all test attempts for a user
 * @param {string} userId - User ID
 * @param {string} subject - Subject filter (optional)
 * @returns {Promise<Array>} - Array of test attempts
 */
export async function getUserTestAttempts(userId, subject = null) {
    try {
        let q;
        if (subject) {
            q = query(
                collection(db, 'testAttempts'),
                where('userId', '==', userId),
                where('subject', '==', subject),
                orderBy('createdAt', 'desc')
            );
        } else {
            q = query(
                collection(db, 'testAttempts'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
        }

        const snapshot = await getDocs(q);
        const attempts = [];
        snapshot.forEach(doc => {
            attempts.push({ id: doc.id, ...doc.data() });
        });
        return attempts;
    } catch (error) {
        console.error('Error fetching test attempts:', error);
        throw error;
    }
}

/**
 * Get latest test attempt for a user
 * @param {string} userId - User ID
 * @param {string} type - Test type filter (mock/lesson)
 * @returns {Promise<Object|null>} - Latest test attempt or null
 */
export async function getLatestTestAttempt(userId, type = null) {
    try {
        let q;
        if (type) {
            q = query(
                collection(db, 'testAttempts'),
                where('userId', '==', userId),
                where('type', '==', type),
                orderBy('createdAt', 'desc')
            );
        } else {
            q = query(
                collection(db, 'testAttempts'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
        }

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching latest test attempt:', error);
        throw error;
    }
}

/**
 * ANALYTICS OPERATIONS
 */

/**
 * Get student analytics
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Analytics data or null
 */
export async function getStudentAnalytics(userId) {
    try {
        const analyticsRef = doc(db, 'analytics', userId);
        const analyticsSnap = await getDoc(analyticsRef);

        if (analyticsSnap.exists()) {
            return analyticsSnap.data();
        }
        return null;
    } catch (error) {
        console.error('Error fetching analytics:', error);
        throw error;
    }
}

/**
 * Initialize student analytics
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function initializeAnalytics(userId) {
    try {
        const analyticsRef = doc(db, 'analytics', userId);
        await setDoc(analyticsRef, {
            subject: "Python",
            easyScore: 0,
            mediumScore: 0,
            advancedScore: 0,
            promotionHistory: [],
            strengths: [],
            weaknesses: [],
            lastUpdated: serverTimestamp()
        });
    } catch (error) {
        console.error('Error initializing analytics:', error);
        throw error;
    }
}

/**
 * Update student analytics
 * @param {string} userId - User ID
 * @param {Object} updates - Analytics updates
 * @returns {Promise<void>}
 */
export async function updateAnalytics(userId, updates) {
    try {
        const analyticsRef = doc(db, 'analytics', userId);
        const analyticsSnap = await getDoc(analyticsRef);

        if (!analyticsSnap.exists()) {
            await initializeAnalytics(userId);
        }

        await updateDoc(analyticsRef, {
            ...updates,
            lastUpdated: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating analytics:', error);
        throw error;
    }
}

/**
 * Update analytics after mock test
 * @param {string} userId - User ID
 * @param {number} easyScore - Score in easy questions (0-5)
 * @param {number} mediumScore - Score in medium questions (0-5)
 * @param {number} advancedScore - Score in advanced questions (0-5)
 * @param {string} promotedTo - New level if promoted
 * @param {string} previousLevel - Previous level
 * @returns {Promise<void>}
 */
export async function updateMockTestAnalytics(userId, easyScore, mediumScore, advancedScore, promotedTo, previousLevel) {
    try {
        const analyticsData = await getStudentAnalytics(userId);
        const updates = {
            easyScore,
            mediumScore,
            advancedScore
        };

        // Add promotion to history if level changed
        if (promotedTo && promotedTo !== previousLevel) {
            const promotionHistory = analyticsData?.promotionHistory || [];
            promotionHistory.push({
                from: previousLevel,
                to: promotedTo,
                timestamp: new Date().toISOString()
            });
            updates.promotionHistory = promotionHistory;
        }

        // Analyze strengths and weaknesses
        const strengths = [];
        const weaknesses = [];

        if (easyScore >= 4) strengths.push('Python Basics');
        else if (easyScore <= 2) weaknesses.push('Python Basics');

        if (mediumScore >= 4) strengths.push('Intermediate Python');
        else if (mediumScore <= 2) weaknesses.push('Intermediate Python');

        if (advancedScore >= 4) strengths.push('Advanced Python');
        else if (advancedScore <= 2) weaknesses.push('Advanced Python');

        updates.strengths = strengths;
        updates.weaknesses = weaknesses;

        await updateAnalytics(userId, updates);
    } catch (error) {
        console.error('Error updating mock test analytics:', error);
        throw error;
    }
}

/**
 * TEACHER DASHBOARD OPERATIONS
 */

/**
 * Get all students with their progress
 * @returns {Promise<Array>} - Array of student data with progress
 */
export async function getAllStudentsProgress() {
    try {
        // Get all students first
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const usersSnapshot = await getDocs(usersQuery);
        
        // Fetch progress for each student
        const progressPromises = usersSnapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            try {
                // Get progress from subcollection
                const progressRef = doc(db, 'users', userId, 'student_progress', 'main');
                const progressSnap = await getDoc(progressRef);
                
                if (progressSnap.exists()) {
                    const progressData = progressSnap.data();
                    return {
                        userId,
                        fullName: userData.fullName,
                        email: userData.email,
                        currentLevel: progressData.currentLevel,
                        progressPercentage: progressData.progressPercentage,
                        lessonsCompleted: progressData.lessons?.filter(l => l.completed).length || 0,
                        totalLessons: progressData.lessons?.length || 0
                    };
                }
            } catch (err) {
                console.warn(`Could not fetch progress for user ${userId}`, err);
            }
            
            // Return student with default/empty progress if not found or error
            return {
                userId,
                fullName: userData.fullName,
                email: userData.email,
                currentLevel: 'Not Started',
                progressPercentage: 0,
                lessonsCompleted: 0,
                totalLessons: 0
            };
        });
        
        const studentsData = await Promise.all(progressPromises);
        return studentsData;
    } catch (error) {
        console.error('Error fetching all students progress:', error);
        throw error;
    }
}

/**
 * Get student details for teacher view
 * @param {string} userId - Student user ID
 * @returns {Promise<Object>} - Detailed student data
 */
export async function getStudentDetailsForTeacher(userId) {
    try {
        const [progress, analytics, testAttempts] = await Promise.all([
            getStudentProgress(userId),
            getStudentAnalytics(userId),
            getUserTestAttempts(userId, "Python")
        ]);

        return {
            progress,
            analytics,
            testAttempts
        };
    } catch (error) {
        console.error('Error fetching student details:', error);
        throw error;
    }
}
