import type { ReadingEntry, RecoveryTheme } from '../../domain/types';

/**
 * Original Stillpoint reflections on Red Road and Wellbriety recovery values as they are widely and
 * publicly shared. They do not describe ceremonies, use sacred material, or claim to speak for any
 * nation. The tradition note shown with every entry points readers to Native-led recovery resources.
 */
function reflection(id: string, citation: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string, furtherReading?: string[]): ReadingEntry {
  return {
    id: `red-road-${id}`, tradition: 'red-road', kind: 'original', source: 'Stillpoint original reflection', citation,
    translation: 'Original reflection written by Stillpoint. It does not speak for any nation, elder or ceremony.',
    license: 'original-mit', licenseNote: 'Original Stillpoint text, released under the project’s MIT license.',
    text, recoveryTheme, reflectionPrompt, ...(furtherReading ? { furtherReading } : {}),
  };
}

const GRANDFATHERS = 'On the Seven Grandfather Teachings (Anishinaabe), as widely and publicly shared';
const WELLBRIETY_READING = ['The Red Road to Wellbriety: In the Native American Way (White Bison)'];

export const redRoadReadings: ReadingEntry[] = [
  reflection('walking-the-road', 'On walking the Red Road',
    'Many Native people in recovery speak of walking the Red Road: a way of living with honesty, respect and responsibility to others. It is a road you walk one day at a time, not a finish line. Some days the walking is easy; other days you only manage a few steps. The road is still there in the morning.', 'patience',
    'What would walking in a good way look like for you today, in one small action?', WELLBRIETY_READING),
  reflection('balance', 'On balance and wholeness, a value many Wellbriety teachings share',
    'Recovery is more than not using. Many Native recovery teachings speak of healing the whole person: body, mind, feelings and spirit, each needing care. When one part is neglected, the others feel it. Balance is not perfection. It is noticing which part of you is hungry today and feeding it.', 'craving',
    'Which part of you, body, mind, heart or spirit, most needs care today?', WELLBRIETY_READING),
  reflection('circle', 'On the strength of the circle',
    'In a circle, no one sits at the head, and everyone can see everyone else. Many recovery gatherings in Native communities are held this way for a reason: healing happens together. You do not have to carry your story alone, and your story may be exactly what someone else in the circle needs to hear.', 'community',
    'Who is in your circle right now? Is there someone you could invite in, or reach back to?'),
  reflection('healing-forest', 'On healing the whole community, a theme in Wellbriety teaching',
    'A sick tree cannot get well if it is planted back in sick soil. Wellbriety teachings often speak of healing families and communities, not only individuals. Your recovery is part of something larger: every person who heals makes the ground a little healthier for the next.', 'community',
    'What is one way your recovery could make the soil a little healthier for someone around you?', WELLBRIETY_READING),
  reflection('generations', 'On healing across generations',
    'Some of the pain we carry did not start with us. It may have been handed down through families and through history. Recognizing that is not an excuse; it is a kind of understanding. And the healing you do now can also be handed down, to children, nieces, nephews and grandchildren who will walk a different road because you walked this one.', 'shame',
    'What would you like to hand down to the generations after you?'),
  reflection('gratitude-morning', 'On greeting the day with thanks',
    'Many people on the Red Road begin the day by giving thanks: for waking up, for the land, for the people who came before. Gratitude at the start of the day sets the direction for the rest of it. It does not need special words. A quiet thank you, spoken honestly, is enough.', 'gratitude',
    'Before the day gets busy, what are you thankful for this morning?'),
  reflection('elders-youth', 'On service to elders and young people',
    'Recovery grows stronger when it is given away. Sitting with an elder, listening to a young person, showing up to help with a meal: these are not distractions from recovery; they are part of it. Service turns our attention outward, where it is harder for old patterns to take hold.', 'service',
    'Is there an elder or a young person in your life who could use your time this week?'),
  reflection('wisdom', GRANDFATHERS,
    'Wisdom is one of the Seven Grandfather Teachings. In recovery, wisdom often means knowing what you cannot handle alone, and listening to people who have walked the road longer than you. It grows from experience, including the painful kind.', 'surrender',
    'Whose wisdom could you listen to today?', WELLBRIETY_READING),
  reflection('love', GRANDFATHERS,
    'Love is one of the Seven Grandfather Teachings. Love here begins with how you treat yourself. It is hard to care well for others while treating yourself as worthless. Recovery asks you to love yourself enough to keep going.', 'shame',
    'What is one loving thing you could do for yourself today?'),
  reflection('respect', GRANDFATHERS,
    'Respect is one of the Seven Grandfather Teachings. Respect means honoring all life, including your own body and mind. Choosing not to harm yourself today is a form of respect.', 'craving',
    'How could you show respect to your body today?'),
  reflection('bravery', GRANDFATHERS,
    'Bravery is one of the Seven Grandfather Teachings. In recovery, bravery is rarely loud. It looks like telling the truth, asking for help, or walking into a meeting when every part of you wants to stay home.', 'community',
    'What brave, quiet thing could you do today?'),
  reflection('honesty', GRANDFATHERS,
    'Honesty is one of the Seven Grandfather Teachings. Being honest with yourself comes first: about what you feel, what you need and where you are on the road. Honesty with others grows from there.', 'shame',
    'What is one honest thing you could say about how you are really doing?'),
  reflection('humility', GRANDFATHERS,
    'Humility is one of the Seven Grandfather Teachings. Humility means knowing you are part of creation, not above or below anyone else. In recovery, it means you do not have to be the strongest or the best. You only have to keep walking with others.', 'surrender',
    'Where could you let go of needing to have it all figured out?'),
  reflection('truth', GRANDFATHERS,
    'Truth is one of the Seven Grandfather Teachings. Truth is living by all the other teachings together, even when no one is watching. In recovery, it means your actions start to match your words, one day at a time.', 'patience',
    'Where are your actions and words lining up a little more than they used to?'),
];
