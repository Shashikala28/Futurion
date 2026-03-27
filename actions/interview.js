//

"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    You are an expert technical interviewer.
    Generate 10 unique and varied technical interview questions for a ${
      user.industry
    } professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.
    
    Requirements:
        - Each question should be multiple choice with 4 options.
        - No question should repeat or be reworded versions of others.
        - Vary the difficulty: include beginner, intermediate, and advanced levels.
        - Cover different subtopics from the ${user.industry} domain.
        - Each question must test a different concept.
        - Randomize the structure and wording of questions.
    
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;

  try {
    const result = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const message = result.choices[0]?.message?.content || "";
    const cleanedText = message.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);

    // Fallback: Provide mock quiz when API quota is exceeded
    if (error.status === 429) {
      console.warn("⚠️ Gemini API quota exceeded. Using fallback quiz.");
      return [
        {
          question:
            "What is a key skill in the " +
            (user.industry || "technology") +
            " industry?",
          options: [
            "Communication",
            "Problem Solving",
            "Leadership",
            "Adaptability",
          ],
          correctAnswer: "Problem Solving",
          explanation:
            "Problem-solving is fundamental to succeeding in most modern industries.",
        },
        {
          question: "How would you approach learning a new technology?",
          options: [
            "Jump in immediately",
            "Read documentation first",
            "Ask colleagues",
            "All of the above",
          ],
          correctAnswer: "All of the above",
          explanation:
            "A combination of hands-on learning, documentation, and seeking help is the most effective approach.",
        },
        {
          question: "What makes a successful professional?",
          options: [
            "Technical skills only",
            "Soft skills only",
            "Balance of both",
            "Experience alone",
          ],
          correctAnswer: "Balance of both",
          explanation:
            "Success requires both technical expertise and interpersonal skills.",
        },
        {
          question: "How do you handle failure?",
          options: [
            "Avoid it at all costs",
            "Learn from it",
            "Blame others",
            "Give up",
          ],
          correctAnswer: "Learn from it",
          explanation:
            "Treating failures as learning opportunities leads to growth and improvement.",
        },
        {
          question: "What is continuous improvement?",
          options: [
            "Working harder",
            "Regular learning and adaptation",
            "Never being satisfied",
            "Changing jobs frequently",
          ],
          correctAnswer: "Regular learning and adaptation",
          explanation:
            "Continuous improvement means consistently upgrading skills and staying current with industry trends.",
        },
      ];
    }

    throw new Error("Failed to generate quiz questions");
  }
}

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const tipResult = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: improvementPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 512,
      });
      improvementTip = tipResult.choices[0]?.message?.content || "";
      console.log(improvementTip);
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Continue without improvement tip if generation fails
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
