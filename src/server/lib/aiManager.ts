import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateAIResponse } from './openAiClient';

export interface AiConfig {
    provider: string;
    apiKey: string;
    prompt?: string;
    model?: string;
}

class AiManager {
    /**
     * Get a response from the AI provider
     */
    async getResponse(message: string, config: AiConfig): Promise<string | null> {
        try {
            if (config.provider === 'google' || config.provider === 'gemini') {
                return await this.getGeminiResponse(message, config);
            }
            if (config.provider === 'openai') {
                return await this.getOpenAiResponse(message, config);
            }
            return null;
        } catch (error) {
            console.error('AI Manager Error:', error);
            return null;
        }
    }

    /**
     * Handle Google Gemini completions
     */
    private async getGeminiResponse(message: string, config: AiConfig): Promise<string | null> {
        if (!config.apiKey) {
            console.error('[AiManager] Missing API Key');
            return null;
        }

        const genAI = new GoogleGenerativeAI(config.apiKey);
        const requestedModel = (config.model || "gemini-1.5-flash").trim();
        
        // List of models to try in order
        const modelsToTry = [
            requestedModel,
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-pro"
        ];

        // Remove duplicates and keep order
        const uniqueModels = [...new Set(modelsToTry)];

        for (const modelName of uniqueModels) {
            try {
                console.log(`[AiManager] Attempting completions with: ${modelName}`);
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    systemInstruction: config.prompt || "You are a helpful assistant."
                });

                const result = await model.generateContent(message);
                const response = await result.response;
                const text = response.text();
                
                if (text) {
                    console.log(`[AiManager] Successfully got response using: ${modelName}`);
                    return text;
                }
            } catch (err: any) {
                console.error(`[AiManager] Attempt failed for ${modelName}:`, err.message);
                // If it's not a 404 (resource not found), it might be a key or quota issue - stop early
                if (!err.message.includes('404') && !err.message.includes('not found')) {
                    throw err; 
                }
                // Otherwise, continue to next model in loop
            }
        }

        return null;
    }

    /**
     * Handle OpenAI completions
     */
    private async getOpenAiResponse(message: string, config: AiConfig): Promise<string | null> {
        if (!config.apiKey) {
            console.error('[AiManager] Missing OpenAI API Key');
            return null;
        }

        return await generateAIResponse({
            apiKey: config.apiKey,
            model: config.model || 'gpt-3.5-turbo',
            userMessage: message,
            systemPrompt: config.prompt || "You are a helpful assistant."
        });
    }
}

export default new AiManager();
