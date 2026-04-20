import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Member } from "@/types";

export function Members({ members }: { members: Member[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
          Known members
          <Badge variant="secondary" className="font-mono">
            {members.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Family</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Discord ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground italic"
                >
                  no members configured
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.discord_id}>
                  <TableCell className="font-mono">{m.family}</TableCell>
                  <TableCell className="font-mono">{m.firstname}</TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">
                    {m.discord_id}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
