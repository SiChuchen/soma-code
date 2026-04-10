import type { CommandResultDisplay } from '../../commands.js'

type PluginManagementAction = 'enable' | 'disable' | 'uninstall'
type MarketplaceManagementAction = 'remove' | 'update'

export type ViewState =
  | { type: 'menu' }
  | { type: 'help' }
  | { type: 'validate'; path?: string }
  | { type: 'marketplace-list' }
  | { type: 'add-marketplace'; initialValue?: string }
  | {
      type: 'browse-marketplace'
      targetMarketplace?: string
      targetPlugin?: string
    }
  | {
      type: 'discover-plugins'
      targetPlugin?: string
    }
  | {
      type: 'manage-plugins'
      targetPlugin?: string
      targetMarketplace?: string
      action?: PluginManagementAction
    }
  | {
      type: 'manage-marketplaces'
      targetMarketplace?: string
      action?: MarketplaceManagementAction
    }

export type PluginSettingsProps = {
  onComplete: (
    result?: string,
    options?: {
      display?: CommandResultDisplay
    },
  ) => void
  args?: string
  showMcpRedirectMessage?: boolean
}
