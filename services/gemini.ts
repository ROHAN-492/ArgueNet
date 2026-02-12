
import { GoogleGenAI, Type } from "@google/genai";
import { Message, DebateTrack } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const debateAI = {
  scoreMessage: async (topic: string, message: string): Promise<number> => {
    // Quick tactical scoring for each message
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Evaluate the following debate message on the topic: "${topic}".
      Message: "${message}"
      
      Score the message from 1 to 10 based on persuasiveness, evidence, and logical consistency. 
      Return only the number as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER }
          },
          required: ["score"]
        }
      }
    });
    const result = JSON.parse(response.text || '{"score": 0}');
    return Math.min(10, Math.max(0, result.score));
  },

  judgeDebate: async (topic: string, transcript: Message[]) => {
    const formattedTranscript = transcript.map(m => `${m.senderName}: ${m.text}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert debate judge. Evaluate the following debate on the topic: "${topic}".
      
      Transcript:
      ${formattedTranscript}
      
      Instructions:
      1. Analyze the logic, evidence, and rhetorical skills of both parties.
      2. Provide a constructive summary.
      3. Declare a winner or a draw.
      4. Provide a rating change recommendation (e.g., +15, -10).
      
      Return as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            winnerName: { type: Type.STRING },
            scoreAnalysis: { type: Type.STRING },
            ratingChange: { type: Type.NUMBER }
          },
          required: ["summary", "winnerName", "scoreAnalysis", "ratingChange"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  },

  getAIResponse: async (topic: string, track: DebateTrack, transcript: Message[]) => {
    const formattedTranscript = transcript.map(m => `${m.senderName}: ${m.text}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an elite debater in a competitive online environment. The current track is ${track}.
      Topic: "${topic}"
      Current transcript:
      ${formattedTranscript}
      
      Provide your next rebuttal or opening statement. Keep it persuasive, concise, and professional. Max 150 words.`,
    });

    return response.text || '';
  }
};
