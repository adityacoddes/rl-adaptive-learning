/* ========================================
   🎮 AI CODING TUTOR - JAVASCRIPT
   ======================================== */

// Configuration
const CONFIG = {
    API_URL: 'http://localhost:5000/step',
    MAX_CHAT_HISTORY: 50,
    TOAST_DURATION: 3000,
    DIFFICULTY_THRESHOLD: 5,
    SCORE_MULTIPLIER: 100
};

// State Management
const state = {
    messages: [],
    score: 0,
    level: 'beginner',
    mindset: 'neutral',
    questionsAsked: 0,
    streak: 0,
    rewards: [],
    mindsetHistory: [],
    lastAction: null,
    isLoading: false,
    sessionActive: true
};

// DOM Elements
const DOM = {
    chatMessages: document.getElementById('chatMessages'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    
    levelBadge: document.getElementById('levelBadge'),
    scoreValue: document.getElementById('scoreValue'),
    mindsetDisplay: document.getElementById('mindsetDisplay'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    strategyDisplay: document.getElementById('strategyDisplay'),
    questionCount: document.getElementById('questionCount'),
    streakValue: document.getElementById('streakValue'),
    resetBtn: document.getElementById('resetBtn'),
    
    headerStatus: document.getElementById('headerStatus'),
    inputHint: document.getElementById('inputHint'),
    toast: document.getElementById('toast'),
    
    mindsetChart: document.getElementById('mindsetChart'),
    rewardsList: document.getElementById('rewardsList'),
    insightQCount: document.getElementById('insightQCount'),
    insightAvgReward: document.getElementById('insightAvgReward'),
    insightBestMindset: document.getElementById('insightBestMindset'),
    analyticsRefresh: document.getElementById('analyticsRefresh')
};

// Emojis & Mappings
const MINDSET_EMOJI = {
    'confused': '😕',
    'frustrated': '😤',
    'confident': '😊',
    'curious': '🤔',
    'neutral': '😐'
};

const LEVEL_COLORS = {
    'beginner': '#00d4ff',
    'intermediate': '#ffb300',
    'advanced': '#ff006e'
};

const STRATEGY_LABELS = {
    'simple_explanation': 'Simple Explanation',
    'deep_explanation': 'Deep Explanation',
    'motivation': 'Motivation',
    'increase_difficulty': 'Increase Difficulty'
};

/* ========================================
   🎯 INITIALIZATION
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    updateUI();
    focusInput();
});

function initializeEventListeners() {
    DOM.sendBtn.addEventListener('click', sendMessage);
    DOM.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !state.isLoading) {
            sendMessage();
        }
    });
    DOM.resetBtn.addEventListener('click', resetSession);
    DOM.analyticsRefresh.addEventListener('click', updateAnalytics);
}

/* ========================================
   💬 MESSAGE HANDLING
   ======================================== */

async function sendMessage() {
    const userMessage = DOM.userInput.value.trim();
    
    if (!userMessage) return;
    
    if (state.isLoading) return;
    
    // Add user message to chat
    addMessageToChat(userMessage, 'user');
    DOM.userInput.value = '';
    
    // Update UI
    state.questionsAsked++;
    setLoading(true);
    
    try {
        // Call backend API
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: userMessage
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle blocked (non-coding) queries
        if (data.action === 'blocked') {
            addMessageToChat(data.ai_feedback, 'ai');
            showToast('⚠️ Please ask coding-related questions');
            DOM.inputHint.classList.add('error');
            setTimeout(() => DOM.inputHint.classList.remove('error'), 2000);
            setLoading(false);
            return;
        }
        
        // Update state from response
        updateState(data);
        
        // Add AI response with typing animation
        addMessageToChat(data.ai_feedback, 'ai', true);
        
        // Update UI components
        updateUI();
        updateAnalytics();
        
        // Update streak
        if (data.reward > 0) {
            state.streak++;
        } else if (data.reward < 0) {
            state.streak = 0;
        }
        
    } catch (error) {
        console.error('API Error:', error);
        addMessageToChat(
            `<h3>⚠️ Connection Error</h3><p>Could not connect to the AI server. Make sure the Flask backend is running on localhost:5000.</p>`,
            'ai'
        );
        showToast('❌ Failed to get response');
    } finally {
        setLoading(false);
        focusInput();
    }
}

function addMessageToChat(content, sender, withAnimation = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (sender === 'ai') {
        // Parse HTML content for AI messages
        contentDiv.innerHTML = content;
        setupCodeBlocks(contentDiv);
    } else {
        // Plain text for user messages
        contentDiv.textContent = content;
    }
    
    messageDiv.appendChild(contentDiv);
    
    if (withAnimation) {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(10px)';
    }
    
    DOM.chatMessages.appendChild(messageDiv);
    
    if (withAnimation) {
        setTimeout(() => {
            messageDiv.style.transition = 'all 0.3s ease-out';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 10);
    }
    
    // Add to state
    state.messages.push({ role: sender, content });
    
    // Keep chat history manageable
    if (state.messages.length > CONFIG.MAX_CHAT_HISTORY) {
        state.messages.shift();
        DOM.chatMessages.removeChild(DOM.chatMessages.firstChild);
    }
    
    // Scroll to bottom
    scrollToBottom();
}

function scrollToBottom() {
    setTimeout(() => {
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    }, 100);
}

function setupCodeBlocks(contentDiv) {
    const buttons = contentDiv.querySelectorAll('.code-container button');
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            const codeBlock = e.target.closest('.code-container').querySelector('code');
            const code = codeBlock.textContent;
            copyToClipboard(code);
        });
    });
}

/* ========================================
   📊 STATE MANAGEMENT
   ======================================== */

function updateState(data) {
    // Update level
    if (data.level && data.level !== 'NA') {
        state.level = data.level;
    }
    
    // Update mindset
    if (data.mindset && data.mindset !== 'NA') {
        state.mindset = data.mindset;
        state.mindsetHistory.push({
            mindset: data.mindset,
            timestamp: new Date()
        });
    }
    
    // Update score and reward
    const reward = parseFloat(data.reward) || 0;
    const scoreIncrease = reward * CONFIG.SCORE_MULTIPLIER;
    state.score += scoreIncrease;
    state.rewards.push({
        value: reward,
        timestamp: new Date()
    });
    
    // Keep only recent rewards
    if (state.rewards.length > 20) {
        state.rewards.shift();
    }
    
    // Update last action
    if (data.action) {
        state.lastAction = data.action;
    }
}

/* ========================================
   🎨 UI UPDATES
   ======================================== */

function updateUI() {
    updateLevelBadge();
    updateScore();
    updateMindset();
    updateProgress();
    updateStrategy();
    updateStats();
    updateHeaderStatus();
}

function updateLevelBadge() {
    const badgeText = DOM.levelBadge.querySelector('.badge-text');
    badgeText.textContent = state.level;
    
    const color = LEVEL_COLORS[state.level] || '#00d4ff';
    DOM.levelBadge.style.boxShadow = `0 0 15px ${color}40`;
    
    // Animate transition
    DOM.levelBadge.style.transition = 'all 0.3s ease-out';
}

function updateScore() {
    const finalScore = Math.floor(state.score);
    DOM.scoreValue.textContent = finalScore;
    
    // Animate score change
    animateValue(DOM.scoreValue, parseInt(DOM.scoreValue.textContent) - finalScore, finalScore, 500);
}

function updateMindset() {
    const emoji = MINDSET_EMOJI[state.mindset] || '😐';
    const label = state.mindset.charAt(0).toUpperCase() + state.mindset.slice(1);
    
    DOM.mindsetDisplay.innerHTML = `
        <span class="mindset-emoji">${emoji}</span>
        <span class="mindset-text">${label}</span>
    `;
}

function updateProgress() {
    // Calculate progress based on score and questions
    const maxScore = 1000;
    const progress = Math.min((state.score / maxScore) * 100, 100);
    
    const progressFill = DOM.progressBar.querySelector('.progress-fill');
    progressFill.style.width = progress + '%';
    
    DOM.progressText.textContent = Math.floor(progress) + '%';
}

function updateStrategy() {
    const strategy = state.lastAction ? STRATEGY_LABELS[state.lastAction] : 'Standby';
    DOM.strategyDisplay.innerHTML = `
        <span class="strategy-tag">${strategy}</span>
    `;
}

function updateStats() {
    DOM.questionCount.textContent = state.questionsAsked;
    DOM.streakValue.textContent = state.streak + '🔥';
}

function updateHeaderStatus() {
    const statuses = {
        'confused': '📚 Reviewing',
        'frustrated': '🆘 Need Help',
        'confident': '✅ Great!',
        'curious': '🧠 Learning',
        'neutral': '🎯 Ready'
    };
    
    DOM.headerStatus.textContent = statuses[state.mindset] || '🎯 Ready';
}

function updateAnalytics() {
    updateMindsetChart();
    updateRewardsHistory();
    updateInsights();
    
    // Animate refresh icon
    DOM.analyticsRefresh.style.transform = 'rotate(180deg)';
    setTimeout(() => {
        DOM.analyticsRefresh.style.transform = 'rotate(0deg)';
    }, 600);
}

function updateMindsetChart() {
    const mindsetCounts = {
        'confused': 0,
        'frustrated': 0,
        'confident': 0,
        'curious': 0,
        'neutral': 0
    };
    
    // Count mindsets
    state.mindsetHistory.forEach(item => {
        mindsetCounts[item.mindset]++;
    });
    
    // Get max for scaling
    const max = Math.max(...Object.values(mindsetCounts)) || 1;
    
    // Update bars
    const bars = DOM.mindsetChart.querySelectorAll('.chart-bar');
    const keys = ['confused', 'frustrated', 'confident', 'curious', 'neutral'];
    
    bars.forEach((bar, index) => {
        const height = (mindsetCounts[keys[index]] / max) * 100;
        bar.style.height = height + '%';
    });
}

function updateRewardsHistory() {
    DOM.rewardsList.innerHTML = '';
    
    if (state.rewards.length === 0) {
        DOM.rewardsList.innerHTML = '<span class="empty-state">No rewards yet</span>';
        return;
    }
    
    // Show last 5 rewards
    const recentRewards = state.rewards.slice(-5).reverse();
    
    recentRewards.forEach(reward => {
        const rewardDiv = document.createElement('div');
        rewardDiv.className = 'reward-item';
        
        const label = reward.value > 0 ? '✓' : '✗';
        const valueClass = reward.value > 0 ? 'positive' : 'negative';
        
        rewardDiv.innerHTML = `
            <span>${label}</span>
            <span class="reward-value ${valueClass}">${reward.value.toFixed(1)}</span>
        `;
        
        DOM.rewardsList.appendChild(rewardDiv);
    });
}

function updateInsights() {
    // Total questions
    DOM.insightQCount.textContent = state.questionsAsked;
    
    // Average reward
    const avgReward = state.rewards.length > 0 
        ? (state.rewards.reduce((sum, r) => sum + r.value, 0) / state.rewards.length).toFixed(2)
        : '0.0';
    DOM.insightAvgReward.textContent = avgReward;
    
    // Best mindset
    if (state.mindsetHistory.length > 0) {
        const mindsetCounts = {};
        state.mindsetHistory.forEach(item => {
            mindsetCounts[item.mindset] = (mindsetCounts[item.mindset] || 0) + 1;
        });
        
        const bestMindset = Object.keys(mindsetCounts).reduce((a, b) =>
            mindsetCounts[a] > mindsetCounts[b] ? a : b
        );
        
        DOM.insightBestMindset.textContent = bestMindset.charAt(0).toUpperCase() + bestMindset.slice(1);
    }
}

/* ========================================
   ⚙️ UTILITY FUNCTIONS
   ======================================== */

function setLoading(isLoading) {
    state.isLoading = isLoading;
    DOM.loadingSpinner.style.display = isLoading ? 'flex' : 'none';
    DOM.sendBtn.disabled = isLoading;
    DOM.sendBtn.style.opacity = isLoading ? '0.6' : '1';
}

function focusInput() {
    DOM.userInput.focus();
}

function showToast(message) {
    DOM.toast.textContent = message;
    DOM.toast.classList.add('show');
    
    setTimeout(() => {
        DOM.toast.classList.remove('show');
    }, CONFIG.TOAST_DURATION);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('✓ Code copied to clipboard!');
    }).catch(() => {
        showToast('✗ Failed to copy code');
    });
}

function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(start + (end - start) * progress);
        element.textContent = value;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function resetSession() {
    if (!confirm('Are you sure you want to reset your session? All progress will be lost.')) {
        return;
    }
    
    // Reset state
    state.messages = [];
    state.score = 0;
    state.level = 'beginner';
    state.mindset = 'neutral';
    state.questionsAsked = 0;
    state.streak = 0;
    state.rewards = [];
    state.mindsetHistory = [];
    state.lastAction = null;
    
    // Clear chat
    DOM.chatMessages.innerHTML = `
        <div class="welcome-container">
            <div class="welcome-card">
                <h2>Welcome to AI Coding Tutor 🚀</h2>
                <p>Ask me anything about programming, debugging, or algorithms. I'll adapt to your learning style!</p>
                <div class="welcome-tips">
                    <div class="tip">
                        <span class="tip-icon">💡</span>
                        <p><strong>Ask clearly:</strong> "How do I debug a null pointer exception?"</p>
                    </div>
                    <div class="tip">
                        <span class="tip-icon">🎯</span>
                        <p><strong>I adapt:</strong> To your level and learning style automatically</p>
                    </div>
                    <div class="tip">
                        <span class="tip-icon">⚡</span>
                        <p><strong>Learn fast:</strong> With code examples and step-by-step breakdowns</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Update UI
    updateUI();
    updateAnalytics();
    focusInput();
    
    showToast('🔄 Session reset! Ready to learn?');
}

/* ========================================
   🌐 RESPONSIVE HELPERS
   ======================================== */

// Handle mobile sidebar toggle (for future implementation)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
}

function toggleAnalytics() {
    const analytics = document.querySelector('.analytics-panel');
    analytics.classList.toggle('open');
}

/* ========================================
   🎨 THEME UTILITIES
   ======================================== */

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K to focus input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        focusInput();
    }
    
    // Cmd/Ctrl + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!state.isLoading) {
            sendMessage();
        }
    }
});

// Log initialization
console.log('🚀 AI Coding Tutor Frontend Ready!');
console.log('📝 API URL:', CONFIG.API_URL);
console.log('⌨️  Keyboard Shortcuts: Cmd+K (focus), Cmd+Enter (send)');
