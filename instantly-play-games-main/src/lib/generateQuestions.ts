export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
}

const LIBRETRANSLATE_API_KEY = '98294000-a10e-4ef4-81ec-4b5726a722df';

export async function translateText(text: string, source: string = 'en', target: string = 'fr'): Promise<string> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: 'text',
        api_key: LIBRETRANSLATE_API_KEY,
      }),
    });
    const data = await response.json();
    return data.translatedText || text;
  } catch {
    return text;
  }
}

export async function generateQuizQuestions(lang: string = 'fr', count: number = 15): Promise<QuizQuestion[]> {
  try {
    const response = await fetch(`https://opentdb.com/api.php?amount=${count}&type=multiple`);
    const data = await response.json();

    if (data.response_code !== 0) throw new Error('API error');

    return data.results.map((q: any) => {
      const incorrect = q.incorrect_answers.map(decodeHTML);
      const correct = decodeHTML(q.correct_answer);
      const options = [...incorrect, correct].sort(() => Math.random() - 0.5);
      const answer = options.indexOf(correct);
      return {
        question: decodeHTML(q.question),
        options,
        answer,
      };
    });
  } catch {
    return getFallbackQuestions(lang);
  }
}

function decodeHTML(str: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

function getFallbackQuestions(lang: string): QuizQuestion[] {
  if (lang === 'fr') {
    return [
      { question: 'Quelle est la capitale de la France ?', options: ['Lyon', 'Marseille', 'Paris', 'Bordeaux'], answer: 2 },
      { question: 'Combien de côtés a un hexagone ?', options: ['5', '6', '7', '8'], answer: 1 },
      { question: 'Quel est le plus grand océan ?', options: ['Atlantique', 'Indien', 'Arctique', 'Pacifique'], answer: 3 },
      { question: 'De quelle couleur est le ciel par temps clair ?', options: ['Vert', 'Rouge', 'Bleu', 'Jaune'], answer: 2 },
      { question: 'Combien font 7 × 8 ?', options: ['54', '56', '58', '64'], answer: 1 },
    ];
  }
  return [
    { question: 'What is the capital of France?', options: ['Lyon', 'Marseille', 'Paris', 'Bordeaux'], answer: 2 },
    { question: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], answer: 1 },
    { question: 'What is the largest ocean?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
    { question: 'What color is a clear sky?', options: ['Green', 'Red', 'Blue', 'Yellow'], answer: 2 },
    { question: 'What is 7 × 8?', options: ['54', '56', '58', '64'], answer: 1 },
  ];
}