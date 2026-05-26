import fetch from 'node-fetch'; // Fallback for older node, but Node 22 has it global. 
// However, since some environments might need it specifically or for types, 
// I'll check if node-fetch is available. Actually, I'll just use the global fetch.

interface OpenAIParams {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  systemPrompt?: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateAIResponse(params: OpenAIParams): Promise<string | null> {
  const { 
    apiKey, 
    model = 'gpt-4o-mini', 
    baseUrl = 'https://api.openai.com/v1', 
    systemPrompt, 
    userMessage, 
    temperature = 0.7, 
    maxTokens 
  } = params;

  // Ensure baseUrl doesn't end with slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const url = `${cleanBaseUrl}/chat/completions`;

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens ? parseInt(maxTokens.toString()) : undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    console.error('[OpenAI] Response generation failed:', err.message);
    return null;
  }
}
