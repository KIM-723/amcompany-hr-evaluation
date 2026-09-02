'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { analyzeDiagnosisProgressAction } from '@/app/diagnoses/ai-actions';

function progressLabel(progress: number) {
  if (progress < 15) return '분석 준비';
  if (progress < 35) return '진단내용 정리';
  if (progress < 65) return 'AI 핵심가치 분석 요청';
  if (progress < 85) return '점수·근거 생성';
  if (progress < 100) return '결과 저장';
  return '완료';
}

export function AIAnalysisProgressButton({
  diagnosisId,
  label = 'AI 분석',
  className = '',
}: {
  diagnosisId: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  async function run() {
    if (running) return;

    setRunning(true);
    setProgress(5);
    setMessage('AI 분석을 시작했습니다.');
    setError('');

    // OpenAI API는 내부 실제 처리 퍼센트를 제공하지 않으므로
    // 단일 분석은 처리 단계 기반 진행 표시를 92%까지만 보여준다.
    timerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;

        if (current < 20) return current + 4;
        if (current < 55) return current + 3;
        if (current < 80) return current + 2;
        return current + 1;
      });
    }, 700);

    try {
      const result = await analyzeDiagnosisProgressAction(diagnosisId);

      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (!result.ok) {
        setError(result.message);
        setMessage('');
        setProgress(0);
        setRunning(false);
        return;
      }

      setProgress(100);
      setMessage(result.message);

      window.setTimeout(() => {
        router.refresh();
        setRunning(false);
      }, 700);
    } catch (caught) {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setProgress(0);
      setRunning(false);
      setMessage('');
      setError(
        caught instanceof Error
          ? caught.message
          : 'AI 분석 요청 중 오류가 발생했습니다.',
      );
    }
  }

  return (
    <div className="min-w-[150px]">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className={
          className ||
          'w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60'
        }
      >
        {running ? `${progress}% · ${progressLabel(progress)}` : label}
      </button>

      {running && (
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>{progressLabel(progress)}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {!running && message && (
        <div className="mt-1 text-[11px] font-semibold text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-2 max-w-[360px] rounded-lg bg-red-50 p-2 text-[11px] font-semibold leading-5 text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

export function AIBatchAnalysisProgressButton({
  diagnoses,
}: {
  diagnoses: Array<{
    id: string;
    employeeName: string;
  }>;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [currentName, setCurrentName] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const total = diagnoses.length;
  const progress =
    total === 0
      ? 100
      : Math.round((completed / total) * 100);

  async function runBatch() {
    if (running || total === 0) return;

    setRunning(true);
    setCompleted(0);
    setMessage('');
    setErrors([]);

    let successCount = 0;
    const nextErrors: string[] = [];

    for (let index = 0; index < diagnoses.length; index += 1) {
      const diagnosis = diagnoses[index];

      setCurrentName(diagnosis.employeeName);

      try {
        const result = await analyzeDiagnosisProgressAction(diagnosis.id);

        if (result.ok) {
          successCount += 1;
        } else {
          nextErrors.push(`${diagnosis.employeeName}: ${result.message}`);
        }
      } catch (caught) {
        nextErrors.push(
          `${diagnosis.employeeName}: ${
            caught instanceof Error
              ? caught.message
              : 'AI 분석 요청 오류'
          }`,
        );
      }

      setCompleted(index + 1);
    }

    setCurrentName('');
    setErrors(nextErrors);

    setMessage(
      nextErrors.length === 0
        ? `${successCount}명 AI 분석을 완료했습니다.`
        : `${successCount}명 완료 · ${nextErrors.length}명 오류`,
    );

    setRunning(false);
    router.refresh();
  }

  return (
    <div className="min-w-[260px]">
      <button
        type="button"
        onClick={runBatch}
        disabled={running || total === 0}
        className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {running
          ? `${completed}/${total}명 · ${progress}%`
          : total > 0
            ? `${total}명 AI 분석`
            : '분석대상 없음'}
      </button>

      {running && (
        <div className="mt-2 rounded-xl border bg-white p-3">
          <div className="flex justify-between text-xs font-semibold text-slate-700">
            <span>
              {currentName
                ? `${currentName} 분석 중`
                : 'AI 분석 진행 중'}
            </span>
            <span>{progress}%</span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            실제 완료 인원 기준 진행률입니다. 분석 중에는 이 화면을 닫지 않는 것을 권장합니다.
          </div>
        </div>
      )}

      {!running && message && (
        <div
          className={`mt-2 rounded-lg p-2 text-xs font-semibold ${
            errors.length > 0
              ? 'bg-amber-50 text-amber-800'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {message}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-red-50 p-2 text-[11px] leading-5 text-red-700">
          {errors.map((item, index) => (
            <div key={index}>{item}</div>
          ))}
        </div>
      )}
    </div>
  );
}
