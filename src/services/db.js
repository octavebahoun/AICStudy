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

// Calcule enrolled_count/completion_rate à partir des enrollments (ces colonnes n'existent pas sur courses)
const attachCourseStats = async (courses) => {
    const ids = courses.map(c => c.id)
    if (ids.length === 0) return courses

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, progress')
        .in('course_id', ids)

    const statsByCourse = {}
    for (const e of (enrollments || [])) {
        const stats = statsByCourse[e.course_id] || { total: 0, completed: 0 }
        stats.total++
        if ((e.progress || 0) >= 100) stats.completed++
        statsByCourse[e.course_id] = stats
    }

    return courses.map(c => {
        const s = statsByCourse[c.id]
        return {
            ...c,
            enrolled_count: s?.total || 0,
            completion_rate: s ? Math.round((s.completed / s.total) * 100) : 0
        }
    })
}

//Cours
export const getCourses = async (filter = {}) => {
    let query = supabase.from('courses').select('*, teacher:users(full_name)')
    if (filter.status) query = query.eq('status', filter.status)
    if (filter.level) query = query.eq('level', filter.level)
    if (filter.teacherId) query = query.eq('teacher_id', filter.teacherId)

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) {
        console.error("Supabase error in getCourses:", error)
        throw error
    }
    const withStats = await attachCourseStats(data || [])
    return withStats.map(c => ({
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

    if (status === 'active' || status === 'draft') {
        try {
            const { data: course } = await supabase.from('courses').select('teacher_id, title').eq('id', id).single()
            if (course?.teacher_id) {
                await createNotification({
                    userId: course.teacher_id,
                    type: 'course_status',
                    message: status === 'active'
                        ? `Votre cours "${course.title}" a été approuvé`
                        : `Votre cours "${course.title}" a été rejeté`,
                    link: '/teacher/courses',
                })
            }
        } catch (err) {
            console.error('Error creating course status notification:', err)
        }
    }

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

    try {
        const [{ data: course }, { data: student }] = await Promise.all([
            supabase.from('courses').select('teacher_id, title').eq('id', courseId).single(),
            supabase.from('users').select('full_name').eq('id', userId).single(),
        ])
        if (course?.teacher_id) {
            await createNotification({
                userId: course.teacher_id,
                type: 'enrollment',
                message: `${student?.full_name || 'Un étudiant'} s'est inscrit à "${course.title}"`,
                link: '/teacher/students',
            })
        }
    } catch (err) {
        console.error('Error creating enrollment notification:', err)
    }

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

                if (newProgress === 100) {
                    await completeCourseIfEligible(userId, courseId)
                }
            }
        }
    } catch (err) {
        console.error("Error updating global progress:", err)
    }

    return data
}

// Marque un cours comme terminé (toutes les leçons + quiz réussi si le cours en a un) et délivre le certificat
export const completeCourseIfEligible = async (studentId, courseId) => {
    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('progress')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .maybeSingle()

    if (!enrollment || (enrollment.progress || 0) < 100) return

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id')
        .eq('course_id', courseId)
        .maybeSingle()

    let score = null
    if (quiz) {
        const { data: passedAttempt } = await supabase
            .from('quiz_attempts')
            .select('score')
            .eq('student_id', studentId)
            .eq('quiz_id', quiz.id)
            .eq('passed', true)
            .order('score', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (!passedAttempt) return
        score = passedAttempt.score
    }

    const { data: existingCert } = await supabase
        .from('certificates')
        .select('id')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .maybeSingle()

    if (!existingCert) {
        await supabase
            .from('certificates')
            .insert({ student_id: studentId, course_id: courseId, score })

        try {
            const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single()
            await createNotification({
                userId: studentId,
                type: 'certificate',
                message: `Félicitations, vous avez obtenu votre certificat pour "${course?.title || 'ce cours'}" !`,
                link: '/student/badges',
            })
        } catch (err) {
            console.error('Error creating certificate notification:', err)
        }
    }
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
    const [usersCount, coursesCount, activeCoursesCount, quizAttempts] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('quiz_attempts').select('score'),
    ])

    const scores = quizAttempts.data || []
    const completionRate = scores.length
        ? Math.round(scores.reduce((acc, curr) => acc + curr.score, 0) / scores.length)
        : 0

    return {
        totalStudents: usersCount.count || 0,
        totalCourses: coursesCount.count || 0,
        activeCourses: activeCoursesCount.count || 0,
        completionRate,
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

// Étudiants inscrits aux cours d'un formateur (pas tous les étudiants de la plateforme)
export const getTeacherStudents = async (teacherId) => {
    const { data, error } = await supabase
        .from('enrollments')
        .select('progress, enrolled_at, student:users(id, full_name, email, avatar_url, status), course:courses!inner(id, title, teacher_id)')
        .eq('course.teacher_id', teacherId)
    if (error) throw error

    const byStudent = new Map()
    for (const e of (data || [])) {
        if (!e.student) continue
        const id = e.student.id
        if (!byStudent.has(id)) {
            byStudent.set(id, { ...e.student, courses: [] })
        }
        byStudent.get(id).courses.push({
            id: e.course.id,
            title: e.course.title,
            progress: e.progress || 0
        })
    }
    return Array.from(byStudent.values())
}

// Badges & certificats d'un étudiant
export const getStudentBadgeStats = async (studentId) => {
    const [certs, badges] = await Promise.all([
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('student_id', studentId),
        supabase.from('user_badges').select('*', { count: 'exact', head: true }).eq('user_id', studentId),
    ])
    return {
        certificates: certs.count || 0,
        badges: badges.count || 0,
    }
}

export const getStudentCertificates = async (studentId) => {
    const { data, error } = await supabase
        .from('certificates')
        .select('*, course:courses(title, thumbnail, color)')
        .eq('student_id', studentId)
        .order('issued_at', { ascending: false })
    if (error) throw error
    return data
}

//Les formateurs
export const getTeacherDashboardData = async (teacherId) => {
    const { data: courses, error: cErr } = await supabase
        .from('courses')
        .select('*, teacher:users(full_name)')
        .eq('teacher_id', teacherId)

    if (cErr) throw cErr

    const withStats = await attachCourseStats(courses || [])

    const { data: posts, error: pErr } = await supabase
        .from('forum_posts')
        .select('*, author:users(full_name)')
        .order('created_at', { ascending: false })
        .limit(5)

    if (pErr) throw pErr

    return {
        courses: withStats.map(c => ({
            ...c,
            teacherName: c.teacher?.full_name || 'Moi'
        })),
        recentPosts: posts || []
    }
}

//Notifications
const createNotification = async ({ userId, type, message, link = null }) => {
    await supabase.from('notifications').insert({ user_id: userId, type, message, link })
}

export const getNotifications = async (userId) => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
    if (error) throw error
    return data
}

export const markNotificationsRead = async (userId) => {
    await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
}
