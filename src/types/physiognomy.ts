export type FacialPartKey = 'forehead' | 'eyes' | 'nose' | 'mouth' | 'faceShape';

export type FortuneKey = 'wealth' | 'love' | 'career' | 'relationships';

export type AttirePreference = 'auto' | 'scholar' | 'royal' | 'artist';

export interface FacialPoint {
  /** Horizontal percentage from 0 to 100 within the portrait image */
  x: number;
  /** Vertical percentage from 0 to 100 within the portrait image */
  y: number;
}

export interface FacialFeatureAnalysis {
  key: FacialPartKey;
  figureNo: string;
  labelKo: string;
  hanja: string;
  keyword: string;
  description: string;
  anchor: FacialPoint;
}

export interface FortuneItem {
  key: FortuneKey;
  labelKo: string;
  hanja: string;
  score: number;
  grade: string;
  summary: string;
}

export interface MbtiCandidate {
  rank: 1 | 2 | 3;
  type: string;
  probability: number;
  roles: string[];
  reason: string;
}

export interface AuraObservation {
  expression: string;
  gaze: string;
  style: string;
  energy: string;
  posture: string;
}

export interface OverallSynthesis {
  disposition: string;
  firstImpression: string;
  charmPoint: string;
  twistPoint: string;
  oneLineAdvice: string;
}

export interface AttireInfo {
  nameKo: string;
  eraNote: string;
  reason: string;
}

export interface PhysiognomyProfile {
  id: string;
  plateNo: string;
  dateLabel: string;
  subjectName: string;
  titleEpithet: string;
  subtitle: string;
  isSample?: boolean;
  attire: AttireInfo;
  auraObservation: AuraObservation;
  portraitImageUrl: string;
  originalImageUrl?: string;
  features: FacialFeatureAnalysis[];
  fortunes: FortuneItem[];
  mbtiTop3: MbtiCandidate[];
  synthesis: OverallSynthesis;
}
