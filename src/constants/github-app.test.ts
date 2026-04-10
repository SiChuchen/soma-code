import { describe, expect, test } from 'bun:test'
import {
  GITHUB_WORKFLOW_TRIGGER,
  LEGACY_PRIMARY_WORKFLOW_PATH,
  LEGACY_REVIEW_WORKFLOW_PATH,
  PRIMARY_WORKFLOW_PATH,
  PR_BODY,
  REVIEW_WORKFLOW_PATH,
  WORKFLOW_CONTENT,
} from './github-app.js'
import { PRODUCT_URL } from './product.js'

describe('github app templates', () => {
  test('use somacode workflow paths and trigger mention in user-visible templates', () => {
    expect(PRIMARY_WORKFLOW_PATH).toBe('.github/workflows/somacode.yml')
    expect(REVIEW_WORKFLOW_PATH).toBe('.github/workflows/somacode-review.yml')
    expect(WORKFLOW_CONTENT).toContain(`contains(github.event.comment.body, '${GITHUB_WORKFLOW_TRIGGER}')`)
    expect(WORKFLOW_CONTENT).toContain('id: somacode')
    expect(WORKFLOW_CONTENT).not.toContain('@claude')
  })

  test('points PR content at somacode URLs and keeps legacy paths only for compatibility', () => {
    expect(PR_BODY).toContain(PRODUCT_URL)
    expect(PR_BODY).toContain(GITHUB_WORKFLOW_TRIGGER)
    expect(PR_BODY).not.toContain('https://claude.com')
    expect(LEGACY_PRIMARY_WORKFLOW_PATH).toBe('.github/workflows/claude.yml')
    expect(LEGACY_REVIEW_WORKFLOW_PATH).toBe(
      '.github/workflows/claude-code-review.yml',
    )
  })
})
