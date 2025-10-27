"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use pro model primarily, flash as fallback
const modelPro = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
const modelFlash = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- Helper: Retry logic for temporary Gemini overloads ---
async function generateWithRetry(model, prompt, retries = 3, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (error) {
      // Retry if Gemini is overloaded (503)
      if (error.message.includes("503") && i < retries - 1) {
        console.warn(`⚠️ Gemini overloaded, retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw error;
      }
    }
  }
}

// --- Main AI Function ---
export const generateAIInsights = async (industry) => {
  const prompt = `
    Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
    {
      "salaryRanges": [
        { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
      ],
      "growthRate": number,
      "demandLevel": "High" | "Medium" | "Low",
      "topSkills": ["skill1", "skill2"],
      "marketOutlook": "Positive" | "Neutral" | "Negative",
      "keyTrends": ["trend1", "trend2"],
      "recommendedSkills": ["skill1", "skill2"]
    }

    IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
    Include at least 5 common roles for salary ranges.
    Growth rate should be a percentage.
    Include at least 5 skills and trends.
  `;

  let result;

  try {
    // Try pro model first
    result = await generateWithRetry(modelPro, prompt);
  } catch (error) {
    console.warn(
      "⚠️ Gemini-Pro failed, switching to Flash model:",
      error.message
    );
    // Try flash model as backup
    result = await generateWithRetry(modelFlash, prompt);
  }

  const response = result.response;
  const text = response.text();

  // Clean the response
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

  try {
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("❌ Failed to parse Gemini JSON:", cleanedText);
    throw new Error("Invalid JSON format from Gemini API");
  }
};

// --- Function to Get or Update Insights ---
export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });

  if (!user) throw new Error("User not found");

  const now = new Date();

  // 1️⃣ Generate new insights if none exist
  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);
    const nextUpdate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

    const industryInsight = await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        lastUpdated: now,
        nextUpdate,
      },
    });

    return industryInsight;
  }

  // 2️⃣ If a week has passed since the last update → regenerate
  const shouldUpdate =
    !user.industryInsight.nextUpdate ||
    new Date(user.industryInsight.nextUpdate) <= now;

  if (shouldUpdate) {
    const insights = await generateAIInsights(user.industry);
    const nextUpdate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const updatedInsight = await db.industryInsight.update({
      where: { id: user.industryInsight.id },
      data: {
        ...insights,
        lastUpdated: now,
        nextUpdate,
      },
    });

    return updatedInsight;
  }

  // 3️⃣ Otherwise, return existing data
  return user.industryInsight;
}
