# Soma Code

[English README](./README.md)

soma code 原型由顶尖被开源项目重构而来。

Soma Code 是一个面向终端场景的 AI 编码 CLI。它允许你在本地项目中直接与模型协作，完成代码阅读、修改、重构、调试、配置管理和日常开发任务。

当前公开仓库：

- GitHub: `https://github.com/SiChuchen/soma-code`

## 项目定位

Soma Code 的目标不是做一个单纯的“问答命令行”，而是一个真正可用于开发流程的终端代理工具：

- 在当前工作目录中理解项目上下文
- 通过交互式命令配置模型、Provider 和默认行为
- 在本地文件系统中读写代码和配置
- 支持项目级和用户级配置分层
- 兼容多种模型接入方式，而不是绑定单一厂商

## 核心能力

- 终端交互式 AI 编码助手
- `/config` 统一管理 API Provider、Base URL、鉴权与模型设置
- `/login` 处理需要登录的能力
- `/model` 查看和切换当前已配置模型
- 支持 OpenAI-compatible provider
- 用户配置目录默认使用 `~/.soma`
- 项目配置目录默认使用 `.soma/`
- 保留部分旧版远端流程与迁移兼容层

## 安装

如果当前环境里还没有 Bun，可以先安装 Bun，也可以在首次运行 `soma` 时让它自动解析 / 下载 Bun。

支持的安装方式请查看 [INSTALL.md](./INSTALL.md)。

## 特性说明

### OpenAI-compatible 接入

Soma 可以连接提供 OpenAI 风格 API 的模型服务。

如何使用：

- 打开 `/config`
- 选择使用 `OpenAI-compatible` 路由的 Provider 或自定义 Provider
- 填写 `Base URL`
- 填写 `API key`
- 填写上游 `Provider model`
- `API key header`、`API auth scheme`、`Disable auth` 这几个高级项，只有在上游服务文档明确要求时才需要改

说明：

- `/config` 已经内置 OpenAI-compatible 配置面板与兼容层处理逻辑
- 当前支持的 OpenAI-compatible profile 包括本地 / 无鉴权网关，以及 Azure OpenAI、Ollama、LM Studio、Moonshot/Kimi、Qianfan、Hunyuan、iFlytek、ChatGPT 风格路由等
- 大多数此类网关的 `Base URL` 都是服务根地址，通常以 `/v1` 结尾

### Anthropic-compatible 接入

Soma 也支持使用 Anthropic-compatible 协议语义的接口。

如何使用：

- 打开 `/config`
- 新增或选择一个 `Anthropic-compatible` 连接
- 填写该服务要求的 `Base URL` 和模型名
- 然后像其它模型路由一样，通过 `/model` 或默认模型配置使用它

说明：

- inference registry 已将 `Anthropic-compatible` 作为一类正式连接类型
- Anthropic-compatible 与 OpenAI-compatible 在内部是两套独立兼容模式

### OpenAI 认证 / ChatGPT OAuth 风格接入

除了直接填写 API key，soma 也支持基于 ChatGPT OAuth 的接入路径。

如何使用：

- 打开 `/config`
- 进入对应的 Provider / connection 配置项
- 在可用时启动 ChatGPT 授权流程
- 授权完成后即可正常使用该路由下的模型

说明：

- `/config` 已集成 `startChatGPTOAuth`、`getChatGPTOAuthData` 和 `revokeChatGPTAuth`
- inference client 会为 ChatGPT 驱动的 OpenAI-compatible 请求自动注入所需 OAuth headers

### Dream

`/dream` 用于启动一次后台记忆整理任务。

如何使用：

- 执行 `/dream`
- soma 会在后台启动 dream
- 打开 `/tasks` 查看进度

说明：

- 如果自上次整理后没有新的 session，dream 会直接检查现有 memory 文件
- dream 依赖 auto-memory 已开启

### Public Mode

Public Mode 是当前公开 / 非公开呈现控制的正式入口。

如何使用：

- `/public-mode`
- `/public-mode status`
- `/public-mode on`
- `/public-mode off`
- `/public-mode auto`
- `/public-mode default on`
- `/public-mode default off`
- `/public-mode default auto`
- `/public-mode default clear`

说明：

- `/undercover` 仍作为兼容别名保留，底层加载的是同一套实现
- 当前 UI 中也已直接显示为 `public mode`
- 旧的 Anti-Distillation 命名已不再是主要用户入口；当前正式支持的机制是 Public Mode

### Coordinator Mode

Coordinator Mode 用于让当前项目中的新会话以 coordinator 模式启动。

如何使用：

- `/coordinator`
- `/coordinator status`
- `/coordinator on`
- `/coordinator off`
- `/coordinator default on`
- `/coordinator default off`
- `/coordinator default clear`

说明：

- 项目级设置会影响当前仓库后续新开的 session
- 用户级 default 会影响未来全局新会话
- 已经运行中的当前 session 不会因为写入 default 而被追溯修改

### 本地 autoDream

Soma 内置了本地 auto-dream，用于自动进行记忆整理。

如何使用：

- 打开记忆相关界面
- 切换 `Auto-dream: on`
- 你仍然可以随时手动执行 `/dream`

说明：

- auto-dream 只有在 auto-memory 开启时才有意义
- 记忆界面已经会展示 auto-dream 状态，并在空闲时提示可以执行 `/dream`
- auto-dream 在 remote mode 下不会运行，在 KAIROS 激活时也会跳过

### KAIROS

KAIROS 是 soma 内部一组受 feature gate 控制的 assistant / proactive 能力。

如何使用：

- 使用启用了 `KAIROS` feature gate 的构建或运行环境
- 启用后，soma 会开放与 KAIROS 相关的 assistant、proactive、brief 等能力路径

说明：

- KAIROS 在启动阶段和命令注册阶段都会参与装配
- 代码中还存在 `KAIROS_BRIEF`、`KAIROS_GITHUB_WEBHOOKS` 等相关 gate
- 部分 KAIROS 能力依赖 entitlement 或运行时 gate，而不是单个永远可见的 slash command

### BUDDY

BUDDY 是一个轻量级内置陪伴系统。

如何使用：

- `/buddy`
- `/buddy hatch`
- `/buddy pet`
- `/buddy status`
- `/buddy mute`
- `/buddy unmute`
- `/buddy help`

行为说明：

- 如果你还没有 buddy，执行 `/buddy` 会先 hatch 一个
- 如果已经有 buddy，执行 `/buddy` 会 pet 它

### WebBrowser

Soma 内置了 WebBrowser 工具体系，用于浏览器页面检查和交互。

如何使用：

- 启用浏览器工具对应的 feature gate，或者设置 `CLAUDE_CODE_ENABLE_WEB_BROWSER_TOOL`
- 然后在需要浏览器交互时，让 agent 使用 `WebBrowser` 工具

当前 schema 中支持的动作：

- `navigate`
- `snapshot`
- `click`
- `type`
- `wait`
- `evaluate`
- `screenshot`
- `console`
- `network`
- `close`

说明：

- 该工具主要面向本地开发服务器、截图、控制台检查、网络请求检查以及轻量页面交互
- 当前这份代码快照里，浏览器工具的 shell 和 schema 已存在，但同时也保留了“浏览器后端尚未接通时不可用”的兜底提示

## 适用场景

- 阅读和理解陌生代码库
- 修改或重构已有项目
- 调试 API 配置、模型接入和登录流程
- 在团队项目中保存项目级约定和配置
- 通过终端直接驱动日常开发操作

## 环境要求

- Node.js `>= 18`
- Bun `>= 1.2.23`
- npm `>= 9`

从 [bin/soma.js](./bin/soma.js) 可以看到，`soma` 会通过 Bun 启动主 CLI。因此 Bun 必须在 `PATH` 中，或者能通过 `SOMA_BUN_BIN` 指向其可执行文件。

## 安装依赖

### Windows

先安装 Node.js LTS 和 Bun：

```powershell
winget install --id OpenJS.NodeJS.LTS -e --source winget
winget install --id Oven-sh.Bun -e --source winget
```

重新打开终端后验证：

```powershell
node -v
npm -v
bun --version
```

如果 Bun 已安装但仍不在 `PATH` 中，可以在运行 `soma` 前设置 `SOMA_BUN_BIN` 指向 `bun.exe` 的完整路径。

### Linux

先通过发行版包管理器安装 `Node.js >= 18` 和 `npm >= 9`，然后安装 `unzip`，因为 Bun 官方安装脚本依赖它：

```bash
sudo apt install -y unzip
curl -fsSL https://bun.com/install | bash
```

如果当前 shell 没有自动识别 Bun，可手动加入 `PATH`：

```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

然后验证：

```bash
node -v
npm -v
bun --version
```

## 安装 Soma

依赖准备完成后，Windows 和 Linux 的 `soma` 安装方式相同。

### 方式一：通过 npm 直接从 GitHub 仓库安装

推荐安装命令：

```bash
npm install -g github:SiChuchen/soma-code
```

如果你使用的是精简 Linux 镜像，并且安装阶段不需要可选的原生图像处理依赖，也可以用下面这个命令跳过可选依赖：

```bash
npm install -g --omit=optional github:SiChuchen/soma-code
```

安装后可直接运行：

```bash
soma --help
soma --version
soma
```

补充命令别名：

```bash
somacode --help
soma-code --help
```

### 方式二：本地安装

如果你已经把仓库源码下载到本地，可以直接从本地目录安装：

```bash
cd soma-code
npm install -g .
```

如果你拿到的是已经打好的包，例如 `soma-code-1.0.0.tgz`，也可以直接安装：

```bash
npm install -g ./soma-code-1.0.0.tgz
```

如果你希望得到全局 `soma` 命令，不要使用 `npm install .`。这个命令只会把当前目录作为依赖安装到项目里，不会把 CLI 暴露成全局命令。

更多安装说明见 [INSTALL.md](./INSTALL.md)。

### `npm ERR! spawn sh ENOENT` 排查

这个错误表示 npm 在执行依赖生命周期脚本时无法启动 `sh`，不是 `soma` 运行时本身崩溃。

先检查：

```bash
command -v sh
echo "$PATH"
npm config get script-shell
```

如果 `npm config get script-shell` 输出的是一个不存在的路径，可以重置它：

```bash
npm config delete script-shell
```

如果你用的是精简 Linux 镜像，还需要确认 `PATH` 中包含 `/bin` 和 `/usr/bin`。当前仓库已经去掉了 `soma` 本身以及必需依赖 `protobufjs` 的必经安装脚本；如果你还想进一步规避可选原生依赖的安装脚本，可以继续使用 `--omit=optional` 安装。

## 快速开始

首次使用建议按下面流程完成：

1. 启动 `soma`
2. 使用 `/login` 完成需要登录的能力配置
3. 使用 `/config` 配置 API Provider、API Key、Base URL 和默认模型
4. 使用 `/model` 检查当前已配置模型
5. 在项目目录中直接开始会话

对于 OpenAI-compatible provider，也可以通过 `/config` 或对应的运行时环境变量完成配置。

## 常用命令

- `soma`
  启动交互式会话
- `soma --help`
  查看 CLI 帮助
- `soma --version`
  查看当前版本
- `soma update`
  检查并安装更新
- `/login`
  处理登录型能力
- `/config`
  管理 API 和运行配置
- `/model`
  管理当前可用模型

## 配置体系

Soma Code 使用分层配置结构：

- 用户级配置目录：`~/.soma`
- 项目级配置目录：`.soma/`

这样做的好处是：

- 用户默认偏好可以全局复用
- 项目可以保存独立配置
- 团队项目中的约定更容易共享和维护

当前项目同时保留了部分对旧目录和旧入口的迁移/兼容能力，但默认名称空间已经切换到 `soma`。

## 仓库结构

主要目录如下：

- `src/`
  核心 TypeScript 源码
- `bin/`
  CLI 启动入口
- `scripts/`
  开发和源码运行脚本
- `vendor/`
  vendored 依赖与本地封装
- `types/`
  全局与辅助类型定义

如果你准备参与开发，重点通常在 `src/` 下这些区域：

- `src/entrypoints/`
  CLI 和运行时入口
- `src/commands/`
  命令和交互入口
- `src/components/`
  Ink UI 组件
- `src/services/`
  API、MCP、分析、状态同步等服务逻辑
- `src/tools/`
  面向模型的工具实现
- `src/utils/`
  通用运行时工具和配置能力

## 开发

安装依赖：

```bash
npm install
```

常用命令：

```bash
bun run typecheck
bun run build
bun test
```

源码入口保留在：

```bash
bun scripts/run-source-cli.mjs --help
```

## 兼容性说明

- 主命令名为 `soma`
- 对外文档中可使用 `somacode` 和 `soma-code` 作为补充命令别名
- 默认本地配置和项目配置已迁移到 `soma` 命名空间
- 部分远端相关实现为了兼容旧流程仍然保留

## 开源许可

本项目采用 [MIT License](./LICENSE)。

你可以自由使用、复制、修改、分发和商业使用本项目，但需要保留原始版权声明和许可文本。
