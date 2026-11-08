import type { ReadingEntry, RecoveryTheme } from '../../domain/types';

const MULLER = 'F. Max Müller, The Dhammapada (Sacred Books of the East, vol. 10, 1881)';
const MULLER_LICENSE = 'Published 1881; public domain in the United States and worldwide. Text checked against Project Gutenberg eBook #2017.';

function dhammapada(verse: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string): ReadingEntry {
  return {
    id: `dhammapada-${verse.replace(/[^0-9]+/g, '-')}`, tradition: 'buddhist', kind: 'verbatim', source: 'Dhammapada',
    citation: `Dhammapada, verse ${verse}`, translation: MULLER, license: 'public-domain', licenseNote: MULLER_LICENSE,
    text, recoveryTheme, reflectionPrompt,
  };
}

/**
 * Pema Chödrön's and Thich Nhat Hanh's writings are under copyright. These entries are original
 * Stillpoint reflections on themes they teach. They contain none of the teachers' own words.
 */
function inspired(id: string, teacher: 'Pema Chödrön' | 'Thich Nhat Hanh', theme: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string, furtherReading: string[]): ReadingEntry {
  return {
    id, tradition: 'buddhist', kind: 'original', source: 'Stillpoint original reflection', citation: `On ${theme}`,
    translation: `Original reflection by Stillpoint, inspired by the teachings of ${teacher}. Not written or endorsed by ${teacher}.`,
    license: 'original-mit', licenseNote: 'Original Stillpoint text, released under the project’s MIT license.',
    text, recoveryTheme, reflectionPrompt, inspiredBy: teacher, furtherReading,
  };
}

export const buddhistReadings: ReadingEntry[] = [
  dhammapada('5', 'For hatred does not cease by hatred at any time: hatred ceases by love, this is an old rule.', 'shame',
    'Is there resentment, toward someone else or toward yourself, that you could meet with a little kindness today instead of more anger?'),
  dhammapada('35', 'It is good to tame the mind, which is difficult to hold in and flighty, rushing wherever it listeth; a tamed mind brings happiness.', 'craving',
    'When your mind rushes toward an old habit today, what is one steady thing you can bring it back to?'),
  dhammapada('80', 'Well-makers lead the water (wherever they like); fletchers bend the arrow; carpenters bend a log of wood; wise people fashion themselves.', 'patience',
    'What is one small habit you are shaping right now, the way a carpenter shapes wood, slowly and on purpose?'),
  dhammapada('103', 'If one man conquer in battle a thousand times thousand men, and if another conquer himself, he is the greatest of conquerors.', 'craving',
    'What would a quiet victory over yourself look like today, even a small one?'),
  dhammapada('122', 'Let no man think lightly of good, saying in his heart, It will not come nigh unto me. Even by the falling of water-drops a water-pot is filled; the wise man becomes full of good, even if he gather it little by little.', 'patience',
    'Which small good act today could be one more drop in the pot?'),
  dhammapada('173', 'He whose evil deeds are covered by good deeds, brightens up this world, like the moon when freed from clouds.', 'shame',
    'Past harm does not have the last word. What good deed could you add to your story today?'),
  dhammapada('204', 'Health is the greatest of gifts, contentedness the best riches; trust is the best of relationships, Nirvana the highest happiness.', 'gratitude',
    'Name one way your health, your contentment or a relationship of trust has grown since you started this path.'),
  dhammapada('223', 'Let a man overcome anger by love, let him overcome evil by good; let him overcome the greedy by liberality, the liar by truth!', 'service',
    'Where could generosity or honesty answer a hard moment today?'),
  dhammapada('239', 'Let a wise man blow off the impurities of his self, as a smith blows off the impurities of silver one by one, little by little, and from time to time.', 'patience',
    'Recovery is often little by little. What is one thing you can let go of today, without needing to finish everything at once?'),
  dhammapada('276', 'You yourself must make an effort. The Tathagatas (Buddhas) are only preachers. The thoughtful who enter the way are freed from the bondage of Mara.', 'surrender',
    'Teachers and meetings can point the way. What is the one step that only you can take today?'),
  inspired('inspired-chodron-sharp-points', 'Pema Chödrön', 'leaning into the sharp points',
    'When something hurts, the first instinct is to get away from it as fast as possible: a drink, a scroll, a distraction, anything. Leaning in means doing the opposite for a moment. You turn toward the discomfort, notice where it sits in the body, and stay with it a little longer than feels natural. The sharp point does not have to be solved. It only asks to be felt, and feeling it is often what loosens its grip.', 'craving',
    'Where in your body do you feel today’s discomfort? Can you stay with it for three slow breaths before deciding what to do?',
    ['When Things Fall Apart', 'The Places That Scare You']),
  inspired('inspired-chodron-getting-hooked', 'Pema Chödrön', 'getting hooked',
    'There is a moment, before a craving takes over, when something inside tightens and starts to pull. It is like a hook catching. If you can notice that small catch, the urge has not won yet. You can name it, feel the pull, and pause. Each time you catch the hook a little earlier, the old pattern gets a little weaker.', 'craving',
    'What does the first moment of getting hooked feel like for you? How could you notice it one second sooner today?',
    ['Taking the Leap']),
  inspired('inspired-chodron-start-where-you-are', 'Pema Chödrön', 'starting where you are',
    'You do not need to become a calmer, better or more spiritual person before you begin. The material for practice is the life you already have, including the mess, the shame and the bad days. Starting where you are means today counts exactly as it is.', 'shame',
    'What part of your life have you been waiting to fix before you feel allowed to begin? What if you began with it instead?',
    ['Start Where You Are']),
  inspired('inspired-tnh-breathing', 'Thich Nhat Hanh', 'mindful breathing',
    'Your breath is always with you, and it is always happening now. When a craving or a racing thought pulls you into the past or the future, the breath can bring you home. Breathe in and know you are breathing in. Breathe out and know you are breathing out. Nothing more is needed for this moment.', 'craving',
    'Try three breaths where you simply notice each one coming in and going out. What changed, even a little?',
    ['The Miracle of Mindfulness', 'Peace Is Every Step']),
  inspired('inspired-tnh-interbeing', 'Thich Nhat Hanh', 'interbeing',
    'Nothing exists on its own. The bread on your table holds the sun, the rain, the farmer and the baker. Your recovery is like that too. It holds the people who listened to you, the ones who came before you in the rooms, and the strangers who kept the lights on. You are never recovering alone.', 'community',
    'Who are three people, known or unknown, whose effort is part of your recovery today?',
    ['The Heart of Understanding', 'Interbeing']),
  inspired('inspired-tnh-mud-and-lotus', 'Thich Nhat Hanh', 'suffering and growth',
    'A lotus grows out of mud. It does not grow in spite of the mud; the mud is what feeds it. The hardest parts of your story are not wasted. Held with care, they can become the soil for compassion, for wisdom, and for being able to sit with someone else who is struggling.', 'service',
    'What hard part of your past could become something you offer to someone else who is starting out?',
    ['No Mud, No Lotus']),
  inspired('inspired-tnh-washing-dishes', 'Thich Nhat Hanh', 'everyday mindfulness',
    'Mindfulness is not only for the cushion. It can be found while washing a cup, walking to the bus or folding laundry. When you do one ordinary thing with your full attention, the day slows down enough for you to actually live it, and there is less room for autopilot to take you somewhere you did not choose.', 'gratitude',
    'Pick one ordinary task today and do it slowly, with your full attention. What did you notice?',
    ['The Miracle of Mindfulness']),
];
