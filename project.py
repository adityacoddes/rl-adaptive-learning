from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests
import re
import random

app = Flask(__name__)
CORS(app)

# 🔐 API KEY (PUT YOUR KEY HERE)
OPENROUTER_API_KEY = "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"

# =========================
# 🧠 ENV STATE
# =========================
env = {
    "score": 0,
    "level": "beginner",
    "last_mindset": "neutral"
}

# =========================
# 🧠 RL Q-TABLE
# =========================
Q_table = {}

actions = [
    "simple_explanation",
    "deep_explanation",
    "motivation",
    "increase_difficulty"
]

alpha = 0.1
gamma = 0.9
epsilon = 0.2

# =========================
# 🏠 FRONTEND
# =========================
@app.route('/')
def home():
    return render_template("index.html")

# =========================
# 🧠 CODING DETECTION
# =========================
def is_coding_related(message):
    msg = message.lower()

    keywords = [
        "code", "python", "java", "c++", "program",
        "loop", "function", "error", "bug",
        "array", "string", "variable", "debug",
        "algorithm", "syntax"
    ]

    return any(word in msg for word in keywords)

# =========================
# 🧠 LEVEL DETECTION
# =========================
def detect_level(message):
    msg = message.lower()

    if "don't know" in msg or "not sure" in msg:
        return "beginner"
    elif "maybe" in msg or "i think" in msg:
        return "intermediate"
    else:
        return "advanced"

# =========================
# 🧠 MINDSET DETECTION
# =========================
def detect_mindset(message):
    msg = message.lower()

    if "don't understand" in msg or "confused" in msg:
        return "confused"
    elif "wrong" in msg or "again" in msg:
        return "frustrated"
    elif "easy" in msg or "got it" in msg:
        return "confident"
    elif "how" in msg or "why" in msg:
        return "curious"
    else:
        return "neutral"

# =========================
# 🎯 REWARD FUNCTION
# =========================
def get_reward(prev_mindset, current_mindset):
    if prev_mindset == "confused" and current_mindset == "confident":
        return 2
    elif current_mindset == "frustrated":
        return -1
    else:
        return 0.5

# =========================
# 🎯 RL ACTION
# =========================
def choose_action(state):
    if state not in Q_table:
        Q_table[state] = {a: 0 for a in actions}

    if random.uniform(0, 1) < epsilon:
        return random.choice(actions)
    else:
        return max(Q_table[state], key=Q_table[state].get)

# =========================
# 🎯 RL UPDATE
# =========================
def update_q(state, action, reward, next_state):
    if next_state not in Q_table:
        Q_table[next_state] = {a: 0 for a in actions}

    old_value = Q_table[state][action]
    next_max = max(Q_table[next_state].values())

    new_value = old_value + alpha * (reward + gamma * next_max - old_value)
    Q_table[state][action] = new_value

# =========================
# 🤖 AI CALL
# =========================
def call_llm(prompt):
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }

        data = {
            "model": "openai/gpt-3.5-turbo",
            "messages": [{"role": "user", "content": prompt}]
        }

        response = requests.post(url, headers=headers, json=data, timeout=30)
        result = response.json()

        if "choices" in result:
            return result["choices"][0]["message"]["content"]
        else:
            return f"AI Error: {result}"

    except Exception as e:
        return f"AI Exception: {str(e)}"

# =========================
# 🔥 FORMAT RESPONSE → HTML
# =========================
def format_response(text):
    html = text

    # Headings
    html = re.sub(r"## (.*?)\n", r"<h3>\1</h3>", html)

def format_response(text):
    html = text

    # Headings
    html = re.sub(r"## (.*?)\n", r"<h3>\1</h3>", html)

    # Code blocks (FIXED)
    code_blocks = re.findall(r"```(.*?)```", text, re.DOTALL)

    for code in code_blocks:
        clean_code = code.strip()

        code_html = f"""
        <div class="code-container">
            <pre><code>{clean_code}</code></pre>
            <button onclick="copyCode(this)">Copy</button>
        </div>
        """

        html = html.replace(f"```{code}```", code_html)

    html = html.replace("\n", "<br>")

    return html

# =========================
# 🎮 MAIN CHAT (FINAL 🔥)
# =========================
@app.route('/step', methods=['POST'])
def step():

    data = request.json
    user_input = data.get("action", "")

    # 🚫 BLOCK NON-CODING
    if not is_coding_related(user_input):
        return jsonify({
            "ai_feedback": """
<h3>🚫 Coding Queries Only</h3>
<p>I am designed to help with <b>coding and programming problems</b>.</p>
<p>Please ask questions related to Python, Java, debugging, algorithms, etc.</p>
""",
            "level": "NA",
            "mindset": "NA",
            "action": "blocked",
            "reward": 0
        })

    # RL + mindset
    level = detect_level(user_input)
    mindset = detect_mindset(user_input)

    state = f"{level}_{mindset}"
    action = choose_action(state)

    strategy_map = {
        "simple_explanation": "Explain very simply step-by-step.",
        "deep_explanation": "Explain deeply with logic and real-world examples.",
        "motivation": "Encourage and simplify explanation with hints.",
        "increase_difficulty": "Give advanced examples and challenge."
    }

    strategy = strategy_map[action]

    # PROMPT
    prompt = f"""
You are an AI Coding Tutor like ChatGPT.

User Level: {level}
User Mindset: {mindset}

User Input:
{user_input}

Teaching Strategy:
{strategy}

Give a detailed response.

FORMAT:

Detailed explanation

## Code Example
(use triple backticks)

## Step-by-Step
Explain code

## Optimization
Better approach

## Extra Tip
(optional)
"""

    ai_raw = call_llm(prompt)

    # RL update
    next_mindset = detect_mindset(user_input)
    reward = get_reward(env["last_mindset"], next_mindset)

    next_state = f"{level}_{next_mindset}"
    update_q(state, action, reward, next_state)

    env["last_mindset"] = next_mindset

    ai_feedback = format_response(ai_raw)

    return jsonify({
        "ai_feedback": ai_feedback,
        "level": level,
        "mindset": mindset,
        "action": action,
        "reward": reward
    })

# =========================
# 🚀 RUN
# =========================
if __name__ == "__main__":
    app.run(debug=True)