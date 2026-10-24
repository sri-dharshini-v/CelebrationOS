export const EVENT_RITUALS = {
  wedding: [
    { id: 'r_muhurtham', name: 'Muhurtham (auspicious timing)', desc: 'Optional; select only if relevant to your wedding customs' },
    { id: 'r_saptapadi', name: 'Saptapadi / Seven Sacred Vows', desc: 'Optional; select only if relevant to your wedding customs' },
    { id: 'r_haldi', name: 'Haldi / Mangala Snanam', desc: 'Optional; select only if relevant to your wedding customs' },
    { id: 'r_sangeet', name: 'Sangeet / Musical Celebration', desc: 'Optional; select only if relevant to your wedding customs' },
    { id: 'r_deeparadhana', name: 'Deeparadhana / Lamp Lighting', desc: 'Optional; select only if relevant to your wedding customs' },
    { id: 'r_kasi_yathra', name: 'Kashi Yatra Tradition', desc: 'Optional; select only if relevant to your wedding customs' }
  ],
  birthday: [
    { id: 'r_birthday_cake', name: 'Cake or Candle Moment', desc: 'Optional birthday cake or candle tradition' },
    { id: 'r_birthday_song', name: 'Birthday Song', desc: 'Optional shared birthday song' },
    { id: 'r_first_birthday', name: 'First Birthday Milestone', desc: 'Optional first-birthday family custom' }
  ]
};

export const RITUAL_EVENT_TYPES = new Map(
  Object.entries(EVENT_RITUALS).flatMap(([eventType, rituals]) =>
    rituals.map(ritual => [ritual.id, eventType])
  )
);
RITUAL_EVENT_TYPES.set('r_kasi_yathrai', 'wedding');
RITUAL_EVENT_TYPES.set('r_kasi_yathra', 'wedding');

const RITUAL_TASK_EVENT_TYPES = new Map([
  ['t_muhurtham', 'wedding'],
  ['t_saptapadi', 'wedding']
]);
const WEDDING_RITUAL_TERMS = /\b(muhurtam|muhurtham|kashi yatra|kasi yathra|kasi yathrai|saptapadi|mangalsutra|haldi|mangala snanam)\b/i;

export function getEventRituals(eventType) {
  return EVENT_RITUALS[eventType] || [];
}

export function isRitualApplicableToEvent(ritual, eventType) {
  const applicableEventType = RITUAL_EVENT_TYPES.get(ritual?.id);
  return !applicableEventType || !eventType || applicableEventType === eventType;
}

export function filterRitualsForEvent(rituals, eventType) {
  return Array.isArray(rituals)
    ? rituals.filter(ritual => isRitualApplicableToEvent(ritual, eventType))
    : [];
}

export function isRitualTaskApplicableToEvent(task, eventType) {
  if (!eventType) return true;
  if (task?.ritualId) return isRitualApplicableToEvent({ id: task.ritualId }, eventType);

  const applicableEventType = RITUAL_TASK_EVENT_TYPES.get(task?.id);
  if (applicableEventType && applicableEventType !== eventType) return false;
  return eventType === 'wedding' || !WEDDING_RITUAL_TERMS.test(task?.title || '');
}

export function filterRitualTasksForEvent(plan, eventType) {
  if (!Array.isArray(plan?.milestones)) return;
  plan.milestones.forEach(milestone => {
    if (!Array.isArray(milestone.tasks)) return;
    milestone.tasks = milestone.tasks.filter(task =>
      isRitualTaskApplicableToEvent(task, eventType)
    );
  });
}
