#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/run-recovery-cli.sh <mode> [claude-cli-args...]

Modes:
  anthropic        Use ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL
  minimax          Use ANTHROPIC_COMPAT_PRESET=minimax
  glm              Use ANTHROPIC_COMPAT_PRESET=glm
  kimi             Use ANTHROPIC_COMPAT_PRESET=kimi
  deepseek         Use ANTHROPIC_COMPAT_PRESET=deepseek
  qwen             Use ANTHROPIC_COMPAT_PRESET=qwen
  tencent-plan     Use ANTHROPIC_COMPAT_PRESET=tencent-plan
  hunyuan-anthropic Use ANTHROPIC_COMPAT_PRESET=hunyuan-anthropic
  stepfun          Use ANTHROPIC_COMPAT_PRESET=stepfun
  xfyun            Use ANTHROPIC_COMPAT_PRESET=xfyun
  qianfan-anthropic Use ANTHROPIC_COMPAT_PRESET=qianfan-anthropic
  openai           Use generic OpenAI-compatible env
  moonshot         Use OPENAI_COMPAT_PROFILE=moonshot
  qianfan          Use OPENAI_COMPAT_PROFILE=qianfan
  hunyuan          Use OPENAI_COMPAT_PROFILE=hunyuan
  xfyun-openai     Use OPENAI_COMPAT_PROFILE=xfyun
  ollama           Use OPENAI_COMPAT_PROFILE=ollama
  lmstudio         Use OPENAI_COMPAT_PROFILE=lmstudio
  azure-chat       Use OPENAI_COMPAT_PROFILE=azure for chat/completions
  azure-responses  Use OPENAI_COMPAT_PROFILE=azure for responses
  authless         Use OPENAI_COMPAT_PROFILE=authless

Isolation defaults:
  CCR_HOME=/tmp/cc-recovery-home
  CCR_WORKSPACE_ROOT=/tmp/cc-recovery-ws
  CCR_WORKSPACE overrides the per-mode workspace path

Examples:
  ANTHROPIC_AUTH_TOKEN=xxx scripts/run-recovery-cli.sh minimax
  OPENAI_API_KEY=xxx scripts/run-recovery-cli.sh qianfan -p --output-format text "hello"
  OPENAI_MODEL=qwen2.5-coder:14b scripts/run-recovery-cli.sh ollama
  OPENAI_MODEL=gpt-4.1 OPENAI_BASE_URL=https://host/v1 OPENAI_API_KEY=sk-xxx \
    scripts/run-recovery-cli.sh openai -p --output-format json "hello"
  OPENAI_MODEL=my-deployment \
  OPENAI_BASE_URL='https://host/openai/deployments/my-deployment/chat/completions?api-version=2026-04-01-preview' \
  OPENAI_API_KEY=xxx scripts/run-recovery-cli.sh azure-chat
EOF
}

append_env_if_set() {
  local name="$1"
  if [[ -v "$name" ]]; then
    ENV_ARGS+=("${name}=${!name}")
  fi
}

set_default_if_unset() {
  local name="$1"
  local value="$2"
  if [[ ! -v "$name" ]]; then
    printf -v "$name" '%s' "$value"
  fi
}

append_openai_compat_envs() {
  append_env_if_set "CLAUDE_CODE_USE_OPENAI_COMPAT"
  append_env_if_set "OPENAI_COMPAT_PROFILE"
  append_env_if_set "OPENAI_BASE_URL"
  append_env_if_set "OPENAI_MODEL"
  append_env_if_set "OPENAI_API_KEY"
  append_env_if_set "OPENAI_COMPAT_API_FORMAT"
  append_env_if_set "OPENAI_API_KEY_HEADER"
  append_env_if_set "OPENAI_API_KEY_SCHEME"
  append_env_if_set "OPENAI_COMPAT_DISABLE_AUTH"
  append_env_if_set "OPENAI_COMPAT_CUSTOM_HEADERS"
  append_env_if_set "OPENAI_COMPAT_EXTRA_BODY"
}

append_anthropic_envs() {
  append_env_if_set "ANTHROPIC_COMPAT_PRESET"
  append_env_if_set "ANTHROPIC_API_KEY"
  append_env_if_set "ANTHROPIC_AUTH_TOKEN"
  append_env_if_set "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR"
  append_env_if_set "ANTHROPIC_BASE_URL"
  append_env_if_set "ANTHROPIC_MODEL"
  append_env_if_set "ANTHROPIC_DEFAULT_OPUS_MODEL"
  append_env_if_set "ANTHROPIC_DEFAULT_SONNET_MODEL"
  append_env_if_set "ANTHROPIC_DEFAULT_HAIKU_MODEL"
  append_env_if_set "ANTHROPIC_SMALL_FAST_MODEL"
  append_env_if_set "CLAUDE_CODE_SUBAGENT_MODEL"
  append_env_if_set "ENABLE_TOOL_SEARCH"
  append_env_if_set "API_TIMEOUT_MS"
}

MODE="${1:-}"
if [[ -z "$MODE" || "$MODE" == "--help" || "$MODE" == "-h" ]]; then
  usage
  exit 0
fi
shift || true

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
RUNNER="${REPO_ROOT}/scripts/run-source-cli.mjs"

if [[ ! -f "$RUNNER" ]]; then
  echo "Source runner not found: $RUNNER" >&2
  exit 1
fi

CCR_HOME="${CCR_HOME:-/tmp/cc-recovery-home}"
CCR_WORKSPACE_ROOT="${CCR_WORKSPACE_ROOT:-/tmp/cc-recovery-ws}"
CCR_WORKSPACE="${CCR_WORKSPACE:-${CCR_WORKSPACE_ROOT}/${MODE}}"

mkdir -p "$CCR_HOME" "$CCR_WORKSPACE"

ENV_ARGS=(
  "PATH=${PATH}"
  "HOME=${CCR_HOME}"
  "TERM=${TERM:-xterm-256color}"
  "DISABLE_ERROR_REPORTING=${DISABLE_ERROR_REPORTING:-1}"
  "DISABLE_TELEMETRY=${DISABLE_TELEMETRY:-1}"
  "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=${CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:-1}"
)

case "$MODE" in
  anthropic)
    append_anthropic_envs
    ;;
  minimax)
    set_default_if_unset "ANTHROPIC_COMPAT_PRESET" "minimax"
    set_default_if_unset "ANTHROPIC_BASE_URL" "https://api.minimax.chat/v1"
    append_anthropic_envs
    ;;
  glm)
    set_default_if_unset "ANTHROPIC_COMPAT_PRESET" "glm"
    set_default_if_unset "ANTHROPIC_BASE_URL" "https://open.bigmodel.cn/api/anthropic"
    append_anthropic_envs
    ;;
  kimi)
    set_default_if_unset "ANTHROPIC_COMPAT_PRESET" "kimi"
    set_default_if_unset "ANTHROPIC_BASE_URL" "https://api.moonshot.ai/anthropic"
    append_anthropic_envs
    ;;
  deepseek)
    set_default_if_unset "ANTHROPIC_COMPAT_PRESET" "deepseek"
    set_default_if_unset "ANTHROPIC_BASE_URL" "https://api.deepseek.com/anthropic"
    append_anthropic_envs
    ;;
  qwen)
    set_default_if_unset "ANTHROPIC_COMPAT_PRESET" "qwen"
    set_default_if_unset "ANTHROPIC_BASE_URL" "https://dashscope.aliyuncs.com/api/v2/apps/anthropic"
    append_anthropic_envs
    ;;
  tencent-plan)
    set_default_if_unset "ANTHROPIC_COMPAT_PRESET" "tencent-plan"
    set_default_if_unset "ANTHROPIC_BASE_URL" "https://api.lkeap.cloud.tencent.com/v1/anthropic"
    append_anthropic_envs
    ;;
  hunyuan-anthropic)
    set_default_if_unset "ANTHROPIC_COMPAT_PRESET" "hunyuan-anthropic"
    set_default_if_unset "ANTHROPIC_BASE_URL" "https://api.hunyuan.cloud.tencent.com/v1/anthropic"
    append_anthropic_envs
    ;;
  stepfun)
    set_default_if_unset "ANTHROPIC_COMPAT_PRESET" "stepfun"
    set_default_if_unset "ANTHROPIC_BASE_URL" "https://api.stepfun.com/step_plan"
    append_anthropic_envs
    ;;
  xfyun)
    set_default_if_unset "ANTHROPIC_COMPAT_PRESET" "xfyun"
    set_default_if_unset "ANTHROPIC_BASE_URL" "https://maas-coding-api.cn-huabei-1.xf-yun.com/anthropic"
    append_anthropic_envs
    ;;
  qianfan-anthropic)
    set_default_if_unset "ANTHROPIC_COMPAT_PRESET" "qianfan-anthropic"
    set_default_if_unset "ANTHROPIC_BASE_URL" "https://qianfan.baidubce.com/v2/anthropic"
    append_anthropic_envs
    ;;
  openai)
    set_default_if_unset "CLAUDE_CODE_USE_OPENAI_COMPAT" "1"
    append_openai_compat_envs
    ;;
  moonshot)
    set_default_if_unset "CLAUDE_CODE_USE_OPENAI_COMPAT" "1"
    set_default_if_unset "OPENAI_COMPAT_PROFILE" "moonshot"
    append_openai_compat_envs
    ;;
  qianfan)
    set_default_if_unset "CLAUDE_CODE_USE_OPENAI_COMPAT" "1"
    set_default_if_unset "OPENAI_COMPAT_PROFILE" "qianfan"
    append_openai_compat_envs
    ;;
  hunyuan)
    set_default_if_unset "CLAUDE_CODE_USE_OPENAI_COMPAT" "1"
    set_default_if_unset "OPENAI_COMPAT_PROFILE" "hunyuan"
    append_openai_compat_envs
    ;;
  xfyun-openai)
    set_default_if_unset "CLAUDE_CODE_USE_OPENAI_COMPAT" "1"
    set_default_if_unset "OPENAI_COMPAT_PROFILE" "xfyun"
    append_openai_compat_envs
    ;;
  ollama)
    set_default_if_unset "CLAUDE_CODE_USE_OPENAI_COMPAT" "1"
    set_default_if_unset "OPENAI_COMPAT_PROFILE" "ollama"
    append_openai_compat_envs
    ;;
  lmstudio)
    set_default_if_unset "CLAUDE_CODE_USE_OPENAI_COMPAT" "1"
    set_default_if_unset "OPENAI_COMPAT_PROFILE" "lmstudio"
    append_openai_compat_envs
    ;;
  azure-chat)
    set_default_if_unset "CLAUDE_CODE_USE_OPENAI_COMPAT" "1"
    set_default_if_unset "OPENAI_COMPAT_PROFILE" "azure"
    append_openai_compat_envs
    ;;
  azure-responses)
    set_default_if_unset "CLAUDE_CODE_USE_OPENAI_COMPAT" "1"
    set_default_if_unset "OPENAI_COMPAT_PROFILE" "azure"
    set_default_if_unset "OPENAI_COMPAT_API_FORMAT" "responses"
    append_openai_compat_envs
    ;;
  authless)
    set_default_if_unset "CLAUDE_CODE_USE_OPENAI_COMPAT" "1"
    set_default_if_unset "OPENAI_COMPAT_PROFILE" "authless"
    append_openai_compat_envs
    ;;
  *)
    echo "Unsupported mode: ${MODE}" >&2
    usage
    exit 1
    ;;
esac

cd "$CCR_WORKSPACE"
exec env -i "${ENV_ARGS[@]}" bun "$RUNNER" "$@"
