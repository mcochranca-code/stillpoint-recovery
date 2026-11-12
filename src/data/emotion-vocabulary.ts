import type { Mood } from '../domain/types';

export interface EmotionNuance {
  id: string;
  label: string;
  definition: string;
}

export interface EmotionGroup {
  id: Mood;
  label: string;
  definition: string;
  words: EmotionNuance[];
}

export interface EmotionTerm {
  id: string;
  label: string;
  definition: string;
  parent: Mood;
  broad: boolean;
}

/**
 * An invitation to find words, not a clinical checklist. Definitions describe common
 * everyday usage; they do not diagnose or predict anything about the person choosing them.
 */
export const emotionGroups: EmotionGroup[] = [
  {
    id: 'sad', label: 'Sad',
    definition: 'A feeling that can come with loss, disappointment, loneliness, or something that matters to you. It may be heavy, quiet, or mixed with other feelings.',
    words: [
      { id: 'depressed', label: 'Depressed', definition: 'A deeply low or weighed-down state, sometimes with less energy or interest. Here this is an everyday word to explore, not a diagnosis.' },
      { id: 'melancholy', label: 'Melancholy', definition: 'A quiet, thoughtful kind of sadness that may not have one clear cause.' },
      { id: 'melancholic', label: 'Melancholic', definition: 'Marked by a quiet, thoughtful sadness that may not have one clear cause.' },
      { id: 'apathetic', label: 'Apathetic', definition: 'Feeling little interest or emotional energy, even about things that usually matter to you.' },
      { id: 'bored', label: 'Bored', definition: 'Feeling under-stimulated or not engaged. Boredom can sit alongside sadness or restlessness.' },
      { id: 'disappointed', label: 'Disappointed', definition: 'Feeling let down when something did not happen as you hoped.' },
      { id: 'discouraged', label: 'Discouraged', definition: 'Feeling less confident or hopeful after a difficulty or setback.' },
      { id: 'grief-stricken', label: 'Grief-stricken', definition: 'Feeling intense sorrow after a loss or a major change.' },
      { id: 'tender', label: 'Tender', definition: 'Feeling emotionally sensitive or easily moved, sometimes close to tears.' },
    ],
  },
  {
    id: 'anxious', label: 'Anxious',
    definition: 'A feeling of unease or worry when something feels uncertain, threatening, or hard to manage.',
    words: [
      { id: 'worried', label: 'Worried', definition: 'Turning over a possible problem or outcome in your mind.' },
      { id: 'uneasy', label: 'Uneasy', definition: 'Not fully settled; something feels a little wrong or uncertain.' },
      { id: 'on-edge', label: 'On edge', definition: 'Tense and watchful, as if it is hard to relax.' },
      { id: 'restless', label: 'Restless', definition: 'Finding it hard to be still or settle your attention.' },
      { id: 'apprehensive', label: 'Apprehensive', definition: 'Expecting that something difficult may happen and feeling cautious about it.' },
      { id: 'uncertain', label: 'Uncertain', definition: 'Not knowing what to expect or which way to go.' },
      { id: 'panicky', label: 'Panicky', definition: 'Feeling a sudden wave of alarm or urgency. Choosing this word is not a diagnosis.' },
    ],
  },
  {
    id: 'angry', label: 'Angry',
    definition: 'A strong response to a boundary, frustration, hurt, or something that feels unfair.',
    words: [
      { id: 'irritated', label: 'Irritated', definition: 'Mildly angry or bothered, often by something repeated or uncomfortable.' },
      { id: 'frustrated', label: 'Frustrated', definition: 'Upset because progress feels blocked or something is not working.' },
      { id: 'resentful', label: 'Resentful', definition: 'Carrying hurt or anger about a situation that feels unfair or unresolved.' },
      { id: 'betrayed', label: 'Betrayed', definition: 'Hurt and angry because trust feels broken.' },
      { id: 'powerless', label: 'Powerless', definition: 'Feeling that you have little say or control in a situation.' },
      { id: 'impatient', label: 'Impatient', definition: 'Wanting something to move or change faster than it is.' },
    ],
  },
  {
    id: 'tired', label: 'Tired',
    definition: 'A need for rest that may be physical, emotional, or both.',
    words: [
      { id: 'depleted', label: 'Depleted', definition: 'Feeling that your energy or reserves have been used up.' },
      { id: 'worn-out', label: 'Worn out', definition: 'Very tired after strain, effort, or a demanding stretch.' },
      { id: 'foggy', label: 'Foggy', definition: 'Having trouble focusing or finding clear thoughts.' },
      { id: 'emotionally-exhausted', label: 'Emotionally exhausted', definition: 'Feeling worn down from carrying strong feelings or caring for others.' },
      { id: 'overstimulated', label: 'Overstimulated', definition: 'Feeling overloaded by noise, activity, demands, or information.' },
      { id: 'sleepy', label: 'Sleepy', definition: 'Feeling ready to rest or having trouble staying alert.' },
    ],
  },
  {
    id: 'lonely', label: 'Lonely',
    definition: 'Wanting connection or closeness and not feeling enough of it right now.',
    words: [
      { id: 'isolated', label: 'Isolated', definition: 'Feeling cut off from people, support, or a sense of belonging.' },
      { id: 'unseen', label: 'Unseen', definition: 'Feeling that others may not notice or understand what is happening for you.' },
      { id: 'disconnected', label: 'Disconnected', definition: 'Feeling distant from people, activities, or your usual sense of self.' },
      { id: 'longing', label: 'Longing', definition: 'Strongly wishing for someone, something, or a kind of closeness.' },
      { id: 'left-out', label: 'Left out', definition: 'Feeling excluded from a group, plan, or conversation.' },
    ],
  },
  {
    id: 'numb', label: 'Numb',
    definition: 'Feeling little emotional sensation or feeling distant from what is happening inside.',
    words: [
      { id: 'detached', label: 'Detached', definition: 'Feeling separated from a situation or your emotions.' },
      { id: 'blank', label: 'Blank', definition: 'Having no clear feeling or thought come to mind right now.' },
      { id: 'indifferent', label: 'Indifferent', definition: 'Feeling that something does not matter much to you in this moment.' },
      { id: 'shut-down', label: 'Shut down', definition: 'Feeling unable or unwilling to take in more after too much strain.' },
      { id: 'distant', label: 'Distant', definition: 'Feeling far away from people or from what is happening around you.' },
    ],
  },
  {
    id: 'overwhelmed', label: 'Overwhelmed',
    definition: 'Feeling that the demands, feelings, or choices in front of you are more than you can comfortably hold at once.',
    words: [
      { id: 'overloaded', label: 'Overloaded', definition: 'Having more tasks, information, or needs to carry than feels manageable.' },
      { id: 'scattered', label: 'Scattered', definition: 'Finding it difficult to gather your attention or choose where to begin.' },
      { id: 'pressured', label: 'Pressured', definition: 'Feeling pushed by expectations, time, or other people’s needs.' },
      { id: 'flooded', label: 'Flooded', definition: 'Experiencing more emotion or sensation than feels easy to sort through.' },
      { id: 'stuck', label: 'Stuck', definition: 'Feeling unable to see a next step or move forward right now.' },
    ],
  },
  {
    id: 'ashamed', label: 'Ashamed',
    definition: 'Feeling exposed or diminished because of something you believe about yourself or something that happened.',
    words: [
      { id: 'guilty', label: 'Guilty', definition: 'Feeling responsible or regretful about an action or choice.' },
      { id: 'embarrassed', label: 'Embarrassed', definition: 'Feeling uncomfortable because you think others noticed a mistake or awkward moment.' },
      { id: 'exposed', label: 'Exposed', definition: 'Feeling seen in a way that leaves you vulnerable or unprotected.' },
      { id: 'self-critical', label: 'Self-critical', definition: 'Speaking to yourself harshly or focusing on what you think you did wrong.' },
      { id: 'unworthy', label: 'Unworthy', definition: 'Feeling undeserving of care or belonging, even though the feeling is not a measure of your worth.' },
    ],
  },
  {
    id: 'hopeful', label: 'Hopeful',
    definition: 'Seeing some possibility for change, support, or a future that could be different.',
    words: [
      { id: 'optimistic', label: 'Optimistic', definition: 'Expecting that something may work out or improve.' },
      { id: 'encouraged', label: 'Encouraged', definition: 'Feeling more able to continue because of support or a small sign of progress.' },
      { id: 'curious', label: 'Curious', definition: 'Wanting to learn or notice what may happen next.' },
      { id: 'open', label: 'Open', definition: 'Willing to consider a possibility without needing to decide yet.' },
      { id: 'expectant', label: 'Expectant', definition: 'Looking toward something that may be coming.' },
    ],
  },
  {
    id: 'peaceful', label: 'Peaceful',
    definition: 'Feeling relatively calm, safe, or untroubled in this moment.',
    words: [
      { id: 'calm', label: 'Calm', definition: 'Feeling settled, with less urgency or tension than before.' },
      { id: 'at-ease', label: 'At ease', definition: 'Comfortable enough to let your guard soften for a while.' },
      { id: 'settled', label: 'Settled', definition: 'Feeling that things are quiet enough inside or around you.' },
      { id: 'relieved', label: 'Relieved', definition: 'Feeling some release after worry, strain, or uncertainty eases.' },
      { id: 'safe', label: 'Safe', definition: 'Feeling protected or secure in the place or company you are in.' },
    ],
  },
  {
    id: 'steady', label: 'Steady',
    definition: 'Feeling grounded enough to meet the next moment, even if everything is not certain.',
    words: [
      { id: 'grounded', label: 'Grounded', definition: 'Connected to what is happening here and now.' },
      { id: 'present', label: 'Present', definition: 'Able to give some attention to this moment.' },
      { id: 'patient', label: 'Patient', definition: 'Willing to let a process take the time it takes.' },
      { id: 'capable', label: 'Capable', definition: 'Feeling able to take one manageable step.' },
      { id: 'balanced', label: 'Balanced', definition: 'Feeling that different needs or feelings are in workable proportion.' },
    ],
  },
  {
    id: 'grateful', label: 'Grateful',
    definition: 'Noticing something, someone, or some part of life that you appreciate.',
    words: [
      { id: 'appreciative', label: 'Appreciative', definition: 'Recognizing value or care in something that is present.' },
      { id: 'thankful', label: 'Thankful', definition: 'Feeling gratitude toward someone or for something that happened.' },
      { id: 'moved', label: 'Moved', definition: 'Touched by an act, memory, or moment that matters to you.' },
      { id: 'content', label: 'Content', definition: 'Feeling a modest sense of enough in this moment.' },
      { id: 'warm', label: 'Warm', definition: 'Feeling affection, kindness, or closeness toward someone or something.' },
    ],
  },
];

export function getEmotionTerm(id: string): EmotionTerm | undefined {
  for (const group of emotionGroups) {
    if (group.id === id) return { id, label: group.label, definition: group.definition, parent: group.id, broad: true };
    const nuance = group.words.find((word) => word.id === id);
    if (nuance) return { ...nuance, parent: group.id, broad: false };
  }
  return undefined;
}
