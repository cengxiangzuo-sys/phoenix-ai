const pages = new Map([...document.querySelectorAll('[data-view]')].map(node => [node.dataset.view, node]));
const navItems = [...document.querySelectorAll('[data-page]')];
const pageNames = { home: '工作台', chat: '新对话', history: '对话历史', knowledge: '知识库', tools: '工具箱', settings: '设置' };
const sidebar = document.getElementById('sidebar');
const scrim = document.getElementById('sidebar-scrim');
const prompt = document.getElementById('prompt');
const sendButton = document.getElementById('send-button');
const messages = document.getElementById('messages');
const historyList = document.getElementById('history-list');
const themeToggle = document.getElementById('theme-toggle');
const maxPreviewHistory = 8;
let activePage = 'home';
let previewHistory = [];

function closeSidebar() {
  sidebar.classList.remove('is-open');
  scrim.hidden = true;
  document.getElementById('open-menu').focus();
}

function setPage(name, focus = false) {
  if (!pages.has(name)) return;
  activePage = name;
  pages.forEach((page, key) => page.classList.toggle('is-active', key === name));
  navItems.forEach(item => {
    const selected = item.dataset.page === name || (name === 'chat' && item.dataset.page === 'home');
    item.classList.toggle('is-selected', selected);
    if (selected) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  document.getElementById('page-title').textContent = pageNames[name];
  document.title = `${pageNames[name]} · Phoenix AI 界面预览`;
  if (sidebar.classList.contains('is-open')) closeSidebar();
  if (focus && name === 'chat') prompt.focus();
  if (name === 'history') renderHistory();
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  const dark = theme === 'dark';
  const icon = themeToggle.querySelector('use');
  icon.setAttribute('href', dark ? '#i-sun' : '#i-moon');
  themeToggle.setAttribute('aria-label', dark ? '切换浅色主题' : '切换深色主题');
  localStorage.setItem('phoenix-ui-preview-theme', theme);
}

function addMessage(text, kind) {
  const bubble = document.createElement('div');
  bubble.className = `bubble ${kind}`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  bubble.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function renderHistory() {
  historyList.replaceChildren();
  if (!previewHistory.length) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = '还没有预览对话。点击“新对话”开始。';
    historyList.appendChild(empty);
    return;
  }
  for (const item of previewHistory) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item;
    button.addEventListener('click', () => setPage('chat', true));
    historyList.appendChild(button);
  }
}

navItems.forEach(item => item.addEventListener('click', () => setPage(item.dataset.page, item.dataset.page === 'home')));
document.getElementById('start-chat').addEventListener('click', () => setPage('chat', true));
document.querySelectorAll('[data-prompt]').forEach(item => item.addEventListener('click', () => {
  setPage('chat', true);
  prompt.value = item.dataset.prompt;
  sendButton.disabled = false;
  prompt.focus();
}));
document.getElementById('open-menu').addEventListener('click', () => {
  sidebar.classList.add('is-open');
  scrim.hidden = false;
  sidebar.querySelector('.nav-item').focus();
});
scrim.addEventListener('click', closeSidebar);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && sidebar.classList.contains('is-open')) closeSidebar();
});
const toggleTheme = () => setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
themeToggle.addEventListener('click', toggleTheme);
document.getElementById('theme-setting').addEventListener('click', toggleTheme);
prompt.addEventListener('input', () => {
  sendButton.disabled = prompt.value.trim().length === 0;
  prompt.style.height = 'auto';
  prompt.style.height = `${Math.min(150, prompt.scrollHeight)}px`;
});
prompt.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    document.getElementById('composer').requestSubmit();
  }
});
document.getElementById('composer').addEventListener('submit', event => {
  event.preventDefault();
  const text = prompt.value.trim();
  if (!text) return;
  setPage('chat');
  addMessage(text, 'user');
  addMessage('这是 Phoenix AI 界面预览，消息仅在当前页面显示。正式聊天功能将在接入 Harness 后提供。', 'notice');
  previewHistory.unshift(text.slice(0, 48));
  previewHistory = previewHistory.slice(0, maxPreviewHistory);
  prompt.value = '';
  prompt.style.height = 'auto';
  sendButton.disabled = true;
  prompt.focus();
});
setTheme(localStorage.getItem('phoenix-ui-preview-theme') === 'light' ? 'light' : 'dark');
setPage('home');
