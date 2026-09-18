import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { basename, relative } from "node:path";
import { searchFiles } from "./search-files";

const resultLimit = 200;

export function FileSearchView({ directory }: { directory: string }) {
  const [query, setQuery] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setPaths([]);
    setError(undefined);
    setIsLoading(Boolean(query.trim()));

    const timer = setTimeout(async () => {
      try {
        const results = await searchFiles(directory, query, controller.signal);
        if (!controller.signal.aborted) setPaths(results);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : "Search failed");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [directory, query]);

  let emptyTitle = "Search Files in Path";
  if (error) emptyTitle = "Search Failed";
  else if (query.trim()) emptyTitle = "No Matching Files";

  return (
    <List
      navigationTitle={directory}
      searchBarPlaceholder="Search file names in this directory…"
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      isLoading={isLoading}
    >
      <List.EmptyView
        title={emptyTitle}
        description={
          error ??
          "Searches Spotlight-indexed file names within this directory."
        }
      />
      <List.Section
        title="Files"
        subtitle={
          paths.length > resultLimit
            ? `Showing ${resultLimit} of ${paths.length} — refine your search`
            : `${paths.length} results`
        }
      >
        {paths.slice(0, resultLimit).map((path) => (
          <List.Item
            key={path}
            title={basename(path)}
            subtitle={relative(directory, path)}
            icon={{ fileIcon: path }}
            actions={
              <ActionPanel>
                <Action.Open title="Open" target={path} icon={Icon.Document} />
                <Action.ShowInFinder path={path} />
                <Action.CopyToClipboard title="Copy Path" content={path} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
