export function getOptimalSendTime(location: string = 'Bangalore'): Date {
  const timezoneMap: Record<string, string> = {
    bangalore: 'Asia/Kolkata',
    mumbai: 'Asia/Kolkata',
    delhi: 'Asia/Kolkata',
    india: 'Asia/Kolkata',
    sydney: 'Australia/Sydney',
    australia: 'Australia/Sydney',
    us: 'America/New_York',
    remote: 'Asia/Kolkata',
  };

  const locClean = location.toLowerCase().trim();
  let tz = 'Asia/Kolkata'; // default
  for (const [key, value] of Object.entries(timezoneMap)) {
    if (locClean.includes(key)) {
      tz = value;
      break;
    }
  }

  const now = new Date();
  
  // Shift to target timezone's perspective
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  let parts;
  try {
    parts = formatter.formatToParts(now);
  } catch (e) {
    // Fallback if IANA timezone is invalid
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }).formatToParts(now);
  }

  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
  
  const targetYear = getPart('year');
  const targetMonth = getPart('month') - 1; // 0-indexed
  const targetDay = getPart('day');
  const targetHour = getPart('hour');
  const targetMin = getPart('minute');
  
  const localTarget = new Date(targetYear, targetMonth, targetDay, targetHour, targetMin);
  
  let daysToAdd = 0;
  const targetWeekday = localTarget.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday...
  
  const isGoodDay = targetWeekday >= 2 && targetWeekday <= 4;
  const isBeforeTargetTime = targetHour < 9 || (targetHour === 9 && targetMin < 30);
  
  if (isGoodDay && isBeforeTargetTime) {
    daysToAdd = 0;
  } else {
    if (targetWeekday === 0) { // Sunday -> Tuesday is 2 days
      daysToAdd = 2;
    } else if (targetWeekday === 1) { // Monday -> Tuesday is 1 day
      daysToAdd = 1;
    } else if (targetWeekday === 2) { // Tuesday -> Wednesday is 1 day
      daysToAdd = 1;
    } else if (targetWeekday === 3) { // Wednesday -> Thursday is 1 day
      daysToAdd = 1;
    } else if (targetWeekday === 4) { // Thursday -> next Tuesday is 5 days
      daysToAdd = 5;
    } else if (targetWeekday === 5) { // Friday -> next Tuesday is 4 days
      daysToAdd = 4;
    } else if (targetWeekday === 6) { // Saturday -> next Tuesday is 3 days
      daysToAdd = 3;
    }
  }
  
  const optimalDate = new Date(localTarget);
  optimalDate.setDate(optimalDate.getDate() + daysToAdd);
  optimalDate.setHours(9, 30, 0, 0);
  
  const targetOffset = now.getTime() - localTarget.getTime();
  const resultDate = new Date(optimalDate.getTime() + targetOffset);
  
  return resultDate;
}
