export const FEEDBACK_SURVEY_RESPONSES = [
  'dismissed',
  'bad',
  'fine',
  'good',
] as const

export type FeedbackSurveyResponse =
  (typeof FEEDBACK_SURVEY_RESPONSES)[number]

export const FEEDBACK_SURVEY_TYPES = [
  'session',
  'memory',
  'post_compact',
] as const

export type FeedbackSurveyType = (typeof FEEDBACK_SURVEY_TYPES)[number]

export function isFeedbackSurveyResponse(
  value: string,
): value is FeedbackSurveyResponse {
  return (FEEDBACK_SURVEY_RESPONSES as readonly string[]).includes(value)
}

export function isFeedbackSurveyType(
  value: string,
): value is FeedbackSurveyType {
  return (FEEDBACK_SURVEY_TYPES as readonly string[]).includes(value)
}
