import cp = require('child_process')
import fs = require('fs')
import p = require('path')

interface Logger {
  log: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

interface Husky {
  install: (dir: string) => void
  set: (file: string, cmd: string) => void
  add: (file: string, cmd: string) => void
  uninstall: () => void
}

// Default logger
const defaultLogger: Logger = {
  log: (msg: string): void => console.log(`husky - ${msg}`),
  warn: (msg: string): void => console.warn(`husky - ${msg}`),
  error: (msg: string): void => console.error(`husky - ${msg}`),
}

// Git command
const git = (args: string[]): cp.SpawnSyncReturns<Buffer> =>
  cp.spawnSync('git', args, { stdio: 'inherit' })

const defaultHusky = configure()

export function configure(logger = defaultLogger): Husky {
  return {
    install(dir = '.husky'): void {
      // Ensure that we're inside a git repository
      // If git command is not found, status is null and we should return.
      // That's why status value needs to be checked explicitly.
      if (git(['rev-parse']).status !== 0) {
        return
      }

      // Custom dir help
      const url = 'https://typicode.github.io/husky/#/?id=custom-directory'

      // Ensure that we're not trying to install outside of cwd
      if (!p.resolve(process.cwd(), dir).startsWith(process.cwd())) {
        throw new Error(`.. not allowed (see ${url})`)
      }

      // Ensure that cwd is git top level
      if (!fs.existsSync('.git')) {
        throw new Error(`.git can't be found (see ${url})`)
      }

      try {
        // Create .husky/_
        fs.mkdirSync(p.join(dir, '_'), { recursive: true })

        // Create .husky/_/.gitignore
        fs.writeFileSync(p.join(dir, '_/.gitignore'), '*')

        // Copy husky.sh to .husky/_/husky.sh
        fs.copyFileSync(
          p.join(__dirname, '../husky.sh'),
          p.join(dir, '_/husky.sh'),
        )

        // Configure repo
        const { error } = git(['config', 'core.hooksPath', dir])
        if (error) {
          throw error
        }
      } catch (e) {
        logger.error('Git hooks failed to install')
        throw e
      }

      logger.log('Git hooks installed')
    },

    set(file: string, cmd: string): void {
      const dir = p.dirname(file)
      if (!fs.existsSync(dir)) {
        throw new Error(
          `can't create hook, ${dir} directory doesn't exist (try running husky install)`,
        )
      }

      fs.writeFileSync(
        file,
        `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${cmd}
        `,
        { mode: 0o0755 },
      )

      logger.log(`created ${file}`)
    },

    add(file: string, cmd: string): void {
      if (fs.existsSync(file)) {
        fs.appendFileSync(file, `${cmd}\n`)
        logger.log(`updated ${file}`)
      } else {
        this.set(file, cmd)
      }
    },

    uninstall(): void {
      git(['config', '--unset', 'core.hooksPath'])
    },
  }
}
export const install = defaultHusky.install.bind(defaultHusky)
export const set = defaultHusky.set.bind(defaultHusky)
export const add = defaultHusky.add.bind(defaultHusky)
export const uninstall = defaultHusky.uninstall.bind(defaultHusky)
