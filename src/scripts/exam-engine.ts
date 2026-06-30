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
    __QUIZ_HOME_URL__: string;
    __ALL_QUESTIONS__: Question[];
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

export function initExam(): void {
  const questions = window.__QUIZ_QUESTIONS__;
  const homeUrl = window.__QUIZ_HOME_URL__;

  let currentIndex = 0;
  const answers: (number | null)[] = new Array(questions.length).fill(null);
  const choiceOrders: number[][] = questions.map(() => shuffle([0, 1, 2, 3]));

  const container = document.getElementById('quiz-container')!;
  const progressBar = document.getElementById('progress-bar')!;
  const progressLabel = document.getElementById('progress-label')!;
  const answeredDisplay = document.getElementById('answered-display')!;

  function updateProgress() {
    const answered = answers.filter((a) => a !== null).length;
    const pct = (currentIndex / questions.length) * 100;
    progressBar.style.width = pct + '%';
    progressLabel.textContent = `${currentIndex} / ${questions.length}`;
    answeredDisplay.textContent = `解答済み: ${answered} / ${questions.length}`;
  }

  function renderQuestion() {
    const q = questions[currentIndex];
    const order = choiceOrders[currentIndex];
    const displayChoices = order.map((origIdx) => q.choices[origIdx]);
    const selectedAnswer = answers[currentIndex];
    updateProgress();

    container.innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div>
          <p class="text-xs font-medium text-violet-600 mb-2">問 ${currentIndex + 1} <span class="text-slate-400 font-normal">（解答中は正誤を表示しません）</span></p>
          <p class="text-slate-800 leading-relaxed font-medium">${escapeHtml(q.question)}</p>
        </div>
        <div class="space-y-3" id="choices">
          ${displayChoices.map((c, i) => {
            const isSelected = selectedAnswer === i;
            const cls = isSelected
              ? 'choice-btn w-full text-left border-2 border-violet-500 bg-violet-50 text-violet-800 rounded-xl px-5 py-4'
              : 'choice-btn w-full text-left border-2 border-slate-200 rounded-xl px-5 py-4 text-slate-700 hover:border-violet-400 hover:bg-violet-50 transition-all';
            return `<button data-index="${i}" class="${cls}"><span class="font-medium text-slate-400 mr-2">${i + 1}.</span>${escapeHtml(c)}</button>`;
          }).join('')}
        </div>
        <div class="flex gap-3">
          ${currentIndex > 0 ? `<button id="prev-btn" class="flex-1 border-2 border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl px-4 py-3 transition-colors">← 前へ</button>` : '<div class="flex-1"></div>'}
          ${currentIndex + 1 < questions.length
            ? `<button id="next-btn" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl px-4 py-3 transition-colors">次へ →</button>`
            : `<button id="finish-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl px-4 py-3 transition-colors">採点する</button>`}
        </div>
      </div>`;

    document.querySelectorAll<HTMLButtonElement>('.choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        answers[currentIndex] = Number(btn.dataset.index);
        renderQuestion();
      });
    });

    document.getElementById('prev-btn')?.addEventListener('click', () => {
      currentIndex--;
      renderQuestion();
    });

    document.getElementById('next-btn')?.addEventListener('click', () => {
      currentIndex++;
      renderQuestion();
    });

    document.getElementById('finish-btn')?.addEventListener('click', () => {
      renderResults();
    });
  }

  function renderResults() {
    const score = answers.filter((a, i) => a !== null && choiceOrders[i][a] === questions[i].correctIndex).length;
    const pct = Math.round((score / questions.length) * 100);
    const passed = pct >= 70;

    progressBar.style.width = '100%';
    progressLabel.textContent = `${questions.length} / ${questions.length}`;
    answeredDisplay.textContent = `採点完了`;

    questions.forEach((q, i) => {
      const a = answers[i];
      if (a !== null) recordAnswer(q.id, choiceOrders[i][a] === q.correctIndex);
    });

    const resultRows = questions.map((q, idx) => {
      const order = choiceOrders[idx];
      const selected = answers[idx];
      const isCorrect = selected !== null && order[selected] === q.correctIndex;
      const icon = isCorrect
        ? '<span class="text-green-600 font-bold text-sm">✓</span>'
        : '<span class="text-red-500 font-bold text-sm">✗</span>';
      const bookmarked = getHistory()[q.id]?.bookmarked ?? false;

      const choicesHtml = order.map((origIdx, ci) => {
        const c = q.choices[origIdx];
        let cls = 'text-slate-600';
        if (origIdx === q.correctIndex) cls = 'text-green-700 font-semibold';
        else if (ci === selected && !isCorrect) cls = 'text-red-500 line-through';
        return `<p class="text-xs ${cls}">${ci + 1}. ${escapeHtml(c)}</p>`;
      }).join('');

      return `
        <div class="border border-slate-200 rounded-xl p-4 space-y-3">
          <div class="flex gap-2 items-start">
            <div class="shrink-0 pt-0.5">${icon}</div>
            <p class="text-sm font-medium text-slate-800 flex-1">${idx + 1}. ${escapeHtml(q.question)}</p>
            <button data-qid="${q.id}" class="bookmark-result-btn shrink-0 text-xl leading-none transition-colors" style="color: ${bookmarked ? '#FFDB50' : '#d1d5db'}" title="あとで見直す">★</button>
          </div>
          <div class="space-y-1 pl-5">${choicesHtml}</div>
          <div class="pl-5 pt-1 border-t border-slate-100">
            <p class="text-xs text-slate-500 leading-relaxed">${escapeHtml(q.explanation)}</p>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="space-y-6">
        <div class="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
          <h2 class="text-xl font-bold text-slate-800">模擬試験 結果</h2>
          <div class="space-y-1">
            <p class="text-5xl font-bold ${pct >= 70 ? 'text-green-600' : 'text-red-500'}">${pct}%</p>
            <p class="text-slate-500">正解数: <span class="font-semibold text-slate-700">${score} / ${questions.length}</span></p>
          </div>
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
            ${passed ? '✓ 合格ライン達成（70%以上）' : '✗ 合格ラインに届きませんでした（70%未満）'}
          </div>
          <div class="flex gap-3 pt-2">
            <a href="${homeUrl}quiz/exam/" class="flex-1 border-2 border-violet-600 text-violet-600 hover:bg-violet-50 font-semibold rounded-xl px-4 py-3 transition-colors text-center">もう一度</a>
            <a href="${homeUrl}quiz/weak/" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-4 py-3 transition-colors text-center">弱点を解く</a>
            <a href="${homeUrl}" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl px-4 py-3 transition-colors text-center">ホームへ</a>
          </div>
        </div>
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider">問題ごとの解説</h3>
          ${resultRows}
        </div>
      </div>`;

    document.querySelectorAll<HTMLButtonElement>('.bookmark-result-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const newState = toggleBookmark(btn.dataset.qid!);
        btn.style.color = newState ? '#FFDB50' : '#d1d5db';
      });
    });
  }

  renderQuestion();
}
