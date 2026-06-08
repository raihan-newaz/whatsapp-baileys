import db from './db';

// Helper to fetch dynamic settings from the database
export async function getSystemSetting(key: string, defaultValue: any = null) {
  try {
    const [rows] = await db.query('SELECT value FROM system_settings WHERE `key` = ?', [key]);
    const row = (rows as any[])[0];
    const rawValue = row?.value ?? defaultValue;
    
    // Attempt to parse JSON if it's a string, otherwise return as is
    if (typeof rawValue === 'string') {
      try {
        return JSON.parse(rawValue);
      } catch {
        return rawValue;
      }
    }
    return rawValue;
  } catch (err) {
    console.error(`[Safety] Failed to fetch setting ${key}:`, err);
    return defaultValue;
  }
}

// 1. Check Emergency Status
export async function checkEmergencyStatus() {
  const controls = await getSystemSetting('emergency_controls', { global_pause: false, disable_sending: false });
  if (controls.disable_sending || controls.global_pause) {
    throw new Error('Platform emergency lock is currently active. Message sending is temporarily disabled.');
  }
}

// 2. Word Filter
export async function checkWordFilter(message: string) {
  const antiSpam = await getSystemSetting('anti_spam', { bad_words: [] });
  const badWords: string[] = antiSpam.bad_words || [];
  
  const lowerMsg = message.toLowerCase();
  for (const word of badWords) {
    if (lowerMsg.includes(word.toLowerCase())) {
      throw new Error(`Message blocked by safety filter. Contains restricted word: "${word}"`);
    }
  }
}

// 3. Dynamic Plan Limits
export async function getPlanLimits(plan: string = 'free_trial', role: string = 'user') {
  const limits = await getSystemSetting('billing_limits', {
    free_trial: { accounts: 1, daily_msgs: 2000, group_extractions: 10, max_contacts: 25000 },
    pro: { accounts: 5, daily_msgs: 5000, group_extractions: 50, max_contacts: 50000 },
    business: { accounts: 12, daily_msgs: 16666, group_extractions: 200, max_contacts: 100000 },
    enterprise: { accounts: 20, daily_msgs: 0, group_extractions: 0, max_contacts: 0 },
    admin: { accounts: 0, daily_msgs: 0, group_extractions: 0, max_contacts: 0 }
  });
  
  // 1. If the specific plan exists in our settings, use it
  if (limits && limits[plan]) {
    return limits[plan];
  }
  
  // 2. Fallback for Admin role if plan not found/invalid
  if (role === 'admin') {
    return limits['admin'] || { accounts: 0, daily_msgs: 0, group_extractions: 0, max_contacts: 0 };
  }
  
  // 3. Ultimate Fallback to Free Trial Plan
  return limits['free_trial'] || limits['free'] || { accounts: 1, daily_msgs: 100, group_extractions: 1, max_contacts: 500 };
}

// 4. Calculate Age-based safe limit
export function calculateAgeBasedLimit(openedDateStr: string): number {
  if (!openedDateStr) return 800;
  try {
    const openedDate = new Date(openedDateStr);
    if (isNaN(openedDate.getTime())) return 800;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - openedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return 200;
    if (diffDays <= 90) return 500;
    return 800;
  } catch {
    return 800;
  }
}

// 5. Calculate Warmup Limit based on session age
export async function calculateWarmupLimit(sessionCreatedAt: string, maxPlanLimit: number, warmupEnabled?: boolean) {
  if (warmupEnabled === false) {
    return maxPlanLimit;
  }
  
  const created = new Date(sessionCreatedAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  if (diffDays > 14) {
    return maxPlanLimit;
  }

  const warmupRules = await getSystemSetting('warmup_rules', { 
    day1: 10, 
    day2: 20, 
    day3: 50, 
    day4: 100,
    day5: 150,
    day6: 200,
    day7: 250,
    day8: 300,
    day9: 350,
    day10: 400,
    day11: 450,
    day12: 500,
    day13: 600,
    day14: 700
  });

  const ruleKey = `day${diffDays}`;
  let warmupLimit = (warmupRules as any)[ruleKey];
  
  if (warmupLimit === undefined) {
    warmupLimit = Math.round(10 + ((diffDays - 1) / 13) * 690);
  }
  
  // Return whichever is stricter (smaller), but only if maxPlanLimit is not 0 (Unlimited)
  if (maxPlanLimit === 0) return warmupLimit;
  return Math.min(warmupLimit, maxPlanLimit);
}

// 5. Spam Repetition Check
export async function checkSpamRepetition(userId: string, messageBody: string) {
  const antiSpam = await getSystemSetting('anti_spam', { max_identical_msgs: 200 });
  const maxIdentical = antiSpam.max_identical_msgs || 200;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [rows] = await db.query(
    'SELECT COUNT(*) as count FROM message_logs WHERE user_id = ? AND message = ? AND sent_at >= ?',
    [userId, messageBody, today]
  );
  
  const count = (rows as any)[0].count || 0;
    
  if (count >= maxIdentical) {
    throw new Error(`Spam detection: Exact identical message sent more than ${maxIdentical} times today.`);
  }
}
