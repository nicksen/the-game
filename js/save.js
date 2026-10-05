'use strict';
// Progress saved in localStorage

const SAVE_KEY = 'smack-the-dummy-v1';
const save = { coins: 0, unlocked: ['grab', 'punch', 'chicken'], total: 0 };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
