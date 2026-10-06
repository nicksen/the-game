// Looks up an element the page always has, checking it's the kind of element the code expects
export function byId<T extends HTMLElement>(id: string, type: new () => T): T {
  const el = document.getElementById(id);
  if (!(el instanceof type)) throw new Error(`#${id} is missing or isn't a ${type.name}`);
  return el;
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error("This browser can't draw 2D graphics on a canvas");
  return context;
}
