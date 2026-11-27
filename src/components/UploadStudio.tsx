import React, { useRef, useState } from 'react';
import { Upload, X, AlertCircle, Loader2, ImagePlus } from 'lucide-react';
import type { AttirePreference } from '../types/physiognomy';
import { prepareUploadedImage, type PreparedImage } from '../utils/imageUtils';

interface UploadStudioProps {
  onGenerate: (params: {
    image: PreparedImage;
    subjectName: string;
    attirePreference: AttirePreference;
  }) => Promise<void>;
  isGenerating: boolean;
  generationStage: string;
  errorMessage: string | null;
  onDismissError: () => void;
}

const ATTIRE_OPTIONS: { value: AttirePreference; label: string; hint: string }[] = [
  { value: 'auto', label: '고증 자동 맞춤', hint: '성별·연령·분위기 최적 배합' },
  { value: 'scholar', label: '사대부 · 선비', hint: '도포 · 저고리 · 정자관' },
  { value: 'royal', label: '궁중 · 예복', hint: '당의 · 단령 관복' },
  { value: 'artist', label: '풍류 · 예인', hint: '심의 · 창의 · 담채 미인도' },
];

export const UploadStudio: React.FC<UploadStudioProps> = ({
  onGenerate,
  isGenerating,
  generationStage,
  errorMessage,
  onDismissError,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [attirePreference, setAttirePreference] = useState<AttirePreference>('auto');
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLocalError(null);
    onDismissError();
    try {
      const result = await prepareUploadedImage(file);
      setPrepared(result);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '이미지를 준비하지 못했습니다.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isGenerating) return;
    const file = e.dataTransfer.files?.[0];
    void handleFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prepared || isGenerating) return;
    await onGenerate({
      image: prepared,
      subjectName,
      attirePreference,
    });
  };

  const activeError = localError || errorMessage;

  return (
    <section
      id="upload-studio"
      aria-label="인물사진 업로드 및 관상 분석 설정"
      className="mx-auto w-full max-w-[1240px] border border-[#14213D]/20 bg-[#FBF8F1] p-6 sm:p-7"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.35fr] gap-8 items-stretch">
        {/* Left: Editorial Intro & Dropzone */}
        <div className="flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-[#7B5B1E]">
              인물 사진 등록 · 조선 초상 도감 제작
            </p>
            <h1 className="mt-2 font-serif text-2xl sm:text-[28px] font-bold leading-snug tracking-tight text-[#14213D] [text-wrap:balance]">
              인물사진 한 장으로 완성하는 가로형 조선시대 관상 프로필
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-[#33486B]">
              얼굴의 오관뿐 아니라 표정, 눈빛, 스타일, 에너지, 자세까지 함께 읽어 성별과 연령대에 맞는
              고증 초상화와 식물도감 스타일 인포그래픽을 만들어 드립니다.
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!isGenerating) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isGenerating && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isGenerating) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="인물 사진 파일 선택 또는 드래그"
            className={`mt-5 flex min-h-[168px] cursor-pointer items-center justify-center border border-dashed px-5 py-4 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14213D] ${
              isDragging
                ? 'border-[#14213D] bg-[#F1EADC]'
                : 'border-[#B89146]/80 bg-[#F8F4EA] hover:border-[#14213D]/60 hover:bg-[#F3EDE0]'
            } ${isGenerating ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={isGenerating}
              onChange={(e) => {
                const file = e.target.files?.[0];
                void handleFile(file);
                e.target.value = '';
              }}
            />

            {prepared ? (
              <div className="flex w-full items-center gap-4">
                <div className="h-28 w-22 shrink-0 overflow-hidden border border-[#14213D]/25 bg-[#F1EADC]">
                  <img
                    src={prepared.dataUrl}
                    alt="업로드된 인물 사진 미리보기"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[14.5px] font-semibold text-[#14213D]">
                    인물 사진이 준비되었습니다
                  </p>
                  <p className="mt-1 text-xs text-[#5B6E8C] tabular-nums">
                    해상도 {prepared.width} × {prepared.height}px · 다른 사진으로 바꾸려면 클릭하세요
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="text-xs font-medium text-[#14213D] underline underline-offset-4 hover:text-[#7B5B1E] whitespace-nowrap shrink-0"
                    >
                      사진 변경
                    </button>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrepared(null);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-[#5B6E8C] hover:text-[#9A2B2B] whitespace-nowrap shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                      제거
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <ImagePlus className="h-7 w-7 text-[#99742E]" strokeWidth={1.6} />
                <p className="mt-2.5 text-[14px] font-semibold text-[#14213D]">
                  정면 또는 반측면 인물사진을 올리거나 끌어다 놓으세요
                </p>
                <p className="mt-1 text-xs text-[#5B6E8C]">
                  JPG · PNG · WebP 지원 · 얼굴과 눈빛, 상반신 자세가 보일수록 분석이 정밀해집니다
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Configuration & Submit */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col justify-between border-t border-[#14213D]/15 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="subject-name-input"
                className="block font-serif text-[13.5px] font-bold text-[#14213D]"
              >
                성함 또는 별호 <span className="font-sans text-xs font-normal text-[#5B6E8C]">(선택 입력)</span>
              </label>
              <input
                id="subject-name-input"
                type="text"
                maxLength={24}
                value={subjectName}
                disabled={isGenerating}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="비워 두시면 AI가 어울리는 관상 칭호를 지어 드립니다"
                className="mt-2 w-full border border-[#14213D]/25 bg-[#F8F4EA] px-3.5 py-2.5 text-[14px] text-[#14213D] placeholder:text-[#5B6E8C]/75 focus:border-[#14213D] focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <span className="block font-serif text-[13.5px] font-bold text-[#14213D]">
                조선 복식 고증 방향
              </span>
              <p className="mt-0.5 text-xs text-[#5B6E8C]">
                기본값인 ‘고증 자동 맞춤’은 사진 속 성별, 연령대, 분위기에 가장 자연스러운 복식을 선택합니다.
              </p>
              <div
                role="radiogroup"
                aria-label="조선 복식 고증 방향 선택"
                className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {ATTIRE_OPTIONS.map((opt) => {
                  const selected = attirePreference === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isGenerating}
                      onClick={() => setAttirePreference(opt.value)}
                      className={`flex flex-col items-start border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#14213D] ${
                        selected
                          ? 'border-[#14213D] bg-[#14213D] text-[#F8F4EA]'
                          : 'border-[#14213D]/20 bg-[#F8F4EA] text-[#14213D] hover:border-[#B89146]'
                      }`}
                    >
                      <span className="text-[12.5px] font-semibold whitespace-nowrap">
                        {opt.label}
                      </span>
                      <span
                        className={`mt-0.5 text-[10.5px] leading-tight ${
                          selected ? 'text-[#E4D3AE]' : 'text-[#5B6E8C]'
                        }`}
                      >
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6">
            {activeError && (
              <div
                role="alert"
                className="mb-3.5 flex items-start gap-2.5 border border-[#9A2B2B]/40 bg-[#9A2B2B]/5 px-3.5 py-2.5 text-[12.5px] text-[#7D1E1E]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#9A2B2B]" />
                <span>{activeError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#5B6E8C]">
                {isGenerating ? (
                  <span className="inline-flex items-center gap-2 font-medium text-[#14213D]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#99742E]" />
                    {generationStage}
                  </span>
                ) : (
                  <span>초상화 변환과 도감 분석에는 약 15~25초가 소요됩니다</span>
                )}
              </div>

              <button
                type="submit"
                disabled={!prepared || isGenerating}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-[#14213D] px-6 py-2.5 text-[14px] font-semibold text-[#F8F4EA] transition-colors duration-150 hover:bg-[#1E3156] disabled:cursor-not-allowed disabled:bg-[#14213D]/40 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89146]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    도감 생성 중...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-[#CCA964]" />
                    관상 프로필 만들기
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};
