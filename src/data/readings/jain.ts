import type { ReadingEntry, RecoveryTheme } from '../../domain/types';

const SBE22 = 'Hermann Jacobi, Gaina Sutras Part I (Sacred Books of the East, vol. 22, 1884)';
const SBE45 = 'Hermann Jacobi, Gaina Sutras Part II (Sacred Books of the East, vol. 45, 1895)';
const LICENSE = (year: number) => `Published ${year}; public domain in the United States and worldwide. Text checked against the Internet Archive scan of the original volume; footnote markers removed.`;

function acaranga(citation: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string): ReadingEntry {
  return {
    id: `acaranga-${citation.replace(/[^0-9]+/g, '-')}`, tradition: 'jain', kind: 'verbatim', source: 'Ācārāṅga Sūtra',
    citation: `Ācārāṅga Sūtra ${citation}`, translation: SBE22, license: 'public-domain', licenseNote: LICENSE(1884),
    text, recoveryTheme, reflectionPrompt,
  };
}

function uttaradhyayana(citation: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string): ReadingEntry {
  return {
    id: `uttaradhyayana-${citation.replace(/[^0-9A-Za-z]+/g, '-').toLowerCase()}`, tradition: 'jain', kind: 'verbatim', source: 'Uttarādhyayana Sūtra',
    citation: `Uttarādhyayana Sūtra ${citation}`, translation: SBE45, license: 'public-domain', licenseNote: LICENSE(1895),
    text, recoveryTheme, reflectionPrompt,
  };
}

function tattvartha(citation: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string): ReadingEntry {
  return {
    id: `tattvartha-${citation.replace(/[^0-9]+/g, '-')}`, tradition: 'jain', kind: 'paraphrase', source: 'Tattvārtha Sūtra',
    citation: `Tattvārtha Sūtra ${citation}`,
    translation: 'Original paraphrase by Stillpoint of the cited sutra; not a quotation from any published translation. Sutra numbering can differ between Śvetāmbara and Digambara editions.',
    license: 'original-mit', licenseNote: 'Original Stillpoint wording, released under the project’s MIT license. The Sanskrit source is ancient and public domain.',
    text, recoveryTheme, reflectionPrompt,
  };
}

export const jainReadings: ReadingEntry[] = [
  acaranga('I.2.3.4', 'All beings are fond of life, like pleasure, hate pain, shun destruction, like life, long to live. To all life is dear.', 'service',
    'Your own life is dear too. How can you protect it, and someone else’s, today?'),
  acaranga('I.3.3.4', 'Man! Thou art thy own friend; why wishest thou for a friend beyond thyself?', 'shame',
    'What would it look like to be a true friend to yourself for the rest of today?'),
  acaranga('I.4.1.1', 'All breathing, existing, living, sentient creatures should not be slain, nor treated with violence, nor abused, nor tormented, nor driven away.', 'service',
    'Non-harm includes the harm we do to ourselves. Which harm could you step back from today?'),
  uttaradhyayana('IX.34', 'Though a man should conquer thousands and thousands of valiant (foes), greater will be his victory if he conquers nobody but himself.', 'craving',
    'What is one inner battle you could win quietly today?'),
  uttaradhyayana('IX.35–36', 'Fight with your Self; why fight with external foes? He who conquers himself through himself, will obtain happiness. The five senses, anger, pride, delusion, and greed—difficult to conquer is one\'s self; but when that is conquered, everything is conquered.', 'craving',
    'Which of these, the senses, anger, pride, delusion or greed, pulls hardest at you today?'),
  uttaradhyayana('X.1', 'As the fallow leaf of the tree falls to the ground, when its days are gone, even so the life of men (will come to its close); Gautama, be careful all the while!', 'patience',
    'Life is short and precious. What deserves your careful attention today?'),
  uttaradhyayana('X.2', 'As a dew-drop dangling on the top of a blade of Kusa-grass lasts but a short time, even so the life of men; Gautama, be careful all the while!', 'gratitude',
    'Notice one fleeting, beautiful thing today, and let it remind you that this day is a gift.'),
  uttaradhyayana('XXIX.17', 'By begging forgiveness he obtains happiness of mind; thereby he acquires a kind disposition towards all kinds of living beings.', 'community',
    'Is there someone you could ask forgiveness of, or forgive, to bring a little peace to your mind?'),
  uttaradhyayana('XXIX.46', 'By patience he overcomes troubles.', 'patience',
    'Which trouble today might ease if you met it with patience instead of force?'),
  uttaradhyayana('XXIX.49', 'By humility he will acquire freedom from self-conceit; thereby he will become of a kind and meek disposition.', 'surrender',
    'Where could humility, such as asking for help or admitting you do not know, make today lighter?'),
  uttaradhyayana('XXIX.67, 70', 'By conquering anger he obtains patience. … By conquering greed he obtains content.', 'craving',
    'Underneath a craving there is often anger or wanting more. What would contentment feel like for one hour?'),
  uttaradhyayana('I.29', 'Wise, fearless monks consider even a rough instruction as a benefit, but the fools hate it, though it produces patience and purity of mind.', 'community',
    'Has someone in your support circle told you something hard to hear? What benefit might be in it?'),
  tattvartha('1.1', 'Right faith, right knowledge and right conduct, held together, make up the path to liberation. None of the three is enough on its own.', 'patience',
    'Is your recovery leaning on one of these, belief, understanding or action, more than the others? What would balance it?'),
  tattvartha('5.21', 'Living beings exist to help one another. Every soul supports and is supported by others.', 'community',
    'Who supported you this week, and who could you support?'),
  tattvartha('7.11', 'Cultivate friendship toward all living beings, joy at the good qualities of others, compassion for those who suffer, and calm equanimity toward those who behave badly.', 'service',
    'Which of these four attitudes would help you most with one person in your life today?'),
  tattvartha('9.6', 'The ten virtues of the path begin with supreme forgiveness and go on through humility, straightforwardness, contentment, truthfulness, self-restraint, austerity, generosity, non-possessiveness and purity of conduct.', 'shame',
    'Which one of these ten virtues could you practise in a small way today, starting with forgiving yourself?'),
];
