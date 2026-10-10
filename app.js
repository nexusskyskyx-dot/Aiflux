// Esta URL la obtendrás cuando despliegues tu backend en Vercel.
// Por ahora, pon un placeholder o usa localhost si pruebas con vercel dev.
const BACKEND_URL = "https://aiflux-rho.vercel.app/api/chat"; 

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
let conversationHistory = []; // Memoria de la conversación

function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    
    addMessage(text, 'user');
    userInput.value = '';
    sendBtn.disabled = true;

    // 1. Añadir al historial local (OpenRouter es stateless, necesita contexto)
    conversationHistory.push({ role: "user", content: text });

    try {
        // 2. Llamar al BACKEND SEGURO (Vercel)
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationHistory })
        });
        
        const data = await response.json();
        const aiResponse = data.text || "Sin respuesta.";
        
        addMessage(aiResponse, 'ai');
        conversationHistory.push({ role: "assistant", content: aiResponse });

        // 3. Lógica simple para detectar si quiere una imagen
        const lowerText = text.toLowerCase();
        if (lowerText.includes('imagen') || lowerText.includes('dibuja') || lowerText.includes('foto')) {
            // Extraer el prompt simple (ejemplo básico)
            const prompt = text.replace(/imagen|dibuja|foto/gi, '').trim() || "arte abstracto";
            const imageUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=512&height=512&seed=${Date.now()}`;
            
            const imgDiv = document.createElement('div');
            imgDiv.classList.add('message', 'ai');
            imgDiv.innerHTML = `<img src="${imageUrl}" alt="${prompt}">`;
            chatBox.appendChild(imgDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

    } catch (error) {
        addMessage("Error de conexión.", 'ai');
        console.error(error);
    } finally {
        sendBtn.disabled = false;
    }
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
