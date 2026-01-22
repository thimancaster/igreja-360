import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Gift, Phone, Mail, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useBirthdaysThisMonth } from '@/hooks/useMembers';

export function BirthdayCard() {
  const { data: birthdays, isLoading } = useBirthdaysThisMonth();

  const currentMonth = format(new Date(), 'MMMM', { locale: ptBR });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Aniversariantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Aniversariantes de {currentMonth}
        </CardTitle>
        <CardDescription>
          {birthdays?.length || 0} membro(s) fazem aniversário este mês
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {birthdays && birthdays.length > 0 ? (
            <div className="space-y-3">
              {birthdays.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{member.full_name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {member.birth_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(member.birth_date), 'dd/MM', { locale: ptBR })}
                        </span>
                      )}
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={member.days_until === 0 ? 'default' : 'secondary'}
                    className={member.days_until === 0 ? 'bg-green-500' : ''}
                  >
                    {member.days_until === 0 ? (
                      '🎉 Hoje!'
                    ) : member.days_until === 1 ? (
                      'Amanhã'
                    ) : (
                      `Em ${member.days_until} dias`
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Gift className="h-10 w-10 mb-2 opacity-50" />
              <p>Nenhum aniversariante este mês</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
