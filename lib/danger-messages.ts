// lib/danger-messages.ts — 危險路段警示文案（Phase 8，v3.0 A5，小學生可理解）

export interface DangerMessage {
  title: string;
  subtitle: string;
  action: string;
  button: string;
}

export const DANGER_MESSAGES: Record<
  'high' | 'medium' | 'low' | 'restricted',
  { zh: DangerMessage; en: DangerMessage }
> = {
  high: {
    zh: {
      title: '⚠️ 這段路很危險！',
      subtitle: '這裡最近幾年發生過很多次交通事故',
      action: '建議你：靠邊騎、放慢速度、注意前後方的車',
      button: '好，我會小心的',
    },
    en: {
      title: '⚠️ High Risk Road Ahead!',
      subtitle: 'This section has had many accidents in recent years',
      action: 'Tip: Stay to the right, slow down, watch for traffic',
      button: "Got it, I'll be careful",
    },
  },
  medium: {
    zh: {
      title: '🔶 這段路要注意',
      subtitle: '這裡曾經發生過一些交通事故',
      action: '建議你：保持警覺，不要分心',
      button: '知道了',
    },
    en: {
      title: '🔶 Stay Alert Here',
      subtitle: 'This section has had some accidents',
      action: 'Tip: Stay focused and alert',
      button: 'Understood',
    },
  },
  low: {
    zh: {
      title: '🟡 這段路請留意',
      subtitle: '這裡偶爾有交通事故',
      action: '建議你：保持基本警覺',
      button: '知道了',
    },
    en: {
      title: '🟡 Take Care Here',
      subtitle: 'Occasional accidents reported on this section',
      action: 'Tip: Ride with normal caution',
      button: 'Understood',
    },
  },
  restricted: {
    zh: {
      title: '🚫 這裡不能騎腳踏車',
      subtitle: '這是國道/快速道路，法律規定腳踏車不能走',
      action: '請走旁邊的省道或縣道，有替代路線可以繞行',
      button: '好，我去找別的路',
    },
    en: {
      title: '🚫 No Bicycles Allowed',
      subtitle: 'This is a national highway - bicycles are prohibited by law',
      action: 'Please use the nearby provincial or county road instead',
      button: "OK, I'll find another way",
    },
  },
};
