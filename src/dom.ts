// Looks up an element the page always has, checking it's the kind of element the code expects
export function byId<T extends HTMLElement>(id: string, type: new () => T): T {
  const el = document.getElementById(id);
  if (!(el instanceof type)) throw new Error(`#${id} is missing or isn't a ${type.name}`);
  return el;
}
