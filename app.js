// ===== AIFlux - App Principal =====

const BACKEND_URL = "https://aiflux-rho.vercel.app/api/chat";

// ===== ESTADO =====
let chats = JSON.parse(localStorage.getItem('aiflux_chats') || '[]');
let currentChatId = null;

// ===== ELEMENTOS =====
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatList = document.getElementById('chat-list');
const newChatBtn = document.getElementById('new-chat-btn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const openSidebarBtn = document.getElementById('open-sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const clearBtn = document.getElementById('clear-btn');
const currentChatTitle = document.getElementById('current-chat-title');

// ===== UTILIDADES =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveChats() {
    localStorage.setItem('aiflux_chats', JSON.stringify(chats));
}

function getCurrentChat() {
    return chats.find(c => c.id === currentChatId);
}

// ===== RENDERIZADO DE MENSAJES =====
function renderMessage(role, content, options = {}) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', role);
    
    if (options.isTyping) {
        msgDiv.classList.remove('message');
        msgDiv.classList.add('typing');
        msgDiv.innerHTML = '<span></span><span></span><span></span>';
        msgDiv.dataset.typing = 'true';
    } else if (options.type === 'image') {
        msgDiv.innerHTML = `${escapeHtml(content)}<img src="${options.url}" alt="Imagen">`;
    } else if (options.type === 'chart') {
        msgDiv.innerHTML = escapeHtml(content);
        const canvas = document.createElement('canvas');
        canvas.id = 'chart-' + generateId();
        msgDiv.appendChild(canvas);
        setTimeout(() => renderChart(canvas, options.chartData), 100);
    } else {
        msgDiv.textContent = content;
    }
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msgDiv;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== RENDERIZADO DE GRÁFICOS =====
function renderChart(canvas, chartData) {
    new Chart(canvas, {
        type: chartData.type || 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: chartData.label || 'Datos',
                data: chartData.values,
                backgroundColor: [
                    'rgba(77, 159, 255, 0.6)',
                    'rgba(168, 85, 247, 0.6)',
                    'rgba(236, 72, 153, 0.6)',
                    'rgba(34, 197, 94, 0.6)',
                    'rgba(251, 191, 36, 0.6)',
                    'rgba(239, 68, 68, 0.6)'
                ],
                borderColor: [
                    'rgba(77, 159, 255, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(236, 72, 153, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(251, 191, 36, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#ffffff' } }
            },
            scales: chartData.type === 'pie' || chartData.type === 'doughnut' ? {} : {
                x: { ticks: { color: '#a0a0a0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#a0a0a0' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

// ===== DETECCIÓN DE INTENCIONES =====
function detectImageRequest(text) {
    const lower = text.toLowerCase();
    const keywords = ['dibuja', 'imagen', 'foto', 'muéstrame', 'muestrame', 'ilustra', 'pinta', 'genera una imagen'];
    if (!keywords.some(k => lower.includes(k))) return null;
    
    let prompt = lower;
    keywords.forEach(k => prompt = prompt.replace(k, ''));
    prompt = prompt.trim();
    return prompt || null;
}

function detectChartRequest(text) {
    const lower = text.toLowerCase();
    const isChart = lower.includes('gráfico') || lower.includes('grafico') || lower.includes('chart');
    if (!isChart) return null;
    
    let type = 'bar';
    if (lower.includes('circular') || lower.includes('pie') || lower.includes('pastel')) type = 'pie';
    if (lower.includes('línea') || lower.includes('linea') || lower.includes('line')) type = 'line';
    if (lower.includes('dona') || lower.includes('doughnut') || lower.includes('anillo')) type = 'doughnut';
    
    // Formato: "nombre: valor, nombre2: valor2"
    const matches = text.match(/([a-záéíóúñ]+)\s*:?\s*(\d+(?:\.\d+)?)/gi) || 
                    text.match(/([a-záéíóúñ]+)\s+(\d+(?:\.\d+)?)/gi);
    
    if (!matches || matches.length < 2) return null;
    
    const labels = [];
    const values = [];
    matches.forEach(m => {
        const parts = m.split(/[:\s]+/).filter(p => p);
        if (parts.length >= 2) {
            const val = parseFloat(parts[parts.length - 1]);
            const label = parts.slice(0, -1).join(' ');
            if (!isNaN(val)) {
                labels.push(label);
                values.push(val);
            }
        }
    });
    
    if (labels.length < 2) return null;
    return { type, labels, values, label: 'Datos' };
}

// ===== ENVÍO DE MENSAJES =====
async function sendMessage(textOverride = null) {
    const text = textOverride || userInput.value.trim();
    if (!text) return;
    
    if (!currentChatId) createNewChat();
    
    const chat = getCurrentChat();
    if (!chat) return;
    
    // Quitar bienvenida
    const welcome = chatBox.querySelector('.welcome');
    if (welcome) welcome.remove();
    
    // Mostrar mensaje del usuario
    chat.messages.push({ role: 'user', content: text });
    renderMessage('user', text);
    
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    // Título del chat (primer mensaje)
    if (chat.messages.length === 1) {
        chat.title = text.slice(0, 30) + (text.length > 30 ? '...' : '');
        saveChats();
        renderChatList();
        currentChatTitle.textContent = chat.title;
    }
    
    // Verificar si es gráfico
    const chartData = detectChartRequest(text);
    if (chartData) {
        const reply = `Aquí tienes tu gráfico ${chartData.type === 'pie' ? 'circular' : chartData.type === 'line' ? 'de líneas' : 'de barras'}:`;
        chat.messages.push({ role: 'assistant', content: reply, chartData });
        renderMessage('ai', reply, { type: 'chart', chartData });
        saveChats();
        sendBtn.disabled = false;
        return;
    }
    
    // Typing indicator
    const typingEl = renderMessage('ai', '', { isTyping: true });
    
    try {
        // Llamar al backend
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: chat.messages.slice(-10) })
        });
        
        const data = await response.json();
        const aiText = data.text || "No pude responder.";
        
        typingEl.remove();
        
        // Verificar imagen
        const imagePrompt = detectImageRequest(text);
        if (imagePrompt) {
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=768&height=768&seed=${Date.now()}&nologo=true`;
            chat.messages.push({ role: 'assistant', content: aiText, imageUrl });
            renderMessage('ai', aiText, { type: 'image', url: imageUrl });
        } else {
            chat.messages.push({ role: 'assistant', content: aiText });
            renderMessage('ai', aiText);
        }
        
        saveChats();
        
    } catch (error) {
        typingEl.remove();
        renderMessage('ai', 'Error de conexión. Intenta de nuevo.');
        console.error(error);
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// ===== GESTIÓN DE CHATS =====
function createNewChat() {
    const newChat = {
        id: generateId(),
        title: 'Nuevo chat',
        messages: [],
        createdAt: Date.now()
    };
    chats.unshift(newChat);
    currentChatId = newChat.id;
    saveChats();
    renderChatList();
    renderCurrentChat();
    currentChatTitle.textContent = 'Nuevo chat';
    closeSidebarOnMobile();
}

function loadChat(id) {
    currentChatId = id;
    renderCurrentChat();
    renderChatList();
    const chat = getCurrentChat();
    currentChatTitle.textContent = chat ? chat.title : 'Chat';
    closeSidebarOnMobile();
}

function deleteChat(id, event) {
    event.stopPropagation();
    chats = chats.filter(c => c.id !== id);
    if (currentChatId === id) {
        if (chats.length > 0) {
            currentChatId = chats[0].id;
        } else {
            currentChatId = null;
        }
    }
    saveChats();
    renderChatList();
    renderCurrentChat();
}

function renderChatList() {
    chatList.innerHTML = '';
    chats.forEach(chat => {
        const item = document.createElement('div');
        item.classList.add('chat-item');
        if (chat.id === currentChatId) item.classList.add('active');
        item.innerHTML = `
            <span class="chat-item-title">${escapeHtml(chat.title)}</span>
            <button class="chat-item-delete" title="Eliminar">✕</button>
        `;
        item.onclick = () => loadChat(chat.id);
        item.querySelector('.chat-item-delete').onclick = (e) => deleteChat(chat.id, e);
        chatList.appendChild(item);
    });
}

function renderCurrentChat() {
    chatBox.innerHTML = '';
    const chat = getCurrentChat();
    
    if (!chat || chat.messages.length === 0) {
        renderWelcome();
        return;
    }
    
    chat.messages.forEach(msg => {
        if (msg.imageUrl) {
            renderMessage(msg.role, msg.content, { type: 'image', url: msg.imageUrl });
        } else if (msg.chartData) {
            renderMessage(msg.role, msg.content, { type: 'chart', chartData: msg.chartData });
        } else {
            renderMessage(msg.role, msg.content);
        }
    });
}

function renderWelcome() {
    chatBox.innerHTML = `
        <div class="welcome">
            <div class="welcome-icon">🤖</div>
            <h1>¿En qué puedo ayudarte?</h1>
            <p class="welcome-sub">Pregúntame lo que quieras, o pídeme un gráfico:</p>
            <div class="suggestions">
                <button class="suggestion" data-text="Dibuja un gato astronauta">🎨 Dibuja un gato astronauta</button>
                <button class="suggestion" data-text="Hazme un gráfico de barras con ventas: enero 100, febrero 200, marzo 150">📊 Gráfico de ventas</button>
                <button class="suggestion" data-text="Cuéntame un chiste corto">😂 Cuéntame un chiste</button>
                <button class="suggestion" data-text="Hazme un gráfico circular: manzanas 30, peras 50, uvas 20">🥧 Gráfico circular</button>
            </div>
        </div>
    `;
    attachSuggestionEvents();
}

function attachSuggestionEvents() {
    document.querySelectorAll('.suggestion').forEach(btn => {
        btn.onclick = () => sendMessage(btn.dataset.text);
    });
}

// ===== SIDEBAR MÓVIL =====
function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

function closeSidebarOnMobile() {
    if (window.innerWidth <= 768) closeSidebar();
}

// ===== EVENTOS =====
sendBtn.onclick = () => sendMessage();

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
});

newChatBtn.onclick = createNewChat;

openSidebarBtn.onclick = openSidebar;
toggleSidebarBtn.onclick = closeSidebar;
overlay.onclick = closeSidebar;

clearBtn.onclick = () => {
    if (!currentChatId) return;
    const chat = getCurrentChat();
    if (!chat) return;
    if (confirm('¿Borrar todos los mensajes de este chat?')) {
        chat.messages = [];
        chat.title = 'Nuevo chat';
        saveChats();
        renderChatList();
        renderCurrentChat();
        currentChatTitle.textContent = 'Nuevo chat';
    }
};

// ===== INICIALIZACIÓN =====
function init() {
    renderChatList();
    
    if (chats.length === 0) {
        createNewChat();
    } else {
        currentChatId = chats[0].id;
        renderCurrentChat();
        const chat = get
