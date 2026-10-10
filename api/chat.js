// api/chat.js - Orquestador del sistema multiagente de AIFlux
// Coordina: Router → Researcher → Responder

import { routerAgent } from './agents/router.js';
import { researcherAgent } from './agents/researcher.js';
import { responderAgent } from './agents/responder.js';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { messages } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ 
            text: "⚠️ Falta configurar la API Key en Vercel.",
            steps: []
        });
    }

    if (!messages || messages.length === 0) {
        return res.status(200).json({ 
            text: "No recibí ningún mensaje.",
            steps: []
        });
    }

    // Último mensaje del usuario
    const userMessage = messages[messages.length - 1].content;
    const steps = []; // Para mostrar el progreso al frontend

    try {
        // ========== PASO 1: ROUTER ==========
        steps.push({ agent: 'router', status: 'running', label: '🧠 Analizando tu pregunta...' });
        
        const routing = await routerAgent(userMessage, apiKey);
        
        steps.push({ 
            agent: 'router', 
            status: 'done', 
            label: '🧠 Pregunta analizada',
            result: routing
        });

        console.log('Router decidió:', routing);

        // ========== CASO: IMAGEN ==========
        if (routing.accion === 'imagen') {
            const prompt = routing.tema || userMessage;
            const imageUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=768&height=768&seed=${Date.now()}`;
            
            return res.status(200).json({
                text: `Aquí tienes tu imagen de **${prompt}** 🎨`,
                imageUrl: imageUrl,
                steps: steps,
                action: 'imagen'
            });
        }

        // ========== CASO: GRÁFICO ==========
        if (routing.accion === 'grafico') {
            // Devolvemos la petición para que el frontend procese el gráfico
            return res.status(200).json({
                text: "Aquí tienes tu gráfico:",
                action: 'grafico',
                steps: steps
            });
        }

        // ========== CASO: INVESTIGAR ==========
        let researchData = null;
        
        if (routing.accion === 'investigar') {
            steps.push({ 
                agent: 'researcher', 
                status: 'running', 
                label: `🔍 Investigando sobre "${routing.tema || 'el tema'}..."` 
            });
            
            researchData = await researcherAgent(userMessage, routing.tema, apiKey);
            
            steps.push({ 
                agent: 'researcher', 
                status: 'done', 
                label: '🔍 Investigación completada'
            });
        }

        // ========== PASO FINAL: RESPONDER ==========
        steps.push({ 
            agent: 'responder', 
            status: 'running', 
            label: '💬 Preparando la respuesta...' 
        });

        const finalAnswer = await responderAgent(userMessage, researchData, apiKey);
        
        steps.push({ 
            agent: 'responder', 
            status: 'done', 
            label: '💬 Respuesta lista'
        });

        // ========== RESPUESTA FINAL ==========
        return res.status(200).json({
            text: finalAnswer,
            steps: steps,
            action: routing.accion,
            meta: {
                agentsUsed: routing.accion === 'investigar' ? 3 : 2,
                topic: routing.tema
            }
        });

    } catch (error) {
        console.error('Orquestador error:', error);
        return res.status(200).json({
            text: `❌ Error en el sistema de agentes: ${error.message}`,
            steps: steps
        });
    }
}