import { cn } from '@repo/ui/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui';

type WorkspaceTableProps = {
  headers: string[];
  children: React.ReactNode;
  className?: string;
};

export function WorkspaceTable({ headers, children, className }: WorkspaceTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm', className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            {headers.map((header) => (
              <TableHead key={header} className="text-xs font-semibold uppercase tracking-wider">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

export function WorkspaceTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <TableRow className={cn('hover:bg-muted/20', className)}>{children}</TableRow>;
}

export function WorkspaceTableCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <TableCell className={className}>{children}</TableCell>;
}
