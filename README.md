# Quick Paths

A Vicinae extension for macOS, for quickly accessing and inserting your favorite file paths from a searchable catalog.  It uses Vicinae's Raycast compatibility API.

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
npm run build
```

The complete extension is generated in `dist/quick-paths/`; building does not install it.  To install it:

```sh
mkdir -p ~/.local/share/vicinae/extensions
cp -Rp dist/quick-paths ~/.local/share/vicinae/extensions/
```

For development, `npm run dev` installs a development build and watches for changes.  `npm run lint`, `npm run typecheck`, and `npm test` run the checks.

### Distribution and updates

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

File search opens a view inside the extension showing the selected directory's immediate contents.  Hidden files are hidden by default; use `Cmd+Shift+.` or the actions menu to show them.  Enter a name to search recursively using macOS Spotlight; results are limited to 200 displayed items.  Files excluded from Spotlight indexing appear in the initial directory listing but not in search results.  Open a result or reveal it in Finder from its actions.  This avoids relying on Vicinae's global file search, which does not scope searches to a directory passed as query text.

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
