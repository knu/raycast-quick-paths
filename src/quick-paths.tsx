import {
  Action,
  ActionPanel,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  closeMainWindow,
  Form,
  useNavigation,
  Icon,
  confirmAlert,
  Alert,
  environment,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";

interface Preferences {
  defaultExpandTilde: boolean;
  enterAction: "search" | "paste";
}

interface PathEntry {
  slug: string;
  description: string;
  path: string;
  shellPath: string;
}

interface QPathEntry {
  abbr: string;
  desc: string;
  path: string;
  shell_path: string;
  source: string;
  type: string;
}

const execFileAsync = promisify(execFile);
const qpathBinaryName = process.arch === "x64" ? "qpath-x64" : "qpath";
const qpathPath = join(environment.assetsPath, qpathBinaryName);

function createPathEntry(entry: QPathEntry): PathEntry {
  return {
    slug: entry.abbr,
    description: entry.desc,
    path: entry.path,
    shellPath: entry.shell_path,
  };
}

async function runQPath(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(qpathPath, args, {
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

async function listEntries(): Promise<PathEntry[]> {
  const output = await runQPath(["ls", "--type", "d", "--format", "json"]);
  const entries = JSON.parse(output) as QPathEntry[];
  return entries.map(createPathEntry);
}

async function addEntry(
  slug: string,
  description: string,
  path: string,
): Promise<void> {
  await runQPath([
    "add",
    slug,
    path,
    "--desc",
    description,
    "--type",
    "d",
    "--overwrite",
  ]);
}

async function updateEntry(
  slug: string,
  description: string,
  path: string,
): Promise<void> {
  await runQPath(["update", slug, path, "--desc", description, "--type", "d"]);
}

function EditEntryForm({
  entry,
  onSave,
}: {
  entry?: PathEntry;
  onSave: (slug: string, description: string, path: string) => Promise<void>;
}) {
  const { pop } = useNavigation();

  async function handleSubmit({
    slug,
    description,
    path,
  }: {
    slug: string;
    description: string;
    path: string;
  }) {
    await onSave(slug, description, path);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={entry ? "Save Changes" : "Add Entry"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="slug"
        title="Name"
        placeholder="docs"
        defaultValue={entry?.slug}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Documentation folder"
        defaultValue={entry?.description}
      />
      <Form.TextField
        id="path"
        title="Path"
        placeholder="~/Documents/"
        defaultValue={entry?.path}
      />
    </Form>
  );
}

export default function Command() {
  const { defaultExpandTilde, enterAction } =
    getPreferenceValues<Preferences>();
  const [entries, setEntries] = useState<PathEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keepTilde, setKeepTilde] = useState(defaultExpandTilde);
  const { push } = useNavigation();

  function createSearchAction(
    shortcut: React.ComponentProps<typeof Action.Open>["shortcut"],
    entry: PathEntry,
  ) {
    return (
      <Action.Open
        title="Search Files in Path"
        target={`raycast://extensions/raycast/file-search/search-files?fallbackText=${encodeURIComponent(entry.path)}`}
        application="com.raycast.macos"
        icon={Icon.MagnifyingGlass}
        shortcut={shortcut}
      />
    );
  }

  function createPasteAction(
    shortcut: React.ComponentProps<typeof Action.Paste>["shortcut"],
    pathToUse: string,
  ) {
    return (
      <Action.Paste
        title="Paste to App"
        content={pathToUse}
        shortcut={shortcut}
        onPaste={async () => {
          await closeMainWindow();
          await showToast({
            style: Toast.Style.Success,
            title: "Path pasted",
          });
        }}
      />
    );
  }

  async function loadEntries() {
    try {
      const parsedEntries = await listEntries();
      setEntries(parsedEntries);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load paths",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  async function handleSaveEntry(
    slug: string,
    description: string,
    path: string,
    originalSlug?: string,
  ) {
    if (originalSlug) {
      await updateEntry(originalSlug, description, path);

      if (originalSlug !== slug) {
        await runQPath(["rename", originalSlug, slug]);
      }
    } else {
      await addEntry(slug, description, path);
    }

    await loadEntries();
    await showToast({
      style: Toast.Style.Success,
      title: originalSlug ? "Entry updated" : "Entry added",
    });
  }

  async function handleDeleteEntry(slug: string) {
    if (
      await confirmAlert({
        title: "Delete entry?",
        message: `Delete "${slug}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await runQPath(["rm", slug]);
      await loadEntries();
      await showToast({ style: Toast.Style.Success, title: "Entry deleted" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search paths by slug...">
      <List.EmptyView
        title="No paths yet"
        description="Press Cmd+N to add your first path"
        actions={
          <ActionPanel>
            <Action
              title="Add New Entry"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => {
                push(
                  <EditEntryForm
                    onSave={(slug, description, path) =>
                      handleSaveEntry(slug, description, path)
                    }
                  />,
                );
              }}
            />
          </ActionPanel>
        }
      />
      <List.Section title="Paths">
        {entries.map((entry) => {
          const { slug, description, path, shellPath } = entry;
          const pathToCopy = keepTilde ? shellPath : path;
          return (
            <List.Item
              key={slug}
              title={slug}
              subtitle={description}
              accessories={[{ text: pathToCopy }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {enterAction === "search" ? (
                      <>
                        {createSearchAction(
                          { modifiers: [], key: "return" },
                          entry,
                        )}
                        {createPasteAction(
                          { modifiers: ["shift"], key: "return" },
                          pathToCopy,
                        )}
                      </>
                    ) : (
                      <>
                        {createPasteAction(
                          { modifiers: [], key: "return" },
                          pathToCopy,
                        )}
                        {createSearchAction(
                          { modifiers: ["shift"], key: "return" },
                          entry,
                        )}
                      </>
                    )}
                    <Action
                      title="Toggle Path Format"
                      shortcut={{ modifiers: [], key: "tab" }}
                      onAction={() => setKeepTilde(!keepTilde)}
                    />
                    <Action.CopyToClipboard
                      title="Copy to Clipboard"
                      content={pathToCopy}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onCopy={async () => {
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Path copied to clipboard",
                        });
                      }}
                    />
                    <Action.CopyToClipboard
                      title={keepTilde ? "Copy Full Path" : "Copy Shell Path"}
                      content={keepTilde ? path : shellPath}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onCopy={async () => {
                        await showToast({
                          style: Toast.Style.Success,
                          title: keepTilde
                            ? "Path copied (full path)"
                            : "Path copied (shell path)",
                        });
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Edit Entry"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() => {
                        push(
                          <EditEntryForm
                            entry={entry}
                            onSave={(newSlug, newDescription, newPath) =>
                              handleSaveEntry(
                                newSlug,
                                newDescription,
                                newPath,
                                slug,
                              )
                            }
                          />,
                        );
                      }}
                    />
                    <Action
                      title="Add New Entry"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() => {
                        push(
                          <EditEntryForm
                            onSave={(newSlug, newDescription, newPath) =>
                              handleSaveEntry(newSlug, newDescription, newPath)
                            }
                          />,
                        );
                      }}
                    />
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDeleteEntry(slug)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
