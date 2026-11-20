/**
 * ACCESSPREP-X — Mathematical Grammar, Lexicon & Symbol Vocabulary
 * Supports Indian English and International English mathematical speech patterns,
 * SSC MTS syllabus terminology, number words, fractions, powers, roots, and disambiguation.
 */

export const ONES_WORDS: Record<string, number> = {
  zero: 0,
  naught: 0,
  nil: 0,
  oh: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19
};

export const TENS_WORDS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40, // common spelling variant
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
};

export const SCALE_WORDS: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
  lakhs: 100000,
  lac: 100000,
  lacs: 100000,
  million: 1000000,
  crore: 10000000,
  crores: 10000000
};

export const ORDINAL_DENOMINATORS: Record<string, number> = {
  half: 2,
  halves: 2,
  third: 3,
  thirds: 3,
  fourth: 4,
  fourths: 4,
  quarter: 4,
  quarters: 4,
  fifth: 5,
  fifths: 5,
  sixth: 6,
  sixths: 6,
  seventh: 7,
  sevenths: 7,
  eighth: 8,
  eighths: 8,
  ninth: 9,
  ninths: 9,
  tenth: 10,
  tenths: 10,
  eleventh: 11,
  elevenths: 11,
  twelfth: 12,
  twelfths: 12
};

export const ALLOWED_VARIABLES = new Set([
  'a',
  'b',
  'c',
  'd',
  'k',
  'l',
  'm',
  'n',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z'
]);

export const OPERATOR_PRECEDENCE: Record<string, number> = {
  '=': 1,
  '!=': 1,
  '>': 1,
  '<': 1,
  '>=': 1,
  '<=': 1,
  ':': 2,
  '+': 3,
  '-': 3,
  '*': 4,
  '/': 4,
  '%_of': 4,
  of: 3.5,
  '^': 5
};

/**
 * Convert a non-negative integer (up to crores) into natural spoken English words.
 */
export function numberToWords(num: number): string {
  if (!Number.isFinite(num)) return 'infinity';
  if (num < 0) return `negative ${numberToWords(Math.abs(num))}`;

  // Handle decimals
  if (!Number.isInteger(num)) {
    const str = String(num);
    const [intPart, decPart] = str.split('.');
    const intWords = numberToWords(parseInt(intPart, 10));
    const digitMap = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const decWords = decPart
      .split('')
      .map((d) => digitMap[parseInt(d, 10)] ?? d)
      .join(' ');
    return `${intWords} point ${decWords}`;
  }

  if (num === 0) return 'zero';

  const ones = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen'
  ];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (num < 20) return ones[num];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const r = num % 10;
    return r === 0 ? tens[t] : `${tens[t]}-${ones[r]}`;
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const r = num % 100;
    return r === 0 ? `${ones[h]} hundred` : `${ones[h]} hundred ${numberToWords(r)}`;
  }
  if (num < 100000) {
    const th = Math.floor(num / 1000);
    const r = num % 1000;
    return r === 0 ? `${numberToWords(th)} thousand` : `${numberToWords(th)} thousand ${numberToWords(r)}`;
  }
  if (num < 10000000) {
    const lk = Math.floor(num / 100000);
    const r = num % 100000;
    return r === 0 ? `${numberToWords(lk)} lakh` : `${numberToWords(lk)} lakh ${numberToWords(r)}`;
  }
  const cr = Math.floor(num / 10000000);
  const r = num % 10000000;
  return r === 0 ? `${numberToWords(cr)} crore` : `${numberToWords(cr)} crore ${numberToWords(r)}`;
}

/**
 * Checks whether a single word is part of a spoken number phrase.
 */
export function isNumberWord(word: string): boolean {
  const w = word.toLowerCase();
  return (
    w in ONES_WORDS ||
    w in TENS_WORDS ||
    w in SCALE_WORDS ||
    w === 'point' ||
    w === 'decimal' ||
    /^-?\d+(\.\d+)?$/.test(w)
  );
}

/**
 * Parses a sequence of number words (including "point" decimals) into a numeric value.
 * Examples:
 * - ["forty", "nine"] -> 49
 * - ["two", "hundred"] -> 200
 * - ["one", "hundred", "and", "twenty", "five"] -> 125
 * - ["zero", "point", "zero", "two", "four"] -> 0.024
 * - ["three", "point", "five"] -> 3.5
 */
export function parseNumberWordSequence(words: string[]): number | null {
  if (words.length === 0) return null;

  // Direct numeric literal
  if (words.length === 1 && /^-?\d+(\.\d+)?$/.test(words[0])) {
    return Number(words[0]);
  }

  const pointIdx = words.findIndex((w) => w === 'point' || w === 'decimal');
  if (pointIdx !== -1) {
    const intWords = words.slice(0, pointIdx);
    const decWords = words.slice(pointIdx + 1);
    const intVal = intWords.length === 0 ? 0 : parseWholeNumberWords(intWords);
    if (intVal === null) return null;

    if (decWords.length === 0) return intVal;

    // If decimal part is single multi-digit word like "twenty five" -> .25, or digit-by-digit "zero two four" -> .024
    let decString = '';
    const allSingleDigits = decWords.every((w) => (w in ONES_WORDS && ONES_WORDS[w] < 10) || /^\d+$/.test(w));
    if (allSingleDigits) {
      for (const dw of decWords) {
        decString += dw in ONES_WORDS ? String(ONES_WORDS[dw]) : dw;
      }
    } else {
      const decVal = parseWholeNumberWords(decWords);
      if (decVal === null) return null;
      decString = String(decVal);
    }

    return Number(`${intVal}.${decString}`);
  }

  return parseWholeNumberWords(words);
}

function parseWholeNumberWords(words: string[]): number | null {
  let total = 0;
  let current = 0;
  let matchedAny = false;

  for (const raw of words) {
    const w = raw.toLowerCase();
    if (w === 'and') continue;

    if (/^\d+$/.test(w)) {
      current = current * 10 + parseInt(w, 10);
      matchedAny = true;
    } else if (w in ONES_WORDS) {
      current += ONES_WORDS[w];
      matchedAny = true;
    } else if (w in TENS_WORDS) {
      current += TENS_WORDS[w];
      matchedAny = true;
    } else if (w === 'hundred') {
      current = (current === 0 ? 1 : current) * 100;
      matchedAny = true;
    } else if (w in SCALE_WORDS) {
      const scale = SCALE_WORDS[w];
      total += (current === 0 ? 1 : current) * scale;
      current = 0;
      matchedAny = true;
    } else {
      return null;
    }
  }

  return matchedAny ? total + current : null;
}

/**
 * SSC MTS Topic-Specific Vocabulary & Formula Reference Map (Phase 11)
 */
export const SSC_MTS_MATH_TOPICS_VOCABULARY: Record<
  string,
  {
    keywords: string[];
    spokenTemplates: string[];
    canonicalFormulas: string[];
  }
> = {
  'Number Systems': {
    keywords: ['unit digit', 'remainder', 'divisible by', 'prime', 'coprime', 'digits'],
    spokenTemplates: ['a mod b', 'dividend equals divisor times quotient plus remainder'],
    canonicalFormulas: ['Dividend = Divisor * Quotient + Remainder']
  },
  Simplification: {
    keywords: ['bodmas', 'simplify', 'evaluate', 'bracket', 'of', 'fraction'],
    spokenTemplates: ['open bracket a plus b close bracket divided by c'],
    canonicalFormulas: ['(a + b)^2 = a^2 + 2ab + b^2', 'a^2 - b^2 = (a - b)(a + b)']
  },
  'LCM and HCF': {
    keywords: ['lcm', 'hcf', 'gcd', 'least common multiple', 'highest common factor'],
    spokenTemplates: ['lcm of a and b', 'hcf of a and b'],
    canonicalFormulas: ['LCM(a, b) * HCF(a, b) = a * b']
  },
  'Fractions and Decimals': {
    keywords: ['vulgar fraction', 'recurring decimal', 'numerator', 'denominator', 'divided by'],
    spokenTemplates: ['three divided by four', 'zero point three three'],
    canonicalFormulas: ['a/b + c/d = (a*d + b*c) / (b*d)']
  },
  Percentages: {
    keywords: ['percent', 'percentage', 'percent of', 'increased by', 'decreased by'],
    spokenTemplates: ['twenty-five percent of two hundred'],
    canonicalFormulas: ['x% of y = (x / 100) * y']
  },
  'Ratio and Proportion': {
    keywords: ['ratio', 'is to', 'proportional', 'mean proportional', 'fourth proportional'],
    spokenTemplates: ['a is to b equals three is to four'],
    canonicalFormulas: ['a : b = c : d => a * d = b * c', 'Mean Proportional = sqrt(a * b)']
  },
  Average: {
    keywords: ['average', 'mean', 'consecutive numbers', 'sum of observations'],
    spokenTemplates: ['sum divided by count'],
    canonicalFormulas: ['Average = Sum of Observations / Number of Observations']
  },
  'Profit and Loss': {
    keywords: ['cost price', 'selling price', 'profit percent', 'loss percent', 'marked price', 'discount'],
    spokenTemplates: ['profit divided by cost price multiplied by one hundred'],
    canonicalFormulas: ['Profit % = ((SP - CP) / CP) * 100', 'Loss % = ((CP - SP) / CP) * 100']
  },
  'Simple Interest': {
    keywords: ['principal', 'rate', 'time', 'simple interest', 'compound interest', 'amount'],
    spokenTemplates: ['principal times rate times time divided by one hundred'],
    canonicalFormulas: ['SI = (P * R * T) / 100', 'A = P * (1 + R/100)^T']
  },
  'Time and Work': {
    keywords: ['work', 'days', 'efficiency', 'pipes', 'cistern'],
    spokenTemplates: ['one divided by a plus one divided by b'],
    canonicalFormulas: ['Combined Rate = 1/A + 1/B = (A + B) / (A * B)']
  },
  'Time, Speed and Distance': {
    keywords: ['speed', 'distance', 'time', 'average speed', 'km per hour', 'meters per second'],
    spokenTemplates: ['distance divided by time', 'two x y divided by open bracket x plus y close bracket'],
    canonicalFormulas: ['Speed = Distance / Time', 'Average Speed = (2 * x * y) / (x + y)']
  },
  Mensuration: {
    keywords: ['area', 'perimeter', 'volume', 'surface area', 'circle', 'radius', 'pi', 'cylinder', 'cone', 'sphere'],
    spokenTemplates: ['pi times r squared', 'four divided by three times pi times r cubed'],
    canonicalFormulas: ['Area of Circle = pi * r^2', 'Volume of Sphere = (4/3) * pi * r^3']
  },
  'Basic Algebra': {
    keywords: ['equation', 'solve for x', 'linear', 'quadratic', 'polynomial', 'roots'],
    spokenTemplates: ['two x plus five equals fifteen', 'x squared plus five equals fourteen'],
    canonicalFormulas: ['a*x + b = c => x = (c - b) / a']
  },
  Geometry: {
    keywords: ['angle', 'triangle', 'supplementary', 'complementary', 'pythagoras', 'hypotenuse'],
    spokenTemplates: ['square root of a squared plus b squared'],
    canonicalFormulas: ['c = sqrt(a^2 + b^2)']
  },
  'Data Interpretation': {
    keywords: ['table', 'bar chart', 'pie chart', 'central angle', 'ratio', 'percentage growth'],
    spokenTemplates: ['final minus initial all divided by initial multiplied by one hundred'],
    canonicalFormulas: ['Growth % = ((Final - Initial) / Initial) * 100']
  }
};

