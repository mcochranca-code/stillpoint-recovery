import type { ReadingEntry, RecoveryTheme } from '../../domain/types';

const ARNOLD = 'Sir Edwin Arnold, The Song Celestial (1885)';
const ARNOLD_LICENSE = 'Published 1885; public domain in the United States and worldwide. Text checked against Project Gutenberg eBook #2388. Arnold’s verse translation does not number verses; citations give the standard chapter and verse.';

function gita(verses: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string): ReadingEntry {
  return {
    id: `gita-${verses.replace(/[^0-9]+/g, '-')}`, tradition: 'hindu', kind: 'verbatim', source: 'Bhagavad Gita',
    citation: `Bhagavad Gita ${verses}`, translation: ARNOLD, license: 'public-domain', licenseNote: ARNOLD_LICENSE,
    text, recoveryTheme, reflectionPrompt,
  };
}

/** No verifiably public-domain English Bhagavatam was available, so these are original paraphrases of the cited verses. */
function bhagavatam(verses: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string): ReadingEntry {
  return {
    id: `bhagavatam-${verses.replace(/[^0-9]+/g, '-')}`, tradition: 'hindu', kind: 'paraphrase', source: 'Srimad Bhagavatam',
    citation: `Srimad Bhagavatam ${verses}`,
    translation: 'Original paraphrase by Stillpoint of the cited Sanskrit verses; not a quotation from any published translation.',
    license: 'original-mit', licenseNote: 'Original Stillpoint wording, released under the project’s MIT license. The Sanskrit source is ancient and public domain.',
    text, recoveryTheme, reflectionPrompt,
  };
}

export const hinduReadings: ReadingEntry[] = [
  gita('2.14', 'This that irks-- Thy sense-life, thrilling to the elements-- Bringing thee heat and cold, sorrows and joys, \'Tis brief and mutable! Bear with it, Prince! As the wise bear.', 'patience',
    'Which feeling today is loud but passing, like heat or cold? How might you bear it for one more hour?'),
  gita('2.47', 'Find full reward Of doing right in right! Let right deeds be Thy motive, not the fruit which comes from them.', 'surrender',
    'What is one right action you can take today without needing to control how it turns out?'),
  gita('2.60–61', 'Yet may it chance, O Son of Kunti! that a governed mind Shall some time feel the sense-storms sweep, and wrest Strong self-control by the roots. Let him regain His kingdom!', 'shame',
    'Even a steady mind can be swept by a storm. If you have slipped, what is one way to regain your kingdom today?'),
  gita('2.62–63', 'If one Ponders on objects of the sense, there springs Attraction; from attraction grows desire, Desire flames to fierce passion, passion breeds Recklessness; then the memory--all betrayed-- Lets noble purpose go, and saps the mind, Till purpose, mind, and man are all undone.', 'craving',
    'Where does a craving usually start for you, long before the moment of choice? What could interrupt it earlier?'),
  gita('2.64–65', 'But, if one deals with objects of the sense Not loving and not hating, making them Serve his free soul, which rests serenely lord, Lo! such a man comes to tranquillity; And out of that tranquillity shall rise The end and healing of his earthly pains.', 'craving',
    'What would it look like to meet a trigger today without either chasing it or fighting it?'),
  gita('3.35', 'Finally, this is better, that one do His own task as he may, even though he fail, Than take tasks not his own, though they seem good.', 'patience',
    'Whose recovery are you comparing yourself to? What is your own task for today?'),
  gita('6.5', 'Let each man raise The Self by Soul, not trample down his Self, Since Soul that is Self\'s friend may grow Self\'s foe.', 'shame',
    'How could you speak to yourself today as a friend instead of a foe?'),
  gita('6.16–17', 'Religion is not his who too much fasts Or too much feasts, nor his who sleeps away An idle mind; nor his who wears to waste His strength in vigils. Nay, Arjuna! call That the true piety which most removes Earth-aches and ills, where one is moderate In eating and in resting, and in sport.', 'patience',
    'Is there one place in your day, such as food, sleep or rest, where a little more balance would help?'),
  gita('6.26', 'But, as often as the heart Breaks--wild and wavering--from control, so oft Let him re-curb it, let him rein it back To the soul\'s governance.', 'craving',
    'However many times your attention wanders toward an old habit today, can you gently bring it back one more time?'),
  gita('6.35', 'Hero long-armed! beyond denial, hard Man\'s heart is to restrain, and wavering; Yet may it grow restrained by habit, Prince! By wont of self-command.', 'patience',
    'Which small daily habit is quietly building your steadiness, even when it feels like nothing is changing?'),
  gita('6.40', 'He is not lost, thou Son of Pritha! No! Nor earth, nor heaven is forfeit, even for him, Because no heart that holds one right desire Treadeth the road of loss!', 'shame',
    'Arjuna asks what happens to someone who tries and falls back. What would it mean to believe that you are not lost?'),
  gita('9.26', 'Whoso shall offer Me in faith and love A leaf, a flower, a fruit, water poured forth, That offering I accept, lovingly made With pious will.', 'gratitude',
    'A leaf or a cup of water is enough when it is offered with love. What small offering can you make today?'),
  gita('12.18–19', 'Who, unto friend and foe Keeping an equal heart, with equal mind Bears shame and glory; with an equal peace Takes heat and cold, pleasure and pain; abides Quit of desires, hears praise or calumny In passionless restraint, unmoved by each.', 'patience',
    'Where could an equal heart, toward praise or criticism, protect your peace today?'),
  gita('16.21', 'The Doors of Hell Are threefold, whereby men to ruin pass,-- The door of Lust, the door of Wrath, the door Of Avarice. Let a man shun those three!', 'craving',
    'Which of these three doors, wanting, anger or grasping, tends to open first for you? What helps you keep it closed?'),
  bhagavatam('1.2.6', 'The highest way of living is loving devotion to the Divine that wants nothing in return and does not stop when things get hard. That kind of devotion is what finally satisfies the self.', 'surrender',
    'What would it mean to offer today’s effort with nothing asked in return?'),
  bhagavatam('10.14.8', 'Someone who keeps waiting for the Lord’s compassion, patiently living through the results of their own past actions, and who keeps bowing in heart, word and body, has a rightful claim to freedom, like an heir to an inheritance.', 'patience',
    'Some consequences of the past still need to be lived through. What helps you stay patient and faithful while they are?'),
  bhagavatam('11.7.37', 'The wandering sage learned from the earth: even when living beings push and harm it, the earth stays steady and keeps giving. A wise person, pressed by others, does not leave their own path.', 'patience',
    'When someone pushes on you today, what would help you stay as steady as the ground?'),
  bhagavatam('11.8.44', 'Clinging hope for what will never satisfy is the deepest kind of misery, and letting that hope go brings the deepest ease. When Pingala finally cut off her longing, she slept in peace.', 'surrender',
    'Is there a hope you keep returning to that only ever hurts? What would it feel like to set it down tonight?'),
  bhagavatam('11.9.1–2', 'A bird of prey carrying a piece of meat was chased and attacked by stronger birds. The moment it let the meat fall, it was left in peace. The sage saw in this that holding on to what others crave brings trouble, and letting go brings rest.', 'craving',
    'What are you holding that keeps inviting trouble? What might happen if you let it fall?'),
];
