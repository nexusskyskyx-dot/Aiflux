// api/agents/responder.js - Agente que genera la respuesta final al usuario
// Modelo: google/gemma-4-31b-it:free (excelente para lenguaje natural)

const RESPONDER_MODEL = 'dots-studio/dots-3-note-preview:free';

export async function responderAgent(userMessage, researchData, apiKey) {
    const systemPrompt = `Eres AIFlux, un asistente de IA amigable, claro y útil. Tu tarea es dar la respuesta FINAL al usuario.

REGLAS:
- Responde SIEMPRE en español, de forma natural y conversacional.
- Si recibes "info investigada" de otro agente, ÚSALA como base para tu respuesta. NO la copies literal: reescríbela con tus palabras y hazla más amigable.
- Sé conciso pero completo. Ni muy corto ni muy largo.
- Usa formato markdown ligero: **negritas**, viñetas (-), saltos de línea.
- Puedes usar emojis con moderación si encajan con el tono.
- Si la info investigada tiene errores o no es clara, corrígela o complétala con tu conocimiento.
- Si NO hay info investigada (era conversación casual), responde directamente sin inventar que investigaste.
- Tono: cercano, inteligente, útil. Como un amigo que sabe mucho.

FORMATO:
- Si es respuesta simple: 1-3 párrafos.
- Si es respuesta informativa: usa secciones o viñetas.`;

    let userPrompt;
    
    if (researchData) {
        userPrompt = `MENSAJE ORIGINAL DEL USUARIO: "${userMessage}"

INFORMACIÓN INVESTIGADA POR OTRO AGENTE:
---
${researchData}
---

Genera la respuesta FINAL para el usuario basándote en esta información. Reescríbela de forma amigable y concisa. NO copies literal, sintetiza.`;
    } else {
        userPrompt = `MENSAJE DEL USUARIO: "${userMessage}"

Responde de forma natural y amigable. Es una conversación casual, así que sé breve y cercano.`;
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://aiflux-rho.vercel.app',
                'X-Title': 'AIFlux Responder'
            },
            body: JSON.stringify({
                model: RESPONDER_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 800,
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('Responder error:', data.error);
            return researchData || "Lo siento, tuve un problema al generar la respuesta.";
        }

        const content = data.choices?.[0]?.message?.content || '';
        return content.trim() || researchData || "No pude generar una respuesta.";

    } catch (error) {
        console.error('Responder exception:', error);
        return researchData || "Error de conexión. Intenta de nuevo.";
    }
}