// api/chat.js - Backend de AIFlux con debug
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { messages } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ 
            text: "DEBUG: No hay API Key configurada en Vercel" 
        });
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://aiflux-rho.vercel.app',
                'X-Title': 'AIFlux'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.2-3b-instruct:free',
                messages: messages,
                max_tokens: 500
            })
        });

        const data = await response.json();
        
        // Si OpenRouter devuelve error, mostrarlo
        if (data.error) {
            return res.status(200).json({ 
                text: `DEBUG OpenRouter: ${JSON.stringify(data.error)}` 
            });
        }
        
        const aiText = data.choices?.[0]?.message?.content || "Sin respuesta de la IA.";
        res.status(200).json({ text: aiText });
        
    } catch (error) {
        res.status(200).json({ 
            text: `DEBUG Catch: ${error.message}` 
        });
    }
}
