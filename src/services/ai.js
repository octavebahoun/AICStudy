const API_KEY = import.meta.env.VITE_AI_API_KEY || ''
const API_URL = import.meta.env.VITE_AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = import.meta.env.VITE_AI_MODEL || 'llama-3.3-70b-versatile'

export async function callAI(prompt, lang = 'fr') {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json()
    return data.choices?.[0]?.message?.content || 'Réponse reçue.'
  } catch (err) {
    console.error('AI error:', err)
    return lang === 'fr'
      ? 'Erreur IA. Vérifiez votre clé API Groq dans le fichier .env'
      : 'AI error. Check your Groq API key in the .env file.'
  }
}

export const aiPrompts = {
  generateCoursePlan: (title, level, lang) =>
    `Génère un plan de cours structuré pour : "${title}" (niveau: ${level}). Propose 4-5 modules avec 3-4 leçons chacun. Format concis avec tirets. Réponds en ${lang === 'fr' ? 'français' : 'anglais'}.`,

  generateQuiz: (courseTitle, count, lang) =>
    `Génère ${count} questions de quiz QCM pour le cours "${courseTitle}". 
    Chaque question doit avoir exactement 4 options. 
    RETOURNE UNIQUEMENT UN TABLEAU JSON au format suivant, sans autre texte avant ou après :
    [
      {
        "text": "L'énoncé de la question",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correct_index": 0,
        "explanation": "Une explication pédagogique concise"
      }
    ]
    L'index correct (correct_index) doit être entre 0 et 3.
    Réponds en ${lang === 'fr' ? 'français' : 'anglais'}.`,

  generateCourseDescription: (title, level, lang) =>
    `Écris une description accrocheuse (3-4 phrases) pour un cours intitulé "${title}" de niveau ${level}. Réponds en ${lang === 'fr' ? 'français' : 'anglais'}.`,

  lessonSummary: (lessonTitle, courseTitle, lang) =>
    `Génère un résumé pédagogique de la leçon "${lessonTitle}" du cours "${courseTitle}" en 4-5 points clés. Réponds en ${lang === 'fr' ? 'français' : 'anglais'}.`,

  quizExplanation: (question, correctAnswer, userAnswer, explanation, lang) =>
    `Question : "${question}". Bonne réponse : "${correctAnswer}". Réponse de l'étudiant : "${userAnswer}". Explication : "${explanation}". Donne une explication pédagogique bienveillante en 2-3 phrases. Réponds en ${lang === 'fr' ? 'français' : 'anglais'}.`,

  courseAssistant: (question, courseTitle, lang) =>
    `Tu es un assistant pédagogique pour le cours "${courseTitle}". Réponds clairement et concisément à : "${question}". Réponds en ${lang === 'fr' ? 'français' : 'anglais'}.`,

  adminAnalysis: (query, stats, lang) =>
    `Tu es un analyste pédagogique. Données LMS : ${stats}. Réponds en ${lang === 'fr' ? 'français' : 'anglais'} à : "${query}"`,

  adminReport: (stats, lang) =>
    `En tant qu'analyste pédagogique, génère un rapport concis sur ces données LMS : ${stats}. Donne 3 insights actionnables en 5-6 phrases. Réponds en ${lang === 'fr' ? 'français' : 'anglais'}.`,
}