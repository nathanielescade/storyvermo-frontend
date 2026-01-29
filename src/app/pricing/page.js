import Link from 'next/link';
import PaystackButton from '@/components/PaystackButton';

export const metadata = {
  title: 'Pricing - StoryVermo',
  description: 'Choose the perfect plan for your storytelling journey',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Header Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-purple-200 mb-2">
            Choose the plan that fits your storytelling needs
          </p>
          <p className="text-lg text-purple-300">
            Start free and upgrade whenever you&apos;re ready
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Explorer Plan */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-slate-800 rounded-2xl p-8 border border-slate-700">
                <div className="mb-8">
                  <span className="text-4xl">✨</span>
                  <h3 className="text-3xl font-bold text-white mt-4">Explorer</h3>
                  <p className="text-purple-300 mt-2">For personal stories & first steps</p>
                </div>

                <div className="mb-8">
                  <p className="text-5xl font-bold text-white">
                    Free
                    <span className="text-xl text-purple-300 font-normal"> Forever</span>
                  </p>
                </div>

                <button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 rounded-lg transition duration-200 mb-8">
                  Get Started
                </button>

                <div className="space-y-4 mb-8">
                  <p className="text-purple-200 font-semibold mb-6">What&apos;s Included:</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="text-cyan-400 mr-3 mt-1">✓</span>
                      <span className="text-slate-300">Unlimited Stories</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-cyan-400 mr-3 mt-1">✓</span>
                      <span className="text-slate-300">10 Verses per Story</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-cyan-400 mr-3 mt-1">✓</span>
                      <span className="text-slate-300">5 Moments per Verse</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-700">
                  <p className="text-purple-300 text-sm">
                    <span className="font-semibold">Perfect for:</span> Documenting trips, personal projects, trying the platform
                  </p>
                </div>
              </div>
            </div>

            {/* Creator Plan */}
            <div className="relative group transform md:scale-105 md:-mt-6">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border-2 border-purple-500 shadow-2xl">
                
                <div className="absolute top-6 right-6">
                  <span className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                    Most Popular
                  </span>
                </div>

                <div className="mb-8 pt-4">
                  <span className="text-4xl">🚀</span>
                  <h3 className="text-3xl font-bold text-white mt-4">Creator</h3>
                  <p className="text-purple-300 mt-2">For serious businesses & professionals</p>
                </div>

                <div className="mb-8">
                  <div className="space-y-2">
                    <p className="text-4xl font-bold text-white">
                      GH₵ 1
                      <span className="text-lg text-purple-300 font-normal"> / month (TEST)</span>
                    </p>
                    <p className="text-purple-300 text-sm">
                      Or <span className="font-bold text-white">GH₵ 2,490</span>/year (Save 17%)
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <PaystackButton
                    planType="monthly"
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-lg transition duration-200"
                  />
                  <p className="text-purple-300 text-xs text-center">Full refund within 14 days if not satisfied</p>
                </div>

                <div className="space-y-4 mb-8">
                  <p className="text-purple-200 font-semibold mb-6">Everything in Explorer, plus:</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="text-purple-400 mr-3 mt-1">★</span>
                      <span className="text-slate-300">Unlimited Stories</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-purple-400 mr-3 mt-1">★</span>
                      <span className="text-slate-300">30 Verses per Story</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-purple-400 mr-3 mt-1">★</span>
                      <span className="text-slate-300">10 Moments per Verse</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-purple-400 mr-3 mt-1">★</span>
                      <span className="text-slate-300">1 CTA Button per Verse</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-purple-400 mr-3 mt-1">★</span>
                      <span className="text-slate-300">Link to site, booking page, WhatsApp, etc.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-700">
                  <p className="text-purple-300 text-sm">
                    <span className="font-semibold">Perfect for:</span> Hotels, Real Estate Agents, E-commerce Sellers, Event Planners, Tour Operators, Content Creators
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-700">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-8">
            <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-3">What are the billing options?</h3>
              <p className="text-slate-300">
                You have two flexible options: Pay <span className="font-semibold text-white">monthly at GH₵ 249/month</span>, or save 17% by paying <span className="font-semibold text-white">annually at GH₵ 2,490/year</span>. Choose what works best for your business.
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-3">Can I switch from monthly to annual billing?</h3>
              <p className="text-slate-300">
                Yes! You can switch between monthly and annual billing anytime. If you switch to annual, you&apos;ll get a 17% discount. Pro-rata adjustments apply if you switch mid-cycle.
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-3">Is there a free trial for Creator?</h3>
              <p className="text-slate-300">
                Yes! Start with our monthly plan at GH₵ 1 (test price). If you&apos;re not satisfied in the first 14 days, we offer a full refund. No questions asked.
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-3">What payment methods do you accept?</h3>
              <p className="text-slate-300">
                We accept all major credit cards, mobile money, and bank transfers. All payments are secure and encrypted.
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-3">Can I cancel anytime?</h3>
              <p className="text-slate-300">
                Absolutely! You can cancel your subscription anytime. Your stories remain accessible and you can keep any content you&apos;ve created.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Tell Your Story?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Start sharing your story journey today. It only takes 2 minutes to get started.
          </p>
          <Link href="/signup">
            <button className="bg-white hover:bg-gray-100 text-purple-600 font-bold py-4 px-8 rounded-lg transition duration-200 text-lg">
              Create Your First Story
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
