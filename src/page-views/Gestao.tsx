import { BarChart3, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiveMeetingsPanel } from '@/components/gestao/LiveMeetingsPanel';
import { MeetingAttendanceReport } from '@/components/gestao/MeetingAttendanceReport';
import { ManagementAccessSettings } from '@/components/gestao/ManagementAccessSettings';
import { useManagementAccess } from '@/hooks/useManagement';

export default function Gestao() {
  const { data, isLoading } = useManagementAccess();

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data?.canAccess) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Acesso restrito</p>
            <p className="max-w-md text-sm text-muted-foreground">
              O módulo Gestão é visível apenas para administradores globais e para as pessoas
              convidadas nas configurações do módulo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted p-2">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Gestão</h1>
          <p className="text-sm text-muted-foreground">
            Relatórios estratégicos, começando pela presença nas reuniões do Google Meet.
          </p>
        </div>
      </div>

      <Tabs defaultValue="aovivo">
        <TabsList>
          <TabsTrigger value="aovivo">Ao vivo</TabsTrigger>
          <TabsTrigger value="reunioes">Presença em reuniões</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="aovivo" className="mt-4">
          <LiveMeetingsPanel />
        </TabsContent>
        <TabsContent value="reunioes" className="mt-4">
          <MeetingAttendanceReport />
        </TabsContent>
        <TabsContent value="configuracoes" className="mt-4">
          <ManagementAccessSettings canManage={!!data.canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
