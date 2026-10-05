// Just enough of the browser for the game's code to run outside one: elements the game looks up or
// creates, a Skia-backed <canvas>, and localStorage kept in a JSON file.
import { createCanvas } from '@napi-rs/canvas';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

type Listener = (e: any) => void;

export class FakeElement {
  tagName: string;
  style: Record<string, any> = {};
  textContent = '';
  title = '';
  disabled = false;
  onclick: Listener | null = null;
  children: FakeElement[] = [];
  private html = '';
  private classes = new Set<string>();
  private listeners: Record<string, Listener[]> = {};
  classList = {
    add: (...names: string[]) => names.forEach(n => this.classes.add(n)),
    remove: (...names: string[]) => names.forEach(n => this.classes.delete(n)),
    contains: (name: string) => this.classes.has(name),
  };

  constructor(tag: string) { this.tagName = tag.toUpperCase(); }

  get className() { return [...this.classes].join(' '); }
  set className(v: string) { this.classes = new Set(v.split(/\s+/).filter(Boolean)); }
  get innerHTML() { return this.html; }
  set innerHTML(v: string) { this.html = v; this.children = []; }
  get offsetWidth() { return 0; }

  appendChild(child: FakeElement) { this.children.push(child); return child; }
  append(...children: FakeElement[]) { this.children.push(...children); }
  addEventListener(type: string, fn: Listener) { (this.listeners[type] ??= []).push(fn); }
  dispatch(type: string, event: any) { for (const fn of this.listeners[type] ?? []) fn(event); }
  setPointerCapture() {}
}

export class FakeCanvas extends FakeElement {
  readonly skia = createCanvas(300, 150);
  constructor() { super('canvas'); }
  get width() { return this.skia.width; }
  set width(v: number) { this.skia.width = v; }
  get height() { return this.skia.height; }
  set height(v: number) { this.skia.height = v; }
  getContext(_type: '2d') { return this.skia.getContext('2d'); }
}

export function makeDocument(gameCanvas: FakeCanvas) {
  const byId = new Map<string, FakeElement>([['game', gameCanvas]]);
  return {
    getElementById(id: string) {
      if (!byId.has(id)) byId.set(id, new FakeElement('div'));
      return byId.get(id)!;
    },
    createElement(tag: string) { return tag === 'canvas' ? new FakeCanvas() : new FakeElement(tag); },
  };
}

// Skia only draws emoji from a font that is explicitly named, so append the platform's emoji font to every font
export function addEmojiFallback() {
  const emoji = process.platform === 'darwin' ? 'Apple Color Emoji'
    : process.platform === 'win32' ? 'Segoe UI Emoji' : 'Noto Color Emoji';
  const proto = Object.getPrototypeOf(createCanvas(1, 1).getContext('2d'));
  const font = Object.getOwnPropertyDescriptor(proto, 'font')!;
  Object.defineProperty(proto, 'font', {
    ...font,
    set(v: string) { font.set!.call(this, `${v}, "${emoji}"`); },
  });
}

export function fileStorage(path: string) {
  let data: Record<string, string> = {};
  try { if (existsSync(path)) data = JSON.parse(readFileSync(path, 'utf8')); } catch {}
  return {
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem(key: string, value: string) {
      data[key] = String(value);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(data));
    },
  };
}
