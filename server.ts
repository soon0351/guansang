import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function createAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED|fetch failed/i.test(msg);
      if (!retryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
    }
  }
  throw lastError;
}

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    titleEpithet: {
      type: Type.STRING,
      description: '우아하고 품격 있는 한국어 관상 칭호 (예: 청풍명월의 지략가, 온유한 기백의 선비, 단아한 통찰의 재원). 8~14자 내외.',
    },
    subtitle: {
      type: Type.STRING,
      description: '인물의 관상과 기운을 한 문장으로 요약한 부제. 25~40자 내외.',
    },
    attire: {
      type: Type.OBJECT,
      properties: {
        nameKo: {
          type: Type.STRING,
          description: '고증에 맞게 선정된 조선시대 복식 명칭 (예: 조선 후기 남색 도포와 정자관, 반가 당의와 옥비녀 등).',
        },
        eraNote: {
          type: Type.STRING,
          description: '복식의 시대적·신분적 맥락 요약 (예: 조선 후기 사대부 예복 · 18세기 후반).',
        },
        reason: {
          type: Type.STRING,
          description: '인물의 성별, 연령대, 분위기에 이 복식을 선정한 이유 (1문장).',
        },
        promptEn: {
          type: Type.STRING,
          description:
            'Detailed English description of historically accurate Joseon Dynasty Korean traditional attire, headwear/hairstyle, collar, fabric colors (harmonizing deep navy, warm ivory/cream, and subtle antique gold thread where historically authentic), tailored specifically to the subject gender, apparent age group, and personal aura.',
        },
      },
      required: ['nameKo', 'eraNote', 'reason', 'promptEn'],
    },
    auraObservation: {
      type: Type.OBJECT,
      properties: {
        expression: { type: Type.STRING, description: '표정 분석 (10~20자 요약)' },
        gaze: { type: Type.STRING, description: '눈빛 분석 (10~20자 요약)' },
        style: { type: Type.STRING, description: '스타일·분위기 분석 (10~20자 요약)' },
        energy: { type: Type.STRING, description: '전체적인 기운·에너지 (10~20자 요약)' },
        posture: { type: Type.STRING, description: '자세·태도 분석 (10~20자 요약)' },
      },
      required: ['expression', 'gaze', 'style', 'energy', 'posture'],
    },
    features: {
      type: Type.ARRAY,
      description: '정확히 5개 부위 순서대로: forehead(이마), eyes(눈매), nose(코), mouth(입매), faceShape(얼굴형)',
      items: {
        type: Type.OBJECT,
        properties: {
          key: {
            type: Type.STRING,
            description: 'forehead, eyes, nose, mouth, faceShape 중 하나',
          },
          labelKo: { type: Type.STRING, description: '이마, 눈매, 코, 입매, 얼굴형' },
          hanja: { type: Type.STRING, description: '天庭, 眼相, 鼻相, 口相, 骨相' },
          keyword: { type: Type.STRING, description: '부위별 핵심 특징 키워드 (8~16자)' },
          description: {
            type: Type.STRING,
            description: '관상학적 특징과 표정·눈빛·기운을 함께 반영한 식물도감 주석 스타일의 정교한 1~2문장 분석 (45~75자).',
          },
        },
        required: ['key', 'labelKo', 'hanja', 'keyword', 'description'],
      },
    },
    fortunes: {
      type: Type.ARRAY,
      description: '정확히 4개 운세 순서대로: wealth(재물운), love(애정운), career(직업운), relationships(대인운)',
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING, description: 'wealth, love, career, relationships 중 하나' },
          labelKo: { type: Type.STRING, description: '재물운, 애정운, 직업운, 대인운' },
          hanja: { type: Type.STRING, description: '財物運, 愛情運, 職業運, 對人運' },
          score: { type: Type.INTEGER, description: '68~96 사이의 현실적이고 변별력 있는 점수' },
          grade: { type: Type.STRING, description: '대길, 상길, 중길, 평길 중 하나' },
          summary: {
            type: Type.STRING,
            description: '관상과 인물의 에너지·태도를 연결한 구체적이고 설득력 있는 운세 풀이 (40~68자).',
          },
        },
        required: ['key', 'labelKo', 'hanja', 'score', 'grade', 'summary'],
      },
    },
    mbtiTop3: {
      type: Type.ARRAY,
      description: '추정 MBTI TOP 3 (1위, 2위, 3위 순서)',
      items: {
        type: Type.OBJECT,
        properties: {
          rank: { type: Type.INTEGER, description: '1, 2, 3' },
          type: { type: Type.STRING, description: '4글자 대문자 MBTI 유형 (예: INFJ)' },
          probability: { type: Type.INTEGER, description: '추정 적합도 백분율 (예: 89, 76, 68)' },
          roles: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '어울리는 현대 직업 3가지 (짧고 구체적인 한국어 직무명)',
          },
          reason: {
            type: Type.STRING,
            description: '표정, 눈빛, 스타일, 자세, 관상을 근거로 해당 MBTI를 추정한 이유 (35~60자).',
          },
        },
        required: ['rank', 'type', 'probability', 'roles', 'reason'],
      },
    },
    synthesis: {
      type: Type.OBJECT,
      properties: {
        disposition: { type: Type.STRING, description: '성향: 내면 기질과 사고 방식 (40~65자)' },
        firstImpression: { type: Type.STRING, description: '첫인상: 타인이 처음 마주했을 때 받는 분위기 (40~65자)' },
        charmPoint: { type: Type.STRING, description: '매력포인트: 시선을 끄는 고유한 강점 (40~65자)' },
        twistPoint: { type: Type.STRING, description: '반전포인트: 겉인상 뒤에 숨어 있는 의외의 면모 (40~65자)' },
        oneLineAdvice: {
          type: Type.STRING,
          description: '한줄조언: 이 사람의 기운을 가장 빛나게 할 품격 있고 따뜻한 격언형 한 문장 (30~55자).',
        },
      },
      required: ['disposition', 'firstImpression', 'charmPoint', 'twistPoint', 'oneLineAdvice'],
    },
  },
  required: ['titleEpithet', 'subtitle', 'attire', 'auraObservation', 'features', 'fortunes', 'mbtiTop3', 'synthesis'],
};

const LANDMARK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    forehead: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER, description: '이마 중앙 또는 우측 경계 x 좌표 (0~100%)' },
        y: { type: Type.NUMBER, description: '이마 중앙 y 좌표 (0~100%)' },
      },
      required: ['x', 'y'],
    },
    eyes: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER, description: '오른쪽 눈꼬리 부근 x 좌표 (0~100%)' },
        y: { type: Type.NUMBER, description: '눈 높이 y 좌표 (0~100%)' },
      },
      required: ['x', 'y'],
    },
    nose: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER, description: '콧대/코끝 부근 x 좌표 (0~100%)' },
        y: { type: Type.NUMBER, description: '코끝 높이 y 좌표 (0~100%)' },
      },
      required: ['x', 'y'],
    },
    mouth: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER, description: '입꼬리 부근 x 좌표 (0~100%)' },
        y: { type: Type.NUMBER, description: '입술 중앙 높이 y 좌표 (0~100%)' },
      },
      required: ['x', 'y'],
    },
    faceShape: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER, description: '턱선/하관 외곽 우측 x 좌표 (0~100%)' },
        y: { type: Type.NUMBER, description: '턱선 높이 y 좌표 (0~100%)' },
      },
      required: ['x', 'y'],
    },
  },
  required: ['forehead', 'eyes', 'nose', 'mouth', 'faceShape'],
};

const ATTIRE_GUIDE_MAP: Record<string, string> = {
  auto: '사진 속 인물의 성별, 연령대, 고유한 분위기(지적임, 온화함, 당당함, 예술성 등)를 면밀히 살핀 뒤 가장 자연스럽고 역사적 고증이 정확한 조선시대 복식을 자율적으로 선정하세요.',
  scholar: '조선시대 사대부·문인·학자 가문의 고증에 충실한 단정하고 품격 있는 복식(남성: 도포·학창의·단령·정자관·유건 등 / 여성: 단아한 반가 저고리·치마·쪽머리·옥비녀 등)을 인물의 연령대와 분위기에 맞게 선정하세요.',
  royal: '조선시대 왕실·궁중 예복 또는 품계 있는 관복(남성: 관복·단령포·사모·흉배 등 / 여성: 당의·금박 장식·첩지·비녀 등)을 인물의 연령대와 분위기에 맞게 품위 있게 고증하여 선정하세요.',
  artist: '조선 후기 풍류객·화원·예인·문예가의 자연스럽고 세련된 멋이 살아 있는 고증 복식(남성: 심의·창의·전립 또는 정갈한 평복 / 여성: 은은한 색감의 회장저고리·가채 없는 자연스러운 얹은머리 또는 쪽머리 등)을 선정하세요.',
};

const DEFAULT_ANCHORS: Record<string, { x: number; y: number }> = {
  forehead: { x: 52, y: 34 },
  eyes: { x: 56, y: 42 },
  nose: { x: 50, y: 48 },
  mouth: { x: 51, y: 54 },
  faceShape: { x: 59, y: 57 },
};

const FIGURE_LABELS = ['Fig. I', 'Fig. II', 'Fig. III', 'Fig. IV', 'Fig. V'];

function clampCoord(val: unknown, fallback: number): number {
  const num = typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  return Math.max(12, Math.min(88, Math.round(num * 10) / 10));
}

function formatKoreanDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function formatErrorMessage(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw === 'GEMINI_API_KEY_MISSING') {
    return {
      status: 500,
      message: '서버에 Gemini API 키가 설정되지 않았습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.',
    };
  }
  if (/PERMISSION_DENIED|403|API_KEY_INVALID/i.test(raw)) {
    return {
      status: 403,
      message: 'API 키 인증에 실패했습니다. Settings > Secrets 패널에서 유효한 유료 Gemini API 키가 연결되어 있는지 확인해 주세요.',
    };
  }
  if (/RESOURCE_EXHAUSTED|429/i.test(raw)) {
    return {
      status: 429,
      message: '요청 한도를 초과했습니다. 잠시 후 다시 시도하거나 유료 결제가 활성화된 API 키를 확인해 주세요.',
    };
  }
  if (/SAFETY|PROHIBITED|BLOCKED/i.test(raw)) {
    return {
      status: 422,
      message: '업로드한 이미지를 초상화로 변환할 수 없습니다. 얼굴이 정면으로 잘 보이는 인물 사진으로 다시 시도해 주세요.',
    };
  }
  return {
    status: 500,
    message: `분석 처리 중 오류가 발생했습니다: ${raw.slice(0, 180)}`,
  };
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/analyze', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, subjectName, attirePreference } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        subjectName?: string;
        attirePreference?: string;
      };

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: '인물 사진 데이터가 필요합니다.' });
        return;
      }

      const safeMime =
        mimeType && /^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)
          ? mimeType === 'image/jpg'
            ? 'image/jpeg'
            : mimeType
          : 'image/jpeg';

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      const cleanName = typeof subjectName === 'string' ? subjectName.trim().slice(0, 24) : '';
      const attireKey = attirePreference && attirePreference in ATTIRE_GUIDE_MAP ? attirePreference : 'auto';
      const attireGuidance = ATTIRE_GUIDE_MAP[attireKey];

      const ai = createAiClient();

      // Step 1: Comprehensive physiognomy + expression + style + energy + gaze + posture analysis
      const analysisPrompt = [
        '당신은 조선시대 전통 관상학(상법)과 현대 심리·인상학, 그리고 조선 복식사에 정통한 전문 감식가입니다.',
        '첨부된 인물 사진을 세밀하게 관찰하여 품격 있고 통찰력 있는 "AI 관상 프로필" 도감 데이터를 작성하세요.',
        '',
        '[핵심 분석 지침]',
        '1. 단순한 얼굴 생김새(이마, 눈매, 코, 입매, 얼굴형)뿐만 아니라 사진 속에 담긴 표정, 헤어·패션 스타일, 전반적인 에너지, 눈빛의 밀도, 어깨와 고개의 자세까지 모두 종합적으로 반영하여 해석하세요.',
        '2. 과장된 아첨이나 뻔한 일반론을 피하고, 실제 사진에서 관찰되는 구체적인 인상 디테일을 녹여 설득력 있고 기품 있는 한국어 문장으로 작성하세요.',
        '3. 복식 고증 지침: ' + attireGuidance,
        '4. attire.promptEn은 영어로 작성하되, 조선시대 전통 초상화(어진·사대부 초상화·미인도) 화풍으로 변환할 때 사진 속 인물의 성별·연령대·분위기에 가장 자연스럽게 어울리는 고증 복식(색감은 깊은 남색, 상아빛 크림색, 은은한 금사 포인트를 조화롭게 반영 가능)과 머리 모양/관모를 구체적으로 명시하세요.',
        '5. features 배열은 반드시 forehead, eyes, nose, mouth, faceShape 5개 순서대로 작성하세요.',
        '6. fortunes 배열은 반드시 wealth, love, career, relationships 4개 순서대로 작성하세요.',
        '7. mbtiTop3 배열은 반드시 rank 1, 2, 3 순서대로 서로 다른 MBTI 유형 3개를 제시하고, 각각 어울리는 현대 직업 3개와 표정·눈빛·스타일·자세·관상에 근거한 구체적 추정 이유를 작성하세요.',
        '8. 모든 한국어 텍스트는 자연스럽고 품격 있는 편집 어조(해요체 또는 격조 있는 평서체로 통일 — 평서체 권장)를 사용하세요.',
      ].join('\n');

      const analysisResponse = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: safeMime,
                  data: cleanBase64,
                },
              },
              { text: analysisPrompt },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: ANALYSIS_SCHEMA,
          },
        }),
      );

      const rawJson = (analysisResponse.text ?? '').trim();
      if (!rawJson) {
        throw new Error('관상 분석 응답이 비어 있습니다.');
      }
      const parsed = JSON.parse(rawJson);

      // Step 2: Transform uploaded portrait into authentic Joseon Dynasty traditional portrait painting
      const attirePromptEn =
        parsed?.attire?.promptEn ||
        'historically accurate late Joseon Dynasty Korean traditional silk attire in deep indigo navy and warm ivory cream with delicate gold trim appropriate to the subject';

      const portraitPrompt = [
        'Transform the person in this photograph into an authentic Joseon Dynasty traditional Korean portrait painting (조선시대 전통 초상화, chosanghwa) on aged warm cream silk and hanji paper.',
        'CRITICAL LIKENESS RULE: Faithfully preserve the exact facial identity, bone structure, forehead, eye shape, distinctive gaze, nose, mouth, subtle expression, apparent age, and natural charm of the person in the reference photo so they are immediately recognizable.',
        `HISTORICAL ATTIRE & STYLING: Dress the person in ${attirePromptEn}. Ensure authentic Joseon tailoring, realistic collar (dongjeong), natural folds, and historically faithful hairstyle or headwear suited to their gender and age.`,
        'ARTISTIC TECHNIQUE: Traditional Korean museum-grade portrait brushwork with delicate fine ink contour lines (seonmyo) and soft layered mineral pigments (chaesaek / baechai), subtle facial shading following Joseon portraiture canons, dignified calm bust-up composition.',
        'COMPOSITION & BACKGROUND: Centered bust-up three-quarter or gentle frontal portrait with balanced space above the head and around the shoulders. Plain, clean, uniform aged warm cream hanji paper background (#F6F1E5) with very gentle organic paper fiber texture.',
        'STRICTLY FORBIDDEN: Do NOT include any text, calligraphy, Korean/Chinese characters, red seals, stamps, frames, borders, modern clothing, or modern background objects inside the painting.',
      ].join(' ');

      const imageResponse = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: safeMime,
                  data: cleanBase64,
                },
              },
              { text: portraitPrompt },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: '3:4',
            },
          },
        }),
      );

      let generatedPortraitBase64 = '';
      let generatedPortraitMime = 'image/png';
      for (const part of imageResponse.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          generatedPortraitBase64 = part.inlineData.data;
          generatedPortraitMime = part.inlineData.mimeType ?? 'image/png';
          break;
        }
      }

      if (!generatedPortraitBase64) {
        throw new Error('조선시대 초상화 이미지를 생성하지 못했습니다. 정면 얼굴이 선명한 사진으로 다시 시도해 주세요.');
      }

      // Step 3: Localize exact facial landmark points on the newly generated Joseon portrait for botanical dotted leader lines
      let anchors: Record<string, { x: number; y: number }> = { ...DEFAULT_ANCHORS };
      try {
        const landmarkResponse = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: generatedPortraitMime,
                  data: generatedPortraitBase64,
                },
              },
              {
                text: [
                  '이 초상화 이미지에서 식물도감 스타일의 점선 지시선을 우측으로 연결하기 위한 5개 얼굴 부위 좌표를 0~100 백분율(x: 왼쪽 0 -> 오른쪽 100, y: 위쪽 0 -> 아래쪽 100)로 정확히 반환하세요.',
                  '- forehead: 이마의 중앙~오른쪽 부근',
                  '- eyes: 화면 기준 오른쪽 눈(관찰자 기준 우측 눈)의 눈꼬리 부근',
                  '- nose: 코끝 또는 콧방울 우측 부근',
                  '- mouth: 입술의 우측 입꼬리 부근',
                  '- faceShape: 얼굴 하관/턱선의 우측 윤곽선 부근',
                ].join('\n'),
              },
            ],
          },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: LANDMARK_SCHEMA,
          },
        });

        const landmarkText = (landmarkResponse.text ?? '').trim();
        if (landmarkText) {
          const lm = JSON.parse(landmarkText);
          anchors = {
            forehead: {
              x: clampCoord(lm?.forehead?.x, DEFAULT_ANCHORS.forehead.x),
              y: clampCoord(lm?.forehead?.y, DEFAULT_ANCHORS.forehead.y),
            },
            eyes: {
              x: clampCoord(lm?.eyes?.x, DEFAULT_ANCHORS.eyes.x),
              y: clampCoord(lm?.eyes?.y, DEFAULT_ANCHORS.eyes.y),
            },
            nose: {
              x: clampCoord(lm?.nose?.x, DEFAULT_ANCHORS.nose.x),
              y: clampCoord(lm?.nose?.y, DEFAULT_ANCHORS.nose.y),
            },
            mouth: {
              x: clampCoord(lm?.mouth?.x, DEFAULT_ANCHORS.mouth.x),
              y: clampCoord(lm?.mouth?.y, DEFAULT_ANCHORS.mouth.y),
            },
            faceShape: {
              x: clampCoord(lm?.faceShape?.x, DEFAULT_ANCHORS.faceShape.x),
              y: clampCoord(lm?.faceShape?.y, DEFAULT_ANCHORS.faceShape.y),
            },
          };
        }
      } catch (lmErr) {
        console.warn('Landmark localization fallback applied:', lmErr);
      }

      const featureOrder = ['forehead', 'eyes', 'nose', 'mouth', 'faceShape'];
      const rawFeatures = Array.isArray(parsed.features) ? parsed.features : [];
      const features = featureOrder.map((key, idx) => {
        const found = rawFeatures.find((f: { key?: string }) => f.key === key) || rawFeatures[idx] || {};
        return {
          key,
          figureNo: FIGURE_LABELS[idx],
          labelKo: found.labelKo || ['이마', '눈매', '코', '입매', '얼굴형'][idx],
          hanja: found.hanja || ['天庭', '眼相', '鼻相', '口相', '骨相'][idx],
          keyword: found.keyword || '균형 잡힌 상',
          description: found.description || '',
          anchor: anchors[key] || DEFAULT_ANCHORS[key],
        };
      });

      const fortuneOrder = ['wealth', 'love', 'career', 'relationships'];
      const rawFortunes = Array.isArray(parsed.fortunes) ? parsed.fortunes : [];
      const fortunes = fortuneOrder.map((key, idx) => {
        const found = rawFortunes.find((f: { key?: string }) => f.key === key) || rawFortunes[idx] || {};
        const score = Math.max(50, Math.min(99, Number(found.score) || 82));
        return {
          key,
          labelKo: found.labelKo || ['재물운', '애정운', '직업운', '대인운'][idx],
          hanja: found.hanja || ['財物運', '愛情運', '職業運', '對人運'][idx],
          score,
          grade: found.grade || (score >= 88 ? '대길' : score >= 78 ? '상길' : '중길'),
          summary: found.summary || '',
        };
      });

      const rawMbti = Array.isArray(parsed.mbtiTop3) ? parsed.mbtiTop3.slice(0, 3) : [];
      const mbtiTop3 = rawMbti.map((item: Record<string, unknown>, idx: number) => ({
        rank: (idx + 1) as 1 | 2 | 3,
        type: String(item.type || 'INFJ').toUpperCase().slice(0, 4),
        probability: Math.max(40, Math.min(98, Number(item.probability) || 85 - idx * 8)),
        roles: Array.isArray(item.roles) ? item.roles.map(String).slice(0, 3) : [],
        reason: String(item.reason || ''),
      }));

      const plateSeq = String(Math.floor(10 + Math.random() * 89));

      const profile = {
        id: `profile-${Date.now()}`,
        plateNo: `도감 제 ${plateSeq}호`,
        dateLabel: formatKoreanDate(),
        subjectName: cleanName || parsed.titleEpithet,
        titleEpithet: parsed.titleEpithet,
        subtitle: parsed.subtitle,
        isSample: false,
        attire: {
          nameKo: parsed.attire?.nameKo || '조선 후기 전통 예복',
          eraNote: parsed.attire?.eraNote || '조선 후기 고증 복식',
          reason: parsed.attire?.reason || '',
        },
        auraObservation: {
          expression: parsed.auraObservation?.expression || '',
          gaze: parsed.auraObservation?.gaze || '',
          style: parsed.auraObservation?.style || '',
          energy: parsed.auraObservation?.energy || '',
          posture: parsed.auraObservation?.posture || '',
        },
        portraitImageUrl: `data:${generatedPortraitMime};base64,${generatedPortraitBase64}`,
        features,
        fortunes,
        mbtiTop3,
        synthesis: {
          disposition: parsed.synthesis?.disposition || '',
          firstImpression: parsed.synthesis?.firstImpression || '',
          charmPoint: parsed.synthesis?.charmPoint || '',
          twistPoint: parsed.synthesis?.twistPoint || '',
          oneLineAdvice: parsed.synthesis?.oneLineAdvice || '',
        },
      };

      res.json({ profile });
    } catch (err) {
      console.error('Error in /api/analyze:', err);
      const { status, message } = formatErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
