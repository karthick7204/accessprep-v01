/**
 * Robust Answer and Voice Control Parser for SSC MTS Questions.
 * Supports letter matching, ordinals, content fuzzy matching, and control commands.
 */

export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export type ParsedVoiceResult =
  | { type: 'option'; option: 'A' | 'B' | 'C' | 'D'; matchedBy: 'letter' | 'ordinal' | 'content' }
  | {
      type: 'control';
      command:
        | 'repeat'
        | 'repeat_options'
        | 'repeat_option_a'
        | 'repeat_option_b'
        | 'repeat_option_c'
        | 'repeat_option_d'
        | 'read_slower'
        | 'pause_reading'
        | 'resume_reading'
        | 'stop_speaking'
        | 'skip'
        | 'previous'
        | 'mark_review'
        | 'timer'
        | 'submit'
        | 'review'
        | 'help';
    }
  | null;

function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseSpokenAnswer(transcript: string, options?: QuestionOptions): ParsedVoiceResult {
  if (!transcript) return null;
  const clean = cleanString(transcript);

  // 1. Specific Individual Option Repeat Commands (A, B, C, D)
  // Examples: "Repeat Option A", "Read Option B", "What is option A?", "Read answer choice C", "Repeat choice D", "Option B again"
  const optMatch =
    clean.match(
      /\b(?:repeat|read|what\s+is|what\s+does|say|tell\s+me|speak|hear|listen\s+to|replay)\s+(?:the\s+)?(?:answer\s+)?(?:option|choice)\s+([a-d])\b/
    ) ||
    clean.match(
      /\b(?:answer\s+)?(?:option|choice)\s+([a-d])\s+(?:again|repeat|aloud)\b/
    );
  if (optMatch && optMatch[1]) {
    const optLetter = optMatch[1].toLowerCase();
    return { type: 'control', command: `repeat_option_${optLetter}` as any };
  }

  if (
    clean === 'repeat option a' ||
    clean === 'read option a' ||
    clean === 'repeat choice a' ||
    clean === 'read choice a' ||
    clean === 'repeat answer choice a' ||
    clean === 'read answer choice a' ||
    clean === 'what is option a' ||
    clean === 'what is choice a' ||
    clean === 'what is answer choice a' ||
    clean === 'option a again' ||
    clean === 'choice a again'
  ) {
    return { type: 'control', command: 'repeat_option_a' };
  }

  if (
    clean === 'repeat option b' ||
    clean === 'read option b' ||
    clean === 'repeat choice b' ||
    clean === 'read choice b' ||
    clean === 'repeat answer choice b' ||
    clean === 'read answer choice b' ||
    clean === 'what is option b' ||
    clean === 'what is choice b' ||
    clean === 'what is answer choice b' ||
    clean === 'option b again' ||
    clean === 'choice b again'
  ) {
    return { type: 'control', command: 'repeat_option_b' };
  }

  if (
    clean === 'repeat option c' ||
    clean === 'read option c' ||
    clean === 'repeat choice c' ||
    clean === 'read choice c' ||
    clean === 'repeat answer choice c' ||
    clean === 'read answer choice c' ||
    clean === 'what is option c' ||
    clean === 'what is choice c' ||
    clean === 'what is answer choice c' ||
    clean === 'option c again' ||
    clean === 'choice c again'
  ) {
    return { type: 'control', command: 'repeat_option_c' };
  }

  if (
    clean === 'repeat option d' ||
    clean === 'read option d' ||
    clean === 'repeat choice d' ||
    clean === 'read choice d' ||
    clean === 'repeat answer choice d' ||
    clean === 'read answer choice d' ||
    clean === 'what is option d' ||
    clean === 'what is choice d' ||
    clean === 'what is answer choice d' ||
    clean === 'option d again' ||
    clean === 'choice d again'
  ) {
    return { type: 'control', command: 'repeat_option_d' };
  }

  // 2. All Options Repeat Commands ("Repeat Option", "Repeat Options", "Read Options Again", "Repeat Answer Choices")
  if (
    clean === 'repeat option' ||
    clean === 'repeat options' ||
    clean === 'repeat the option' ||
    clean === 'repeat the options' ||
    clean === 'read option' ||
    clean === 'read options' ||
    clean === 'read the option' ||
    clean === 'read the options' ||
    clean === 'read option again' ||
    clean === 'read options again' ||
    clean === 'read the options again' ||
    clean === 'repeat option again' ||
    clean === 'repeat options again' ||
    clean === 'repeat answer choices' ||
    clean === 'repeat the answer choices' ||
    clean === 'read answer choices' ||
    clean === 'read the answer choices' ||
    clean === 'read answer choices again' ||
    clean === 'repeat answer choices again' ||
    clean === 'repeat answer options' ||
    clean === 'read answer options' ||
    clean === 'repeat all options' ||
    clean === 'read all options' ||
    clean === 'repeat all choices' ||
    clean === 'read all choices' ||
    clean === 'what are the options' ||
    clean === 'what are the choices' ||
    clean === 'what are the answer choices' ||
    clean === 'list options' ||
    clean === 'options again' ||
    clean === 'choices again' ||
    clean === 'answer choices again' ||
    clean === 'read choices' ||
    clean === 'read the choices' ||
    clean === 'repeat choices' ||
    clean === 'repeat the choices' ||
    /\b(?:repeat|read|what\s+are|say|replay|list)\s+(?:all\s+)?(?:the\s+)?(?:answer\s+)?(?:options|choices|option|choice)\b/.test(
      clean
    )
  ) {
    return { type: 'control', command: 'repeat_options' };
  }

  // 3. Question Repeat Commands ("Repeat Question", "Repeat the Question", "Read Question Again")
  if (
    clean === 'repeat question' ||
    clean === 'repeat the question' ||
    clean === 'read question again' ||
    clean === 'read the question again' ||
    clean === 'repeat question again' ||
    clean === 'read the prompt again' ||
    clean === 'read prompt again' ||
    clean === 'read question' ||
    clean === 'read the question' ||
    clean === 'read prompt' ||
    clean === 'repeat prompt' ||
    clean === 'what was the question' ||
    clean === 'what is the question' ||
    clean === 'say question again' ||
    clean === 'say the question again' ||
    clean === 'replay question' ||
    clean === 'replay the question' ||
    clean === 'repeat' ||
    clean === 'read again' ||
    clean === 'say again' ||
    clean === 'say that again' ||
    /\b(?:repeat|read|say|replay|what\s+is|what\s+was)\s+(?:the\s+)?(?:current\s+)?(?:question|prompt)\b/.test(
      clean
    )
  ) {
    return { type: 'control', command: 'repeat' };
  }

  // 4. Speech Playback Controls
  if (
    clean === 'read slower' ||
    clean === 'speak slower' ||
    clean === 'talk slower' ||
    clean === 'slow down' ||
    clean === 'slower' ||
    /\b(read|speak|talk)\s+slower\b/.test(clean)
  ) {
    return { type: 'control', command: 'read_slower' };
  }

  if (
    clean === 'pause reading' ||
    clean === 'pause speaking' ||
    clean === 'pause speech' ||
    clean === 'pause audio' ||
    clean === 'pause' ||
    /\bpause\s+(reading|speaking|speech|audio)\b/.test(clean)
  ) {
    return { type: 'control', command: 'pause_reading' };
  }

  if (
    clean === 'resume reading' ||
    clean === 'resume speaking' ||
    clean === 'resume speech' ||
    clean === 'continue reading' ||
    clean === 'resume audio' ||
    clean === 'resume' ||
    /\bresume\s+(reading|speaking|speech|audio)\b/.test(clean)
  ) {
    return { type: 'control', command: 'resume_reading' };
  }

  if (
    clean === 'stop reading' ||
    clean === 'stop speaking' ||
    clean === 'stop speech' ||
    clean === 'stop audio' ||
    clean === 'be quiet' ||
    clean === 'silence' ||
    clean === 'stop' ||
    clean === 'mute' ||
    /\bstop\s+(reading|speaking|speech|audio)\b/.test(clean)
  ) {
    return { type: 'control', command: 'stop_speaking' };
  }

  if (
    clean === 'skip' ||
    clean === 'skip question' ||
    clean === 'next' ||
    clean === 'next question' ||
    clean === 'pass'
  ) {
    return { type: 'control', command: 'skip' };
  }

  if (
    clean === 'previous' ||
    clean === 'previous question' ||
    clean === 'back' ||
    clean === 'go back'
  ) {
    return { type: 'control', command: 'previous' };
  }

  if (
    clean.includes('mark for review') ||
    clean.includes('mark this for review') ||
    clean.includes('mark review') ||
    clean.includes('flag question') ||
    clean.includes('review later')
  ) {
    return { type: 'control', command: 'mark_review' };
  }

  if (
    clean.includes('time remaining') ||
    clean.includes('time left') ||
    clean.includes('how much time') ||
    clean === 'timer' ||
    clean === 'time'
  ) {
    return { type: 'control', command: 'timer' };
  }

  if (
    clean === 'submit' ||
    clean === 'submit exam' ||
    clean === 'submit the exam' ||
    clean === 'submit examination' ||
    clean === 'submit the examination' ||
    clean === 'submit test' ||
    clean === 'submit the test' ||
    clean === 'submit pilot demo' ||
    clean === 'submit pilot examination' ||
    clean === 'submit diagnostic' ||
    clean === 'submit diagnostic examination' ||
    clean === 'finish test' ||
    clean === 'finish exam' ||
    clean === 'finish examination' ||
    clean === 'end examination' ||
    clean === 'end exam'
  ) {
    return { type: 'control', command: 'submit' };
  }

  if (clean === 'review' || clean === 'review test' || clean === 'review exam') {
    return { type: 'control', command: 'review' };
  }

  if (clean === 'where am i' || clean === 'help' || clean === 'what can i say') {
    return { type: 'control', command: 'help' };
  }

  // 2. Exact or Prefixed Letter Recognition
  // Check "option a", "choice b", "answer c", "select d", etc.
  const words = clean.split(' ');
  const single = clean.replace(/\s+/g, '');

  if (
    /\b(option\s*a|choice\s*a|answer\s*a|select\s*a)\b/.test(clean) ||
    single === 'a' ||
    words[0] === 'a' && words.length <= 2
  ) {
    return { type: 'option', option: 'A', matchedBy: 'letter' };
  }
  if (
    /\b(option\s*b|choice\s*b|answer\s*b|select\s*b)\b/.test(clean) ||
    single === 'b' ||
    words[0] === 'b' && words.length <= 2 ||
    clean === 'be' || clean === 'bee'
  ) {
    return { type: 'option', option: 'B', matchedBy: 'letter' };
  }
  if (
    /\b(option\s*c|choice\s*c|answer\s*c|select\s*c)\b/.test(clean) ||
    single === 'c' ||
    words[0] === 'c' && words.length <= 2 ||
    clean === 'see' || clean === 'sea'
  ) {
    return { type: 'option', option: 'C', matchedBy: 'letter' };
  }
  if (
    /\b(option\s*d|choice\s*d|answer\s*d|select\s*d)\b/.test(clean) ||
    single === 'd' ||
    words[0] === 'd' && words.length <= 2
  ) {
    return { type: 'option', option: 'D', matchedBy: 'letter' };
  }

  // 3. Ordinal Phrases ("first one", "second one", "third one", "fourth one")
  if (/\b(first\s*one|first\s*option|first\s*choice|1st)\b/.test(clean) || clean === 'one' || clean === '1') {
    return { type: 'option', option: 'A', matchedBy: 'ordinal' };
  }
  if (/\b(second\s*one|second\s*option|second\s*choice|2nd)\b/.test(clean) || clean === 'two' || clean === '2') {
    return { type: 'option', option: 'B', matchedBy: 'ordinal' };
  }
  if (/\b(third\s*one|third\s*option|third\s*choice|3rd)\b/.test(clean) || clean === 'three' || clean === '3') {
    return { type: 'option', option: 'C', matchedBy: 'ordinal' };
  }
  if (/\b(fourth\s*one|fourth\s*option|fourth\s*choice|4th)\b/.test(clean) || clean === 'four' || clean === '4') {
    return { type: 'option', option: 'D', matchedBy: 'ordinal' };
  }

  // 4. Content Matching (Matching words from option text)
  if (options) {
    const optKeys: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    let bestMatch: 'A' | 'B' | 'C' | 'D' | null = null;
    let highestScore = 0;

    for (const key of optKeys) {
      const optClean = cleanString(options[key]);
      if (!optClean) continue;

      // Exact substring match
      if (optClean.length > 2 && (clean.includes(optClean) || optClean.includes(clean))) {
        return { type: 'option', option: key, matchedBy: 'content' };
      }

      // Overlapping significant keywords
      const optWords = optClean.split(' ').filter(w => w.length > 2);
      if (optWords.length > 0) {
        let matchCount = 0;
        for (const w of optWords) {
          if (clean.includes(w)) matchCount++;
        }
        const score = matchCount / optWords.length;
        if (score >= 0.5 && score > highestScore && matchCount >= 1) {
          highestScore = score;
          bestMatch = key;
        }
      }
    }

    if (bestMatch) {
      return { type: 'option', option: bestMatch, matchedBy: 'content' };
    }
  }

  return null;
}

/**
 * Simplified helper returning string command/option code for concise caller matching
 */
export function parseAnswer(transcript: string, options?: QuestionOptions): string | null {
  const res = parseSpokenAnswer(transcript, options);
  if (!res) return null;
  if (res.type === 'option') return res.option;
  if (res.type === 'control') return res.command;
  return null;
}
