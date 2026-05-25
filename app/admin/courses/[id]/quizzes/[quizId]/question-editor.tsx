'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Save } from 'lucide-react';
import { addQuestion } from '../actions';

type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false';

/**
 * Dynamic question editor. Switches its option-collection UI based on
 * the selected type:
 *   - single_choice / multiple_choice → 2-8 free-text options,
 *     marked correct via radio (single) or checkboxes (multiple)
 *   - true_false → hardcoded صح/خطأ, single radio chooses the answer
 */
export function QuestionEditor({
  quizId,
  courseId,
}: {
  quizId: string;
  courseId: string;
}) {
  const [type, setType] = useState<QuestionType>('single_choice');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctSingle, setCorrectSingle] = useState<number>(0);
  const [correctMulti, setCorrectMulti] = useState<Set<number>>(new Set([0]));

  const addOption = () => {
    if (options.length >= 8) return;
    setOptions([...options, '']);
  };
  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, i) => i !== idx);
    setOptions(next);
    // Fix correct indices after removal
    if (type === 'single_choice' && correctSingle >= next.length) {
      setCorrectSingle(0);
    }
    if (type === 'multiple_choice') {
      const fixed = new Set<number>();
      correctMulti.forEach((i) => {
        if (i < idx) fixed.add(i);
        else if (i > idx) fixed.add(i - 1);
      });
      if (fixed.size === 0) fixed.add(0);
      setCorrectMulti(fixed);
    }
  };

  const onTypeChange = (t: QuestionType) => {
    setType(t);
    if (t === 'true_false') {
      setOptions(['صح', 'خطأ']);
      setCorrectSingle(0);
    } else if (options.length < 2) {
      setOptions(['', '']);
    }
  };

  return (
    <form action={addQuestion} className="space-y-5">
      <input type="hidden" name="quiz_id" value={quizId} />
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {(
          [
            { value: 'single_choice', label: 'اختيار واحد' },
            { value: 'multiple_choice', label: 'اختيار متعدد' },
            { value: 'true_false', label: 'صح / خطأ' },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onTypeChange(t.value)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border ${
              type === t.value
                ? 'border-brand-500 bg-brand-500/10 text-brand-700'
                : 'border-gray-200 bg-white text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="question_ar">نص السؤال</Label>
        <textarea
          id="question_ar"
          name="question_ar"
          rows={2}
          required
          minLength={3}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="مثال: ما هو الناتج عند تشغيل ..."
        />
      </div>

      {/* Options */}
      <div className="space-y-2">
        <Label>الخيارات والإجابة الصحيحة</Label>

        {type === 'true_false' ? (
          <fieldset className="space-y-2">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white">
              <input type="radio" name="tf_correct" value="true" defaultChecked />
              <span>صح (الإجابة الصحيحة)</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white">
              <input type="radio" name="tf_correct" value="false" />
              <span>خطأ</span>
            </label>
          </fieldset>
        ) : (
          <div className="space-y-2">
            {options.map((opt, i) => {
              const isCorrect =
                type === 'single_choice'
                  ? correctSingle === i
                  : correctMulti.has(i);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  {type === 'single_choice' ? (
                    <input
                      type="radio"
                      name="correct_single"
                      value={i}
                      checked={correctSingle === i}
                      onChange={() => setCorrectSingle(i)}
                      className="w-4 h-4 accent-emerald-500"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      name={`correct_${i}`}
                      checked={correctMulti.has(i)}
                      onChange={(e) => {
                        const next = new Set(correctMulti);
                        if (e.target.checked) next.add(i);
                        else next.delete(i);
                        setCorrectMulti(next);
                      }}
                      className="w-4 h-4 accent-emerald-500"
                    />
                  )}
                  <Input
                    name={`option_${i}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    placeholder={`خيار ${i + 1}`}
                    required
                    maxLength={200}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(i)}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
            {options.length < 8 && (
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="w-4 h-4" />
                خيار إضافي
              </Button>
            )}
            <p className="text-xs text-gray-500">
              {type === 'single_choice'
                ? 'اختر خيار واحد كإجابة صحيحة.'
                : 'اختر إجابة واحدة أو أكثر كصحيحة.'}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="explanation_ar">شرح الإجابة (اختياري)</Label>
        <textarea
          id="explanation_ar"
          name="explanation_ar"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="يظهر للطالب بعد الإجابة"
        />
      </div>

      <div>
        <Button type="submit">
          <Save className="w-4 h-4" />
          حفظ السؤال
        </Button>
      </div>
    </form>
  );
}
