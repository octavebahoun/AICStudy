import { supabase } from './supabase'

//Users
export const getUsers = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
    if (error) throw error
    return data
}

export const updateUserStatus = async (id, status) => {
    const { data, error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', id)
    if (error) throw error
    return data
}

export const deleteUser = async (id) => {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
    if (error) throw error
}

//Cours
export const getCourses = async (filter = {}) => {
    let query = supabase.from('courses').select('*, teacher:users(full_name)')
    if (filter.status) query = query.eq('status', filter.status)
    if (filter.level) query = query.eq('level', filter.level)

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) {
        console.error("Supabase error in getCourses:", error)
        throw error
    }
    return (data || []).map(c => ({
        ...c,
        teacherName: c.teacher?.full_name || 'Enseignant Aic'
    }))
}

export const updateCourseStatus = async (id, status) => {
    const { data, error } = await supabase
        .from('courses')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
    if (error) throw error
    return data
}

export const deleteCourse = async (id) => {
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) throw error
}

export const createCourse = async (courseData) => {
    const { data, error } = await supabase
        .from('courses')
        .insert({
            ...courseData,
            status: 'pending', // Les cours doivent etre validé par l'admin
            created_at: new Date().toISOString()
        })
        .select()
        .single()
    if (error) throw error
    return data
}

export const updateCourse = async (id, courseData) => {
    const { data, error } = await supabase
        .from('courses')
        .update({
            ...courseData,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data
}

//cours et chapitre
export const getStudentEnrollments = async (studentId) => {
    const { data, error } = await supabase
        .from('enrollments')
        .select('*, course:courses(*)')
        .eq('student_id', studentId)
    if (error) throw error
    return data
}

// Pour la compatibilité
export const getStudentCourses = getStudentEnrollments

export const getCourseDetails = async (courseId) => {
    const { data, error } = await supabase
        .from('courses')
        .select('*, modules(*, lessons(*)), quizzes(*)')
        .eq('id', courseId)
        .single()
    if (error) throw error
    return data
}

export const enrollInCourse = async (userId, courseId) => {
    const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', userId)
        .eq('course_id', courseId)
        .single()

    if (existing) return existing

    const { data, error } = await supabase
        .from('enrollments')
        .insert({ student_id: userId, course_id: courseId, progress: 0, status: 'active' })
        .select()
        .single()

    if (error) throw error
    return data
}

export const updateLessonProgress = async (userId, lessonId, completed = true) => {
    const { data, error } = await supabase
        .from('lesson_progress')
        .upsert({
            student_id: userId,
            lesson_id: lessonId,
            completed,
            completed_at: completed ? new Date().toISOString() : null
        }, { onConflict: 'student_id,lesson_id' })
        .select()
        .single()

    if (error) throw error

    try {
        const { data: lessonData } = await supabase
            .from('lessons')
            .select('module:modules(course_id)')
            .eq('id', lessonId)
            .single()

        const courseId = lessonData?.module?.course_id
        if (courseId) {

            const { data: courseData } = await supabase
                .from('courses')
                .select('modules(lessons(id))')
                .eq('id', courseId)
                .single()

            const allLessons = (courseData?.modules || []).flatMap(m => m.lessons || [])
            const totalCount = allLessons.length

            if (totalCount > 0) {

                const lessonIds = allLessons.map(l => l.id)
                const { data: progressData } = await supabase
                    .from('lesson_progress')
                    .select('lesson_id')
                    .eq('student_id', userId)
                    .in('lesson_id', lessonIds)
                    .eq('completed', true)

                const completedCount = (progressData || []).length
                const newProgress = Math.round((completedCount / totalCount) * 100)


                await supabase
                    .from('enrollments')
                    .update({ progress: newProgress })
                    .eq('student_id', userId)
                    .eq('course_id', courseId)
            }
        }
    } catch (err) {
        console.error("Error updating global progress:", err)
    }

    return data
}

//Forum
export const getForumPosts = async (courseId = null) => {
    let query = supabase.from('forum_posts').select('*, author:users(full_name, avatar_url)')
    if (courseId) query = query.eq('course_id', courseId)

    const { data, error } = await query.order('pinned', { ascending: false }).order('created_at', { ascending: false })
    if (error) throw error
    return data
}

//Statistique
export const getAdminStats = async () => {
    const [usersCount, coursesCount, activeCoursesCount] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ])

    return {
        totalStudents: usersCount.count || 0,
        totalCourses: coursesCount.count || 0,
        activeCourses: activeCoursesCount.count || 0,
        completionRate: 0,
    }
}

//Quiz
export const getQuizDetails = async (courseId) => {
    const { data: quiz, error: qErr } = await supabase
        .from('quizzes')
        .select('*, questions(*)')
        .eq('course_id', courseId)
        .single()

    if (qErr) throw qErr

    return {
        ...quiz,
        questions: (quiz.questions || []).sort((a, b) => a.order - b.order)
    }
}

//Les formateurs
export const getTeacherDashboardData = async (teacherId) => {
    const { data: courses, error: cErr } = await supabase
        .from('courses')
        .select('*, teacher:users(full_name)')
        .eq('teacher_id', teacherId)

    if (cErr) throw cErr

    const { data: posts, error: pErr } = await supabase
        .from('forum_posts')
        .select('*, author:users(full_name)')
        .order('created_at', { ascending: false })
        .limit(5)

    if (pErr) throw pErr

    return {
        courses: (courses || []).map(c => ({
            ...c,
            teacherName: c.teacher?.full_name || 'Moi'
        })),
        recentPosts: posts || []
    }
}
