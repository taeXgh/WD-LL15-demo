// script.js
// Client-side wiring for the Fillr app buttons.
// NOTE: For a real app, do NOT expose your OpenAI API key in client-side code.
// This demo reads a key from `window.OPENAI_API_KEY` or `window.OPENAI_KEY` (set in `secrets.js`).

const respEl = document.getElementById('response');
const iceBtn = document.getElementById('iceBtn');
const factBtn = document.getElementById('factBtn');
const jokeBtn = document.getElementById('jokeBtn');
const weatherBtn = document.getElementById('weatherBtn');
const buttons = [iceBtn, factBtn, jokeBtn, weatherBtn];

// Prefer window globals that a simple `secrets.js` can set.
const API_KEY = window.OPENAI_API_KEY || window.OPENAI_KEY || null;

function setResponse(text, isError = false) {
  respEl.textContent = text;
  respEl.style.color = isError ? '#8b0000' : '#22223b';
}

function setLoading(loading) {
  buttons.forEach(b => (b.disabled = loading));
  if (loading) {
    setResponse('Thinking... ✨');
  }
}

function buildPrompt(type) {
  switch (type) {
    case 'icebreaker':
      return {
        system: 'You are a friendly assistant that produces short, engaging conversation starters suitable for groups and meetings. Keep tone upbeat and inclusive.',
        user: 'Give one short, friendly icebreaker (1-2 sentences) that people can use to start a conversation in a group setting. Keep it age-appropriate and inclusive.'
      };
    case 'fact':
      return {
        system: 'You are a fun facts generator. Provide surprising but true-sounding facts. Keep them short and shareable.',
        user: 'Give one weird or surprising fact (1-2 sentences). Make it concise and interesting.'
      };
    case 'joke':
      return {
        system: 'You are a light-hearted joke-teller. Jokes should be family-friendly, short, and easy to read aloud.',
        user: 'Tell one short, clean joke or one-liner appropriate for a general audience.'
      };
    case 'weather':
      return {
        system: 'You are a conversational prompt generator focused on weather. Produce prompts that encourage people to share the weather where they are and a small follow-up question.',
        user: 'Create one short friendly prompt (1-2 sentences) asking people to share what the weather is like where they are, plus a casual follow-up question to keep the conversation going.'
      };
    default:
      return null;
  }
}

async function callOpenAI(system, user) {
  if (!API_KEY) {
    throw new Error('OpenAI API key not found. Please set window.OPENAI_API_KEY in secrets.js (demo only — not secure).');
  }

  const payload = {
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.8,
    max_tokens: 120
  };

  // Add a simple timeout so the UI doesn't hang indefinitely.
  const timeoutMs = 10000; // 10s
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (err) {
    // Turn AbortError into a friendly timeout message.
    if (err.name === 'AbortError') {
      throw new Error('The request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    // Map common HTTP errors to friendly messages.
    if (res.status === 401) throw new Error('Unauthorized: check your OpenAI API key.');
    if (res.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.');
    const errText = await res.text();
    throw new Error(`OpenAI error (${res.status}). ${errText}`);
  }

  const data = await res.json();
  const msg = data?.choices?.[0]?.message?.content;
  if (!msg) throw new Error('No response from OpenAI. Please try again.');
  return msg.trim();
}

async function handleClick(type) {
  const built = buildPrompt(type);
  if (!built) return;
  setLoading(true);
  try {
    const answer = await callOpenAI(built.system, built.user);
    setResponse(answer);
  } catch (err) {
    console.error(err);
    setResponse(err.message || 'An error occurred while fetching response.', true);
  } finally {
    setLoading(false);
  }
}

// Wire up buttons
iceBtn.addEventListener('click', () => handleClick('icebreaker'));
factBtn.addEventListener('click', () => handleClick('fact'));
jokeBtn.addEventListener('click', () => handleClick('joke'));
weatherBtn.addEventListener('click', () => handleClick('weather'));

// Initial hint if no API key is set.
if (!API_KEY) {
  setResponse('No API key found. To use the demo, add your key in `secrets.js` as `window.OPENAI_API_KEY = "sk-..."`. (For production, call OpenAI from a server.)', true);
}
