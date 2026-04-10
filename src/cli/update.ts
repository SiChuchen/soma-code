import chalk from 'chalk'
import { logEvent } from 'src/services/analytics/index.js'
import {
  getLatestVersion,
  type InstallStatus,
  installGlobalPackage,
} from 'src/utils/autoUpdater.js'
import { regenerateCompletionCache } from 'src/utils/completionCache.js'
import {
  getGlobalConfig,
  type InstallMethod,
  saveGlobalConfig,
} from 'src/utils/config.js'
import { CLI_COMMAND_NAME } from 'src/constants/cliName.js'
import { logForDebugging } from 'src/utils/debug.js'
import { getDisplayVersion } from 'src/utils/displayVersion.js'
import { getDoctorDiagnostic } from 'src/utils/doctorDiagnostic.js'
import { gracefulShutdown } from 'src/utils/gracefulShutdown.js'
import {
  installOrUpdateClaudePackage,
  localInstallationExists,
} from 'src/utils/localInstaller.js'
import {
  installLatest as installLatestNative,
  removeInstalledSymlink,
} from 'src/utils/nativeInstaller/index.js'
import { getPackageManager } from 'src/utils/nativeInstaller/packageManagers.js'
import { writeToStdout } from 'src/utils/process.js'
import { gte } from 'src/utils/semver.js'
import { getInitialSettings } from 'src/utils/settings/settings.js'
import {
  getGitHubPackageManifestUrl,
  getGlobalInstallCommand,
  getLocalInstallCommand,
  getPackageManagerUpdateInstruction,
  isGitHubInstallSpec,
  isNativeInstallerAvailable,
} from 'src/utils/distribution.js'

export async function update() {
  logEvent('tengu_update_check', {})
  const currentDisplayVersion = getDisplayVersion()
  writeToStdout(`Current version: ${currentDisplayVersion}\n`)

  const channel = getInitialSettings()?.autoUpdatesChannel ?? 'latest'
  writeToStdout(`Checking for updates to ${channel} version...\n`)
  const publishedSource = isGitHubInstallSpec() ? 'GitHub' : 'npm registry'

  logForDebugging('update: Starting update check')

  // Run diagnostic to detect potential issues
  logForDebugging('update: Running diagnostic')
  const diagnostic = await getDoctorDiagnostic()
  logForDebugging(`update: Installation type: ${diagnostic.installationType}`)
  logForDebugging(
    `update: Config install method: ${diagnostic.configInstallMethod}`,
  )

  // Check for multiple installations
  if (diagnostic.multipleInstallations.length > 1) {
    writeToStdout('\n')
    writeToStdout(chalk.yellow('Warning: Multiple installations found') + '\n')
    for (const install of diagnostic.multipleInstallations) {
      const current =
        diagnostic.installationType === install.type
          ? ' (currently running)'
          : ''
      writeToStdout(`- ${install.type} at ${install.path}${current}\n`)
    }
  }

  // Display warnings if any exist
  if (diagnostic.warnings.length > 0) {
    writeToStdout('\n')
    for (const warning of diagnostic.warnings) {
      logForDebugging(`update: Warning detected: ${warning.issue}`)

      // Don't skip PATH warnings - they're always relevant
      // The user needs to know that 'which claude' points elsewhere
      logForDebugging(`update: Showing warning: ${warning.issue}`)

      writeToStdout(chalk.yellow(`Warning: ${warning.issue}\n`))

      writeToStdout(chalk.bold(`Fix: ${warning.fix}\n`))
    }
  }

  // Update config if installMethod is not set (but skip for package managers)
  const config = getGlobalConfig()
  if (
    !config.installMethod &&
    diagnostic.installationType !== 'package-manager'
  ) {
    writeToStdout('\n')
    writeToStdout('Updating configuration to track installation method...\n')
    let detectedMethod: 'local' | 'native' | 'global' | 'unknown' = 'unknown'

    // Map diagnostic installation type to config install method
    switch (diagnostic.installationType) {
      case 'npm-local':
        detectedMethod = 'local'
        break
      case 'native':
        detectedMethod = 'native'
        break
      case 'npm-global':
        detectedMethod = 'global'
        break
      default:
        detectedMethod = 'unknown'
    }

    saveGlobalConfig(current => ({
      ...current,
      installMethod: detectedMethod,
    }))
    writeToStdout(`Installation method set to: ${detectedMethod}\n`)
  }

  // Check if running from development build
  if (diagnostic.installationType === 'development') {
    writeToStdout('\n')
    writeToStdout(
      chalk.yellow('Warning: Cannot update development build') + '\n',
    )
    await gracefulShutdown(1)
  }

  // Check if running from a package manager
  if (diagnostic.installationType === 'package-manager') {
    const packageManager = await getPackageManager()
    writeToStdout('\n')

    if (packageManager === 'homebrew') {
      writeToStdout('somacode is managed by Homebrew.\n')
      const latest = await getLatestVersion(channel)
      if (latest && !gte(MACRO.VERSION, latest)) {
        writeToStdout(
          `Update available: ${currentDisplayVersion} → ${getDisplayVersion(latest)}\n`,
        )
        writeToStdout('\n')
        writeToStdout('To update:\n')
        writeToStdout(
          chalk.bold(`  ${getPackageManagerUpdateInstruction(packageManager)}`) +
            '\n',
        )
      } else {
        writeToStdout('somacode is up to date!\n')
      }
    } else if (packageManager === 'winget') {
      writeToStdout('somacode is managed by winget.\n')
      const latest = await getLatestVersion(channel)
      if (latest && !gte(MACRO.VERSION, latest)) {
        writeToStdout(
          `Update available: ${currentDisplayVersion} → ${getDisplayVersion(latest)}\n`,
        )
        writeToStdout('\n')
        writeToStdout('To update:\n')
        writeToStdout(
          chalk.bold(`  ${getPackageManagerUpdateInstruction(packageManager)}`) +
            '\n',
        )
      } else {
        writeToStdout('somacode is up to date!\n')
      }
    } else if (packageManager === 'apk') {
      writeToStdout('somacode is managed by apk.\n')
      const latest = await getLatestVersion(channel)
      if (latest && !gte(MACRO.VERSION, latest)) {
        writeToStdout(
          `Update available: ${currentDisplayVersion} → ${getDisplayVersion(latest)}\n`,
        )
        writeToStdout('\n')
        writeToStdout('To update:\n')
        writeToStdout(
          chalk.bold(`  ${getPackageManagerUpdateInstruction(packageManager)}`) +
            '\n',
        )
      } else {
        writeToStdout('somacode is up to date!\n')
      }
    } else {
      // pacman, deb, and rpm don't get specific commands because they each have
      // multiple frontends (pacman: yay/paru/makepkg, deb: apt/apt-get/aptitude/nala,
      // rpm: dnf/yum/zypper)
      writeToStdout('somacode is managed by a package manager.\n')
      writeToStdout('Please use your package manager to update.\n')
    }

    await gracefulShutdown(0)
  }

  // Check for config/reality mismatch (skip for package-manager installs)
  if (
    config.installMethod &&
    diagnostic.configInstallMethod !== 'not set' &&
    diagnostic.installationType !== 'package-manager'
  ) {
    const runningType = diagnostic.installationType
    const configExpects = diagnostic.configInstallMethod

    // Map installation types for comparison
    const typeMapping: Record<string, string> = {
      'npm-local': 'local',
      'npm-global': 'global',
      native: 'native',
      development: 'development',
      unknown: 'unknown',
    }

    const normalizedRunningType = typeMapping[runningType] || runningType

    if (
      normalizedRunningType !== configExpects &&
      configExpects !== 'unknown'
    ) {
      writeToStdout('\n')
      writeToStdout(chalk.yellow('Warning: Configuration mismatch') + '\n')
      writeToStdout(`Config expects: ${configExpects} installation\n`)
      writeToStdout(`Currently running: ${runningType}\n`)
      writeToStdout(
        chalk.yellow(
          `Updating the ${runningType} installation you are currently using`,
        ) + '\n',
      )

      // Update config to match reality
      saveGlobalConfig(current => ({
        ...current,
        installMethod: normalizedRunningType as InstallMethod,
      }))
      writeToStdout(
        `Config updated to reflect current installation method: ${normalizedRunningType}\n`,
      )
    }
  }

  // Handle native installation updates first
  if (diagnostic.installationType === 'native') {
    if (!isNativeInstallerAvailable()) {
      process.stderr.write(
        'Error: This distribution does not publish native installer artifacts yet\n',
      )
      process.stderr.write('Install updates with:\n')
      process.stderr.write(chalk.bold(`  ${getGlobalInstallCommand()}`) + '\n')
      await gracefulShutdown(1)
    }

    logForDebugging(
      'update: Detected native installation, using native updater',
    )
    try {
      const result = await installLatestNative(channel, true)

      // Handle lock contention gracefully
      if (result.lockFailed) {
        const pidInfo = result.lockHolderPid
          ? ` (PID ${result.lockHolderPid})`
          : ''
        writeToStdout(
          chalk.yellow(
            `Another somacode process${pidInfo} is currently running. Please try again in a moment.`,
          ) + '\n',
        )
        await gracefulShutdown(0)
      }

      if (!result.latestVersion) {
        process.stderr.write('Failed to check for updates\n')
        await gracefulShutdown(1)
      }

      if (result.latestVersion === MACRO.VERSION) {
        writeToStdout(
          chalk.green(`somacode is up to date (${currentDisplayVersion})`) +
            '\n',
        )
      } else {
        writeToStdout(
          chalk.green(
            `Successfully updated from ${currentDisplayVersion} to version ${getDisplayVersion(result.latestVersion)}`,
          ) + '\n',
        )
        await regenerateCompletionCache()
      }
      await gracefulShutdown(0)
    } catch (error) {
      process.stderr.write('Error: Failed to install native update\n')
      process.stderr.write(String(error) + '\n')
      process.stderr.write(`Try running "${CLI_COMMAND_NAME} doctor" for diagnostics\n`)
      await gracefulShutdown(1)
    }
  }

  // Fallback to existing JS/npm-based update logic
  // Remove native installer symlink since we're not using native installation
  // But only if user hasn't migrated to native installation
  if (config.installMethod !== 'native') {
    await removeInstalledSymlink()
  }

  logForDebugging(`update: Checking ${publishedSource} for latest version`)
  logForDebugging(`update: Package URL: ${MACRO.PACKAGE_URL}`)
  const npmTag = channel === 'stable' ? 'stable' : 'latest'
  const versionCheckCommand = isGitHubInstallSpec()
    ? `GET ${getGitHubPackageManifestUrl()}`
    : `npm view ${MACRO.PACKAGE_URL}@${npmTag} version`
  logForDebugging(`update: Running: ${versionCheckCommand}`)
  const latestVersion = await getLatestVersion(channel)
  logForDebugging(
    `update: Latest version from ${publishedSource}: ${latestVersion || 'FAILED'}`,
  )

  if (!latestVersion) {
    logForDebugging(`update: Failed to get latest version from ${publishedSource}`)
    process.stderr.write(chalk.red('Failed to check for updates') + '\n')
    process.stderr.write(
      `Unable to fetch latest version from ${publishedSource}\n`,
    )
    process.stderr.write('\n')
    process.stderr.write('Possible causes:\n')
    process.stderr.write('  • Network connectivity issues\n')
    process.stderr.write(
      isGitHubInstallSpec()
        ? '  • GitHub is unreachable or the repository is not yet public\n'
        : '  • npm registry is unreachable\n',
    )
    process.stderr.write(
      isGitHubInstallSpec()
        ? '  • Corporate proxy/firewall blocking GitHub\n'
        : '  • Corporate proxy/firewall blocking npm\n',
    )
    if (!isGitHubInstallSpec() && MACRO.PACKAGE_URL && !MACRO.PACKAGE_URL.startsWith('@anthropic')) {
      process.stderr.write(
        '  • Internal/development build not published to npm\n',
      )
    }
    process.stderr.write('\n')
    process.stderr.write('Try:\n')
    process.stderr.write('  • Check your internet connection\n')
    process.stderr.write('  • Run with --debug flag for more details\n')
    process.stderr.write(
      isGitHubInstallSpec()
        ? `  • Manually check: ${getGitHubPackageManifestUrl()}\n`
        : `  • Manually check: npm view ${MACRO.PACKAGE_URL || (process.env.USER_TYPE === 'ant' ? '@anthropic-ai/claude-cli' : '@anthropic-ai/claude-code')} version\n`,
    )

    if (!isGitHubInstallSpec()) {
      process.stderr.write('  • Check if you need to login: npm whoami\n')
    }
    await gracefulShutdown(1)
  }

  // Check if versions match exactly, including any build metadata (like SHA)
  if (latestVersion === MACRO.VERSION) {
    writeToStdout(
      chalk.green(`somacode is up to date (${currentDisplayVersion})`) + '\n',
    )
    await gracefulShutdown(0)
  }

  writeToStdout(
    `New version available: ${getDisplayVersion(latestVersion)} (current: ${currentDisplayVersion})\n`,
  )
  writeToStdout('Installing update...\n')

  // Determine update method based on what's actually running
  let useLocalUpdate = false
  let updateMethodName = ''

  switch (diagnostic.installationType) {
    case 'npm-local':
      useLocalUpdate = true
      updateMethodName = 'local'
      break
    case 'npm-global':
      useLocalUpdate = false
      updateMethodName = 'global'
      break
    case 'unknown': {
      // Fallback to detection if we can't determine installation type
      const isLocal = await localInstallationExists()
      useLocalUpdate = isLocal
      updateMethodName = isLocal ? 'local' : 'global'
      writeToStdout(
        chalk.yellow('Warning: Could not determine installation type') + '\n',
      )
      writeToStdout(
        `Attempting ${updateMethodName} update based on file detection...\n`,
      )
      break
    }
    default:
      process.stderr.write(
        `Error: Cannot update ${diagnostic.installationType} installation\n`,
      )
      await gracefulShutdown(1)
  }

  writeToStdout(`Using ${updateMethodName} installation update method...\n`)

  logForDebugging(`update: Update method determined: ${updateMethodName}`)
  logForDebugging(`update: useLocalUpdate: ${useLocalUpdate}`)

  let status: InstallStatus

  if (useLocalUpdate) {
    logForDebugging(
      'update: Calling installOrUpdateClaudePackage() for local update',
    )
    status = await installOrUpdateClaudePackage(channel, latestVersion)
  } else {
    logForDebugging('update: Calling installGlobalPackage() for global update')
    status = await installGlobalPackage(latestVersion)
  }

  logForDebugging(`update: Installation status: ${status}`)

  switch (status) {
    case 'success':
      writeToStdout(
        chalk.green(
          `Successfully updated from ${currentDisplayVersion} to version ${getDisplayVersion(latestVersion)}`,
        ) + '\n',
      )
      await regenerateCompletionCache()
      break
    case 'no_permissions':
      process.stderr.write(
        'Error: Insufficient permissions to install update\n',
      )
      if (useLocalUpdate) {
        process.stderr.write('Try manually updating with:\n')
        process.stderr.write(`  ${getLocalInstallCommand()}\n`)
      } else {
        process.stderr.write('Try running with sudo or fix npm permissions\n')
        process.stderr.write(`Or manually reinstall with:\n  ${getGlobalInstallCommand()}\n`)
        process.stderr.write(
          `Or consider using native installation with: ${CLI_COMMAND_NAME} install\n`,
        )
      }
      await gracefulShutdown(1)
      break
    case 'install_failed':
      process.stderr.write('Error: Failed to install update\n')
      if (useLocalUpdate) {
        process.stderr.write('Try manually updating with:\n')
        process.stderr.write(`  ${getLocalInstallCommand()}\n`)
      } else {
        process.stderr.write(`Try manually reinstalling with:\n  ${getGlobalInstallCommand()}\n`)
        process.stderr.write(
          `Or consider using native installation with: ${CLI_COMMAND_NAME} install\n`,
        )
      }
      await gracefulShutdown(1)
      break
    case 'in_progress':
      process.stderr.write(
        'Error: Another instance is currently performing an update\n',
      )
      process.stderr.write('Please wait and try again later\n')
      await gracefulShutdown(1)
      break
  }
  await gracefulShutdown(0)
}
