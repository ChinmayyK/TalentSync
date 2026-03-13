import { PublicNavbar } from '@/components/public/PublicNavbar';
import { Hero } from '@/components/public/Hero';
import { TrustedBy } from '@/components/public/TrustedBy';
import { ProductShowcase } from '@/components/public/ProductShowcase';
import { FeaturesSection } from '@/components/public/FeaturesSection';
import { IntegrationsSection } from '@/components/public/IntegrationsSection';
import { HowItWorks } from '@/components/public/HowItWorks';
import { PricingCTA } from '@/components/public/PricingCTA';
import { Footer } from '@/components/public/Footer';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white">
            <PublicNavbar />
            <main>
                <Hero />
                <TrustedBy />
                <ProductShowcase />
                <FeaturesSection />
                <IntegrationsSection />
                <HowItWorks />
                <PricingCTA />
            </main>
            <Footer />
        </div>
    );
}
