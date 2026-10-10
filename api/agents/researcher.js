// api/agents/researcher.js - Agente investigador
// Modelo: google/gemma-4-31b-it:free (buen razonamiento y contexto)

const RESEARCHER_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

export async function researcherAgent(userMessage, tema, apiKey) {
    const systemPrompt = `Eres un investigador experto. Tu tarea es recopilar información precisa, completa y bien estructurada sobre el tema solicitado.

REGLAS:
- Investiga a fondo el tema usando tu conocimiento.
- Estructura la información en secciones claras.
- Incluye datos concretos: fechas, nombres, cifras, hechos verificables.
- Si hay controversia o múltiples perspectivas, menciónalas.
- Sé objetivo y evita opiniones personales.
- NO inventes datos. Si no estás seguro de algo, indícalo.
- Responde en español.
- Longitud ideal: 200-400 palabras.
- Usa viñetas o secciones para organizar.

FORMATO SUGERIDO:
## Contexto general
[breve introducción]

## Puntos clave
- [punto 1]
- [punto 2]
- [punto 3]

## Datos relevantes
[cifras, fechas, hechos]

## Conclusión
[síntesis breve]`;

    const userPrompt = `Tema a investigar: ${tema || userMessage}

Mensaje original del usuario: "${userMessage}"

Investiga exhaustivamente sobre esto y devuelve tu reporte estructurado.`;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://aiflux-rho.vercel.app',
                'X-Title': 'AIFlux Researcher'
            },
            body: JSON.stringify({
                model: RESEARCHER_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 1000,
                temperature: 0.5
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('Researcher error:', data.error);
            return `No pude investigar "${tema}". Intenta reformular la pregunta.`;
        }

        const content = data.choices?.[0]?.message?.content || '';
        return content.trim() || `No encontré información sobre "${tema}".`;

    } catch (error) {
        console.error('Researcher exception:', error);
        return `Error al investigar. Intenta de nuevo.`;
    }
}