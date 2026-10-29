import type { NodeObject } from "force-graph";

// force-graph は graphData を受け取ると source/target を ID からノードに置き換えるので、どちらでも受け付ける
export type LinkEnd = string | NodeObject;
export type Link = { source: LinkEnd; target: LinkEnd };

export function idOf(end: LinkEnd): string {
  return String(typeof end === "object" ? end.id : end);
}
