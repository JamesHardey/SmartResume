import OpenAI from "openai";
import { Question, ParsedResume } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

interface RankResumeOptions {
  resumeText: string;
  jobRole: string;
  keySkills: string[];
  description?: string;
  responsibilities?: string;
  requirements?: string;
  location?: string;
}

interface GenerateExamOptions {
  jobRole: string;
  numQuestions: number;
  includeMultipleChoice: boolean;
  includeOpenEnded: boolean;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  keySkills?: string[];
}

const parseKeySkills = (keySkills: any): string[] => {
  if (!keySkills) return [];
  if (Array.isArray(keySkills)) return keySkills;
  if (typeof keySkills === 'string') {
    try {
      return JSON.parse(keySkills);
    } catch (e) {
      return keySkills.split(',').map(skill => skill.trim());
    }
  }
  return [];
};

// Resume ranking using GPT-4o
export async function rankResume({ 
  resumeText, 
  jobRole, 
  keySkills,
  description = "",
  responsibilities = "",
  requirements = "",
  location = ""
}: RankResumeOptions): Promise<{
  score: number;
  reasons: string;
  parsedData: ParsedResume;
}> {
  try {
    const parsedKeySkills = parseKeySkills(keySkills);
    const keySkillsText = parsedKeySkills.length > 0 ? `Key Skills: ${parsedKeySkills.join(', ')}` : '';

    // Create detailed prompt with all available job information
    let jobDetailsPrompt = `Job Title: ${jobRole}\n`;
    if (description) jobDetailsPrompt += `Description: ${description}\n`;
    if (responsibilities) jobDetailsPrompt += `Responsibilities: ${responsibilities}\n`;
    if (requirements) jobDetailsPrompt += `Requirements: ${requirements}\n`;
    if (location) jobDetailsPrompt += `Location: ${location}\n`;
    jobDetailsPrompt += keySkillsText;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert AI recruitment assistant specializing in detailed resume analysis. Your task is to:

1. Thoroughly parse the resume to extract candidate information:
   - Full name (first and last name)
   - Email address
   - Phone number (if available, in consistent format)
   - Detailed work experience (as array of positions with company names and timeframes)
   - Complete education history (as array with degrees, institutions and timeframes)
   - Comprehensive skills list (technical and soft skills)
   - Current location (if available)

2. Analyze how well the candidate matches the job requirements:
   - Score the resume from 0-100 based on relevant experience, education, and skills match
   - Higher scores (80+) should only be given to candidates with excellent matches to key requirements
   - Mid-range scores (50-79) for candidates with most but not all required qualifications
   - Lower scores (<50) for candidates missing significant required qualifications

3. Provide 3-5 specific reasons for your score, including:
   - Matching skills and qualifications (be specific about which ones)
   - Missing skills or requirements (be specific about which ones)
   - Years of relevant experience
   - Education alignment with the role
   - Location match or mismatch if specified

Format your response as a JSON object with these keys:
- score: number from 0-100
- reasons: array of 3-5 specific reasons for the score
- name: candidate's full name
- email: candidate's email
- phone: candidate's phone (or null if not found)
- experience: array of work experiences
- education: array of education history
- skills: array of all skills found in resume
- location: candidate's location (or null if not found)`
        },
        {
          role: "user",
          content: `Job Details:\n${jobDetailsPrompt}\n\nResume to evaluate:\n${resumeText}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Process and validate the result
    const validatedScore = typeof result.score === 'number' ? 
      Math.min(100, Math.max(0, Math.round(result.score))) : 0;
    
    const validatedReasons = Array.isArray(result.reasons) ? 
      result.reasons : 
      [result.reasons || "No specific feedback provided"];
    
    // Process and validate parsed data
    const validatedParsedData = {
      name: result.name || "Unknown",
      email: result.email || "unknown@example.com",
      phone: result.phone || null,
      experience: Array.isArray(result.experience) ? result.experience : [],
      education: Array.isArray(result.education) ? result.education : [],
      skills: Array.isArray(result.skills) ? result.skills : [],
      location: result.location || null
    };
    
    return {
      score: validatedScore,
      reasons: validatedReasons,
      parsedData: validatedParsedData
    };
  } catch (error) {
    console.error("Error ranking resume:", error);
    throw new Error("Failed to analyze resume");
  }
}

// Generate exam questions for a job role
export async function generateExamQuestions({
  jobRole,
  numQuestions,
  includeMultipleChoice = true,
  includeOpenEnded = true,
  description = "",
  responsibilities = "",
  requirements = "",
  keySkills = []
}: GenerateExamOptions): Promise<Question[]> {
  try {
    const mcqCount = includeMultipleChoice ? Math.ceil(numQuestions * 0.7) : 0;
    const openEndedCount = includeOpenEnded ? numQuestions - mcqCount : numQuestions;
    
    // Create detailed prompt with all available job information
    let jobDetailsPrompt = `Job Title: ${jobRole}\n`;
    if (description) jobDetailsPrompt += `Description: ${description}\n`;
    if (responsibilities) jobDetailsPrompt += `Responsibilities: ${responsibilities}\n`;
    if (requirements) jobDetailsPrompt += `Requirements: ${requirements}\n`;
    if (keySkills && keySkills.length > 0) jobDetailsPrompt += `Key Skills: ${keySkills.join(", ")}\n`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert exam creator for technical assessments.
          Create a challenging but fair exam for the position described below. 
          The questions should specifically test for the responsibilities, requirements and skills mentioned in the job details.
          
          Generate ${mcqCount} multiple-choice questions (with 4 options each and mark the correct answer) 
          and ${openEndedCount} open-ended questions.
          
          For multiple-choice questions, include:
          - 'id': a unique identifier string for the question
          - 'text': the question text
          - 'type': 'multiple_choice'
          - 'options': [array of 4 options]
          - 'correctAnswer': index of correct option (0-3)
          
          For open-ended questions, include:
          - 'id': a unique identifier string for the question
          - 'text': the question text
          - 'type': 'open_ended'
          
          Format the response as a JSON object with a 'questions' array containing all question objects.`
        },
        {
          role: "user",
          content: `Job Details:\n${jobDetailsPrompt}\n\nPlease generate ${numQuestions} questions for this assessment.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.questions || [];
  } catch (error) {
    console.error("Error generating exam questions:", error);
    throw new Error("Failed to generate exam questions");
  }
}

// Grade an open-ended question answer
export async function gradeOpenEndedAnswer({
  question,
  answer,
  jobRole
}: {
  question: string;
  answer: string;
  jobRole: string;
}): Promise<{ score: number; feedback: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at grading technical assessments for ${jobRole} positions.
          Evaluate the following answer to the question. Score from 0-100 and provide brief feedback.
          Return as JSON with 'score' and 'feedback' fields.`
        },
        {
          role: "user",
          content: `Question: ${question}\n\nAnswer: ${answer}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      score: result.score || 0,
      feedback: result.feedback || "No feedback provided"
    };
  } catch (error) {
    console.error("Error grading answer:", error);
    throw new Error("Failed to grade answer");
  }
}
