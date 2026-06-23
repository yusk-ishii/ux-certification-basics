import { recordAnswer, toggleBookmark, getHistory } from '../utils/storage';

type Question = {
  id: string;
  sectionId: string;
  question: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
};

declare global {
  interface Window {
    __QUIZ_QUESTIONS__: Question[];
    __QUIZ_SECTION_LABEL__: string;
    __QUIZ_HOME_URL__: string;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scoreMessage(correct: number, total: number): string {
  const pct = total === 0 ? 0 : (correct / total) * 100;
  if (pct >= 90) return '優秀！UX検定基礎の合格レベルに達しています。';
  if (pct >= 70) return 'よくできました！あと少しで合格レベルです。';
  if (pct >= 50) return 'もう少し学習が必要です。苦手な分野を重点的に復習しましょう。';
  return '基礎から復習しましょう。シラバスに沿って学習を進めてください。';
}

export function initQuiz(): void {
  const questions = shuffle(window.__QUIZ_QUESTIONS__);
  const homeUrl = window.__QUIZ_HOME_URL__;

  if (questions.length === 0) {
    const container = document.getElementById('quiz-container')!;
    container.innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
        <p class="text-slate-500 text-lg">出題できる問題がありません</p>
        <a href="${homeUrl}" class="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-6 py-3 transition-colors">ホームへ戻る</a>
      </div>`;
    return;
  }

  let currentIndex = 0;
  let score = 0;
  const results: { question: Question; selectedIndex: number; isCorrect: boolean }[] = [];

  const container = document.getElementById('quiz-container')!;
  const progressBar = document.getElementById('progress-bar')!;
  const progressLabel = document.getElementById('progress-label')!;
  const scoreDisplay = document.getElementById('score-display')!;

  function updateProgress() {
    const pct = (currentIndex / questions.length) * 100;
    progressBar.style.width = pct + '%';
    progressLabel.textContent = `${currentIndex} / ${questions.length}`;
    scoreDisplay.textContent = `スコア: ${score} / ${currentIndex}`;
  }

  function getBookmarkState(id: string): boolean {
    const history = getHistory();
    return history[id]?.bookmarked ?? false;
  }

  function renderQuestion() {
    const q = questions[currentIndex];
    updateProgress();
    const isBookmarked = getBookmarkState(q.id);

    container.innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <p class="text-xs font-medium text-indigo-600 mb-2">問 ${currentIndex + 1}</p>
            <p class="text-slate-800 leading-relaxed font-medium">${escapeHtml(q.question)}</p>
          </div>
          <button id="bookmark-btn" class="shrink-0 text-2xl leading-none transition-opacity ${isBookmarked ? 'opacity-100' : 'opacity-30 hover:opacity-70'}" title="あとで見直す">
            ★
          </button>
        </div>
        <div class="space-y-3" id="choices">
          ${q.choices.map((c, i) => `
            <button data-index="${i}" class="choice-btn w-full text-left border-2 border-slate-200 rounded-xl px-5 py-4 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 transition-all">
              <span class="font-medium text-slate-400 mr-2">${i + 1}.</span>${escapeHtml(c)}
            </button>`).join('')}
        </div>
        <div id="explanation-area" class="hidden"></div>
        <button id="next-btn" class="hidden w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-6 py-3 transition-colors">
          ${currentIndex + 1 < questions.length ? '次の問題 →' : '結果を見る'}
        </button>
      </div>`;

    document.getElementById('bookmark-btn')!.addEventListener('click', () => {
      const newState = toggleBookmark(q.id);
      const btn = document.getElementById('bookmark-btn')!;
      btn.className = btn.className.replace(/opacity-\d+/g, '').trim();
      btn.classList.add(newState ? 'opacity-100' : 'opacity-30');
      if (!newState) btn.classList.add('hover:opacity-70');
    });

    document.querySelectorAll<HTMLButtonElement>('.choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleAnswer(Number(btn.dataset.index)));
    });
  }

  function handleAnswer(selectedIndex: number) {
    const q = questions[currentIndex];
    const isCorrect = selectedIndex === q.correctIndex;
    if (isCorrect) score++;
    results.push({ question: q, selectedIndex, isCorrect });

    recordAnswer(q.id, isCorrect);

    document.querySelectorAll<HTMLButtonElement>('.choice-btn').forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.correctIndex) {
        btn.className = 'choice-btn w-full text-left border-2 border-green-500 bg-green-50 text-green-800 rounded-xl px-5 py-4';
      } else if (i === selectedIndex && !isCorrect) {
        btn.className = 'choice-btn w-full text-left border-2 border-red-400 bg-red-50 text-red-800 rounded-xl px-5 py-4 opacity-80';
      } else {
        btn.className = 'choice-btn w-full text-left border-2 border-slate-200 rounded-xl px-5 py-4 text-slate-400 opacity-40';
      }
    });

    const explanationArea = document.getElementById('explanation-area')!;
    explanationArea.className = 'border-t border-slate-100 pt-4';
    explanationArea.innerHTML = `
      <div class="flex gap-2 mb-2">
        ${isCorrect
          ? '<span class="text-green-600 font-bold text-sm">✓ 正解！</span>'
          : '<span class="text-red-500 font-bold text-sm">✗ 不正解</span>'}
      </div>
      <p class="text-sm text-slate-600 leading-relaxed">${escapeHtml(q.explanation)}</p>`;

    const nextBtn = document.getElementById('next-btn')!;
    nextBtn.className = 'w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-6 py-3 transition-colors';
    nextBtn.addEventListener('click', () => {
      currentIndex++;
      if (currentIndex < questions.length) {
        renderQuestion();
      } else {
        renderResults();
      }
    });

    scoreDisplay.textContent = `スコア: ${score} / ${currentIndex + 1}`;
  }

  function renderResults() {
    updateProgress();
    const pct = Math.round((score / questions.length) * 100);
    const msg = scoreMessage(score, questions.length);
    let ringColor = 'text-red-500';
    if (pct >= 90) ringColor = 'text-green-600';
    else if (pct >= 70) ringColor = 'text-blue-600';
    else if (pct >= 50) ringColor = 'text-yellow-600';

    const resultRows = results.map((r, idx) => {
      const icon = r.isCorrect
        ? '<span class="text-green-600 font-bold">✓</span>'
        : '<span class="text-red-500 font-bold">✗</span>';
      const wrongInfo = r.isCorrect ? '' : `
        <p class="text-xs text-slate-500 mt-1">正解: <span class="font-medium text-slate-700">${escapeHtml(r.question.choices[r.question.correctIndex])}</span></p>`;
      return `
        <div class="flex gap-3 py-3 border-b border-slate-100 last:border-0">
          <div class="shrink-0 w-5 pt-0.5 text-sm">${icon}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-slate-700">${idx + 1}. ${escapeHtml(r.question.question)}</p>
            ${wrongInfo}
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
        <h2 class="text-xl font-bold text-slate-800 text-center">クイズ完了！</h2>
        <div class="text-center space-y-2">
          <p class="text-5xl font-bold ${ringColor}">${pct}%</p>
          <p class="text-slate-500">正解数: <span class="font-semibold text-slate-700">${score} / ${questions.length}</span></p>
        </div>
        <div class="bg-slate-50 rounded-xl p-4">
          <p class="text-sm text-slate-600 text-center">${escapeHtml(msg)}</p>
        </div>
        <div class="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          <div class="px-4 py-2 bg-slate-50">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">問題ごとの結果</p>
          </div>
          <div class="px-4">${resultRows}</div>
        </div>
        <div class="flex gap-3">
          <button id="retry-btn" class="flex-1 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-xl px-4 py-3 transition-colors">
            もう一度
          </button>
          <a href="${homeUrl}quiz/weak/" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-4 py-3 transition-colors text-center">
            弱点を解く
          </a>
          <a href="${homeUrl}" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl px-4 py-3 transition-colors text-center">
            ホームへ
          </a>
        </div>
      </div>`;

    document.getElementById('retry-btn')!.addEventListener('click', () => {
      questions.sort(() => Math.random() - 0.5);
      currentIndex = 0;
      score = 0;
      results.length = 0;
      renderQuestion();
    });
  }

  renderQuestion();
}
