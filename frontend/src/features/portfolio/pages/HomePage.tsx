/**
 * Home Page / Dashboard
 *
 * The landing page after login. Shows:
 * - Welcome banner with greeting
 * - Domain cards (Create Content, Explore Topics, etc.)
 * - Recent content section
 */

import { useNavigate } from 'react-router-dom'
import { FileText, Lightbulb, User, BarChart3, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useArtifacts } from '../hooks/useArtifacts'
import { ArtifactCard, CardSkeleton } from '../components'

/** Greeting based on time of day */
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Domain card data */
const DOMAIN_CARDS = [
  {
    id: 'content',
    icon: FileText,
    label: 'Create Content',
    title: 'Turn expertise into content',
    description: 'LinkedIn posts, blogs, and case studies that showcase your value.',
    href: '/portfolio',
    primary: true,
    cta: 'Start Creating',
  },
  {
    id: 'topics',
    icon: Lightbulb,
    label: 'Explore Topics',
    title: 'Discover what to write about',
    description: 'AI-powered research to find topics your audience cares about.',
    href: '/topics',
    primary: false,
    cta: 'Find Topics',
  },
  {
    id: 'profile',
    icon: User,
    label: 'Build Your Profile',
    title: 'Help AI understand you',
    description: 'Set up your background and writing style for personalized content.',
    href: '/profile',
    primary: false,
    cta: 'Set Up Profile',
  },
  {
    id: 'skills',
    icon: BarChart3,
    label: 'Track Skills',
    title: 'Document your expertise',
    description: 'Build a skills matrix for smarter content suggestions.',
    href: '/skills',
    primary: false,
    cta: 'Add Skills',
  },
]

export function HomePage() {
  const navigate = useNavigate()
  const greeting = getGreeting()

  // Fetch recent artifacts
  const { data: artifacts = [], isLoading } = useArtifacts()
  const recentArtifacts = artifacts.slice(0, 4)

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <section className="rounded-xl bg-gradient-to-br from-card to-surface-hover p-6 border border-border">
        <h1 className="text-display-md font-semibold text-foreground">
          {greeting}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Let's create something today.
        </p>
      </section>

      {/* Domain Cards Grid */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOMAIN_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.id}
                onClick={() => navigate(card.href)}
                className="group rounded-xl bg-card p-6 border border-border cursor-pointer
                          transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-brand-300 mb-2">
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{card.label}</span>
                    </div>
                    <h3 className="text-heading-md font-semibold text-foreground">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant={card.primary ? 'default' : 'secondary'}
                  className="mt-4 gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(card.href)
                  }}
                >
                  {card.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Recent Content Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-lg font-semibold text-foreground">
            Recent Content
          </h2>
          {artifacts.length > 0 && (
            <button
              onClick={() => navigate('/portfolio')}
              className="text-sm text-brand-300 hover:underline"
            >
              View All
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : recentArtifacts.length === 0 ? (
          <div className="rounded-xl bg-card p-8 border border-border text-center">
            <p className="text-muted-foreground">
              No content yet. Start creating to see your work here.
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate('/portfolio')}
            >
              Create Your First Content
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentArtifacts.map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                onEdit={() => navigate(`/portfolio/artifacts/${artifact.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default HomePage
