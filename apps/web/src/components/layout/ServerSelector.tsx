import { useServer } from '@/hooks/useServer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaServerIcon } from '@/components/icons/MediaServerIcon';
import { ChevronsUpDown } from 'lucide-react';

export function ServerSelector() {
  const {
    servers,
    selectedServerIds,
    isAllServersSelected,
    toggleServer,
    selectAllServers,
    isLoading,
    isFetching,
  } = useServer();

  // Show skeleton while loading initially or refetching with no cached data
  if (isLoading || (servers.length === 0 && isFetching)) {
    return (
      <div className="px-4 py-2">
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  // No servers available
  if (servers.length === 0) {
    return null;
  }

  // Only one server — show static label
  if (servers.length === 1) {
    const server = servers[0]!;
    return (
      <div className="text-muted-foreground flex items-center gap-2 px-4 py-2 text-sm">
        <MediaServerIcon type={server.type} className="h-4 w-4" />
        <span className="truncate font-medium">{server.name}</span>
      </div>
    );
  }

  // Build trigger label
  const triggerLabel = isAllServersSelected
    ? 'All servers'
    : selectedServerIds.length === 1
      ? (servers.find((s) => s.id === selectedServerIds[0])?.name ?? '1 server')
      : `${selectedServerIds.length} of ${servers.length} servers`;

  return (
    <div className="px-4 py-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-9 w-full justify-between text-sm font-normal"
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
          {/* Select All toggle */}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground w-full px-2 py-1.5 text-left text-xs"
            onClick={() => {
              if (isAllServersSelected) {
                // Deselect all except first
                toggleServer(servers[0]!.id);
                for (const s of servers.slice(1)) {
                  if (selectedServerIds.includes(s.id)) {
                    toggleServer(s.id);
                  }
                }
              } else {
                selectAllServers();
              }
            }}
          >
            {isAllServersSelected ? 'Deselect all' : 'Select all'}
          </button>
          <div className="my-1 border-t" />
          {/* Server list */}
          {servers.map((server) => {
            const isSelected = selectedServerIds.includes(server.id);
            return (
              <label
                key={server.id}
                className="hover:bg-accent flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5"
              >
                <Checkbox checked={isSelected} onCheckedChange={() => toggleServer(server.id)} />
                {server.color && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: server.color }}
                  />
                )}
                <MediaServerIcon type={server.type} className="h-4 w-4 shrink-0" />
                <span className="truncate text-sm">{server.name}</span>
              </label>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
