import React, { useLayoutEffect, useRef, useState } from 'react';
import type { FacialPartKey, PhysiognomyProfile } from '../types/physiognomy';

interface InfographicPlateProps {
  profile: PhysiognomyProfile;
  showOriginal?: boolean;
  plateRef?: React.RefObject<HTMLDivElement | null>;
}

interface LeaderLineGeom {
  key: FacialPartKey;
  sx: number;
  sy: number;
  elbow1X: number;
  elbow2X: number;
  tx: number;
  ty: number;
}

export const InfographicPlate: React.FC<InfographicPlateProps> = ({
  profile,
  showOriginal = false,
  plateRef,
}) => {
  const leftZoneRef = useRef<HTMLDivElement | null>(null);
  const portraitBoxRef = useRef<HTMLDivElement | null>(null);
  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [lines, setLines] = useState<LeaderLineGeom[]>([]);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [hoveredKey, setHoveredKey] = useState<FacialPartKey | null>(null);
  const [imageError, setImageError] = useState(false);

  const displayedImage =
    showOriginal && profile.originalImageUrl
      ? profile.originalImageUrl
      : profile.portraitImageUrl;

  useLayoutEffect(() => {
    setImageError(false);
  }, [displayedImage]);

  useLayoutEffect(() => {
    const computeGeometry = () => {
      const container = leftZoneRef.current;
      const portraitBox = portraitBoxRef.current;
      if (!container || !portraitBox) return;

      const cRect = container.getBoundingClientRect();
      const pRect = portraitBox.getBoundingClientRect();

      if (cRect.width === 0 || cRect.height === 0) return;

      const gutterStart = pRect.right - cRect.left;

      const computed: LeaderLineGeom[] = [];
      profile.features.forEach((feat, idx) => {
        const targetEl = targetRefs.current[feat.key];
        if (!targetEl) return;
        const tRect = targetEl.getBoundingClientRect();

        const sx = pRect.left - cRect.left + (pRect.width * feat.anchor.x) / 100;
        const sy = pRect.top - cRect.top + (pRect.height * feat.anchor.y) / 100;

        const tx = tRect.left - cRect.left;
        const ty = tRect.top - cRect.top + tRect.height / 2;

        // Staggered vertical routing channel in the gutter so dotted lines stay botanical and uncluttered
        const gutterWidth = Math.max(24, tx - gutterStart);
        const laneOffset = 0.24 + idx * 0.13;
        const elbow1X = gutterStart + gutterWidth * Math.min(0.82, laneOffset);
        const elbow2X = Math.max(elbow1X + 6, tx - 10);

        computed.push({
          key: feat.key,
          sx,
          sy,
          elbow1X,
          elbow2X,
          tx,
          ty,
        });
      });

      setSvgSize({ width: cRect.width, height: cRect.height });
      setLines(computed);
    };

    computeGeometry();

    const ro = new ResizeObserver(() => {
      computeGeometry();
    });

    if (leftZoneRef.current) ro.observe(leftZoneRef.current);
    if (portraitBoxRef.current) ro.observe(portraitBoxRef.current);

    window.addEventListener('resize', computeGeometry);
    const timer = window.setTimeout(computeGeometry, 250);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', computeGeometry);
      window.clearTimeout(timer);
    };
  }, [profile, showOriginal]);

  return (
    <div className="w-full overflow-x-auto pb-2">
      <article
        ref={plateRef}
        aria-label="AI 관상 프로필 가로형 인포그래픽"
        className="hanji-plate relative mx-auto w-[1240px] max-w-none border border-[#14213D]/25 p-5 text-[#14213D] shadow-[0_18px_48px_-24px_rgba(20,33,61,0.22)]"
      >
        {/* Inner Archival Gold Frame */}
        <div className="relative border border-[#B89146]/65 px-7 py-6">
          {/* Classical Botanical Plate Corner Brackets */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-[1px] -left-[1px] h-3.5 w-3.5 border-t-2 border-l-2 border-[#14213D]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-[1px] -right-[1px] h-3.5 w-3.5 border-t-2 border-r-2 border-[#14213D]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-3.5 w-3.5 border-b-2 border-l-2 border-[#14213D]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-3.5 w-3.5 border-b-2 border-r-2 border-[#14213D]"
          />

          {/* TOP MASTHEAD */}
          <header className="flex items-end justify-between gap-6 border-b border-[#14213D]/20 pb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 text-[11px] font-medium tracking-[0.14em] text-[#7B5B1E]">
                <span className="font-mono tabular-nums">{profile.plateNo}</span>
                <span aria-hidden="true">·</span>
                <span>조선관상도감 朝鮮肖像圖鑑</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{profile.dateLabel}</span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-3.5">
                <h2 className="font-serif text-[30px] font-bold leading-tight tracking-tight text-[#14213D] [text-wrap:balance]">
                  {profile.titleEpithet}
                </h2>
                {profile.subjectName && profile.subjectName !== profile.titleEpithet && (
                  <span className="font-serif text-[16px] font-normal text-[#33486B]">
                    {profile.subjectName}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[#33486B]">
                {profile.subtitle}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[11px] font-medium tracking-[0.12em] text-[#7B5B1E]">
                AI 관상 프로필 · 고증 복식
              </p>
              <p className="mt-1 font-serif text-[14px] font-semibold text-[#14213D]">
                {profile.attire.nameKo}
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#5B6E8C]">
                {profile.attire.eraNote}
              </p>
            </div>
          </header>

          {/* UPPER HORIZONTAL SPLIT: LEFT (Portrait + Botanical Annotations) | RIGHT (Fortune + MBTI Top 3) */}
          <div className="mt-5 grid grid-cols-[1.34fr_1fr] gap-7 border-b border-[#14213D]/20 pb-5">
            {/* LEFT PART: Transformed Joseon Portrait + Botanical Facial Feature Analysis */}
            <section aria-label="조선시대 초상화 및 얼굴부위분석" className="relative pr-6 border-r border-[#B89146]/45">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="font-serif text-[15px] font-bold tracking-tight text-[#14213D]">
                  초상 및 얼굴부위 도감{' '}
                  <span className="ml-1.5 font-serif text-[12px] font-normal text-[#7B5B1E]">
                    肖像 · 五官圖解
                  </span>
                </h3>
                <span className="text-[11px] text-[#5B6E8C]">
                  관상 · 표정 · 눈빛 · 스타일 · 자세 종합 관찰
                </span>
              </div>

              {/* Unified Botanical Canvas with SVG Dotted Leader Lines */}
              <div
                ref={leftZoneRef}
                className="relative grid grid-cols-[276px_1fr] gap-12 items-start"
              >
                {/* SVG Dotted Leader Lines Overlay */}
                {svgSize.width > 0 && lines.length > 0 && (
                  <svg
                    width={svgSize.width}
                    height={svgSize.height}
                    viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
                    className="pointer-events-none absolute inset-0 z-10 overflow-visible"
                    aria-hidden="true"
                  >
                    {lines.map((line) => {
                      const isActive = hoveredKey === line.key;
                      const strokeColor = isActive ? '#14213D' : '#99742E';
                      const strokeWidth = isActive ? 1.55 : 1.15;
                      const pathD = `M ${line.sx} ${line.sy} L ${line.elbow1X} ${line.sy} L ${line.elbow2X} ${line.ty} L ${line.tx} ${line.ty}`;

                      return (
                        <g key={line.key} style={{ transition: 'opacity 180ms ease' }}>
                          {/* Soft light halo under dotted line over portrait for legibility */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#F8F4EA"
                            strokeWidth={strokeWidth + 2}
                            strokeOpacity={0.55}
                          />
                          <path
                            d={pathD}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray="2.4 3.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Portrait Anchor Target Marker */}
                          <circle
                            cx={line.sx}
                            cy={line.sy}
                            r={isActive ? 5.5 : 4.2}
                            fill="#F8F4EA"
                            fillOpacity={0.85}
                            stroke={strokeColor}
                            strokeWidth={1.25}
                          />
                          <circle
                            cx={line.sx}
                            cy={line.sy}
                            r={isActive ? 2.3 : 1.8}
                            fill={strokeColor}
                          />
                          {/* Terminal Marker at Annotation */}
                          <circle
                            cx={line.tx}
                            cy={line.ty}
                            r={isActive ? 3 : 2.3}
                            fill={strokeColor}
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Portrait Sub-column */}
                <div className="flex flex-col">
                  <div
                    ref={portraitBoxRef}
                    className="relative aspect-[3/4] w-full overflow-hidden border border-[#14213D]/30 bg-[#F3ECD9] p-1.5"
                  >
                    <div className="relative h-full w-full overflow-hidden border border-[#B89146]/50 bg-[#F6F1E5]">
                      {!imageError && displayedImage ? (
                        <img
                          src={displayedImage}
                          alt={`${profile.subjectName} 조선시대 전통 초상화`}
                          referrerPolicy="no-referrer"
                          onError={() => setImageError(true)}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-[#F1EADC] p-6 text-center text-[#5B6E8C]">
                          <span className="font-serif text-base font-semibold text-[#14213D]">
                            초상화 도판
                          </span>
                          <span className="mt-1 text-xs">이미지를 불러올 수 없습니다</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botanical Figure Caption & Holistic Aura Observation */}
                  <div className="mt-3 border-t border-[#B89146]/40 pt-2.5">
                    <div className="flex items-center justify-between text-[11px] font-medium text-[#7B5B1E]">
                      <span className="font-serif">Plate A · 기운 및 인상 관찰</span>
                      <span className="font-mono text-[10px] text-[#5B6E8C]">
                        {showOriginal ? '원본 비교' : '전통 초상'}
                      </span>
                    </div>
                    <dl className="mt-2 space-y-1 text-[11.5px] leading-[1.45]">
                      <div className="grid grid-cols-[44px_1fr] gap-2">
                        <dt className="font-semibold text-[#14213D]">표정</dt>
                        <dd className="text-[#33486B]">{profile.auraObservation.expression}</dd>
                      </div>
                      <div className="grid grid-cols-[44px_1fr] gap-2">
                        <dt className="font-semibold text-[#14213D]">눈빛</dt>
                        <dd className="text-[#33486B]">{profile.auraObservation.gaze}</dd>
                      </div>
                      <div className="grid grid-cols-[44px_1fr] gap-2">
                        <dt className="font-semibold text-[#14213D]">스타일</dt>
                        <dd className="text-[#33486B]">{profile.auraObservation.style}</dd>
                      </div>
                      <div className="grid grid-cols-[44px_1fr] gap-2">
                        <dt className="font-semibold text-[#14213D]">기운</dt>
                        <dd className="text-[#33486B]">{profile.auraObservation.energy}</dd>
                      </div>
                      <div className="grid grid-cols-[44px_1fr] gap-2">
                        <dt className="font-semibold text-[#14213D]">자세</dt>
                        <dd className="text-[#33486B]">{profile.auraObservation.posture}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Botanical Plate 5-Part Facial Feature Annotations */}
                <div className="flex flex-col justify-between gap-3.5 py-0.5">
                  {profile.features.map((feat) => {
                    const isHovered = hoveredKey === feat.key;
                    return (
                      <div
                        key={feat.key}
                        onMouseEnter={() => setHoveredKey(feat.key)}
                        onMouseLeave={() => setHoveredKey(null)}
                        className={`relative border-b border-[#B89146]/35 pb-3 last:border-b-0 last:pb-0 transition-colors duration-150 ${
                          isHovered ? 'bg-[#F1EADC]/75 -mx-2 px-2 rounded-sm' : ''
                        }`}
                      >
                        <div className="flex items-baseline gap-2">
                          {/* Invisible vertical alignment target for dotted leader line */}
                          <div
                            ref={(el) => {
                              targetRefs.current[feat.key] = el;
                            }}
                            className="h-3 w-0 shrink-0 -ml-1.5"
                            aria-hidden="true"
                          />
                          <span className="font-mono text-[10.5px] font-medium tracking-wider text-[#7B5B1E]">
                            {feat.figureNo}
                          </span>
                          <h4 className="font-serif text-[14.5px] font-bold text-[#14213D]">
                            {feat.labelKo}
                          </h4>
                          <span className="font-serif text-[11.5px] text-[#5B6E8C]">
                            {feat.hanja}
                          </span>
                          <span aria-hidden="true" className="text-[#B89146]">
                            ·
                          </span>
                          <span className="text-[12px] font-semibold text-[#7B5B1E] truncate">
                            {feat.keyword}
                          </span>
                        </div>
                        <p className="mt-1 pl-0.5 text-[12px] leading-[1.58] text-[#283854]">
                          {feat.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* RIGHT PART: Fortune Readings + Estimated MBTI Top 3 */}
            <section aria-label="운세 및 캐릭터 해석" className="flex flex-col justify-between gap-5">
              {/* Four Fortunes */}
              <div>
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="font-serif text-[15px] font-bold tracking-tight text-[#14213D]">
                    사대 운세 풀이{' '}
                    <span className="ml-1.5 font-serif text-[12px] font-normal text-[#7B5B1E]">
                      四運 解釋
                    </span>
                  </h3>
                  <span className="text-[11px] text-[#5B6E8C]">재물 · 애정 · 직업 · 대인</span>
                </div>

                <div className="divide-y divide-[#14213D]/12 border-t border-b border-[#14213D]/20">
                  {profile.fortunes.map((f) => (
                    <div key={f.key} className="py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-serif text-[13.5px] font-bold text-[#14213D]">
                            {f.labelKo}
                          </span>
                          <span className="font-serif text-[11px] text-[#5B6E8C]">{f.hanja}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-[5px] w-24 overflow-hidden bg-[#E5DAC5]">
                            <div
                              className="h-full bg-[#14213D]"
                              style={{
                                width: `${f.score}%`,
                                backgroundImage:
                                  'linear-gradient(90deg, #14213D 0%, #243B64 72%, #B89146 100%)',
                              }}
                            />
                          </div>
                          <span className="font-serif text-[11.5px] font-semibold text-[#7B5B1E]">
                            {f.grade}
                          </span>
                          <span className="font-mono text-[12px] font-semibold text-[#14213D] tabular-nums w-8 text-right">
                            {f.score}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-[12px] leading-[1.52] text-[#283854]">
                        {f.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimated MBTI Top 3 & Recommended Professions */}
              <div>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <h3 className="font-serif text-[15px] font-bold tracking-tight text-[#14213D]">
                    추정 MBTI TOP 3 &amp; 어울리는 직업{' '}
                    <span className="ml-1 font-serif text-[12px] font-normal text-[#7B5B1E]">
                      性向 推定
                    </span>
                  </h3>
                </div>

                <div className="divide-y divide-[#B89146]/35 border-t border-[#14213D]/20">
                  {profile.mbtiTop3.map((item) => (
                    <div key={item.rank} className="py-2.5 first:pt-2.5 last:pb-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2.5 min-w-0">
                          <span className="font-mono text-[11px] font-semibold text-[#7B5B1E] tabular-nums">
                            0{item.rank}
                          </span>
                          <span className="font-mono text-[15px] font-semibold tracking-wider text-[#14213D]">
                            {item.type}
                          </span>
                          <span aria-hidden="true" className="text-[#B89146]">
                            ·
                          </span>
                          <span className="text-[12px] font-medium text-[#33486B] truncate">
                            {item.roles.join(' / ')}
                          </span>
                        </div>
                        <span className="shrink-0 font-mono text-[11.5px] font-medium text-[#7B5B1E] tabular-nums">
                          일치 {item.probability}%
                        </span>
                      </div>
                      <p className="mt-1 pl-6 text-[11.8px] leading-[1.5] text-[#283854]">
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* BOTTOM PART: Comprehensive Synthesis (성향 · 첫인상 · 매력포인트 · 반전포인트 + 한줄조언) */}
          <section aria-label="종합 해석" className="mt-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="font-serif text-[15px] font-bold tracking-tight text-[#14213D]">
                종합 해석{' '}
                <span className="ml-1.5 font-serif text-[12px] font-normal text-[#7B5B1E]">
                  綜合 鑑評
                </span>
              </h3>
              <span className="text-[11px] text-[#5B6E8C]">
                {profile.attire.reason}
              </span>
            </div>

            <div className="grid grid-cols-4 divide-x divide-[#B89146]/40 border-t border-b border-[#14213D]/18 py-3.5">
              <div className="pr-5">
                <h4 className="font-serif text-[13px] font-bold text-[#14213D]">
                  성향 <span className="ml-1 text-[11px] font-normal text-[#7B5B1E]">氣質</span>
                </h4>
                <p className="mt-1.5 text-[12px] leading-[1.58] text-[#283854]">
                  {profile.synthesis.disposition}
                </p>
              </div>
              <div className="px-5">
                <h4 className="font-serif text-[13px] font-bold text-[#14213D]">
                  첫인상 <span className="ml-1 text-[11px] font-normal text-[#7B5B1E]">初印象</span>
                </h4>
                <p className="mt-1.5 text-[12px] leading-[1.58] text-[#283854]">
                  {profile.synthesis.firstImpression}
                </p>
              </div>
              <div className="px-5">
                <h4 className="font-serif text-[13px] font-bold text-[#14213D]">
                  매력포인트 <span className="ml-1 text-[11px] font-normal text-[#7B5B1E]">魅力</span>
                </h4>
                <p className="mt-1.5 text-[12px] leading-[1.58] text-[#283854]">
                  {profile.synthesis.charmPoint}
                </p>
              </div>
              <div className="pl-5">
                <h4 className="font-serif text-[13px] font-bold text-[#14213D]">
                  반전포인트 <span className="ml-1 text-[11px] font-normal text-[#7B5B1E]">反轉</span>
                </h4>
                <p className="mt-1.5 text-[12px] leading-[1.58] text-[#283854]">
                  {profile.synthesis.twistPoint}
                </p>
              </div>
            </div>

            {/* One-line Advice Colophon with Traditional Korean Square Seal */}
            <div className="mt-3.5 flex items-center justify-between gap-6 bg-[#F1EADC]/75 px-5 py-3 border-t border-b border-[#B89146]/50">
              <div className="flex items-baseline gap-3.5 min-w-0">
                <span className="shrink-0 font-serif text-[12px] font-bold tracking-[0.14em] text-[#7B5B1E]">
                  한줄조언 · 一言
                </span>
                <p className="font-serif text-[15.5px] font-semibold leading-snug text-[#14213D] [text-wrap:balance]">
                  “{profile.synthesis.oneLineAdvice}”
                </p>
              </div>

              {/* Traditional Vermilion Archival Stamp */}
              <div
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 flex-col items-center justify-center border border-[#9A2B2B] text-[#9A2B2B] font-serif text-[10px] font-bold leading-[1.15] tracking-widest select-none"
              >
                <span>觀相</span>
                <span>之印</span>
              </div>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
};
