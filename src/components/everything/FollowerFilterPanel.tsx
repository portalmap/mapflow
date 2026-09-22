import { useState } from 'react';
import { Search, X, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Follower {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  taskCount: number;
}

interface FollowerFilterPanelProps {
  followers: Follower[];
  selectedFollowers: string[];
  noFollowerCount: number;
  includeNoFollowers: boolean;
  onToggleFollower: (followerId: string) => void;
  onToggleNoFollowers: () => void;
  onClose: () => void;
}

export function FollowerFilterPanel({
  followers,
  selectedFollowers,
  noFollowerCount,
  includeNoFollowers,
  onToggleFollower,
  onToggleNoFollowers,
  onClose,
}: FollowerFilterPanelProps) {
  const [search, setSearch] = useState('');

  const filteredFollowers = followers.filter((f) =>
    (f.full_name || 'Sem nome').toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="absolute right-0 top-0 z-30 h-full w-72 max-w-[85vw] shrink-0 border-l bg-background shadow-lg flex flex-col lg:static lg:z-auto lg:max-w-none lg:shadow-none">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-medium">Seguidores</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          <p className="text-xs text-muted-foreground mb-2">
            Pessoas ({followers.length})
          </p>

          <div
            className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
            onClick={onToggleNoFollowers}
          >
            <Checkbox checked={includeNoFollowers} />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm truncate">Sem seguidor</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {noFollowerCount}
            </Badge>
          </div>

          {filteredFollowers.map((follower) => (
            <div
              key={follower.id}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
              onClick={() => onToggleFollower(follower.id)}
            >
              <Checkbox checked={selectedFollowers.includes(follower.id)} />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={follower.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(follower.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">
                  {follower.full_name || 'Sem nome'}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {follower.taskCount}
              </Badge>
            </div>
          ))}

          {filteredFollowers.length === 0 && search && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum resultado encontrado
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
