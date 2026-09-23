# Quick Paths

A Raycast and Vicinae extension for macOS, for quickly accessing and inserting your favorite file paths from a searchable catalog.  The Vicinae build uses its Raycast compatibility API.

The screenshots below show the original Raycast version.

![Quick Paths Screenshot 1](metadata/quick-paths-1.png)
![Quick Paths Screenshot 2](metadata/quick-paths-2.png)
![Quick Paths Screenshot 3](metadata/quick-paths-3.png)

## Features

- Choose from your predefined list of frequently-used paths
- Search files or paste paths with configurable Enter key behavior (Enter/Shift+Enter)
- Toggle shell path and full path output (`Cmd+T`)
- Copy to clipboard, edit, add, and delete paths

## Setup

Install [Vicinae](https://docs.vicinae.com/install/macos) on an Apple Silicon Mac.  Build and test with Node.js 24.21 or later:

```sh
npm ci
npm run build:vicinae
```

The complete extension is generated in `dist/quick-paths/`; building does not install it.  To install it:

```sh
mkdir -p ~/.local/share/vicinae/extensions
cp -Rp dist/quick-paths ~/.local/share/vicinae/extensions/
```

For Vicinae development, `npm run dev:vicinae` installs a development build and watches for changes.  `npm run lint`, `npm run typecheck`, and `npm test` run the checks.

### Raycast build

Run `npm run build` to generate a Raycast distribution build in `dist/raycast/`.  This uses the same source as `npm run build:vicinae`, which outputs to `dist/quick-paths/`.

Run `npm run dev` to build and load the extension into Raycast and watch for changes.

### Distribution and updates

GitHub Actions checks and builds both extensions on branch pushes and pull requests.  To publish a macOS release, update `package.json` and `package-lock.json` to the same stable version, push the release commit, and wait for its CI to pass.  Then create and push a matching tag such as `v1.0.1`.  The tag workflow validates the version and reruns the checks before publishing a GitHub Release with `quick-paths-raycast-macos.tar.gz`, `quick-paths-vicinae-macos.tar.gz`, and their SHA-256 checksums.  Tags are shared across launcher targets.  An existing release is not overwritten; rerunning publication for an already published tag fails.

#### Raycast with mise

Raycast archives are available starting with v1.0.1.  Add the following to `~/.config/mise/conf.d/raycast.toml`:

```toml
[tool_alias]
raycast-quick-paths = "github:knu/raycast-quick-paths"

[tools.raycast-quick-paths]
version = "latest"
minimum_release_age = "0s"
asset_pattern = "quick-paths-raycast-macos.tar.gz"
strip_components = 1
bin_path = "."
```

The alias gives Raycast its own installation directory, separate from the Vicinae archive installed with `github:knu/raycast-quick-paths`.  Install and link it:

```sh
mise install raycast-quick-paths
mkdir -p ~/.config/raycast/extensions
ln -s ../../../.local/share/mise/installs/raycast-quick-paths/latest \
  ~/.config/raycast/extensions/quick-paths
```

If `extensions/quick-paths` already exists, move it outside `extensions` as a backup before creating the link.  The link assumes mise's default data directory; use the corresponding install path if `MISE_DATA_DIR` is customized.  Run `mise upgrade raycast-quick-paths` for updates; the link follows mise's `latest` version.  Restart Raycast and check that Quick Paths appears and runs after installation.  Do not run `npm run dev` against this link: development builds write into the installed extension directory.

For a manual installation, extract `quick-paths-raycast-macos.tar.gz` outside the extensions directory and link its `raycast/` directory as `~/.config/raycast/extensions/quick-paths`.

#### Vicinae archive

Download the release archive and extract it using the instructions below, substituting `quick-paths-vicinae-macos.tar.gz` for `quick-paths.tar.gz`.

Package the build once and copy the archive to your other Macs:

```sh
tar -czf dist/quick-paths.tar.gz -C dist quick-paths
```

On each destination Mac, extract it into the extensions directory:

```sh
mkdir -p ~/.local/share/vicinae/extensions
tar -xzf quick-paths.tar.gz -C ~/.local/share/vicinae/extensions
```

The archive includes the manifest, bundled JavaScript, icons, and executable qpath binaries; Node.js and npm are only needed on the build machine.  For updates, move the existing `quick-paths` extension directory outside `extensions` as a backup, then extract the new archive.  To roll back, replace the new directory with that backup.  No store approval is needed.

Entries are stored in [qpath](https://github.com/knu/qpath)'s TOML registry under `~/.config/qpath/`.  The existing Raycast catalog is shared on the same Mac; it is not included in the extension archive.  Preferences are configured separately in Vicinae.

### qpath Registry

The extension bundles `qpath` and uses its command-line interface as the backend:

```console
qpath add docs ~/Documents/ --desc "Documentation folder" --type d
qpath add proj ~/Projects/ --desc "Projects directory" --type d
qpath ls --type d --format json
```

Only directory entries are shown.

## Usage

1. Open Vicinae and search for "Quick Paths"
2. Add paths using `Cmd+N` or search for existing paths
3. Press `Cmd+T` to toggle paste/copy output between qpath `shell_path` and full `path`
4. Press Enter to search files or paste path (configurable in preferences)
5. Press Shift+Enter for alternate action

File search opens a view inside the extension showing the selected directory's immediate contents.  Hidden files are hidden by default; use `Cmd+Shift+.` or the actions menu to show them.  Enter a name to filter these files regardless of Spotlight indexing, with additional results from Spotlight-indexed subdirectories.  Results are limited to 200 displayed items.  Open a result or reveal it in Finder from its actions.  This avoids relying on Vicinae's global file search, which does not scope searches to a directory passed as query text.

### Additional Actions

- `Cmd+C` - Copy current format to clipboard
- `Cmd+Shift+C` - Copy alternate format
- `Cmd+E` - Edit selected entry
- `Cmd+O` - Open selected directory in Finder
- `Cmd+Backspace` - Delete entry

## Backend

`qpath` loads definitions from `~/.config/qpath/paths.toml` and `~/.config/qpath/paths.d/*.toml`.  Add, edit, rename, and delete actions call the bundled `qpath` binary, so comments and formatting in the registry are preserved by qpath.

## License

MIT License - see [LICENSE](LICENSE) file for details.
