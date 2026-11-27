import { useEffect, useRef, useState } from 'react';
import { Download, Eye, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { SAMPLE_PROFILES } from './data/sampleProfiles';
import type { AttirePreference, PhysiognomyProfile } from './types/physiognomy';
import type { PreparedImage } from './utils/imageUtils';
import { UploadStudio } from './components/UploadStudio';
import { InfographicPlate } from './components/InfographicPlate';

const GENERATION_STAGES = [
  '인물의 관상과 표정·눈빛·스타일·자세를 분석하고 있습니다...',
  '성별과 분위기에 맞는 조선시대 전통 초상화를 그리고 있습니다...',
  '얼굴 부위별 점선 지시선 좌표와 도감 구성을 마무리하고 있습니다...',
];

export default function App() {
  const [generatedProfiles, setGeneratedProfiles] = useState<PhysiognomyProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>(SAMPLE_PROFILES[0].id);
  const [showOriginal, setShowOriginal] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const plateRef = useRef<HTMLDivElement | null>(null);
  const plateSectionRef = useRef<HTMLElement | null>(null);

  const allProfiles = [...generatedProfiles, ...SAMPLE_PROFILES];
  const activeProfile =
    allProfiles.find((p) => p.id === activeProfileId) ?? SAMPLE_PROFILES[0];

  useEffect(() => {
    if (!isGenerating) {
      setStageIndex(0);
      return;
    }
    const t1 = window.setTimeout(() => setStageIndex(1), 5000);
    const t2 = window.setTimeout(() => setStageIndex(2), 14000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isGenerating]);

  const handleGenerate = async ({
    image,
    subjectName,
    attirePreference,
  }: {
    image: PreparedImage;
    subjectName: string;
    attirePreference: AttirePreference;
  }) => {
    setIsGenerating(true);
    setErrorMessage(null);
    setShowOriginal(false);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image.base64,
          mimeType: image.mimeType,
          subjectName,
          attirePreference,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        profile?: PhysiognomyProfile;
        error?: string;
      };

      if (!response.ok || !payload.profile) {
        throw new Error(
          payload.error || '관상 프로필 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        );
      }

      const fullProfile: PhysiognomyProfile = {
        ...payload.profile,
        originalImageUrl: image.dataUrl,
      };

      setGeneratedProfiles((prev) => [fullProfile, ...prev]);
      setActiveProfileId(fullProfile.id);

      window.setTimeout(() => {
        plateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : '요청 처리 중 알 수 없는 오류가 발생했습니다.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPng = async () => {
    const node = plateRef.current;
    if (!node || isExporting) return;

    setIsExporting(true);
    const prevShowOriginal = showOriginal;
    if (prevShowOriginal) {
      setShowOriginal(false);
      await new Promise((r) => setTimeout(r, 120));
    }

    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#F8F4EA',
      });
      const link = document.createElement('a');
      const safeFileName = (activeProfile.subjectName || activeProfile.titleEpithet)
        .replace(/[^\p{L}\p{N}_-]+/gu, '_')
        .slice(0, 32);
      link.download = `조선관상도감_${safeFileName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export error:', err);
      setErrorMessage('이미지 파일로 저장하는 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      if (prevShowOriginal) setShowOriginal(true);
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3EDE0] text-[#14213D]">
      {/* Top Bar: Strict 3-zone contract */}
      <header className="sticky top-0 z-30 border-b border-[#14213D]/15 bg-[#F8F4EA]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-5 py-3.5 sm:px-6">
          <a
            href="#upload-studio"
            className="font-serif text-[19px] font-bold tracking-tight text-[#14213D] whitespace-nowrap shrink-0"
          >
            조선관상도감
          </a>

          <nav
            aria-label="주요 탐색"
            className="hidden md:flex items-center gap-7 text-[13.5px] font-medium text-[#33486B]"
          >
            <a
              href="#upload-studio"
              className="hover:text-[#14213D] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              사진 올리기
            </a>
            <a
              href="#plate-viewer"
              className="hover:text-[#14213D] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              관상 도감
            </a>
            <a
              href="#methodology"
              className="hover:text-[#14213D] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              감정 기준
            </a>
          </nav>

          <button
            type="button"
            onClick={() => void handleDownloadPng()}
            disabled={isExporting}
            className="inline-flex min-h-[40px] items-center gap-2 bg-[#14213D] px-4 py-2 text-[13px] font-medium text-[#F8F4EA] transition-colors hover:bg-[#1E3156] disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89146]"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 text-[#CCA964]" />
            )}
            이미지 저장
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] space-y-8 px-5 py-7 sm:px-6 sm:py-9">
        {/* Upload & Configuration Studio */}
        <UploadStudio
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          generationStage={GENERATION_STAGES[stageIndex]}
          errorMessage={errorMessage}
          onDismissError={() => setErrorMessage(null)}
        />

        {/* Horizontal Infographic Showcase & Viewer */}
        <section
          id="plate-viewer"
          ref={plateSectionRef}
          aria-label="가로형 AI 관상 프로필 인포그래픽"
          className="space-y-4"
        >
          {/* Workspace Control Toolbar */}
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 border-b border-[#14213D]/15 pb-3">
            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="도감 선택">
              {generatedProfiles.map((p, index) => {
                const isSelected = activeProfile.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => {
                      setActiveProfileId(p.id);
                      setShowOriginal(false);
                    }}
                    className={`min-h-[38px] px-3.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#14213D] text-[#F8F4EA]'
                        : 'bg-[#F8F4EA] text-[#33486B] border border-[#14213D]/15 hover:border-[#B89146]'
                    }`}
                  >
                    내 관상 프로필 {generatedProfiles.length > 1 ? `#${generatedProfiles.length - index}` : ''}
                  </button>
                );
              })}

              {SAMPLE_PROFILES.map((sample, idx) => {
                const isSelected = activeProfile.id === sample.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => {
                      setActiveProfileId(sample.id);
                      setShowOriginal(false);
                    }}
                    className={`min-h-[38px] px-3.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#14213D] text-[#F8F4EA]'
                        : 'bg-[#F8F4EA] text-[#33486B] border border-[#14213D]/15 hover:border-[#B89146]'
                    }`}
                  >
                    견본 0{idx + 1} · {sample.titleEpithet}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              {activeProfile.originalImageUrl && (
                <button
                  type="button"
                  onClick={() => setShowOriginal((prev) => !prev)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 border border-[#14213D]/25 bg-[#FBF8F1] px-3.5 py-1.5 text-[12.5px] font-medium text-[#14213D] transition-colors hover:border-[#14213D] whitespace-nowrap shrink-0"
                >
                  <Eye className="h-3.5 w-3.5 text-[#99742E]" />
                  {showOriginal ? '조선 초상화 보기' : '원본 사진 비교'}
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleDownloadPng()}
                disabled={isExporting}
                className="inline-flex min-h-[38px] items-center gap-1.5 border border-[#B89146] bg-[#F8F4EA] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#14213D] transition-colors hover:bg-[#14213D] hover:text-[#F8F4EA] disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                고화질 PNG 저장
              </button>
            </div>
          </div>

          {/* Horizontal Archival Plate */}
          <InfographicPlate
            profile={activeProfile}
            showOriginal={showOriginal}
            plateRef={plateRef}
          />
        </section>

        {/* Quiet Editorial Methodology Reference */}
        <section
          id="methodology"
          aria-label="감정 및 도감 제작 기준"
          className="mx-auto max-w-[1240px] border-t border-[#14213D]/20 pt-8 pb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="font-mono text-[11px] font-medium tracking-widest text-[#7B5B1E]">
                01. 조선 전통 초상 고증
              </p>
              <h2 className="mt-1.5 font-serif text-[16px] font-bold text-[#14213D]">
                인물 본연의 결을 살린 초상화 변환
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#33486B]">
                사진 속 성별, 연령대, 고유한 분위기를 파악해 도포·당의·저고리·정자관·비녀 등
                고증에 부합하는 조선시대 복식을 자연스럽게 매칭하고, 전통 선묘와 채색 기법으로
                인물의 이목구비와 눈빛을 그대로 담아냅니다.
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] font-medium tracking-widest text-[#7B5B1E]">
                02. 식물도감식 오관 도해
              </p>
              <h2 className="mt-1.5 font-serif text-[16px] font-bold text-[#14213D]">
                이마·눈매·코·입매·얼굴형 정밀 분석
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#33486B]">
                변환된 초상화의 실제 이목구비 좌표를 측정해 점선 지시선으로 연결합니다. 고전
                식물도감 도판처럼 각 부위의 형태와 기운을 한눈에 조망할 수 있도록 구성했습니다.
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] font-medium tracking-widest text-[#7B5B1E]">
                03. 표정·눈빛·에너지 통합 해석
              </p>
              <h2 className="mt-1.5 font-serif text-[16px] font-bold text-[#14213D]">
                관상을 넘어 인물의 기운까지 읽기
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#33486B]">
                단순한 생김새에 머무르지 않고 사진 속 미소, 시선의 밀도, 스타일, 자세와 에너지를
                종합해 사대운세, 추정 MBTI TOP 3, 어울리는 직업, 반전 매력과 한줄조언을 도출합니다.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#14213D]/15 bg-[#F8F4EA] py-5">
        <div className="mx-auto flex max-w-[1240px] flex-col sm:flex-row items-center justify-between gap-2 px-5 text-xs text-[#5B6E8C] sm:px-6">
          <span className="font-serif text-[#14213D]">조선관상도감 · AI 관상 프로필</span>
          <span>본 도감의 관상 및 성향 풀이는 흥미와 영감을 위한 AI 인상 분석 결과입니다.</span>
        </div>
      </footer>
    </div>
  );
}
