import type { ReadingEntry, RecoveryTheme } from '../../domain/types';

const LONG = 'George Long, The Thoughts of the Emperor Marcus Aurelius Antoninus (1862)';
const LONG_LICENSE = 'Published 1862; public domain in the United States and worldwide. Text checked against Project Gutenberg eBook #15877.';

function meditations(citation: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string): ReadingEntry {
  return {
    id: `meditations-${citation.replace(/[^0-9A-Za-z]+/g, '-').toLowerCase()}`, tradition: 'reflective', kind: 'verbatim',
    source: 'Marcus Aurelius, Meditations', citation: `Meditations ${citation}`, translation: LONG,
    license: 'public-domain', licenseNote: LONG_LICENSE, text, recoveryTheme, reflectionPrompt,
  };
}

function original(id: string, citation: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string): ReadingEntry {
  return {
    id: `reflective-${id}`, tradition: 'reflective', kind: 'original', source: 'Stillpoint original reflection', citation,
    translation: 'Original reflection written by Stillpoint.', license: 'original-mit',
    licenseNote: 'Original Stillpoint text, released under the project’s MIT license.', text, recoveryTheme, reflectionPrompt,
  };
}

export const reflectiveReadings: ReadingEntry[] = [
  meditations('IV.3', 'It is in thy power whenever thou shalt choose to retire into thyself. For nowhere either with more quiet or more freedom from trouble does a man retire than into his own soul.', 'craving',
    'Where is your inner retreat? Can you visit it for one quiet minute before your next decision?'),
  meditations('IV.49', 'Be like the promontory against which the waves continually break, but it stands firm and tames the fury of the water around it.', 'patience',
    'What waves are breaking against you today? What helps you stand firm while they pass?'),
  meditations('IV.49 (continued)', 'Unhappy am I because this has happened to me? Not so, but happy am I, though this has happened to me, because I continue free from pain, neither crushed by the present nor fearing the future.', 'gratitude',
    'Something hard happened, and you are still here. What are you grateful to have kept?'),
  meditations('V.1', 'In the morning when thou risest unwillingly, let this thought be present,--I am rising to the work of a human being.', 'service',
    'What is the work of a human being for you today, the thing worth getting up for?'),
  meditations('VI.19', 'If a thing is difficult to be accomplished by thyself, do not think that it is impossible for man: but if anything is possible for man and conformable to his nature, think that this can be attained by thyself too.', 'patience',
    'Others have recovered from what you are facing. What does that make possible for you?'),
  meditations('VII.7', 'Be not ashamed to be helped; for it is thy business to do thy duty like a soldier in the assault on a town. How then, if being lame thou canst not mount up on the battlements alone, but with the help of another it is possible?', 'community',
    'Where are you trying to climb alone? Who could give you a hand?'),
  meditations('VII.8', 'Let not future things disturb thee, for thou wilt come to them, if it shall be necessary, having with thee the same reason which now thou usest for present things.', 'surrender',
    'Which worry about tomorrow can you set down, trusting you will meet it when it comes?'),
  meditations('VII.59', 'Look within. Within is the fountain of good, and it will ever bubble up, if thou wilt ever dig.', 'shame',
    'Shame says there is nothing good inside. What good have you found when you dug a little?'),
  meditations('VII.69', 'The perfection of moral character consists in this, in passing every day as the last, and in being neither violently excited nor torpid nor playing the hypocrite.', 'patience',
    'If today were the only day that counted, how would you want to spend it?'),
  meditations('VIII.33', 'Receive [wealth or prosperity] without arrogance; and be ready to let it go.', 'surrender',
    'What good thing in your life could you hold a little more lightly?'),
  meditations('VIII.47', 'If thou art pained by any external thing, it is not this thing that disturbs thee, but thy own judgment about it. And it is in thy power to wipe out this judgment now.', 'craving',
    'What story are you telling yourself about today’s trigger? Is there a kinder or truer one?'),
  meditations('X.16', 'No longer talk at all about the kind of man that a good man ought to be, but be such.', 'service',
    'Skip the plan for being better. What is one good thing you can simply do in the next hour?'),
  meditations('XII.17', 'If it is not right, do not do it: if it is not true, do not say it.', 'shame',
    'Is there something not quite true you have been saying to yourself or to others?'),
  original('one-honest-breath', 'On beginning again',
    'You do not need a belief system to begin again. You need one honest look at where you are, one breath, and one next step that is a little kinder than the last. That is enough to start a day, and enough to start over in the middle of one.', 'shame',
    'What is your one next step, a little kinder than the last?'),
  original('people-who-stay', 'On the people who stay',
    'Meaning often lives in the people who stay: the friend who answers late at night, the stranger in a meeting who nods because they understand. Recovery can be a quiet way of becoming one of those people for someone else.', 'community',
    'Who has stayed with you? Who might you stay with?'),
];
