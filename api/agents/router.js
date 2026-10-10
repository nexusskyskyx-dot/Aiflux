// api/agents/router.js - Agente que clasifica la pregunta del usuario
// Modelo: nvidia/nemotron-3.5-lightning:free (rápido y eficiente)

const ROUTER_MODEL = 'nvidia/nemotron-3.5-lightning:free';

export async function routerAgent(userMessage, apiKey) {
    const systemPrompt = `Eres un clasificador experto. Analiza el mensaje del usuario y decide qué necesita.

Responde SIEMPRE en JSON válido, sin texto adicional, con esta estructura exacta:
{
  "accion": "investigar" | "conversar" | "grafico" | "imagen",
  "tema": "el tema principal o null",
  "razon": "breve explicación de tu decisión"
}

Reglas:
- "investigar": el usuario pide información factual, datos, definiciones, comparaciones, historia, explicaciones profundas, "busca sobre X", "qué es X", "cuéntame sobre X", "explícame X".
- "conversar": saludos, chistes, opiniones casuales, agradecimientos, charla informal.
- "grafico": el usuario pide explícitamente un gráfico, chart, diagrama de datos.
- "imagen": el usuario pide dibujar, generar imagen, foto, ilustración.

Ejemplos:
- "Busca sobre Call of Duty" → {"accion":"investigar","tema":"Call of Duty","razon":"Pide información sobre un tema"}
- "Hola" → {"accion":"conversar","tema":null,"razon":"Es un saludo"}
- "Hazme un gráfico de ventas: enero 100, febrero 200" → {"accion":"grafico","tema":"ventas","razon":"Pide un gráfico"}
- "Dibuja un gato" → {"accion":"imagen","tema":"gato","razon":"Pide una imagen"}`;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://aiflux-rho.vercel.app',
                'X-Title': 'AIFlux Router'
            },
            body: JSON.stringify({
                model: ROUTER_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 200,
                temperature: 0.1
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error('Router error:', data.error);
            // Fallback: asumir conversación simple
            return { accion: 'conversar', tema: null, razon: 'fallback por error' };
        }

        const content = data.choices?.[0]?.message?.content || '';
        
        // Limpiar y parsear JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { accion: 'conversar', tema: null, razon: 'no json' };
        }
        
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            accion: parsed.accion || 'conversar',
            tema: parsed.tema || null,
            razon: parsed.razon || ''
        };
        
    } catch (error) {
        console.error('Router exception:', error);
        return { accion: 'conversar', tema: null, razon: 'error catch' };
    }
}