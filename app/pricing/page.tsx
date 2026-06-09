import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { APP_NAME, PLANS, ROUTES } from '@/lib/constants';
import { CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';

export default async function PricingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.dashboard}>لوحتي</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href={ROUTES.login}>دخول</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={ROUTES.signup}>تسجيل</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-brand-500/30 bg-brand-500/10">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-medium text-brand-700">اشتراك واحد، كل الكورسات</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold mb-4">
            خطة <span className="text-gradient-brand">واضحة</span>، سعر بسيط
          </h1>
          <p className="text-gray-600 text-lg">
            اختار اللي يناسبك. ممكن تلغي في أي وقت من غير أسئلة.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <PlanCard plan={PLANS.monthly} user={user} />
          <PlanCard plan={PLANS.yearly} user={user} featured />
        </div>

        {/* FAQ Hint */}
        <div className="mt-16 text-center">
          <h3 className="font-display text-2xl font-bold mb-2">عندك سؤال؟</h3>
          <p className="text-gray-500 mb-4">تواصل معانا على واتساب أو الإيميل</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/contact">اتواصل معانا</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/faq">أسئلة شائعة</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function PlanCard({
  plan,
  user,
  featured = false,
}: {
  plan: typeof PLANS.monthly | typeof PLANS.yearly;
  user: any;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative p-8 rounded-2xl border transition-all ${
        featured
          ? 'bg-gradient-to-br from-brand-500/10 to-white border-brand-500/50 shadow-2xl shadow-brand-500/10'
          : 'bg-white border-gray-200'
      }`}
    >
      {featured && 'badge' in plan && plan.badge && (
        <div className="absolute -top-3 right-6 px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded-full shadow-lg shadow-brand-500/30">
          {plan.badge}
        </div>
      )}

      <h3 className="font-display text-2xl font-bold mb-2">{plan.name}</h3>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-5xl font-extrabold font-display">${plan.price}</span>
        <span className="text-gray-500">/ {plan.interval === 'month' ? 'شهر' : 'سنة'}</span>
      </div>

      {plan.interval === 'year' && (
        <p className="text-sm text-brand-600 mb-6">
          (يعني $3.33/شهر بدل $5)
        </p>
      )}
      {plan.interval === 'month' && <div className="mb-6 h-5" />}

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={featured ? 'default' : 'outline'}
        size="lg"
        className="w-full"
      >
        {user ? (
          <Link href={`/checkout?plan=${plan.id}`}>
            اشترك دلوقتي
            <ArrowLeft className="w-4 h-4" />
          </Link>
        ) : (
          <Link
            href={`${ROUTES.signup}?redirect=${encodeURIComponent(`/checkout?plan=${plan.id}`)}&plan=${plan.id}`}
          >
            ابدأ — سجّل أولاً
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
      </Button>
    </div>
  );
}
