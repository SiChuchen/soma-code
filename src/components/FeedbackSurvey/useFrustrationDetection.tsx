import type { Message } from '../../types/message.js'
import type { TranscriptShareResponse } from './TranscriptSharePrompt.js'

type FrustrationDetectionState =
  | 'closed'
  | 'open'
  | 'thanks'
  | 'transcript_prompt'
  | 'submitting'
  | 'submitted'

type FrustrationDetectionResult = {
  state: FrustrationDetectionState
  handleTranscriptSelect: (selected: TranscriptShareResponse) => void
}

export function useFrustrationDetection(
  messages: Message[],
  isLoading: boolean,
  hasActivePrompt: boolean,
  hasOtherVisibleSurvey: boolean,
): FrustrationDetectionResult {
  // Phase 1 compatibility layer: frustration detection is ant-only and the
  // original heuristic / survey trigger logic is not present in this snapshot.
  void messages
  void isLoading
  void hasActivePrompt
  void hasOtherVisibleSurvey

  return {
    state: 'closed',
    handleTranscriptSelect: (_selected: TranscriptShareResponse) => {},
  }
}
