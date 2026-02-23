import { ReactNode } from "react";

export type SceneKind = "dialogue" | "card" | "waiting" | "action";

export interface DialogueScene {
  kind: "dialogue";
  id: string;
  speakerName?: string;
  text: string;
  bgImage: string;
  tocLabel?: string;
}

export interface CardScene {
  kind: "card";
  id: string;
  bgImage: string;
  scrollGated?: boolean;
  tocLabel?: string;
  // Optional metadata for card rendering
  chapterIndex?: number;
  // Optional inline render (use only when closure state is not needed)
  render?: () => ReactNode;
}

export interface WaitingScene {
  kind: "waiting";
  id: string;
  bgImage: string;
  tocLabel?: string;
}

export interface ActionScene {
  kind: "action";
  id: string;
  bgImage: string;
  tocLabel?: string;
}

export type Scene = DialogueScene | CardScene | WaitingScene | ActionScene;

export interface ScenePlayerConfig {
  characterName: string;    // "색동낭자" | "까치도령"
  homeRoute: string;        // "/saju-love" | "/new-year"
  defaultBgImage: string;   // fallback background
}

export type TransitionPhase = "idle" | "out" | "in";
