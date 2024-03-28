import { DEFAULT_PACKAGE_PREFIX, Package } from './package.js'
import { getBuiltin, isBuiltin } from './builtins.js'
import { ModuleNotFoundError } from '../errors.js'
import { Loader } from './loader.js'
import location from '../location.js'

/**
 * @typedef {function(string, import('./module.js').Module, function(string): any): any} RequireResolver
 */

/**
 * @typedef {{
 *   module: import('./module.js').Module,
 *   prefix?: string,
 *   request?: import('./loader.js').RequestOptions,
 *   builtins?: object
 * }} CreateRequireOptions
 */

/**
 * @typedef {function(string): any} RequireFunction
 */

/**
 * @typedef {import('./package.js').PackageOptions} PackageOptions
 */

/**
 * @typedef {import('./package.js').PackageResolveOptions} PackageResolveOptions
 */

/**
 * @typedef {PackageResolveOptions & PackageOptions} ResolveOptions
 */

/**
 * @typedef {ResolveOptions & {
 *   resolvers?: RequireResolver[],
 *   importmap?: import('./module.js').ImportMap,
 * }} RequireOptions
 */

/**
 * An array of global require paths, relative to the origin.
 * @type {string[]}
 */
export const globalPaths = [
  new URL(DEFAULT_PACKAGE_PREFIX, location.origin).href
]

/**
 * An object attached to a `require()` function that contains metadata
 * about the current module context.
 */
export class Meta {
  #referrer = null
  #url = null

  /**
   * `Meta` class constructor.
   * @param {import('./module.js').Module} module
   */
  constructor (module) {
    this.#referrer = (module.parent ?? module.main).id ?? location.origin
    this.#url = module.id
  }

  /**
   * The referrer (parent) of this module.
   * @type {string}
   */
  get referrer () {
    return this.#referrer
  }

  /**
   * The referrer (parent) of this module.
   * @type {string}
   */
  get url () {
    return this.#url
  }
}

/**
 * Factory for creating a `require()` function based on a module context.
 * @param {CreateRequireOptions} options
 * @return {RequireFunction}
 */
export function createRequire (options) {
  const { builtins, module } = options
  const { cache, loaders, main } = module

  // non-standard 'require.meta' object
  const meta = new Meta(module)

  Object.assign(resolve, {
    paths
  })

  return Object.assign(require, {
    extensions: loaders,
    resolve,
    loaders,
    cache,
    meta,
    main
  })

  /**
   * @param {string} input
   * @param {ResolveOptions & RequireOptions=} [options
   * @ignore
   */
  function applyResolvers (input, options = null) {
    const resolvers = Array
      .from(module.resolvers)
      .concat(options?.resolvers)
      .filter(Boolean)

    return next(input)

    function next (specifier) {
      if (resolvers.length === 0) return specifier
      const resolver = resolvers.shift()
      return resolver(specifier, module, next)
    }
  }

  /**
   * Requires a module at for a given `input` which can be a relative file,
   * named module, or an absolute URL.
   * @param {string|URL} input
   * @param {RequireOptions=} [options]
   * @throws ModuleNotFoundError
   * @throws ReferenceError
   * @throws SyntaxError
   * @throws TypeError
   * @return {any}
   */
  function require (input, options = null) {
    const resolvedInput = applyResolvers(input, options)

    if (resolvedInput && typeof resolvedInput !== 'string') {
      return resolvedInput
    }

    if (resolvedInput.includes('\n') || resolvedInput.length > 256) {
      return resolvedInput
    }

    input = resolvedInput

    if (isBuiltin(input, { builtins: options?.builtins ?? builtins })) {
      return getBuiltin(input, { builtins: options?.builtins ?? builtins })
    }

    if (cache[input]) {
      return cache[input].exports
    }

    const resolved = resolve(input, {
      type: module.package.type,
      ...options
    })

    if (cache[resolved]) {
      return cache[resolved].exports
    }

    const child = module.createModule(resolved, {
      ...options,
      package: input.startsWith('.') || input.startsWith('/')
        ? module.package
        : new Package(resolved, {
          loader: new Loader(module.loader),
          ...options
        })
    })

    cache[resolved] = child
    cache[input] = child

    if (child.load(options)) {
      return child.exports
    }

    throw new ModuleNotFoundError(
      `Cannnot find module '${input}'`,
      module.children.map((mod) => mod.id)
    )
  }

  /**
   * Resolve a module `input` to an absolute URL.
   * @param {string|URL} pathname
   * @param {ResolveOptions=} [options]
   * @throws ModuleNotFoundError
   * @return {string}
   */
  function resolve (input, options = null) {
    if (input instanceof URL) {
      input = String(input)
    }

    const resolvedInput = applyResolvers(input, options)

    if (resolvedInput && typeof resolvedInput !== 'string') {
      return input
    }

    if (resolvedInput.includes('\n') || resolvedInput.length > 256) {
      return input
    }

    input = resolvedInput

    if (isBuiltin(input, { builtins: options?.builtins ?? builtins })) {
      return input
    }

    // A URL was given, try to resolve it as a package
    if (URL.canParse(input)) {
      return module.package.resolve(input, {
        type: module.package.type,
        ...options
      })
    }

    const origins = resolve.paths(input)

    for (const origin of origins) {
      // relative require
      if (input.startsWith('.') || input.startsWith('/')) {
        return module.resolve(input)
      } else { // named module
        const moduleName = Package.Name.from(input)
        const pathname = moduleName.pathname.replace(moduleName.name, '.')
        const manifest = new Package(moduleName.name, {
          loader: new Loader(origin)
        })

        try {
          return manifest.resolve(pathname, {
            type: module.package.type,
            ...options
          })
        } catch (err) {
          if (err.code !== 'MODULE_NOT_FOUND') {
            throw err
          }
        }
      }
    }

    throw new ModuleNotFoundError(
      `Cannnot find module '${input}'`,
      module.children.map((mod) => mod.id)
    )
  }

  /**
   * Computes possible `require()` origin paths for an input module URL
   * @param {string|URL} pathname
   * @return {string[]?}
   */
  function paths (input) {
    if (isBuiltin(input, builtins)) {
      return null
    }

    if (URL.canParse(input)) {
      return [new URL(input).origin]
    }

    if (input.startsWith('.') || input.startsWith('/')) {
      return [module.origin]
    }

    const origins = new Set(globalPaths.map((path) => new URL(path, location.origin).href))
    let origin = module.origin

    while (true) {
      const url = new URL(origin)
      origins.add(origin)

      if (url.pathname === '/') {
        break
      }

      origin = new URL('..', origin).href
    }

    const results = Array
      .from(origins)
      .map((origin) => origin.endsWith(options.prefix)
        ? new URL(origin)
        : new URL(options.prefix, origin)
      )
      .map((url) => url.href)

    return Array.from(new Set(results))
  }
}

export default createRequire