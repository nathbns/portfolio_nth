import { NextResponse } from 'next/server'

interface GitHubEvent {
  id: string
  type: string
  repo: {
    name: string
  }
  created_at: string
  payload: {
    commits?: Array<{
      message: string
      sha: string
    }>
    action?: string
    pull_request?: {
      title: string
      html_url: string
      merged: boolean
    }
    issue?: {
      title: string
      html_url: string
    }
    ref?: string
    ref_type?: string
  }
}

export interface FormattedActivity {
  id: string
  type: string
  repo: string
  description: string
  date: string
  link?: string
}

function formatEvent(event: GitHubEvent): FormattedActivity | null {
  const date = new Date(event.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  switch (event.type) {
    case 'PushEvent':
      const commits = event.payload.commits || []
      if (commits.length === 0) return null
      return {
        id: event.id,
        type: 'push',
        repo: event.repo.name,
        description: commits[0]?.message || 'Pushed commits',
        date,
        link: `https://github.com/${event.repo.name}/commit/${commits[0]?.sha}`
      }

    case 'PullRequestEvent':
      const pr = event.payload.pull_request
      if (!pr) return null
      return {
        id: event.id,
        type: event.payload.action === 'opened' ? 'pr-opened' :
              pr.merged ? 'pr-merged' : 'pr-closed',
        repo: event.repo.name,
        description: pr.title,
        date,
        link: pr.html_url
      }

    case 'IssuesEvent':
      const issue = event.payload.issue
      if (!issue) return null
      return {
        id: event.id,
        type: `issue-${event.payload.action}`,
        repo: event.repo.name,
        description: issue.title,
        date,
        link: issue.html_url
      }

    case 'CreateEvent':
      return {
        id: event.id,
        type: 'create',
        repo: event.repo.name,
        description: `Created ${event.payload.ref_type}${event.payload.ref ? `: ${event.payload.ref}` : ''}`,
        date,
        link: `https://github.com/${event.repo.name}`
      }

    case 'WatchEvent':
      return {
        id: event.id,
        type: 'star',
        repo: event.repo.name,
        description: 'Starred repository',
        date,
        link: `https://github.com/${event.repo.name}`
      }

    case 'ForkEvent':
      return {
        id: event.id,
        type: 'fork',
        repo: event.repo.name,
        description: 'Forked repository',
        date,
        link: `https://github.com/${event.repo.name}`
      }

    default:
      return null
  }
}

export async function GET() {
  try {
    const response = await fetch(
      'https://api.github.com/users/nathbns/events/public?per_page=30',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'nathbns-portfolio',
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
          })
        },
        cache: 'no-store'
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`GitHub API error: ${response.status} - ${errorText}`)
      throw new Error(`GitHub API returned ${response.status}`)
    }

    const events: GitHubEvent[] = await response.json()
    const activities = events
      .map(formatEvent)
      .filter((event): event is FormattedActivity => event !== null)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      activities
    })
  } catch (error) {
    console.error('GitHub API error:', error)
    return NextResponse.json({
      success: false,
      activities: []
    }, { status: 500 })
  }
}
