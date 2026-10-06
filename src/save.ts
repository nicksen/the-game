// Progress saved in localStorage

const SAVE_KEY = 'smack-the-dummy-v1';
interface Save {
  coins: number;
  unlocked: string[];
  total: number;
  look?: string;
  room?: string;
}
export const save: Save = { coins: 0, unlocked: ['grab', 'punch', 'chicken'], total: 0 };
try {
  Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {});
} catch {}
export function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {}
}
