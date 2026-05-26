import fetch from 'node-fetch';

interface GeminiParams {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Helper to generate responses using Google Gemini API
 */
export async function generateGeminiResponse(params: GeminiParams): Promise<string | null> {
  const { 
    apiKey, 
    model = 'gemini-2.5-flash-lite', 
    systemPrompt, 
    userMessage, 
    temperature = 0.7,
    maxTokens
  } = params;

  // Gemini uses different URL structure: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [];
  
  // Gemini 1.5+ supports system instructions in a separate field, 
  // but for simplicity and compatibility, we'll prepend it to the user message 
  // if the specific model version doesn't handle separate system_instruction via REST easily.
  // However, the standard REST way is:
  
  const body: any = {
    contents: [
      {
        parts: [{ text: userMessage }]
      }
    ],
    generationConfig: {
      temperature: temperature,
      maxOutputTokens: maxTokens ? parseInt(maxTokens.toString()) : undefined,
    }
  };

  if (systemPrompt) {
    body.system_instruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data: any = await response.json();
    
    // Path to text: data.candidates[0].content.parts[0].text
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (err: any) {
    console.error('[Gemini] Response generation failed:', err.message);
    return null;
  }
}
